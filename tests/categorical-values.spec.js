const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addExpression(page, name, expression) {
    await page.evaluate(({ shapeName }) => modellus.shape.addExpression(shapeName), { shapeName: name });
    await page.waitForTimeout(400);
    await page.evaluate(({ shapeName, shapeExpression }) => {
        shell.board.shapes.getByName(shapeName).properties.expression = shapeExpression;
        shell.reset();
    }, { shapeName: name, shapeExpression: expression });
    await page.waitForTimeout(400);
}

async function addCasesTable(page, name) {
    await page.evaluate(({ shapeName }) => modellus.shape.addCasesTable(shapeName), { shapeName: name });
    await page.waitForTimeout(400);
    await page.evaluate(({ shapeName }) => {
        const tableShape = shell.board.shapes.getByName(shapeName);
        shell.board.selection.select(tableShape);
        tableShape.update();
        tableShape.refreshTableRows();
    }, { shapeName: name });
    await page.waitForTimeout(200);
}

function readTable(page, shapeName, termName) {
    return page.evaluate(({ shapeName, termName }) => {
        const tableShape = shell.board.shapes.getByName(shapeName);
        const table = tableShape.table;
        const rowIndex = table.rows.findIndex(row => row.termName === termName);
        const columnIndex = table.options.columns.findIndex(column => column.key === tableShape.getCaseColumnKey(1));
        const row = table.rows[rowIndex];
        const column = table.options.columns[columnIndex];
        return {
            rowIndex: rowIndex,
            columnIndex: columnIndex,
            value: row ? row[column.key] : null,
            text: table.getCellText(row, column),
            options: table.getCellOptionsFor(row, column)
        };
    }, { shapeName, termName });
}

async function clickTableCell(page, shapeName, rowIndex, columnIndex) {
    const point = await page.evaluate(({ shapeName, rowIndex, columnIndex }) => {
        const table = shell.board.shapes.getByName(shapeName)?.table;
        const cellBox = table?.cellBoxes?.find(box => box.rowIndex === rowIndex && box.columnIndex === columnIndex);
        if (!cellBox)
            return null;
        const localPoint = new DOMPoint(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
        const screenPoint = localPoint.matrixTransform(table.rootElement.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    }, { shapeName, rowIndex, columnIndex });
    if (!point)
        throw new Error(`cell not found: row ${rowIndex} column ${columnIndex}`);
    await page.mouse.dblclick(point.x, point.y);
}

test.describe('Categorical values', () => {

    test('the scenarios table shows the label of a categorical term, not its number', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await addCasesTable(page, 'Inputs1');

        const cell = await readTable(page, 'Inputs1', 'z');

        expect(cell.rowIndex).toBeGreaterThanOrEqual(0);
        expect(cell.text).toBe('green');
        expect(cell.options.map(option => option.label)).toEqual(['green', 'blue', 'red']);
        expect(cell.value).not.toBe('green');
    });

    test('a numeric term keeps its numeric cell and offers no list', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', '\\frac{dx}{dt}=v');
        await addCasesTable(page, 'Inputs1');

        const cell = await readTable(page, 'Inputs1', 'v');

        expect(cell.text).toBe('0.00');
        expect(cell.options).toBeNull();
    });

    test('double clicking a categorical cell opens the list of its labels', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await addCasesTable(page, 'Inputs1');

        const cell = await readTable(page, 'Inputs1', 'z');
        await clickTableCell(page, 'Inputs1', cell.rowIndex, cell.columnIndex);
        await page.waitForTimeout(400);

        const labels = await page.locator('.mdl-table-cell-options .dx-list-item-content').allTextContents();
        expect(labels.map(label => label.trim())).toEqual(['green', 'blue', 'red']);
    });

    test('choosing a label from the list sets the value of the term', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await addCasesTable(page, 'Inputs1');

        const cell = await readTable(page, 'Inputs1', 'z');
        await clickTableCell(page, 'Inputs1', cell.rowIndex, cell.columnIndex);
        await page.waitForTimeout(400);
        await page.locator('.mdl-table-cell-options .dx-list-item-content', { hasText: 'red' }).first().click();
        await page.waitForTimeout(400);

        const result = await page.evaluate(() => ({
            label: shell.calculator.getValueLabel('z', shell.calculator.getByName('z')),
            violations: shell.calculator.system.getDiagnosticsByCode('DOMAIN_VIOLATION').length
        }));
        const cellAfter = await readTable(page, 'Inputs1', 'z');

        expect(result.label).toBe('red');
        expect(result.violations).toBe(0);
        expect(cellAfter.text).toBe('red');
    });

    test('each scenario keeps its own label', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await page.evaluate(() => {
            shell.setProperties({ casesCount: 2 });
            shell.reset();
        });
        await page.waitForTimeout(300);
        await addCasesTable(page, 'Inputs1');

        const result = await page.evaluate(() => {
            shell.calculator.setUserInput('z', 'green', 1, 1);
            shell.calculator.setUserInput('z', 'red', 1, 2);
            shell.calculator.calculate();
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            const table = tableShape.table;
            const row = table.rows.find(tableRow => tableRow.termName === 'z');
            return {
                first: shell.calculator.getValueLabel('z', shell.calculator.system.getByNameOnIteration(1, 'z', 1)),
                second: shell.calculator.getValueLabel('z', shell.calculator.system.getByNameOnIteration(1, 'z', 2)),
                texts: table.options.columns
                    .filter(column => column.key !== 'term')
                    .map(column => table.getCellText(row, column))
            };
        });

        expect(result.first).toBe('green');
        expect(result.second).toBe('red');
        expect(result.texts).toEqual(['green', 'red']);
    });

    test('a table of values shows the labels of a categorical column', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await page.evaluate(() => modellus.shape.addTable('Table1'));
        await page.waitForTimeout(500);

        const texts = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');
            tableShape.properties.columns = [{ term: 'z', case: 1, key: 'z' }];
            tableShape.update();
            tableShape.refreshTableRows();
            const table = tableShape.table;
            const column = table.options.columns.find(tableColumn => tableColumn.term === 'z');
            return table.rows.slice(0, 3).map(row => table.getCellText(row, column));
        });

        expect(texts.every(text => text === 'green')).toBe(true);
    });

    test('setUserInput accepts a label as well as the number behind it', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');

        const result = await page.evaluate(() => {
            const accepted = shell.calculator.setUserInput('z', 'blue');
            shell.calculator.calculate();
            return {
                accepted: accepted,
                label: shell.calculator.getValueLabel('z', shell.calculator.getByName('z')),
                unknown: shell.calculator.setUserInput('z', 'purple'),
                violations: shell.calculator.system.getDiagnosticsByCode('DOMAIN_VIOLATION').length
            };
        });

        expect(result.accepted).toBe(true);
        expect(result.label).toBe('blue');
        expect(result.unknown).toBe(false);
        expect(result.violations).toBe(0);
    });

    test('rnd picks one of the labels of the term it is assigned to', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1', 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace');
        await addExpression(page, 'Expr2', 'z=rnd\\left(3\\right)');

        const result = await page.evaluate(() => {
            const labels = [];
            for (let index = 0; index < 40; index++) {
                shell.reset();
                shell.calculator.calculate();
                labels.push(shell.calculator.getValueLabel('z', shell.calculator.getByName('z')));
            }
            return {
                labels: [...new Set(labels)].sort(),
                violations: shell.calculator.system.getDiagnosticsByCode('DOMAIN_VIOLATION').length
            };
        });

        expect(result.labels).toEqual(['blue', 'green', 'red']);
        expect(result.violations).toBe(0);
    });
});
