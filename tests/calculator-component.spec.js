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
            hasColorSwatch: control.querySelector('.mdl-term-chip__color') !== null
        };
    }));
    expect(rows.map(row => row.text)).toEqual(['Key 1', 'Key 2', 'Key 3', 'Key 4', 'Result']);
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

// The history panel is only drawn once the object is wide enough to hold it beside the keypad.
const WIDE = { width: 340, height: 340 };

test('every completed operation is remembered, newest at the top', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);

    await press(page, DIGIT(7));
    await press(page, 'key-add');
    await press(page, DIGIT(5));
    await press(page, 'key-equals');
    await press(page, 'key-multiply');
    await press(page, DIGIT(2));
    await press(page, 'key-equals');

    const history = await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history);
    expect(history).toEqual([
        { text: '7 + 5', x: 12 },
        { text: '12.00 × 2', x: 24 }
    ]);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-source-component="memory-list"] [data-source-id^="row-"] text')).map(node => node.textContent));
    expect(rows).toEqual(['12.00 × 2', '24.00', '7 + 5', '12.00']);
});

test('equals with nothing to complete remembers nothing', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);
    await press(page, DIGIT(4));
    await press(page, 'key-equals');
    await press(page, 'key-equals');
    expect(await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history)).toEqual([]);
});

test('choosing a remembered operation puts its result back on the display', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);
    await press(page, DIGIT(9));
    await press(page, 'key-add');
    await press(page, DIGIT(3));
    await press(page, 'key-equals');
    await press(page, DIGIT(1));
    expect(await state(page)).toMatchObject({ n: 1 });
    await press(page, 'row-0');
    expect(await state(page)).toMatchObject({ n: 12, s: 0, dp: 2, fresh: 1 });
    await press(page, DIGIT(5));
    expect(await state(page)).toMatchObject({ n: 5 });
});

test('the history is emptied from the bin rather than from a key on the drawing', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);
    await press(page, DIGIT(8));
    await press(page, 'key-subtract');
    await press(page, DIGIT(3));
    await press(page, 'key-equals');
    expect(await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history)).toHaveLength(1);
    // Nothing on the calculator's own face clears it: remove, reset and clear all live under the bin.
    expect(await page.locator('[data-source-id="history-clear"]').count()).toBe(0);
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Calc')));
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-remove-selector').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item'))
        .find(item => item.querySelector('.mdl-dropdown-list-label').textContent === 'Clear').click());
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history)).toEqual([]);
    expect(await page.locator('[data-source-component="memory-list"] text').count()).toBe(1);
});

test('the history is kept to its length, survives a save and is put back by undo', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, Object.assign({ historyLimit: 2 }, WIDE));
    for (const digit of [1, 2, 3]) {
        await press(page, DIGIT(digit));
        await press(page, 'key-add');
        await press(page, DIGIT(1));
        await press(page, 'key-equals');
        await press(page, 'key-clear');
    }
    const kept = await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history);
    expect(kept.map(row => row.x)).toEqual([3, 4]);

    const roundTrip = await page.evaluate(() => {
        const serialized = JSON.parse(JSON.stringify(shell.serialize()));
        return serialized.board.find(shape => shape.properties.name === 'Calc').properties.history;
    });
    expect(roundTrip).toEqual(kept);

    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history)).toHaveLength(2);
});

test('the history panel can be turned off and gives its room back to the keypad', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);
    const withPanel = await page.evaluate(() => document.querySelector('[data-source-id="key-add"] rect').getBoundingClientRect().width);
    expect(await page.locator('[data-source-id="history-panel"]').count()).toBe(1);
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperty('showHistory', false);
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    const withoutPanel = await page.evaluate(() => document.querySelector('[data-source-id="key-add"] rect').getBoundingClientRect().width);
    expect(await page.locator('[data-source-id="history-panel"]').count()).toBe(0);
    expect(withoutPanel).toBeGreaterThan(withPanel);
});

// The function pad needs two columns of its own, so it is drawn only where the keypad is wide
// enough to take them. The default box in these tests is, and 180 across is not.
const NARROW = { width: 180, height: 320 };

function scientificState(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        return { n: shape.properties.n, a: shape.properties.a, p: shape.properties.p, dp: shape.properties.dp, fresh: shape.properties.fresh, inv: shape.properties.inv };
    });
}

function keyLabel(page, blockIdSuffix) {
    return page.evaluate(id => document.querySelector(`[data-block-id$="${id}"] text`).textContent, blockIdSuffix);
}

test('the function pad is drawn beside the digits once there is room for it', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);
    expect(await page.locator('[data-block-id$="key-sin"]').count()).toBe(1);

    // The digits keep their four columns and are moved along by the pad rather than squeezed by it.
    const laidOut = await page.evaluate(() => {
        const box = id => document.querySelector(`[data-block-id$="${id}"] rect`).getBoundingClientRect();
        return { inverse: box('key-inverse'), clear: box('key-clear'), sin: box('key-sin'), log: box('key-log') };
    });
    expect(laidOut.inverse.left).toBeLessThan(laidOut.clear.left);
    expect(laidOut.inverse.top).toBeCloseTo(laidOut.clear.top, 0);
    expect(laidOut.sin.left).toBeCloseTo(laidOut.inverse.left, 0);
    expect(laidOut.log.top).toBeGreaterThan(laidOut.sin.top);
    expect(laidOut.inverse.width).toBeCloseTo(laidOut.clear.width, 0);

    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperties({ width: 180 });
        shell.board.markDirty(shape);
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    expect(await page.locator('[data-block-id$="key-sin"]').count()).toBe(0);
    expect(await page.locator('[data-block-id$="key-add"]').count()).toBe(1);
});

test('the function pad can be turned off and gives its room back to the digits', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);
    const withPad = await page.evaluate(() => document.querySelector('[data-block-id$="key-add"] rect').getBoundingClientRect().width);
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperty('scientific', false);
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    expect(await page.locator('[data-block-id$="key-sin"]').count()).toBe(0);
    const withoutPad = await page.evaluate(() => document.querySelector('[data-block-id$="key-add"] rect').getBoundingClientRect().width);
    expect(withoutPad).toBeGreaterThan(withPad);
});

test('a narrow calculator is still the four-function one', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, NARROW);
    expect(await page.locator('[data-block-id$="key-inverse"]').count()).toBe(0);
    await press(page, DIGIT(6));
    await press(page, 'key-multiply');
    await press(page, DIGIT(7));
    await press(page, 'key-equals');
    expect(await state(page)).toMatchObject({ n: 42 });
});

test('the function keys work on the number on the display', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);

    await press(page, DIGIT(9));
    await press(page, 'key-square');
    expect(await scientificState(page)).toMatchObject({ n: 81, fresh: 1, dp: 2 });

    await press(page, 'key-clear');
    await press(page, DIGIT(4));
    await press(page, 'key-reciprocal');
    expect((await state(page)).n).toBeCloseTo(0.25, 9);

    await press(page, 'key-clear');
    await press(page, DIGIT(1));
    await press(page, 'key-zero');
    await press(page, 'key-zero');
    await press(page, 'key-log');
    expect((await state(page)).n).toBeCloseTo(2, 9);

    await press(page, 'key-clear');
    await press(page, 'key-constant');
    expect((await state(page)).n).toBeCloseTo(Math.PI, 9);

    // A key press starts a number of its own rather than extending the answer it was given.
    await press(page, DIGIT(3));
    expect(await state(page)).toMatchObject({ n: 3 });
});

test('the trigonometric keys read the angle in the unit the object is set to', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);

    await press(page, DIGIT(1));
    await press(page, 'key-sin');
    expect((await state(page)).n).toBeCloseTo(Math.sin(1), 9);

    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperty('angleUnit', 'degrees');
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    await press(page, 'key-clear');
    await press(page, DIGIT(3));
    await press(page, 'key-zero');
    await press(page, 'key-sin');
    expect((await state(page)).n).toBeCloseTo(0.5, 9);

    await press(page, 'key-clear');
    await press(page, DIGIT(6));
    await press(page, 'key-zero');
    await press(page, 'key-cos');
    expect((await state(page)).n).toBeCloseTo(0.5, 9);

    await press(page, 'key-clear');
    await press(page, DIGIT(4));
    await press(page, DIGIT(5));
    await press(page, 'key-tan');
    expect((await state(page)).n).toBeCloseTo(1, 9);
});

test('the second function key turns a key into its inverse and puts itself out again', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);

    expect(await keyLabel(page, 'key-sin')).toBe('sin');
    await press(page, 'key-inverse');
    expect((await scientificState(page)).inv).toBe(1);
    expect(await keyLabel(page, 'key-sin')).toBe('sin⁻¹');
    expect(await keyLabel(page, 'key-square')).toBe('√x');
    expect(await keyLabel(page, 'key-constant')).toBe('e');

    await press(page, DIGIT(1));
    await press(page, 'key-sin');
    expect((await state(page)).n).toBeCloseTo(Math.PI / 2, 9);
    expect((await scientificState(page)).inv).toBe(0);
    expect(await keyLabel(page, 'key-sin')).toBe('sin');

    // Pressed twice it puts itself out without spending itself on a key.
    await press(page, 'key-inverse');
    await press(page, 'key-inverse');
    expect((await scientificState(page)).inv).toBe(0);

    await press(page, 'key-clear');
    await press(page, DIGIT(8));
    await press(page, DIGIT(1));
    await press(page, 'key-inverse');
    await press(page, 'key-square');
    expect((await state(page)).n).toBeCloseTo(9, 9);

    await press(page, 'key-clear');
    await press(page, DIGIT(2));
    await press(page, 'key-inverse');
    await press(page, 'key-ln');
    expect((await state(page)).n).toBeCloseTo(Math.E * Math.E, 9);
});

test('the power key waits for its exponent the way the arithmetic keys wait for their operand', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, WIDE);

    await press(page, DIGIT(2));
    await press(page, 'key-power');
    expect(await scientificState(page)).toMatchObject({ a: 2, n: 0, p: 5 });
    await press(page, DIGIT(5));
    await press(page, 'key-equals');
    expect((await state(page)).n).toBeCloseTo(32, 9);

    await press(page, 'key-clear');
    await press(page, DIGIT(8));
    await press(page, 'key-inverse');
    await press(page, 'key-power');
    expect(await scientificState(page)).toMatchObject({ a: 8, p: 6, inv: 0 });
    await press(page, DIGIT(3));
    await press(page, 'key-equals');
    expect((await state(page)).n).toBeCloseTo(2, 9);

    const history = await page.evaluate(() => shell.board.shapes.getByName('Calc').properties.history);
    expect(history.map(row => row.text)).toEqual(['2 ^ 5', '8 ⁿ√ 3']);
    expect(history.map(row => Math.round(row.x))).toEqual([32, 2]);
});

test('the display names the angle unit and says when the second function is on', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page);
    const status = () => page.evaluate(() => document.querySelector('[data-block-id$="status"]')?.textContent ?? null);

    expect(await status()).toBe('RAD');
    await press(page, 'key-inverse');
    expect(await status()).toBe('RAD  INV');
    await press(page, 'key-inverse');

    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperty('angleUnit', 'degrees');
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    expect(await status()).toBe('DEG');

    // It belongs to the function pad: a calculator without one has no unit to name.
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Calc');
        shape.setProperty('scientific', false);
        shell.board.draw();
    });
    await page.waitForTimeout(200);
    expect(await status()).toBeNull();
});

test('a function key writes its answer into the model through the result variable', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addCalculator(page, { termA: 'mass', resultVariable: 'out' });
    await press(page, 'term-a');
    await press(page, 'key-power');
    await press(page, DIGIT(2));
    await press(page, 'key-equals');
    expect(await page.evaluate(() => shell.board.calculator.getByName('out', 1))).toBeCloseTo(144, 6);
});
