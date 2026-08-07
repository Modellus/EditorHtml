const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

// "out" is left undefined by every statement, so the model holds it as a parameter the
// calculator is allowed to write. A name the model computes for itself refuses the write.
async function addModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Values'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Values').properties.expression = 'mass=12\\\\speed=3.5\\\\y=2\\cdot t\\\\check=out';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

async function addCalculator(page, parameters = {}) {
    await page.evaluate(parameters => {
        const shape = shell.commands.addComponent('calculator', 'Calc');
        shape.setProperties(Object.assign({ x: 60, y: 60, width: 240, height: 320 }, parameters));
        shell.board.markDirty(shape);
        shell.board.draw();
    }, parameters);
    await page.waitForTimeout(300);
}

function state(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        return { n: shape.properties.n, a: shape.properties.a, p: shape.properties.p, s: shape.properties.s, dp: shape.properties.dp, fresh: shape.properties.fresh };
    });
}

async function press(page, blockIdSuffix) {
    const box = await page.locator(`[data-block-id$="${blockIdSuffix}"]`).first().boundingBox();
    expect(box, blockIdSuffix).not.toBeNull();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(60);
}

const DIGIT = digit => `key-digit#${digit - 1}`;

test('the calculator compiles without diagnostics', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { termA: 'mass', termB: 'speed', resultVariable: 'out' });
    const report = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        return { diagnostics: shape.lastCompilation.diagnostics, validation: shape.validateComponent() };
    });
    expect(report.diagnostics).toEqual([]);
    expect(report.validation.errors).toEqual([]);
    expect(report.validation.valid).toBe(true);
});

test('digits, operators and equals work the keypad way', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);

    await press(page, DIGIT(1));
    await press(page, DIGIT(2));
    await press(page, DIGIT(3));
    expect(await state(page)).toMatchObject({ n: 123 });

    await press(page, 'key-add');
    expect(await state(page)).toMatchObject({ a: 123, n: 0, p: 1 });
    await press(page, DIGIT(4));
    await press(page, DIGIT(5));
    await press(page, 'key-equals');
    expect(await state(page)).toMatchObject({ n: 168, p: 0, fresh: 1 });

    await press(page, DIGIT(7));
    expect(await state(page)).toMatchObject({ n: 7 });

    await press(page, 'key-clear');
    expect(await state(page)).toMatchObject({ n: 0, a: 0, p: 0, s: 0, dp: 0 });
});

test('the decimal key builds a fractional entry', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);

    await press(page, DIGIT(1));
    await press(page, 'key-point');
    await press(page, DIGIT(5));
    expect(await state(page)).toMatchObject({ n: 1.5, dp: 1 });
    await press(page, 'key-multiply');
    await press(page, DIGIT(4));
    await press(page, 'key-equals');
    expect(await state(page)).toMatchObject({ n: 6 });
});

test('term keys load the value the model holds at the iteration on screen', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { termA: 'y', resultVariable: 'out' });
    await page.evaluate(() => {
        for (let step = 0; step < 60; step++)
            shell.board.calculator.engine.iterate();
    });
    await page.waitForTimeout(200);

    const atIteration = async iteration => page.evaluate(iteration => {
        shell.board.calculator.setIteration(iteration);
        shell.board.draw();
        return { iteration: shell.board.calculator.getIteration(), y: shell.board.calculator.getByName('y', 1) };
    }, iteration);

    const first = await atIteration(1);
    await press(page, 'term-a');
    expect((await state(page)).n).toBeCloseTo(first.y, 6);

    const later = await atIteration(40);
    expect(later.y).not.toBeCloseTo(first.y, 6);
    await press(page, 'key-clear');
    await press(page, 'term-a');
    expect((await state(page)).n).toBeCloseTo(later.y, 6);

    await press(page, 'key-multiply');
    await press(page, DIGIT(2));
    await press(page, 'key-equals');
    const written = await page.evaluate(() => ({
        iteration: shell.board.calculator.getIteration(),
        out: shell.board.calculator.getByName('out', 1)
    }));
    expect(written.iteration).toBe(40);
    expect(written.out).toBeCloseTo(later.y * 2, 6);
});

test('a result variable the model computes for itself is refused', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { resultVariable: 'mass' });
    const allowed = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        return {
            computed: shape.isClickAllowed({ variable: 'mass', property: '', value: 1 }),
            parameter: shape.isClickAllowed({ variable: 'out', property: '', value: 1 }),
            property: shape.isClickAllowed({ variable: '', property: 'n', value: 1 })
        };
    });
    expect(allowed).toEqual({ computed: false, parameter: true, property: true });
    await press(page, DIGIT(4));
    await press(page, 'key-equals');
    expect(await page.evaluate(() => shell.board.calculator.getByName('mass', 1))).toBe(12);
    expect(await state(page)).toMatchObject({ n: 4 });
});

test('the four term keys are always drawn and carry the colour chosen for them', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { termA: 'mass', termC: 'speed', keyAColor: '#1565C0', keyCColor: '#F9A825' });
    const keys = await page.evaluate(() => ['term-a', 'term-b', 'term-c', 'term-d'].map(id => {
        const group = document.querySelector(`[data-block-id$="${id}"]`);
        const cap = group.querySelector('rect');
        const label = group.querySelector('text');
        return { id: id, fill: cap.getAttribute('fill'), label: label.textContent, labelFill: label.getAttribute('fill') };
    }));
    expect(keys.map(key => key.label)).toEqual(['mass', '—', 'speed', '—']);
    expect(keys[0].fill).toBe('#1565C0');
    expect(keys[0].labelFill).toBe('#ffffff');
    expect(keys[2].fill).toBe('#F9A825');
    expect(keys[2].labelFill).toBe('#000000');
});

test('the model menu labels the key rows without the word term and offers a colour beside each', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { termA: 'mass', resultVariable: 'out' });
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Calc')));
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')).map(row => {
        const label = row.querySelector('.mdl-dropdown-list-label');
        const control = row.querySelector('.mdl-dropdown-list-control');
        const labelRect = label.getBoundingClientRect();
        const controlRect = control.getBoundingClientRect();
        return {
            text: label.textContent,
            labelLeftOfControl: labelRect.right <= controlRect.left + 1,
            sameRow: Math.abs((labelRect.top + labelRect.height / 2) - (controlRect.top + controlRect.height / 2)) < 12,
            hasColorSwatch: control.querySelector('.shape-term-color') !== null
        };
    }));
    expect(rows.map(row => row.text)).toEqual(['Key 1', 'Key 2', 'Key 3', 'Key 4', 'Result variable']);
    expect(rows.every(row => row.labelLeftOfControl && row.sameRow)).toBe(true);
    expect(rows.map(row => row.hasColorSwatch)).toEqual([true, true, true, true, false]);
});

test('one key press is one undo step', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);
    await press(page, DIGIT(5));
    await press(page, DIGIT(6));
    expect(await state(page)).toMatchObject({ n: 56 });
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(100);
    expect(await state(page)).toMatchObject({ n: 5 });
});
