const { test, expect } = require('@playwright/test');
const { DIAL, openShapeEditor, SHAPE_EDITOR_URL } = require('./shapeEditorHost');

// The workbench in the block shape editor: the object stood on a model rather than on nothing, at
// three sizes and in five presets, what its formulas worked out, and the checks it has to keep
// passing.
//
// The object written here is a dial whose needle is turned by a formula, because that is the shape
// of the problem: until the test bed existed, a definition was compiled against a calculator
// holding no model, so a dial reading a term it had never been given still drew "successfully"
// with every radius at zero.

async function openObjectEditor(page) {
    await openShapeEditor(page, { definition: null, model: null });
}

async function writeDefinition(page, definition = DIAL) {
    await page.evaluate(text => window.shapeEditorApp.setDefinition(text), JSON.stringify(definition, null, 2));
    await page.waitForTimeout(400);
}

// The object pointed at a term the model holds, which is the only way its formulas mean anything.
async function standOnModel(page, model = 'v=64', parameters = { valueVariable: 'v', maximum: 160 }) {
    await page.fill('#object-testbed-model', model);
    await page.fill('#object-testbed-parameters', JSON.stringify(parameters));
    await page.waitForTimeout(700);
}

function readLocal(page, key) {
    return page.evaluate(key => {
        const row = [...document.querySelectorAll('#object-inspect-host [data-locals] tr')]
            .find(row => row.querySelector('.object-inspect-key')?.textContent === key);
        return row?.querySelector('.object-inspect-value')?.textContent ?? null;
    }, key);
}

test.describe('the workbench in the block shape editor', () => {
    test('the test bed stands the object on a model, and the formulas follow it', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await page.click('[data-object-tab="inspect"]');

        // Pointed at a term nothing holds, the dial reads no number at all — which is exactly what
        // the catalogue used to publish without comment.
        expect(await readLocal(page, 'value')).not.toBe('64');

        await standOnModel(page);
        expect(await readLocal(page, 'value')).toBe('64');
        expect(await readLocal(page, 'ratio')).toBe('0.4');
        expect(await readLocal(page, 'sweepAngle')).toBe('108');
        expect(await readLocal(page, 'w')).toBe('180');

        // Changing the row, the size or the preset is the same gesture.
        await page.fill('#object-testbed-width', '80');
        await page.waitForTimeout(600);
        expect(await readLocal(page, 'w')).toBe('80');
        expect(await readLocal(page, 'r')).toBe('34');
    });

    test('the object is drawn on the model and posed for its catalogue card, side by side', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);
        expect(await page.locator('#object-testbed-host svg').count()).toBe(1);
        expect(await page.locator('.object-preview-drawing svg').count()).toBe(1);

        // The card is posed by the definition, not by the test bed, because the card is what gets
        // published: the two drawings differ precisely because the test bed is holding a model.
        const turned = await page.evaluate(() => ({
            testBed: document.querySelector('#object-testbed-host [data-source-id="needle"]')?.getAttribute('transform'),
            card: document.querySelector('.object-preview-drawing [data-source-id="needle"]')?.getAttribute('transform')
        }));
        expect(turned.testBed).toContain('rotate(108');
        expect(turned.card).toContain('rotate(0');
    });

    test('three sizes and five presets are always on screen', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);

        expect(await page.evaluate(() => [...document.querySelectorAll('#object-size-strip figcaption')].map(node => node.textContent)))
            .toEqual(['80 px', '180 px', '480 px']);
        expect(await page.evaluate(() => [...document.querySelectorAll('#object-preset-strip figcaption')].map(node => node.textContent)))
            .toEqual(['standard', 'minimal', 'scientific', 'classroom', 'high-contrast']);

        // Each is compiled afresh at its own size rather than scaled: a drawing worked out small is
        // not the same thing as a drawing shrunk, which is the whole reason to show three.
        const radii = await page.evaluate(() => [...document.querySelectorAll('#object-size-strip [data-source-id="face"]')].map(node => Number(node.getAttribute('r'))));
        expect(radii).toEqual([34, 84, 234]);
        expect(await page.locator('#object-preset-strip svg').count()).toBe(5);
    });

    test('a node is named by the id the document gave it, and marked in the drawing', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);
        await page.click('[data-object-tab="inspect"]');

        const names = await page.evaluate(() => [...document.querySelectorAll('.object-inspect-node .object-inspect-id')].map(node => node.textContent));
        expect(names).toContain('#face');
        expect(names).toContain('#needle');

        await page.click('.object-inspect-node:has(.object-inspect-id:text-is("#needle"))');
        await page.waitForTimeout(300);
        const marked = await page.evaluate(() => {
            const rectangle = document.querySelector('#object-testbed-host [data-inspect-highlight]');
            return rectangle ? Number(rectangle.getAttribute('width')) : null;
        });
        expect(marked).toBeGreaterThan(0);
    });

    test('a check is taken from where the object is standing, and passes there', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);

        await page.click('[data-object-tab="checks"]');
        await page.click('#object-checks-capture');
        await page.waitForTimeout(600);

        // What it recorded is everything the test bed was holding — the parameter values included,
        // or it could never draw again what it just saw.
        const captured = await page.evaluate(() => JSON.parse(document.getElementById('object-checks-editor').value));
        expect(captured.type).toBe('test-dial');
        expect(captured.checks).toHaveLength(1);
        expect(captured.checks[0].given.model).toBe('v=64');
        expect(captured.checks[0].given.parameters).toEqual({ valueVariable: 'v', maximum: 160 });
        expect(captured.checks[0].expect.some(entry => entry.markup)).toBe(true);

        await expect(page.locator('.object-check-passed')).toHaveCount(1);
        expect(await page.textContent('#object-checks-score')).toBe('1/1');
    });

    test('a check that is wrong about the object fails, and says what it reads instead', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);
        await page.click('[data-object-tab="checks"]');

        await page.evaluate(() => {
            const editor = document.getElementById('object-checks-editor');
            editor.value = JSON.stringify({
                type: 'test-dial',
                checks: [
                    { name: 'the needle turns to 108 degrees', given: { model: 'v=64', parameters: { valueVariable: 'v', maximum: 160 } }, expect: [{ local: 'sweepAngle', equals: 108 }] },
                    { name: 'a wrong one, on purpose', given: { model: 'v=64', parameters: { valueVariable: 'v', maximum: 160 } }, expect: [{ local: 'ratio', equals: 0.9 }] }
                ]
            }, null, 2);
            editor.dispatchEvent(new Event('input'));
        });
        await page.waitForTimeout(600);

        expect(await page.textContent('#object-checks-score')).toBe('1/2');
        await expect(page.locator('.object-check-passed')).toHaveCount(1);
        await expect(page.locator('.object-check-failed')).toHaveCount(1);
        expect(await page.textContent('.object-check-failed .object-check-why')).toContain('it reads 0.4');
    });

    test('the checks an object was given are still there when its editor is opened again', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page);
        await standOnModel(page);
        await page.click('[data-object-tab="checks"]');
        await page.click('#object-checks-capture');
        await page.waitForTimeout(600);

        // Kept against the object's own type while it is being written, so they outlive the popup.
        expect(await page.evaluate(() => {
            const stored = JSON.parse(localStorage.getItem('mdl.catalog.checks.test-dial'));
            return { type: stored.type, count: stored.checks.length, model: stored.checks[0].given.model };
        })).toEqual({ type: 'test-dial', count: 1, model: 'v=64' });

        await page.goto(SHAPE_EDITOR_URL);
        await page.waitForSelector('#object-definition-editor');
        await page.waitForFunction(() => window.shapeEditorApp?.workbench);
        await writeDefinition(page);
        await page.click('[data-object-tab="checks"]');
        await page.waitForTimeout(400);
        const reopened = await page.evaluate(() => JSON.parse(document.getElementById('object-checks-editor').value || '{"checks":[]}'));
        expect(reopened.checks).toHaveLength(1);
        expect(reopened.checks[0].given.model).toBe('v=64');
    });

    test('an unusable definition is reported rather than drawn', async ({ page }) => {
        await openObjectEditor(page);
        await writeDefinition(page, Object.assign({}, DIAL, {
            root: { id: 'test-dial', type: 'not-a-block', properties: {} }
        }));
        await page.click('[data-object-tab="inspect"]');
        const problems = await page.textContent('.object-inspect-problems');
        expect(problems).toContain('not-a-block');
        expect(await page.locator('#object-testbed-host svg').count()).toBe(0);
        expect(await page.textContent('#object-size-strip')).toContain('Drawn once the definition is usable');
    });
});
