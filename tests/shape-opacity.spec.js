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
        textShape.update();
        textShape.draw();
        shell.board.selection.select(textShape);
    });
    await page.waitForTimeout(250);
}

test('opacity property applies to shape element and supports undo', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const defaultOpacity = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { property: textShape.properties.opacity, style: textShape.element.style.opacity };
    });
    expect(defaultOpacity.property).toBe(1);
    expect(defaultOpacity.style).toBe('');

    await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setPropertyCommand('opacity', 0.4);
    });
    const afterSet = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { property: textShape.properties.opacity, style: textShape.element.style.opacity };
    });
    expect(afterSet.property).toBe(0.4);
    expect(afterSet.style).toBe('0.4');

    await page.evaluate(() => shell.board.invoker.undo());
    const afterUndo = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { property: textShape.properties.opacity, style: textShape.element.style.opacity };
    });
    expect(afterUndo.property).toBe(1);
    expect(afterUndo.style).toBe('');
});

test('opacity survives serialize/deserialize round trip', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const roundTrip = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        textShape.setPropertyCommand('opacity', 0.25);
        const data = textShape.serialize();
        textShape.remove();
        const restored = BaseShape.deserialize(shell.board, data);
        return { property: restored.properties.opacity, style: restored.element.style.opacity };
    });
    expect(roundTrip.property).toBe(0.25);
    expect(roundTrip.style).toBe('0.25');
});

test('shape dropdown shows opacity slider that changes the shape', async ({ page }) => {
    await setupEditor(page);
    await setupText(page);

    const colorButton = page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector');
    await expect(colorButton).toBeVisible();
    await colorButton.click();
    await page.waitForTimeout(500);

    const opacityItem = page.locator('.mdl-dropdown-list-item', { hasText: 'Opacity' });
    await expect(opacityItem).toBeVisible();

    const handle = opacityItem.locator('.dx-slider-handle');
    await expect(handle).toBeVisible();

    const sliderBox = await opacityItem.locator('.mdl-opacity-slider').boundingBox();
    const handleBox = await handle.boundingBox();
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sliderBox.x + sliderBox.width / 2, handleBox.y + handleBox.height / 2, { steps: 8 });

    const duringDrag = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { property: textShape.properties.opacity, style: textShape.element.style.opacity };
    });
    expect(duringDrag.property).toBe(1);
    expect(parseFloat(duringDrag.style)).toBeGreaterThan(0);
    expect(parseFloat(duringDrag.style)).toBeLessThan(1);

    await page.mouse.up();
    await page.waitForTimeout(700);

    const result = await page.evaluate(() => {
        const textShape = shell.board.shapes.getByName('Text1');
        return { property: textShape.properties.opacity, style: textShape.element.style.opacity };
    });
    expect(result.property).toBeGreaterThan(0);
    expect(result.property).toBeLessThan(1);
    expect(result.style).toBe(String(result.property));
});
