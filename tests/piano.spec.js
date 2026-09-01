const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function openBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

// Notes are recorded rather than sounded: what matters here is which pitches the object reaches for
// and when it lets them go, not that a browser with no speakers made a noise.
async function setupBoard(page) {
    await openBoard(page);
    await page.evaluate(() => {
        window.soundedNotes = [];
        window.stoppedNotes = [];
        ShapeTone.prototype.start = function (frequency) {
            this.frequency = frequency;
            window.soundedNotes.push(frequency);
        };
        ShapeTone.prototype.stop = function () {
            window.stoppedNotes.push(this.frequency);
        };
    });
}

async function addPiano(page, parameters = {}) {
    await page.evaluate(parameters => {
        const shape = shell.commands.addComponent('piano', 'Piano');
        shape.setProperties(Object.assign({ x: 60, y: 60, width: 460, height: 130 }, parameters));
        shell.reset();
        shape.draw();
    }, parameters);
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Piano')?.contentGroup?.children.length ?? 0)).toBeGreaterThan(0);
}

function heldNotes(page) {
    return page.evaluate(() => Array.from(shell.board.shapes.getByName('Piano')._noteHolders.keys()).sort((first, second) => first - second));
}

function litKeyCount(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Piano');
        const pressed = shape.properties.pressedColor;
        return Array.from(shape.contentGroup.querySelectorAll('rect')).filter(node => node.getAttribute('fill') === pressed).length;
    });
}

function readElements(page, indices) {
    return page.evaluate(indices => {
        const calculator = shell.board.calculator;
        const values = calculator.system.getIteration(calculator.getIteration(), 1);
        return indices.map(index => calculator.system.getElementValue('y', index, values));
    }, indices);
}

test.describe('Piano object', () => {

    test('is offered in the objects palette', async ({ page }) => {
        await setupBoard(page);
        const entry = await page.evaluate(() => BlockRegistry.list('component', { agentAccessibleOnly: true })
            .filter(registration => registration.tags.includes('object'))
            .map(registration => ({ type: registration.type, displayName: registration.displayName }))
            .find(registration => registration.type === 'piano') ?? null);
        expect(entry).not.toBeNull();
        expect(entry.displayName).toBe('Piano');
    });

    test('is built out of blocks the registry holds', async ({ page }) => {
        await setupBoard(page);
        const blocks = await page.evaluate(() => ({
            keyboard: BlockRegistry.get('piano-keyboard')?.category ?? null,
            playNote: BlockRegistry.get('play-note')?.category ?? null,
            definition: BlockDefinitionLoader.getDocument('piano')?.root?.type ?? null,
            problems: BlockDefinitionLoader.inspect(BlockDefinitionLoader.getDocument('piano'))
        }));
        expect(blocks).toEqual({ keyboard: 'component', playNote: 'behaviour', definition: 'piano-keyboard', problems: [] });
    });

    test('draws a keyboard of naturals with the sharps over their seams', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { octaves: 2, width: 420 });
        const drawn = await page.evaluate(() => {
            const rects = Array.from(shell.board.shapes.getByName('Piano').contentGroup.querySelectorAll('rect'));
            const heights = rects.map(node => Number(node.getAttribute('height')));
            const tall = rects.filter(node => Number(node.getAttribute('height')) === Math.max(...heights));
            const last = tall[tall.length - 1];
            return {
                keys: rects.length,
                naturals: tall.length,
                firstX: Number(tall[0].getAttribute('x')),
                lastRight: Number(last.getAttribute('x')) + Number(last.getAttribute('width')),
                shortest: Math.min(...heights),
                tallest: Math.max(...heights)
            };
        });
        // Two octaves closing on the C that ends them: fifteen naturals and ten sharps.
        expect(drawn.keys).toBe(25);
        expect(drawn.naturals).toBe(15);
        expect(drawn.firstX).toBeCloseTo(0, 6);
        expect(drawn.lastRight).toBeCloseTo(420, 6);
        expect(drawn.shortest).toBeLessThan(drawn.tallest);
    });

    test('a key is tuned to its own pitch', async ({ page }) => {
        await setupBoard(page);
        const pitches = await page.evaluate(() => ({
            middleC: BlockKeyboard.getFrequency(60),
            a: BlockKeyboard.getFrequency(69),
            aName: BlockKeyboard.getNoteName(69),
            octaveUp: BlockKeyboard.getFrequency(81) / BlockKeyboard.getFrequency(69)
        }));
        expect(pitches.a).toBeCloseTo(440, 6);
        expect(pitches.aName).toBe('A4');
        expect(pitches.middleC).toBeCloseTo(261.6255653, 5);
        expect(pitches.octaveUp).toBeCloseTo(2, 9);
    });

    test('the computer keys play the piano keys, several at once', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page);
        await page.keyboard.down('z');
        await page.keyboard.down('c');
        await page.keyboard.down('b');
        // Z, C and B are C, E and G of the first octave: a chord held by three fingers at once.
        expect(await heldNotes(page)).toEqual([60, 64, 67]);
        expect(await page.evaluate(() => window.soundedNotes.length)).toBe(3);
        await expect.poll(() => litKeyCount(page)).toBe(3);
        await page.keyboard.up('c');
        expect(await heldNotes(page)).toEqual([60, 67]);
        await page.keyboard.up('z');
        await page.keyboard.up('b');
        expect(await heldNotes(page)).toEqual([]);
        await expect.poll(() => litKeyCount(page)).toBe(0);
    });

    test('the upper row of keys is the octave above the lower one', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { firstOctave: 4, octaves: 2 });
        await page.keyboard.down('q');
        await page.keyboard.down('2');
        expect(await heldNotes(page)).toEqual([72, 73]);
        await page.keyboard.up('q');
        await page.keyboard.up('2');
        expect(await heldNotes(page)).toEqual([]);
    });

    test('a computer key past the end of a short keyboard sounds nothing', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { octaves: 1 });
        await page.keyboard.down('q');
        expect(await heldNotes(page)).toEqual([72]);
        await page.keyboard.down('w');
        expect(await heldNotes(page)).toEqual([72]);
        await page.keyboard.up('q');
        await page.keyboard.up('w');
    });

    test('letters typed into a field are not notes', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page);
        await page.evaluate(() => {
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();
        });
        await page.keyboard.down('z');
        expect(await heldNotes(page)).toEqual([]);
        await page.keyboard.up('z');
    });

    test('pressing a key sounds it until the pointer lets go', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page);
        const point = await page.evaluate(() => {
            const rect = shell.board.shapes.getByName('Piano').contentGroup.querySelector('[data-block-id$="key-62"]').getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.bottom - 20 };
        });
        await page.mouse.move(point.x, point.y);
        await page.mouse.down();
        expect(await heldNotes(page)).toEqual([62]);
        await page.mouse.up();
        expect(await heldNotes(page)).toEqual([]);
        expect(await page.evaluate(() => window.stoppedNotes.length)).toBe(1);
    });

    test('a key really reaches the board’s audio graph, tuned to its own pitch', async ({ page }) => {
        await openBoard(page);
        await addPiano(page);
        await page.keyboard.down('z');
        const graph = await page.evaluate(() => {
            const voice = shell.board.shapes.getByName('Piano')._noteVoices.get(60);
            return {
                oscillator: voice?.oscillator?.constructor.name ?? null,
                gain: voice?.gainNode?.constructor.name ?? null,
                frequency: voice?.oscillator?.frequency.value ?? null,
                contextState: ShapeAudio.context?.state ?? null
            };
        });
        expect(graph.oscillator).toBe('OscillatorNode');
        expect(graph.gain).toBe('GainNode');
        expect(graph.frequency).toBeCloseTo(261.63, 1);
        expect(graph.contextState).toBe('running');
        await page.keyboard.up('z');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Piano')._noteVoices.size)).toBe(0);
    });

    test('publishes the chord it is holding as a wave over sample indices', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '2' });
        const published = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            return { indexed: calculator.isIndexedSource('y'), isTerm: calculator.isTerm('y'), termNames: calculator.getTermsNames() };
        });
        // A wave the model cannot name is of no use in it: the name has to be a term, so the graphs,
        // the tables and every list of terms offer it like any other.
        expect(published.indexed).toBe(true);
        expect(published.isTerm).toBe(true);
        expect(published.termNames).toContain('y');
        expect(await readElements(page, [1, 17])).toEqual([0, 0]);
        await page.keyboard.down('z');
        await page.keyboard.down('b');
        const samples = await readElements(page, [1, 2, 17, 64]);
        const step = 0.02 / 63;
        // The wave of a chord is the wave of each note added together, which is what makes a fifth
        // read as a repeating shape and two neighbours read as beats.
        [1, 2, 17, 64].forEach((index, position) => {
            const time = (index - 1) * step;
            const expected = 2 * Math.sin(2 * Math.PI * 261.6255653005986 * time) + 2 * Math.sin(2 * Math.PI * 391.99543598174927 * time);
            expect(samples[position]).toBeCloseTo(expected, 6);
        });
        await page.keyboard.up('z');
        await page.keyboard.up('b');
        expect(await readElements(page, [1, 17])).toEqual([0, 0]);
    });

    test('the model reads the piano wave a sample at a time, like any other term', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'z=y\\left[3\\right]';
            shell.reset();
        });
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '1' });
        // The expression's math field takes the caret when it is added, and letters typed into it are
        // letters: the piano is played once the caret is out of it.
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.down('n');
        const reading = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            return calculator.system.getIteration(calculator.getIteration(), 1).z;
        });
        // N is the A above middle C, and sample 3 is two steps into the window.
        expect(reading).toBeCloseTo(Math.sin(2 * Math.PI * 440 * 2 * 0.02 / 63), 6);
        await page.keyboard.up('n');
    });

    test('a name the model works out for itself is read rather than written over', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=3';
            shell.reset();
        });
        await addPiano(page, { wave: 'y' });
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('y'))).toBe(false);
        expect(await page.evaluate(() => shell.board.calculator.getByName('y', 1))).toBe(3);
    });

    test('taking the piano off the board takes its wave and its sound with it', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y' });
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('y'))).toBe(true);
        await page.keyboard.down('z');
        expect(await heldNotes(page)).toEqual([60]);
        await page.evaluate(() => shell.board.removeShape(shell.board.shapes.getByName('Piano')));
        expect(await page.evaluate(() => shell.board.calculator.isIndexedSource('y'))).toBe(false);
        expect(await page.evaluate(() => shell.board.calculator.isTerm('y'))).toBe(false);
        expect(await page.evaluate(() => window.stoppedNotes.length)).toBe(1);
        await page.keyboard.up('z');
    });

    // A piano is read by where a key sits, not by a letter painted on it: no real keyboard is
    // lettered, and a note name written on every key turns the drawing into a chart of itself.
    test('nothing is written on the keys', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { octaves: 2 });
        const written = await page.evaluate(() => {
            const group = shell.board.shapes.getByName('Piano').contentGroup;
            return Array.from(group.querySelectorAll('text')).map(node => node.textContent);
        });
        expect(written).toEqual([]);
    });

    test('a chord is not written down: the file remembers no note left sounding', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y', octaves: 3, firstOctave: 3 });
        await page.keyboard.down('z');
        const saved = await page.evaluate(() => JSON.parse(JSON.stringify(shell.board.shapes.getByName('Piano').serialize())));
        expect(saved.properties.notes).toBeFalsy();
        await page.keyboard.up('z');
        const restored = await page.evaluate(data => {
            shell.board.removeShape(shell.board.shapes.getByName('Piano'));
            const shape = shell.board.shapes.deserialize(shell.board, data);
            shell.board.addShape(shape, false);
            shell.reset();
            shape.draw();
            return {
                wave: shape.properties.wave,
                octaves: shape.properties.octaves,
                keys: shape.contentGroup.querySelectorAll('rect').length,
                held: shape._noteHolders.size,
                indexed: shell.board.calculator.isIndexedSource('y')
            };
        }, saved);
        expect(restored).toEqual({ wave: 'y', octaves: 3, keys: 37, held: 0, indexed: true });
    });
});
