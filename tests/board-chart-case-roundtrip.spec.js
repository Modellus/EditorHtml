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

// Build a model with 3 cases and a chart plotting term x once per case, then
// return the serialized definition string.
async function buildSerializedModel(page) {
    return page.evaluate(() => {
        shell.setPropertyCommand('casesCount', 3);
        modellus.shape.addExpression('Expr1');
        const expressionShape = shell.board.shapes.getByName('Expr1');
        expressionShape.properties.expression = 'x=2\\cdot t+n';
        modellus.shape.addChart('Chart1');
        const chartShape = shell.board.shapes.getByName('Chart1');
        chartShape.properties.xTerm = 't';
        chartShape.properties.xTermCase = 1;
        chartShape.properties.yTerms = [
            { term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] },
            { term: 'x', case: 2, color: '', showLabel: false, chartTypes: ['line'] },
            { term: 'x', case: 3, color: '', showLabel: false, chartTypes: ['line'] }
        ];
        shell.reparseCalculateAndRefreshWorkspace(() => shell.reset());
        chartShape.update();
        chartShape.draw();
        return JSON.stringify(shell.serialize());
    });
}

test('board: chart yTerm cases survive save/reload', async ({ page }) => {
    await setupEditor(page);
    const serialized = await buildSerializedModel(page);

    const result = await page.evaluate(model => {
        shell.openModel(model);
        const chartShape = shell.board.shapes.getByName('Chart1');
        return {
            stored: (chartShape.properties.yTerms || []).filter(t => t.term === 'x').map(t => t.case),
            series: (chartShape.chartDataConfig?.ySeries || []).map(s => s.case)
        };
    }, serialized);

    console.log('BOARD RELOAD:', JSON.stringify(result));
    expect(result.stored).toEqual([1, 2, 3]);
    expect(result.series).toEqual([1, 2, 3]);
});
