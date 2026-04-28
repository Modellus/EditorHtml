const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/editor.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addExpression(page, name) {
    await page.evaluate(n => modellus.shape.addExpression(n), name);
    await page.waitForTimeout(500);
}

async function addTable(page, name) {
    await page.evaluate(n => modellus.shape.addTable(n), name);
    await page.waitForTimeout(500);
}

async function setExpressionValue(page, name, value) {
    await page.evaluate(({ n, v }) => {
        const shape = shell.board.shapes.getByName(n);
        shape.properties.expression = v;
        shape.mathfield.value = v;
        shape.mathfield.position = 0;
        shape.mathfield.executeCommand('moveToNextChar');
    }, { n: name, v: value });
}

test.describe('Cases expression values in table', () => {
    test('x is 1 at t=0, NaN from 0.1 to 1.9, and matches y from t>=2', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await addTable(page, 'Table1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x=\\begin{cases}1 & t=0\\\\ y & t\\ge2\\end{cases}\\\\ y=t\\cdot2}');
        await page.evaluate(() => {
            modellus.shape.setProperties('Table1', {
                columns: [
                    { term: 't', case: 1, color: 'transparent' },
                    { term: 'x', case: 1, color: 'transparent' }
                ]
            });
            shell.reset();
            for (let iterationIndex = 0; iterationIndex < 160; iterationIndex++)
                shell.calculator.engine.iterate();
            const tableShape = shell.board.shapes.getByName('Table1');
            tableShape?.refreshTableRows();
        });
        await page.waitForTimeout(600);
        const tableRows = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');
            return tableShape?.table?.rows ?? [];
        });
        const tolerance = 1e-9;
        const rowAtZero = tableRows.find(row => Math.abs(Number(row.column0) - 0) < tolerance);
        expect(rowAtZero).toBeTruthy();
        expect(Number(rowAtZero.column1)).toBe(1);
        const nanWindowRows = tableRows.filter(row => {
            const independentValue = Number(row.column0);
            return independentValue >= 0.1 - tolerance && independentValue <= 1.9 + tolerance;
        });
        expect(nanWindowRows.length).toBeGreaterThan(0);
        nanWindowRows.forEach(row => {
            expect(Number.isNaN(Number(row.column1))).toBeTruthy();
        });
        const rowsFromTwo = tableRows.filter(row => Number(row.column0) >= 2 - tolerance);
        expect(rowsFromTwo.length).toBeGreaterThan(0);
        rowsFromTwo.forEach(row => {
            const independentValue = Number(row.column0);
            const expectedValue = independentValue * 2;
            const actualValue = Number(row.column1);
            expect(actualValue).toBeCloseTo(expectedValue, 8);
        });
    });
});
