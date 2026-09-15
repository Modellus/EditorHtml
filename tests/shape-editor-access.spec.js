const { test, expect } = require('@playwright/test');
const { CATALOG_URL, SHAPE_EDITOR_URL, DIAL, stubApi, signIn } = require('./shapeEditorHost');

// Two places, two jobs, and who may reach the second one.
//
// The catalogue's popup publishes an object: a title, a description, the JSON and the card it will
// be shown as. The block shape editor builds one, and it is a page because a workbench needs one.
// The way from the first to the second belongs to maintenance — an object goes into a catalogue
// everyone draws from, so who may write one is the same question as who may write a sample — and
// the page asks again rather than trusting a button that was merely hidden.

// The catalogue's form for an object. It is only ever opened on one that exists: a shape has no
// card until it has a drawing, so adding one goes straight to the editor instead.
async function openObjectPopup(page, { maintenance = true } = {}) {
    await stubApi(page, { maintenance });
    await signIn(page);
    await page.goto(CATALOG_URL);
    await page.waitForFunction(() => typeof BlockRegistry !== 'undefined' && BlockRegistry.has('clock'), null, { timeout: 15000 });
    await page.waitForSelector('.dx-treeview-item');
    await page.evaluate(() => window.modelsApp.showObjectPopup({ id: 'object-1', title: 'Test dial', description: null, is_bundled: false }));
    await page.waitForSelector('#object-title-editor');
}

test.describe('the catalogue popup and the editor behind it', () => {
    test('the popup edits the card, and the workbench is nowhere in it', async ({ page }) => {
        await openObjectPopup(page);
        await expect(page.locator('#object-title-editor')).toBeVisible();
        await expect(page.locator('#object-save-button')).toBeVisible();
        // Everything to do with the document lives on the page now, and none of it is in here.
        await expect(page.locator('#object-definition-editor')).toHaveCount(0);
        await expect(page.locator('#object-testbed-model')).toHaveCount(0);
        await expect(page.locator('.object-workbench')).toHaveCount(0);
    });

    test('only maintenance is shown the way through to the editor', async ({ page }) => {
        await openObjectPopup(page, { maintenance: true });
        await expect(page.locator('#object-open-shape-editor-button')).toBeVisible();
    });

    // The Upload menu the popup is added from is maintenance's already, so the only way an account
    // without it reaches this popup at all is by editing an object of its own — which is the way it
    // is opened here.
    test('an account that is not maintenance is not shown it', async ({ page }) => {
        await stubApi(page, { maintenance: false });
        await signIn(page);
        await page.goto(CATALOG_URL);
        await page.waitForSelector('.dx-treeview-item');
        await page.evaluate(() => window.modelsApp.showObjectPopup({ id: 'object-1', title: 'Test dial' }));
        await page.waitForSelector('#object-title-editor');
        await expect(page.locator('#object-save-button')).toBeVisible();
        await expect(page.locator('#object-open-shape-editor-button')).toHaveCount(0);
    });

    // A page is a URL, and a URL is something anyone can be sent.
    test('and is refused by the editor itself, not merely by the button', async ({ page }) => {
        await stubApi(page, { maintenance: false });
        await signIn(page);
        await page.goto(SHAPE_EDITOR_URL);
        await expect(page.locator('.shape-editor-refused')).toBeVisible();
        await expect(page.locator('#object-definition-editor')).toHaveCount(0);
        await expect(page.locator('.shape-editor-bar')).toHaveCount(0);
    });

    // The button carries the object with it, so the editor opens on the shape the card is for.
    test('the button opens the editor on the object the card is for', async ({ page }) => {
        await openObjectPopup(page);
        await page.click('#object-open-shape-editor-button');

        await page.waitForSelector('#object-definition-editor');
        await page.waitForFunction(() => window.shapeEditorApp?.workbench);
        expect(new URL(page.url()).pathname).toBe(SHAPE_EDITOR_URL);
        expect(new URL(page.url()).searchParams.get('object_id')).toBe('object-1');
        expect(JSON.parse(await page.inputValue('#object-definition-editor')).type).toBe('test-dial');
        await expect(page.locator('#object-testbed-model')).toBeVisible();
    });

    test('the editor opens on the object it was sent to, and saves it back', async ({ page }) => {
        const saved = [];
        await stubApi(page);
        await signIn(page);
        await page.route('**/objects/object-1', route => {
            if (route.request().method() !== 'PUT')
                return route.fulfill({ json: { id: 'object-1', title: 'Test dial', description: 'A dial.' } });
            saved.push(JSON.parse(route.request().postData()));
            return route.fulfill({ json: { id: 'object-1' } });
        });
        await page.goto(`${SHAPE_EDITOR_URL}?object_id=object-1`);
        await page.waitForFunction(() => window.shapeEditorApp?.workbench);
        await expect(page.locator('#shape-editor-title')).toHaveValue('Test dial');
        expect(JSON.parse(await page.inputValue('#object-definition-editor')).type).toBe('test-dial');

        await page.click('#shape-editor-save');
        await expect(page.locator('#status')).toContainText('Object saved.');
        expect(saved).toHaveLength(1);
        expect(saved[0].definition.type).toBe('test-dial');
        // The description the popup wrote is not lost by an editor that never showed it.
        expect(saved[0].description).toBe('A dial.');
    });

    // The path from nothing to a catalogue entry: start from one the editor ships with, give it a
    // name, publish. What it publishes is a new object, and from then on the page is editing that
    // one rather than making another.
    test('an object started from a shipped one is published as a new object, once', async ({ page }) => {
        const published = [];
        await stubApi(page);
        await signIn(page);
        await page.route('**/objects', route => {
            if (route.request().method() !== 'POST')
                return route.fulfill({ json: { items: [], total: 0 } });
            published.push(route.request().postData());
            return route.fulfill({ json: { id: 'object-new', title: 'My speedometer' } });
        });
        await page.goto(SHAPE_EDITOR_URL);
        await page.waitForFunction(() => window.shapeEditorApp?.workbench);
        await expect(page.locator('#shape-editor-save')).toHaveText('Publish');

        await page.selectOption('#object-definition-start', 'speedometer');
        await page.waitForTimeout(600);
        await page.fill('#shape-editor-title', 'My speedometer');
        await page.click('#shape-editor-save');
        await expect(page.locator('#status')).toContainText('Object published.');

        expect(published).toHaveLength(1);
        expect(published[0]).toContain('my-speedometer');
        expect(new URL(page.url()).searchParams.get('object_id')).toBe('object-new');
        await expect(page.locator('#shape-editor-save')).toHaveText('Save');
    });

    test('an object without a title is not published', async ({ page }) => {
        let posts = 0;
        await stubApi(page);
        await signIn(page);
        await page.route('**/objects', route => {
            if (route.request().method() === 'POST')
                posts++;
            return route.fulfill({ json: { items: [], total: 0 } });
        });
        await page.goto(SHAPE_EDITOR_URL);
        await page.waitForFunction(() => window.shapeEditorApp?.workbench);
        await page.selectOption('#object-definition-start', 'speedometer');
        await page.waitForTimeout(600);
        await page.click('#shape-editor-save');
        await expect(page.locator('#status')).toContainText('needs a title');
        expect(posts).toBe(0);
    });

    test('an object that is not usable is not saved', async ({ page }) => {
        let saves = 0;
        await stubApi(page);
        await signIn(page);
        await page.route('**/objects/object-1', route => {
            if (route.request().method() === 'PUT')
                saves++;
            return route.fulfill({ json: { id: 'object-1', title: 'Test dial', description: null } });
        });
        await page.goto(`${SHAPE_EDITOR_URL}?object_id=object-1`);
        await page.waitForFunction(() => document.getElementById('object-definition-editor')?.value.includes('test-dial'));
        await page.evaluate(text => window.shapeEditorApp.setDefinition(text),
            JSON.stringify(Object.assign({}, DIAL, { root: { id: 'test-dial', type: 'not-a-block' } }), null, 2));
        await page.waitForTimeout(400);
        await page.click('#shape-editor-save');
        await expect(page.locator('#status')).toContainText('has to be usable');
        expect(saves).toBe(0);
    });
});
