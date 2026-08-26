const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForFunction(() => typeof modellus !== 'undefined' && typeof FrequencyChartShape !== 'undefined');
}

async function addModel(page, expression, settledTermName) {
    await page.evaluate(shapeExpression => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').setProperties({ expression: shapeExpression });
        shell.reset();
    }, expression);
    await page.waitForFunction(termName => shell.calculator.getTermsNames().includes(termName), settledTermName);
}

async function addFrequencyChart(page, iterations, properties) {
    await page.evaluate(({ iterationCount, shapeProperties }) => {
        modellus.shape.addFrequencyChart('Freq1');
        const shape = shell.board.shapes.getByName('Freq1');
        for (let index = 0; index < iterationCount; index++)
            shell.calculator.engine.iterate();
        shape.setProperties(shapeProperties);
        shape.update();
        shape.draw();
    }, { iterationCount: iterations, shapeProperties: properties });
}

// Selecting is what brings the chart's toolbar up, and the board can be busy re-reading the model at
// that moment, so the selection is made again until the toolbar is there and the terms menu opens
// off the chart's own button rather than off whichever toolbar happens to be on screen.
async function openTermsMenu(page) {
    await expect.poll(() => page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Freq1');
        shell.board.selection.select(shape);
        const termsButton = shape.contextToolbar?.querySelector('.mdl-terms-selector');
        if (!termsButton)
            return false;
        $(termsButton).dxDropDownButton('instance').open();
        return true;
    })).toBe(true);
    await page.locator('.mdl-frequency-terms-menu .frequency-series-row').first().waitFor();
}

async function openSeriesMenu(page) {
    await openTermsMenu(page);
    await page.locator('.shape-term-lock-dropdown').first().click();
    return page.locator('.mdl-nested-dropdown-popup');
}

function readChart(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Freq1');
        const chartControl = shape.chart;
        const renderState = chartControl.renderState;
        return {
            categories: chartControl.options.categories,
            rows: chartControl.dataRows,
            domains: renderState.domains,
            layout: renderState.layout,
            orientation: renderState.orientation,
            barCount: chartControl.seriesLayer.querySelectorAll('rect').length,
            circleCount: chartControl.seriesLayer.querySelectorAll('circle').length,
            polygonCount: chartControl.seriesLayer.querySelectorAll('polygon').length,
            valueLabels: [...chartControl.labelLayer.querySelectorAll('text')].map(element => element.textContent),
            categoryLabels: [...chartControl.axisLayer.querySelectorAll('.frequency-category-label')].map(element => element.textContent),
            categoryPositions: [...chartControl.axisLayer.querySelectorAll('.frequency-category-label')].map(element => ({ x: Number(element.getAttribute('x')), y: Number(element.getAttribute('y')) }))
        };
    });
}

// sign(n - 3) over the first seven iterations reads -1, -1, 0, 1, 1, 1, 1: three values from a set,
// each with a count of its own, and a second term worth averaging over each of them.
const DISCRETE_MODEL = '\\displaylines{g=sign\\left(n-3\\right)\\\\y=2\\cdot n}';
const COUNT_SERIES = { term: 'g', case: 1, aggregate: 'count', axis: 'primary', mark: 'bar', color: '#1871c2' };

test.describe('Frequency chart', () => {

    test('counts how often each label of a categorical term came up', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace', 'z');
        await addFrequencyChart(page, 12, { categoryTerm: 'z', series: [{ ...COUNT_SERIES, term: 'z' }] });

        const chart = await readChart(page);
        expect(chart.categories).toEqual(['green', 'blue', 'red']);
        expect(chart.categoryLabels).toEqual(['green', 'blue', 'red']);
        expect(chart.rows.map(row => row.series0)).toEqual([13, 0, 0]);
    });

    test('a label the model never reached keeps a place of its own on the axis', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace', 'z');
        await addFrequencyChart(page, 4, { categoryTerm: 'z', series: [{ ...COUNT_SERIES, term: 'z' }] });

        const chart = await readChart(page);
        expect(chart.categories).toHaveLength(3);
        expect(chart.rows).toHaveLength(3);
    });

    test('counts the values a discrete numeric term was seen to hold', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });

        const chart = await readChart(page);
        expect(chart.categories).toEqual(['-1', '0', '1']);
        expect(chart.rows.map(row => row.series0)).toEqual([2, 1, 4]);
    });

    test('a series answers for each category with the function it is given', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        const functions = ['mean', 'median', 'sum', 'min', 'max'];
        await addFrequencyChart(page, 6, {
            categoryTerm: 'g',
            series: functions.map(functionName => ({ term: 'y', case: 1, aggregate: functionName, axis: 'primary', mark: 'circle', color: '' }))
        });

        const chart = await readChart(page);
        const lastCategory = chart.rows[2];
        expect(lastCategory.series0).toBe(11);
        expect(lastCategory.series1).toBe(11);
        expect(lastCategory.series2).toBe(44);
        expect(lastCategory.series3).toBe(8);
        expect(lastCategory.series4).toBe(14);
    });

    test('a probability series reads each category as a share of every reading', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, {
            categoryTerm: 'g',
            series: [{ term: 'g', case: 1, aggregate: 'probability', axis: 'primary', mark: 'bar', color: '', showLabel: true }]
        });

        const chart = await readChart(page);
        expect(chart.rows.map(row => row.series0)).toEqual([2 / 7, 1 / 7, 4 / 7]);
        expect(chart.rows.reduce((total, row) => total + row.series0, 0)).toBeCloseTo(1, 10);
        expect(chart.valueLabels).toEqual(['0.29', '0.14', '0.57']);
    });

    test('the categories picker is given the whole width of its row', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });
        await openTermsMenu(page);

        const widths = await page.evaluate(() => {
            const row = document.querySelector('.mdl-frequency-terms-menu .mdl-dropdown-list-item');
            return {
                control: row.querySelector('.mdl-dropdown-list-control').getBoundingClientRect().width,
                picker: row.querySelector('.term-packed-control').getBoundingClientRect().width
            };
        });
        expect(widths.control).toBeGreaterThan(300);
        expect(widths.picker).toBeCloseTo(widths.control, 0);
    });

    test('the two value axes carry scales of their own', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, {
            categoryTerm: 'g',
            series: [
                COUNT_SERIES,
                { term: 'y', case: 1, aggregate: 'mean', axis: 'secondary', mark: 'triangle', color: '#c62828' }
            ]
        });

        const chart = await readChart(page);
        expect(chart.domains.primary.min).toBe(0);
        expect(chart.domains.primary.max).toBeGreaterThanOrEqual(4);
        expect(chart.domains.primary.max).toBeLessThan(6);
        expect(chart.domains.secondary.min).toBeGreaterThan(2);
        expect(chart.domains.secondary.max).toBeGreaterThan(11);
        expect(chart.barCount).toBe(3);
        expect(chart.polygonCount).toBe(3);
    });

    test('a series set to a symbol is drawn with that symbol', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [{ ...COUNT_SERIES, mark: 'circle' }] });

        let chart = await readChart(page);
        expect(chart.circleCount).toBe(3);
        expect(chart.barCount).toBe(0);

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Freq1');
            shape.properties.series[0].mark = 'square';
            shape.update();
            shape.draw();
        });
        chart = await readChart(page);
        expect(chart.circleCount).toBe(0);
        expect(chart.barCount).toBe(3);
    });

    test('a series showing its values writes the number it answered with', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [{ ...COUNT_SERIES, showLabel: true }] });

        const chart = await readChart(page);
        expect(chart.valueLabels).toEqual(['2', '1', '4']);
    });

    test('turning the chart on its side moves the categories to the left edge', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });

        const upright = await readChart(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Freq1');
            shape.setProperties({ orientation: 'horizontal' });
            shape.update();
            shape.draw();
        });
        const sideways = await readChart(page);

        expect(upright.orientation).toBe('vertical');
        expect(sideways.orientation).toBe('horizontal');
        expect(upright.categoryPositions.map(position => position.y)).toEqual([upright.categoryPositions[0].y, upright.categoryPositions[0].y, upright.categoryPositions[0].y]);
        expect(upright.categoryPositions[1].x).toBeGreaterThan(upright.categoryPositions[0].x);
        expect(sideways.categoryPositions.map(position => position.x)).toEqual([sideways.categoryPositions[0].x, sideways.categoryPositions[0].x, sideways.categoryPositions[0].x]);
        expect(sideways.categoryPositions[1].y).toBeGreaterThan(sideways.categoryPositions[0].y);
        expect(sideways.categoryPositions[0].x).toBeLessThan(sideways.layout.plotLeft);
    });

    test('the ends of a value axis are the chart\'s own to set once it stops scaling itself', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Freq1');
            shape.setProperties({ autoScale: false, valueRange: { primaryMin: 0, primaryMax: 20, secondaryMin: null, secondaryMax: null } });
            shape.update();
            shape.draw();
        });

        const chart = await readChart(page);
        expect(chart.domains.primary).toEqual({ min: 0, max: 20 });
    });

    test('the chart button lists the frequency chart and arms it for drawing', async ({ page }) => {
        await setupEditor(page);
        await page.click('#chart-button');
        const labels = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-label');
        await expect(labels).toHaveText(['Chart', 'Frequencies']);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:nth-child(2)');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.pendingShapeType)).toBe('FrequencyChartShape');
    });

    test('the series row offers its function, its mark and the axis it is read against', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });
        const menu = await openSeriesMenu(page);
        await expect(menu.locator('.mdl-dropdown-grid-label')).toHaveText(['Function', 'Mark', 'Values']);

        await menu.locator('.mdl-frequency-mark-selector').first().click();
        const markList = page.locator('.mdl-frequency-mark-popup .dx-list-item');
        await expect(markList).toHaveText(['Bar', 'Circle', 'Square', 'Triangle', 'Diamond']);
        await expect(markList.first().locator('i')).toHaveClass(/fa-light/);
        await markList.nth(1).click();

        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Freq1').properties.series[0].mark)).toBe('circle');
    });

    test('a series can be moved to the second value axis from its own row', async ({ page }) => {
        await setupEditor(page);
        await addModel(page, DISCRETE_MODEL, 'g');
        await addFrequencyChart(page, 6, { categoryTerm: 'g', series: [COUNT_SERIES] });
        const menu = await openSeriesMenu(page);
        const axisButtons = menu.locator('.mdl-pill-group').first().locator('.dx-button');
        await expect(axisButtons.first().locator('i')).toHaveClass(/fa-border-left/);
        await expect(axisButtons.nth(1).locator('i')).toHaveClass(/fa-border-right/);
        await axisButtons.nth(1).click();

        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Freq1').properties.series[0].axis)).toBe('secondary');
    });
});
