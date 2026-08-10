const { test, expect } = require('@playwright/test');

const BOARD_URL = '/pages/board/index.html';

async function setupBoard(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(BOARD_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
}

async function importSvg(page, markup, options) {
    return page.evaluate(([source, settings]) => BlockSvgImport.import(source, settings ?? {}), [markup, options ?? null]);
}

test.describe('svg import', () => {
    test('converts the drawable elements into primitive nodes', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                <circle id="face" cx="100" cy="100" r="96" fill="#eeeeee" stroke="#1e1e1e" stroke-width="2"/>
                <g id="ticks">
                    <line id="tick" x1="100" y1="8" x2="100" y2="20" stroke="#1e1e1e"/>
                </g>
                <rect id="plate" x="10" y="20" width="30" height="40" rx="4"/>
                <ellipse id="blob" cx="5" cy="6" rx="7" ry="8"/>
                <polygon id="arrowhead" points="0,0 10,5 0,10"/>
                <path id="petal" d="M100 20 L110 100 L100 180 L90 100 Z"/>
                <text id="north" x="100" y="30" font-size="18" text-anchor="middle">N</text>
            </svg>`, { mapTokens: false });
        expect(result.problems).toEqual([]);
        expect(result.viewBox).toEqual([0, 0, 200, 200]);
        const byId = Object.fromEntries(result.nodes.map(node => [node.id, node]));
        expect(byId.face).toMatchObject({ type: 'circle', properties: { centerX: 100, centerY: 100, radius: 96, fill: '#eeeeee', stroke: '#1e1e1e', strokeWidth: 2 } });
        expect(byId.ticks).toMatchObject({ type: 'group' });
        expect(byId.ticks.children[0]).toMatchObject({ id: 'tick', type: 'line', properties: { x1: 100, y1: 8, x2: 100, y2: 20 } });
        expect(byId.plate).toMatchObject({ type: 'rect', properties: { x: 10, y: 20, width: 30, height: 40, cornerRadius: 4 } });
        expect(byId.blob).toMatchObject({ type: 'ellipse', properties: { centerX: 5, centerY: 6, radiusX: 7, radiusY: 8 } });
        expect(byId.arrowhead).toMatchObject({ type: 'polygon', properties: { points: '0,0 10,5 0,10' } });
        expect(byId.petal).toMatchObject({ type: 'path', properties: { d: 'M100 20 L110 100 L100 180 L90 100 Z' } });
        expect(byId.north).toMatchObject({ type: 'text', properties: { x: 100, y: 30, text: 'N', fontSize: 18, textAnchor: 'middle' } });
        expect(result.count).toBe(8);
    });

    test('what it converts compiles and validates as an ordinary definition', async ({ page }) => {
        await setupBoard(page);
        const outcome = await page.evaluate(() => {
            const imported = BlockSvgImport.import('<svg viewBox="0 0 100 100"><circle id="dot" cx="50" cy="50" r="20" fill="#1871c2"/></svg>');
            const definition = {
                schemaVersion: '1.0.0',
                id: 'imported',
                type: 'group',
                name: 'Imported',
                root: { id: 'root', type: 'group', children: imported.nodes },
                parameters: []
            };
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator)), shell.board.calculator);
            const validation = validator.validate(definition, { width: 100, height: 100 });
            const compiler = new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator));
            const compilation = compiler.compile(definition, { width: 100, height: 100 });
            return { errors: validation.errors, markup: BlockRenderer.toMarkup(compilation.nodes) };
        });
        expect(outcome.errors).toEqual([]);
        expect(outcome.markup).toContain('<circle');
        expect(outcome.markup).toContain('r="20"');
    });

    test('refuses script, handlers and links, and reports each one', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, `
            <svg xmlns="http://www.w3.org/2000/svg">
                <script>alert(1)</script>
                <circle cx="1" cy="1" r="1" onload="alert(2)"/>
                <foreignObject width="10" height="10"><div>x</div></foreignObject>
                <image x="0" y="0" width="10" height="10" href="javascript:alert(3)"/>
                <a href="https://example.com"><circle cx="2" cy="2" r="2"/></a>
            </svg>`);
        const joined = result.problems.join(' ');
        expect(joined).toContain('<script>');
        expect(joined).toContain('onload');
        expect(joined).toContain('<foreignObject>');
        expect(joined).toContain('<image> source is not allowed');
        expect(JSON.stringify(result.nodes)).not.toContain('javascript:');
        expect(JSON.stringify(result.nodes)).not.toContain('alert');
    });

    test('refuses path data outside the path grammar', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, '<svg><path id="bad" d="M0 0 L10 10 url(#x)"/></svg>');
        expect(result.nodes).toEqual([]);
        expect(result.problems.join(' ')).toContain('path grammar');
    });

    test('turns transforms into modifiers and reports the ones it cannot', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, `
            <svg>
                <g id="moved" transform="translate(10 20) rotate(45 100 100) scale(2)"><circle cx="0" cy="0" r="1"/></g>
                <g id="skewed" transform="matrix(1 0 0 1 5 5)"><circle cx="0" cy="0" r="1"/></g>
            </svg>`);
        const moved = result.nodes.find(node => node.id === 'moved');
        expect(moved.modifiers).toEqual([
            { type: 'translate', dx: 10, dy: 20 },
            { type: 'rotate', angle: 45, centerX: 100, centerY: 100 },
            { type: 'scale', scaleX: 2, scaleY: 2, centerX: 0, centerY: 0 }
        ]);
        expect(result.problems.join(' ')).toContain('matrix()');
    });

    test('maps colours onto design tokens and lists what it could not map', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, `
            <svg>
                <circle id="face" cx="0" cy="0" r="1" fill="#FFF" stroke="#1e1e1e"/>
                <text id="label" x="0" y="0" fill="#1e1e1e">N</text>
                <circle id="custom" cx="0" cy="0" r="1" fill="#ff00aa"/>
            </svg>`);
        const byId = Object.fromEntries(result.nodes.map(node => [node.id, node]));
        expect(byId.face.properties.fill).toBe('token:surface.default');
        expect(byId.face.properties.stroke).toBe('token:stroke.default');
        expect(byId.label.properties.fill).toBe('token:text.primary');
        expect(byId.custom.properties.fill).toBe('#ff00aa');
        expect(result.unmapped).toContain('#ff00aa');
        expect(result.mapped).toContainEqual({ color: '#1e1e1e', token: 'stroke.default' });
    });

    test('keeps author ids and makes up unique ones for the rest', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, '<svg><circle id="face" cx="0" cy="0" r="1"/><circle id="face" cx="0" cy="0" r="2"/><circle cx="0" cy="0" r="3"/></svg>');
        const ids = result.nodes.map(node => node.id);
        expect(ids[0]).toBe('face');
        expect(new Set(ids).size).toBe(3);
        expect(ids[2]).toMatch(/^art-circle-/);
    });

    test('re-import keeps the wiring attached to matching ids', async ({ page }) => {
        await setupBoard(page);
        const merged = await page.evaluate(() => {
            const previous = BlockSvgImport.import('<svg><circle id="face" cx="0" cy="0" r="90"/><g id="degrees"><circle id="ring" cx="0" cy="0" r="80"/></g></svg>').nodes;
            previous[0].bindings = { fill: { parameter: 'faceColor' } };
            previous[0].modifiers = [{ type: 'rotate', angle: { parameter: 'heading' }, centerX: 0, centerY: 0 }];
            previous[1].when = { parameter: 'showDegrees' };
            previous[1].behaviours = [{ type: 'tooltip', text: 'the degree ring' }];
            const imported = BlockSvgImport.import('<svg><circle id="face" cx="0" cy="0" r="96"/><g id="degrees"><circle id="ring" cx="0" cy="0" r="86"/></g><circle id="new" cx="0" cy="0" r="5"/></svg>').nodes;
            return BlockSvgImport.merge(previous, imported);
        });
        expect(merged.nodes[0].properties.radius).toBe(96);
        expect(merged.nodes[0].bindings).toEqual({ fill: { parameter: 'faceColor' } });
        expect(merged.nodes[0].modifiers).toEqual([{ type: 'rotate', angle: { parameter: 'heading' }, centerX: 0, centerY: 0 }]);
        expect(merged.nodes[1].when).toEqual({ parameter: 'showDegrees' });
        expect(merged.nodes[1].behaviours).toEqual([{ type: 'tooltip', text: 'the degree ring' }]);
        expect(merged.nodes[2].id).toBe('new');
        expect(merged.kept).toEqual(['face', 'degrees']);
        expect(merged.lost).toEqual([]);
    });

    test('re-import reports wiring whose id the new drawing no longer has', async ({ page }) => {
        await setupBoard(page);
        const merged = await page.evaluate(() => {
            const previous = BlockSvgImport.import('<svg><circle id="needle" cx="0" cy="0" r="1"/></svg>').nodes;
            previous[0].when = { parameter: 'showNeedle' };
            return BlockSvgImport.merge(previous, BlockSvgImport.import('<svg><circle id="pointer" cx="0" cy="0" r="1"/></svg>').nodes);
        });
        expect(merged.kept).toEqual([]);
        expect(merged.lost).toEqual(['needle']);
    });

    test('refuses markup that is not well-formed', async ({ page }) => {
        await setupBoard(page);
        const result = await importSvg(page, '<svg><circle r="1"></svg>');
        expect(result.nodes).toEqual([]);
        expect(result.problems.join(' ')).toContain('well-formed');
    });
});

test.describe('when conditions are validated', () => {
    async function validateDefinition(page, definition) {
        return page.evaluate(document => {
            const validator = new BlockValidator(BlockRegistry, new BlockCompiler(BlockRegistry, new BlockBindings(shell.board.calculator)), shell.board.calculator);
            return validator.validate(document, { width: 100, height: 100 });
        }, definition);
    }

    const baseDefinition = condition => ({
        schemaVersion: '1.0.0',
        id: 'conditional',
        type: 'group',
        name: 'Conditional',
        parameters: [{ id: 'showRing', label: 'Show ring', valueType: 'boolean', defaultValue: true }],
        root: { id: 'root', type: 'group', children: [{ id: 'ring', type: 'circle', when: condition, properties: { centerX: 10, centerY: 10, radius: 5, fill: '#1871c2' } }] }
    });

    test('a when reading a declared parameter passes', async ({ page }) => {
        await setupBoard(page);
        const result = await validateDefinition(page, baseDefinition({ parameter: 'showRing' }));
        expect(result.errors).toEqual([]);
    });

    test('a when reading a parameter the definition does not declare is reported', async ({ page }) => {
        await setupBoard(page);
        const result = await validateDefinition(page, baseDefinition({ parameter: 'showRng' }));
        const error = result.errors.find(entry => entry.code === 'UNKNOWN_PARAMETER');
        expect(error).toBeTruthy();
        expect(error.path).toBe('root.children[0].when');
        expect(error.suggestion).toBe('showRing');
    });

    test('a when that is not a binding at all is reported', async ({ page }) => {
        await setupBoard(page);
        const result = await validateDefinition(page, baseDefinition({ nonsense: true }));
        expect(result.errors.some(entry => entry.code === 'INVALID_CONDITION')).toBe(true);
    });

    test('a when on a behaviour is validated the same way', async ({ page }) => {
        await setupBoard(page);
        const definition = {
            schemaVersion: '1.0.0',
            id: 'conditional-behaviour',
            type: 'group',
            name: 'Conditional behaviour',
            parameters: [{ id: 'armed', label: 'Armed', valueType: 'boolean', defaultValue: true }],
            root: {
                id: 'root',
                type: 'group',
                children: [{
                    id: 'key',
                    type: 'circle',
                    properties: { centerX: 10, centerY: 10, radius: 5, fill: '#1871c2' },
                    behaviours: [{ type: 'tooltip', text: 'press', when: { parameter: 'armd' } }]
                }]
            }
        };
        const result = await validateDefinition(page, definition);
        const error = result.errors.find(entry => entry.code === 'UNKNOWN_PARAMETER');
        expect(error).toBeTruthy();
        expect(error.path).toBe('root.children[0].behaviours[0].when');
    });
});
