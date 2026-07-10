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
    await page.waitForTimeout(250);
}

function readState(name) {
    const shape = shell.board.shapes.getByName(name);
    const highlightProxy = document.querySelector('.highlight-proxy rect');
    return {
        shapeX: shape.properties.x,
        shapeY: shape.properties.y,
        proxyX: highlightProxy ? parseFloat(highlightProxy.getAttribute('x')) : null,
        proxyY: highlightProxy ? parseFloat(highlightProxy.getAttribute('y')) : null,
        proxyCount: document.querySelectorAll('.highlight-proxy').length
    };
}

test('undoing a drag repositions the selection highlight and handles to match the shape', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');

    const beforeDrag = await page.evaluate(readState, 'Text1');
    await dragShapeByMoveHandle(page, 'Text1', 80, 40);
    const afterDrag = await page.evaluate(readState, 'Text1');
    expect(afterDrag.shapeX).not.toBe(beforeDrag.shapeX);
    expect(afterDrag.proxyX).toBeCloseTo(afterDrag.shapeX, 0);

    await page.evaluate(() => shell.commands.undo());
    await page.waitForTimeout(250);
    const afterUndo = await page.evaluate(readState, 'Text1');

    expect(afterUndo.shapeX).toBeCloseTo(beforeDrag.shapeX, 0);
    expect(afterUndo.proxyX).toBeCloseTo(afterUndo.shapeX, 0);
    expect(afterUndo.proxyY).toBeCloseTo(afterUndo.shapeY, 0);
    expect(afterUndo.proxyCount).toBe(1);
});

test('redoing a drag after undo repositions the selection highlight again', async ({ page }) => {
    await setupEditor(page);
    await addTextAt(page, 'Text1', 300, 300, 150, 60);
    await realClickShape(page, 'Text1');
    await dragShapeByMoveHandle(page, 'Text1', 80, 40);
    const afterDrag = await page.evaluate(readState, 'Text1');

    await page.evaluate(() => shell.commands.undo());
    await page.waitForTimeout(250);
    await page.evaluate(() => shell.commands.redo());
    await page.waitForTimeout(250);
    const afterRedo = await page.evaluate(readState, 'Text1');

    expect(afterRedo.shapeX).toBeCloseTo(afterDrag.shapeX, 0);
    expect(afterRedo.proxyX).toBeCloseTo(afterRedo.shapeX, 0);
    expect(afterRedo.proxyCount).toBe(1);
});
