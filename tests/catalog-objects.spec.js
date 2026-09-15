const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const { API_GLOB } = require('./apiHost');

// The card a shape is listed under, and the flag that decides whether it ships.
//
// A shape is two things in the catalogue: a document of formulas, which is written in the block
// shape editor, and a card, which is what everyone else sees. This form is the card — its picture,
// its name, what it is for, and whether the editor ships with it. The definition is deliberately
// not here: it was a JSON text area beside a description field, which is no way to write a drawing.
//
// The bundle flag is the part with reach. Which objects a release carries used to be the set of
// files in scripts/blocks/definitions and a list in the API's source, so adding a shape to the
// bundle meant a commit in two repositories. It is now this switch: the build reads every object
// flagged here and generates the editor's bundle from them.

const OBJECT_ENTRY = {
    id: 'obj-1',
    type: 'pendulum-swing',
    title: 'Pendulum',
    description: 'A pendulum whose angle comes from a model variable.',
    thumbnail_url: 'https://example.test/pendulum.png',
    is_bundled: false,
    created_at: '2026-08-01T10:00:00Z'
};

async function stubCatalogApi(page, state, entry = OBJECT_ENTRY) {
    await page.route(API_GLOB, route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: state.maintenance === false ? [] : [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/objects/facets')
            return route.fulfill({ json: { education: [{ id: 'edu-1', name: 'Secondary', count: 1 }], sciences: [{ id: 'sci-1', name: 'Physics', count: 1 }], total: 1 } });
        if (path === '/objects' && request.method() === 'GET')
            return route.fulfill({ json: { items: [entry], total: 1 } });
        if (/^\/objects\/[^/]+\/thumbnail$/.test(path)) {
            state.thumbnails.push(request.postData() ?? '');
            return route.fulfill({ json: { thumbnail_url: 'https://example.test/thumb.png' } });
        }
        if (/^\/objects\/[^/]+$/.test(path) && request.method() === 'PUT') {
            state.updated.push(JSON.parse(request.postData()));
            return route.fulfill({ json: entry });
        }
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
    await page.waitForFunction(() => typeof BlockRegistry !== 'undefined' && BlockRegistry.has('clock'), null, { timeout: 15000 });
    await page.waitForSelector('.dx-treeview-item');
}

// The tree node the user clicks; going through the app is what a click on it ends up doing.
async function openObjectsNode(page) {
    await page.evaluate(() => {
        window.modelsApp.state.selectedTreeNodeId = 'catalog-objects';
        window.modelsApp.renderCurrentTreeNode();
    });
    await page.waitForSelector('.card-tile');
}

async function openObjectCard(page) {
    await openObjectsNode(page);
    await page.hover('.card-tile');
    await page.click('.edit-button');
    await page.waitForSelector('#object-title-editor');
}

function createState(overrides = {}) {
    return { updated: [], thumbnails: [], ...overrides };
}

test.describe('the card a shape is listed under', () => {
    test('the Objects branch lists the catalogue objects', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        const branch = await page.evaluate(() => {
            const assets = window.modelsApp.findTreeItemById(window.modelsApp.getTreeData(), 'assets');
            const objects = assets.items.find(item => item.id === 'catalog-objects');
            return { assetsText: assets.text, objectsText: objects.text, children: objects.items.map(item => item.id) };
        });
        expect(branch.objectsText).toBe('Objects (1)');
        expect(branch.assetsText).toContain('(1)');
        expect(branch.children).toEqual(['catalog-objects-education', 'catalog-objects-sciences']);
        await openObjectsNode(page);
        expect(await page.textContent('.card-title')).toBe('Pendulum');
        expect(await page.textContent('.card-desc')).toContain('A pendulum whose angle');
    });

    test('the form edits the card, and the definition is nowhere in it', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await openObjectCard(page);

        await expect(page.locator('#object-title-editor input')).toHaveValue('Pendulum');
        await expect(page.locator('.shape-image-dropzone, .mdl-image-control, #object-form img').first()).toBeVisible();
        await expect(page.locator('#object-bundled-switch')).toBeVisible();
        await expect(page.locator('#object-open-shape-editor-button')).toBeVisible();
        // The one thing that is not here.
        await expect(page.locator('#object-definition-editor')).toHaveCount(0);
        await expect(page.locator('.object-preview-host')).toHaveCount(0);
    });

    test('saving sends what the card is made of, and no definition', async ({ page }) => {
        const state = createState();
        await stubCatalogApi(page, state);
        await openCatalog(page);
        await openObjectCard(page);

        // The description the card already had is what the editor opens on, or saving would quietly
        // replace it with nothing.
        await expect.poll(() => page.evaluate(() => window.modelsApp._objectHTMLEditor.option('value')))
            .toContain('A pendulum whose angle');
        await page.fill('#object-title-editor input', 'Pendulum swing');
        await page.click('#object-save-button');
        await expect.poll(() => state.updated.length, { timeout: 10000 }).toBe(1);

        expect(state.updated[0].title).toBe('Pendulum swing');
        expect(state.updated[0].description).toContain('A pendulum whose angle');
        expect(state.updated[0]).toHaveProperty('is_bundled');
        // A card edit is not a republication of the drawing.
        expect(state.updated[0]).not.toHaveProperty('definition');
    });

    // The whole point of the flag: what a release carries is decided here, not by what files happen
    // to be in the repository.
    test('switching the bundle flag on is what puts a shape in the next build', async ({ page }) => {
        const state = createState();
        await stubCatalogApi(page, state);
        await openCatalog(page);
        await openObjectCard(page);

        expect(await page.evaluate(() => $('#object-bundled-switch').dxSwitch('instance').option('value'))).toBe(false);
        await page.evaluate(() => $('#object-bundled-switch').dxSwitch('instance').option('value', true));
        await page.click('#object-save-button');
        await expect.poll(() => state.updated.length, { timeout: 10000 }).toBe(1);
        expect(state.updated[0].is_bundled).toBe(true);
    });

    test('an object already in the bundle says so when its form is opened', async ({ page }) => {
        await stubCatalogApi(page, createState(), { ...OBJECT_ENTRY, is_bundled: true });
        await openCatalog(page);
        await openObjectCard(page);
        expect(await page.evaluate(() => $('#object-bundled-switch').dxSwitch('instance').option('value'))).toBe(true);
    });

    // A shape has no card until it has a drawing, and a drawing is made in the editor.
    test('adding an object goes straight to the block shape editor', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await page.click('#nav-upload');
        await page.click('.mdl-nav-menu-dropdown .dx-item:has-text("Add Object")');
        await page.waitForSelector('#object-definition-editor');
        expect(new URL(page.url()).pathname).toBe('/pages/shape-editor/index.html');
        expect(new URL(page.url()).searchParams.get('object_id')).toBeNull();
    });
});
