const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addSteeringWheel(page) {
    await page.evaluate(() => {
        const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
        shape.setProperties({ x: 240, y: 160, width: 200, height: 200 });
        shape.draw();
        shell.board.selection.select(shape);
    });
    await page.waitForTimeout(400);
}

function measureSettingsMenu(page) {
    return page.evaluate(() => {
        const popup = document.querySelector('.dx-dropdownbutton-popup-wrapper .dx-overlay-content');
        const list = popup.querySelector('.dx-list');
        return {
            popupHeight: popup.getBoundingClientRect().height,
            rowsHeight: list.getBoundingClientRect().height,
            rows: popup.querySelectorAll('.dx-list-item').length
        };
    });
}

// A switch that takes rows away or brings them back writes the menu again where it stands, and the
// menu is as tall as the rows it is left holding rather than as tall as the height it may grow to.
test('a settings menu stands as tall as the rows a switch leaves it', async ({ page }) => {
    await setupBoard(page);
    await addSteeringWheel(page);
    await page.locator('.mdl-component-settings-selector .dx-button').click();
    await page.waitForTimeout(600);
    const closed = await measureSettingsMenu(page);
    expect(closed.popupHeight).toBeLessThan(closed.rowsHeight + 12);
    await page.locator('.dx-overlay-content .dx-list-item', { hasText: 'Pedals' }).locator('.dx-switch').click();
    await page.waitForTimeout(800);
    const opened = await measureSettingsMenu(page);
    expect(opened.rows).toBeGreaterThan(closed.rows);
    expect(opened.popupHeight).toBeGreaterThan(closed.popupHeight);
    expect(opened.popupHeight).toBeLessThan(opened.rowsHeight + 12);
});
