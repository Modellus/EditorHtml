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

async function addClockEquations(page, expression = 'hour=3\\\\minute=30\\\\second=15') {
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
        shape.setProperties({ x: 240, y: 160, width: 200, height: 200, hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' });
        shape.draw();
    });
    await page.waitForTimeout(300);
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
        const labels = await page.$$eval('.mdl-shape-overlay-popup .mdl-dropdown-list-label, .mdl-shape-overlay-popup .mdl-dropdown-list-stacked-label',
            elements => elements.map(element => element.textContent.trim()));
        expect(labels).toContain('Show second hand');
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
        expect(counts.switches).toBe(4);

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
        await page.click('.mdl-dropdown-list-label:has-text("Analogue clock")');
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
                .find(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate('));
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
            const rows = Array.from(popups[popups.length - 1].querySelectorAll('.mdl-dropdown-list-stacked-control, .mdl-dropdown-list-control'));
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
