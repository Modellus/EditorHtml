const { test, expect } = require('@playwright/test');

const HARNESS_URL = '/e2e/mathfield-harness.html';

async function setupMathfield(page) {
    await page.goto(HARNESS_URL);
    await page.waitForFunction(() => window.__mathfieldReady === true, null, { timeout: 10000 });
    await page.waitForTimeout(300);
}

function getMathfieldValue(page) {
    return page.evaluate(() => document.getElementById('mf').getValue());
}

function getMathfieldPosition(page) {
    return page.evaluate(() => document.getElementById('mf').position);
}

function setMathfieldValue(page, value) {
    return page.evaluate(v => {
        const mf = document.getElementById('mf');
        mf.value = v;
        mf.position = 0;
        mf.executeCommand('moveToNextChar');
    }, value);
}

async function focusMathfield(page) {
    await page.evaluate(() => document.getElementById('mf').focus());
    await page.waitForTimeout(100);
}

test.describe('MathLive caret clamping', () => {
    test('caret cannot move before displaylines opening brace', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        for (let i = 0; i < 30; i++)
            await page.keyboard.press('ArrowLeft');
        const position = await getMathfieldPosition(page);
        expect(position).toBeGreaterThanOrEqual(1);
    });

    test('caret cannot move past the last offset', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        const lastOffset = await page.evaluate(() => document.getElementById('mf').lastOffset);
        for (let i = 0; i < 30; i++)
            await page.keyboard.press('ArrowRight');
        const position = await getMathfieldPosition(page);
        expect(position).toBeLessThanOrEqual(lastOffset);
    });

    test('Home key moves caret to group start', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('End');
        await page.keyboard.press('Home');
        const position = await getMathfieldPosition(page);
        const groupStart = await page.evaluate(() => {
            const mf = document.getElementById('mf');
            const saved = mf.selection;
            mf.executeCommand('moveToGroupStart');
            const pos = mf.position;
            mf.selection = saved;
            return pos;
        });
        expect(position).toBe(groupStart);
    });

    test('End key moves caret to group end', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('Home');
        await page.keyboard.press('End');
        const position = await getMathfieldPosition(page);
        const groupEnd = await page.evaluate(() => {
            const mf = document.getElementById('mf');
            const saved = mf.selection;
            mf.executeCommand('moveToGroupEnd');
            const pos = mf.position;
            mf.selection = saved;
            return pos;
        });
        expect(position).toBe(groupEnd);
    });
});

test.describe('Enter key - line splitting', () => {
    test('Enter at end of line creates a new empty line', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        const value = await getMathfieldValue(page);
        expect(value).toContain('\\\\');
        expect(value).toMatch(/x\+1/);
    });

    test('Enter in middle of line splits content', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        const value = await getMathfieldValue(page);
        expect(value).toContain('\\\\');
    });

    test('Enter at start of line moves all content to new line', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('Home');
        await page.keyboard.press('Enter');
        const value = await getMathfieldValue(page);
        expect(value).toContain('\\\\');
    });

    test('multiple Enter presses create multiple lines', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{a}');
        await focusMathfield(page);
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('b');
        await page.keyboard.press('Enter');
        await page.keyboard.type('c');
        await page.waitForTimeout(200);
        const value = await getMathfieldValue(page);
        const lineBreaks = (value.match(/\\\\/g) || []).length;
        expect(lineBreaks).toBe(2);
    });
});

test.describe('Backspace key - line merging', () => {
    test('Backspace at start of second line merges with first', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x+1}');
        await focusMathfield(page);
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        await page.keyboard.type('y');
        await page.waitForTimeout(200);
        let value = await getMathfieldValue(page);
        expect(value).toContain('\\\\');
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        value = await getMathfieldValue(page);
        expect(value).not.toContain('\\\\');
    });

    test('Backspace in middle of line deletes character normally', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{xy}');
        await focusMathfield(page);
        await page.keyboard.press('End');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        const value = await getMathfieldValue(page);
        expect(value).toBe('\\displaylines{x}');
    });

    test('Backspace at start of only line does nothing', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{x}');
        await focusMathfield(page);
        await page.keyboard.press('Home');
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(200);
        const value = await getMathfieldValue(page);
        expect(value).toBe('\\displaylines{x}');
    });
});

test.describe('Content stays inside displaylines', () => {
    test('typed content remains inside displaylines wrapper', async ({ page }) => {
        await setupMathfield(page);
        await focusMathfield(page);
        await page.keyboard.type('x+1');
        await page.waitForTimeout(300);
        const value = await getMathfieldValue(page);
        expect(value).toMatch(/^\\displaylines\{.*\}$/);
        expect(value).toContain('x');
    });

    test('displaylines wrapper is preserved after setting value', async ({ page }) => {
        await setupMathfield(page);
        await setMathfieldValue(page, '\\displaylines{a^2+b^2}');
        const value = await getMathfieldValue(page);
        expect(value).toBe('\\displaylines{a^2+b^2}');
    });
});

test.describe('Inline shortcut handling', () => {
    test('dx shortcut is removed - typing dx does not produce differential', async ({ page }) => {
        await setupMathfield(page);
        await focusMathfield(page);
        await page.keyboard.type('dx');
        await page.waitForTimeout(500);
        const value = await getMathfieldValue(page);
        expect(value).not.toContain('\\differentialD');
    });

    test('dy shortcut is removed', async ({ page }) => {
        await setupMathfield(page);
        await focusMathfield(page);
        await page.keyboard.type('dy');
        await page.waitForTimeout(500);
        const value = await getMathfieldValue(page);
        expect(value).not.toContain('\\differentialD');
    });

    test('dt shortcut is removed', async ({ page }) => {
        await setupMathfield(page);
        await focusMathfield(page);
        await page.keyboard.type('dt');
        await page.waitForTimeout(500);
        const value = await getMathfieldValue(page);
        expect(value).not.toContain('\\differentialD');
    });
});
