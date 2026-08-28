const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const BOARD_URL = '/pages/board/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

// One audio the way the API hands it over: no thumbnail and no education level, which is what the
// seeded physics examples look like. The card has to stand on the fallback rather than an image.
const AUDIO_ENTRY = {
    id: 'aud-1',
    title: 'Tuning fork 440 Hz',
    description: 'A tuning fork sounding the A above middle C.',
    thumbnail_url: '',
    asset_url: 'https://modellus-api.interactivebook.workers.dev/audios/aud-1/asset',
    science_id: 'sci-1',
    education_level_id: null,
    created_at: '2026-08-01T10:00:00Z'
};

// Answers every catalogue request the page makes. `audios` decides whether the branch has rows,
// so the same stub serves both the filled catalogue and the empty one it starts out as.
async function stubCatalogApi(page, audios) {
    await page.route(API_GLOB, route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/audios/facets')
            return route.fulfill({
                json: {
                    education: audios.length ? [{ id: null, name: 'Uncategorized', count: audios.length }] : [],
                    sciences: audios.length ? [{ id: 'sci-1', name: 'Physics', count: audios.length }] : [],
                    total: audios.length
                }
            });
        if (path === '/audios' && request.method() === 'GET')
            return route.fulfill({ json: { items: audios, total: audios.length } });
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 0 } });
        return route.fulfill({ json: [] });
    });
}

async function openCatalog(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 86400 }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' }));
    });
    await page.goto(CATALOG_URL);
    await page.waitForSelector('.dx-treeview-item');
}

function readAudiosBranch(page) {
    return page.evaluate(() => {
        const assets = window.modelsApp.findTreeItemById(window.modelsApp.getTreeData(), 'assets');
        const audios = assets.items.find(item => item.id === 'catalog-audios');
        return { assetsText: assets.text, audiosText: audios.text, children: audios.items.map(item => item.id) };
    });
}

// The tree node the user clicks; going through the app is what a click on it ends up doing.
async function openAudiosNode(page) {
    await page.evaluate(() => {
        window.modelsApp.state.selectedTreeNodeId = 'catalog-audios';
        window.modelsApp.renderCurrentTreeNode();
    });
}

test.describe('catalogue audios', () => {
    test('the Audios branch lists the catalogue audios', async ({ page }) => {
        await stubCatalogApi(page, [AUDIO_ENTRY]);
        await openCatalog(page);
        const branch = await readAudiosBranch(page);
        expect(branch.audiosText).toBe('Audios (1)');
        expect(branch.assetsText).toContain('(1)');
        expect(branch.children).toEqual(['catalog-audios-education', 'catalog-audios-sciences']);
        await openAudiosNode(page);
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Tuning fork 440 Hz');
        // The Education Levels branch under Audios stays inside the audios, the way Objects does.
        await page.evaluate(() => {
            window.modelsApp.state.selectedTreeNodeId = 'catalog-audios-education';
            window.modelsApp.renderCurrentTreeNode();
        });
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Tuning fork 440 Hz');
        // No thumbnail: the card falls back to the waveform placeholder rather than a broken image.
        expect(await page.locator('.media-thumb-placeholder.audio-thumb').count()).toBe(1);
        expect(await page.locator('.card-thumb').count()).toBe(0);
    });

    // Reading audios is public, so a reader who never signed in still gets the branch and its rows;
    // only the authoring controls are held back.
    test('a signed-out reader still gets the audios', async ({ page }) => {
        await stubCatalogApi(page, [AUDIO_ENTRY]);
        await page.goto(CATALOG_URL);
        await page.waitForSelector('.dx-treeview-item');
        expect((await readAudiosBranch(page)).audiosText).toBe('Audios (1)');
        await openAudiosNode(page);
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Tuning fork 440 Hz');
        expect(await page.locator('.card-tile .edit-button').count()).toBe(0);
        expect(await page.locator('.card-tile .delete-button').count()).toBe(0);
        expect(await page.locator('#nav-upload').isVisible().catch(() => false)).toBe(false);
    });

    test('an empty audios table leaves the branch empty rather than broken', async ({ page }) => {
        await stubCatalogApi(page, []);
        await openCatalog(page);
        const branch = await readAudiosBranch(page);
        expect(branch.audiosText).toBe('Audios (0)');
        expect(branch.children).toEqual(['catalog-audios-education', 'catalog-audios-sciences']);
        await openAudiosNode(page);
        await page.waitForFunction(() => !!window.modelsApp.audiosCardViewInstance);
        await page.waitForSelector('.dx-cardview-root-container');
        expect(await page.locator('.card-tile').count()).toBe(0);
        expect(await page.locator('.dx-cardview-root-container').getAttribute('aria-label')).toContain('0 cards');
    });
});

test.describe('media shape catalogue audio', () => {
    test('picking a catalogue audio plays its asset URL', async ({ page }) => {
        await page.route(API_GLOB, route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/audios')
                return route.fulfill({ json: [AUDIO_ENTRY] });
            return route.fulfill({ json: [] });
        });
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        });
        await page.goto(BOARD_URL);
        await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
        await page.evaluate(() => modellus.shape.addImage('Media1'));
        await page.evaluate(() => shell.board.shapes.getByName('Media1').showCatalogAudioPopup());
        await page.waitForSelector('.mdl-catalog-data-card');
        expect(await page.textContent('.mdl-catalog-data-title')).toBe('Tuning fork 440 Hz');
        await page.click('.mdl-catalog-data-card');
        await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
        const properties = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Media1');
            return { audioUrl: shape.properties.audioUrl, videoUrl: shape.properties.videoUrl, imageUrl: shape.properties.imageUrl };
        });
        expect(properties.audioUrl).toBe(AUDIO_ENTRY.asset_url);
        expect(properties.videoUrl).toBe('');
    });
});
