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
        shell.board.shapes.getByName('Driving equations').properties.expression = '\\frac{dthrottle}{dt}=0\\\\\\frac{dbraking}{dt}=0\\\\\\frac{dacross}{dt}=0\\\\\\frac{dup}{dt}=0\\\\\\frac{dax}{dt}=0\\\\\\frac{day}{dt}=0\\\\\\frac{dbx}{dt}=0\\\\\\frac{dby}{dt}=0\\\\computed=20';
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

// A wheel steered by a pair, with a pedal pair of its own on each pedal: the wheel is pointed by
// across and up, the accelerator pushes along ax and ay and the brake pushes back along bx and by.
const ORIENTATION_PEDALS = {
    turnedBy: 'orientation',
    angleVariable: 'across',
    angleUpVariable: 'up',
    accelerationVariable: 'ax',
    accelerationUpVariable: 'ay',
    brakingVariable: 'bx',
    brakingUpVariable: 'by'
};

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
            accelerationVariable: 'throttle',
            brakingVariable: 'braking'
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
        braking: shell.board.calculator.getByName('braking', 1),
        across: shell.board.calculator.getByName('across', 1),
        up: shell.board.calculator.getByName('up', 1),
        ax: shell.board.calculator.getByName('ax', 1),
        ay: shell.board.calculator.getByName('ay', 1),
        bx: shell.board.calculator.getByName('bx', 1),
        by: shell.board.calculator.getByName('by', 1)
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

    // Nothing holds a pedal down once it is let go, so the term walks back to zero a step at a time
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

    // A term each, and the direction is what tells them apart: the accelerator presses its own up from
    // zero as far as the maximum, the brake presses its own down from zero as far as the minimum.
    test('the accelerator presses its term up from zero and the brake presses its own below it', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 144, 100);
        expect((await readTerms(page)).throttle).toBeCloseTo(60, 0);
        await release(page, 300);
        // The brake presses a term of its own, so the sixty the accelerator left is untouched by it.
        await slide(page, points.brake, 48, 100);
        const braked = await readTerms(page);
        expect(braked.braking).toBeCloseTo(-20, 0);
        expect(braked.throttle).toBeCloseTo(60, 0);
        await release(page, 300);
        await slide(page, points.accelerator, 400, 100);
        expect((await readTerms(page)).throttle).toBe(100);
        await release(page, 300);
        await slide(page, points.brake, 400, 100);
        expect((await readTerms(page)).braking).toBe(-100);
        await release(page, 300);
        // Sliding the wrong way on a pedal eases it off and stops at zero: neither crosses the rest it
        // presses from.
        await slide(page, points.brake, -400, 100);
        expect((await readTerms(page)).braking).toBe(0);
        await release(page, 300);
        await slide(page, points.accelerator, -400, 100);
        expect((await readTerms(page)).throttle).toBe(0);
        await release(page, 300);
    });

    // A pedal naming a plain number writes the object's own parameter instead, the way a gauge edits
    // its own value when it is bound to nothing — and the slide and the fall back that follows it are
    // one edit, so undo takes the pedal back to where it stood before it was touched.
    test('a pedal reading a plain number writes the property, and the whole gesture is one undo step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { accelerationVariable: '0', pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 72, 100);
        await release(page, 300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.accelerationVariable))).toBeCloseTo(30, 0);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => Number(shell.board.shapes.getByName('Pedals').properties.accelerationVariable))).toBe(0);
    });

    // A term the model works out for itself can never be written, so the pedal says so with the
    // cursor a locked handle uses rather than pretending to move.
    test('a pedal bound to a computed term refuses the gesture', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { accelerationVariable: 'computed' });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 100, 100);
        await release(page, 300);
        expect(await page.evaluate(() => shell.board.calculator.getByName('computed', 1))).toBe(20);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelector('[data-source-id="accelerator-press"]').style.cursor)).toBe('not-allowed');
    });

    // The eye on each row shows what that pedal is holding, over the pedal itself, written the way
    // every other term on the board is written and coloured the way its own row is.
    test('the eye on each row reads that pedal\'s term over the pedal that presses it', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label').length)).toBe(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Pedals');
            shape.setProperties({ accelerationVariableDisplayMode: 'nameValue', brakingVariableDisplayMode: 'nameValue' });
            shell.board.calculator.setTermValue('throttle', 40, 1, 1);
            shell.board.calculator.setTermValue('braking', -25, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const labels = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label')).map(label => ({
            text: label.textContent,
            x: Number(label.getAttribute('x')),
            background: label.parentNode.querySelector('.shape-term-label-bg').getAttribute('fill')
        })));
        expect(labels).toHaveLength(2);
        // A term each, so each label stands over the half of the drawing its own pedal is pressed in.
        expect(labels[0]).toMatchObject({ text: 'throttle = 40.00', background: '#1871c2' });
        expect(labels[0].x).toBeCloseTo(180, 0);
        expect(labels[1]).toMatchObject({ text: 'braking = -25.00', background: '#e03130' });
        expect(labels[1].x).toBeCloseTo(60, 0);
        // Switched off, the brake takes its label with it and the accelerator, now pressed anywhere in
        // the drawing, is read over the middle of it.
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('showBrake', false));
        await page.waitForTimeout(400);
        const alone = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label')).map(label => ({
            text: label.textContent,
            x: Number(label.getAttribute('x'))
        })));
        expect(alone).toHaveLength(1);
        expect(alone[0].text).toBe('throttle = 40.00');
        expect(alone[0].x).toBeCloseTo(120, 0);
    });

    // A part switched off takes its row with it, and the eye that was turned on for that row goes
    // quiet rather than labelling the drawing with something nothing reads.
    test('the eye goes quiet with the row when the part that owned it is switched off', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Pedals').setProperties({ accelerationVariableDisplayMode: 'nameValue', brakingVariableDisplayMode: 'nameValue' });
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const labels = () => page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('.shape-term-label')).map(label => label.textContent));
        expect(await labels()).toEqual(['throttle = 0.00', 'braking = 0.00']);
        // Read as an orientation both rows stay: each pedal presses a pair of its own, so each goes
        // on naming what it presses and goes on reading it on the drawing.
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('turnedBy', 'orientation'));
        await page.waitForTimeout(400);
        expect(await labels()).toEqual(['throttle = 0.00', 'braking = 0.00']);
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('turnedBy', 'angle'));
        await page.waitForTimeout(400);
        // The brake switched off is the row that goes, and the accelerator's is left alone.
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('showBrake', false));
        await page.waitForTimeout(400);
        expect(await labels()).toEqual(['throttle = 0.00']);
        // The choice was never written over, so switching the brake back on brings its label with it.
        await page.evaluate(() => shell.board.shapes.getByName('Pedals').setPropertyCommand('showBrake', true));
        await page.waitForTimeout(400);
        expect(await labels()).toEqual(['throttle = 0.00', 'braking = 0.00']);
    });

    // A row naming no term holds the number itself, and pressing a pedal writes that number. The key
    // in the toolbar reads it, so it has to follow the press: an interaction writes the property
    // straight rather than through a command, which is the path that otherwise refreshes a toolbar.
    test('the toolbar follows a pedal that is moved while it is open', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { accelerationVariable: '0', brakingVariable: '0', pedalReturnStep: 0 });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        const readToolbar = () => page.evaluate(() => Array.from(document.querySelectorAll('.shape-context-toolbar.visible .mdl-component-model-selector .mdl-name-btn-term-text')).map(term => term.textContent.trim()));
        // The wheel's own row comes first, and it is left where it was: only the pedals move, and each
        // moves the row that is its own.
        expect((await readToolbar()).map(Number)).toEqual([0, 0, 0]);
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 120, 200);
        expect((await readToolbar()).map(Number)).toEqual([0, 50, 0]);
        await release(page, 300);
        expect((await readToolbar()).map(Number)).toEqual([0, 50, 0]);
        await slide(page, points.brake, 48, 200);
        expect((await readToolbar()).map(Number)).toEqual([0, 50, -20]);
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
                both: build({ showPedals: true }),
                noBrake: build({ showWheel: false, showPedals: true, showBrake: false })
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
        // The brake is the third part, and switching it off leaves the accelerator alone with the
        // whole of the pedals: nothing is drawn for the brake and nothing there answers a press.
        expect(measured.noBrake.parts).toContain('car-accelerator-pad');
        expect(measured.noBrake.parts).not.toContain('car-brake-pad');
        expect(measured.noBrake.brake).toBeNull();
        expect(measured.noBrake.accelerator).toEqual([0, 0, 240, 240]);
    });

    // The vehicle is chosen once and both drawings follow it: a car's pedals, a bike's hand levers or
    // a boat's binnacle levers.
    test('the pedals are drawn as the vehicle the wheel is drawn as', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        const parts = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('steering-wheel');
            const build = (wheelType, overrides = {}) => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), { angleVariable: '0', showPedals: true, wheelType: wheelType }, overrides);
                const compilation = compiler.compile(definition, { width: 240, height: 240, parameters: parameters, tokens: new BlockTokens('standard') });
                return BlockRenderer.flatten(compilation.nodes).map(node => node.sourceId);
            };
            return {
                car: build('car'),
                bike: build('motor bike'),
                boat: build('boat'),
                carAlone: build('car', { showBrake: false }),
                bikeAlone: build('motor bike', { showBrake: false }),
                boatAlone: build('boat', { showBrake: false })
            };
        });
        expect(parts.car).toEqual(expect.arrayContaining(['car-rim', 'car-brake-pad', 'car-accelerator-pad']));
        expect(parts.bike).toEqual(expect.arrayContaining(['bike-bar', 'brake-lever-arm', 'accelerator-lever-arm']));
        expect(parts.bike).not.toContain('car-accelerator-pad');
        expect(parts.bike).not.toContain('car-brake-pad');
        expect(parts.boat).toEqual(expect.arrayContaining(['boat-rim', 'astern-lever-knob', 'ahead-lever-knob']));
        expect(parts.boat).not.toContain('car-brake-pad');
        // Whichever vehicle is drawn, the brake switched off takes that vehicle's own brake with it —
        // the pedal, the hand lever or the astern lever, and the pivot or slot it stood in — and leaves
        // the frame and the accelerator alone.
        expect(parts.carAlone).toEqual(expect.arrayContaining(['car-bracket', 'car-accelerator-pad']));
        expect(parts.carAlone.filter(part => part.startsWith('car-brake'))).toEqual([]);
        expect(parts.bikeAlone).toEqual(expect.arrayContaining(['lever-bar', 'accelerator-lever-arm']));
        expect(parts.bikeAlone.filter(part => part.startsWith('brake-lever'))).toEqual([]);
        expect(parts.boatAlone).toEqual(expect.arrayContaining(['binnacle', 'ahead-lever-knob']));
        expect(parts.boatAlone.filter(part => part.startsWith('astern'))).toEqual([]);
    });

    // Each pedal stands where its own term stands: the accelerator where its term stands above zero
    // and the brake where its own stands below, so a braked model presses the brake and an accelerated
    // one the accelerator — and a model doing both presses both. A pair has no half below zero, so its
    // length is the accelerator's alone.
    test('each pedal stands where its own term stands', async ({ page }) => {
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
            // A wheel pointed by across 30 and up 40 is on a bearing of about 37 degrees, and a pedal
            // pressing a pair is read by how far that pair reaches along it.
            const alongTheBearing = { turnedBy: 'orientation', angleVariable: '30', angleUpVariable: '40' };
            return {
                atRest: build({ accelerationVariable: '0', brakingVariable: '0' }),
                accelerating: build({ accelerationVariable: '50', brakingVariable: '0' }),
                braking: build({ accelerationVariable: '0', brakingVariable: '-50' }),
                both: build({ accelerationVariable: '50', brakingVariable: '-50' }),
                pastTheEnds: build({ accelerationVariable: '150', brakingVariable: '-150' }),
                byPairs: build(Object.assign({}, alongTheBearing, {
                    accelerationVariable: '30', accelerationUpVariable: '40',
                    brakingVariable: '-30', brakingUpVariable: '-40'
                })),
                acrossTheBearing: build(Object.assign({}, alongTheBearing, { accelerationVariable: '40', accelerationUpVariable: '-30' }))
            };
        });
        expect(measured.atRest).toEqual({ accelerator: 96, brake: 108 });
        expect(measured.accelerating).toEqual({ accelerator: 118, brake: 108 });
        expect(measured.braking).toEqual({ accelerator: 96, brake: 130 });
        // A value each, so nothing stops a model pressing both at once.
        expect(measured.both).toEqual({ accelerator: 118, brake: 130 });
        expect(measured.pastTheEnds).toEqual({ accelerator: 140, brake: 152 });
        // A pair reaching 50 along the bearing stands its pedal exactly halfway, forwards for the
        // accelerator and backwards for the brake.
        expect(measured.byPairs).toEqual({ accelerator: 118, brake: 130 });
        // A pair 50 long across the bearing reaches nothing along it, so the pedal it belongs to
        // rests: what a pedal shows is the push along the course, not the size of the pair.
        expect(measured.acrossTheBearing).toEqual({ accelerator: 96, brake: 108 });
    });

    // Read as an orientation each pedal presses a pair of its own, laid down along the bearing the
    // wheel is turned to: the wheel says which way the push goes and the pedal says how hard.
    test('a pedal pressing an orientation lays its own pair down along the bearing the wheel is on', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, Object.assign({ pedalReturnStep: 0 }, ORIENTATION_PEDALS));
        const before = await readTerms(page);
        // Across 30 and up 40 is a bearing of about 37 degrees, and the pedals start at a standstill.
        expect(Math.hypot(before.across, before.up)).toBeCloseTo(50, 3);
        expect([before.ax, before.ay]).toEqual([0, 0]);
        const points = await pressPoints(page);
        // A pixel is worth a two-hundred-and-fortieth of the 0…100 range, so 48 of them press 20
        // along the bearing — three fifths of it across and four fifths up.
        await slide(page, points.accelerator, 48, 200);
        const pressed = await readTerms(page);
        expect(Math.hypot(pressed.ax, pressed.ay)).toBeCloseTo(20, 1);
        expect(pressed.ax).toBeCloseTo(12, 1);
        expect(pressed.ay).toBeCloseTo(16, 1);
        // The pair the wheel is pointed by is left exactly where it was: the pedals press pairs of
        // their own now rather than lengthening the one they are steered along.
        expect([pressed.across, pressed.up]).toEqual([before.across, before.up]);
        await release(page, 300);
        const released = await readTerms(page);
        expect(released.ax).toBeCloseTo(12, 1);
        expect(released.ay).toBeCloseTo(16, 1);
    });

    test('the brake presses its own pair back against the bearing, and neither goes past its end', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, Object.assign({ pedalReturnStep: 0 }, ORIENTATION_PEDALS));
        const points = await pressPoints(page);
        // 72 pixels press 30 down the brake's own half, which is 30 backwards along the bearing.
        await slide(page, points.brake, 72, 200);
        const braked = await readTerms(page);
        expect(Math.hypot(braked.bx, braked.by)).toBeCloseTo(30, 1);
        expect(braked.bx).toBeCloseTo(-18, 1);
        expect(braked.by).toBeCloseTo(-24, 1);
        // Pressed past the minimum it stops there rather than going further back.
        await page.mouse.move(points.brake.x, points.brake.y - 400, { steps: 5 });
        await page.waitForTimeout(150);
        const full = await readTerms(page);
        expect(full.bx).toBeCloseTo(-60, 1);
        expect(full.by).toBeCloseTo(-80, 1);
        // Sliding the wrong way eases the brake off and stops at rest: it never presses forwards.
        await page.mouse.move(points.brake.x, points.brake.y + 400, { steps: 5 });
        await page.waitForTimeout(150);
        const off = await readTerms(page);
        expect([off.bx, off.by]).toEqual([0, 0]);
        await release(page, 300);
    });

    // Nothing holds a pedal down once it is let go, whichever way it is read: an acceleration is a
    // push, and a push the foot is off is no push at all, so the pair walks back to a standstill
    // along its own bearing rather than staying laid down where it was released.
    test('a pair pressed by a pedal springs back to a standstill when it is let go', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, Object.assign({ pedalReturnStep: 10 }, ORIENTATION_PEDALS));
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 240, 200);
        const pressed = await readTerms(page);
        expect(Math.hypot(pressed.ax, pressed.ay)).toBeCloseTo(100, 1);
        await page.mouse.up();
        await page.waitForTimeout(250);
        const midway = await readTerms(page);
        const reached = Math.hypot(midway.ax, midway.ay);
        expect(reached).toBeGreaterThan(0);
        expect(reached).toBeLessThan(100);
        // It comes back along the bearing it was pressed on rather than swinging round on the way.
        expect(midway.ax / midway.ay).toBeCloseTo(30 / 40, 2);
        await page.waitForTimeout(1400);
        const rested = await readTerms(page);
        expect([rested.ax, rested.ay]).toEqual([0, 0]);
    });

    // A standstill has no direction of its own. The object keeps the one it was last pointed in, so
    // the wheel goes on facing that way while the pair stands at nothing — and that bearing is what
    // the pedals go on pressing along, so a stopped vehicle is pushed off the way it was heading
    // rather than due north.
    test('a pair at a standstill keeps the bearing the pedals go on pressing along', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await page.evaluate(pedals => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties(Object.assign({ x: 240, y: 160, width: 240, height: 240, showPedals: true, pedalReturnStep: 0 }, pedals));
            shape.draw();
        }, ORIENTATION_PEDALS);
        await page.waitForTimeout(300);
        const heading = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wheel');
            const wheel = shape.element.querySelector('[data-source-id="wheel"]');
            return { transform: wheel.getAttribute('transform'), across: shell.board.calculator.getByName('across', 1), up: shell.board.calculator.getByName('up', 1) };
        });
        // Across 30 and up 40 is a bearing of about 37 degrees, and the wheel is turned to it.
        expect((await heading()).transform).toContain('rotate(36.8');
        // The model comes to a stop, so the pair it is pointed by holds nothing at all.
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('across', 0, 1, 1);
            shell.board.calculator.setTermValue('up', 0, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(300);
        const stopped = await heading();
        expect([stopped.across, stopped.up]).toEqual([0, 0]);
        // Standing still, the wheel is still turned the way it was going rather than back to north.
        expect(stopped.transform).toContain('rotate(36.8');
        const points = await pressPoints(page, 'Wheel');
        await slide(page, points.accelerator, 48, 200);
        // The wheel is shown as well, so the pedals have half the box and a pixel is worth more: 48
        // of them press 40 along the bearing the model stopped on.
        const again = await readTerms(page);
        expect(Math.hypot(again.ax, again.ay)).toBeCloseTo(40, 1);
        expect(again.ax).toBeCloseTo(24, 1);
        expect(again.ay).toBeCloseTo(32, 1);
        await release(page, 300);
    });

    // A pair holding plain numbers is pressed on the object itself, and the direction has to be read
    // back from what the gesture has already written rather than from the drawing it started with.
    test('a pedal pressing a pair of plain numbers writes both of them, as one undo step', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        // The wheel is pointed by a pair of plain numbers, so the bearing the pedal presses along is
        // read off the object itself, and the pedal's own pair is written there too.
        await addPedals(page, { turnedBy: 'orientation', angleVariable: '30', angleUpVariable: '40', accelerationVariable: '0', accelerationUpVariable: '0', pedalReturnStep: 0 });
        const points = await pressPoints(page);
        await slide(page, points.accelerator, 48, 200);
        await release(page, 300);
        const pressed = await page.evaluate(() => {
            const properties = shell.board.shapes.getByName('Pedals').properties;
            return { across: Number(properties.accelerationVariable), up: Number(properties.accelerationUpVariable) };
        });
        expect(pressed.across).toBeCloseTo(12, 1);
        expect(pressed.up).toBeCloseTo(16, 1);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => {
            const properties = shell.board.shapes.getByName('Pedals').properties;
            return [Number(properties.accelerationVariable), Number(properties.accelerationUpVariable)];
        })).toEqual([0, 0]);
    });

    // The rows and the settings belong to the part that owns them: a menu offering the accelerator of
    // an object drawing no pedals would name a term nothing reads.
    test('the toolbar offers each part its own rows, and only while that part is there', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 240, height: 240, angleVariable: 'across', accelerationVariable: 'throttle' });
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
        // The brake belongs to the pedals, so its own switch is not offered until they are drawn.
        expect(wheelOnly.settings).toEqual(['wheelType', 'showWheel', 'showPedals']);
        expect(wheelOnly.style).toEqual(['rimColor', 'gripColor', 'hubColor']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showPedals', true));
        await page.waitForTimeout(300);
        const withPedals = await rows();
        // A term each, and each colour is picked at the end of its own row rather than on the colour
        // menu, so neither pedal's colour is a style row.
        expect(withPedals.model).toEqual(['angleVariable', 'accelerationVariable', 'brakingVariable']);
        expect(withPedals.settings).toEqual(['wheelType', 'showWheel', 'showPedals', 'showBrake', 'minimum', 'maximum', 'pedalReturnStep']);
        expect(withPedals.style).toEqual(['rimColor', 'gripColor', 'hubColor', 'frameColor', 'surfaceColor']);
        // The brake switched off takes its term and its own end away with it, and leaves the rest of
        // the pedals where they were.
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showBrake', false));
        await page.waitForTimeout(300);
        const withoutBrake = await rows();
        expect(withoutBrake.model).toEqual(['angleVariable', 'accelerationVariable']);
        expect(withoutBrake.settings).toEqual(['wheelType', 'showWheel', 'showPedals', 'showBrake', 'maximum', 'pedalReturnStep']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showBrake', true));
        await page.waitForTimeout(300);
        // Turned by an orientation each pedal presses a pair of its own, so the rows stay where they
        // are — each grown a second selector — and so do both ends and the spring.
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('turnedBy', 'orientation'));
        await page.waitForTimeout(300);
        const byOrientation = await rows();
        expect(byOrientation.model).toEqual(['angleVariable', 'accelerationVariable', 'brakingVariable']);
        expect(byOrientation.settings).toEqual(['wheelType', 'showWheel', 'showPedals', 'showBrake', 'minimum', 'maximum', 'pedalReturnStep']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('showWheel', false));
        await page.waitForTimeout(300);
        expect((await rows()).style).toEqual(['frameColor', 'surfaceColor']);
    });

    test('the three parts are switched on and off from the settings menu', async ({ page }) => {
        await setupBoard(page);
        await addDrivingModel(page);
        await addPedals(page, { showWheel: true });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Pedals')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(500);
        const menu = page.locator('.mdl-shape-overlay-popup').last();
        const switches = menu.locator('.dx-switch');
        const drawnParts = () => page.evaluate(() => Array.from(shell.board.shapes.getByName('Pedals').element.querySelectorAll('[data-source-id]')).map(element => element.getAttribute('data-source-id')));
        // The wheel, the pedals and the brake among them: three switches, the brake's offered because
        // the pedals are on.
        await expect(switches).toHaveCount(3);
        await expect(menu.locator('.dx-list-item', { hasText: 'Minimum' })).toHaveCount(1);
        await switches.nth(2).click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').properties.showBrake)).toBe(false);
        const withoutBrake = await drawnParts();
        expect(withoutBrake).toContain('car-accelerator-pad');
        expect(withoutBrake).not.toContain('car-brake-pad');
        expect(withoutBrake).not.toContain('brake-press');
        // The brake's own end goes with it the moment it is switched off, without the menu having to be
        // closed and opened again; the accelerator's stays, because the accelerator is still there.
        await expect(menu.locator('.dx-list-item', { hasText: 'Minimum' })).toHaveCount(0);
        await expect(menu.locator('.dx-list-item', { hasText: 'Maximum' })).toHaveCount(1);
        await switches.nth(1).click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Pedals').properties.showPedals)).toBe(false);
        const drawn = await drawnParts();
        expect(drawn).toContain('car-rim');
        expect(drawn).not.toContain('car-accelerator-pad');
        // The rows the pedals owned are gone with them, and so is the brake's own switch: a part
        // switched off offers nothing of the parts inside it.
        await expect(menu.locator('.dx-list-item', { hasText: 'Maximum' })).toHaveCount(0);
        await expect(switches).toHaveCount(2);
    });
});
