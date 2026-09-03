const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

// Everything a term is read with — the term itself, the pair it may name, its unit, case and colour,
// whether it is shown — is written inside the chip that names it, so the chip is opened first. A menu
// may carry chips above a list of them, so the scope says which set the index counts within.
async function openTermChip(page, index = 0, scope = '.mdl-shape-overlay-popup') {
    await page.evaluate(([index, scope]) => $([...document.querySelectorAll(`${scope} .shape-term-term`)][index]).dxDropDownBox('instance').open(), [index, scope]);
    await expect(page.locator('.mdl-term-editor-rows:visible')).toHaveCount(1);
}

async function closeTermChip(page, index = 0, scope = '.mdl-shape-overlay-popup') {
    await page.evaluate(([index, scope]) => $([...document.querySelectorAll(`${scope} .shape-term-term`)][index]).dxDropDownBox('instance').close(), [index, scope]);
    await expect(page.locator('.mdl-term-editor-rows:visible')).toHaveCount(0);
}

function termChipPanel(page) {
    return page.locator('.mdl-term-chip-popup .mdl-term-editor-rows');
}

async function readTermChipRows(page, index, scope = '.mdl-shape-overlay-popup') {
    await openTermChip(page, index, scope);
    const labels = await page.evaluate(() => Array.from([...document.querySelectorAll('.mdl-term-editor-rows')]
        .find(rows => rows.offsetParent !== null).querySelectorAll('.mdl-term-editor-row-label')).map(label => label.textContent));
    await closeTermChip(page, index, scope);
    return labels;
}


async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addClockEquations(page, expression = 'hour=3\\\\minute=30\\\\second=15\\\\milli=250') {
    await page.evaluate(() => modellus.shape.addExpression('Clock equations'));
    await page.waitForTimeout(300);
    await page.evaluate(expression => {
        shell.board.shapes.getByName('Clock equations').properties.expression = expression;
        shell.reset();
    }, expression);
    await page.waitForTimeout(400);
}

async function addClock(page) {
    await page.evaluate(() => {
        const shape = shell.commands.addComponent('clock', 'Clock');
        shape.setProperties({ x: 240, y: 160, width: 200, height: 200, hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', millisecondVariable: 'milli' });
        shape.draw();
    });
    await page.waitForTimeout(300);
}

async function readClockHands(page) {
    return page.evaluate(() => shell.board.shapes.getByName('Clock').getInspectionReport().nodes
        .filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate('))
        .map(node => node.transform));
}

// The digital clock spells its reading in lamps rather than letters, so the test reads it back the
// way a person does: which bars of each character are lit, and which character that is. A lit bar
// carries no opacity of its own; an unlit one is the faint copy left standing behind it.
const SEGMENT_CHARACTERS = {
    'abcdef': '0', 'bc': '1', 'abdeg': '2', 'abcdg': '3', 'bcfg': '4', 'acdfg': '5',
    'acdefg': '6', 'abc': '7', 'abcdefg': '8', 'abcdfg': '9', 'g': '-', 'lowerupper': ':', 'point': '.', '': ' '
};

async function readClockDigits(page) {
    const cells = await page.evaluate(() => {
        const element = document.getElementById(shell.board.shapes.getByName('Clock').id);
        const lit = {};
        for (const node of element.querySelectorAll('polygon[data-block-id*=":character-"]')) {
            const parts = node.getAttribute('data-block-id').split(':').pop().split('-');
            lit[parts[1]] ??= [];
            if (node.getAttribute('opacity') === null)
                lit[parts[1]].push(parts[2]);
        }
        return Object.keys(lit).sort((first, second) => Number(first) - Number(second)).map(index => lit[index].sort().join(''));
    });
    return cells.map(segments => SEGMENT_CHARACTERS[segments] ?? '?').join('');
}

// A clock the reader can run needs four terms the model leaves alone, so they are declared as rates
// of nothing: the model holds them and the keys write them.
async function addRunnableClockEquations(page) {
    await addClockEquations(page, '\\frac{dhour}{dt}=0\\\\\\frac{dminute}{dt}=0\\\\\\frac{dsecond}{dt}=0\\\\\\frac{dmilli}{dt}=0');
}

async function addRunnableClock(page) {
    await page.evaluate(() => {
        const shape = shell.commands.addComponent('clock', 'Clock');
        shape.setProperties({ x: 240, y: 140, width: 240, height: 280, showControls: true, millisecondColor: '#1871c2', hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', millisecondVariable: 'milli' });
        shape.draw();
    });
    await page.waitForTimeout(300);
}

async function pressClockKey(page, key) {
    const point = await page.evaluate(key => {
        const node = document.getElementById(shell.board.shapes.getByName('Clock').id).querySelector(`[data-block-id*=":${key}-press"]`);
        const box = node.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }, key);
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(200);
}

async function readClockTerms(page) {
    return page.evaluate(() => ({
        second: shell.board.calculator.getByName('second', 1),
        milli: shell.board.calculator.getByName('milli', 1)
    }));
}

async function addEditableClockEquations(page) {
    await addClockEquations(page, 'hour=3\\\\\\frac{dminute}{dt}=0\\\\second=0');
    await page.evaluate(() => {
        shell.board.calculator.setTermValue('minute', 30, 1, 1);
        shell.board.calculator.calculate();
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(300);
}

function readRotation(transform) {
    return Number(String(transform).match(/rotate\(([-0-9.]+)/)[1]);
}

test.describe('clock component', () => {
    test('renders on the board without a clock specific shape class', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const rendered = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const element = document.getElementById(shape.id);
            return {
                shapeClass: shape.constructor.name,
                componentType: shape.getComponentType(),
                circles: element.querySelectorAll('circle').length,
                ticks: element.querySelectorAll('line').length,
                numbers: Array.from(element.querySelectorAll('text')).map(node => node.textContent),
                hands: element.querySelectorAll('polygon').length,
                registeredTypes: Object.keys(shell.board.shapes.shapeRegistry).filter(type => type.toLowerCase().includes('clock'))
            };
        });
        expect(rendered.shapeClass).toBe('ComponentShape');
        expect(rendered.componentType).toBe('clock');
        expect(rendered.registeredTypes).toEqual([]);
        expect(rendered.circles).toBeGreaterThanOrEqual(2);
        expect(rendered.ticks).toBeGreaterThan(60);
        expect(rendered.numbers).toEqual(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
        expect(rendered.hands).toBeGreaterThanOrEqual(2);
    });

    test('the settings menu offers the component options and no visual preset', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(300);
        const settingsButton = page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector');
        await expect(settingsButton).toHaveCount(1);
        await settingsButton.click();
        await page.waitForTimeout(300);
        const labels = await page.$$eval('.mdl-shape-overlay-popup .mdl-dropdown-list-label',
            elements => elements.map(element => element.textContent.trim()));
        expect(labels).toEqual(['Buttons']);
        // A hand is dragged whenever its term can be written, so nothing here switches that on.
        expect(labels.join('|')).not.toContain('dragged');
        // A part is left out by being unpainted, so nothing here switches a hand or a value on.
        expect(labels.join('|')).not.toContain('Show seconds');
        expect(labels.join('|')).not.toContain('Show milliseconds');
        expect(labels.join('|')).not.toContain('Show numbers');
        expect(labels.join('|').toLowerCase()).not.toContain('preset');
    });

    test('shows switches rather than check boxes for the boolean options', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Clock')));
        await page.waitForTimeout(300);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(400);
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        const counts = await page.evaluate(() => {
            const popups = document.querySelectorAll('.mdl-shape-overlay-popup');
            const last = popups[popups.length - 1];
            return { switches: last.querySelectorAll('.dx-switch').length, checkboxes: last.querySelectorAll('.dx-checkbox').length };
        });
        expect(counts.checkboxes).toBe(0);
        expect(counts.switches).toBe(1);

        await popup.locator('.dx-switch').last().click();
        await page.waitForTimeout(400);
        const toggled = await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.showControls);
        expect(toggled).toBe(true);

        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(400);
        const undone = await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.showControls);
        expect(undone).toBe(false);
    });

    // Clearing the colour a part is read in takes that part off the clock: no switch says so, and
    // giving it a colour again brings it back.
    test('a part is left off the clock by clearing the colour it is read in', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const readClock = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const element = document.getElementById(shape.id);
            return {
                hands: shape.getInspectionReport().nodes.filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate(')).length,
                numbers: element.querySelectorAll('text').length
            };
        });
        // Seconds are painted and the thousandths are not, so a clock straight from the palette
        // reads three hands.
        expect(await readClock()).toEqual({ hands: 3, numbers: 12 });

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect((await readClock()).hands).toBe(4);

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ secondColor: 'transparent', millisecondColor: '#00000000', numberColor: 'transparent' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClock()).toEqual({ hands: 2, numbers: 0 });
    });

    test('is placed from the components palette by drawing on the board', async ({ page }) => {
        await setupBoard(page);
        await page.click('#components-button');
        await page.waitForTimeout(300);
        await page.click('.mdl-object-picker-card[data-object-key="clock"]');
        await page.waitForTimeout(200);
        const armed = await page.evaluate(() => shell.shapeDrawController.isArmed());
        expect(armed).toBe(true);
        const canvas = await page.evaluate(() => {
            const matrix = shell.board.svg.getScreenCTM();
            const start = new DOMPoint(320, 220).matrixTransform(matrix);
            const end = new DOMPoint(480, 380).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, end: { x: end.x, y: end.y } };
        });
        await page.mouse.move(canvas.start.x, canvas.start.y);
        await page.mouse.down();
        await page.mouse.move(canvas.end.x, canvas.end.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        const placed = await page.evaluate(() => {
            const shape = shell.board.shapes.shapes.find(entry => entry.constructor.name === 'ComponentShape');
            return {
                name: shape.properties.name,
                componentType: shape.getComponentType(),
                width: Math.round(shape.properties.width),
                height: Math.round(shape.properties.height),
                circles: document.getElementById(shape.id).querySelectorAll('circle').length,
                selected: shell.board.selection.selectedShape === shape
            };
        });
        expect(placed.name).toBe('Clock');
        expect(placed.componentType).toBe('clock');
        expect(placed.width).toBe(160);
        expect(placed.height).toBe(160);
        expect(placed.circles).toBeGreaterThanOrEqual(2);
        expect(placed.selected).toBe(true);
    });

    test('hand angles follow the bound model variables', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const before = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const report = shape.getInspectionReport();
            return report.nodes.filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate(')).map(node => node.transform);
        });
        expect(readRotation(before[0])).toBeCloseTo(105, 3);
        expect(readRotation(before[1])).toBeCloseTo(180, 3);
        expect(readRotation(before[2])).toBeCloseTo(91.5, 3);

        await page.evaluate(() => {
            shell.board.shapes.getByName('Clock equations').properties.expression = 'hour=9\\\\minute=15\\\\second=45';
            shell.reset();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            return shape.getInspectionReport().nodes.filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate(')).map(node => node.transform);
        });
        expect(readRotation(after[0])).toBeCloseTo(277.5, 3);
        expect(readRotation(after[1])).toBeCloseTo(90, 3);
        expect(readRotation(after[2])).toBeCloseTo(270, 3);
    });

    test('is edited through the standard shape property flow with undo and redo', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const states = await page.evaluate(async () => {
            const shape = shell.board.shapes.getByName('Clock');
            const countTexts = () => document.getElementById(shape.id).querySelectorAll('text').length;
            const initial = countTexts();
            shape.setPropertyCommand('numberColor', 'transparent');
            shell.board.forceRefresh();
            await new Promise(resolve => setTimeout(resolve, 150));
            const hidden = countTexts();
            shell.commands.undo();
            shell.board.forceRefresh();
            await new Promise(resolve => setTimeout(resolve, 150));
            const undone = countTexts();
            shell.commands.redo();
            shell.board.forceRefresh();
            await new Promise(resolve => setTimeout(resolve, 150));
            return { initial: initial, hidden: hidden, undone: undone, redone: countTexts(), edited: shape.properties.definition.metadata.edited };
        });
        expect(states.initial).toBe(12);
        expect(states.hidden).toBe(0);
        expect(states.undone).toBe(12);
        expect(states.redone).toBe(0);
        expect(states.edited).toBe(true);
    });

    test('survives serialization, reload and duplication', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const roundTrip = await page.evaluate(async () => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setPropertyCommand('faceColor', '#ffec99');
            // The laps a run took are the object's own memory, so the file has to carry them the way
            // it carries any other value — unlike the run itself, which a saved clock never remembers.
            shape.setPropertyCommand('laps', [{ text: '00:00:01.500', x: 1.5 }, { text: '00:00:03.250', x: 3.25 }]);
            const model = JSON.stringify(shell.serialize());
            const serializedShape = JSON.parse(model).board.find(entry => entry.type === 'ComponentShape');
            shell.openModel(model);
            await new Promise(resolve => setTimeout(resolve, 600));
            const reloaded = shell.board.shapes.getByName('Clock');
            reloaded.duplicate();
            await new Promise(resolve => setTimeout(resolve, 300));
            const duplicated = shell.board.shapes.shapes.filter(entry => entry.constructor.name === 'ComponentShape');
            return {
                serializedType: serializedShape.type,
                serializedSchemaVersion: serializedShape.properties.definition.schemaVersion,
                serializedComponent: serializedShape.properties.definition.root.type,
                serializedFaceColor: serializedShape.properties.faceColor,
                reloadedFaceColor: reloaded.properties.faceColor,
                reloadedFaceFill: document.getElementById(reloaded.id).querySelector('circle').getAttribute('fill'),
                reloadedHandRotation: reloaded.getInspectionReport().nodes.filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate('))[0].transform,
                serializedLaps: serializedShape.properties.laps,
                reloadedLaps: reloaded.properties.laps,
                duplicateCount: duplicated.length,
                duplicateComponent: duplicated[1].getComponentType()
            };
        });
        expect(roundTrip.serializedType).toBe('ComponentShape');
        expect(roundTrip.serializedSchemaVersion).toBe('1.0.0');
        expect(roundTrip.serializedComponent).toBe('clock');
        expect(roundTrip.serializedFaceColor).toBe('#ffec99');
        expect(roundTrip.reloadedFaceColor).toBe('#ffec99');
        expect(roundTrip.reloadedFaceFill).toBe('#ffec99');
        expect(readRotation(roundTrip.reloadedHandRotation)).toBeCloseTo(105, 3);
        expect(roundTrip.serializedLaps).toEqual([{ text: '00:00:01.500', x: 1.5 }, { text: '00:00:03.250', x: 3.25 }]);
        expect(roundTrip.reloadedLaps).toEqual([{ text: '00:00:01.500', x: 1.5 }, { text: '00:00:03.250', x: 3.25 }]);
        expect(roundTrip.duplicateCount).toBe(2);
        expect(roundTrip.duplicateComponent).toBe('clock');
    });

    test('supports selection, move and resize like any other shape', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const result = await page.evaluate(async () => {
            const shape = shell.board.shapes.getByName('Clock');
            shell.board.selection.select(shape);
            const selected = shell.board.selection.selectedShape === shape;
            const handles = shape.handleElements.map(handle => handle.getAttribute('class'));
            shape.transformShape({ x: 300, y: 220, width: 120, height: 120 });
            shape.draw();
            await new Promise(resolve => setTimeout(resolve, 200));
            const element = document.getElementById(shape.id);
            const faceRadius = Number(element.querySelector('circle').getAttribute('r'));
            return { selected: selected, handles: handles, transform: element.getAttribute('transform'), faceRadius: faceRadius };
        });
        expect(result.selected).toBe(true);
        expect(result.handles).toEqual(expect.arrayContaining(['handle move', 'handle top-left', 'handle bottom-right', 'handle rotation']));
        expect(result.transform).toContain('translate(300, 220)');
        expect(result.faceRadius).toBeCloseTo(54, 3);
    });

    test('drags a hand to write back into the model', async ({ page }) => {
        await setupBoard(page);
        await addEditableClockEquations(page);
        await addClock(page);
        const beforeMinute = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ secondColor: 'transparent' });
            shape.draw();
            return shell.board.calculator.getByName('minute', 1);
        });
        expect(beforeMinute).toBe(30);
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x, centre.y + 60).matrixTransform(matrix);
            const target = new DOMPoint(centre.x + 60, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const afterMinute = await page.evaluate(() => shell.board.calculator.getByName('minute', 1));
        expect(afterMinute).toBeCloseTo(15, 1);
    });

    test('does not write to the model when the shape is locked', async ({ page }) => {
        await setupBoard(page);
        await addEditableClockEquations(page);
        await addClock(page);
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ secondColor: 'transparent', interactableForUsers: false });
            shape.draw();
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x, centre.y + 60).matrixTransform(matrix);
            const target = new DOMPoint(centre.x + 60, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const minute = await page.evaluate(() => shell.board.calculator.getByName('minute', 1));
        expect(minute).toBe(30);
    });

    // A thousand milliseconds is one turn of the hand, so the hand it is read on is the fastest of
    // the four and the one the face carries no marks for.
    test('the millisecond hand is drawn once it is asked for, and goes round once a second', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        expect(await readClockHands(page)).toHaveLength(3);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const hands = await readClockHands(page);
        expect(hands).toHaveLength(4);
        expect(readRotation(hands[3])).toBeCloseTo(90, 3);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Clock equations').properties.expression = 'hour=3\\\\minute=30\\\\second=15\\\\milli=750';
            shell.reset();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        expect(readRotation((await readClockHands(page))[3])).toBeCloseTo(270, 3);
    });

    // The two clocks read the same variables: what the seconds and the milliseconds are switched off
    // for goes from the readout exactly as it goes from the face.
    test('reads the same time as digits when it is shown as a digital clock', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ shownAs: 'digital' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('03:30:15');
        expect(await readClockHands(page)).toHaveLength(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('03:30:15.250');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ secondColor: 'transparent', millisecondColor: 'transparent' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('03:30');
    });

    test('pads every field to the width it is read at', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'hour=9\\\\minute=7\\\\second=4\\\\milli=8');
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ shownAs: 'digital', millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('09:07:04.008');
    });

    // A model that runs the clock backwards past zero holds a time below it, and what the readout is
    // for is the time of day that stands for rather than the minus sign the term carries.
    test('reads a time the model has run back past zero as the time of day it stands for', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'hour=-1\\\\minute=-1\\\\second=-1\\\\milli=-1');
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ shownAs: 'digital', millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('23:59:59.999');
    });

    test('the toolbar carries a key for the way the clock is shown, wearing the icon of the choice it is on', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Clock')));
        await page.waitForTimeout(400);
        const key = page.locator('.shape-context-toolbar.visible .mdl-component-mode-selector');
        await expect(key).toHaveCount(1);
        expect(await key.locator('.dx-icon').first().getAttribute('class')).toContain('fa-clock');
        await key.click();
        await page.waitForTimeout(400);
        const menu = page.locator('.mdl-shape-overlay-popup').last();
        expect(await menu.locator('.mdl-dropdown-list-label').allTextContents()).toEqual(['Analogue', 'Digital']);
        await menu.locator('.dx-list-item').nth(1).click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.shownAs)).toBe('digital');
        expect(await readClockDigits(page)).toBe('03:30:15');
        expect(await key.locator('.dx-icon').first().getAttribute('class')).toContain('fa-input-numeric');
    });

    // What only the face has is not worth offering while the digits are what is shown.
    test('the settings the face alone needs go when the clock is shown as digits', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setPropertyCommand('shownAs', 'digital');
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(400);
        const labels = await page.$$eval('.mdl-shape-overlay-popup .mdl-dropdown-list-label',
            elements => elements.map(element => element.textContent.trim()));
        expect(labels).toEqual(['Buttons']);
    });

    test('the keys are drawn once they are asked for, and the face makes room for them', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const readFace = () => page.evaluate(() => ({
            keys: document.getElementById(shell.board.shapes.getByName('Clock').id).querySelectorAll('[data-block-id*="-press"]').length,
            faceRadius: Number(document.getElementById(shell.board.shapes.getByName('Clock').id).querySelector('circle').getAttribute('r'))
        }));
        const bare = await readFace();
        expect(bare.keys).toBe(0);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ showControls: true });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const withKeys = await readFace();
        expect(withKeys.keys).toBe(3);
        expect(withKeys.faceRadius).toBeLessThan(bare.faceRadius);
    });

    // The clock counts real time rather than the model's, so the run goes on while the player stands
    // still — and what it counts lands in the terms the four rows name.
    test('play counts real time into the terms, pause holds the reading and stop clears it', async ({ page }) => {
        await setupBoard(page);
        await addRunnableClockEquations(page);
        await addRunnableClock(page);
        expect(await readClockTerms(page)).toEqual({ second: 0, milli: 0 });
        await pressClockKey(page, 'play');
        await page.waitForTimeout(1200);
        const counted = await readClockTerms(page);
        expect(counted.second).toBeGreaterThanOrEqual(1);
        await pressClockKey(page, 'play');
        await page.waitForTimeout(500);
        const held = await readClockTerms(page);
        await page.waitForTimeout(700);
        expect(await readClockTerms(page)).toEqual(held);
        await pressClockKey(page, 'play');
        await page.waitForTimeout(700);
        expect((await readClockTerms(page)).milli).not.toBe(held.milli);
        await pressClockKey(page, 'stop');
        await page.waitForTimeout(400);
        expect(await readClockTerms(page)).toEqual({ second: 0, milli: 0 });
    });

    // Nothing has to be bound: a clock straight from the palette counts in the numbers its own rows
    // hold, and the whole run is one thing to undo.
    test('counts in its own numbers when nothing is bound', async ({ page }) => {
        await setupBoard(page);
        await addRunnableClockEquations(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setProperties({ x: 240, y: 140, width: 240, height: 280, showControls: true, millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const readOwn = () => page.evaluate(() => Number(shell.board.shapes.getByName('Clock').properties.secondVariable));
        await pressClockKey(page, 'play');
        await page.waitForTimeout(1200);
        expect(await readOwn()).toBeGreaterThanOrEqual(1);
        await pressClockKey(page, 'play');
        await page.waitForTimeout(400);
        const held = await readOwn();
        expect(held).toBeGreaterThanOrEqual(1);
        await pressClockKey(page, 'stop');
        await page.waitForTimeout(300);
        expect(await readOwn()).toBe(0);
    });

    // A thousandth is a sixtieth of a degree on the second hand, so the hand that counts seconds
    // carries the thousandths it is standing in rather than waiting for the next whole one.
    test('the second hand sweeps through the thousandths rather than stepping whole seconds', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'hour=3\\\\minute=30\\\\second=15\\\\milli=0');
        await addClock(page);
        expect(readRotation((await readClockHands(page))[2])).toBeCloseTo(90, 3);
        for (const [milli, degrees] of [[250, 91.5], [500, 93], [999, 95.994]]) {
            await page.evaluate(milli => {
                shell.board.shapes.getByName('Clock equations').properties.expression = `hour=3\\\\minute=30\\\\second=15\\\\milli=${milli}`;
                shell.reset();
                shell.board.forceRefresh();
            }, milli);
            await page.waitForTimeout(400);
            expect(readRotation((await readClockHands(page))[2])).toBeCloseTo(degrees, 3);
        }
    });

    // A clock whose millisecond row names nothing the model holds has no thousandths to carry, so
    // its second hand steps a whole mark at a time exactly as it did before it could sweep.
    test('the second hand steps whole marks when there are no thousandths to read', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'hour=3\\\\minute=30\\\\second=15');
        await addClock(page);
        expect(readRotation((await readClockHands(page))[2])).toBeCloseTo(90, 3);
    });

    // The whole clock can be read off the model's own time instead of four rows of its own: the
    // parts are worked out from it, so a model that never mentions an hour still keeps one.
    test('reads the independent variable as a count of seconds when it is asked to', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, '\\frac{dx}{dt}=0');
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setProperties({ x: 240, y: 160, width: 220, height: 220, syncedWithPlayer: true, shownAs: 'digital', millisecondColor: '#1871c2' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('00:00:00.000');
        // t = 3725.5 s is one hour, two minutes, five seconds and a half.
        await page.evaluate(() => {
            shell.board.calculator.properties.independent.start = 3725.5;
            shell.reset();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(400);
        expect(await readClockDigits(page)).toBe('01:02:05.500');
    });

    // The rows are the other way of reading the time, so they are not worth offering while the model
    // is what the clock is reading.
    // The rows stay whichever way the clock is reading the time. A clock the model moves still has
    // four hands, and the colour each is drawn in is chosen on its own row, so taking the rows away
    // would take the colours with them. The switch is named after the term it hands the clock to.
    test('the rows stay when the clock is handed to the model', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const readRows = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            return BlockObjects.getEditableParameters(shape.properties.definition)
                .filter(parameter => (parameter.category ?? 'general') === 'model')
                .filter(parameter => shape.isComponentParameterOffered(parameter))
                .map(parameter => parameter.label);
        });
        const rows = ['Use independent', 'Hour', 'Minute', 'Second', 'Millisecond'];
        expect(await readRows()).toEqual(rows);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ syncedWithPlayer: true });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readRows()).toEqual(rows);
    });

    // One key does the work of two: it wears the mark for what pressing it would do next, so a clock
    // standing still offers play and a clock counting offers pause.
    test('the first key both starts the run and holds it, and wears the mark for what it would do', async ({ page }) => {
        await setupBoard(page);
        await addRunnableClockEquations(page);
        await addRunnableClock(page);
        const readMarks = () => page.evaluate(() => Array.from(
            document.getElementById(shell.board.shapes.getByName('Clock').id).querySelectorAll('[data-block-id$=":play-mark"], [data-block-id$=":pause-mark"]'))
            .map(node => node.getAttribute('data-block-id').split(':').pop()));
        expect(await readMarks()).toContain('play-mark');
        expect(await readMarks()).not.toContain('pause-mark');
        await pressClockKey(page, 'play');
        await page.waitForTimeout(400);
        expect(await readMarks()).toContain('pause-mark');
        expect(await readMarks()).not.toContain('play-mark');
        const counted = await readClockTerms(page);
        await pressClockKey(page, 'play');
        await page.waitForTimeout(500);
        expect(await readMarks()).toContain('play-mark');
        const held = await readClockTerms(page);
        expect(held.second).toBeGreaterThanOrEqual(counted.second);
        await page.waitForTimeout(600);
        expect(await readClockTerms(page)).toEqual(held);
    });

    // The lap key keeps the reading as it stands, and the stop key forgets every lap along with the
    // run that made them.
    test('the lap key keeps the reading, the list shows it and stop forgets them', async ({ page }) => {
        await setupBoard(page);
        await addRunnableClockEquations(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setProperties({ x: 240, y: 120, width: 240, height: 360, showControls: true, showLaps: true, millisecondColor: '#1871c2', hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', millisecondVariable: 'milli' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const readLaps = () => page.evaluate(() => shell.board.shapes.getByName('Clock').properties.laps ?? []);
        const readListLabels = () => page.evaluate(() => Array.from(
            document.getElementById(shell.board.shapes.getByName('Clock').id).querySelectorAll('[data-block-id*="lap-list"][data-block-id$=":label"]'))
            .map(node => node.textContent));
        expect(await readLaps()).toEqual([]);
        await pressClockKey(page, 'play');
        await page.waitForTimeout(900);
        await pressClockKey(page, 'lap');
        await page.waitForTimeout(300);
        await page.waitForTimeout(700);
        await pressClockKey(page, 'lap');
        await page.waitForTimeout(300);
        const laps = await readLaps();
        expect(laps).toHaveLength(2);
        expect(laps[1].x).toBeGreaterThan(laps[0].x);
        expect(await readListLabels()).toHaveLength(2);
        await pressClockKey(page, 'stop');
        await page.waitForTimeout(400);
        expect(await readLaps()).toEqual([]);
        expect(await readListLabels()).toHaveLength(0);
    });

    // A clock the model moves is not counted by the keys, so neither the one that would count it nor
    // the one that would clear it is offered; the lap key is, because taking a reading is still
    // something the reader does. The laps such a clock takes are emptied from the bin.
    test('only the lap key is offered while the model is what moves the clock', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, '\\frac{dx}{dt}=0');
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setProperties({ x: 240, y: 120, width: 240, height: 360, showControls: true, showLaps: true, syncedWithPlayer: true });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const readKeys = () => page.evaluate(() => Array.from(
            document.getElementById(shell.board.shapes.getByName('Clock').id).querySelectorAll('[data-block-id$="-press"]'))
            .map(node => node.getAttribute('data-block-id').split(':').pop()));
        expect(await readKeys()).toEqual(['lap-press']);
        await pressClockKey(page, 'lap');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.laps)).toHaveLength(1);
    });

    // What a part of the reading is drawn in is chosen beside the term that names it, so the colour
    // and the reading it paints are named together — the hand on the face, and that field's own
    // digits on the panel.
    test('every row carries the colour its part is read in, on the face and on the digits alike', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        const rowColours = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ millisecondColor: '#1871c2' });
            shape.draw();
            return BlockObjects.getEditableParameters(shape.properties.definition)
                .filter(parameter => parameter.valueType === 'variable')
                .map(parameter => [parameter.label, parameter.colorParameter]);
        });
        expect(rowColours).toEqual([['Hour', 'hourColor'], ['Minute', 'minuteColor'], ['Second', 'secondColor'], ['Millisecond', 'millisecondColor']]);

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ hourColor: '#111111', minuteColor: '#222222', secondColor: '#333333', millisecondColor: '#444444' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const hands = await page.evaluate(() => ['hour-hand', 'minute-hand', 'second-hand', 'millisecond-hand'].map(name => {
            const element = document.getElementById(shell.board.shapes.getByName('Clock').id)
                .querySelector(`[data-block-id*="${name}"] polygon, [data-block-id*="${name}"] line, polygon[data-block-id*="${name}"], line[data-block-id*="${name}"]`);
            const stroke = element.getAttribute('stroke');
            return stroke && stroke !== 'none' ? stroke : element.getAttribute('fill');
        }));
        expect(hands).toEqual(['#111111', '#222222', '#333333', '#444444']);

        // The panel spells the same reading in the same four colours, a field at a time, with the
        // marks between them left in the number colour.
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ shownAs: 'digital', numberColor: '#555555' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const lampsByCharacter = await page.evaluate(() => {
            const element = document.getElementById(shell.board.shapes.getByName('Clock').id);
            const found = {};
            for (const node of element.querySelectorAll('polygon[data-block-id*=":character-"]')) {
                const index = Number(node.getAttribute('data-block-id').split(':').pop().split('-')[1]);
                found[index] = node.getAttribute('fill');
            }
            return Object.keys(found).sort((first, second) => Number(first) - Number(second)).map(index => found[index]);
        });
        expect(lampsByCharacter).toEqual([
            '#111111', '#111111', '#555555', '#222222', '#222222', '#555555',
            '#333333', '#333333', '#555555', '#444444', '#444444', '#444444'
        ]);
    });

    // A colour a row already names is chosen on that row, and the border every shape has is the one
    // the shape menu already carries, so neither is offered a second time in the colour list.
    test('the colour list leaves out what a row names and what the shape menu already has', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await addClock(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ millisecondColor: '#1871c2' });
            shape.draw();
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector').click();
        await page.waitForTimeout(400);
        const labels = await page.$$eval('.mdl-shape-overlay-popup .dx-list-item-content',
            elements => elements.map(element => element.textContent.trim().split('\n')[0]));
        expect(labels.filter(label => label === 'Border')).toHaveLength(1);
        for (const gone of ['Hour', 'Minute', 'Second', 'Millisecond'])
            expect(labels).not.toContain(gone);
        // What is left keeps its name without the word the swatch itself already says.
        expect(labels).toEqual(expect.arrayContaining(['Face', 'Number']));
        expect(labels.join('|').toLowerCase()).not.toContain('colour');
    });

    // A hand is dragged whenever the term it names is one the model lets you set, so there is no
    // switch to turn dragging on: what decides it is the term, the way it decides every other
    // drawing of a value the reader can change.
    test('hands are dragged without a switch saying they may be', async ({ page }) => {
        await setupBoard(page);
        await addEditableClockEquations(page);
        await addClock(page);
        const offered = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            return BlockObjects.getEditableParameters(shape.properties.definition).map(parameter => parameter.id);
        });
        expect(offered).not.toContain('interactive');
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x, centre.y + 60).matrixTransform(matrix);
            const target = new DOMPoint(centre.x + 60, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => shell.board.calculator.getByName('minute', 1))).toBeCloseTo(15, 1);
    });

    // A clock the model moves is not the reader's to point: the rows stay, so the colours can still
    // be chosen, but the selectors go quiet and only the lap key is worth offering.
    test('the rows go quiet and only the lap key is left when the model drives the clock', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            shape.setProperties({ x: 240, y: 140, width: 240, height: 300, showControls: true, hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' });
            shape.draw();
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(500);
        const readKeys = () => page.evaluate(() => Array.from(
            document.getElementById(shell.board.shapes.getByName('Clock').id).querySelectorAll('[data-block-id$="-press"]'))
            .map(node => node.getAttribute('data-block-id').split(':').pop()));
        expect(await readKeys()).toEqual(['play-press', 'lap-press', 'stop-press']);

        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        const readMenu = () => page.evaluate(() => {
            const popups = document.querySelectorAll('.mdl-shape-overlay-popup');
            const last = popups[popups.length - 1];
            return {
                selectors: last.querySelectorAll('.dx-dropdownbox:not(.mdl-units-editor)').length,
                quiet: last.querySelectorAll('.dx-dropdownbox:not(.mdl-units-editor).dx-state-disabled').length,
                swatches: last.querySelectorAll('.dx-colorbox').length
            };
        });
        const before = await readMenu();
        expect(before.quiet).toBe(0);

        // The source is picked from the switch on the row above the terms.
        const sourceSwitch = page.locator('.mdl-shape-overlay-popup .dx-switch').first();
        await expect(sourceSwitch).toHaveCount(1);
        await sourceSwitch.click();
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.syncedWithPlayer)).toBe(true);

        const after = await readMenu();
        expect(after.selectors).toBe(before.selectors);
        expect(after.quiet).toBe(after.selectors);
        expect(after.swatches).toBe(before.swatches);
        expect(await readKeys()).toEqual(['lap-press']);

        // A row no longer choosing its term shows nothing, and the key above says what every hand is
        // reading instead: the model's own clock, under whatever name the model gave it.
        const reading = await page.evaluate(() => {
            const popups = document.querySelectorAll('.mdl-shape-overlay-popup');
            const last = popups[popups.length - 1];
            const button = document.querySelector('.shape-context-toolbar.visible .mdl-component-model-selector');
            return {
                selectors: Array.from(last.querySelectorAll('.dx-dropdownbox')).map(node => node.textContent.trim()),
                keyTerms: Array.from(button.querySelectorAll('.mdl-name-btn-term-text')).map(node => node.textContent.trim()),
                stored: shell.board.shapes.getByName('Clock').properties.hourVariable
            };
        });
        expect(reading.selectors).toEqual(['', '', '', '']);
        // One reading shared by every hand is named once, not once per hand.
        expect(reading.keyTerms).toEqual(['t']);
        // The terms are still on the object, so switching back finds them where they were left.
        expect(reading.stored).toBe('hour');
    });

    // The clock was called "analogue-clock" before it was called "clock", and the files already saved
    // carry the old name. It still finds the block, so a model is never reopened to be told its clock
    // no longer exists — but it is the new name alone that the editor lists and offers.
    test('a clock saved under its old type still registers, draws and reads its parameters', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const shape = shell.commands.addComponent('clock', 'Clock');
            const definition = shape.properties.definition;
            definition.root.type = 'analogue-clock';
            definition.type = 'analogue-clock';
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, definition: definition });
            shape.draw();
            return {
                found: BlockRegistry.has('analogue-clock'),
                resolvesTo: BlockRegistry.get('analogue-clock').type,
                isComponent: BlockObjects.isComponentInstance(definition),
                parameterCount: BlockObjects.getComponentParameters('analogue-clock').length,
                circles: document.getElementById(shape.id).querySelectorAll('circle').length,
                hands: document.getElementById(shape.id).querySelectorAll('polygon').length,
                listed: BlockRegistry.list('component').map(entry => entry.type).filter(type => type.includes('clock'))
            };
        });
        expect(result.found).toBe(true);
        expect(result.resolvesTo).toBe('clock');
        expect(result.isComponent).toBe(true);
        expect(result.parameterCount).toBeGreaterThan(10);
        expect(result.circles).toBeGreaterThanOrEqual(2);
        expect(result.hands).toBeGreaterThanOrEqual(2);
        expect(result.listed).toEqual(['clock']);
    });

    test('the keys are locked when the model works the reading out for itself', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'hour=1\\\\minute=2\\\\second=3\\\\milli=4');
        await addRunnableClock(page);
        await page.waitForTimeout(300);
        const point = await page.evaluate(() => {
            const node = document.getElementById(shell.board.shapes.getByName('Clock').id).querySelector('[data-block-id*=":play-press"]');
            const box = node.getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        });
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(200);
        expect(await page.evaluate(point => window.getComputedStyle(document.elementFromPoint(point.x, point.y)).cursor, point)).toBe('not-allowed');
        await page.mouse.click(point.x, point.y);
        await page.waitForTimeout(600);
        expect(await readClockTerms(page)).toEqual({ second: 3, milli: 4 });
    });
});

test.describe('compass component', () => {
    async function addCompassModel(page) {
        await page.evaluate(() => modellus.shape.addExpression('Compass equations'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Compass equations').properties.expression = '\\frac{dheading}{dt}=0\\\\\\frac{dturn}{dt}=0';
            shell.reset();
        });
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('heading', 120, 1, 1);
            shell.board.calculator.setTermValue('turn', 0, 1, 1);
            shell.board.calculator.calculate();
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(300);
    }

    async function addCompass(page) {
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, headingVariable: 'heading', rotationVariable: 'turn' });
            shape.draw();
        });
        await page.waitForTimeout(300);
    }

    // The compass is 200 by 200, so its rose radius is 94: the needle reaches 62 and the rim the
    // drag ring covers runs from 66 outwards. Points are given as a radius and a clockwise angle
    // from north, the same way the component reads them.
    async function dragOnCompass(page, from, to) {
        const points = await page.evaluate(([from, to]) => {
            const shape = shell.board.shapes.getByName('Compass');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const place = point => {
                const radians = point.degrees * Math.PI / 180;
                const screen = new DOMPoint(centre.x + point.radius * Math.sin(radians), centre.y - point.radius * Math.cos(radians)).matrixTransform(matrix);
                return { x: screen.x, y: screen.y };
            };
            return [place(from), place(to)];
        }, [from, to]);
        await page.mouse.move(points[0].x, points[0].y);
        await page.mouse.down();
        if (to.degrees !== from.degrees || to.radius !== from.radius)
            await page.mouse.move(points[1].x, points[1].y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
    }

    async function readTerms(page) {
        return page.evaluate(() => ({
            heading: shell.board.calculator.getByName('heading', 1),
            turn: shell.board.calculator.getByName('turn', 1)
        }));
    }

    test('drags the needle to set the heading variable', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        expect(await readTerms(page)).toEqual({ heading: 120, turn: 0 });
        await dragOnCompass(page, { radius: 40, degrees: 120 }, { radius: 55, degrees: 90 });
        const terms = await readTerms(page);
        expect(terms.heading).toBeCloseTo(90, 1);
        expect(terms.turn).toBe(0);
    });

    test('drags the rim of the rose to turn it, leaving the needle alone', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        await dragOnCompass(page, { radius: 80, degrees: 0 }, { radius: 80, degrees: 90 });
        const terms = await readTerms(page);
        expect(terms.turn).toBeCloseTo(90, 1);
        expect(terms.heading).toBe(120);
    });

    test('turns the rose by how far the pointer travels, so grabbing it moves nothing', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        await dragOnCompass(page, { radius: 80, degrees: 45 }, { radius: 80, degrees: 45 });
        expect((await readTerms(page)).turn).toBe(0);
        await dragOnCompass(page, { radius: 80, degrees: 45 }, { radius: 80, degrees: 25 });
        expect((await readTerms(page)).turn).toBeCloseTo(340, 1);
    });

    // The grab areas are invisible, so the cursor and the rim highlight are the only things telling
    // a reader that the compass can be turned at all. They are the feature as far as the eye goes.
    async function readAffordance(page, point) {
        const screenPoint = await page.evaluate(point => {
            const shape = shell.board.shapes.getByName('Compass');
            const matrix = shell.board.svg.getScreenCTM();
            const radians = point.degrees * Math.PI / 180;
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const placed = new DOMPoint(centre.x + point.radius * Math.sin(radians), centre.y - point.radius * Math.cos(radians)).matrixTransform(matrix);
            return { x: placed.x, y: placed.y };
        }, point);
        await page.mouse.move(screenPoint.x, screenPoint.y);
        await page.waitForTimeout(150);
        return page.evaluate(point => {
            const element = document.elementFromPoint(point.x, point.y);
            const ring = document.querySelector('[data-block-id$=":rose-grab"]');
            return {
                cursor: element ? window.getComputedStyle(element).cursor : null,
                ringFill: ring?.getAttribute('fill') ?? 'absent'
            };
        }, screenPoint);
    }

    test('shows the grab cursor and lights the rim while the pointer rests on it', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        const rim = await readAffordance(page, { radius: 80, degrees: 0 });
        expect(rim.cursor).toBe('grab');
        expect(rim.ringFill).not.toBe('none');
        const needle = await readAffordance(page, { radius: 40, degrees: 120 });
        expect(needle.cursor).toBe('grab');
        expect(needle.ringFill).toBe('none');
        const middle = await readAffordance(page, { radius: 20, degrees: 90 });
        expect(middle.cursor).toBe('auto');
    });

    test('keeps the affordance while the shape is selected and the move handle covers it', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Compass')));
        await page.waitForTimeout(300);
        const rim = await readAffordance(page, { radius: 80, degrees: 0 });
        expect(rim.cursor).toBe('grab');
        expect(rim.ringFill).not.toBe('none');
    });

    test('marks the targets locked when the variables are worked out by the model', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Compass equations').properties.expression = '\\frac{dheading}{dt}=0\\\\\\frac{dturn}{dt}=0\\\\computed=2\\cdot heading';
            shell.reset();
        });
        await page.waitForTimeout(400);
        await addCompass(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Compass');
            shape.setProperties({ headingVariable: 'computed', rotationVariable: 'computed' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect((await readAffordance(page, { radius: 80, degrees: 0 })).cursor).toBe('not-allowed');
    });

    async function addValueCompass(page) {
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, headingVariable: 30, rotationVariable: 0 });
            shape.draw();
        });
        await page.waitForTimeout(300);
    }

    async function readCompassProperties(page) {
        return page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Compass');
            return { heading: Number(shape.properties.headingVariable), rotation: Number(shape.properties.rotationVariable) };
        });
    }

    test('drags the needle of a compass holding plain numbers, writing the property itself', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addValueCompass(page);
        expect((await readAffordance(page, { radius: 40, degrees: 30 })).cursor).toBe('grab');
        await dragOnCompass(page, { radius: 40, degrees: 30 }, { radius: 55, degrees: 90 });
        const properties = await readCompassProperties(page);
        expect(properties.heading).toBeCloseTo(90, 1);
        expect(properties.rotation).toBe(0);
    });

    test('turns the rose of a compass holding plain numbers', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addValueCompass(page);
        await dragOnCompass(page, { radius: 80, degrees: 0 }, { radius: 80, degrees: 90 });
        const properties = await readCompassProperties(page);
        expect(properties.rotation).toBeCloseTo(90, 1);
        expect(properties.heading).toBe(30);
    });

    test('puts a property drag in the undo history', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addValueCompass(page);
        await dragOnCompass(page, { radius: 40, degrees: 30 }, { radius: 55, degrees: 90 });
        expect((await readCompassProperties(page)).heading).toBeCloseTo(90, 1);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect((await readCompassProperties(page)).heading).toBe(30);
        await page.evaluate(() => shell.commands.redo());
        await page.waitForTimeout(300);
        expect((await readCompassProperties(page)).heading).toBeCloseTo(90, 1);
    });

    // Nothing has to be switched on and nothing has to be bound: a compass straight from the
    // palette shows plain numbers, and dragging it edits those numbers.
    test('drags a compass straight from the palette, with nothing bound and nothing switched on', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200 });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect((await readAffordance(page, { radius: 80, degrees: 0 })).cursor).toBe('grab');
        expect((await readAffordance(page, { radius: 40, degrees: 0 })).cursor).toBe('grab');
        await dragOnCompass(page, { radius: 40, degrees: 0 }, { radius: 55, degrees: 90 });
        expect((await readCompassProperties(page)).heading).toBeCloseTo(90, 1);
    });

    // A compass reloaded from a model saved before any of this existed carries no interaction
    // property at all. It has to drag all the same.
    test('drags a compass restored from a saved model that knew nothing about dragging', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addValueCompass(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Compass');
            const saved = JSON.parse(JSON.stringify(shape.serialize()));
            shell.board.removeShape(shape);
            const restored = shell.board.shapes.deserialize(shell.board, saved);
            shell.board.addShape(restored, false);
            restored.draw();
        });
        await page.waitForTimeout(300);
        await dragOnCompass(page, { radius: 40, degrees: 30 }, { radius: 55, degrees: 90 });
        expect((await readCompassProperties(page)).heading).toBeCloseTo(90, 1);
    });

    test('leaves the model alone when the shape is not interactable', async ({ page }) => {
        await setupBoard(page);
        await addCompassModel(page);
        await addCompass(page);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Compass');
            shape.setProperties({ interactableForUsers: false });
            shape.draw();
        });
        await dragOnCompass(page, { radius: 40, degrees: 120 }, { radius: 55, degrees: 90 });
        await dragOnCompass(page, { radius: 80, degrees: 0 }, { radius: 80, degrees: 90 });
        expect(await readTerms(page)).toEqual({ heading: 120, turn: 0 });
    });
});

test.describe('rotating vector component', () => {
    async function addVectorModel(page, expression = '\\displaylines{v_x=v\\cdot\\cos\\left(\\theta\\right)\\\\v_y=v\\cdot\\sin\\left(\\theta\\right)}') {
        await page.evaluate(() => modellus.shape.addExpression('Vector equations'));
        await page.waitForTimeout(300);
        await page.evaluate(expression => {
            shell.setProperty('angleUnit', 'degrees');
            shell.board.shapes.getByName('Vector equations').properties.expression = expression;
            shell.reset();
        }, expression);
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            shell.board.calculator.setTermValue('v', 3, 1, 1);
            shell.board.calculator.setTermValue('\\theta', 20, 1, 1);
            shell.board.calculator.calculate();
        });
        await page.waitForTimeout(200);
    }

    async function addRotatingVector(page, overrides = { angleVariable: '\\theta', lengthVariable: 'v' }) {
        await page.evaluate(overrides => {
            const shape = shell.commands.addComponent('rotating-vector', 'Speed and direction');
            shape.setProperties(Object.assign({ x: 240, y: 160, width: 200, height: 200, lengthScale: 20 }, overrides));
            shape.draw();
        }, overrides);
        await page.waitForTimeout(300);
    }

    // The vector is 200 by 200, so the arm the drag covers reaches 92 from the origin. Points are
    // given as a radius and an angle counter-clockwise from the positive x axis, the way the
    // component reads its own angle.
    async function dragOnVector(page, from, to) {
        const points = await page.evaluate(([from, to]) => {
            const shape = shell.board.shapes.getByName('Speed and direction');
            const matrix = shell.board.svg.getScreenCTM();
            const origin = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const place = point => {
                const radians = point.degrees * Math.PI / 180;
                const screen = new DOMPoint(origin.x + point.radius * Math.cos(radians), origin.y - point.radius * Math.sin(radians)).matrixTransform(matrix);
                return { x: screen.x, y: screen.y };
            };
            return [place(from), place(to)];
        }, [from, to]);
        await page.mouse.move(points[0].x, points[0].y);
        await page.mouse.down();
        await page.mouse.move(points[1].x, points[1].y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
    }

    async function readVectorTerms(page) {
        return page.evaluate(() => ({
            angle: shell.board.calculator.getByName('\\theta', 1),
            length: shell.board.calculator.getByName('v', 1)
        }));
    }

    async function readVectorAffordance(page) {
        return page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Speed and direction');
            const grab = document.getElementById(shape.id).querySelector('[data-source-id="vector-grab"]');
            return { cursor: grab.style.cursor, pointerEvents: grab.getAttribute('pointer-events') };
        });
    }

    test('drags the arrow round to the direction it is pointed at', async ({ page }) => {
        await setupBoard(page);
        await addVectorModel(page);
        await addRotatingVector(page);
        expect((await readVectorTerms(page)).angle).toBe(20);
        expect((await readVectorAffordance(page)).cursor).toBe('grab');
        await dragOnVector(page, { radius: 50, degrees: 20 }, { radius: 60, degrees: 135 });
        const terms = await readVectorTerms(page);
        expect(terms.angle).toBeCloseTo(135, 1);
        expect(terms.length).toBe(3);
    });

    // The arrow is turned, not stretched: how fast is the slider's business and the pedal's, so a
    // drag that points the car somewhere else leaves the speed it is going at alone.
    test('turns the arrow without changing the length it shows', async ({ page }) => {
        await setupBoard(page);
        await addVectorModel(page);
        await addRotatingVector(page);
        await dragOnVector(page, { radius: 30, degrees: 20 }, { radius: 88, degrees: 270 });
        const terms = await readVectorTerms(page);
        expect(terms.angle).toBeCloseTo(270, 1);
        expect(terms.length).toBe(3);
    });

    // A vector straight from the palette shows plain numbers, so dragging it edits the object's own
    // angle, and that edit belongs in the undo history the way any other property edit does.
    test('drags a vector holding a plain number, writing the property itself', async ({ page }) => {
        await setupBoard(page);
        await addVectorModel(page);
        await addRotatingVector(page, { angleVariable: '30', lengthVariable: '2' });
        await dragOnVector(page, { radius: 40, degrees: 30 }, { radius: 60, degrees: 90 });
        const angleOf = () => page.evaluate(() => Number(shell.board.shapes.getByName('Speed and direction').properties.angleVariable));
        expect(await angleOf()).toBeCloseTo(90, 1);
        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(300);
        expect(await angleOf()).toBe(30);
        await page.evaluate(() => shell.commands.redo());
        await page.waitForTimeout(300);
        expect(await angleOf()).toBeCloseTo(90, 1);
    });

    // An angle the model works out for itself can never be written, and saying so with the cursor a
    // locked handle uses beats an arrow that quietly refuses to move.
    test('refuses the drag when the model works the angle out for itself', async ({ page }) => {
        await setupBoard(page);
        await addVectorModel(page, '\\displaylines{\\theta=45\\\\v_x=v\\cdot\\cos\\left(\\theta\\right)}');
        await addRotatingVector(page);
        expect((await readVectorAffordance(page)).cursor).toBe('not-allowed');
        await dragOnVector(page, { radius: 50, degrees: 45 }, { radius: 60, degrees: 135 });
        expect((await readVectorTerms(page)).angle).toBe(45);
    });
});

test.describe('component variable inputs', () => {
    async function addCompass(page) {
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200 });
            shape.draw();
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(400);
    }

    async function typeIntoHeading(page, text) {
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(400);
        await openTermChip(page, 0);
        await termChipPanel(page).locator('.shape-term-term-row').click();
        await page.waitForSelector('.mdl-term-tree-custom-input input');
        const input = page.locator('.mdl-term-tree-custom-input input').last();
        await input.fill(text);
        await input.press('Enter');
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    }

    async function readCompass(page) {
        return page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Compass');
            const needle = shape.getInspectionReport().nodes
                .find(node => node.id.endsWith(':needle') && node.transform.startsWith('rotate('));
            return { headingVariable: shape.properties.headingVariable, needleTransform: needle?.transform ?? '' };
        });
    }

    test('accepts a typed number, keeping the precision as written', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120');
        await addCompass(page);
        await typeIntoHeading(page, '0.125');
        const result = await readCompass(page);
        expect(result.headingVariable).toBe('0.125');
        expect(readRotation(result.needleTransform)).toBeCloseTo(0.125, 3);
    });

    test('still accepts a term name typed into the same control', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120');
        await addCompass(page);
        await typeIntoHeading(page, 'heading');
        const result = await readCompass(page);
        expect(result.headingVariable).toBe('heading');
        expect(readRotation(result.needleTransform)).toBeCloseTo(120, 3);
    });

    test('renders a value like the player start value and a term as mathematics', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120');
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, headingVariable: '42.5', rotationVariable: 'heading' });
            shape.draw();
            shell.board.selection.select(shape);
        });
        await page.waitForTimeout(500);
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        const report = await page.evaluate(() => {
            const popups = document.querySelectorAll('.mdl-shape-overlay-popup');
            const rows = Array.from(popups[popups.length - 1].querySelectorAll('.mdl-dropdown-list-control'));
            const describe = row => {
                const value = row.querySelector('.mdl-term-editor-value');
                const style = value ? getComputedStyle(value) : null;
                return {
                    text: value?.textContent ?? null,
                    hasMathField: !!row.querySelector('.mdl-term-editor-math-field'),
                    font: style ? `${style.fontFamily}|${style.fontSize}|${style.fontStyle}|${style.fontWeight}` : null
                };
            };
            const buttonValue = document.querySelector('.shape-context-toolbar .mdl-name-btn-term-value');
            const buttonStyle = buttonValue ? getComputedStyle(buttonValue) : null;
            const startLabel = document.querySelector('#startDropDown span');
            const startStyle = getComputedStyle(startLabel);
            return {
                valueRow: describe(rows[0]),
                termRow: describe(rows[1]),
                nameButton: {
                    text: buttonValue?.textContent ?? null,
                    font: buttonStyle ? `${buttonStyle.fontFamily}|${buttonStyle.fontSize}|${buttonStyle.fontStyle}|${buttonStyle.fontWeight}` : null,
                    termStillTypeset: !!document.querySelector('.shape-context-toolbar .mdl-name-btn-term math-field')
                },
                playerFont: `${startStyle.fontFamily}|${startStyle.fontSize}|${startStyle.fontStyle}|${startStyle.fontWeight}`
            };
        });
        expect(report.valueRow.text).toBe('42.5');
        expect(report.valueRow.hasMathField).toBe(false);
        expect(report.valueRow.font).toBe(report.playerFont);
        expect(report.termRow.hasMathField).toBe(true);
        expect(report.termRow.text).toBeNull();
        expect(report.nameButton.text).toBe('42.50');
        expect(report.nameButton.font).toBe(report.playerFont);
        expect(report.nameButton.termStillTypeset).toBe(true);
    });

    test('still lists the model terms for picking', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\turn=35');
        await addCompass(page);
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(400);
        await openTermChip(page, 0);
        await termChipPanel(page).locator('.shape-term-term-row').click();
        await page.waitForSelector('.mdl-term-tree-view');
        await page.waitForTimeout(400);
        const listed = await page.$$eval('.dx-list-item, .dx-item-content', elements => elements.map(element => element.textContent.trim()));
        expect(listed.join('|')).toContain('heading');
        expect(listed.join('|')).toContain('turn');
    });
});

// The directions a compass marks are a list the reader builds, the way the terms a chart plots are:
// a row per direction, with the term it reads, a second term when the row names a pair, and a colour.
test.describe('compass pointers', () => {
    async function addCompassWithPointers(page, pointers) {
        await page.evaluate(pointers => {
            const shape = shell.commands.addComponent('compass', 'Compass');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, headingVariable: 'heading', pointers: pointers });
            shape.draw();
            shell.board.selection.select(shape);
        }, pointers);
        await page.waitForTimeout(500);
    }

    async function openPointersMenu(page) {
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
    }

    async function readPointerMarkers(page) {
        return page.evaluate(() => Array.from(document.getElementById(shell.board.shapes.getByName('Compass').id).querySelectorAll('polygon[data-block-id*=":pointer-"]'))
            .map(element => element.getAttribute('fill')));
    }

    test('draws a marker for every row and none for the empty one at the end', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [
            { term: 'heading', case: 1, color: '', secondTerm: '' },
            { term: 'east', case: 1, color: '#ff0000', secondTerm: 'north' },
            { term: '', case: 1, color: '', secondTerm: '' }
        ]);
        const markers = await readPointerMarkers(page);
        expect(markers).toHaveLength(2);
        expect(markers[1]).toBe('#ff0000');
    });

    test('offers a row per pointer, each choosing between an angle and an orientation', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [
            { term: 'heading', case: 1, color: '', secondTerm: '' },
            { term: 'east', case: 1, color: '', secondTerm: 'north' }
        ]);
        await openPointersMenu(page);
        const rows = page.locator('.mdl-shape-overlay-popup').last().locator('.component-terms-control .shape-term-row');
        await expect(rows).toHaveCount(3);
        await expect(rows.nth(0).locator('.mdl-term-chip__color')).toHaveCount(1);
        await openTermChip(page, 0, '.component-terms-control');
        await expect(termChipPanel(page).locator('.shape-term-mode .dx-button')).toHaveCount(2);
        await expect(termChipPanel(page).locator('.shape-term-extra-term')).toHaveCount(0);
        await closeTermChip(page, 0, '.component-terms-control');
        // The row naming a pair is the one that offers the second term; the empty row at the end is not.
        expect(await readTermChipRows(page, 1, '.component-terms-control')).toContain('Paired term');
        expect(await readTermChipRows(page, 2, '.component-terms-control')).not.toContain('Paired term');
    });

    test('a row turns into an orientation from its own buttons, and back again', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [{ term: 'heading', case: 1, color: '', secondTerm: '' }]);
        await openPointersMenu(page);
        await openTermChip(page, 0, '.component-terms-control');
        await termChipPanel(page).locator('.shape-term-mode .dx-button').nth(1).click();
        await page.waitForTimeout(500);
        expect((await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers))[0].mode).toBe('orientation');
        await expect(termChipPanel(page).locator('.shape-term-extra-term')).toHaveCount(1);
        await termChipPanel(page).locator('.shape-term-mode .dx-button').nth(0).click();
        await page.waitForTimeout(500);
        const pointers = await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers);
        expect(pointers[0].mode).toBe('angle');
        expect(pointers[0].secondTerm).toBe('');
        await expect(termChipPanel(page).locator('.shape-term-extra-term')).toHaveCount(0);
    });

    // The menu is as wide as the list of pointers, so the two selectors above it are as wide as the
    // list rather than sitting short of it with the space beside them empty.
    test('gives the rows above the list the same width as the list', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [{ term: 'east', case: 1, color: '', secondTerm: 'north' }]);
        await openPointersMenu(page);
        const widths = await page.evaluate(() => {
            const popups = document.querySelectorAll('.mdl-shape-overlay-popup');
            const last = popups[popups.length - 1];
            return Array.from(last.querySelectorAll('.mdl-dropdown-list-control')).map(element => Math.round(element.getBoundingClientRect().width));
        });
        expect(widths).toHaveLength(3);
        expect(widths[0]).toBe(widths[2]);
        expect(widths[1]).toBe(widths[2]);
    });

    async function readPointerDegrees(page) {
        return page.evaluate(() => Array.from(document.getElementById(shell.board.shapes.getByName('Compass').id).querySelectorAll('polygon[data-block-id*=":pointer-"]'))
            .map(element => {
                const tip = element.getAttribute('points').split(' ')[0].split(',').map(Number);
                return (Math.atan2(tip[0] - 100, 100 - tip[1]) * 180 / Math.PI + 360) % 360;
            }));
    }

    test('reads a row naming a pair as a vector once the second term is chosen', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [{ term: 'east', case: 1, color: '', secondTerm: '' }]);
        expect((await readPointerDegrees(page))[0]).toBeCloseTo(3, 3);
        await openPointersMenu(page);
        await openTermChip(page, 0, '.component-terms-control');
        await termChipPanel(page).locator('.shape-term-mode .dx-button').nth(1).click();
        await page.waitForTimeout(500);
        await termChipPanel(page).locator('.shape-term-extra-term').first().click();
        await page.waitForTimeout(400);
        const customInput = page.locator('.mdl-nested-dropdown-popup .mdl-term-tree-custom-input input').last();
        await customInput.fill('north');
        await customInput.press('Enter');
        await page.waitForTimeout(500);
        const pointers = await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers);
        expect(pointers[0].secondTerm).toBe('north');
        expect((await readPointerDegrees(page))[0]).toBeCloseTo(Math.atan2(3, 4) * 180 / Math.PI, 3);
    });

    test('takes a term typed into the empty row and marks the direction it reads', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, []);
        await openPointersMenu(page);
        await openTermChip(page, 0, '.component-terms-control');
        await termChipPanel(page).locator('.shape-term-term-row').click();
        await page.waitForTimeout(400);
        const customInput = page.locator('.mdl-nested-dropdown-popup .mdl-term-tree-custom-input input').last();
        await customInput.fill('heading');
        await customInput.press('Enter');
        await page.waitForTimeout(500);
        const pointers = await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers);
        expect(pointers[0].term).toBe('heading');
        expect(await readPointerMarkers(page)).toHaveLength(1);
    });
});

test.describe('other components on the board', () => {
    test('compass, speedometer, gauge, vector and orbit system all insert and render', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=45\\\\speed=60\\\\angle=30\\\\radius=1\\\\t=0');
        const results = await page.evaluate(async () => {
            const types = ['compass', 'speedometer', 'circular-gauge', 'rotating-vector', 'orbit-system'];
            const created = [];
            for (const type of types) {
                const shape = shell.commands.addComponent(type, type);
                shape.setProperties({ x: 60, y: 60, width: 160, height: 160 });
                shape.draw();
                await new Promise(resolve => setTimeout(resolve, 80));
                const element = document.getElementById(shape.id);
                created.push({
                    type: type,
                    componentType: shape.getComponentType(),
                    elementCount: element.querySelectorAll('circle, line, polygon, text, path').length,
                    validationErrors: shape.validateComponent().errors.map(error => error.code)
                });
            }
            return created;
        });
        for (const result of results) {
            expect(result.componentType).toBe(result.type);
            expect(result.elementCount).toBeGreaterThan(1);
            expect(result.validationErrors).toEqual([]);
        }
    });
});
