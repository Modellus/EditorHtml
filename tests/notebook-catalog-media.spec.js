const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

const IMAGE_ENTRY = {
    id: 'img-1',
    title: 'Inclined plane',
    description: '',
    thumbnail_url: '',
    asset_url: 'https://modellus-api.interactivebook.workers.dev/images/img-1/asset',
    science_id: 'sci-1',
    education_level_id: null,
    created_at: '2026-09-03T10:00:00Z'
};

const AUDIO_ENTRY = {
    id: 'aud-1',
    title: 'Tuning fork 440 Hz',
    description: '',
    thumbnail_url: '',
    asset_url: 'https://modellus-api.interactivebook.workers.dev/audios/aud-1/asset',
    science_id: 'sci-1',
    education_level_id: null,
    created_at: '2026-09-03T10:00:00Z'
};

const PNG_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

async function setupNotebook(page) {
    await page.route(API_GLOB, route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/images')
            return route.fulfill({ json: [IMAGE_ENTRY] });
        if (path === '/audios')
            return route.fulfill({ json: [AUDIO_ENTRY] });
        if (path === '/images/img-1/asset')
            return route.fulfill({ contentType: 'image/png', body: PNG_BYTES });
        return route.fulfill({ json: [] });
    });
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
}

async function addMediaBlock(page) {
    return page.evaluate(() => {
        notebook.addBlock('media');
        return notebook.blocks[notebook.blocks.length - 1].id;
    });
}

function readBlock(page, blockId) {
    return page.evaluate(id => {
        const block = notebook.blocks.find(candidate => candidate.id === id);
        return { content: block.content, mimeType: block.mimeType };
    }, blockId);
}

async function pickFirstCard(page) {
    await page.waitForSelector('.mdl-catalog-data-card');
    await page.click('.mdl-catalog-data-title');
    await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
}

test.describe('notebook media block and the catalogue', () => {
    // The block wears the board's media toolbar, so the rows that toolbar builds have to be backed
    // by something on this side too: the drop zone row is what used to be missing.
    test('the media settings menu builds every row it offers', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addMediaBlock(page);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.click(`.notebook-block[data-block-id="${blockId}"]`);
        await page.click('.shape-context-toolbar.visible .mdl-image-settings-selector');
        await page.waitForSelector('.mdl-shape-overlay-popup .shape-image-dropzone');
        const rows = await page.locator('.mdl-shape-overlay-popup .dx-list-item').allTextContents();
        expect(rows.some(row => row.includes('Catalog Image'))).toBe(true);
        expect(rows.some(row => row.includes('Catalog Audio'))).toBe(true);
        expect(rows.some(row => row.includes('Catalog Video'))).toBe(true);
        expect(errors).toEqual([]);
    });

    test('a catalogue image picked from the menu becomes the block content', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addMediaBlock(page);
        await page.evaluate(() => notebook.shapeInstances.get(notebook.blocks[notebook.blocks.length - 1].id).showCatalogImagePopup());
        await pickFirstCard(page);
        expect(await readBlock(page, blockId)).toEqual({ content: IMAGE_ENTRY.asset_url, mimeType: 'image/*' });
        // The block body shows what was picked, not only the block record.
        expect(await page.locator(`.notebook-block[data-block-id="${blockId}"] .shape-image-dropzone__preview`).getAttribute('src')).toBe(IMAGE_ENTRY.asset_url);
    });

    test('a catalogue sound replaces the picture the block held', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addMediaBlock(page);
        await page.evaluate(() => notebook.shapeInstances.get(notebook.blocks[notebook.blocks.length - 1].id).applyCatalogImage({ asset_url: 'https://example.test/old.png' }));
        await page.evaluate(() => notebook.shapeInstances.get(notebook.blocks[notebook.blocks.length - 1].id).showCatalogAudioPopup());
        await pickFirstCard(page);
        expect(await readBlock(page, blockId)).toEqual({ content: AUDIO_ENTRY.asset_url, mimeType: 'audio/*' });
    });

    // A picked asset arrives as a block property change, so it joins the undo history rather than
    // sitting outside it the way a direct write would.
    test('picking a catalogue asset can be undone', async ({ page }) => {
        await setupNotebook(page);
        const blockId = await addMediaBlock(page);
        await page.evaluate(() => notebook.shapeInstances.get(notebook.blocks[notebook.blocks.length - 1].id).showCatalogImagePopup());
        await pickFirstCard(page);
        expect((await readBlock(page, blockId)).content).toBe(IMAGE_ENTRY.asset_url);
        const lastCommand = await page.evaluate(() => notebook.invoker.history[notebook.invoker.history.length - 1].constructor.name);
        expect(lastCommand).toBe('SetBlockPropertyCommand');
        await page.evaluate(() => notebook.invoker.undo());
        expect((await readBlock(page, blockId)).content).toBe('');
    });
});
