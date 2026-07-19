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

async function svgClientPoint(page, x, y) {
    return page.evaluate(({ x, y }) => {
        const rect = document.getElementById('svg').getBoundingClientRect();
        const point = document.getElementById('svg').createSVGPoint();
        point.x = x;
        point.y = y;
        const client = point.matrixTransform(document.getElementById('svg').getScreenCTM());
        return { x: client.x, y: client.y, left: rect.left, top: rect.top };
    }, { x, y });
}

test.describe('Draw-to-create shapes from the top toolbar', () => {
    test('clicking a shape button arms draw mode with crosshair and highlighted button', async ({ page }) => {
        await setupEditor(page);
        await page.click('#chart-button');
        const armed = await page.evaluate(() => ({
            svgClass: document.getElementById('svg').classList.contains('shape-draw-mode'),
            buttonClass: document.getElementById('chart-button').classList.contains('mdl-draw-armed'),
            cursor: getComputedStyle(document.getElementById('svg')).cursor,
            iconWeight: getComputedStyle(document.querySelector('#chart-button .dx-icon')).fontWeight
        }));
        expect(armed.svgClass).toBe(true);
        expect(armed.buttonClass).toBe(true);
        expect(armed.cursor).toBe('crosshair');
        expect(armed.iconWeight).toBe('900');
    });

    test('clicking the armed button again cancels draw mode', async ({ page }) => {
        await setupEditor(page);
        await page.click('#chart-button');
        await page.click('#chart-button');
        const armed = await page.evaluate(() => ({
            svgClass: document.getElementById('svg').classList.contains('shape-draw-mode'),
            buttonClass: document.getElementById('chart-button').classList.contains('mdl-draw-armed')
        }));
        expect(armed.svgClass).toBe(false);
        expect(armed.buttonClass).toBe(false);
    });

    test('dragging on the board draws the shape as a rectangle', async ({ page }) => {
        await setupEditor(page);
        await page.click('#chart-button');
        const start = await svgClientPoint(page, 300, 300);
        const end = await svgClientPoint(page, 520, 440);
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(end.x, end.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Chart');
            return {
                exists: !!shape,
                x: shape?.properties.x,
                y: shape?.properties.y,
                width: shape?.properties.width,
                height: shape?.properties.height,
                selected: shell.board.selection.selectedShape === shape,
                stillArmed: document.getElementById('svg').classList.contains('shape-draw-mode')
            };
        });
        expect(result.exists).toBe(true);
        expect(result.x).toBeCloseTo(300, 0);
        expect(result.y).toBeCloseTo(300, 0);
        expect(result.width).toBeCloseTo(220, 0);
        expect(result.height).toBeCloseTo(140, 0);
        expect(result.selected).toBe(true);
        expect(result.stillArmed).toBe(false);
    });

    test('a click without dragging creates no shape', async ({ page }) => {
        await setupEditor(page);
        const shapesBefore = await page.evaluate(() => shell.board.shapes.shapes.length ?? shell.board.shapes.shapes.size);
        await page.click('#table-button');
        const point = await svgClientPoint(page, 400, 350);
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(200);
        const result = await page.evaluate(() => ({
            count: shell.board.shapes.shapes.length ?? shell.board.shapes.shapes.size,
            table: !!shell.board.shapes.getByName('Table'),
            stillArmed: document.getElementById('svg').classList.contains('shape-draw-mode')
        }));
        expect(result.count).toBe(shapesBefore);
        expect(result.table).toBe(false);
        expect(result.stillArmed).toBe(false);
    });

    test('a drag too small to be usable creates the shape at its default minimum size', async ({ page }) => {
        await setupEditor(page);
        await page.click('#chart-button');
        const start = await svgClientPoint(page, 300, 300);
        const end = await svgClientPoint(page, 330, 305);
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(end.x, end.y, { steps: 4 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Chart');
            return {
                exists: !!shape,
                x: shape?.properties.x,
                y: shape?.properties.y,
                width: shape?.properties.width,
                height: shape?.properties.height,
                selected: shell.board.selection.selectedShape === shape
            };
        });
        expect(result.exists).toBe(true);
        expect(result.x).toBeCloseTo(300, 0);
        expect(result.y).toBeCloseTo(300, 0);
        // ChartShape's recommended default size from setDefaults().
        expect(result.width).toBe(400);
        expect(result.height).toBe(200);
        expect(result.selected).toBe(true);
        const resized = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Chart');
            shape.transformShape({ width: 120, height: 90 });
            return { width: shape.properties.width, height: shape.properties.height };
        });
        expect(resized.width).toBe(120);
        expect(resized.height).toBe(90);
    });

    test('a drawn shape can be undone', async ({ page }) => {
        await setupEditor(page);
        await page.click('#text-button');
        const start = await svgClientPoint(page, 200, 200);
        const end = await svgClientPoint(page, 400, 320);
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(end.x, end.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text'))).toBe(true);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text'))).toBe(false);
        await page.evaluate(() => modellus.redo());
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => !!shell.board.shapes.getByName('Text'))).toBe(true);
    });

    test('escape cancels draw mode', async ({ page }) => {
        await setupEditor(page);
        await page.click('#value-button');
        await page.keyboard.press('Escape');
        const armed = await page.evaluate(() => ({
            svgClass: document.getElementById('svg').classList.contains('shape-draw-mode'),
            buttonClass: document.getElementById('value-button').classList.contains('mdl-draw-armed')
        }));
        expect(armed.svgClass).toBe(false);
        expect(armed.buttonClass).toBe(false);
    });
});
