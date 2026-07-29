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
        const svg = document.getElementById('svg');
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        const client = point.matrixTransform(svg.getScreenCTM());
        return { x: client.x, y: client.y };
    }, { x, y });
}

async function armShape(page, type, name) {
    await page.evaluate(({ type, name }) => shell.shapeDrawController.toggle(type, name, 'mindmap-button'), { type, name });
}

async function drawShape(page, startX, startY, endX, endY) {
    const start = await svgClientPoint(page, startX, startY);
    const end = await svgClientPoint(page, endX, endY);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

test.describe('Mind map node shapes', () => {
    test('dragging draws a bubble with the dragged bounds', async ({ page }) => {
        await setupEditor(page);
        await armShape(page, 'MindMapBubbleShape', 'Bubble');
        await drawShape(page, 300, 300, 520, 460);
        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Bubble');
            return {
                type: shape?.constructor.name,
                x: shape?.properties.x,
                y: shape?.properties.y,
                width: shape?.properties.width,
                height: shape?.properties.height,
                bodyTag: shape?.bodyElement.tagName,
                hasPath: shape?.bodyElement.getAttribute('d')?.length > 0,
                selected: shell.board.selection.selectedShape === shape
            };
        });
        expect(result.type).toBe('MindMapBubbleShape');
        expect(result.x).toBeCloseTo(300, 0);
        expect(result.y).toBeCloseTo(300, 0);
        expect(result.width).toBeCloseTo(220, 0);
        expect(result.height).toBeCloseTo(160, 0);
        expect(result.bodyTag).toBe('path');
        expect(result.hasPath).toBe(true);
        expect(result.selected).toBe(true);
    });

    test('a tiny drag falls back to the minimum draw size and undo removes the shape', async ({ page }) => {
        await setupEditor(page);
        await armShape(page, 'MindMapCircleShape', 'Circle');
        await drawShape(page, 200, 200, 230, 208);
        const created = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Circle');
            return { width: shape?.properties.width, height: shape?.properties.height, bodyTag: shape?.bodyElement.tagName };
        });
        expect(created.width).toBe(140);
        expect(created.height).toBe(140);
        expect(created.bodyTag).toBe('ellipse');
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => !!shell.board.shapes.getByName('Circle'))).toBe(false);
        await page.evaluate(() => modellus.redo());
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => !!shell.board.shapes.getByName('Circle'))).toBe(true);
    });

    test('node text survives a serialize and deserialize round trip', async ({ page }) => {
        await setupEditor(page);
        await armShape(page, 'MindMapRectangleShape', 'Rectangle');
        await drawShape(page, 150, 150, 350, 260);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Rectangle');
            shell.board.setShapeProperties(shape, { text: 'Central idea' });
        });
        await page.waitForTimeout(200);
        const roundTrip = await page.evaluate(() => {
            const model = JSON.parse(JSON.stringify(shell.serialize()));
            shell.deserialise(model);
            shell.board.forceRefresh();
            const shape = shell.board.shapes.getByName('Rectangle');
            return {
                type: shape?.constructor.name,
                text: shape?.properties.text,
                renderedText: shape?.textElement.textContent,
                width: shape?.properties.width
            };
        });
        expect(roundTrip.type).toBe('MindMapRectangleShape');
        expect(roundTrip.text).toBe('Central idea');
        expect(roundTrip.renderedText).toBe('Central idea');
        expect(roundTrip.width).toBeCloseTo(200, 0);
    });

    test('double clicking a node edits its text and the edit is undoable', async ({ page }) => {
        await setupEditor(page);
        await armShape(page, 'MindMapRectangleShape', 'Rectangle');
        await drawShape(page, 200, 200, 420, 320);
        const centre = await svgClientPoint(page, 310, 260);
        await page.mouse.dblclick(centre.x, centre.y);
        await page.waitForTimeout(300);
        const editing = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Rectangle');
            return {
                editable: shape.textElement.getAttribute('contenteditable'),
                focused: document.activeElement === shape.textElement,
                pointerLocked: shell.board.pointerLocked
            };
        });
        expect(editing.editable).toBe('true');
        expect(editing.focused).toBe(true);
        expect(editing.pointerLocked).toBe(true);
        await page.keyboard.type('Branch one');
        const away = await svgClientPoint(page, 800, 700);
        await page.mouse.click(away.x, away.y);
        await page.waitForTimeout(300);
        const committed = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Rectangle');
            return {
                text: shape.properties.text,
                editable: shape.textElement.getAttribute('contenteditable'),
                pointerLocked: shell.board.pointerLocked
            };
        });
        expect(committed.text).toBe('Branch one');
        expect(committed.editable).toBe('false');
        expect(committed.pointerLocked).toBe(false);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        const undone = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Rectangle');
            return { text: shape.properties.text, renderedText: shape.textElement.textContent };
        });
        expect(undone.text).toBe('');
        expect(undone.renderedText).toBe('');
    });

    test('a shape has no fixed connection points, only a relative-position mapping', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            const shape = shell.board.createShape('MindMapRectangleShape', null);
            shape.setProperties({ name: 'Plain', x: 100, y: 100, width: 200, height: 100 });
            shell.board.addShape(shape, false);
            return {
                supports: shape.supportsConnectorAttachment(),
                hasAnchorApi: typeof shape.getConnectionAnchorPoint === 'function',
                topLeft: shape.getConnectorPointForRelativePosition(0, 0),
                arbitrary: shape.getConnectorPointForRelativePosition(0.2, 0.9),
                bottomRight: shape.getConnectorPointForRelativePosition(1, 1)
            };
        });
        expect(result.supports).toBe(true);
        expect(result.hasAnchorApi).toBe(false);
        expect(result.topLeft).toEqual({ x: 100, y: 100 });
        expect(result.arbitrary).toEqual({ x: 140, y: 190 });
        expect(result.bottomRight).toEqual({ x: 300, y: 200 });
    });

    test('a locked shape cannot be a connector attachment target', async ({ page }) => {
        await setupEditor(page);
        const supports = await page.evaluate(() => {
            const shape = shell.board.createShape('MindMapRectangleShape', null);
            shape.setProperties({ name: 'Locked', x: 100, y: 100, width: 200, height: 100, lockedForUsers: true });
            shell.board.addShape(shape, false);
            return shape.supportsConnectorAttachment();
        });
        expect(supports).toBe(false);
    });

    test('relative position round-trips through a drop point on a plain and a rotated shape', async ({ page }) => {
        await setupEditor(page);
        const result = await page.evaluate(() => {
            const plain = shell.board.createShape('MindMapRectangleShape', null);
            plain.setProperties({ name: 'Plain', x: 100, y: 100, width: 200, height: 100 });
            shell.board.addShape(plain, false);
            const dropPoint = { x: 260, y: 130 };
            const plainRelative = plain.getRelativePositionForConnectorPoint(dropPoint);
            const plainRoundTrip = plain.getConnectorPointForRelativePosition(plainRelative.x, plainRelative.y);
            const rotated = shell.board.createShape('MindMapRectangleShape', null);
            rotated.setProperties({ name: 'Rotated', x: 100, y: 100, width: 200, height: 100, rotation: 90 });
            shell.board.addShape(rotated, false);
            const rotatedDropPoint = rotated.getConnectorPointForRelativePosition(0.75, 0.2);
            const rotatedRelative = rotated.getRelativePositionForConnectorPoint(rotatedDropPoint);
            return { plainRelative, plainRoundTrip, dropPoint, rotatedRelative };
        });
        expect(result.plainRelative.x).toBeCloseTo(0.8, 5);
        expect(result.plainRelative.y).toBeCloseTo(0.3, 5);
        expect(result.plainRoundTrip.x).toBeCloseTo(result.dropPoint.x, 5);
        expect(result.plainRoundTrip.y).toBeCloseTo(result.dropPoint.y, 5);
        expect(result.rotatedRelative.x).toBeCloseTo(0.75, 5);
        expect(result.rotatedRelative.y).toBeCloseTo(0.2, 5);
    });

    test('a drop point outside the box clamps to the nearest edge of the relative range', async ({ page }) => {
        await setupEditor(page);
        const relative = await page.evaluate(() => {
            const shape = shell.board.createShape('MindMapRectangleShape', null);
            shape.setProperties({ name: 'Clamped', x: 100, y: 100, width: 200, height: 100 });
            shell.board.addShape(shape, false);
            return shape.getRelativePositionForConnectorPoint({ x: 1000, y: -1000 });
        });
        expect(relative).toEqual({ x: 1, y: 0 });
    });
});
