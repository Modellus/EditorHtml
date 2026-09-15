const { test, expect } = require('@playwright/test');
const { openShapeEditor } = require('./shapeEditorHost');

// Changing an object from the panel that reads it.
//
// The workbench already showed what every local worked out to and what every node was drawn from.
// What it could not do was change any of it: an author who could see that the needle was turning
// twice as far as it should still had to find that formula among thirty in the JSON beside it and
// edit the text. These are the rows doing the editing — one named change to the document each,
// applied to the same text the object is compiled, checked and published from, and undoable.

async function openEditorOnTheDial(page) {
    await openShapeEditor(page);
    await page.click('[data-object-tab="inspect"]');
}

function readLocal(page, key) {
    return page.evaluate(key => {
        const row = [...document.querySelectorAll('#object-inspect-host [data-locals] tr')]
            .find(row => row.querySelector('.object-inspect-key')?.textContent === key);
        return row?.querySelector('.object-inspect-value')?.textContent ?? null;
    }, key);
}

function readDefinition(page) {
    return page.evaluate(() => document.getElementById('object-definition-editor').value);
}

function readDrawing(page) {
    return page.evaluate(() => document.getElementById('object-testbed-host')?.innerHTML ?? '');
}

// One row, one edit: click what it shows, type over it, commit. The panel is redrawn from the
// document afterwards, so waiting for the row to close is waiting for the whole object to follow.
async function editCell(page, selector, text) {
    await page.click(selector);
    const input = page.locator(`${selector} input`);
    await input.waitFor();
    await input.fill(text);
    await input.press('Enter');
    await page.waitForTimeout(500);
}

async function selectNode(page, documentId) {
    await page.click(`.object-inspect-node[data-document-id="${documentId}"]`);
    await page.waitForSelector('.object-node-detail-head');
}

test.describe('editing an object where it is read', () => {
    test('a formula changed in its row turns the drawing', async ({ page }) => {
        await openEditorOnTheDial(page);
        expect(await readLocal(page, 'sweepAngle')).toBe('108');
        expect(await readDrawing(page)).toContain('rotate(108');

        await editCell(page, '[data-edit="local-source"][data-id="sweepAngle"]', 'ratio\\cdot180');

        expect(await readLocal(page, 'sweepAngle')).toBe('72');
        expect(await readDrawing(page)).toContain('rotate(72');
        // The definition is what was changed, not a copy of it held beside the drawing: it is the
        // text the object is published from.
        expect(await readDefinition(page)).toContain('ratio\\\\cdot180');
    });

    test('the change is one undo away, and one redo back', async ({ page }) => {
        await openEditorOnTheDial(page);
        await editCell(page, '[data-edit="local-source"][data-id="sweepAngle"]', 'ratio\\cdot180');
        expect(await readLocal(page, 'sweepAngle')).toBe('72');

        await page.click('#object-definition-undo');
        await page.waitForTimeout(400);
        expect(await readLocal(page, 'sweepAngle')).toBe('108');
        expect(await readDefinition(page)).toContain('ratio\\\\cdot270');

        await page.click('#object-definition-redo');
        await page.waitForTimeout(400);
        expect(await readLocal(page, 'sweepAngle')).toBe('72');

        // Nothing was undone before anything was done.
        await page.click('#object-definition-undo');
        await page.waitForTimeout(400);
        await expect(page.locator('#object-definition-undo')).toBeDisabled();
    });

    // The rename the loader would otherwise report as a formula reading a name nobody declared —
    // which is how a rename made by hand ends up reading a model term of the old name instead.
    test('renaming a local carries everything that read it', async ({ page }) => {
        await openEditorOnTheDial(page);
        await editCell(page, '[data-edit="local-rename"][data-id="ratio"]', 'fraction');

        expect(await readLocal(page, 'fraction')).toBe('0.4');
        expect(await readLocal(page, 'sweepAngle')).toBe('108');
        expect(await readDefinition(page)).toContain('fraction\\\\cdot270');
        await expect(page.locator('.object-inspect-clean')).toBeVisible();
    });

    test('a property is changed on the part it is drawn on', async ({ page }) => {
        await openEditorOnTheDial(page);
        await selectNode(page, 'face');
        await editCell(page, '[data-edit="node-property"][data-node-id="face"][data-key="fill"]', '#2f7a5a');
        expect(await readDrawing(page)).toContain('#2f7a5a');
    });

    test('a binding is pointed at a local that did not exist a moment ago', async ({ page }) => {
        await openEditorOnTheDial(page);
        await page.click('[data-new="local"]');
        await page.fill('.object-inspect-new [data-new-name]', 'smallRadius');
        await page.fill('.object-inspect-new [data-new-value]', 'r\\cdot0.5');
        await page.press('.object-inspect-new [data-new-value]', 'Enter');
        await page.waitForTimeout(500);
        expect(await readLocal(page, 'smallRadius')).toBe('42');

        await selectNode(page, 'face');
        await editCell(page, '[data-edit="node-binding"][data-node-id="face"][data-key="radius"]', 'smallRadius');
        expect(await readDrawing(page)).toContain('r="42"');
        await expect(page.locator('.object-inspect-clean')).toBeVisible();
    });

    test('a node is removed, and the drawing loses it', async ({ page }) => {
        await openEditorOnTheDial(page);
        expect(await readDrawing(page)).toContain('rotate(108');
        await selectNode(page, 'needle');
        await page.click('.object-node-remove');
        await page.waitForTimeout(500);
        expect(await readDrawing(page)).not.toContain('rotate(108');
        expect(await readDefinition(page)).not.toContain('"needle"');
    });

    test('a condition decides whether a node is drawn at all', async ({ page }) => {
        await openEditorOnTheDial(page);
        await selectNode(page, 'needle');
        await editCell(page, '[data-edit="node-when"][data-node-id="needle"]', 'false');
        expect(await readDrawing(page)).not.toContain('rotate(108');

        await page.click('#object-definition-undo');
        await page.waitForTimeout(400);
        expect(await readDrawing(page)).toContain('rotate(108');
    });

    // A refused edit has to leave the object exactly as it was: half an edit applied and then
    // reported would be worse than no editing at all.
    test('an edit the document cannot take is refused, and nothing changes', async ({ page }) => {
        await openEditorOnTheDial(page);
        const before = await readDefinition(page);
        await selectNode(page, 'face');
        await editCell(page, '[data-edit="node-binding"][data-node-id="face"][data-key="radius"]', '{"parameter":');
        expect(await readDefinition(page)).toBe(before);
        await expect(page.locator('#status')).toContainText('not valid JSON');

        await editCell(page, '[data-edit="local-rename"][data-id="ratio"]', 'maximum');
        expect(await readDefinition(page)).toBe(before);
        await expect(page.locator('#status')).toContainText('already the name');
    });

    // An empty text area is no place to start an object from, and the fifteen the editor ships with
    // are the worked examples. Starting from one is a fork, because a catalogue object cannot take
    // the type of a shipped one — and because what is published afterwards is a new object.
    // The refusal that used to stand here said "piano is an object the editor ships with, so a
    // catalogue object cannot take that type" — which made the fifteen shapes people actually use
    // the only ones nobody could fix. Which objects a release carries is a flag in the catalogue
    // now, and a bundled shape is edited exactly like any other.
    test('an object this release ships with is edited like any other', async ({ page }) => {
        await openShapeEditor(page, { definition: null, model: null });
        await page.selectOption('#object-definition-start', 'speedometer');
        await page.waitForTimeout(600);
        // Its own type, not a fork of it: this is the shape itself being edited.
        await page.evaluate(() => {
            const document = JSON.parse(window.shapeEditorApp.definitionElement.value);
            document.type = 'speedometer';
            document.displayName = 'Speedometer';
            window.shapeEditorApp.setDefinition(JSON.stringify(document, null, 4));
        });
        await page.waitForTimeout(500);
        await page.click('[data-object-tab="inspect"]');
        await expect(page.locator('.object-inspect-clean')).toBeVisible();
        expect(await readLocal(page, 'needleAngle')).not.toBeNull();

        // And it can be changed, which is the whole point.
        await editCell(page, '[data-edit="local-source"][data-id="needleAngle"]', '0');
        expect(await readLocal(page, 'needleAngle')).toBe('0');
        await expect(page.locator('.object-inspect-clean')).toBeVisible();
    });

    test('an object can be started from one the editor ships with', async ({ page }) => {
        await openEditorOnTheDial(page);
        await page.selectOption('#object-definition-start', 'speedometer');
        await page.waitForTimeout(700);

        const definition = JSON.parse(await readDefinition(page));
        expect(definition.type).toBe('my-speedometer');
        expect(definition.displayName).toContain('copy');
        expect(await readLocal(page, 'needleAngle')).not.toBeNull();
        await expect(page.locator('.object-inspect-clean')).toBeVisible();

        // And it is still the dial's own definition one undo away.
        await page.click('#object-definition-undo');
        await page.waitForTimeout(500);
        expect(JSON.parse(await readDefinition(page)).type).toBe('test-dial');
    });
});
