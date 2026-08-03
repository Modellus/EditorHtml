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

test.describe('agent tool surface', () => {
    test('tool definitions are derived from the registry and have valid schemas', async ({ page }) => {
        await setupBoard(page);
        const definitions = await page.evaluate(() => modellus.blocks.getToolDefinitions());
        expect(definitions.length).toBe(20);
        for (const definition of definitions) {
            expect(typeof definition.name).toBe('string');
            expect(definition.description.length).toBeGreaterThan(10);
            expect(definition.inputSchema.type).toBe('object');
            expect(typeof definition.inputSchema.properties).toBe('object');
        }
        const names = definitions.map(definition => definition.name);
        expect(names).toEqual(expect.arrayContaining([
            'list_building_blocks', 'search_building_blocks', 'get_building_block_schema',
            'create_object_draft', 'add_primitive', 'add_component', 'add_child', 'set_property',
            'set_parameter', 'apply_modifier', 'add_behaviour', 'bind_variable', 'bind_expression',
            'validate_object', 'render_object_preview', 'save_custom_component'
        ]));
        expect(names.some(name => name.includes('eval') || name.includes('script') || name.includes('code'))).toBe(false);
    });

    test('lists and inspects only agent accessible blocks', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => ({
            components: modellus.blocks.execute('list_building_blocks', { category: 'component' }),
            schema: modellus.blocks.execute('get_building_block_schema', { type: 'analogue-clock' }),
            search: modellus.blocks.execute('search_building_blocks', { query: 'clock hands' }),
            badCategory: modellus.blocks.execute('list_building_blocks', { category: 'widget' }),
            unknownTool: modellus.blocks.execute('run_javascript', { code: 'alert(1)' })
        }));
        expect(result.components.ok).toBe(true);
        expect(result.components.blocks.map(block => block.type)).toContain('analogue-clock');
        expect(result.schema.ok).toBe(true);
        expect(result.schema.block.parameters.map(parameter => parameter.id)).toEqual(expect.arrayContaining(['hourVariable', 'minuteVariable', 'secondVariable', 'showNumbers']));
        expect(result.search.blocks[0].type).toBeTruthy();
        expect(result.badCategory.ok).toBe(false);
        expect(result.badCategory.errors[0].code).toBe('INVALID_CATEGORY');
        expect(result.unknownTool.ok).toBe(false);
        expect(result.unknownTool.errors[0].code).toBe('UNKNOWN_TOOL');
    });

    test('lists the variables of the open model', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const variables = await page.evaluate(() => modellus.blocks.execute('list_model_variables', {}));
        expect(variables.ok).toBe(true);
        const names = variables.variables.map(variable => variable.name);
        expect(names).toEqual(expect.arrayContaining(['hour', 'minute', 'second']));
        expect(variables.variables.find(variable => variable.name === 'minute').value).toBe(30);
    });

    test('builds, validates, previews and inserts a clock through tools only', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const draft = modellus.blocks.execute('create_object_draft', { name: 'Agent clock', componentType: 'analogue-clock', request: 'Create an analogue clock driven by model variables' });
            const draftId = draft.draftId;
            const bindings = [
                modellus.blocks.execute('bind_variable', { draftId: draftId, nodeId: 'root', property: 'hourVariable', variable: 'hour' }),
                modellus.blocks.execute('bind_variable', { draftId: draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' }),
                modellus.blocks.execute('bind_variable', { draftId: draftId, nodeId: 'root', property: 'secondVariable', variable: 'second' })
            ];
            const parameter = modellus.blocks.execute('set_parameter', { draftId: draftId, nodeId: 'root', parameter: 'showNumbers', value: true });
            const validation = modellus.blocks.execute('validate_object', { draftId: draftId });
            const preview = modellus.blocks.execute('render_object_preview', { draftId: draftId, width: 200, height: 200 });
            const inserted = modellus.blocks.execute('insert_object', { draftId: draftId });
            const shape = shell.board.shapes.getById(inserted.shapeId);
            return {
                draftOk: draft.ok,
                bindingsOk: bindings.every(entry => entry.ok),
                parameterOk: parameter.ok,
                validation: validation,
                previewOk: preview.ok,
                previewSvg: preview.svg.slice(0, 60),
                previewNodes: preview.stats.nodeCount,
                inserted: inserted,
                shapeType: shape.constructor.name,
                componentType: shape.getComponentType(),
                metadata: shape.properties.definition.metadata,
                handRotations: shape.getInspectionReport().nodes
                    .filter(node => node.sourceComponent === 'pointer-hand' && node.transform.startsWith('rotate('))
                    .map(node => Number(node.transform.match(/rotate\(([-0-9.]+)/)[1]))
            };
        });
        expect(result.draftOk).toBe(true);
        expect(result.bindingsOk).toBe(true);
        expect(result.parameterOk).toBe(true);
        expect(result.validation.valid).toBe(true);
        expect(result.previewOk).toBe(true);
        expect(result.previewSvg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(result.previewNodes).toBeGreaterThan(50);
        expect(result.inserted.ok).toBe(true);
        expect(result.shapeType).toBe('ComponentShape');
        expect(result.componentType).toBe('analogue-clock');
        expect(result.metadata.source).toBe('agent');
        expect(result.metadata.request).toBe('Create an analogue clock driven by model variables');
        expect(result.handRotations[0]).toBeCloseTo(105, 3);
        expect(result.handRotations[1]).toBeCloseTo(180, 3);
    });

    test('composes a bespoke object from primitives, modifiers and behaviours', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const draftId = modellus.blocks.execute('create_object_draft', { name: 'Agent dial' }).draftId;
            const steps = [];
            steps.push(modellus.blocks.execute('add_component', { draftId: draftId, type: 'dial-face', id: 'face', parameters: { centerX: 90, centerY: 90, radius: 80, faceColor: '#ffffff', borderColor: '#1e1e1e' } }));
            steps.push(modellus.blocks.execute('add_group', { draftId: draftId, id: 'markers' }));
            steps.push(modellus.blocks.execute('add_primitive', { draftId: draftId, parentNodeId: 'markers', type: 'line', id: 'tick', properties: { x1: 90, y1: 14, x2: 90, y2: 26, stroke: '#1e1e1e', strokeWidth: 2 } }));
            steps.push(modellus.blocks.execute('apply_modifier', { draftId: draftId, nodeId: 'tick', type: 'repeat', values: { count: 12, angleStep: 30, centerX: 90, centerY: 90 } }));
            steps.push(modellus.blocks.execute('add_component', { draftId: draftId, type: 'pointer-hand', id: 'hand', parameters: { centerX: 90, centerY: 90, length: 60, width: 6, color: '#e03130', style: 'needle' } }));
            steps.push(modellus.blocks.execute('bind_expression', { draftId: draftId, nodeId: 'hand', property: 'angle', expression: '\\mod\\left(m,60\\right)\\cdot6', inputs: { m: 'minute' } }));
            const validation = modellus.blocks.execute('validate_object', { draftId: draftId });
            const preview = modellus.blocks.execute('render_object_preview', { draftId: draftId, width: 180, height: 180 });
            return {
                steps: steps.map(step => step.ok),
                validation: validation,
                svgTicks: (preview.svg.match(/<line /g) ?? []).length,
                handRotation: Number((preview.svg.match(/data-source-component-id="hand"[^>]*transform="rotate\(([-0-9.]+) 90 90\)"/) ?? [])[1])
            };
        });
        expect(result.steps.every(Boolean)).toBe(true);
        expect(result.validation.valid).toBe(true);
        expect(result.svgTicks).toBe(12);
        expect(result.handRotation).toBeCloseTo(180, 3);
    });

    test('returns structured errors and lets the agent correct the draft', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const draftId = modellus.blocks.execute('create_object_draft', { name: 'Broken clock', componentType: 'analogue-clock' }).draftId;
            const badVariable = modellus.blocks.execute('bind_variable', { draftId: draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minutes' });
            const badParameter = modellus.blocks.execute('set_parameter', { draftId: draftId, nodeId: 'root', parameter: 'showSecondsHand', value: true });
            const badExpression = modellus.blocks.execute('bind_expression', { draftId: draftId, nodeId: 'root', property: 'hourVariable', expression: '\\mod\\left(h,12' , inputs: { h: 'hour' } });
            const corrected = modellus.blocks.execute('bind_variable', { draftId: draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' });
            const validation = modellus.blocks.execute('validate_object', { draftId: draftId });
            return {
                badVariable: badVariable,
                badParameter: badParameter,
                badExpression: badExpression,
                correctedOk: corrected.ok,
                validation: validation
            };
        });
        expect(result.badVariable.ok).toBe(false);
        expect(result.badVariable.errors[0].code).toBe('UNKNOWN_VARIABLE');
        expect(result.badVariable.errors[0].suggestion).toBe('minute');
        expect(result.badParameter.ok).toBe(false);
        expect(result.badParameter.errors[0].code).toBe('UNKNOWN_PARAMETER');
        expect(result.badParameter.errors[0].suggestion).toBe('showSecondHand');
        expect(result.badExpression.ok).toBe(false);
        expect(result.badExpression.errors[0].code).toBe('INVALID_EXPRESSION');
        expect(result.correctedOk).toBe(true);
        expect(result.validation.valid).toBe(true);
    });

    test('refuses unknown node types, unknown properties and code injection attempts', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(() => {
            const draftId = modellus.blocks.execute('create_object_draft', { name: 'Unsafe' }).draftId;
            return {
                unknownPrimitive: modellus.blocks.execute('add_primitive', { draftId: draftId, type: 'script', properties: {} }),
                unknownComponent: modellus.blocks.execute('add_component', { draftId: draftId, type: 'ClockShape' }),
                unknownProperty: modellus.blocks.execute('add_primitive', { draftId: draftId, type: 'circle', id: 'c1', properties: { onclick: 'alert(1)' } }),
                unknownModifier: modellus.blocks.execute('apply_modifier', { draftId: draftId, nodeId: 'root', type: 'javascript', values: {} }),
                unknownBehaviour: modellus.blocks.execute('add_behaviour', { draftId: draftId, nodeId: 'root', type: 'run-script', values: {} }),
                unsafeImage: (() => {
                    modellus.blocks.execute('add_primitive', { draftId: draftId, type: 'image', id: 'img', properties: { href: 'javascript:alert(1)', width: 20, height: 20 } });
                    return modellus.blocks.execute('validate_object', { draftId: draftId });
                })(),
                unknownDraft: modellus.blocks.execute('add_group', { draftId: 'does-not-exist' })
            };
        });
        expect(result.unknownPrimitive.errors[0].code).toBe('UNKNOWN_PRIMITIVE');
        expect(result.unknownComponent.errors[0].code).toBe('UNKNOWN_COMPONENT');
        expect(result.unknownProperty.errors[0].code).toBe('UNKNOWN_PROPERTY');
        expect(result.unknownModifier.errors[0].code).toBe('UNKNOWN_MODIFIER');
        expect(result.unknownBehaviour.errors[0].code).toBe('UNKNOWN_BEHAVIOUR');
        expect(result.unsafeImage.valid).toBe(false);
        expect(result.unsafeImage.errors.map(error => error.code)).toContain('UNSAFE_RESOURCE_URL');
        expect(result.unknownDraft.ok).toBe(false);
    });

    test('cannot insert or save an invalid object', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const draftId = modellus.blocks.execute('create_object_draft', { name: 'Empty object' }).draftId;
            const shapesBefore = shell.board.shapes.shapes.length;
            const insert = modellus.blocks.execute('insert_object', { draftId: draftId });
            const save = modellus.blocks.execute('save_custom_component', { draftId: draftId, type: 'empty-thing' });
            return {
                insert: insert,
                save: save,
                shapesAdded: shell.board.shapes.shapes.length - shapesBefore,
                registered: BlockRegistry.has('empty-thing')
            };
        });
        expect(result.insert.ok).toBe(false);
        expect(result.insert.errors.map(error => error.code)).toContain('EMPTY_OBJECT');
        expect(result.save.ok).toBe(false);
        expect(result.shapesAdded).toBe(0);
        expect(result.registered).toBe(false);
    });

    test('saves a valid draft as a reusable custom component', async ({ page }) => {
        await setupBoard(page);
        await addClockModel(page);
        const result = await page.evaluate(() => {
            const draftId = modellus.blocks.execute('create_object_draft', { name: 'Mini dial' }).draftId;
            modellus.blocks.execute('add_component', { draftId: draftId, type: 'dial-face', id: 'face', parameters: { centerX: 60, centerY: 60, radius: 50 } });
            modellus.blocks.execute('add_component', { draftId: draftId, type: 'pointer-hand', id: 'hand', parameters: { centerX: 60, centerY: 60, length: 40, width: 5, color: '#1871c2' } });
            const saved = modellus.blocks.execute('save_custom_component', { draftId: draftId, type: 'mini-dial', displayName: 'Mini dial', description: 'A small dial saved by the agent.' });
            const reused = modellus.blocks.execute('create_object_draft', { name: 'Reused dial', componentType: 'mini-dial' });
            const validation = modellus.blocks.execute('validate_object', { draftId: reused.draftId });
            const inserted = modellus.blocks.execute('insert_object', { draftId: reused.draftId });
            const shape = shell.board.shapes.getById(inserted.shapeId);
            const takenName = modellus.blocks.execute('save_custom_component', { draftId: draftId, type: 'circle' });
            const invalidName = modellus.blocks.execute('save_custom_component', { draftId: draftId, type: 'Bad Name!' });
            return {
                saved: saved,
                inCatalogue: modellus.blocks.getCatalogue().some(entry => entry.type === 'mini-dial'),
                validation: validation,
                insertedOk: inserted.ok,
                renderedElements: document.getElementById(shape.id).querySelectorAll('circle, polygon').length,
                takenName: takenName,
                invalidName: invalidName
            };
        });
        expect(result.saved.ok).toBe(true);
        expect(result.inCatalogue).toBe(true);
        expect(result.validation.valid).toBe(true);
        expect(result.insertedOk).toBe(true);
        expect(result.renderedElements).toBeGreaterThanOrEqual(2);
        expect(result.takenName.errors[0].code).toBe('COMPONENT_TYPE_TAKEN');
        expect(result.invalidName.errors[0].code).toBe('INVALID_COMPONENT_TYPE');
    });

    test('is reachable through the agent tool bridge naming convention', async ({ page }) => {
        await setupBoard(page);
        const result = await page.evaluate(async () => {
            const results = [];
            const bridge = new AgentToolBridge({ sendToolResult: toolResult => results.push(toolResult) });
            await bridge.handleToolCall({ toolCallId: '1', toolName: 'modellus_blocks_list_building_blocks', input: { category: 'primitive' } });
            await bridge.handleToolCall({ toolCallId: '2', toolName: 'modellus_blocks_run_javascript', input: {} });
            return results;
        });
        expect(result[0].state).toBe('output-available');
        expect(result[0].output.ok).toBe(true);
        expect(result[0].output.blocks.map(block => block.type)).toContain('circle');
        expect(result[1].state).toBe('output-error');
    });
});
