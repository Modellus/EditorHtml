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

async function setupTenRowTable(page) {
    await page.evaluate(() => {
        shell.calculator.setProperties({ independent: { name: 't', start: 0, end: 9, step: 1 } });
        modellus.shape.setProperties('Table1', {
            columns: [
                { term: 't', case: 1, color: 'transparent' },
                { term: 'y', case: 1, color: 'transparent' }
            ]
        });
        shell.loadPreloadedData(['y'], [
            [2],
            [5],
            [9],
            [14],
            [20],
            [27],
            [35],
            [44],
            [54],
            [65]
        ]);
        const tableShape = shell.board.shapes.getByName('Table1');
        tableShape.refreshTableColumns();
        tableShape.refreshTableRows();
        tableShape.draw();
    });
    await page.waitForTimeout(300);
}

test.describe('Table shape editing', () => {
    test('focused regression on center half passes iteration bounds and source term unchanged to calculator', async ({ page }) => {
        await setupEditor(page);
        await addTable(page, 'Table1');
        await setupTenRowTable(page);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Table1');

            const capturedCalls = [];
            let regressionResult = null;
            const originalApply = shell.calculator.applyDataRegression.bind(shell.calculator);
            shell.calculator.applyDataRegression = (sourceTermName, regressionType, caseNumber, startIteration, endIteration) => {
                capturedCalls.push({ sourceTermName, regressionType, caseNumber, startIteration, endIteration });
                regressionResult = originalApply(sourceTermName, regressionType, caseNumber, startIteration, endIteration);
                return regressionResult;
            };

            const totalRows = 10;
            const halfCount = Math.floor(totalRows / 2);
            const centerStart = Math.floor((totalRows - halfCount) / 2);
            const centerEnd = centerStart + halfCount - 1;

            const focusedRows = [];
            for (let rowIndex = centerStart; rowIndex <= centerEnd; rowIndex++)
                focusedRows.push({ rowIndex });

            tableShape._focusedCellsPayload = {
                focusedColumn: { term: 'y', caseNumber: 1 },
                focusedRows: focusedRows,
                hasFocusedCells: true
            };
            tableShape._focusedRegressionMethodValue = 'Linear';

            tableShape.applyFocusedCellsRegression();

            shell.calculator.applyDataRegression = originalApply;

            const expectedStartIteration = centerStart + 1;
            const expectedEndIteration = centerEnd + 1;

            const call = capturedCalls[0] ?? null;
            const targetTermName = regressionResult?.targetTermName ?? null;

            const centerIterations = [];
            const outerIterations = [];
            if (targetTermName) {
                for (let iteration = 1; iteration <= totalRows; iteration++) {
                    const iterationValues = shell.calculator.system.getIteration(iteration, 1);
                    const generatedValue = iterationValues?.[targetTermName];
                    const isCenter = iteration >= expectedStartIteration && iteration <= expectedEndIteration;
                    if (isCenter) {
                        const tValue = iteration - 1;
                        centerIterations.push({ iteration, tValue, generatedValue: Number.isFinite(generatedValue) ? generatedValue : null, expectedValue: 6.5 * tValue - 5 });
                    } else {
                        outerIterations.push({ iteration, generatedValue: generatedValue });
                    }
                }
            }

            return {
                capturedCallCount: capturedCalls.length,
                call,
                expectedStartIteration,
                expectedEndIteration,
                targetTermName,
                centerIterations,
                outerIterations
            };
        });

        expect(result.capturedCallCount).toBe(1);
        expect(result.call.sourceTermName).toBe('y');
        expect(result.call.regressionType).toBe('Linear');
        expect(result.call.startIteration).toBe(result.expectedStartIteration);
        expect(result.call.endIteration).toBe(result.expectedEndIteration);
        expect(result.targetTermName).toBeTruthy();
        for (const point of result.centerIterations)
            expect(point.generatedValue).toBeCloseTo(point.expectedValue, 5);
        for (const point of result.outerIterations)
            expect(point.generatedValue).toBeNaN();
    });

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
            const focusedCellRange = table?.focusedCellRange ?? null;
            return {
                selectedCell: selectedCell ? { rowIndex: selectedCell.rowIndex, columnIndex: selectedCell.columnIndex } : null,
                focusedCellRange: focusedCellRange
                    ? {
                        startRowIndex: focusedCellRange.startRowIndex,
                        endRowIndex: focusedCellRange.endRowIndex,
                        startColumnIndex: focusedCellRange.startColumnIndex,
                        endColumnIndex: focusedCellRange.endColumnIndex
                    }
                    : null,
                anchorColumnIsPreloaded: table?.isPreloadedColumn(1) === true,
                columns: (table?.options?.columns ?? []).map(column => ({ term: column.term, editable: column.editable === true, isPreloadedTerm: column.isPreloadedTerm === true }))
            };
        });
        expect(selectionState.anchorColumnIsPreloaded).toBeTruthy();
        expect(selectionState.selectedCell).toEqual({ rowIndex: 2, columnIndex: 1 });
        expect(selectionState.focusedCellRange).toEqual({
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
