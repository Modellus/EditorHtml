const { test, expect } = require('@playwright/test');

const EDITOR_URL = '/pages/board/index.html';
const Utils_unitsDropDownHeight = 240;

async function setupEditor(page) {
    await page.addInitScript(() => {
        localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
    });
    await page.goto(EDITOR_URL);
    await page.waitForFunction(() => typeof shell !== 'undefined' && shell !== null && shell.board !== null, null, { timeout: 15000 });
    await page.waitForTimeout(500);
}

async function addModelTerms(page) {
    await page.evaluate(() => modellus.shape.addExpression('Expr1'));
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const shape = shell.board.shapes.getByName('Expr1');
        shape.properties.expression = 'x=5\\cdot t';
        shape.mathfield.value = 'x=5\\cdot t';
        shape.mathfield.position = 0;
        shape.mathfield.executeCommand('moveToNextChar');
    });
    await page.waitForTimeout(500);
}

async function openUnits(page) {
    await page.evaluate(() => shell.contextMenuController.show());
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const item = [...document.querySelectorAll('.dx-menu-item')].find(element => element.textContent.includes('Units'));
        item.click();
    });
    await page.waitForTimeout(600);
}

async function addCasesTable(page) {
    await page.evaluate(() => modellus.shape.addExpression('Expr1'));
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        shell.board.shapes.getByName('Expr1').properties.expression = '\\frac{dx}{dt}=v';
        shell.reset();
        modellus.shape.addCasesTable('Inputs1');
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
        const tableShape = shell.board.shapes.getByName('Inputs1');
        shell.board.selection.select(tableShape);
        tableShape.update();
        tableShape.refreshTableRows();
    });
    await page.waitForTimeout(300);
}

async function openValueTermSelector(page) {
    await page.evaluate(() => {
        shell.commands.addShape('ValueShape', 'Value1');
        shell.commands.setShapeProperties('Value1', { term: 'x', termDisplayMode: 'nameValue' });
        shell.setTermUnitCommand('x', 'm');
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Value1')));
    await page.waitForTimeout(500);
    await page.evaluate(() => shell.board.shapes.getByName('Value1')._termsDropdownElement.dxDropDownButton('instance').open());
    await page.waitForSelector('.shape-term-row');
    await page.waitForTimeout(400);
}

test.describe('Term units', () => {
    test('the Units menu option opens a grid with a name and a unit column, one row per term', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openUnits(page);
        const grid = await page.evaluate(() => ({
            visible: shell.unitsController.popup.option('visible'),
            captions: [...document.querySelectorAll('#units-grid .dx-datagrid-headers .dx-datagrid-text-content')].map(element => element.textContent),
            terms: shell.unitsController.grid.option('dataSource').map(row => row.name),
            typesetNames: [...document.querySelectorAll('#units-grid .mdl-units-name-cell math-field')].length
        }));
        expect(grid.visible).toBe(true);
        expect(grid.captions).toEqual(['Name', 'Unit']);
        expect(grid.terms).toContain('x');
        expect(grid.terms).toContain('t');
        expect(grid.typesetNames).toBe(grid.terms.length);
    });

    test('editing a unit cell writes it to the model', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openUnits(page);
        await page.evaluate(() => {
            const grid = shell.unitsController.grid;
            grid.cellValue(grid.getRowIndexByKey('x'), 'unit', 'm');
            grid.saveEditData();
        });
        await page.waitForTimeout(400);
        const stored = await page.evaluate(() => shell.properties.termUnits);
        expect(stored).toEqual({ x: 'm' });
    });

    test('choosing a unit stores it in the model properties and survives a round trip', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openUnits(page);
        await page.evaluate(() => shell.unitsController.setTermUnit('x', 'm'));
        await page.waitForTimeout(300);
        const state = await page.evaluate(() => {
            const serialized = shell.serialize();
            shell.setPropertyCommand('termUnits', {});
            shell.deserialise(serialized);
            shell.reset();
            return {
                stored: shell.properties.termUnits,
                calculatorUnit: shell.calculator.getTermUnit('x'),
                serializedUnit: serialized.properties.termUnits.x
            };
        });
        expect(state.stored).toEqual({ x: 'm' });
        expect(state.calculatorUnit).toBe('m');
        expect(state.serializedUnit).toBe('m');
    });

    test('clearing a unit removes it and undo restores the previous one', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openUnits(page);
        await page.evaluate(() => shell.unitsController.setTermUnit('x', 'm'));
        await page.waitForTimeout(200);
        await page.evaluate(() => shell.unitsController.setTermUnit('x', ''));
        await page.waitForTimeout(200);
        const cleared = await page.evaluate(() => ({ stored: shell.properties.termUnits, calculatorUnit: shell.calculator.getTermUnit('x') }));
        expect(cleared.stored).toEqual({});
        expect(cleared.calculatorUnit).toBe('');
        await page.evaluate(() => shell.undoPressed());
        await page.waitForTimeout(300);
        const restored = await page.evaluate(() => ({ stored: shell.properties.termUnits, calculatorUnit: shell.calculator.getTermUnit('x') }));
        expect(restored.stored).toEqual({ x: 'm' });
        expect(restored.calculatorUnit).toBe('m');
    });

    test('the scenarios table writes the unit beside the term it belongs to, with no column of its own', async ({ page }) => {
        await setupEditor(page);
        await addCasesTable(page);
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm', v: 'm/s', t: 's' }));
        await page.waitForTimeout(500);
        const table = await page.evaluate(() => {
            const tableShape = shell.board.shapes.getByName('Inputs1');
            return {
                columnKeys: tableShape.table.options.columns.map(column => column.key),
                units: tableShape.table.rows.filter(row => row.termName).map(row => ({ term: row.termName, unit: row.unit })),
                drawnTexts: [...tableShape.table.rowsLayer.querySelectorAll('text')].map(text => text.textContent)
            };
        });
        expect(table.columnKeys).toEqual(['term', 'case1']);
        expect(table.units).toEqual([{ term: 'x', unit: 'm' }, { term: 'v', unit: 'm/s' }]);
        expect(table.drawnTexts).toContain('x / m');
        expect(table.drawnTexts).toContain('v / (m/s)');
        expect(table.drawnTexts).toContain('t = 0.00 / s');
    });

    test('the term column of the scenarios table widens to hold the unit it now carries', async ({ page }) => {
        await setupEditor(page);
        await addCasesTable(page);
        const narrow = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').table.getColumnWidth(shell.board.shapes.getByName('Inputs1').table.options.columns[0]));
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm/s\u00b2' }));
        await page.waitForTimeout(500);
        const wide = await page.evaluate(() => shell.board.shapes.getByName('Inputs1').table.getColumnWidth(shell.board.shapes.getByName('Inputs1').table.options.columns[0]));
        expect(wide).toBeGreaterThan(narrow);
    });

    test('the unit drop down lists the units as read-only math fields inside a capped popup, and offers no clear button', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        const dropDown = await page.evaluate(() => {
            const content = document.querySelector('.mdl-units-dropdown .dx-overlay-content');
            const fields = [...document.querySelectorAll('.mdl-units-dropdown .mdl-units-item math-field')];
            return {
                height: Math.round(content.getBoundingClientRect().height),
                itemCount: document.querySelectorAll('.mdl-units-dropdown .mdl-units-item').length,
                fieldCount: fields.length,
                readOnly: fields.every(field => field.hasAttribute('read-only')),
                firstLatex: fields[0].textContent.trim(),
                accelerationLatex: fields.map(field => field.textContent.trim()).find(latex => latex.includes('s^{2}')),
                clearButtons: document.querySelectorAll('.shape-term-units .dx-clear-button-area').length
            };
        });
        expect(dropDown.height).toBeLessThanOrEqual(Utils_unitsDropDownHeight);
        expect(dropDown.fieldCount).toBe(dropDown.itemCount);
        expect(dropDown.readOnly).toBe(true);
        expect(dropDown.firstLatex).toBe('\\mathrm{m}');
        expect(dropDown.accelerationLatex).toBe('\\mathrm{m/s^{2}}');
        expect(dropDown.clearButtons).toBe(0);
    });

    test('the list of units scrolls under the wheel, and an item scrolled to is the one picked', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        const listBox = await page.locator('.mdl-units-list-host').boundingBox();
        await page.mouse.move(listBox.x + listBox.width / 2, listBox.y + listBox.height / 2);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(400);
        const scrolled = await page.evaluate(() => ({
            offset: UnitsControl.scrollView.scrollTop(),
            reach: UnitsControl.scrollView.scrollHeight() > UnitsControl.scrollView.clientHeight()
        }));
        expect(scrolled.reach).toBe(true);
        expect(scrolled.offset).toBeGreaterThan(0);
        await page.locator('.mdl-units-dropdown .mdl-units-item[data-unit="rad"]').click();
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.properties.termUnits)).toEqual({ x: 'rad' });
    });

    test('emptying the written unit clears the unit of that term', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.properties.termUnits)).toEqual({});
        expect(await page.evaluate(() => shell.calculator.getTermUnit('x'))).toBe('');
    });

    test('the player names its independent and iteration terms with a unit beside each, in the term font', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => shell.setTermUnitCommand('t', 's'));
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.bottomToolbar._independentDropdownElement.dxDropDownButton('instance').open());
        await page.waitForTimeout(700);
        const rows = await page.evaluate(() => ({
            editors: document.querySelectorAll('.mdl-independent-dropdown .term-packed-control__units .mdl-units-editor').length,
            typeset: [...document.querySelectorAll('.mdl-independent-dropdown .mdl-units-editor-math-field')].map(field => field.value),
            nameFont: getComputedStyle(document.querySelector('.mdl-independent-dropdown .term-packed-control__select .dx-texteditor-input')).fontFamily
        }));
        expect(rows.editors).toBe(2);
        expect(rows.typeset).toEqual(['\\mathrm{s}', '']);
        expect(rows.nameFont).toContain('Katex_Math');
    });

    test('a unit chosen in the player toolbar is set on the term the player names', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => shell.bottomToolbar._independentDropdownElement.dxDropDownButton('instance').open());
        await page.waitForTimeout(700);
        await page.locator('.mdl-independent-dropdown .term-packed-control__units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        await page.locator('.mdl-units-dropdown .mdl-units-item[data-unit="min"]').click();
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.properties.termUnits)).toEqual({ t: 'min' });
        expect(await page.evaluate(() => document.querySelectorAll('.mdl-independent-dropdown').length)).toBe(1);
    });

    test('the term selector of a shape toolbar carries the unit of the term it names', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        const row = await page.evaluate(() => ({
            cells: [...document.querySelector('.shape-term-row').children].map(cell => cell.className.split(' ')[0]),
            typeset: document.querySelector('.shape-term-units .mdl-units-editor-math-field').value,
            value: $('.shape-term-units .mdl-units-editor').dxDropDownBox('instance').option('value')
        }));
        expect(row.cells).toContain('shape-term-units');
        expect(row.value).toBe('m');
        expect(row.typeset).toBe('\\mathrm{m}');
    });

    test('choosing a unit in a shape toolbar sets it on the term, and the shape shows it', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        await page.locator('.mdl-units-dropdown .mdl-units-item[data-unit="km"]').click();
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.properties.termUnits)).toEqual({ x: 'km' });
        expect(await page.evaluate(() => shell.calculator.getTermUnit('x'))).toBe('km');
        expect(await page.evaluate(() => shell.board.shapes.getByName('Value1').valueText.textContent)).toContain('km');
        const list = await page.evaluate(() => ({ parent: UnitsControl.listElement.parentElement.className, items: UnitsControl.listElement.children.length }));
        expect(list.parent).toBe('mdl-units-warm-host');
        expect(list.items).toBe(await page.evaluate(() => Utils.isoUnits.length));
    });

    test('a unit the list does not carry is written in the drop down as mathematics', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('mm/h');
        await page.waitForTimeout(300);
        const typing = await page.evaluate(() => ({
            typed: Utils.getUnitsPlainText(document.querySelector('.mdl-units-dropdown math-field.mdl-units-input').value),
            listed: [...document.querySelectorAll('.mdl-units-dropdown .mdl-units-item')].filter(item => !item.classList.contains('mdl-units-item--hidden')).map(item => item.dataset.unit)
        }));
        expect(typing.typed).toBe('mm/h');
        expect(typing.listed).toEqual([]);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => shell.properties.termUnits)).toEqual({ x: 'mm/h' });
    });

    test('typing in the drop down narrows the list to the units that carry what was typed', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(400);
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
        await page.keyboard.type('m/s');
        await page.waitForTimeout(300);
        const listed = await page.evaluate(() => [...document.querySelectorAll('.mdl-units-dropdown .mdl-units-item')].filter(item => !item.classList.contains('mdl-units-item--hidden')).map(item => item.dataset.unit));
        expect(listed).toEqual(['m/s', 'm/s\u00b2', 'kg\u00b7m/s']);
    });

    test('every picker shares one typeset list, built once and moved into whichever is open', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await openValueTermSelector(page);
        const built = await page.evaluate(() => {
            UnitsControl.listElement.dataset.probe = 'first';
            return { items: UnitsControl.listElement.children.length, warmed: UnitsControl.listElement.parentElement.className };
        });
        expect(built.items).toBe(await page.evaluate(() => Utils.isoUnits.length));
        expect(built.warmed).toBe('mdl-units-warm-host');
        await page.locator('.shape-term-units').first().click();
        await page.waitForSelector('.mdl-units-dropdown .mdl-units-item');
        await page.waitForTimeout(300);
        const opened = await page.evaluate(() => ({
            probe: document.querySelector('.mdl-units-dropdown .mdl-units-list').dataset.probe,
            listsInPage: document.querySelectorAll('.mdl-units-list').length
        }));
        expect(opened.probe).toBe('first');
        expect(opened.listsInPage).toBe(1);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        expect(await page.evaluate(() => UnitsControl.listElement.parentElement.className)).toBe('mdl-units-warm-host');
    });

    test('the unit of a term is held by the calculation engine and survives a re-parse', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm' }));
        await page.waitForTimeout(400);
        const applied = await page.evaluate(() => ({
            engineUnits: shell.calculator.system.getTerm('x').unitsText,
            calculatorUnit: shell.calculator.getTermUnit('x')
        }));
        expect(applied.engineUnits).toBe('m');
        expect(applied.calculatorUnit).toBe('m');
        await page.evaluate(() => shell.reset());
        await page.waitForTimeout(400);
        const afterReparse = await page.evaluate(() => ({
            sameTermObject: false,
            engineUnits: shell.calculator.system.getTerm('x').unitsText,
            calculatorUnit: shell.calculator.getTermUnit('x')
        }));
        expect(afterReparse.engineUnits).toBe('m');
        expect(afterReparse.calculatorUnit).toBe('m');
    });

    test('clearing a unit clears it on the engine term as well', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm' }));
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.setTermUnitCommand('x', ''));
        await page.waitForTimeout(400);
        const state = await page.evaluate(() => ({
            engineUnits: shell.calculator.system.getTerm('x').unitsText,
            calculatorUnit: shell.calculator.getTermUnit('x')
        }));
        expect(state.engineUnits).toBe(null);
        expect(state.calculatorUnit).toBe('');
    });

    test('undoing a property change leaves the model parsed, so the engine still holds the units', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm' }));
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.setPropertyCommand('precision', 4));
        await page.waitForTimeout(300);
        await page.evaluate(() => shell.undoPressed());
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
            precision: shell.properties.precision,
            terms: shell.calculator.getTermsNames(),
            calculatorUnit: shell.calculator.getTermUnit('x')
        }));
        expect(state.precision).toBe(2);
        expect(state.terms).toContain('x');
        expect(state.calculatorUnit).toBe('m');
    });

    test('space in the expression editor no longer writes a units placeholder', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => modellus.shape.addExpression('Expr1'));
        await page.waitForTimeout(400);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            shape.mathfield.focus();
            shape.mathfield.value = 'x=5';
            shape.mathfield.executeCommand('moveToMathfieldEnd');
        });
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
        const value = await page.evaluate(() => shell.board.shapes.getByName('Expr1').mathfield.value);
        expect(value).not.toContain('mathrm');
        expect(value).not.toContain('textcolor');
    });

    test('units are written as upright mathematics through one shared formatter', async ({ page }) => {
        await setupEditor(page);
        const formatted = await page.evaluate(() => ({
            metre: Utils.getUnitsLatex('m'),
            acceleration: Utils.getUnitsLatex('m/s²'),
            torque: Utils.getUnitsLatex('N·m'),
            inverse: Utils.getUnitsLatex('s⁻¹'),
            empty: Utils.getUnitsLatex(''),
            plainFromCaret: Utils.getUnitsPlainText('m/s^2'),
            plainFromLatex: Utils.getUnitsPlainText('\\mathrm{N\\cdot m}'),
            termWithUnits: Utils.buildTermWithUnitsLatex('v_{\\!x}', 'm/s'),
            termWithoutUnits: Utils.buildTermWithUnitsLatex('x', ''),
            markup: Utils.buildUnitsMathFieldMarkup('m/s²')
        }));
        expect(formatted.metre).toBe('\\mathrm{m}');
        expect(formatted.acceleration).toBe('\\mathrm{m/s^{2}}');
        expect(formatted.torque).toBe('\\mathrm{N\\cdot m}');
        expect(formatted.inverse).toBe('\\mathrm{s^{-1}}');
        expect(formatted.empty).toBe('');
        expect(formatted.plainFromCaret).toBe('m/s²');
        expect(formatted.plainFromLatex).toBe('N·m');
        expect(formatted.termWithUnits).toBe('v_{\\!x}\\;/\\;(\\mathrm{m/s})');
        expect(formatted.termWithoutUnits).toBe('x');
        expect(formatted.markup).toContain('<math-field read-only');
        expect(formatted.markup).toContain('\\mathrm{m/s^{2}}');
    });

    test('the chart axis title and legend carry the units of their terms', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => {
            shell.setPropertyCommand('termUnits', { t: 's', x: 'm' });
            modellus.shape.addChart('Chart1');
        });
        await page.waitForTimeout(600);
        await page.evaluate(() => modellus.shape.setProperties('Chart1', { xTerm: 't', yTerms: [{ term: 'x', case: 1 }] }));
        await page.waitForTimeout(600);
        const labels = await page.evaluate(() => {
            const chartShape = shell.board.shapes.getByName('Chart1');
            return {
                axisTitle: chartShape.getTermLabelWithCase('t', 1).termLatex,
                seriesName: chartShape.getSeriesName({ term: 'x', case: 1 }).termLatex
            };
        });
        expect(labels.axisTitle).toBe('t\\;/\\;\\mathrm{s}');
        expect(labels.seriesName).toBe('x\\;/\\;\\mathrm{m}');
    });

    test('a table header carries the units of its term', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => {
            shell.setPropertyCommand('termUnits', { x: 'm/s²' });
            modellus.shape.addTable('Table1');
        });
        await page.waitForTimeout(600);
        await page.evaluate(() => modellus.shape.setProperties('Table1', { columns: [{ term: 'x', case: 1 }] }));
        await page.waitForTimeout(600);
        const titles = await page.evaluate(() => shell.board.shapes.getByName('Table1').buildControlColumns().map(column => column.title));
        expect(titles).toContain('x\\;/\\;(\\mathrm{m/s^{2}})');
    });

    test('the Units popup writes each unit with a read-only math field', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => shell.setPropertyCommand('termUnits', { x: 'm/s²' }));
        await page.waitForTimeout(300);
        await openUnits(page);
        const unitFields = await page.evaluate(() => [...document.querySelectorAll('#units-grid .mdl-units-unit-cell math-field')].map(field => ({
            readOnly: field.hasAttribute('read-only'),
            latex: field.textContent.trim()
        })));
        expect(unitFields.length).toBe(1);
        expect(unitFields[0].readOnly).toBe(true);
        expect(unitFields[0].latex).toBe('\\mathrm{m/s^{2}}');
    });

    test('the unit is written after the value in a name = value label, behind the same separator', async ({ page }) => {
        await setupEditor(page);
        const html = await page.evaluate(() => ({
            withUnit: Utils.buildTermValueTextHtml('x', '5', 'm/s'),
            withoutUnit: Utils.buildTermValueTextHtml('x', '5', ''),
            valueOnly: Utils.buildTermValueTextHtml('', '5', 'm/s')
        }));
        expect(html.withUnit).toContain('> = 5</tspan>');
        expect(html.withUnit).toContain('> / (m/s)</tspan>');
        expect(html.withoutUnit).not.toContain('m/s');
        expect(html.valueOnly).toContain('> / (m/s)</tspan>');
    });

    test('a value shape shows the unit of the term it displays', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => {
            shell.commands.addShape('ValueShape', 'Value1');
            shell.commands.setShapeProperties('Value1', { term: 'x', termDisplayMode: 'nameValue' });
            shell.setPropertyCommand('termUnits', { x: 'm' });
        });
        await page.waitForTimeout(500);
        const text = await page.evaluate(() => shell.board.shapes.getByName('Value1').valueText.textContent);
        expect(text.trim()).toBe('x = 0.00 / m');
    });

    test('one shared writer builds the name, the value and the unit for every surface', async ({ page }) => {
        await setupEditor(page);
        const written = await page.evaluate(() => ({
            suffix: Utils.buildTermUnitsSuffix('m/s'),
            simpleSuffix: Utils.buildTermUnitsSuffix('m'),
            noSuffix: Utils.buildTermUnitsSuffix(''),
            reading: Utils.buildTermValueText('v', '5.00', 'm/s'),
            readingWithoutUnit: Utils.buildTermValueText('v', '5.00', ''),
            valueOnly: Utils.buildTermValueText('', '5.00', 'm'),
            split: Utils.splitTermWithUnitsLatex(Utils.buildTermWithUnitsLatex('v_{\\!x}', 'm/s')),
            splitSimple: Utils.splitTermWithUnitsLatex(Utils.buildTermWithUnitsLatex('t', 's')),
            splitWithoutUnits: Utils.splitTermWithUnitsLatex('v_{\\!x}')
        }));
        expect(written.suffix).toBe(' / (m/s)');
        expect(written.simpleSuffix).toBe(' / m');
        expect(written.noSuffix).toBe('');
        expect(written.reading).toBe('v = 5.00 / (m/s)');
        expect(written.readingWithoutUnit).toBe('v = 5.00');
        expect(written.valueOnly).toBe('5.00 / m');
        expect(written.split).toEqual({ termLatex: 'v_{\\!x}', unitsLatex: '(\\mathrm{m/s})' });
        expect(written.splitSimple).toEqual({ termLatex: 't', unitsLatex: '\\mathrm{s}' });
        expect(written.splitWithoutUnits).toEqual({ termLatex: 'v_{\\!x}', unitsLatex: '' });
    });

    test('the unit and the slash before it are written faded, in the color the term is written in', async ({ page }) => {
        await setupEditor(page);
        const written = await page.evaluate(() => ({
            opacity: Utils.termUnitsOpacity,
            label: Utils.buildTermWithUnitsTextHtml('x', 'm/s'),
            reading: Utils.buildTermValueTextHtml('x', '5', 'm/s'),
            withoutUnit: Utils.buildTermValueTextHtml('x', '5', '')
        }));
        expect(written.label).toContain(`fill-opacity="${written.opacity}"> / (m/s)</tspan>`);
        expect(written.label.match(/fill-opacity/g).length).toBe(1);
        expect(written.reading).toContain(`fill-opacity="${written.opacity}"`);
        expect(written.reading.match(/fill-opacity/g).length).toBe(1);
        expect(written.withoutUnit).not.toContain('fill-opacity');
        expect(written.label).not.toContain('fill=');
    });

    // A row may hold a plain value rather than a term — 100 — and a plain value is measured in
    // something too, so the same picker is there to make it 100 m. That unit belongs to whoever wrote
    // the value, so it is kept on the shape beside it rather than in the model's units.
    test('a plain value is given its unit in the same row the value is written in', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            shell.commands.addShape('ValueShape', 'Value1');
            shell.commands.setShapeProperties('Value1', { term: '100', termDisplayMode: 'nameValue', x: 80, y: 90, width: 180 });
        });
        await page.waitForTimeout(600);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Value1')));
        await page.waitForTimeout(500);
        await page.evaluate(() => shell.board.shapes.getByName('Value1')._termsDropdownElement.dxDropDownButton('instance').open());
        await page.waitForSelector('.shape-term-row');
        await page.waitForTimeout(500);
        expect(await page.evaluate(() => [...document.querySelectorAll('.shape-term-units')].filter(host => host.offsetParent !== null).length)).toBe(1);
        await page.evaluate(() => {
            const host = [...document.querySelectorAll('.shape-term-units')].find(element => element.offsetParent !== null);
            $(host).find('.mdl-units-editor').first().dxDropDownBox('instance').option('value', 'm');
        });
        await page.waitForTimeout(800);
        const written = await page.evaluate(() => ({
            valueUnit: shell.board.shapes.getByName('Value1').properties.termUnit,
            modelUnits: shell.properties.termUnits,
            readout: shell.board.shapes.getByName('Value1').valueText.textContent
        }));
        expect(written.valueUnit).toBe('m');
        expect(written.modelUnits).toEqual({});
        expect(written.readout.endsWith('100.00 / m')).toBe(true);
    });

    // A component keeps the unit of a plain value where its own definition says: the unit parameter it
    // already declares, which is what its drawing reads. One declaring none offers nothing to write.
    test('a component reading a plain value writes the unit into the parameter it declares for it', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => {
            shell.commands.addComponent('thermometer', 'Thermometer').setProperties({ x: 60, y: 60, width: 150, height: 260, valueVariable: '20' });
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(700);
        await page.evaluate(() => shell.board.selection.select(shell.board.shapes.getByName('Thermometer')));
        await page.waitForTimeout(600);
        await page.evaluate(() => shell.board.shapes.getByName('Thermometer')._componentModelDropdownElement.dxDropDownButton('instance').open());
        await page.waitForTimeout(600);
        const readout = () => page.evaluate(() => shell.board.shapes.getByName('Thermometer').element.querySelector('[data-source-id="readout"]').textContent);
        expect(await page.evaluate(() => [...document.querySelectorAll('.shape-term-units')].filter(host => host.offsetParent !== null).length)).toBe(1);
        expect(await readout()).toBe('20.0 / °C');
        await page.evaluate(() => {
            const host = [...document.querySelectorAll('.shape-term-units')].find(element => element.offsetParent !== null);
            $(host).find('.mdl-units-editor').first().dxDropDownBox('instance').option('value', '°F');
        });
        await page.waitForTimeout(800);
        expect(await page.evaluate(() => shell.board.shapes.getByName('Thermometer').properties.unit)).toBe('°F');
        expect(await readout()).toBe('20.0 / °F');
    });

    // The notebook's blocks name a term with a control of their own, so the unit is picked beside it
    // there too — the same picker, writing into the same model property. A row naming nothing yet has
    // no term to give a unit to, so the cell stands away until one is named.
    test('a notebook block names the unit beside the term it reads', async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('mp.session', JSON.stringify({ token: 'test', userId: 'test' }));
        });
        await page.goto('/pages/notebook/index.html');
        await page.waitForFunction(() => typeof notebook !== 'undefined' && notebook !== null && notebook.invoker != null, null, { timeout: 15000 });
        await page.waitForTimeout(600);
        const expressionId = await page.evaluate(() => {
            notebook.addBlock('expression');
            return notebook.blocks[notebook.blocks.length - 1].id;
        });
        await page.waitForTimeout(500);
        await page.evaluate(id => {
            const shape = notebook.shapeInstances.get(id);
            shape.block.content = 'x=5\\cdot t';
            shape.expressionControl?.setValue?.('x=5\\cdot t');
            notebook._reparseExpressions();
        }, expressionId);
        await page.waitForTimeout(700);
        const valueId = await page.evaluate(() => {
            notebook.addBlock('value');
            return notebook.blocks[notebook.blocks.length - 1].id;
        });
        await page.waitForTimeout(600);
        await page.click(`.notebook-block[data-block-id="${valueId}"]`);
        await page.waitForTimeout(600);
        await page.evaluate(id => notebook.shapeInstances.get(id)._termsDropdownElement?.dxDropDownButton('instance').open(), valueId);
        await page.waitForTimeout(600);
        const beforeTerm = await page.evaluate(() => [...document.querySelectorAll('.shape-term-units')].filter(host => host.offsetParent !== null).length);
        expect(beforeTerm).toBe(0);
        await page.evaluate(() => $(document.querySelector('.notebook-term-control__select')).dxSelectBox('instance').option('value', 'x'));
        await page.waitForTimeout(500);
        const afterTerm = await page.evaluate(() => [...document.querySelectorAll('.shape-term-units')].filter(host => host.offsetParent !== null).length);
        expect(afterTerm).toBe(1);
        await page.evaluate(() => {
            const host = [...document.querySelectorAll('.shape-term-units')].find(element => element.offsetParent !== null);
            $(host).find('.mdl-units-editor').first().dxDropDownBox('instance').option('value', 'm');
        });
        await page.waitForTimeout(700);
        const written = await page.evaluate(() => ({
            stored: notebook.properties.termUnits,
            engineUnit: notebook.calculator.getTermUnit('x')
        }));
        expect(written.stored).toEqual({ x: 'm' });
        expect(written.engineUnit).toBe('m');
    });

    // A component drawn from blocks writes its reading the way every other surface writes one: the
    // unit of the term it reads, after the separator, faded, and in the font the component itself is
    // drawn in. Its own unit parameter is what is left for a component reading a plain number.
    test('a component built from blocks reads the unit of the term it shows', async ({ page }) => {
        await setupEditor(page);
        await page.evaluate(() => modellus.shape.addExpression('Expr1'));
        await page.waitForTimeout(300);
        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Expr1');
            const expression = 'T=20\\\\v=64';
            shape.properties.expression = expression;
            shape.mathfield.value = expression;
            shape.mathfield.position = 0;
            shape.mathfield.executeCommand('moveToNextChar');
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => {
            shell.setPropertyCommand('termUnits', { T: 'K', v: 'km/h' });
            shell.commands.addComponent('thermometer', 'Thermometer').setProperties({ x: 40, y: 60, width: 150, height: 280, valueVariable: 'T' });
            shell.commands.addComponent('speedometer', 'Speedometer').setProperties({ x: 230, y: 60, width: 240, height: 240, valueVariable: 'v' });
            shell.commands.addComponent('circular-gauge', 'Gauge').setProperties({ x: 500, y: 60, width: 200, height: 200, valueVariable: '68', unit: '%' });
            shell.board.forceRefresh();
        });
        await page.waitForTimeout(900);
        const readouts = await page.evaluate(() => ['Thermometer', 'Speedometer', 'Gauge'].map(name => {
            const readout = shell.board.shapes.getByName(name).element.querySelector('[data-source-id="readout"]');
            return { text: readout.textContent, html: readout.innerHTML, unitFont: readout.querySelector('tspan')?.getAttribute('font-family') ?? null };
        }));
        // The thermometer names °C itself, and the term says kelvin: what the model measures in wins.
        expect(readouts[0].text).toBe('20.0 / K');
        expect(readouts[1].text).toBe('64 / (km/h)');
        // Nothing but a number to read, so the unit the gauge carries itself is the one it writes.
        expect(readouts[2].text).toBe('68 / %');
        for (const readout of readouts) {
            expect(readout.html).toContain(`fill-opacity="${await page.evaluate(() => Utils.termUnitsOpacity)}"`);
            expect(readout.unitFont).toBe(null);
        }
    });

    test('a header typeset as mathematics writes the unit faded, after the name it belongs to', async ({ page }) => {
        await setupEditor(page);
        await addModelTerms(page);
        await page.evaluate(() => {
            shell.setPropertyCommand('termUnits', { x: 'm/s\u00b2' });
            modellus.shape.addTable('Table1');
        });
        await page.waitForTimeout(600);
        await page.evaluate(() => modellus.shape.setProperties('Table1', { columns: [{ term: 'x', case: 1 }] }));
        await page.waitForTimeout(1200);
        const pieces = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Table1');
            return [...shape.element.querySelectorAll('g')]
                .filter(group => group.firstElementChild?.tagName === 'svg')
                .map(group => {
                    const position = group.getAttribute('transform').match(/translate\(([-\d.]+), ?([-\d.]+)\)/);
                    return {
                        opacity: group.getAttribute('opacity'),
                        x: Number(position[1]),
                        y: Number(position[2]),
                        width: Number(group.firstElementChild.getAttribute('width'))
                    };
                });
        });
        expect(pieces.length).toBe(2);
        expect(pieces[0].opacity).toBe(null);
        expect(pieces[1].opacity).toBe(`${await page.evaluate(() => Utils.termUnitsOpacity)}`);
        expect(pieces[1].x).toBeCloseTo(pieces[0].x + pieces[0].width, 3);
    });
});
