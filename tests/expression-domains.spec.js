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

async function addExpression(page, name, expression) {
    await page.evaluate(({ shapeName, shapeExpression }) => {
        modellus.shape.addExpression(shapeName);
        const shape = shell.board.shapes.getByName(shapeName);
        shape.properties.width = 460;
        shape.properties.height = 260;
        shape.setProperties({ expression: shapeExpression });
        shape.update();
        shape.draw();
    }, { shapeName: name, shapeExpression: expression });
    await page.waitForTimeout(600);
}

async function runModel(page, name) {
    await page.evaluate(shapeName => shell.board.shapes.getByName(shapeName).mathfield.blur(), name);
    await page.evaluate(() => shell.reset());
    await page.waitForTimeout(600);
}

function readModel(page, name) {
    return page.evaluate(shapeName => {
        const shape = shell.board.shapes.getByName(shapeName);
        const system = shell.calculator.system;
        return {
            presented: shape.mathfield.getValue('latex-unstyled'),
            canonical: shape.expressionControl.getCanonicalValue(),
            stored: shape.properties.expression,
            failingRowIndexes: shape.failingRowIndexes,
            termNames: shell.calculator.getTermsNames(),
            constrained: system.getConstrainedTermNames(),
            namedDomains: system.domains.getNames(),
            diagnosticCodes: system.getDiagnostics().map(diagnostic => diagnostic.code)
        };
    }, name);
}

function termValue(page, termName) {
    return page.evaluate(name => shell.calculator.getByName(name), termName);
}

function domainText(page, termName) {
    return page.evaluate(name => shell.calculator.system.getTermDomain(name)?.describe() ?? null, termName);
}

function domainMetadata(page, termName) {
    return page.evaluate(name => shell.calculator.system.getTermDomainMetadata(name), termName);
}

async function focusExpression(page, name) {
    await page.evaluate(shapeName => {
        const shape = shell.board.shapes.getByName(shapeName);
        shape.mathfield.focus();
        shape.mathfield.position = shape.mathfield.lastOffset;
    }, name);
    await page.waitForTimeout(200);
}

test.describe('domains in the expression shape', () => {

    test('a finite domain row makes a constrained scalar term', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Finite', '\\displaylines{x\\in\\{1,2,3\\}\\\\y=x\\cdot2}');
        await runModel(page, 'Finite');

        const model = await readModel(page, 'Finite');
        expect(model.failingRowIndexes).toEqual([]);
        expect(model.diagnosticCodes).toEqual([]);
        expect(model.termNames).toContain('x');
        expect(model.constrained).toEqual(['x']);
        expect(await domainText(page, 'x')).toBe('{1, 2, 3}');
        expect(await termValue(page, 'x')).toBe(1);
        expect(await termValue(page, 'y')).toBe(2);
    });

    test('every domain shape the palette offers parses in a row', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Shapes', '\\displaylines{'
            + 'a\\in\\{1,2,3\\}\\\\'
            + 'b\\in\\left[1..5\\right]\\\\'
            + 'c\\in\\left[0..10..2\\right]\\\\'
            + 'd\\in\\left[6,7\\right]\\\\'
            + 'k\\in\\left(6,7\\right]\\\\'
            + 'f\\in\\{1,2,3\\}\\cup\\left[6,7\\right]\\\\'
            + 'g\\in\\mathbb{R}\\\\'
            + 'h\\in\\mathbb{Z}\\\\'
            + 'i\\in\\mathbb{N}\\\\'
            + 'j\\in\\mathbb{B}}');
        await runModel(page, 'Shapes');

        const model = await readModel(page, 'Shapes');
        expect(model.failingRowIndexes).toEqual([]);
        expect(await domainText(page, 'a')).toBe('{1, 2, 3}');
        expect(await domainText(page, 'b')).toBe('[1..5]');
        expect(await domainText(page, 'c')).toBe('[0..10..2]');
        expect(await domainText(page, 'd')).toBe('[6, 7]');
        expect(await domainText(page, 'k')).toBe('(6, 7]');
        expect(await domainText(page, 'f')).toBe('{1, 2, 3} ∪ [6, 7]');
        expect(await domainText(page, 'g')).toBe('ℝ');
        expect(await domainText(page, 'h')).toBe('ℤ');
        expect(await domainText(page, 'i')).toBe('ℕ');
        expect(await domainText(page, 'j')).toBe('\u{1D539}');
    });

    test('a set reads the same whichever spelling of its braces the editor wrote', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Braces', '\\displaylines{'
            + 'a\\in\\{1,2,3\\}\\\\'
            + 'b\\in\\left\\{1,2,3\\right\\}\\\\'
            + 'c\\in\\lbrace1,2,3\\rbrace\\\\'
            + 'z\\in\\left\\lbrace green,blue,red\\right\\rbrace}');
        await runModel(page, 'Braces');

        const model = await readModel(page, 'Braces');
        expect(model.failingRowIndexes).toEqual([]);
        expect(await domainText(page, 'a')).toBe('{1, 2, 3}');
        expect(await domainText(page, 'b')).toBe('{1, 2, 3}');
        expect(await domainText(page, 'c')).toBe('{1, 2, 3}');
        expect(await domainText(page, 'z')).toBe('{green, blue, red}');
    });

    test('an interval reads the same whichever spelling of its brackets the editor wrote', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Brackets', '\\displaylines{'
            + 'a\\in\\left(6,7\\right]\\\\'
            + 'b\\in\\lparen6,7\\rbrack\\\\'
            + 'c\\in\\left\\lbrack6,7\\right\\rparen\\\\'
            + 'd\\in\\left\\lbrack1..5\\right\\rbrack}');
        await runModel(page, 'Brackets');

        const model = await readModel(page, 'Brackets');
        expect(model.failingRowIndexes).toEqual([]);
        expect(await domainText(page, 'a')).toBe('(6, 7]');
        expect(await domainText(page, 'b')).toBe('(6, 7]');
        expect(await domainText(page, 'c')).toBe('[6, 7)');
        expect(await domainText(page, 'd')).toBe('[1..5]');
    });

    test('a categorical domain compares inside a piecewise row', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Colours', '\\displaylines{'
            + 'color\\in\\{\\text{red},\\text{green},\\text{blue}\\}\\\\'
            + 'is=\\begin{cases}1&color=\\text{red}\\\\0&\\text{otherwise}\\end{cases}}');
        await runModel(page, 'Colours');

        const model = await readModel(page, 'Colours');
        expect(model.failingRowIndexes).toEqual([]);
        expect(model.termNames).not.toContain('red');
        expect(model.termNames).not.toContain('green');
        expect(await domainText(page, 'color')).toBe('{red, green, blue}');
        expect(await termValue(page, 'is')).toBe(1);

        const accepted = await page.evaluate(() => shell.calculator.setUserInput('color', shell.calculator.system.getEnumValue('blue')));
        expect(accepted).toBe(true);
        await page.evaluate(() => shell.calculator.calculate());
        await page.waitForTimeout(300);
        expect(await termValue(page, 'color')).toBe(await page.evaluate(() => shell.calculator.system.getEnumValue('blue')));
        expect(await termValue(page, 'is')).toBe(0);
    });

    test('a categorical term exposes its values for a dropdown', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Meta', '\\displaylines{direction\\in\\{\\text{north},\\text{east},\\text{south},\\text{west}\\}}');
        await runModel(page, 'Meta');

        const metadata = await domainMetadata(page, 'direction');
        expect(metadata.control).toBe('list');
        expect(metadata.isCategorical).toBe(true);
        expect(metadata.values.map(value => value.label)).toEqual(['north', 'east', 'south', 'west']);
    });

    test('a stepped range exposes the bounds and step a slider needs', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Slider', '\\displaylines{x\\in\\left[0..10..2\\right]\\\\y\\in\\left(6,7\\right]}');
        await runModel(page, 'Slider');

        const stepped = await domainMetadata(page, 'x');
        expect(stepped.control).toBe('steppedSlider');
        expect(stepped.minimum).toBe(0);
        expect(stepped.maximum).toBe(10);
        expect(stepped.step).toBe(2);

        const continuous = await domainMetadata(page, 'y');
        expect(continuous.control).toBe('continuousSlider');
        expect(continuous.includesMinimum).toBe(false);
        expect(continuous.includesMaximum).toBe(true);
    });

    test('a named domain is declared once, reused, and never becomes a term', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Named', '\\displaylines{'
            + '\\text{domain}\\ Color=\\{\\text{red},\\text{green},\\text{blue}\\}\\\\'
            + 'foreground\\in Color\\\\'
            + 'background\\in Color}');
        await runModel(page, 'Named');

        const model = await readModel(page, 'Named');
        expect(model.failingRowIndexes).toEqual([]);
        expect(model.namedDomains).toEqual(['Color']);
        expect(model.termNames).not.toContain('Color');
        expect(model.termNames).toContain('foreground');
        expect((await domainMetadata(page, 'background')).name).toBe('Color');
    });

    test('a row naming a domain that was never declared is marked as failing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Unknown', '\\displaylines{x=1\\\\bad\\in Missing}');
        await runModel(page, 'Unknown');

        const model = await readModel(page, 'Unknown');
        expect(model.failingRowIndexes).toEqual([1]);
        expect(model.termNames).toContain('x');
    });

    test('a row with a step that never reaches the end is marked as failing', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'BadStep', '\\displaylines{x=1\\\\y\\in\\left[0..10..-2\\right]}');
        await runModel(page, 'BadStep');

        expect((await readModel(page, 'BadStep')).failingRowIndexes).toEqual([1]);
    });

    test('a domain row survives being written back and read again', async ({ page }) => {
        await setupEditor(page);
        const source = '\\displaylines{x\\in\\{1,2,3\\}\\cup\\left[6,7\\right]\\\\color\\in\\{\\text{red},\\text{green}\\}}';
        await addExpression(page, 'RoundTrip', source);
        await runModel(page, 'RoundTrip');

        const model = await readModel(page, 'RoundTrip');
        expect(model.canonical).toBe(source);
        expect(model.stored).toBe(source);
        expect(model.failingRowIndexes).toEqual([]);
    });

    test('a domain row aligns on the membership sign the way an assignment aligns on equals', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Aligned', '\\displaylines{x\\in\\{1,2,3\\}\\\\y=2}');
        await runModel(page, 'Aligned');

        const model = await readModel(page, 'Aligned');
        expect(model.presented).toContain('x & \\in');
        expect(model.presented).toContain('y & =');
        expect(model.canonical).toBe('\\displaylines{x\\in\\{1,2,3\\}\\\\y=2}');
    });

    test('the shorthand of comma separated parts normalizes to one finite domain', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Shorthand', '\\displaylines{x=\\{1\\},\\{2\\},\\{3\\},\\left[6..7\\right]}');
        await runModel(page, 'Shorthand');

        expect((await readModel(page, 'Shorthand')).failingRowIndexes).toEqual([]);
        expect(await domainText(page, 'x')).toBe('{1, 2, 3, 6, 7}');
    });

    test('arithmetic on a categorical value leaves the result undefined', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Arithmetic', '\\displaylines{color\\in\\{\\text{red},\\text{green}\\}\\\\z=color+1}');
        await runModel(page, 'Arithmetic');

        const model = await readModel(page, 'Arithmetic');
        expect(model.diagnosticCodes).toContain('CATEGORICAL_ARITHMETIC');
        expect(await termValue(page, 'z')).toBeNaN();
    });

    test('an ordinary model gains no domains and no diagnostics', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Plain', '\\displaylines{x=1\\\\g=9.8\\\\high=\\max\\left(x,g\\right)\\\\f=\\begin{cases}1&t<0.15\\\\3&\\text{otherwise}\\end{cases}}');
        await runModel(page, 'Plain');

        const model = await readModel(page, 'Plain');
        expect(model.failingRowIndexes).toEqual([]);
        expect(model.constrained).toEqual([]);
        expect(model.diagnosticCodes).toEqual([]);
        expect(await termValue(page, 'x')).toBe(1);
        expect(await termValue(page, 'high')).toBeCloseTo(9.8, 6);
    });
});

test.describe('domain shortcuts in the template palette', () => {

    test('the palette offers every domain shape', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Palette', '\\displaylines{}');
        await focusExpression(page, 'Palette');

        const shortcuts = await page.evaluate(() => shell.board.shapes.getByName('Palette').getTemplateShortcuts()
            .map(shortcut => ({ name: shortcut.name, insertText: shortcut.insertText })));
        const byName = Object.fromEntries(shortcuts.map(shortcut => [shortcut.name, shortcut.insertText]));

        expect(byName['Belongs to']).toBe('\\in');
        expect(byName['Set']).toBe('\\{\\placeholder{},\\placeholder{},\\placeholder{}\\}');
        expect(byName['Range']).toBe('\\left[\\placeholder{}..\\placeholder{}\\right]');
        expect(byName['Interval']).toBe('\\left[\\placeholder{},\\placeholder{}\\right]');
        expect(byName['Union']).toBe('\\cup');
        expect(byName['Text values']).toBe('\\{\\text{\\placeholder{}},\\text{\\placeholder{}}\\}');
        expect(byName['Real numbers']).toBe('\\mathbb{R}');
        expect(byName['Integers']).toBe('\\mathbb{Z}');
        expect(byName['Natural numbers']).toBe('\\mathbb{N}');
        expect(byName['Booleans']).toBe('\\mathbb{B}');
        expect(byName['Named domain']).toBe('\\text{domain}\\ \\placeholder{}=\\placeholder{}');
    });

    test('the palette shows the membership and union accelerators', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Keys', '\\displaylines{}');
        await focusExpression(page, 'Keys');

        const keyTexts = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Keys');
            return Object.fromEntries(shape.getTemplateShortcuts().map(shortcut => [shortcut.name, shape.getShortcutPaletteKeyText(shortcut)]));
        });
        expect([keyTexts['Belongs to']]).toEqual(expect.arrayContaining([expect.stringMatching(/^(⌥e|Alt\+e)$/)]));
        expect([keyTexts['Union']]).toEqual(expect.arrayContaining([expect.stringMatching(/^(⌥u|Alt\+u)$/)]));
    });

    test('picking a domain shape from the palette writes it into the row', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Picked', '\\displaylines{}');
        await focusExpression(page, 'Picked');
        await page.keyboard.type('x');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Picked');
            shape.applyShortcutPaletteItem(shape.getTemplateShortcut('Belongs to'));
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Picked');
            shape.applyShortcutPaletteItem(shape.getTemplateShortcut('Range'));
        });
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Picked').expressionControl.getCanonicalValue()))
            .toContain('x\\in\\left[\\placeholder{}..\\placeholder{}\\right]');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Picked');
            shape.mathfield.focus();
            shape.mathfield.executeCommand('insert', '1');
            shape.mathfield.executeCommand('moveToNextPlaceholder');
            shape.mathfield.executeCommand('insert', '5');
        });
        await page.waitForTimeout(400);

        expect(await page.evaluate(() => shell.board.shapes.getByName('Picked').expressionControl.getCanonicalValue()))
            .toContain('x\\in\\left[1..5\\right]');
        await runModel(page, 'Picked');
        expect(await domainText(page, 'x')).toBe('[1..5]');
    });

    test('the membership accelerator writes the membership sign', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'Accel', '\\displaylines{}');
        await focusExpression(page, 'Accel');
        await page.keyboard.type('x');
        await page.keyboard.press('Alt+e');
        await page.waitForTimeout(300);

        expect(await page.evaluate(() => shell.board.shapes.getByName('Accel').expressionControl.getCanonicalValue()))
            .toContain('x\\in');
    });

    test('the union accelerator writes the union sign', async ({ page }) => {
        await setupEditor(page);
        await addExpression(page, 'AccelUnion', '\\displaylines{}');
        await focusExpression(page, 'AccelUnion');
        await page.keyboard.type('x');
        await page.keyboard.press('Alt+u');
        await page.waitForTimeout(300);

        expect(await page.evaluate(() => shell.board.shapes.getByName('AccelUnion').expressionControl.getCanonicalValue()))
            .toContain('x\\cup');
    });
});
