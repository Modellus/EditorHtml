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
