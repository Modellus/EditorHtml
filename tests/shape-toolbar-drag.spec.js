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

async function handleCenter(page, name, handleClass) {
    return page.evaluate(({ shapeName, handleClass }) => {
        const shape = shell.board.shapes.getByName(shapeName);
        const handle = Array.from(document.querySelectorAll(`.handle.${handleClass}`)).find(h => h._shape === shape);
        const rect = handle.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, { shapeName: name, handleClass });
}

test.describe('Shape toolbar during a drag', () => {
    test('dragging a shape closes its toolbar and brings it back at the end', async ({ page }) => {
        await setupEditor(page);
        await addTextAt(page, 'Text1', 300, 300, 150, 60);
        await realClickShape(page, 'Text1');
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);

        const center = await handleCenter(page, 'Text1', 'move');
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 60, center.y + 40, { steps: 10 });
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(0);

        await page.mouse.up();
        await page.waitForTimeout(250);
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);
    });

    test('resizing a shape closes its toolbar and brings it back at the end', async ({ page }) => {
        await setupEditor(page);
        await addTextAt(page, 'Text1', 300, 300, 150, 60);
        await realClickShape(page, 'Text1');
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);

        const corner = await handleCenter(page, 'Text1', 'bottom-right');
        await page.mouse.move(corner.x, corner.y);
        await page.mouse.down();
        await page.mouse.move(corner.x + 60, corner.y + 40, { steps: 10 });
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(0);

        await page.mouse.up();
        await page.waitForTimeout(250);
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);
    });

    test('a menu opened from the toolbar closes when the shape is dragged', async ({ page }) => {
        await setupEditor(page);
        await addTextAt(page, 'Text1', 300, 300, 150, 60);
        await realClickShape(page, 'Text1');
        await page.locator('.shape-context-toolbar.visible .dx-dropdownbutton').first().click();
        await expect(page.locator('.mdl-shape-overlay-popup:visible, .dx-dropdownbutton-popup-wrapper:visible').first()).toBeVisible();

        const center = await handleCenter(page, 'Text1', 'move');
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 60, center.y + 40, { steps: 10 });
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(0);
        await expect(page.locator('.mdl-shape-overlay-popup:visible, .dx-dropdownbutton-popup-wrapper:visible')).toHaveCount(0);
        await page.mouse.up();
    });
});

const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 20000 });
    await page.waitForTimeout(500);
}

test.describe('Block toolbar during a resize', () => {
    test('resizing a notebook block closes its toolbar and brings it back at the end', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await page.evaluate(() => {
            notebook.addBlock('ruler');
            return notebook.blocks[notebook.blocks.length - 1].id;
        });
        const block = page.locator(`.notebook-block[data-block-id="${blockId}"]`);
        await expect(block).toBeVisible();
        await block.click({ position: { x: 5, y: 5 } });
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);

        const handle = block.locator('.notebook-block-resize-handle');
        const box = await handle.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 10 });
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(0);

        await page.mouse.up();
        await page.waitForTimeout(250);
        await expect(page.locator('.shape-context-toolbar.visible')).toHaveCount(1);
    });
});
