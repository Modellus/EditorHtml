const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

const RECURRENCE_MODEL = '\\displaylines{F_{n}=-k\\cdot x_{n-1}-r\\cdot v_{n-1}\\\\a_{n}=\\frac{F_{n}}{m}\\\\v_{n}=v_{n-1}+a_{n}\\cdot dt\\\\x_{n}=x_{n-1}+v_{n}\\cdot dt}';
const SEEDED_MODEL = `\\displaylines{x_{0}=1\\\\v_{0}=0\\\\${RECURRENCE_MODEL.slice('\\displaylines{'.length)}`;

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function setupModel(page, expression, iterationTermStart = 0) {
    await page.evaluate(({ expression, iterationTermStart }) => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').properties.expression = expression;
        shell.setProperty('iterationTermStart', iterationTermStart);
        shell.setProperty('playerTerm', 'iteration');
        shell.reset();
    }, { expression, iterationTermStart });
    await page.waitForFunction(() => shell.calculator.getTermsNames().includes('a'), null, { timeout: 15000 });
}

function classifyRoles(page, latex) {
    return page.evaluate(latex => {
        const metadata = MathSemanticMetadata.fromCalculator(shell.calculator, latex, [], []);
        return MathSemantics.classify(latex, metadata).map(token => `${token.text}:${token.role}`);
    }, latex);
}

test.describe('A numeric index is the moment it names', () => {
    test('the 0 of x_0 reads with the iteration colour, like the n of x_n', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        expect(await classifyRoles(page, 'x_{0}=1')).toEqual([
            'x:variable', '0:iteration-index', '=:operator', '1:number'
        ]);
        expect(await classifyRoles(page, 'x_{n}=1')).toEqual([
            'x:variable', 'n:iteration-index', '=:operator', '1:number'
        ]);
    });

    test('a numeric index on a name the model does not know stays a qualifier', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        expect(await classifyRoles(page, 'zz_{0}=1')).toEqual([
            'z:variable', 'z:variable', '0:qualifier-index', '=:operator', '1:number'
        ]);
    });
});

test.describe('The scenarios shape names the moment the way the player does', () => {
    test('the first moment is n = 0 when the iteration term starts at 0', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL, 0);
        const moment = await page.evaluate(() => {
            modellus.shape.addCasesTable('Inputs1');
            const shape = shell.board.shapes.getByName('Inputs1');
            return { value: shape.getMomentValueForIteration(1), term: shape.getMomentTermName() };
        });
        expect(moment).toEqual({ value: 0, term: 'n' });
    });

    test('the first moment is n = 1 when the iteration term starts at 1', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL, 1);
        const moment = await page.evaluate(() => {
            modellus.shape.addCasesTable('Inputs1');
            return shell.board.shapes.getByName('Inputs1').getMomentValueForIteration(1);
        });
        expect(moment).toBe(1);
    });

    test('a moment written back reads as the same iteration it came from', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL, 0);
        const roundTrip = await page.evaluate(() => {
            modellus.shape.addCasesTable('Inputs1');
            const shape = shell.board.shapes.getByName('Inputs1');
            return [1, 2, 5].map(iteration => shape.convertMomentValueToIteration(shape.getMomentValueForIteration(iteration)));
        });
        expect(roundTrip).toEqual([1, 2, 5]);
    });
});

async function setupAccelerationTable(page) {
    await page.evaluate(() => {
        modellus.shape.addDataTable('Data1');
        modellus.shape.setProperties('Data1', { columns: [{ term: 'a', case: 1 }] });
    });
    await page.waitForFunction(() => {
        const control = shell.board.shapes.getByName('Data1')?.table;
        return control?.options.columns.findIndex(column => column.term === 'a') >= 0;
    }, null, { timeout: 15000 });
    return page.evaluate(() => shell.board.shapes.getByName('Data1').table.options.columns.findIndex(column => column.term === 'a'));
}

test.describe('A table header tooltip is written as mathematics', () => {
    test('the subscripts of the expression survive into the tooltip', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const columnIndex = await setupAccelerationTable(page);
        const written = await page.evaluate(columnIndex => {
            const control = shell.board.shapes.getByName('Data1').table;
            const expressionLatex = control.getHeaderColumnExpression(columnIndex);
            return {
                expressionLatex,
                asExpression: Utils.formatMathExpression(expressionLatex),
                asTermName: Utils.formatMathTermName(expressionLatex)
            };
        }, columnIndex);
        expect(written.expressionLatex).toContain('F_{n}');
        expect(written.asExpression).toContain('F_{n}');
        expect(written.asExpression).not.toContain('\\_');
        expect(written.asTermName).toContain('\\_');
    });

    test('the tooltip math field holds the expression and not an escaped copy of it', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const columnIndex = await setupAccelerationTable(page);
        await page.evaluate(columnIndex => {
            const control = shell.board.shapes.getByName('Data1').table;
            control.showHeaderTooltip(columnIndex, control.rootElement, control.getHeaderColumnExpression(columnIndex));
        }, columnIndex);
        const mathField = page.locator('.dx-tooltip-wrapper .tooltip math-field');
        await expect(mathField).toBeVisible();
        await expect.poll(() => mathField.evaluate(element => element.getValue('latex'))).toContain('F_');
        expect(await mathField.evaluate(element => element.getValue('latex'))).not.toContain('\\_');
    });
});

test.describe('A recurrence with no first value is offered in the scenarios', () => {
    test('the names the run starts from are listed ahead of the parameters', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, RECURRENCE_MODEL);
        const listed = await page.evaluate(() => {
            modellus.shape.addCasesTable('Inputs1');
            return {
                seeds: shell.calculator.getTermsByType().seeds,
                columns: shell.board.shapes.getByName('Inputs1').getSelectedColumns().map(column => column.term)
            };
        });
        expect(listed.seeds).toEqual(['x', 'v']);
        expect(listed.columns).toEqual(['x', 'v', 'k', 'r', 'm', 'dt']);
    });

    test('a model that states its first values does not ask for them again', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const listed = await page.evaluate(() => {
            modellus.shape.addCasesTable('Inputs1');
            return {
                seeds: shell.calculator.getTermsByType().seeds,
                columns: shell.board.shapes.getByName('Inputs1').getSelectedColumns().map(column => column.term)
            };
        });
        expect(listed.seeds).toEqual([]);
        expect(listed.columns).toEqual(['k', 'r', 'm', 'dt']);
    });

    test('the independent term is never asked for, however the model writes it', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, `\\displaylines{t_{n}=t_{n-1}+dt\\\\${RECURRENCE_MODEL.slice('\\displaylines{'.length)}`);
        const seeds = await page.evaluate(() => shell.calculator.getTermsByType().seeds);
        expect(seeds).not.toContain('t');
    });

    test('the run starts from the value the scenarios supply', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, RECURRENCE_MODEL);
        const values = await page.evaluate(() => {
            const calculator = shell.calculator;
            const entries = [['k', 0.1], ['r', 0.2], ['m', 1], ['dt', 0.01], ['x', 1], ['v', 0]];
            const accepted = entries.every(([name, value]) => calculator.setUserInput(name, value, 1, 1));
            calculator.engine.reset();
            calculator.engine.iterate();
            return { accepted, x: calculator.system.getByNameOnIteration(1, 'x'), F: calculator.system.getByNameOnIteration(1, 'F') };
        });
        expect(values.accepted).toBe(true);
        expect(values.F).toBeCloseTo(-0.1, 6);
        expect(values.x).toBeCloseTo(0.99999, 6);
    });
});

test.describe('The player end reads the term the player runs', () => {
    test('the end button and the editor it opens agree in iteration mode', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const end = await page.evaluate(() => {
            shell.bottomToolbar.updatePlayer();
            return {
                label: shell.bottomToolbar._endLabel.textContent,
                editor: shell.bottomToolbar.getPlayerTermEnd(),
                independentEnd: shell.calculator.properties.independent.end
            };
        });
        expect(end.label).toBe('100');
        expect(end.editor).toBe(100);
        expect(end.independentEnd).toBe(10);
    });

    test('an end written in iterations is kept by the button that shows it', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const end = await page.evaluate(() => {
            shell.bottomToolbar.setPlayerTermEnd(50);
            shell.bottomToolbar.updatePlayer();
            return {
                label: shell.bottomToolbar._endLabel.textContent,
                editor: shell.bottomToolbar.getPlayerTermEnd(),
                independentEnd: shell.calculator.properties.independent.end
            };
        });
        expect(end.label).toBe('50');
        expect(end.editor).toBe(50);
        expect(end.independentEnd).toBeCloseTo(5, 6);
    });

    test('the independent term is still read and written directly', async ({ page }) => {
        await setupEditor(page);
        await setupModel(page, SEEDED_MODEL);
        const end = await page.evaluate(() => {
            shell.setProperty('playerTerm', 'independent');
            shell.bottomToolbar.setPlayerTermEnd(4);
            shell.bottomToolbar.updatePlayer();
            return { editor: shell.bottomToolbar.getPlayerTermEnd(), independentEnd: shell.calculator.properties.independent.end };
        });
        expect(end).toEqual({ editor: 4, independentEnd: 4 });
    });
});
