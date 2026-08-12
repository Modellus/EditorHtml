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

// "px" and "py" are left undefined by every statement, so the model holds them as parameters the
// tracker is allowed to write.
async function addModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Values'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Values').properties.expression = 'y=2\\cdot t\\\\check=px+py';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

async function addTracker(page, parameters = {}) {
    await page.evaluate(parameters => {
        const shape = shell.commands.addComponent('mouse-tracker', 'Tracker');
        shape.setProperties(Object.assign({ x: 60, y: 60, width: 340, height: 320 }, parameters));
        shell.board.markDirty(shape);
        shell.board.draw();
    }, parameters);
    await page.waitForTimeout(300);
}

function tracker(page) {
    return page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        return { samples: shape.properties.samples };
    });
}

async function plotBox(page) {
    const box = await page.locator('[data-block-id$=":capture"]').first().boundingBox();
    expect(box).not.toBeNull();
    return box;
}

async function removeMenuItems(page, shapeName) {
    await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), shapeName);
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-remove-selector').click();
    await page.waitForTimeout(300);
    const items = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-label')).map(label => label.textContent));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return items;
}

// Remove, reset and clear all live under the bin: opening it and choosing one is what a person does.
async function clearFromToolbar(page, shapeName) {
    await page.evaluate(name => shell.board.selection.select(shell.board.shapes.getByName(name)), shapeName);
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-remove-selector').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item'))
        .find(item => item.querySelector('.mdl-dropdown-list-label').textContent === 'Clear').click());
    await page.waitForTimeout(300);
}

// Drags across the plot from left to right, holding still for long enough at each stop that the
// sampling clock takes at least one sample there.
async function dragAcross(page, steps = 8) {
    const box = await plotBox(page);
    await page.mouse.move(box.x + 4, box.y + box.height - 4);
    await page.mouse.down();
    for (let step = 1; step <= steps; step++) {
        await page.mouse.move(box.x + 4 + step * (box.width - 8) / steps, box.y + box.height - 4 - step * (box.height - 8) / steps);
        await page.waitForTimeout(50);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    return box;
}

test('the tracker compiles and draws both axes', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    // A tracker starts as a plain white sheet: the ticks are asked for here so what they draw can be read.
    await addTracker(page, { showTicks: true });
    const report = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        const validation = shape.validateComponent();
        return {
            diagnostics: shape.lastCompilation.diagnostics,
            errors: validation.errors,
            valid: validation.valid,
            axes: ['axis-x', 'axis-y'].map(id => document.querySelector(`[data-source-id="${id}"]`) !== null),
            labels: Array.from(document.querySelectorAll('[data-source-id^="x-label-"]')).map(node => node.textContent),
            minorTicks: document.querySelectorAll('[data-source-id^="x-minor-tick-"]').length,
            // The axes are the board's own, not the tracker's: the drawing comes from the shared
            // component and the labels are written in the board's font.
            drawnBy: document.querySelector('[data-source-id="axis-x"]').closest('[data-source-component]').getAttribute('data-source-component'),
            labelFont: document.querySelector('[data-source-id="x-label-0"]').getAttribute('font-family'),
            boardFont: new BlockTokens('standard').get('font.family')
        };
    });
    expect(report.diagnostics).toEqual([]);
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.axes).toEqual([true, true]);
    // Round numbers, the way the chart lands its own ticks, rather than an even slice of the range.
    expect(report.labels).toEqual(['0', '2', '4', '6', '8', '10']);
    expect(report.minorTicks).toBeGreaterThan(0);
    expect(report.drawnBy).toBe('plot-axes');
    expect(report.labelFont).toBe(report.boardFont);
});

test('dragging over the plot records the pointer in the units of the axes', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await dragAcross(page);
    const recorded = await tracker(page);
    expect(recorded.samples.length).toBeGreaterThan(4);
    const first = recorded.samples[0];
    const last = recorded.samples[recorded.samples.length - 1];
    expect(BlockMemoryValue(first, 'x')).toBeLessThan(1);
    expect(BlockMemoryValue(first, 'y')).toBeLessThan(1);
    expect(BlockMemoryValue(last, 'x')).toBeGreaterThan(9);
    expect(BlockMemoryValue(last, 'y')).toBeGreaterThan(9);
    for (const sample of recorded.samples) {
        expect(BlockMemoryValue(sample, 'x')).toBeGreaterThanOrEqual(0);
        expect(BlockMemoryValue(sample, 'x')).toBeLessThanOrEqual(10);
        expect(BlockMemoryValue(sample, 'y')).toBeGreaterThanOrEqual(0);
        expect(BlockMemoryValue(sample, 'y')).toBeLessThanOrEqual(10);
    }
    const trace = await page.evaluate(() => document.querySelector('[data-source-component="memory-trace"] polyline')?.getAttribute('points') ?? '');
    expect(trace.split(' ')).toHaveLength(recorded.samples.length);
});

function BlockMemoryValue(row, field) {
    return row[field] ?? 0;
}

test('the variables it names take the recording iteration by iteration', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await dragAcross(page, 4);
    const recorded = await tracker(page);
    const model = await page.evaluate(() => {
        const calculator = shell.board.calculator;
        const shape = shell.board.shapes.getByName('Tracker');
        const perIteration = [];
        for (let iteration = 1; iteration <= calculator.getLastIteration(); iteration++) {
            calculator.setIteration(iteration);
            perIteration.push({ px: calculator.getByName('px', 1), py: calculator.getByName('py', 1) });
        }
        return {
            lastIteration: calculator.getLastIteration(),
            perIteration: perIteration,
            isTerm: calculator.isTerm('px'),
            held: calculator.getDataSourceValues(shape.getMemorySourceId('samples'), 'px')
        };
    });
    expect(model.isTerm).toBe(true);
    expect(model.lastIteration).toBe(recorded.samples.length);
    expect(model.held).toEqual(recorded.samples.map(sample => sample.x ?? 0));
    for (let index = 0; index < recorded.samples.length; index++) {
        expect(model.perIteration[index].px).toBeCloseTo(recorded.samples[index].x ?? 0, 2);
        expect(model.perIteration[index].py).toBeCloseTo(recorded.samples[index].y ?? 0, 2);
    }
});

test('a recording that names nothing stays with the object', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await dragAcross(page, 4);
    const model = await page.evaluate(() => ({
        sources: Array.from(shell.board.calculator.dataSources.keys()),
        lastIteration: shell.board.calculator.getLastIteration()
    }));
    expect(model.sources).toEqual([]);
    expect(model.lastIteration).toBe(1);
    expect((await tracker(page)).samples.length).toBeGreaterThan(3);
});

test('a whole recording is one undo step', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await dragAcross(page, 5);
    expect((await tracker(page)).samples.length).toBeGreaterThan(3);
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(150);
    expect((await tracker(page)).samples).toEqual([]);
});

async function traces(page) {
    return page.evaluate(() => Array.from(document.querySelectorAll('[data-source-component="memory-trace"] polyline'))
        .map(node => node.getAttribute('points').split(' ').length));
}

test('a second drag adds to the recording instead of replacing it, on a line of its own', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await dragAcross(page, 6);
    const first = (await tracker(page)).samples;
    expect(await traces(page)).toEqual([first.length]);
    await dragAcross(page, 3);
    const both = (await tracker(page)).samples;
    expect(both.length).toBeGreaterThan(first.length + 1);
    // The first set is left exactly as it was recorded, with a break and the second one behind it.
    expect(both.slice(0, first.length)).toEqual(first);
    expect(both[first.length]).toEqual({ gap: 1 });
    // Two lines, neither joined to the other, and the break itself draws nothing.
    const drawn = await traces(page);
    expect(drawn).toHaveLength(2);
    expect(drawn[0]).toBe(first.length);
    expect(drawn[0] + drawn[1]).toBe(both.length - 1);
    // The break is one iteration the measurements have nothing to say at.
    const model = await page.evaluate(count => {
        const calculator = shell.board.calculator;
        const read = iteration => {
            calculator.setIteration(iteration);
            return calculator.getByName('px', 1);
        };
        return { lastIteration: calculator.getLastIteration(), atBreak: read(count + 1), afterBreak: read(count + 2) };
    }, first.length);
    expect(model.lastIteration).toBe(both.length);
    expect(Number.isFinite(model.atBreak)).toBe(false);
    expect(Number.isFinite(model.afterBreak)).toBe(true);
});

// A break holds no point, so nothing on the drawing may answer with one: no marker stands on it and
// no axis is fitted around it.
test('the iteration a break falls on shows no marker, and a break is not fitted to the axes', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('samples', [{ x: 2, y: 4 }, { x: 3, y: 5 }, { gap: 1 }, { x: 6, y: 4.5 }]);
        shape.refreshModelData();
    });
    await page.waitForTimeout(200);
    // Four rows is a four-iteration run whichever of them holds a point.
    expect(await page.evaluate(() => shell.board.calculator.getLastIteration())).toBe(4);
    const markerAt = iteration => page.evaluate(iteration => {
        shell.board.calculator.setIteration(iteration);
        shell.board.shapes.getByName('Tracker').tick();
        shell.board.draw();
        return document.querySelector('[data-source-id="marker-dot"]') !== null;
    }, iteration);
    expect(await markerAt(2)).toBe(true);
    expect(await markerAt(3)).toBe(false);
    expect(await markerAt(4)).toBe(true);
    const fitted = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('autoScale', true);
        shell.board.draw();
        return { range: shape.getEffectiveAxisRange(), padded: BlockChartGeometry.padDomain(2, 6, 4, 5) };
    });
    // The same fit the three real points give, with the break making no difference to it.
    expect(fitted.range).toEqual(fitted.padded);
});

// Only a gesture that travels is a recording. A click leaves everything as it was — the recording,
// the model, and the undo stack, which must not be given a step that takes nothing back.
test('a click records nothing, whether the recording is empty or not', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    const box = await plotBox(page);
    const clickAt = async (fractionX, fractionY) => {
        await page.mouse.move(box.x + box.width * fractionX, box.y + box.height * fractionY);
        await page.mouse.down();
        // Held down for long enough that the sampling clock would have taken several samples.
        await page.waitForTimeout(200);
        await page.mouse.up();
        await page.waitForTimeout(150);
    };
    await clickAt(0.2, 0.8);
    await clickAt(0.5, 0.5);
    expect((await tracker(page)).samples).toEqual([]);
    expect(await page.evaluate(() => shell.board.calculator.getLastIteration())).toBe(1);

    // The same click over a recording leaves it alone: no point, and no break in front of one.
    await dragAcross(page, 5);
    const recorded = (await tracker(page)).samples;
    expect(recorded.length).toBeGreaterThan(3);
    await clickAt(0.5, 0.5);
    expect((await tracker(page)).samples).toEqual(recorded);
    expect(await traces(page)).toHaveLength(1);

    // Nothing happened, so undo takes back the drag rather than a step the click left behind.
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(200);
    expect((await tracker(page)).samples).toEqual([]);
});

test('the model player walks the recording and the marker follows the iteration on screen', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await dragAcross(page, 6);
    const recorded = await tracker(page);
    const markerAt = iteration => page.evaluate(iteration => {
        shell.board.calculator.setIteration(iteration);
        shell.board.shapes.getByName('Tracker').tick();
        shell.board.draw();
        const dot = document.querySelector('[data-source-id="marker-dot"]');
        return {
            x: Number(dot.getAttribute('cx')),
            readout: [document.querySelector('[data-source-id="value-x-text"]').textContent, document.querySelector('[data-source-id="value-y-text"]').textContent]
        };
    }, iteration);
    const atStart = await markerAt(1);
    const atEnd = await markerAt(recorded.samples.length);
    expect(atEnd.x).toBeGreaterThan(atStart.x);
    // The crosshair reads the sample it stands on, the way the chart's reads a point: rounded to the
    // decimals the model is read to.
    const rounded = sample => [(sample.x ?? 0).toFixed(2), (sample.y ?? 0).toFixed(2)];
    expect(atStart.readout).toEqual(rounded(recorded.samples[0]));
    expect(atEnd.readout).toEqual(rounded(recorded.samples[recorded.samples.length - 1]));
});

// Writes a recording without making the gesture, so the pointer is nowhere near the plot and the
// drawing answers the player alone.
async function writeRecording(page, rows) {
    await page.evaluate(rows => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('samples', rows);
        shape.refreshModelData();
    }, rows);
    await page.waitForTimeout(200);
}

async function tracesAt(page, iteration) {
    await page.evaluate(iteration => {
        shell.board.calculator.setIteration(iteration);
        shell.board.shapes.getByName('Tracker').tick();
        shell.board.draw();
    }, iteration);
    return traces(page);
}

// What the drawing answers the player with, on both counts: the line drawn so far and the marker,
// its lines out to the axes and the pair of values under it.
async function shownAt(page, iteration) {
    const drawn = await tracesAt(page, iteration);
    return Object.assign({ traces: drawn }, await page.evaluate(() => ({
        marker: document.querySelector('[data-source-id="marker-dot"]') !== null,
        crosshair: document.querySelector('[data-source-component="plot-crosshair"] line') !== null,
        values: document.querySelector('[data-source-id="pointer-values-text"]')?.textContent ?? null
    })));
}

test('the recording stands there whole and says nothing about the iteration', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    // A recording that is not stepped through is what a tracker starts as.
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.perStep)).toBe(false);
    await writeRecording(page, [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]);
    // Wherever the player is put — stopped at the start, pulled across, playing — the whole line is
    // there and nothing stands at the iteration it has reached.
    expect(await shownAt(page, 1)).toEqual({ traces: [4], marker: false, crosshair: false, values: null });
    expect(await shownAt(page, 3)).toEqual({ traces: [4], marker: false, crosshair: false, values: null });
    await page.evaluate(() => { shell.board.calculator.status = 0; });
    expect(await shownAt(page, 4)).toEqual({ traces: [4], marker: false, crosshair: false, values: null });
});

test('per step stands the marker, its lines and its values on the sample the iteration is', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await writeRecording(page, [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]);
    expect(await shownAt(page, 2)).toEqual({ traces: [2], marker: true, crosshair: true, values: '2.00, 2.00' });
    expect(await shownAt(page, 4)).toEqual({ traces: [4], marker: true, crosshair: true, values: '4.00, 4.00' });
});

test('per step draws the recording up to the sample the iteration stands on', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await writeRecording(page, [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { gap: 1 }, { x: 6, y: 6 }, { x: 7, y: 7 }]);
    // Before the run starts the recording is all there; from the first step it is drawn to where the
    // player stands, a point per iteration.
    expect(await tracesAt(page, 1)).toEqual([3, 2]);
    expect(await tracesAt(page, 2)).toEqual([2]);
    expect(await tracesAt(page, 3)).toEqual([3]);
    // The break is passed and the run behind it has opened but has nothing to join yet.
    expect(await tracesAt(page, 5)).toEqual([3]);
    expect(await tracesAt(page, 6)).toEqual([3, 2]);
    // Once the run is under way the first iteration is the first sample and nothing more: the
    // recording standing there whole is what waiting to be played looks like, not what playing does.
    await page.evaluate(() => { shell.board.calculator.status = 0; });
    expect(await tracesAt(page, 1)).toEqual([]);
    expect(await tracesAt(page, 3)).toEqual([3]);
    // Switched back off the whole recording is there again, wherever the player stands.
    await page.evaluate(() => shell.board.shapes.getByName('Tracker').setProperty('perStep', false));
    expect(await tracesAt(page, 2)).toEqual([3, 2]);
});

// A recording is made with the model standing at the start of its run, so what has just been drawn
// is on the screen whether or not the tracker is stepped through.
test('a gesture is drawn as it is made even when the recording is stepped through', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await dragAcross(page, 5);
    const recorded = await tracker(page);
    expect(recorded.samples.length).toBeGreaterThan(3);
    expect(await traces(page)).toEqual([recorded.samples.length]);
});

test('clearing the recording takes it out of the model too', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await dragAcross(page, 5);
    expect(await page.evaluate(() => shell.board.calculator.getLastIteration())).toBeGreaterThan(1);
    // The recording is emptied from the bin beside remove and reset, not from a key on the drawing.
    expect(await page.locator('[data-source-id="cap"]').count()).toBe(0);
    await clearFromToolbar(page, 'Tracker');
    const cleared = await page.evaluate(() => ({
        samples: shell.board.shapes.getByName('Tracker').properties.samples,
        sources: Array.from(shell.board.calculator.dataSources.keys()),
        lastIteration: shell.board.calculator.getLastIteration()
    }));
    expect(cleared.samples).toEqual([]);
    expect(cleared.sources).toEqual([]);
    expect(cleared.lastIteration).toBe(1);
    // An object with nothing to hold is not offered the choice.
    expect(await removeMenuItems(page, 'Tracker')).toEqual(['Remove', 'Reset', 'Clear']);
    await page.evaluate(() => shell.commands.addComponent('compass', 'Compass'));
    await page.waitForTimeout(300);
    expect(await removeMenuItems(page, 'Compass')).toEqual(['Remove', 'Reset']);
});

test('the marker is a dot until a character is chosen, and then it hangs from its pivot point', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { perStep: true });
    await dragAcross(page, 4);
    expect(await page.locator('[data-source-id="marker-dot"]').count()).toBe(1);
    expect(await page.locator('[data-source-id="marker-character"]').count()).toBe(0);

    const placement = await page.evaluate(() => {
        CharacterLibrary.definitions.set('walker', {
            id: 'walker',
            title: 'Walker',
            thumbnail_url: 'https://example.com/walker.png',
            centerPoint: { x: 0.5, y: 1 },
            animations: []
        });
        CharacterLibrary.aspectRatios.set('https://example.com/walker.png', 1);
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('characterKey', 'walker');
        shell.board.draw();
        const image = document.querySelector('[data-source-id="marker-character"]');
        const parameters = shape.getCompilationParameters();
        return {
            href: image.getAttribute('href'),
            x: Number(image.getAttribute('x')),
            y: Number(image.getAttribute('y')),
            width: Number(image.getAttribute('width')),
            pivotX: parameters.characterPivotX,
            pivotY: parameters.characterPivotY,
            markerX: shape.compileComponent().nodes.length
        };
    });
    expect(placement.href).toBe('https://example.com/walker.png');
    // The marker is sized from the plot it stands in rather than from a setting of its own.
    expect(placement.width).toBeGreaterThan(0);
    expect(placement.pivotY).toBe(1);
    expect(await page.locator('[data-source-id="marker-dot"]').count()).toBe(0);

    const dotPosition = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('characterKey', '');
        shell.board.draw();
        const dot = document.querySelector('[data-source-id="marker-dot"]');
        return { x: Number(dot.getAttribute('cx')), y: Number(dot.getAttribute('cy')) };
    });
    // The character hangs by the point under its feet: half its width to the left of the sample and
    // the whole of its height above it.
    expect(placement.x).toBeCloseTo(dotPosition.x - placement.width / 2, 3);
    expect(placement.y).toBeCloseTo(dotPosition.y - placement.width, 3);
});

test('the recording survives a save and comes back with the model', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await dragAcross(page, 5);
    const recorded = await tracker(page);
    const reloaded = await page.evaluate(async () => {
        const model = JSON.stringify(shell.serialize());
        shell.openModel(model);
        await new Promise(resolve => setTimeout(resolve, 600));
        const shape = shell.board.shapes.getByName('Tracker');
        return {
            samples: shape.properties.samples,
            points: document.querySelector('[data-source-component="memory-trace"] polyline')?.getAttribute('points') ?? '',
            lastIteration: shell.board.calculator.getLastIteration(),
            px: shell.board.calculator.getByName('px', 1)
        };
    });
    expect(reloaded.samples).toEqual(recorded.samples);
    expect(reloaded.points.split(' ')).toHaveLength(recorded.samples.length);
    // The model is running on the recording again, without anyone having reloaded it by hand.
    expect(reloaded.lastIteration).toBe(recorded.samples.length);
    expect(reloaded.px).toBeCloseTo(recorded.samples[0].x ?? 0, 2);
});

test('the settings menu offers the character picker and keeps what is chosen', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await page.evaluate(() => {
        const apiClient = shell.board.shell.modelsApiClient;
        apiClient.fetchCharacters = () => Promise.resolve([{ id: 'walker', title: 'Walker', category_id: 'people', thumbnail_url: 'https://example.com/walker.png' }]);
        apiClient.fetchCharacterCategories = () => Promise.resolve([{ id: 'people', name: 'People' }]);
        shell.board.selection.select(shell.board.shapes.getByName('Tracker'));
    });
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-label')).map(label => label.textContent));
    expect(rows).toContain('Marker character');
    await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')).find(item => item.querySelector('.mdl-dropdown-list-label').textContent === 'Marker character');
        row.querySelector('.dx-button').click();
    });
    await page.waitForTimeout(500);
    await page.click('[data-character-id="walker"]');
    await page.click('.mdl-character-picker-popup .dx-popup-bottom .dx-button');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.characterKey)).toBe('walker');
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.characterKey)).toBe('');
});

test('the settings menu edits both ends of an axis on one row, the way the chart does', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Tracker')));
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-label')).map(label => label.textContent));
    expect(rows.slice(0, 4)).toEqual(['Auto Scale', 'Equal Scales', 'Horizontal', 'Vertical']);
    // The four ends are edited on those two rows, so none of them is offered again on its own.
    expect(rows).not.toContain('Minimum X');
    expect(rows).not.toContain('Maximum Y');
    // Nothing that was taken off the toolbar is still on it.
    for (const gone of ['Sampling interval', 'Show crosshair', 'Show trace', 'Show readout', 'Decimals', 'Marker size', 'Copy definition', 'Show samples', 'Samples kept'])
        expect(rows, gone).not.toContain(gone);
    // The two the plain sheet is drawn without are switched back on from here, and so is the one that
    // hands the recording over to the player.
    expect(rows).toEqual(expect.arrayContaining(['Show grid', 'Show ticks', 'Per step']));
    await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')).find(item => item.querySelector('.mdl-dropdown-list-label').textContent === 'Horizontal');
        const box = DevExpress.ui.dxNumberBox.getInstance(row.querySelectorAll('.dx-numberbox')[1]);
        box.option('value', 20);
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.maximumX)).toBe(20);
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.maximumX)).toBe(10);
});

test('while the model stands still the crosshair and the marker follow the pointer', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    const box = await plotBox(page);
    const readAt = async (fractionX, fractionY) => {
        await page.mouse.move(box.x + box.width * fractionX, box.y + box.height * fractionY);
        await page.waitForTimeout(200);
        return page.evaluate(() => ({
            values: (document.querySelector('[data-source-id="pointer-values-text"]')?.textContent ?? '').split(', '),
            dot: Number(document.querySelector('[data-source-id="marker-dot"]')?.getAttribute('cx') ?? NaN)
        }));
    };
    // Nothing has been recorded, and the object still answers where the pointer is.
    const left = await readAt(0.25, 0.5);
    const right = await readAt(0.75, 0.5);
    expect(Number(left.values[0])).toBeCloseTo(2.5, 0);
    expect(Number(right.values[0])).toBeCloseTo(7.5, 0);
    expect(right.dot).toBeGreaterThan(left.dot);
    // Where the pointer is, is not something the object keeps: nothing is written and nothing is dirty.
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.hovering)).toBe(0);
    await page.mouse.move(box.x - 40, box.y - 40);
    await page.waitForTimeout(200);
    expect(await page.locator('[data-source-id="marker-dot"]').count()).toBe(0);
});

test('while the model plays the pointer has no say and the iteration does', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py', perStep: true });
    await dragAcross(page, 5);
    const recorded = await tracker(page);
    const box = await plotBox(page);
    await page.evaluate(() => {
        shell.board.calculator.setIteration(1);
        shell.board.calculator.status = 0;
    });
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.1);
    await page.waitForTimeout(200);
    const shown = await page.evaluate(() => document.querySelector('[data-source-id="pointer-values-text"]').textContent.split(', ')[0]);
    expect(Number(shown)).toBeCloseTo(recorded.samples[0].x ?? 0, 1);
});

test('the colour menu offers what the chart offers, under the same names, and the tracker\'s own after them', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await page.evaluate(() => {
        shell.commands.addShape('ChartShape', 'Chart');
        shell.board.selection.select(shell.board.shapes.getByName('Chart'));
    });
    await page.waitForTimeout(400);
    const readColorRows = async () => {
        await page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector').click();
        await page.waitForTimeout(400);
        const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-label')).map(label => label.textContent));
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        return rows;
    };
    const chartRows = await readColorRows();
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Tracker')));
    await page.waitForTimeout(300);
    const trackerRows = await readColorRows();
    // Everything the chart colours, the tracker colours under the same name and in the same order,
    // and what the tracker has of its own is offered after them rather than among them.
    const own = ['Value'];
    expect(chartRows).toEqual(expect.arrayContaining(['Background', 'Data Area', 'Axis']));
    expect(trackerRows.filter(row => !own.includes(row))).toEqual(chartRows);
    expect(trackerRows.slice(trackerRows.indexOf('Axis') + 1, trackerRows.indexOf('Axis') + 1 + own.length)).toEqual(own);
    // A variable's colour is chosen beside the variable, so it is not offered here as well.
    expect(trackerRows).not.toContain('Horizontal');
    expect(trackerRows).not.toContain('Vertical');
    // The colour reaches the drawing: the plot is painted with what "Data Area" holds.
    await page.evaluate(() => shell.board.shapes.getByName('Tracker').setProperty('dataAreaColor', '#ffe08a'));
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.querySelector('[data-source-id="plot"]').getAttribute('fill'))).toBe('#ffe08a');
});

// Every colour the toolbar offers has to be the colour the object is drawn in before anyone has
// touched one, or the swatches are telling a story the drawing does not.
test('what each colour row holds is what the tracker is drawn in, untouched', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { showTicks: true });
    await page.evaluate(() => shell.board.shapes.getByName('Tracker')
        .setProperty('samples', Array.from({ length: 11 }, (value, index) => ({ x: index, y: index }))));
    await page.waitForTimeout(200);
    const box = await plotBox(page);
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
    await page.waitForTimeout(250);
    const rows = await page.evaluate(() => {
        const attribute = (id, name) => document.querySelector(`[data-source-id="${id}"]`)?.getAttribute(name) ?? null;
        const properties = shell.board.shapes.getByName('Tracker').properties;
        return {
            // The shape's own two, which the tracker used to draw from tokens and never read.
            foreground: [properties.foregroundColor, attribute('x-label-1', 'fill')],
            border: [properties.borderColor, attribute('body', 'stroke'), attribute('plot', 'stroke')],
            background: [properties.backgroundColor, attribute('body', 'fill')],
            dataArea: [properties.dataAreaColor, attribute('plot', 'fill')],
            axis: [properties.axisColor, attribute('axis-x', 'stroke'), attribute('x-tick-1', 'stroke')],
            value: [properties.valueColor, attribute('marker-dot', 'fill'), attribute('pointer-values-plate', 'fill')],
            horizontal: [properties.xValueColor, attribute('vertical', 'stroke'), attribute('value-x-plate', 'fill')],
            vertical: [properties.yValueColor, attribute('horizontal', 'stroke'), attribute('value-y-plate', 'fill')]
        };
    });
    for (const [row, values] of Object.entries(rows)) {
        expect(values[0], row).toMatch(/^#[0-9a-f]{6}$/i);
        expect(values, row).toEqual(values.map(() => values[0]));
    }
    // The two the object never read are read now: what the row is set to is what is drawn.
    const repainted = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('foregroundColor', '#1c7c54');
        shape.setProperty('borderColor', '#8a3ffc');
        shell.board.draw();
        const attribute = (id, name) => document.querySelector(`[data-source-id="${id}"]`)?.getAttribute(name) ?? null;
        return { label: attribute('x-label-1', 'fill'), body: attribute('body', 'stroke'), plot: attribute('plot', 'stroke') };
    });
    expect(repainted).toEqual({ label: '#1c7c54', body: '#8a3ffc', plot: '#8a3ffc' });
});

// The two variables the tracker names are answered in colours of their own, and so is the sample it
// is standing on — the one that was fixed red.
test('each variable and the value at the point are painted in the colour they are given', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await page.evaluate(() => shell.board.shapes.getByName('Tracker')
        .setProperty('samples', Array.from({ length: 11 }, (value, index) => ({ x: index, y: index }))));
    await page.waitForTimeout(200);
    const box = await plotBox(page);
    const readAt = async () => {
        await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4);
        await page.waitForTimeout(250);
        return page.evaluate(() => {
            const attribute = (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? null;
            return {
                verticalLine: attribute('[data-source-id="vertical"]', 'stroke'),
                horizontalLine: attribute('[data-source-id="horizontal"]', 'stroke'),
                xBadge: attribute('[data-source-id="value-x-plate"]', 'fill'),
                yBadge: attribute('[data-source-id="value-y-plate"]', 'fill'),
                marker: attribute('[data-source-id="marker-dot"]', 'fill'),
                valueBadge: attribute('[data-source-id="pointer-values-plate"]', 'fill'),
                warning: new BlockTokens('standard').get('stroke.warning')
            };
        });
    };
    // Out of the box the sample it stands on is the red it has always been drawn in.
    const before = await readAt();
    expect(before.marker).toBe(before.warning);
    expect(before.valueBadge).toBe(before.marker);
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('xValueColor', '#1c7c54');
        shape.setProperty('yValueColor', '#8a3ffc');
        shape.setProperty('valueColor', '#0f62fe');
        shell.board.draw();
    });
    const painted = await readAt();
    // The line standing at a value and the badge reading it belong to the same variable.
    expect(painted.verticalLine).toBe('#1c7c54');
    expect(painted.xBadge).toBe('#1c7c54');
    expect(painted.horizontalLine).toBe('#8a3ffc');
    expect(painted.yBadge).toBe('#8a3ffc');
    expect(painted.marker).toBe('#0f62fe');
    expect(painted.valueBadge).toBe('#0f62fe');
});

// A variable's colour belongs to the variable, so it is picked where the variable is picked — the
// same row, the way the calculator's term keys carry theirs.
test('each variable carries its colour on its own row in the model menu', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Tracker')));
    await page.waitForTimeout(300);
    await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
    await page.waitForTimeout(400);
    const rows = await page.evaluate(() => Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .mdl-dropdown-list-item')).map(row => {
        const swatch = row.querySelector('.mdl-dropdown-list-control .shape-term-color .mdl-color-picker-button-icon');
        return {
            text: row.querySelector('.mdl-dropdown-list-label').textContent,
            hasColorSwatch: swatch !== null,
            swatch: swatch ? Utils.toHexColor(getComputedStyle(swatch).color) : null
        };
    }));
    // The colours are not rows of their own here either: they ride on the two variables, on rows
    // named for the axis rather than for the word variable.
    expect(rows.map(row => row.text)).toEqual(['Horizontal', 'Vertical']);
    expect(rows.map(row => row.hasColorSwatch)).toEqual([true, true]);
    // The swatch reads the colour the values are drawn in, not a fallback of the picker's own.
    expect(rows.map(row => row.swatch)).toEqual([
        await page.evaluate(() => document.querySelector('[data-source-id="axis-x"]').getAttribute('stroke')),
        await page.evaluate(() => document.querySelector('[data-source-id="axis-x"]').getAttribute('stroke'))
    ]);
    // What the swatch writes is a property edit like any other, so undo takes it back.
    const chosen = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        const before = shape.properties.xValueColor;
        shape.setPropertyCommand('xValueColor', '#1c7c54');
        return { before: before, after: shape.properties.xValueColor };
    });
    expect(chosen.after).toBe('#1c7c54');
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.xValueColor)).toBe(chosen.before);
});

// A tracker saved before a parameter existed carries no value for it. The drawing falls back to the
// parameter's own default and looks right; a control reading the property would read nothing and
// show a fallback of its own, which is how a swatch ends up black beside a grey drawing.
test('a tracker saved without a parameter is given the value its drawing already uses', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    const reopened = await page.evaluate(async () => {
        const model = JSON.parse(JSON.stringify(shell.serialize()));
        // The model as it would have been saved before these were parameters at all.
        const stripped = ['xValueColor', 'yValueColor', 'valueColor', 'foregroundColor', 'borderColor'];
        const walk = node => {
            if (Array.isArray(node))
                return node.forEach(walk);
            if (!node || typeof node !== 'object')
                return;
            if (node.definition && node.definition.type === 'mouse-tracker') {
                for (const name of stripped) {
                    delete node[name];
                    delete node.definition.root?.parameters?.[name];
                }
                node.definition.parameters = (node.definition.parameters ?? []).filter(parameter => !stripped.includes(parameter.id));
            }
            Object.values(node).forEach(walk);
        };
        walk(model);
        shell.openModel(JSON.stringify(model));
        await new Promise(resolve => setTimeout(resolve, 600));
        const shape = shell.board.shapes.getByName('Tracker');
        const attribute = (id, name) => document.querySelector(`[data-source-id="${id}"]`)?.getAttribute(name) ?? null;
        return {
            properties: Object.fromEntries(stripped.map(name => [name, shape.properties[name]])),
            body: attribute('body', 'stroke'),
            marker: attribute('marker-dot', 'fill')
        };
    });
    // Every one of them is filled in, and with the value the drawing was already using.
    for (const [name, value] of Object.entries(reopened.properties))
        expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    expect(reopened.properties.borderColor).toBe(reopened.body);
    expect(reopened.properties.xValueColor).toBe(reopened.properties.yValueColor);
});

test('the crosshair answers the pointer with the point recorded at its horizontal value', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    // A run whose height is easy to name at any x: y = x, sampled every half unit.
    await page.evaluate(() => shell.board.shapes.getByName('Tracker')
        .setProperty('samples', Array.from({ length: 21 }, (value, index) => ({ x: index * 0.5, y: index * 0.5 }))));
    await page.waitForTimeout(200);
    const box = await plotBox(page);
    // A quarter across and near the top: the pointer is nowhere near the run, which is the point.
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.15);
    await page.waitForTimeout(250);
    const crosshair = await page.evaluate(() => {
        const text = id => document.querySelector(`[data-source-id="${id}-text"]`)?.textContent ?? null;
        const point = document.querySelector('[data-source-id="point"]');
        const plot = document.querySelector('[data-source-id="plot"]');
        const box = { left: Number(plot.getAttribute('x')), top: Number(plot.getAttribute('y')), width: Number(plot.getAttribute('width')), height: Number(plot.getAttribute('height')) };
        const line = id => document.querySelector(`[data-source-id="${id}"]`);
        return {
            pointer: text('pointer-values'),
            axisValue: text('value-x'),
            heightValue: text('value-y'),
            pointX: Number(point.getAttribute('cx')),
            pointY: Number(point.getAttribute('cy')),
            pointerY: box.top + box.height * 0.15,
            // Both lines cross the whole plot, the way the chart's do.
            vertical: [Number(line('vertical').getAttribute('y1')), Number(line('vertical').getAttribute('y2'))],
            horizontalSpan: Number(line('horizontal').getAttribute('x2')) - Number(line('horizontal').getAttribute('x1')),
            plot: box
        };
    });
    // The pointer's own place, read under it as a pair.
    expect(crosshair.pointer).toBe('2.50, 8.50');
    // The run at that same horizontal value — 2.5 across, and 2.5 up, nowhere near the pointer's 8.5.
    expect(crosshair.axisValue).toBe('2.50');
    expect(crosshair.heightValue).toBe('2.50');
    expect(crosshair.pointX).toBeCloseTo(crosshair.plot.left + crosshair.plot.width * 0.25, 0);
    expect(crosshair.pointY).toBeGreaterThan(crosshair.pointerY);
    expect(crosshair.vertical).toEqual([crosshair.plot.top, crosshair.plot.top + crosshair.plot.height]);
    expect(crosshair.horizontalSpan).toBeCloseTo(crosshair.plot.width, 6);
});

test('auto scale fits both axes to the recording, the way the chart fits its data', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    await page.evaluate(() => shell.board.shapes.getByName('Tracker').setProperty('samples', [{ x: 2, y: 4 }, { x: 3, y: 5 }, { x: 6, y: 4.5 }]));
    await page.waitForTimeout(200);
    const report = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        const read = () => ({
            range: shape.getEffectiveAxisRange(),
            handles: document.querySelectorAll('[data-source-id^="x-tick-handle-"]').length
        });
        const before = read();
        shape.setProperty('autoScale', true);
        shell.board.draw();
        return { before: before, after: read(), padded: BlockChartGeometry.padDomain(2, 6, 4, 5) };
    });
    expect(report.before.range).toEqual({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 });
    // The same margins the chart pads its own data with, from the same function.
    expect(report.after.range).toEqual(report.padded);
    // An axis the object is working out for itself is not one to drag.
    expect(report.before.handles).toBeGreaterThan(0);
    expect(report.after.handles).toBe(0);
    // What it works out is not written down: the ends it was set to are still its own.
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.maximumX)).toBe(10);
});

test('equal axis makes one unit across measure the same as one unit up', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { width: 340, height: 260 });
    const report = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('equalScales', true);
        shell.board.draw();
        shell.board.draw();
        const plot = shape.getPlotBox();
        const range = shape.getEffectiveAxisRange();
        return {
            acrossPerUnit: plot.width / (range.xMax - range.xMin),
            upPerUnit: plot.height / (range.yMax - range.yMin),
            equalized: BlockChartGeometry.equalizeDomain({ xMin: 0, xMax: 10, yMin: 0, yMax: 10 }, plot.width, plot.height),
            range: range,
            yHandles: document.querySelectorAll('[data-source-id^="y-tick-handle-"]').length
        };
    });
    expect(report.acrossPerUnit).toBeCloseTo(report.upPerUnit, 6);
    // The chart's own equalization, on the box the object plots in.
    expect(report.range).toEqual(report.equalized);
    // The vertical ends follow from the horizontal ones, so they are not dragged either.
    expect(report.yHandles).toBe(0);
});

test('the axis, its ticks and the grid are drawn in the colours the chart draws its own', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { showGrid: true, showTicks: true });
    const drawn = await page.evaluate(() => {
        const attribute = (selector, name) => document.querySelector(selector)?.getAttribute(name) ?? null;
        return {
            axis: attribute('[data-source-id="axis-x"]', 'stroke'),
            majorTick: attribute('[data-source-id="x-tick-1"]', 'stroke'),
            minorTick: attribute('[data-source-id="x-minor-tick-0"]', 'stroke'),
            label: attribute('[data-source-id="x-label-1"]', 'fill'),
            majorGrid: attribute('[data-source-id="x-1"]', 'stroke'),
            minorGrid: attribute('[data-source-id="x-minor-1"]', 'stroke'),
            // What the chart itself would use, straight from its control's defaults.
            chart: new ChartControl(document.createElement('div'), {}).options
        };
    });
    expect(drawn.axis).toBe(drawn.chart.axisColor);
    expect(drawn.majorTick).toBe(drawn.chart.axisColor);
    expect(drawn.minorTick).toBe(drawn.chart.axisColor);
    expect(drawn.label).toBe(drawn.chart.foregroundColor);
    expect(drawn.majorGrid).toBe(drawn.chart.gridColor);
    expect(drawn.minorGrid).toBe(drawn.chart.gridColor);
});

// A sheet to draw a gesture on: no rules, no marks, and the same white under the plot as around it.
test('a tracker is a plain white sheet until the grid and the ticks are asked for', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    const plain = await page.evaluate(() => ({
        grid: document.querySelectorAll('[data-source-component="plot-grid"] line').length,
        majorTicks: document.querySelectorAll('[data-source-id^="x-tick-"]:not([data-source-id^="x-tick-handle-"])').length,
        minorTicks: document.querySelectorAll('[data-source-id^="x-minor-tick-"]').length,
        labels: document.querySelectorAll('[data-source-id^="x-label-"]').length,
        axes: ['axis-x', 'axis-y'].map(id => document.querySelector(`[data-source-id="${id}"]`) !== null),
        body: document.querySelector('[data-source-id="body"]').getAttribute('fill'),
        plot: document.querySelector('[data-source-id="plot"]').getAttribute('fill')
    }));
    expect(plain.grid).toBe(0);
    expect(plain.majorTicks).toBe(0);
    expect(plain.minorTicks).toBe(0);
    expect(plain.labels).toBe(0);
    // The axes themselves stay: the plot is bounded even when nothing is marked along it.
    expect(plain.axes).toEqual([true, true]);
    expect(plain.body).toBe('#ffffff');
    expect(plain.plot).toBe('#ffffff');

    const asked = await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Tracker');
        shape.setProperty('showGrid', true);
        shape.setProperty('showTicks', true);
        shell.board.draw();
        return {
            grid: document.querySelectorAll('[data-source-component="plot-grid"] line').length,
            minorTicks: document.querySelectorAll('[data-source-id^="x-minor-tick-"]').length,
            labels: Array.from(document.querySelectorAll('[data-source-id^="x-label-"]')).map(node => node.textContent)
        };
    });
    expect(asked.grid).toBeGreaterThan(0);
    expect(asked.minorTicks).toBeGreaterThan(0);
    expect(asked.labels).toEqual(['0', '2', '4', '6', '8', '10']);
});

test('an axis is rescaled by dragging one of its own ticks', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page);
    const handle = await page.locator('[data-block-id$=":x-tick-handle-2"]').first().boundingBox();
    expect(handle).not.toBeNull();
    // The tick reading 5 is pulled to where 7.5 stood, so the axis it belongs to stretches with it.
    const target = await page.locator('[data-block-id$=":x-tick-handle-3"]').first().boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const stretched = await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties);
    expect(stretched.minimumX).toBe(0);
    expect(stretched.maximumX).toBeCloseTo(20 / 3, 1);
    // One drag is one undo step, like every other property edit.
    await page.evaluate(() => shell.board.invoker.undo());
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => shell.board.shapes.getByName('Tracker').properties.maximumX)).toBe(10);
});

test('a recording and a data table feed the model side by side', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await page.evaluate(() => modellus.shape.addDataTable('Measurements'));
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const table = shell.board.shapes.getByName('Measurements');
        table.properties.externalData = { names: ['p'], values: [[10], [20], [30]] };
        shell.reset();
    });
    await page.waitForTimeout(400);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    await dragAcross(page, 5);
    const recorded = await tracker(page);
    const model = await page.evaluate(() => {
        const calculator = shell.board.calculator;
        calculator.setIteration(2);
        return {
            sources: Array.from(calculator.dataSources.keys()).length,
            p: calculator.getByName('p', 1),
            px: calculator.getByName('px', 1),
            lastIteration: calculator.getLastIteration()
        };
    });
    // The table is three rows long and the recording longer: the model runs to the longer of them,
    // and neither set of measurements has taken the other's place.
    expect(model.sources).toBe(2);
    expect(model.p).toBe(20);
    expect(model.px).toBeCloseTo(recorded.samples[1].x ?? 0, 2);
    expect(model.lastIteration).toBe(recorded.samples.length);
});

test('what a drawing works out for itself never becomes a model variable', async ({ page }) => {
    await setupBoard(page);
    await addModel(page);
    await addTracker(page, { xVariable: 'px', yVariable: 'py' });
    const termNames = await page.evaluate(() => shell.board.calculator.getTermsNames());
    expect(termNames).toEqual(expect.arrayContaining(['px', 'py']));
    // "plotX", "gap" and "sampleCount" are the tracker's own locals; the model must never hear of
    // them, or every variable picker on the board would offer them.
    for (const local of ['plotX', 'plotW', 'gap', 'pad', 'sampleCount', 'markerX', 'head'])
        expect(termNames, local).not.toContain(local);
});
