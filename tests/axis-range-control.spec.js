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

// The axis is a chip on its row: closed it reads its two ends and its marks, opened it stands its
// boxes and its pills on rows of their own.
async function findAxisRow(page, label) {
    return page.evaluateHandle(label => {
        const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item, .mdl-shape-overlay-popup .mdl-dropdown-grid-label'))
            .find(item => (item.querySelector('.mdl-dropdown-list-label')?.textContent ?? item.textContent) === label);
        return row.classList.contains('mdl-dropdown-grid-label') ? row.nextElementSibling : row;
    }, label);
}

// The chip's ends are maths, read from their fields; its marks are maths or words.
async function readChip(page, label) {
    const container = await findAxisRow(page, label);
    return container.evaluate(element => {
        const chip = element.querySelector('.mdl-axis-chip');
        const readPart = part => (part.matches('math-field') ? part : part.querySelector('math-field'))?.value ?? part.textContent;
        return {
            bounds: Array.from(chip.querySelectorAll('.mdl-axis-chip__bound')).map(readPart),
            separators: chip.querySelectorAll('.mdl-axis-chip__x').length,
            marks: Array.from(chip.querySelectorAll('.mdl-axis-chip__mark')).map(readPart)
        };
    });
}

async function openAxisChip(page, label) {
    const container = await findAxisRow(page, label);
    await container.evaluate(element => $(element.querySelector('.mdl-axis-chip-editor')).dxDropDownBox('instance').open());
    await expect(page.locator('.mdl-axis-chip-popup .mdl-axis-chip-rows:visible')).toHaveCount(1);
}

async function closeAxisChip(page, label) {
    const container = await findAxisRow(page, label);
    await container.evaluate(element => $(element.querySelector('.mdl-axis-chip-editor')).dxDropDownBox('instance').close());
    await expect(page.locator('.mdl-axis-chip-popup .mdl-axis-chip-rows:visible')).toHaveCount(0);
}

function openChipRows(page) {
    return page.locator('.mdl-axis-chip-popup .mdl-axis-chip-rows:visible');
}

async function readChipRowLabels(page, label) {
    await openAxisChip(page, label);
    const labels = await openChipRows(page).locator('.mdl-term-editor-row-label').allTextContents();
    await closeAxisChip(page, label);
    return labels;
}

// The two boxes of one axis, in the order the chip lays them out.
async function readRow(page, label) {
    await openAxisChip(page, label);
    const values = await openChipRows(page).evaluate(rows => Array.from(rows.querySelectorAll('.dx-numberbox')).map(box => DevExpress.ui.dxNumberBox.getInstance(box).option('value')));
    await closeAxisChip(page, label);
    return values;
}

async function writeRow(page, label, index, value) {
    await openAxisChip(page, label);
    await openChipRows(page).evaluate((rows, { index, value }) => DevExpress.ui.dxNumberBox.getInstance(rows.querySelectorAll('.dx-numberbox')[index]).option('value', value), { index, value });
    await closeAxisChip(page, label);
}

async function choosePill(page, label, groupClassName, text) {
    await openAxisChip(page, label);
    await openChipRows(page).locator(`.${groupClassName} .dx-button`, { hasText: text }).click();
    await closeAxisChip(page, label);
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

    test('the chart menu keeps every control inside itself whatever the bounds hold', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Values');
            shell.board.shapes.getByName('Values').properties.expression = 'y=2\\cdot t';
            shell.reset();
            shell.commands.addShape('ChartShape', 'Chart');
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const chart = shell.board.shapes.getByName('Chart');
            chart.properties.autoScale = false;
            chart.properties.domainOverride = { xMin: -1500000, xMax: 2500000, yMin: -0.125, yMax: 12.5 };
            shell.board.markDirty(chart);
        });
        await openSettings(page, 'Chart', '.mdl-chart-type-selector');
        const layout = await page.evaluate(() => {
            const content = document.querySelector('.mdl-shape-overlay-popup .dx-overlay-content');
            const menuRight = content.getBoundingClientRect().right;
            const controls = Array.from(content.querySelectorAll('.mdl-dropdown-grid-control'));
            // A switch keeps a sliding strip twice its width under its own clip, so the visible edge
            // of each control is what is measured rather than what the grid could scroll to.
            return {
                menuRight: menuRight,
                controlRights: controls.map(control => Math.max(...Array.from(control.children).map(child => child.getBoundingClientRect().right))),
                boxWidths: Array.from(content.querySelectorAll('.dx-numberbox')).map(box => box.getBoundingClientRect().width)
            };
        });
        expect(layout.controlRights).toHaveLength(6);
        for (const controlRight of layout.controlRights)
            expect(controlRight).toBeLessThanOrEqual(layout.menuRight);
        // The chip clips what it cannot fit rather than widening its cell.
        expect(layout.boxWidths).toHaveLength(0);
        await openAxisChip(page, 'Horizontal');
        const chipLayout = await openChipRows(page).evaluate(rows => {
            const popupRight = rows.closest('.dx-overlay-content').getBoundingClientRect().right;
            return { popupRight: popupRight, boxRights: Array.from(rows.querySelectorAll('.dx-numberbox')).map(box => box.getBoundingClientRect().right), boxWidths: Array.from(rows.querySelectorAll('.dx-numberbox')).map(box => box.getBoundingClientRect().width) };
        });
        // The two boxes stand on rows of their own, as wide as each other and inside the chip's drop down.
        expect(chipLayout.boxWidths).toHaveLength(2);
        expect(Math.max(...chipLayout.boxWidths) - Math.min(...chipLayout.boxWidths)).toBeLessThan(1);
        for (const boxRight of chipLayout.boxRights)
            expect(boxRight).toBeLessThanOrEqual(chipLayout.popupRight);
    });

    test('the chart reads its ends and its choices on the chip and offers each on a row inside', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Values');
            shell.board.shapes.getByName('Values').properties.expression = 'y=2\\cdot t';
            shell.reset();
            shell.commands.addShape('ChartShape', 'Chart');
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            const chart = shell.board.shapes.getByName('Chart');
            chart.properties.autoScale = false;
            chart.properties.domainOverride = { xMin: -5, xMax: 10, yMin: 0, yMax: 10 };
            shell.board.markDirty(chart);
        });
        await openSettings(page, 'Chart', '.mdl-chart-type-selector');
        // The ends are written to the model's accuracy, with the toolbar's × between them.
        expect(await readChip(page, 'Horizontal')).toEqual({ bounds: ['-5.00', '10.00'], separators: 1, marks: ['Linear'] });
        expect(await readChip(page, 'Vertical')).toEqual({ bounds: ['0.00', '10.00'], separators: 1, marks: ['Linear'] });
        expect(await readChipRowLabels(page, 'Horizontal')).toEqual(['Minimum', 'Maximum', 'Numbers', 'Scale']);
        expect(await readChipRowLabels(page, 'Vertical')).toEqual(['Minimum', 'Maximum', 'Numbers', 'Scale']);
        await choosePill(page, 'Horizontal', 'mdl-axis-numbers-group', 'π');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Chart').properties.xAxisType)).toBe('pi');
        expect((await readChip(page, 'Horizontal')).marks).toEqual(['\\pi', 'Linear']);
        // A bound written inside the chip is read on it as soon as the chip is closed.
        await writeRow(page, 'Horizontal', 0, -2.5);
        expect((await readChip(page, 'Horizontal')).bounds).toEqual(['-2.50', '10.00']);
        // A big bound is written the way the shape's notation writes it.
        await writeRow(page, 'Horizontal', 1, 2500000);
        expect((await readChip(page, 'Horizontal')).bounds).toEqual(['-2.50', '2.50\\mathrm{e}6']);
        await page.evaluate(() => { shell.board.shapes.getByName('Chart').properties.notation = 'scientific'; });
        await writeRow(page, 'Horizontal', 0, -0.5);
        expect((await readChip(page, 'Horizontal')).bounds).toEqual(['-5.00\\times10^{-1}', '2.50\\times10^6']);
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

    test('an object built from blocks offers how its axis is read on the same chip', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const ruler = shell.commands.addComponent('ruler', 'Ruler');
            ruler.setProperties({ x: 60, y: 60, width: 320, height: 64 });
            shell.board.draw();
        });
        await page.waitForTimeout(400);
        await openSettings(page, 'Ruler', '.mdl-component-settings-selector');
        // The scale has no row of its own on the menu any more: it is one of the axis's choices.
        const labels = await page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-label').allTextContents();
        expect(labels).toContain('Horizontal');
        expect(labels).not.toContain('Scale');
        expect(await readChip(page, 'Horizontal')).toEqual({ bounds: ['0.00', '10.00'], separators: 1, marks: ['Linear'] });
        expect(await readChipRowLabels(page, 'Horizontal')).toEqual(['Minimum', 'Maximum', 'Scale']);
        await choosePill(page, 'Horizontal', 'mdl-axis-scale-group', 'Log');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Ruler').properties.scaleType)).toBe('logarithmic');
        expect((await readChip(page, 'Horizontal')).marks).toEqual(['Log']);
    });
});
