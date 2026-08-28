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
        expect(labels.filter(label => /^wave\b/i.test(label))).toEqual([]);
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

    test('the wavefront holds the far oscillators at rest until the wave arrives', async ({ page }) => {
        await setupBoard(page);
        await addWave(page, { elements: 11, wavefront: true, speed: '5', length: 20 });
        const atRest = await page.evaluate(() => {
            const nodes = Array.from(shell.board.shapes.getByName('Wave').contentGroup.querySelectorAll('circle'));
            return nodes.map(node => Number(node.getAttribute('cy')));
        });
        const equilibrium = atRest[atRest.length - 1];
        expect(atRest[0]).not.toBeCloseTo(equilibrium, 1);
        expect(atRest[9]).toBeCloseTo(equilibrium, 6);
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
            shape.setProperties({ x: 80, y: 80, width: 600, height: 200, elements: 9, displacement: 'y', length: 20 });
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
            shape.setProperties({ x: 80, y: 80, width: 600, height: 220, elements: 9, displacement: 'standing', length: 20 });
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
