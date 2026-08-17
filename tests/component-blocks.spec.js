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

    // The two controls a vehicle is driven with, drawn the way that vehicle works them: only the
    // parts the named vehicle owns are compiled, and each pedal presses a term of its own, both of
    // them up from zero as far as an end of that pedal's own.
    test('each pedal presses a term of its own, on whichever vehicle is named', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addExpression('Driving'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Driving').properties.expression = 'throttle=70\\\\braking=40';
            shell.reset();
        });
        await page.waitForTimeout(400);
        const measured = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const validator = new BlockValidator(BlockRegistry, compiler);
            validator.setCalculator(shell.board.calculator);
            const definition = BlockObjects.createComponentInstance('steering-wheel');
            const build = (vehicleType, acceleration, braking = '0') => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('steering-wheel'), {
                    wheelType: vehicleType,
                    showWheel: false,
                    showPedals: true,
                    angleVariable: '0',
                    accelerationVariable: acceleration,
                    brakingVariable: braking
                });
                const context = { width: 200, height: 200, parameters: parameters, tokens: new BlockTokens('standard') };
                const compilation = compiler.compile(definition, context);
                const flattened = BlockRenderer.flatten(compilation.nodes);
                const part = name => flattened.find(node => node.id.endsWith(`:${name}`)) ?? null;
                return {
                    errors: validator.validate(definition, context).errors.map(error => error.code),
                    parts: flattened.map(node => node.id.split(':').pop()),
                    brakePadY: Number(part('car-brake-pad')?.attributes.y),
                    acceleratorPadY: Number(part('car-accelerator-pad')?.attributes.y),
                    astern: ['cx', 'cy', 'r'].map(attribute => Number(part('astern-lever-knob')?.attributes[attribute])),
                    ahead: ['cx', 'cy', 'r'].map(attribute => Number(part('ahead-lever-knob')?.attributes[attribute])),
                    asternSlot: Number(part('astern-lever-arm')?.attributes.y1),
                    aheadSlot: Number(part('ahead-lever-arm')?.attributes.y1),
                    presses: flattened.filter(node => node.behaviours?.some(behaviour => behaviour.type === 'press-and-slide'))
                        .map(node => ({
                            id: node.id.split(':').pop(),
                            input: node.behaviours[0].input,
                            box: ['x', 'y', 'width', 'height'].map(attribute => Number(node.attributes[attribute]))
                        }))
                };
            };
            return {
                carAtRest: build('car', '0'),
                carAccelerating: build('car', '50'),
                carBraking: build('car', '0', '50'),
                carPastTheEnds: build('car', '150', '150'),
                carFromTheModel: build('car', 'throttle', 'braking'),
                boatAtRest: build('boat', '0'),
                boatAhead: build('boat', '50'),
                boatAstern: build('boat', '0', '50')
            };
        });
        for (const drawing of Object.values(measured))
            expect(drawing.errors).toEqual([]);
        // Each pedal stands where its own term stands, so one travels while the other rests and
        // neither is moved by what the other is holding.
        expect(measured.carAtRest).toMatchObject({ acceleratorPadY: 96, brakePadY: 108 });
        expect(measured.carAccelerating).toMatchObject({ acceleratorPadY: 118, brakePadY: 108 });
        expect(measured.carBraking).toMatchObject({ acceleratorPadY: 96, brakePadY: 130 });
        expect(measured.carPastTheEnds).toMatchObject({ acceleratorPadY: 140, brakePadY: 152 });
        expect(measured.carFromTheModel.presses.map(press => press.id)).toEqual(['brake-press', 'accelerator-press']);
        // A pixel of the 200px drawing is worth a two-hundredth of each pedal's own range, so a slide
        // across the whole of it covers that range — and the two are pressed alike, the same pixel
        // worth the same with the same sign, each from zero up to an end of its own above it.
        expect(measured.carFromTheModel.presses[0].input).toMatchObject({ variable: 'braking', property: 'brakingVariable', unitsPerPixel: 0.5, restValue: 0, returnStep: 10, intervalMs: 100, minimum: 0, maximum: 100 });
        expect(measured.carFromTheModel.presses[1].input).toMatchObject({ variable: 'throttle', property: 'accelerationVariable', unitsPerPixel: 0.5, restValue: 0, returnStep: 10, minimum: 0, maximum: 100 });
        expect(measured.carFromTheModel.parts).toContain('car-brake-pad');
        expect(measured.carFromTheModel.parts).not.toContain('binnacle');
        // Either vehicle is pressed on the half of the drawing the control it holds is drawn in: the
        // brake on the left and the accelerator on the right.
        expect(measured.carFromTheModel.presses.map(press => press.box)).toEqual([[0, 0, 100, 200], [100, 0, 100, 200]]);
        expect(measured.boatAhead.presses.map(press => press.box)).toEqual([[0, 0, 100, 200], [100, 0, 100, 200]]);
        expect(measured.boatAhead.parts).toEqual(expect.arrayContaining(['astern-lever-knob', 'ahead-lever-knob']));
        expect(measured.boatAhead.parts).not.toContain('car-brake-pad');
        // The boat's levers swing towards and away from the reader rather than across the drawing, so
        // at rest the pair stands alike, and neither knob ever leaves the column it is drawn in.
        expect(measured.boatAtRest.astern).toEqual([66, ...measured.boatAtRest.ahead.slice(1)]);
        expect(measured.boatAtRest.ahead[1]).toBeCloseTo(85.3, 1);
        expect(measured.boatAtRest.ahead[2]).toBeCloseTo(12, 5);
        expect(measured.boatAhead.astern[0]).toBe(66);
        expect(measured.boatAhead.ahead[0]).toBe(134);
        // Pushed ahead, the lever leans away: it reaches further up the drawing and is drawn smaller.
        expect(measured.boatAhead.ahead[1]).toBeCloseTo(74.1, 1);
        expect(measured.boatAhead.ahead[2]).toBeCloseTo(10.1, 1);
        // Pulled astern — the term below zero — it comes towards the reader instead: lower down the
        // drawing and drawn larger, while the ahead lever stands at rest.
        expect(measured.boatAstern.astern[1]).toBeCloseTo(103.1, 1);
        expect(measured.boatAstern.astern[2]).toBeCloseTo(13.9, 1);
        expect(measured.boatAstern.ahead).toEqual(measured.boatAtRest.ahead);
        // The shaft moves along its slot as it leans, forwards for ahead and back for astern.
        expect(measured.boatAstern.asternSlot).toBeGreaterThan(158);
        expect(measured.boatAhead.aheadSlot).toBeLessThan(158);
        expect(measured.boatAtRest.aheadSlot).toBeCloseTo(158, 5);
    });

    // A temperature read as a height: the column stands where the scale beside it says it stands, so
    // the two are one measurement drawn twice and never disagree. The step is the whole of the scale's
    // marking, as it is a slider's — marks every so many degrees, counted up from the minimum.
    test('the thermometer column stands where its own scale says, marked every step of it', async ({ page }) => {
        await setupBoard(page);
        await page.evaluate(() => modellus.shape.addExpression('Heating'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            shell.board.shapes.getByName('Heating').properties.expression = 'temperature=62';
            shell.reset();
        });
        await page.waitForTimeout(400);
        const measured = await page.evaluate(() => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const validator = new BlockValidator(BlockRegistry, compiler);
            validator.setCalculator(shell.board.calculator);
            const definition = BlockObjects.createComponentInstance('thermometer');
            const build = (overrides, size = 200) => {
                const parameters = Object.assign(BlockObjects.getInstancePropertyDefaults('thermometer'), overrides);
                const context = { width: size, height: size, parameters: parameters, tokens: new BlockTokens('standard') };
                const compilation = compiler.compile(definition, context);
                const flattened = BlockRenderer.flatten(compilation.nodes);
                const part = name => flattened.find(node => node.id.split(':').pop() === name) ?? null;
                const box = name => ['x', 'y', 'width', 'height'].map(attribute => Number(part(name)?.attributes[attribute]));
                const labels = flattened.filter(node => node.id.split(':').pop().startsWith('tick-label'));
                const ticks = flattened.filter(node => node.id.split(':').pop().startsWith('major-tick'));
                return {
                    errors: validator.validate(definition, context).errors.map(error => error.code),
                    parts: flattened.map(node => node.id.split(':').pop()),
                    column: box('column'),
                    bulbCenterY: Number(part('bulb-glass')?.attributes.cy),
                    // Each mark is where its line is drawn and what the number beside it reads.
                    marks: ticks.map((node, index) => ({
                        text: labels[index]?.text,
                        y: Number(node.attributes.y1) + Number(/translate\(\s*[-\d.]+\s+([-\d.]+)\s*\)/.exec(node.transform ?? '')?.[1] ?? 0)
                    })),
                    labelTexts: labels.map(node => node.text),
                    labelFontSize: Number(labels[0]?.attributes['font-size']),
                    readoutFontSize: Number(part('readout')?.attributes['font-size']),
                    tickLength: Number(ticks[0]?.attributes.x2) - Number(ticks[0]?.attributes.x1),
                    readout: part('readout')?.text ?? null,
                    crosshair: ['x1', 'y1', 'x2', 'y2'].map(name => Number(part('reading-crosshair')?.attributes[name])),
                    crosshairDash: part('reading-crosshair')?.attributes['stroke-dasharray'] ?? null,
                    press: part('column-grab')?.behaviours?.[0] ?? null,
                    grab: box('column-grab')
                };
            };
            return {
                atRest: build({ valueVariable: '-20' }),
                halfWay: build({ valueVariable: '50' }),
                atAMark: build({ valueVariable: '60' }),
                atTheTop: build({ valueVariable: '120' }),
                pastTheEnds: build({ valueVariable: '400' }),
                belowTheEnds: build({ valueVariable: '-400' }),
                fromTheModel: build({ valueVariable: 'temperature' }),
                inFahrenheit: build({ valueVariable: 'temperature', unit: '°F', digits: 0 }),
                coarseStep: build({ valueVariable: 'temperature', tickStep: 70 }),
                unevenStep: build({ valueVariable: 'temperature', minimum: 0, maximum: 100, tickStep: 30 }),
                fineStep: build({ valueVariable: 'temperature', minimum: 0, maximum: 1, tickStep: 0.1 }),
                absurdStep: build({ valueVariable: 'temperature', tickStep: 0.01 }),
                noStep: build({ valueVariable: 'temperature', tickStep: 0 }),
                flatScale: build({ valueVariable: 'temperature', minimum: 50, maximum: 50 }),
                small: build({ valueVariable: 'temperature' }, 120),
                large: build({ valueVariable: 'temperature' }, 480)
            };
        });
        for (const drawing of Object.values(measured))
            expect(drawing.errors).toEqual([]);
        // The bulb is always full: whatever the temperature, the column is the same piece of liquid
        // reaching up out of it, so its foot never leaves the bulb's centre.
        for (const drawing of Object.values(measured))
            expect(drawing.column[1] + drawing.column[3]).toBeCloseTo(drawing.bulbCenterY, 5);
        // At the minimum the column stands at the bottom of the scale, at the maximum at the top, and
        // halfway along the range exactly halfway between the two.
        const bottom = measured.atRest.column[1];
        const top = measured.atTheTop.column[1];
        expect(top).toBeLessThan(bottom);
        expect(measured.halfWay.column[1]).toBeCloseTo((bottom + top) / 2, 5);
        // Neither end can be overrun: a term the model takes past the scale reads as the end of it.
        expect(measured.pastTheEnds.column[1]).toBeCloseTo(top, 5);
        expect(measured.belowTheEnds.column[1]).toBeCloseTo(bottom, 5);
        // A scale with no range left to it stands at its bottom rather than dividing by nothing.
        expect(measured.flatScale.column[1]).toBeCloseTo(bottom, 5);
        // The marks are numbered in the model's own units, one every step up from the minimum.
        expect(measured.fromTheModel.labelTexts).toEqual(['-20', '0', '20', '40', '60', '80', '100', '120']);
        expect(measured.coarseStep.labelTexts).toEqual(['-20', '50', '120']);
        // A step the range does not divide evenly leaves the last part of the scale unmarked, rather
        // than putting a mark on a number nothing else in the model is counted in.
        expect(measured.unevenStep.labelTexts).toEqual(['0', '30', '60', '90']);
        // The numbers follow the reading's decimals only where the step needs them: a step in whole
        // degrees is marked in whole degrees however finely the reading itself is given.
        expect(measured.fineStep.labelTexts).toEqual(['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '1.0']);
        // A step too fine to mark, and no step at all, both fall back to the finest the scale has room
        // for — whole numbers that still cover the whole of it, rather than a grey band of writing.
        for (const drawing of [measured.absurdStep, measured.noStep]) {
            expect(drawing.labelTexts[0]).toBe('-20');
            expect(drawing.labelTexts.every(text => /^-?\d+$/.test(text))).toBe(true);
            expect(drawing.labelTexts.length).toBeLessThan(12);
            expect(drawing.labelTexts.length).toBeGreaterThan(2);
            expect(drawing.marks[0].y).toBeCloseTo(bottom, 5);
        }
        // Resizing the object stretches the scale, not the writing on it: the numbers, the reading and
        // the marks are the sizes the tokens hold, so a thermometer pulled to four times the size is
        // read at the same distance as the chart beside it rather than shouting its own labels.
        for (const drawing of [measured.small, measured.fromTheModel, measured.large]) {
            expect(drawing.labelFontSize).toBe(10);
            expect(drawing.readoutFontSize).toBe(14);
            expect(drawing.tickLength).toBe(4);
        }
        // And the marks measure what the column measures: at sixty degrees the top of the column is
        // level with the mark that reads sixty, which is the whole point of drawing a scale beside it.
        expect(measured.atAMark.column[1]).toBeCloseTo(measured.atAMark.marks.find(mark => mark.text === '60').y, 5);
        expect(measured.atRest.marks[0].y).toBeCloseTo(bottom, 5);
        expect(measured.atRest.marks[7].y).toBeCloseTo(top, 5);
        expect(measured.fromTheModel.parts.filter(part => part.startsWith('major-tick'))).toHaveLength(8);
        // Between the numbered marks the scale is divided into five by smaller marks of its own, drawn
        // at every size: seven steps of twenty across the range, so thirty-five smaller marks and the
        // one that shares the bottom of the scale with the first number.
        for (const drawing of [measured.small, measured.fromTheModel, measured.large])
            expect(drawing.parts.filter(part => part.startsWith('minor-tick'))).toHaveLength(36);
        expect(measured.coarseStep.parts.filter(part => part.startsWith('minor-tick'))).toHaveLength(11);
        // The reading is the term in figures, to the decimals asked for, named in whichever temperature
        // scale is chosen — the choice names the scale, it does not convert what the model holds.
        expect(measured.fromTheModel.readout).toBe('62.0 °C');
        expect(measured.inFahrenheit.readout).toBe('62 °F');
        const scaleSpan = bottom - top;
        // A dashed line carries the top of the column across to the scale, so what the column stands at
        // is placed against the marks: it stands at the reading and reaches from the stem to the ends
        // of the marks, which is where a chart's crosshair stops as well — at the axis it reads off.
        for (const name of ['atRest', 'halfWay', 'atTheTop', 'fromTheModel']) {
            const drawing = measured[name];
            expect(drawing.crosshair[1], name).toBeCloseTo(drawing.column[1], 5);
            expect(drawing.crosshair[3], name).toBeCloseTo(drawing.column[1], 5);
            expect(drawing.crosshair[0], name).toBeLessThan(drawing.column[0]);
            expect(drawing.crosshair[2], name).toBeGreaterThan(drawing.column[0] + drawing.column[2]);
        }
        expect(measured.fromTheModel.crosshairDash).toBe('4 3');
        // The stem is what is pressed, and a pixel of it is worth the range over the scale's length, so
        // a slide up the whole of the scale covers the whole of the range and stops at its ends.
        expect(measured.fromTheModel.grab[2]).toBeGreaterThan(0);
        expect(measured.fromTheModel.grab[3]).toBeGreaterThan(0);
        expect(measured.fromTheModel.press).toMatchObject({ type: 'press-and-slide' });
        expect(measured.fromTheModel.press.input).toMatchObject({ variable: 'temperature', property: 'valueVariable', returnStep: 0, minimum: -20, maximum: 120 });
        expect(measured.fromTheModel.press.input.unitsPerPixel).toBeCloseTo(140 / scaleSpan, 5);
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

    // The seven-segment panel is geometry rather than a font, so what it spells has to be read back
    // off the drawing: the bars each character lights, and the faint ones left standing behind them.
    async function buildSegmentDisplay(page, text, box = { x: 0, y: 0, width: 240, height: 60 }) {
        return page.evaluate(({ text, box }) => {
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(null));
            const definition = {
                schemaVersion: '1.0.0', id: 'segment-drawing', type: 'group', name: 'Segment drawing', preset: 'standard',
                root: { id: 'root', type: 'group', children: [{ id: 'display', type: 'seven-segment-display', parameters: Object.assign({ text: text, color: '#111111' }, box) }] }
            };
            const compilation = compiler.compile(definition, { width: box.width, height: box.height, parameters: {}, tokens: new BlockTokens('standard') });
            const cells = {};
            let left = Number.POSITIVE_INFINITY;
            let right = Number.NEGATIVE_INFINITY;
            for (const node of BlockRenderer.flatten(compilation.nodes).filter(entry => String(entry.sourceId).startsWith('character-'))) {
                const parts = node.sourceId.split('-');
                cells[parts[1]] ??= { lit: [], unlit: [] };
                cells[parts[1]][node.attributes.opacity === undefined ? 'lit' : 'unlit'].push(parts[2]);
                for (const point of String(node.attributes.points).split(' ')) {
                    left = Math.min(left, Number(point.split(',')[0]));
                    right = Math.max(right, Number(point.split(',')[0]));
                }
            }
            return {
                cells: Object.keys(cells).sort((first, second) => Number(first) - Number(second)).map(index => ({ lit: cells[index].lit.sort().join(''), unlit: cells[index].unlit.sort().join('') })),
                left: left,
                right: right
            };
        }, { text, box });
    }

    test('a seven-segment panel spells its reading in bars, and leaves the unlit ones showing', async ({ page }) => {
        await setupBoard(page);
        const display = await buildSegmentDisplay(page, '10:38.5');
        expect(display.cells.map(cell => cell.lit)).toEqual(['bc', 'abcdef', 'lowerupper', 'abcdg', 'abcdefg', 'point', 'acdfg']);
        expect(display.cells[0].unlit).toBe('adefg');
        expect(display.cells[1].unlit).toBe('g');
        expect(display.cells[2].unlit).toBe('');
        expect(display.cells[4].unlit).toBe('');
    });

    test('a seven-segment panel is fitted to the box it is given rather than to a font size', async ({ page }) => {
        await setupBoard(page);
        const wide = await buildSegmentDisplay(page, '12:34', { x: 0, y: 0, width: 300, height: 60 });
        const narrow = await buildSegmentDisplay(page, '12:34', { x: 0, y: 0, width: 120, height: 60 });
        const longer = await buildSegmentDisplay(page, '12:34:56', { x: 0, y: 0, width: 300, height: 60 });
        expect(wide.left).toBeGreaterThanOrEqual(0);
        expect(wide.right).toBeLessThanOrEqual(300);
        expect(narrow.right - narrow.left).toBeLessThanOrEqual(120);
        expect(longer.right - longer.left).toBeGreaterThan(wide.right - wide.left);
        expect(longer.right).toBeLessThanOrEqual(300);
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
