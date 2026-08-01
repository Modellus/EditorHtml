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

async function setupChart(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        const expressionShape = shell.board.shapes.getByName('Expr1');
        expressionShape.properties.expression = '\\displaylines{x=t\\\\y=2\\cdot t+3}';
        expressionShape.mathfield.value = '\\displaylines{x=t\\\\y=2\\cdot t+3}';
        expressionShape.mathfield.position = 0;
        expressionShape.mathfield.executeCommand('moveToNextChar');
        modellus.shape.addChart('Chart1');
        const chartShape = shell.board.shapes.getByName('Chart1');
        chartShape.properties.xTerm = 'x';
        chartShape.properties.xTermCase = 1;
        chartShape.properties.yTerms = [{ term: 'y', case: 1, color: '', showLabel: false, chartTypes: ['line'] }];
        chartShape.properties.autoScale = true;
        chartShape.update();
        chartShape.draw();
    });
    await page.waitForTimeout(700);
}

test.describe('Chart shape interactions', () => {
    test('double click in data area sets origin at clicked point and updates limits', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page);

        const plotCenter = await page.evaluate(() => {
            const chartShape = shell.board.shapes.getByName('Chart1');
            const chartControl = chartShape?.chart;
            const state = chartControl?.renderState;
            if (!chartControl || !state)
                return null;
            const layout = state.layout;
            const localX = layout.plotLeft + layout.plotWidth / 2;
            const localY = layout.plotTop + layout.plotHeight / 2;
            const ctm = chartControl.rootElement?.getScreenCTM?.();
            if (!ctm)
                return null;
            const clientPoint = new DOMPoint(localX, localY).matrixTransform(ctm);
            return {
                clientX: clientPoint.x,
                clientY: clientPoint.y
            };
        });

        expect(plotCenter).toBeTruthy();
        await page.mouse.dblclick(plotCenter.clientX, plotCenter.clientY);
        await page.waitForTimeout(250);

        const chartState = await page.evaluate(() => {
            const chartShape = shell.board.shapes.getByName('Chart1');
            const chartControl = chartShape?.chart;
            const state = chartControl?.renderState;
            if (!chartShape || !chartControl || !state)
                return null;
            const layout = state.layout;
            return {
                autoScale: chartShape.properties.autoScale,
                domainOverride: chartShape.properties.domainOverride,
                zeroX: state.xScale(0),
                zeroY: state.yScale(0),
                centerX: layout.plotLeft + layout.plotWidth / 2,
                centerY: layout.plotTop + layout.plotHeight / 2
            };
        });

        expect(chartState).toBeTruthy();
        expect(chartState.autoScale).toBeFalsy();
        expect(Number.isFinite(chartState.domainOverride?.xMin)).toBeTruthy();
        expect(Number.isFinite(chartState.domainOverride?.xMax)).toBeTruthy();
        expect(Number.isFinite(chartState.domainOverride?.yMin)).toBeTruthy();
        expect(Number.isFinite(chartState.domainOverride?.yMax)).toBeTruthy();
        expect(Math.abs(chartState.zeroX - chartState.centerX)).toBeLessThan(1.5);
        expect(Math.abs(chartState.zeroY - chartState.centerY)).toBeLessThan(1.5);
    });

    test('area series shows the calculated area inside the filled region when the term is visible', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page);

        const areaState = await page.evaluate(() => {
            const chartShape = shell.board.shapes.getByName('Chart1');
            const readAreaLabel = () => chartShape.element.querySelector('.chart-area-value-label');
            chartShape.properties.yTerms = [{ term: 'y', case: 1, color: '', showLabel: false, chartTypes: ['area'] }];
            chartShape.update();
            shell.reset();
            for (let iterationIndex = 0; iterationIndex < 100; iterationIndex++)
                shell.calculator.engine.iterate();
            chartShape.update();
            chartShape.draw();
            const hiddenLabelText = readAreaLabel()?.textContent ?? null;
            chartShape.properties.yTerms = [{ term: 'y', case: 1, color: '', showLabel: true, chartTypes: ['area'] }];
            chartShape.update();
            chartShape.draw();
            const labelElement = readAreaLabel();
            const layout = chartShape.chart.renderState.layout;
            return {
                hiddenLabelText: hiddenLabelText,
                labelText: labelElement?.textContent ?? null,
                symbolFontFamily: labelElement?.querySelector('tspan')?.getAttribute('font-family') ?? null,
                labelX: Number(labelElement?.getAttribute('x')),
                labelY: Number(labelElement?.getAttribute('y')),
                calculatedArea: shell.calculator.calculateTermArea('x', 'y', 1),
                plotLeft: layout.plotLeft,
                plotRight: layout.plotRight,
                plotTop: layout.plotTop,
                plotBottom: layout.plotBottom
            };
        });

        expect(areaState.hiddenLabelText).toBeNull();
        expect(areaState.labelText).toBe('A = 130.00');
        expect(areaState.symbolFontFamily).toBe('Katex_Math');
        expect(areaState.calculatedArea).toBeCloseTo(130, 6);
        expect(areaState.labelX).toBeGreaterThan(areaState.plotLeft);
        expect(areaState.labelX).toBeLessThan(areaState.plotRight);
        expect(areaState.labelY).toBeGreaterThan(areaState.plotTop);
        expect(areaState.labelY).toBeLessThan(areaState.plotBottom);
    });
});
