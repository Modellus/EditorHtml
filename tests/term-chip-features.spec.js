const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function addModel(page, expression, settledTermName) {
    await page.evaluate(shapeExpression => {
        modellus.shape.addExpression('Expr1');
        const expressionShape = shell.board.shapes.getByName('Expr1');
        expressionShape.setProperties({ expression: shapeExpression });
        shell.reset();
    }, expression);
    await page.waitForFunction(termName => shell.calculator.getTermsNames().includes(termName), settledTermName);
}

// Selecting is what brings a shape's toolbar up, and the board can be busy re-reading the model at
// that moment, so the selection is made again until the toolbar is there and the menu is opened off
// the shape's own button rather than off whichever toolbar happens to be on screen.
async function openTermsMenu(page, shapeName) {
    await expect.poll(() => page.evaluate(name => {
        const shape = shell.board.shapes.getByName(name);
        shell.board.selection.select(shape);
        const termsButton = shape.contextToolbar?.querySelector('.mdl-terms-selector');
        if (!termsButton)
            return false;
        $(termsButton).dxDropDownButton('instance').open();
        return true;
    }, shapeName)).toBe(true);
    await expect(page.locator('.mdl-shape-overlay-popup .shape-term-term').first()).toBeVisible();
}

async function openTermChip(page, index = 0, scope = '.mdl-shape-overlay-popup') {
    await page.evaluate(([chipIndex, chipScope]) => $([...document.querySelectorAll(`${chipScope} .shape-term-term`)][chipIndex]).dxDropDownBox('instance').open(), [index, scope]);
    await expect(page.locator('.mdl-term-editor-rows:visible')).toHaveCount(1);
}

async function closeTermChip(page, index = 0, scope = '.mdl-shape-overlay-popup') {
    await page.evaluate(([chipIndex, chipScope]) => $([...document.querySelectorAll(`${chipScope} .shape-term-term`)][chipIndex]).dxDropDownBox('instance').close(), [index, scope]);
    await expect(page.locator('.mdl-term-editor-rows:visible')).toHaveCount(0);
}

async function readTermChipRowLabels(page, index = 0, scope = '.mdl-shape-overlay-popup') {
    await openTermChip(page, index, scope);
    const labels = await page.evaluate(() => Array.from([...document.querySelectorAll('.mdl-term-editor-rows')]
        .find(rows => rows.offsetParent !== null).querySelectorAll('.mdl-term-editor-row-label')).map(label => label.textContent));
    await closeTermChip(page, index, scope);
    return labels;
}

function readChipParts(page, scope) {
    return page.evaluate(chipScope => Array.from(document.querySelector(`${chipScope} .mdl-term-chip`).children).map(part => ({
        className: part.className,
        icons: Array.from(part.querySelectorAll('i')).map(icon => icon.className),
        text: part.textContent.trim()
    })), scope);
}

async function addChart(page, yTerms) {
    await page.evaluate(terms => {
        modellus.shape.addChart('Chart1');
        const chartShape = shell.board.shapes.getByName('Chart1');
        chartShape.setProperties({ xTerm: 't', xTermCase: 1, yTerms: terms, autoScale: true });
        chartShape.update();
        chartShape.draw();
    }, yTerms);
}

test.describe('Term chip features', () => {
    // The chip is the row: whatever the chip's drop down offers leaves a mark on it, so a reader
    // knows what a row holds without opening it.
    test('a chart row carries on its chip every option its drop down holds', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await addChart(page, [{ term: 'y', case: 1, color: '#1871c2', showLabel: true, chartTypes: ['line'] }]);
        await openTermsMenu(page, 'Chart1');
        const scope = '.chart-yterms-control';
        expect(await readTermChipRowLabels(page, 0, scope)).toEqual(['Show', 'Term', 'Unit', 'Colour', 'Type']);
        const parts = await readChipParts(page, scope);
        expect(parts.map(part => part.className.split(' ')[0])).toEqual([
            'mdl-term-chip__mark', 'mdl-term-chip__color', 'form-math-field', 'mdl-term-chip__mark'
        ]);
        expect(parts[0].icons[0]).toContain('fa-eye');
        expect(parts[3].icons).toEqual(['fa-light fa-chart-line']);
    });

    test('the eye on the chip closes with the label it stands for', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await addChart(page, [{ term: 'y', case: 1, color: '#1871c2', showLabel: false, chartTypes: ['line'] }]);
        await openTermsMenu(page, 'Chart1');
        const scope = '.chart-yterms-control';
        expect((await readChipParts(page, scope))[0].icons[0]).toBe('fa-light fa-eye-closed');
        await openTermChip(page, 0, scope);
        await page.locator('.mdl-term-editor-rows:visible .shape-term-visibility.dx-checkbox').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1').properties.yTerms[0].showLabel)).toBe(true);
        await closeTermChip(page, 0, scope);
        expect((await readChipParts(page, scope))[0].icons[0]).toBe('fa-light fa-eye');
    });

    // A series drawn more than one way says so: the chip carries one mark per way it is drawn.
    test('a series drawn as a line and an area carries both marks', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await addChart(page, [{ term: 'y', case: 1, color: '#1871c2', showLabel: true, chartTypes: ['line', 'area'] }]);
        await openTermsMenu(page, 'Chart1');
        const parts = await readChipParts(page, '.chart-yterms-control');
        expect(parts[parts.length - 1].icons).toEqual(['fa-light fa-chart-line', 'fa-light fa-chart-area']);
    });

    // A row that has not been handed a term yet says nothing at all, so the placeholder underneath
    // the chip still reads.
    test('an empty row carries no marks', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await addChart(page, [{ term: 'y', case: 1, color: '#1871c2', showLabel: true, chartTypes: ['line'] }]);
        await openTermsMenu(page, 'Chart1');
        const rowCount = await page.locator('.chart-yterms-control .shape-term-row').count();
        expect(rowCount).toBe(2);
        const parts = await page.evaluate(() => Array.from(document.querySelectorAll('.chart-yterms-control .mdl-term-chip')).pop().children.length);
        expect(parts).toBe(0);
    });

    // A frequency series is read as the mark it is drawn with and the function it makes of the
    // readings under it, so the chip carries the pair the button behind it carries.
    test('a frequency series carries its mark and its function on the chip', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, '\\displaylines{g=sign\\left(n-3\\right)\\\\y=2\\cdot n}', 'g');
        await page.evaluate(() => {
            modellus.shape.addFrequencyChart('Freq1');
            const shape = shell.board.shapes.getByName('Freq1');
            for (let index = 0; index < 6; index++)
                shell.calculator.engine.iterate();
            shape.setProperties({ categoryTerm: 'g', series: [{ term: 'g', case: 1, aggregate: 'count', axis: 'primary', mark: 'circle', color: '#1871c2' }] });
            shape.update();
            shape.draw();
        });
        await openTermsMenu(page, 'Freq1');
        const parts = await readChipParts(page, '.frequency-series-control');
        const seriesMark = parts[parts.length - 1];
        expect(seriesMark.icons).toEqual(['fa-light fa-circle shape-term-secondary-icon']);
        expect(seriesMark.text).toBe('count');
    });

    // A base shape reads one term rather than a list of them, and its chip is the same chip: the eye
    // and the lock its drop down offers are marked on it too.
    test('a base shape chip carries the eye and the lock its drop down holds', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, '\\frac{dx}{dt}=v', 'v');
        await page.evaluate(() => {
            shell.commands.addShape('GaugeShape', 'Gauge');
            shell.board.shapes.getByName('Gauge').setProperties({ x: 220, y: 140, width: 200, height: 200, term: 'v', value: 0 });
        });
        await openTermsMenu(page, 'Gauge');
        const scope = '.term-packed-terms-control';
        expect(await readTermChipRowLabels(page, 0, scope)).toEqual(['Show', 'Term', 'Unit', 'Locked']);
        expect((await readChipParts(page, scope)).map(part => part.icons[0])).toEqual([
            'fa-light fa-eye-closed', undefined, 'fa-light fa-lock-open'
        ]);
        await page.evaluate(() => shell.board.shapes.getByName('Gauge').setProperties({ termLocked: true, termDisplayMode: 'nameValue' }));
        await openTermsMenu(page, 'Gauge');
        expect((await readChipParts(page, scope)).map(part => part.icons[0])).toEqual([
            'fa-light fa-eye', undefined, 'fa-light fa-lock'
        ]);
    });

    test('a table column carries the mark its values are drawn with, under a label of its own', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'y=2\\cdot t', 'y');
        await page.evaluate(() => {
            modellus.shape.addTable('Table1');
            const tableShape = shell.board.shapes.getByName('Table1');
            tableShape.setProperties({ columns: [{ term: 'y', case: 1, color: '#1871c2', valueDisplayMode: 'lines' }] });
        });
        await openTermsMenu(page, 'Table1');
        const scope = '.table-columns-control';
        expect(await readTermChipRowLabels(page, 0, scope)).toContain('Values');
        const parts = await readChipParts(page, scope);
        expect(parts[parts.length - 1].icons).toEqual(['fa-light fa-chart-line']);
    });
});
