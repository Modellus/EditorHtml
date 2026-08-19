const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

// An object the editor does not ship with: it stands for what the catalogue will deliver, and for
// what a model carries with it. Tagged "object", so the picker is meant to list it.
const SESSION_OBJECT = {
    schemaVersion: '1.0.0',
    type: 'test-ring',
    category: 'component',
    displayName: 'Test ring',
    description: 'A ring registered for this session only.',
    icon: 'fa-light fa-circle',
    tags: ['object', 'ring'],
    parameters: [],
    root: {
        id: 'test-ring',
        type: 'circle',
        properties: { centerX: 60, centerY: 60, radius: 40, fill: 'none', stroke: '#2563eb', strokeWidth: 6 }
    }
};

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

async function closePickerWithEscape(page) {
    await page.keyboard.press('Escape');
    await page.waitForSelector('.mdl-object-picker-popup', { state: 'hidden' });
}

async function readCards(page) {
    return await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-object-picker-card')).map(card => ({
        key: card.dataset.objectKey,
        title: card.querySelector('.mdl-catalog-data-title').textContent,
        description: card.querySelector('.mdl-object-picker-description').textContent,
        previewNodeCount: card.querySelector('.mdl-object-picker-preview > svg')?.childElementCount ?? 0
    })));
}

test.describe('object picker', () => {
    test('lists every object with a drawn preview and a description', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        const cards = await readCards(page);
        expect(cards.map(card => card.key)).toEqual([
            'calculator', 'circular-gauge', 'clock', 'compass', 'mouse-tracker', 'orbit-system', 'rotating-vector', 'speedometer', 'steering-wheel', 'thermometer', 'BlockChartShape'
        ]);
        for (const card of cards.filter(entry => entry.key !== 'BlockChartShape')) {
            expect(card.previewNodeCount, card.key).toBeGreaterThan(0);
            expect(card.description.length, card.key).toBeGreaterThan(0);
        }
    });

    test('the preview parameters a definition declares are the ones drawn', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        const speedometerPreview = await page.evaluate(() => document.querySelector('[data-object-key="speedometer"] svg').textContent);
        expect(speedometerPreview).toContain('64 km/h');
    });

    test('searching narrows the list and reports when nothing matches', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        await page.fill('.mdl-char-picker-search-input', 'gauge');
        await page.waitForTimeout(200);
        expect((await readCards(page)).map(card => card.key)).toEqual(['circular-gauge', 'speedometer']);
        await page.fill('.mdl-char-picker-search-input', 'zzqqxx');
        await page.waitForTimeout(200);
        expect(await readCards(page)).toEqual([]);
        expect(await page.textContent('.mdl-catalog-data-status')).toBe('No object matches that search.');
    });

    test('choosing an object closes the picker and arms it for drawing', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        await page.click('[data-object-key="compass"]');
        await page.waitForTimeout(300);
        const armed = await page.evaluate(() => ({
            armed: shell.shapeDrawController.isArmed(),
            shapeType: shell.shapeDrawController.pendingShapeType,
            componentType: BlockObjects.getComponentType(shell.shapeDrawController.pendingShapeProperties.definition),
            buttonHighlighted: document.getElementById('components-button').classList.contains('mdl-draw-armed')
        }));
        expect(armed).toEqual({ armed: true, shapeType: 'ComponentShape', componentType: 'compass', buttonHighlighted: true });
        expect(await page.evaluate(() => shell.objectPicker.popupInstance.option('visible'))).toBe(false);
    });

    test('the chart is placed as its own shape rather than as a component', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        await page.click('[data-object-key="BlockChartShape"]');
        await page.waitForTimeout(300);
        const pending = await page.evaluate(() => ({
            shapeType: shell.shapeDrawController.pendingShapeType,
            properties: shell.shapeDrawController.pendingShapeProperties
        }));
        expect(pending).toEqual({ shapeType: 'BlockChartShape', properties: null });
    });

    test('an object registered for the session is listed beside the built-in ones', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(document => BlockObjectLibrary.registerDocument(document), SESSION_OBJECT);
        await openPicker(page);
        const cards = await readCards(page);
        const ring = cards.find(card => card.key === 'test-ring');
        expect(ring.title).toBe('Test ring');
        expect(ring.description).toBe('A ring registered for this session only.');
        expect(ring.previewNodeCount).toBeGreaterThan(0);
        await page.click('[data-object-key="test-ring"]');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => BlockObjects.getComponentType(shell.shapeDrawController.pendingShapeProperties.definition))).toBe('test-ring');
    });

    test('an object registered while the picker was closed is there when it reopens', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        expect((await readCards(page)).some(card => card.key === 'test-ring')).toBe(false);
        await closePickerWithEscape(page);
        await page.evaluate(document => BlockObjectLibrary.registerDocument(document), SESSION_OBJECT);
        await openPicker(page);
        expect((await readCards(page)).some(card => card.key === 'test-ring')).toBe(true);
    });

    test('escape closes the picker and reopening keeps the search from last time', async ({ page }) => {
        await setupBoard(page);
        await openPicker(page);
        await page.fill('.mdl-char-picker-search-input', 'compass');
        await page.waitForTimeout(200);
        await closePickerWithEscape(page);
        expect(await page.evaluate(() => shell.objectPicker.popupInstance.option('visible'))).toBe(false);
        await openPicker(page);
        expect(await page.inputValue('.mdl-char-picker-search-input')).toBe('compass');
        expect((await readCards(page)).map(card => card.key)).toEqual(['compass']);
    });
});
