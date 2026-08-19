const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';
const OBJECTS_ENDPOINT = '**/objects?**';
const DEFINITION_ENDPOINT = '**/objects/*/definition';

// One transparent pixel, so a catalogue screenshot loads without reaching anything real.
const THUMBNAIL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const CATALOGUE_ENTRY = {
    id: 'obj-1',
    type: 'pendulum-swing',
    title: 'Pendulum',
    description: 'A pendulum whose angle comes from a model variable.',
    thumbnail_url: THUMBNAIL,
    tags: ['object', 'mechanics']
};

const CATALOGUE_DEFINITION = {
    schemaVersion: '1.0.0',
    type: 'pendulum-swing',
    category: 'component',
    displayName: 'Pendulum',
    description: 'A pendulum whose angle comes from a model variable.',
    icon: 'fa-light fa-circle',
    tags: ['object', 'mechanics'],
    parameters: [],
    root: {
        id: 'pendulum-swing',
        type: 'group',
        children: [
            { id: 'rod', type: 'line', properties: { x1: 60, y1: 10, x2: 60, y2: 90, stroke: '#334155', strokeWidth: 3 } },
            { id: 'bob', type: 'circle', properties: { centerX: 60, centerY: 96, radius: 10, fill: '#2563eb' } }
        ]
    }
};

async function stubCatalogue(page, options = {}) {
    await page.route(OBJECTS_ENDPOINT, route => {
        if (options.listFails)
            return route.fulfill({ status: 500, body: 'no' });
        return route.fulfill({ json: { items: options.items ?? [CATALOGUE_ENTRY], total: (options.items ?? [CATALOGUE_ENTRY]).length } });
    });
    await page.route(DEFINITION_ENDPOINT, route => {
        if (options.definitionFails)
            return route.fulfill({ status: 404, body: 'gone' });
        return route.fulfill({ json: options.definition ?? CATALOGUE_DEFINITION });
    });
}

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function openPicker(page) {
    await page.click('#components-button');
    await page.waitForSelector('.mdl-object-picker-card');
}

async function readKeys(page) {
    return await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-object-picker-card')).map(card => card.dataset.objectKey));
}

test.describe('object catalogue', () => {
    test('catalogue objects join the palette with their screenshot and description', async ({ page }) => {
        await stubCatalogue(page);
        await setupBoard(page);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="pendulum-swing"]');
        const card = await page.evaluate(() => {
            const element = document.querySelector('[data-object-key="pendulum-swing"]');
            return {
                title: element.querySelector('.mdl-catalog-data-title').textContent,
                description: element.querySelector('.mdl-object-picker-description').textContent,
                thumbnail: element.querySelector('.mdl-object-picker-preview img')?.getAttribute('src') ?? null
            };
        });
        expect(card.title).toBe('Pendulum');
        expect(card.description).toBe('A pendulum whose angle comes from a model variable.');
        expect(card.thumbnail).toBe(THUMBNAIL);
    });

    test('the definition is read only when the object is placed', async ({ page }) => {
        let definitionRequests = 0;
        await stubCatalogue(page);
        await page.route(DEFINITION_ENDPOINT, route => {
            definitionRequests++;
            return route.fulfill({ json: CATALOGUE_DEFINITION });
        });
        await setupBoard(page);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="pendulum-swing"]');
        expect(definitionRequests).toBe(0);
        expect(await page.evaluate(() => BlockRegistry.has('pendulum-swing'))).toBe(false);
        await page.click('[data-object-key="pendulum-swing"]');
        await page.waitForFunction(() => BlockRegistry.has('pendulum-swing'));
        expect(definitionRequests).toBe(1);
        const armed = await page.evaluate(() => ({
            shapeType: shell.shapeDrawController.pendingShapeType,
            componentType: BlockObjects.getComponentType(shell.shapeDrawController.pendingShapeProperties.definition)
        }));
        expect(armed).toEqual({ shapeType: 'ComponentShape', componentType: 'pendulum-swing' });
    });

    test('a placed catalogue object is drawn and saved into the model', async ({ page }) => {
        await stubCatalogue(page);
        await setupBoard(page);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="pendulum-swing"]');
        await page.click('[data-object-key="pendulum-swing"]');
        await page.waitForFunction(() => BlockRegistry.has('pendulum-swing'));
        await page.evaluate(() => modellus.blocks.addComponent('pendulum-swing', 'Pendulum'));
        await page.waitForTimeout(300);
        const drawn = await page.evaluate(() => shell.board.shapes.getByName('Pendulum').contentGroup.childElementCount);
        expect(drawn).toBeGreaterThan(0);
        const model = await page.evaluate(() => shell.serialize());
        expect(model.objects.map(document => document.type)).toEqual(['pendulum-swing']);
    });

    test('the palette still works when the catalogue cannot be read', async ({ page }) => {
        await stubCatalogue(page, { listFails: true });
        await setupBoard(page);
        await openPicker(page);
        await page.waitForTimeout(500);
        const keys = await readKeys(page);
        expect(keys).toContain('clock');
        expect(keys).not.toContain('pendulum-swing');
    });

    test('a definition that cannot be read is reported and leaves the picker open', async ({ page }) => {
        await stubCatalogue(page, { definitionFails: true });
        await setupBoard(page);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="pendulum-swing"]');
        await page.click('[data-object-key="pendulum-swing"]');
        await page.waitForSelector('.dx-toast-error');
        expect(await page.textContent('.dx-toast-message')).toContain('This catalogue object could not be read.');
        expect(await page.evaluate(() => shell.objectPicker.popupInstance.option('visible'))).toBe(true);
        expect(await page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
    });

    test('an object already registered is listed once, under its catalogue entry', async ({ page }) => {
        await stubCatalogue(page);
        await setupBoard(page);
        await page.evaluate(document => BlockObjectLibrary.registerDocument(document), CATALOGUE_DEFINITION);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="pendulum-swing"]');
        const keys = await readKeys(page);
        expect(keys.filter(key => key === 'pendulum-swing')).toHaveLength(1);
        const thumbnail = await page.evaluate(() => document.querySelector('[data-object-key="pendulum-swing"] .mdl-object-picker-preview img')?.getAttribute('src') ?? null);
        expect(thumbnail).toBe(THUMBNAIL);
    });

    test('a catalogue object may not replace one the editor ships with', async ({ page }) => {
        await stubCatalogue(page, {
            items: [Object.assign({}, CATALOGUE_ENTRY, { id: 'obj-2', type: 'clock', title: 'Impostor clock' })],
            definition: Object.assign({}, CATALOGUE_DEFINITION, { type: 'clock', displayName: 'Impostor clock' })
        });
        await setupBoard(page);
        await openPicker(page);
        await page.waitForSelector('[data-object-key="clock"]');
        await page.click('[data-object-key="clock"]');
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => BlockRegistry.get('clock').displayName)).toBe('Clock');
        expect(await page.evaluate(() => BlockObjects.getComponentType(shell.shapeDrawController.pendingShapeProperties.definition))).toBe('clock');
    });
});
