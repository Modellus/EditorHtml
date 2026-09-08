const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

// A chart of y = t against x = t, run for two seconds so the series is a real curve, with whatever
// the test wants laid over its properties.
async function setupChart(page, properties) {
    await page.evaluate(properties => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').properties.expression = '\\displaylines{x=t\\\\y=t}';
        shell.reparseCalculateAndRefreshWorkspace(() => shell.reset());
        for (let iterationIndex = 0; iterationIndex < 20; iterationIndex++)
            shell.calculator.engine.iterate();
        modellus.shape.addChart('Chart1');
        const chartShape = shell.board.shapes.getByName('Chart1');
        chartShape.setProperties(Object.assign({
            xTerm: 'x',
            xTermCase: 1,
            yTerms: [{ term: 'y', case: 1, color: '', showLabel: false, chartTypes: ['line'] }],
            autoScale: true
        }, properties));
        chartShape.update();
        chartShape.draw();
    }, properties);
    await page.waitForFunction(() => shell.board.shapes.getByName('Chart1')?.chart?.renderState != null);
}

// Tall enough for each decade to take more than fifty pixels, which is what earns it the marks for 2 to 9.
const LOG_Y_CHART = { height: 400, autoScale: false, domainOverride: { xMin: 0, xMax: 10, yMin: 1, yMax: 1000 }, yScaleType: 'logarithmic' };

async function readChartState(page) {
    return page.evaluate(() => {
        const chartShape = shell.board.shapes.getByName('Chart1');
        const state = chartShape.chart.renderState;
        return {
            properties: JSON.parse(JSON.stringify(chartShape.properties)),
            domain: state.domain,
            yTicks: state.yTicks,
            yTickPositions: state.yTicks.map(value => state.yScale(value)),
            layout: state.layout,
            labels: Array.from(chartShape.chart.blockLayer.querySelectorAll('[data-source-id^="y-tick-label-"]')).map(node => node.textContent),
            minorTicks: chartShape.chart.blockLayer.querySelectorAll('[data-source-id^="y-minor-tick-"]').length
        };
    });
}

// The client point that stands over a point of the plot given as fractions of its width and height.
async function plotClientPoint(page, xFraction, yFraction) {
    return page.evaluate(({ xFraction, yFraction }) => {
        const chartControl = shell.board.shapes.getByName('Chart1').chart;
        const layout = chartControl.renderState.layout;
        const localPoint = new DOMPoint(layout.plotLeft + layout.plotWidth * xFraction, layout.plotTop + layout.plotHeight * yFraction);
        const clientPoint = localPoint.matrixTransform(chartControl.rootElement.getScreenCTM());
        return { x: clientPoint.x, y: clientPoint.y };
    }, { xFraction, yFraction });
}

// The scale is one of the vertical axis's choices, offered inside the axis chip once it is opened.
async function openChartSettings(page) {
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Chart1')));
    await page.locator('.shape-context-toolbar.visible .mdl-chart-type-selector').click();
    await expect(page.locator('.mdl-shape-overlay-popup .mdl-axis-chip-editor[data-axis="y"]')).toHaveCount(1);
    await page.evaluate(() => $(document.querySelector('.mdl-shape-overlay-popup .mdl-axis-chip-editor[data-axis="y"]')).dxDropDownBox('instance').open());
    await expect(page.locator('.mdl-axis-chip-popup .mdl-axis-scale-group')).toHaveCount(1);
}

test.describe('the chart read logarithmically', () => {
    test('spreads the decades evenly and numbers them 1, 10, 100, 1000', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, LOG_Y_CHART);
        const state = await readChartState(page);
        expect(state.yTicks).toEqual([1, 10, 100, 1000]);
        expect(state.labels).toEqual(['1', '10', '100', '1000']);
        const gaps = state.yTickPositions.slice(1).map((position, index) => state.yTickPositions[index] - position);
        for (const gap of gaps)
            expect(Math.abs(gap - gaps[0])).toBeLessThan(0.01);
        expect(state.yTickPositions[0]).toBeCloseTo(state.layout.plotBottom, 3);
        expect(state.yTickPositions[3]).toBeCloseTo(state.layout.plotTop, 3);
        // Eight marks in each of the three decades, for 2 to 9.
        expect(state.minorTicks).toBe(24);
    });

    // A value stands where its logarithm puts it, so the middle of an axis running from 1 to 1000
    // reads a little over 31, not 500.
    test('reads the value the pointer stands at, not the distance along it', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, LOG_Y_CHART);
        const centre = await plotClientPoint(page, 0.5, 0.5);
        await page.mouse.move(centre.x - 30, centre.y - 30);
        await page.mouse.move(centre.x, centre.y, { steps: 4 });
        await expect.poll(() => page.evaluate(() => Array.from(shell.board.shapes.getByName('Chart1').chart.crosshairLayer.querySelectorAll('text')).map(node => node.textContent)))
            .toContain('5.00, 31.62');
    });

    // The 10 stands a third of the way up three decades; pulling it to the middle leaves two, the
    // way a decade of the ruler is pulled.
    test('is stretched a decade at a time by pulling one of its decades', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, LOG_Y_CHART);
        const handle = page.locator('.chart-tick-handle-y[data-value="10"]');
        const handleBox = await handle.boundingBox();
        const target = await plotClientPoint(page, 0.5, 0.5);
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + handleBox.width / 2, target.y, { steps: 6 });
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1').properties.domainOverride.yMax)).toBeGreaterThan(80);
        const state = await readChartState(page);
        expect(state.properties.domainOverride.yMin).toBe(1);
        expect(state.properties.domainOverride.yMax).toBeLessThan(125);
        expect(state.properties.autoScale).toBe(false);
        expect(state.yTicks).toEqual([1, 10, 100]);
    });

    // Nothing at or below zero has a logarithm, so the values there are left out of the fit and the
    // axis is padded in decades around the ones that remain.
    test('fits itself to the positive values when scaling itself', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, { yScaleType: 'logarithmic' });
        const state = await readChartState(page);
        expect(state.domain.yMin).toBeGreaterThan(0);
        expect(state.domain.yMin).toBeLessThan(0.1);
        expect(state.domain.yMax).toBeGreaterThan(2);
        expect(state.domain.yMax).toBeLessThan(4);
        const path = await page.evaluate(() => shell.board.shapes.getByName('Chart1').chart.blockLayer.querySelector('[data-source-id="series-0"] path').getAttribute('d'));
        expect(path).not.toContain('NaN');
        expect(path.startsWith('M')).toBe(true);
    });

    // The switch stands inside each axis's chip on the chart's own menu. A bound at zero is lifted
    // to 1 when the axis is read logarithmically, since the axis has to run between two positive
    // ends, and taking the choice back takes the bound back with it.
    test('is switched from its own row, lifting a bound at zero to 1', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, { autoScale: false, domainOverride: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 } });
        await openChartSettings(page);
        const verticalScale = page.locator('.mdl-axis-chip-popup .mdl-axis-scale-group[data-axis="y"] .dx-button');
        await expect(verticalScale).toHaveText(['Linear', 'Log']);
        await verticalScale.nth(1).click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1').properties.yScaleType)).toBe('logarithmic');
        let state = await readChartState(page);
        expect(state.properties.xScaleType).toBe('linear');
        expect(state.properties.domainOverride).toEqual({ xMin: 0, xMax: 10, yMin: 1, yMax: 10 });
        expect(state.yTicks).toEqual([1, 10]);
        await page.evaluate(() => shell.board.invoker.undo());
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1').properties.yScaleType)).toBe('linear');
        state = await readChartState(page);
        expect(state.properties.domainOverride).toEqual({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 });
        // The horizontal axis has the same switch inside its own chip.
        await page.evaluate(() => $(document.querySelector('.mdl-shape-overlay-popup .mdl-axis-chip-editor[data-axis="x"]')).dxDropDownBox('instance').open());
        const horizontalScale = page.locator('.mdl-axis-chip-popup .mdl-axis-scale-group[data-axis="x"] .dx-button');
        await expect(horizontalScale).toHaveText(['Linear', 'Log']);
        await horizontalScale.nth(1).click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1').properties.xScaleType)).toBe('logarithmic');
        state = await readChartState(page);
        expect(state.properties.domainOverride).toEqual({ xMin: 1, xMax: 10, yMin: 0, yMax: 10 });
    });

    // Recentring on a logarithmic axis brings the point under the pointer to 1 rather than to 0,
    // which is where the axis has its identity.
    test('a double click brings the clicked point to 1 on a logarithmic axis', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page, LOG_Y_CHART);
        const centre = await plotClientPoint(page, 0.5, 0.5);
        await page.mouse.dblclick(centre.x, centre.y);
        await expect.poll(() => page.evaluate(() => {
            const state = shell.board.shapes.getByName('Chart1').chart.renderState;
            return Math.abs(state.yScale(1) - (state.layout.plotTop + state.layout.plotHeight / 2));
        })).toBeLessThan(1.5);
        const state = await readChartState(page);
        expect(state.properties.autoScale).toBe(false);
        expect(state.domain.yMax).toBeGreaterThan(29);
        expect(state.domain.yMax).toBeLessThan(34);
        expect(state.domain.yMin * state.domain.yMax).toBeCloseTo(1, 3);
        expect(state.domain.xMin + state.domain.xMax).toBeCloseTo(0, 1);
    });
});
