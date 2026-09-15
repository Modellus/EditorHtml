const { test, expect } = require('@playwright/test');
const { API_GLOB } = require('./apiHost');

// Which part of the catalogue you are looking at.
//
// Seven kinds of thing live here and a card is a card: a page of objects and a page of images were
// the same grey grid, and the form that opened over either said only "Edit". Each asset type has a
// colour and a mark of its own — the ones the tree has always used — and now they follow the type
// everywhere it appears: the branch it is chosen from, the header and cards it is listed in, and the
// form it is edited in. They are written down once, in window.modelsApp.constructor.assetTypes, rather than in the six
// places that each used to spell them out.

const CATALOG_URL = '/pages/catalog/index.html';

async function stubCatalogApi(page) {
    await page.route(API_GLOB, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/feature-flags'))
            return route.fulfill({ json: [{ key: 'can_access_maintenance', is_enabled: 1 }] });
        if (/^\/users\/[^/]+$/.test(path))
            return route.fulfill({ json: { id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' } });
        if (path.endsWith('/facets'))
            return route.fulfill({ json: { education: [], sciences: [], categories: [], uncategorized: 0, total: 0 } });
        if (path === '/objects')
            return route.fulfill({ json: { items: [], total: 0 } });
        return route.fulfill({ json: [] });
    });
}

async function openCatalog(page) {
    await stubCatalogApi(page);
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'user-1', exp: Math.floor(Date.now() / 1000) + 86400 }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'user-1', name: 'Tester', role: 'teacher', country: 'PT', preferredLanguage: 'en-US' }));
    });
    await page.goto(CATALOG_URL);
    await page.waitForFunction(() => typeof BlockRegistry !== 'undefined' && BlockRegistry.has('clock'), null, { timeout: 15000 });
    await page.waitForSelector('.dx-treeview-item');
}

async function selectNode(page, nodeId) {
    await page.evaluate(id => {
        window.modelsApp.state.selectedTreeNodeId = id;
        window.modelsApp.renderCurrentTreeNode();
    }, nodeId);
    await page.waitForTimeout(150);
}

function readIdentity(page) {
    return page.evaluate(() => {
        const header = document.getElementById('content-header');
        const cards = document.getElementById('models-card-view');
        return {
            headerType: header.getAttribute('data-asset-type'),
            headerAccent: header.style.getPropertyValue('--asset-accent'),
            cardsType: cards.getAttribute('data-asset-type'),
            mark: document.getElementById('content-type-mark').innerHTML
        };
    });
}

const BRANCHES = [
    { node: 'catalog-videos', type: 'video' },
    { node: 'catalog-audios', type: 'audio' },
    { node: 'catalog-images', type: 'image' },
    { node: 'catalog-data', type: 'data' },
    { node: 'catalog-characters', type: 'character' },
    { node: 'catalog-objects', type: 'object' }
];

test.describe('which part of the catalogue you are looking at', () => {
    test('every asset branch in the tree wears its own colour and mark', async ({ page }) => {
        await openCatalog(page);
        const branches = await page.evaluate(() => {
            const assets = window.modelsApp.findTreeItemById(window.modelsApp.getTreeData(), 'assets');
            const byId = Object.fromEntries(assets.items.map(item => [item.id, { icon: item.iconClass, color: item.iconColor }]));
            return { byId: byId, table: window.modelsApp.constructor.assetTypes };
        });
        for (const branch of BRANCHES) {
            const node = branches.byId[branch.node];
            expect(node, branch.node).toBeTruthy();
            expect(node.color, branch.node).toBe(branches.table[branch.type].color);
            expect(node.icon, branch.node).toBe(branches.table[branch.type].icon);
        }
        // Six types, six distinct colours: an identity nothing else shares is the whole point.
        const colours = BRANCHES.map(branch => branches.table[branch.type].color);
        expect(new Set(colours).size).toBe(colours.length);
    });

    test('choosing a branch carries its colour into the header and the cards', async ({ page }) => {
        await openCatalog(page);
        for (const branch of BRANCHES) {
            await selectNode(page, branch.node);
            const identity = await readIdentity(page);
            expect(identity.headerType, branch.node).toBe(branch.type);
            expect(identity.cardsType, branch.node).toBe(branch.type);
            expect(identity.headerAccent, branch.node).not.toBe('');
            expect(identity.mark, branch.node).toContain('fa-light');
        }
    });

    // The taxonomy nodes under a type are still that type: a page of Physics objects is a page of
    // objects.
    test('a branch underneath a type keeps the type it belongs to', async ({ page }) => {
        await openCatalog(page);
        await selectNode(page, 'catalog-object-science-item:sci-1');
        expect((await readIdentity(page)).headerType).toBe('object');
        await selectNode(page, 'catalog-image-education-item:edu-1');
        expect((await readIdentity(page)).headerType).toBe('image');
    });

    test('somewhere that is not an asset wears nothing', async ({ page }) => {
        await openCatalog(page);
        await selectNode(page, 'catalog-objects');
        expect((await readIdentity(page)).headerType).toBe('object');
        await selectNode(page, 'my-personal');
        const identity = await readIdentity(page);
        expect(identity.headerType).toBeNull();
        expect(identity.cardsType).toBeNull();
        expect(identity.mark).toBe('');
    });

    test('a form wears the colour of the thing it is editing', async ({ page }) => {
        await openCatalog(page);
        await page.evaluate(() => window.modelsApp.showObjectPopup({ id: 'obj-1', title: 'Pendulum', description: null, is_bundled: false }));
        await page.waitForSelector('#object-title-editor');
        await expect(page.locator('.mdl-asset-popup--object')).toHaveCount(1);

        await page.evaluate(() => window.modelsApp.objectPopupInstance.hide());
        await page.evaluate(() => window.modelsApp.showEditImagePopup({ id: 'img-1', title: 'A picture', description: null, asset_url: '' }));
        await page.waitForTimeout(300);
        await expect(page.locator('.mdl-asset-popup--image')).toHaveCount(1);
    });

    // The menu an asset is added from is the first place its colour appears, so it is the same one.
    test('the upload menu marks each kind with the colour its branch has', async ({ page }) => {
        await openCatalog(page);
        const items = await page.evaluate(() => window.modelsApp.buildUploadMenuItems().map(item => ({ id: item.id, color: item.iconColor })));
        const byId = Object.fromEntries(items.map(item => [item.id, item.color]));
        const table = await page.evaluate(() => window.modelsApp.constructor.assetTypes);
        expect(byId['upload-video']).toBe(table.video.color);
        expect(byId['add-object']).toBe(table.object.color);
        expect(byId['add-character']).toBe(table.character.color);
    });
});
