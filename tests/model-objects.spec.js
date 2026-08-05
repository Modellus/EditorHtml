const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

// A catalogue object stands in for anything the editor does not ship with: it is registered for the
// session only, so a model carrying it is the only way a later session can draw it.
const TEST_OBJECT = {
    schemaVersion: '1.0.0',
    type: 'test-dial',
    category: 'component',
    displayName: 'Test dial',
    description: 'A dial used by the model-objects tests.',
    icon: 'fa-light fa-circle',
    tags: ['object'],
    parameters: [
        { id: 'ringColor', label: 'Ring colour', valueType: 'color', defaultValue: '#2563eb' }
    ],
    root: {
        id: 'test-dial',
        type: 'circle',
        properties: { centerX: 60, centerY: 60, radius: 40, fill: 'none', strokeWidth: 4 },
        bindings: { stroke: { parameter: 'ringColor' } }
    }
};

// An object built from another object: the model has to carry both or the outer one draws nothing.
const TEST_PANEL = {
    schemaVersion: '1.0.0',
    type: 'test-panel',
    category: 'component',
    displayName: 'Test panel',
    description: 'A panel that draws the test dial.',
    icon: 'fa-light fa-square',
    tags: ['object'],
    parameters: [],
    root: {
        id: 'test-panel',
        type: 'group',
        children: [
            { id: 'panel-dial', type: 'test-dial', parameters: { ringColor: '#dc2626' } }
        ]
    }
};

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function registerObjects(page, documents) {
    await page.evaluate(documents => {
        for (const document of documents)
            BlockObjectLibrary.registerDocument(document);
    }, documents);
}

async function addComponent(page, componentType, name) {
    await page.evaluate(([type, shapeName]) => modellus.blocks.addComponent(type, shapeName), [componentType, name]);
    await page.waitForTimeout(200);
}

// Everything the session learned about the object is dropped, so what the model carries is all the
// reopened board has to go on.
async function forgetObjects(page, types) {
    await page.evaluate(types => {
        for (const type of types) {
            BlockRegistry.registrations.delete(type);
            BlockDefinitionLoader.documents.delete(type);
        }
    }, types);
}

async function drawnNodeCount(page, shapeName) {
    return await page.evaluate(name => shell.board.shapes.getByName(name)?.contentGroup.childElementCount ?? -1, shapeName);
}

test.describe('model objects', () => {
    test('a model carries the objects it uses and not the built-in ones', async ({ page }) => {
        await setupBoard(page);
        await registerObjects(page, [TEST_OBJECT]);
        await addComponent(page, 'test-dial', 'Dial');
        await addComponent(page, 'analogue-clock', 'Clock');
        const model = await page.evaluate(() => shell.serialize());
        expect(model.objects.map(document => document.type)).toEqual(['test-dial']);
        expect(model.objects[0].root.properties.radius).toBe(40);
    });

    test('a model using only built-in objects carries no objects section', async ({ page }) => {
        await setupBoard(page);
        await addComponent(page, 'analogue-clock', 'Clock');
        const model = await page.evaluate(() => shell.serialize());
        expect(model.objects).toBeUndefined();
    });

    test('an object the session has never seen is registered from the model and drawn', async ({ page }) => {
        await setupBoard(page);
        await registerObjects(page, [TEST_OBJECT]);
        await addComponent(page, 'test-dial', 'Dial');
        const model = await page.evaluate(() => JSON.stringify(shell.serialize()));
        expect(await drawnNodeCount(page, 'Dial')).toBeGreaterThan(0);
        await page.evaluate(() => shell.clear());
        await forgetObjects(page, ['test-dial']);
        expect(await page.evaluate(() => BlockRegistry.has('test-dial'))).toBe(false);
        const withoutObjects = JSON.parse(model);
        delete withoutObjects.objects;
        await page.evaluate(serialized => shell.openModel(serialized), JSON.stringify(withoutObjects));
        await page.waitForTimeout(400);
        expect(await drawnNodeCount(page, 'Dial')).toBe(0);
        await page.evaluate(() => shell.clear());
        await page.evaluate(serialized => shell.openModel(serialized), model);
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => BlockRegistry.has('test-dial'))).toBe(true);
        expect(await drawnNodeCount(page, 'Dial')).toBeGreaterThan(0);
    });

    test('an object built from another object carries both', async ({ page }) => {
        await setupBoard(page);
        await registerObjects(page, [TEST_OBJECT, TEST_PANEL]);
        await addComponent(page, 'test-panel', 'Panel');
        const model = await page.evaluate(() => JSON.stringify(shell.serialize()));
        expect(JSON.parse(model).objects.map(document => document.type).sort()).toEqual(['test-dial', 'test-panel']);
        await page.evaluate(() => shell.clear());
        await forgetObjects(page, ['test-dial', 'test-panel']);
        await page.evaluate(serialized => shell.openModel(serialized), model);
        await page.waitForTimeout(400);
        expect(await drawnNodeCount(page, 'Panel')).toBeGreaterThan(0);
    });

    test('a model may not replace a built-in object', async ({ page }) => {
        await setupBoard(page);
        const displayName = await page.evaluate(() => {
            BlockObjectLibrary.registerAll([{
                schemaVersion: '1.0.0',
                type: 'analogue-clock',
                category: 'component',
                displayName: 'Impostor clock',
                parameters: [],
                root: { id: 'root', type: 'circle', properties: { centerX: 10, centerY: 10, radius: 5 } }
            }]);
            return BlockRegistry.get('analogue-clock').displayName;
        });
        expect(displayName).toBe('Analogue clock');
    });

    test('an unusable object does not stop the rest of the model from opening', async ({ page }) => {
        await setupBoard(page);
        await registerObjects(page, [TEST_OBJECT]);
        await addComponent(page, 'test-dial', 'Dial');
        const model = await page.evaluate(() => shell.serialize());
        model.objects.unshift({ schemaVersion: '1.0.0', type: 'broken', category: 'component' });
        await page.evaluate(() => shell.clear());
        await forgetObjects(page, ['test-dial']);
        await page.evaluate(serialized => shell.openModel(serialized), JSON.stringify(model));
        await page.waitForTimeout(400);
        expect(await drawnNodeCount(page, 'Dial')).toBeGreaterThan(0);
    });

    test('copying a component puts its objects on the clipboard data', async ({ page }) => {
        await setupBoard(page);
        await registerObjects(page, [TEST_OBJECT]);
        await addComponent(page, 'test-dial', 'Dial');
        const clipboardData = await page.evaluate(() => shell.board.shapes.getByName('Dial').getClipboardData());
        expect(clipboardData.objects.map(document => document.type)).toEqual(['test-dial']);
        const drawn = await page.evaluate(clipboard => {
            BlockRegistry.registrations.delete('test-dial');
            BlockDefinitionLoader.documents.delete('test-dial');
            BaseShape.pasteShapeData(shell.board, null, clipboard);
            return shell.board.shapes.getByName('Dial').contentGroup.childElementCount;
        }, clipboardData);
        expect(drawn).toBeGreaterThan(0);
    });
});
