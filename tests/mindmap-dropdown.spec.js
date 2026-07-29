const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function openMindMapDropdown(page) {
    await page.evaluate(() => $('#mindmap-button').dxDropDownButton('instance').open());
    await page.waitForTimeout(400);
}

test.describe('Mind map dropdown', () => {
    test('the dropdown lists the five mind map shapes', async ({ page }) => {
        await setupEditor(page);
        await openMindMapDropdown(page);
        const labels = await page.$$eval('.mdl-shape-overlay-popup .mdl-dropdown-list-label', elements => elements.map(element => element.textContent));
        expect(labels).toEqual(['Bubble', 'Rectangle', 'Circle', 'Line', 'Connector']);
    });

    test('picking a shape arms draw mode and highlights the dropdown', async ({ page }) => {
        await setupEditor(page);
        await openMindMapDropdown(page);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:has-text("Bubble")');
        await page.waitForTimeout(200);
        const armed = await page.evaluate(() => ({
            svgClass: document.getElementById('svg').classList.contains('shape-draw-mode'),
            buttonClass: document.getElementById('mindmap-button').classList.contains('mdl-draw-armed'),
            pendingType: shell.shapeDrawController.pendingShapeType,
            cursor: getComputedStyle(document.getElementById('svg')).cursor,
            iconWeight: getComputedStyle(document.querySelector('#mindmap-button .dx-icon')).fontWeight
        }));
        expect(armed.svgClass).toBe(true);
        expect(armed.buttonClass).toBe(true);
        expect(armed.pendingType).toBe('MindMapBubbleShape');
        expect(armed.cursor).toBe('crosshair');
        expect(armed.iconWeight).toBe('900');
    });

    test('the line and the connector entries seed different tip defaults', async ({ page }) => {
        await setupEditor(page);
        await openMindMapDropdown(page);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:has-text("Line")');
        await page.waitForTimeout(200);
        const line = await page.evaluate(() => shell.shapeDrawController.pendingShapeProperties);
        expect(line).toEqual({ startTipType: 'none', endTipType: 'none', routing: 'straight' });
        await openMindMapDropdown(page);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:has-text("Connector")');
        await page.waitForTimeout(200);
        const connector = await page.evaluate(() => ({
            properties: shell.shapeDrawController.pendingShapeProperties,
            name: shell.shapeDrawController.pendingShapeName
        }));
        expect(connector.properties).toEqual({ startTipType: 'none', endTipType: 'arrow', routing: 'curved' });
        expect(connector.name).toBe('Connector');
    });

    test('escape cancels mind map draw mode', async ({ page }) => {
        await setupEditor(page);
        await openMindMapDropdown(page);
        await page.click('.mdl-shape-overlay-popup .dx-list-item:has-text("Circle")');
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        const armed = await page.evaluate(() => ({
            svgClass: document.getElementById('svg').classList.contains('shape-draw-mode'),
            buttonClass: document.getElementById('mindmap-button').classList.contains('mdl-draw-armed')
        }));
        expect(armed.svgClass).toBe(false);
        expect(armed.buttonClass).toBe(false);
    });
});
