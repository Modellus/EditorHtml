const { test, expect } = require('@playwright/test');
const { API_GLOB } = require('./apiHost');

// The player's start, end and step are model properties, and a model opened from the catalogue is
// kept by the auto save and by the room the collaborators share. A value typed into one of the
// player's menus is a change like any other: it is saved with the model, and the room is told, or
// the next snapshot the room hands out - after a reconnection, or to whoever joins next - would
// bring the old value back.

const MODEL_ID = '00000000-0000-4000-8000-000000000001';

function makeToken() {
    const payload = Buffer.from(JSON.stringify({ sub: 'test', exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
    return `a.${payload}.b`;
}

async function openBoardWithModel(page) {
    const token = makeToken();
    const definition = require('fs').readFileSync('resources/models/components-demo.json', 'utf8');
    await page.addInitScript(token => {
        localStorage.setItem('mp.session', JSON.stringify({ token, userId: 'test' }));
        localStorage.setItem('mp.user', JSON.stringify({ id: 'test', name: 'Test' }));
    }, token);
    await page.route(API_GLOB, route => {
        const url = route.request().url();
        if (url.includes(`/models/${MODEL_ID}`) && route.request().method() === 'GET')
            return route.fulfill({ json: { id: MODEL_ID, title: 'Loaded', user_id: 'test', is_public: 0, definition } });
        return route.fulfill({ json: {} });
    });
    await page.goto(`/pages/board/index.html?model_id=${MODEL_ID}`);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
}

async function typeEnd(page, text) {
    await page.evaluate(() => shell.bottomToolbar._endDropdownElement.dxDropDownButton('instance').open());
    await page.waitForTimeout(600);
    const field = page.locator('.mdl-player-range-dropdown math-field.mdl-numeric-math-field').first();
    await expect(field).toBeVisible();
    await field.click();
    await page.waitForTimeout(200);
    await field.evaluate(node => node.executeCommand('selectAll'));
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
}

test('an end typed in the player menu is saved with the model', async ({ page }) => {
    await openBoardWithModel(page);
    await page.evaluate(() => {
        window.savedDefinitions = [];
        shell.session.modelsApiClient.saveModel = (id, payload) => {
            window.savedDefinitions.push(payload.definition);
            return Promise.resolve({});
        };
    });
    await typeEnd(page, '100');
    expect(await page.evaluate(() => shell.properties.independent.end)).toBe(100);
    await page.evaluate(() => shell.autoSaveModel());
    const saved = await page.evaluate(() => window.savedDefinitions.map(definition => JSON.parse(definition).properties.independent.end));
    expect(saved).toEqual([100]);
});

test('an end typed in the player menu reaches the room the collaborators share', async ({ page }) => {
    await openBoardWithModel(page);
    await page.evaluate(() => {
        shell.setupCollab('collab-model');
        window.sentOps = [];
        window.sentSnapshots = [];
        shell.collabCoordinator.channel = {
            sendOp: op => window.sentOps.push(op),
            sendSnapshot: model => window.sentSnapshots.push(model),
            destroy: () => {}
        };
    });
    await typeEnd(page, '100');
    const sent = await page.evaluate(() => ({
        properties: window.sentOps.filter(op => op.type === 'setModelProperties').map(op => op.properties.independent.end),
        snapshots: window.sentSnapshots.map(model => model.properties.independent.end)
    }));
    expect(sent.properties).toEqual([100]);
    expect(sent.snapshots).toEqual([100]);
});
