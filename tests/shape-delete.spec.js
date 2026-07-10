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

async function addSelectedText(page, name) {
    await page.evaluate(shapeName => {
        modellus.shape.addText(shapeName);
        const textShape = shell.board.shapes.getByName(shapeName);
        shell.board.selection.select(textShape);
    }, name);
    await page.waitForTimeout(250);
}

async function shapeExists(page, name) {
    return page.evaluate(shapeName => !!shell.board.shapes.getByName(shapeName), name);
}

test('delete key removes the selected shape through RemoveShapeCommand', async ({ page }) => {
    await setupEditor(page);
    await addSelectedText(page, 'Text1');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(false);
    const lastCommand = await page.evaluate(() => shell.board.invoker.history[shell.board.invoker.history.length - 1].constructor.name);
    expect(lastCommand).toBe('RemoveShapeCommand');
});

test('backspace key removes the selected shape', async ({ page }) => {
    await setupEditor(page);
    await addSelectedText(page, 'Text1');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(false);
});

test('delete key does nothing while typing in an input', async ({ page }) => {
    await setupEditor(page);
    await addSelectedText(page, 'Text1');
    await page.evaluate(() => {
        const input = document.createElement('input');
        input.id = 'test-input';
        document.body.appendChild(input);
        input.focus();
    });
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(true);
});

test('delete key does nothing when no shape is selected', async ({ page }) => {
    await setupEditor(page);
    await addSelectedText(page, 'Text1');
    await page.evaluate(() => shell.board.deselect());
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(true);
});

test('deleting a shape can be undone and redone', async ({ page }) => {
    await setupEditor(page);
    await addSelectedText(page, 'Text1');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(false);
    await page.evaluate(() => shell.commands.undo());
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(true);
    await page.evaluate(() => shell.commands.redo());
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Text1')).toBe(false);
});

test('undoing the deletion of a parent restores its children', async ({ page }) => {
    await setupEditor(page);
    await page.evaluate(() => {
        modellus.shape.addReferential('Referential1');
        modellus.shape.addVector('Vector1', 'Referential1');
        const referentialShape = shell.board.shapes.getByName('Referential1');
        shell.board.selection.select(referentialShape);
    });
    await page.waitForTimeout(250);
    await page.keyboard.press('Delete');
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Referential1')).toBe(false);
    expect(await shapeExists(page, 'Vector1')).toBe(false);
    await page.evaluate(() => shell.commands.undo());
    await page.waitForTimeout(250);
    expect(await shapeExists(page, 'Referential1')).toBe(true);
    expect(await shapeExists(page, 'Vector1')).toBe(true);
    const parentLink = await page.evaluate(() => {
        const referentialShape = shell.board.shapes.getByName('Referential1');
        const vectorShape = shell.board.shapes.getByName('Vector1');
        return {
            childCount: referentialShape.children.length,
            parentName: vectorShape.parent?.properties?.name ?? null
        };
    });
    expect(parentLink.childCount).toBe(1);
    expect(parentLink.parentName).toBe('Referential1');
});
