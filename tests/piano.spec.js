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

// What the model was handed on each of those rows of the run, which is where a wave written a point
// at a time lives: the term holds one value per iteration, not one per element.
function readRows(page, iterations) {
    return page.evaluate(iterations => {
        const calculator = shell.board.calculator;
        return iterations.map(iteration => calculator.system.getIteration(iteration, 1).y);
    }, iterations);
}

// The chord's own window: sample n stands (n - 1) spacings into it, and the run walks it a sample to
// each row, so the value on row n is the wave at that sample.
function chordAt(iteration, frequencies, amplitude = 2, samples = 64, duration = 0.02) {
    const time = (iteration - 1) * duration / (samples - 1);
    return frequencies.reduce((total, frequency) => total + amplitude * Math.sin(2 * Math.PI * frequency * time), 0);
}

async function runTo(page, iteration) {
    await page.evaluate(() => shell.board.calculator.play());
    await page.waitForFunction(iteration => shell.board.calculator.getLastCalculatedIteration() > iteration, iteration, { timeout: 20000 });
    await page.evaluate(() => shell.board.calculator.pause());
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

    // The name the piano writes under stands for one value, not for a whole wave: the model reads it
    // like any other term, and the wave is the shape its points make once the run has laid them down.
    test('hands the model the sound of the chord it is holding, a point to each row of the run', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '2' });
        const published = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            return { indexed: calculator.isIndexedSource('y'), isTerm: calculator.isTerm('y'), termNames: calculator.getTermsNames() };
        });
        // A sound the model cannot name is of no use in it: the name has to be a term, so the graphs,
        // the tables and every list of terms offer it like any other.
        expect(published.indexed).toBe(false);
        expect(published.isTerm).toBe(true);
        expect(published.termNames).toContain('y');
        await page.keyboard.down('z');
        await page.keyboard.down('b');
        await runTo(page, 20);
        const rows = [1, 2, 5, 17];
        const written = await readRows(page, rows);
        // The sound of a chord is the sound of each note added together, which is what makes a fifth
        // read as a repeating shape and two neighbours read as beats.
        rows.forEach((iteration, position) => {
            expect(written[position]).toBeCloseTo(chordAt(iteration, [261.6255653005986, 391.99543598174927]), 6);
        });
        await page.keyboard.up('z');
        await page.keyboard.up('b');
    });

    // A keyboard holding no note is silence, which is a value the model can read, not an absence.
    test('a keyboard holding nothing writes silence', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '2' });
        await runTo(page, 12);
        expect(await readRows(page, [1, 5, 10])).toEqual([0, 0, 0]);
    });

    test('the model reads what the piano writes, like any other term', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'z=2\\cdot y';
            shell.reset();
        });
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '1' });
        // The expression's math field takes the caret when it is added, and letters typed into it are
        // letters: the piano is played once the caret is out of it.
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.down('n');
        await runTo(page, 12);
        const readings = await page.evaluate(() => [3, 7].map(iteration => {
            const values = shell.board.calculator.system.getIteration(iteration, 1);
            return { y: values.y, z: values.z };
        }));
        // N is the A above middle C, and row 3 is two samples into the window.
        [3, 7].forEach((iteration, position) => {
            expect(readings[position].y).toBeCloseTo(chordAt(iteration, [440], 1), 6);
            expect(readings[position].z).toBeCloseTo(2 * readings[position].y, 6);
        });
        await page.keyboard.up('n');
    });

    // The whole of what the name is for: a term the piano writes a point at a time is not a wave, and
    // an oscilloscope reading it over the run draws the wave those points make.
    test('the points it writes are drawn as a wave on an oscilloscope reading the same name', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y', samples: 64, duration: 0.02, amplitude: '2' });
        await page.evaluate(() => {
            const scope = shell.commands.addComponent('oscilloscope', 'Scope');
            scope.setProperties({
                x: 60, y: 260, width: 460, height: 300, showLegend: false, showTicks: false,
                minimumX: 0, maximumX: 12, minimumY: -4, maximumY: 4,
                waves: [{ term: 'y', case: 1, color: '' }, { term: '', case: 1, color: '' }]
            });
            scope.draw();
        });
        await page.keyboard.down('z');
        await page.keyboard.down('b');
        await runTo(page, 20);
        const drawn = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Scope');
            shape.draw();
            const plot = shape.contentGroup.querySelector('[data-source-id="plot"]');
            return {
                segments: Array.from(shape.contentGroup.querySelectorAll('[data-source-id="trace"]')).map(node => Number(node.getAttribute('y1'))),
                y: Number(plot.getAttribute('y')),
                height: Number(plot.getAttribute('height'))
            };
        });
        expect(drawn.segments).toHaveLength(12);
        // The screen reads element i on row i of the run, so segment i stands where the chord stood
        // when the run worked that row out.
        drawn.segments.forEach((drawnY, index) => {
            const value = chordAt(index + 1, [261.6255653005986, 391.99543598174927]);
            expect(drawnY).toBeCloseTo(drawn.y + drawn.height * (1 - (value + 4) / 8), 3);
        });
        await page.keyboard.up('z');
        await page.keyboard.up('b');
    });

    // A chord written under a name is a wave for a chain to carry, not a name for the chain to work
    // out for itself: the object reading it repeats what the piano has been writing, and lets the
    // piano keep the name rather than writing over it row by row. Which of the two was laid down
    // first is no reason for either of them to go quiet, so the board is built both ways round.
    for (const waveFirst of [false, true]) {
        test(`a wave object reading the same name repeats the chord rather than writing over it (wave first: ${waveFirst})`, async ({ page }) => {
            await setupBoard(page);
            await page.evaluate(waveFirst => {
                const addPiano = () => shell.commands.addComponent('piano', 'Piano')
                    .setProperties({ x: 60, y: 60, width: 460, height: 130, wave: 'y', samples: 64, duration: 0.02, amplitude: '2' });
                const addWave = () => shell.commands.addComponent('mechanical-wave', 'Wave')
                    .setProperties({ x: 60, y: 260, width: 600, height: 200, samples: 24, wave: 'y', length: 20 });
                if (waveFirst) {
                    addWave();
                    addPiano();
                } else {
                    addPiano();
                    addWave();
                }
                shell.reset();
            }, waveFirst);
            const claimed = await page.evaluate(() => {
                const calculator = shell.board.calculator;
                return {
                    piano: calculator.getValueSourceName(shell.board.shapes.getByName('Piano').getValueSourceId()),
                    wave: calculator.getValueSourceName(shell.board.shapes.getByName('Wave').getValueSourceId()),
                    waveReads: shell.board.shapes.getByName('Wave').modelDefinesTerm('y')
                };
            });
            expect(claimed).toEqual({ piano: 'y', wave: '', waveReads: true });
            await page.keyboard.down('z');
            await page.keyboard.down('b');
            await runTo(page, 20);
            const rows = [2, 5, 17];
            const written = await readRows(page, rows);
            rows.forEach((iteration, position) => {
                expect(written[position]).toBeCloseTo(chordAt(iteration, [261.6255653005986, 391.99543598174927]), 6);
            });
            await page.keyboard.up('z');
            await page.keyboard.up('b');
        });
    }

    test('a name the model works out for itself is read rather than written over', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = 'y=3';
            shell.reset();
        });
        await addPiano(page, { wave: 'y' });
        await page.evaluate(() => document.activeElement?.blur());
        await page.keyboard.down('z');
        expect(await page.evaluate(() => shell.board.calculator.getValueSourceName(shell.board.shapes.getByName('Piano').getValueSourceId()))).toBe('');
        expect(await page.evaluate(() => shell.board.calculator.getByName('y', 1))).toBe(3);
        await page.keyboard.up('z');
    });

    test('taking the piano off the board takes its wave and its sound with it', async ({ page }) => {
        await setupBoard(page);
        await addPiano(page, { wave: 'y' });
        expect(await page.evaluate(() => shell.board.calculator.isTerm('y'))).toBe(true);
        await page.keyboard.down('z');
        expect(await heldNotes(page)).toEqual([60]);
        await page.evaluate(() => shell.board.removeShape(shell.board.shapes.getByName('Piano')));
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
                writes: shell.board.calculator.getValueSourceName(shape.getValueSourceId())
            };
        }, saved);
        expect(restored).toEqual({ wave: 'y', octaves: 3, keys: 37, held: 0, writes: 'y' });
    });
});
