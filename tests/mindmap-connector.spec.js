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

async function createNodes(page) {
    await page.evaluate(() => {
        const first = shell.board.createShape('MindMapRectangleShape', null);
        first.setProperties({ name: 'A', x: 100, y: 100, width: 120, height: 80 });
        shell.board.addShape(first, false);
        const second = shell.board.createShape('MindMapRectangleShape', null);
        second.setProperties({ name: 'B', x: 400, y: 200, width: 120, height: 80 });
        shell.board.addShape(second, false);
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(200);
}

async function attachConnector(page, startPoint, endPoint) {
    await page.evaluate(({ startPoint, endPoint }) => {
        const first = shell.board.shapes.getByName('A');
        const second = shell.board.shapes.getByName('B');
        const connector = shell.board.createShape('MindMapConnectorShape', null);
        connector.setProperties({ name: 'C1' });
        shell.board.addShape(connector, false);
        connector.attachEnd('start', first, startPoint);
        connector.attachEnd('end', second, endPoint);
        shell.board.forceRefresh();
    }, { startPoint, endPoint });
    await page.waitForTimeout(200);
}

function readConnector(page) {
    return page.evaluate(() => {
        const connector = shell.board.shapes.getByName('C1');
        return {
            exists: !!connector,
            startShapeId: connector?.properties.startShapeId,
            endShapeId: connector?.properties.endShapeId,
            startRelativeX: connector?.properties.startRelativeX,
            startRelativeY: connector?.properties.startRelativeY,
            endRelativeX: connector?.properties.endRelativeX,
            endRelativeY: connector?.properties.endRelativeY,
            startX: connector?.properties.startX,
            startY: connector?.properties.startY,
            endX: connector?.properties.endX,
            endY: connector?.properties.endY,
            pathData: connector?.path.getAttribute('d'),
            markerEnd: connector?.path.getAttribute('marker-end'),
            markerStart: connector?.path.getAttribute('marker-start'),
            markerCount: connector?.defs.querySelectorAll('marker').length
        };
    });
}

function readHighlight(page) {
    return page.evaluate(() => {
        const highlighter = shell.connectorTargetHighlighter;
        const shape = highlighter.group.firstElementChild;
        return {
            targetName: highlighter.targetShape?.properties.name ?? null,
            visibility: highlighter.group.getAttribute('visibility'),
            tag: shape?.tagName ?? null,
            x: Number(shape?.getAttribute('x')),
            y: Number(shape?.getAttribute('y')),
            width: Number(shape?.getAttribute('width')),
            height: Number(shape?.getAttribute('height'))
        };
    });
}

test.describe('Mind map connectors', () => {
    test('an attached connector derives its endpoints from the exact point each end was dropped on, not a fixed anchor', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        const connector = await readConnector(page);
        expect(connector.exists).toBe(true);
        expect(connector.startRelativeX).toBeCloseTo(0.25, 5);
        expect(connector.startRelativeY).toBeCloseTo(0.25, 5);
        expect(connector.endRelativeX).toBeCloseTo(0.25, 5);
        expect(connector.endRelativeY).toBeCloseTo(0.75, 5);
        expect(connector.startX).toBeCloseTo(130, 5);
        expect(connector.startY).toBeCloseTo(120, 5);
        expect(connector.endX).toBeCloseTo(430, 5);
        expect(connector.endY).toBeCloseTo(260, 5);
        expect(connector.markerEnd).toContain('mindmap-marker-');
        expect(connector.markerStart).toBe(null);
        expect(connector.markerCount).toBe(1);
        expect(connector.pathData).toMatch(/^M 130 120 Q -?\d+(\.\d+)? -?\d+(\.\d+)?, 430 260$/);
    });

    test('a shape has no connection-point API to snap to', async ({ page }) => {
        await setupEditor(page);
        const hasAnchorApi = await page.evaluate(() => {
            const shape = shell.board.createShape('MindMapRectangleShape', null);
            return typeof shape.getConnectionAnchorPoint === 'function' || typeof shape.getNearestConnectionAnchor === 'function';
        });
        expect(hasAnchorApi).toBe(false);
    });

    test('moving an attached shape re-routes the connector to the same relative point inside it', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        await page.evaluate(() => {
            const first = shell.board.shapes.getByName('A');
            shell.board.setShapeProperties(first, { x: 300, y: 100 });
        });
        await page.waitForTimeout(200);
        const after = await readConnector(page);
        expect(after.startRelativeX).toBeCloseTo(0.25, 5);
        expect(after.startRelativeY).toBeCloseTo(0.25, 5);
        expect(after.startX).toBeCloseTo(330, 5);
        expect(after.startY).toBeCloseTo(120, 5);
    });

    test('resizing an attached shape keeps the connector at the same relative spot inside it', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        await page.evaluate(() => {
            const first = shell.board.shapes.getByName('A');
            shell.board.setShapeProperties(first, { width: 240 });
        });
        await page.waitForTimeout(200);
        const after = await readConnector(page);
        expect(after.startRelativeX).toBeCloseTo(0.25, 5);
        expect(after.startRelativeY).toBeCloseTo(0.25, 5);
        expect(after.startX).toBeCloseTo(160, 5);
        expect(after.startY).toBeCloseTo(120, 5);
    });

    test('dragging an attached shape by its move handle re-routes the connector live', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        const before = await readConnector(page);
        await page.evaluate(() => shell.board.selectShape(shell.board.shapes.getByName('A')));
        await page.waitForTimeout(200);
        const grab = await svgClientPoint(page, 160, 140);
        const drop = await svgClientPoint(page, 260, 240);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await readConnector(page);
        expect(after.startX).toBeGreaterThan(before.startX);
        const position = await page.evaluate(() => {
            const first = shell.board.shapes.getByName('A');
            return { x: first.properties.x, y: first.properties.y };
        });
        expect(position.x).toBeCloseTo(200, 0);
        expect(position.y).toBeCloseTo(200, 0);
    });

    test('dragging the bend handle on a straight connector kinks the line at the dragged point', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Bendy', startX: 100, startY: 500, endX: 300, endY: 500, routing: 'straight' });
            shell.board.addShape(connector, false);
            shell.board.selectShape(connector);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const grabBoard = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Bendy');
            return connector.getBendPoint(connector.properties.startX, connector.properties.startY, connector.properties.endX, connector.properties.endY);
        });
        const grab = await svgClientPoint(page, grabBoard.x, grabBoard.y);
        const drop = await svgClientPoint(page, 200, 420);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Bendy');
            return {
                bendAlong: connector.properties.bendAlong,
                bendOffset: connector.properties.bendOffset,
                pathData: connector.path.getAttribute('d')
            };
        });
        expect(after.bendAlong).toBeCloseTo(0.5, 1);
        expect(after.bendOffset).toBeLessThan(-50);
        expect(after.pathData).toMatch(/^M 100 500 L -?\d+(\.\d+)? -?\d+(\.\d+)? L 300 500$/);
    });

    test('dragging the bend handle on a curved connector adjusts the curve on top of its automatic bulge', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Curvy', startX: 100, startY: 450, endX: 500, endY: 450, routing: 'curved' });
            shell.board.addShape(connector, false);
            shell.board.selectShape(connector);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Curvy');
            return connector.getBendPoint(connector.properties.startX, connector.properties.startY, connector.properties.endX, connector.properties.endY);
        });
        const grab = await svgClientPoint(page, before.x, before.y);
        const dropBoard = { x: 300, y: 350 };
        const drop = await svgClientPoint(page, dropBoard.x, dropBoard.y);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Curvy');
            return connector.getBendPoint(connector.properties.startX, connector.properties.startY, connector.properties.endX, connector.properties.endY);
        });
        expect(after.x).toBeCloseTo(dropBoard.x, 0);
        expect(after.y).toBeCloseTo(dropBoard.y, 0);
    });

    test('dragging the bend handle on an orthogonal connector only slides the elbow along the dominant axis', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Elbow', startX: 100, startY: 400, endX: 300, endY: 600, routing: 'orthogonal' });
            shell.board.addShape(connector, false);
            shell.board.selectShape(connector);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Elbow');
            return connector.getBendPoint(connector.properties.startX, connector.properties.startY, connector.properties.endX, connector.properties.endY);
        });
        const grab = await svgClientPoint(page, before.x, before.y);
        const drop = await svgClientPoint(page, 250, 650);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Elbow');
            return { bendAlong: connector.properties.bendAlong, pathData: connector.path.getAttribute('d') };
        });
        expect(after.bendAlong).toBeCloseTo(0.75, 1);
        expect(after.pathData).toBe('M 100 400 L 250 400 L 250 600 L 300 600');
    });

    test('dragging the bend handle is undoable', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'UndoBend', startX: 100, startY: 500, endX: 300, endY: 500, routing: 'straight' });
            shell.board.addShape(connector, false);
            shell.board.selectShape(connector);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('UndoBend');
            return { bendAlong: connector.properties.bendAlong, bendOffset: connector.properties.bendOffset };
        });
        const grab = await svgClientPoint(page, 200, 500);
        const drop = await svgClientPoint(page, 200, 420);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const afterDrag = await page.evaluate(() => shell.board.shapes.getByName('UndoBend').properties.bendOffset);
        expect(Math.abs(afterDrag - before.bendOffset)).toBeGreaterThan(10);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        const afterUndo = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('UndoBend');
            return { bendAlong: connector.properties.bendAlong, bendOffset: connector.properties.bendOffset };
        });
        expect(afterUndo.bendAlong).toBeCloseTo(before.bendAlong, 5);
        expect(afterUndo.bendOffset).toBeCloseTo(before.bendOffset, 5);
    });

    test('dragging a new connector from inside one shape highlights whichever shape the pointer is over, and attaches at the exact drop points', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await page.evaluate(() => shell.shapeDrawController.toggle('MindMapConnectorShape', 'Connector', 'mindmap-button', { startTipType: 'none', endTipType: 'arrow', routing: 'curved' }));
        const insideA = await svgClientPoint(page, 130, 130);
        const insideB = await svgClientPoint(page, 430, 230);
        const emptyCanvas = await svgClientPoint(page, 300, 320);
        await page.mouse.move(insideA.x, insideA.y);
        await page.mouse.down();
        await page.mouse.move(insideB.x, insideB.y, { steps: 8 });
        await page.waitForTimeout(80);
        const overB = await readHighlight(page);
        expect(overB.visibility).toBe('visible');
        expect(overB.targetName).toBe('B');
        expect(overB).toMatchObject({ x: 400, y: 200, width: 120, height: 80 });
        await page.mouse.move(emptyCanvas.x, emptyCanvas.y, { steps: 8 });
        await page.waitForTimeout(80);
        const overEmpty = await readHighlight(page);
        expect(overEmpty.visibility).toBe('hidden');
        await page.mouse.move(insideB.x, insideB.y, { steps: 8 });
        await page.waitForTimeout(80);
        const overBAgain = await readHighlight(page);
        expect(overBAgain.visibility).toBe('visible');
        expect(overBAgain.targetName).toBe('B');
        await page.mouse.up();
        await page.waitForTimeout(250);
        const afterRelease = await readHighlight(page);
        expect(afterRelease.visibility).toBe('hidden');
        const drawn = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Connector');
            const first = shell.board.shapes.getByName('A');
            const second = shell.board.shapes.getByName('B');
            return {
                exists: !!connector,
                startsAtFirst: connector?.properties.startShapeId === first.id,
                endsAtSecond: connector?.properties.endShapeId === second.id,
                startX: connector?.properties.startX,
                startY: connector?.properties.startY,
                endX: connector?.properties.endX,
                endY: connector?.properties.endY,
                selected: shell.board.selection.selectedShape === connector,
                indexed: shell.board.connectorIndex.getForShapeId(first.id)?.size
            };
        });
        expect(drawn.exists).toBe(true);
        expect(drawn.startsAtFirst).toBe(true);
        expect(drawn.endsAtSecond).toBe(true);
        expect(drawn.startX).toBeCloseTo(130, 5);
        expect(drawn.startY).toBeCloseTo(130, 5);
        expect(drawn.endX).toBeCloseTo(430, 5);
        expect(drawn.endY).toBeCloseTo(230, 5);
        expect(drawn.selected).toBe(true);
        expect(drawn.indexed).toBe(1);
    });

    test('a connector cannot attach both ends to the same shape it started on', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await page.evaluate(() => shell.shapeDrawController.toggle('MindMapConnectorShape', 'Connector', 'mindmap-button', { startTipType: 'none', endTipType: 'arrow', routing: 'curved' }));
        const insideA = await svgClientPoint(page, 130, 130);
        const stillInsideA = await svgClientPoint(page, 190, 170);
        await page.mouse.move(insideA.x, insideA.y);
        await page.mouse.down();
        await page.mouse.move(stillInsideA.x, stillInsideA.y, { steps: 8 });
        await page.waitForTimeout(80);
        const duringDrag = await readHighlight(page);
        expect(duringDrag.visibility).toBe('hidden');
        await page.mouse.up();
        await page.waitForTimeout(250);
        const result = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Connector');
            const first = shell.board.shapes.getByName('A');
            return {
                startsAtFirst: connector?.properties.startShapeId === first.id,
                endShapeId: connector?.properties.endShapeId,
                endX: connector?.properties.endX,
                endY: connector?.properties.endY,
                indexed: shell.board.connectorIndex.getForShapeId(first.id)?.size
            };
        });
        expect(result.startsAtFirst).toBe(true);
        expect(result.endShapeId).toBe(null);
        expect(result.endX).toBeCloseTo(190, 5);
        expect(result.endY).toBeCloseTo(170, 5);
        expect(result.indexed).toBe(1);
    });

    test('starting the connector draw tool and releasing without dragging creates nothing', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await page.evaluate(() => shell.shapeDrawController.toggle('MindMapConnectorShape', 'Connector', 'mindmap-button'));
        const point = await svgClientPoint(page, 130, 130);
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(250);
        const connectorCount = await page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.isConnector()).length);
        expect(connectorCount).toBe(0);
    });

    test('deleting an attached shape deletes its connectors and undo restores both, attachment intact', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        await page.evaluate(() => shell.board.shapes.getByName('A').remove());
        await page.waitForTimeout(200);
        const afterDelete = await page.evaluate(() => ({
            nodeA: !!shell.board.shapes.getByName('A'),
            connector: !!shell.board.shapes.getByName('C1'),
            indexEmpty: shell.board.connectorIndex.isEmpty()
        }));
        expect(afterDelete.nodeA).toBe(false);
        expect(afterDelete.connector).toBe(false);
        expect(afterDelete.indexEmpty).toBe(true);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(250);
        const afterUndo = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('C1');
            const nodeA = shell.board.shapes.getByName('A');
            return {
                nodeA: !!nodeA,
                connector: !!connector,
                stillAttached: connector?.properties.startShapeId === nodeA?.id,
                startRelativeX: connector?.properties.startRelativeX,
                indexed: shell.board.connectorIndex.getForShapeId(nodeA?.id)?.size
            };
        });
        expect(afterUndo.nodeA).toBe(true);
        expect(afterUndo.connector).toBe(true);
        expect(afterUndo.stillAttached).toBe(true);
        expect(afterUndo.startRelativeX).toBeCloseTo(0.25, 5);
        expect(afterUndo.indexed).toBe(1);
    });

    test('connector attachment and tips survive a model round trip', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await attachConnector(page, { x: 130, y: 120 }, { x: 430, y: 260 });
        await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('C1');
            shell.board.setShapeProperties(connector, { text: 'because', endTipType: 'diamond', routing: 'orthogonal', lineStyle: 'dashed' });
        });
        await page.waitForTimeout(200);
        const roundTrip = await page.evaluate(() => {
            const model = JSON.parse(JSON.stringify(shell.serialize()));
            shell.deserialise(model);
            shell.board.forceRefresh();
            const connector = shell.board.shapes.getByName('C1');
            const first = shell.board.shapes.getByName('A');
            return {
                type: connector?.constructor.name,
                startsAtFirst: connector?.properties.startShapeId === first?.id,
                startRelativeX: connector?.properties.startRelativeX,
                text: connector?.properties.text,
                label: connector?.labelElement.textContent,
                endTipType: connector?.properties.endTipType,
                dashed: connector?.path.getAttribute('stroke-dasharray'),
                pathData: connector?.path.getAttribute('d'),
                indexed: shell.board.connectorIndex.getForShapeId(first?.id)?.size
            };
        });
        expect(roundTrip.type).toBe('MindMapConnectorShape');
        expect(roundTrip.startsAtFirst).toBe(true);
        expect(roundTrip.startRelativeX).toBeCloseTo(0.25, 5);
        expect(roundTrip.text).toBe('because');
        expect(roundTrip.label).toContain('because');
        expect(roundTrip.endTipType).toBe('diamond');
        expect(roundTrip.dashed).toBe('6 4');
        expect(roundTrip.pathData).toBe('M 130 120 L 280 120 L 280 260 L 430 260');
        expect(roundTrip.indexed).toBe(1);
    });

    test('the highlight traces a circle shape\'s ellipse, not its rectangular bounding box', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const circle = shell.board.createShape('MindMapCircleShape', null);
            circle.setProperties({ name: 'Bubble', x: 300, y: 300, width: 200, height: 200 });
            shell.board.addShape(circle, false);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        await page.evaluate(() => shell.shapeDrawController.toggle('MindMapConnectorShape', 'Connector', 'mindmap-button'));
        const outside = await svgClientPoint(page, 100, 100);
        const insideCircle = await svgClientPoint(page, 400, 400);
        await page.mouse.move(outside.x, outside.y);
        await page.mouse.down();
        await page.mouse.move(insideCircle.x, insideCircle.y, { steps: 8 });
        await page.waitForTimeout(80);
        const highlight = await page.evaluate(() => {
            const shape = shell.connectorTargetHighlighter.group.firstElementChild;
            return {
                tag: shape?.tagName ?? null,
                cx: Number(shape?.getAttribute('cx')),
                cy: Number(shape?.getAttribute('cy')),
                rx: Number(shape?.getAttribute('rx')),
                ry: Number(shape?.getAttribute('ry'))
            };
        });
        expect(highlight.tag).toBe('ellipse');
        expect(highlight.cx).toBeCloseTo(400, 5);
        expect(highlight.cy).toBeCloseTo(400, 5);
        expect(highlight.rx).toBeCloseTo(100, 5);
        expect(highlight.ry).toBeCloseTo(100, 5);
        await page.mouse.up();
        await page.waitForTimeout(200);
    });

    test('a free connector keeps its own endpoints, and dragging its end onto a shape highlights it before attaching at the drop point', async ({ page }) => {
        await setupEditor(page);
        await createNodes(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Free', startX: 100, startY: 400, endX: 250, endY: 400, routing: 'straight' });
            shell.board.addShape(connector, false);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const free = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Free');
            return { pathData: connector.path.getAttribute('d'), indexEmpty: shell.board.connectorIndex.isEmpty() };
        });
        expect(free.pathData).toBe('M 100 400 L 175 400 L 250 400');
        expect(free.indexEmpty).toBe(true);
        await page.evaluate(() => shell.board.selectShape(shell.board.shapes.getByName('Free')));
        await page.waitForTimeout(200);
        const grab = await svgClientPoint(page, 250, 400);
        const drop = await svgClientPoint(page, 430, 230);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.waitForTimeout(80);
        const duringDrag = await readHighlight(page);
        expect(duringDrag.visibility).toBe('visible');
        expect(duringDrag.targetName).toBe('B');
        await page.mouse.up();
        await page.waitForTimeout(250);
        const afterRelease = await readHighlight(page);
        expect(afterRelease.visibility).toBe('hidden');
        const attached = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Free');
            const second = shell.board.shapes.getByName('B');
            return {
                endsAtSecond: connector.properties.endShapeId === second.id,
                endRelativeX: connector.properties.endRelativeX,
                endRelativeY: connector.properties.endRelativeY,
                indexed: shell.board.connectorIndex.getForShapeId(second.id)?.size,
                endX: connector.properties.endX,
                endY: connector.properties.endY
            };
        });
        expect(attached.endsAtSecond).toBe(true);
        expect(attached.endRelativeX).toBeCloseTo(0.25, 5);
        expect(attached.endRelativeY).toBeCloseTo(0.375, 5);
        expect(attached.indexed).toBe(1);
        expect(attached.endX).toBeCloseTo(430, 5);
        expect(attached.endY).toBeCloseTo(230, 5);
    });

    test('double clicking a connector edits its text inline and the edit is undoable', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Labelled', startX: 100, startY: 500, endX: 300, endY: 500, routing: 'straight' });
            shell.board.addShape(connector, false);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const centre = await svgClientPoint(page, 200, 500);
        await page.mouse.dblclick(centre.x, centre.y);
        await page.waitForTimeout(300);
        const editing = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Labelled');
            return {
                editable: connector.labelElement.getAttribute('contenteditable'),
                focused: document.activeElement === connector.labelElement,
                pointerLocked: shell.board.pointerLocked
            };
        });
        expect(editing.editable).toBe('true');
        expect(editing.focused).toBe(true);
        expect(editing.pointerLocked).toBe(true);
        await page.keyboard.type('because');
        const away = await svgClientPoint(page, 800, 700);
        await page.mouse.click(away.x, away.y);
        await page.waitForTimeout(300);
        const committed = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Labelled');
            return {
                text: connector.properties.text,
                editable: connector.labelElement.getAttribute('contenteditable'),
                pointerLocked: shell.board.pointerLocked
            };
        });
        expect(committed.text).toBe('because');
        expect(committed.editable).toBe('false');
        expect(committed.pointerLocked).toBe(false);
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        const undone = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Labelled');
            return { text: connector.properties.text, renderedText: connector.labelElement.textContent };
        });
        expect(undone.text).toBe('');
        expect(undone.renderedText).toBe('');
    });

    test('dragging the connector label along the line moves the text position and is undoable', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Draggable', startX: 100, startY: 500, endX: 300, endY: 500, routing: 'straight', text: 'label', textPosition: 0.25 });
            shell.board.addShape(connector, false);
            shell.board.selectShape(connector);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const before = await page.evaluate(() => shell.board.shapes.getByName('Draggable').properties.textPosition);
        expect(before).toBeCloseTo(0.25, 5);
        const grab = await svgClientPoint(page, 150, 500);
        const drop = await svgClientPoint(page, 260, 500);
        await page.mouse.move(grab.x, grab.y);
        await page.mouse.down();
        await page.mouse.move(drop.x, drop.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Draggable');
            return { textPosition: connector.properties.textPosition, text: connector.properties.text };
        });
        expect(after.textPosition).toBeCloseTo(0.8, 1);
        expect(after.text).toBe('label');
        await page.evaluate(() => modellus.undo());
        await page.waitForTimeout(200);
        const undone = await page.evaluate(() => shell.board.shapes.getByName('Draggable').properties.textPosition);
        expect(undone).toBeCloseTo(0.25, 5);
    });

    test('the label of a default curved connector is not covered by its own context toolbar once selected', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            const connector = shell.board.createShape('MindMapConnectorShape', null);
            connector.setProperties({ name: 'Default', startX: 100, startY: 300, endX: 400, endY: 300, text: 'because' });
            shell.board.addShape(connector, false);
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(200);
        const onCurve = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Default');
            const total = connector.path.getTotalLength();
            const point = connector.path.getPointAtLength(total * 0.2);
            return { x: point.x, y: point.y };
        });
        const linePoint = await svgClientPoint(page, onCurve.x, onCurve.y);
        await page.mouse.click(linePoint.x, linePoint.y);
        await page.waitForTimeout(300);
        const selected = await page.evaluate(() => shell.board.selection.selectedShape?.properties.name);
        expect(selected).toBe('Default');
        const overlap = await page.evaluate(() => {
            const connector = shell.board.shapes.getByName('Default');
            const labelRect = connector.labelElement.getBoundingClientRect();
            const toolbar = document.querySelector('.shape-context-toolbar.visible');
            const toolbarRect = toolbar.getBoundingClientRect();
            return toolbarRect.top < labelRect.bottom;
        });
        expect(overlap).toBe(false);
        const labelRect = await page.evaluate(() => shell.board.shapes.getByName('Default').labelElement.getBoundingClientRect());
        const labelCenterX = (labelRect.left + labelRect.right) / 2;
        const labelCenterY = (labelRect.top + labelRect.bottom) / 2;
        const elementAtLabel = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('class'), { x: labelCenterX, y: labelCenterY });
        expect(elementAtLabel).toBe('mdl-mindmap-connector-label');
        await page.mouse.move(labelCenterX, labelCenterY);
        await page.mouse.down();
        await page.mouse.move(labelCenterX + 80, labelCenterY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(250);
        const after = await page.evaluate(() => shell.board.shapes.getByName('Default').properties.textPosition);
        expect(after).not.toBeCloseTo(0.5, 1);
    });
});
