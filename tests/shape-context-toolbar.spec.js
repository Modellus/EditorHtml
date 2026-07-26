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

async function setupBody(page) {
    await page.evaluate(() => {
        modellus.shape.addBody('Body1');
        const bodyShape = shell.board.shapes.getByName('Body1');
        bodyShape.properties.x = 300;
        bodyShape.properties.y = 250;
        bodyShape.update();
        bodyShape.draw();
        shell.board.selection.deselect();
    });
    await page.waitForTimeout(250);
}

async function clickShape(page) {
    const point = await page.evaluate(() => {
        const bodyShape = shell.board.shapes.getByName('Body1');
        const rect = bodyShape.element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(300);
}

function getState(page) {
    return page.evaluate(() => {
        const bodyShape = shell.board.shapes.getByName('Body1');
        return {
            selected: shell.board.selection.selectedShape === bodyShape,
            toolbarVisible: bodyShape.isContextToolbarVisible()
        };
    });
}

test.describe('Shape context toolbar', () => {
    test('first click selects the shape without showing the toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupBody(page);
        await clickShape(page);
        const state = await getState(page);
        expect(state.selected).toBe(true);
        expect(state.toolbarVisible).toBe(false);
    });

    test('clicking the already selected shape shows the toolbar', async ({ page }) => {
        await setupEditor(page);
        await setupBody(page);
        await clickShape(page);
        await clickShape(page);
        const state = await getState(page);
        expect(state.selected).toBe(true);
        expect(state.toolbarVisible).toBe(true);
    });

    test('creating a shape selects it without showing the toolbar', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => modellus.shape.addBody('Body1'));
        await page.waitForTimeout(300);
        const state = await getState(page);
        expect(state.selected).toBe(true);
        expect(state.toolbarVisible).toBe(false);
    });
});
