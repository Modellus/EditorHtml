const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

// The room the object leaves around its drawing, on every side, so the handles the shape is dragged
// and resized by have somewhere to stand: `spacing.medium`.
const HANDLE_ROOM = 8;

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

async function addWave(page, parameters = {}) {
    await page.evaluate(parameters => {
        const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
        shape.setProperties(Object.assign({ x: 80, y: 80, width: 600, height: 160 }, parameters));
        shape.draw();
    }, parameters);
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Wave')?.contentGroup?.children.length ?? 0)).toBeGreaterThan(0);
}

// The chain as it stands on one row of the run, read back off the drawing.
async function readChainAt(page, iteration) {
    return page.evaluate(iteration => {
        const calculator = shell.board.calculator;
        calculator.pause();
        calculator.setIteration(iteration);
        const shape = shell.board.shapes.getByName('Wave');
        shape.draw();
        return {
            t: calculator.getIndependentValue(),
            heights: Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')))
        };
    }, iteration);
}

// What the third oscillator of a nine-oscillator chain twenty units long is doing at five units a
// second: two spacings from the source, so two delays behind it.
function referenceDisplacement(t) {
    return 2 * Math.sin(2 * Math.PI * 0.5 * (t - 2 * 20 / (8 * 5)));
}

function countOf(page, selector) {
    return page.evaluate(selector => shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll(selector).length, selector);
}

test.describe('Mechanical wave object', () => {

    test('is offered in the objects palette', async ({ page }) => {
        await setupBoard(page);
        const entry = await page.evaluate(() => BlockRegistry.list('component', { agentAccessibleOnly: true })
            .filter(registration => registration.tags.includes('object'))
            .map(registration => ({ type: registration.type, displayName: registration.displayName }))
            .find(registration => registration.type === 'mechanical-wave') ?? null);
        expect(entry).not.toBeNull();
        expect(entry.displayName).toBe('Mechanical wave');
    });

    test('its parameter labels name the thing, not the kind of thing', async ({ page }) => {
        await setupBoard(page);
        const labels = await page.evaluate(() => BlockRegistry.get('mechanical-wave').parameters.map(parameter => parameter.label));
        expect(labels).toEqual(expect.arrayContaining(['Amplitude', 'Frequency', 'Speed', 'Initial phase', 'Damping', 'Samples', 'Orientation']));
        // The row holding the term the wave is read from and published under is the wave itself, so
        // it is called that. What the object never does is prefix its own kind onto the other rows —
        // a wave's amplitude is "Amplitude", never "Wave amplitude".
        expect(labels).toContain('Wave');
        expect(labels.filter(label => /^wave\s+\S/i.test(label))).toEqual([]);
    });

    test('draws one oscillator per element and follows the count', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11 });
        expect(await countOf(page, 'circle')).toBe(11);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ samples: 5 });
            shape.draw();
        });
        expect(await countOf(page, 'circle')).toBe(5);
    });

    test('spacing comes from the width, so the last oscillator sits on the far edge', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, width: 400 });
        const positions = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cx'))));
        const across = 400 - 2 * HANDLE_ROOM;
        expect(positions[0]).toBeCloseTo(HANDLE_ROOM, 3);
        expect(positions[10]).toBeCloseTo(HANDLE_ROOM + across, 3);
        expect(positions[1] - positions[0]).toBeCloseTo(across / 10, 3);
    });

    test('longitudinal draws bars instead of circles', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, orientation: 'longitudinal' });
        expect(await countOf(page, 'circle')).toBe(0);
        // The body the object is drawn on is a rect of its own, behind the eleven bars.
        expect(await countOf(page, 'rect')).toBe(12);
        const body = await page.evaluate(() => {
            const rect = shell.board.shapes.getByName('Wave').contentGroup.querySelector('rect');
            return { width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')) };
        });
        expect(body).toEqual({ width: 600 - 2 * HANDLE_ROOM, height: 160 - 2 * HANDLE_ROOM });
    });

    // An oscillator is pushed from where it stands: it enters the wave at rest and swings from there,
    // so nothing has moved before the run starts and the chain is drawn flat, and each oscillator the
    // wave reaches joins it from the line rather than appearing at the crest.
    test('the chain stands at rest until the run starts, the first oscillator included', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, wavefront: true, speed: '5', length: 20 });
        const readHeights = () => page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))));
        const atRest = await readHeights();
        const equilibrium = Number(await page.evaluate(() => shell.board.shapes.getByName('Wave').properties.height)) / 2;
        for (const height of atRest)
            expect(height).toBeCloseTo(equilibrium, 6);
    });

    test('the wavefront holds the far oscillators at rest until the wave arrives', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, wavefront: true, speed: '5', length: 20 });
        // Far enough in for the near oscillators to be swinging and the far ones still untouched:
        // the wave covers one spacing every length/(gaps*speed) of the independent.
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 5, null, { timeout: 20000 });
        const moving = await page.evaluate(() => {
            shell.board.calculator.pause();
            const shape = shell.board.shapes.getByName('Wave');
            shape.draw();
            return Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')));
        });
        const equilibrium = Number(await page.evaluate(() => shell.board.shapes.getByName('Wave').properties.height)) / 2;
        expect(moving[0]).not.toBeCloseTo(equilibrium, 1);
        expect(moving[9]).toBeCloseTo(equilibrium, 6);
    });

    test('turning the wavefront off sets the whole chain oscillating at once', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, wavefront: false });
        const heights = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))));
        const equilibrium = await page.evaluate(() => Number(shell.board.shapes.getByName('Wave').properties.height) / 2);
        expect(heights[9]).not.toBeCloseTo(equilibrium, 3);
        expect(new Set(heights.map(height => height.toFixed(2))).size).toBeGreaterThan(1);
    });

    // A wave loses some of itself to the medium it travels through, so an oscillator far from the
    // source is carried less than one near it: the swing falls away by e^(-damping * distance),
    // where the distance is the oscillator's own place along the chain.
    test('damping thins the swing the further from the source it is read', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: false, autoScale: false, minimumY: -2, maximumY: 2 };
        const drawn = await page.evaluate(parameters => {
            const read = name => Array.from(shell.board.shapes.getByName(name).contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')));
            const plain = shell.commands.addComponent('mechanical-wave', 'Plain');
            plain.setProperties(Object.assign({}, parameters, { damping: '0' }));
            const damped = shell.commands.addComponent('mechanical-wave', 'Damped');
            damped.setProperties(Object.assign({}, parameters, { damping: '0.2' }));
            shell.reset();
            plain.draw();
            damped.draw();
            return { plain: read('Plain'), damped: read('Damped') };
        }, parameters);
        const spacing = 20 / 10;
        const equilibrium = 100;
        for (let index = 0; index < drawn.plain.length; index++) {
            const carried = (drawn.plain[index] - equilibrium) * Math.exp(-0.2 * index * spacing);
            expect(drawn.damped[index] - equilibrium).toBeCloseTo(carried, 5);
        }
        // The source itself keeps the whole of its swing: there is no distance for it to lose any over.
        expect(drawn.damped[0]).toBeCloseTo(drawn.plain[0], 6);
        expect(Math.abs(drawn.damped[10] - equilibrium)).toBeLessThan(Math.abs(drawn.plain[10] - equilibrium) / 2);
    });

    test('the wave handed to the model is damped like the one drawn', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false, referenceIndex: 3, damping: '0.3' });
            shell.reset();
            shape.draw();
        });
        const published = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            const values = calculator.system.getIteration(calculator.getIteration(), 1);
            return { y: values.y, independent: values[calculator.properties.independent.name] };
        });
        // The third oscillator of a nine-oscillator chain twenty units long stands two spacings —
        // five units — from the source, so it is carried e^(-0.3 * 5) of the swing.
        expect(published.y).toBeCloseTo(referenceDisplacement(published.independent) * Math.exp(-0.3 * 5), 6);
    });

    test('the reference oscillator is drawn in its own colour', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, referenceIndex: 3, referenceColor: '#ff0000', waveColor: '#0000ff' });
        const fills = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => node.getAttribute('fill')));
        expect(fills[2]).toBe('#ff0000');
        expect(fills[0]).toBe('#0000ff');
    });

    test('velocity arrows and the connecting line follow their settings', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, showArrows: false, showLine: false });
        expect(await countOf(page, 'line')).toBe(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ showLine: true });
            shape.draw();
        });
        expect(await countOf(page, 'line')).toBe(10);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ showArrows: true });
            shape.draw();
        });
        expect(await countOf(page, 'line')).toBe(10 + 11 * 3);
    });


    // A wave is one motion travelling: what the source did a moment ago is what the oscillator a
    // moment further along is doing now. The model works the source out — y = t is a ramp, so what
    // each oscillator reads back can be named exactly — and the chain hands it along at the speed the
    // object is set to.
    // A wave is one motion travelling: the source moves, and a moment later the oscillator beside it
    // is doing what the source was doing. Every iteration hands the chain the term's next value and
    // moves the one before it along, so the chain at one row is the chain at the row before, shifted
    // by an oscillator.
    test('each iteration hands the chain the next value of the term', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=\\sin\\left(t\\right)';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y' });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        // Past the first crest, so the swing the drawing is fitted to has settled and the two rows
        // are drawn on the same scale.
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 45, null, { timeout: 20000 });
        const before = await readChainAt(page, 40);
        const after = await readChainAt(page, 41);
        expect(after.t - before.t).toBeCloseTo(0.1, 6);
        for (let index = 0; index < before.heights.length - 1; index++)
            expect(after.heights[index + 1]).toBeCloseTo(before.heights[index], 6);
    });

    // The chain holds one value per oscillator, so what it reaches back over is its own count of
    // steps of the run — nine oscillators of a run stepping by a tenth hold the last eight tenths.
    test('the chain reaches back one step of the run for each oscillator', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=t';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y' });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 10, null, { timeout: 20000 });
        const drawn = await readChainAt(page, 6);
        // y = t rises by a tenth every row, so the five oscillators the run has reached stand evenly
        // stepped down from the newest, and the ones it has not reached yet stand at rest.
        const rest = 100;
        const stepDown = drawn.heights[1] - drawn.heights[0];
        expect(stepDown).toBeGreaterThan(0);
        for (let index = 1; index < 5; index++)
            expect(drawn.heights[index] - drawn.heights[index - 1]).toBeCloseTo(stepDown, 6);
        for (let index = 5; index < 9; index++)
            expect(drawn.heights[index]).toBeCloseTo(rest, 6);
    });

    // The chain is drawn against the greatest swing the term has shown, the way a chart fits its axes
    // to what it is plotting, so a term worth a hundredth and a term worth a hundred are drawn alike.
    test('the wave is fitted to the body, whatever the term is worth', async ({ page }) => {
        await setupBoard(page);
        const readFor = async definition => {
            await page.evaluate(definition => {
                shell.board.shapes.getByName('Eq').properties.expression = definition;
                shell.reset();
            }, definition);
            await page.evaluate(() => shell.board.calculator.play());
            await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 70, null, { timeout: 20000 });
            const drawn = await readChainAt(page, 70);
            return Object.assign(drawn, await page.evaluate(() => {
                const calculator = shell.board.calculator;
                let swing = 0;
                for (let iteration = 1; iteration <= calculator.getIteration(); iteration++)
                    swing = Math.max(swing, Math.abs(calculator.system.getByNameOnIteration(iteration, 'y', 1)));
                return { now: calculator.getByName('y', 1), swing: swing };
            }));
        };
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y' });
        });
        const small = await readFor('y=0.01\\cdot\\sin\\left(t\\right)');
        const large = await readFor('y=100\\cdot\\sin\\left(t\\right)');
        for (let index = 0; index < small.heights.length; index++)
            expect(large.heights[index]).toBeCloseTo(small.heights[index], 3);
        // A hundred pixels of body for the greatest swing the term has shown, less the margin a chart
        // leaves around its data: the newest oscillator stands at what the term is worth on that scale.
        const halfBody = (200 - 2 * HANDLE_ROOM) / 2;
        expect(small.heights[0]).toBeCloseTo(100 - (small.now / small.swing) * (halfBody / 1.08), 3);
        expect(large.heights[0]).toBeCloseTo(100 - (large.now / large.swing) * (halfBody / 1.08), 3);
    });

    test('the scale is the reader\'s once the wave is not fitted to the body', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { width: 600, height: 200, samples: 9, amplitude: '2', wavefront: false, autoScale: false, minimumY: -4, maximumY: 4 });
        const drawn = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            return {
                heights: Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))),
                first: shell.board.calculator.getIteration()
            };
        });
        // Four units of displacement over the half-body left between the handles, and the wave
        // swinging two reaches half way to the edge rather than filling the body.
        const swing = Math.max(...drawn.heights.map(height => Math.abs(height - 100)));
        expect(swing).toBeCloseTo(2 * ((200 - 2 * HANDLE_ROOM) / 2 / 4), 3);
    });

    // The axes are the object's own scale written down: displacement up the side, and along the
    // bottom whatever the chain is spread over. They are not drawn until they are asked for, and the
    // chain gives them room when they are.
    test('the axes are hidden until they are asked for, and then they read the scale', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { width: 600, height: 200, samples: 9, length: 20, amplitude: '2', wavefront: false });
        expect(await countOf(page, 'text')).toBe(0);
        const shown = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            const wholeBody = Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cx')));
            shape.setProperties({ showAxes: true });
            shape.draw();
            return {
                wholeBody: wholeBody,
                inset: Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cx'))),
                labels: Array.from(shape.contentGroup.querySelectorAll('text')).map(node => node.textContent)
            };
        });
        expect(shown.wholeBody[0]).toBeCloseTo(HANDLE_ROOM, 6);
        // Room down the side for the numbers, so the chain no longer starts at the edge of the body.
        expect(shown.inset[0]).toBeGreaterThan(HANDLE_ROOM + 10);
        // The wave is fitted to its own amplitude, and the chain is spread over the twenty units of
        // medium it is drawn on.
        expect(shown.labels).toContain('20');
        expect(shown.labels).toContain('2');
        expect(shown.labels).toContain('-2');
    });

    test('a chain repeating the model is spread over the run\'s own clock', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=\\sin\\left(t\\right)';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 21, wave: 'y', length: 20, showAxes: true });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 45, null, { timeout: 20000 });
        const labels = await page.evaluate(() => {
            shell.board.calculator.pause();
            const shape = shell.board.shapes.getByName('Wave');
            shape.draw();
            return Array.from(shape.contentGroup.querySelectorAll('text')).map(node => node.textContent);
        });
        // Twenty-one oscillators of a run stepping by a tenth: two seconds of it, not the twenty
        // units of medium a wave of the object's own is drawn over.
        expect(labels).toContain('2');
        expect(labels).not.toContain('20');
    });

    test('hands the model the reference oscillator under a name the model leaves free', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false, referenceIndex: 3 });
            shell.reset();
            shape.draw();
        });
        const published = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            const values = calculator.system.getIteration(calculator.getIteration(), 1);
            return {
                isTerm: calculator.isTerm('y'),
                indexed: calculator.isIndexedSource('y'),
                termNames: calculator.getTermsNames(),
                y: values.y,
                independent: values[calculator.properties.independent.name]
            };
        });
        // A reading is one value, not a name standing for every oscillator at once.
        expect(published.indexed).toBe(false);
        // A reading the model cannot name is of no use in it: the name has to be a term, so the
        // graphs, the tables and every list of terms offer it like any other.
        expect(published.isTerm).toBe(true);
        expect(published.termNames).toContain('y');
        expect(published.y).toBeCloseTo(referenceDisplacement(published.independent), 6);
    });

    // The number the model is handed and the oscillator it was read from are the same thing, so the
    // two can be put side by side: the reading is where the reference oscillator is drawn.
    test('what the model is handed is where the reference oscillator is drawn', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: false, referenceIndex: 3 });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 12, null, { timeout: 20000 });
        const read = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            calculator.pause();
            const shape = shell.board.shapes.getByName('Wave');
            shape.draw();
            return {
                handed: calculator.getByName('y', 1),
                drawn: Number(shape.contentGroup.querySelectorAll('circle')[2].getAttribute('cy')),
                centre: Number(shape.properties.height) / 2,
                // Fitted to the amplitude the object works its own wave out from, with the margin a
                // chart leaves around its data.
                pixelsPerUnit: (Number(shape.properties.height) - 16) / 2 / (Number(shape.properties.amplitude) * 1.08)
            };
        });
        expect(read.drawn).toBeCloseTo(read.centre - read.handed * read.pixelsPerUnit, 6);
    });

    test('a definition reading the name is answered on the row the object wrote', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'z=2\\cdot y';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false, referenceIndex: 3 });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 20, null, { timeout: 20000 });
        const readings = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            calculator.pause();
            const independentName = calculator.properties.independent.name;
            return [5, 10, 20].map(iteration => {
                const values = calculator.system.getIteration(iteration, 1);
                return { t: values[independentName], y: values.y, z: values.z };
            });
        });
        for (const reading of readings) {
            expect(reading.y).toBeCloseTo(referenceDisplacement(reading.t), 6);
            expect(reading.z).toBeCloseTo(2 * reading.y, 6);
        }
    });

    test('the term the model defines is left as the model defines it', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=7';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', amplitude: '2', length: 20 });
            shell.reset();
        });
        expect(await page.evaluate(() => shell.board.calculator.getByName('y', 1))).toBe(7);
    });

    test('a term the model already holds is left standing when the object stops publishing', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'k=3\\\\y=k';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'k', length: 20 });
            shell.reset();
        });
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('k'))).toBe(false);
        expect(await page.evaluate(() => shell.board.calculator.isTerm('k'))).toBe(true);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').remove());
        expect(await page.evaluate(() => ({ isTerm: shell.board.calculator.isTerm('k'), value: shell.board.calculator.getByName('k', 1) }))).toEqual({ isTerm: true, value: 3 });
    });

    test('a name the model works out for itself is read rather than written over', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=4';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20 });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 10, null, { timeout: 20000 });
        expect(await page.evaluate(() => {
            shell.board.calculator.pause();
            return shell.board.calculator.getByName('y', 1);
        })).toBe(4);
    });

    test('two objects reading their own oscillators are added up by the model', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'both=forward+back';
            for (const [name, speed] of [['Forward', '5'], ['Back', '-5']]) {
                const shape = shell.commands.addComponent('mechanical-wave', `Wave ${name}`);
                shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: name.toLowerCase(), length: 20, amplitude: '2', frequency: '0.5', speed: speed, phase: '0', wavefront: false, referenceIndex: 3 });
            }
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 20, null, { timeout: 20000 });
        const rows = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            calculator.pause();
            return [5, 10, 20].map(iteration => calculator.system.getIteration(iteration, 1));
        });
        for (const row of rows) {
            expect(Number.isFinite(row.both)).toBe(true);
            expect(row.both).toBeCloseTo(row.forward + row.back, 6);
        }
    });

    test('the wave it hands the model is the wave it drew before, oscillator for oscillator', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: true };
        const heights = await page.evaluate(parameters => {
            const read = name => Array.from(shell.board.shapes.getByName(name).contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')));
            const kept = shell.commands.addComponent('mechanical-wave', 'Kept');
            kept.setProperties(Object.assign({}, parameters, { wave: '' }));
            const published = shell.commands.addComponent('mechanical-wave', 'Published');
            published.setProperties(Object.assign({}, parameters, { wave: 'y' }));
            shell.reset();
            kept.draw();
            published.draw();
            return { kept: read('Kept'), published: read('Published') };
        }, parameters);
        expect(heights.published.length).toBe(11);
        for (let index = 0; index < heights.kept.length; index++)
            expect(heights.published[index]).toBeCloseTo(heights.kept[index], 6);
    });

    test('editing a parameter changes what the model is handed, and removing the object takes it back', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false, referenceIndex: 3 });
            shell.reset();
        });
        const readValue = name => page.evaluate(name => shell.board.calculator.getByName(name, 1), name);
        const before = await readValue('y');
        expect(before).not.toBe(0);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('amplitude', '6'));
        expect(await readValue('y')).toBeCloseTo(before * 3, 6);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'w'));
        expect(await page.evaluate(() => ({ y: shell.board.calculator.isTerm('y'), w: shell.board.calculator.isTerm('w'), names: shell.board.calculator.getTermsNames() })))
            .toEqual({ y: false, w: true, names: expect.arrayContaining(['w']) });
        expect(await readValue('w')).toBeCloseTo(before * 3, 6);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').remove());
        expect(await page.evaluate(() => shell.board.calculator.isTerm('w'))).toBe(false);
    });

    test('repainting an oscillator leaves the run it has already worked through standing', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, samples: 9, wave: 'y', length: 20 });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 20, null, { timeout: 20000 });
        const worked = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            calculator.pause();
            const before = calculator.getLastCalculatedIteration();
            shell.board.shapes.getByName('Wave').setProperty('waveColor', '#ff0000');
            return { before: before, after: calculator.getLastCalculatedIteration() };
        });
        expect(worked.after).toBe(worked.before);
    });

    // The name is written in the object, not in the model, so the row that takes it has to invite a
    // name the model has never held — the list below it can only offer the terms that already exist.
    test('a name of the reader\'s own can be written into the wave row from the toolbar', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160 });
            shape.draw();
            shell.board.selection.select(shape);
        });
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        // The name is written into the field the row already stands in: it says what it takes, and
        // what is typed there is taken without a drop down being opened to find somewhere to type.
        const termField = page.locator('.mdl-shape-overlay-popup .shape-term-term').first();
        await expect(termField.locator('input.dx-texteditor-input')).toHaveAttribute('placeholder', 'Name a new term');
        await termField.click();
        await page.keyboard.type('y');
        await page.keyboard.press('Enter');
        await expect.poll(() => page.evaluate(() => shell.board.calculator.isTerm('y'))).toBe(true);
        const written = await page.evaluate(() => ({
            wave: shell.board.shapes.getByName('Wave').properties.wave,
            isTerm: shell.board.calculator.isTerm('y'),
            marked: document.querySelectorAll('.mdl-missing-term').length
        }));
        // A name the object defines is not a term that has gone missing, so nothing is marked as one.
        expect(written).toEqual({ wave: 'y', isTerm: true, marked: 0 });
    });

    // A row that governs nothing is not offered: a chain repeating what the model works out is spread
    // over the run's own clock, one oscillator to an iteration, so none of the rows that shape a wave
    // of the object's own — kept to itself or handed over — has anything to say about it.
    test('the settings that shape a wave are offered only where they shape one', async ({ page }) => {
        await setupBoard(page);
        const offered = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            return shape.getParametersByCategory(['model', 'display']).map(parameter => parameter.label);
        });
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'm=\\cos\\left(t\\right)';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160 });
            shell.reset();
        });
        const shaping = ['Amplitude', 'Frequency', 'Speed', 'Initial phase', 'Damping', 'Wavefront'];
        expect(await offered()).toEqual(expect.arrayContaining(shaping));

        // A name of the object's own: it works the wave out and hands it over, so it still shapes it.
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'own'));
        expect(await page.evaluate(() => shell.board.calculator.isTerm('own'))).toBe(true);
        expect(await offered()).toEqual(expect.arrayContaining(shaping));

        // A name the model works out for itself: the object only draws what it is given.
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'm'));
        const readingTheModel = await offered();
        for (const label of shaping)
            expect(readingTheModel).not.toContain(label);
        expect(readingTheModel).toEqual(expect.arrayContaining(['Wave', 'Samples', 'Orientation']));
    });

    // A file saved before the row was renamed still names its term, and reopening it is not the moment
    // to lose it.
    test('a wave saved under the old parameter name keeps the term it was reading', async ({ page }) => {
        await setupBoard(page);
        const carried = await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160 });
            const saved = JSON.parse(JSON.stringify(shape.serialize()));
            delete saved.properties.wave;
            saved.properties.displacement = 'y';
            // Reopened the way a file is, through the board rather than shape by shape.
            shell.board.deserialize([saved]);
            shell.reset();
            const restored = shell.board.shapes.getByName('Wave');
            return { wave: restored.properties.wave, old: restored.properties.displacement, isTerm: shell.board.calculator.isTerm('y') };
        });
        expect(carried).toEqual({ wave: 'y', old: undefined, isTerm: true });
    });

    // A shape is dragged by a handle covering the whole of it, and the only thing telling the reader
    // so is the cursor. A part of a drawing that asks for no cursor of its own is not something to
    // work — it is the object, and the object is there to be dragged — so the move cursor stands over
    // it, and the object leaves room at its edge for the handles it is resized by.
    test('the pointer says the object can be dragged, and its edge leaves room for the handles', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { x: 100, y: 300, width: 400, height: 200, samples: 11 });
        const body = await page.evaluate(() => {
            const rect = shell.board.shapes.getByName('Wave').contentGroup.querySelector('rect');
            return { x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')), width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height')) };
        });
        expect(body).toEqual({ x: HANDLE_ROOM, y: HANDLE_ROOM, width: 400 - 2 * HANDLE_ROOM, height: 200 - 2 * HANDLE_ROOM });
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wave')));
        const middle = await page.evaluate(() => {
            const box = shell.board.shapes.getByName('Wave').element.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        });
        await page.mouse.move(middle.x, middle.y);
        await expect.poll(() => page.evaluate(point => window.getComputedStyle(document.elementFromPoint(point.x, point.y)).cursor, middle)).toBe('move');
        await page.mouse.down();
        await page.mouse.move(middle.x + 60, middle.y + 40, { steps: 8 });
        await page.mouse.up();
        expect(await page.evaluate(() => ({ x: shell.board.shapes.getByName('Wave').properties.x, y: shell.board.shapes.getByName('Wave').properties.y }))).toEqual({ x: 160, y: 340 });
    });

    // The two colours every shape carries: the background is the object's own row in its colour menu,
    // the border is the row the shape menu already has for it.
    test('the object is drawn on a body it paints and outlines', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, {});
        const readBody = () => page.evaluate(() => {
            const rect = shell.board.shapes.getByName('Wave').contentGroup.querySelector('rect');
            return { fill: rect.getAttribute('fill'), stroke: rect.getAttribute('stroke') };
        });
        const painted = await readBody();
        expect(painted.fill).toMatch(/^#[0-9a-f]{6}$/i);
        expect(painted.stroke).toMatch(/^#[0-9a-f]{6}$/i);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ backgroundColor: '#112233', borderColor: '#ff0000' });
            shape.draw();
        });
        expect(await readBody()).toEqual({ fill: '#112233', stroke: '#ff0000' });
        // The border is the shape's own row, so the object does not offer a second one beside it.
        const offered = await page.evaluate(() => shell.board.shapes.getByName('Wave').getParametersByCategory(['style']).map(parameter => parameter.label));
        expect(offered).toContain('Background');
        expect(offered).not.toContain('Border');
    });


    // A wave whose amplitude carries an oscillator past the body used to be drawn straight over
    // whatever the board had there. Every part that moves is now drawn inside a window the body
    // sets, so the wave is cut off at the edge it belongs to.
    test('every moving part is drawn inside a window the size of the body', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, showLine: true, showArrows: true });
        const drawn = await page.evaluate(() => {
            const group = shell.board.shapes.getByName('Wave').contentGroup.firstElementChild;
            const window = group.querySelector('svg');
            return {
                // The body is drawn before the window and stays outside it, so its own border is
                // not cut in half by the very window it sets.
                order: Array.from(group.children).map(node => node.tagName),
                frame: { width: Number(window.getAttribute('width')), height: Number(window.getAttribute('height')) },
                overflow: window.getAttribute('overflow'),
                loose: group.querySelectorAll(':scope > circle, :scope > line').length,
                inside: window.querySelectorAll('circle, line').length
            };
        });
        expect(drawn.order).toEqual(['rect', 'svg']);
        expect(drawn.frame).toEqual({ width: 600 - 2 * HANDLE_ROOM, height: 160 - 2 * HANDLE_ROOM });
        expect(drawn.overflow).toBe('hidden');
        expect(drawn.loose).toBe(0);
        expect(drawn.inside).toBe(11 + 10 + 11 * 3);
    });

    // Reading the drawing tells us where an oscillator was put; only the board itself can say
    // whether it was painted there, so each one is asked for at the point it stands on.
    async function elementAtOscillator(page, index) {
        return page.evaluate(index => {
            const circle = shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')[index];
            const box = circle.getBoundingClientRect();
            const found = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return { height: Number(circle.getAttribute('cy')), painted: found?.getAttribute('data-source-id') ?? null };
        }, index);
    }

    test('a transverse wave taller than its body is cut off at the edge', async ({ page }) => {
        await setupBoard(page);
        // A body set to show two units of displacement, with a wave swinging twenty: the swing is ten
        // times the body, so most of the chain stands well outside it.
        await addWave(page, { x: 100, y: 400, width: 400, height: 100, samples: 21, amplitude: '20', length: 20, wavefront: false, autoScale: false, minimumY: -2, maximumY: 2 });
        const heights = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))));
        const inside = heights.findIndex(height => height >= 0 && height <= 100);
        const above = heights.findIndex(height => height < 0);
        expect(inside).toBeGreaterThanOrEqual(0);
        expect(above).toBeGreaterThanOrEqual(0);
        expect((await elementAtOscillator(page, inside)).painted).toBe('oscillator');
        expect((await elementAtOscillator(page, above)).painted).toBeNull();
    });

    test('a longitudinal wave pushed past the end of its body is cut off too', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { x: 100, y: 400, width: 400, height: 100, samples: 21, amplitude: '20', length: 20, orientation: 'longitudinal', wavefront: false, autoScale: false, minimumY: -2, maximumY: 2 });
        const painted = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            const bars = Array.from(shape.contentGroup.querySelectorAll('rect')).slice(1);
            const beyond = bars.find(bar => Number(bar.getAttribute('x')) > 400);
            const box = beyond.getBoundingClientRect();
            const found = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return { pushedTo: Number(beyond.getAttribute('x')), painted: found?.getAttribute('data-source-id') ?? null };
        });
        expect(painted.pushedTo).toBeGreaterThan(400);
        expect(painted.painted).toBeNull();
    });

    test('radial draws a ring for each oscillator, all of them centred on the body', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, orientation: 'radial', width: 400, height: 300 });
        const rings = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => ({
            x: Number(node.getAttribute('cx')),
            y: Number(node.getAttribute('cy')),
            fill: node.getAttribute('fill')
        })));
        expect(rings).toHaveLength(11);
        for (const ring of rings) {
            expect(ring.x).toBeCloseTo(200, 6);
            expect(ring.y).toBeCloseTo(150, 6);
            // A ripple is a ring, not a disc: what is drawn is the crest passing, not the water
            // inside it.
            expect(ring.fill).toBe('none');
        }
    });

    // The radial wave turns the swing through the screen. An oscillator is a circle standing as far
    // from the source as the wave had to travel to reach it — the same thing the width does in the
    // chain, where an oscillator stands further along the older its value is — and the swing itself
    // is painted rather than drawn. So the circles never move: whatever the wave is doing, and
    // whenever it is read, they stand where the chain's oscillators stand along the width.
    test('a ripple stands where the wave reached it, and the swing never moves it', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: false, orientation: 'radial' };
        const drawn = await page.evaluate(parameters => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Rings');
            shape.setProperties(parameters);
            shell.reset();
            shell.board.calculator.pause();
            const read = () => Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('r')));
            shape.draw();
            const atRest = read();
            const overTime = [];
            for (const iteration of [0, 7, 19, 33]) {
                shell.board.calculator.setIteration(iteration);
                shape.draw();
                overTime.push(read());
            }
            // The same wave with twice the swing: the picture changes colour, never geometry.
            shape.setProperties({ amplitude: '8' });
            shape.draw();
            return { atRest, overTime, louder: read() };
        }, parameters);
        // Evenly stepped from the source out to the rim, one step to each oscillator.
        const room = Math.max(600 - 2 * HANDLE_ROOM, 200 - 2 * HANDLE_ROOM) / 2;
        const step = room / 11;
        for (let index = 0; index < drawn.atRest.length; index++)
            expect(drawn.atRest[index]).toBeCloseTo((index + 0.5) * step, 6);
        for (const moment of drawn.overTime)
            expect(moment).toEqual(drawn.atRest);
        expect(drawn.louder).toEqual(drawn.atRest);
    });

    // Circle and circle meet: the disc is covered from the source to the rim, so the wave is a run
    // of colour rather than a set of rings with the body showing between them.
    test('the circles are as thick as the room between them, so none of the disc is left uncovered', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { x: 80, y: 80, width: 600, height: 200, samples: 11, orientation: 'radial', wavefront: false });
        const bands = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => ({
            inner: Number(node.getAttribute('r')) - Number(node.getAttribute('stroke-width')) / 2,
            outer: Number(node.getAttribute('r')) + Number(node.getAttribute('stroke-width')) / 2
        })));
        // The first circle covers the source itself, and each one after it starts inside the one
        // before rather than beyond it.
        expect(bands[0].inner).toBeLessThanOrEqual(0);
        for (let index = 1; index < bands.length; index++)
            expect(bands[index].inner).toBeLessThanOrEqual(bands[index - 1].outer);
        const room = Math.max(600 - 2 * HANDLE_ROOM, 200 - 2 * HANDLE_ROOM) / 2;
        expect(bands[bands.length - 1].outer).toBeGreaterThanOrEqual(room);
    });

    // What went wrong before: the rings were laid out on the width the chain runs along, measured
    // from a source in the middle, so the far ones stood a whole body-width out and all but the
    // first two were cut away. A ripple spreads to the wall of the tank it is made in and no
    // further: the widest ring of a run reaches the furthest edge of the body, and nothing the
    // object draws stands beyond it.
    test('the circles spread to the furthest edge of the body and no further', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 24, length: 20, amplitude: '2', frequency: '0.5', speed: '5', wavefront: false, orientation: 'radial' };
        const widest = await page.evaluate(parameters => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Rings');
            shape.setProperties(parameters);
            shell.reset();
            shell.board.calculator.pause();
            let found = 0;
            for (let iteration = 0; iteration < 60; iteration++) {
                shell.board.calculator.setIteration(iteration);
                shape.draw();
                for (const node of shape.contentGroup.querySelectorAll('circle'))
                    found = Math.max(found, Number(node.getAttribute('r')) + Number(node.getAttribute('stroke-width')) / 2);
            }
            return found;
        }, parameters);
        const reach = Math.max(600 - 2 * HANDLE_ROOM, 200 - 2 * HANDLE_ROOM) / 2;
        // The last circle covers the rim and the half pixel that keeps it touching the one inside it.
        expect(widest).toBeLessThanOrEqual(reach + 0.3);
        expect(widest).toBeGreaterThanOrEqual(reach);
    });

    // A ring only tells you where its oscillator is by how the rings bunch, which is hard to read
    // when there are a hundred of them. So it is painted by how far it is carried as well, on the
    // very scale the drawing is already on: the wave's own colour at the top of it, the body behind
    // it at the bottom, and mixed of the two between — which is the banding a ripple shows on
    // water.
    // rather than disappearing every trough.
    test('a ring is painted by how far its oscillator is carried', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: false, autoScale: false, minimumY: -4, maximumY: 4 };
        const drawn = await page.evaluate(parameters => {
            const chain = shell.commands.addComponent('mechanical-wave', 'Chain');
            chain.setProperties(Object.assign({}, parameters, { orientation: 'transverse' }));
            const rings = shell.commands.addComponent('mechanical-wave', 'Rings');
            rings.setProperties(Object.assign({}, parameters, { orientation: 'radial' }));
            shell.reset();
            chain.draw();
            rings.draw();
            return {
                heights: Array.from(shell.board.shapes.getByName('Chain').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))),
                // A ring left at its full colour carries no opacity of its own.
                paints: Array.from(shell.board.shapes.getByName('Rings').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('opacity') ?? 1))
            };
        }, parameters);
        // The body runs from a displacement of minus four to one of four, so its hundred and
        // eighty-four pixels are twenty-three to the unit.
        const pixelsPerUnit = (200 - 2 * HANDLE_ROOM) / (parameters.maximumY - parameters.minimumY);
        for (let index = 0; index < drawn.paints.length; index++) {
            const displacement = (100 - drawn.heights[index]) / pixelsPerUnit;
            expect(drawn.paints[index]).toBeCloseTo((displacement - parameters.minimumY) / (parameters.maximumY - parameters.minimumY), 5);
        }
        // The wave really does swing both ways over the chain, so the assertions above are not all
        // being made about rings sitting at rest.
        expect(Math.max(...drawn.paints)).toBeGreaterThan(0.7);
        expect(Math.min(...drawn.paints)).toBeLessThan(0.3);
    });

    // The colouring runs over the very scale the drawing runs over, so widening the scale flattens
    // the picture and narrowing it pins every ring to one end or the other. There is one pair of
    // ends, not a pair for the drawing and another for the colour.
    test('the colouring runs over the scale the drawing is on', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, samples: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: false, orientation: 'radial', referenceIndex: 0, autoScale: false };
        const paintsFor = ends => page.evaluate(([parameters, ends]) => {
            const shape = shell.board.shapes.getByName('Rings') ?? shell.commands.addComponent('mechanical-wave', 'Rings');
            shape.setProperties(Object.assign({}, parameters, ends));
            shell.reset();
            shape.draw();
            return Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('opacity') ?? 1));
        }, [parameters, ends]);

        // Ends the swing fills: the rings run the whole way from the body behind them to full colour.
        const fitted = await paintsFor({ minimumY: -2, maximumY: 2 });
        expect(Math.min(...fitted)).toBeLessThan(0.1);
        expect(Math.max(...fitted)).toBeGreaterThan(0.9);

        // Ends far wider than the swing: every ring sits near the middle of the mixing, so the
        // picture is one flat tint and the bands are gone.
        const wide = await paintsFor({ minimumY: -20, maximumY: 20 });
        for (const paint of wide)
            expect(paint).toBeGreaterThan(0.4);
        expect(Math.max(...wide) - Math.min(...wide)).toBeLessThan(0.2);

        // Ends narrower than the swing: everything past them is pinned to one end or the other.
        const narrow = await paintsFor({ minimumY: -0.2, maximumY: 0.2 });
        expect(narrow.filter(paint => paint === 0 || paint === 1).length).toBeGreaterThan(narrow.length / 2);

        // A collapsed pair is not a division by zero: the ends are held apart.
        const collapsed = await paintsFor({ minimumY: 2, maximumY: 2 });
        for (const paint of collapsed)
            expect(Number.isFinite(paint)).toBe(true);
    });

    // The ends the wave is drawn between are edited the way the chart edits its axes: one row under
    // Auto scale, a minimum and a maximum on it. The wave scales only what it swings in — its width
    // is its own length, not an axis the reader sets — so it declares that one pair and gets that
    // one row.
    test('the scale is one row of ends under auto scale, for the swing alone', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, amplitude: '5', wavefront: false });
        const shown = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            return {
                axes: shape.getAxisRangeAxes(),
                // The ends are never written down: what auto scale works out is shown, and what the
                // object was set to is still standing underneath it.
                fitted: shape.getEffectiveAxisRange(),
                stored: shape.getStoredAxisRange(),
                offered: shape.getParametersByCategory(['display', 'scale', 'interaction', 'sound', 'general']).map(parameter => parameter.label)
            };
        });
        expect(shown.axes).toEqual(['y']);
        expect(shown.fitted.yMin).toBeCloseTo(-5.4, 6);
        expect(shown.fitted.yMax).toBeCloseTo(5.4, 6);
        expect(shown.stored).toMatchObject({ yMin: -2, yMax: 2 });
        expect(shown.offered).toContain('Auto scale');

        // Auto scale off, and the ends are the reader's again — the defaults until they say otherwise.
        const off = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ autoScale: false });
            return shape.getEffectiveAxisRange();
        });
        expect(off.yMin).toBe(-2);
        expect(off.yMax).toBe(2);
    });

    // A scale saved as one number either side of nothing is two ends now, and reopening a board is
    // not the moment to halve the wave it was drawing.
    test('a board saved when the scale was one number keeps the distance it ran', async ({ page }) => {
        await setupBoard(page);
        const carried = await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160, autoScale: false });
            const saved = JSON.parse(JSON.stringify(shape.serialize()));
            delete saved.properties.minimumY;
            delete saved.properties.maximumY;
            saved.properties.displacementScale = 4;
            shell.board.deserialize([saved]);
            shell.reset();
            const restored = shell.board.shapes.getByName('Wave');
            return { min: restored.properties.minimumY, max: restored.properties.maximumY, old: restored.properties.displacementScale };
        });
        expect(carried).toEqual({ min: -4, max: 4, old: undefined });
    });

    // The reference oscillator is a place in the chain, marked so it can be watched. The radial
    // picture has nothing but colour to say things with, and a circle painted out of the wave would
    // read as an oscillator doing something the rest are not, so it marks none.
    test('the reference oscillator is marked in the chain and left unmarked in the rings', async ({ page }) => {
        await setupBoard(page);
        const painted = await page.evaluate(() => {
            const read = name => Array.from(shell.board.shapes.getByName(name).contentGroup.querySelectorAll('circle'))
                // The chain paints its oscillators and the rings stroke theirs, so whichever of the
                // two is not "none" is the colour the reader sees.
                .map(node => node.getAttribute('fill') === 'none' ? node.getAttribute('stroke') : node.getAttribute('fill'));
            const settings = { x: 80, y: 80, width: 400, height: 200, samples: 11, referenceIndex: 3, referenceColor: '#ff0000', waveColor: '#0000ff', wavefront: false };
            const chain = shell.commands.addComponent('mechanical-wave', 'Chain');
            chain.setProperties(Object.assign({}, settings, { orientation: 'transverse' }));
            const rings = shell.commands.addComponent('mechanical-wave', 'Rings');
            rings.setProperties(Object.assign({}, settings, { orientation: 'radial' }));
            shell.reset();
            chain.draw();
            rings.draw();
            return { chain: read('Chain'), rings: read('Rings') };
        });
        expect(painted.chain[2]).toBe('#ff0000');
        expect(painted.chain[0]).toBe('#0000ff');
        expect(new Set(painted.rings)).toEqual(new Set(['#0000ff']));
    });

    test('the connecting line and the velocity arrows belong to the transverse chain alone', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 11, orientation: 'radial', showLine: true, showArrows: true });
        expect(await countOf(page, 'line')).toBe(0);
        expect(await countOf(page, 'circle')).toBe(11);
    });

    test('a board saved before the count was renamed keeps it', async ({ page }) => {
        await setupBoard(page);
        const carried = await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160, samples: 7 });
            const saved = JSON.parse(JSON.stringify(shape.serialize()));
            delete saved.properties.samples;
            saved.properties.elements = 7;
            shell.board.deserialize([saved]);
            shell.reset();
            const restored = shell.board.shapes.getByName('Wave');
            restored.draw();
            return { samples: restored.properties.samples, old: restored.properties.elements, drawn: restored.contentGroup.querySelectorAll('circle').length };
        });
        expect(carried).toEqual({ samples: 7, old: undefined, drawn: 7 });
    });

    test('survives a serialize and deserialize round trip', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { samples: 17, orientation: 'longitudinal', referenceIndex: 4, showArrows: true, speed: '7' });
        const serialized = await page.evaluate(() => JSON.parse(JSON.stringify(shell.board.shapes.getByName('Wave').serialize())));
        expect(serialized.type).toBe('ComponentShape');
        expect(serialized.properties.samples).toBe(17);
        expect(serialized.properties.orientation).toBe('longitudinal');
        expect(serialized.properties.referenceIndex).toBe(4);
        expect(serialized.properties.speed).toBe('7');
        expect(serialized.properties.damping).toBe('0');
    });
});
