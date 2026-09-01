const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 20000 });
}

// The rows the editor writes: a term, the case it is read in and the colour it chose, with the blank
// row it keeps at the end of the list for the next name.
function waveRows(...terms) {
    return terms.map(term => ({ term: term, case: 1, color: "" })).concat([{ term: "", case: 1, color: "" }]);
}

async function addScope(page, properties = {}, expression = '') {
    await page.evaluate(input => {
        if (input.expression !== '') {
            modellus.shape.addExpression('Eq');
            shell.board.shapes.getByName('Eq').properties.expression = input.expression;
        }
        const shape = shell.commands.addComponent('oscilloscope', 'Scope');
        shape.setProperties(Object.assign({ x: 60, y: 60, width: 460, height: 300 }, input.properties));
        shell.reset();
        shape.draw();
    }, { properties, expression });
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Scope')?.contentGroup?.children.length ?? 0)).toBeGreaterThan(0);
}

// Every node the drawing puts on the screen carries the id it was declared under, so a part is read
// by name rather than by picking lines out of the grid, the axes and the readings by colour.
function readNodes(page, sourceId) {
    return page.evaluate(sourceId => Array.from(shell.board.shapes.getByName('Scope').contentGroup.querySelectorAll(`[data-source-id="${sourceId}"]`))
        .map(node => ({ x1: Number(node.getAttribute('x1')), y1: Number(node.getAttribute('y1')), stroke: node.getAttribute('stroke'), fill: node.getAttribute('fill') })), sourceId);
}

function readPlotBox(page) {
    return page.evaluate(() => {
        const node = shell.board.shapes.getByName('Scope').contentGroup.querySelector('[data-source-id="plot"]');
        return { x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')), width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')) };
    });
}

function readTexts(page) {
    return page.evaluate(() => Array.from(shell.board.shapes.getByName('Scope').contentGroup.querySelectorAll('text')).map(node => node.textContent));
}

function hover(page, x, y) {
    return page.evaluate(point => {
        const shape = shell.board.shapes.getByName('Scope');
        shape._pointerValues = { hoverX: point.x, hoverY: point.y, hovering: 1 };
        shape.draw();
    }, { x, y });
}

test.describe('Oscilloscope object', () => {

    test('is offered in the objects palette', async ({ page }) => {
        await setupBoard(page);
        const entry = await page.evaluate(() => BlockRegistry.list('component', { agentAccessibleOnly: true })
            .filter(registration => registration.tags.includes('object'))
            .map(registration => ({ type: registration.type, displayName: registration.displayName }))
            .find(registration => registration.type === 'oscilloscope') ?? null);
        expect(entry).not.toBeNull();
        expect(entry.displayName).toBe('Oscilloscope');
    });

    test('its parameter labels name the thing, not the kind of thing', async ({ page }) => {
        await setupBoard(page);
        const labels = await page.evaluate(() => BlockRegistry.get('oscilloscope').parameters.map(parameter => parameter.label));
        expect(labels).toEqual(expect.arrayContaining(['Waves', 'Element spacing', 'Samples', 'Cursor', 'Mark']));
        expect(labels.filter(label => /variable$/i.test(label))).toEqual([]);
    });

    test('draws a wave the model defined over element indices, element by element', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y'), minimumX: 0, maximumX: 12, minimumY: -3, maximumY: 3, showLegend: false, showTicks: false },
            'y\\left[i\\right]=2\\cdot\\sin\\left(\\frac{\\pi\\cdot i}{6}\\right)');
        // Thirteen elements stand in the window, so twelve segments join them.
        const segments = await readNodes(page, 'trace');
        const plot = await readPlotBox(page);
        expect(segments).toHaveLength(12);
        for (let index = 0; index < segments.length; index++) {
            const value = 2 * Math.sin(Math.PI * (index + 1) / 6);
            expect(segments[index].x1).toBeCloseTo(plot.x + index / 12 * plot.width, 4);
            expect(segments[index].y1).toBeCloseTo(plot.y + plot.height * (1 - (value + 3) / 6), 4);
        }
    });

    // The list the reader builds always keeps a blank row at the end to type the next name into, and
    // that row is not a wave: a screen naming two waves draws two.
    test('draws one trace per named row and none for the empty one at the end', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y', 'z'), minimumX: 0, maximumX: 12 }, 'y\\left[i\\right]=i\\\\z\\left[i\\right]=2\\cdot i');
        const strokes = new Set((await readNodes(page, 'trace')).map(segment => segment.stroke));
        expect(strokes.size).toBe(2);
        expect(await readNodes(page, 'swatch')).toHaveLength(2);
        expect(await readTexts(page)).toEqual(expect.arrayContaining(['y', 'z']));
    });

    // A row that chose no colour is drawn in the one its place in the list is given, which is the
    // colour the swatch beside it in the menu shows.
    test('a row is drawn in the colour it chose, or the one its place in the list gives it', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, {
            waves: [{ term: 'y', case: 1, color: '' }, { term: 'z', case: 1, color: '#123456' }, { term: '', case: 1, color: '' }],
            minimumX: 0, maximumX: 12
        }, 'y\\left[i\\right]=i\\\\z\\left[i\\right]=2\\cdot i');
        const strokes = new Set((await readNodes(page, 'trace')).map(segment => segment.stroke));
        const palette = await page.evaluate(() => Utils.getColorByIndex(0));
        expect(strokes).toEqual(new Set([palette, '#123456']));
        expect((await readNodes(page, 'swatch')).map(swatch => swatch.stroke)).toEqual([palette, '#123456']);
    });

    test('the spacing says how far apart two elements stand, so the screen reads in model units', async ({ page }) => {
        await setupBoard(page);
        // Thirty elements over a chain twenty long stand 20/29 apart, which is how the mechanical
        // wave lays out the one it publishes.
        await addScope(page, { waves: waveRows('y'), spacing: 20 / 29, minimumX: 0, maximumX: 20, showTicks: false }, 'y\\left[i\\right]=i');
        expect(await readNodes(page, 'trace')).toHaveLength(29);
        // The fifth element stands four spacings along, and reads as the fifth.
        await hover(page, 20 / 29 * 4, 0);
        expect(await readTexts(page)).toContain('y = 5.00');
    });

    test('the cursor reads every wave where it stands, and only while the run is stopped', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y', 'z'), minimumX: 0, maximumX: 12, minimumY: -3, maximumY: 3 },
            'y\\left[i\\right]=2\\cdot\\sin\\left(\\frac{\\pi\\cdot i}{6}\\right)\\\\z\\left[i\\right]=\\frac{i}{10}');
        expect(await readTexts(page)).toEqual(expect.arrayContaining(['y', 'z']));
        const box = await page.evaluate(() => {
            const rect = document.getElementById(shell.board.shapes.getByName('Scope').id).getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
        await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.4);
        await expect.poll(() => readTexts(page)).toEqual(expect.arrayContaining([expect.stringMatching(/^y = /), expect.stringMatching(/^z = /)]));
        // One dot per wave, standing where the cursor crosses its trace.
        expect(await readNodes(page, 'reading')).toHaveLength(2);
        await page.mouse.move(box.x - 40, box.y - 40);
        await expect.poll(() => readTexts(page)).toEqual(expect.arrayContaining(['y', 'z']));
    });

    test('the mark measures the distance from itself to the cursor, and what that distance is one of', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y'), minimumX: 0, maximumX: 12, showMark: true, markX: 2 }, 'y\\left[i\\right]=i');
        await hover(page, 6, 0);
        const readings = await readTexts(page);
        expect(readings).toContain('Δ = 4.00');
        expect(readings).toContain('1/Δ = 0.25');
    });

    test('clicking the screen moves the mark to the cursor', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y'), minimumX: 0, maximumX: 12, showMark: true, markX: 0 }, 'y\\left[i\\right]=i');
        const box = await page.evaluate(() => {
            const rect = document.getElementById(shell.board.shapes.getByName('Scope').id).getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4);
        await page.mouse.down();
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => Number(shell.board.shapes.getByName('Scope').properties.markX))).toBeGreaterThan(0);
    });

    // Every wave is read across the same screen, so a window holding more elements than the screen
    // reads is stepped through, and the waves share the reading between them.
    test('a window wider than the screen reads is stepped through, and the waves share it', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y'), minimumX: 0, maximumX: 4000, samples: 50 }, 'y\\left[i\\right]=i');
        expect(await readNodes(page, 'trace')).toHaveLength(49);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Scope');
            shape.setProperties({ waves: [{ term: 'y', case: 1, color: '' }, { term: 'y', case: 1, color: '' }, { term: '', case: 1, color: '' }], samples: 300 });
            shape.draw();
        });
        // Under six hundred segments between them, so neither wave is cut short by the repeat limit,
        // and the two are read at the same resolution rather than one of them taking it all.
        const shared = await readNodes(page, 'trace');
        expect(shared).toHaveLength(598);
        const perWave = shared.reduce((counts, segment) => Object.assign(counts, { [segment.stroke]: (counts[segment.stroke] ?? 0) + 1 }), {});
        expect(Object.values(perWave)).toEqual([299, 299]);
    });

    test('draws inside the node budget with the ends the palette hands it', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y', 'y', 'y'), width: 180, height: 180 }, 'y\\left[i\\right]=i');
        const report = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Scope');
            const validation = shape.validateComponent();
            return { errors: validation.errors, warnings: validation.warnings, nodes: shape.compileComponent().stats.nodeCount };
        });
        expect(report.errors).toEqual([]);
        expect(report.warnings).toEqual([]);
        expect(report.nodes).toBeLessThan(400);
    });

    // An object waiting to be given a term has nothing to write on its key, and a key with nothing
    // on it cannot be found: it wears the faded word instead, the way the chart's own key does.
    test('the model key names the first wave and counts the rest, and reads Model while there are none', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, {}, 'y\\left[i\\right]=i\\\\z\\left[i\\right]=2\\cdot i\\\\q\\left[i\\right]=3');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Scope')));
        const key = page.locator('.shape-context-toolbar.visible .mdl-component-model-selector');
        await expect(key).toBeVisible();
        await expect(key).toHaveText('Model');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Scope');
            shape.setProperties({ waves: ['y', 'z', 'q'].map(term => ({ term: term, case: 1, color: '' })).concat([{ term: '', case: 1, color: '' }]) });
            shape.showContextToolbar();
        });
        await expect.poll(() => key.innerHTML()).toContain('+2');
        await expect.poll(() => key.innerHTML()).toContain('math-field');
        expect(await key.innerHTML()).not.toContain('mdl-missing-term');
    });

    // A list of waves is a plain list of terms: the rows name one term each, and none of them is
    // offered the second term and the angle-or-orientation choice a compass's directions carry.
    test('its rows name a term and a colour, and nothing else', async ({ page }) => {
        await setupBoard(page);
        await addScope(page, { waves: waveRows('y') }, 'y\\left[i\\right]=i');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Scope')));
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        const rows = page.locator('.mdl-shape-overlay-popup').last().locator('.component-terms-control .shape-term-row');
        await expect(rows).toHaveCount(2);
        await expect(rows.nth(0).locator('.shape-term-color')).toHaveCount(1);
        await expect(rows.nth(0).locator('.shape-term-mode .dx-button')).toHaveCount(0);
        await expect(rows.nth(0).locator('.shape-term-extra-term')).toHaveCount(0);
    });
});
