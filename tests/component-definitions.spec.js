const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The objects this build carries.
//
// They are no longer files in this repository. Which objects the editor ships with is the
// `is_bundled` flag on a catalogue row, and `npm run build:definitions` turns that flag into
// scripts/blocks/definitions/definitions.generated.js — the one script the browser loads, because
// it cannot fetch a .json file when the offline build runs from file://.
//
// So what is left to check here is what the file says rather than where it came from: that it is a
// bundle at all, and that every document in it is one the registry accepts and can build. A bundle
// generated from a catalogue that let something through would otherwise be discovered by a board
// failing to draw.

const BUNDLE_PATH = path.join(__dirname, '..', 'scripts', 'blocks', 'definitions', 'definitions.generated.js');

test('the bundle is a generated file that registers definitions', async () => {
    expect(fs.existsSync(BUNDLE_PATH), 'run `npm run build:definitions`').toBe(true);
    const bundle = fs.readFileSync(BUNDLE_PATH, 'utf8');
    expect(bundle).toContain('BlockDefinitionLoader.registerAll(');
    // Nobody should be editing it by hand, and the header is what says so.
    expect(bundle).toContain('Do not edit by hand');
});

test('every object in the bundle is one the registry accepts and can build', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto('/pages/board/index.html');
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    const result = await page.evaluate(() => [...BlockDefinitionLoader.documents.values()].map(document => ({
        type: document.type,
        problems: BlockDefinitionLoader.inspect(document),
        registered: BlockRegistry.get(document.type)?.category ?? null,
        buildable: typeof BlockRegistry.get(document.type)?.create === 'function'
    })));
    expect(result, 'the bundle carries no objects at all').not.toHaveLength(0);
    for (const entry of result) {
        expect(entry.problems, entry.type).toEqual([]);
        expect(entry.registered, entry.type).toBe('component');
        expect(entry.buildable, entry.type).toBe(true);
    }
});

// The bundle is generated, so the one thing that can go wrong quietly is it being generated from a
// catalogue nobody had flagged anything in. A release carrying no objects would still boot.
test('the bundle carries the objects a release is expected to have', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto('/pages/board/index.html');
    await page.waitForFunction(() => typeof BlockObjectLibrary !== 'undefined', null, { timeout: 15000 });
    const objects = await page.evaluate(() => [...BlockDefinitionLoader.documents.values()]
        .filter(document => (document.tags ?? []).includes('object'))
        .map(document => document.type)
        .sort());
    expect(objects.length, 'a build with no objects in it is a build generated from an empty catalogue').toBeGreaterThan(5);
    expect(objects).toContain('speedometer');
});
