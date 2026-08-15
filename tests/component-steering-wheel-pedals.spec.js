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

async function addDrivingModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Driving equations'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Driving equations').properties.expression = '\\frac{dthrottle}{dt}=0\\\\\\frac{dacross}{dt}=0\\\\\\frac{dup}{dt}=0\\\\computed=20';
        shell.reset();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        shell.board.calculator.setTermValue('across', 30, 1, 1);
        shell.board.calculator.setTermValue('up', 40, 1, 1);
        shell.board.calculator.calculate();
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(300);
}

// The pedals on their own: the wheel is left out, so the drawing is the pair of controls in the
// whole box, which is the shape the accelerator and brake used to be an object of its own in.
async function addPedals(page, overrides = {}) {
    await page.evaluate(overrides => {
        const shape = shell.commands.addComponent('steering-wheel', 'Pedals');
        shape.setProperties(Object.assign({
            x: 300,
            y: 160,
            width: 240,
            height: 240,
            showWheel: false,
            showPedals: true,
            pedalVariable: 'throttle'
        }, overrides));
        shape.draw();
    }, overrides);
    await page.waitForTimeout(300);
}

async function pressPoints(page, name = 'Pedals') {
    return page.evaluate(name => {
        const shape = shell.board.shapes.getByName(name);
        const matrix = shell.board.svg.getScreenCTM();
        const box = node => {
            const element = shape.element.querySelector(`[data-source-id="${node}"]`);
            return {
                x: Number(element.getAttribute('x')) + Number(element.getAttribute('width')) / 2,
                y: Number(element.getAttribute('y')) + Number(element.getAttribute('height')) / 2
            };
        };
        const toScreen = point => {
            const screenPoint = new DOMPoint(shape.properties.x + point.x, shape.properties.y + point.y).matrixTransform(matrix);
            return { x: screenPoint.x, y: screenPoint.y };
        };
        return { brake: toScreen(box('brake-press')), accelerator: toScreen(box('accelerator-press')) };
    }, name);
}

// Presses the control, slides the pointer by however many pixels are asked for — upwards is a
// positive slide — holds it there, and lets go. Nothing is released until the caller says so, so a
// test can read what the control holds while it is still being pressed.
async function slide(page, point, pixels, holdMilliseconds = 0) {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    if (pixels !== 0)
        await page.mouse.move(point.x, point.y - pixels, { steps: 5 });
    await page.waitForTimeout(holdMilliseconds);
}

async function release(page, settleMilliseconds = 1500) {
    await page.mouse.up();
    await page.waitForTimeout(settleMilliseconds);
}

function readTerms(page) {
    return page.evaluate(() => ({
        throttle: shell.board.calculator.getByName('throttle', 1),
        across: shell.board.calculator.getByName('across', 1),
        up: shell.board.calculator.getByName('up', 1)
    }));
}

test.describe('the pedals of the steering wheel', () => {
    // Pressing writes nothing at all: the pedal is where it was, and stays there for as long as it is
    // held. What moves it is the pointer travelling up or down from where it went down.
    test('sliding up presses a pedal further and sliding down eases it off', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 0, 400);
        expect((await readTerms(page)).throttle).toBe(0);
        // The drawing is 240 across and 240 down, so a pixel is worth a hundredth of the 0…100 range.
        await page.mouse.move(points.accelerator.x, points.accelerator.y - 60, { steps: 5 });
        await page.waitForTimeout(150);
        expect((await readTerms(page)).throttle).toBeCloseTo(25, 0);
        await page.mouse.move(points.accelerator.x, points.accelerator.y - 24, { steps: 5 });
        await page.waitForTimeout(150);
        expect((await readTerms(page)).throttle).toBeCloseTo(10, 0);
        await release(page, 300);
        expect((await readTerms(page)).throttle).toBeCloseTo(10, 0);
    });

    // Nothing holds a pedal down once it is let go, so it walks back to the minimum a step at a time
    // rather than dropping there in one frame.
    test('letting go lets the pedal come back to rest step by step, unless it was given no return', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalReturnStep: 10 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 240, 200);
        expect((await readTerms(page)).throttle).toBe(100);
        await page.mouse.up();
        await page.waitForTimeout(250);
        const midway = (await readTerms(page)).throttle;
        expect(midway).toBeGreaterThan(0);
        expect(midway).toBeLessThan(100);
        await page.waitForTimeout(1400);
        expect((await readTerms(page)).throttle).toBe(0);
        // The behaviour carries the return it was drawn with, so the drawing is written again before
        // the pedal is pressed with the spring taken off it.
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('pedalReturnStep', 0));
        await page.waitForTimeout(300);
        await slide(page, points.accelerator, 120, 100);
        await release(page);
        expect((await readTerms(page)).throttle).toBeCloseTo(50, 0);
    });

    // One term, two ways of pressing it: the accelerator raises it and the brake lowers it, and
    // neither takes it past the ends it is read against.
    test('the two pedals press one term, up and down, and neither goes past its ends', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 144, 100);
        expect((await readTerms(page)).throttle).toBeCloseTo(60, 0);
        await release(page, 300);
        await slide(page, points.brake, 48, 100);
        expect((await readTerms(page)).throttle).toBeCloseTo(40, 0);
        await release(page, 300);
        await slide(page, points.accelerator, 400, 100);
        expect((await readTerms(page)).throttle).toBe(100);
        await release(page, 300);
        await slide(page, points.brake, 400, 100);
        expect((await readTerms(page)).throttle).toBe(0);
        await release(page, 300);
    });

    // A pedal naming a plain number writes the object's own parameter instead, the way a gauge edits
    // its own value when it is bound to nothing — and the slide and the fall back that follows it are
    // one edit, so undo takes the pedal back to where it stood before it was touched.
    test('a pedal reading a plain number writes the property, and the whole gesture is one undo step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalVariable: '0', pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 72, 100);
        await release(page, 300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.pedalVariable))).toBeCloseTo(30, 0);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.pedalVariable))).toBe(0);
    });

    // A term the model works out for itself can never be written, so the pedal says so with the
    // cursor a locked handle uses rather than pretending to move.
    test('a pedal bound to a computed term refuses the gesture', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalVariable: 'computed' });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 100, 100);
        await release(page, 300);
        expect(await page.evaluate(() => shell.board.calculator.getByName('computed', 1))).toBe(20);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelector('[data-source-id="accelerator-press"]').style.cursor)).toBe('not-allowed');
    });

    // The eye on the row shows what the pedals are holding, over the pedal that shows it, written the
    // way every other term on the board is written and coloured the way that pedal is drawn.
    test('the eye on the row reads the term over the pedal that carries it', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label').length)).toBe(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Pedals');
            shape.setProperties({ pedalVariableDisplayMode: 'nameValue' });
            shell.board.calculator.setTermValue('throttle', 40, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label')).map(label => ({
            text: label.textContent,
            x: Number(label.getAttribute('x')),
            background: label.parentNode.querySelector('.shape-term-label-bg').getAttribute('fill')
        })));
        expect(labels).toHaveLength(1);
        // The accelerator is the pedal the value is read on, so the label stands over its half.
        expect(labels[0].text).toBe('throttle = 40.00');
        expect(labels[0].x).toBeCloseTo(180, 0);
        expect(labels[0].background).toBe('#1871c2');
    });

    // A row naming no term holds the number itself, and pressing a pedal writes that number. The key
    // in the toolbar reads it, so it has to follow the press: an interaction writes the property
    // straight rather than through a command, which is the path that otherwise refreshes a toolbar.
    test('the toolbar follows a pedal that is moved while it is open', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalVariable: '0', pedalReturnStep: 0 });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        const readToolbar = () => page.evaluate(() => Array.from(document.querySelectorAll('.shape-context-toolbar.visible .mdl-component-model-selector .mdl-name-btn-term-text')).map(term => term.textContent.trim()));
        // The wheel's own row comes first, and it is left where it was: only the pedals move.
        expect((await readToolbar()).map(Number)).toEqual([0, 0]);
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 120, 200);
        expect((await readToolbar()).map(Number)).toEqual([0, 50]);
        await release(page, 300);
        expect((await readToolbar()).map(Number)).toEqual([0, 50]);
        await slide(page, points.brake, 48, 200);
        expect((await readToolbar()).map(Number)).toEqual([0, 30]);
        await release(page, 300);
    });

    // The wheel and the pedals are two halves of one object, and either can be left out. With both
    // shown the box is split, the wheel in the top half and the pedals in the bottom.
    test('each part is drawn only when it is asked for, and the two share the box when both are', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        const measured = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const validator = new BlockValidator(BlockRegistry, compiler);
            validator.setCalculator(shell.board.calculator);
            const definition = BlockObjects.createComponentInstance('steering-wheel');
            const build = overrides => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), { angleVariable: '0' }, overrides);
                const context = { width: 240, height: 240, parameters: parameters, tokens: new BlockTokens('standard') };
                const flattened = BlockRenderer.flatten(compiler.compile(definition, context).nodes);
                const box = name => {
                    const node = flattened.find(entry => entry.sourceId === name);
                    return node ? ['x', 'y', 'width', 'height'].map(attribute => Number(node.attributes[attribute])) : null;
                };
                const grab = flattened.find(entry => entry.sourceId === 'wheel-grab');
                const turn = grab?.behaviours?.[0]?.input ?? null;
                return {
                    errors: validator.validate(definition, context).errors.map(error => error.code),
                    parts: flattened.map(node => node.sourceId),
                    brake: box('brake-press'),
                    accelerator: box('accelerator-press'),
                    grabCentre: turn ? [Number(turn.centerX), Number(turn.centerY)] : null
                };
            };
            return {
                wheelOnly: build({}),
                pedalsOnly: build({ showWheel: false, showPedals: true }),
                both: build({ showPedals: true })
            };
        });
        for (const drawing of Object.values(measured))
            expect(drawing.errors).toEqual([]);
        expect(measured.wheelOnly.parts).toContain('car-rim');
        expect(measured.wheelOnly.parts).not.toContain('car-brake-pad');
        expect(measured.wheelOnly.brake).toBeNull();
        expect(measured.pedalsOnly.parts).toContain('car-brake-pad');
        expect(measured.pedalsOnly.parts).not.toContain('car-rim');
        expect(measured.pedalsOnly.parts).not.toContain('wheel-grab');
        // Alone, the pedals have the whole box: the brake on the left half and the accelerator on the
        // right. Shared, each part takes a square of half the height, the wheel above the pedals.
        expect(measured.pedalsOnly.brake).toEqual([0, 0, 120, 240]);
        expect(measured.pedalsOnly.accelerator).toEqual([120, 0, 120, 240]);
        expect(measured.both.parts).toEqual(expect.arrayContaining(['car-rim', 'car-brake-pad', 'wheel-grab']));
        expect(measured.both.brake).toEqual([60, 120, 60, 120]);
        expect(measured.both.accelerator).toEqual([120, 120, 60, 120]);
        expect(measured.both.grabCentre).toEqual([120, 60]);
    });

    // The vehicle is chosen once and both drawings follow it: a car's pedals, a bike's hand levers or
    // a boat's binnacle levers.
    test('the pedals are drawn as the vehicle the wheel is drawn as', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        const parts = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('steering-wheel');
            const build = wheelType => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), { angleVariable: '0', showPedals: true, wheelType: wheelType });
                const compilation = compiler.compile(definition, { width: 240, height: 240, parameters: parameters, tokens: new BlockTokens('standard') });
                return BlockRenderer.flatten(compilation.nodes).map(node => node.sourceId);
            };
            return { car: build('car'), bike: build('motor bike'), boat: build('boat') };
        });
        expect(parts.car).toEqual(expect.arrayContaining(['car-rim', 'car-brake-pad', 'car-accelerator-pad']));
        expect(parts.bike).toEqual(expect.arrayContaining(['bike-bar', 'brake-lever-arm', 'accelerator-lever-arm']));
        expect(parts.bike).not.toContain('car-accelerator-pad');
        expect(parts.bike).not.toContain('car-brake-pad');
        expect(parts.boat).toEqual(expect.arrayContaining(['boat-rim', 'astern-lever-knob', 'ahead-lever-knob']));
        expect(parts.boat).not.toContain('car-brake-pad');
    });

    // There is one value, so there is one pedal reading it: the accelerator stands where that value
    // stands between the two ends, and the brake rests, being a control to press rather than a
    // reading. It is the same pedal that carries the length of a pair.
    test('the accelerator carries the value and the brake stays at rest', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        const measured = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('steering-wheel');
            const build = overrides => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), { angleVariable: '0', showWheel: false, showPedals: true }, overrides);
                const flattened = BlockRenderer.flatten(compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') }).nodes);
                const part = name => flattened.find(node => node.sourceId === name);
                return {
                    accelerator: Number(part('car-accelerator-pad').attributes.y),
                    brake: Number(part('car-brake-pad').attributes.y)
                };
            };
            return {
                atRest: build({ pedalVariable: '0' }),
                halfway: build({ pedalVariable: '50' }),
                pastTheMaximum: build({ pedalVariable: '150' }),
                byLength: build({ turnedBy: 'orientation', angleVariable: '30', angleUpVariable: '40' })
            };
        });
        expect(measured.atRest).toEqual({ accelerator: 96, brake: 108 });
        expect(measured.halfway).toEqual({ accelerator: 118, brake: 108 });
        expect(measured.pastTheMaximum).toEqual({ accelerator: 140, brake: 108 });
        // A pair 50 long against ends of 0 and 100 stands the accelerator exactly halfway.
        expect(measured.byLength).toEqual({ accelerator: 118, brake: 108 });
    });

    // A wheel turned by an orientation is pointed by a pair, and the pedals press that pair's length:
    // the direction it points in is kept and the two terms are worked out again from it.
    test('a pedal pressing an orientation lengthens the pair and keeps its direction', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { turnedBy: 'orientation', angleVariable: 'across', angleUpVariable: 'up' });
        const before = await readTerms(page);
        expect(Math.hypot(before.across, before.up)).toBeCloseTo(50, 3);
        const points = await pressPoints(page);
        // A pixel is worth a hundredth of the 0…100 range, so 48 pixels lengthen the pair by 20.
        await slide(page, points.accelerator, 48, 200);
        const pressed = await readTerms(page);
        expect(Math.hypot(pressed.across, pressed.up)).toBeCloseTo(70, 1);
        expect(pressed.across / pressed.up).toBeCloseTo(before.across / before.up, 3);
        expect(pressed.across).toBeCloseTo(42, 1);
        expect(pressed.up).toBeCloseTo(56, 1);
        // Nothing springs back: the length the pair was pressed to is what the model keeps, or the
        // acceleration would be given back the moment the pedal was let go.
        await release(page, 600);
        const released = await readTerms(page);
        expect(Math.hypot(released.across, released.up)).toBeCloseTo(70, 1);
    });

    test('the brake shortens the same pair, and neither pedal takes it past its ends', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { turnedBy: 'orientation', angleVariable: 'across', angleUpVariable: 'up' });
        const points = await pressPoints(page);
        await slide(page, points.brake, 72, 200);
        const braked = await readTerms(page);
        expect(Math.hypot(braked.across, braked.up)).toBeCloseTo(20, 1);
        expect(braked.across).toBeCloseTo(12, 1);
        expect(braked.up).toBeCloseTo(16, 1);
        // Braking past a standstill leaves the pair at the minimum rather than turning it round.
        await page.mouse.move(points.brake.x, points.brake.y - 400, { steps: 5 });
        await page.waitForTimeout(150);
        const stopped = await readTerms(page);
        expect(stopped.across).toBe(0);
        expect(stopped.up).toBe(0);
        await release(page, 300);
    });

    // A pair holding plain numbers is pressed on the object itself, and the direction has to be read
    // back from what the gesture has already written rather than from the drawing it started with.
    test('a pedal pressing a pair of plain numbers writes both of them, as one undo step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { turnedBy: 'orientation', angleVariable: '30', angleUpVariable: '40' });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 48, 200);
        await release(page, 300);
        const pressed = await page.evaluate(() => {
            const properties = shell.board.shapes.getByName('Pedals').properties;
            return { across: Number(properties.angleVariable), up: Number(properties.angleUpVariable) };
        });
        expect(pressed.across).toBeCloseTo(42, 1);
        expect(pressed.up).toBeCloseTo(56, 1);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => {
            const properties = shell.board.shapes.getByName('Pedals').properties;
            return [Number(properties.angleVariable), Number(properties.angleUpVariable)];
        })).toEqual([30, 40]);
    });

    // The rows and the settings belong to the part that owns them: a menu offering the accelerator of
    // an object drawing no pedals would name a term nothing reads.
    test('the toolbar offers each part its own rows, and only while that part is there', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 240, height: 240, angleVariable: 'across', pedalVariable: 'throttle' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const rows = () => page.evaluate(() => ({
            model: shell.board.shapes.getByName('Wheel').getParametersByCategory(['model']).map(parameter => parameter.id),
            settings: shell.board.shapes.getByName('Wheel').getParametersByCategory(['display', 'scale', 'interaction', 'general']).map(parameter => parameter.id),
            style: shell.board.shapes.getByName('Wheel').getParametersByCategory(['style']).map(parameter => parameter.id)
        }));
        const wheelOnly = await rows();
        expect(wheelOnly.model).toEqual(['angleVariable']);
        expect(wheelOnly.settings).toEqual(['wheelType', 'showWheel', 'showPedals']);
        expect(wheelOnly.style).toEqual(['rimColor', 'gripColor', 'hubColor']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showPedals', true));
        await page.waitForTimeout(300);
        const withPedals = await rows();
        expect(withPedals.model).toEqual(['angleVariable', 'pedalVariable']);
        expect(withPedals.settings).toEqual(['wheelType', 'showWheel', 'showPedals', 'minimum', 'maximum', 'pedalReturnStep']);
        expect(withPedals.style).toEqual(['rimColor', 'gripColor', 'hubColor', 'brakeColor', 'frameColor', 'surfaceColor']);
        // Turned by an orientation the pedals press the wheel's own pair, so they name no terms of
        // their own and have no spring to set.
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('turnedBy', 'orientation'));
        await page.waitForTimeout(300);
        const byOrientation = await rows();
        expect(byOrientation.model).toEqual(['angleVariable']);
        expect(byOrientation.settings).toEqual(['wheelType', 'showWheel', 'showPedals', 'minimum', 'maximum']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showWheel', false));
        await page.waitForTimeout(300);
        expect((await rows()).style).toEqual(['brakeColor', 'frameColor', 'surfaceColor']);
    });

    test('the two parts are switched on and off from the settings menu', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { showWheel: true });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(500);
        const menu = page.locator('.mdl-shape-overlay-popup').last();
        const switches = menu.locator('.dx-switch');
        await expect(switches).toHaveCount(2);
        await expect(menu.locator('.dx-list-item', { hasText: 'Minimum' })).toHaveCount(1);
        await switches.nth(1).click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').properties.showPedals)).toBe(false);
        const drawn = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('[data-source-id]')).map(element => element.getAttribute('data-source-id')));
        expect(drawn).toContain('car-rim');
        expect(drawn).not.toContain('car-brake-pad');
        // The rows the pedals owned are gone from the menu the moment they are switched off, without
        // it having to be closed and opened again.
        await expect(menu.locator('.dx-list-item', { hasText: 'Minimum' })).toHaveCount(0);
    });
});
