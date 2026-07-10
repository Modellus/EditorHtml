const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addTextBlock(page) {
    return page.evaluate(() => {
        notebook.addBlock('text');
        return notebook.blocks[notebook.blocks.length - 1].id;
    });
}

async function blockExists(page, blockId) {
    return page.evaluate(id => notebook.getBlockIndex(id) >= 0, blockId);
}

async function selectBlock(page, blockId) {
    await page.click(`.notebook-block[data-block-id="${blockId}"]`);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForTimeout(250);
}

test('adding a block goes through AddBlockCommand', async ({ page }) => {
    await setupNotebook(page);
    const blockId = await addTextBlock(page);
    expect(await blockExists(page, blockId)).toBe(true);
    const lastCommand = await page.evaluate(() => notebook.invoker.history[notebook.invoker.history.length - 1].constructor.name);
    expect(lastCommand).toBe('AddBlockCommand');
});

test('delete key removes the selected block through RemoveBlockCommand', async ({ page }) => {
    await setupNotebook(page);
    const blockId = await addTextBlock(page);
    await selectBlock(page, blockId);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await blockExists(page, blockId)).toBe(false);
    const lastCommand = await page.evaluate(() => notebook.invoker.history[notebook.invoker.history.length - 1].constructor.name);
    expect(lastCommand).toBe('RemoveBlockCommand');
});

test('delete key does nothing while editing block content', async ({ page }) => {
    await setupNotebook(page);
    const blockId = await addTextBlock(page);
    await selectBlock(page, blockId);
    await page.evaluate(id => {
        const blockElement = document.querySelector(`.notebook-block[data-block-id="${id}"]`);
        blockElement.querySelector('[contenteditable]')?.focus();
    }, blockId);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await blockExists(page, blockId)).toBe(true);
});

test('deleting a block can be undone and redone at its original position', async ({ page }) => {
    await setupNotebook(page);
    const firstBlockId = await addTextBlock(page);
    const secondBlockId = await addTextBlock(page);
    await addTextBlock(page);
    await selectBlock(page, secondBlockId);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await blockExists(page, secondBlockId)).toBe(false);
    await page.evaluate(() => notebook.undoPressed());
    await page.waitForTimeout(250);
    expect(await blockExists(page, secondBlockId)).toBe(true);
    const restoredIndex = await page.evaluate(id => notebook.getBlockIndex(id), secondBlockId);
    expect(restoredIndex).toBe(1);
    await page.evaluate(() => notebook.redoPressed());
    await page.waitForTimeout(250);
    expect(await blockExists(page, secondBlockId)).toBe(false);
    expect(await blockExists(page, firstBlockId)).toBe(true);
});

test('block property changes can be undone', async ({ page }) => {
    await setupNotebook(page);
    const blockId = await addTextBlock(page);
    const originalColor = await page.evaluate(id => notebook.getBlockById(id).backgroundColor ?? null, blockId);
    await page.evaluate(id => notebook.setBlockPropertyCommand(id, 'backgroundColor', '#ff0000'), blockId);
    expect(await page.evaluate(id => notebook.getBlockById(id).backgroundColor, blockId)).toBe('#ff0000');
    await page.evaluate(() => notebook.undoPressed());
    await page.waitForTimeout(250);
    expect(await page.evaluate(id => notebook.getBlockById(id).backgroundColor ?? null, blockId)).toBe(originalColor);
});

test('moving a block can be undone', async ({ page }) => {
    await setupNotebook(page);
    const firstBlockId = await addTextBlock(page);
    await addTextBlock(page);
    await page.evaluate(id => notebook.moveBlockCommand(id, 1), firstBlockId);
    expect(await page.evaluate(id => notebook.getBlockIndex(id), firstBlockId)).toBe(1);
    await page.evaluate(() => notebook.undoPressed());
    await page.waitForTimeout(250);
    expect(await page.evaluate(id => notebook.getBlockIndex(id), firstBlockId)).toBe(0);
});
