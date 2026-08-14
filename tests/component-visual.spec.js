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

async function addModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Values'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Values').properties.expression = 'hour=10\\\\minute=8\\\\second=42\\\\heading=120\\\\speed=64\\\\angle=35\\\\radius=1\\\\tempo=3';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

async function compileMarkup(page, componentType, preset, size, overrides = {}) {
    return page.evaluate(({ componentType, preset, size, overrides }) => {
        const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
        const definition = BlockObjects.createComponentInstance(componentType, { preset: preset });
        const parameters = BlockObjects.getInstancePropertyDefaults(componentType, preset);
        const modelParameters = {
            'analogue-clock': { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' },
            compass: { headingVariable: 'heading' },
            speedometer: { valueVariable: 'speed', unit: 'km/h' },
            'circular-gauge': { valueVariable: 'speed', unit: '%' },
            'rotating-vector': { angleVariable: 'angle', lengthVariable: 'radius', lengthScale: 60, showProjections: true },
            'orbit-system': { timeVariable: 'tempo' },
            'steering-wheel': { angleVariable: 'angle' },
            'accelerator-brake': { acceleratorVariable: 'speed', brakeVariable: 'angle' }
        };
        Object.assign(parameters, modelParameters[componentType] ?? {}, overrides);
        const compilation = compiler.compile(definition, { width: size, height: size, parameters: parameters, tokens: new BlockTokens(preset) });
        return BlockRenderer.toStandaloneSvg(compilation.nodes, size, size, 'none');
    }, { componentType, preset, size, overrides });
}

test.describe('component visual snapshots', () => {
    const components = ['analogue-clock', 'compass', 'speedometer', 'circular-gauge', 'rotating-vector', 'orbit-system'];

    for (const componentType of components) {
        test(`${componentType} renders identical markup for the same values`, async ({ page }) => {
            await setupBoard(page);
            await addModel(page);
            const markup = await compileMarkup(page, componentType, 'standard', 200);
            expect(markup).toMatchSnapshot(`${componentType}-standard.svg`);
        });
    }

    for (const wheelType of ['car', 'motor bike', 'boat']) {
        test(`steering wheel drawn as a ${wheelType} renders identical markup for the same values`, async ({ page }) => {
            await setupBoard(page);
            await addModel(page);
            const markup = await compileMarkup(page, 'steering-wheel', 'standard', 200, { wheelType: wheelType });
            expect(markup).toMatchSnapshot(`steering-wheel-${wheelType.replace(' ', '-')}.svg`);
        });
    }

    for (const vehicleType of ['car', 'boat']) {
        test(`the accelerator and brake of a ${vehicleType} renders identical markup for the same values`, async ({ page }) => {
            await setupBoard(page);
            await addModel(page);
            const markup = await compileMarkup(page, 'accelerator-brake', 'standard', 200, { vehicleType: vehicleType });
            expect(markup).toMatchSnapshot(`accelerator-brake-${vehicleType.replace(' ', '-')}.svg`);
        });
    }

    for (const preset of ['minimal', 'scientific', 'classroom', 'high-contrast']) {
        test(`speedometer preset ${preset} is stable`, async ({ page }) => {
            await setupBoard(page);
            await addModel(page);
            const markup = await compileMarkup(page, 'speedometer', preset, 200);
            expect(markup).toMatchSnapshot(`speedometer-${preset}.svg`);
        });
    }

    test('clock markup is stable across sizes', async ({ page }) => {
        await setupBoard(page);
        await addModel(page);
        for (const size of [120, 200, 320]) {
            const markup = await compileMarkup(page, 'analogue-clock', 'standard', size);
            expect(markup).toMatchSnapshot(`analogue-clock-${size}.svg`);
        }
    });

    test('clock on the board looks the same plain, selected and zoomed', async ({ page }) => {
        await setupBoard(page);
        await addModel(page);
        await page.evaluate(() => {
            document.querySelectorAll('svg .shape-context-toolbar').forEach(node => node.remove());
            const shape = shell.commands.addComponent('analogue-clock', 'Clock');
            shape.setProperties({ x: 60, y: 60, width: 200, height: 200, hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' });
            shape.draw();
            shell.board.deselect();
        });
        await page.waitForTimeout(400);
        const clock = page.locator('#svg > g').last();
        await expect(clock).toHaveScreenshot('clock-board.png');
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Clock')));
        await page.waitForTimeout(300);
        const selectionHandles = await page.evaluate(() => shell.board.shapes.getByName('Clock').handleElements.length);
        expect(selectionHandles).toBe(6);
        await page.evaluate(() => {
            shell.board.deselect();
            shell.board.shapes.getByName('Clock').setProperties({ width: 400, height: 400 });
            shell.board.shapes.getByName('Clock').draw();
        });
        await page.waitForTimeout(400);
        await expect(page.locator('#svg > g').last()).toHaveScreenshot('clock-board-large.png');
    });
});
