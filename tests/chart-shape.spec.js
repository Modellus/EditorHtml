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
            const iconElement = labelElement?.querySelector('tspan');
            // An unresolved icon font falls back to a narrower missing-glyph box, so the attribute
            // width has to match the width the same family gives when forced through the style.
            const attributeIconWidth = iconElement?.getComputedTextLength();
            if (iconElement) {
                iconElement.style.fontFamily = "'Font Awesome 7 Pro'";
                iconElement.style.fontWeight = '900';
            }
            const layout = chartShape.chart.renderState.layout;
            return {
                hiddenLabelText: hiddenLabelText,
                labelText: labelElement?.textContent ?? null,
                iconFontFamily: iconElement?.getAttribute('font-family') ?? null,
                attributeIconWidth: attributeIconWidth,
                styledIconWidth: iconElement?.getComputedTextLength(),
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
        expect(areaState.labelText).toBe('\uf1fe 130.00');
        expect(areaState.iconFontFamily).toBe("'Font Awesome 7 Pro'");
        expect(areaState.attributeIconWidth).toBeCloseTo(areaState.styledIconWidth, 3);
        expect(areaState.calculatedArea).toBeCloseTo(130, 6);
        expect(areaState.labelX).toBeGreaterThan(areaState.plotLeft);
        expect(areaState.labelX).toBeLessThan(areaState.plotRight);
        expect(areaState.labelY).toBeGreaterThan(areaState.plotTop);
        expect(areaState.labelY).toBeLessThan(areaState.plotBottom);
    });

    test('tangent triangle writes its slope beside the right angle with the ruler-triangle mark', async ({ page }) => {
        await setupEditor(page);
        await setupChart(page);

        const slopeState = await page.evaluate(() => {
            const chartShape = shell.board.shapes.getByName('Chart1');
            const readSlopeLabel = () => chartShape.element.querySelector('.chart-tangent-slope-label');
            const readTriangleCorners = () => (chartShape.element.querySelector('.chart-focus-layer polygon')?.getAttribute('points') ?? '')
                .split(' ').map(pair => pair.split(',').map(Number));
            shell.reset();
            for (let iterationIndex = 0; iterationIndex < 50; iterationIndex++)
                shell.calculator.engine.iterate();
            chartShape.update();
            chartShape.draw();
            const hiddenLabelText = readSlopeLabel()?.textContent ?? null;
            chartShape.properties.tangentColor = '#ff0000';
            chartShape.update();
            chartShape.draw();
            // At the last iteration the triangle reaches past the right edge of the plot, so the
            // slope has to step over the vertical leg to stay on the chart.
            const edgeCorners = readTriangleCorners();
            const edgeLabelX = Number(readSlopeLabel()?.getAttribute('x'));
            shell.calculator.setIteration(25);
            chartShape.updateFocus();
            chartShape.draw();
            const labelElement = readSlopeLabel();
            const backgroundElement = chartShape.element.querySelector('.chart-tangent-slope-label-bg');
            const iconElement = labelElement?.querySelector('tspan');
            const attributeIconWidth = iconElement?.getComputedTextLength();
            if (iconElement) {
                iconElement.style.fontFamily = "'Font Awesome 7 Pro'";
                iconElement.style.fontWeight = '900';
            }
            const corners = readTriangleCorners();
            const layout = chartShape.chart.renderState.layout;
            return {
                hiddenLabelText: hiddenLabelText,
                edgeRightAngleX: edgeCorners[1]?.[0],
                edgeLabelX: edgeLabelX,
                labelText: labelElement?.textContent ?? null,
                iconFontFamily: iconElement?.getAttribute('font-family') ?? null,
                attributeIconWidth: attributeIconWidth,
                styledIconWidth: iconElement?.getComputedTextLength(),
                labelFill: labelElement?.getAttribute('fill') ?? null,
                backgroundFill: backgroundElement?.getAttribute('fill') ?? null,
                labelX: Number(labelElement?.getAttribute('x')),
                labelY: Number(labelElement?.getAttribute('y')),
                rightAngleX: corners[1]?.[0],
                rightAngleY: corners[1]?.[1],
                hypotenuseEndY: corners[2]?.[1],
                plotLeft: layout.plotLeft,
                plotRight: layout.plotRight,
                plotTop: layout.plotTop,
                plotBottom: layout.plotBottom
            };
        });

        expect(slopeState.hiddenLabelText).toBeNull();
        expect(slopeState.labelText).toBe('\uf61c 2.00');
        expect(slopeState.iconFontFamily).toBe("'Font Awesome 7 Pro'");
        expect(slopeState.attributeIconWidth).toBeCloseTo(slopeState.styledIconWidth, 3);
        expect(slopeState.backgroundFill).toBe('#ff0000');
        expect(slopeState.labelFill).toBe('#ffffff');
        // The line rises, so the triangle sits above its horizontal leg and the slope goes below it,
        // to the right of the vertical leg: close to the right angle but outside the triangle.
        expect(slopeState.hypotenuseEndY).toBeLessThan(slopeState.rightAngleY);
        expect(slopeState.labelX).toBeGreaterThan(slopeState.rightAngleX);
        expect(slopeState.labelX - slopeState.rightAngleX).toBeLessThan(40);
        expect(slopeState.labelY).toBeGreaterThan(slopeState.rightAngleY);
        expect(slopeState.labelY - slopeState.rightAngleY).toBeLessThan(15);
        expect(slopeState.labelX).toBeGreaterThan(slopeState.plotLeft);
        expect(slopeState.labelX).toBeLessThan(slopeState.plotRight);
        expect(slopeState.labelY).toBeGreaterThan(slopeState.plotTop);
        expect(slopeState.labelY).toBeLessThan(slopeState.plotBottom);
        expect(slopeState.edgeRightAngleX).toBeGreaterThan(slopeState.plotRight - 40);
        expect(slopeState.edgeLabelX).toBeLessThan(slopeState.edgeRightAngleX);
        expect(slopeState.edgeLabelX).toBeLessThan(slopeState.plotRight);
    });

    test('area follows a value changed on the iteration being replayed', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => modellus.shape.addExpression('Expr1'));
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Expr1').properties.expression = '\\frac{dx}{dt}=v';
            shell.reset();
        });
        await page.waitForTimeout(400);

        const areaState = await page.evaluate(() => {
            modellus.shape.addChart('Chart1');
            const chartShape = shell.board.shapes.getByName('Chart1');
            chartShape.properties.xTerm = 't';
            chartShape.properties.xTermCase = 1;
            chartShape.properties.yTerms = [{ term: 'v', case: 1, color: '', showLabel: true, chartTypes: ['area'] }];
            chartShape.properties.autoScale = true;
            chartShape.update();
            shell.reset();
            for (let iterationIndex = 0; iterationIndex < 20; iterationIndex++)
                shell.calculator.engine.iterate();
            chartShape.update();
            const calculator = shell.calculator;
            calculator.setIteration(10);
            calculator.setTermValue('v', 5, calculator.getIteration(), 1);
            calculator.calculate();
            chartShape.draw();
            const valueField = chartShape.chartDataConfig.ySeries[0].valueField;
            const lastIteration = calculator.system.lastIteration;
            return {
                labelText: chartShape.element.querySelector('.chart-area-value-label')?.textContent ?? null,
                replayedIterationValue: calculator.system.getByNameOnIteration(10, 'v', 1),
                lastIterationValue: calculator.system.getByNameOnIteration(lastIteration, 'v', 1),
                chartReplayedRowValue: chartShape.chartRows.find(row => row.iteration === 10)?.[valueField],
                calculatedArea: calculator.calculateTermArea('t', 'v', 1)
            };
        });

        expect(areaState.replayedIterationValue).toBeCloseTo(5, 6);
        expect(areaState.lastIterationValue).toBeCloseTo(0, 6);
        expect(areaState.chartReplayedRowValue).toBeCloseTo(5, 6);
        expect(areaState.calculatedArea).toBeCloseTo(0.5, 6);
        expect(areaState.labelText).toBe('\uf1fe 0.50');
    });
});
