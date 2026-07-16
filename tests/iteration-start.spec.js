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

function getDomainToggleState(page) {
    return page.evaluate(() => {
        const element = shell.bottomToolbar._iterationDomainGroupElement[0];
        const texts = [...element.querySelectorAll('.mdl-button-text')].map(e => e.textContent);
        const selected = element.querySelector('.dx-item-selected .mdl-button-text')?.textContent ?? null;
        return { texts, selected };
    });
}

function clickDomainButton(page, text) {
    return page.evaluate(t => {
        const element = shell.bottomToolbar._iterationDomainGroupElement[0];
        const target = [...element.querySelectorAll('.mdl-button-text')].find(b => b.textContent === t);
        target.closest('.dx-button').click();
    }, text);
}

test.describe('Iteration term start setting', () => {
    test('Domain toggle sits in the dropdown iteration row with N selected by default', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        const state = await getDomainToggleState(page);
        expect(state.texts).toEqual(['ℕ₀', 'ℕ']);
        expect(state.selected).toBe('ℕ');
        const inIterationRow = await page.evaluate(() => {
            const element = shell.bottomToolbar._iterationDomainGroupElement[0];
            const row = element.closest('.mdl-dropdown-list-item');
            return row?.querySelector('.mdl-dropdown-list-label')?.textContent ?? null;
        });
        expect(inIterationRow).toBe('Iteration');
    });

    test('Selecting N0 sets iterationTermStart to 0 on properties and system', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        await clickDomainButton(page, 'ℕ₀');
        await page.waitForTimeout(500);
        const result = await page.evaluate(() => ({
            property: shell.properties.iterationTermStart,
            calculatorProperty: shell.calculator.properties.iterationTermStart,
            systemValue: shell.calculator.system.iterationTermStart,
            firstN: shell.calculator.system.getByNameOnIteration(1, shell.calculator.properties.iterationTerm)
        }));
        expect(result.property).toBe(0);
        expect(result.calculatorProperty).toBe(0);
        expect(result.systemValue).toBe(0);
        expect(result.firstN).toBe(0);
        const state = await getDomainToggleState(page);
        expect(state.selected).toBe('ℕ₀');
    });

    test('iterationTermStart round-trips through serialize/deserialise and syncs the toggle', async ({ page }) => {
        await setupEditor(page);
        await openIndependentDropdown(page);
        const result = await page.evaluate(() => {
            shell.setProperty('iterationTermStart', 0);
            const serialized = JSON.parse(JSON.stringify(shell.serialize()));
            const savedValue = serialized.properties.iterationTermStart;
            shell.setProperty('iterationTermStart', 1);
            shell.session.deserialise(serialized);
            shell.bottomToolbar.updatePlayer();
            return {
                savedValue,
                restoredProperty: shell.properties.iterationTermStart,
                restoredSystem: shell.calculator.system.iterationTermStart
            };
        });
        expect(result.savedValue).toBe(0);
        expect(result.restoredProperty).toBe(0);
        expect(result.restoredSystem).toBe(0);
        await page.waitForTimeout(300);
        const state = await getDomainToggleState(page);
        expect(state.selected).toBe('ℕ₀');
    });

    test('Settings popup no longer contains the iteration controls', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => shell.settingsController.open());
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
            iterationTermEditor: shell.settingsController.form.getEditor('iterationTerm') ?? null,
            casesEditor: shell.settingsController.form.getEditor('casesCount') ?? null,
            domainButtons: [...document.querySelectorAll('#settings-form .mdl-button-text')].map(e => e.textContent)
        }));
        expect(state.iterationTermEditor).toBeNull();
        expect(state.casesEditor).toBeNull();
        expect(state.domainButtons).not.toContain('ℕ₀');
    });
});
