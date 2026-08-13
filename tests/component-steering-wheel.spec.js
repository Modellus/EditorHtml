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

async function addSteeringModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Steering equations'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Steering equations').properties.expression = '\\frac{dsteer}{dt}=0\\\\\\frac{dacross}{dt}=0\\\\\\frac{dup}{dt}=0';
        shell.reset();
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        shell.board.calculator.setTermValue('steer', 30, 1, 1);
        shell.board.calculator.setTermValue('across', 3, 1, 1);
        shell.board.calculator.setTermValue('up', 3, 1, 1);
        shell.board.calculator.calculate();
        shell.board.forceRefresh();
    });
    await page.waitForTimeout(300);
}

async function addSteeringWheel(page, wheelType) {
    await page.evaluate(wheelType => {
        const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
        shape.setProperties({ x: 240, y: 160, width: 200, height: 200, angleVariable: 'steer', wheelType: wheelType });
        shape.draw();
    }, wheelType);
    await page.waitForTimeout(300);
}

async function buildDrawing(page, overrides, size = 200) {
    return page.evaluate(({ overrides, size }) => {
        const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
        const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), overrides);
        const context = { width: size, height: size, parameters: parameters, tokens: new BlockTokens('standard') };
        const definition = BlockObjects.createComponentInstance('steering-wheel');
        const compilation = compiler.compile(definition, context);
        const validation = new BlockValidator(BlockRegistry, compiler).validate(definition, context);
        return {
            markup: BlockRenderer.toMarkup(compilation.nodes),
            diagnostics: compilation.diagnostics.map(diagnostic => diagnostic.code),
            errors: validation.errors.map(error => error.code),
            warnings: validation.warnings.map(warning => warning.code)
        };
    }, { overrides, size });
}

function sourceIds(markup) {
    return Array.from(markup.matchAll(/data-source-id="([^"]+)"/g)).map(match => match[1]);
}

test.describe('steering wheel component', () => {
    test('draws the wheel the chosen type names and nothing of the other two', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const drawings = {
            car: await buildDrawing(page, { angleVariable: 'steer', wheelType: 'car' }),
            motorBike: await buildDrawing(page, { angleVariable: 'steer', wheelType: 'motor bike' }),
            boat: await buildDrawing(page, { angleVariable: 'steer', wheelType: 'boat' })
        };
        for (const drawing of Object.values(drawings)) {
            expect(drawing.diagnostics).toEqual([]);
            expect(drawing.errors).toEqual([]);
            expect(drawing.warnings).toEqual([]);
        }
        expect(sourceIds(drawings.car.markup)).toEqual(['steering-wheel', 'art', 'wheel', 'car', 'car-rim', 'car-spoke-left', 'car-spoke-right', 'car-spoke-bottom', 'car-mark', 'car-hub', 'wheel-grab']);
        expect(sourceIds(drawings.motorBike.markup)).toEqual(['steering-wheel', 'art', 'wheel', 'motor-bike', 'bike-stem', 'bike-mark', 'bike-bar', 'bike-grip-left', 'bike-grip-right', 'bike-clamp', 'wheel-grab']);
        expect(sourceIds(drawings.boat.markup).filter(id => id !== 'boat-spoke' && id !== 'boat-spoke-arm' && id !== 'boat-spoke-knob'))
            .toEqual(['steering-wheel', 'art', 'wheel', 'boat', 'boat-rim', 'boat-mark', 'boat-hub', 'boat-hub-pin', 'wheel-grab']);
        expect(sourceIds(drawings.boat.markup).filter(id => id === 'boat-spoke')).toHaveLength(8);
    });

    test('turns with the angle it reads, and keeps the drawing centred as the box changes', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const turned = await buildDrawing(page, { angleVariable: 'steer', wheelType: 'car' });
        const straight = await buildDrawing(page, { angleVariable: '0', wheelType: 'car' });
        const small = await buildDrawing(page, { angleVariable: 'steer', wheelType: 'car' }, 100);
        expect(turned.markup).toContain('rotate(30 100 100)');
        expect(straight.markup).not.toContain('rotate(30 100 100)');
        expect(small.markup).toContain('scale(0.5 0.5)');
        expect(small.diagnostics).toEqual([]);
    });

    test('paints every part from the colours the object declares', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const painted = await buildDrawing(page, { angleVariable: 'steer', wheelType: 'boat', rimColor: '#123456', gripColor: '#654321', hubColor: '#abcdef', markColor: '#fedcba' });
        expect(painted.markup).toContain('#123456');
        expect(painted.markup).toContain('#654321');
        expect(painted.markup).toContain('#abcdef');
        expect(painted.markup).toContain('#fedcba');
        expect(painted.warnings).toEqual([]);
    });

    test('every type inserts on the board and draws something', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const results = await page.evaluate(async () => {
            const created = [];
            for (const wheelType of ['car', 'motor bike', 'boat']) {
                const shape = shell.commands.addComponent('steering-wheel', `Wheel ${wheelType}`);
                shape.setProperties({ x: 60, y: 60, width: 160, height: 160, angleVariable: 'steer', wheelType: wheelType });
                shape.draw();
                await new Promise(resolve => setTimeout(resolve, 80));
                const element = document.getElementById(shape.id);
                created.push({
                    wheelType: wheelType,
                    componentType: shape.getComponentType(),
                    elementCount: element.querySelectorAll('circle, line, rect, path').length,
                    validationErrors: shape.validateComponent().errors.map(error => error.code)
                });
            }
            return created;
        });
        for (const result of results) {
            expect(result.componentType).toBe('steering-wheel');
            expect(result.elementCount, result.wheelType).toBeGreaterThan(1);
            expect(result.validationErrors, result.wheelType).toEqual([]);
        }
    });

    test('turns to where a pair of terms points, measured the way a compass marker is', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const pointed = await buildDrawing(page, { angleVariable: 'across', angleUpVariable: 'up', wheelType: 'car' });
        const straightUp = await buildDrawing(page, { angleVariable: '0', angleUpVariable: '5', wheelType: 'car' });
        const westward = await buildDrawing(page, { angleVariable: '-4', angleUpVariable: '0', wheelType: 'car' });
        const nothingNamed = await buildDrawing(page, { angleVariable: '0', angleUpVariable: '0', wheelType: 'car' });
        expect(pointed.markup).toContain('rotate(45 100 100)');
        expect(pointed.diagnostics).toEqual([]);
        expect(straightUp.markup).toContain('rotate(0 100 100)');
        expect(westward.markup).toContain('rotate(-90 100 100)');
        expect(nothingNamed.markup).toContain('rotate(0 100 100)');
    });

    test('a wheel pointed by a pair is not turned by hand, so a drag cannot fight the model', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const byAngle = await buildDrawing(page, { angleVariable: 'steer', wheelType: 'car' });
        const byPair = await buildDrawing(page, { angleVariable: 'across', angleUpVariable: 'up', wheelType: 'car' });
        expect(sourceIds(byAngle.markup)).toContain('wheel-grab');
        expect(sourceIds(byPair.markup)).not.toContain('wheel-grab');
        expect(byPair.errors).toEqual([]);
    });

    test('the angle row offers a second selector for the pair it can be pointed by', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        await expect(popup.locator('.term-packed-control--pair')).toHaveCount(1);
        await expect(popup.locator('.term-packed-control--pair .shape-term-extra-term')).toHaveCount(1);
    });

    test('the type is chosen from a button group of icons, one at a time', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(500);
        const buttons = page.locator('.mdl-shape-overlay-popup').last().locator('.mdl-component-enum-buttons .dx-button');
        await expect(buttons).toHaveCount(3);
        const icons = await buttons.evaluateAll(elements => elements.map(element => element.querySelector('i')?.className ?? ''));
        expect(icons[0]).toContain('fa-car');
        expect(icons[1]).toContain('fa-motorcycle');
        expect(icons[2]).toContain('fa-sailboat');
        const selectedBefore = await buttons.evaluateAll(elements => elements.map(element => element.classList.contains('dx-item-selected')));
        expect(selectedBefore).toEqual([true, false, false]);
        await buttons.nth(2).click();
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Wheel').properties.wheelType)).toBe('boat');
        const drawnIds = await page.evaluate(() => Array.from(document.getElementById(shell.board.shapes.getByName('Wheel').id).querySelectorAll('[data-source-id]')).map(element => element.getAttribute('data-source-id')));
        expect(drawnIds).toContain('boat-rim');
        expect(drawnIds).not.toContain('car-rim');
    });

    test('dragging the rim turns the wheel and writes the angle back', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wheel');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x, centre.y - 80).matrixTransform(matrix);
            const target = new DOMPoint(centre.x + 80, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const steer = await page.evaluate(() => shell.board.calculator.getByName('steer', 1));
        expect(steer).toBeCloseTo(120, 0);
    });
});
