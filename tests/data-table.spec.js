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

async function addDataTable(page, name) {
    await page.evaluate(n => modellus.shape.addDataTable(n), name);
    await page.waitForTimeout(400);
}

test.describe('Data table', () => {
    test('starts with the independent term selected as its first column', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            return {
                shapeClass: shape?.constructor?.name ?? null,
                independentName: shape.board.calculator.properties.independent.name,
                columnTerms: shape.getSelectedColumns().map(c => c.term),
                hasPlaceholder: !!shape._dataPlaceholderElement
            };
        });

        expect(state.shapeClass).toBe('DataTableShape');
        expect(state.columnTerms).toEqual([state.independentName]);
        expect(state.hasPlaceholder).toBe(false);
    });

    test('loading a dataset shows its rows and only offers independent + dataset terms, with no per-column case', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            // Load data that does NOT contain the independent term, to prove it is still offered.
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({ names: ['p', 'q'], values: [[10, 1], [20, 2], [30, 3]] });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            const independentName = shape.board.calculator.properties.independent.name;
            const termItems = shape.getColumnTermItems({ term: '' }).map(i => i.term).filter(Boolean).sort();
            return {
                columnTerms: shape.properties.columns.filter(c => c.term).map(c => c.term),
                rowCount: shape.table?.rows?.length ?? 0,
                termItems: termItems,
                independentName: independentName,
                includesCase: shape.columnsControlIncludesCase(),
                anyShowCase: shape.buildControlColumns(shape.getSelectedColumns()).some(c => c.showCase)
            };
        });

        expect(state.columnTerms).toEqual(['p', 'q']);
        expect(state.rowCount).toBe(3);
        // Offered terms = independent term + the dataset's terms, nothing else.
        expect(state.termItems).toEqual([state.independentName, 'p', 'q'].sort());
        // No per-column case selector, and no case badge in the table header.
        expect(state.includesCase).toBe(false);
        expect(state.anyShowCase).toBe(false);
    });

    test('the data-case selector appears only with multiple cases and re-cases the columns', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        const singleCaseDisplay = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shell.board.selection.select(shape);
            return shape._dataCaseItemElement?.css('display');
        });
        expect(singleCaseDisplay).toBe('none');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shell.calculator.setProperties({ casesCount: 3 });
            shape.applyImportedExternalData({ names: ['t', 'p'], values: [[0, 10], [1, 20]] });
            shape.refreshShapeSpecificToolbarControls();
            shape.setDataCase(2);
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            return {
                caseSelectorDisplay: shape._dataCaseItemElement?.css('display'),
                dataCase: shape.properties.dataCase,
                columnCases: shape.properties.columns.filter(c => c.term).map(c => c.case)
            };
        });
        expect(state.caseSelectorDisplay).toBe('flex');
        expect(state.dataCase).toBe(2);
        expect(state.columnCases).toEqual([2, 2]);
    });

    test('the data table color menu has no Row Step option, unlike the iterations table', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');
        await page.evaluate(() => modellus.shape.addTable('Iter1'));
        await page.waitForTimeout(400);

        const labels = await page.evaluate(() => {
            const collectMenuLabels = shape => {
                const sections = [{ items: [] }];
                shape.populateShapeColorMenuSections(sections);
                return sections.flatMap(section => section.items).map(item => item.text);
            };
            return {
                dataTable: collectMenuLabels(shell.board.shapes.getByName('Data1')),
                iterationsTable: collectMenuLabels(shell.board.shapes.getByName('Iter1'))
            };
        });

        expect(labels.iterationsTable).toContain('Row Step');
        expect(labels.dataTable).not.toContain('Row Step');
    });
});

test.describe('Data table columns written as names', () => {
    test('a column of names becomes a term constrained to the names it holds', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({
                names: ['species', 'length'],
                values: [['setosa', 5.1], ['virginica', 6.3], ['setosa', 4.9]]
            });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const calculator = shell.calculator;
            return {
                isCategorical: calculator.isCategoricalTerm('species'),
                labels: (calculator.getTermDomainValues('species') ?? []).map(entry => entry.label),
                lengthIsCategorical: calculator.isCategoricalTerm('length'),
                firstLabel: calculator.getValueLabel('species', calculator.system.getByNameOnIteration(1, 'species'))
            };
        });

        expect(state.isCategorical).toBe(true);
        expect(state.labels).toEqual(['setosa', 'virginica']);
        expect(state.lengthIsCategorical).toBe(false);
        expect(state.firstLabel).toBe('setosa');
    });

    test('a cell of names shows the name and offers the list', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({
                names: ['species', 'length'],
                values: [['setosa', 5.1], ['virginica', 6.3]]
            });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            const table = shape.table;
            const speciesColumn = table.options.columns.find(column => column.sourceColumn?.term === 'species');
            return {
                options: (table.getCellOptionsFor(table.rows[0], speciesColumn) ?? []).map(option => option.label),
                firstLabel: table.getCellOptionLabel(table.rows[0], speciesColumn, table.rows[0][speciesColumn.key]),
                secondLabel: table.getCellOptionLabel(table.rows[1], speciesColumn, table.rows[1][speciesColumn.key])
            };
        });

        expect(state.options).toEqual(['setosa', 'virginica']);
        expect(state.firstLabel).toBe('setosa');
        expect(state.secondLabel).toBe('virginica');
    });

    test('choosing another name writes the name itself back into the dataset', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({
                names: ['species'],
                values: [['setosa'], ['virginica']]
            });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            const table = shape.table;
            const speciesColumn = table.options.columns.find(column => column.sourceColumn?.term === 'species');
            const virginicaValue = shell.calculator.resolveTermValue('species', 'virginica');
            const accepted = shape.onTableCellValueChanged({ column: speciesColumn, rowKey: 0, value: virginicaValue });
            return {
                accepted: accepted,
                stored: shape.properties.externalData.values[0][0],
                readBack: shell.calculator.getValueLabel('species', shell.calculator.system.getByNameOnIteration(1, 'species'))
            };
        });

        expect(state.accepted).toBe(true);
        expect(state.stored).toBe('virginica');
        expect(state.readBack).toBe('virginica');
    });

    test('a dataset written as names survives a save and reload', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({
                names: ['species', 'length'],
                values: [['setosa', 5.1], ['virginica', 6.3]]
            });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(async () => {
            const model = JSON.stringify(shell.serialize());
            shell.openModel(model);
            await new Promise(resolve => setTimeout(resolve, 600));
            const shape = shell.board.shapes.getByName('Data1');
            return {
                values: shape.properties.externalData.values,
                isCategorical: shell.calculator.isCategoricalTerm('species'),
                labels: (shell.calculator.getTermDomainValues('species') ?? []).map(entry => entry.label)
            };
        });

        expect(state.values).toEqual([['setosa', 5.1], ['virginica', 6.3]]);
        expect(state.isCategorical).toBe(true);
        expect(state.labels).toEqual(['setosa', 'virginica']);
    });

    test('a column of numbers carrying one unreadable cell stays a column of numbers', async ({ page }) => {
        await setupEditor(page);
        await addDataTable(page, 'Data1');

        await page.evaluate(() => {
            const shape = shell.board.shapes.getByName('Data1');
            shape.applyImportedExternalData({ names: ['p'], values: [[10], ['n/a'], [30]] });
        });
        await page.waitForTimeout(300);

        const state = await page.evaluate(() => ({
            isCategorical: shell.calculator.isCategoricalTerm('p'),
            first: shell.calculator.system.getByNameOnIteration(1, 'p'),
            second: shell.calculator.system.getByNameOnIteration(2, 'p')
        }));

        expect(state.isCategorical).toBe(false);
        expect(state.first).toBeCloseTo(10, 2);
        expect(Number.isNaN(state.second)).toBe(true);
    });

    test('a comma separated file keeps a cell that is written as a name', async ({ page }) => {
        await setupEditor(page);

        const parsed = await page.evaluate(() => Utils.parseCsv('species,length\nsetosa,5.1\nvirginica,6.3'));

        expect(parsed.names).toEqual(['species', 'length']);
        expect(parsed.values).toEqual([['setosa', 5.1], ['virginica', 6.3]]);
    });

    test('a value written in quotes keeps the commas inside it and the row stays under its own names', async ({ page }) => {
        await setupEditor(page);

        const parsed = await page.evaluate(() => Utils.parseCsv([
            'AtomicNumber,Symbol,OxidationStates,StandardState,MeltingPoint',
            '1,H,"+1, -1",Gas,13.81',
            '2,He,0,Gas,0.95',
            '6,C,"+4, +2, -4",Solid,3823'
        ].join('\n')));

        expect(parsed.names).toEqual(['AtomicNumber', 'Symbol', 'OxidationStates', 'StandardState', 'MeltingPoint']);
        expect(parsed.values).toEqual([
            [1, 'H', '+1, -1', 'Gas', 13.81],
            [2, 'He', 0, 'Gas', 0.95],
            [6, 'C', '+4, +2, -4', 'Solid', 3823]
        ]);
    });

    test('the unnamed columns a spreadsheet pads its rows with are left out', async ({ page }) => {
        await setupEditor(page);

        const parsed = await page.evaluate(() => Utils.parseCsv('p,q,,,\n10,1,,,\n20,2,,,'));

        expect(parsed.names).toEqual(['p', 'q']);
        expect(parsed.values).toEqual([[10, 1], [20, 2]]);
    });

    test('a quoted value may carry a quote of its own and a line break of its own', async ({ page }) => {
        await setupEditor(page);

        const parsed = await page.evaluate(() => Utils.parseCsv('note,length\n"a ""quoted"" word",5.1\n"two\nlines",6.3'));

        expect(parsed.names).toEqual(['note', 'length']);
        expect(parsed.values).toEqual([['a "quoted" word', 5.1], ['two\nlines', 6.3]]);
    });

    test('a row shorter than the header leaves the columns it never reached blank', async ({ page }) => {
        await setupEditor(page);

        const rows = await page.evaluate(() => Utils.parseCsv('p,q,r\n10,1\n20,2,3').values
            .map(row => row.map(value => Number.isNaN(value) ? 'blank' : value)));

        expect(rows).toEqual([[10, 1, 'blank'], [20, 2, 3]]);
    });
});
