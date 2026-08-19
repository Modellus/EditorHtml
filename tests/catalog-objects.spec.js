const { test, expect } = require('@playwright/test');

const CATALOG_URL = '/pages/catalog/index.html';
const API_GLOB = '**/modellus-api.interactivebook.workers.dev/**';

const OBJECT_ENTRY = {
    id: 'obj-1',
    type: 'pendulum-swing',
    title: 'Pendulum',
    description: 'A pendulum whose angle comes from a model variable.',
    thumbnail_url: '',
    created_at: '2026-08-01T10:00:00Z'
};

const VALID_DEFINITION = {
    schemaVersion: '1.0.0',
    type: 'pendulum-swing',
    category: 'component',
    displayName: 'Pendulum',
    description: 'A pendulum whose angle comes from a model variable.',
    icon: 'fa-light fa-circle',
    tags: ['object'],
    parameters: [],
    root: {
        id: 'pendulum-swing',
        type: 'group',
        children: [
            { id: 'rod', type: 'line', properties: { x1: 60, y1: 10, x2: 90, y2: 88, stroke: '#334155', strokeWidth: 3 } },
            { id: 'bob', type: 'circle', properties: { centerX: 92, centerY: 95, radius: 10, fill: '#2563eb' } }
        ]
    }
};

// Routes every catalogue request the page makes, and records the writes so a test can read them
// back. Everything unknown answers with an empty list, which is what an empty catalogue looks like.
// An object that works out its own size, the way every bundled one does. Without a calculator behind
// the bindings its formulas fall back to zero and the drawing comes out empty but "valid".
const FORMULA_DEFINITION = {
    schemaVersion: '1.0.0',
    type: 'formula-dial',
    category: 'component',
    displayName: 'Formula dial',
    description: 'A dial that sizes itself from the drawing area.',
    icon: 'fa-light fa-circle',
    tags: ['object'],
    parameters: [],
    locals: [
        { id: 'w', value: { parameter: '$width' } },
        { id: 'h', value: { parameter: '$height' } },
        { id: 'r', formula: '\\frac{\\min\\left(w,h\\right)}{2}-6' }
    ],
    root: {
        id: 'formula-dial',
        type: 'circle',
        bindings: { radius: { parameter: 'r' } },
        properties: { centerX: 120, centerY: 120, fill: 'none', stroke: '#2563eb', strokeWidth: 4 }
    }
};

async function stubCatalogApi(page, state) {
    await page.route(API_GLOB, route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path === '/objects/facets')
            return route.fulfill({ json: { education: [{ id: 'edu-1', name: 'Secondary', count: 1 }], sciences: [{ id: 'sci-1', name: 'Physics', count: 1 }], total: 1 } });
        if (path === '/objects' && request.method() === 'POST') {
            state.created.push(request.postData());
            return route.fulfill({ json: Object.assign({}, OBJECT_ENTRY, { id: 'obj-new' }) });
        }
        if (path === '/objects' && request.method() === 'GET')
            return route.fulfill({ json: { items: [OBJECT_ENTRY], total: 1 } });
        if (/^\/objects\/[^/]+\/definition$/.test(path))
            return route.fulfill({ json: VALID_DEFINITION });
        if (/^\/objects\/[^/]+\/thumbnail$/.test(path)) {
            state.thumbnails.push(path);
            return route.fulfill({ json: { thumbnail_url: 'https://example.test/thumb.png' } });
        }
        if (/^\/objects\/[^/]+$/.test(path) && request.method() === 'PUT') {
            state.updated.push(request.postData());
            return route.fulfill({ json: OBJECT_ENTRY });
        }
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 0 } });
        if (path === '/models')
            return route.fulfill({ json: [] });
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

async function openObjectEditor(page) {
    await page.click('#nav-add-object');
    await page.waitForSelector('#object-definition-editor');
}

async function typeDefinition(page, definitionText) {
    await page.evaluate(text => window.modelsApp._objectDefinitionEditor.option('value', text), definitionText);
    await page.waitForFunction(() => {
        const host = document.getElementById('object-preview-host');
        return !!host.querySelector('.object-preview-drawing, .object-preview-problems');
    });
}

function createState() {
    return { created: [], updated: [], thumbnails: [] };
}

test.describe('catalogue objects', () => {
    test('the Objects branch lists the catalogue objects', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        const branch = await page.evaluate(() => {
            const assets = window.modelsApp.getTreeData().find(item => item.id === 'assets');
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

    test('a valid definition previews the object it draws', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await openObjectEditor(page);
        await page.evaluate(text => window.modelsApp._objectDefinitionEditor.option('value', text), JSON.stringify(VALID_DEFINITION));
        await page.click('#object-check-button');
        await page.waitForSelector('.object-preview-drawing svg');
        expect(await page.locator('.object-preview-drawing svg').count()).toBe(1);
        expect(await page.evaluate(() => document.querySelectorAll('.object-preview-drawing svg *').length)).toBeGreaterThan(1);
    });

    test('an object that sizes itself from a formula is drawn, not left empty', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await openObjectEditor(page);
        await typeDefinition(page, JSON.stringify(FORMULA_DEFINITION));
        const radius = await page.evaluate(() => Number(document.querySelector('.object-preview-drawing svg circle')?.getAttribute('r') ?? 0));
        expect(radius).toBeGreaterThan(100);
    });

    test('a definition that is not usable is reported and cannot be saved', async ({ page }) => {
        const state = createState();
        await stubCatalogApi(page, state);
        await openCatalog(page);
        await openObjectEditor(page);
        await typeDefinition(page, '{ "schemaVersion": "1.0.0", "type": "broken" }');
        const problems = await page.textContent('.object-preview-problems');
        expect(problems).toContain('Only components can be defined as JSON.');
        expect(problems).toContain('The definition has no root node.');
        await page.fill('#object-title-editor input', 'Broken');
        await page.click('#object-save-button');
        await page.waitForTimeout(400);
        expect(state.created).toHaveLength(0);
    });

    test('a definition reading a name it never declared is reported', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await openObjectEditor(page);
        const definition = JSON.parse(JSON.stringify(VALID_DEFINITION));
        definition.root.children[0].bindings = { x1: { formula: 'wobble\\cdot2' } };
        await typeDefinition(page, JSON.stringify(definition));
        expect(await page.textContent('.object-preview-problems')).toContain('"wobble"');
    });

    test('an object may not take the type of one the editor ships with', async ({ page }) => {
        await stubCatalogApi(page, createState());
        await openCatalog(page);
        await openObjectEditor(page);
        const definition = Object.assign({}, VALID_DEFINITION, { type: 'clock' });
        await typeDefinition(page, JSON.stringify(definition));
        expect(await page.textContent('.object-preview-problems')).toContain('the editor ships with');
    });

    test('publishing sends the definition and a screenshot drawn from it', async ({ page }) => {
        const state = createState();
        await stubCatalogApi(page, state);
        await openCatalog(page);
        await openObjectEditor(page);
        await page.fill('#object-title-editor input', 'Pendulum');
        await typeDefinition(page, JSON.stringify(VALID_DEFINITION));
        await page.click('#object-save-button');
        await expect.poll(() => state.created.length, { timeout: 10000 }).toBe(1);
        expect(await page.evaluate(() => window.modelsApp.objectPopupInstance.option('visible'))).toBe(false);
        expect(state.created[0]).toContain('pendulum-swing');
        expect(state.created[0]).toContain('name="title"');
        expect(state.created[0]).toContain('name="definition"');
        expect(state.created[0]).toContain('filename="object.png"');
    });

    test('editing an object loads its definition and previews it', async ({ page }) => {
        const state = createState();
        await stubCatalogApi(page, state);
        await openCatalog(page);
        await openObjectsNode(page);
        await page.hover('.card-tile');
        await page.click('.edit-button');
        await page.waitForSelector('.object-preview-drawing svg');
        const loaded = await page.evaluate(() => window.modelsApp._objectDefinitionEditor.option('value'));
        expect(JSON.parse(loaded).type).toBe('pendulum-swing');
    });
});
