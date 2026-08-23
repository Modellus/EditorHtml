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

async function addExpression(page, name) {
    await page.evaluate(n => modellus.shape.addExpression(n), name);
    await page.waitForTimeout(500);
}

async function focusExpression(page, name) {
    await page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        shape.mathfield.focus();
    }, name);
    await page.waitForTimeout(200);
}

async function getExpressionValue(page, name) {
    return page.evaluate(n => shell.board.shapes.getByName(n).mathfield.getValue('latex-unstyled'), name);
}

test.describe('Named term parts', () => {
    test('typing a dot after a name writes a subscript marked with the named index', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('v.x', { delay: 60 });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('v_{\\!x}');
    });

    test('a named term part parses back to a dotted term name', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('v.x=3', { delay: 60 });
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(300);
        const terms = await page.evaluate(() => shell.board.calculator.getTermsNames());
        expect(terms).toContain('v.x');
    });

    test('typing a dot in a number keeps the decimal separator', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x=2.5', { delay: 60 });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('2.5');
        expect(value).not.toContain('\\!');
    });

    test('typing a dot after a name with digits names the whole term', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('Body1.vx=1', { delay: 60 });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('Body1_{\\!vx}=1');
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(300);
        const terms = await page.evaluate(() => shell.board.calculator.getTermsNames());
        expect(terms).toContain('Body1.vx');
    });

    test('space leaves the named part and keeps writing the expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('v.x', { delay: 60 });
        await page.keyboard.press('Space');
        await page.keyboard.type('=3', { delay: 60 });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('v_{\\!x}');
        expect(value).toContain('=3');
    });

    test('a differential over a named term is written upright', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dv.x/dt=1', { delay: 60 });
        await page.waitForTimeout(400);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toBe('\\frac{\\differentialD{v_{\\!x}}}{\\differentialD{t}}=1');
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(300);
        const terms = await page.evaluate(() => shell.board.calculator.getTermsNames());
        expect(terms).toContain('v.x');
    });

    test('a named part is still written after the differential is', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dv.x/dv.y=2', { delay: 60 });
        await page.waitForTimeout(400);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toBe('\\frac{\\differentialD{v_{\\!x}}}{\\differentialD{v_{\\!y}}}=2');
    });

    test('a differential over a named term parses without braces around the name', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await page.evaluate(() => shell.board.shapes.getByName('Expr1')
            .setProperties({ expression: '\\displaylines{\\frac{\\differentialD v_{\\!x}}{\\differentialD{t}}=10}' }));
        await page.waitForTimeout(400);
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Expr1').failingRowIndexes)).toEqual([]);
        expect(await page.evaluate(() => shell.board.calculator.getTermsNames())).toContain('v.x');
    });

    test('a dotted name is written as a named subscript wherever it appears', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => ({
            written: Utils.writeTermNames('v.x'),
            writtenWithDigits: Utils.writeTermNames('Body1.vx'),
            writtenInExpression: Utils.writeTermNames('a=v.x \\cdot 2'),
            writtenGreek: Utils.writeTermNames('\\omega.x'),
            writtenDecimal: Utils.writeTermNames('a=2.5'),
            writtenTwice: Utils.writeTermNames(Utils.writeTermNames('v.x'))
        }));
        expect(result.written).toBe('v_{\\!x}');
        expect(result.writtenWithDigits).toBe('Body1_{\\!vx}');
        expect(result.writtenInExpression).toBe('a=v_{\\!x} \\cdot 2');
        expect(result.writtenGreek).toBe('\\omega_{\\!x}');
        expect(result.writtenDecimal).toBe('a=2.5');
        expect(result.writtenTwice).toBe('v_{\\!x}');
    });

    test('an expression set from a saved model is written with named subscripts', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            shape.setProperties({ expression: '\\displaylines{v.x=3\\\\a=v.x \\cdot 2}' });
            shell.reset();
            return {
                mathfieldValue: shape.mathfield.getValue('latex-unstyled'),
                expression: shape.properties.expression,
                terms: shell.board.calculator.getTermsNames()
            };
        });
        expect(result.mathfieldValue).toContain('v_{\\!x}');
        expect(result.expression).toContain('v_{\\!x}');
        expect(result.terms).toContain('v.x');
    });

    test('a named term is shown as a subscript everywhere it is written', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            const calculator = new Calculator();
            calculator.parse('v_{\\!x}=3');
            return {
                displayed: Utils.getDisplayedTerm('v.x', calculator.system),
                formatted: Utils.formatMathTermName(Utils.getDisplayedTerm('v.x', calculator.system)),
                formattedIndex: Utils.formatMathTermName('x_1'),
                plainText: Utils.convertMathTermToPlainText(Utils.getDisplayedTerm('v.x', calculator.system)),
                widthText: Utils.normalizeMathTermForWidth(Utils.getDisplayedTerm('v.x', calculator.system)),
                parsed: Utils.parseMathTermLatex(Utils.getDisplayedTerm('v.x', calculator.system)),
                labelHtml: Utils.buildTermValueTextHtml(Utils.getDisplayedTerm('v.x', calculator.system), '3')
            };
        });
        expect(result.displayed).toBe('v_{\\!x}');
        expect(result.formatted).toBe('v_{\\!x}');
        expect(result.formattedIndex).toBe('x\\_1');
        expect(result.plainText).toBe('v_x');
        expect(result.widthText).toBe('v_x');
        expect(result.parsed).toMatchObject({ base: 'v', subscript: 'x' });
        expect(result.labelHtml).toContain('font-size="65%"');
        expect(result.labelHtml).toContain('>x<');
    });

    test('a regression term keeps its own writing', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            const calculator = new Calculator();
            calculator.parse('x=5\\cdot t+6');
            calculator.engine.reset();
            for (let iteration = 0; iteration < 10; iteration++)
                calculator.engine.iterate();
            calculator.applyDataRegression('x', Modellus.DataRegressionType.LINEAR, 1);
            return {
                terms: calculator.getTermsNames(),
                displayed: Utils.getDisplayedTerm('x.fit', calculator.system),
                formatted: Utils.formatMathTermName(Utils.getDisplayedTerm('x.fit', calculator.system))
            };
        });
        expect(result.terms).toContain('x.fit');
        expect(result.displayed).toBe('\\widehat{x}');
        expect(result.formatted).toBe('\\widehat{x}');
    });

    test('a named term reads as a subscript in shape labels and table headers', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            modellus.shape.addExpression('Expression1');
            const expression = shell.board.shapes.getByName('Expression1');
            expression.properties.expression = '\\displaylines{v_{\\!x}=3}';
            expression.mathfield.value = expression.properties.expression;
            shell.reset();

            modellus.shape.addPoint('Point1');
            const point = shell.board.shapes.getByName('Point1');
            point.properties.xTerm = 'v.x';
            point.properties.xTermDisplayMode = 'nameValue';
            point.update();
            point.draw();

            modellus.shape.addTable('Table1');
            const table = shell.board.shapes.getByName('Table1');
            table.properties.columns = [{ term: 'v.x', case: 1, color: 'transparent' }];
            table.update();
            table.draw();

            return {
                terms: shell.board.calculator.getTermsNames(),
                pointLabelHtml: point.element.querySelector('text.shape-term-label')?.innerHTML ?? '',
                columnTitle: table.getDisplayedColumnTitle('v.x')
            };
        });
        expect(result.terms).toContain('v.x');
        expect(result.columnTitle).toBe('v_{\\!x}');
        expect(result.pointLabelHtml).toContain('font-size="65%"');
    });

    test('a named term reads as a subscript in a scenarios shape', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            modellus.shape.addExpression('Expression1');
            const expression = shell.board.shapes.getByName('Expression1');
            expression.properties.expression = '\\frac{dx}{dt}=v_{\\!x}';
            expression.mathfield.value = expression.properties.expression;
            shell.reset();

            modellus.shape.addCasesTable('Scenarios1');
            const scenarios = shell.board.shapes.getByName('Scenarios1');
            scenarios.update();
            scenarios.refreshTableRows();
            const namedTermRow = scenarios.table.rows.find(row => row.termName === 'v.x');
            const namedIndex = Array.from(scenarios.table.rowsLayer.querySelectorAll('tspan')).find(element => element.getAttribute('font-size') === '65%');
            return {
                rowTerm: namedTermRow?.term,
                namedIndexText: namedIndex?.textContent,
                namedIndexShift: namedIndex?.getAttribute('dy'),
                namedIndexBaseline: namedIndex?.getAttribute('dominant-baseline')
            };
        });
        expect(result.rowTerm).toBe('v_{\\!x}');
        expect(result.namedIndexText).toBe('x');
        expect(result.namedIndexShift).toBe('0.25em');
        expect(result.namedIndexBaseline).toBeNull();
    });
});
