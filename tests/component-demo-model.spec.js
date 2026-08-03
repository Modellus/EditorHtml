const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

test('the demo model opens and renders', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(`${BOARD_URL}?model=components-demo`);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell.board !== null && shell.board.shapes.shapes.length > 0, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const loaded = await page.evaluate(() => {
        shell.calculator.setIteration(120);
        shell.board.forceRefresh();
        return shell.board.shapes.shapes
            .filter(shape => shape.constructor.name === 'ComponentShape')
            .map(shape => ({
                name: shape.properties.name,
                component: shape.getComponentType(),
                drawn: document.getElementById(shape.id).querySelectorAll('circle, line, polygon, text, path').length,
                errors: shape.validateComponent().errors.map(error => error.code)
            }));
    });
    expect(loaded.length).toBe(6);
    for (const entry of loaded) {
        expect(entry.errors, `${entry.name} should validate after loading`).toEqual([]);
        expect(entry.drawn, `${entry.name} should draw`).toBeGreaterThan(2);
    }
    const speed = await page.evaluate(() => shell.calculator.getByName('speed', 1));
    expect(Number.isFinite(speed)).toBe(true);
});
