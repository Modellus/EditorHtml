const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 20000 });
    await page.waitForTimeout(500);
}

async function addObjectBlock(page, type) {
    const blockId = await page.evaluate(type => {
        notebook.addBlock(type);
        return notebook.blocks[notebook.blocks.length - 1].id;
    }, type);
    await expect.poll(() => page.evaluate(id => document.querySelector(`.notebook-block[data-block-id="${id}"] .notebook-component-drawing`)?.querySelectorAll('[data-source-id]').length ?? 0, blockId)).toBeGreaterThan(0);
    return blockId;
}

function readNodes(page, blockId, sourceId, tag = '*') {
    return page.evaluate(input => Array.from(document.querySelectorAll(`.notebook-block[data-block-id="${input.blockId}"] .notebook-component-drawing ${input.tag}[data-source-id^="${input.sourceId}"]`))
        .map(node => node.textContent), { blockId, sourceId, tag });
}

function drawingBox(page, blockId) {
    return page.evaluate(id => {
        const rect = document.querySelector(`.notebook-block[data-block-id="${id}"] .notebook-component-drawing`).getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }, blockId);
}

test.describe('the measuring objects in the notebook', () => {
    // The same object the board hosts, drawn by the same compiler into a block of its own.
    test('a ruler block draws the ruler object, ruled and numbered', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addObjectBlock(page, 'ruler');
        expect(await readNodes(page, blockId, 'tick-label', 'text')).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
        expect(await readNodes(page, blockId, 'major-tick', 'line')).toHaveLength(11);
        const block = await page.evaluate(id => notebook.blocks.find(entry => entry.id === id), blockId);
        expect(BlockDefinitionType(block)).toBe('ruler');
        expect(block.minimumX).toBe(0);
        expect(block.maximumX).toBe(10);
    });

    test('a protractor block draws the protractor object, banded and numbered', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addObjectBlock(page, 'protractor');
        expect(await readNodes(page, blockId, 'label-', 'text')).toContain('90');
        // The plain marks ruling the band a degree apart, and the grid the numbers stand on over them.
        expect(await readNodes(page, blockId, 'tick-', 'line')).toHaveLength(181 + 37);
    });

    // What the object shows is the block's own, so the page carries it and opening the page again
    // draws what was left there.
    test('what the reader sets on a ruler is kept in the block the page saves', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addObjectBlock(page, 'ruler');
        await page.evaluate(id => notebook.shapeInstances.get(id).setPropertyCommand('maximumX', 4), blockId);
        await expect.poll(() => readNodes(page, blockId, 'tick-label', 'text')).toEqual(['0.00', '0.40', '0.80', '1.20', '1.60', '2.00', '2.40', '2.80', '3.20', '3.60', '4.00']);
        expect(await page.evaluate(id => notebook.blocks.find(entry => entry.id === id).maximumX, blockId)).toBe(4);
    });

    // A ruler in a notebook answers the pointer the way it does on the board.
    test('the ruler reads where the pointer stands, and stops reading when it leaves', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addObjectBlock(page, 'ruler');
        expect(await readNodes(page, blockId, 'crosshair', 'line')).toHaveLength(0);
        const box = await drawingBox(page, blockId);
        await page.mouse.move(box.x + box.width / 2, box.y + 20);
        await expect.poll(() => readNodes(page, blockId, 'crosshair', 'line')).toHaveLength(1);
        await page.mouse.move(box.x + box.width / 2, box.y - 80);
        await expect.poll(() => readNodes(page, blockId, 'crosshair', 'line')).toHaveLength(0);
    });
});

function BlockDefinitionType(block) {
    return block?.definition?.root?.type ?? null;
}
