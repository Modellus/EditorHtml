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

async function getColumnLayout(page, shapeName) {
    return await page.evaluate(({ shapeName }) => {
        const tableShape = shell.board.shapes.getByName(shapeName);
        const table = tableShape.table;
        const layout = table.getLayout();
        return {
            keys: table.options.columns.map(column => column.key),
            widths: table.options.columns.map(column => table.getColumnWidth(column)),
            storedWidths: [...(tableShape.properties.columnWidths ?? [])],
            headerHeight: layout.headerHeight,
            scale: table.rootElement.getScreenCTM().a
        };
    }, { shapeName });
}

// Drags the right-hand divider of a column: over a body row when rowIndex is given, otherwise
// over the header strip, which is where the table shape puts its resize handles.
async function dragColumnDivider(page, shapeName, columnIndex, rowIndex, deltaX) {
    const point = await page.evaluate(({ shapeName, columnIndex, rowIndex }) => {
        const table = shell.board.shapes.getByName(shapeName)?.table;
        const layout = table.getLayout();
        const geometry = table.getColumnGeometry(layout, table.options.columns);
        const dividerX = geometry[columnIndex].x + geometry[columnIndex].width;
        let localY = layout.headerHeight / 2;
        if (rowIndex != null) {
            const cellBox = table.cellBoxes.find(box => box.rowIndex === rowIndex);
            localY = cellBox.y + cellBox.height / 2;
        }
        const screenPoint = new DOMPoint(dividerX, localY).matrixTransform(table.rootElement.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    }, { shapeName, columnIndex, rowIndex });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + deltaX, point.y, { steps: 5 });
    await page.mouse.up();
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
        expect(editorState.editingText).toBe('0.00');
        expect(editorState.overlayText).toEqual(['t = 0.00']);

        await page.keyboard.press('Delete');
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

    test('clicking a base term row cell does not reveal a toolbar', async ({ page }) => {
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

    test('a model saved with the legacy InitialValuesTableShape type still opens', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const model = shell.serialize();
            const legacyShape = model.board.find(shape => shape.type === 'CasesTableShape');
            legacyShape.type = 'InitialValuesTableShape';
            shell.openModel(JSON.stringify(model));
            const restoredShape = shell.board.shapes.getByName(legacyShape.properties.name);
            return {
                restoredShapeClass: restoredShape?.constructor?.name ?? null,
                reserializedType: shell.serialize().board.find(shape => shape.id === legacyShape.id)?.type ?? null
            };
        });

        expect(result.restoredShapeClass).toBe('CasesTableShape');
        expect(result.reserializedType).toBe('CasesTableShape');
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

    test('a cell edit starts from the value at the model precision', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const table = tableShape.table;
            const row = table.rows.find(r => r.termName === 'v');
            const column = table.options.columns.find(c => c.key === 'case1');
            row.case1 = 1.23456789;
            const displayText = table.getCellText(row, column);
            const rowIndex = table.rows.indexOf(row);
            const columnIndex = table.options.columns.indexOf(column);
            table.startEditing(rowIndex, columnIndex, null);
            return {
                precision: shell.board.calculator.getPrecision(),
                displayText: displayText,
                editingText: table.editingCell?.text
            };
        });

        expect(result.precision).toBe(2);
        expect(result.displayText).toBe('1.23');
        expect(result.editingText).toBe('1.23');
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
        expect(sections).toEqual([]);

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
        expect(sections).toEqual(['Scenarios']);
    });

    test('changing casesCount reveals the cases dropdown without an explicit manual refresh', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const singleCaseDisplay = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.showContextToolbar();
            return tableShape._casesItemElement.css('display');
        });
        expect(singleCaseDisplay).toBe('none');

        await page.evaluate(() => {
            shell.setPropertyCommand('casesCount', 2);
            shell.reset();
        });
        await page.waitForTimeout(300);

        const result = await page.evaluate(async () => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            const display = tableShape._casesItemElement.css('display');
            tableShape._termsDropdownElement.dxDropDownButton('instance').open();
            await new Promise(resolve => setTimeout(resolve, 300));
            return { display: display, hasCasesSection: tableShape._termsMenuContentElement[0].textContent.includes('Scenarios') };
        });

        expect(result.display).toBe('flex');
        expect(result.hasCasesSection).toBe(true);
    });

    test('rows follow the model terms on every re-parse', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const before = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').getSelectedTermNames());
        expect(before.slice().sort()).toEqual(['v', 'x']);

        await addExpressionAndReparse(page, 'Expr2', '\\frac{dy}{dt}=w');

        const after = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                terms: tableShape.getSelectedTermNames(),
                rowTermNames: tableShape.table.rows.filter(row => !row.isIndependentRow).map(row => row.termName)
            };
        });

        expect(after.terms.slice().sort()).toEqual(['v', 'w', 'x', 'y']);
        expect(after.rowTermNames.slice().sort()).toEqual(['v', 'w', 'x', 'y']);
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

    test('the rows cannot be curated by hand and a trimmed list is restored from the model', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const hasRowsControl = await page.evaluate(() => typeof shell.board.shapes.getByName('Inputs1').createColumnsControl === 'function');
        expect(hasRowsControl).toBe(false);

        const afterTrimmedList = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.properties.columns = [{ term: 'v', case: 1 }];
            tableShape.refreshTermReferenceState();
            return tableShape.getSelectedTermNames();
        });

        expect(afterTrimmedList.slice().sort()).toEqual(['v', 'x']);
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

    test('an interactive value change on a moment is recorded there and mirrored in the table', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.moveGroupIteration(2, 20);
            for (let index = 0; index < 40; index++)
                shell.calculator.engine.iterate();
            const iteration = shell.calculator.setIteration(20);
            shell.calculator.setTermValue('v', 7, iteration, 1);
            shell.calculator.calculate();
            tableShape.refreshTableRows();
            return {
                iteration,
                groupIterations: tableShape.getGroupIterations(),
                recorded: shell.calculator.getUserInput('v', 20, 1),
                cell: tableShape.table.rows.find(row => row.key === 'v|20')?.case1
            };
        });

        expect(result.iteration).toBe(20);
        expect(result.groupIterations).toEqual([1, 20]);
        expect(result.recorded).toBeCloseTo(7, 8);
        expect(result.cell).toBeCloseTo(7, 8);
    });

    test('an interactive value change away from a moment stays transient', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.moveGroupIteration(2, 20);
            for (let index = 0; index < 40; index++)
                shell.calculator.engine.iterate();
            const iteration = shell.calculator.setIteration(13);
            shell.calculator.setTermValue('v', 99, iteration, 1);
            shell.calculator.calculate();
            tableShape.refreshTableRows();
            return {
                iteration,
                groupIterations: tableShape.getGroupIterations(),
                recorded: shell.calculator.getUserInput('v', 13, 1),
                displayed: shell.calculator.system.getByNameOnIteration(13, 'v', 1)
            };
        });

        expect(result.iteration).toBe(13);
        expect(result.groupIterations).toEqual([1, 20]);
        expect(result.recorded).toBeUndefined();
        expect(result.displayed).toBeCloseTo(99, 8);
    });

    test('an interactive value change on iteration 1 still updates the term initial value', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            shell.calculator.setIteration(1);
            shell.calculator.setTermValue('v', 4, 1, 2);
            shell.calculator.calculate();
            tableShape.refreshTableRows();
            const row = tableShape.table.rows.find(r => r.key === 'v|1');
            return {
                case1: row?.case1,
                case2: row?.case2,
                recorded: shell.calculator.getUserInput('v', 1, 2)
            };
        });

        expect(result.case2).toBeCloseTo(4, 8);
        expect(result.case1).toBeCloseTo(0, 8);
        expect(result.recorded).toBeUndefined();
    });

    test('a slider dragged on a moment writes into that moment for its own case', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.moveGroupIteration(2, 20);
            shell.commands.addShape('SliderShape', 'Slider1');
            const slider = shell.board.shapes.getByName('Slider1');
            slider.properties.term = 'v';
            slider.properties.termCase = 2;
            slider.update();
            for (let index = 0; index < 40; index++)
                shell.calculator.engine.iterate();
            const iteration = shell.calculator.setIteration(20);
            const config = slider.buildSliderConfig();
            const target = (config.minimum + config.maximum) / 2;
            slider.setSplitterValue(target);
            tableShape.refreshTableRows();
            const row = tableShape.table.rows.find(r => r.key === 'v|20');
            return {
                iteration,
                target,
                recordedCase2: shell.calculator.getUserInput('v', 20, 2),
                recordedCase1: shell.calculator.getUserInput('v', 20, 1),
                cell2: row?.case2
            };
        });

        expect(result.iteration).toBe(20);
        expect(result.recordedCase2).toBeCloseTo(result.target, 6);
        expect(result.cell2).toBeCloseTo(result.target, 6);
        expect(result.recordedCase1).not.toBeCloseTo(result.target, 6);
    });

    test('the moment label sits on the vertical middle of its row', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const table = shell.board.shapes.getByName('Inputs1').table;
            table.render();
            const layout = table.getLayout();
            const rowHeight = Math.max(16, Number(table.options.rowHeight) || 24);
            const spanText = Array.from(table.rowsLayer.querySelectorAll('text')).find(text => Number(text.getAttribute('x')) === table.getSpanRowTextX());
            const box = spanText.getBBox();
            return {
                textY: Number(spanText.getAttribute('y')),
                rowMiddle: layout.headerHeight + rowHeight / 2,
                boxMiddle: box.y + box.height / 2,
                centralBaselines: Array.from(spanText.querySelectorAll('tspan')).every(tspan => tspan.getAttribute('dominant-baseline') === 'central')
            };
        });

        expect(result.centralBaselines).toBe(true);
        expect(result.textY).toBeCloseTo(result.rowMiddle, 6);
        expect(Math.abs(result.boxMiddle - result.rowMiddle)).toBeLessThan(2);
    });

    test('a moment keeps only the terms it holds a value for, while the base moment keeps every term', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            const momentRow = tableShape.table.rows.find(row => row.termName === 'v' && row.iteration === 2);
            const deleted = tableShape.onTableRowDeleteRequested({ row: momentRow });
            tableShape.refreshTableRows();
            return {
                deleted: deleted,
                baseTerms: tableShape.getTermNamesForIteration(1).slice().sort(),
                momentTerms: tableShape.getTermNamesForIteration(2),
                momentRowTerms: tableShape.table.rows.filter(row => row.iteration === 2 && !row.isIndependentRow).map(row => row.termName),
                stillAMoment: tableShape.getGroupIterations(),
                userInputs: shell.calculator.getUserInputsByCase()
            };
        });

        expect(result.deleted).toBe(true);
        expect(result.baseTerms).toEqual(['v', 'x']);
        expect(result.momentTerms).toEqual(['x']);
        expect(result.momentRowTerms).toEqual(['x']);
        expect(result.stillAMoment).toEqual([1, 2]);
        expect(result.userInputs[1].v).toBeUndefined();
        expect(result.userInputs[2].v).toBeUndefined();
    });

    test('deleting the last term of a moment removes the moment itself', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            const momentTerms = tableShape.getTermNamesForIteration(2);
            for (let index = 0; index < momentTerms.length; index++) {
                const row = tableShape.table.rows.find(r => r.termName === momentTerms[index] && r.iteration === 2);
                tableShape.onTableRowDeleteRequested({ row: row });
                tableShape.refreshTableRows();
            }
            return {
                groupIterations: tableShape.getGroupIterations(),
                rowIterations: [...new Set(tableShape.table.rows.map(row => row.iteration))]
            };
        });

        expect(result.groupIterations).toEqual([1]);
        expect(result.rowIterations).toEqual([1]);
    });

    test('a term row inside a moment offers delete but no color picker, unlike the moment row', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            tableShape.table.render();
        });
        await page.waitForTimeout(200);

        await clickTableCell(page, 'Inputs1', 4, 1);
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                focusedTerm: tableShape._focusedCellsPayload?.focusedRows?.[0]?.row?.termName,
                toolbarVisible: tableShape.cellsContextToolbar?.classList.contains('visible'),
                deletable: tableShape.isFocusedRowDeletable(),
                colorPickerPresent: !!tableShape._focusedColorSlotElement?.find('.mdl-color-picker').length,
                addTermAvailable: tableShape.isFocusedAddTermAvailable(),
                swapTermAvailable: tableShape.isFocusedSwapTermAvailable()
            };
        });

        expect(state.focusedTerm).toBeTruthy();
        expect(state.toolbarVisible).toBe(true);
        expect(state.deletable).toBe(true);
        expect(state.colorPickerPresent).toBe(false);
        expect(state.addTermAvailable).toBe(false);
        expect(state.swapTermAvailable).toBe(false);
    });

    test('the add-term menu offers the terms missing from the focused moment and puts the row back', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            const momentRow = tableShape.table.rows.find(row => row.termName === 'v' && row.iteration === 2);
            tableShape.onTableCellValueChanged({ row: momentRow, column: tableShape.table.options.columns.find(c => c.key === 'case1'), value: 5 });
            tableShape.onTableRowDeleteRequested({ row: momentRow });
            tableShape.refreshTableRows();
            tableShape.table.render();
        });
        await page.waitForTimeout(200);

        await clickTableCell(page, 'Inputs1', 3, 1);
        await page.waitForTimeout(300);

        const beforeAdd = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                addTermAvailable: tableShape.isFocusedAddTermAvailable(),
                missing: tableShape.getTermNamesMissingFromIteration(2)
            };
        });
        expect(beforeAdd.addTermAvailable).toBe(true);
        expect(beforeAdd.missing).toEqual(['v']);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.getDropDownButtonInstance(tableShape._focusedAddTermButtonElement).open();
        });
        await page.waitForSelector('.mdl-shape-overlay-popup .dx-list-item .mdl-variable-selector math-field');

        const menuTerms = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .dx-list-item .mdl-variable-selector math-field')).map(item => item.textContent.trim()));
        expect(menuTerms).toEqual(['v']);

        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(1)');
        await page.waitForTimeout(300);

        const afterAdd = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            return {
                momentTerms: tableShape.getTermNamesForIteration(2),
                recorded: shell.calculator.getUserInput('v', 2, 1)
            };
        });

        expect(afterAdd.momentTerms.slice().sort()).toEqual(['v', 'x']);
        expect(afterAdd.recorded).toBeDefined();
    });

    test('a term row inside a moment can be swapped for a term the moment is missing, carrying its values', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 2);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            const vRow = tableShape.table.rows.find(row => row.termName === 'v' && row.iteration === 2);
            tableShape.onTableRowDeleteRequested({ row: vRow });
            tableShape.refreshTableRows();
            const xRow = tableShape.table.rows.find(row => row.termName === 'x' && row.iteration === 2);
            tableShape.onTableCellValueChanged({ row: xRow, column: tableShape.table.options.columns.find(c => c.key === 'case1'), value: 9 });
            tableShape.onTableCellValueChanged({ row: xRow, column: tableShape.table.options.columns.find(c => c.key === 'case2'), value: 11 });
            tableShape.refreshTableRows();
            tableShape.table.render();
        });
        await page.waitForTimeout(200);

        await clickTableCell(page, 'Inputs1', 4, 1);
        await page.waitForTimeout(300);

        const beforeSwap = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                focusedTerm: tableShape.getFocusedTermName(),
                swapAvailable: tableShape.isFocusedSwapTermAvailable()
            };
        });
        expect(beforeSwap.focusedTerm).toBe('x');
        expect(beforeSwap.swapAvailable).toBe(true);

        await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.getDropDownButtonInstance(tableShape._focusedSwapTermButtonElement).open();
        });
        await page.waitForSelector('.mdl-shape-overlay-popup .dx-list-item .mdl-variable-selector math-field');

        const menuTerms = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .dx-list-item .mdl-variable-selector math-field')).map(item => item.textContent.trim()));
        expect(menuTerms).toEqual(['v']);

        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(1)');
        await page.waitForTimeout(300);

        const afterSwap = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            return {
                momentTerms: tableShape.getTermNamesForIteration(2),
                vCase1: shell.calculator.getUserInput('v', 2, 1),
                vCase2: shell.calculator.getUserInput('v', 2, 2),
                xCase1: shell.calculator.getUserInput('x', 2, 1),
                baseTerms: tableShape.getTermNamesForIteration(1).slice().sort()
            };
        });

        expect(afterSwap.momentTerms).toEqual(['v']);
        expect(afterSwap.vCase1).toBeCloseTo(9, 8);
        expect(afterSwap.vCase2).toBeCloseTo(11, 8);
        expect(afterSwap.xCase1).toBeUndefined();
        expect(afterSwap.baseTerms).toEqual(['v', 'x']);
    });

    test('a separator marks where the integrated terms end and the parameters begin, in every moment that holds both', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);
        await addExpressionAndReparse(page, 'Expr2', '\\frac{dy}{dt}=w');

        const result = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.addGroup();
            tableShape.refreshTableRows();
            const table = tableShape.table;
            table.render();
            const layout = table.getLayout();
            const rowHeight = Math.max(16, Number(table.options.rowHeight) || 24);
            const separatorRowIndex = table.rows.findIndex(row => row.separatorAbove === true);
            const separatorY = layout.headerHeight + separatorRowIndex * rowHeight;
            const separators = Array.from(table.rowsLayer.querySelectorAll('line'))
                .filter(line => line.getAttribute('y1') === line.getAttribute('y2')
                    && Number(line.getAttribute('y1')) === separatorY
                    && line.getAttribute('stroke-opacity') != null);
            return {
                rows: table.rows.map(row => ({ key: row.key, separatorAbove: row.separatorAbove === true })),
                gridColor: table.options.gridColor,
                separatorStroke: separators[0]?.getAttribute('stroke') ?? null,
                separatorOpacity: separators[0]?.getAttribute('stroke-opacity') ?? null,
                separatorWidth: Number(separators[0]?.getAttribute('x2') ?? 0),
                bodyWidth: layout.bodyWidth
            };
        });

        // Integrated terms first, then the parameters they depend on, with the rule on the first parameter row.
        expect(result.rows).toEqual([
            { key: 'independent|1', separatorAbove: false },
            { key: 'x|1', separatorAbove: false },
            { key: 'y|1', separatorAbove: false },
            { key: 'v|1', separatorAbove: true },
            { key: 'w|1', separatorAbove: false },
            { key: 'independent|2', separatorAbove: false },
            { key: 'x|2', separatorAbove: false },
            { key: 'y|2', separatorAbove: false },
            { key: 'v|2', separatorAbove: true },
            { key: 'w|2', separatorAbove: false }
        ]);
        // Discreet: it spans the table like a grid line but is drawn darker so the split still reads.
        expect(result.separatorStroke).not.toBe(null);
        expect(result.separatorStroke.toLowerCase()).not.toBe(result.gridColor.toLowerCase());
        expect(Number(result.separatorOpacity)).toBeLessThan(1);
        expect(result.separatorWidth).toBeCloseTo(result.bodyWidth, 5);
    });

    test('with the case header hidden, columns resize by dragging the divider on a term row', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const before = await getColumnLayout(page, 'Inputs1');
        expect(before.headerHeight).toBe(0);

        await dragColumnDivider(page, 'Inputs1', 0, 1, 40);
        await page.waitForTimeout(200);

        const after = await getColumnLayout(page, 'Inputs1');
        expect(after.widths[0]).toBeCloseTo(before.widths[0] + 40 / before.scale, 0);
        expect(after.storedWidths[0]).toBe(after.widths[0]);
        expect(after.widths[1]).toBe(before.widths[1]);
    });

    test('dragging along a moment row still focuses the moment instead of resizing a column', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 1);

        const before = await getColumnLayout(page, 'Inputs1');
        await dragColumnDivider(page, 'Inputs1', 0, 0, 40);
        await page.waitForTimeout(200);

        const after = await getColumnLayout(page, 'Inputs1');
        expect(after.widths).toEqual(before.widths);
        expect(after.storedWidths).toEqual(before.storedWidths);
    });

    test('a case resized while another one is hidden keeps its width, and the hidden case does not inherit it', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithCasesTable(page, 3);

        const before = await getColumnLayout(page, 'Inputs1');
        expect(before.keys).toEqual(['term', 'case1', 'case2', 'case3']);
        expect(before.headerHeight).toBeGreaterThan(0);

        await page.evaluate(() => shell.board.shapes.getByName('Inputs1').setCaseVisible(1, false));
        await page.waitForTimeout(300);

        // case2 now sits where case1 used to be, so a width stored by position would land on the wrong case.
        const hidden = await getColumnLayout(page, 'Inputs1');
        expect(hidden.keys).toEqual(['term', 'case2', 'case3']);

        await dragColumnDivider(page, 'Inputs1', 1, null, 40);
        await page.waitForTimeout(200);

        const resized = await getColumnLayout(page, 'Inputs1');
        expect(resized.widths[1]).toBeCloseTo(hidden.widths[1] + 40 / hidden.scale, 0);
        expect(resized.widths[2]).toBe(hidden.widths[2]);

        await page.evaluate(() => shell.board.shapes.getByName('Inputs1').setCaseVisible(1, true));
        await page.waitForTimeout(300);

        const afterShow = await getColumnLayout(page, 'Inputs1');
        expect(afterShow.keys).toEqual(['term', 'case1', 'case2', 'case3']);
        expect(afterShow.widths[1]).toBe(before.widths[1]);
        expect(afterShow.widths[2]).toBe(resized.widths[1]);
        expect(afterShow.widths[3]).toBe(before.widths[3]);
    });
});
