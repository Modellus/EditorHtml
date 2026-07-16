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

async function clickEmptyBackground(page) {
    await page.locator('#svg').click({ position: { x: 400, y: 400 } });
    await page.waitForTimeout(300);
}

function isBackgroundToolbarVisible(page) {
    return page.evaluate(() => shell.backgroundToolbar.isVisible());
}

test.describe('Background toolbar', () => {
    test('Clicking empty background space shows the toolbar', async ({ page }) => {
        await setupEditor(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(false);
        await clickEmptyBackground(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(true);
        await expect(page.locator('.mdl-background-toolbar')).toBeVisible();
    });

    test('Clicking empty background again closes the toolbar', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(true);
        await clickEmptyBackground(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(false);
    });

    test('Clicking elsewhere outside the board closes the toolbar', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(true);
        await page.evaluate(() => document.getElementById('bottom-toolbar-container').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
        await page.waitForTimeout(300);
        expect(await isBackgroundToolbarVisible(page)).toBe(false);
    });

    test('Clicking inside the toolbar does not close it', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        await page.locator('.mdl-background-toolbar .mdl-background-toolbar-name input').click();
        await page.waitForTimeout(300);
        expect(await isBackgroundToolbarVisible(page)).toBe(true);
    });

    test('Selecting a shape hides the toolbar', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        expect(await isBackgroundToolbarVisible(page)).toBe(true);
        await page.evaluate(() => shell.commands.addShape('BodyShape', 'Body'));
        await page.waitForTimeout(300);
        expect(await isBackgroundToolbarVisible(page)).toBe(false);
    });

    test('Name textbox sets the model name', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        const input = page.locator('.mdl-background-toolbar .mdl-background-toolbar-name input');
        await input.fill('My Physics Model');
        await input.press('Enter');
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({
            name: shell.properties.name,
            label: document.getElementById('model-name-label')?.textContent
        }));
        expect(state.name).toBe('My Physics Model');
        expect(state.label).toBe('My Physics Model');
    });

    test('Theme dropdown sets the education level', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        await page.evaluate(() => shell.backgroundToolbar._themeDropdownElement.dxDropDownButton('instance').open());
        await page.waitForTimeout(300);
        await page.locator('.mdl-dropdown-list-label', { hasText: 'University' }).click();
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => shell.properties.educationLevel)).toBe('university');
    });

    test('Background color picker sets the svg background color', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        await page.evaluate(() => shell.backgroundToolbar._backgroundColorPicker.dxDropDownButton('instance').open());
        await page.waitForTimeout(300);
        const pickedColor = await page.evaluate(() => {
            const tile = document.querySelector('.mdl-color-picker-menu .mdl-color-picker-item, .mdl-color-picker-menu .dx-tile');
            tile.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return shell.properties.backgroundColor;
        });
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({
            backgroundColor: shell.properties.backgroundColor,
            svgBackground: shell.board.svg.style.backgroundColor
        }));
        expect(state.backgroundColor).toBe(pickedColor);
        expect(state.svgBackground.length).toBeGreaterThan(0);
    });

    test('Background picker applies a pattern to the svg', async ({ page }) => {
        await setupEditor(page);
        await clickEmptyBackground(page);
        await page.evaluate(() => shell.backgroundToolbar._backgroundDropdownElement.dxDropDownButton('instance').open());
        await page.waitForTimeout(300);
        await page.locator('.mdl-bg-picker-card[data-bg-id="math-grid"]').click();
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => ({
            backgroundId: shell.properties.backgroundId,
            hasRect: !!shell.board.svg.querySelector('#mdl-bg-rect')
        }));
        expect(state.backgroundId).toBe('math-grid');
        expect(state.hasRect).toBe(true);
    });

    test('Settings popup no longer contains theme, background color or background', async ({ page }) => {
        await setupEditor(page);
        const fields = await page.evaluate(() => {
            shell.openSettings();
            return shell.settingsController.form.option('items').map(item => item.dataField);
        });
        expect(fields).toEqual(['instructions']);
    });
});
