const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForFunction(() => document.getElementById('mindmap-button') !== null);
}

async function svgClientPoint(page, x, y) {
    return page.evaluate(({ x, y }) => {
        const svg = document.getElementById('svg');
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const client = point.matrixTransform(svg.getScreenCTM());
        return { x: client.x, y: client.y };
    }, { x, y });
}

async function armPencil(page, properties = {}) {
    await page.evaluate(seed => {
        const pencilProperties = Object.assign({ startTipType: 'none', endTipType: 'none', routing: 'freehand', pencilStyle: 'pencil', lineWidth: 3 }, seed);
        shell.shapeDrawController.toggle('MindMapConnectorShape', 'Pencil', 'mindmap-button', pencilProperties);
    }, properties);
}

async function scribble(page, points) {
    const clientPoints = [];
    for (const point of points)
        clientPoints.push(await svgClientPoint(page, point.x, point.y));
    await page.mouse.move(clientPoints[0].x, clientPoints[0].y);
    await page.mouse.down();
    for (let index = 1; index < clientPoints.length; index++)
        await page.mouse.move(clientPoints[index].x, clientPoints[index].y, { steps: 6 });
    await page.mouse.up();
}

function wave(startX, y) {
    return Array.from({ length: 6 }, (_, step) => ({ x: startX + step * 24, y: y + (step % 2 === 0 ? 0 : 18) }));
}

function readPending(page) {
    return page.evaluate(() => {
        const pencil = shell.shapeDrawController.freehandShape;
        return {
            pending: pencil != null,
            armed: shell.shapeDrawController.isArmed(),
            strokeCount: pencil?.properties.freehandStrokes.length ?? 0,
            recorded: shell.board.shapes.shapes.filter(shape => shape.properties.routing === 'freehand').length
        };
    });
}

function readPencil(page) {
    return page.evaluate(() => {
        const pencil = shell.board.shapes.shapes.find(shape => shape.properties.routing === 'freehand');
        if (!pencil)
            return { exists: false };
        const style = getComputedStyle(pencil.path);
        const strokes = pencil.properties.freehandStrokes;
        return {
            exists: true,
            routing: pencil.properties.routing,
            pencilStyle: pencil.properties.pencilStyle,
            strokeCount: strokes.length,
            pointCounts: strokes.map(stroke => stroke.length),
            firstPoint: strokes[0]?.[0],
            lastStrokeFirstPoint: strokes[strokes.length - 1]?.[0],
            pathData: pencil.path.getAttribute('d'),
            subpathCount: (pencil.path.getAttribute('d').match(/M /g) ?? []).length,
            fill: pencil.path.getAttribute('fill'),
            stroke: pencil.path.getAttribute('stroke'),
            strokeWidth: Number(pencil.path.getAttribute('stroke-width')),
            strokeOpacity: pencil.path.getAttribute('stroke-opacity'),
            lineCap: pencil.path.getAttribute('stroke-linecap'),
            blendMode: style.mixBlendMode,
            filter: pencil.path.getAttribute('filter'),
            markerStart: pencil.path.getAttribute('marker-start'),
            markerEnd: pencil.path.getAttribute('marker-end'),
            labelWidth: Number(pencil.labelForeignObject.getAttribute('width')),
            selected: shell.board.selection.selectedShape === pencil,
            handleClasses: (pencil.handleElements ?? []).map(handle => handle.getAttribute('class'))
        };
    });
}

async function openShapeMenuRows(page) {
    await page.evaluate(() => shell.board.selection.selectedShape._shapeColorDropdownElement.dxDropDownButton('instance').open());
    await page.waitForFunction(() => document.querySelector('.mdl-dropdown-list-label') !== null);
    return page.evaluate(() => Array.from(document.querySelectorAll('.mdl-dropdown-list-label')).map(label => label.textContent));
}

test.describe('Mind map pencil', () => {
    test('the pencil keeps drawing across separate drags and only becomes a shape when escape ends it', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        const afterFirst = await readPending(page);
        expect(afterFirst.pending).toBe(true);
        expect(afterFirst.armed).toBe(true);
        expect(afterFirst.strokeCount).toBe(1);
        await scribble(page, wave(200, 470));
        await scribble(page, wave(200, 540));
        const afterThird = await readPending(page);
        expect(afterThird.pending).toBe(true);
        expect(afterThird.armed).toBe(true);
        expect(afterThird.strokeCount).toBe(3);
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const pencil = await readPencil(page);
        expect(pencil.strokeCount).toBe(3);
        expect(pencil.subpathCount).toBe(3);
        expect(pencil.pointCounts.every(count => count > 3)).toBe(true);
        expect(pencil.selected).toBe(true);
        expect(await page.evaluate(() => shell.shapeDrawController.freehandShape)).toBe(null);
    });

    test('escape commits every stroke as one shape, so a single undo takes the whole drawing away', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        await scribble(page, wave(200, 470));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.properties.routing === 'freehand').length)).toBe(1);
        await page.evaluate(() => shell.commands.invoker.undo());
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.properties.routing === 'freehand').length)).toBe(0);
        await page.evaluate(() => shell.commands.invoker.redo());
        await expect.poll(() => page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.properties.routing === 'freehand').length)).toBe(1);
        const restored = await readPencil(page);
        expect(restored.strokeCount).toBe(2);
    });

    test('a click that draws nothing adds no stroke and leaves the pencil drawing', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, [{ x: 300, y: 300 }, { x: 305, y: 303 }]);
        const afterClick = await readPending(page);
        expect(afterClick.armed).toBe(true);
        expect(afterClick.strokeCount).toBe(0);
        await scribble(page, wave(200, 400));
        expect((await readPending(page)).strokeCount).toBe(1);
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        expect((await readPencil(page)).strokeCount).toBe(1);
    });

    test('escape with nothing drawn leaves no shape behind', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, [{ x: 300, y: 300 }, { x: 304, y: 302 }]);
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        expect(await page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.properties.routing === 'freehand').length)).toBe(0);
    });

    test('the pencil paints no background, carries no tips and holds no text', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const pencil = await readPencil(page);
        expect(pencil.fill).toBe('none');
        expect(pencil.markerStart).toBe(null);
        expect(pencil.markerEnd).toBe(null);
        expect(pencil.labelWidth).toBe(0);
        const painted = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(item => item.properties.routing === 'freehand');
            return {
                fills: Array.from(shape.element.querySelectorAll('path')).map(path => path.getAttribute('fill')),
                editable: shape.enterEditMode(),
                toolbarHasLabelButton: shape._connectorLabelDropdownElement != null
            };
        });
        expect(painted.fills.every(fill => fill === 'none')).toBe(true);
        expect(painted.editable).toBe(false);
        expect(painted.toolbarHasLabelButton).toBe(false);
    });

    test('the pencil appearance menu offers its colour alone, with no border, background, pulse or notation', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const rows = await openShapeMenuRows(page);
        expect(rows).toEqual(['Name', 'Foreground', 'Opacity']);
    });

    test('no mind map shape offers pulse or notation', async ({ page }) => {
        await setupEditor(page);
        const settings = await page.evaluate(() => ['MindMapBubbleShape', 'MindMapRectangleShape', 'MindMapCircleShape', 'MindMapConnectorShape'].map(type => {
            const shape = shell.board.createShape(type, null);
            return { type: type, pulse: shape.supportsPulseSetting(), notation: shape.supportsNotationSetting() };
        }));
        expect(settings.every(entry => entry.pulse === false)).toBe(true);
        expect(settings.every(entry => entry.notation === false)).toBe(true);
    });

    test('the colour picked for a pencil is the colour its strokes are drawn in', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        await page.evaluate(() => shell.board.selection.selectedShape.setPropertyCommand('foregroundColor', '#ff0000'));
        await expect.poll(async () => (await readPencil(page)).stroke).toBe('#ff0000');
    });

    test('each tip scales the stroke and sets its own opacity, cap and blending', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, wave(200, 400));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const pencil = await readPencil(page);
        expect(pencil.strokeWidth).toBeCloseTo(3, 5);
        expect(Number(pencil.strokeOpacity)).toBeCloseTo(0.8, 5);
        expect(pencil.lineCap).toBe('round');
        expect(pencil.filter).toContain('pencil-texture-');
        await page.evaluate(() => shell.board.selection.selectedShape.setPropertyCommand('pencilStyle', 'highlighter'));
        await expect.poll(async () => (await readPencil(page)).strokeWidth).toBeCloseTo(15, 5);
        const highlighter = await readPencil(page);
        expect(Number(highlighter.strokeOpacity)).toBeCloseTo(0.35, 5);
        expect(highlighter.lineCap).toBe('butt');
        expect(highlighter.blendMode).toBe('multiply');
        expect(highlighter.filter).toBe(null);
        await page.evaluate(() => shell.board.selection.selectedShape.setPropertyCommand('pencilStyle', 'marker'));
        await expect.poll(async () => (await readPencil(page)).strokeWidth).toBeCloseTo(7.8, 5);
        const marker = await readPencil(page);
        expect(marker.lineCap).toBe('round');
        expect(marker.blendMode).toBe('normal');
    });

    test('the pencil offers one stroke-shaped move grip, and dragging it carries every stroke together', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page);
        await scribble(page, [{ x: 200, y: 400 }, { x: 300, y: 400 }, { x: 400, y: 400 }]);
        await scribble(page, [{ x: 200, y: 460 }, { x: 300, y: 460 }, { x: 400, y: 460 }]);
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const before = await readPencil(page);
        expect(before.handleClasses).toEqual(['handle move mdl-freehand-move']);
        expect(before.strokeCount).toBe(2);
        const grabPoint = await svgClientPoint(page, 300, 400);
        const dropPoint = await svgClientPoint(page, 360, 470);
        await page.mouse.move(grabPoint.x, grabPoint.y);
        await page.mouse.down();
        await page.mouse.move(dropPoint.x, dropPoint.y, { steps: 10 });
        await page.mouse.up();
        await expect.poll(async () => (await readPencil(page)).firstPoint.y).toBeCloseTo(470, 0);
        const moved = await readPencil(page);
        expect(moved.firstPoint.x).toBeCloseTo(260, 0);
        expect(moved.lastStrokeFirstPoint.x).toBeCloseTo(260, 0);
        expect(moved.lastStrokeFirstPoint.y).toBeCloseTo(530, 0);
        expect(moved.pointCounts).toEqual(before.pointCounts);
        await page.evaluate(() => shell.commands.invoker.undo());
        await expect.poll(async () => (await readPencil(page)).firstPoint.y).toBeCloseTo(400, 0);
        expect((await readPencil(page)).firstPoint.x).toBeCloseTo(200, 0);
    });

    test('a pencil keeps every stroke and its tip across a save and reload of the model', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page, { pencilStyle: 'marker', lineWidth: 4 });
        await scribble(page, wave(200, 400));
        await scribble(page, wave(200, 470));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        const before = await readPencil(page);
        const restored = await page.evaluate(() => {
            const pencil = shell.board.shapes.shapes.find(shape => shape.properties.routing === 'freehand');
            const data = JSON.parse(JSON.stringify(pencil.serialize()));
            shell.board.removeShape(pencil);
            const copy = BaseShape.deserialize(shell.board, data);
            return {
                type: data.type,
                routing: copy.properties.routing,
                pencilStyle: copy.properties.pencilStyle,
                strokeCount: copy.properties.freehandStrokes.length,
                pathData: copy.path.getAttribute('d'),
                strokeWidth: Number(copy.path.getAttribute('stroke-width'))
            };
        });
        expect(restored.type).toBe('MindMapConnectorShape');
        expect(restored.routing).toBe('freehand');
        expect(restored.pencilStyle).toBe('marker');
        expect(restored.strokeCount).toBe(2);
        expect(restored.pathData).toBe(before.pathData);
        expect(restored.strokeWidth).toBeCloseTo(10.4, 5);
    });

    test('the pencil toolbar offers a drawn sample of each tip and drops the rows a freehand stroke has no use for', async ({ page }) => {
        await setupEditor(page);
        await armPencil(page, { pencilStyle: 'marker' });
        await scribble(page, wave(200, 400));
        await page.keyboard.press('Escape');
        await expect.poll(() => page.evaluate(() => shell.shapeDrawController.isArmed())).toBe(false);
        await page.evaluate(() => shell.board.selection.selectedShape._connectorTypeDropdownElement.dxDropDownButton('instance').open());
        await page.waitForFunction(() => document.querySelector('.dx-buttongroup-mode-outlined svg') !== null);
        const menu = await page.evaluate(() => {
            const tipGroup = document.querySelectorAll('.dx-buttongroup-mode-outlined')[0];
            const samples = Array.from(tipGroup.querySelectorAll('svg path'));
            return {
                rows: Array.from(document.querySelectorAll('.mdl-dropdown-list-label')).map(label => label.textContent),
                sampleCount: samples.length,
                sampleWidths: samples.map(sample => Number(sample.getAttribute('stroke-width'))),
                sampleOpacities: samples.map(sample => Number(sample.getAttribute('stroke-opacity'))),
                selectedIndex: Array.from(tipGroup.querySelectorAll('.dx-buttongroup-item')).findIndex(item => item.classList.contains('dx-state-selected'))
            };
        });
        expect(menu.rows).toEqual(['Tip', 'Line style', 'Line width']);
        expect(menu.sampleCount).toBe(4);
        expect(menu.sampleWidths).toEqual([2.2, 3.08, 5.72, 9]);
        expect(menu.sampleOpacities).toEqual([0.8, 1, 0.95, 0.35]);
        expect(menu.selectedIndex).toBe(2);
    });
});
