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
    test('Builds reconstructed latex for differential expression', async ({ page }) => {
        await setupEditor(page);
        const expressionLatex = await page.evaluate(() => {
            const system = new Modellus.System('t');
            const parser = new Modellus.Parser(system);
            const parseResult = parser.parse('\\frac{dx}{dt}=v');
            if (!parseResult)
                return null;
            const xTerm = system.getTerm('x');
            if (!xTerm)
                return null;
            xTerm.expressionLatex = null;
            const latexVisitor = new Modellus.LatexVisitor(system);
            latexVisitor.build();
            return xTerm.expressionLatex;
        });
        expect(expressionLatex).toBe('v');
    });

    test('Calculator parse rebuilds term latex after parsing expressions', async ({ page }) => {
        await setupEditor(page);
        const expressionLatex = await page.evaluate(() => {
            const calculator = new Calculator();
            calculator.parse('\\frac{dx}{dt}=2*t');
            const xTerm = calculator.system.getTerm('x');
            return xTerm?.expressionLatex ?? null;
        });
        expect(expressionLatex).not.toBeNull();
        expect(expressionLatex).toContain('\\cdot');
        expect(expressionLatex).not.toContain('\\cdott');
    });

    test('Regression term gets expressionLatex from LatexVisitor after regression', async ({ page }) => {
        await setupEditor(page);
        const regressionLatex = await page.evaluate(() => {
            const calculator = new Calculator();
            calculator.parse('x=5\\cdot t+6');
            calculator.engine.reset();
            for (let iteration = 0; iteration < 10; iteration++)
                calculator.engine.iterate();
            calculator.applyDataRegression('x', Modellus.DataRegressionType.LINEAR, 1);
            const fitTerm = calculator.system.getTerm('x.fit');
            return fitTerm?.expressionLatex ?? null;
        });
        expect(regressionLatex).toBe('x.fit.m1 \\cdot t + x.fit.m2');
    });

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

    test('x2 is 9.9997994620399 at t=0.2 for two-body expression system', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Geometry and Forces');
        await addExpression(page, 'Body 1. From F to motion');
        await addExpression(page, 'Body 2: From F to motion');
        await addExpression(page, 'Parameters and initial values');
        await addExpression(page, 'Center of Mass');
        await addTable(page, 'Table1');
        await setExpressionValue(page, 'Geometry and Forces', '\\displaylines{r12=\\sqrt{\\left(\\left(x1-x2\\right)^2+\\left(y1-y2\\right)^2\\right)}\\\\ F12=G\\cdot\\frac{\\left(m1\\cdot m2\\right)}{r12^2}\\\\ F12x=-F12\\cdot\\frac{\\left(x1-x2\\right)}{r12}\\\\ F12y=-F12\\cdot\\frac{\\left(y1-y2\\right)}{r12}\\\\ F21x=-F12x\\\\ F21y=-F12y}');
        await setExpressionValue(page, 'Body 1. From F to motion', '\\displaylines{a1x=\\frac{F12x}{m1}\\\\ a1y=\\frac{F12y}{m1}\\\\ \\frac{dv1x}{dt}=a1x\\\\ \\frac{dv1y}{dt}=a1y\\\\ \\frac{dx1}{dt}=v1x\\\\ \\frac{dy1}{dt}=v1y}');
        await setExpressionValue(page, 'Body 2: From F to motion', '\\displaylines{a2x=\\frac{F21x}{m2}\\\\ a2y=\\frac{F21y}{m2}\\\\ \\frac{dv2x}{dt}=a2x\\\\ \\frac{dv2y}{dt}=a2y\\\\ \\frac{dx2}{dt}=v2x\\\\ \\frac{dy2}{dt}=v2y}');
        await setExpressionValue(page, 'Parameters and initial values', '\\displaylines{G=1\\\\ m1=1\\\\ m2=5\\\\ v1y\\left(0\\right)=0.5\\\\ v1x\\left(0\\right)=0.2\\\\ x2\\left(0\\right)=10}');
        await setExpressionValue(page, 'Center of Mass', '\\displaylines{xCM=\\frac{\\left(m1\\cdot x1+m2\\cdot x2\\right)}{\\left(m1+m2\\right)}\\\\ yCM=\\frac{\\left(m1\\cdot y1+m2\\cdot y2\\right)}{\\left(m1+m2\\right)}}');
        await page.evaluate(() => {
            modellus.shape.setProperties('Table1', {
                columns: [
                    { term: 't', case: 1, color: 'transparent' },
                    { term: 'x2', case: 1, color: 'transparent' }
                ]
            });
            shell.reset();
            for (let iterationIndex = 0; iterationIndex < 40; iterationIndex++)
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
        const rowAtPointTwo = tableRows.find(row => Math.abs(Number(row.column0) - 0.2) < tolerance);
        expect(rowAtPointTwo).toBeTruthy();
        expect(Number(rowAtPointTwo.column1)).toBeCloseTo(9.9997994620399, 10);
    });
});
