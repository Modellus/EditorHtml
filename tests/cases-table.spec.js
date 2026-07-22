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

async function setupModelWithCasesTable(page, casesCount) {
    await page.evaluate(() => modellus.shape.addExpression('Expr1'));
    await page.waitForTimeout(400);
    await page.evaluate(({ count }) => {
        const shape = shell.board.shapes.getByName('Expr1');
        shape.properties.expression = '\\frac{dx}{dt}=v';
        shell.setProperties({ casesCount: count });
        shell.reset();
        modellus.shape.addCasesTable('Inputs1');
    }, { count: casesCount });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const tableShape = shell.board.shapes.getByName('Inputs1');
        shell.board.selection.select(tableShape);
        tableShape.update();
        tableShape.refreshTableRows();
    });
    await page.waitForTimeout(200);
}

async function getTableCellPoint(page, shapeName, rowIndex, columnIndex) {
    const point = await page.evaluate(({ shapeName, rowIndex, columnIndex }) => {
        const table = shell.board.shapes.getByName(shapeName)?.table;
        const cellBox = table?.cellBoxes?.find(box => box.rowIndex === rowIndex && box.columnIndex === columnIndex);
        if (!cellBox || !table.rootElement.getScreenCTM)
            return null;
        const localPoint = new DOMPoint(cellBox.x + cellBox.width / 2, cellBox.y + cellBox.height / 2);
        const screenPoint = localPoint.matrixTransform(table.rootElement.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    }, { shapeName, rowIndex, columnIndex });
    if (!point)
        throw new Error(`cell not found: row ${rowIndex} column ${columnIndex}`);
    return point;
}

async function clickTableCell(page, shapeName, rowIndex, columnIndex) {
    const point = await getTableCellPoint(page, shapeName, rowIndex, columnIndex);
    await page.mouse.click(point.x, point.y);
}

test.describe('Cases table', () => {
    test('base group: independent row followed by term rows, in a single flat color', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape?.table;
            return {
                shapeClass: tableShape?.constructor?.name ?? null,
                columns: (table?.options?.columns ?? []).map(column => ({
                    key: column.key,
                    isText: column.isText === true,
                    editable: column.editable === true,
                    showCase: column.showCase === true,
                    useHeaderFontSize: column.useHeaderFontSize === true
                })),
                rows: (table?.rows ?? []).map(row => ({
                    key: row.key,
                    isIndependentRow: row.isIndependentRow === true,
                    termName: row.termName,
                    term: row.term,
                    iteration: row.iteration,
                    case1: row.case1,
                    case2: row.case2,
                    rowBackgroundColor: row.rowBackgroundColor,
                    textIndent: row.textIndent
                })),
                independentRowCase1Editable: table?.canEditCell(0, 1) === true,
                independentRowTermEditable: table?.canEditCell(0, 0) === true,
                termRowEditable: table?.canEditCell(1, 1) === true,
                groupColor: tableShape.getGroupColor(1, 1),
                backgroundColor: tableShape.properties.backgroundColor
            };
        });

        expect(state.shapeClass).toBe('CasesTableShape');
        expect(state.columns).toEqual([
            { key: 'term', isText: true, editable: false, showCase: false, useHeaderFontSize: true },
            { key: 'case1', isText: false, editable: true, showCase: true, useHeaderFontSize: false },
            { key: 'case2', isText: false, editable: true, showCase: true, useHeaderFontSize: false },
            { key: 'case3', isText: false, editable: true, showCase: true, useHeaderFontSize: false }
        ]);
        expect(state.rows).toEqual([
            { key: 'independent|1', isIndependentRow: true, termName: undefined, term: 't', iteration: 1, case1: 0, case2: undefined, rowBackgroundColor: state.groupColor, textIndent: undefined },
            { key: 'x|1', isIndependentRow: false, termName: 'x', term: 'x', iteration: 1, case1: 0, case2: 0, rowBackgroundColor: undefined, textIndent: 14 },
            { key: 'v|1', isIndependentRow: false, termName: 'v', term: 'v', iteration: 1, case1: 0, case2: 0, rowBackgroundColor: undefined, textIndent: 14 }
        ]);
        expect(state.independentRowCase1Editable).toBeTruthy();
        expect(state.independentRowTermEditable).toBeFalsy();
        expect(state.termRowEditable).toBeTruthy();
        // The highlight must be visually distinct from the ordinary row background, not a coincidental match.
        expect(state.groupColor.toLowerCase()).not.toBe(state.backgroundColor.toLowerCase());
    });

    test('groups get distinct sequential colors by default, and the user can override a group color', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.addGroup();
            const table = tableShape.table;
            const colorsBeforeOverride = table.rows.filter(row => row.isIndependentRow).map(row => row.rowBackgroundColor);
            tableShape.setGroupColor(2, '#123456');
            tableShape.refreshTableRows();
            const colorsAfterOverride = table.rows.filter(row => row.isIndependentRow).map(row => ({ iteration: row.iteration, color: row.rowBackgroundColor }));
            return { colorsBeforeOverride, colorsAfterOverride };
        });

        // Three distinct groups must get three distinct default colors, not shades of the same hue.
        expect(new Set(result.colorsBeforeOverride).size).toBe(3);
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 2).color).toBe('#123456');
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 1).color).not.toBe('#123456');
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 3).color).not.toBe('#123456');
    });

    test('double-clicking the base moment cell enters edit mode but does not move the base group', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const baseRow = table.rows.find(row => row.isIndependentRow && row.iteration === 1);
            const column = table.options.columns.find(c => c.key === 'case1');
            const canEdit = table.canEditCell(0, 1);
            const accepted = tableShape.onTableCellValueChanged({ row: baseRow, column: column, value: 5 });
            tableShape.refreshTableRows();
            return {
                canEdit,
                accepted,
                baseValueAfter: table.rows.find(row => row.isIndependentRow && row.iteration === 1)?.case1,
                xIterations: shell.calculator.getUserInputIterations('x')
            };
        });

        expect(result.canEdit).toBe(true);
        expect(result.accepted).toBe(true);
        expect(result.baseValueAfter).toBe(0);
        expect(result.xIterations).toEqual([]);
    });

    test('the case-header strip is hidden with one case and shown with more than one', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const singleCaseState = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return { headerHeight: tableShape.table.getLayout().headerHeight, showHeader: tableShape.table.options.showHeader };
        });
        expect(singleCaseState.showHeader).toBe(false);
        expect(singleCaseState.headerHeight).toBe(0);

        await page.evaluate(() => {
            shell.setProperties({ casesCount: 2 });
            shell.reset();
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.update();
            tableShape.refreshTableRows();
        });
        await page.waitForTimeout(200);

        const multiCaseState = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return { headerHeight: tableShape.table.getLayout().headerHeight, showHeader: tableShape.table.options.showHeader };
        });
        expect(multiCaseState.showHeader).toBe(true);
        expect(multiCaseState.headerHeight).toBeGreaterThan(0);
    });

    test('increasing casesCount through the normal property command preserves existing groups and per-case values', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const vRow = table.rows.find(row => row.termName === 'v');
            const column = table.options.columns.find(c => c.key === 'case1');
            tableShape.onTableCellValueChanged({ row: vRow, column: column, value: 7 });
            tableShape.addGroup();

            shell.setPropertyCommand('casesCount', 3);
            tableShape.update();
            tableShape.refreshTableRows();

            const system = shell.calculator.system;
            return {
                vCase1AfterCasesChange: system.getByNameOnIteration(1, 'v', 1),
                xIterationsAfterCasesChange: shell.calculator.getUserInputIterations('x'),
                vIterationsAfterCasesChange: shell.calculator.getUserInputIterations('v'),
                rowKeysAfterCasesChange: tableShape.table.rows.map(row => row.key)
            };
        });

        expect(result.vCase1AfterCasesChange).toBeCloseTo(7, 8);
        expect(result.xIterationsAfterCasesChange).toEqual([2]);
        expect(result.vIterationsAfterCasesChange).toEqual([2]);
        expect(result.rowKeysAfterCasesChange).toEqual(['independent|1', 'x|1', 'v|1', 'independent|2', 'x|2', 'v|2']);
    });

    test('groups added while multiple cases are already active render immediately', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            return { rowKeys: tableShape.table.rows.map(row => row.key) };
        });

        expect(result.rowKeys).toEqual(['independent|1', 'x|1', 'v|1', 'independent|2', 'x|2', 'v|2']);
    });

    test('editing case cells sets per-case initial values and produces distinct trajectories', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const vRow = table.rows.find(row => row.termName === 'v');
            const accepted = [];
            for (let caseNumber = 1; caseNumber <= 3; caseNumber++) {
                const column = table.options.columns.find(c => c.key === `case${caseNumber}`);
                accepted.push(tableShape.onTableCellValueChanged({
                    row: vRow,
                    rowKey: vRow.key,
                    column: column,
                    value: caseNumber
                }));
            }
            for (let iterationIndex = 0; iterationIndex < 10; iterationIndex++)
                shell.calculator.engine.iterate();
            const system = shell.calculator.system;
            return {
                accepted,
                vByCase: [1, 2, 3].map(c => system.getByNameOnIteration(5, 'v', c)),
                xByCase: [1, 2, 3].map(c => system.getByNameOnIteration(11, 'x', c))
            };
        });

        expect(result.accepted).toEqual([true, true, true]);
        expect(result.vByCase[0]).toBeCloseTo(1, 8);
        expect(result.vByCase[1]).toBeCloseTo(2, 8);
        expect(result.vByCase[2]).toBeCloseTo(3, 8);
        expect(result.xByCase[0]).toBeGreaterThan(0);
        expect(result.xByCase[1]).toBeCloseTo(result.xByCase[0] * 2, 6);
        expect(result.xByCase[2]).toBeCloseTo(result.xByCase[0] * 3, 6);
    });

    test('adding a group creates a new independent row and matching term rows for every selected term', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const added = tableShape.addGroup();
            const rows = tableShape.table.rows;
            return {
                added,
                rowKeys: rows.map(row => row.key),
                xIterations: shell.calculator.getUserInputIterations('x'),
                vIterations: shell.calculator.getUserInputIterations('v')
            };
        });

        expect(result.added).toBe(true);
        expect(result.rowKeys).toEqual(['independent|1', 'x|1', 'v|1', 'independent|2', 'x|2', 'v|2']);
        expect(result.xIterations).toEqual([2]);
        expect(result.vIterations).toEqual([2]);
    });

    test('editing the independent row moves the whole group to the new moment', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);
        await page.evaluate(() => {
            shell.setProperties({ playerTerm: 'iteration' });
            shell.reset();
        });

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            const table = tableShape.table;
            const independentRow = table.rows.find(row => row.isIndependentRow && row.iteration === 2);
            const column = table.options.columns.find(c => c.key === 'case1');
            const moved = tableShape.onTableCellValueChanged({ row: independentRow, column: column, value: 9 });
            return {
                moved,
                xIterationsAfter: shell.calculator.getUserInputIterations('x'),
                vIterationsAfter: shell.calculator.getUserInputIterations('v')
            };
        });

        expect(result.moved).toBe(true);
        expect(result.xIterationsAfter).toEqual([9]);
        expect(result.vIterationsAfter).toEqual([9]);
    });

    test('deleting an independent row removes every term at that moment', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            const deleted = tableShape.onTableRowDeleteRequested({ row: { isIndependentRow: true, iteration: 2 } });
            return {
                deleted,
                xIterations: shell.calculator.getUserInputIterations('x'),
                vIterations: shell.calculator.getUserInputIterations('v')
            };
        });

        expect(result.deleted).toBe(true);
        expect(result.xIterations).toEqual([]);
        expect(result.vIterations).toEqual([]);
    });

    test('deleting a term row only clears that term, leaving the rest of the group intact', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            const deleted = tableShape.onTableRowDeleteRequested({ row: { termName: 'v', iteration: 2 } });
            return {
                deleted,
                xIterations: shell.calculator.getUserInputIterations('x'),
                vIterations: shell.calculator.getUserInputIterations('v')
            };
        });

        expect(result.deleted).toBe(true);
        expect(result.xIterations).toEqual([2]);
        expect(result.vIterations).toEqual([]);
    });

    test('clicking the moment cell of any independent row, including the base one, reveals the delete button', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);
        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
        });

        await clickTableCell(page, 'Inputs1', 0, 1);
        await page.waitForTimeout(300);
        const baseRowDeleteVisible = await page.evaluate(() => shell.board.shapes.getByName('Inputs1')._focusedDeleteButtonElement?.dxButton('instance').option('visible'));
        expect(baseRowDeleteVisible).toBe(true);

        await clickTableCell(page, 'Inputs1', 3, 1);
        await page.waitForTimeout(300);
        const newGroupRowDeleteVisible = await page.evaluate(() => shell.board.shapes.getByName('Inputs1')._focusedDeleteButtonElement?.dxButton('instance').option('visible'));
        expect(newGroupRowDeleteVisible).toBe(true);
    });

    test('clicking the term name cell of an independent row does not reveal a toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await clickTableCell(page, 'Inputs1', 0, 0);
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                hasFocusedCells: tableShape.table.hasFocusedCells(),
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible')
            };
        });
        expect(state.hasFocusedCells).toBe(true);
        expect(state.toolbarVisible).toBe(false);
    });

    test('clicking a term row cell does not reveal a toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await clickTableCell(page, 'Inputs1', 1, 1);
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                hasFocusedCells: tableShape.table.hasFocusedCells(),
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible')
            };
        });
        expect(state.hasFocusedCells).toBe(true);
        expect(state.toolbarVisible).toBe(false);
    });

    test('deleting the base moment resets its values to zero instead of being blocked', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const vRow = table.rows.find(row => row.termName === 'v');
            const column = table.options.columns.find(c => c.key === 'case1');
            tableShape.onTableCellValueChanged({ row: vRow, column: column, value: 7 });
        });
        const afterEdit = await page.evaluate(() => shell.calculator.system.getByNameOnIteration(1, 'v', 1));
        expect(afterEdit).toBe(7);

        const removed = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').removeGroup(1));
        expect(removed).toBe(true);

        const afterRemoval = await page.evaluate(() => shell.calculator.system.getByNameOnIteration(1, 'v', 1));
        expect(afterRemoval).toBe(0);

        const stillHasBaseRow = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            return tableShape.table.rows.some(row => row.isIndependentRow && row.iteration === 1);
        });
        expect(stillHasBaseRow).toBe(true);
    });

    test('clicking the moment cell of any independent row (including the base one) reveals a color picker; clicking a term row does not', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);
        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
        });

        await clickTableCell(page, 'Inputs1', 0, 1);
        await page.waitForTimeout(300);
        const baseRowColorPickerPresent = await page.evaluate(() => !!shell.board.shapes.getByName('Inputs1')._focusedColorSlotElement?.find('.mdl-color-picker').length);
        expect(baseRowColorPickerPresent).toBe(true);

        await clickTableCell(page, 'Inputs1', 1, 1);
        await page.waitForTimeout(300);
        const termRowColorPickerPresent = await page.evaluate(() => !!shell.board.shapes.getByName('Inputs1')._focusedColorSlotElement?.find('.mdl-color-picker').length);
        expect(termRowColorPickerPresent).toBe(false);
    });

    test('top toolbar has an Add Group button that creates a new group via a real click', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.showContextToolbar();
        });
        await page.waitForTimeout(300);

        const before = await page.evaluate(() => shell.calculator.getUserInputIterations('x'));
        expect(before).toEqual([]);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape._addGroupButtonElement.dxButton('instance').option('onClick')();
        });
        await page.waitForTimeout(200);

        const after = await page.evaluate(() => shell.calculator.getUserInputIterations('x'));
        expect(after).toEqual([2]);
    });

    test('user inputs at a non-default moment survive serialize and open roundtrip', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const calculator = shell.calculator;
            calculator.setUserInput('v', 5, 6, 2);
            const model = shell.serialize();
            const serializedUserInputs = JSON.parse(JSON.stringify(model.properties.userInputsByCase ?? null));
            shell.openModel(JSON.stringify(model));
            const restoredUserInputs = shell.calculator.getUserInputsByCase();
            for (let iterationIndex = 0; iterationIndex < 10; iterationIndex++)
                shell.calculator.engine.iterate();
            const restoredShape = shell.board.shapes.getByName('Inputs1');
            return {
                serializedUserInputs,
                restoredUserInputs,
                vCase2At8: shell.calculator.system.getByNameOnIteration(8, 'v', 2),
                vCase1At8: shell.calculator.system.getByNameOnIteration(8, 'v', 1),
                restoredShapeClass: restoredShape?.constructor?.name ?? null
            };
        });

        expect(result.serializedUserInputs).toEqual({ 2: { v: { 6: 5 } } });
        expect(result.restoredUserInputs).toEqual({ 2: { v: { 6: 5 } } });
        expect(result.vCase2At8).toBeCloseTo(5, 8);
        expect(result.vCase1At8).not.toBeCloseTo(5, 8);
        expect(result.restoredShapeClass).toBe('CasesTableShape');
    });

    test('top toolbar table dropdown lists both table types and arms draw mode', async ({ page }) => {
        await setupEditor(page);
        await page.click('#table-button');
        await page.waitForTimeout(400);

        const menuState = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item .mdl-dropdown-list-label'));
            return items.map(item => item.textContent.trim());
        });
        expect(menuState).toEqual(['Table', 'Scenarios']);

        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(2)');
        await page.waitForTimeout(300);
        const armed = await page.evaluate(() => document.getElementById('svg').classList.contains('shape-draw-mode'));
        expect(armed).toBe(true);
    });

    test('the moment row has no vertical column dividers, unlike term rows', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            table.render();
            const layout = table.getLayout();
            const rowHeight = Math.max(16, Number(table.options.rowHeight) || 24);
            const countDividersAtY = y => Array.from(table.rowsLayer.querySelectorAll('line'))
                .filter(l => l.getAttribute('x1') === l.getAttribute('x2') && Number(l.getAttribute('y1')) === y)
                .length;
            return {
                independentRowDividers: countDividersAtY(layout.headerHeight),
                termRowDividers: countDividersAtY(layout.headerHeight + rowHeight),
                independentRowFlag: table.rows.find(r => r.isIndependentRow)?.hideColumnDividers,
                termRowFlag: table.rows.find(r => !r.isIndependentRow)?.hideColumnDividers
            };
        });

        expect(result.independentRowDividers).toBe(0);
        expect(result.termRowDividers).toBeGreaterThan(0);
        expect(result.independentRowFlag).toBe(true);
        expect(result.termRowFlag).toBeFalsy();
    });

    test('losing selection clears any focused cell back to the normal state', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await clickTableCell(page, 'Inputs1', 0, 1);
        await page.waitForTimeout(300);
        const focusedBefore = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').table.hasFocusedCells());
        expect(focusedBefore).toBe(true);

        await page.evaluate(() => shell.board.selection.deselect());
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                hasFocusedCells: tableShape.table.hasFocusedCells(),
                selectedCell: tableShape.table.selectedCell,
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible')
            };
        });
        expect(state.hasFocusedCells).toBe(false);
        expect(state.selectedCell).toBe(null);
        expect(state.toolbarVisible).toBe(false);
    });

    test('losing selection while editing a cell exits edit mode', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.table.startEditing(0, 1, null);
        });
        const editingBefore = await page.evaluate(() => !!shell.board.shapes.getByName('Inputs1').table.editingCell);
        expect(editingBefore).toBe(true);

        await page.evaluate(() => shell.board.selection.deselect());
        await page.waitForTimeout(300);

        const editingAfter = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').table.editingCell);
        expect(editingAfter).toBe(null);
    });

    test('double-clicking to edit, then clicking outside the shape, exits edit mode', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const point = await getTableCellPoint(page, 'Inputs1', 0, 1);
        await page.mouse.dblclick(point.x, point.y);
        await page.waitForTimeout(300);
        const editingBefore = await page.evaluate(() => !!shell.board.shapes.getByName('Inputs1').table.editingCell);
        expect(editingBefore).toBe(true);

        await page.locator('#svg').click({ position: { x: 1100, y: 650 } });
        await page.waitForTimeout(300);

        const editingAfter = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').table.editingCell);
        expect(editingAfter).toBe(null);
    });

    test('a NaN cell value renders and edits as empty', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const row = table.rows.find(r => r.termName === 'v');
            const column = table.options.columns.find(c => c.key === 'case1');
            row.case1 = NaN;
            const displayText = table.getCellText(row, column);
            const rowIndex = table.rows.indexOf(row);
            const columnIndex = table.options.columns.indexOf(column);
            table.startEditing(rowIndex, columnIndex, null);
            const editingText = table.editingCell?.text;
            return { displayText, editingText };
        });

        expect(result.displayText).toBe('');
        expect(result.editingText).toBe('');
    });

    test('the independent row text uses a contrasting color against its background', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            table.render();
            const independentRow = table.rows.find(row => row.isIndependentRow);
            const termText = Array.from(table.rowsLayer.querySelectorAll('text')).find(t => t.textContent === independentRow.term);
            return {
                groupColor: independentRow.rowBackgroundColor,
                textFill: termText?.getAttribute('fill'),
                expectedContrast: Utils.getContrastColor(independentRow.rowBackgroundColor)
            };
        });

        expect(result.textFill).toBe(result.expectedContrast);
    });

    test('the moment row keeps its group color and contrasting text when focused, instead of the generic selection tint', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await clickTableCell(page, 'Inputs1', 0, 0);
        await page.waitForTimeout(300);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const layout = table.getLayout();
            const independentRow = table.rows.find(row => row.isIndependentRow);
            const rowRect = Array.from(table.rowsLayer.querySelectorAll('rect'))
                .find(rect => Number(rect.getAttribute('width')) === layout.bodyWidth && Number(rect.getAttribute('y')) === layout.headerHeight);
            const termText = Array.from(table.rowsLayer.querySelectorAll('text')).find(t => t.textContent === independentRow.term);
            return {
                hasFocusedCells: table.hasFocusedCells(),
                groupColor: independentRow.rowBackgroundColor,
                rowRectFill: rowRect?.getAttribute('fill'),
                textFill: termText?.getAttribute('fill'),
                expectedContrast: Utils.getContrastColor(independentRow.rowBackgroundColor)
            };
        });

        expect(result.hasFocusedCells).toBe(true);
        expect(result.rowRectFill).toBe(result.groupColor);
        expect(result.textFill).toBe(result.expectedContrast);
    });

    test('clicking blank row space beyond the last column still selects the moment row and shows its toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.properties.width = 400;
            tableShape.draw();
            tableShape.update();
            tableShape.refreshTableRows();
        });
        await page.waitForTimeout(200);

        const point = await page.evaluate(() => {
            const table = shell.board.shapes.getByName('Inputs1').table;
            const layout = table.getLayout();
            const cellBox = table.cellBoxes.find(box => box.rowIndex === 0 && box.columnIndex === 0);
            const localPoint = new DOMPoint(layout.bodyWidth - 5, cellBox.y + cellBox.height / 2);
            const screenPoint = localPoint.matrixTransform(table.rootElement.getScreenCTM());
            return { x: screenPoint.x, y: screenPoint.y };
        });
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                hasFocusedCells: tableShape.table.hasFocusedCells(),
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible')
            };
        });
        expect(state.hasFocusedCells).toBe(true);
        expect(state.toolbarVisible).toBe(true);
    });

    test('renaming the independent term refreshes the table without an explicit manual refresh', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            shell.setPropertyCommand('independent.name', 'tau');
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return { term: tableShape.table.rows.find(row => row.isIndependentRow)?.term };
        });

        expect(result.term).toBe('tau');
    });

    test('hiding a case removes its column and its values, and the moment shifts to a still-visible case', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.setCaseVisible(1, false);
            tableShape.update();
            tableShape.refreshTableRows();
            const table = tableShape.table;
            return {
                columnKeys: table.options.columns.map(c => c.key),
                independentRowKeys: Object.keys(table.rows.find(row => row.isIndependentRow)).filter(k => k.startsWith('case')),
                termRowKeys: Object.keys(table.rows.find(row => row.termName === 'x')).filter(k => k.startsWith('case'))
            };
        });

        expect(result.columnKeys).toEqual(['term', 'case2', 'case3']);
        expect(result.independentRowKeys).toEqual(['case2']);
        expect(result.termRowKeys).toEqual(['case2', 'case3']);
    });

    test('the last remaining visible case cannot be hidden', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.setCaseVisible(1, false);
            tableShape.setCaseVisible(2, false);
            return tableShape.getVisibleCaseNumbers();
        });

        expect(result).toEqual([2]);
    });

    test('the Cases menu section only appears when there is more than one case', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        let sections = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const items = [];
            tableShape.populateTermsMenuSections(items);
            return items.map(item => item.text);
        });
        expect(sections).toEqual(['Rows']);

        await page.evaluate(() => {
            shell.setPropertyCommand('casesCount', 2);
            shell.board.shapes.getByName('Inputs1').update();
        });
        sections = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const items = [];
            tableShape.populateTermsMenuSections(items);
            return items.map(item => item.text);
        });
        expect(sections).toEqual(['Scenarios', 'Rows']);
    });

    test('changing casesCount updates the live terms dropdown without an explicit manual refresh', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.showContextToolbar();
            tableShape._termsDropdownElement.dxDropDownButton('instance').open();
        });
        await page.waitForTimeout(300);

        let hasCasesSection = await page.evaluate(() =>
            shell.board.shapes.getByName('Inputs1')._termsMenuContentElement[0].textContent.includes('Scenarios'));
        expect(hasCasesSection).toBe(false);

        await page.evaluate(() => {
            shell.setPropertyCommand('casesCount', 2);
            shell.reset();
        });
        await page.waitForTimeout(300);

        hasCasesSection = await page.evaluate(() =>
            shell.board.shapes.getByName('Inputs1')._termsMenuContentElement[0].textContent.includes('Scenarios'));
        expect(hasCasesSection).toBe(true);
    });

    test('the terms dropdown never shows a Moments section', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);
        await page.evaluate(() => shell.board.shapes.getByName('Inputs1').addGroup());

        const sections = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const items = [];
            tableShape.populateTermsMenuSections(items);
            return items.map(item => item.text);
        });
        expect(sections).not.toContain('Moments');
    });
});
