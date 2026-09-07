const { test, expect } = require('@playwright/test');

// A unit an object is measured in is picked the way every unit on the board is picked: from the
// one units picker a term row and the player open, typeset as mathematics, rather than typed into
// a text box of its own.

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

async function addComponent(page, componentType, name, properties) {
    await page.evaluate(input => {
        const shape = shell.commands.addComponent(input.componentType, input.name);
        shape.setProperties(input.properties);
        shape.draw();
    }, { componentType, name, properties });
    await expect.poll(() => page.evaluate(name => shell.board.shapes.getByName(name)?.contentGroup?.children.length ?? 0, name)).toBeGreaterThan(0);
}

async function openUnitRow(page, name) {
    await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), name);
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
    await page.waitForTimeout(400);
    const row = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').filter({ hasText: 'Unit' });
    await expect(row).toBeVisible();
    return row;
}

test.describe('the unit of a measuring object', () => {
    test('is picked from the units picker the term rows open', async ({ page }) => {
        await setupBoard(page);
        await addComponent(page, 'ruler', 'Ruler', { x: 60, y: 60, width: 320, height: 64 });
        const row = await openUnitRow(page, 'Ruler');
        // The row carries the shared picker, not a text box of its own.
        await expect(row.locator('.mdl-units-editor')).toHaveCount(1);
        await expect(row.locator('.dx-textbox:not(.mdl-units-editor)')).toHaveCount(0);
        await row.locator('.mdl-units-editor .dx-dropdowneditor-button').click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.locator('.mdl-units-dropdown .mdl-units-item[data-unit="m"]').click();
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Ruler').properties.unit)).toBe('m');
        await expect(row.locator('.mdl-units-editor-input')).toHaveValue('m');
    });

    // What is typed narrows the list, spelt either way: m/s2 on a plain keyboard finds m/s².
    test('narrows the list to what has been typed', async ({ page }) => {
        await setupBoard(page);
        await addComponent(page, 'ruler', 'Ruler', { x: 60, y: 60, width: 320, height: 64 });
        const row = await openUnitRow(page, 'Ruler');
        await row.locator('.mdl-units-editor-input').click();
        await page.keyboard.type('m/s2');
        await page.waitForTimeout(400);
        const offered = await page.evaluate(() => [...document.querySelectorAll('.mdl-units-dropdown .mdl-units-item')].map(item => item.dataset.unit));
        expect(offered).toEqual(['m/s\u00b2']);
        await page.keyboard.press('Enter');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Ruler').properties.unit)).toBe('m/s\u00b2');
    });

    // A unit is typed straight into the field, over whatever it held, and a unit the list does
    // not carry is kept as written.
    test('takes a unit written into the field as well', async ({ page }) => {
        await setupBoard(page);
        await addComponent(page, 'protractor', 'Protractor', { x: 60, y: 60, width: 300, height: 170 });
        const row = await openUnitRow(page, 'Protractor');
        const input = row.locator('.mdl-units-editor-input');
        await expect(input).toHaveValue('\u00ba');
        await input.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('furlong');
        await page.keyboard.press('Enter');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Protractor').properties.unit)).toBe('furlong');
        await expect(input).toHaveValue('furlong');
    });
});
