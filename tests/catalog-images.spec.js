const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const BOARD_URL = '/pages/board/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

// One image the way the API hands it over. It carries no separate thumbnail, which is the ordinary
// case for a picture: the picture is its own thumbnail, so the card has to draw the asset itself.
const IMAGE_ENTRY = {
    id: 'img-1',
    title: 'Inclined plane',
    description: 'A block resting on a ramp.',
    thumbnail_url: '',
    asset_url: 'https://modellus-api.interactivebook.workers.dev/images/img-1/asset',
    science_id: 'sci-1',
    education_level_id: null,
    created_at: '2026-08-01T10:00:00Z'
};

// A one-pixel PNG, so the cards and the preview have something real to draw.
const PNG_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==', 'base64');

// Answers every catalogue request the page makes. `images` decides whether the branch has rows,
// so the same stub serves both the filled catalogue and the empty one it starts out as.
async function stubCatalogApi(page, images) {
    await page.route(API_GLOB, route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/images/img-1/asset')
            return route.fulfill({ contentType: 'image/png', body: PNG_BYTES });
        if (path === '/images/facets')
            return route.fulfill({
                json: {
                    education: images.length ? [{ id: null, name: 'Uncategorized', count: images.length }] : [],
                    sciences: images.length ? [{ id: 'sci-1', name: 'Physics', count: images.length }] : [],
                    total: images.length
                }
            });
        if (path === '/images' && request.method() === 'GET')
            return route.fulfill({ json: { items: images, total: images.length } });
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

function readImagesBranch(page) {
    return page.evaluate(() => {
        const assets = window.modelsApp.findTreeItemById(window.modelsApp.getTreeData(), 'assets');
        const images = assets.items.find(item => item.id === 'catalog-images');
        return { assetsText: assets.text, imagesText: images.text, children: images.items.map(item => item.id) };
    });
}

// The tree node the user clicks; going through the app is what a click on it ends up doing.
async function openImagesNode(page, nodeId = 'catalog-images') {
    await page.evaluate(id => {
        window.modelsApp.state.selectedTreeNodeId = id;
        window.modelsApp.renderCurrentTreeNode();
    }, nodeId);
}

test.describe('catalogue images', () => {
    test('the Images branch lists the catalogue images', async ({ page }) => {
        await stubCatalogApi(page, [IMAGE_ENTRY]);
        await openCatalog(page);
        const branch = await readImagesBranch(page);
        expect(branch.imagesText).toBe('Images (1)');
        expect(branch.assetsText).toContain('(1)');
        expect(branch.children).toEqual(['catalog-images-education', 'catalog-images-sciences']);
        await openImagesNode(page);
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Inclined plane');
        // A picture is its own thumbnail: the card draws the asset rather than the placeholder.
        expect(await page.locator('.card-thumb').getAttribute('src')).toBe(IMAGE_ENTRY.asset_url);
        expect(await page.locator('.media-thumb-placeholder.image-thumb').count()).toBe(0);
        // The Education Levels branch under Images stays inside the images, the way Audios does.
        await openImagesNode(page, 'catalog-images-education');
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Inclined plane');
    });

    // A thumbnail in a grid loses whatever the picture is of, so the card offers it at full size.
    test('a card opens its picture at full size', async ({ page }) => {
        await stubCatalogApi(page, [IMAGE_ENTRY]);
        await openCatalog(page);
        await openImagesNode(page);
        await page.waitForSelector('.card-tile .mdl-asset-preview-button');
        await page.click('.card-tile .mdl-asset-preview-button');
        await page.waitForSelector('.mdl-asset-preview-popup .mdl-asset-preview-image');
        expect(await page.locator('.mdl-asset-preview-popup .mdl-asset-preview-image').getAttribute('src')).toBe(IMAGE_ENTRY.asset_url);
    });

    // Reading images is public, so a reader who never signed in still gets the branch and its rows;
    // only the authoring controls are held back.
    test('a signed-out reader still gets the images', async ({ page }) => {
        await stubCatalogApi(page, [IMAGE_ENTRY]);
        await page.goto(CATALOG_URL);
        await page.waitForSelector('.dx-treeview-item');
        expect((await readImagesBranch(page)).imagesText).toBe('Images (1)');
        await openImagesNode(page);
        await page.waitForSelector('.card-tile');
        expect(await page.textContent('.card-title')).toBe('Inclined plane');
        expect(await page.locator('.card-tile .edit-button').count()).toBe(0);
        expect(await page.locator('.card-tile .delete-button').count()).toBe(0);
    });

    test('an empty images table leaves the branch empty rather than broken', async ({ page }) => {
        await stubCatalogApi(page, []);
        await openCatalog(page);
        const branch = await readImagesBranch(page);
        expect(branch.imagesText).toBe('Images (0)');
        expect(branch.children).toEqual(['catalog-images-education', 'catalog-images-sciences']);
        await openImagesNode(page);
        await page.waitForFunction(() => !!window.modelsApp.imagesCardViewInstance);
        await page.waitForSelector('.dx-cardview-root-container');
        expect(await page.locator('.card-tile').count()).toBe(0);
        expect(await page.locator('.dx-cardview-root-container').getAttribute('aria-label')).toContain('0 cards');
    });
});

test.describe('shape catalogue image', () => {
    async function setupBoard(page) {
        await page.route(API_GLOB, route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/images')
                return route.fulfill({ json: [IMAGE_ENTRY] });
            if (path === '/images/img-1/asset')
                return route.fulfill({ contentType: 'image/png', body: PNG_BYTES });
            return route.fulfill({ json: [] });
        });
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        });
        await page.goto(BOARD_URL);
        await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    }

    async function pickCatalogImage(page, shapeName) {
        await page.evaluate(name => shell.board.shapes.getByName(name).showCatalogImagePopup(), shapeName);
        await page.waitForSelector('.mdl-catalog-data-card');
        expect(await page.textContent('.mdl-catalog-data-title')).toBe('Inclined plane');
        // The picker shows the picture itself, since the entry carries no separate thumbnail.
        expect(await page.locator('.mdl-catalog-data-thumb').getAttribute('src')).toBe(IMAGE_ENTRY.asset_url);
        // The thumbnail carries the button that opens the picture, so the title is what chooses it.
        await page.click('.mdl-catalog-data-title');
        await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
    }

    test('a media shape shows the picked image and drops the sound it held', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addImage('Media1'));
        await page.evaluate(() => shell.board.shapes.getByName('Media1').applyCatalogAudio({ asset_url: 'https://example.test/old.mp3' }));
        await pickCatalogImage(page, 'Media1');
        const properties = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Media1');
            return { imageUrl: shape.properties.imageUrl, audioUrl: shape.properties.audioUrl, videoUrl: shape.properties.videoUrl };
        });
        expect(properties.imageUrl).toBe(IMAGE_ENTRY.asset_url);
        expect(properties.audioUrl).toBe('');
        expect(properties.videoUrl).toBe('');
    });

    test('a body wears the picked image', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addBody('Body1'));
        await pickCatalogImage(page, 'Body1');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Body1').properties.imageUrl)).toBe(IMAGE_ENTRY.asset_url);
    });

    test('a referential takes the picked image as its background', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addReferential('Ref1'));
        await pickCatalogImage(page, 'Ref1');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Ref1').properties.backgroundImageUrl)).toBe(IMAGE_ENTRY.asset_url);
    });

    test('a question takes the picked image', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => shell.commands.addShape('QuestionShape', 'Question1'));
        await pickCatalogImage(page, 'Question1');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Question1').properties.imageUrl)).toBe(IMAGE_ENTRY.asset_url);
    });

    // Seeing is not choosing: the picker stays open behind the picture, the way it does behind the
    // video player, with the card it was asked about now the chosen one.
    test('the picker opens a picture without choosing it, then hands it over', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addImage('Media1'));
        await page.evaluate(() => shell.board.shapes.getByName('Media1').showCatalogImagePopup());
        await page.waitForSelector('.mdl-catalog-data-card');
        await page.click('.mdl-catalog-data-card .mdl-asset-preview-button');
        expect(await page.getAttribute('.mdl-asset-preview-popup .mdl-asset-preview-image', 'src')).toBe(IMAGE_ENTRY.asset_url);
        await expect(page.locator('.mdl-catalog-data-popup')).toBeVisible();
        await expect(page.locator('.mdl-catalog-data-card')).toHaveClass(/selected/);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Media1').properties.imageUrl)).not.toBe(IMAGE_ENTRY.asset_url);
        await page.click('.mdl-asset-preview-popup .dx-closebutton');
        await page.click('.mdl-catalog-data-popup .dx-toolbar-after .dx-button:has-text("Select")');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Media1').properties.imageUrl)).toBe(IMAGE_ENTRY.asset_url);
    });
});
