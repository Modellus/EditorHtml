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

async function setupText(page) {
    await page.evaluate(() => {
        modellus.shape.addText('Text1');
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.properties.x = 200;
        textShape.properties.y = 200;
        textShape.properties.width = 150;
        textShape.properties.height = 80;
        textShape.properties.showName = true;
        textShape.update();
        textShape.draw();
        shell.board.selection.select(textShape);
        textShape.showContextToolbar();
    });
    await page.waitForTimeout(250);
}

test('flipping mirrors the shape about its center and supports undo', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const defaults = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return {
            flipHorizontal: textShape.properties.flipHorizontal,
            flipVertical: textShape.properties.flipVertical,
            transform: textShape.element.getAttribute('transform')
        };
    });
    expect(defaults.flipHorizontal).toBe(false);
    expect(defaults.flipVertical).toBe(false);
    expect(defaults.transform).not.toContain('scale');

    const afterHorizontal = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.toggleFlip('horizontal');
        textShape.draw();
        return {
            flipHorizontal: textShape.properties.flipHorizontal,
            transform: textShape.element.getAttribute('transform'),
            nameTransform: textShape.shapeNameLayer.getAttribute('transform')
        };
    });
    expect(afterHorizontal.flipHorizontal).toBe(true);
    expect(afterHorizontal.transform).toContain('scale(-1 1)');
    expect(afterHorizontal.nameTransform).toContain('scale(-1 1)');

    const afterVertical = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.toggleFlip('vertical');
        textShape.draw();
        return textShape.element.getAttribute('transform');
    });
    expect(afterVertical).toContain('scale(-1 -1)');

    const bounds = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        const box = textShape.element.getBBox();
        const matrix = textShape.element.getCTM();
        const corner = new DOMPoint(box.x, box.y).matrixTransform(matrix);
        const opposite = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
        return {
            left: Math.min(corner.x, opposite.x),
            right: Math.max(corner.x, opposite.x),
            top: Math.min(corner.y, opposite.y),
            bottom: Math.max(corner.y, opposite.y)
        };
    });

    await page.evaluate(() => {
        shell.board.invoker.undo();
        shell.board.invoker.undo();
    });
    const afterUndo = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.draw();
        const box = textShape.element.getBBox();
        const matrix = textShape.element.getCTM();
        const corner = new DOMPoint(box.x, box.y).matrixTransform(matrix);
        const opposite = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(matrix);
        return {
            flipHorizontal: textShape.properties.flipHorizontal,
            flipVertical: textShape.properties.flipVertical,
            transform: textShape.element.getAttribute('transform'),
            nameTransform: textShape.shapeNameLayer.getAttribute('transform'),
            left: Math.min(corner.x, opposite.x),
            right: Math.max(corner.x, opposite.x),
            top: Math.min(corner.y, opposite.y),
            bottom: Math.max(corner.y, opposite.y)
        };
    });
    expect(afterUndo.flipHorizontal).toBe(false);
    expect(afterUndo.flipVertical).toBe(false);
    expect(afterUndo.transform).not.toContain('scale');
    expect(afterUndo.nameTransform).toBe(null);
    expect(afterUndo.left).toBeCloseTo(bounds.left, 1);
    expect(afterUndo.right).toBeCloseTo(bounds.right, 1);
    expect(afterUndo.top).toBeCloseTo(bounds.top, 1);
    expect(afterUndo.bottom).toBeCloseTo(bounds.bottom, 1);
});

test('actions menu offers the flip entries and reflects the current state', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    await page.locator('.shape-context-toolbar.visible .mdl-actions-selector').click();
    await page.waitForTimeout(250);
    const menu = page.locator('.mdl-actions-menu').last();
    await expect(menu.locator('.mdl-dropdown-list-label', { hasText: 'Flip Horizontal' })).toHaveCount(1);
    await expect(menu.locator('.mdl-dropdown-list-label', { hasText: 'Flip Vertical' })).toHaveCount(1);
    await expect(menu.locator('.fa-light.fa-reflect-horizontal')).toHaveCount(1);

    await menu.locator('[data-action-item]', { hasText: 'Flip Horizontal' }).click();
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Text1').properties.flipHorizontal)).toBe(true);

    await page.locator('.shape-context-toolbar.visible .mdl-actions-selector').click();
    await page.waitForTimeout(250);
    const reopenedMenu = page.locator('.mdl-actions-menu').last();
    await expect(reopenedMenu.locator('.fa-solid.fa-reflect-horizontal')).toHaveCount(1);
    await expect(reopenedMenu.locator('.fa-light.fa-reflect-vertical')).toHaveCount(1);
});

test('flipping is offered per shape according to what a mirror can act on', async ({ page }) => {
    await setupEditor(page);
    const support = await page.evaluate(() => {
        modellus.shape.addText('Text2');
        shell.commands.addShape('SliderShape', 'Slider');
        shell.commands.addShape('GaugeShape', 'Gauge');
        shell.commands.addShape('ReferentialShape', 'Referential');
        const referential = shell.board.shapes.getByName('Referential');
        shell.commands.addShape('BodyShape', 'Body', referential);
        shell.commands.addShape('PointShape', 'Point', referential);
        shell.commands.addShape('VectorShape', 'Vector', referential);
        return {
            text: shell.board.shapes.getByName('Text2').supportsFlip(),
            slider: shell.board.shapes.getByName('Slider').supportsFlip(),
            gauge: shell.board.shapes.getByName('Gauge').supportsFlip(),
            body: shell.board.shapes.getByName('Body').supportsFlip(),
            referential: referential.supportsFlip(),
            point: shell.board.shapes.getByName('Point').supportsFlip(),
            vector: shell.board.shapes.getByName('Vector').supportsFlip()
        };
    });
    expect(support.text).toBe(true);
    expect(support.slider).toBe(true);
    expect(support.gauge).toBe(true);
    expect(support.body).toBe(true);
    expect(support.referential).toBe(false);
    expect(support.point).toBe(false);
    expect(support.vector).toBe(false);
});

test('the slider splitter handle stays on the line it drags when flipped', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        shell.commands.addShape('SliderShape', 'Slider');
        const slider = shell.board.shapes.getByName('Slider');
        slider.draw();
        const position = slider.getBoardPosition();
        const centerY = position.y + slider.properties.height / 2;
        const before = slider.getSplitterBoardY();
        const valueBefore = slider.getValueFromBoardY(slider.getLocalPointFromBoardPoint({ x: position.x, y: before }).y);
        slider.toggleFlip('vertical');
        slider.draw();
        const after = slider.getSplitterBoardY();
        const valueAfter = slider.getValueFromBoardY(slider.getLocalPointFromBoardPoint({ x: position.x, y: after }).y);
        return { before, after, centerY, valueBefore, valueAfter };
    });
    expect(result.after).toBeCloseTo(2 * result.centerY - result.before, 3);
    expect(result.valueAfter).toBeCloseTo(result.valueBefore, 6);
});

test('the gauge pointer handle follows the mirrored needle and drags to the same angle', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        shell.commands.addShape('GaugeShape', 'Gauge');
        const gauge = shell.board.shapes.getByName('Gauge');
        gauge.setProperties({ angleValue: 40, magnitudeValue: 0.6 });
        gauge.draw();
        const position = gauge.getBoardPosition();
        const centerX = position.x + gauge.properties.width / 2;
        const before = gauge.getPointerBoardPoint();
        const angleBefore = gauge.getPointerVisualAngleDeg();
        gauge.toggleFlip('horizontal');
        gauge.draw();
        const after = gauge.getPointerBoardPoint();
        gauge.applyPointerDrag({ x: after.x, y: after.y });
        return { before, after, centerX, angleBefore, angleAfterDrag: gauge.getPointerVisualAngleDeg() };
    });
    expect(result.after.x).toBeCloseTo(2 * result.centerX - result.before.x, 3);
    expect(result.after.y).toBeCloseTo(result.before.y, 3);
    expect(result.angleAfterDrag).toBeCloseTo(result.angleBefore, 3);
});

test('flipping a body mirrors its image without touching its trajectory', async ({ page }) => {
    await setupEditor(page);
    const result = await page.evaluate(() => {
        shell.commands.addShape('ReferentialShape', 'Referential');
        const referential = shell.board.shapes.getByName('Referential');
        shell.commands.addShape('BodyShape', 'Body', referential);
        const body = shell.board.shapes.getByName('Body');
        body.image.setAttribute('href', 'data:image/gif;base64,R0lGODlhAQABAAAAACw=');
        body.draw();
        const before = body.image.getAttribute('transform');
        body.toggleFlip('horizontal');
        body.draw();
        return {
            before,
            imageTransform: body.image.getAttribute('transform'),
            motionTransform: body.motionGroup.getAttribute('transform'),
            elementTransform: body.element.getAttribute('transform')
        };
    });
    expect(result.before).toBe(null);
    expect(result.imageTransform).toContain('scale(-1 1)');
    expect(result.motionTransform).toBe(null);
    expect(result.elementTransform).toBe(null);
});
