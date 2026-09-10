const { test, expect } = require('@playwright/test');

// Every field that takes a value by hand reads it one way: a sign, digits with "." before the
// decimals, and an exponent if one is wanted, so -0.03e2 is the -3 it says wherever it is typed.
// The field is a math field, so the same value can be written as a power of ten instead - 1.5*10^3
// - and is typeset as it is typed. A comma is no part of either, neither grouping the thousands
// nor marking the decimals.

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

async function addRuler(page) {
    await page.evaluate(() => {
        const shape = shell.commands.addComponent('ruler', 'Ruler');
        shape.setProperties({ x: 60, y: 60, width: 320, height: 64 });
        shape.draw();
    });
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Ruler')?.contentGroup?.children.length ?? 0)).toBeGreaterThan(0);
}

// The ruler's ends are edited inside the axis chip on the Horizontal row of its settings menu, the
// way a chart's are. Each box is written into through the math field laid over it.
async function openRulerEnds(page) {
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Ruler')));
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
    await page.waitForTimeout(400);
    const row = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').filter({ hasText: 'Horizontal' });
    await expect(row).toBeVisible();
    await row.locator('.mdl-axis-chip-editor').evaluate(element => $(element).dxDropDownBox('instance').open());
    const rows = page.locator('.mdl-axis-chip-popup .mdl-axis-chip-rows:visible');
    await expect(rows).toHaveCount(1);
    return rows.locator('math-field.mdl-numeric-math-field');
}

// The menu is closed off the button that opened it, and the next opening waits for it to be
// gone, since that button would only close it again while it is still on screen.
async function closeRulerEnds(page) {
    await page.evaluate(() => $('.shape-context-toolbar.visible .mdl-component-settings-selector').dxDropDownButton('instance').close());
    await expect(page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').filter({ hasText: 'Horizontal' })).toBeHidden();
    await page.waitForTimeout(300);
}

// What is typed replaces what the field holds, and Tab takes it, the way a reader leaves a field.
async function typeInto(page, field, text) {
    await field.click();
    await field.evaluate(node => node.executeCommand('selectAll'));
    await page.keyboard.type(text);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
}

function readField(field) {
    return field.evaluate(node => node.value);
}

function readRulerEnds(page) {
    return page.evaluate(() => {
        const properties = shell.board.shapes.getByName('Ruler').properties;
        return { minimumX: properties.minimumX, maximumX: properties.maximumX };
    });
}

// An object's parameter is read by parsing wherever it is used, so what is typed into it is
// stored as it was typed and read as the number it says.
test.describe('a value typed into a number field', () => {
    test('may carry an exponent and as many decimals as it has', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        const fields = await openRulerEnds(page);
        await typeInto(page, fields.first(), '-0.03e2');
        expect((await readRulerEnds(page)).minimumX).toBe('-0.03e2');
        await typeInto(page, fields.nth(1), '2.5e-1');
        expect((await readRulerEnds(page)).maximumX).toBe('2.5e-1');
        // The model shows two decimals; the value keeps its three.
        await typeInto(page, fields.first(), '0.005');
        expect((await readRulerEnds(page)).minimumX).toBe('0.005');
        // The field keeps reading the way it was written, not the way the number is spelt.
        expect(await readField(fields.nth(1))).toBe('2.5e-1');
        // The ruler is drawn from the numbers those texts say, written to its own two decimals.
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('text')).map(node => node.textContent));
        expect(labels[0]).toBe('0.01');
        expect(labels[labels.length - 1]).toBe('0.25');
    });

    // The field is a math field, so a value can be written as a power of ten: 1.5*10^3 is typeset
    // as 1.5·10³, kept spelt that way, and read as the 1500 it says wherever the value is used.
    test('may be written in scientific notation, and is kept as written', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        const fields = await openRulerEnds(page);
        await typeInto(page, fields.nth(1), '1.5*10^3');
        expect((await readRulerEnds(page)).maximumX).toBe('1.5\\cdot10^3');
        expect(await readField(fields.nth(1))).toBe('1.5\\cdot10^3');
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('text')).map(node => node.textContent));
        expect(labels[labels.length - 1]).toBe('1500');
        // A power of ten on its own, with a negative exponent typed after the caret.
        await typeInto(page, fields.first(), '10^-3');
        expect((await readRulerEnds(page)).minimumX).toBe('10^{-3}');
        expect(await page.evaluate(() => Utils.parseNumericText(shell.board.shapes.getByName('Ruler').properties.minimumX))).toBe(0.001);
    });

    // The text is the value the shape holds, so the menu shows it again when it is opened later,
    // and it survives the shape being saved and read back.
    test('reads the way it was typed when the menu is opened again', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        let fields = await openRulerEnds(page);
        await typeInto(page, fields.first(), '-1e-3');
        expect((await readRulerEnds(page)).minimumX).toBe('-1e-3');
        await closeRulerEnds(page);
        fields = await openRulerEnds(page);
        expect(await readField(fields.first())).toBe('-1e-3');
        // Undone, the value is 0 again and the text is gone with it.
        await page.evaluate(() => shell.board.invoker.undo());
        await page.waitForTimeout(300);
        await closeRulerEnds(page);
        fields = await openRulerEnds(page);
        expect(await readField(fields.first())).toBe('0');
        expect((await readRulerEnds(page)).minimumX).toBe(0);
        // Saved and read back, the text is still what the shape holds.
        await typeInto(page, fields.first(), '-1e-3');
        await closeRulerEnds(page);
        await page.evaluate(() => { const model = JSON.parse(JSON.stringify(shell.serialize())); shell.deserialise(model); });
        await page.waitForTimeout(500);
        expect((await readRulerEnds(page)).minimumX).toBe('-1e-3');
        fields = await openRulerEnds(page);
        expect(await readField(fields.first())).toBe('-1e-3');
    });

    // A value the shape holds as a number is used in its arithmetic, so it stays a number and
    // the text is kept beside it, shown for as long as the number is the one it was typed for.
    test('a gauge end keeps its number and the text it was typed as', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            shell.commands.addShape('GaugeShape', 'Gauge');
            const gauge = shell.board.shapes.getByName('Gauge');
            gauge.setProperties({ x: 220, y: 140, width: 200, height: 200, autoScale: false, minimum: 0, maximum: 10 });
            gauge.draw();
            shell.board.selection.select(gauge);
        });
        await page.waitForTimeout(300);
        await page.locator('.shape-context-toolbar.visible .mdl-gauge-settings-selector').click();
        await page.waitForTimeout(400);
        const row = page.locator('.mdl-gauge-settings-popup').last().locator('.mdl-dropdown-list-item').filter({ hasText: 'Maximum' });
        const field = row.locator('math-field.mdl-numeric-math-field').first();
        await typeInto(page, field, '1e2');
        const properties = await page.evaluate(() => { const p = shell.board.shapes.getByName('Gauge').properties; return { maximum: p.maximum, typedTexts: p.typedTexts }; });
        expect(properties).toEqual({ maximum: 100, typedTexts: { maximum: '1e2' } });
        expect(await readField(field)).toBe('1e2');
    });

    test('refuses a comma, typed or pasted', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        const fields = await openRulerEnds(page);
        await typeInto(page, fields.nth(1), '1,5');
        // The comma never reaches the field, so the digits either side of it are all there is.
        expect((await readRulerEnds(page)).maximumX).toBe('15');
        await fields.nth(1).click();
        await fields.nth(1).evaluate(node => {
            node.executeCommand('selectAll');
            const transfer = new DataTransfer();
            transfer.setData('text/plain', '2,5');
            node.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true, composed: true }));
        });
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
        expect((await readRulerEnds(page)).maximumX).toBe('15');
        expect(await readField(fields.nth(1))).toBe('15');
    });

    // What is not a value is not taken either: the field goes back to showing what the box holds.
    test('throws away what is not a value', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        const fields = await openRulerEnds(page);
        await typeInto(page, fields.nth(1), 'abc');
        expect((await readRulerEnds(page)).maximumX).toBe(10);
        expect(await readField(fields.nth(1))).toBe('10');
    });

    test('is shown without the noise a step leaves behind', async ({ page }) => {
        await setupBoard(page);
        await addRuler(page);
        const fields = await openRulerEnds(page);
        await typeInto(page, fields.first(), '0.7');
        await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('.mdl-axis-chip-rows')).find(element => element.offsetParent !== null);
            DevExpress.ui.dxNumberBox.getInstance(rows.querySelectorAll('.dx-numberbox')[0]).option('value', 0.7 + 0.1);
        });
        await page.waitForTimeout(200);
        expect(await readField(fields.first())).toBe('0.8');
    });
});

// A box standing empty has no mathematics under the pointer for the caret to be put in, so the
// click on it is taken by the field itself and what is typed next lands in it. The player's step
// delay is the box that starts empty.
test.describe('a field standing empty', () => {
    async function openPlayerStart(page) {
        await page.evaluate(() => shell.bottomToolbar._startDropdownElement.dxDropDownButton('instance').open());
        const fields = page.locator('.mdl-independent-dropdown math-field.mdl-numeric-math-field');
        await expect(fields).toHaveCount(3);
        await page.waitForTimeout(500);
        return fields;
    }

    test('takes what is typed into it after a click', async ({ page }) => {
        await setupBoard(page);
        const delay = (await openPlayerStart(page)).nth(2);
        expect(await readField(delay)).toBe('');
        await delay.click();
        await page.waitForTimeout(200);
        await page.keyboard.type('0.25');
        expect(await readField(delay)).toBe('0.25');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => shell.calculator.properties.iterationDuration)).toBe(0.25);
    });

    test('takes typing again after the reader has emptied it and left it', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => { shell.calculator.properties.iterationDuration = 0.5; });
        const fields = await openPlayerStart(page);
        const delay = fields.nth(2);
        await delay.click();
        await page.locator('.mdl-independent-dropdown .dx-clear-button-area').click();
        await page.waitForTimeout(300);
        expect(await readField(delay)).toBe('');
        expect(await page.evaluate(() => shell.calculator.properties.iterationDuration)).toBe(null);
        await fields.first().click();
        await page.waitForTimeout(200);
        await delay.click();
        await page.waitForTimeout(200);
        await page.keyboard.type('3');
        expect(await readField(delay)).toBe('3');
    });
});

test.describe('the numeric grammar the fields share', () => {
    test('reads a value in either notation and nothing with a comma', async ({ page }) => {
        await setupBoard(page);
        const readings = await page.evaluate(() => ['-0.03e2', '2.5E-1', '.5', '5.', '7', '1.5\\cdot10^3', '1.5\\times10^{-3}', '-10^{6}', '10^3', '1.5\\cdot10^{\\left\\lbrace3\\right\\rbrace}', '1,5', '1,000', '0x10', 'Infinity', '', 'x', '1.2.3', 'x\\cdot10^3', '1 000']
            .map(text => { const value = Utils.parseNumericText(text); return [text, Number.isFinite(value) ? value : null]; }));
        expect(readings).toEqual([
            ['-0.03e2', -3], ['2.5E-1', 0.25], ['.5', 0.5], ['5.', 5], ['7', 7],
            ['1.5\\cdot10^3', 1500], ['1.5\\times10^{-3}', 0.0015], ['-10^{6}', -1000000], ['10^3', 1000], ['1.5\\cdot10^{\\left\\lbrace3\\right\\rbrace}', 1500],
            ['1,5', null], ['1,000', null], ['0x10', null], ['Infinity', null], ['', null], ['x', null], ['1.2.3', null], ['x\\cdot10^3', null], ['1 000', null]
        ]);
        const written = await page.evaluate(() => [-3, 0.25, 0.7 + 0.1, 1e21, 1e-7, -0, null, 'x'].map(value => Utils.formatNumericText(value)));
        expect(written).toEqual(['-3', '0.25', '0.8', '1e+21', '1e-7', '0', '', '']);
    });

    // A name typed into the field comes back spelt the way the model spells it.
    test('reads a typed name back plainly', async ({ page }) => {
        await setupBoard(page);
        const names = await page.evaluate(() => ['x_1', 'x_{\\left\\lbrace12\\right\\rbrace}', 'v.x', 'NO_2', '\\mathrm{NO}_2', 'heading', 'v_{\\!x}', '1,5'].map(latex => Utils.readTermNameLatex(latex)));
        expect(names).toEqual(['x_1', 'x_12', 'v.x', 'NO_2', 'NO_2', 'heading', 'v_x', '1,5']);
    });
});

// A number a million or more is written in scientific notation wherever it is read - a tick, a
// readout, a cell - so a big number takes the room of a small one. Along a scale, a number too
// small to show at the decimals the scale reads to is written that way as well.
test.describe('big numbers are written in scientific notation', () => {
    test('by every formatter a value is read through', async ({ page }) => {
        await setupBoard(page);
        const written = await page.evaluate(() => ({
            model: [1234567, -2500000, 999999.999, 999999.99, 12345.678, 1e21].map(value => Utils.formatModelValue(value, 2)),
            fixed: [1234567, 42.5, 0.001].map(value => Utils.formatFixedDigits(value, 2)),
            scale: [1234567, 0.001, 0.005, 0.006, 0, -0.0004, 42.5, 1e-3].map(value => Utils.formatScaleDigits(value, 2)),
            scaleWhole: [0.4, 0.5, 3].map(value => Utils.formatScaleDigits(value, 0)),
            ticks: [2000000, 10000, 0.0001, 3.14159].map(value => formatAxisTickValue(value)),
            reading: BlockComponentHelpers.readingText(2500000, 2, 'm')
        }));
        expect(written).toEqual({
            model: ['1.23e6', '-2.50e6', '1.00e6', '999 999.99', '12 345.68', '1.00e21'],
            fixed: ['1.23e6', '42.50', '0.00'],
            scale: ['1.23e6', '1.00e-3', '0.01', '0.01', '0.00', '-4.00e-4', '42.50', '1.00e-3'],
            scaleWhole: ['4e-1', '1', '3'],
            ticks: ['2.00e6', '10000', '1.00e-4', '3.142'],
            reading: '2.50e6 m'
        });
    });

    test('on the ticks of a chart', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Values');
            shell.board.shapes.getByName('Values').properties.expression = 'y=2\\cdot t';
            shell.reset();
            shell.commands.addShape('ChartShape', 'Chart');
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const chart = shell.board.shapes.getByName('Chart');
            chart.properties.autoScale = false;
            chart.properties.domainOverride = { xMin: 0, xMax: 4000000, yMin: 0, yMax: 10 };
            shell.board.markDirty(chart);
        });
        await page.waitForTimeout(500);
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Chart').element.querySelectorAll('text')).map(node => node.textContent));
        expect(labels).toContain('2.00e6');
        expect(labels).not.toContain('2000000');
    });
});
