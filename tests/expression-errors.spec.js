const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MathErrorMessage = require('../scripts/controls/mathErrorMessages.js');
const BaseTranslations = require('../scripts/themes/baseTranslations.js');

const EDITOR_URL = '/pages/board/index.html';
const BROKEN_GROUP = '\\displaylines{a=1\\\\b=\\\\c=3}';

function translate(error, language) {
    return MathErrorMessage.toPlainText(MathErrorMessage.translate(error, new BaseTranslations(language)));
}

function translateParts(error, language) {
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
    // The grammar names what it would have accepted, and a set offering a digit or a name is a set
    // offering a value, however many functions the grammar grows.
    const OPERAND_EXPECTED = "{'{', '\\frac', '\\left(', '(', '\\sin', '\\sqrt', '+', '-', STRING, DIGIT, ID, SPECIAL}";

    test('a row that stops where a value was expected is reported as missing a value', () => {
        const error = { message: `Syntax error at line 1, column 2: mismatched input '<EOF>' expecting ${OPERAND_EXPECTED}` };
        expect(translate(error, 'en-US')).toBe('A value is missing here.');
        expect(translate(error, 'pt-PT')).toBe('Falta aqui um valor.');
        expect(MathErrorMessage.readSyntax(error.message)).toEqual({ column: 2, text: '<EOF>', kind: 'operand' });
    });

    test('a row stopping on a symbol it cannot hold there is reported as one symbol too many', () => {
        const error = { message: "Syntax error at line 1, column 5: extraneous input '(' expecting {<EOF>, '\\quad'}" };
        expect(translate(error, 'en-US')).toBe('( cannot stand here.');
        expect(translate(error, 'pt-PT')).toBe('( não pode estar aqui.');
    });

    // A delimiter is named by the command that sizes it, which is not what anybody wrote.
    test('a missing bracket is named as the bracket, not as the command sizing it', () => {
        expect(translate({ message: "Syntax error at line 1, column 6: missing ')' at '<EOF>'" }, 'en-US')).toBe(') is missing.');
        expect(translate({ message: "Syntax error at line 1, column 15: missing '\\right)' at '<EOF>'" }, 'en-US')).toBe(') is missing.');
        expect(translate({ message: "Syntax error at line 1, column 3: mismatched input '<EOF>' expecting '='" }, 'pt-PT')).toBe('Falta =.');
    });

    test('a row the grammar could not finish reading, expecting nothing it can name, is reported as incomplete', () => {
        const error = { message: "Syntax error at line 1, column 4: mismatched input '<EOF>' expecting {'{', '+'}" };
        expect(translate(error, 'en-US')).toBe('The expression is incomplete.');
        expect(translate(error, 'pt-PT')).toBe('A expressão está incompleta.');
    });

    test('a row the grammar could not read names where it stopped', () => {
        const error = { message: "Syntax error at line 1, column 2: no viable alternative at input 'b='" };
        expect(translate(error, 'en-US')).toBe('This row cannot be read around b=.');
        expect(translate(error, 'pt-PT')).toBe('Não é possível ler esta linha junto a b=.');
    });

    test('a missing symbol is named on its own', () => {
        const error = { message: "Syntax error at line 1, column 4: missing '=' at 'c'" };
        expect(translate(error, 'en-US')).toBe('= is missing.');
        expect(translate(error, 'pt-PT')).toBe('Falta =.');
    });

    test('a diagnostic is written from its key and the values it carries, not from the engine wording', () => {
        const error = { code: 'INDEPENDENT_ASSIGNED', severity: 'error', message: "'t' is the independent variable: ...", parameters: { key: 'independentAssigned', name: 't' } };
        expect(translate(error, 'en-US')).toContain('t is the independent variable');
        expect(translate(error, 'pt-PT')).toContain('t é a variável independente');
    });

    test('the two sentences sharing the unknown-name code are told apart by their key', () => {
        expect(translate({ code: 'DOMAIN_UNKNOWN_NAME', parameters: { key: 'domainUnknownName', name: 'Colours', declaredNames: [] } }, 'en-US'))
            .toBe('The domain Colours has not been declared. Declare it first with \\text{domain}\\ Colours = \\ldots.');
        expect(translate({ code: 'DOMAIN_UNKNOWN_NAME', parameters: { key: 'domainUnknownName', name: 'Colours', declaredNames: ['Sizes', 'Shapes'] } }, 'pt-PT'))
            .toBe('O domínio Colours não foi declarado. Declare-o com \\text{domain}\\ Colours = \\ldots ou use um dos domínios declarados: Sizes e Shapes.');
        expect(translate({ code: 'DOMAIN_UNKNOWN_NAME', parameters: { key: 'unknownCategoricalValue', text: '\\text{blue}', label: 'blue' } }, 'en-US'))
            .toBe('\\text{blue} is not a categorical value of any declared domain. Declare a domain holding \\text{blue} before comparing against it.');
    });

    test('a same-row cycle names the terms caught in it, joined the way the language joins a list', () => {
        expect(translate(MathErrorMessage.cycleError(['F', 'a', 'v']), 'pt-PT')).toContain('F, a e v');
        expect(translate(MathErrorMessage.cycleError(['F', 'a', 'v']), 'en-US')).toContain('F, a and v');
    });

    // Counts arrive as numbers, so the wording agrees with them; indexes arrive as written, so the
    // suggestion is spelled the way the reader types it.
    test('a rule reading itself ahead counts the rows and suggests the index to write instead', () => {
        const one = { code: 'SELF_REFERENCE', parameters: { key: 'selfReferenceAhead', name: 'c', index: 'n+1', rowsAhead: 1, suggestedIndex: 'n-1' } };
        const two = { code: 'SELF_REFERENCE', parameters: { key: 'selfReferenceAhead', name: 'c', index: 'n+2', rowsAhead: 2, suggestedIndex: 'n-2' } };
        expect(translate(one, 'en-US')).toContain('at n+1, one row ahead');
        expect(translate(two, 'en-US')).toContain('at n+2, 2 rows ahead');
        expect(translate(two, 'en-US')).toContain('as {c}_{n-2}.');
        expect(translate(two, 'pt-PT')).toContain('em n+2, 2 linhas à frente');
        const current = { code: 'SELF_REFERENCE', parameters: { key: 'selfReferenceCurrentRow', name: 'c', index: 'n', suggestedIndex: 'n-1' } };
        expect(translate(current, 'pt-PT')).toBe('c lê o seu próprio valor na linha que está a ser calculada, por isso não há de onde calcular essa linha. Escreva-o a partir de uma linha já calculada, como {c}_{n-1}.');
    });

    // Prose and maths are kept apart, so a name is typeset on the message the way it is on the card,
    // and values the engine spells its own way are written the way a field writes them.
    test('the maths in a message is split from the prose and spelled the way a field spells it', () => {
        expect(translateParts({ code: 'SELF_REFERENCE', parameters: { key: 'selfReferenceCurrentRow', name: 'v.x', index: 'n', suggestedIndex: 'n-1' } }, 'en-US'))
            .toEqual([{ latex: 'v.x' }, { text: ' reads its own value in the row being built, so there is nothing to work that row out from. Write it from a row already worked out, as ' }, { latex: '{v.x}_{n-1}' }, { text: '.' }]);
        expect(translateParts(MathErrorMessage.cycleError(['F', 'a']), 'pt-PT'))
            .toEqual([{ latex: 'F' }, { text: ' e ' }, { latex: 'a' }, { text: ' leem-se mutuamente na mesma linha, por isso nenhum deles pode ser calculado em primeiro lugar. Escreva pelo menos um deles a partir do passo anterior.' }]);
        expect(translateParts({ code: 'DOMAIN_VIOLATION', parameters: { key: 'domainViolation', name: 'c', valueText: 'purple', domainText: '{red, blue} ∪ ℕ' } }, 'en-US'))
            .toEqual([{ latex: 'c = \\text{purple}' }, { text: ' is outside ' }, { latex: '\\{\\text{red}, \\text{blue}\\} \\cup \\mathbb{N}' }, { text: '.' }]);
        expect(translate({ code: 'DOMAIN_RANDOM_COUNT', parameters: { key: 'randomCountTooLarge', name: 'x', requested: 5, available: 2, domainText: '{1, 2}' } }, 'en-US'))
            .toBe('\\mathrm{rnd}(5) asks for one of 5 values, but x only has 2 in \\{1, 2\\}.');
    });

    test('a categorical expression agrees with how many names hold a categorical value', () => {
        expect(translate({ code: 'CATEGORICAL_ARITHMETIC', parameters: { key: 'categoricalArithmetic', names: ['color'], expression: 'color+1' } }, 'en-US'))
            .toBe('color holds a categorical value, so color+1 is not a calculation the model can make.');
        expect(translate({ code: 'CATEGORICAL_ARITHMETIC', parameters: { key: 'categoricalArithmetic', names: ['color', 'size'], expression: 'color+size' } }, 'pt-PT'))
            .toBe('color e size guardam valores categóricos, por isso color+size não é um cálculo que o modelo possa fazer.');
    });

    test('every sentence the engine can say has a wording in every language', () => {
        const typings = fs.readFileSync(path.join(__dirname, '..', 'libraries', 'types', 'CalculationEngine.d.ts'), 'utf8');
        const keys = [...typings.matchAll(/^\s+key: "([a-zA-Z]+)";$/gm)].map(match => match[1]);
        expect(keys.length).toBeGreaterThan(0);
        expect(Object.keys(MathErrorMessage.wordings).sort()).toEqual([...keys].sort());
        const values = { name: 'x', index: 'n+1', suggestedIndex: 'n-1', rowsAhead: 2, iterationTerm: 'n', names: ['a', 'b'], expression: 'a+b', statement: 's', declaredNames: ['D'], text: 't', label: 'l', command: 'c', range: '[0..1..1]', suggestedStep: '1', step: '1', start: '0', end: '1', interval: '[0, 1]', suggestedLower: '0', suggestedUpper: '1', valueText: '3', domainText: 'D', requested: 5, available: 2, storedVersion: 2, engineVersion: 1, lower: 0, upper: 1, builtin: 'B' };
        for (const language of ['en-US', 'pt-PT'])
            for (const key of keys)
                expect(translate({ code: 'ANY', message: 'engine', parameters: { key, ...values } }, language), `${key} in ${language}`).not.toBe('engine');
    });

    // A sentence the editor has no wording for keeps the one the engine wrote, so a problem is never
    // reduced to a generic line; only a diagnostic with no sentence at all is reported as unreadable.
    test('an error the editor cannot word keeps the engine sentence', () => {
        expect(translate({ code: 'DOMAIN_ENUMERATION_LIMIT', message: 'Too many values to list.', parameters: { key: 'somethingNewer' } }, 'en-US')).toBe('Too many values to list.');
        expect(translate({ code: 'DOMAIN_CIRCULAR', message: "Domain 'A' cannot be defined in terms of itself.", parameters: { key: 'domainCircular' } }, 'pt-PT')).toBe("Domain 'A' cannot be defined in terms of itself.");
        expect(translateParts({ code: 'DOMAIN_ENUMERATION_LIMIT', message: 'engine', messageParts: [{ text: 'read at ' }, { latex: 'n+1' }], parameters: { key: 'somethingNewer' } }, 'en-US')).toEqual([{ text: 'read at ' }, { latex: 'n+1' }]);
        expect(translate({ code: 'DOMAIN_CIRCULAR' }, 'pt-PT')).toBe('Não foi possível ler esta linha.');
        expect(translate({ message: 'an engine failure with no wording of its own' }, 'pt-PT')).toBe('Não foi possível ler esta linha.');
    });
});

test.describe('a card the engine refused says why where the row was written', () => {
    test('the panel names the failing row and says why, in the language of the editor', async ({ page }) => {
        await setupEditor(page, 'pt-PT');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await hoverExpression(page, 'Broken');
        const panel = page.locator('.mdl-expression-error-panel.visible');
        await expect(panel).toBeVisible();
        await expect(panel.locator('.mdl-expression-error-row-message')).toHaveText('Falta aqui um valor.');
    });

    // A symbol named in a sentence is typeset the way the reader writes it, not spelled out.
    test('a bracket the row never closes is named as a bracket, typeset in the message', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Unclosed', '\\displaylines{a=1\\\\b=\\left(2+3}');
        await expect.poll(() => failingRowsOf(page, 'Unclosed')).toEqual([1]);
        await hoverExpression(page, 'Unclosed');
        const panel = page.locator('.mdl-expression-error-panel.visible');
        await expect(panel.locator('.mdl-expression-error-row-message')).toHaveText(') is missing.');
        await expect(panel.locator('.mdl-expression-error-row-message .mdl-message-math .ML__latex')).toHaveCount(1);
    });

    test('the same card in English carries the English wording', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await hoverExpression(page, 'Broken');
        const panel = page.locator('.mdl-expression-error-panel.visible');
        await expect(panel).toBeVisible();
        await expect(panel.locator('.mdl-expression-error-row-message')).toHaveText('A value is missing here.');
    });

    // The panel carries the readings and the number of the row each is about, with no heading over them
    // and no word in front of the number; the mark on the row shows which row as well.
    test('the panel numbers its readings and lights the row the one reached for belongs to', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', '\\displaylines{a=1\\\\b=\\\\c=}');
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1, 2]);
        await hoverExpression(page, 'Broken');
        const panel = page.locator('.mdl-expression-error-panel.visible');
        await expect(panel.locator('.mdl-expression-error-row')).toHaveCount(2);
        await expect(panel.locator('.mdl-expression-error-row-label')).toHaveText(['2', '3']);
        await expect(panel).toHaveText('2A value is missing here.3A value is missing here.');
        const rowBox = await panel.locator('.mdl-expression-error-row').last().boundingBox();
        await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
        await expect(page.locator('.mdl-expression-error-mark.lit')).toHaveCount(1);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Broken').expressionControl.errorReport.litRowIndex)).toBe(2);
    });

    // A row that stops early is missing its value at the end of what was written, so the slot stands
    // after the last symbol of the row rather than anywhere inside it.
    test('a row that stops early carries a slot after its last symbol', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        const slot = page.locator('.mdl-expression-error-spot.hole');
        await expect(slot).toHaveCount(1);
        const places = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Broken');
            const anchor = shape.expressionControl.readRowAnchor(1, shape.failingRows[0].finding.index);
            return { placement: anchor.placement, slot: document.querySelector('.mdl-expression-error-spot.hole').getBoundingClientRect().left, last: shape.expressionControl.getOffsetBounds(anchor.offset).right };
        });
        expect(places.placement).toBe('after');
        expect(places.slot).toBeGreaterThanOrEqual(places.last);
    });

    // A value missing from inside a fraction or a root cannot be placed between two symbols, so the
    // symbol holding it is underlined rather than a slot being drawn a symbol out from where it belongs.
    test('a value missing from inside a root is underlined there, not slotted beside it', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Rooted', '\\displaylines{a=1\\\\z=\\sqrt{}}');
        await expect.poll(() => failingRowsOf(page, 'Rooted')).toEqual([1]);
        await hoverExpression(page, 'Rooted');
        await expect(page.locator('.mdl-expression-error-panel.visible .mdl-expression-error-row-message')).toHaveText('A value is missing here.');
        await expect(page.locator('.mdl-expression-error-spot')).toHaveCount(1);
        await expect(page.locator('.mdl-expression-error-spot.hole')).toHaveCount(0);
    });

    // The mark is the card's own, so it is there for anyone looking at the board; the sentence is for
    // whoever is working on the card, and is not written over a card nobody has reached for.
    test('the failing row carries a mark of its own, and the panel waits to be reached for', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await expect(page.locator('.mdl-expression-error-mark')).toHaveCount(1);
        await expect(page.locator('.mdl-expression-error-panel.visible')).toHaveCount(0);
        await hoverExpression(page, 'Broken');
        await expect(page.locator('.mdl-expression-error-panel.visible')).toBeVisible();
    });

    test('a card the engine reads carries neither mark nor panel', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Sound', '\\displaylines{a=1\\\\b=2}');
        await expect.poll(() => failingRowsOf(page, 'Sound')).toEqual([]);
        await hoverExpression(page, 'Sound');
        await expect.poll(() => page.evaluate(() => shell.board.selection.hoveredShape?.properties.name)).toBe('Sound');
        await expect(page.locator('.mdl-expression-error-mark')).toHaveCount(0);
        await expect(page.locator('.mdl-expression-error-panel.visible')).toHaveCount(0);
    });

    // The panel is how a row is reached: clicking what it says about a row puts the caret in that row,
    // and it goes on saying what is wrong while the row is put right.
    test('a row reached from the panel takes the caret at the end of that row', async ({ page }) => {
        await setupEditor(page, 'en-US');
        await addExpression(page, 'Broken', BROKEN_GROUP);
        await expect.poll(() => failingRowsOf(page, 'Broken')).toEqual([1]);
        await hoverExpression(page, 'Broken');
        // The card is covered by the board's move handle, so the press has to go to the handle and be
        // given up by it, the way a real one is.
        const rowBox = await page.locator('.mdl-expression-error-row').boundingBox();
        await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
        await page.mouse.down();
        await page.mouse.up();
        await expect.poll(() => page.evaluate(() => {
            const control = shell.board.shapes.getByName('Broken').expressionControl;
            const cellRanges = control._getRowCellRanges()[1];
            return control.mathfield.position === cellRanges[cellRanges.length - 1][1];
        })).toBe(true);
        await expect(page.locator('.mdl-expression-error-panel.visible')).toBeVisible();
        expect(await failingRowsOf(page, 'Broken')).toEqual([1]);
    });
});
