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

async function openSettings(page, shapeName, selector) {
    await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), shapeName);
    await page.waitForTimeout(300);
    await page.locator(`.shape-context-toolbar.visible ${selector}`).click();
    await page.waitForTimeout(400);
}

// The two boxes of one row, in the order the control lays them out.
async function readRow(page, label) {
    return page.evaluate(label => {
        const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item, .mdl-shape-overlay-popup .mdl-dropdown-grid-label'))
            .find(item => (item.querySelector('.mdl-dropdown-list-label')?.textContent ?? item.textContent) === label);
        const container = row.classList.contains('mdl-dropdown-grid-label') ? row.nextElementSibling : row;
        return Array.from(container.querySelectorAll('.dx-numberbox')).map(box => DevExpress.ui.dxNumberBox.getInstance(box).option('value'));
    }, label);
}

async function writeRow(page, label, index, value) {
    await page.evaluate(({ label, index, value }) => {
        const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item, .mdl-shape-overlay-popup .mdl-dropdown-grid-label'))
            .find(item => (item.querySelector('.mdl-dropdown-list-label')?.textContent ?? item.textContent) === label);
        const container = row.classList.contains('mdl-dropdown-grid-label') ? row.nextElementSibling : row;
        DevExpress.ui.dxNumberBox.getInstance(container.querySelectorAll('.dx-numberbox')[index]).option('value', value);
    }, { label, index, value });
    await page.waitForTimeout(300);
}

test.describe('one control for how far an axis runs', () => {
    test('the chart writes its domain override through it', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Values');
            shell.board.shapes.getByName('Values').properties.expression = 'y=2\\\\cdot t';
            shell.reset();
            shell.commands.addShape('ChartShape', 'Chart');
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const chart = shell.board.shapes.getByName('Chart');
            chart.properties.autoScale = false;
            chart.properties.domainOverride = { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
            shell.board.markDirty(chart);
        });
        await openSettings(page, 'Chart', '.mdl-chart-type-selector');
        expect(await readRow(page, 'Horizontal')).toEqual([0, 10]);
        await writeRow(page, 'Horizontal', 1, 25);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Chart').properties.domainOverride.xMax)).toBe(25);
    });

    test('the referential turns a bound back into an origin and a scale', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addReferential('Referential');
            const referential = shell.board.shapes.getByName('Referential');
            referential.properties.autoScale = false;
            shell.board.markDirty(referential);
        });
        await page.waitForTimeout(400);
        await openSettings(page, 'Referential', '.mdl-settings-selector');
        const before = await readRow(page, 'Horizontal');
        expect(before).toHaveLength(2);
        await writeRow(page, 'Horizontal', 1, before[0] + (before[1] - before[0]) * 2);
        const after = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential');
            return { scaleX: referential.properties.scaleX, domain: referential.getVisibleDomain() };
        });
        // Twice the range across the same width is twice as many units to the pixel.
        expect(after.domain.xMax).toBeCloseTo(before[0] + (before[1] - before[0]) * 2, 3);
        expect(after.scaleX).toBeGreaterThan(0);
    });

    test('an object built from blocks writes two of its own parameters', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const tracker = shell.commands.addComponent('mouse-tracker', 'Tracker');
            tracker.setProperties({ x: 60, y: 60, width: 320, height: 300 });
            shell.board.draw();
        });
        await page.waitForTimeout(400);
        await openSettings(page, 'Tracker', '.mdl-component-settings-selector');
        expect(await readRow(page, 'Vertical')).toEqual([0, 10]);
        await writeRow(page, 'Vertical', 0, -5);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.minimumY)).toBe(-5);
        // A range that crosses zero is marked where it crosses, the way a chart marks its origin.
        expect(await page.locator('[data-source-id="zero-x"]').count()).toBe(1);
    });
});
