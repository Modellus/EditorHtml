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

async function openGridDropdown(page) {
    await page.evaluate(() => shell.bottomToolbar._gridDropdownElement.dxDropDownButton('instance').open());
    await page.waitForTimeout(500);
}

function getGridState(page) {
    return page.evaluate(() => ({
        snapToGrid: shell.properties.snapToGrid,
        gridSize: shell.properties.gridSize,
        switchValue: shell.bottomToolbar._gridSwitch?.option('value'),
        sizeValue: shell.bottomToolbar._gridSizeEditor?.option('value'),
        icon: shell.bottomToolbar._gridDropdownElement.dxDropDownButton('instance').option('icon')
    }));
}

test.describe('Grid dropdown', () => {
    test('Dropdown shows a grid switch and a grid size editor with defaults', async ({ page }) => {
        await setupEditor(page);
        await openGridDropdown(page);
        const state = await getGridState(page);
        expect(state.switchValue).toBe(false);
        expect(state.sizeValue).toBe(20);
        expect(state.snapToGrid).toBe(false);
        expect(state.gridSize).toBe(20);
        expect(state.icon).toBe('fa-light fa-grid');
    });

    test('Turning the switch on enables the grid and updates the toolbar icon', async ({ page }) => {
        await setupEditor(page);
        await openGridDropdown(page);
        await page.evaluate(() => shell.bottomToolbar._gridSwitch.option('value', true));
        await page.waitForTimeout(500);
        const state = await getGridState(page);
        expect(state.snapToGrid).toBe(true);
        expect(state.icon).toBe('fa-solid fa-grid');
        const gridVisible = await page.evaluate(() => shell.board._gridRect?.getAttribute('visibility') === 'visible');
        expect(gridVisible).toBe(true);
    });

    test('Changing the grid size in the dropdown updates the property', async ({ page }) => {
        await setupEditor(page);
        await openGridDropdown(page);
        await page.evaluate(() => shell.bottomToolbar._gridSizeEditor.option('value', 40));
        await page.waitForTimeout(500);
        const state = await getGridState(page);
        expect(state.gridSize).toBe(40);
    });

    test('External property changes sync the dropdown controls and undo restores them', async ({ page }) => {
        await setupEditor(page);
        await openGridDropdown(page);
        await page.evaluate(() => {
            shell.setPropertyCommand('snapToGrid', true);
            shell.setPropertyCommand('gridSize', 50);
        });
        await page.waitForTimeout(300);
        let state = await getGridState(page);
        expect(state.switchValue).toBe(true);
        expect(state.sizeValue).toBe(50);
        await page.evaluate(() => shell.undoPressed());
        await page.waitForTimeout(300);
        state = await getGridState(page);
        expect(state.gridSize).toBe(20);
        expect(state.sizeValue).toBe(20);
    });

    test('Grid size is no longer in the settings popup', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => shell.settingsController.open());
        await page.waitForTimeout(500);
        const hasGridSizeField = await page.evaluate(() =>
            [...document.querySelectorAll('#settings-form .dx-field-item-label-text')]
                .some(label => label.textContent.trim() === 'Grid Size'));
        expect(hasGridSizeField).toBe(false);
    });
});
