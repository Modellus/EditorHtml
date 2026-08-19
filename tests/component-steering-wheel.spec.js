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
        shell.board.shapes.getByName('Steering equations').properties.expression = '\\frac{dsteer}{dt}=0\\\\\\frac{dacross}{dt}=0\\\\\\frac{dup}{dt}=0\\\\computed=45';
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
        // An angle is measured the way the model measures one, anticlockwise, so a wheel reading 30
        // is drawn turned 30 to the left — which is a rotation of -30 the way SVG counts them.
        expect(turned.markup).toContain('rotate(-30 100 100)');
        expect(straight.markup).not.toContain('rotate(-30 100 100)');
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

    test('turns to where an orientation points, measured the way a compass marker is', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const orientation = overrides => Object.assign({ turnedBy: 'orientation', wheelType: 'car' }, overrides);
        const pointed = await buildDrawing(page, orientation({ angleVariable: 'across', angleUpVariable: 'up' }));
        const straightUp = await buildDrawing(page, orientation({ angleVariable: '0', angleUpVariable: '5' }));
        const westward = await buildDrawing(page, orientation({ angleVariable: '-4', angleUpVariable: '0' }));
        const nothingNamed = await buildDrawing(page, orientation({ angleVariable: '0', angleUpVariable: '0' }));
        expect(pointed.markup).toContain('rotate(45 100 100)');
        expect(pointed.diagnostics).toEqual([]);
        expect(straightUp.markup).toContain('rotate(0 100 100)');
        expect(westward.markup).toContain('rotate(-90 100 100)');
        expect(nothingNamed.markup).toContain('rotate(0 100 100)');
    });

    test('the grab ring is there either way, carrying the drag that belongs to the way chosen', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const byAngle = await buildDrawing(page, { angleVariable: 'steer', wheelType: 'car' });
        const byOrientation = await buildDrawing(page, { turnedBy: 'orientation', angleVariable: 'across', angleUpVariable: 'up', wheelType: 'car' });
        expect(sourceIds(byAngle.markup)).toContain('wheel-grab');
        expect(sourceIds(byOrientation.markup)).toContain('wheel-grab');
        expect(byOrientation.errors).toEqual([]);
        const behaviours = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const read = overrides => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), overrides);
                const compilation = compiler.compile(BlockObjects.createComponentInstance('steering-wheel'), { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') });
                const grab = BlockRenderer.flatten(compilation.nodes).find(node => node.sourceId === 'wheel-grab');
                return (grab.behaviours ?? []).map(behaviour => ({ type: behaviour.type, variable: behaviour.input.variable, vertical: behaviour.input.verticalVariable ?? '' }));
            };
            return {
                angle: read({ angleVariable: 'steer' }),
                orientation: read({ turnedBy: 'orientation', angleVariable: 'across', angleUpVariable: 'up' })
            };
        });
        expect(behaviours.angle).toEqual([{ type: 'drag-angle', variable: 'steer', vertical: '' }]);
        expect(behaviours.orientation).toEqual([{ type: 'drag-angle', variable: 'across', vertical: 'up' }]);
    });

    // The wheel is pointed at the pointer rather than turned by however far the pointer travelled, and
    // the angle it writes is measured from straight up: zero is at twelve o'clock, and it is read the
    // short way round from there, so the left of the top is above zero and the right of it below.
    test('the wheel points where it is dragged, measured from twelve o\'clock', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, wheelType: 'car', angleVariable: '0' });
            shape.draw();
        });
        await page.waitForTimeout(400);
        const centre = await page.evaluate(() => {
            const box = shell.board.shapes.getByName('Wheel').element.querySelector('[data-source-id="wheel-grab"]').getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2, reach: box.width * 0.375 };
        });
        const read = () => page.evaluate(() => ({
            transform: shell.board.shapes.getByName('Wheel').element.querySelector('[data-source-id="wheel"]').getAttribute('transform'),
            value: Number(shell.board.shapes.getByName('Wheel').properties.angleVariable)
        }));
        const pointAt = async degreesFromTheTop => {
            const radians = degreesFromTheTop * Math.PI / 180;
            await page.mouse.move(centre.x + Math.sin(radians) * centre.reach, centre.y - Math.cos(radians) * centre.reach, { steps: 5 });
            await page.waitForTimeout(150);
            return read();
        };
        // Zero is straight up, and it stays there while nothing has been dragged.
        expect(await read()).toEqual({ transform: 'rotate(0 100 100)', value: 0 });
        // The grab itself points the wheel: pressing at three o'clock takes it there at once, which is
        // a quarter turn to the right and so a quarter below zero.
        await page.mouse.move(centre.x + centre.reach, centre.y);
        await page.mouse.down();
        await page.waitForTimeout(150);
        expect(await read()).toEqual({ transform: 'rotate(90 100 100)', value: -90 });
        // Either side of the top is read the short way round, so neither is nearly a whole turn away.
        expect(await pointAt(-10)).toEqual({ transform: 'rotate(-10 100 100)', value: 10 });
        expect(await pointAt(10)).toEqual({ transform: 'rotate(10 100 100)', value: -10 });
        expect(await pointAt(0)).toEqual({ transform: 'rotate(0 100 100)', value: 0 });
        expect(await pointAt(-90)).toEqual({ transform: 'rotate(-90 100 100)', value: 90 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        expect(await read()).toEqual({ transform: 'rotate(-90 100 100)', value: 90 });
    });

    // Pointed by a pair the drag measures from twelve o'clock just the same, and what it writes is the
    // pair laid down again along the way the wheel was pointed, keeping the length it already had.
    test('a wheel pointed by a pair lays it down where it is dragged, from twelve o\'clock', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, wheelType: 'car', turnedBy: 'orientation', angleVariable: '3', angleUpVariable: '4' });
            shape.draw();
        });
        await page.waitForTimeout(400);
        const centre = await page.evaluate(() => {
            const box = shell.board.shapes.getByName('Wheel').element.querySelector('[data-source-id="wheel-grab"]').getBoundingClientRect();
            return { x: box.x + box.width / 2, y: box.y + box.height / 2, reach: box.width * 0.375 };
        });
        const pair = () => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wheel');
            return [Number(shape.properties.angleVariable), Number(shape.properties.angleUpVariable)];
        });
        await page.mouse.move(centre.x, centre.y - centre.reach);
        await page.mouse.down();
        await page.waitForTimeout(150);
        // Three across and four up is a pair five long: pointed straight up it is all up and nothing
        // across, and pointed at three o'clock it is all across.
        expect(await pair()).toEqual([0, 5]);
        await page.mouse.move(centre.x + centre.reach, centre.y, { steps: 5 });
        await page.waitForTimeout(150);
        expect(await pair()).toEqual([5, 0]);
        await page.mouse.up();
    });

    test('the row is read as degrees or as the across half, by the choice alone', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        const row = { angleVariable: 'across', angleUpVariable: 'up', wheelType: 'car' };
        const byAngle = await buildDrawing(page, Object.assign({ turnedBy: 'angle' }, row));
        const byOrientation = await buildDrawing(page, Object.assign({ turnedBy: 'orientation' }, row));
        // The same row read two ways, and the two are measured the other way round from each other:
        // 3 as an angle is 3 to the left, while the pair 3 across and 3 up is a bearing of 45 to the
        // right of straight up.
        expect(byAngle.markup).toContain('rotate(-3 100 100)');
        expect(byOrientation.markup).toContain('rotate(45 100 100)');
    });

    test('a key of its own carries the choice: it picks how the row is read and the selectors follow', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        const modeKey = page.locator('.shape-context-toolbar.visible .mdl-component-mode-selector');
        await expect(modeKey).toHaveCount(1);
        expect(await modeKey.locator('.dx-icon').first().getAttribute('class')).toContain('fa-angle');
        await modeKey.click();
        await page.waitForTimeout(500);
        const choices = page.locator('.mdl-shape-overlay-popup').last().locator('.dx-list-item');
        await expect(choices).toHaveCount(2);
        const choiceIcons = await choices.evaluateAll(elements => elements.map(element => element.querySelector('i')?.className ?? ''));
        expect(choiceIcons[0]).toContain('fa-angle');
        expect(choiceIcons[1]).toContain('fa-arrow-up-right');
        expect(await choices.evaluateAll(elements => elements.map(element => element.textContent.trim()))).toEqual(['Angle', 'Orientation']);
        await choices.nth(1).click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Wheel').properties.turnedBy)).toBe('orientation');
        expect(await modeKey.locator('.dx-icon').first().getAttribute('class')).toContain('fa-arrow-up-right');
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        await expect(popup.locator('.shape-term-mode')).toHaveCount(0);
        await expect(popup.locator('.shape-term-extra-term')).toHaveCount(1);
        await page.keyboard.press('Escape');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await modeKey.click();
        await page.waitForTimeout(500);
        await page.locator('.mdl-shape-overlay-popup').last().locator('.dx-list-item').first().click();
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Wheel').properties.turnedBy)).toBe('angle');
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        await expect(page.locator('.mdl-shape-overlay-popup').last().locator('.shape-term-extra-term')).toHaveCount(0);
    });

    test('the toolbar reads one value as an angle and both as an orientation', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, angleVariable: 'across', angleUpVariable: 'up' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        const readKey = () => page.evaluate(() => Array.from(document.querySelectorAll('.shape-context-toolbar.visible .mdl-component-model-selector .mdl-name-btn-term')).map(element => element.textContent.trim()));
        expect(await readKey()).toEqual(['across']);
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setPropertyCommand('turnedBy', 'orientation'));
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').refreshComponentToolbarControls());
        await page.waitForTimeout(400);
        expect(await readKey()).toEqual(['across', 'up']);
    });

    test('the choice is dressed exactly as the player dresses its angle unit, on a row that paints nothing', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(500);
        const rowBackground = await page.evaluate(() => getComputedStyle(document.querySelector('.mdl-shape-overlay-popup .term-packed-control')).backgroundColor);
        expect(rowBackground).toBe('rgba(0, 0, 0, 0)');
        await page.keyboard.press('Escape');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-settings-selector').click();
        await page.waitForTimeout(500);
        const readGroup = () => page.evaluate(() => {
            const groups = Array.from(document.querySelectorAll('.mdl-pill-group'));
            const group = groups[groups.length - 1];
            const icon = group.querySelector('.dx-icon');
            return {
                outlined: group.classList.contains('dx-buttongroup-mode-outlined'),
                smallIcon: group.classList.contains('mdl-small-icon'),
                background: getComputedStyle(group).backgroundColor,
                iconSize: getComputedStyle(icon).fontSize,
                iconWeight: getComputedStyle(icon).fontWeight,
                pill: !!group.querySelector('.mdl-pill')
            };
        });
        const wheel = await readGroup();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        await page.click('#independentDropDown');
        await page.waitForTimeout(700);
        const player = await readGroup();
        expect(wheel).toEqual(player);
        expect(wheel.background).toBe('rgba(0, 0, 0, 0)');
    });

    test('the row carries the colour of the mark, and every part of it sits on one line', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        await page.evaluate(() => shell.board.shapes.getByName('Wheel').setProperties({ markColor: '#00a5ff' }));
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Wheel')));
        await page.waitForTimeout(400);
        await page.locator('.shape-context-toolbar.visible .mdl-component-model-selector').click();
        await page.waitForTimeout(600);
        const popup = page.locator('.mdl-shape-overlay-popup').last();
        await expect(popup.locator('.shape-term-color')).toHaveCount(1);
        const row = await page.evaluate(() => {
            const parts = Array.from(document.querySelectorAll('.mdl-shape-overlay-popup .shape-term-row > *'));
            const centres = parts.map(part => {
                const rect = part.getBoundingClientRect();
                return Math.round(rect.top + rect.height / 2);
            });
            const swatch = document.querySelector('.mdl-shape-overlay-popup .shape-term-color .mdl-color-picker-button-icon');
            return { classes: parts.map(part => part.className.split(' ')[0]), centres: centres, swatchColour: getComputedStyle(swatch).color };
        });
        expect(row.classes).toEqual(['shape-term-term', 'shape-term-color']);
        expect(Math.max(...row.centres) - Math.min(...row.centres)).toBeLessThanOrEqual(1);
        expect(row.swatchColour).toBe('rgb(0, 165, 255)');
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

    test('pressing the wheel brings up its toolbar, whether or not the grab can write', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await page.evaluate(() => {
            const writable = shell.commands.addComponent('steering-wheel', 'Writable');
            writable.setProperties({ x: 120, y: 120, width: 200, height: 200, angleVariable: 'steer' });
            writable.draw();
            const readOnly = shell.commands.addComponent('steering-wheel', 'ReadOnly');
            readOnly.setProperties({ x: 420, y: 120, width: 200, height: 200, angleVariable: 'computed' });
            readOnly.draw();
            shell.board.deselect();
        });
        await page.waitForTimeout(400);
        for (const name of ['Writable', 'ReadOnly']) {
            await page.evaluate(() => shell.board.deselect());
            await page.waitForTimeout(200);
            const point = await page.evaluate(name => {
                const shape = shell.board.shapes.getByName(name);
                const matrix = shell.board.svg.getScreenCTM();
                const rim = new DOMPoint(shape.properties.x + shape.properties.width / 2, shape.properties.y + shape.properties.height / 2 - 80).matrixTransform(matrix);
                return { x: rim.x, y: rim.y };
            }, name);
            await page.mouse.move(point.x, point.y);
            await page.mouse.down();
            await page.waitForTimeout(300);
            const held = await page.evaluate(name => ({
                selected: shell.board.selection.selectedShape?.properties?.name ?? null,
                toolbar: !!shell.board.shapes.getByName(name).contextToolbar?.classList.contains('visible')
            }), name);
            await page.mouse.up();
            await page.waitForTimeout(200);
            expect(held.selected, name).toBe(name);
            expect(held.toolbar, name).toBe(true);
        }
    });

    // The wheel is pointed at the pointer, and the angle is measured from straight up: where the drag
    // ends is what gets written back, whatever the wheel happened to be reading before. Turning right
    // lowers the angle, so a wheel left pointing at three o'clock reads a quarter turn below zero even
    // though it stood at thirty when it was grabbed.
    test('dragging the rim points the wheel at the pointer and writes that angle back', async ({ page }) => {
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
        expect(steer).toBeCloseTo(-90, 0);
    });

    // Left pointing at nine o'clock the same wheel reads a quarter turn above zero, which is the same
    // measurement taken the other way round the top.
    test('turning the wheel the other way raises the angle again', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await addSteeringWheel(page, 'car');
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wheel');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x, centre.y - 80).matrixTransform(matrix);
            const target = new DOMPoint(centre.x - 80, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => shell.board.calculator.getByName('steer', 1))).toBeCloseTo(90, 0);
    });

    test('dragging a wheel pointed by an orientation turns the pair and keeps its length', async ({ page }) => {
        await setupBoard(page);
        await addSteeringModel(page);
        await page.evaluate(() => {
            const shape = shell.commands.addComponent('steering-wheel', 'Wheel');
            shape.setProperties({ x: 240, y: 160, width: 200, height: 200, turnedBy: 'orientation', angleVariable: 'across', angleUpVariable: 'up' });
            shape.draw();
        });
        await page.waitForTimeout(300);
        const before = await page.evaluate(() => ({
            across: shell.board.calculator.getByName('across', 1),
            up: shell.board.calculator.getByName('up', 1)
        }));
        expect(Math.hypot(before.across, before.up)).toBeCloseTo(Math.sqrt(18), 3);
        const points = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Wheel');
            const matrix = shell.board.svg.getScreenCTM();
            const centre = { x: shape.properties.x + shape.properties.width / 2, y: shape.properties.y + shape.properties.height / 2 };
            const start = new DOMPoint(centre.x + 57, centre.y - 57).matrixTransform(matrix);
            const target = new DOMPoint(centre.x + 80, centre.y).matrixTransform(matrix);
            return { start: { x: start.x, y: start.y }, target: { x: target.x, y: target.y } };
        });
        await page.mouse.move(points.start.x, points.start.y);
        await page.mouse.down();
        await page.mouse.move(points.target.x, points.target.y, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(300);
        const after = await page.evaluate(() => ({
            across: shell.board.calculator.getByName('across', 1),
            up: shell.board.calculator.getByName('up', 1)
        }));
        expect(Math.hypot(after.across, after.up)).toBeCloseTo(Math.hypot(before.across, before.up), 1);
        expect(Math.atan2(after.across, after.up) * 180 / Math.PI).toBeCloseTo(90, 0);
        expect(after.across).toBeCloseTo(Math.sqrt(18), 1);
        expect(after.up).toBeCloseTo(0, 2);
    });
});
