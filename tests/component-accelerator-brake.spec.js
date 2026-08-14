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

async function addDrivingModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Driving equations'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Driving equations').properties.expression = '\\frac{dthrottle}{dt}=0\\\\\\frac{dbraking}{dt}=0\\\\computed=20';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

async function addPedals(page, overrides = {}) {
    await page.evaluate(overrides => {
        const shape = shell.commands.addComponent('accelerator-brake', 'Pedals');
        shape.setProperties(Object.assign({ x: 300, y: 160, width: 240, height: 240, acceleratorVariable: 'throttle', brakeVariable: 'braking' }, overrides));
        shape.draw();
    }, overrides);
    await page.waitForTimeout(300);
}

async function pressPoints(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Pedals');
        const matrix = shell.board.svg.getScreenCTM();
        const brake = new DOMPoint(shape.properties.x + 60, shape.properties.y + 120).matrixTransform(matrix);
        const accelerator = new DOMPoint(shape.properties.x + 180, shape.properties.y + 120).matrixTransform(matrix);
        return { brake: { x: brake.x, y: brake.y }, accelerator: { x: accelerator.x, y: accelerator.y } };
    });
}

// Presses the control, slides the pointer by however many pixels are asked for — upwards is a
// positive slide — holds it there, and lets go. Nothing is released until the caller says so, so a
// test can read what the control holds while it is still being pressed.
async function slide(page, point, pixels, holdMilliseconds = 0) {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    if (pixels !== 0)
        await page.mouse.move(point.x, point.y - pixels, { steps: 5 });
    await page.waitForTimeout(holdMilliseconds);
}

async function release(page, settleMilliseconds = 1500) {
    await page.mouse.up();
    await page.waitForTimeout(settleMilliseconds);
}

function readTerms(page) {
    return page.evaluate(() => ({
        throttle: shell.board.calculator.getByName('throttle', 1),
        braking: shell.board.calculator.getByName('braking', 1)
    }));
}

test.describe('accelerator and brake component', () => {
    // Pressing writes nothing at all: the pedal is where it was, and stays there for as long as it is
    // held. What moves it is the pointer travelling up or down from where it went down.
    test('sliding up presses a pedal further and sliding down eases it off', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 0, 400);
        expect((await readTerms(page)).throttle).toBe(0);
        // The drawing is 240 across and 240 down, so a pixel is worth a hundredth of the 0…100 range.
        await page.mouse.move(points.accelerator.x, points.accelerator.y - 60, { steps: 5 });
        await page.waitForTimeout(150);
        expect((await readTerms(page)).throttle).toBeCloseTo(25, 0);
        await page.mouse.move(points.accelerator.x, points.accelerator.y - 24, { steps: 5 });
        await page.waitForTimeout(150);
        expect((await readTerms(page)).throttle).toBeCloseTo(10, 0);
        await release(page, 300);
        expect((await readTerms(page)).throttle).toBeCloseTo(10, 0);
    });

    test('holding the pedal still keeps the value it was slid to', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 96, 600);
        expect((await readTerms(page)).throttle).toBeCloseTo(40, 0);
        await page.waitForTimeout(600);
        expect((await readTerms(page)).throttle).toBeCloseTo(40, 0);
        await release(page);
    });

    // Nothing holds a pedal down once it is let go, so it walks back to the minimum a step at a time
    // rather than dropping there in one frame.
    test('letting go lets the pedal come back to rest step by step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorReturnStep: 10 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 240, 200);
        expect((await readTerms(page)).throttle).toBe(100);
        await page.mouse.up();
        await page.waitForTimeout(250);
        const midway = (await readTerms(page)).throttle;
        expect(midway).toBeGreaterThan(0);
        expect(midway).toBeLessThan(100);
        await page.waitForTimeout(1400);
        expect((await readTerms(page)).throttle).toBe(0);
    });

    test('a pedal left with no return stays where it was released', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { brakeReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.brake, 120, 100);
        await release(page);
        expect((await readTerms(page)).braking).toBeCloseTo(50, 0);
    });

    test('each pedal writes its own term, and neither goes past its ends', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { brakeReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.brake, 400, 100);
        const held = await readTerms(page);
        expect(held.braking).toBe(100);
        expect(held.throttle).toBe(0);
        await page.mouse.move(points.brake.x, points.brake.y + 400, { steps: 5 });
        await page.waitForTimeout(150);
        expect((await readTerms(page)).braking).toBe(0);
        await release(page);
    });

    // A pedal naming a plain number writes the object's own parameter instead, the way a gauge edits
    // its own value when it is bound to nothing — and the slide and the fall back that follows it are
    // one edit, so undo takes the pedal back to where it stood before it was touched.
    test('a pedal reading a plain number writes the property, and the whole gesture is one undo step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorVariable: '0', brakeVariable: '0', acceleratorReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 72, 100);
        await release(page, 300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.acceleratorVariable))).toBeCloseTo(30, 0);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.acceleratorVariable))).toBe(0);
    });

    // A term the model works out for itself can never be written, so the pedal says so with the
    // cursor a locked handle uses rather than pretending to move.
    test('a pedal bound to a computed term refuses the gesture', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorVariable: 'computed' });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 100, 100);
        await release(page, 300);
        expect(await page.evaluate(() => shell.board.calculator.getByName('computed', 1))).toBe(20);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelector('[data-source-id="accelerator-press"]').style.cursor)).toBe('not-allowed');
    });

    // The eye on each row shows what that control is holding, over the control itself, written the
    // way every other term on the board is written and coloured the way that control is drawn.
    test('the eye on a row reads its term over its own control', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label').length)).toBe(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Pedals');
            shape.setProperties({ acceleratorVariableDisplayMode: 'nameValue', brakeVariableDisplayMode: 'nameValue' });
            shell.board.calculator.setTermValue('throttle', 40, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label')).map(label => ({
            text: label.textContent,
            x: Number(label.getAttribute('x')),
            background: label.parentNode.querySelector('.shape-term-label-bg').getAttribute('fill')
        })));
        expect(labels).toHaveLength(2);
        // The rows are drawn in the order the definition declares them: the accelerator first, and
        // each label stands over the half of the box its own control is drawn in.
        expect(labels[0].text).toBe('throttle = 40.00');
        expect(labels[0].x).toBeCloseTo(180, 0);
        expect(labels[0].background).toBe('#1871c2');
        expect(labels[1].text).toBe('braking = 0.00');
        expect(labels[1].x).toBeCloseTo(60, 0);
        expect(labels[1].background).toBe('#e03130');
    });

    // A row naming no term holds the number itself, and pressing the pedal writes that number. The
    // key in the toolbar reads it, so it has to follow the press: an interaction writes the property
    // straight rather than through a command, which is the path that otherwise refreshes a toolbar.
    test('the toolbar follows a pedal that is moved while it is open', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorVariable: '0', brakeVariable: '0', acceleratorReturnStep: 0, brakeReturnStep: 0 });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        const readToolbar = () => page.evaluate(() => Array.from(document.querySelectorAll('.shape-context-toolbar.visible .mdl-component-model-selector .mdl-name-btn-term-text')).map(term => term.textContent.trim()));
        expect((await readToolbar()).map(Number)).toEqual([0, 0]);
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 120, 200);
        expect((await readToolbar()).map(Number)).toEqual([50, 0]);
        await release(page, 300);
        expect((await readToolbar()).map(Number)).toEqual([50, 0]);
        await slide(page, points.brake, 48, 200);
        expect((await readToolbar()).map(Number)).toEqual([50, 20]);
        await release(page, 300);
    });

    test('a term the pedal writes is read back on the row that names it', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { acceleratorReturnStep: 0 });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 120, 200);
        await release(page, 300);
        // The key names the terms, not their values, so it is the drawing and the label that move —
        // what matters here is that the toolbar is still standing and still naming them.
        expect(await page.evaluate(() => Array.from(document.querySelectorAll('.shape-context-toolbar.visible .mdl-component-model-selector .mdl-name-btn-term-text')).map(term => term.textContent.trim()))).toEqual(['throttle', 'braking']);
        expect((await readTerms(page)).throttle).toBeCloseTo(50, 0);
    });

    test('a row that says nothing about where its value is read has no eye to show it', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        const rows = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Pedals');
            return ['acceleratorVariable', 'brakeVariable'].map(id => ({
                id: id,
                hasEye: !!shape.createComponentVariableControl(shape.getComponentParameter(id))[0].querySelector('.term-packed-control__button')
            }));
        });
        expect(rows.every(row => row.hasEye)).toBe(true);
        const clockRow = await page.evaluate(() => {
            const shape = shell.commands.addComponent('analogue-clock', 'Clock');
            shape.draw();
            return !!shape.createComponentVariableControl(shape.getComponentParameter('hourVariable'))[0].querySelector('.term-packed-control__button');
        });
        expect(clockRow).toBe(false);
    });
});
