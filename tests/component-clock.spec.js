const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell.board !== null, null, { timeout: 15000 });
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
