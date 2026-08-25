const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForFunction(() => shell.board.calculator != null && shell.board.translations != null && shell.board.svg != null, null, { timeout: 15000 });
}

async function setupPointOnTerm(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expression1');
        const expression = shell.board.shapes.getByName('Expression1');
        expression.properties.expression = '\\displaylines{\\frac{dx}{dt}=0}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();
        modellus.shape.addPoint('Point1');
        const point = shell.board.shapes.getByName('Point1');
        point.properties.xTerm = 'x';
        point.properties.xTermDisplayMode = 'nameValue';
        point.update();
        point.draw();
    });
    await expect.poll(() => page.evaluate(() => shell.board.calculator.isTerm('x'))).toBe(true);
}

async function enablePulse(page) {
    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        point.setPropertyCommand('pulseOnChange', true);
        point.draw();
    });
}

async function writeTermValue(page, value) {
    await page.evaluate(termValue => {
        const calculator = shell.board.calculator;
        calculator.setTermValue('x', termValue, calculator.getIteration(), 1);
        calculator.calculate();
        const point = shell.board.shapes.getByName('Point1');
        point.update();
        point.draw();
    }, value);
}

function readPulseState(page) {
    return page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        const element = document.getElementById(point.id);
        const pulsingElement = element.classList.contains('mdl-pulse') ? element : element.querySelector('.mdl-pulse');
        return {
            property: point.properties.pulseOnChange,
            isHost: element.classList.contains('mdl-pulse-host'),
            isPulsing: pulsingElement != null,
            pulsingCount: element.querySelectorAll('.mdl-pulse').length,
            isShapeMark: pulsingElement === point.circle,
            pulseColor: element.style.getPropertyValue('--mdl-pulse-color'),
            animationName: pulsingElement ? getComputedStyle(pulsingElement).animationName : 'none',
            foregroundColor: point.properties.foregroundColor,
            value: shell.board.calculator.getByName('x', 1)
        };
    });
}

test('a shape left with pulse off stays unlit when its term changes', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);

    const initial = await readPulseState(page);
    expect(initial.property).toBe(false);
    expect(initial.isHost).toBe(false);

    await writeTermValue(page, 5);

    const afterChange = await readPulseState(page);
    expect(afterChange.value).toBe(5);
    expect(afterChange.isPulsing).toBe(false);
    expect(afterChange.isHost).toBe(false);
});

test('a shape set to pulse lights its value up in its own color when the term lands on a new value', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);

    const beforeChange = await readPulseState(page);
    expect(beforeChange.property).toBe(true);
    expect(beforeChange.isHost).toBe(true);
    expect(beforeChange.isPulsing).toBe(false);

    await writeTermValue(page, 5);

    const afterChange = await readPulseState(page);
    expect(afterChange.isPulsing).toBe(true);
    expect(afterChange.isShapeMark).toBe(true);
    expect(afterChange.pulsingCount).toBe(1);
    expect(afterChange.pulseColor).toBe(afterChange.foregroundColor);
});

test('a term that keeps changing pulses the shape instead of holding it lit', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);

    expect((await readPulseState(page)).animationName).toBe('none');

    const samples = await page.evaluate(async () => {
        const calculator = shell.board.calculator;
        const point = shell.board.shapes.getByName('Point1');
        const element = document.getElementById(point.id);
        const readings = [];
        for (let sample = 1; sample <= 44; sample++) {
            calculator.setTermValue('x', sample, calculator.getIteration(), 1);
            calculator.calculate();
            point.update();
            point.draw();
            const pulsingElement = element.querySelector('.mdl-pulse');
            readings.push({
                brightness: pulsingElement ? Number(getComputedStyle(pulsingElement).filter.match(/brightness\(([0-9.]+)\)/)[1]) : 1,
                isPulsing: pulsingElement != null,
                value: calculator.getByName('x', 1)
            });
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return readings;
    });

    expect(new Set(samples.map(sample => sample.value)).size).toBe(samples.length);
    expect(samples.every(sample => sample.isPulsing)).toBe(true);
    const brightnesses = samples.map(sample => sample.brightness);
    expect(Math.max(...brightnesses)).toBeGreaterThan(1.25);
    expect(brightnesses.filter(brightness => brightness < 1.06).length).toBeGreaterThan(3);

    await expect.poll(async () => (await readPulseState(page)).animationName, { timeout: 5000 }).toBe('none');
});

test('the pulse stops a second after the term settles', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);
    await writeTermValue(page, 5);
    expect((await readPulseState(page)).isPulsing).toBe(true);

    await expect.poll(async () => (await readPulseState(page)).isPulsing, { timeout: 5000 }).toBe(false);
});

test('a term recomputed to the value it already held does not light the shape', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);
    await writeTermValue(page, 5);
    await expect.poll(async () => (await readPulseState(page)).isPulsing, { timeout: 5000 }).toBe(false);

    await writeTermValue(page, 5);

    const afterRewrite = await readPulseState(page);
    expect(afterRewrite.value).toBe(5);
    expect(afterRewrite.isPulsing).toBe(false);
});

test('turning pulse off stops the shape lighting up and undo brings it back', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);

    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        point.setPropertyCommand('pulseOnChange', false);
        point.draw();
    });
    await writeTermValue(page, 7);

    const afterDisable = await readPulseState(page);
    expect(afterDisable.property).toBe(false);
    expect(afterDisable.isHost).toBe(false);
    expect(afterDisable.isPulsing).toBe(false);

    await page.evaluate(() => shell.board.invoker.undo());
    const afterUndo = await readPulseState(page);
    expect(afterUndo.property).toBe(true);
});

test('pulse survives a serialize round trip', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enablePulse(page);

    const roundTrip = await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        const data = point.serialize();
        point.remove();
        const restored = BaseShape.deserialize(shell.board, data);
        return { property: restored.properties.pulseOnChange, isHost: restored.element.classList.contains('mdl-pulse-host') };
    });
    expect(roundTrip.property).toBe(true);
    expect(roundTrip.isHost).toBe(true);
});

test('the shape colors menu offers a pulse switch that turns the option on', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        shell.board.selection.select(point);
    });

    const colorButton = page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector');
    await expect(colorButton).toBeVisible();
    await colorButton.click();

    const pulseItem = page.locator('.mdl-dropdown-list-item', { hasText: 'Pulse' });
    await expect(pulseItem).toBeVisible();

    const pulseSwitch = pulseItem.locator('.mdl-pulse-switch');
    await expect(pulseSwitch).toBeVisible();
    await pulseSwitch.click();

    await expect.poll(async () => (await readPulseState(page)).property).toBe(true);
});

async function setupValueBearingShapes(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expression2');
        const expression = shell.board.shapes.getByName('Expression2');
        expression.properties.expression = '\\displaylines{\\frac{dv}{dt}=1}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();

        shell.commands.addShape('ValueShape', 'Value1');
        const value = shell.board.shapes.getByName('Value1');
        value.properties.term = 'v';
        value.properties.pulseOnChange = true;

        shell.commands.addShape('SliderShape', 'Slider1');
        const slider = shell.board.shapes.getByName('Slider1');
        slider.properties.term = 'v';
        slider.properties.pulseOnChange = true;

        modellus.shape.addChart('Chart1');
        const chart = shell.board.shapes.getByName('Chart1');
        chart.properties.xTerm = 't';
        chart.properties.yTerms = [{ term: 'v', case: 1, color: '#c0392b', showLabel: false, chartTypes: ['line'] }];
        chart.properties.pulseOnChange = true;

        modellus.shape.addTable('Table1');
        const table = shell.board.shapes.getByName('Table1');
        table.properties.columns = [{ term: 'v', case: 1, color: 'transparent', valueDisplayMode: 'none' }];
        table.properties.pulseOnChange = true;
    });
}

async function runIterations(page, iterations) {
    await page.evaluate(async count => {
        const names = ['Value1', 'Slider1', 'Chart1', 'Table1'];
        for (let iteration = 0; iteration < count; iteration++) {
            shell.calculator.engine.iterate();
            for (const name of names) {
                const shape = shell.board.shapes.getByName(name);
                shape.tick();
                shape.update();
                shape.draw();
            }
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }, iterations);
}

test('each shape pulses the part of it that shows the term value', async ({ page }) => {
    await setupEditor(page);
    await setupValueBearingShapes(page);
    await runIterations(page, 6);

    const report = await page.evaluate(() => {
        const describe = name => {
            const shape = shell.board.shapes.getByName(name);
            const element = document.getElementById(shape.id);
            const pulsing = [...element.querySelectorAll('.mdl-pulse')];
            return {
                rootPulses: element.classList.contains('mdl-pulse'),
                count: pulsing.length,
                isValueText: pulsing.includes(shape.valueText),
                isSliderBar: pulsing.includes(shape.fillPart),
                hasFocusMarker: pulsing.some(node => node.classList.contains('chart-focus-marker')),
                cellRowKeys: pulsing.map(node => node.getAttribute('data-row-key')),
                iteration: shell.board.calculator.system.iteration
            };
        };
        return { value: describe('Value1'), slider: describe('Slider1'), chart: describe('Chart1'), table: describe('Table1') };
    });

    expect(report.value.isValueText).toBe(true);
    expect(report.value.rootPulses).toBe(false);
    expect(report.slider.isSliderBar).toBe(true);
    expect(report.slider.rootPulses).toBe(false);
    expect(report.chart.hasFocusMarker).toBe(true);
    expect(report.chart.count).toBe(1);
    expect(report.chart.rootPulses).toBe(false);
    expect(report.value.count).toBe(1);
    expect(report.slider.count).toBe(1);
    expect(report.table.count).toBe(1);
    expect(report.table.cellRowKeys[0]).toBe(String(report.table.iteration));
    expect(report.table.rootPulses).toBe(false);
});

test('a value element rebuilt on every frame still keeps the beat', async ({ page }) => {
    await setupEditor(page);
    await setupValueBearingShapes(page);

    const brightnesses = await page.evaluate(async () => {
        const table = shell.board.shapes.getByName('Table1');
        const element = document.getElementById(table.id);
        const readings = [];
        for (let sample = 0; sample < 44; sample++) {
            shell.calculator.engine.iterate();
            table.tick();
            table.update();
            table.draw();
            const pulsing = element.querySelector('.mdl-pulse');
            readings.push(pulsing ? Number(getComputedStyle(pulsing).filter.match(/brightness\(([0-9.]+)\)/)[1]) : 1);
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return readings;
    });

    expect(Math.max(...brightnesses)).toBeGreaterThan(1.25);
    expect(brightnesses.filter(brightness => brightness < 1.06).length).toBeGreaterThan(3);
});
