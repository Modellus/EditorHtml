const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
// One transparent pixel, so an image body draws without reaching anything real.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

// A referential turned by the given angle, with its origin at its centre so the axes keep
// crossing at the same point of the board whichever way it is turned, at a scale of 0.05 per
// pixel: a term of 2 is 40 pixels along an axis. Returns where the axes cross on the board.
async function addTurnedReferential(page, rotation) {
    return page.evaluate(rotation => {
        shell.commands.addShape('ReferentialShape', 'Referential');
        const referential = shell.board.shapes.getByName('Referential');
        referential.setProperties({ autoScale: false, scaleX: 0.05, scaleY: 0.05, rotation: rotation });
        referential.draw();
        const position = referential.getBoardPosition();
        return { x: position.x + referential.properties.originX, y: position.y + referential.properties.originY };
    }, rotation);
}

async function addChild(page, type, name, properties) {
    await page.evaluate(({ type, name, properties }) => {
        const referential = shell.board.shapes.getByName('Referential');
        shell.commands.addShape(type, name, referential);
        const shape = shell.board.shapes.getByName(name);
        shape.setProperties(properties);
        shape.tick();
        shape.draw();
    }, { type, name, properties });
}

async function dragOnScreen(page, from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(250);
}

test.describe('Shapes in a turned referential', () => {
    test('the term labels of a shape are drawn over the shape itself', async ({ page }) => {
        await setupEditor(page);
        await addTurnedReferential(page, 0);
        await addChild(page, 'BodyShape', 'Body', { xTerm: '2', yTerm: '3', xTermDisplayMode: 'nameValue', yTermDisplayMode: 'nameValue' });
        await addChild(page, 'ArcShape', 'Arc', { xTerm: '0', yTerm: '0', radiusTerm: '2', radiusTermDisplayMode: 'nameValue' });
        await addChild(page, 'VectorShape', 'Vector', { xOriginTerm: '0', yOriginTerm: '0', xTerm: '2', yTerm: '1', xTermDisplayMode: 'nameValue' });
        const order = await page.evaluate(() => {
            const after = (shape, drawing) => {
                const children = Array.from(shape.element.children);
                return children.indexOf(shape.termDisplayLayer) > children.indexOf(drawing);
            };
            const body = shell.board.shapes.getByName('Body');
            const arc = shell.board.shapes.getByName('Arc');
            const vector = shell.board.shapes.getByName('Vector');
            return {
                bodyLabelsOverImage: after(body, body.image) && after(body, body.circle),
                arcLabelsOverArc: after(arc, arc.arcPath),
                vectorLabelsOverLine: after(vector, vector.line),
                bodyLabelCount: body.termDisplayLayer.lastChild.children.length
            };
        });
        expect(order.bodyLabelsOverImage).toBe(true);
        expect(order.arcLabelsOverArc).toBe(true);
        expect(order.vectorLabelsOverLine).toBe(true);
        expect(order.bodyLabelCount).toBe(2);
    });

    test('a vector points along the turned axes, components and all', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 90);
        await addChild(page, 'VectorShape', 'Vector', { xOriginTerm: '0', yOriginTerm: '0', xTerm: '2', yTerm: '0', showComponents: true });
        const vector = await page.evaluate(() => {
            const vector = shell.board.shapes.getByName('Vector');
            const read = (element, names) => names.map(name => Number(element.getAttribute(name)));
            return {
                line: read(vector.line, ['x1', 'y1', 'x2', 'y2']),
                horizontalComponent: read(vector.horizontalComponentLine, ['x2', 'y2']),
                tip: vector.getGripPositions().tip,
                anchor: vector.getTermEntryAnchorPoint({ endpoint: 'tip' })
            };
        });
        // Two units along the x axis: forty pixels, which point straight down on the board once
        // the referential is turned a quarter turn clockwise.
        expect(vector.line[0]).toBeCloseTo(origin.x, 3);
        expect(vector.line[1]).toBeCloseTo(origin.y, 3);
        expect(vector.line[2]).toBeCloseTo(origin.x, 3);
        expect(vector.line[3]).toBeCloseTo(origin.y + 40, 3);
        expect(vector.horizontalComponent[0]).toBeCloseTo(origin.x, 3);
        expect(vector.horizontalComponent[1]).toBeCloseTo(origin.y + 40, 3);
        expect(vector.tip.x).toBeCloseTo(origin.x, 3);
        expect(vector.tip.y).toBeCloseTo(origin.y + 40, 3);
        expect(vector.anchor.y).toBeCloseTo(origin.y + 40, 3);
    });

    test('a line lies along its angle measured in the turned referential', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 90);
        await addChild(page, 'LineShape', 'Line', { xTerm: '0', yTerm: '0', angleTerm: '0' });
        const line = await page.evaluate(() => {
            const line = shell.board.shapes.getByName('Line');
            const read = name => Number(line.mainLine.getAttribute(name));
            return { x1: read('x1'), y1: read('y1'), x2: read('x2'), y2: read('y2'), grip: line.getGripPositions().angle };
        });
        // An angle of zero runs along the x axis, which stands vertical on the board.
        expect(line.x1).toBeCloseTo(origin.x, 3);
        expect(line.x2).toBeCloseTo(origin.x, 3);
        expect(line.y2).toBeGreaterThan(line.y1);
        expect(line.grip.x).toBeCloseTo(origin.x, 3);
        expect(line.grip.y).toBeGreaterThan(origin.y);
    });

    test('an arc sweeps between its angles measured in the turned referential', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 90);
        await addChild(page, 'ArcShape', 'Arc', { xTerm: '0', yTerm: '0', radiusTerm: '2', startAngleTerm: '0' });
        const grips = await page.evaluate(() => {
            const arc = shell.board.shapes.getByName('Arc');
            // A quarter turn, in whichever unit the model measures its angles.
            arc.setProperties({ endAngleTerm: arc.getUseRadians() ? String(Math.PI / 2) : '90' });
            arc.tick();
            arc.draw();
            return arc.getArcGripPositions();
        });
        // From the x axis to the y axis: from straight below the centre round to its right.
        expect(grips.start.x).toBeCloseTo(origin.x, 3);
        expect(grips.start.y).toBeCloseTo(origin.y + 40, 3);
        expect(grips.end.x).toBeCloseTo(origin.x + 40, 3);
        expect(grips.end.y).toBeCloseTo(origin.y, 3);
    });

    test('an image body is turned with the referential, and its outline with it', async ({ page }) => {
        await setupEditor(page);
        await addTurnedReferential(page, 90);
        await addChild(page, 'BodyShape', 'Body', { xTerm: '1', yTerm: '1', imageUrl: PIXEL });
        await addChild(page, 'VectorShape', 'Vector', { xOriginTerm: '0', yOriginTerm: '0', xTerm: '2', yTerm: '1' });
        const result = await page.evaluate(() => {
            const body = shell.board.shapes.getByName('Body');
            const vector = shell.board.shapes.getByName('Vector');
            shell.board.selection.select(body);
            // The turn sits on the group inside the outline, so the clip on the outline stays
            // laid on the board.
            const bodyOutline = body._highlightProxy?.firstChild?.getAttribute('transform') ?? null;
            const bodyClipTurned = body._highlightProxy?.getAttribute('transform') ?? null;
            shell.board.selection.select(vector);
            const vectorOutline = vector._highlightProxy?.firstChild?.getAttribute('transform') ?? null;
            return { image: body.image.getAttribute('transform'), bodyOutline, bodyClipTurned, vectorOutline };
        });
        expect(result.image).toContain('rotate(90 ');
        // The body's square outline turns about its centre; the vector's outline already traces
        // the turned line and is left as it is.
        expect(result.bodyOutline).toContain('rotate(90 ');
        expect(result.bodyClipTurned).toBeNull();
        expect(result.vectorOutline).toBeNull();
    });

    test('term guides and labels project onto the turned axes', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 90);
        await addChild(page, 'PointShape', 'Point', { xTerm: '2', yTerm: '3', xTermDisplayMode: 'nameValue', yTermDisplayMode: 'nameValue' });
        const result = await page.evaluate(() => {
            const point = shell.board.shapes.getByName('Point');
            const guides = Array.from(point.termDisplay.guidesLayer.children).map(line => ({
                x1: Number(line.getAttribute('x1')), y1: Number(line.getAttribute('y1')),
                x2: Number(line.getAttribute('x2')), y2: Number(line.getAttribute('y2'))
            }));
            const labels = Array.from(point.termDisplay.labelsLayer.children).map(group => {
                const text = group.lastChild;
                return { text: text.textContent, x: Number(text.getAttribute('x')), y: Number(text.getAttribute('y')), anchor: text.getAttribute('text-anchor'), transform: group.getAttribute('transform') };
            });
            return { position: point.getBoardPosition(), guides, labels };
        });
        // Two across and three up in the referential: sixty to the right and forty down on the
        // board, once the referential is turned a quarter turn clockwise.
        expect(result.position.x).toBeCloseTo(origin.x + 60, 3);
        expect(result.position.y).toBeCloseTo(origin.y + 40, 3);
        const xGuide = result.guides.find(guide => Math.abs(guide.x2 - origin.x) < 0.001);
        const yGuide = result.guides.find(guide => Math.abs(guide.y2 - origin.y) < 0.001);
        // The guide to the x axis meets it forty down from the origin; the one to the y axis
        // meets it sixty to the right. Both start at the point.
        expect(xGuide).toBeTruthy();
        expect(xGuide.y2).toBeCloseTo(origin.y + 40, 3);
        expect(xGuide.x1).toBeCloseTo(result.position.x, 3);
        expect(yGuide).toBeTruthy();
        expect(yGuide.x2).toBeCloseTo(origin.x + 60, 3);
        expect(yGuide.y1).toBeCloseTo(result.position.y, 3);
        // The labels are laid out along the axes as when the referential lies flat, and turned
        // with it: the x label twelve beyond the x axis, centred; the y label six beyond the y
        // axis, ending at it. Each is turned about its own point.
        const xLabel = result.labels.find(label => label.text.includes('2.00'));
        const yLabel = result.labels.find(label => label.text.includes('3.00'));
        expect(xLabel.anchor).toBe('middle');
        expect(xLabel.x).toBeCloseTo(origin.x - 12, 3);
        expect(xLabel.y).toBeCloseTo(origin.y + 40, 3);
        expect(xLabel.transform).toBe(`rotate(90 ${xLabel.x} ${xLabel.y})`);
        expect(yLabel.anchor).toBe('end');
        expect(yLabel.x).toBeCloseTo(origin.x + 60, 3);
        expect(yLabel.y).toBeCloseTo(origin.y - 6, 3);
        expect(yLabel.transform).toBe(`rotate(90 ${yLabel.x} ${yLabel.y})`);
    });

    test('the referential clips its own axes and grid in its own frame, and its children on the board', async ({ page }) => {
        await setupEditor(page);
        await addTurnedReferential(page, 30);
        await addChild(page, 'PointShape', 'Point', { xTerm: '1', yTerm: '1' });
        const clips = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential');
            const point = shell.board.shapes.getByName('Point');
            const clipOf = element => {
                const id = /url\(#(.+?)\)/.exec(element.getAttribute('clip-path'))[1];
                const rect = shell.board.svg.querySelector(`#${CSS.escape(id)} rect`);
                return { transform: rect.getAttribute('transform'), width: Number(rect.getAttribute('width')) };
            };
            return {
                ticks: clipOf(referential.ticksLayer),
                axis: clipOf(referential.horizontalAxis),
                ticksTransform: referential.ticksLayer.getAttribute('transform'),
                child: clipOf(point.element),
                width: referential.properties.width
            };
        });
        // The tick layer is itself turned, so its clip is the plain rectangle; the point is
        // drawn straight onto the board, so its clip is the turned rectangle.
        expect(clips.ticksTransform).toContain('rotate(30');
        expect(clips.ticks.transform).toBeNull();
        expect(clips.ticks.width).toBeCloseTo(clips.width, 3);
        expect(clips.axis.transform).toBeNull();
        expect(clips.child.transform).toContain('rotate(30');
    });

    test('dragging the tip of a vector in a turned referential follows the pointer', async ({ page }) => {
        await setupEditor(page);
        await addTurnedReferential(page, 90);
        await addChild(page, 'VectorShape', 'Vector', { xOriginTerm: '0', yOriginTerm: '0', xTerm: '2', yTerm: '0' });
        const tip = await page.evaluate(() => {
            const vector = shell.board.shapes.getByName('Vector');
            shell.board.selection.select(vector);
            const rect = vector.handleElements[2].getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        // The tip points down the board; pulling it forty further down lengthens the vector by
        // two along the x axis, and leaves the y component alone.
        await dragOnScreen(page, tip, { x: tip.x, y: tip.y + 40 });
        const terms = await page.evaluate(() => {
            const vector = shell.board.shapes.getByName('Vector');
            return { x: Number(vector.properties.xTerm), y: Number(vector.properties.yTerm) };
        });
        expect(terms.x).toBeCloseTo(4, 1);
        expect(terms.y).toBeCloseTo(0, 1);
    });

    test('dragging the angle grip of a line in a turned referential reads the angle in it', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 90);
        await addChild(page, 'LineShape', 'Line', { xTerm: '0', yTerm: '0', angleTerm: '0' });
        const drag = await page.evaluate(origin => {
            const line = shell.board.shapes.getByName('Line');
            shell.board.selection.select(line);
            const rect = line.handleElements[1].getBoundingClientRect();
            const grip = line.getGripPositions().angle;
            const distance = Math.hypot(grip.x - origin.x, grip.y - origin.y);
            const toScreen = point => {
                const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(shell.board.svg.getScreenCTM());
                return { x: screenPoint.x, y: screenPoint.y };
            };
            return { from: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, to: toScreen({ x: origin.x + distance, y: origin.y }) };
        }, origin);
        // The grip is taken from below the origin round to its right on the board: from the x
        // axis of the turned referential round to its y axis, a quarter turn.
        await dragOnScreen(page, drag.from, drag.to);
        const angle = await page.evaluate(() => Number(shell.board.shapes.getByName('Line').properties.angleTerm));
        expect(angle).toBeCloseTo(90, 0);
    });

    test('dragging a point in a turned referential moves it where the pointer goes', async ({ page }) => {
        await setupEditor(page);
        await addTurnedReferential(page, 90);
        await addChild(page, 'PointShape', 'Point', { xTerm: '0', yTerm: '0' });
        const start = await page.evaluate(() => {
            const point = shell.board.shapes.getByName('Point');
            shell.board.selection.select(point);
            const rect = point.handleElements[0].getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        });
        // Forty to the right on the board is forty up the turned referential's y axis: two units.
        await dragOnScreen(page, start, { x: start.x + 40, y: start.y });
        const terms = await page.evaluate(() => {
            const point = shell.board.shapes.getByName('Point');
            return { x: Number(point.properties.xTerm), y: Number(point.properties.yTerm) };
        });
        expect(terms.x).toBeCloseTo(0, 1);
        expect(terms.y).toBeCloseTo(2, 1);
    });

    test('a trail already drawn turns with the referential', async ({ page }) => {
        await setupEditor(page);
        const origin = await addTurnedReferential(page, 0);
        await addChild(page, 'PointShape', 'Point', { xTerm: '2', yTerm: '0' });
        const trail = await page.evaluate(() => {
            const referential = shell.board.shapes.getByName('Referential');
            const point = shell.board.shapes.getByName('Point');
            point.trajectory.values = [point.getBoardPosition()];
            referential.setProperty('rotation', 90);
            referential.draw();
            return { trail: point.trajectory.values[0], position: point.getBoardPosition() };
        });
        expect(trail.trail.x).toBeCloseTo(origin.x, 3);
        expect(trail.trail.y).toBeCloseTo(origin.y + 40, 3);
        expect(trail.position.x).toBeCloseTo(trail.trail.x, 3);
        expect(trail.position.y).toBeCloseTo(trail.trail.y, 3);
    });
});
