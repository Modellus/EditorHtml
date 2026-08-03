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

async function addClockModel(page) {
    await page.evaluate(() => modellus.shape.addExpression('Clock equations'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Clock equations').properties.expression = 'hour=3\\\\minute=30\\\\second=15';
        shell.reset();
    });
    await page.waitForTimeout(400);
}

test.describe('building block registry', () => {
    test('registers primitives, modifiers, behaviours and components', async ({ page }) => {
        await setupBoard(page);
        const counts = await page.evaluate(() => ({
            primitives: BlockRegistry.list('primitive').map(entry => entry.type),
            modifiers: BlockRegistry.list('modifier').map(entry => entry.type),
            behaviours: BlockRegistry.list('behaviour').map(entry => entry.type),
            components: BlockRegistry.list('component').map(entry => entry.type)
        }));
        expect(counts.primitives).toEqual(expect.arrayContaining(['circle', 'line', 'polygon', 'arc', 'text', 'group', 'rect', 'path', 'image']));
        expect(counts.modifiers).toEqual(expect.arrayContaining(['rotate', 'translate', 'scale', 'opacity', 'repeat', 'mirror']));
        expect(counts.behaviours).toEqual(expect.arrayContaining(['drag-angle', 'tooltip', 'selectable']));
        expect(counts.components).toEqual(expect.arrayContaining(['analogue-clock', 'compass', 'speedometer', 'rotating-vector', 'orbit-system', 'pointer-hand', 'tick-ring']));
    });

    test('search finds blocks by capability and keyword', async ({ page }) => {
        await setupBoard(page);
        const found = await page.evaluate(() => ({
            byKeyword: BlockRegistry.search('needle').map(entry => entry.type),
            byCapability: BlockRegistry.findByCapability('angular').map(entry => entry.type)
        }));
        expect(found.byKeyword).toContain('pointer-hand');
        expect(found.byCapability).toContain('rotate');
    });

    test('geometry helpers are deterministic', async ({ page }) => {
        await setupBoard(page);
        const geometry = await page.evaluate(() => ({
            east: BlockGeometry.polarPoint(0, 0, 10, 0),
            north: BlockGeometry.polarPoint(0, 0, 10, 90),
            span: BlockGeometry.clockwiseSpan(225, -45),
            angles: BlockGeometry.distributeAngles(4, 90, 360)
        }));
        expect(geometry.east.x).toBeCloseTo(10, 6);
        expect(geometry.east.y).toBeCloseTo(0, 6);
        expect(geometry.north.y).toBeCloseTo(-10, 6);
        expect(geometry.span).toBeCloseTo(270, 6);
        expect(geometry.angles).toEqual([90, 0, -90, -180]);
    });
});

test.describe('bindings', () => {
    test('resolves constants, variables and expressions through the model engine', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const resolved = await page.evaluate(() => {
            const bindings = new BlockBindings(shell.board.calculator);
            const context = { parameters: { hourVariable: 'hour' }, tokens: new BlockTokens(), caseNumber: 1 };
            return {
                constant: bindings.resolve({ constant: 7 }, context),
                variable: bindings.resolve({ variable: 'minute' }, context),
                parameterAsNumber: bindings.resolve({ parameter: 'hourVariable', as: 'number' }, context),
                expression: bindings.resolve({ expression: 'minute\\cdot6' }, context),
                formula: bindings.resolve({
                    formula: '\\left(\\mod\\left(h,12\\right)+\\frac{m}{60}\\right)\\cdot30',
                    inputs: { h: { variable: 'hour' }, m: { variable: 'minute' } }
                }, context),
                dependencies: bindings.getBindingDependencies({ expression: 'hour\\cdot30+minute' })
            };
        });
        expect(resolved.constant).toBe(7);
        expect(resolved.variable).toBe(30);
        expect(resolved.parameterAsNumber).toBe(3);
        expect(resolved.expression).toBe(180);
        expect(resolved.formula).toBeCloseTo(105, 6);
        expect(resolved.dependencies.variables.sort()).toEqual(['hour', 'minute']);
    });

    test('rejects invalid expressions without evaluating code', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const bindings = new BlockBindings(shell.board.calculator);
            return {
                valid: bindings.isValidExpression('minute\\cdot6'),
                invalid: bindings.isValidExpression('minute \\cdot )('),
                error: bindings.getParseError('minute \\cdot )(')
            };
        });
        expect(result.valid).toBe(true);
        expect(result.invalid).toBe(false);
        expect(result.error).toBeTruthy();
    });
});

test.describe('compiler', () => {
    test('compiles a component into primitive render nodes deterministically', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('analogue-clock');
            const parameters = BlockObjects.getInstancePropertyDefaults('analogue-clock');
            parameters.hourVariable = 'hour';
            parameters.minuteVariable = 'minute';
            parameters.secondVariable = 'second';
            const context = { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') };
            const first = compiler.compile(definition, context);
            const second = compiler.compile(definition, context);
            return {
                diagnostics: first.diagnostics,
                nodeCount: first.stats.nodeCount,
                blocksUsed: first.stats.blocksUsed,
                sameMarkup: BlockRenderer.toMarkup(first.nodes) === BlockRenderer.toMarkup(second.nodes),
                tags: Array.from(new Set(BlockRenderer.flatten(first.nodes).map(node => node.tag)))
            };
        });
        expect(result.diagnostics).toEqual([]);
        expect(result.nodeCount).toBeGreaterThan(50);
        expect(result.blocksUsed).toEqual(expect.arrayContaining(['analogue-clock', 'pointer-hand', 'tick-ring', 'label-ring', 'circle', 'line', 'text']));
        expect(result.sameMarkup).toBe(true);
        expect(result.tags.sort()).toEqual(['circle', 'g', 'line', 'polygon', 'text']);
    });

    test('binds hand rotations to model variables through the expression engine', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const rotations = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('analogue-clock');
            const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('analogue-clock'), {
                hourVariable: 'hour',
                minuteVariable: 'minute',
                secondVariable: 'second'
            });
            const compilation = compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') });
            const nodes = BlockRenderer.flatten(compilation.nodes);
            const readRotation = handId => {
                const node = nodes.find(entry => entry.id.includes(handId) && entry.transform.startsWith('rotate('));
                return Number(node.transform.match(/rotate\(([-0-9.]+)/)[1]);
            };
            return {
                hour: readRotation('hour-hand'),
                minute: readRotation('minute-hand'),
                second: readRotation('second-hand')
            };
        });
        expect(rotations.hour).toBeCloseTo(105, 4);
        expect(rotations.minute).toBeCloseTo(180, 4);
        expect(rotations.second).toBeCloseTo(90, 4);
    });

    test('expands repeat modifiers and enforces limits', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const build = count => ({
                schemaVersion: '1.0.0',
                id: 'repeat-test',
                type: 'object',
                name: 'Repeat test',
                root: {
                    id: 'root',
                    type: 'group',
                    children: [{
                        id: 'tick',
                        type: 'line',
                        properties: { x1: 50, y1: 4, x2: 50, y2: 14, stroke: '#000000', strokeWidth: 1 },
                        modifiers: [{ type: 'repeat', count: count, angleStep: 30, centerX: 50, centerY: 50 }]
                    }]
                }
            });
            const ok = compiler.compile(build(12), { width: 100, height: 100 });
            const tooMany = compiler.compile(build(5000), { width: 100, height: 100 });
            return {
                count: BlockRenderer.flatten(ok.nodes).filter(node => node.tag === 'line').length,
                transforms: BlockRenderer.flatten(ok.nodes).filter(node => node.tag === 'line').map(node => node.transform),
                limitError: tooMany.diagnostics.map(diagnostic => diagnostic.code)
            };
        });
        expect(result.count).toBe(12);
        expect(result.transforms[0]).toBe('');
        expect(result.transforms[1]).toContain('rotate(30 50 50)');
        expect(result.limitError).toContain('REPEAT_LIMIT_EXCEEDED');
    });

    test('detects circular custom component references', async ({ page }) => {
        await setupBoard(page);
        const codes = await page.evaluate(() => {
            BlockRegistry.registerCustomComponent({
                type: 'cycle-test',
                category: 'component',
                displayName: 'Cycle test',
                inputSchema: { properties: {} },
                parameters: [],
                create: () => ({ id: 'inner', type: 'cycle-test' })
            });
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(null));
            const compilation = compiler.compile({
                schemaVersion: '1.0.0',
                id: 'cycle',
                type: 'object',
                name: 'Cycle',
                root: { id: 'root', type: 'cycle-test' }
            }, { width: 100, height: 100 });
            return compilation.diagnostics.map(diagnostic => diagnostic.code);
        });
        expect(codes).toContain('CIRCULAR_COMPONENT_REFERENCE');
    });
});

test.describe('validator', () => {
    test('accepts a well formed component instance', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const validation = await page.evaluate(() => {
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator)));
            validator.setCalculator(shell.board.calculator);
            const definition = BlockObjects.createComponentInstance('analogue-clock');
            const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('analogue-clock'), { hourVariable: 'hour', minuteVariable: 'minute', secondVariable: 'second' });
            return validator.validate(definition, { width: 180, height: 180, parameters: parameters });
        });
        expect(validation.errors).toEqual([]);
        expect(validation.valid).toBe(true);
    });

    test('reports structured errors for unknown types, variables and properties', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const errors = await page.evaluate(() => {
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator)));
            validator.setCalculator(shell.board.calculator);
            const result = validator.validate({
                schemaVersion: '1.0.0',
                id: 'broken',
                type: 'object',
                name: 'Broken',
                root: {
                    id: 'root',
                    type: 'group',
                    children: [
                        { id: 'a', type: 'clock-face-widget' },
                        { id: 'b', type: 'circle', properties: { centerX: 10, centreY: 10 } },
                        { id: 'c', type: 'circle', bindings: { radius: { variable: 'minutes' } } },
                        { id: 'c', type: 'circle', properties: { radius: 5 } }
                    ]
                }
            }, { width: 100, height: 100 });
            return result.errors.map(error => ({ code: error.code, path: error.path, suggestion: error.suggestion ?? null }));
        });
        const codes = errors.map(error => error.code);
        expect(codes).toContain('UNKNOWN_NODE_TYPE');
        expect(codes).toContain('UNKNOWN_PROPERTY');
        expect(codes).toContain('UNKNOWN_VARIABLE');
        expect(codes).toContain('DUPLICATE_NODE_ID');
        const unknownVariable = errors.find(error => error.code === 'UNKNOWN_VARIABLE');
        expect(unknownVariable.path).toBe('root.children[2].bindings.radius');
        expect(unknownVariable.suggestion).toBe('minute');
    });

    test('flags empty and invisible objects', async ({ page }) => {
        await setupBoard(page);
        const codes = await page.evaluate(() => {
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(null)));
            const empty = validator.validate({ schemaVersion: '1.0.0', id: 'e', type: 'object', name: 'Empty', root: { id: 'root', type: 'group', children: [] } }, { width: 100, height: 100 });
            const invisible = validator.validate({
                schemaVersion: '1.0.0', id: 'i', type: 'object', name: 'Invisible',
                root: { id: 'root', type: 'group', children: [{ id: 'c', type: 'circle', properties: { radius: 10, fill: 'none', stroke: 'none' } }] }
            }, { width: 100, height: 100 });
            return { empty: empty.errors.map(error => error.code), invisible: invisible.errors.map(error => error.code) };
        });
        expect(codes.empty).toContain('EMPTY_OBJECT');
        expect(codes.invisible).toContain('INVISIBLE_OBJECT');
    });

    test('rejects unsafe image sources and path data', async ({ page }) => {
        await setupBoard(page);
        const codes = await page.evaluate(() => {
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(null)));
            const result = validator.validate({
                schemaVersion: '1.0.0', id: 'u', type: 'object', name: 'Unsafe',
                root: {
                    id: 'root', type: 'group', children: [
                        { id: 'img', type: 'image', properties: { href: 'javascript:alert(1)', width: 10, height: 10 } },
                        { id: 'p', type: 'path', properties: { d: 'M0 0 L10 10 <script>' } }
                    ]
                }
            }, { width: 100, height: 100 });
            return result.errors.map(error => error.code);
        });
        expect(codes).toContain('UNSAFE_RESOURCE_URL');
        expect(codes).toContain('INVALID_PATH_DATA');
    });

    test('migrates definitions between schema versions', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            BlockMigrations.registerMigration('0.9.0', '1.0.0', definition => {
                definition.preset = definition.preset ?? 'standard';
                return definition;
            });
            const migrated = BlockMigrations.migrate({ schemaVersion: '0.9.0', id: 'old', type: 'object', name: 'Old', root: { id: 'root', type: 'group', children: [] } });
            BlockMigrations.steps.length = 0;
            return migrated;
        });
        expect(result.applied).toEqual(['0.9.0→1.0.0']);
        expect(result.definition.schemaVersion).toBe('1.0.0');
        expect(result.valid).toBe(true);
    });
});

test.describe('reusable blocks build several objects', () => {
    test('compass, speedometer, rotating vector and orbit system all compile from the same primitives', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const results = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const validator = new BlockValidator(BlockRegistry, compiler);
            validator.setCalculator(shell.board.calculator);
            return ['compass', 'speedometer', 'circular-gauge', 'rotating-vector', 'orbit-system'].map(type => {
                const definition = BlockObjects.createComponentInstance(type);
                const parameters = BlockObjects.getInstancePropertyDefaults(type);
                const context = { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') };
                const compilation = compiler.compile(definition, context);
                const validation = validator.validate(definition, context);
                return {
                    type: type,
                    valid: validation.valid,
                    errors: validation.errors.map(error => error.code),
                    nodeCount: compilation.stats.nodeCount,
                    primitives: Array.from(new Set(BlockRenderer.flatten(compilation.nodes).map(node => node.tag)))
                };
            });
        });
        for (const result of results) {
            expect(result.errors, `${result.type} should validate`).toEqual([]);
            expect(result.valid).toBe(true);
            expect(result.nodeCount).toBeGreaterThan(2);
            expect(result.primitives.every(tag => ['g', 'circle', 'line', 'polygon', 'text', 'path', 'rect', 'ellipse', 'image'].includes(tag))).toBe(true);
        }
    });

    test('visual presets change styling without changing structure', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(null));
            const definition = BlockObjects.createComponentInstance('speedometer');
            const build = preset => {
                const parameters = BlockObjects.getInstancePropertyDefaults('speedometer', preset);
                return compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens(preset) });
            };
            const standard = build('standard');
            const contrast = build('high-contrast');
            return {
                sameStructure: BlockRenderer.flatten(standard.nodes).length === BlockRenderer.flatten(contrast.nodes).length,
                sameMarkup: BlockRenderer.toMarkup(standard.nodes) === BlockRenderer.toMarkup(contrast.nodes),
                presets: BlockTokens.getPresetNames()
            };
        });
        expect(result.sameStructure).toBe(true);
        expect(result.sameMarkup).toBe(false);
        expect(result.presets).toEqual(expect.arrayContaining(['standard', 'minimal', 'scientific', 'classroom', 'high-contrast']));
    });
});
