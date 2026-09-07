const { test, expect } = require('@playwright/test');

// Every shape writes its numbers in the notation chosen on its own menu: 0.1 as it is, 1×10⁻¹ in
// scientific notation, or 1e-1 in e notation. The choice is a property of the shape, so a chart, a
// value, a table, a referential and an object built from blocks all offer it on the same row and
// all write their numbers by it.

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

async function addModel(page, expression, settledTermName) {
    await page.evaluate(shapeExpression => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').setProperties({ expression: shapeExpression });
        shell.reset();
    }, expression);
    await page.waitForFunction(termName => shell.calculator.getTermsNames().includes(termName), settledTermName);
}

// The notation is set the way the menu sets it, and the board redraws the shape on its next frame.
function setNotation(page, name, notation) {
    return page.evaluate(input => shell.board.shapes.getByName(input.name).setPropertyCommand('notation', input.notation), { name, notation });
}

// The pills show their tenth as maths in a read-only math-field, so a pill is read by the notation
// it is marked with and the maths it shows is read from its field.
function readPillNotations(row) {
    return row.locator('.dx-button').evaluateAll(buttons => buttons.map(button => button.dataset.notation));
}

function readPillLatex(row) {
    return row.locator('.dx-button math-field').evaluateAll(fields => fields.map(field => field.value));
}

function pill(row, notation) {
    return row.locator(`.dx-button[data-notation="${notation}"]`);
}

function readTexts(page, name) {
    return page.evaluate(name => Array.from(shell.board.shapes.getByName(name).element.querySelectorAll('text')).map(node => node.textContent), name);
}

test.describe('the notation a shape writes its numbers in', () => {
    test('is one of three, written by every formatter', async ({ page }) => {
        await setupBoard(page);
        const written = await page.evaluate(() => ({
            scientific: [0.1, 1234.5, -0.00025, 0, 1e21].map(value => Utils.formatModelValue(value, 2, '—', 'scientific')),
            e: [0.1, 1234.5, -0.00025, 0].map(value => Utils.formatModelValue(value, 2, '—', 'e')),
            decimal: [0.1, 1234.5, 2500000].map(value => Utils.formatModelValue(value, 2, '—', 'decimal')),
            unknown: Utils.formatModelValue(0.1, 2, '—', 'nonsense'),
            ticks: [0.5, 0, 20].map(value => formatAxisTickValue(value, 'decimal', 'e')),
            piTicks: formatAxisTickValue(Math.PI / 2, 'pi', 'e'),
            fixed: Utils.formatFixedDigits(42.5, 1, 'scientific'),
            scale: Utils.formatScaleDigits(0.001, 2, 'e'),
            normalized: ['decimal', 'scientific', 'e', undefined, 'x'].map(value => Utils.normalizeNotation(value))
        }));
        expect(written).toEqual({
            scientific: ['1.00×10⁻¹', '1.23×10³', '-2.50×10⁻⁴', '0.00', '1.00×10²¹'],
            e: ['1.00e-1', '1.23e3', '-2.50e-4', '0.00'],
            decimal: ['0.10', '1 234.50', '2.50e6'],
            unknown: '0.10',
            ticks: ['5.00e-1', '0', '2.00e1'],
            piTicks: 'π/2',
            fixed: '4.3×10¹',
            scale: '1.00e-3',
            normalized: ['decimal', 'scientific', 'e', 'decimal', 'decimal']
        });
    });

    // The row stands on the shape's own menu, beside the opacity, with a pill for each notation.
    test('is chosen on the shape menu of any shape, and the choice is undone like any other', async ({ page }) => {
        await setupBoard(page);
        await addModel(page, 'x=0.1', 'x');
        await page.evaluate(() => {
            shell.commands.addShape('ValueShape', 'Value1');
            const value = shell.board.shapes.getByName('Value1');
            value.setProperties({ term: 'x' });
            value.draw();
        });
        // The expression the model was written in still holds its toolbar, so the value shape is
        // given the board before its own toolbar is opened.
        const centre = await page.evaluate(() => { const box = shell.board.shapes.getByName('Value1').element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; });
        await page.mouse.click(centre.x, centre.y);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').contextToolbar?.classList.contains('visible') === true)).toBe(true);
        await page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector').click();
        const row = page.locator('.mdl-dropdown-list-item', { hasText: 'Notation' });
        await expect(row).toBeVisible();
        await expect.poll(() => readPillNotations(row)).toEqual(['decimal', 'scientific', 'e']);
        await expect.poll(() => readPillLatex(row)).toEqual(['0.1', '1\\times10^{-1}', '1\\mathrm{e}\\text{-}1']);
        await expect(row.locator('.dx-item-selected')).toHaveAttribute('data-notation', 'decimal');
        await pill(row, 'e').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.notation)).toBe('e');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').valueText.textContent)).toContain('1.00e-1');
        await page.evaluate(() => shell.board.invoker.undo());
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').properties.notation)).toBe('decimal');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Value1').valueText.textContent)).toContain('0.10');
    });

    // A shape with a settings menu keeps the row there, as its last, and its own menu goes without.
    // The choice reads as the grey button every button group marks its choice with: nothing
    // stands over the text.
    test('stands last on the settings menu of a shape that has one', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('ruler', 'Ruler');
            shape.setProperties({ x: 60, y: 60, width: 320, height: 64 });
            shape.draw();
        });
        const centre = await page.evaluate(() => { const box = shell.board.shapes.getByName('Ruler').element.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; });
        await page.mouse.click(centre.x, centre.y);
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Ruler').contextToolbar?.classList.contains('visible') === true)).toBe(true);
        await page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector').click();
        await expect(page.locator('.mdl-dropdown-list-item', { hasText: 'Opacity' })).toBeVisible();
        await expect(page.locator('.mdl-dropdown-list-item', { hasText: 'Notation' })).toHaveCount(0);
        await page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector').click();
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        const rows = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item:visible');
        await expect(rows.last()).toContainText('Notation');
        const row = rows.last();
        await expect.poll(() => readPillNotations(row)).toEqual(['decimal', 'scientific', 'e']);
        const selected = row.locator('.dx-item-selected');
        await expect(selected).toHaveAttribute('data-notation', 'decimal');
        // The grey button is what is under the pointer at its middle: the pill has not covered it.
        expect(await selected.evaluate(button => {
            const box = button.getBoundingClientRect();
            return button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
        })).toBe(true);
        expect(await selected.evaluate(button => getComputedStyle(button).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
        await pill(row, 'e').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Ruler').properties.notation)).toBe('e');
    });

    test('is written on a chart\'s ticks and a referential\'s axes', async ({ page }) => {
        await setupBoard(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await page.evaluate(() => {
            shell.commands.addShape('ChartShape', 'Chart');
            modellus.shape.addReferential('Referential');
        });
        await page.waitForTimeout(500);
        await setNotation(page, 'Chart', 'scientific');
        await setNotation(page, 'Referential', 'e');
        await expect.poll(() => readTexts(page, 'Chart').then(texts => texts.some(text => text.includes('×10')))).toBe(true);
        await expect.poll(() => readTexts(page, 'Referential').then(texts => texts.some(text => /e-?\d/.test(text)))).toBe(true);
    });

    test('is written by an object built from blocks, on its scale and its reading', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('ruler', 'Ruler');
            shape.setProperties({ x: 60, y: 60, width: 320, height: 64, notation: 'scientific' });
            shape.draw();
        });
        await expect.poll(() => page.evaluate(() => Array.from(shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('text[data-source-id^="tick-label"]')).map(node => node.textContent)))
            .toEqual(['0', '1×10⁰', '2×10⁰', '3×10⁰', '4×10⁰', '5×10⁰', '6×10⁰', '7×10⁰', '8×10⁰', '9×10⁰', '1×10¹']);
        await setNotation(page, 'Ruler', 'e');
        await expect.poll(() => page.evaluate(() => Array.from(shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('text[data-source-id^="tick-label"]')).map(node => node.textContent)))
            .toContain('1e1');
    });

    test('is written in the cells of a table', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            shell.commands.addShape('TableShape', 'Table');
            const table = shell.board.shapes.getByName('Table');
            const names = ['t', 'p'];
            const values = [[0, 10], [1, 20], [2, 30]];
            table.properties.externalData = { names, values };
            table.properties.originalExternalData = { names: [...names], values: values.map(row => [...row]) };
            table.setProperties({ columns: [{ term: 't', case: 1, color: 'transparent' }, { term: 'p', case: 1, color: 'transparent' }] });
            shell.reset();
            table.refreshTableColumns();
            table.refreshTableRows();
            table.draw();
        });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => /\d\.\d+e-?\d+/.test(shell.board.shapes.getByName('Table').element.textContent))).toBe(false);
        await setNotation(page, 'Table', 'e');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Table').table.formatNumber(2.5, 2))).toBe('2.50e0');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Table').element.textContent.includes('1.00e1'))).toBe(true);
    });
});
