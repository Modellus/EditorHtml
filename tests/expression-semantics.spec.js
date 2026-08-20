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

    test('a term nobody defines is reported with an icon, a tooltip and a message', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Initial', INITIAL_VALUES_GROUP);
        await page.waitForTimeout(500);
        const diagnostics = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Initial').expressionControl;
            const element = control.containerElement.querySelector('.mdl-expression-diagnostics');
            return {
                messages: control.semanticDecorator.getDiagnostics().map(diagnostic => diagnostic.message),
                title: element.title,
                role: element.getAttribute('role'),
                live: element.getAttribute('aria-live'),
                icon: element.querySelector('i').className,
                description: control.mathfield.getAttribute('aria-description')
            };
        });
        expect(diagnostics.messages).toContain('Unknown term: r');
        expect(diagnostics.title).toContain('Unknown term: r');
        expect(diagnostics.role).toBe('status');
        expect(diagnostics.live).toBe('polite');
        expect(diagnostics.icon).toContain('fa-triangle-exclamation');
        expect(diagnostics.description).toContain('Unknown term: r');
    });

    test('an unknown term is painted amber and a known one is not', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Initial', '\\displaylines{a=1\\\\NO_2\\left(0\\right)=a\\cdot r}');
        await setCardBackground(page, 'Initial', '#ffffff');
        const rendered = await renderedColors(page, 'Initial');
        expect(colorOf(rendered, 'r')).toBe(adaptedColor('#ad6800', '#ffffff', 6.5));
        expect(colorOf(rendered, 'a')).toBe(adaptedColor('#183b66', '#ffffff', 6));
    });

    test('the report goes away once every term is defined', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Initial', '\\displaylines{r=2\\\\NO_2\\left(0\\right)=a\\cdot r\\\\a=1}');
        await page.waitForTimeout(500);
        const diagnostics = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Initial').expressionControl;
            return {
                messages: control.semanticDecorator.getDiagnostics(),
                element: control.containerElement.querySelector('.mdl-expression-diagnostics'),
                description: control.mathfield.getAttribute('aria-description')
            };
        });
        expect(diagnostics.messages).toEqual([]);
        expect(diagnostics.element).toBe(null);
        expect(diagnostics.description).toBe(null);
    });

    test('an error outranks a warning in the report', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Errors', '\\displaylines{a=q\\\\b=2}');
        const report = await page.evaluate(() => {
            const control = shell.board.shapes.getByName('Errors').expressionControl;
            control.options.getSemanticMetadata = () => ({
                signature: 'errors',
                getSymbolRole: symbolName => (symbolName === 'q' ? 'error' : null),
                getDiagnosticMessage: symbolName => `Unknown term: ${symbolName}`
            });
            control.semanticDecorator.invalidate();
            control.refreshSemanticColoring();
            const element = control.containerElement.querySelector('.mdl-expression-diagnostics');
            return { className: element.className, icon: element.querySelector('i').className, roles: control.semanticDecorator.getDiagnostics().map(diagnostic => diagnostic.role) };
        });
        await page.waitForTimeout(300);
        expect(report.roles).toContain('error');
        expect(report.className).toContain('mdl-expression-diagnostics-error');
        expect(report.icon).toContain('fa-circle-exclamation');
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
        expect(cleared).toBe('rgb(0, 128, 127)');
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

test.describe('mathfield behaviour that must not change', () => {
    test('the differential shortcut still writes a derivative', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Rates', '\\displaylines{}');
        await focusExpression(page, 'Rates');
        await page.keyboard.type('dx/dt');
        await page.waitForTimeout(400);
        expect(await canonicalLatex(page, 'Rates')).toContain('\\frac{\\differentialD{x}}{\\differentialD{t}}');
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
        await page.waitForTimeout(400);
        expect(await canonicalLatex(page, 'Relations')).toContain('\\ge');
    });

    test('a function shortcut is still applied', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Functions', '\\displaylines{}');
        await focusExpression(page, 'Functions');
        await page.keyboard.type('y=sin(');
        await page.waitForTimeout(400);
        expect(await canonicalLatex(page, 'Functions')).toContain('\\sin');
    });
});
