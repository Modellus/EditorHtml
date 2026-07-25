const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

test('missing terms stay assigned and render red across term-bearing shapes', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        modellus.shape.addExpression('Expression1');
        const expression = shell.board.shapes.getByName('Expression1');
        expression.properties.expression = '\\displaylines{x=1}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();

        modellus.shape.addPoint('Point1');
        const point = shell.board.shapes.getByName('Point1');
        point.properties.xTerm = 'x';
        point.properties.xTermDisplayMode = 'nameValue';
        point.update();
        point.draw();

        modellus.shape.addChart('Chart1');
        const chart = shell.board.shapes.getByName('Chart1');
        chart.properties.xTerm = 'x';
        chart.properties.yTerms = [{ term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] }];
        chart.update();
        chart.draw();

        modellus.shape.addTable('Table1');
        const table = shell.board.shapes.getByName('Table1');
        table.properties.columns = [{ term: 'x', case: 1, color: 'transparent', valueDisplayMode: 'bars' }];
        table.update();
        table.draw();

        expression.properties.expression = '\\displaylines{}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();
        point.draw();
        chart.update();
        chart.draw();
        table.update();
        table.draw();

        const pointToolbarHost = document.createElement('div');
        point.renderTermsButtonTemplate(pointToolbarHost);
        const pointToolbarMissing = pointToolbarHost.querySelector('.mdl-missing-term') !== null;
        point.termFormControls.xTerm.termControl.refresh();
        const pointSelectorMissing = point.termFormControls.xTerm.termControl.host.find('.mdl-missing-term').length > 0;
        const pointLabelFill = point.element.querySelector('.shape-term-label-bg')?.getAttribute('fill');
        const chartMissing = chart.chart.options.argumentTitle.isMissingTerm === true && chart.chart.options.series[0].name.isMissingTerm === true;
        const tableMissing = table.table.options.columns[0].isMissingTerm === true;
        const preserved = point.properties.xTerm === 'x' && chart.properties.xTerm === 'x' && chart.properties.yTerms[0].term === 'x' && table.properties.columns[0].term === 'x';

        expression.properties.expression = '\\displaylines{x=1}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();
        point.renderTermsButtonTemplate(pointToolbarHost);

        return {
            preserved: preserved,
            pointToolbarMissing: pointToolbarMissing,
            pointSelectorMissing: pointSelectorMissing,
            pointLabelFill: pointLabelFill,
            chartMissing: chartMissing,
            tableMissing: tableMissing,
            restored: !point.isMissingTermReference('x') && pointToolbarHost.querySelector('.mdl-missing-term') === null,
            numericLiteralValid: !point.isMissingTermReference('12.5')
        };
    });

    expect(result.preserved).toBe(true);
    expect(result.pointToolbarMissing).toBe(true);
    expect(result.pointSelectorMissing).toBe(true);
    expect(result.pointLabelFill).toBe('#d13438');
    expect(result.chartMissing).toBe(true);
    expect(result.tableMissing).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.numericLiteralValid).toBe(true);
});

test('notebook term controls refresh when a referenced term disappears', async ({ page }) => {
    await setupNotebook(page);
    const result = await page.evaluate(() => {
        notebook.deserialize({
            properties: {
                precision: 2,
                angleUnit: 'radians',
                independent: { name: 't', start: 0, end: 10, step: 0.1, noLimit: false },
                iterationTerm: 'n',
                casesCount: 1,
                initialValuesByCase: {}
            },
            notebook: {
                title: 'Missing terms',
                author: 'test',
                blocks: [
                    { id: 1, type: 'expression', content: 'x=1' },
                    { id: 2, type: 'value', term: 'x' }
                ]
            }
        });
        const expression = notebook.blocks.find(block => block.type === 'expression');
        const valueBlock = notebook.blocks.find(block => block.type === 'value');
        const valueShape = notebook.shapeInstances.get(valueBlock.id);
        expression.content = '';
        notebook._reparseExpressions();
        const toolbarHost = document.createElement('div');
        valueShape.renderTermsButtonTemplate(toolbarHost);
        const editorElement = valueShape.termFormControls.term.termControl ? valueShape._termControl.find('.dx-selectbox') : $();
        return {
            preserved: valueBlock.term === 'x',
            toolbarMissing: toolbarHost.querySelector('.mdl-missing-term') !== null,
            selectorMissing: editorElement.hasClass('mdl-missing-term')
        };
    });

    expect(result.preserved).toBe(true);
    expect(result.toolbarMissing).toBe(true);
    expect(result.selectorMissing).toBe(true);
});
