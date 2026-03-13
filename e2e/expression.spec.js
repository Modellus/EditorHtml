const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/editor.html';

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

async function getExpressionMathfield(page, name) {
    return page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        return shape?.mathfield ? true : false;
    }, name);
}

async function focusExpression(page, name) {
    await page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        shape.mathfield.focus();
    }, name);
    await page.waitForTimeout(200);
}

async function getExpressionValue(page, name) {
    return page.evaluate(n => {
        const shape = shell.board.shapes.getByName(n);
        return shape.mathfield.getValue();
    }, name);
}

async function setExpressionValue(page, name, value) {
    await page.evaluate(({ n, v }) => {
        const shape = shell.board.shapes.getByName(n);
        shape.mathfield.value = v;
        shape.mathfield.position = 0;
        shape.mathfield.executeCommand('moveToNextChar');
    }, { n: name, v: value });
}

test.describe('MathLive caret clamping', () => {
    test('caret cannot move before displaylines opening brace', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        for (let i = 0; i < 30; i++)
            await page.keyboard.press('ArrowLeft');
        const position = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            return shape.mathfield.position;
        });
        expect(position).toBeGreaterThanOrEqual(1);
    });

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
});

test.describe('Enter key - line splitting', () => {
    test('Enter at end of line creates a new empty line', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\\\');
        expect(value).toMatch(/x\+1/);
    });

    test('Enter in middle of line splits content', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\\\');
    });

    test('Enter at start of line moves all content to new line', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Home');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(200);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\\\');
    });

    test('multiple Enter presses create multiple lines', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{a}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('b');
        await page.keyboard.press('Enter');
        await page.keyboard.type('c');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        const lineBreaks = (value.match(/\\\\/g) || []).length;
        expect(lineBreaks).toBe(2);
    });
});

test.describe('Backspace key - line merging', () => {
    test('Backspace at start of second line merges with first', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x+1}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('y');
        await page.waitForTimeout(200);
        let value = await getExpressionValue(page, 'Expr1');
        expect(value).toContain('\\\\');
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        value = await getExpressionValue(page, 'Expr1');
        expect(value).not.toContain('\\\\');
    });

    test('Backspace in middle of line deletes character normally', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{xy}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('End');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toBe('\\displaylines{x}');
    });

    test('Backspace at start of only line does nothing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{x}');
        await focusExpression(page, 'Expr1');
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toBe('\\displaylines{x}');
    });
});

test.describe('Content stays inside displaylines', () => {
    test('typed content remains inside displaylines wrapper', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x+1');
        await page.waitForTimeout(300);
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toMatch(/^\\displaylines\{.*\}$/);
        expect(value).toContain('x');
    });

    test('displaylines wrapper is preserved after setting value', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await setExpressionValue(page, 'Expr1', '\\displaylines{a^2+b^2}');
        const value = await getExpressionValue(page, 'Expr1');
        expect(value).toBe('\\displaylines{a^2+b^2}');
    });
});

test.describe('Inline shortcut handling', () => {
    test('dead key x^2 produces correct atom count', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Expr1');
        await focusExpression(page, 'Expr1');
        await page.keyboard.type('x');
        const cdpSession = await page.context().newCDPSession(page);
        await cdpSession.send('Input.imeSetComposition', {
            selectionStart: -1,
            selectionEnd: -1,
            text: '^'
        });
        await page.waitForTimeout(300);
        await page.keyboard.type('2');
        await page.waitForTimeout(500);
        const result = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const atoms = shape.mathfield._mathfield.model.atoms;
            return {
                value: shape.mathfield.getValue(),
                atomCount: atoms.slice(1, -1).length
            };
        });
        expect(result.value).toContain('x^2');
        expect(result.atomCount).toBe(5);
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
