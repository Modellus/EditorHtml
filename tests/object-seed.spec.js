const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const ObjectSeeder = require('../scripts/catalog/objectSeeder.js');

const HARNESS_URL = '/tests/object-seed-harness.html';
const API_BASE = 'https://objects-api.test';
const DEFINITIONS_DIRECTORY = path.join(__dirname, '..', 'scripts', 'blocks', 'definitions');

function readDefinitions() {
    return fs.readdirSync(DEFINITIONS_DIRECTORY)
        .filter(name => name.endsWith('.json'))
        .sort()
        .map(name => JSON.parse(fs.readFileSync(path.join(DEFINITIONS_DIRECTORY, name), 'utf8')))
        .filter(document => ObjectSeeder.isCatalogueObject(document));
}

// Stands in for the catalogue: remembers what was written so a test can read it back, and can be
// told to fail the listing or one particular write.
async function stubObjectsApi(page, state) {
    await page.route(`${API_BASE}/**`, route => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        if (path === '/objects' && request.method() === 'GET') {
            if (state.listFails)
                return route.fulfill({ status: 500, body: 'no' });
            return route.fulfill({ json: { items: state.entries, total: state.entries.length } });
        }
        if (path === '/objects' && request.method() === 'POST') {
            const body = request.postData();
            if (state.failType && body.includes(`"type":"${state.failType}"`))
                return route.fulfill({ status: 400, json: { error: 'that one is not allowed' } });
            const created = { id: `id-${state.created.length + 1}`, body };
            state.created.push(created);
            return route.fulfill({ json: { id: created.id } });
        }
        if (/^\/objects\/[^/]+\/thumbnail$/.test(path)) {
            state.thumbnails.push(path);
            return route.fulfill({ json: { thumbnail_url: 'https://example.test/thumb.png' } });
        }
        if (/^\/objects\/[^/]+$/.test(path) && request.method() === 'PUT') {
            const body = request.postData();
            if (state.failType && body.includes(`"type":"${state.failType}"`))
                return route.fulfill({ status: 400, json: { error: '"pointer-ring" at root.children[0] is not a registered building block.' } });
            state.updated.push({ path, body });
            return route.fulfill({ json: { id: 'updated' } });
        }
        return route.fulfill({ json: [] });
    });
}

function createState(entries = []) {
    return { entries, created: [], updated: [], thumbnails: [], listFails: false, failType: '' };
}

async function openHarness(page) {
    await page.goto(HARNESS_URL);
    await page.waitForFunction(() => window.seedHarnessReady === true, null, { timeout: 15000 });
}

async function seed(page, definitions, options) {
    return await page.evaluate(async input => {
        const seeder = window.createObjectSeeder(input.apiBase, 'test-token');
        return await seeder.seed(input.definitions, input.options);
    }, { apiBase: API_BASE, definitions, options });
}

test.describe('seeding the bundled objects', () => {
    test('a dry run plans every object and writes nothing', async ({ page }) => {
        const state = createState();
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: false });
        expect(seeding.results.map(result => result.type)).toEqual([
            'calculator', 'circular-gauge', 'clock', 'compass', 'mechanical-wave', 'mouse-tracker', 'orbit-system', 'rotating-vector', 'speedometer', 'steering-wheel', 'thermometer'
        ]);
        expect(seeding.results.every(result => result.action === 'create')).toBe(true);
        expect(state.created).toHaveLength(0);
    });

    test('writing creates each object with the definition and a drawn screenshot', async ({ page }) => {
        const state = createState();
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: true });
        expect(state.created).toHaveLength(11);
        expect(seeding.results.map(result => result.id)).toEqual(['id-1', 'id-2', 'id-3', 'id-4', 'id-5', 'id-6', 'id-7', 'id-8', 'id-9', 'id-10', 'id-11']);
        const clockBody = state.created[seeding.results.findIndex(result => result.type === 'clock')].body;
        expect(clockBody).toContain('name="title"');
        expect(clockBody).toContain('Clock');
        expect(clockBody).toContain('"type":"clock"');
        expect(clockBody).toContain('filename="object.png"');
    });

    test('seeding again leaves what is already there alone', async ({ page }) => {
        const state = createState([{ id: 'obj-1', type: 'compass', title: 'Compass' }]);
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: true });
        const compass = seeding.results.find(result => result.type === 'compass');
        expect(compass.action).toBe('skip');
        expect(compass.id).toBe('obj-1');
        expect(state.created).toHaveLength(10);
        expect(state.updated).toHaveLength(0);
    });

    test('updating rewrites an object already in the catalogue, screenshot and all', async ({ page }) => {
        const state = createState([{ id: 'obj-1', type: 'compass', title: 'Compass' }]);
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: true, update: true });
        expect(seeding.results.find(result => result.type === 'compass').action).toBe('update');
        expect(state.updated).toHaveLength(1);
        expect(state.updated[0].path).toBe('/objects/obj-1');
        expect(state.updated[0].body).toContain('"type":"compass"');
        expect(state.thumbnails).toEqual(['/objects/obj-1/thumbnail']);
    });

    test('one object the catalogue refuses does not stop the others', async ({ page }) => {
        const state = createState();
        state.failType = 'compass';
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: true });
        const compass = seeding.results.find(result => result.type === 'compass');
        expect(compass.action).toBe('failed');
        expect(compass.error).toContain('that one is not allowed');
        expect(state.created).toHaveLength(10);
    });

    // A refused update says why: the catalogue answers with the reason it refused, and a seed run
    // that swallowed it left a bare status code to work back from — which is how the compass sat in
    // the catalogue for days with a definition older than the markers it had gained.
    test('an update the catalogue refuses reports the reason it gave', async ({ page }) => {
        const state = createState([{ id: 'obj-1', type: 'compass', title: 'Compass' }]);
        state.failType = 'compass';
        await stubObjectsApi(page, state);
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: true, update: true });
        const compass = seeding.results.find(result => result.type === 'compass');
        expect(compass.action).toBe('failed');
        expect(compass.error).toContain('400');
        expect(compass.error).toContain('is not a registered building block');
        expect(seeding.results.filter(result => result.action === 'create')).toHaveLength(10);
    });

    test('a catalogue that cannot be listed stops a write but not a dry run', async ({ page }) => {
        const state = createState();
        state.listFails = true;
        await stubObjectsApi(page, state);
        await openHarness(page);
        const dryRun = await seed(page, readDefinitions(), { write: false });
        expect(dryRun.catalogueProblem).toContain('Fetch objects failed (500)');
        expect(dryRun.results).toHaveLength(11);
        const writeAttempt = await page.evaluate(async input => {
            const seeder = window.createObjectSeeder(input.apiBase, 'test-token');
            try {
                await seeder.seed(input.definitions, { write: true });
                return 'no error';
            } catch (error) {
                return error.message;
            }
        }, { apiBase: API_BASE, definitions: readDefinitions() });
        expect(writeAttempt).toContain('nothing was written');
        expect(state.created).toHaveLength(0);
    });

    test('every bundled object draws something to be photographed', async ({ page }) => {
        await stubObjectsApi(page, createState());
        await openHarness(page);
        const seeding = await seed(page, readDefinitions(), { write: false, includeDrawing: true });
        for (const result of seeding.results) {
            const drawnElements = result.svg.match(/<(circle|path|line|text|rect|polyline|polygon|ellipse|g)\b/g) ?? [];
            expect(drawnElements.length, result.type).toBeGreaterThan(2);
            expect(result.svg, result.type).not.toContain('r="0"');
        }
    });
});
