const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
const SHAPE_FORMAT = 'web application/x-modellus-shape+json';
const EXPRESSION_FORMAT = 'web application/x-modellus-expression+json';
const MATHML_FORMAT = 'web application/mathml+xml';
const EXTERNAL_FORMATS = ['text/plain', 'text/html', 'image/svg+xml', 'image/png'];

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        navigator.clipboard.read = async () => [];
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await expect.poll(() => page.evaluate(() => typeof ClipboardService !== 'undefined')).toBe(true);
}

async function addChart(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expr1');
        shell.board.shapes.getByName('Expr1').setProperties({ expression: '\\displaylines{y=2\\cdot t}' });
        modellus.shape.addChart('Chart1');
    });
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Chart1') != null)).toBe(true);
}

async function addExpression(page, latex) {
    await page.evaluate(value => {
        modellus.shape.addExpression('Motion');
        const shape = shell.board.shapes.getByName('Motion');
        shape.setProperties({ expression: value });
        shape.mathfield.value = value;
    }, latex);
    await expect.poll(() => page.evaluate(() => shell.board.shapes.getByName('Motion')?.mathfield != null)).toBe(true);
}

async function copyShape(page, name, failCustomFormats = false) {
    return page.evaluate(async ({ shapeName, failCustom }) => {
        const captured = { attempts: [], types: [], contents: {}, sizes: {}, plainTextFallback: null };
        navigator.clipboard.write = async items => {
            const item = items[0];
            captured.attempts.push(item.types.slice());
            if (failCustom && item.types.some(type => type.startsWith('web ')))
                throw new Error('custom formats unavailable');
            captured.types = item.types.slice();
            captured.contents = {};
            captured.sizes = {};
            for (const type of item.types) {
                const blob = await item.getType(type);
                captured.sizes[type] = blob.size;
                if (type !== 'image/png')
                    captured.contents[type] = await blob.text();
            }
        };
        navigator.clipboard.writeText = async text => { captured.plainTextFallback = text; };
        await shell.board.shapes.getByName(shapeName).copyToClipboard();
        return captured;
    }, { shapeName: name, failCustom: failCustomFormats });
}

function looksLikeModellusJson(value) {
    if (typeof value !== 'string')
        return false;
    let parsed;
    try { parsed = JSON.parse(value); } catch (_) { return false; }
    return parsed?.type != null && parsed?.properties != null;
}

function pickExternalRepresentation(types) {
    const understood = types.filter(type => EXTERNAL_FORMATS.includes(type));
    for (const type of ['image/svg+xml', 'image/png', 'text/html', 'text/plain'])
        if (understood.includes(type))
            return type;
    return null;
}

test.describe('clipboard representations', () => {
    test('copying a graph writes Modellus JSON and an image, never JSON as plain text', async ({ page }) => {
        await setupEditor(page);
        await addChart(page);
        const captured = await copyShape(page, 'Chart1');

        expect(captured.types).toContain(SHAPE_FORMAT);
        expect(captured.types).toContain('image/png');
        expect(captured.types).not.toContain('text/plain');
        expect(captured.plainTextFallback).toBeNull();
        expect(captured.sizes['image/png']).toBeGreaterThan(0);
        const document = JSON.parse(captured.contents[SHAPE_FORMAT]);
        expect(document.properties.name).toBe('Chart1');
        expect(document.type).toBe(await page.evaluate(() => shell.board.shapes.getByName('Chart1').serialize().type));
    });

    test('copying a graph exposes an SVG an external application can take', async ({ page }) => {
        await setupEditor(page);
        await addChart(page);
        const captured = await copyShape(page, 'Chart1');

        expect(captured.types).toContain('image/svg+xml');
        expect(captured.contents['image/svg+xml']).toContain('<svg');
    });

    test('copying an expression offers Modellus JSON, MathML, readable text and images', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, '\\displaylines{\\frac{dx}{dt}=v\\cdot t^2}');
        const captured = await copyShape(page, 'Motion');

        expect(captured.types).toContain(EXPRESSION_FORMAT);
        expect(captured.types).toContain(MATHML_FORMAT);
        expect(captured.types).toContain('text/plain');
        expect(captured.types).toContain('image/svg+xml');
        expect(captured.types).toContain('image/png');

        expect(JSON.parse(captured.contents[EXPRESSION_FORMAT]).properties.expression).toBe('\\displaylines{\\frac{dx}{dt}=v\\cdot t^2}');
        expect(captured.contents[MATHML_FORMAT]).toContain('<math xmlns="http://www.w3.org/1998/Math/MathML"');
        expect(captured.contents[MATHML_FORMAT]).toContain('<mfrac>');
        expect(captured.contents[MATHML_FORMAT]).not.toContain('displaylines');
        expect(captured.contents['text/plain']).toBe('(dx)/(dt)=v*t^2');
        expect(looksLikeModellusJson(captured.contents['text/plain'])).toBe(false);
    });

    test('an application that ignores the Modellus formats never reads Modellus JSON', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, '\\displaylines{\\frac{dx}{dt}=v\\cdot t^2}');
        const expressionCapture = await copyShape(page, 'Motion');
        await addChart(page);
        const chartCapture = await copyShape(page, 'Chart1');

        for (const captured of [expressionCapture, chartCapture]) {
            const chosen = pickExternalRepresentation(captured.types);
            expect(chosen).not.toBeNull();
            expect(chosen.startsWith('web ')).toBe(false);
            for (const type of EXTERNAL_FORMATS)
                expect(looksLikeModellusJson(captured.contents[type])).toBe(false);
        }
    });

    test('a platform without custom formats still exposes standard ones and no JSON text', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, '\\displaylines{\\frac{dx}{dt}=v\\cdot t^2}');
        const captured = await copyShape(page, 'Motion', true);

        expect(captured.attempts.length).toBeGreaterThan(1);
        expect(captured.types.some(type => type.startsWith('web '))).toBe(false);
        expect(captured.types).toContain('image/png');
        expect(captured.types).toContain('image/svg+xml');
        expect(captured.contents['text/plain']).toBe('(dx)/(dt)=v*t^2');
        expect(looksLikeModellusJson(captured.contents['text/plain'])).toBe(false);
    });

    test('a graph copied on one board is pasted back as an editable graph, not an image', async ({ page }) => {
        await setupEditor(page);
        await addChart(page);
        const captured = await copyShape(page, 'Chart1');
        const chartType = await page.evaluate(() => shell.board.shapes.getByName('Chart1').constructor.name);

        await page.evaluate(contents => {
            navigator.clipboard.read = async () => [{
                types: Object.keys(contents),
                getType: async type => new Blob([contents[type]], { type: ClipboardService.getLogicalType(type) })
            }];
            const clipboardData = new DataTransfer();
            clipboardData.items.add(new File([new Uint8Array([1, 2, 3])], 'shape.png', { type: 'image/png' }));
            window.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
        }, captured.contents);

        await expect.poll(() => page.evaluate(name => shell.board.shapes.shapes.filter(shape => shape.constructor.name === name).length, chartType)).toBe(2);
        const shapes = await page.evaluate(() => shell.board.shapes.shapes.map(shape => shape.constructor.name));
        expect(shapes).not.toContain('MediaShape');
    });

    test('an expression copied as a shape is pasted into a math editor as its expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, '\\displaylines{a=0.10}');
        const captured = await copyShape(page, 'Motion');

        const pasted = await page.evaluate(async contents => {
            navigator.clipboard.read = async () => [{
                types: Object.keys(contents),
                getType: async type => new Blob([contents[type]], { type: ClipboardService.getLogicalType(type) })
            }];
            modellus.shape.addExpression('Target');
            const control = shell.board.shapes.getByName('Target').expressionControl;
            control.mathfield.focus();
            await control.pasteFromClipboardUsingMathlive();
            return control.getCanonicalValue();
        }, captured.contents);

        expect(pasted).toBe('\\displaylines{a=0.10}');
    });
});

test.describe('notebook block clipboard', () => {
    test('copying a block writes its JSON under the Modellus block format, never as plain text', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
            navigator.clipboard.read = async () => [];
        });
        await page.goto('/pages/notebook/index.html');
        await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });

        const captured = await page.evaluate(async () => {
            notebook.addBlock('text');
            const block = notebook.blocks[notebook.blocks.length - 1];
            const result = { types: [], contents: {}, plainTextFallback: null };
            navigator.clipboard.write = async items => {
                const item = items[0];
                result.types = item.types.slice();
                for (const type of item.types)
                    result.contents[type] = await (await item.getType(type)).text();
            };
            navigator.clipboard.writeText = async text => { result.plainTextFallback = text; };
            await notebook.shapeInstances.get(block.id).copyBlockToClipboard();
            return result;
        });

        expect(captured.types).toEqual(['web application/x-modellus-block+json']);
        expect(captured.plainTextFallback).toBeNull();
        expect(JSON.parse(captured.contents['web application/x-modellus-block+json']).type).toBe('notebook-block');
    });
});
