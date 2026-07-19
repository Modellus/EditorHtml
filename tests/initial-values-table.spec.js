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

async function setupModelWithInitialValuesTable(page, casesCount) {
    await page.evaluate(() => modellus.shape.addExpression('Expr1'));
    await page.waitForTimeout(400);
    await page.evaluate(({ count }) => {
        const shape = shell.board.shapes.getByName('Expr1');
        shape.properties.expression = '\\frac{dx}{dt}=v';
        shell.setProperties({ casesCount: count });
        shell.reset();
        modellus.shape.addInitialValuesTable('Inputs1');
    }, { count: casesCount });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const tableShape = shell.board.shapes.getByName('Inputs1');
        tableShape.update();
        tableShape.refreshTableRows();
    });
    await page.waitForTimeout(200);
}

test.describe('Initial values table', () => {
    test('renders term rows and one editable column per case', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithInitialValuesTable(page, 3);

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
                    caseNumber: column.caseNumber
                })),
                rows: (table?.rows ?? []).map(row => ({ key: row.key, termName: row.termName, iteration: row.iteration })),
                termCellEditable: table?.canEditCell(0, 0) === true,
                iterationCellEditable: table?.canEditCell(0, 1) === true,
                caseCellEditable: table?.canEditCell(0, 2) === true
            };
        });

        expect(state.shapeClass).toBe('InitialValuesTableShape');
        expect(state.columns).toEqual([
            { key: 'term', isText: true, editable: false, showCase: false, caseNumber: 1 },
            { key: 'iteration', isText: false, editable: true, showCase: false, caseNumber: 1 },
            { key: 'case1', isText: false, editable: true, showCase: true, caseNumber: 1 },
            { key: 'case2', isText: false, editable: true, showCase: true, caseNumber: 2 },
            { key: 'case3', isText: false, editable: true, showCase: true, caseNumber: 3 }
        ]);
        expect(state.rows).toEqual([
            { key: 'x|1', termName: 'x', iteration: 1 },
            { key: 'v|1', termName: 'v', iteration: 1 }
        ]);
        expect(state.termCellEditable).toBeFalsy();
        expect(state.iterationCellEditable).toBeFalsy();
        expect(state.caseCellEditable).toBeTruthy();
    });

    test('editing case cells sets per-case initial values and produces distinct trajectories', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithInitialValuesTable(page, 3);

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

    test('mid-run input forces value from its iteration in its case only', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithInitialValuesTable(page, 2);

        const result = await page.evaluate(() => {
            const calculator = shell.calculator;
            calculator.setUserInput('v', 1, 1, 1);
            calculator.setUserInput('v', 1, 1, 2);
            calculator.setUserInput('v', 5, 6, 2);
            for (let iterationIndex = 0; iterationIndex < 10; iterationIndex++)
                calculator.engine.iterate();
            const system = calculator.system;
            const tableShape = shell.board.shapes.getByName('Inputs1');
            tableShape.refreshTableRows();
            return {
                inputRowKeys: tableShape.table.rows.map(row => row.key),
                midRunRowCase2: tableShape.table.rows.find(row => row.key === 'v|6')?.case2,
                vCase1At8: system.getByNameOnIteration(8, 'v', 1),
                vCase2At5: system.getByNameOnIteration(5, 'v', 2),
                vCase2At8: system.getByNameOnIteration(8, 'v', 2),
                xCase1At11: system.getByNameOnIteration(11, 'x', 1),
                xCase2At11: system.getByNameOnIteration(11, 'x', 2)
            };
        });

        expect(result.inputRowKeys).toEqual(['x|1', 'v|1', 'v|6']);
        expect(result.midRunRowCase2).toBe(5);
        expect(result.vCase1At8).toBeCloseTo(1, 8);
        expect(result.vCase2At5).toBeCloseTo(1, 8);
        expect(result.vCase2At8).toBeCloseTo(5, 8);
        expect(result.xCase2At11).toBeGreaterThan(result.xCase1At11);
    });

    test('user inputs survive serialize and open roundtrip', async ({ page }) => {
        await setupEditor(page);
        await setupModelWithInitialValuesTable(page, 2);

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
        expect(result.restoredShapeClass).toBe('InitialValuesTableShape');
    });

    test('top toolbar table dropdown lists both table types and arms draw mode', async ({ page }) => {
        await setupEditor(page);
        await page.click('#table-button');
        await page.waitForTimeout(400);

        const menuState = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item .mdl-dropdown-list-label'));
            return items.map(item => item.textContent.trim());
        });
        expect(menuState).toEqual(['Table', 'Initial Values']);

        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(2)');
        await page.waitForTimeout(300);
        const armed = await page.evaluate(() => document.getElementById('svg').classList.contains('shape-draw-mode'));
        expect(armed).toBe(true);
    });
});
