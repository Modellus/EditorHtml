const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForFunction(() => shell.board.calculator != null && shell.board.translations != null && shell.board.svg != null, null, { timeout: 15000 });
}

async function setupPointOnTerm(page) {
    await page.evaluate(() => {
        modellus.shape.addExpression('Expression1');
        const expression = shell.board.shapes.getByName('Expression1');
        expression.properties.expression = '\\displaylines{\\frac{dx}{dt}=0}';
        expression.mathfield.value = expression.properties.expression;
        shell.reset();
        modellus.shape.addPoint('Point1');
        const point = shell.board.shapes.getByName('Point1');
        point.properties.xTerm = 'x';
        point.properties.xTermDisplayMode = 'nameValue';
        point.update();
        point.draw();
    });
    await expect.poll(() => page.evaluate(() => shell.board.calculator.isTerm('x'))).toBe(true);
}

async function enableGlow(page) {
    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        point.setPropertyCommand('glowOnChange', true);
        point.draw();
    });
}

async function writeTermValue(page, value) {
    await page.evaluate(termValue => {
        const calculator = shell.board.calculator;
        calculator.setTermValue('x', termValue, calculator.getIteration(), 1);
        calculator.calculate();
        const point = shell.board.shapes.getByName('Point1');
        point.update();
        point.draw();
    }, value);
}

function readGlowState(page) {
    return page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        const element = document.getElementById(point.id);
        return {
            property: point.properties.glowOnChange,
            isHost: element.classList.contains('mdl-glow-host'),
            isGlowing: element.classList.contains('mdl-glow'),
            glowColor: element.style.getPropertyValue('--mdl-glow-color'),
            foregroundColor: point.properties.foregroundColor,
            value: shell.board.calculator.getByName('x', 1)
        };
    });
}

test('a shape left with glow off stays unlit when its term changes', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);

    const initial = await readGlowState(page);
    expect(initial.property).toBe(false);
    expect(initial.isHost).toBe(false);

    await writeTermValue(page, 5);

    const afterChange = await readGlowState(page);
    expect(afterChange.value).toBe(5);
    expect(afterChange.isGlowing).toBe(false);
    expect(afterChange.isHost).toBe(false);
});

test('a shape set to glow lights up in its own color when its term lands on a new value', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enableGlow(page);

    const beforeChange = await readGlowState(page);
    expect(beforeChange.property).toBe(true);
    expect(beforeChange.isHost).toBe(true);
    expect(beforeChange.isGlowing).toBe(false);

    await writeTermValue(page, 5);

    const afterChange = await readGlowState(page);
    expect(afterChange.isGlowing).toBe(true);
    expect(afterChange.glowColor).toBe(afterChange.foregroundColor);
});

test('the glow fades a second after the term settles', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enableGlow(page);
    await writeTermValue(page, 5);
    expect((await readGlowState(page)).isGlowing).toBe(true);

    await expect.poll(async () => (await readGlowState(page)).isGlowing, { timeout: 5000 }).toBe(false);
});

test('a term recomputed to the value it already held does not light the shape', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enableGlow(page);
    await writeTermValue(page, 5);
    await expect.poll(async () => (await readGlowState(page)).isGlowing, { timeout: 5000 }).toBe(false);

    await writeTermValue(page, 5);

    const afterRewrite = await readGlowState(page);
    expect(afterRewrite.value).toBe(5);
    expect(afterRewrite.isGlowing).toBe(false);
});

test('turning glow off stops the shape lighting up and undo brings it back', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enableGlow(page);

    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        point.setPropertyCommand('glowOnChange', false);
        point.draw();
    });
    await writeTermValue(page, 7);

    const afterDisable = await readGlowState(page);
    expect(afterDisable.property).toBe(false);
    expect(afterDisable.isHost).toBe(false);
    expect(afterDisable.isGlowing).toBe(false);

    await page.evaluate(() => shell.board.invoker.undo());
    const afterUndo = await readGlowState(page);
    expect(afterUndo.property).toBe(true);
});

test('glow survives a serialize round trip', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await enableGlow(page);

    const roundTrip = await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        const data = point.serialize();
        point.remove();
        const restored = BaseShape.deserialize(shell.board, data);
        return { property: restored.properties.glowOnChange, isHost: restored.element.classList.contains('mdl-glow-host') };
    });
    expect(roundTrip.property).toBe(true);
    expect(roundTrip.isHost).toBe(true);
});

test('the shape colors menu offers a glow switch that turns the option on', async ({ page }) => {
    await setupEditor(page);
    await setupPointOnTerm(page);
    await page.evaluate(() => {
        const point = shell.board.shapes.getByName('Point1');
        shell.board.selection.select(point);
    });

    const colorButton = page.locator('.shape-context-toolbar.visible .mdl-shape-color-selector');
    await expect(colorButton).toBeVisible();
    await colorButton.click();

    const glowItem = page.locator('.mdl-dropdown-list-item', { hasText: 'Glow' });
    await expect(glowItem).toBeVisible();

    const glowSwitch = glowItem.locator('.mdl-glow-switch');
    await expect(glowSwitch).toBeVisible();
    await glowSwitch.click();

    await expect.poll(async () => (await readGlowState(page)).property).toBe(true);
});
