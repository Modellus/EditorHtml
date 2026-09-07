const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';
// Where each object is put, so a place inside it can be aimed at by the board's own coordinates
// rather than by the bounds of whatever it happens to have drawn.
const RULER_AT = { x: 60, y: 60, width: 320, height: 64 };
const PROTRACTOR_AT = { x: 60, y: 60, width: 300, height: 170 };

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

async function addObject(page, componentType, name, properties) {
    await page.evaluate(input => {
        const shape = shell.commands.addComponent(input.componentType, input.name);
        shape.setProperties(input.properties);
        shape.draw();
    }, { componentType, name, properties });
    await expect.poll(() => page.evaluate(name => shell.board.shapes.getByName(name)?.contentGroup?.children.length ?? 0, name)).toBeGreaterThan(0);
}

function readNodes(page, name, sourceId, tag = '*') {
    return page.evaluate(input => Array.from(shell.board.shapes.getByName(input.name).contentGroup.querySelectorAll(`${input.tag}[data-source-id^="${input.sourceId}"]`))
        .map(node => ({ id: node.getAttribute('data-source-id'), text: node.textContent, x: Number(node.getAttribute('x')), width: Number(node.getAttribute('width')) })), { name, sourceId, tag });
}

function readTexts(page, name) {
    return page.evaluate(name => Array.from(shell.board.shapes.getByName(name).contentGroup.querySelectorAll('text')).map(node => node.textContent), name);
}

function readProperties(page, name) {
    return page.evaluate(name => shell.board.shapes.getByName(name).properties, name);
}

// Where a point of the board falls on the screen.
function svgClientPoint(page, x, y) {
    return page.evaluate(({ x, y }) => {
        const point = document.getElementById('svg').createSVGPoint();
        point.x = x;
        point.y = y;
        const client = point.matrixTransform(document.getElementById('svg').getScreenCTM());
        return { x: client.x, y: client.y };
    }, { x, y });
}

// Moves the pointer to a place inside an object, given the box the object was put in.
async function movePointerInto(page, origin, x, y, options = {}) {
    const point = await svgClientPoint(page, origin.x + x, origin.y + y);
    await page.mouse.move(point.x, point.y, options);
}

async function movePointerAway(page) {
    const point = await svgClientPoint(page, 20, 20);
    await page.mouse.move(point.x, point.y);
}

// The ruler is inset by spacing.medium and its scale by an edge of its own, so the value 0 stands
// 26 pixels in and the whole scale is 268 wide.
const SCALE_LEFT = 26;
const SCALE_WIDTH = 268;
const TICK_BAND_Y = 24;
const NUMBER_BAND_Y = 48;

test.describe('the ruler, built from blocks', () => {
    test('is marked from one end to the other, a number every division and ten marks between', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        expect((await readNodes(page, 'Ruler', 'tick-label')).map(node => node.text))
            .toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
        expect(await readNodes(page, 'Ruler', 'major-tick')).toHaveLength(11);
        expect(await readNodes(page, 'Ruler', 'middle-tick')).toHaveLength(10);
        expect(await readNodes(page, 'Ruler', 'minor-tick')).toHaveLength(101);
    });

    // The value under the pointer, and nothing left behind once the pointer has gone.
    test('reads where the pointer stands, and stops reading when it leaves', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        expect(await readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, TICK_BAND_Y);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Ruler')).toContain('5.00');
        await movePointerAway(page);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
        await expect.poll(() => readNodes(page, 'Ruler', 'reading-plate')).toHaveLength(0);
    });

    // Pulling a number holds the part it stands for and writes the count, so the ruler gains
    // divisions rather than stretching the ones it had.
    test('is stretched by pulling one of its own numbers, keeping the division it was read at', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        // The number 10 stands at the far end of the scale; pulling it back to the middle doubles it.
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH, NUMBER_BAND_Y);
        await page.mouse.down();
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, NUMBER_BAND_Y, { steps: 4 });
        await page.mouse.up();
        const properties = await readProperties(page, 'Ruler');
        expect(properties.minimumX).toBe(0);
        expect(properties.maximumX).toBeGreaterThan(17);
        expect(properties.maximumX).toBeLessThan(23);
        expect(properties.majorTicks).toBeGreaterThan(17);
        expect(properties.majorTicks).toBeLessThan(23);
        expect((await readNodes(page, 'Ruler', 'tick-label')).map(node => node.text)).toContain('20');
    });
});

test.describe('the ruler read logarithmically', () => {
    const logRuler = Object.assign({ scaleType: 'logarithmic', minimumX: 1, maximumX: 1000 }, RULER_AT);

    test('spreads the decades evenly and numbers them 1, 10, 100', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', logRuler);
        expect((await readNodes(page, 'Ruler', 'log-tick-label')).map(node => node.text)).toEqual(['1', '10', '100', '1000']);
        expect(await readNodes(page, 'Ruler', 'log-major-tick')).toHaveLength(4);
        // Eight marks in each decade, for 2 to 9, with the decade below the first drawn as well and
        // cut off at the edge of the scale.
        expect(await readNodes(page, 'Ruler', 'log-minor-tick')).toHaveLength(40);
        expect(await readNodes(page, 'Ruler', 'major-tick')).toHaveLength(0);
    });

    // A value stands where its logarithm puts it, so the middle of a ruler running from 1 to 1000
    // reads a little over 31, not 500.
    test('reads the value the pointer stands at, not the distance along it', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', logRuler);
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, TICK_BAND_Y);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Ruler')).toContain('31.623');
        await movePointerAway(page);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
    });

    test('is stretched a decade at a time by pulling one of its decades', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', logRuler);
        // The 10 stands a third of the way along three decades; pulling it to the middle leaves two.
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 3, NUMBER_BAND_Y);
        await page.mouse.down();
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, NUMBER_BAND_Y, { steps: 4 });
        await page.mouse.up();
        const properties = await readProperties(page, 'Ruler');
        expect(properties.minimumX).toBe(1);
        expect(properties.maximumX).toBeGreaterThan(80);
        expect(properties.maximumX).toBeLessThan(125);
        await expect.poll(() => readNodes(page, 'Ruler', 'log-tick-label').then(nodes => nodes.map(node => node.text))).toEqual(['1', '10', '100']);
    });
});

test.describe('the protractor, built from blocks', () => {
    test('is a band of degrees standing on its vertex', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170', '180']);
        expect(await readNodes(page, 'Protractor', 'tick-', 'line')).toHaveLength(181);
        expect(await readNodes(page, 'Protractor', 'band')).toHaveLength(1);
    });

    // A whole turn is a dial rather than a half circle: the band closes, the arms it is read
    // between go, and the vertex moves to the middle of the box.
    test('a whole turn closes the band into a dial', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', { x: 60, y: 60, width: 240, height: 240, spanAngle: 360, divisions: 36, endValue: 360 });
        expect(await readNodes(page, 'Protractor', 'band-full')).toHaveLength(1);
        expect(await readNodes(page, 'Protractor', 'arm-')).toHaveLength(0);
        expect(await readNodes(page, 'Protractor', 'tick-', 'line')).toHaveLength(360);
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text)).toHaveLength(37);
    });

    // The numbers the two ends read say what the protractor is marked in, and π numbering writes
    // them as the fractions of π they are rather than as decimals of it.
    test('marked in radians, it is numbered in π', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({ numbers: 'pi', endValue: 3.14159265, divisions: 6, unit: 'rad', digits: 2 }, PROTRACTOR_AT));
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', 'π/6', 'π/3', 'π/2', '2π/3', '5π/6', 'π']);
        await movePointerInto(page, PROTRACTOR_AT, PROTRACTOR_AT.width / 2, 40);
        await expect.poll(() => readNodes(page, 'Protractor', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Protractor')).toContain('π/2');
    });

    test('reads the angle the pointer stands at, and stops reading when it leaves', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        expect(await readNodes(page, 'Protractor', 'crosshair')).toHaveLength(0);
        // Straight up from the vertex is half a turn of the scale.
        await movePointerInto(page, PROTRACTOR_AT, PROTRACTOR_AT.width / 2, 40);
        await expect.poll(() => readNodes(page, 'Protractor', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Protractor')).toContain('90');
        await movePointerAway(page);
        await expect.poll(() => readNodes(page, 'Protractor', 'crosshair')).toHaveLength(0);
        await expect.poll(() => readNodes(page, 'Protractor', 'reading-plate')).toHaveLength(0);
    });
});

test.describe('the measurement keys on the toolbar', () => {
    // A ruler is a strip and a protractor is wider than it is tall, so neither is placed in the
    // square every dial is placed in: the box each is drawn in comes from its own definition.
    test('place an object in the box its definition asks for', async ({ page }) => {
        await setupBoard(page);
        for (const [buttonId, name, width, height] of [['ruler-button', 'Ruler', 320, 64], ['protractor-button', 'Protractor', 300, 170]]) {
            await page.click(`#${buttonId}`);
            const start = await svgClientPoint(page, 200, 400);
            const end = await svgClientPoint(page, 230, 405);
            await page.mouse.move(start.x, start.y);
            await page.mouse.down();
            await page.mouse.move(end.x, end.y, { steps: 4 });
            await page.mouse.up();
            await expect.poll(() => page.evaluate(name => {
                const shape = shell.board.shapes.getByName(name);
                return shape ? { width: shape.properties.width, height: shape.properties.height } : null;
            }, name)).toEqual({ width: width, height: height });
            await page.evaluate(name => shell.board.removeShape(shell.board.shapes.getByName(name)), name);
        }
    });

    // Neither instrument names a term, so neither toolbar carries the key that would read one.
    test('give the instruments no model key, since they are bound to no term', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', RULER_AT);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT, { y: 300 }));
        for (const name of ['Ruler', 'Protractor']) {
            await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), name);
            await expect(page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector')).toBeVisible();
            expect(await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').count()).toBe(0);
        }
        await page.evaluate(() => shell.board.selection.deselect());
        await addObject(page, 'compass', 'Compass', { x: 400, y: 300, width: 160, height: 160 });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Compass')));
        await expect(page.locator('.shape-context-toolbar.visible .mdl-component-model-selector')).toBeVisible();
    });

    test('arm the objects the editor ships rather than shapes of their own', async ({ page }) => {
        await setupBoard(page);
        for (const [buttonId, componentType, displayName] of [['ruler-button', 'ruler', 'Ruler'], ['protractor-button', 'protractor', 'Protractor']]) {
            await page.click(`#${buttonId}`);
            const armed = await page.evaluate(() => ({
                type: shell.shapeDrawController.pendingShapeType,
                name: shell.shapeDrawController.pendingShapeName,
                componentType: BlockObjects.getComponentType(shell.shapeDrawController.pendingShapeProperties?.definition)
            }));
            expect(armed).toEqual({ type: 'ComponentShape', name: displayName, componentType: componentType });
            await page.click(`#${buttonId}`);
        }
    });
});

// The ruler is read wherever the pointer rests on it, the way the hand-written one was: over the
// marks, over the numbers, and over a number being offered for pulling, since the reading is not
// ink that takes the pointer and the numbers are grabs inside the area that answers it.
test.describe('the ruler answers the pointer over its whole body', () => {
    test('reads over the numbers as well as the marks, and keeps reading across a number', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, NUMBER_BAND_Y);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Ruler')).toContain('5.00');
        // On to the number 2 itself, which is a grab of its own, in small steps so the pointer
        // crosses on to it rather than jumping.
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH * 0.2, NUMBER_BAND_Y, { steps: 12 });
        await expect.poll(() => readTexts(page, 'Ruler')).toContain('2.00');
        expect(await readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        await movePointerAway(page);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
    });

    // A selected shape is covered by its move handle, which passes the pointer through to the
    // drawing underneath; the pointer leaving the handle must reach the drawing as a leave too, or
    // the reading is left standing at the edge the pointer went out over.
    test('stops reading when the pointer leaves a selected ruler over its handle', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Ruler')));
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, TICK_BAND_Y, { steps: 10 });
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        const outside = await svgClientPoint(page, RULER_AT.x - 30, RULER_AT.y + TICK_BAND_Y);
        await page.mouse.move(outside.x, outside.y, { steps: 10 });
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
        await expect.poll(() => readNodes(page, 'Ruler', 'reading')).toHaveLength(0);
    });

    // A ruler measures rather than reads the model, so it goes on answering the pointer while the
    // model runs.
    test('goes on reading while the model is running', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: 0, maximumX: 10, majorTicks: 10 }, RULER_AT));
        await page.evaluate(() => shell.board.calculator.play());
        await expect.poll(() => page.evaluate(() => shell.board.calculator.isPlaying())).toBe(true);
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, TICK_BAND_Y, { steps: 5 });
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Ruler')).toContain('5.00');
        await page.evaluate(() => shell.board.calculator.stop());
    });
});

// The numbers stand in a window the width of the body, so a long one at either end is cut off at
// the edge of the ruler instead of written past it.
test.describe('the ruler keeps its numbers inside its body', () => {
    test('writes the numbers inside a window that stops at the edges of the body', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ minimumX: -123456, maximumX: 10, majorTicks: 10 }, RULER_AT));
        const windows = await readNodes(page, 'Ruler', 'numbers', 'svg');
        expect(windows).toHaveLength(1);
        // Inset by spacing.medium, then by the body's own stroke.
        expect(windows[0].x).toBe(9);
        expect(windows[0].width).toBe(RULER_AT.width - 18);
        const inside = await page.evaluate(() => shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('svg[data-source-id="numbers"] text[data-source-id^="tick-label"]').length);
        expect(inside).toBe(11);
        const marks = await page.evaluate(() => shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('svg[data-source-id="scale"] line').length);
        expect(marks).toBeGreaterThan(0);
    });
});
