const { test, expect } = require('@playwright/test');

const NOTEBOOK_URL = '/pages/notebook/index.html';
const BROKEN_GROUP = '\\displaylines{a=1\\\\b=\\\\c=3}';

async function setupNotebook(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(NOTEBOOK_URL);
    await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
}

async function addExpressionBlock(page, expression) {
    const blockId = await page.evaluate(() => {
        notebook.addBlock('expression');
        return notebook.blocks[notebook.blocks.length - 1].id;
    });
    await page.waitForFunction(id => notebook.shapeInstances.get(id)?.expressionControl?.mathfield != null, blockId, { timeout: 15000 });
    await page.evaluate(({ id, writtenExpression }) => {
        notebook.shapeInstances.get(id).expressionControl.setValue(writtenExpression);
    }, { id: blockId, writtenExpression: expression });
    return blockId;
}

// A notebook expression is read the way a card on the board is: the row the engine refused is marked
// where it stands, and the panel at the foot of the block says why while the block is being written in.
test('a notebook expression block marks the row the engine refused and says why', async ({ page }) => {
    await setupNotebook(page);
    await addExpressionBlock(page, BROKEN_GROUP);
    await page.evaluate(() => document.querySelector('.notebook-expression-control math-field').focus());
    await expect(page.locator('.mdl-expression-error-mark')).toHaveCount(1);
    const panel = page.locator('.mdl-expression-error-panel.visible');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.mdl-expression-error-row-label')).toHaveCount(1);
    await expect(panel.locator('.mdl-expression-error-row-message')).toHaveText('This row cannot be read around b=.');
});
