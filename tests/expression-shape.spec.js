const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addExpression(page, name) {
    await page.evaluate(n => modellus.shape.addExpression(n), name);
    await page.waitForTimeout(500);
}

async function getExpressionValue(page, name) {
    return page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        return shape.mathfield.getValue('latex-unstyled');
    }, name);
}

async function focusExpression(page, name) {
    await page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        shape.mathfield.focus();
    }, name);
    await page.waitForTimeout(200);
}

async function setExpressionValue(page, name, value) {
    await page.evaluate(({ n, v }) => {
        const shape = shell.board.shapes.getByName(n);
        shape.properties.expression = v;
        shape.mathfield.value = v;
        shape.mathfield.position = 0;
        shape.mathfield.executeCommand('moveToNextChar');
    }, { n: name, v: value });
}

    test('caret cannot move past the last offset', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        const lastOffset = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield.lastOffset;
        });
        for (let i = 0; i < 30; i++)
            await page.keyboard.press('ArrowRight');
        const position = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield.position;
        });
        expect(position).toBeLessThanOrEqual(lastOffset);
    });

    test('Home key moves caret to group start', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('End');
        await page.keyboard.press('Home');
        const position = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const saved = shape.mathfield.selection;
            shape.mathfield.executeCommand('moveToGroupStart');
            const pos = shape.mathfield.position;
            shape.mathfield.selection = saved;
            return pos;
        });
        const currentPos = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield.position;
        });
        expect(currentPos).toBe(position);
    });

    test('End key moves caret to group end', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Home');
        await page.keyboard.press('End');
        const groupEnd = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const saved = shape.mathfield.selection;
            shape.mathfield.executeCommand('moveToGroupEnd');
            const pos = shape.mathfield.position;
            shape.mathfield.selection = saved;
            return pos;
        });
        const currentPos = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield.position;
        });
        expect(currentPos).toBe(groupEnd);
    });


test.describe('Inline shortcut handling', () => {
    test('power keybindings are registered', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        const keybindings = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield._mathfield.options.keybindings
                .filter(keybinding => keybinding.command === 'moveToSuperscript')
                .map(keybinding => keybinding.key);
        });
        expect(keybindings).toContain('shift+[Digit6]');
    });

    test('dx shortcut is removed - typing dx does not produce differential', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dx');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\differentialD');
    });

    test('dy shortcut is removed', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dy');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\differentialD');
    });

    test('dt shortcut is removed', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dt');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\differentialD');
    });
});

test.describe('Differential expansion caret placement', () => {
    test('caret is left writing the name the differential was written around', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dx/dt');
        await page.waitForTimeout(400);
        const positionCheck = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const savedSelection = shape.mathfield.selection;
            shape.mathfield.executeCommand('moveToGroupEnd');
            const groupEndPosition = shape.mathfield.position;
            shape.mathfield.selection = savedSelection;
            return {
                currentPosition: shape.mathfield.position,
                groupEndPosition,
                value: shape.mathfield.getValue('latex-unstyled')
            };
        });
        expect(positionCheck.value).toContain('\\frac{\\differentialD{x}}{\\differentialD{t}}');
        expect(positionCheck.currentPosition).toBe(positionCheck.groupEndPosition);
        await page.keyboard.type('ime');
        await page.waitForTimeout(300);
        expect(await getExpressionValue(page, 'Expr1')).toContain('\\frac{\\differentialD{x}}{\\differentialD{time}}');
        await page.keyboard.type('=1');
        await page.waitForTimeout(300);
        const valueAfterEquals = await getExpressionValue(page, 'Expr1');
        expect(valueAfterEquals).toContain('\\frac{\\differentialD{x}}{\\differentialD{time}}=1');
        expect(valueAfterEquals).not.toContain('\\differentialD{x=}');
        expect(valueAfterEquals).not.toContain('\\differentialD{time=}');
    });

    test('a space after the name carries on after the fraction', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dx/dt');
        await page.waitForTimeout(400);
        await page.keyboard.press('Space');
        await page.keyboard.type('+1');
        await page.waitForTimeout(300);
        expect(await getExpressionValue(page, 'Expr1')).toContain('\\frac{\\differentialD{x}}{\\differentialD{t}}+1');
    });

    test('a greek letter name is written as the letter it names', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dtheta/dt=10');
        await expect.poll(() => getExpressionValue(page, 'Expr1')).toContain('\\frac{\\differentialD{\\theta}}{\\differentialD{t}}=10');
    });

    test('a new row after the name is a row of its own', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('dx/dt');
        await page.waitForTimeout(400);
        await page.keyboard.press('Enter');
        await page.keyboard.type('y=2');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\frac{\\differentialD{x}}{\\differentialD{t}}');
        expect(value).toContain('y=2');
        expect(value).not.toContain('\\differentialD{ty}');
    });
});

test.describe('Differential template shortcut', () => {
    test('palette differential template parses as a derivative like manual typing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const shortcuts = resolveExpressionTemplateShortcuts('t');
            const differential = shortcuts.find(shortcut => shortcut.name === 'Differential');
            shape.insert(differential.insertText);
        });
        await page.waitForTimeout(400);
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        await page.waitForTimeout(400);
        const filledValue = await getExpressionValue(page, 'Expr1');
        expect(filledValue).not.toContain('\\mathrm');
        expect(filledValue).toMatch(/\\differentialD\{?\s*x\}?/);
        const parseResult = await page.evaluate(latex => {
            shell.board.calculator.parse(latex + '=1');
            return Object.keys(shell.board.calculator.system.terms);
        }, filledValue);
        expect(parseResult).toContain('x');
    });
});

test.describe('Keyboard shortcuts', () => {

    test('Ctrl+. opens the keyboard-accessible template palette without toolbar visibility', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await expect(page.locator('.mdl-expression-shortcuts-hint')).toHaveText(/^(Ctrl\+\.|⌘\.)$/);
        await page.evaluate(() => shell.board.shapes.getByName('Expr1').hideContextToolbar());
        await page.keyboard.press('Control+.');
        const palette = page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette');
        await expect(palette).toBeVisible();
        await expect(palette.locator('.mdl-shortcuts-palette-search')).toHaveCount(0);
        await expect(palette.locator('.dx-textbox')).toHaveCount(0);
        await expect(palette.locator('.dx-tileview')).toHaveCount(1);
        await expect(palette.locator('.mdl-shortcuts-palette-tile')).toHaveCount(31);
        await expect(palette.locator('.mdl-shortcuts-palette-name')).toHaveCount(0);
        await expect(palette.locator('.mdl-shortcuts-palette-key')).toHaveCount(0);
        await expect(palette.locator('.mdl-shortcuts-palette-tile-focused')).toHaveCount(0);
        await expect(palette.locator('.mdl-shortcuts-palette-status-content')).toHaveCount(0);
        const shadingEnabled = await page.evaluate(() => shell.board.shapes.getByName('Expr1')._shortcutsPopup.option('shading'));
        expect(shadingEnabled).toBe(false);
        const shortcutKeys = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.getTemplateShortcuts().map(shortcut => shape.getShortcutPaletteKeyText(shortcut));
        });
        expect(shortcutKeys).toEqual(expect.arrayContaining(['!', '%', '|', '<>', '>=', '<=', '*', "'"]));
        const shortcutNames = await page.evaluate(() => shell.board.shapes.getByName('Expr1').getTemplateShortcuts().map(shortcut => shortcut.name));
        expect(shortcutNames).toEqual(expect.arrayContaining(['Belongs to', 'Set', 'Range', 'Interval', 'Union', 'Text values', 'Real numbers', 'Integers', 'Natural numbers', 'Booleans', 'Named domain']));
    });

    test('template palette focuses explicitly and inserts the focused result with Enter', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Control+.');
        const palette = page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette');
        await expect(palette.locator('.mdl-shortcuts-palette-tile-focused')).toHaveCount(0);
        await page.keyboard.press('ArrowRight');
        await expect(palette.locator('.mdl-shortcuts-palette-tile-focused')).toHaveCount(1);
        await expect(palette.locator('.mdl-shortcuts-palette-status-name')).toHaveText('Differential');
        await expect(palette.locator('.mdl-shortcuts-palette-shortcut-pill')).toHaveText(/^(Alt\+|⌥)\/$/);
        await page.keyboard.press('ArrowRight');
        await expect(palette.locator('.mdl-shortcuts-palette-status-name')).toHaveText('Power');
        await expect(palette.locator('.mdl-shortcuts-palette-shortcut-pill')).toHaveText('^');
        await page.keyboard.press('Enter');
        await expect(page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette')).toBeHidden();
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('^2');
    });

    test('clicking a template tile inserts its shortcut', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Control+.');
        const palette = page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette');
        await palette.locator('.mdl-shortcuts-palette-tile').nth(2).click();
        await expect(palette).toBeHidden();
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\sqrt');
    });

    test('index palette shortcut uses a generic mathematical index', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        const indexShortcut = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.getTemplateShortcut('Index');
        });
        expect(indexShortcut.text).toBe('x_{i}');
        expect(indexShortcut.insertText).toBe('\\placeholder{}_{\\placeholder{}}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Control+.');
        const renderedIndex = await page.locator('.mdl-shortcuts-palette-tile').nth(3).locator('math-field').evaluate(mathfield => mathfield.getValue('latex-unstyled'));
        expect(renderedIndex).not.toContain('\\_');
        expect(renderedIndex).toMatch(/^x_\{?i\}?$/);
    });

    test('Escape closes the template palette and returns focus to the expression', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        await page.keyboard.press('Control+.');
        await expect(page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette')).toBeHidden();
        await expect.poll(() => page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return document.activeElement === shape.mathfield;
        })).toBe(true);
        await page.keyboard.type('+1');
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('x+1');
        await page.keyboard.press('Control+.');
        await expect(page.locator('.mdl-shortcuts-picker-menu .mdl-shortcuts-palette')).toBeVisible();
        await page.keyboard.press('Escape');
    });

    test('~ produces negation on US keyboard', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: '~', code: 'Backquote',
            windowsVirtualKeyCode: 192, nativeVirtualKeyCode: 192, modifiers: 8
        });
        await cdpSession.send('Input.dispatchKeyEvent', { type: 'char', text: '~', code: 'Backquote', key: '~' });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: '~', code: 'Backquote',
            windowsVirtualKeyCode: 192, nativeVirtualKeyCode: 192
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\neg');
        expect(value).not.toContain('^');
    });

    test('dead ^ (Quote+Shift, Portuguese) produces superscript', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'Quote',
            windowsVirtualKeyCode: 222, nativeVirtualKeyCode: 222, modifiers: 8
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'Quote',
            windowsVirtualKeyCode: 222, nativeVirtualKeyCode: 222
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('2');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('x^2');
    });

    test('dead ~ (Quote, Portuguese) produces negation', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'Quote',
            windowsVirtualKeyCode: 222, nativeVirtualKeyCode: 222
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'Quote',
            windowsVirtualKeyCode: 222, nativeVirtualKeyCode: 222
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\neg');
        expect(value).not.toContain('^');
    });

    test('dead ^ (BracketLeft, French) produces superscript', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'BracketLeft',
            windowsVirtualKeyCode: 219, nativeVirtualKeyCode: 219
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'BracketLeft',
            windowsVirtualKeyCode: 219, nativeVirtualKeyCode: 219
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('2');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('x^2');
    });

    test('dead ^ (Option+I, all macOS) produces superscript', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'KeyI',
            windowsVirtualKeyCode: 73, nativeVirtualKeyCode: 73, modifiers: 1
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'KeyI',
            windowsVirtualKeyCode: 73, nativeVirtualKeyCode: 73
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('2');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('x^2');
    });

    test('dead ~ (Option+N, all macOS) produces negation', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'KeyN',
            windowsVirtualKeyCode: 78, nativeVirtualKeyCode: 78, modifiers: 1
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'KeyN',
            windowsVirtualKeyCode: 78, nativeVirtualKeyCode: 78
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\neg');
        expect(value).not.toContain('^');
    });

    test('Option+^ (BracketLeft+Alt) produces AND', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'BracketLeft',
            windowsVirtualKeyCode: 219, nativeVirtualKeyCode: 219, modifiers: 1
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'BracketLeft',
            windowsVirtualKeyCode: 219, nativeVirtualKeyCode: 219
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\land');
    });

    test('Option+v produces OR', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'v', code: 'KeyV',
            windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86, modifiers: 1
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'v', code: 'KeyV',
            windowsVirtualKeyCode: 86, nativeVirtualKeyCode: 86
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\lor');
    });

    test('\\ produces condition template', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: '\\', code: 'Backslash',
            windowsVirtualKeyCode: 220, nativeVirtualKeyCode: 220
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: '\\', code: 'Backslash',
            windowsVirtualKeyCode: 220, nativeVirtualKeyCode: 220
        });
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\begin{cases}');
    });

    test('! produces factorial', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('n!');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('!');
    });

    test('# produces square root', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const sink = shape.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
            sink.dispatchEvent(new KeyboardEvent('keydown', { key: '#', code: 'Digit3', bubbles: true, composed: true }));
            sink.dispatchEvent(new InputEvent('input', { data: '#', inputType: 'insertText', bubbles: true, composed: true }));
        });
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\sqrt');
    });

    test('<> produces not-equal', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x<>');
        await page.waitForTimeout(800);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\ne');
    });

    test('>= produces greater-or-equal', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x>=1');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toMatch(/\\ge/);
    });

    test('<= produces less-or-equal', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x<=1');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toMatch(/\\le/);
    });

    test('_ produces subscript (index)', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyDown', key: '_', code: 'Minus',
            windowsVirtualKeyCode: 189, nativeVirtualKeyCode: 189, modifiers: 8
        });
        await cdpSession.send('Input.dispatchKeyEvent', { type: 'char', text: '_', code: 'Minus' });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: '_', code: 'Minus',
            windowsVirtualKeyCode: 189, nativeVirtualKeyCode: 189
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('1');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toMatch(/x_\{?1\}?/);
    });

    test('% produces Delta', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const sink = shape.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
            sink.dispatchEvent(new KeyboardEvent('keydown', { key: '%', code: 'Digit5', bubbles: true, composed: true }));
            sink.dispatchEvent(new InputEvent('input', { data: '%', inputType: 'insertText', bubbles: true, composed: true }));
        });
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\Delta');
    });

    test('| produces absolute value', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const sink = shape.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
            sink.dispatchEvent(new KeyboardEvent('keydown', { key: '|', code: 'Backslash', bubbles: true, composed: true }));
            sink.dispatchEvent(new InputEvent('input', { data: '|', inputType: 'insertText', bubbles: true, composed: true }));
        });
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\left|');
    });

    test("' produces prime derivative", async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type("f'(t)=x*t");
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain("f^{\\prime}");
        expect(value).toMatch(/f\^\{\\prime\}\\left\(t\\right\)=x\\cdot t/);
    });

    test('dead key does not stall the editor', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'rawKeyDown', key: 'Dead', code: 'KeyE',
            windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69, modifiers: 1
        });
        await cdpSession.send('Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Dead', code: 'KeyE',
            windowsVirtualKeyCode: 69, nativeVirtualKeyCode: 69
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('y');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('y');
        expect(value).not.toContain('^');
    });

    test('mathfield starts with \\displaylines{} by default', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        const expression = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.properties.expression;
        });
        expect(expression).toBe('\\displaylines{}');
    });

    test('mathfield wraps typed content inside \\displaylines{}', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        await page.waitForTimeout(500);
        const expression = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.properties.expression;
        });
        expect(expression).toBe('\\displaylines{x}');
    });

    test('mathfield restores \\displaylines{} when cleared', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            shape.setProperties({ expression: '' });
        });
        await page.waitForTimeout(200);
        const expression = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.properties.expression;
        });
        expect(expression).toBe('\\displaylines{}');
    });
});

test.describe('Function shortcut requires parenthesis', () => {
    test('typing "constant" does not convert "cos" to function', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('constant');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\cos');
        expect(value).toContain('constant');
    });

    test('typing "cos(" converts to \\cos function', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('cos(');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\cos');
    });

    test('typing "sinx" does not convert "sin" to function', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('sinx');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\sin');
    });

    test('typing "sin(" converts to \\sin function', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('sin(');
        await page.waitForTimeout(500);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\sin');
    });
});
