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

async function openIndependentDropdown(page) {
    await page.evaluate(() => shell.bottomToolbar._independentDropdownElement.dxDropDownButton('instance').open());
    await page.waitForTimeout(500);
}

function eyeLocator(page, rowLabel) {
    return page
        .locator('.mdl-independent-dropdown .mdl-dropdown-list-item', { has: page.locator(`.mdl-dropdown-list-label:text-is("${rowLabel}")`) })
        .locator('.term-packed-checkbox');
}

function getVisibilityState(page) {
    return page.evaluate(() => ({
        independent: shell.bottomToolbar._independentVisibilityCheckbox.option('value'),
        iteration: shell.bottomToolbar._iterationVisibilityCheckbox.option('value'),
        playerTerm: shell.properties.playerTerm
    }));
}

function getPlayerLabels(page) {
    return page.evaluate(() => ({
        start: shell.bottomToolbar._startLabel.textContent,
        end: shell.bottomToolbar._endLabel.textContent,
        trigger: shell.bottomToolbar._independentNameLabel.textContent
    }));
}

test.describe('Player term visibility toggles', () => {
    test('Both name editors have an eye toggle, independent visible by default', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await expect(eyeLocator(page, 'Independent')).toHaveCount(1);
        await expect(eyeLocator(page, 'Iteration')).toHaveCount(1);
        const state = await getVisibilityState(page);
        expect(state.independent).toBe(true);
        expect(state.iteration).toBe(false);
        expect(state.playerTerm).toBe('independent');
    });

    test('Clicking the iteration eye shows iteration values and hides the independent term', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await eyeLocator(page, 'Iteration').click();
        await page.waitForTimeout(500);
        const state = await getVisibilityState(page);
        expect(state.playerTerm).toBe('iteration');
        expect(state.iteration).toBe(true);
        expect(state.independent).toBe(false);
        // default model: t from 0 to 10 step 0.1 -> 101 iterations, n starts at 1
        const labels = await getPlayerLabels(page);
        expect(labels.start).toBe('1');
        expect(labels.end).toBe('101');
        expect(labels.trigger).toBe('n');
        const tooltip = await page.evaluate(() => shell.bottomToolbar.playHead.option('tooltip').format(5));
        expect(tooltip).toBe('5');
    });

    test('The visible eye cannot be turned off — one term must stay visible', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await eyeLocator(page, 'Independent').click();
        await page.waitForTimeout(500);
        const state = await getVisibilityState(page);
        expect(state.playerTerm).toBe('independent');
        expect(state.independent).toBe(true);
        expect(state.iteration).toBe(false);
        const labels = await getPlayerLabels(page);
        expect(labels.start).toBe('0.0');
        expect(labels.end).toBe('10.0');
    });

    test('Iteration display honors iterationTermStart 0', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            shell.setProperty('iterationTermStart', 0);
            shell.setProperty('playerTerm', 'iteration');
            shell.bottomToolbar.updatePlayer();
        });
        await page.waitForTimeout(300);
        const labels = await getPlayerLabels(page);
        expect(labels.start).toBe('0');
        expect(labels.end).toBe('100');
    });

    test('Switching back to the independent term restores its range', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await eyeLocator(page, 'Iteration').click();
        await page.waitForTimeout(300);
        await eyeLocator(page, 'Independent').click();
        await page.waitForTimeout(300);
        const state = await getVisibilityState(page);
        expect(state.playerTerm).toBe('independent');
        expect(state.independent).toBe(true);
        expect(state.iteration).toBe(false);
        const labels = await getPlayerLabels(page);
        expect(labels.start).toBe('0.0');
        expect(labels.end).toBe('10.0');
        expect(labels.trigger).toBe('t');
    });

    test('playerTerm round-trips through serialize/deserialise and syncs the eyes', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        const result = await page.evaluate(() => {
            shell.setProperty('playerTerm', 'iteration');
            const serialized = JSON.parse(JSON.stringify(shell.serialize()));
            const savedValue = serialized.properties.playerTerm;
            shell.setProperty('playerTerm', 'independent');
            shell.session.deserialise(serialized);
            shell.bottomToolbar.updatePlayer();
            return { savedValue, restored: shell.properties.playerTerm };
        });
        expect(result.savedValue).toBe('iteration');
        expect(result.restored).toBe('iteration');
        await page.waitForTimeout(300);
        const state = await getVisibilityState(page);
        expect(state.iteration).toBe(true);
        expect(state.independent).toBe(false);
    });

    test('Cases option in the dropdown sets casesCount', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await page.evaluate(() => {
            const wrapper = document.querySelector('.mdl-independent-dropdown');
            const rows = [...wrapper.querySelectorAll('.mdl-dropdown-list-item')];
            const row = rows.find(r => r.querySelector('.mdl-dropdown-list-label').textContent === 'Cases');
            const numberBox = $(row.querySelector('.dx-numberbox')).dxNumberBox('instance');
            numberBox.option('value', 3);
        });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.properties.casesCount)).toBe(3);
        expect(await page.evaluate(() => shell.calculator.properties.casesCount)).toBe(3);
    });

    test('Iteration name field in the dropdown renames the iteration term', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await page.evaluate(() => {
            const wrapper = document.querySelector('.mdl-independent-dropdown');
            const rows = [...wrapper.querySelectorAll('.mdl-dropdown-list-item')];
            const row = rows.find(r => r.querySelector('.mdl-dropdown-list-label').textContent === 'Iteration');
            const textBox = $(row.querySelector('.dx-textbox')).dxTextBox('instance');
            textBox.option('value', 'm');
        });
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.calculator.properties.iterationTerm)).toBe('m');
        await page.evaluate(() => shell.setProperty('playerTerm', 'iteration'));
        await page.waitForTimeout(300);
        expect((await getPlayerLabels(page)).trigger).toBe('m');
    });
});
