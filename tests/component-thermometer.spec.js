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

// A temperature the model lets the reader set, and one it works out for itself, so the same object
// can be asked to write both and only one of them ever moves.
async function addHeatingModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Heating equations'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Heating equations').properties.expression = '\\frac{dT}{dt}=0\\\\reading=40';
        shell.reset();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        shell.board.calculator.setTermValue('T', 20, 1, 1);
        shell.board.calculator.calculate();
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(300);
}

async function addThermometer(page, overrides = {}) {
    await page.evaluate(overrides => {
        const shape = shell.commands.addComponent('thermometer', 'Thermometer');
        shape.setProperties(Object.assign({ x: 300, y: 60, width: 160, height: 300, valueVariable: 'T' }, overrides));
        shape.draw();
        shell.board.deselect();
    }, overrides);
    await page.waitForTimeout(300);
}

function readDrawing(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Thermometer');
        const part = name => shape.element.querySelector(`[data-source-id="${name}"]`);
        const column = part('column');
        return {
            columnTop: Number(column.getAttribute('y')),
            columnHeight: Number(column.getAttribute('height')),
            readout: part('readout')?.textContent ?? null,
            cursor: part('column-grab').style.cursor,
            value: shape.properties.valueVariable,
            term: shell.board.calculator.getByName('T', 1)
        };
    });
}

function readTermLabel(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Thermometer');
        const label = shape.termDisplayLayer.querySelector('text');
        const tickLabels = Array.from(shape.element.querySelectorAll('[data-source-id="tick-label"]'));
        return {
            text: shape.termDisplayLayer.textContent,
            x: Number(label.getAttribute('x')),
            y: Number(label.getAttribute('y')),
            columnTop: Number(shape.element.querySelector('[data-source-id="column"]').getAttribute('y')),
            lastTickLabelX: Math.max(...tickLabels.map(node => Number(node.getAttribute('x'))))
        };
    });
}

// Presses the stem where the column is and slides the pointer up by however many pixels are asked
// for, which is the gesture that sets a temperature by hand.
async function slideColumn(page, pixels) {
    const point = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Thermometer');
        const grab = shape.element.querySelector('[data-source-id="column-grab"]');
        const local = {
            x: Number(grab.getAttribute('x')) + Number(grab.getAttribute('width')) / 2,
            y: Number(grab.getAttribute('y')) + Number(grab.getAttribute('height')) / 2
        };
        const screenPoint = new DOMPoint(shape.properties.x + local.x, shape.properties.y + local.y)
            .matrixTransform(shell.board.svg.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x, point.y - pixels, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(400);
}

test.describe('thermometer on the board', () => {
    test('the column stands at the term it reads and the reading is written beside it', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page);
        const drawn = await readDrawing(page);
        expect(drawn.readout).toBe('20.0 °C');
        expect(drawn.term).toBe(20);
        // The liquid is one piece: whatever it reads, the column's foot is still down in the bulb.
        expect(drawn.columnHeight).toBeGreaterThan(0);
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('T', 80, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(300);
        const warmed = await readDrawing(page);
        expect(warmed.readout).toBe('80.0 °C');
        expect(warmed.columnTop).toBeLessThan(drawn.columnTop);
        expect(warmed.columnHeight).toBeGreaterThan(drawn.columnHeight);
    });

    // A thermometer reading a term the model lets you set is also how that temperature is given: the
    // stem is slid instead of the term being typed, and a pixel of the scale is worth the range over
    // its length, so the same gesture on the same scale always means the same number of degrees.
    test('sliding the column writes the temperature the model let it read', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page);
        expect((await readDrawing(page)).cursor).toBe('ns-resize');
        await slideColumn(page, 40);
        const warmed = await readDrawing(page);
        // 160 by 300 leaves the scale 222.8px long across a 140 degree range, so forty pixels is
        // twenty-five degrees up from the twenty it stood at.
        expect(warmed.term).toBeCloseTo(45.13, 2);
        expect(warmed.readout).toBe('45.1 °C');
        // Let go, it stays: a thermometer is not a pedal that springs back to where it rested.
        await page.waitForTimeout(600);
        expect((await readDrawing(page)).term).toBeCloseTo(45.13, 2);
    });

    test('a temperature the model works out for itself is read-only', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page, { valueVariable: 'reading' });
        expect((await readDrawing(page)).cursor).toBe('not-allowed');
        await slideColumn(page, 40);
        expect(await page.evaluate(() => shell.board.calculator.getByName('reading', 1))).toBe(40);
    });

    // The eye every term on the board is shown with, on the temperature's own row: off to begin with,
    // and turned on it stands the term out past the scale, level with the top of the column, written by
    // the shared term display — so it is read in the same badge, figures and precision as every other
    // term on the board rather than in a readout of the object's own.
    test('the temperature term can be shown beside the scale, and rides with the column', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page, { width: 200, height: 320 });
        expect(await page.evaluate(() => shell.board.shapes.getByName('Thermometer').properties.valueVariableDisplayMode)).toBe('none');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Thermometer').termDisplayLayer?.textContent ?? '')).toBe('');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Thermometer');
            shape.setProperties({ valueVariableDisplayMode: 'termAndValue' });
            shape.draw();
        });
        await page.waitForTimeout(400);
        const shown = await readTermLabel(page);
        // The model's own precision, not the object's decimals: this is the board's reading of the term.
        expect(shown.text).toBe('T = 20.00');
        expect(shown.y).toBeCloseTo(shown.columnTop, 5);
        // It stands clear of the scale's own numbers, out past the far end of the marks.
        expect(shown.x).toBeGreaterThan(shown.lastTickLabelX);
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('T', 90, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const warmed = await readTermLabel(page);
        expect(warmed.text).toBe('T = 90.00');
        expect(warmed.y).toBeCloseTo(warmed.columnTop, 5);
        expect(warmed.y).toBeLessThan(shown.y);
    });

    // The scale the reading is named in is picked from a pair of keys rather than typed, so there is
    // no spelling of a degree sign to get wrong and no third thing the row can be left holding.
    test('the temperature scale is chosen from a pair of keys', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Thermometer')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(500);
        const keys = page.locator('.mdl-shape-overlay-popup').last().locator('.mdl-component-enum-buttons .dx-button');
        await expect(keys).toHaveCount(2);
        const icons = await keys.evaluateAll(elements => elements.map(element => element.querySelector('i')?.className ?? ''));
        expect(icons[0]).toContain('fa-c');
        expect(icons[1]).toContain('fa-f');
        expect(await keys.evaluateAll(elements => elements.map(element => element.classList.contains('dx-item-selected')))).toEqual([true, false]);
        await keys.nth(1).click();
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Thermometer').properties.unit)).toBe('°F');
        // Naming the other scale names it: the reading is the same term, said in Fahrenheit.
        expect((await readDrawing(page)).readout).toBe('20.0 °F');
    });

    // With no term to read the object holds the temperature itself, the way a gauge with nothing
    // bound to it holds its own value — so a thermometer is usable before a model exists at all.
    test('a thermometer holding a plain number is slid on its own value', async ({ page }) => {
        await setupBoard(page);
        await addHeatingModel(page);
        await addThermometer(page, { valueVariable: '20' });
        await slideColumn(page, 40);
        const warmed = await readDrawing(page);
        expect(Number(warmed.value)).toBeCloseTo(45.13, 2);
        expect(warmed.term).toBe(20);
        // The drawing's own value is a property, so the edit is on the undo stack like any other.
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(Number((await page.evaluate(() => shell.board.shapes.getByName('Thermometer').properties.valueVariable)))).toBe(20);
    });
});
