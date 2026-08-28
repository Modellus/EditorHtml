const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const BOARD_URL = '/pages/board/index.html';
const API_HOST = 'https://modellus-api.interactivebook.workers.dev';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

// Three seconds of silence, so a card that says it is playing is really playing rather than failing
// to decode and stopping again a tick later, and so there is a clip still running to be interrupted.
function silentWav() {
    const sampleCount = 24000;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + sampleCount, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(8000, 24);
    header.writeUInt32LE(8000, 28);
    header.writeUInt16LE(1, 32);
    header.writeUInt16LE(8, 34);
    header.write('data', 36);
    header.writeUInt32LE(sampleCount, 40);
    return Buffer.concat([header, Buffer.alloc(sampleCount, 128)]);
}

const AUDIOS = [
    { id: 'aud-1', title: 'Tuning fork', description: '', thumbnail_url: '', asset_url: `${API_HOST}/audios/aud-1/asset`, science_id: 'sci-1', education_level_id: null, created_at: '2026-08-01T10:00:00Z' },
    { id: 'aud-2', title: 'Metronome', description: '', thumbnail_url: '', asset_url: `${API_HOST}/audios/aud-2/asset`, science_id: 'sci-1', education_level_id: null, created_at: '2026-08-02T10:00:00Z' }
];
const VIDEOS = [
    { id: 'vid-1', title: 'Falling ball', description: '', thumbnail_url: '', asset_url: `${API_HOST}/videos/vid-1/asset`, science_id: 'sci-1', education_level_id: null, created_at: '2026-08-01T10:00:00Z' }
];
const DATA_SETS = [
    { id: 'dat-1', title: 'Free fall run', description: '', thumbnail_url: '', asset_url: `${API_HOST}/data/dat-1/asset`, science_id: 'sci-1', education_level_id: null, created_at: '2026-08-01T10:00:00Z' }
];
const CHARACTERS = [
    { id: 'chr-1', title: 'Walker', description: '', thumbnail_url: `${API_HOST}/characters/chr-1/thumbnail`, category_id: null, created_at: '2026-08-01T10:00:00Z' }
];
const CHARACTER_FRAMES = [`${API_HOST}/frames/1.png`, `${API_HOST}/frames/2.png`, `${API_HOST}/frames/3.png`];
const CSV = 't,x,v\n0,0,0\n1,5,10\n2,20,20\n';

// Every catalogue read the pages make, plus the assets themselves: a preview is only worth testing
// when the thing it plays answers.
async function stubCatalogApi(page) {
    await page.route(API_GLOB, route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/audios/aud-1/asset' || path === '/audios/aud-2/asset')
            return route.fulfill({ contentType: 'audio/wav', body: silentWav() });
        if (path === '/data/dat-1/asset')
            return route.fulfill({ contentType: 'text/csv', body: CSV });
        if (path === '/characters/chr-1/definition')
            return route.fulfill({ json: { id: 'chr-1', animations: [{ id: 'anim-1', name: 'Walk', frames: CHARACTER_FRAMES.map((url, index) => ({ id: `frm-${index}`, frame_index: index, image_url: url })) }] } });
        if (path.startsWith('/frames/') || path.endsWith('/thumbnail'))
            return route.fulfill({ contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64') });
        if (path === '/audios' && request.method() === 'GET')
            return route.fulfill({ json: AUDIOS });
        if (path === '/videos' && request.method() === 'GET')
            return route.fulfill({ json: VIDEOS });
        if (path === '/data' && request.method() === 'GET')
            return route.fulfill({ json: DATA_SETS });
        if (path === '/characters' && request.method() === 'GET')
            return route.fulfill({ json: CHARACTERS });
        if (path === '/characters/categories')
            return route.fulfill({ json: [] });
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 1 } });
        return route.fulfill({ json: [] });
    });
}

async function openCatalogNode(page, nodeId) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 86400 }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' }));
    });
    await page.goto(CATALOG_URL);
    await page.waitForSelector('.dx-treeview-item');
    await page.evaluate(selectedNodeId => {
        window.modelsApp.state.selectedTreeNodeId = selectedNodeId;
        window.modelsApp.renderCurrentTreeNode();
    }, nodeId);
    await page.waitForSelector('.card-tile');
}

async function openBoard(page) {
    await page.addInitScript(() => localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1' })));
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

test.describe('catalogue previews', () => {
    test('an audio card plays its sound, and starting one stops the other', async ({ page }) => {
        await stubCatalogApi(page);
        await openCatalogNode(page, 'catalog-audios');
        const buttons = page.locator('.mdl-asset-preview--audio .mdl-asset-preview-button');
        await expect(buttons).toHaveCount(2);
        await buttons.first().click();
        await expect(page.locator('.mdl-asset-preview--audio.is-playing')).toHaveCount(1);
        expect(await page.evaluate(() => AssetPreview.activePreview.audioElement.src)).toBe(AUDIOS[0].asset_url);
        await buttons.nth(1).click();
        await expect(page.locator('.mdl-asset-preview--audio.is-playing')).toHaveCount(1);
        expect(await page.evaluate(() => AssetPreview.activePreview.audioElement.src)).toBe(AUDIOS[1].asset_url);
        await buttons.nth(1).click();
        await expect(page.locator('.mdl-asset-preview--audio.is-playing')).toHaveCount(0);
        expect(await page.evaluate(() => AssetPreview.activePreview)).toBe(null);
    });

    test('a clip stops when the card that offered it is taken away', async ({ page }) => {
        await stubCatalogApi(page);
        await openCatalogNode(page, 'catalog-audios');
        await page.locator('.mdl-asset-preview--audio .mdl-asset-preview-button').first().click();
        await expect(page.locator('.mdl-asset-preview--audio.is-playing')).toHaveCount(1);
        await page.evaluate(() => {
            window.modelsApp.state.selectedTreeNodeId = 'catalog-videos';
            window.modelsApp.renderCurrentTreeNode();
        });
        await expect.poll(() => page.evaluate(() => AssetPreview.activePreview)).toBe(null);
    });

    test('a video card opens a player on the asset it offers', async ({ page }) => {
        await stubCatalogApi(page);
        await openCatalogNode(page, 'catalog-videos');
        await page.click('.mdl-asset-preview--video .mdl-asset-preview-button');
        await expect(page.locator('.mdl-asset-preview-popup video')).toHaveCount(1);
        expect(await page.getAttribute('.mdl-asset-preview-popup video', 'src')).toBe(VIDEOS[0].asset_url);
        expect(await page.textContent('.mdl-asset-preview-popup .dx-popup-title .dx-item-content')).toContain('Falling ball');
    });

    test('a data card shows the columns and the size of the file', async ({ page }) => {
        await stubCatalogApi(page);
        await openCatalogNode(page, 'catalog-data');
        await page.click('.mdl-asset-preview--data .mdl-asset-preview-button');
        await page.waitForSelector('.mdl-asset-preview-data-table');
        expect(await page.locator('.mdl-asset-preview-data-table thead th').allTextContents()).toEqual(['t', 'x', 'v']);
        expect(await page.textContent('.mdl-asset-preview-data-summary')).toBe('3 rows · 3 columns');
        expect(await page.locator('.mdl-asset-preview-data-table tbody tr').count()).toBe(3);
        expect(await page.locator('.mdl-asset-preview-data-note').count()).toBe(0);
    });

    test('a character card walks while the pointer is on it', async ({ page }) => {
        await stubCatalogApi(page);
        await openCatalogNode(page, 'catalog-characters');
        const frame = page.locator('.mdl-asset-preview-frame');
        await page.hover('.card-thumb-wrap');
        await expect(frame).toHaveClass(/is-visible/);
        await expect.poll(() => frame.getAttribute('src')).toBe(CHARACTER_FRAMES[1]);
        await page.hover('.card-title');
        await expect(frame).not.toHaveClass(/is-visible/);
    });
});

test.describe('previews while picking into a shape', () => {
    test('the audio picker plays a card before it is chosen', async ({ page }) => {
        await stubCatalogApi(page);
        await openBoard(page);
        await page.evaluate(() => modellus.shape.addImage('Media1'));
        await page.evaluate(() => shell.board.shapes.getByName('Media1').showCatalogAudioPopup());
        await page.waitForSelector('.mdl-catalog-data-card');
        await page.locator('.mdl-catalog-data-card .mdl-asset-preview-button').first().click();
        await expect(page.locator('.mdl-asset-preview--audio.is-playing')).toHaveCount(1);
        expect(await page.evaluate(() => AssetPreview.activePreview.audioElement.src)).toBe(AUDIOS[0].asset_url);
    });

    test('the video picker watches a card and hands its asset to the shape', async ({ page }) => {
        await stubCatalogApi(page);
        await openBoard(page);
        await page.evaluate(() => modellus.shape.addImage('Media1'));
        await page.evaluate(() => shell.board.shapes.getByName('Media1').showCatalogVideoPopup());
        await page.waitForSelector('.mdl-catalog-data-card');
        await page.click('.mdl-catalog-data-card .mdl-asset-preview-button');
        expect(await page.getAttribute('.mdl-asset-preview-popup video', 'src')).toBe(VIDEOS[0].asset_url);
        // Watching is not choosing: the picker stays open behind the player, with the card it was
        // asked about now the chosen one.
        await expect(page.locator('.mdl-catalog-data-popup')).toBeVisible();
        await expect(page.locator('.mdl-catalog-data-card')).toHaveClass(/selected/);
        await page.click('.mdl-asset-preview-popup .dx-closebutton');
        await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
        const properties = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Media1');
            return { videoUrl: shape.properties.videoUrl, audioUrl: shape.properties.audioUrl };
        });
        expect(properties.videoUrl).toBe(VIDEOS[0].asset_url);
        expect(properties.audioUrl).toBe('');
    });

    test('the data picker reads the file before the table takes it', async ({ page }) => {
        await stubCatalogApi(page);
        await openBoard(page);
        await page.evaluate(() => modellus.shape.addDataTable('Data1'));
        await page.evaluate(() => { shell.board.shapes.getByName('Data1').showCatalogDataPopup(); });
        await page.waitForSelector('.mdl-catalog-data-card');
        await page.click('.mdl-catalog-data-card .mdl-asset-preview-button');
        await page.waitForSelector('.mdl-asset-preview-data-table');
        expect(await page.locator('.mdl-asset-preview-data-table thead th').allTextContents()).toEqual(['t', 'x', 'v']);
        await expect(page.locator('.mdl-catalog-data-popup')).toBeVisible();
    });

    test('the character picker walks a card while the pointer is on it', async ({ page }) => {
        await stubCatalogApi(page);
        await openBoard(page);
        await page.evaluate(() => modellus.shape.addBody('Body1'));
        await page.evaluate(() => shell.board.shapes.getByName('Body1').showCharacterPickerPopup());
        await page.waitForSelector('.mdl-catalog-data-card');
        const frame = page.locator('.mdl-asset-preview-frame');
        await page.hover('.mdl-catalog-data-thumb-wrap');
        await expect(frame).toHaveClass(/is-visible/);
        await expect.poll(() => frame.getAttribute('src')).toBe(CHARACTER_FRAMES[1]);
    });
});
