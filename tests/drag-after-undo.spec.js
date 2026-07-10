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

async function dragShapeByMoveHandle(page, name, dx, dy) {
    const center = await page.evaluate(shapeName => {
        const shape = shell.board.shapes.getByName(shapeName);
        const handle = Array.from(document.querySelectorAll('.handle.move')).find(h => h._shape === shape);
        const rect = handle.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, name);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + dx, center.y + dy, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(200);
}

test('dragging a shape restored via undo does not leak highlight rectangles', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');

    await page.keyboard.press('Delete');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(false);

    await page.locator('.fa-rotate-left').first().click();
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(true);

    await dragShapeByMoveHandle(page, 'Text1', 40, 20);
    expect(await page.evaluate(() => document.querySelectorAll('.highlight-proxy').length)).toBe(1);

    await dragShapeByMoveHandle(page, 'Text1', -40, -20);
    expect(await page.evaluate(() => document.querySelectorAll('.highlight-proxy').length)).toBe(1);
});

test('a shape restored via two delete/undo cycles still drags cleanly', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');

    for (let cycle = 0; cycle < 2; cycle++) {
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);
        await page.locator('.fa-rotate-left').first().click();
        await page.waitForTimeout(200);
    }
    expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text1'))).toBe(true);

    await dragShapeByMoveHandle(page, 'Text1', 30, 15);
    expect(await page.evaluate(() => document.querySelectorAll('.highlight-proxy').length)).toBe(1);
});
