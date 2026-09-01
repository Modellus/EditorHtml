const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

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
        expect(labels).toEqual(expect.arrayContaining(['Amplitude', 'Frequency', 'Speed', 'Initial phase', 'Oscillators', 'Orientation']));
        // The row holding the term the wave is read from and published under is the wave itself, so
        // it is called that. What the object never does is prefix its own kind onto the other rows —
        // a wave's amplitude is "Amplitude", never "Wave amplitude".
        expect(labels).toContain('Wave');
        expect(labels.filter(label => /^wave\s+\S/i.test(label))).toEqual([]);
    });

    test('draws one oscillator per element and follows the count', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11 });
        expect(await countOf(page, 'circle')).toBe(11);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            shape.setProperties({ elements: 5 });
            shape.draw();
        });
        expect(await countOf(page, 'circle')).toBe(5);
    });

    test('spacing comes from the width, so the last oscillator sits on the far edge', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, width: 400 });
        const positions = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cx'))));
        expect(positions[0]).toBeCloseTo(0, 3);
        expect(positions[10]).toBeCloseTo(400, 3);
        expect(positions[1] - positions[0]).toBeCloseTo(40, 3);
    });

    test('longitudinal draws bars instead of circles', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, orientation: 'longitudinal' });
        expect(await countOf(page, 'circle')).toBe(0);
        expect(await countOf(page, 'rect')).toBe(11);
    });

    // An oscillator is pushed from where it stands: it enters the wave at rest and swings from there,
    // so nothing has moved before the run starts and the chain is drawn flat, and each oscillator the
    // wave reaches joins it from the line rather than appearing at the crest.
    test('the chain stands at rest until the run starts, the first oscillator included', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, wavefront: true, speed: '5', length: 20 });
        const readHeights = () => page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))));
        const atRest = await readHeights();
        const equilibrium = Number(await page.evaluate(() => shell.board.shapes.getByName('Wave').properties.height)) / 2;
        for (const height of atRest)
            expect(height).toBeCloseTo(equilibrium, 6);
    });

    test('the wavefront holds the far oscillators at rest until the wave arrives', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, wavefront: true, speed: '5', length: 20 });
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
        await addWave(page, { elements: 11, wavefront: false });
        const heights = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy'))));
        const equilibrium = await page.evaluate(() => Number(shell.board.shapes.getByName('Wave').properties.height) / 2);
        expect(heights[9]).not.toBeCloseTo(equilibrium, 3);
        expect(new Set(heights.map(height => height.toFixed(2))).size).toBeGreaterThan(1);
    });

    test('the reference oscillator is drawn in its own colour', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, referenceIndex: 3, referenceColor: '#ff0000', waveColor: '#0000ff' });
        const fills = await page.evaluate(() => Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle')).map(node => node.getAttribute('fill')));
        expect(fills[2]).toBe('#ff0000');
        expect(fills[0]).toBe('#0000ff');
    });

    test('velocity arrows and the connecting line follow their settings', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, showArrows: false, showLine: false });
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


    test('draws a wave the model defined over element indices', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y\\left[i\\right]=2\\cdot\\cos\\left(i\\right)';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20 });
            shell.reset();
            shape.draw();
        });
        const drawn = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            const heights = Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')));
            const centre = Number(shape.properties.height) / 2;
            const pixelsPerUnit = Number(shape.properties.width) / Number(shape.properties.length);
            return { heights, centre, pixelsPerUnit, indexed: shell.board.calculator.isIndexedSource('y') };
        });
        expect(drawn.indexed).toBe(true);
        for (let index = 0; index < drawn.heights.length; index++) {
            const expected = drawn.centre - 2 * Math.cos(index + 1) * drawn.pixelsPerUnit;
            expect(drawn.heights[index]).toBeCloseTo(expected, 6);
        }
    });

    test('superposing two model waves stands one oscillator still while another swings', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression =
                'A=2\\\\k=\\frac{\\pi}{6}\\\\w=1\\\\forward\\left[i\\right]=A\\cdot\\cos\\left(k\\cdot i-w\\cdot t\\right)\\\\back\\left[i\\right]=A\\cdot\\cos\\left(k\\cdot i+w\\cdot t\\right)\\\\standing=forward+back';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 220, elements: 9, wave: 'standing', length: 20 });
            shell.reset();
        });
        await page.evaluate(() => shell.board.calculator.play());
        await page.waitForFunction(() => shell.board.calculator.getLastCalculatedIteration() > 60, null, { timeout: 20000 });
        const swing = await page.evaluate(async () => {
            const shape = shell.board.shapes.getByName('Wave');
            const calculator = shell.board.calculator;
            calculator.pause();
            const extremes = { node: { low: Infinity, high: -Infinity }, antinode: { low: Infinity, high: -Infinity } };
            for (let iteration = 1; iteration <= 60; iteration++) {
                calculator.setIteration(iteration);
                calculator.calculate(iteration);
                shape.draw();
                const heights = Array.from(shape.contentGroup.querySelectorAll('circle')).map(node => Number(node.getAttribute('cy')));
                for (const [key, index] of [['node', 2], ['antinode', 5]]) {
                    extremes[key].low = Math.min(extremes[key].low, heights[index]);
                    extremes[key].high = Math.max(extremes[key].high, heights[index]);
                }
            }
            return { node: extremes.node.high - extremes.node.low, antinode: extremes.antinode.high - extremes.antinode.low };
        });
        expect(swing.node).toBeLessThan(1);
        expect(swing.antinode).toBeGreaterThan(50);
    });

    test('publishes its own wave under a name the model leaves free', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false });
            shell.reset();
            shape.draw();
        });
        const published = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            const values = calculator.system.getIteration(calculator.getIteration(), 1);
            return {
                indexed: calculator.isIndexedSource('y'),
                isTerm: calculator.isTerm('y'),
                termNames: calculator.getTermsNames(),
                elements: [1, 2, 3].map(index => calculator.system.getElementValue('y', index, values)),
                independent: values[calculator.properties.independent.name]
            };
        });
        expect(published.indexed).toBe(true);
        // A wave the model cannot name is of no use in it: the name has to be a term, so the graphs,
        // the tables and every list of terms offer it like any other.
        expect(published.isTerm).toBe(true);
        expect(published.termNames).toContain('y');
        for (let element = 1; element <= 3; element++) {
            const delay = (element - 1) * 20 / (8 * 5);
            expect(published.elements[element - 1]).toBeCloseTo(2 * Math.sin(2 * Math.PI * 0.5 * (published.independent - delay)), 6);
        }
    });

    test('the model reads the published wave at the row it is working on', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'z=y\\left[3\\right]';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false });
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
                return { t: values[independentName], z: values.z };
            });
        });
        for (const reading of readings)
            expect(reading.z).toBeCloseTo(2 * Math.sin(2 * Math.PI * 0.5 * (reading.t - 2 * 20 / (8 * 5))), 6);
    });

    test('the wave the model defines is left as the model defines it', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y\\left[i\\right]=7';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', amplitude: '2', length: 20 });
            shell.reset();
        });
        const element = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            return calculator.system.getElementValue('y', 3, calculator.system.getIteration(calculator.getIteration(), 1));
        });
        expect(element).toBe(7);
    });

    test('a term the model already holds is left standing when the object stops publishing', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'k=3\\\\y=k';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'k', length: 20 });
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
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20 });
            shell.reset();
        });
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('y'))).toBe(false);
    });

    test('two published waves superpose into a standing wave the model holds', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'standing=forward+back';
            for (const [name, speed] of [['Forward', '5'], ['Back', '-5']]) {
                const shape = shell.commands.addComponent('mechanical-wave', `Wave ${name}`);
                shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: name.toLowerCase(), length: 20, amplitude: '2', frequency: '0.5', speed: speed, phase: '0', wavefront: false });
            }
            shell.reset();
        });
        const sums = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            const values = calculator.system.getIteration(calculator.getIteration(), 1);
            return [1, 3, 5].map(index => ({
                forward: calculator.system.getElementValue('forward', index, values),
                back: calculator.system.getElementValue('back', index, values),
                standing: calculator.system.getElementValue('standing', index, values)
            }));
        });
        for (const sum of sums) {
            expect(Number.isFinite(sum.standing)).toBe(true);
            expect(sum.standing).toBeCloseTo(sum.forward + sum.back, 6);
        }
    });

    test('the wave it publishes is the wave it drew before, oscillator for oscillator', async ({ page }) => {
        await setupBoard(page);
        const parameters = { x: 80, y: 80, width: 600, height: 200, elements: 11, length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0.4', wavefront: true };
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

    test('editing a parameter republishes the wave, and removing the object takes it back', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20, amplitude: '2', frequency: '0.5', speed: '5', phase: '0', wavefront: false });
            shell.reset();
        });
        const readElement = () => page.evaluate(() => {
            const calculator = shell.board.calculator;
            return calculator.system.getElementValue('y', 1, calculator.system.getIteration(calculator.getIteration(), 1));
        });
        const before = await readElement();
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('amplitude', '6'));
        expect(await readElement()).toBeCloseTo(before * 3, 6);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'w'));
        expect(await page.evaluate(() => {
            const calculator = shell.board.calculator;
            return { y: calculator.isIndexedSource('y'), w: calculator.isIndexedSource('w'), names: calculator.getTermsNames() };
        })).toEqual({ y: false, w: true, names: expect.arrayContaining(['w']) });
        expect(await page.evaluate(() => shell.board.calculator.isTerm('y'))).toBe(false);
        await page.evaluate(() => shell.board.shapes.getByName('Wave').remove());
        expect(await page.evaluate(() => ({
            indexed: shell.board.calculator.isIndexedSource('w'),
            isTerm: shell.board.calculator.isTerm('w')
        }))).toEqual({ indexed: false, isTerm: false });
    });

    test('repainting an oscillator leaves the run it has already worked through standing', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, wave: 'y', length: 20 });
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
        await page.locator('.mdl-shape-overlay-popup .dx-dropdownbox').first().click();
        const customValue = page.locator('.mdl-term-tree-custom-input input').first();
        await expect(customValue).toHaveAttribute('placeholder', 'Name a new term');
        await customValue.fill('y');
        await customValue.press('Enter');
        await expect.poll(() => page.evaluate(() => shell.board.calculator.isIndexedSource('y'))).toBe(true);
        const written = await page.evaluate(() => ({
            wave: shell.board.shapes.getByName('Wave').properties.wave,
            isTerm: shell.board.calculator.isTerm('y'),
            marked: document.querySelectorAll('.mdl-missing-term').length
        }));
        // A name the object defines is not a term that has gone missing, so nothing is marked as one.
        expect(written).toEqual({ wave: 'y', isTerm: true, marked: 0 });
    });

    // A row that governs nothing is not offered: reading a wave the model defines leaves the object
    // nothing to shape, while a wave of its own — kept to itself or published — is shaped by all four.
    test('the settings that shape a wave are offered only where they shape one', async ({ page }) => {
        await setupBoard(page);
        const offered = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wave');
            return shape.getParametersByCategory(['model', 'display']).map(parameter => parameter.label);
        });
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'm\\left[i\\right]=\\cos\\left(i\\right)';
            const shape = shell.commands.addComponent('mechanical-wave', 'Wave');
            shape.setProperties({ x: 80, y: 80, width: 400, height: 160 });
            shell.reset();
        });
        const shaping = ['Amplitude', 'Frequency', 'Speed', 'Initial phase', 'Wavefront'];
        expect(await offered()).toEqual(expect.arrayContaining(shaping));

        // A name of the object's own: it works the wave out and publishes it, so it still shapes it.
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'own'));
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('own'))).toBe(true);
        expect(await offered()).toEqual(expect.arrayContaining(shaping));

        // A name the model defines over element indices: the object only draws what it is given.
        await page.evaluate(() => shell.board.shapes.getByName('Wave').setProperty('wave', 'm'));
        const readingTheModel = await offered();
        for (const label of shaping)
            expect(readingTheModel).not.toContain(label);
        expect(readingTheModel).toEqual(expect.arrayContaining(['Wave', 'Oscillators', 'Orientation']));
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
            return { wave: restored.properties.wave, old: restored.properties.displacement, indexed: shell.board.calculator.isIndexedSource('y') };
        });
        expect(carried).toEqual({ wave: 'y', old: undefined, indexed: true });
    });

    test('survives a serialize and deserialize round trip', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 17, orientation: 'longitudinal', referenceIndex: 4, showArrows: true, speed: '7' });
        const serialized = await page.evaluate(() => JSON.parse(JSON.stringify(shell.board.shapes.getByName('Wave').serialize())));
        expect(serialized.type).toBe('ComponentShape');
        expect(serialized.properties.elements).toBe(17);
        expect(serialized.properties.orientation).toBe('longitudinal');
        expect(serialized.properties.referenceIndex).toBe(4);
        expect(serialized.properties.speed).toBe('7');
    });
});
