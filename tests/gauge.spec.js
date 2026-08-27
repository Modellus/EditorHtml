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

async function addGaugeWithScale(page, properties) {
    await page.evaluate(properties => {
        shell.commands.addShape('GaugeShape', 'Gauge');
        const gauge = shell.board.shapes.getByName('Gauge');
        gauge.setProperties(Object.assign({ x: 220, y: 140, width: 200, height: 200, autoScale: false, minimum: 0, maximum: 10, snapToTick: false }, properties));
        gauge.draw();
        shell.board.selection.select(gauge);
    }, properties);
    await page.waitForTimeout(250);
}

async function addExpressionAndReparse(page, name, expression) {
    await page.evaluate(name => modellus.shape.addExpression(name), name);
    await page.waitForTimeout(400);
    await page.evaluate(({ name, expression }) => {
        shell.board.shapes.getByName(name).properties.expression = expression;
        shell.reset();
    }, { name, expression });
    await page.waitForTimeout(400);
}

async function dragPointerToAngle(page, angleDegrees) {
    const points = await page.evaluate(angleDegrees => {
        const gauge = shell.board.shapes.getByName('Gauge');
        const geometry = gauge.getGaugeGeometry();
        const position = gauge.getBoardPosition();
        const radians = angleDegrees * Math.PI / 180;
        const matrix = shell.board.svg.getScreenCTM();
        const pointerPoint = gauge.getPointerBoardPoint();
        const start = new DOMPoint(pointerPoint.x, pointerPoint.y).matrixTransform(matrix);
        const target = new DOMPoint(
            position.x + geometry.centerX + geometry.needleRadius * Math.cos(radians),
            position.y + geometry.centerY - geometry.needleRadius * Math.sin(radians)
        ).matrixTransform(matrix);
        return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
    }, angleDegrees);
    await page.mouse.move(points.start.x, points.start.y);
    await page.mouse.down();
    await page.mouse.move(points.target.x, points.target.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

async function addSelectedGauge(page) {
    await page.evaluate(() => {
        shell.commands.addShape('GaugeShape', 'Gauge');
        const gauge = shell.board.shapes.getByName('Gauge');
        shell.board.selection.select(gauge);
        gauge.showContextToolbar();
    });
    await page.waitForTimeout(250);
}

test('gauge maps a value to its scale and renders configured color ranges', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        shell.commands.addShape('GaugeShape', 'Gauge');
        const gauge = shell.board.shapes.getByName('Gauge');
        gauge.setProperties({
            term: '',
            value: 75,
            autoScale: false,
            minimum: 0,
            maximum: 100,
            precision: 25,
            ranges: [
                { minimum: 0, maximum: 50, color: '#C62828' },
                { minimum: 50, maximum: 100, color: '#2E7D32' }
            ]
        });
        gauge.draw();
        return {
            angle: gauge.getPointerVisualAngleDeg(),
            rangeCount: gauge.rangeLayer.children.length,
            colors: Array.from(gauge.rangeLayer.children).map(path => path.getAttribute('fill'))
        };
    });
    expect(result.angle).toBeCloseTo(22.5, 3);
    expect(result.rangeCount).toBe(2);
    expect(result.colors).toEqual(['#C62828', '#2E7D32']);
});

test('gauge exposes separate scale and color range dropdowns', async ({ page }) => {
    await setupEditor(page);
    await addSelectedGauge(page);
    const scaleButton = page.locator('.shape-context-toolbar.visible .mdl-gauge-settings-selector');
    await expect(scaleButton).not.toContainText('Scale');
    await expect(scaleButton.locator('.fa-ruler-vertical')).toHaveCount(1);
    await scaleButton.click();
    const popup = page.locator('.mdl-gauge-settings-popup').last();
    await expect(popup).toContainText('Auto Scale');
    await expect(popup).toContainText('Minimum');
    await expect(popup).toContainText('Maximum');
    await expect(popup).not.toContainText('Color ranges');
    await scaleButton.click();
    const rangesButton = page.locator('.shape-context-toolbar.visible .mdl-gauge-ranges-selector');
    await expect(rangesButton).not.toContainText('Ranges');
    await expect(rangesButton.locator('.fa-bar-progress-half')).toHaveCount(1);
    await rangesButton.click();
    const rangesPopup = page.locator('.mdl-gauge-ranges-popup').last();
    await expect(rangesPopup.locator('.mdl-gauge-menu-title')).toHaveText('Ranges');
    await expect(rangesPopup.locator('.mdl-gauge-ranges-list.dx-list')).toHaveCount(1);
    await expect(rangesPopup.locator('.mdl-gauge-range-row')).toHaveCount(2);
    await expect(rangesPopup.locator('.mdl-gauge-range-add')).toHaveCount(0);
    await expect(rangesPopup.locator('.mdl-gauge-range-field').nth(0)).toContainText('Start');
    await expect(rangesPopup.locator('.mdl-gauge-range-field').nth(1)).toContainText('End');
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').properties.ranges)).toEqual([
        { minimum: 0, maximum: 10, color: 'transparent' },
        { minimum: null, maximum: null, color: 'transparent' }
    ]);
    const draftStart = rangesPopup.locator('.mdl-gauge-range-row').nth(1).locator('.mdl-gauge-range-minimum input.dx-texteditor-input');
    await draftStart.fill('10');
    await draftStart.press('Tab');
    const draftEnd = rangesPopup.locator('.mdl-gauge-range-row').nth(1).locator('.mdl-gauge-range-maximum input.dx-texteditor-input');
    await draftEnd.fill('20');
    await draftEnd.press('Tab');
    await expect(rangesPopup.locator('.mdl-gauge-range-row')).toHaveCount(3);
    await expect(rangesPopup.locator('.mdl-gauge-range-row.mdl-missing-term')).toHaveCount(0);
    const overlappingStart = rangesPopup.locator('.mdl-gauge-range-row').nth(1).locator('.mdl-gauge-range-minimum input.dx-texteditor-input');
    await overlappingStart.fill('9');
    await overlappingStart.press('Tab');
    await expect(rangesPopup.locator('.mdl-gauge-range-row.mdl-missing-term')).toHaveCount(2);
    const deleteIcon = rangesPopup.locator('.mdl-gauge-range-delete i').last();
    await expect(deleteIcon).toHaveCSS('color', 'rgb(255, 0, 0)');
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').properties.ranges.length)).toBe(3);
    await rangesPopup.locator('.mdl-gauge-range-delete.dx-button').last().click();
    await expect(rangesPopup.locator('.mdl-gauge-range-row')).toHaveCount(2);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').properties.ranges.length)).toBe(2);
});

test('gauge pointer drag sets the shape value when no term is bound', async ({ page }) => {
    await setupEditor(page);
    await addGaugeWithScale(page, { term: '', value: 0 });
    await dragPointerToAngle(page, 90);
    const value = await page.evaluate(() => shell.board.shapes.getByName('Gauge').properties.value);
    expect(value).toBeCloseTo(5, 1);
});

test('gauge pointer drag sets a settable term', async ({ page }) => {
    await setupEditor(page);
    await addExpressionAndReparse(page, 'Expr1', '\\frac{dx}{dt}=v');
    await addGaugeWithScale(page, { term: 'v', value: 0 });
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').isPointerDraggable())).toBe(true);
    await dragPointerToAngle(page, 90);
    const value = await page.evaluate(() => shell.board.calculator.getByName('v', 1));
    expect(value).toBeCloseTo(5, 1);
});

test('gauge pointer is not draggable for a computed term and lets the shape move instead', async ({ page }) => {
    await setupEditor(page);
    await addExpressionAndReparse(page, 'Expr1', '\\frac{dx}{dt}=v');
    await addExpressionAndReparse(page, 'Expr2', 'y=2v');
    await addGaugeWithScale(page, { term: 'y', value: 0 });
    const state = await page.evaluate(() => {
        const gauge = shell.board.shapes.getByName('Gauge');
        const pointerHandle = gauge.handleElements.find(handle => handle.classList.contains('gauge-pointer'));
        return {
            draggable: gauge.isPointerDraggable(),
            pointerEvents: pointerHandle.style.pointerEvents,
            x: gauge.properties.x,
            y: gauge.properties.y,
            value: gauge.getGaugeValue()
        };
    });
    expect(state.draggable).toBe(false);
    expect(state.pointerEvents).toBe('none');
    await dragPointerToAngle(page, 90);
    const afterDrag = await page.evaluate(() => {
        const gauge = shell.board.shapes.getByName('Gauge');
        return { x: gauge.properties.x, y: gauge.properties.y, value: gauge.getGaugeValue() };
    });
    expect(afterDrag.value).toBe(state.value);
    expect(afterDrag.x === state.x && afterDrag.y === state.y).toBe(false);
});

test('gauge pointer is not draggable when the term is locked', async ({ page }) => {
    await setupEditor(page);
    await addExpressionAndReparse(page, 'Expr1', '\\frac{dx}{dt}=v');
    await addGaugeWithScale(page, { term: 'v', value: 0, termLocked: true });
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').isPointerDraggable())).toBe(false);
    await dragPointerToAngle(page, 90);
    const value = await page.evaluate(() => shell.board.calculator.getByName('v', 1));
    expect(value).toBe(0);
});

test('gauge draws the visible term label below the hub circle', async ({ page }) => {
    await setupEditor(page);
    await addExpressionAndReparse(page, 'Expr1', '\\frac{dx}{dt}=v');
    await addGaugeWithScale(page, { term: 'v', value: 0, termDisplayMode: 'nameValue' });
    const label = await page.evaluate(() => {
        const gauge = shell.board.shapes.getByName('Gauge');
        gauge.draw();
        const geometry = gauge.getGaugeGeometry();
        const text = gauge.termDisplayLayer.querySelector('text.shape-term-label');
        return {
            text: text.textContent,
            x: Number(text.getAttribute('x')),
            y: Number(text.getAttribute('y')),
            centerX: geometry.centerX,
            centerY: geometry.centerY,
            hubRadius: geometry.hubRadius
        };
    });
    expect(label.text).toContain('v');
    expect(label.x).toBeCloseTo(label.centerX, 3);
    expect(label.y).toBeGreaterThan(label.centerY + label.hubRadius);
    expect(label.y).toBeLessThan(label.centerY + label.hubRadius + 20);
});

async function moveMouseToGaugeAngle(page, angleDegrees, radiusRatio = 1) {
    const point = await page.evaluate(({ angleDegrees, radiusRatio }) => {
        const gauge = shell.board.shapes.getByName('Gauge');
        const geometry = gauge.getGaugeGeometry();
        const position = gauge.getBoardPosition();
        const radians = angleDegrees * Math.PI / 180;
        const radius = geometry.outerRadius * radiusRatio;
        const screenPoint = new DOMPoint(
            position.x + geometry.centerX + radius * Math.cos(radians),
            position.y + geometry.centerY - radius * Math.sin(radians)
        ).matrixTransform(shell.board.svg.getScreenCTM());
        return { x: screenPoint.x, y: screenPoint.y };
    }, { angleDegrees, radiusRatio });
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(150);
}

test('gauge shows a crosshair with the hovered value and hides it outside the scale', async ({ page }) => {
    await setupEditor(page);
    await addGaugeWithScale(page, { term: '', value: 0, minimum: 0, maximum: 100, precision: 25 });
    await moveMouseToGaugeAngle(page, 90, 0.9);
    const crosshair = await page.evaluate(() => {
        const layer = shell.board.shapes.getByName('Gauge').crosshairLayer;
        return { lines: layer.querySelectorAll('line').length, text: layer.querySelector('text')?.textContent };
    });
    expect(crosshair.lines).toBe(1);
    expect(crosshair.text).toBe('50');

    // 270º sits in the gap between the end and the start of the scale.
    await moveMouseToGaugeAngle(page, 270, 0.9);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').crosshairLayer.childElementCount)).toBe(0);

    await moveMouseToGaugeAngle(page, 90, 0.9);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').crosshairLayer.childElementCount)).toBeGreaterThan(0);
    const bounds = await page.evaluate(() => {
        const rect = shell.board.shapes.getByName('Gauge').element.getBoundingClientRect();
        return { right: rect.right, top: rect.top };
    });
    await page.mouse.move(bounds.right + 60, bounds.top - 40, { steps: 10 });
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Gauge').crosshairLayer.childElementCount)).toBe(0);
});

test('the gauge crosshair is left out of the exported image', async ({ page }) => {
    await setupEditor(page);
    await addGaugeWithScale(page, { term: '', value: 0, minimum: 0, maximum: 100 });
    await moveMouseToGaugeAngle(page, 90, 0.9);
    const counts = await page.evaluate(() => {
        const gauge = shell.board.shapes.getByName('Gauge');
        const clone = gauge.createExportElementClone(gauge.element);
        return { live: gauge.crosshairLayer.childElementCount, exported: clone.querySelectorAll('.gauge-export-exclude').length };
    });
    expect(counts.live).toBeGreaterThan(0);
    expect(counts.exported).toBe(0);
});

test('notebook gauge exposes the same value scale and color range editor', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
    const blockId = await page.evaluate(() => {
        notebook.addBlock('gauge');
        return notebook.blocks[notebook.blocks.length - 1].id;
    });
    await page.click(`.notebook-block[data-block-id="${blockId}"]`);
    await page.waitForTimeout(250);
    await page.locator('.shape-context-toolbar.visible .mdl-gauge-ranges-selector').click();
    const popup = page.locator('.mdl-gauge-ranges-popup').last();
    await expect(popup.locator('.mdl-gauge-ranges-list.dx-list')).toHaveCount(1);
    await expect(popup.locator('.mdl-gauge-range-row')).toHaveCount(2);
    await expect(popup.locator('.mdl-gauge-range-add')).toHaveCount(0);
    expect(await page.evaluate(id => notebook.blocks.find(block => block.id === id).ranges.length, blockId)).toBe(2);
});
