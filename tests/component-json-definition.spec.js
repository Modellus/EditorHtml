const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BOARD_URL = '/pages/board/index.html';
// Captured from the create() functions that used to build these components, before the JSON
// definitions replaced them. They are the proof that the declarative form draws the same thing.
// The compass entries were re-recorded when its rose gained a drag ring: that ring draws nothing,
// so only the invisible node and the behaviours it carries separate them from the captured ones.
// They were re-recorded a second time, and stopped being captures at all, when the rose became
// imported SVG art: the compass deliberately draws something the create() function never could,
// so its five entries are the drawing as it stands rather than proof of the port. They were
// re-recorded a third time when the compass gained its pointer ring: a compass that has been given
// no direction to mark draws an empty group where the markers would stand, and the nodes after it
// are numbered one place further along. Every other component here is still held to what its
// deleted create() drew.
// The font in them was rewritten once, when the text primitive stopped naming a family of its own
// and took the board's from the design tokens; every coordinate is still the captured one.
// The six entries carrying a drag were re-recorded again when the drag behaviours gained the pair of
// inputs that let one write a direction: the drawings are identical, and what changed is the two new
// names standing empty in the behaviour the signature carries beside them.
// The four entries that show a unit were re-recorded when the unit stopped being concatenated into
// the reading: it is written after it the way a unit is written everywhere else on the board, in a
// tspan of its own so it can be faded, and the entries showing no unit are byte for byte the ones
// that were captured.
const BASELINES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'coded-component-baselines.json'), 'utf8'));

const cases = [
    { key: 'compass/degrees-on', componentType: 'compass', overrides: { headingVariable: 'heading', rotationVariable: 'turn', showDegrees: true }, size: 200 },
    { key: 'compass/degrees-off', componentType: 'compass', overrides: { headingVariable: 'heading', rotationVariable: 'turn', showDegrees: false }, size: 200 },
    { key: 'compass/unbound', componentType: 'compass', overrides: {}, size: 200 },
    { key: 'compass/small', componentType: 'compass', overrides: { headingVariable: 'heading', rotationVariable: 'turn', showDegrees: true }, size: 120 },
    { key: 'compass/large', componentType: 'compass', overrides: { headingVariable: 'heading', rotationVariable: 'turn', showDegrees: true }, size: 320 },
    { key: 'clock/all-on', componentType: 'clock', overrides: { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' }, size: 200 },
    { key: 'clock/bare', componentType: 'clock', overrides: { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', secondColor: 'transparent', numberColor: 'transparent' }, size: 200 },
    { key: 'clock/interactive', componentType: 'clock', overrides: { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' }, size: 200 },
    { key: 'clock/numbers-only', componentType: 'clock', overrides: { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second', secondColor: 'transparent' }, size: 200 },
    { key: 'speedometer/default', componentType: 'speedometer', overrides: { valueVariable: 'speed', unit: 'km/h' }, size: 200 },
    { key: 'speedometer/no-readout', componentType: 'speedometer', overrides: { valueVariable: 'speed', showReadout: false }, size: 200 },
    { key: 'speedometer/no-unit-decimals', componentType: 'speedometer', overrides: { valueVariable: 'speed', digits: 2 }, size: 200 },
    { key: 'speedometer/custom-scale', componentType: 'speedometer', overrides: { valueVariable: 'speed', minimum: -50, maximum: 50, startAngle: 200, endAngle: -20, majorTicks: 5, minorPerMajor: 2, digits: 1, unit: 'm/s' }, size: 260 },
    { key: 'speedometer/flat-range', componentType: 'speedometer', overrides: { valueVariable: 'speed', minimum: 10, maximum: 10 }, size: 200 },
    { key: 'speedometer/unbound', componentType: 'speedometer', overrides: {}, size: 200 },
    { key: 'circular-gauge/default', componentType: 'circular-gauge', overrides: { valueVariable: 'speed', unit: '%' }, size: 200 },
    { key: 'circular-gauge/partial-span', componentType: 'circular-gauge', overrides: { valueVariable: 'speed', spanAngle: 270, startAngle: 135, thickness: 0.4, digits: 1, unit: 'kPa' }, size: 200 },
    { key: 'circular-gauge/no-readout', componentType: 'circular-gauge', overrides: { valueVariable: 'speed', showReadout: false }, size: 160 },
    { key: 'circular-gauge/flat-range', componentType: 'circular-gauge', overrides: { valueVariable: 'speed', minimum: 5, maximum: 5 }, size: 200 },
    { key: 'circular-gauge/over-max', componentType: 'circular-gauge', overrides: { valueVariable: 'speed', minimum: 0, maximum: 10 }, size: 200 },
    { key: 'rotating-vector/default', componentType: 'rotating-vector', overrides: { angleVariable: 'angle', lengthVariable: 'radius', lengthScale: 60 }, size: 200 },
    { key: 'rotating-vector/projections', componentType: 'rotating-vector', overrides: { angleVariable: 'angle', lengthVariable: 'radius', lengthScale: 60, showProjections: true }, size: 200 },
    { key: 'rotating-vector/no-circle', componentType: 'rotating-vector', overrides: { angleVariable: 'angle', lengthVariable: 'radius', lengthScale: 60, showCircle: false, showProjections: true }, size: 240 },
    { key: 'rotating-vector/clamped', componentType: 'rotating-vector', overrides: { angleVariable: 'angle', lengthVariable: 'radius', lengthScale: 5000 }, size: 200 },
    { key: 'rotating-vector/unbound', componentType: 'rotating-vector', overrides: {}, size: 200 },
    { key: 'orbit-system/default', componentType: 'orbit-system', overrides: { timeVariable: 'tempo' }, size: 200 },
    { key: 'orbit-system/four-bodies', componentType: 'orbit-system', overrides: { timeVariable: 'tempo', bodyCount: 4, period1: 2, period2: 3, period3: 5, period4: 7 }, size: 260 },
    { key: 'orbit-system/no-orbits', componentType: 'orbit-system', overrides: { timeVariable: 'tempo', bodyCount: 2, showOrbits: false }, size: 200 },
    { key: 'orbit-system/no-bodies', componentType: 'orbit-system', overrides: { timeVariable: 'tempo', bodyCount: 0 }, size: 200 },
    { key: 'orbit-system/one-body', componentType: 'orbit-system', overrides: { timeVariable: 'tempo', bodyCount: 1 }, size: 180 }
];

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.evaluate(() => modellus.shape.addExpression('Values'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Values').properties.expression = 'heading=120\\\\turn=35\\\\hour=10\\\\minute=8\\\\second=42\\\\speed=64.5\\\\angle=35\\\\radius=1.2\\\\tempo=3';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

async function buildSignatures(page, wanted) {
    return page.evaluate(wanted => {
        const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
        const built = {};
        for (const entry of wanted) {
            const definition = BlockObjects.createComponentInstance(entry.componentType);
            const compilation = compiler.compile(definition, {
                width: entry.size,
                height: entry.size,
                parameters: Object.assign(BlockObjects.getInstancePropertyDefaults(entry.componentType), entry.overrides),
                tokens: new BlockTokens('standard')
            });
            built[entry.key] = {
                signature: BlockRenderer.buildSignature(compilation.nodes),
                diagnostics: compilation.diagnostics.map(diagnostic => `${diagnostic.code} ${diagnostic.path}`)
            };
        }
        return built;
    }, wanted);
}

test.describe('components built from JSON definitions', () => {
    test('draw exactly what the deleted create() functions drew', async ({ page }) => {
        await setupBoard(page);
        const built = await buildSignatures(page, cases);
        for (const testCase of cases) {
            expect(BASELINES[testCase.key], `${testCase.key} has a baseline`).toBeTruthy();
            expect(built[testCase.key].diagnostics, testCase.key).toEqual([]);
            expect(built[testCase.key].signature, testCase.key).toBe(BASELINES[testCase.key]);
        }
    });

    test('are registered by the page itself, with no coded fallback left', async ({ page }) => {
        await setupBoard(page);
        const registrations = await page.evaluate(() => ['compass', 'clock', 'speedometer', 'circular-gauge', 'rotating-vector', 'orbit-system'].map(type => {
            const registration = BlockRegistry.get(type);
            return {
                type: type,
                category: registration?.category ?? null,
                displayName: registration?.displayName ?? null,
                parameterIds: (registration?.parameters ?? []).map(parameter => parameter.id),
                inBlockComponents: typeof BlockComponentHelpers === 'object' && String(BlockRegistry.get(type)?.create ?? '').includes('BlockComponentHelpers')
            };
        }));
        expect(registrations[0].category).toBe('component');
        expect(registrations[0].displayName).toBe('Compass');
        expect(registrations[0].parameterIds).toContain('rotationVariable');
        expect(registrations[1].displayName).toBe('Clock');
        expect(registrations[1].parameterIds).toContain('showControls');
        expect(registrations[3].displayName).toBe('Circular gauge');
        expect(registrations[5].parameterIds).toContain('period4');
        for (const registration of registrations)
            expect(registration.inBlockComponents, `${registration.type} must come from JSON`).toBe(false);
    });

    test('the loader refuses definitions it cannot trust', async ({ page }) => {
        await setupBoard(page);
        const problems = await page.evaluate(() => ({
            badVersion: BlockDefinitionLoader.inspect({ schemaVersion: '0.1.0', type: 'thing-one', category: 'component', root: {} }),
            badType: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'Thing One', category: 'component', root: {} }),
            notComponent: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'primitive', root: {} }),
            noRoot: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component' }),
            collidingLocal: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component', root: {}, parameters: [{ id: 'size' }], locals: [{ id: 'size' }] }),
            undeclaredInLocal: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component', root: {}, locals: [{ id: 'r', formula: '\\frac{w}{2}' }] }),
            undeclaredInTree: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component', locals: [{ id: 'r', value: 4 }], root: { id: 'root', type: 'group', children: [{ id: 'dot', type: 'circle', bindings: { radius: { formula: 'r\\cdot scale' } } }] } }),
            forwardReference: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component', root: {}, locals: [{ id: 'a', formula: 'b+1' }, { id: 'b', value: 2 }] }),
            declaredSizeIsFine: BlockDefinitionLoader.inspect({ schemaVersion: '1.0.0', type: 'thing-one', category: 'component', root: {}, locals: [{ id: 'w', value: { parameter: '$width' } }, { id: 'r', formula: '\\frac{w}{2}' }] })
        }));
        expect(problems.badVersion).toHaveLength(1);
        expect(problems.badType).toHaveLength(1);
        expect(problems.notComponent).toHaveLength(1);
        expect(problems.noRoot).toHaveLength(1);
        expect(problems.collidingLocal).toHaveLength(1);
        expect(problems.undeclaredInLocal[0]).toContain('"w"');
        expect(problems.undeclaredInTree[0]).toContain('"scale"');
        expect(problems.forwardReference[0]).toContain('"b"');
        expect(problems.declaredSizeIsFine).toEqual([]);
    });

    test('a definition edited at runtime changes what the board draws', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const original = BlockRegistry.get('compass');
            const edited = JSON.parse(JSON.stringify(BlockDefinitionLoader.getDocument('compass')));
            edited.locals.find(local => local.id === 'cardinalFontSize').formula = '\\max\\left(\\frac{8}{k},32\\right)';
            BlockDefinitionLoader.register(edited, BlockRegistry);
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const build = () => {
                const compilation = compiler.compile(BlockObjects.createComponentInstance('compass'), {
                    width: 200, height: 200,
                    parameters: BlockObjects.getInstancePropertyDefaults('compass'),
                    tokens: new BlockTokens('standard')
                });
                return BlockRenderer.toMarkup(compilation.nodes);
            };
            const editedMarkup = build();
            BlockRegistry.register(original);
            return { editedMarkup: editedMarkup, restoredMarkup: build() };
        });
        expect(result.editedMarkup).not.toBe(result.restoredMarkup);
    });
});
