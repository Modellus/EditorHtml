const { test, expect } = require('@playwright/test');
const MathColorScheme = require('../scripts/controls/mathColorScheme.js');

const EDITOR_URL = '/pages/board/index.html';

const PARAMETER_GROUP = '\\displaylines{a=0.10\\\\b=21.55\\\\K_c=\\frac{b}{a^2}\\\\k_d=1\\\\k_i=\\frac{k_d}{K_c}}';
const INITIAL_VALUES_GROUP = '\\displaylines{NO_2\\left(0\\right)=a\\cdot r\\\\N_2O_4\\left(0\\right)=b\\cdot r}';
const RATES_GROUP = '\\displaylines{v_d=k_d\\cdot NO_2^2\\\\v_i=k_i\\cdot N_2O_4\\\\\\frac{\\differentialD{NO_2}}{\\differentialD{t}}=2\\left(v_i-v_d\\right)\\\\\\frac{\\differentialD{N_2O_4}}{\\differentialD{t}}=v_d-v_i\\\\Q_c=\\frac{N_2O_4}{NO_2^2}}';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addExpression(page, name, expression) {
    await page.evaluate(({ shapeName, shapeExpression }) => {
        modellus.shape.addExpression(shapeName);
        const shape = shell.board.shapes.getByName(shapeName);
        shape.properties.width = 420;
        shape.properties.height = 240;
        shape.setProperties({ expression: shapeExpression });
        shape.update();
        shape.draw();
    }, { shapeName: name, shapeExpression: expression });
    await page.waitForTimeout(600);
}

function presentedLatex(page, name) {
    return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).mathfield.getValue('latex-unstyled'), name);
}

function canonicalLatex(page, name) {
    return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).expressionControl.getCanonicalValue(), name);
}

function storedExpression(page, name) {
    return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).properties.expression, name);
}

async function focusExpression(page, name) {
    await page.evaluate(shapeName => {
        const shape = shell.board.shapes.getByName(shapeName);
        shape.mathfield.focus();
        shape.mathfield.position = shape.mathfield.lastOffset;
    }, name);
    await page.waitForTimeout(200);
}

function renderedColors(page, name) {
    return page.evaluate(shapeName => {
        const mathfield = shell.board.shapes.getByName(shapeName).mathfield;
        const rendered = [];
        mathfield.shadowRoot.querySelectorAll('*').forEach(element => {
            const text = element.textContent.trim();
            if (element.children.length === 0 && text !== '' && !element.className.includes('vlist-s') && element.tagName !== 'STYLE')
                rendered.push({ text, color: getComputedStyle(element).color });
        });
        return rendered;
    }, name);
}

function colorOf(rendered, text) {
    const entry = rendered.find(candidate => candidate.text === text);
    return entry ? entry.color : null;
}

function adaptedColor(baseColor, backgroundColor, contrastTarget) {
    const color = MathColorScheme.parse(MathColorScheme.adapt(baseColor, backgroundColor, contrastTarget));
    return `rgb(${Math.round(color.red * 255)}, ${Math.round(color.green * 255)}, ${Math.round(color.blue * 255)})`;
}

function contrastWith(renderedColor, backgroundColor) {
    return MathColorScheme.contrastRatio(MathColorScheme.parse(renderedColor), MathColorScheme.parse(backgroundColor));
}

async function setCardBackground(page, name, backgroundColor) {
    await page.evaluate(({ shapeName, color }) => {
        const shape = shell.board.shapes.getByName(shapeName);
        shape.properties.backgroundColor = color;
        shape.update();
        shape.expressionControl.semanticDecorator.invalidate();
        shape.expressionControl.refreshSemanticColoring();
    }, { shapeName: name, color: backgroundColor });
    await page.waitForTimeout(300);
}

async function setCardColors(page, name, backgroundColor, foregroundColor) {
    await page.evaluate(({ shapeName, background, foreground }) => {
        const shape = shell.board.shapes.getByName(shapeName);
        shape.properties.backgroundColor = background;
        shape.properties.foregroundColor = foreground;
        shape.update();
        shape.expressionControl.semanticDecorator.invalidate();
        shape.expressionControl.refreshSemanticColoring();
    }, { shapeName: name, background: backgroundColor, foreground: foregroundColor });
    await page.waitForTimeout(300);
}

function measuredBackground(page, name) {
    return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).expressionControl.semanticDecorator.backgroundColor, name);
}

test.describe('equals sign alignment', () => {
    test('a group of equations shares one equals sign column', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\\\ K_{c} & =\\frac{b}{a^2}\\\\ k_{d} & =1\\\\ k_{i} & =\\frac{k_{d}}{K_{c}}\\end{align}');
        const columns = await page.evaluate(() => {
            const mathfield = shell.board.shapes.getByName('Parameters').mathfield;
            const positions = [];
            mathfield.shadowRoot.querySelectorAll('*').forEach(element => {
                if (element.children.length === 0 && element.textContent.trim() === '=')
                    positions.push(Math.round(element.getBoundingClientRect().left));
            });
            return positions;
        });
        expect(columns.length).toBe(5);
        expect(Math.max(...columns) - Math.min(...columns)).toBeLessThanOrEqual(1);
    });

    test('the aligned block is centred in the card', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        const geometry = await page.evaluate(() => {
            const mathfield = shell.board.shapes.getByName('Parameters').mathfield;
            const block = mathfield.shadowRoot.querySelector('.ML__align_environment').getBoundingClientRect();
            const content = mathfield.shadowRoot.querySelector('.ML__latex').getBoundingClientRect();
            return { leftGap: block.left - content.left, rightGap: content.right - block.right };
        });
        expect(Math.abs(geometry.leftGap - geometry.rightGap)).toBeLessThanOrEqual(2);
    });

    test('a single equation is rendered as before', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Single', '\\displaylines{a=0.10}');
        expect(await presentedLatex(page, 'Single')).toBe('a=0.10');
        expect(await storedExpression(page, 'Single')).toBe('\\displaylines{a=0.10}');
    });

    test('an equals sign nested in a condition is not aligned', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Conditions', '\\displaylines{f=\\begin{cases}1 & t=0\\\\2 & t\\ge2\\end{cases}\\\\g=3}');
        const presented = await presentedLatex(page, 'Conditions');
        expect(presented.startsWith('\\begin{align}f & =\\begin{cases}')).toBe(true);
        expect(await canonicalLatex(page, 'Conditions')).toContain('\\begin{cases}');
    });

    test('fractions and derivatives on the left keep the shared column', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Rates', RATES_GROUP);
        const presented = await presentedLatex(page, 'Rates');
        expect(presented).toContain('\\frac{\\differentialD{NO_2}}{\\differentialD{t}} & =');
        expect(presented).toContain('\\frac{\\differentialD{N_2O_4}}{\\differentialD{t}} & =');
        const columns = await page.evaluate(() => {
            const mathfield = shell.board.shapes.getByName('Rates').mathfield;
            const positions = [];
            mathfield.shadowRoot.querySelectorAll('*').forEach(element => {
                if (element.children.length === 0 && element.textContent.trim() === '=')
                    positions.push(Math.round(element.getBoundingClientRect().left));
            });
            return positions;
        });
        expect(columns.length).toBe(5);
        expect(Math.max(...columns) - Math.min(...columns)).toBeLessThanOrEqual(1);
    });

    test('the stored expression stays a plain row list', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        expect(await storedExpression(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55\\\\K_{c}=\\frac{b}{a^2}\\\\k_{d}=1\\\\k_{i}=\\frac{k_{d}}{K_{c}}}');
        expect(await canonicalLatex(page, 'Parameters')).toBe(await storedExpression(page, 'Parameters'));
    });

    test('opening a model keeps the expressions it carries', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await addExpression(page, 'Rates', '\\displaylines{x=t\\\\y=2\\cdot t+3}');
        const model = await page.evaluate(() => JSON.stringify(shell.serialize()));
        await page.evaluate(savedModel => shell.openModel(savedModel), model);
        await page.waitForTimeout(1200);
        expect(await storedExpression(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55\\\\K_{c}=\\frac{b}{a^2}\\\\k_{d}=1\\\\k_{i}=\\frac{k_{d}}{K_{c}}}');
        expect(await storedExpression(page, 'Rates')).toBe('\\displaylines{x=t\\\\y=2\\cdot t+3}');
        expect(await presentedLatex(page, 'Parameters')).toContain('\\begin{align}');
    });

    test('a saved model opened at startup keeps its expressions', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        });
        await page.goto('/pages/board/index.html?model=components-demo');
        await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
        await page.waitForTimeout(2000);
        const state = await page.evaluate(() => shell.board.shapes.shapes.filter(shape => shape.mathfield).map(shape => ({
            stored: shape.properties.expression,
            presented: shape.mathfield.getValue('latex-unstyled')
        })));
        expect(state.length).toBeGreaterThan(0);
        for (const expressionState of state) {
            expect(expressionState.stored).not.toBe('\\displaylines{}');
            expect(expressionState.stored).toContain('=');
            expect(expressionState.presented).toContain('=');
        }
    });

    test('an empty reading from an unfocused field never clears the stored expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Parameters');
            shape.mathfield.blur();
            shape.expressionControl.getCanonicalValue = () => '\\displaylines{}';
            shape.syncExpressionFromMathfield();
        });
        expect(await storedExpression(page, 'Parameters')).toContain('a=0.10');
    });

    test('a user who empties a focused field does clear the stored expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Parameters');
            shape.mathfield.executeCommand('selectAll');
            shape.mathfield.executeCommand('deleteBackward');
        });
        await page.waitForTimeout(500);
        expect(await storedExpression(page, 'Parameters')).toBe('\\displaylines{}');
    });

    test('the model reads the terms of an aligned block', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        const terms = await page.evaluate(() => {
            shell.reset();
            return shell.board.calculator.getTermsNames();
        });
        expect(terms).toContain('a');
        expect(terms).toContain('b');
    });
});

test.describe('editing an aligned block', () => {
    test('a row is inserted and the typed equation snaps to the column', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        await page.keyboard.type('K');
        await page.waitForTimeout(250);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\\\ K & \\end{align}');
        await page.keyboard.type('=');
        await page.waitForTimeout(250);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\\\ K & =\\end{align}');
        await page.keyboard.type('5');
        await page.waitForTimeout(250);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\\\ K & =5\\end{align}');
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55\\\\K=5}');
    });

    test('a removed row leaves the remaining equations aligned', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55\\\\c=3}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.executeCommand('removeRow'));
        await page.waitForTimeout(400);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\end{align}');
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55}');
    });

    test('a block with a single equation left goes back to a plain row', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(() => {
            const mathfield = shell.board.shapes.getByName('Parameters').mathfield;
            mathfield.executeCommand('removeRow');
            mathfield.dispatchEvent(new InputEvent('input'));
        });
        await page.waitForTimeout(400);
        expect(await presentedLatex(page, 'Parameters')).toBe('a=0.10');
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10}');
    });

    test('the caret walks across rows and sides of the equations', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(() => { shell.board.shapes.getByName('Parameters').mathfield.position = 0; });
        const walked = [];
        for (let step = 0; step < 6; step++) {
            await page.keyboard.press('ArrowRight');
            walked.push(await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.position));
        }
        expect(walked).toEqual([1, 2, 3, 4, 5, 6]);
        await page.keyboard.press('ArrowDown');
        const rowIndex = await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.position);
        expect(rowIndex).toBeGreaterThan(6);
    });

    test('undo and redo walk the edits of an aligned block', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.keyboard.type('5');
        await page.waitForTimeout(300);
        const afterTyping = await canonicalLatex(page, 'Parameters');
        expect(afterTyping).toBe('\\displaylines{a=0.10\\\\b=21.555}');
        await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.executeCommand('undo'));
        await page.waitForTimeout(300);
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55}');
        await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.executeCommand('redo'));
        await page.waitForTimeout(300);
        expect(await canonicalLatex(page, 'Parameters')).toBe(afterTyping);
    });

    test('undo does not fight the alignment normalization', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        await focusExpression(page, 'Parameters');
        await page.keyboard.press('Enter');
        await page.keyboard.type('K=5');
        await page.waitForTimeout(400);
        const undone = [];
        for (let step = 0; step < 6; step++) {
            await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.executeCommand('undo'));
            await page.waitForTimeout(150);
            undone.push(await canonicalLatex(page, 'Parameters'));
        }
        expect(undone[undone.length - 1]).toBe('\\displaylines{a=0.10\\\\b=21.55}');
    });

    test('pasted rows are aligned and serialize without extra markers', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(async () => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            navigator.clipboard.readText = async () => 'a=0.10\\\\b=21.55';
            await control.pasteFromClipboardUsingMathlive();
        });
        await page.waitForTimeout(500);
        expect(await presentedLatex(page, 'Parameters')).toBe('\\begin{align}a & =0.10\\\\ b & =21.55\\end{align}');
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55}');
    });

    test('an aligned block is copied as plain rows', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{a=0.10\\\\b=21.55}');
        const copied = await page.evaluate(async () => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            let written = '';
            navigator.clipboard.writeText = async text => { written = text; };
            control.mathfield.position = control.mathfield.lastOffset;
            await control.copyToClipboardUsingMathlive();
            return written;
        });
        expect(copied).toBe('a=0.10\\\\b=21.55');
    });

    test('pasting an aligned block back reads as the same rows', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', '\\displaylines{}');
        await focusExpression(page, 'Parameters');
        await page.evaluate(async () => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            navigator.clipboard.readText = async () => '\\begin{align}a & =0.10\\\\ b & =21.55\\end{align}';
            await control.pasteFromClipboardUsingMathlive();
        });
        await page.waitForTimeout(500);
        expect(await canonicalLatex(page, 'Parameters')).toBe('\\displaylines{a=0.10\\\\b=21.55}');
    });
});

test.describe('semantic colouring', () => {
    test('every category is painted with its own theme colour', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Colours', '\\displaylines{a=0.10\\\\K_c=\\sin\\left(a\\right)\\\\\\frac{\\differentialD{a}}{\\differentialD{t}}=2\\\\y=x_n}');
        await setCardBackground(page, 'Colours', '#ffffff');
        const rendered = await renderedColors(page, 'Colours');
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        expect(colorOf(rendered, '0')).toBe(adaptedColor('#c65d00', '#ffffff', 6));
        expect(colorOf(rendered, '=')).toBe(adaptedColor('#626b75', '#ffffff', 4.5));
        expect(colorOf(rendered, 'sin')).toBe(adaptedColor('#2e7d4f', '#ffffff', 6));
        expect(colorOf(rendered, 'd')).toBe(adaptedColor('#b0185b', '#ffffff', 6));
        expect(colorOf(rendered, 'c')).toBe(adaptedColor('#347dac', '#ffffff', 6));
        expect(colorOf(rendered, 'n')).toBe(adaptedColor('#7047b8', '#ffffff', 6));
    });

    test('a subscript that names the term is painted with the name, an index is not', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Names', '\\displaylines{v.x=2\\\\a_{n+1}=a_n}');
        await setCardBackground(page, 'Names', '#ffffff');
        const rendered = await renderedColors(page, 'Names');
        expect(colorOf(rendered, 'x')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        expect(colorOf(rendered, 'n')).toBe(adaptedColor('#7047b8', '#ffffff', 6));
        expect(colorOf(rendered, '+')).toBe(adaptedColor('#626b75', '#ffffff', 4.5));
    });

    test('colouring reaches inside fractions, powers and roots', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Nested', '\\displaylines{K=\\frac{\\sqrt{b}}{a^2}\\\\a=1\\\\b=2}');
        await setCardBackground(page, 'Nested', '#ffffff');
        const rendered = await renderedColors(page, 'Nested');
        expect(colorOf(rendered, 'b')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        expect(colorOf(rendered, '2')).toBe(adaptedColor('#c65d00', '#ffffff', 6));
    });

    test('colouring does not reach the stored expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await page.waitForTimeout(400);
        expect(await storedExpression(page, 'Parameters')).not.toContain('textcolor');
        expect(await canonicalLatex(page, 'Parameters')).not.toContain('textcolor');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.getValue('math-ml'))).not.toContain('textcolor');
    });

    test('repeated colouring does not nest style commands', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        const styled = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            for (let pass = 0; pass < 5; pass++) {
                control.semanticDecorator.invalidate();
                control.refreshSemanticColoring();
            }
            return control.mathfield.getValue('latex');
        });
        expect(styled).not.toContain('\\textcolor{#183b66}{\\textcolor');
        expect(await canonicalLatex(page, 'Parameters')).toBe(await storedExpression(page, 'Parameters'));
    });

    test('the caret and the selection survive recolouring', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await focusExpression(page, 'Parameters');
        const caret = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            control.mathfield.position = 3;
            const before = control.mathfield.position;
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
            return { before, after: control.mathfield.position, focused: document.activeElement === control.mathfield };
        });
        expect(caret.after).toBe(caret.before);
        expect(caret.focused).toBe(true);
        const selection = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            control.mathfield.selection = { ranges: [[1, 4]], direction: 'forward' };
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
            return JSON.stringify(control.mathfield.selection.ranges);
        });
        expect(selection).toBe('[[1,4]]');
    });

    test('recolouring does not record undo steps', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await focusExpression(page, 'Parameters');
        const result = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            const before = control.mathfield.getValue('latex-unstyled');
            for (let pass = 0; pass < 3; pass++) {
                control.semanticDecorator.invalidate();
                control.refreshSemanticColoring();
            }
            control.mathfield.executeCommand('undo');
            return { before, after: control.mathfield.getValue('latex-unstyled') };
        });
        expect(result.after).toBe(result.before);
    });

    test('a term nobody defines is left alone, uncoloured and unflagged', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Initial', '\\displaylines{a=1\\\\NO_2\\left(0\\right)=a\\cdot r}');
        await setCardBackground(page, 'Initial', '#ffffff');
        await page.waitForTimeout(500);
        const rendered = await renderedColors(page, 'Initial');
        expect(colorOf(rendered, 'r')).not.toBe(adaptedColor('#ad6800', '#ffffff', 6.5));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        const report = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Initial').expressionControl;
            return {
                element: control.containerElement.querySelector('.mdl-expression-diagnostics'),
                description: control.mathfield.getAttribute('aria-description')
            };
        });
        expect(report.element).toBe(null);
        expect(report.description).toBe(null);
    });

    test('a term the metadata calls an error is painted in the error colour', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Errors', '\\displaylines{a=q\\\\b=2}');
        await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Errors').expressionControl;
            control.options.getSemanticMetadata = () => ({
                signature: 'errors',
                getSymbolRole: symbolName => (symbolName === 'q' ? 'error' : null)
            });
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
        });
        await page.waitForTimeout(300);
        await setCardBackground(page, 'Errors', '#ffffff');
        const rendered = await renderedColors(page, 'Errors');
        expect(colorOf(rendered, 'q')).toBe(adaptedColor('#d32f2f', '#ffffff', 7));
    });

    test('the dark theme tokens stay readable over a light card', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await setCardBackground(page, 'Parameters', '#ffffff');
        const lightThemeVariable = colorOf(await renderedColors(page, 'Parameters'), 'a');
        await page.evaluate(() => {
            document.documentElement.dataset.theme = 'dark';
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
        });
        await page.waitForTimeout(300);
        const darkThemeVariable = colorOf(await renderedColors(page, 'Parameters'), 'a');
        expect(lightThemeVariable).toBe(adaptedColor('#183b66', '#ffffff', 6));
        expect(darkThemeVariable).toBe(adaptedColor('#a9c8ee', '#ffffff', 6));
        expect(contrastWith(darkThemeVariable, '#ffffff')).toBeGreaterThanOrEqual(6);
    });

    test('the semantic colours are read from theme tokens', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await setCardBackground(page, 'Parameters', '#ffffff');
        await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Parameters').expressionControl;
            control.mathfield.style.setProperty('--math-variable', '#00807f');
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
        });
        await page.waitForTimeout(300);
        expect(colorOf(await renderedColors(page, 'Parameters'), 'a')).toBe(adaptedColor('#00807f', '#ffffff', 6));
    });

    test('the background behind the field is measured', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await setCardBackground(page, 'Parameters', '#101418');
        expect(await measuredBackground(page, 'Parameters')).toBe('#101418');
        await setCardBackground(page, 'Parameters', 'white');
        expect(await measuredBackground(page, 'Parameters')).toBe('#ffffff');
        await setCardBackground(page, 'Parameters', 'rgba(0, 0, 0, 0.5)');
        const translucentBackground = await measuredBackground(page, 'Parameters');
        expect(translucentBackground).not.toBe('#000000');
        expect(translucentBackground).not.toBe('#ffffff');
        expect(MathColorScheme.isLight(MathColorScheme.parse(translucentBackground))).toBe(false);
    });

    test('every colour keeps its contrast over a dark card', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Colours', '\\displaylines{a=0.10\\\\K_c=\\sin\\left(a\\right)\\\\y=x_n}');
        await setCardBackground(page, 'Colours', '#111318');
        const rendered = await renderedColors(page, 'Colours');
        ['a', '0', 'sin', 'c', 'n', '='].forEach(text => expect(contrastWith(colorOf(rendered, text), '#111318')).toBeGreaterThanOrEqual(4.5));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#111318', 6));
        expect(colorOf(rendered, '=')).toBe(adaptedColor('#626b75', '#111318', 4.5));
    });

    test('the same tokens land on different colours over a light and a dark card', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Colours', '\\displaylines{a=0.10\\\\b=2}');
        await setCardBackground(page, 'Colours', '#ffffff');
        const overLight = colorOf(await renderedColors(page, 'Colours'), 'a');
        await setCardBackground(page, 'Colours', '#000000');
        const overDark = colorOf(await renderedColors(page, 'Colours'), 'a');
        expect(overLight).not.toBe(overDark);
        expect(contrastWith(overLight, '#ffffff')).toBeGreaterThanOrEqual(6);
        expect(contrastWith(overDark, '#000000')).toBeGreaterThanOrEqual(6);
    });

    test('picking a new card colour repaints the expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await setCardBackground(page, 'Parameters', '#ffffff');
        const overLight = colorOf(await renderedColors(page, 'Parameters'), 'a');
        await page.evaluate(() => shell.board.shapes.getByName('Parameters').setPropertyCommand('backgroundColor', '#101418'));
        await page.waitForTimeout(400);
        const overDark = colorOf(await renderedColors(page, 'Parameters'), 'a');
        expect(overDark).not.toBe(overLight);
        expect(contrastWith(overDark, '#101418')).toBeGreaterThanOrEqual(6);
    });

    test('the brackets and the root sign stay visible over a dark card', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Brackets', '\\displaylines{a=1\\\\y=\\left(a+1\\right)\\cdot\\frac{a}{2}\\\\z=\\sqrt{a}}');
        await setCardColors(page, 'Brackets', '#000000', '#000000');
        const overDark = await renderedColors(page, 'Brackets');
        expect(contrastWith(colorOf(overDark, '('), '#000000')).toBeGreaterThanOrEqual(4.5);
        expect(contrastWith(colorOf(overDark, ')'), '#000000')).toBeGreaterThanOrEqual(4.5);
        expect(contrastWith(colorOf(overDark, '\u221a'), '#000000')).toBeGreaterThanOrEqual(4.5);
        await setCardColors(page, 'Brackets', '#ffffff', '#000000');
        expect(colorOf(await renderedColors(page, 'Brackets'), '(')).toBe('rgb(0, 0, 0)');
    });

    test('the text colour of the card is lifted only when the card hides it', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Brackets', '\\displaylines{a=1\\\\y=\\left(a+1\\right)}');
        await setCardColors(page, 'Brackets', '#ffffff', '#00807f');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Brackets').mathfield.style.color)).toBe('rgb(0, 128, 127)');
        await setCardColors(page, 'Brackets', '#101418', '#00807f');
        const overDark = await page.evaluate(() => shell.board.shapes.getByName('Brackets').mathfield.style.color);
        expect(overDark).not.toBe('rgb(0, 128, 127)');
        expect(contrastWith(overDark, '#101418')).toBeGreaterThanOrEqual(4.5);
    });

    test('the text colour does not drift when the field is repainted', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Brackets', '\\displaylines{a=1\\\\y=\\left(a+1\\right)}');
        await setCardColors(page, 'Brackets', '#000000', '#000000');
        const colors = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Brackets').expressionControl;
            const readings = [control.mathfield.style.color];
            for (let pass = 0; pass < 5; pass++) {
                control.refreshSemanticColoring();
                readings.push(control.mathfield.style.color);
            }
            return readings;
        });
        expect(new Set(colors).size).toBe(1);
    });

    test('clearing the colours hands the card its own text colour back', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Brackets', '\\displaylines{a=1\\\\y=\\left(a+1\\right)}');
        await setCardColors(page, 'Brackets', '#000000', '#00807f');
        const cleared = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Brackets').expressionControl;
            control.semanticDecorator.clear();
            return control.mathfield.style.color;
        });
        expect(cleared).toBe('rgb(0, 133, 132)');
    });

    test('the caret and the selection follow the background', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parameters', PARAMETER_GROUP);
        await setCardBackground(page, 'Parameters', '#000000');
        const overDark = await page.evaluate(() => {
            const mathfield = shell.board.shapes.getByName('Parameters').mathfield;
            return { caret: mathfield.style.getPropertyValue('--caret-color'), selection: mathfield.style.getPropertyValue('--selection-background-color') };
        });
        await setCardBackground(page, 'Parameters', '#ffffff');
        const overLight = await page.evaluate(() => shell.board.shapes.getByName('Parameters').mathfield.style.getPropertyValue('--caret-color'));
        expect(contrastWith(overDark.caret, '#000000')).toBeGreaterThanOrEqual(4.5);
        expect(contrastWith(overLight, '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(overDark.selection).toContain('rgba(');
        expect(overDark.caret).not.toBe(overLight);
    });
});

test.describe('rows the engine cannot parse', () => {
    const BROKEN_GROUP = '\\displaylines{a=1\\\\b=\\\\c=3}';

    async function blurExpression(page, name) {
        await page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).mathfield.blur(), name);
        await page.waitForTimeout(400);
    }

    function failingRows(page, name) {
        return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).failingRowIndexes, name);
    }

    // A row is checked when the user steps out of the card, not while they are still writing it: an
    // expression halfway through being typed is not an expression the engine could be expected to read.
    test('the offending row is marked when the expression loses focus, not while it is typed', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', '\\displaylines{a=1\\\\b=2}');
        await setCardBackground(page, 'Broken', '#ffffff');
        await focusExpression(page, 'Broken');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(400);
        expect(await failingRows(page, 'Broken')).toEqual([]);
        expect(colorOf(await renderedColors(page, 'Broken'), 'b')).toBe(adaptedColor('#183b66', '#ffffff', 6));
        await blurExpression(page, 'Broken');
        expect(await failingRows(page, 'Broken')).toEqual([1]);
        const rendered = await renderedColors(page, 'Broken');
        expect(colorOf(rendered, 'b')).toBe(adaptedColor('#d32f2f', '#ffffff', 7));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
    });

    function cardBorder(page, name) {
        return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).container.style.border, name);
    }

    test('the card is bordered in the error colour while a row is failing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        expect(await cardBorder(page, 'Sound')).toBe('1px solid rgb(0, 0, 0)');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        expect(await cardBorder(page, 'Broken')).toBe('1px solid rgb(211, 47, 47)');
        expect(await cardBorder(page, 'Sound')).toBe('1px solid rgb(0, 0, 0)');
    });

    test('the card keeps its own border when every row parses', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        await focusExpression(page, 'Sound');
        await blurExpression(page, 'Sound');
        expect(await cardBorder(page, 'Sound')).toBe('1px solid rgb(0, 0, 0)');
    });

    test('the border goes back to the one the user chose once the row is written again', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Broken');
            shape.properties.borderColor = '#00807f';
            shape.update();
        });
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect(await cardBorder(page, 'Broken')).toBe('1px solid rgb(211, 47, 47)');
        await focusExpression(page, 'Broken');
        await page.keyboard.type('7');
        await page.waitForTimeout(400);
        expect(await cardBorder(page, 'Broken')).toBe('1px solid rgb(0, 128, 127)');
    });

    function highlightColor(page, name) {
        return page.evaluate(shapeName => {
            const shape = shell.board.shapes.getByName(shapeName);
            shell.board.selection.applyHighlight(shape);
            return {
                resolved: shell.board.selection.resolveHighlightColor(shape),
                painted: shape._highlightProxy?.querySelector('rect:last-of-type')?.getAttribute('stroke') ?? null
            };
        }, name);
    }

    test('the hover and selection highlight is red while a row is failing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        const highlight = await highlightColor(page, 'Broken');
        expect(highlight.resolved).toBe('#d32f2f');
        expect(highlight.painted).toBe('#d32f2f');
    });

    test('the highlight goes back to the border of the shape once the row is written again', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Broken');
            shape.properties.borderColor = '#00807f';
            shape.update();
        });
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect((await highlightColor(page, 'Broken')).resolved).toBe('#d32f2f');
        await focusExpression(page, 'Broken');
        await page.keyboard.type('7');
        await page.waitForTimeout(400);
        expect((await highlightColor(page, 'Broken')).resolved).toBe('#00807f');
    });

    function playButton(page) {
        return page.evaluate(() => ({
            icon: $('#playPauseButton').dxButton('instance').option('icon'),
            marked: $('#playPauseButton').hasClass('mdl-player-error'),
            color: getComputedStyle(document.querySelector('#playPauseButton .dx-icon')).color
        }));
    }

    test('the play button is solid red while the model carries a failing row', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect(await page.evaluate(() => shell.hasExpressionErrors())).toBe(true);
        const button = await playButton(page);
        expect(button.icon).toBe('fa-solid fa-play');
        expect(button.marked).toBe(true);
        expect(button.color).toBe('rgb(211, 47, 47)');
    });

    test('the play button goes back to normal once the row is written again', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect((await playButton(page)).icon).toBe('fa-solid fa-play');
        await focusExpression(page, 'Broken');
        await page.keyboard.type('7');
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => shell.hasExpressionErrors())).toBe(false);
        const button = await playButton(page);
        expect(button.icon).toBe('fa-light fa-play');
        expect(button.marked).toBe(false);
    });

    test('a sound model leaves the play button alone', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        await focusExpression(page, 'Sound');
        await blurExpression(page, 'Sound');
        expect(await page.evaluate(() => shell.hasExpressionErrors())).toBe(false);
        expect((await playButton(page)).icon).toBe('fa-light fa-play');
    });

    test('a model that is opened shows the rows the engine cannot read', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        const model = await page.evaluate(() => JSON.stringify(shell.serialize()));
        await page.evaluate(savedModel => shell.openModel(savedModel), model);
        await page.waitForTimeout(1200);
        expect(await failingRows(page, 'Broken')).toEqual([1]);
        expect(await cardBorder(page, 'Broken')).toBe('1px solid rgb(211, 47, 47)');
        expect((await playButton(page)).icon).toBe('fa-solid fa-play');
        await setCardBackground(page, 'Broken', '#ffffff');
        const rendered = await renderedColors(page, 'Broken');
        expect(colorOf(rendered, 'b')).toBe(adaptedColor('#d32f2f', '#ffffff', 7));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
    });

    test('a model whose rows all parse opens unmarked', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        const model = await page.evaluate(() => JSON.stringify(shell.serialize()));
        await page.evaluate(savedModel => shell.openModel(savedModel), model);
        await page.waitForTimeout(1200);
        expect(await failingRows(page, 'Sound')).toEqual([]);
        expect(await cardBorder(page, 'Sound')).toBe('1px solid rgb(0, 0, 0)');
    });

    test('rows the engine reads are left alone', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        await setCardBackground(page, 'Sound', '#ffffff');
        await focusExpression(page, 'Sound');
        await blurExpression(page, 'Sound');
        expect(await failingRows(page, 'Sound')).toEqual([]);
        expect(colorOf(await renderedColors(page, 'Sound'), 'b')).toBe(adaptedColor('#183b66', '#ffffff', 6));
    });

    test('the mark is dropped as soon as the row is written again', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await setCardBackground(page, 'Broken', '#ffffff');
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect(await failingRows(page, 'Broken')).toEqual([1]);
        await focusExpression(page, 'Broken');
        await page.keyboard.type('7');
        await page.waitForTimeout(400);
        expect(await failingRows(page, 'Broken')).toEqual([]);
        expect(colorOf(await renderedColors(page, 'Broken'), 'b')).toBe(adaptedColor('#183b66', '#ffffff', 6));
    });

    test('checking the rows leaves no term behind in the model', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Broken', '\\displaylines{zz=\\\\a=1}');
        await focusExpression(page, 'Broken');
        await blurExpression(page, 'Broken');
        expect(await page.evaluate(() => shell.calculator.getTermsNames())).not.toContain('zz');
    });
});

// The parser knows most of its functions as commands - \sin, \log - which mathlive draws upright,
// and four of them as plain letters - sign, round, rnd, irnd - which it draws slanted, so those four
// read as a product of variables unless they are written upright themselves.
test.describe('functions the parser spells in plain letters', () => {
    function renderedFontStyle(page, name, text) {
        return page.evaluate(({ shapeName, letter }) => {
            const mathfield = shell.board.shapes.getByName(shapeName).mathfield;
            const elements = Array.from(mathfield.shadowRoot.querySelectorAll('*'));
            const element = elements.find(candidate => candidate.children.length === 0 && candidate.textContent.trim() === letter);
            return element ? getComputedStyle(element).fontStyle : null;
        }, { shapeName: name, letter: text });
    }

    test('a function typed with a parenthesis is written upright', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Rounded', '\\displaylines{}');
        await focusExpression(page, 'Rounded');
        await page.keyboard.type('y=round(x+2');
        await page.waitForTimeout(400);
        // The upright face has to stop at the name: carried on, it would swallow the argument as well.
        expect(await canonicalLatex(page, 'Rounded')).toContain('y=\\mathrm{round}\\left(x+2\\right)');
    });

    test('every plain-letter function the parser knows is written upright', async ({ page }) => {
        await setupEditor(page);
        for (const functionName of ['sign', 'rnd', 'irnd']) {
            await addExpression(page, functionName, '\\displaylines{}');
            await focusExpression(page, functionName);
            await page.keyboard.type(`y=${functionName}(0`);
            await page.waitForTimeout(400);
            expect(await canonicalLatex(page, functionName)).toContain(`\\mathrm{${functionName}}`);
        }
    });

    test('a function written in plain letters is lifted upright when the model is opened', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Opened', '\\displaylines{y=round\\left(x\\right)}');
        expect(await presentedLatex(page, 'Opened')).toContain('\\mathrm{round}');
        expect(await storedExpression(page, 'Opened')).toContain('\\mathrm{round}');
    });

    test('a name that merely ends in a function name is left alone', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Ground', '\\displaylines{ground=2}');
        expect(await presentedLatex(page, 'Ground')).not.toContain('\\mathrm');
    });

    test('the upright function is drawn upright and the variable beside it slanted', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Drawn', '\\displaylines{y=round\\left(x\\right)}');
        expect(await renderedFontStyle(page, 'Drawn', 'r')).toBe('normal');
        expect(await renderedFontStyle(page, 'Drawn', 'x')).toBe('italic');
    });

    // The engine reads only the plain spelling, so the upright one has to be read back on the way in:
    // a function left wrapped would be taken for a term of its own and the row would stop parsing.
    test('the upright function still parses and leaves no term behind', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Parsed', '\\displaylines{x=2.4\\\\y=round\\left(x\\right)}');
        await page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).mathfield.blur(), 'Parsed');
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(400);
        expect(await page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).failingRowIndexes, 'Parsed')).toEqual([]);
        const termNames = await page.evaluate(() => shell.calculator.getTermsNames());
        expect(termNames).toContain('y');
        expect(termNames.some(termName => termName.includes('mathrm'))).toBe(false);
    });
});

test.describe('mathfield behaviour that must not change', () => {
    test('the differential shortcut still writes a derivative', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Rates', '\\displaylines{}');
        await focusExpression(page, 'Rates');
        await page.keyboard.type('dx/dt');
        await expect.poll(() => canonicalLatex(page, 'Rates')).toContain('\\frac{\\differentialD{x}}{\\differentialD{t}}');
    });

    test('a named part of a term is still written as a marked subscript', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Named', '\\displaylines{v.x=3\\\\a=v.x \\cdot 2}');
        expect(await presentedLatex(page, 'Named')).toContain('v_{\\!x}');
        expect(await storedExpression(page, 'Named')).toContain('v_{\\!x}');
    });

    test('a relational shortcut is still applied', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Relations', '\\displaylines{}');
        await focusExpression(page, 'Relations');
        await page.keyboard.type('x>=1');
        await expect.poll(() => canonicalLatex(page, 'Relations')).toContain('\\ge');
    });

    test('a function shortcut is still applied', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Functions', '\\displaylines{}');
        await focusExpression(page, 'Functions');
        await page.keyboard.type('y=sin(');
        await expect.poll(() => canonicalLatex(page, 'Functions')).toContain('\\sin');
    });
});
