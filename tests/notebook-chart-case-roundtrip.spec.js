const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

function buildModel() {
    return {
        properties: {
            precision: 2,
            angleUnit: 'radians',
            independent: { name: 't', start: 0, end: 10, step: 0.1, noLimit: false },
            iterationTerm: 'n',
            casesCount: 3,
            initialValuesByCase: {}
        },
        notebook: {
            title: 'Case roundtrip',
            author: 'test',
            blocks: [
                { id: 1, type: 'expression', content: 'x=2\\cdot t+n' },
                {
                    id: 2,
                    type: 'chart',
                    xTerm: 't',
                    xTermCase: 1,
                    yTerms: [
                        { term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] }
                    ],
                    autoScale: true
                }
            ]
        }
    };
}

test('load preserves chart yTerm cases', async ({ page }) => {
    await setupNotebook(page);
    const model = buildModel();
    model.notebook.blocks[1].yTerms = [
        { term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] },
        { term: 'x', case: 2, color: '', showLabel: false, chartTypes: ['line'] },
        { term: 'x', case: 3, color: '', showLabel: false, chartTypes: ['line'] }
    ];
    const cases = await page.evaluate(m => {
        notebook.deserialize(m);
        const chart = notebook.blocks.find(b => b.type === 'chart');
        return (chart.yTerms || []).filter(t => t.term === 'x').map(t => t.case);
    }, model);
    console.log('LOAD:', JSON.stringify(cases));
    expect(cases).toEqual([1, 2, 3]);
});

test('editing case then saving persists the case', async ({ page }) => {
    await setupNotebook(page);
    const result = await page.evaluate(m => {
        notebook.deserialize(m);
        const chartBlock = notebook.blocks.find(b => b.type === 'chart');
        const shape = notebook.shapeInstances.get(chartBlock.id);
        // Simulate the user picking case 2 for the single yTerm through the shape API.
        const yTerms = [{ term: 'x', case: 2, color: '', showLabel: false, chartTypes: ['line'] }];
        shape.setPropertyCommand('yTerms', yTerms);
        const afterEdit = notebook.blocks.find(b => b.type === 'chart').yTerms
            .filter(t => t.term === 'x').map(t => t.case);
        const serialized = notebook.serialize();
        const serializedCases = serialized.notebook.blocks.find(b => b.type === 'chart').yTerms
            .filter(t => t.term === 'x').map(t => t.case);
        return { afterEdit, serializedCases };
    }, buildModel());
    console.log('EDIT+SAVE:', JSON.stringify(result));
    expect(result.afterEdit).toEqual([2]);
    expect(result.serializedCases).toEqual([2]);
});

test('full round-trip: set case, save, reload', async ({ page }) => {
    await setupNotebook(page);
    const cases = await page.evaluate(m => {
        notebook.deserialize(m);
        const chartBlock = notebook.blocks.find(b => b.type === 'chart');
        const shape = notebook.shapeInstances.get(chartBlock.id);
        shape.setPropertyCommand('yTerms', [
            { term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] },
            { term: 'x', case: 2, color: '', showLabel: false, chartTypes: ['line'] },
            { term: 'x', case: 3, color: '', showLabel: false, chartTypes: ['line'] }
        ]);
        const saved = JSON.stringify(notebook.serialize());
        // Reload the saved definition (fresh load path).
        notebook.deserialize(saved);
        return notebook.blocks.find(b => b.type === 'chart').yTerms
            .filter(t => t.term === 'x').map(t => t.case);
    }, buildModel());
    console.log('ROUNDTRIP:', JSON.stringify(cases));
    expect(cases).toEqual([1, 2, 3]);
});

test('plotted series use the loaded cases', async ({ page }) => {
    await setupNotebook(page);
    const model = buildModel();
    model.notebook.blocks[1].yTerms = [
        { term: 'x', case: 1, color: '', showLabel: false, chartTypes: ['line'] },
        { term: 'x', case: 2, color: '', showLabel: false, chartTypes: ['line'] },
        { term: 'x', case: 3, color: '', showLabel: false, chartTypes: ['line'] }
    ];
    const seriesCases = await page.evaluate(m => {
        notebook.deserialize(m);
        const chartBlock = notebook.blocks.find(b => b.type === 'chart');
        const shape = notebook.shapeInstances.get(chartBlock.id);
        return (shape.chartDataConfig?.ySeries || []).map(s => s.case);
    }, model);
    console.log('SERIES CASES:', JSON.stringify(seriesCases));
    expect(seriesCases).toEqual([1, 2, 3]);
});
