const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
const NOTEBOOK_URL = '/pages/notebook/index.html';

const NOTEBOOK_MODEL = {
    properties: {
        precision: 2,
        angleUnit: 'radians',
        independent: { name: 't', start: 0, end: 10, step: 0.1, noLimit: false },
        iterationTerm: 'n',
        casesCount: 1,
        initialValuesByCase: {}
    },
    notebook: {
        title: 'Chart drawn from blocks',
        author: 'test',
        blocks: [
            { id: 1, type: 'expression', content: 'x=2\\cdot t' },
            { id: 2, type: 'chart', xTerm: 't', xTermCase: 1, yTerms: [{ term: 'x', case: 1, color: '#1871c2', showLabel: false, chartTypes: ['line'] }], autoScale: true }
        ]
    }
};

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addModel(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').properties.expression = '\\displaylines{x=2\\cdot t\\\\y=t\\cdot t-4}';
        shell.reparseCalculateAndRefreshWorkspace(() => shell.reset());
    });
    await page.waitForTimeout(600);
    // A run of iterations, so the series are real curves rather than a single point.
    await page.evaluate(() => {
        for (let iterationIndex = 0; iterationIndex < 20; iterationIndex++)
            shell.calculator.engine.iterate();
    });
    await page.waitForTimeout(300);
}

// The chart the board draws is the block one. The SVG `ChartControl` writes for the same plan is
// what it is held to, so the reference is opted into here — nothing in the editor reaches for it.
async function registerDrawnChart(page) {
    await page.evaluate(() => {
        shell.commands.registerShapeAlias('DrawnChartWidget', class DrawnChartWidget extends ChartWidget {
            getChartControlClass() {
                return ChartControl;
            }
        });
    });
}

const CHART_PROPERTIES = {
    xTerm: 'x',
    yTerms: [{ term: 'y', case: 1, color: '#1871c2', showLabel: false, chartTypes: ['line'] }],
    autoScale: true,
    width: 400,
    height: 200
};

async function addChart(page, shapeType, name, overrides = {}) {
    await page.evaluate(({ shapeType, name, properties }) => {
        shell.commands.addShape(shapeType, name);
        const chartShape = shell.board.shapes.getByName(name);
        chartShape.setProperties(properties);
        chartShape.update();
        chartShape.draw();
    }, { shapeType, name, properties: Object.assign({}, CHART_PROPERTIES, overrides) });
    await page.waitForTimeout(600);
}

// Compares what the two charts leave in the DOM: same tags, same coordinates, same text.
// Attributes that only differ in how the same paint is expressed — stroke-opacity against
// opacity, the data attributes the block renderer writes — are left out.
async function getChartDigest(page, shapeName, layerNames) {
    return page.evaluate(({ shapeName, layerNames }) => {
        const attributesByTag = {
            line: ['x1', 'y1', 'x2', 'y2', 'stroke'],
            path: ['d', 'fill', 'stroke'],
            rect: ['x', 'y', 'width', 'height', 'fill'],
            circle: ['cx', 'cy', 'r', 'fill', 'stroke'],
            polygon: ['points', 'fill'],
            text: ['x', 'y', 'text-anchor', 'fill']
        };
        // A stroke that is not written and a stroke written as "none" paint the same nothing.
        const normalize = (name, value) => {
            if (value === null)
                return name === 'stroke' ? 'none' : '';
            const numeric = Number(value);
            return Number.isFinite(numeric) ? String(Math.round(numeric * 1000) / 1000) : String(value);
        };
        const chartControl = shell.board.shapes.getByName(shapeName).chart;
        const entries = [];
        for (const layerName of layerNames) {
            const layer = chartControl[layerName];
            if (!layer)
                continue;
            for (const element of layer.querySelectorAll('line, path, rect, circle, polygon, text')) {
                const values = attributesByTag[element.tagName].map(name => normalize(name, element.getAttribute(name)));
                entries.push([element.tagName, ...values, element.tagName === 'text' ? element.textContent : ''].join('|'));
            }
        }
        return entries;
    }, { shapeName, layerNames });
}

test.describe('the chart, drawn from blocks', () => {
    test('draws the same geometry as the chart it is modelled on', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await registerDrawnChart(page);
        await addChart(page, 'DrawnChartWidget', 'Chart1');
        await addChart(page, 'ChartShape', 'BlockChart1');

        // The drawn chart paints into four layers; the block chart paints the same picture into
        // its block layer and keeps only the term titles and the legend in the axis layer.
        const drawnDigest = await getChartDigest(page, 'Chart1', ['backgroundLayer', 'gridLayer', 'seriesLayer', 'axisLayer']);
        const blockDigest = await getChartDigest(page, 'BlockChart1', ['blockLayer', 'axisLayer']);

        expect(drawnDigest.length).toBeGreaterThan(10);
        expect(drawnDigest.some(entry => entry.startsWith('path|M'))).toBe(true);
        expect(blockDigest).toEqual(drawnDigest);
    });

    test('draws the same geometry for area, scatter and bar series', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        const seriesOverride = {
            yTerms: [
                { term: 'y', case: 1, color: '#1871c2', showLabel: false, chartTypes: ['area'] },
                { term: 'x', case: 1, color: '#e03130', showLabel: false, chartTypes: ['scatter'] },
                { term: 'y', case: 1, color: '#2f9e44', showLabel: false, chartTypes: ['bar'] }
            ]
        };
        await registerDrawnChart(page);
        await addChart(page, 'DrawnChartWidget', 'Chart1', seriesOverride);
        await addChart(page, 'ChartShape', 'BlockChart1', seriesOverride);

        const drawnDigest = await getChartDigest(page, 'Chart1', ['backgroundLayer', 'gridLayer', 'seriesLayer', 'axisLayer']);
        const blockDigest = await getChartDigest(page, 'BlockChart1', ['blockLayer', 'axisLayer']);

        expect(drawnDigest.some(entry => entry.startsWith('circle|'))).toBe(true);
        expect(drawnDigest.some(entry => entry.startsWith('path|M'))).toBe(true);
        expect(blockDigest).toEqual(drawnDigest);
    });

    test('an area series still shows the area it encloses', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1', {
            yTerms: [{ term: 'y', case: 1, color: '#1871c2', showLabel: true, chartTypes: ['area'] }]
        });

        const labelText = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('BlockChart1');
            shape.draw();
            return shape.element.querySelector('.chart-area-value-label')?.textContent ?? null;
        });
        expect(labelText).toMatch(/^\uf1fe /);
    });

    test('is placed from the chart button by drawing on the board', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await page.click('#chart-button');
        await page.waitForTimeout(300);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(1)');
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => shell.shapeDrawController.pendingShapeType)).toBe('ChartShape');

        const canvas = await page.evaluate(() => {
            const matrix = shell.board.svg.getScreenCTM();
            const start = new DOMPoint(300, 200).matrixTransform(matrix);
            const end = new DOMPoint(700, 400).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
        });
        await page.mouse.move(canvas.start.x, canvas.start.y);
        await page.mouse.down();
        await page.mouse.move(canvas.end.x, canvas.end.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);

        const placed = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(entry => entry instanceof ChartShape);
            return { drawnWithBlocks: shape?.chart instanceof BlockChartControl, nodeCount: shape?.chart?.lastCompilation?.stats?.nodeCount ?? 0 };
        });
        expect(placed.drawnWithBlocks).toBe(true);
        expect(placed.nodeCount).toBeGreaterThan(20);
    });

    test('the drawing is compiled from the chart building blocks', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1');

        const report = await page.evaluate(() => shell.board.shapes.getByName('BlockChart1').getInspectionReport());
        expect(report.diagnostics).toEqual([]);
        expect(report.stats.componentsUsed).toEqual(expect.arrayContaining(['chart', 'chart-frame', 'chart-grid', 'chart-axes', 'chart-series']));
        expect(report.stats.blocksUsed).toEqual(expect.arrayContaining(['rect', 'line', 'path', 'text', 'group']));
        expect(report.markup).toContain('data-source-component="chart-axes"');
        expect(report.markup).toContain('data-source-component="chart-series"');
        expect(report.nodes.some(node => node.sourceComponent === 'chart-series')).toBe(true);
        expect(report.nodes.some(node => node.sourceType === 'path')).toBe(true);
    });

    test('double click in the data area recentres the domain', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1');

        const plotCenter = await page.evaluate(() => {
            const chartControl = shell.board.shapes.getByName('BlockChart1')?.chart;
            const state = chartControl?.renderState;
            if (!state)
                return null;
            const localX = state.layout.plotLeft + state.layout.plotWidth / 2;
            const localY = state.layout.plotTop + state.layout.plotHeight / 2;
            const ctm = chartControl.rootElement?.getScreenCTM?.();
            if (!ctm)
                return null;
            const clientPoint = new DOMPoint(localX, localY).matrixTransform(ctm);
            return { clientX: clientPoint.x, clientY: clientPoint.y };
        });
        expect(plotCenter).toBeTruthy();

        await page.mouse.dblclick(plotCenter.clientX, plotCenter.clientY);
        await page.waitForTimeout(300);

        const afterDoubleClick = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('BlockChart1');
            return { autoScale: shape.properties.autoScale, domain: shape.chart.renderState.domain };
        });
        expect(afterDoubleClick.autoScale).toBe(false);
        expect(Math.abs((afterDoubleClick.domain.xMin + afterDoubleClick.domain.xMax) / 2)).toBeLessThan(0.5);
        expect(Math.abs((afterDoubleClick.domain.yMin + afterDoubleClick.domain.yMax) / 2)).toBeLessThan(0.5);
    });

    test('tick handles are on the chart and the domain override redraws it', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1');

        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('BlockChart1');
            const handles = shape.chart.rootElement.querySelectorAll('.chart-tick-handle').length;
            const before = { ...shape.chart.renderState.domain };
            shape.chart.setDomainOverride({ xMin: -5, xMax: 5, yMin: -10, yMax: 10 });
            return { handles: handles, before: before, after: { ...shape.chart.renderState.domain } };
        });
        expect(result.handles).toBeGreaterThan(0);
        expect(result.after.xMin).toBeCloseTo(-5, 6);
        expect(result.after.yMax).toBeCloseTo(10, 6);
        expect(result.after).not.toEqual(result.before);
    });

    // The bars are block nodes, so the shape has to find the one under the focus by the id the
    // `chart-bars` component gave it rather than by a class the drawn chart wrote.
    test('the bar under the focus is an element the shape lights up', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1', {
            yTerms: [{ term: 'y', case: 1, color: '#2f9e44', showLabel: false, chartTypes: ['bar'] }]
        });

        const focused = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('BlockChart1');
            const rows = shape.chart.dataRows;
            shape.chart.setFocusArgumentValue(rows[Math.floor(rows.length / 2)].argument);
            const elements = shape.getPulseElements('_yTerm0');
            return {
                tags: elements.map(element => element.tagName),
                sources: elements.map(element => element.getAttribute('data-source-id'))
            };
        });
        expect(focused.tags).toContain('rect');
        expect(focused.sources.some(source => (source ?? '').startsWith('bar-0-'))).toBe(true);
    });

    // The notebook is a second editor with a chart of its own, and it is the same chart: the block
    // layer is loaded there too, so it draws through the same control rather than keeping a
    // hand-written drawing of its own.
    test('the notebook draws its chart from the same blocks', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        });
        await page.goto(NOTEBOOK_URL);
        await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });

        const drawn = await page.evaluate(model => {
            notebook.deserialize(model);
            const chartBlock = notebook.blocks.find(block => block.type === 'chart');
            const shape = notebook.shapeInstances.get(chartBlock.id);
            shape.draw();
            return {
                usesBlockControl: shape.chart instanceof BlockChartControl,
                diagnostics: shape.chart.lastCompilation?.diagnostics ?? null,
                componentsUsed: shape.chart.lastCompilation?.stats?.componentsUsed ?? [],
                axisLabels: shape.chart.blockLayer.querySelectorAll('text').length
            };
        }, NOTEBOOK_MODEL);
        expect(drawn.usesBlockControl).toBe(true);
        expect(drawn.diagnostics).toEqual([]);
        expect(drawn.componentsUsed).toEqual(expect.arrayContaining(['chart', 'chart-frame', 'chart-grid', 'chart-axes']));
        expect(drawn.axisLabels).toBeGreaterThan(0);
    });

    test('survives a serialization round trip', async ({ page }) => {
        await setupEditor(page);
        await addModel(page);
        await addChart(page, 'ChartShape', 'BlockChart1');

        const restored = await page.evaluate(() => {
            const serialized = shell.board.shapes.getByName('BlockChart1').serialize();
            const shape = shell.board.shapes.deserialize(shell.board, JSON.parse(JSON.stringify(serialized)));
            return {
                serializedType: serialized.type,
                xTerm: shape.properties.xTerm,
                yTerms: shape.properties.yTerms,
                usesBlockControl: shape.chart instanceof BlockChartControl
            };
        });
        expect(restored.serializedType).toBe('ChartWidget');
        expect(restored.xTerm).toBe('x');
        expect(restored.yTerms[0].term).toBe('y');
        expect(restored.usesBlockControl).toBe(true);
    });
});
