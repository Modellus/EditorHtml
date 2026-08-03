const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const DEFINITIONS_DIRECTORY = path.join(__dirname, '..', 'scripts', 'blocks', 'definitions');
const BUNDLE_PATH = path.join(DEFINITIONS_DIRECTORY, 'definitions.generated.js');

function listDefinitionFiles() {
    return fs.readdirSync(DEFINITIONS_DIRECTORY).filter(name => name.endsWith('.json')).sort();
}

// The browser cannot fetch a .json file when the offline build runs from file://, so the
// definitions are delivered as one generated script. The JSON files stay the source of truth
// and this test fails when the generated file no longer matches them.
function renderBundle() {
    const documents = listDefinitionFiles().map(name => JSON.parse(fs.readFileSync(path.join(DEFINITIONS_DIRECTORY, name), 'utf8')));
    return [
        '// Generated from scripts/blocks/definitions/*.json by tests/component-definitions.spec.js.',
        '// Do not edit by hand: change the JSON and run `UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js`.',
        `BlockDefinitionLoader.registerAll(${JSON.stringify(documents, null, 4)});`,
        ''
    ].join('\n');
}

test('the generated definitions bundle matches the JSON files', async () => {
    const bundle = renderBundle();
    if (process.env.UPDATE_DEFINITIONS === '1') {
        fs.writeFileSync(BUNDLE_PATH, bundle);
        return;
    }
    expect(fs.existsSync(BUNDLE_PATH)).toBe(true);
    expect(fs.readFileSync(BUNDLE_PATH, 'utf8')).toBe(bundle);
});

test('every definition file declares a component the registry accepts', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto('/pages/board/index.html');
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    const documents = listDefinitionFiles().map(name => JSON.parse(fs.readFileSync(path.join(DEFINITIONS_DIRECTORY, name), 'utf8')));
    const result = await page.evaluate(documents => documents.map(document => ({
        type: document.type,
        problems: BlockDefinitionLoader.inspect(document),
        registered: BlockRegistry.get(document.type)?.category ?? null,
        buildable: typeof BlockRegistry.get(document.type)?.create === 'function'
    })), documents);
    expect(result).not.toHaveLength(0);
    for (const entry of result) {
        expect(entry.problems, entry.type).toEqual([]);
        expect(entry.registered, entry.type).toBe('component');
        expect(entry.buildable, entry.type).toBe(true);
    }
});
