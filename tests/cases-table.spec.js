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

async function addExpressionAndReparse(page, name, expression) {
    await page.evaluate(({ name }) => modellus.shape.addExpression(name), { name });
    await page.waitForTimeout(400);
    await page.evaluate(({ name, expression }) => {
        shell.board.shapes.getByName(name).properties.expression = expression;
        shell.reset();
    }, { name, expression });
    await page.waitForTimeout(400);
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

async function getTableRowPoint(page, shapeName, rowIndex, localX) {
    const point = await page.evaluate(({ shapeName, rowIndex, localX }) => {
        const table = shell.board.shapes.getByName(shapeName)?.table;
        const cellBox = table?.cellBoxes?.find(box => box.rowIndex === rowIndex);
        if (!cellBox || !table.rootElement.getScreenCTM)
            return null;
        const localPoint = new DOMPoint(localX, cellBox.y + cellBox.height / 2);
        const screenPoint = localPoint.matrixTransform(table.rootElement.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    }, { shapeName, rowIndex, localX });
    if (!point)
        throw new Error(`row not found: ${rowIndex}`);
    return point;
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
                    textIndent: row.textIndent,
                    spanColumnKey: row.spanColumnKey,
                    spanLabel: row.spanLabel
                })),
                independentRowCase1Editable: table?.canEditCell(0, 1) === true,
                independentRowTermEditable: table?.canEditCell(0, 0) === true,
                termRowEditable: table?.canEditCell(1, 1) === true,
                groupColor: tableShape.getGroupColor(1),
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
            { key: 'independent|1', isIndependentRow: true, termName: undefined, term: 't', iteration: 1, case1: 0, case2: undefined, rowBackgroundColor: state.groupColor, textIndent: undefined, spanColumnKey: 'case1', spanLabel: 't' },
            { key: 'x|1', isIndependentRow: false, termName: 'x', term: 'x', iteration: 1, case1: 0, case2: 0, rowBackgroundColor: undefined, textIndent: 14, spanColumnKey: undefined, spanLabel: undefined },
            { key: 'v|1', isIndependentRow: false, termName: 'v', term: 'v', iteration: 1, case1: 0, case2: 0, rowBackgroundColor: undefined, textIndent: 14, spanColumnKey: undefined, spanLabel: undefined }
        ]);
        expect(state.independentRowCase1Editable).toBeTruthy();
        expect(state.independentRowTermEditable).toBeFalsy();
        expect(state.termRowEditable).toBeTruthy();
        // The highlight must be visually distinct from the ordinary row background, not a coincidental match.
        expect(state.groupColor.toLowerCase()).not.toBe(state.backgroundColor.toLowerCase());
    });

    test('groups take their default color from the DevExtreme switch on-value style, and the user can override a group color', async ({ page }) => {
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
            const switchHost = $('<div>').appendTo('body');
            switchHost.dxSwitch({ value: true });
            const switchOnColor = Utils.toHexColor(getComputedStyle(switchHost.find('.dx-switch-container')[0], '::before').backgroundColor);
            switchHost.remove();
            return { colorsBeforeOverride, colorsAfterOverride, switchOnColor, groupColor: tableShape.getDefaultGroupColor() };
        });

        // Read off a live dxSwitch so the group color follows the DevExtreme theme instead of a copied hex.
        expect(result.switchOnColor).toMatch(/^#[0-9a-f]{6}$/);
        expect(result.groupColor).toBe(result.switchOnColor);
        expect(result.colorsBeforeOverride).toEqual([result.switchOnColor, result.switchOnColor, result.switchOnColor]);
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 2).color).toBe('#123456');
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 1).color).toBe(result.switchOnColor);
        expect(result.colorsAfterOverride.find(entry => entry.iteration === 3).color).toBe(result.switchOnColor);
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

    test('the independent row is a single cell spanning the whole table row', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            table.render();
            const layout = table.getLayout();
            const independentBoxes = table.cellBoxes.filter(box => box.rowIndex === 0);
            const termRowBoxes = table.cellBoxes.filter(box => box.rowIndex === 1);
            return {
                independentBoxes: independentBoxes.map(box => ({ x: box.x, width: box.width, columnIndex: box.columnIndex })),
                termRowBoxCount: termRowBoxes.length,
                bodyWidth: layout.bodyWidth,
                momentColumnIndex: table.options.columns.findIndex(column => column.key === tableShape.getMomentColumnKey())
            };
        });

        expect(state.independentBoxes).toEqual([{ x: 0, width: state.bodyWidth, columnIndex: state.momentColumnIndex }]);
        expect(state.termRowBoxCount).toBe(4);
    });

    test('clicking anywhere along the independent row focuses its spanning cell and reveals the toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const point = await getTableRowPoint(page, 'Inputs1', 0, 8);
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                hasFocusedCells: tableShape.table.hasFocusedCells(),
                focusedColumnKey: tableShape.table.getFocusedColumn()?.key,
                momentColumnKey: tableShape.getMomentColumnKey(),
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible')
            };
        });
        expect(state.hasFocusedCells).toBe(true);
        expect(state.focusedColumnKey).toBe(state.momentColumnKey);
        expect(state.toolbarVisible).toBe(true);
    });

    test('double-clicking the independent row edits only the value, keeping the term label in the editor', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const point = await getTableRowPoint(page, 'Inputs1', 0, 8);
        await page.mouse.dblclick(point.x, point.y);
        await page.waitForTimeout(300);

        const editorState = await page.evaluate(() => {
            const table = shell.board.shapes.getByName('Inputs1').table;
            return {
                editingText: table.editingCell?.text,
                editingColumnKey: table.options.columns[table.editingCell?.columnIndex]?.key,
                overlayText: Array.from(table.overlayLayer.querySelectorAll('text')).map(t => t.textContent)
            };
        });
        expect(editorState.editingColumnKey).toBe('case1');
        expect(editorState.editingText).toBe('0');
        expect(editorState.overlayText).toEqual(['t = 0']);

        await page.keyboard.press('Backspace');
        await page.keyboard.type('5');
        const afterTyping = await page.evaluate(() => {
            const table = shell.board.shapes.getByName('Inputs1').table;
            return {
                editingText: table.editingCell?.text,
                overlayText: Array.from(table.overlayLayer.querySelectorAll('text')).map(t => t.textContent)
            };
        });
        expect(afterTyping.editingText).toBe('5');
        expect(afterTyping.overlayText).toEqual(['t = 5']);
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

    test('top toolbar table dropdown lists all table types and arms draw mode', async ({ page }) => {
        await setupEditor(page);
        await page.click('#table-button');
        await page.waitForTimeout(400);

        const menuState = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item .mdl-dropdown-list-label'));
            return items.map(item => item.textContent.trim());
        });
        expect(menuState).toEqual(['Table', 'Scenarios', 'Data Analysis']);

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
            const spanText = Array.from(table.rowsLayer.querySelectorAll('text')).find(t => t.textContent.startsWith(`${independentRow.spanLabel} = `));
            return {
                groupColor: independentRow.rowBackgroundColor,
                spanTextContent: spanText?.textContent,
                textFill: spanText?.getAttribute('fill'),
                expectedContrast: Utils.getContrastColor(independentRow.rowBackgroundColor)
            };
        });

        expect(result.spanTextContent).toBe('t = 0.00');
        expect(result.textFill).toBe(result.expectedContrast);
    });

    test('the moment row keeps its group color and contrasting text when focused, instead of the generic selection tint', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await clickTableCell(page, 'Inputs1', 0, 1);
        await page.waitForTimeout(300);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const layout = table.getLayout();
            const independentRow = table.rows.find(row => row.isIndependentRow);
            const rowRect = Array.from(table.rowsLayer.querySelectorAll('rect'))
                .find(rect => Number(rect.getAttribute('width')) === layout.bodyWidth && Number(rect.getAttribute('y')) === layout.headerHeight);
            const spanText = Array.from(table.rowsLayer.querySelectorAll('text')).find(t => t.textContent.startsWith(`${independentRow.spanLabel} = `));
            return {
                hasFocusedCells: table.hasFocusedCells(),
                groupColor: independentRow.rowBackgroundColor,
                rowRectFill: rowRect?.getAttribute('fill'),
                textFill: spanText?.getAttribute('fill'),
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
            const cellBox = table.cellBoxes.find(box => box.rowIndex === 0);
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

    test('rows follow the model terms on every re-parse while the user has not changed them', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const before = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').getSelectedTermNames());
        expect(before.slice().sort()).toEqual(['v', 'x']);

        await addExpressionAndReparse(page, 'Expr2', '\\frac{dy}{dt}=w');

        const after = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                terms: tableShape.getSelectedTermNames(),
                rowTermNames: tableShape.table.rows.filter(row => !row.isIndependentRow).map(row => row.termName),
                columnsUserDefined: tableShape.properties.columnsUserDefined
            };
        });

        expect(after.terms.slice().sort()).toEqual(['v', 'w', 'x', 'y']);
        expect(after.rowTermNames.slice().sort()).toEqual(['v', 'w', 'x', 'y']);
        expect(after.columnsUserDefined).toBe(false);
    });

    test('values entered before a re-parse stay matched with their own term and case', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const vRow = tableShape.table.rows.find(row => row.termName === 'v');
            tableShape.onTableCellValueChanged({ row: vRow, column: tableShape.table.options.columns.find(c => c.key === 'case1'), value: 3 });
            tableShape.onTableCellValueChanged({ row: vRow, column: tableShape.table.options.columns.find(c => c.key === 'case2'), value: 8 });
            shell.calculator.setUserInput('x', 42, 4, 2);
        });

        await addExpressionAndReparse(page, 'Expr2', '\\frac{dy}{dt}=w');

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            const baseRow = tableShape.table.rows.find(row => row.termName === 'v' && row.iteration === 1);
            const movedRow = tableShape.table.rows.find(row => row.termName === 'x' && row.iteration === 4);
            return {
                vCase1: baseRow.case1,
                vCase2: baseRow.case2,
                xAtFourCase1: movedRow.case1,
                xAtFourCase2: movedRow.case2,
                userInputs: shell.calculator.getUserInputsByCase()
            };
        });

        expect(result.vCase1).toBeCloseTo(3, 8);
        expect(result.vCase2).toBeCloseTo(8, 8);
        expect(result.xAtFourCase2).toBeCloseTo(42, 8);
        expect(result.xAtFourCase1).not.toBeCloseTo(42, 8);
        expect(result.userInputs).toEqual({ 2: { x: { 4: 42 } } });
    });

    test('once the user changes the rows, a re-parse no longer replaces them', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const afterUserEdit = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.createColumnsControl();
            tableShape._columnsControl.options.onItemDeleting(0);
            return { terms: tableShape.getSelectedTermNames(), columnsUserDefined: tableShape.properties.columnsUserDefined };
        });

        expect(afterUserEdit.terms).toEqual(['v']);
        expect(afterUserEdit.columnsUserDefined).toBe(true);

        await addExpressionAndReparse(page, 'Expr2', '\\frac{dy}{dt}=w');

        const afterReparse = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').getSelectedTermNames());
        expect(afterReparse).toEqual(['v']);
    });

    test('a scenarios shape whose cases were never chosen shows every case, including ones added later', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const initial = tableShape.getVisibleCaseNumbers();
            shell.setPropertyCommand('casesCount', 3);
            shell.reset();
            tableShape.update();
            return {
                initial,
                afterCasesAdded: tableShape.getVisibleCaseNumbers(),
                columnKeys: tableShape.table.options.columns.map(column => column.key)
            };
        });

        expect(result.initial).toEqual([1]);
        expect(result.afterCasesAdded).toEqual([1, 2, 3]);
        expect(result.columnKeys).toEqual(['term', 'case1', 'case2', 'case3']);
    });

    test('once the user chooses which cases are shown, later cases are not added automatically', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.setCaseVisible(3, false);
            const chosen = tableShape.getVisibleCaseNumbers();
            shell.setPropertyCommand('casesCount', 5);
            shell.reset();
            tableShape.update();
            return {
                chosen,
                afterCasesAdded: tableShape.getVisibleCaseNumbers(),
                columnKeys: tableShape.table.options.columns.map(column => column.key)
            };
        });

        expect(result.chosen).toEqual([1, 2]);
        expect(result.afterCasesAdded).toEqual([1, 2]);
        expect(result.columnKeys).toEqual(['term', 'case1', 'case2']);
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
