const { test, expect } = require('@playwright/test');

const MathErrorMessage = require('../scripts/controls/mathErrorMessages.js');
const BaseTranslations = require('../scripts/themes/baseTranslations.js');

const EDITOR_URL = '/pages/board/index.html';
const BROKEN_GROUP = '\\displaylines{a=1\\\\b=\\\\c=3}';

function translate(error, language) {
    return MathErrorMessage.translate(error, new BaseTranslations(language));
}

async function setupEditor(page, language) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.evaluate(preferredLanguage => shell.board.translations.language = preferredLanguage, language);
}

// The board treats the card it has selected as one nobody is hovering, so a card left selected by the
// gesture that added it would never be hovered at all.
async function addExpression(page, name, expression) {
    await page.evaluate(({ shapeName, shapeExpression }) => {
        modellus.shape.addExpression(shapeName);
        const shape = shell.board.shapes.getByName(shapeName);
        shape.properties.width = 420;
        shape.properties.height = 240;
        shape.setProperties({ expression: shapeExpression });
        shape.update();
        shape.draw();
        shell.board.selection.deselect();
    }, { shapeName: name, shapeExpression: expression });
}

function failingRowsOf(page, name) {
    return page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).failingRowIndexes, name);
}

async function hoverExpression(page, name) {
    const box = await page.evaluate(shapeName => {
        const rectangle = shell.board.shapes.getByName(shapeName).container.getBoundingClientRect();
        return { x: rectangle.left + rectangle.width / 2, y: rectangle.top + rectangle.height / 2 };
    }, name);
    await page.mouse.move(box.x - 40, box.y - 40);
    await page.mouse.move(box.x, box.y);
}

test.describe('a parse failure is written in the reader\'s language', () => {
    test('a row the grammar could not finish reading is reported as incomplete', () => {
        const error = { message: "Syntax error at line 1, column 4: mismatched input '<EOF>' expecting {'{', '+'}" };
        expect(translate(error, 'en-US')).toBe('The expression is incomplete.');
        expect(translate(error, 'pt-PT')).toBe('A expressão está incompleta.');
    });

    test('a row the grammar could not read names where it stopped', () => {
        const error = { message: "Syntax error at line 1, column 2: no viable alternative at input 'b='" };
        expect(translate(error, 'en-US')).toBe("This row cannot be read around 'b='.");
        expect(translate(error, 'pt-PT')).toBe('Não é possível ler esta linha junto a «b=».');
    });

    test('a missing symbol is named on its own', () => {
        const error = { message: "Syntax error at line 1, column 4: missing '=' at 'c'" };
        expect(translate(error, 'en-US')).toBe("'=' is missing.");
        expect(translate(error, 'pt-PT')).toBe('Falta «=».');
    });

    test('a diagnostic is written from its code and the names it carries, not from the engine wording', () => {
        const error = { code: 'INDEPENDENT_ASSIGNED', severity: 'error', message: "'t' is the independent variable: ...", termName: 't' };
        expect(translate(error, 'en-US')).toContain("'t' is the independent variable");
        expect(translate(error, 'pt-PT')).toContain('«t» é a variável independente');
    });

    test('the two meanings of an unknown name are told apart by the domain it names', () => {
        expect(translate({ code: 'DOMAIN_UNKNOWN_NAME', domainName: 'Colours' }, 'en-US')).toBe("The domain 'Colours' has not been declared.");
        expect(translate({ code: 'DOMAIN_UNKNOWN_NAME', location: { text: 'blue' } }, 'en-US')).toBe("'blue' is not a categorical value of any declared domain.");
    });

    test('a same-row cycle names the terms caught in it', () => {
        expect(translate(MathErrorMessage.cycleError(['F', 'a', 'v']), 'pt-PT')).toContain('F, a, v');
    });

    // A code the editor has no wording for, and a diagnostic missing the name its wording needs, both
    // fall back rather than showing a half-written sentence or the engine's English.
    test('an error the editor cannot word is reported as a row it could not read', () => {
        expect(translate({ code: 'DOMAIN_RANDOM_COUNT' }, 'en-US')).toBe('This row could not be read.');
        expect(translate({ code: 'DOMAIN_CIRCULAR' }, 'pt-PT')).toBe('Não foi possível ler esta linha.');
        expect(translate({ message: 'an engine failure with no wording of its own' }, 'pt-PT')).toBe('Não foi possível ler esta linha.');
    });
});

test.describe('hovering a card the engine refused', () => {
    test('the tooltip names the failing row and says why, in the language of the editor', async ({ page }) => {
        await setupEditor(page, 'pt-PT');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await hoverExpression(page, 'Broken');
        const tooltip = page.locator('.mdl-expression-error-tooltip');
        await expect(tooltip).toBeVisible();
        await expect(tooltip.locator('.mdl-expression-error-title')).toHaveText('Erro na expressão');
        await expect(tooltip.locator('.mdl-expression-error-row-label')).toHaveText('Linha 2');
        await expect(tooltip.locator('.mdl-expression-error-row-message')).toHaveText('Não é possível ler esta linha junto a «b=».');
    });

    test('the same card in English carries the English wording', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await hoverExpression(page, 'Broken');
        const tooltip = page.locator('.mdl-expression-error-tooltip');
        await expect(tooltip).toBeVisible();
        await expect(tooltip.locator('.mdl-expression-error-title')).toHaveText('Expression error');
        await expect(tooltip.locator('.mdl-expression-error-row-message')).toHaveText("This row cannot be read around 'b='.");
    });

    test('a card the engine reads leaves the tooltip out of the way', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        await expect.poll(() => failingRowsOf(page, 'Sound')).toEqual([]);
        await hoverExpression(page, 'Sound');
        await expect.poll(() => page.evaluate(() => shell.board.selection.hoveredShape?.properties.name)).toBe('Sound');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Sound').errorTooltipTimer)).toBeUndefined();
        await expect(page.locator('.mdl-expression-error-tooltip')).toBeHidden();
    });
});
