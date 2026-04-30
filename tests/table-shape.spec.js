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

async function addTable(page, name) {
    await page.evaluate(n => modellus.shape.addTable(n), name);
    await page.waitForTimeout(400);
}

async function setupPreloadedTable(page) {
    await page.evaluate(() => {
        shell.calculator.loadTerms(['t', 'p'], [
            [0, 10],
            [1, 20],
            [2, 30]
        ]);
        modellus.shape.setProperties('Table1', {
            columns: [
                { term: 't', case: 1, color: 'transparent' },
                { term: 'p', case: 1, color: 'transparent' }
            ]
        });
        const tableShape = shell.board.shapes.getByName('Table1');
        tableShape.refreshTableColumns();
        tableShape.refreshTableRows();
        tableShape.draw();
    });
    await page.waitForTimeout(300);
}

async function loadPreloadedDataIntoExistingTable(page) {
    await page.evaluate(() => {
        modellus.shape.setProperties('Table1', {
            columns: [
                { term: 'a', case: 1, color: 'transparent' },
                { term: 'b', case: 1, color: 'transparent' },
                { term: 'c', case: 1, color: 'transparent' }
            ]
        });
        shell.loadPreloadedData(['a', 'b', 'c'], [
            [1, 2, 23],
            [2, 4, 43],
            [3, 5, 52],
            [4, 6, 34],
            [5, 7, 213],
            [6, 8, 12],
            [7, 9, 32],
            [8, 7, 43],
            [9, 4, 12],
            [10, 3, 21]
        ]);
    });
    await page.waitForTimeout(500);
}

async function getCellClientPoint(page, rowIndex, columnIndex) {
    return page.evaluate(({ rowIndex, columnIndex }) => {
        const tableShape = shell.board.shapes.getByName('Table1');
        const table = tableShape?.table;
        if (!table)
            return null;
        const layout = table.getLayout();
        const geometry = table.getColumnGeometry(layout, table.options.columns);
        const rowHeight = Math.max(16, Number(table.options.rowHeight) || 24);
        const cell = geometry[columnIndex];
        if (!cell)
            return null;
        const localX = cell.x + cell.width / 2;
        const localY = layout.headerHeight + rowIndex * rowHeight + rowHeight / 2;
        const ctm = table.rootElement?.getScreenCTM?.();
        if (!ctm)
            return null;
        const clientPoint = new DOMPoint(localX, localY).matrixTransform(ctm);
        return { x: clientPoint.x, y: clientPoint.y };
    }, { rowIndex: rowIndex, columnIndex: columnIndex });
}

test.describe('Table shape editing', () => {
    test('double click on PRELOADED cell enters edit mode and clears table selection border', async ({ page }) => {
        await setupEditor(page);
        await addTable(page, 'Table1');
        await setupPreloadedTable(page);
        const targetCellPoint = await getCellClientPoint(page, 0, 1);
        expect(targetCellPoint).toBeTruthy();
        await page.mouse.dblclick(targetCellPoint.x, targetCellPoint.y);
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');
            const editingCell = tableShape?.table?.editingCell ?? null;
            const selectedShape = shell.board.selection.selectedShape;
            const columns = tableShape?.table?.options?.columns ?? [];
            return {
                canEditPreloadedCell: tableShape?.table?.canEditCell(0, 1) === true,
                editingCell: editingCell ? { rowIndex: editingCell.rowIndex, columnIndex: editingCell.columnIndex } : null,
                selectedShapeId: selectedShape?.id ?? null,
                tableShapeId: tableShape?.id ?? null,
                columns: columns.map(column => ({ term: column.term, editable: column.editable === true, isPreloadedTerm: column.isPreloadedTerm === true }))
            };
        });
        expect(state.canEditPreloadedCell).toBeTruthy();
        expect(state.editingCell).toEqual({ rowIndex: 0, columnIndex: 1 });
        expect(state.selectedShapeId).toBeNull();
        expect(state.selectedShapeId).not.toBe(state.tableShapeId);
    });

    test('SHIFT click selects PRELOADED cell range', async ({ page }) => {
        await setupEditor(page);
        await addTable(page, 'Table1');
        await setupPreloadedTable(page);
        const anchorCellPoint = await getCellClientPoint(page, 0, 1);
        const targetCellPoint = await getCellClientPoint(page, 2, 1);
        expect(anchorCellPoint).toBeTruthy();
        expect(targetCellPoint).toBeTruthy();
        await page.mouse.click(anchorCellPoint.x, anchorCellPoint.y);
        await page.keyboard.down('Shift');
        await page.mouse.click(targetCellPoint.x, targetCellPoint.y);
        await page.keyboard.up('Shift');
        await page.waitForTimeout(200);
        const selectionState = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');
            const table = tableShape?.table;
            const selectedCell = table?.selectedCell ?? null;
            const selectedCellRange = table?.selectedCellRange ?? null;
            return {
                selectedCell: selectedCell ? { rowIndex: selectedCell.rowIndex, columnIndex: selectedCell.columnIndex } : null,
                selectedCellRange: selectedCellRange
                    ? {
                        startRowIndex: selectedCellRange.startRowIndex,
                        endRowIndex: selectedCellRange.endRowIndex,
                        startColumnIndex: selectedCellRange.startColumnIndex,
                        endColumnIndex: selectedCellRange.endColumnIndex
                    }
                    : null,
                anchorColumnIsPreloaded: table?.isPreloadedColumn(1) === true,
                columns: (table?.options?.columns ?? []).map(column => ({ term: column.term, editable: column.editable === true, isPreloadedTerm: column.isPreloadedTerm === true }))
            };
        });
        expect(selectionState.anchorColumnIsPreloaded).toBeTruthy();
        expect(selectionState.selectedCell).toEqual({ rowIndex: 2, columnIndex: 1 });
        expect(selectionState.selectedCellRange).toEqual({
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 1,
            endColumnIndex: 1
        });
    });

    test('preloaded metadata refreshes after data is loaded into an existing table', async ({ page }) => {
        await setupEditor(page);
        await addTable(page, 'Table1');
        await loadPreloadedDataIntoExistingTable(page);
        const targetCellPoint = await getCellClientPoint(page, 6, 1);
        expect(targetCellPoint).toBeTruthy();
        await page.mouse.dblclick(targetCellPoint.x, targetCellPoint.y);
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');
            const table = tableShape?.table;
            const columns = table?.options?.columns ?? [];
            const editingCell = table?.editingCell ?? null;
            const selectedShape = shell.board.selection.selectedShape;
            return {
                columns: columns.map(column => ({ term: column.term, editable: column.editable === true, isPreloadedTerm: column.isPreloadedTerm === true })),
                canEditTargetCell: table?.canEditCell(6, 1) === true,
                editingCell: editingCell ? { rowIndex: editingCell.rowIndex, columnIndex: editingCell.columnIndex } : null,
                selectedShapeId: selectedShape?.id ?? null
            };
        });
        expect(state.columns).toEqual([
            { term: 'a', editable: true, isPreloadedTerm: true },
            { term: 'b', editable: true, isPreloadedTerm: true },
            { term: 'c', editable: true, isPreloadedTerm: true }
        ]);
        expect(state.canEditTargetCell).toBeTruthy();
        expect(state.editingCell).toEqual({ rowIndex: 6, columnIndex: 1 });
        expect(state.selectedShapeId).toBeNull();
    });
});
