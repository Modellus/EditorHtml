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

async function addTextAt(page, name, x, y, width, height) {
    await page.evaluate(({ name, x, y, width, height }) => {
        modellus.shape.addText(name);
        const textShape = shell.board.shapes.getByName(name);
        textShape.properties.x = x;
        textShape.properties.y = y;
        textShape.properties.width = width;
        textShape.properties.height = height;
        textShape.update();
        textShape.draw();
    }, { name, x, y, width, height });
    await page.waitForTimeout(150);
}

async function realClickShape(page, name) {
    const center = await page.evaluate(shapeName => {
        const shape = shell.board.shapes.getByName(shapeName);
        const rect = shape.element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, name);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(150);
}

test('Delete key removes a shape selected via a real mouse click', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');
    expect(await page.evaluate(() => document.activeElement?.isContentEditable === true)).toBe(false);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(false);
});

test('clicking the Undo/Redo toolbar buttons keeps the restored shape selected', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(false);

    await page.locator('.fa-rotate-left').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(true);
    expect(await page.evaluate(() => shell.board.selection.selectedShape?.properties?.name ?? null)).toBe('Text1');
    expect(await page.evaluate(() => document.querySelectorAll('.handle, .resize-handle, .rotation-handle').length)).toBeGreaterThan(0);

    await page.locator('.fa-rotate-right').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(false);
});

test('deleting a shape restored via the Undo button leaves no leftover selection visuals', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    await page.locator('.fa-rotate-left').first().click();
    await page.waitForTimeout(200);

    await page.mouse.move(50, 50);
    await realClickShape(page, 'Text1');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(false);
    expect(await page.evaluate(() => shell.board.selection.selectedShape)).toBe(null);
    expect(await page.evaluate(() => document.querySelectorAll('.handle, .resize-handle, .rotation-handle').length)).toBe(0);
    expect(await page.evaluate(() => document.querySelectorAll('.highlight-proxy').length)).toBe(0);
});
