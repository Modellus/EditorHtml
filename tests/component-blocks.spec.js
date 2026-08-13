const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

// The fonts the board writes in, and the one the classroom preset writes in instead. Spelled out
// here rather than read from the tokens, so a preset that quietly loses its font is a failure.
// An object may pick the sans face over the serif one — the compass does — but only ever by naming
// a token, which is what this holds every object to.
const BOARD_FONT = 'Katex_Main, Inter, serif';
const BOARD_SANS_FONT = 'Inter, Assistant, system-ui, sans-serif';
const CLASSROOM_FONT = 'Indie Flower, Katex_Main, cursive';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
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

    test('a choice reads truth on its own and equality when it names a value', async ({ page }) => {
        await setupBoard(page);
        const resolved = await page.evaluate(() => {
            const bindings = new BlockBindings(shell.board.calculator);
            const context = { parameters: { wheelType: 'motor bike', unit: '', span: 0, wanted: 'boat' }, tokens: new BlockTokens(), caseNumber: 1 };
            const choose = (parameter, equals) => bindings.resolve({ choose: { parameter: parameter }, equals: equals, then: 1, otherwise: 0 }, context, -1);
            return {
                blankIsFalse: bindings.resolve({ choose: { parameter: 'unit' }, then: 1, otherwise: 0 }, context, -1),
                zeroIsFalse: bindings.resolve({ choose: { parameter: 'span' }, then: 1, otherwise: 0 }, context, -1),
                textIsTrue: bindings.resolve({ choose: { parameter: 'wheelType' }, then: 1, otherwise: 0 }, context, -1),
                matches: choose('wheelType', 'motor bike'),
                differs: choose('wheelType', 'car'),
                comparedToABinding: bindings.resolve({ choose: { parameter: 'wheelType' }, equals: { parameter: 'wanted' }, then: 1, otherwise: 0 }, context, -1),
                missingParameter: choose('nothing', 'car')
            };
        });
        expect(resolved.blankIsFalse).toBe(0);
        expect(resolved.zeroIsFalse).toBe(0);
        expect(resolved.textIsTrue).toBe(1);
        expect(resolved.matches).toBe(1);
        expect(resolved.differs).toBe(0);
        expect(resolved.comparedToABinding).toBe(0);
        expect(resolved.missingParameter).toBe(0);
    });

    test('a direction reads a pair as the angle it points in, clockwise from straight up', async ({ page }) => {
        await setupBoard(page);
        const resolved = await page.evaluate(() => {
            const bindings = new BlockBindings(shell.board.calculator);
            const context = { parameters: { across: 3, up: 4, none: '' }, tokens: new BlockTokens(), caseNumber: 1 };
            const direction = (x, y) => bindings.resolve({ direction: { x: x, y: y } }, context, null);
            return {
                north: direction(0, 5),
                east: direction(5, 0),
                south: direction(0, -5),
                west: direction(-5, 0),
                northEast: direction(2, 2),
                fromParameters: direction({ parameter: 'across' }, { parameter: 'up' }),
                nowhere: direction(0, 0),
                unnamed: direction({ parameter: 'across' }, { parameter: 'none' })
            };
        });
        expect(resolved.north).toBe(0);
        expect(resolved.east).toBe(90);
        expect(resolved.south).toBe(180);
        expect(resolved.west).toBe(-90);
        expect(resolved.northEast).toBe(45);
        expect(resolved.fromParameters).toBeCloseTo(36.87, 2);
        expect(resolved.nowhere).toBeNull();
        expect(resolved.unnamed).toBeNull();
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

    test('the compass rose turns with its rotation variable while the needle keeps its heading', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addExpression('Compass equations'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Compass equations').properties.expression = 'heading=120\\\\turn=90';
            shell.reset();
        });
        await page.waitForTimeout(400);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('compass');
            const build = rotationVariable => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('compass'), { headingVariable: 'heading', rotationVariable: rotationVariable });
                const compilation = compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') });
                const flattened = BlockRenderer.flatten(compilation.nodes);
                const north = flattened.find(node => node.text === 'N');
                return {
                    needle: flattened.find(node => node.id.endsWith(':needle')).transform,
                    rose: flattened.find(node => node.id.endsWith(':rose')).transform,
                    north: { x: Number(north.attributes.x), y: Number(north.attributes.y) }
                };
            };
            return { still: build('0'), turned: build('turn') };
        });
        expect(result.still.needle).not.toBe('');
        expect(result.turned.needle).toBe(result.still.needle);
        expect(result.turned.rose).not.toBe(result.still.rose);
        expect(result.still.north.x).toBeCloseTo(100, 1);
        expect(result.still.north.y).toBeLessThan(100);
        expect(result.turned.north.x).toBeGreaterThan(100);
        expect(result.turned.north.y).toBeCloseTo(100, 1);
    });

    // A pointer stands where the tick for its direction stands, so it is read off the same scale the
    // ticks are: measured from N, clockwise, with its tip on the rim at 94 and its base at 80, the
    // depth of the major ticks. A direction is the angle a row names, or the angle the pair forms.
    async function buildCompassPointers(page, pointers, rotationVariable = '0') {
        return page.evaluate(([pointers, rotationVariable]) => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = BlockObjects.createComponentInstance('compass');
            const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('compass'), {
                headingVariable: 'heading',
                rotationVariable: rotationVariable,
                pointers: pointers
            });
            const compilation = compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') });
            return BlockRenderer.flatten(compilation.nodes)
                .filter(node => node.tag === 'polygon' && node.id.includes(':pointer-'))
                .map(node => {
                    const points = node.attributes.points.split(' ').map(pair => pair.split(',').map(Number));
                    const measure = point => ({
                        degrees: (Math.atan2(point[0] - 100, 100 - point[1]) * 180 / Math.PI + 360) % 360,
                        radius: Math.hypot(point[0] - 100, point[1] - 100)
                    });
                    const tip = measure(points[0]);
                    return {
                        id: node.id,
                        degrees: tip.degrees,
                        tipRadius: tip.radius,
                        baseRadius: Math.hypot((points[1][0] + points[2][0]) / 2 - 100, (points[1][1] + points[2][1]) / 2 - 100),
                        width: Math.hypot(points[1][0] - points[2][0], points[1][1] - points[2][1]),
                        fill: node.attributes.fill
                    };
                });
        }, [pointers, rotationVariable]);
    }

    test('a compass marks one pointer per row, at the angle the row names', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addExpression('Compass equations'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Compass equations').properties.expression = 'heading=120\\\\turn=90\\\\east=3\\\\north=4';
            shell.reset();
        });
        await page.waitForTimeout(400);
        const palette = await page.evaluate(() => [Utils.getColorByIndex(0), Utils.getColorByIndex(2)]);
        const markers = await buildCompassPointers(page, [
            { term: 'heading', case: 1, color: '', secondTerm: '' },
            { term: 'east', case: 1, color: '#ff0000', secondTerm: 'north' },
            { term: '45', case: 1, color: '', secondTerm: '' },
            { term: '', case: 1, color: '', secondTerm: '' }
        ]);
        expect(markers).toHaveLength(3);
        expect(markers[0].degrees).toBeCloseTo(120, 3);
        expect(markers[1].degrees).toBeCloseTo(Math.atan2(3, 4) * 180 / Math.PI, 3);
        expect(markers[2].degrees).toBeCloseTo(45, 3);
        expect(markers.map(marker => marker.fill)).toEqual([palette[0], '#ff0000', palette[1]]);
        expect(markers[0].tipRadius).toBeCloseTo(94, 3);
        expect(markers[0].baseRadius).toBeCloseTo(80, 3);
        expect(markers[0].width).toBeCloseTo(11, 3);
    });

    test('a pointer is measured from N, so it turns with the rose, and points nowhere without a term to read', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addExpression('Compass equations'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Compass equations').properties.expression = 'heading=120\\\\turn=90\\\\east=3\\\\north=4';
            shell.reset();
        });
        await page.waitForTimeout(400);
        const still = await buildCompassPointers(page, [{ term: 'heading', case: 1, color: '', secondTerm: '' }]);
        const turned = await buildCompassPointers(page, [{ term: 'heading', case: 1, color: '', secondTerm: '' }], 'turn');
        expect(still[0].degrees).toBeCloseTo(120, 3);
        expect(turned[0].degrees).toBeCloseTo(210, 3);
        const unread = await buildCompassPointers(page, [
            { term: 'gone', case: 1, color: '', secondTerm: '' },
            { term: 'east', case: 1, color: '', secondTerm: 'missing' },
            { term: '0', case: 1, color: '', secondTerm: '0' }
        ]);
        expect(unread).toHaveLength(0);
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

test.describe('one look for the whole board', () => {
    test('no object names a font: every text is written in the one the tokens hold', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const fontsOf = preset => {
                const fonts = new Set();
                for (const type of ['analogue-clock', 'compass', 'speedometer', 'circular-gauge', 'calculator', 'mouse-tracker']) {
                    const definition = BlockObjects.createComponentInstance(type, { preset: preset });
                    const parameters = BlockObjects.getInstancePropertyDefaults(type, preset);
                    const compilation = compiler.compile(definition, { width: 280, height: 280, parameters: parameters, tokens: new BlockTokens(preset) });
                    for (const node of BlockRenderer.flatten(compilation.nodes).filter(node => node.tag === 'text'))
                        fonts.add(node.attributes['font-family']);
                }
                return Array.from(fonts);
            };
            const tokenFontsOf = preset => new BlockTokens(preset).listTokens()
                .filter(entry => entry.name.startsWith('font.family'))
                .map(entry => entry.value);
            return {
                standard: fontsOf('standard'),
                classroom: fontsOf('classroom'),
                standardTokens: tokenFontsOf('standard'),
                classroomTokens: tokenFontsOf('classroom')
            };
        });
        expect(result.standard.sort()).toEqual([BOARD_FONT, BOARD_SANS_FONT].sort());
        expect(result.classroom).toEqual([CLASSROOM_FONT]);
        for (const font of result.standard)
            expect(result.standardTokens, `${font} must come from a token`).toContain(font);
        for (const font of result.classroom)
            expect(result.classroomTokens, `${font} must come from a token`).toContain(font);
    });

    test('the axis, the grid and the crosshair are drawn to the measurements the tokens hold', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(null));
            const tokens = new BlockTokens('standard');
            const plot = { x: 20, y: 10, width: 100, height: 100, minimumX: 0, maximumX: 10, minimumY: 0, maximumY: 10 };
            const definition = {
                id: 'plot', type: 'component', name: 'Plot', preset: 'standard',
                root: {
                    id: 'root', type: 'group', children: [
                        { id: 'grid', type: 'plot-grid', parameters: Object.assign({ ticksX: 5, ticksY: 5 }, plot) },
                        { id: 'axes', type: 'plot-axes', parameters: Object.assign({ ticksX: 5, ticksY: 5, digits: 0 }, plot) },
                        { id: 'crosshair', type: 'plot-crosshair', parameters: Object.assign({ valueX: 5, valueY: 5, digits: 0 }, plot) }
                    ]
                }
            };
            const flattened = BlockRenderer.flatten(compiler.compile(definition, { width: 140, height: 140, parameters: {}, tokens: tokens }).nodes);
            const find = id => flattened.find(node => node.id.endsWith(`:${id}`));
            return {
                axisWidth: Number(find('axis-x').attributes['stroke-width']),
                axisColor: find('axis-x').attributes.stroke,
                gridColor: find('x-0').attributes.stroke,
                gridOpacity: Number(find('x-0').attributes.opacity),
                tickLength: Number(find('x-tick-0').attributes.y2) - Number(find('x-tick-0').attributes.y1),
                labelGap: Number(find('x-label-0').attributes.y) - 110,
                labelFont: Number(find('x-label-0').attributes['font-size']),
                crosshairDash: find('vertical').attributes['stroke-dasharray'],
                crosshairOpacity: Number(find('vertical').attributes.opacity),
                badgeText: find('pointer-values-text').text,
                tokens: {
                    axisWidth: tokens.getNumber('axis.strokeWidth'),
                    axisColor: tokens.get('axis.color'),
                    gridColor: tokens.get('grid.color'),
                    gridOpacity: tokens.getNumber('grid.majorOpacity'),
                    tickLength: tokens.getNumber('axis.tickLength'),
                    tickFont: tokens.getNumber('font.size.tick'),
                    labelGap: tokens.getNumber('font.size.tick') * tokens.getNumber('axis.labelGapX'),
                    crosshairDash: tokens.get('crosshair.dash'),
                    crosshairOpacity: tokens.getNumber('crosshair.opacity')
                }
            };
        });
        expect(result.axisWidth).toBe(result.tokens.axisWidth);
        expect(result.axisColor).toBe(result.tokens.axisColor);
        expect(result.gridColor).toBe(result.tokens.gridColor);
        expect(result.gridOpacity).toBe(result.tokens.gridOpacity);
        expect(result.tickLength).toBe(result.tokens.tickLength);
        expect(result.labelFont).toBe(result.tokens.tickFont);
        expect(result.labelGap).toBeCloseTo(result.tokens.labelGap, 5);
        expect(result.crosshairDash).toBe(result.tokens.crosshairDash);
        expect(result.crosshairOpacity).toBe(result.tokens.crosshairOpacity);
        // Where the pointer is, read as a pair under it — the crosshair with no points to answer with.
        expect(result.badgeText).toBe('5, 5');
    });

    test('the badge and the crosshair the hand-written shapes draw come from the same tokens', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const tokens = new BlockTokens('standard');
            return {
                crosshair: Utils.crosshairLineSvgMarkup(0, 0, 10, 0, '#000000'),
                badge: Utils.valueBadgeSvgMarkup('5', 0, 0, { backgroundColor: '#000000' }),
                dash: tokens.get('crosshair.dash'),
                opacity: tokens.getNumber('crosshair.opacity'),
                cornerRadius: tokens.getNumber('badge.cornerRadius'),
                font: tokens.get('font.family')
            };
        });
        expect(result.crosshair).toContain(`stroke-dasharray="${result.dash}"`);
        expect(result.crosshair).toContain(`stroke-opacity="${result.opacity}"`);
        expect(result.badge).toContain(`rx="${result.cornerRadius}"`);
        expect(result.badge).toContain(`font-family="${result.font}"`);
    });
});

test.describe('memory', () => {
    test('rows are appended, capped and read back by index from either end', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            let rows = [];
            for (const value of [1, 2, 3, 4])
                rows = BlockMemory.append(rows, BlockMemory.createRow(`row ${value}`, value, value * 2), 3);
            return {
                kept: rows,
                count: BlockMemory.count(rows),
                oldest: BlockMemory.getField(rows, 0, 'start', 'text'),
                newest: BlockMemory.getField(rows, 0, 'end', 'text'),
                secondNewest: BlockMemory.getField(rows, 1, 'end', 'x'),
                pastTheEnd: BlockMemory.getField(rows, 9, 'start', 'x'),
                emptyRow: BlockMemory.createRow('', 0, 0),
                points: BlockMemory.toPoints(rows),
                hardLimit: BlockMemory.getLimit(999999)
            };
        });
        expect(result.kept.map(row => row.text)).toEqual(['row 2', 'row 3', 'row 4']);
        expect(result.count).toBe(3);
        expect(result.oldest).toBe('row 2');
        expect(result.newest).toBe('row 4');
        expect(result.secondNewest).toBe(3);
        expect(result.pastTheEnd).toBeNull();
        expect(result.emptyRow).toEqual({});
        expect(result.points).toEqual([{ x: 2, y: 4 }, { x: 3, y: 6 }, { x: 4, y: 8 }]);
        expect(result.hardLimit).toBe(2000);
    });

    test('bindings read a memory as a list, a row, a field and a count', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const bindings = new BlockBindings(shell.board.calculator);
            const context = { parameters: { log: [{ text: 'first', x: 1 }, { text: 'second', x: 2, y: 5 }], head: 1 }, tokens: new BlockTokens('standard') };
            return {
                whole: bindings.resolve({ memory: 'log' }, context, null),
                count: bindings.resolve({ memoryCount: 'log' }, context, 0),
                field: bindings.resolve({ memory: 'log', row: { parameter: 'head' }, field: 'text' }, context, ''),
                newest: bindings.resolve({ memory: 'log', row: 0, from: 'end', field: 'x' }, context, 0),
                missing: bindings.resolve({ memory: 'log', row: 7, field: 'x' }, context, -1),
                unknownMemory: bindings.resolve({ memoryCount: 'nothing' }, context, 0),
                dependencies: bindings.getBindingDependencies({ memory: 'log', field: 'x' })
            };
        });
        expect(result.whole).toHaveLength(2);
        expect(result.count).toBe(2);
        expect(result.field).toBe('second');
        expect(result.newest).toBe(2);
        expect(result.missing).toBe(-1);
        expect(result.unknownMemory).toBe(0);
        expect(result.dependencies).toEqual({ variables: [], parameters: ['log'] });
    });

    test('a structured parameter has the bindings inside it resolved, and a plain one does not', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const context = compiler.createRootContext({}, { parameters: { digits: 3 }, tokens: new BlockTokens('standard') });
            const value = [{ property: 'dp', value: { parameter: 'digits' } }, { property: 'fresh', value: 1 }];
            return {
                structured: compiler.resolveParameterValue(value, { id: 'rowActions', valueType: 'object', structured: true }, { diagnostics: [] }, context, 'path'),
                plain: compiler.resolveParameterValue(value, { id: 'rowActions', valueType: 'object' }, { diagnostics: [] }, context, 'path')
            };
        });
        expect(result.structured).toEqual([{ property: 'dp', value: 3 }, { property: 'fresh', value: 1 }]);
        expect(result.plain).toEqual([{ property: 'dp', value: { parameter: 'digits' } }, { property: 'fresh', value: 1 }]);
    });

    test('a behaviour is left off when its condition is false', async ({ page }) => {
        await setupBoard(page);
        const attached = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const build = pending => {
                const definition = {
                    schemaVersion: '1.0.0', id: 'when-test', type: 'group', name: 'When test', preset: 'standard',
                    root: {
                        id: 'key', type: 'rect', properties: { width: 40, height: 20, fill: '#000000' },
                        behaviours: [
                            { type: 'remember', when: { parameter: 'p' }, memory: 'log', text: 'recorded', x: 1 },
                            { type: 'clickable', property: 'n', value: 1 }
                        ]
                    }
                };
                const compilation = compiler.compile(definition, { width: 100, height: 100, parameters: { p: pending, log: [], n: 0 }, tokens: new BlockTokens('standard') });
                return compilation.nodes[0].behaviours.map(behaviour => behaviour.type);
            };
            return { pending: build(1), settled: build(0) };
        });
        expect(attached.pending).toEqual(['remember', 'clickable']);
        expect(attached.settled).toEqual(['clickable']);
    });

    test('a memory list draws its rows and a trace maps them onto the plot', async ({ page }) => {
        await setupBoard(page);
        const drawn = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const definition = {
                schemaVersion: '1.0.0', id: 'memory-drawing', type: 'group', name: 'Memory drawing', preset: 'standard',
                root: {
                    id: 'root', type: 'group', children: [
                        { id: 'list', type: 'memory-list', parameters: { rows: { memory: 'log' }, x: 0, y: 0, width: 120, height: 60, rowHeight: 20, digits: 1 } },
                        { id: 'trace', type: 'memory-trace', parameters: { rows: { memory: 'log' }, originX: 10, originY: 100, scaleX: 2, scaleY: -2 } }
                    ]
                }
            };
            const parameters = { log: [{ text: 'oldest', x: 1, y: 2 }, { text: 'newest', x: 3, y: 4 }] };
            const compilation = compiler.compile(definition, { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') });
            const flattened = BlockRenderer.flatten(compilation.nodes);
            return {
                labels: flattened.filter(node => node.sourceId === 'label').map(node => node.text),
                values: flattened.filter(node => node.sourceId === 'value').map(node => node.text),
                points: flattened.find(node => node.tag === 'polyline').attributes.points
            };
        });
        expect(drawn.labels).toEqual(['newest', 'oldest']);
        expect(drawn.values).toEqual(['3.0', '1.0']);
        expect(drawn.points).toBe('12,96 16,92');
    });
});

test.describe('memories the model runs on', () => {
    test('a memory becomes one column per named field', async ({ page }) => {
        await setupBoard(page);
        const series = await page.evaluate(() => {
            const rows = [{ text: 'first', x: 1, y: 2 }, { text: 'second', x: 3 }];
            return {
                both: BlockMemory.toTermSeries(rows, { x: 'px', y: 'py' }),
                onlyOne: BlockMemory.toTermSeries(rows, { x: 'px', y: '' }),
                none: BlockMemory.toTermSeries(rows, { x: '', y: '' }),
                empty: BlockMemory.toTermSeries([], { x: 'px' })
            };
        });
        expect(series.both).toEqual({ names: ['px', 'py'], values: [[1, 2], [3, 0]] });
        expect(series.onlyOne).toEqual({ names: ['px'], values: [[1], [3]] });
        expect(series.none).toEqual({ names: [], values: [] });
        expect(series.empty).toEqual({ names: ['px'], values: [] });
    });

    test('the calculator merges every set of values it is given into one table', async ({ page }) => {
        await setupBoard(page);
        const merged = await page.evaluate(() => Calculator.mergeDataSources([
            { names: ['t', 'p'], values: [[0, 10], [1, 20]] },
            { names: ['px', 'py'], values: [[1, 2], [3, 4], [5, 6]] }
        ]));
        expect(merged.names).toEqual(['t', 'p', 'px', 'py']);
        expect(merged.values[0]).toEqual([0, 10, 1, 2]);
        expect(merged.values[1]).toEqual([1, 20, 3, 4]);
        expect(merged.values[2][0]).toBeNaN();
        expect(merged.values[2].slice(2)).toEqual([5, 6]);
    });

    test('a source that is emptied stops feeding the model and leaves the others alone', async ({ page }) => {
        await setupBoard(page);
        const states = await page.evaluate(() => {
            const calculator = shell.board.calculator;
            calculator.setDataSource('one', ['a'], [[1], [2]]);
            calculator.setDataSource('two', ['b'], [[3], [4]]);
            const both = calculator.system.preloadedData.names.slice();
            calculator.setDataSource('two', ['b'], []);
            const afterEmptying = calculator.system.preloadedData.names.slice();
            calculator.removeDataSource('one');
            return { both: both, afterEmptying: afterEmptying, afterRemoving: calculator.system.preloadedData.names.slice() };
        });
        expect(states.both).toEqual(['a', 'b']);
        expect(states.afterEmptying).toEqual(['a']);
        expect(states.afterRemoving).toEqual([]);
    });
});
