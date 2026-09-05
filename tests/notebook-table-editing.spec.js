const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
    await expect.poll(() => page.evaluate(() => notebook.blocks.length)).toBeGreaterThanOrEqual(0);
}

async function addPreloadedTableBlock(page) {
    await page.evaluate(() => {
        notebook.addBlock('table');
    });
    await expect.poll(() => page.evaluate(() => Array.from(notebook.shapeInstances.values()).some(shape => shape.table))).toBe(true);
    await page.evaluate(() => {
        const shape = Array.from(notebook.shapeInstances.values()).find(instance => instance.table);
        const names = ['t', 'p'];
        const values = [[0, 10], [1, 20], [2, 30]];
        shape.properties.externalData = { names: names, values: values };
        shape.properties.originalExternalData = { names: [...names], values: values.map(row => [...row]) };
        shape.properties.columns = [{ term: 't', case: 1, color: 'transparent' }, { term: 'p', case: 1, color: 'transparent' }];
        shape.refreshTableColumns();
        shape.refreshTableRows();
        shape.draw();
    });
    await expect.poll(() => page.evaluate(() => getBlockTable().rows.length)).toBe(3);
    await page.evaluate(() => getBlockTable().rootElement.ownerSVGElement.scrollIntoView({ block: 'center' }));
    await expect.poll(() => page.evaluate(() => getBlockTable().rootElement.getBoundingClientRect().top)).toBeLessThan(500);
}

async function getCellClientPoint(page, rowIndex, columnIndex) {
    return page.evaluate(({ rowIndex, columnIndex }) => {
        const table = getBlockTable();
        const cellBox = table.cellBoxes.find(box => box.rowIndex === rowIndex && box.columnIndex === columnIndex);
        const clientPoint = new DOMPoint(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2).matrixTransform(table.rootElement.getScreenCTM());
        return { x: clientPoint.x, y: clientPoint.y };
    }, { rowIndex: rowIndex, columnIndex: columnIndex });
}

async function readEditingState(page) {
    return page.evaluate(() => {
        const editor = getBlockTable().editingCell?.editor;
        return editor ? { text: editor.text, caretIndex: editor.caretIndex } : null;
    });
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.getBlockTable = () => Array.from(notebook.shapeInstances.values()).find(instance => instance.table).table;
    });
});

test('a table block writes its cells with the caret the arrow keys move', async ({ page }) => {
    await setupNotebook(page);
    await addPreloadedTableBlock(page);

    const cellPoint = await getCellClientPoint(page, 0, 1);
    await page.mouse.dblclick(cellPoint.x, cellPoint.y);
    await expect.poll(() => readEditingState(page)).toEqual({ text: '10.00', caretIndex: 5 });

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('5');
    expect(await readEditingState(page)).toEqual({ text: '10.500', caretIndex: 4 });

    await page.keyboard.press('Home');
    await page.keyboard.press('Delete');
    expect(await readEditingState(page)).toEqual({ text: '0.500', caretIndex: 0 });

    await page.keyboard.press('Enter');
    const committedValue = await page.evaluate(() => getBlockTable().rows[0].column1);
    expect(committedValue).toBe(0.5);
});

test('a table block standing outside a model still writes a value measured as a name', async ({ page }) => {
    await setupNotebook(page);
    await page.evaluate(() => {
        notebook.addBlock('table');
    });
    await expect.poll(() => page.evaluate(() => Array.from(notebook.shapeInstances.values()).some(shape => shape.table))).toBe(true);
    await page.evaluate(() => {
        const shape = Array.from(notebook.shapeInstances.values()).find(instance => instance.table);
        const names = ['species', 'length'];
        const values = [['setosa', 5.1], ['virginica', 6.3]];
        shape.properties.externalData = { names: names, values: values };
        shape.properties.originalExternalData = { names: [...names], values: values.map(row => [...row]) };
        shape.properties.columns = [{ term: 'species', case: 1, color: 'transparent' }, { term: 'length', case: 1, color: 'transparent' }];
        shape.refreshTableColumns();
        shape.refreshTableRows();
        shape.draw();
    });

    const cellTexts = await page.evaluate(() => {
        const table = getBlockTable();
        return table.rows.map(row => table.options.columns.map(column => table.getCellText(row, column)));
    });

    expect(cellTexts).toEqual([['setosa', '5.10'], ['virginica', '6.30']]);
});
