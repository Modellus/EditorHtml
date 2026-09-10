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

// Writes onto an object already on the board and redraws it, the way a key on its toolbar does.
async function setProperties(page, name, properties) {
    await page.evaluate(input => {
        const shape = shell.board.shapes.getByName(input.name);
        shape.setProperties(input.properties);
        shape.draw();
    }, { name, properties });
}

// Opens the settings key of an object's toolbar.
async function openComponentSettings(page, name) {
    await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), name);
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
    await expect(page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').first()).toBeVisible();
}

// Each row of the open settings menu as "label = value", with the mark drawn inside a number field
// in brackets after it.
function readSettingsRows(page) {
    return page.evaluate(() => [...document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')].map(row => {
        const label = row.innerText.trim().split('\n')[0];
        const chosen = row.querySelector('.mdl-pill-group .dx-item-selected');
        if (chosen)
            return `${label} = ${chosen.textContent.trim()}`;
        const input = row.querySelector('.dx-texteditor-input');
        const mark = row.querySelector('.mdl-numberbox-angle-suffix');
        return `${label} = ${input ? input.value : ''}${mark ? ` [${mark.textContent}]` : ''}`;
    }));
}

// The unit is picked from the keys themselves, not from a list to open.
async function chooseAngleUnit(page, unit) {
    const row = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').filter({ hasText: 'Angle unit' }).first();
    await row.getByText(unit, { exact: true }).click();
    await page.waitForTimeout(500);
}

// An angle is typed into the math field the number box is written through, the way every value on
// the board is typed, and Tab takes it.
async function typeAngle(page, label, text) {
    const row = page.locator('.mdl-shape-overlay-popup .mdl-dropdown-list-item').filter({ hasText: label }).first();
    const field = row.locator('math-field.mdl-numeric-math-field').first();
    await field.click();
    await field.evaluate(node => node.executeCommand('selectAll'));
    await page.keyboard.type(text);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
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
        expect(await readTexts(page, 'Ruler')).toContain('31.62');
        await movePointerAway(page);
        await expect.poll(() => readNodes(page, 'Ruler', 'crosshair')).toHaveLength(0);
    });

    // The decimals the ruler reads to are the decimals it reads to on either scale: the reading
    // follows them, and so do the numbers along the scale once it runs below 1 and needs them. A
    // decade too small to show at those decimals is written in scientific notation, so the scale
    // still reads however far down it runs.
    test('reads to its decimals on the logarithmic scale as well', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({}, logRuler, { minimumX: 0.001, maximumX: 100 }));
        expect((await readNodes(page, 'Ruler', 'log-tick-label')).map(node => node.text)).toEqual(['1.00e-3', '0.01', '0.10', '1.00', '10.00', '100.00']);
        await page.evaluate(() => { const ruler = shell.board.shapes.getByName('Ruler'); ruler.setProperties({ digits: 3 }); ruler.draw(); });
        await expect.poll(() => readNodes(page, 'Ruler', 'log-tick-label').then(nodes => nodes.map(node => node.text))).toEqual(['0.001', '0.010', '0.100', '1.000', '10.000', '100.000']);
        await page.evaluate(() => { const ruler = shell.board.shapes.getByName('Ruler'); ruler.setProperties({ minimumX: 1, maximumX: 1000 }); ruler.draw(); });
        await expect.poll(() => readNodes(page, 'Ruler', 'log-tick-label').then(nodes => nodes.map(node => node.text))).toEqual(['1', '10', '100', '1000']);
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, TICK_BAND_Y);
        await expect.poll(() => readTexts(page, 'Ruler')).toContain('31.623');
        await movePointerAway(page);
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

    // A ruler switched to logarithmic keeps the minimum it had, which is 0 unless it was set, and
    // nothing below zero has a logarithm. Rather than spreading twelve decades under 1 and never
    // reaching the top of the scale, it starts at 1 and rules itself to its far end — and is still
    // stretched from there, since the drag reads the end the scale is drawn from.
    test('given no positive minimum starts at 1 and still fills its width', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'ruler', 'Ruler', Object.assign({ scaleType: 'logarithmic' }, RULER_AT));
        expect((await readNodes(page, 'Ruler', 'log-tick-label')).map(node => node.text)).toEqual(['1', '10']);
        const minorTicks = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Ruler').contentGroup.querySelectorAll('[data-source-id^="log-minor-tick"]'))
            .map(node => Number(node.getAttribute('x1'))));
        // The mark for 9 stands inside the last decade, close to the right end of the scale.
        expect(Math.max(...minorTicks.filter(x => x < SCALE_LEFT + SCALE_WIDTH))).toBeGreaterThan(SCALE_LEFT + SCALE_WIDTH * 0.9);
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH, NUMBER_BAND_Y);
        await page.mouse.down();
        await movePointerInto(page, RULER_AT, SCALE_LEFT + SCALE_WIDTH / 2, NUMBER_BAND_Y, { steps: 4 });
        await page.mouse.up();
        const properties = await readProperties(page, 'Ruler');
        expect(properties.minimumX).toBe(0);
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
        expect(await readNodes(page, 'Protractor', 'tick-', 'line')).toHaveLength(181 + 37);
        expect(await readNodes(page, 'Protractor', 'band')).toHaveLength(1);
    });

    // A whole turn is a dial rather than a half circle: the band closes, the arms it is read
    // between go, and the vertex moves to the middle of the box.
    test('a whole turn closes the band into a dial', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', { x: 60, y: 60, width: 240, height: 240, endAngle: 360 });
        expect(await readNodes(page, 'Protractor', 'band-full')).toHaveLength(1);
        expect(await readNodes(page, 'Protractor', 'arm-')).toHaveLength(0);
        expect(await readNodes(page, 'Protractor', 'tick-', 'line')).toHaveLength(360 + 73);
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text)).toHaveLength(37);
    });

    // What the protractor is marked in is one choice rather than four: the band, the numbers on it
    // and the angle the pointer reads all follow it, so radians is a row on the settings menu rather
    // than a scale the reader has to work out the ends of.
    test('the angle unit marks the band in degrees or in π', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110', '120', '130', '140', '150', '160', '170', '180']);
        await setProperties(page, 'Protractor', { angleUnit: 'radians' });
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', 'π/6', 'π/3', 'π/2', '2π/3', '5π/6', 'π']);
        // A number every thirty degrees rather than every ten, and the plain marks between them
        // still a degree apart, so the band is ruled as finely as it is in degrees.
        expect(await readNodes(page, 'Protractor', 'tick-', 'line')).toHaveLength(181 + 13);
        await movePointerInto(page, PROTRACTOR_AT, PROTRACTOR_AT.width / 2, 40);
        await expect.poll(() => readNodes(page, 'Protractor', 'crosshair')).toHaveLength(1);
        expect(await readTexts(page, 'Protractor')).toContain('π/2');
    });

    // The arms are not the only lines the band is read against: a direction the box itself stands
    // on — straight right, straight up — is drawn to the vertex wherever the span reaches it.
    test('is spoked on the cardinal directions it reaches', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        expect((await readNodes(page, 'Protractor', 'spoke-', 'line')).map(node => node.id)).toEqual(['spoke-90']);
        // A whole turn reaches all four, and has no arms of its own to draw the first one.
        await setProperties(page, 'Protractor', { endAngle: 360 });
        expect((await readNodes(page, 'Protractor', 'spoke-', 'line')).map(node => node.id))
            .toEqual(['spoke-0', 'spoke-90', 'spoke-180', 'spoke-270']);
    });

    // The two angles are set in whatever the band is marked in: degrees as they stand with the degree
    // mark after them, radians as the multiple of π they are — half a turn is 1 — with π after them.
    // What is stored stays in degrees throughout, so only the writing changes.
    test('sets its two angles in the unit it is marked in, and marks them', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        await openComponentSettings(page, 'Protractor');
        expect(await readSettingsRows(page)).toEqual([
            'Start angle = 0 [\u00ba]',
            'End angle = 180 [\u00ba]',
            'Angle unit = Degrees',
            'Decimals = 0'
        ]);
        await chooseAngleUnit(page, 'Radians');
        expect(await readSettingsRows(page)).toEqual([
            'Start angle = 0 [\u03c0]',
            'End angle = 1 [\u03c0]',
            'Angle unit = Radians',
            'Decimals = 0'
        ]);
        // An end written as one half-turn of π is still the same one hundred and eighty degrees.
        expect(await readProperties(page, 'Protractor')).toMatchObject({ endAngle: 180, angleUnit: 'radians' });
        // The reader types into the field, decimals and all, and what is stored is the degrees it
        // stands for — so three quarters of π is a hundred and thirty-five of them.
        await typeAngle(page, 'End angle', '0.75');
        await expect.poll(() => readProperties(page, 'Protractor').then(properties => properties.endAngle)).toBe(135);
        expect(await readSettingsRows(page)).toContain('End angle = 0.75 [\u03c0]');
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', '\u03c0/6', '\u03c0/3', '\u03c0/2', '2\u03c0/3']);
        // And back in degrees the same field takes a decimal number of them.
        await chooseAngleUnit(page, 'Degrees');
        await typeAngle(page, 'End angle', '112.5');
        await expect.poll(() => readProperties(page, 'Protractor').then(properties => Number(properties.endAngle))).toBe(112.5);
        expect(await readSettingsRows(page)).toContain('End angle = 112.5 [\u00ba]');
        // The numbers keep to round angles whatever the far arm is set to.
        expect((await readNodes(page, 'Protractor', 'label-', 'text')).map(node => node.text))
            .toEqual(['0', '10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110']);
    });

    // A protractor is marked in degrees or in fractions of π, and neither is ever written as a power
    // of ten, so it is not offered the notation the objects writing plain numbers are.
    test('is offered no notation, having no plain numbers to write', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        await openComponentSettings(page, 'Protractor');
        expect((await readSettingsRows(page)).join(' ')).not.toContain('Notation');
        // The ruler writes plain numbers, so it still is.
        await addObject(page, 'ruler', 'Ruler', Object.assign({}, RULER_AT, { y: 300 }));
        await openComponentSettings(page, 'Ruler');
        expect((await readSettingsRows(page)).join(' ')).toContain('Notation');
    });

    // Nothing the protractor draws leaves the box it was given, whatever it is marked in and however
    // far round it goes. A band swinging below its vertex — anything past a half circle — lifts the
    // vertex and gives up the radius it costs rather than running off the bottom edge.
    test('keeps its band, its marks and its numbers inside its own box', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        for (const [width, height] of [[300, 170], [120, 70], [600, 340], [90, 200]]) {
            for (const endAngle of [45, 90, 180, 270, 360]) {
                for (const angleUnit of ['degrees', 'radians']) {
                    await setProperties(page, 'Protractor', { width, height, endAngle, angleUnit });
                    const overflow = await page.evaluate(box => {
                        const drawn = shell.board.shapes.getByName('Protractor').contentGroup.querySelectorAll('[data-source-id]');
                        let worst = 0;
                        for (const node of drawn) {
                            const bounds = node.getBBox();
                            worst = Math.max(worst, -bounds.x, -bounds.y, bounds.x + bounds.width - box.width, bounds.y + bounds.height - box.height);
                        }
                        return Math.round(worst * 10) / 10;
                    }, { width, height });
                    expect(overflow, `${width}x${height} to ${endAngle} in ${angleUnit}`).toBeLessThanOrEqual(0.5);
                }
            }
        }
    });

    // Three lengths of mark, the way a protractor is printed: one at every number, a taller one
    // halfway between two numbers, and the plain ones between those.
    test('rules the band in three lengths of mark', async ({ page }) => {
        await setupBoard(page);
        await addObject(page, 'protractor', 'Protractor', Object.assign({}, PROTRACTOR_AT));
        const lengths = await page.evaluate(() => {
            const nodes = [...shell.board.shapes.getByName('Protractor').contentGroup.querySelectorAll('line[data-source-id^="tick-"]')];
            const rounded = nodes.map(node => Math.round(Math.hypot(node.x2.baseVal.value - node.x1.baseVal.value, node.y2.baseVal.value - node.y1.baseVal.value) * 10) / 10);
            return [...new Set(rounded)].sort((a, b) => a - b);
        });
        expect(lengths).toHaveLength(3);
        const [minor, middle, major] = lengths;
        expect(middle).toBeGreaterThan(minor);
        expect(major).toBeGreaterThan(middle);
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
