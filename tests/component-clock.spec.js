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
        const shape = shell.commands.addComponent('analogue-clock', 'Clock');
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
        const shape = shell.commands.addComponent('analogue-clock', 'Clock');
        shape.setProperties({ x: 240, y: 140, width: 240, height: 280, showControls: true, showMillisecondHand: true, hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', millisecondVariable: 'milli' });
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

test.describe('analogue clock component', () => {
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
        expect(rendered.componentType).toBe('analogue-clock');
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
        expect(labels).toContain('Show seconds');
        expect(labels).toContain('Show milliseconds');
        expect(labels).toContain('Hands can be dragged');
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
        expect(counts.switches).toBe(6);

        await popup.locator('.dx-switch').first().click();
        await page.waitForTimeout(400);
        const toggled = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            const hands = shape.getInspectionReport().nodes.filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate('));
            return { showSecondHand: shape.properties.showSecondHand, handCount: hands.length };
        });
        expect(toggled.showSecondHand).toBe(false);
        expect(toggled.handCount).toBe(2);

        await page.evaluate(() => shell.commands.undo());
        await page.waitForTimeout(400);
        const undone = await page.evaluate(() => shell.board.shapes.getByName('Clock').properties.showSecondHand);
        expect(undone).toBe(true);
    });

    test('is placed from the components palette by drawing on the board', async ({ page }) => {
        await setupBoard(page);
        await page.click('#components-button');
        await page.waitForTimeout(300);
        await page.click('.mdl-object-picker-card:has-text("Analogue clock")');
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
        expect(placed.name).toBe('Analogue clock');
        expect(placed.componentType).toBe('analogue-clock');
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
        expect(readRotation(before[2])).toBeCloseTo(90, 3);

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
            shape.setPropertyCommand('showNumbers', false);
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
                duplicateCount: duplicated.length,
                duplicateComponent: duplicated[1].getComponentType()
            };
        });
        expect(roundTrip.serializedType).toBe('ComponentShape');
        expect(roundTrip.serializedSchemaVersion).toBe('1.0.0');
        expect(roundTrip.serializedComponent).toBe('analogue-clock');
        expect(roundTrip.serializedFaceColor).toBe('#ffec99');
        expect(roundTrip.reloadedFaceColor).toBe('#ffec99');
        expect(roundTrip.reloadedFaceFill).toBe('#ffec99');
        expect(readRotation(roundTrip.reloadedHandRotation)).toBeCloseTo(105, 3);
        expect(roundTrip.duplicateCount).toBe(2);
        expect(roundTrip.duplicateComponent).toBe('analogue-clock');
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

    test('drags a hand to write back into the model when interactive', async ({ page }) => {
        await setupBoard(page);
        await addEditableClockEquations(page);
        await addClock(page);
        const beforeMinute = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ interactive: true, showSecondHand: false });
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
            shape.setProperties({ interactive: true, showSecondHand: false, interactableForUsers: false });
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
            shape.setProperties({ showMillisecondHand: true });
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
            shape.setProperties({ showMillisecondHand: true });
            shape.draw();
        });
        await page.waitForTimeout(300);
        expect(await readClockDigits(page)).toBe('03:30:15.250');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Clock');
            shape.setProperties({ showSecondHand: false, showMillisecondHand: false });
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
            shape.setProperties({ shownAs: 'digital', showMillisecondHand: true });
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
            shape.setProperties({ shownAs: 'digital', showMillisecondHand: true });
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
        expect(await menu.locator('.mdl-dropdown-list-label').allTextContents()).toEqual(['analogue', 'digital']);
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
        expect(labels).toEqual(['Show seconds', 'Show milliseconds', 'Buttons']);
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
        await pressClockKey(page, 'pause');
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
            const shape = shell.commands.addComponent('analogue-clock', 'Clock');
            shape.setProperties({ x: 240, y: 140, width: 240, height: 280, showControls: true, showMillisecondHand: true });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const readOwn = () => page.evaluate(() => Number(shell.board.shapes.getByName('Clock').properties.secondVariable));
        await pressClockKey(page, 'play');
        await page.waitForTimeout(1200);
        expect(await readOwn()).toBeGreaterThanOrEqual(1);
        await pressClockKey(page, 'pause');
        await page.waitForTimeout(400);
        const held = await readOwn();
        expect(held).toBeGreaterThanOrEqual(1);
        await pressClockKey(page, 'stop');
        await page.waitForTimeout(300);
        expect(await readOwn()).toBe(0);
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
        const input = page.locator('.mdl-shape-overlay-popup').last().locator('.dx-texteditor-input').first();
        await input.click();
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
        const input = page.locator('.mdl-shape-overlay-popup').last().locator('.dx-texteditor-input').first();
        await input.click();
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
        await expect(rows.nth(0).locator('.shape-term-mode .dx-button')).toHaveCount(2);
        await expect(rows.nth(0).locator('.shape-term-extra-term')).toHaveCount(0);
        await expect(rows.nth(0).locator('.shape-term-color')).toHaveCount(1);
        await expect(rows.nth(1).locator('.shape-term-extra-term')).toHaveCount(1);
        await expect(rows.nth(2).locator('.shape-term-extra-term')).toHaveCount(0);
    });

    test('a row turns into an orientation from its own buttons, and back again', async ({ page }) => {
        await setupBoard(page);
        await addClockEquations(page, 'heading=120\\\\east=3\\\\north=4');
        await addCompassWithPointers(page, [{ term: 'heading', case: 1, color: '', secondTerm: '' }]);
        await openPointersMenu(page);
        const firstRow = () => page.locator('.mdl-shape-overlay-popup').last().locator('.component-terms-control .shape-term-row').first();
        await firstRow().locator('.shape-term-mode .dx-button').nth(1).click();
        await page.waitForTimeout(500);
        expect((await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers))[0].mode).toBe('orientation');
        await expect(firstRow().locator('.shape-term-extra-term')).toHaveCount(1);
        await firstRow().locator('.shape-term-mode .dx-button').nth(0).click();
        await page.waitForTimeout(500);
        const pointers = await page.evaluate(() => shell.board.shapes.getByName('Compass').properties.pointers);
        expect(pointers[0].mode).toBe('angle');
        expect(pointers[0].secondTerm).toBe('');
        await expect(firstRow().locator('.shape-term-extra-term')).toHaveCount(0);
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
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        await popup.locator('.component-terms-control .shape-term-row .shape-term-mode .dx-button').nth(1).click();
        await page.waitForTimeout(500);
        await page.locator('.mdl-shape-overlay-popup').last().locator('.component-terms-control .shape-term-row .shape-term-extra-term').first().click();
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
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        await popup.locator('.component-terms-control .shape-term-row .shape-term-term').first().click();
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
