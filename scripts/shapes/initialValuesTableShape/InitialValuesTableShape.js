class InitialValuesTableShape extends BaseTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Initial Values Table Name") ?? "Initial Values";
        this.properties.columns = this.buildDefaultColumns();
    }

    buildDefaultColumns() {
        const calculator = this.board.calculator;
        const { derivatives, parameters } = calculator.getTermsByType();
        const terms = [...derivatives, ...parameters].filter(term => calculator.isUserInputTerm(term));
        return terms.map(term => ({ term: term, case: 1 }));
    }

    getFallbackColumns() {
        return [{ term: "", case: 1 }];
    }

    getTermsButtonPlaceholder() {
        return this.board.translations.get("Rows") ?? "Rows";
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: this.board.translations.get("Rows") ?? "Rows", stacked: true, buildControl: $p => $p.append(this.createColumnsControl()) });
    }

    createColumnsControl() {
        this.normalizeColumns();
        this._columnsControl = TermControl.createShapeTermsCollectionControl(this, "columns", {
            hostClassName: "shape-terms-control table-columns-control",
            listClassName: "shape-terms-list table-columns-list",
            rowClassName: "shape-term-row table-column-row",
            dragHandleClassName: "shape-term-drag-handle table-column-drag-handle",
            includeColor: false,
            includeCase: false,
            lock: null,
            getTermItems: item => this.buildInputTermItems(item),
            normalizeTermValue: value => this.normalizeColumnValue(value),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getFallbackColumns(),
            onChanged: () => this.refreshTableColumns()
        });
        return this._columnsControl.createHost();
    }

    buildInputTermItems(item) {
        const items = TermControl.buildShapeTermsCollectionTermItems(this, item?.term, value => this.normalizeColumnValue(value));
        const currentTerm = this.normalizeColumnValue(item?.term);
        return items.filter(termItem => termItem.term === currentTerm || this.board.calculator.isUserInputTerm(termItem.term));
    }

    getColumnsCollectionOptions() {
        return {
            ...super.getColumnsCollectionOptions(),
            includeColor: false
        };
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return `${this.getCasesCount()}|${super.getColumnsStateKey(columns)}`;
    }

    getCaseColumnKey(caseNumber) {
        return `case${caseNumber}`;
    }

    buildControlColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        const casesCount = this.getCasesCount();
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        const controlColumns = [
            {
                key: "term",
                title: "",
                isText: true,
                editable: false,
                valueDisplayMode: "none",
                width: Number.isFinite(columnWidths[0]) ? columnWidths[0] : null,
                precision: precision
            }
        ];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            controlColumns.push({
                key: this.getCaseColumnKey(caseNumber),
                title: casesCount > 1 ? "" : (this.board.translations.get("Value") ?? "Value"),
                caseNumber: caseNumber,
                showCase: casesCount > 1,
                editable: true,
                valueDisplayMode: "none",
                width: Number.isFinite(columnWidths[caseNumber]) ? columnWidths[caseNumber] : null,
                precision: precision
            });
        return controlColumns;
    }

    buildTableRows(columns = this._activeColumns ?? this.getSelectedColumns()) {
        const calculator = this.board.calculator;
        const system = calculator.system;
        const casesCount = this.getCasesCount();
        const seenTerms = new Set();
        const rows = [];
        for (let index = 0; index < columns.length; index++) {
            const term = this.normalizeColumnValue(columns[index].term);
            if (term === "" || seenTerms.has(term) || !calculator.isUserInputTerm(term))
                continue;
            seenTerms.add(term);
            const iterations = [1, ...calculator.getUserInputIterations(term)];
            for (let iterationIndex = 0; iterationIndex < iterations.length; iterationIndex++) {
                const iteration = iterations[iterationIndex];
                const termText = Utils.normalizeMathTermForWidth(this.formatTermForDisplay(term));
                const row = {
                    key: `${term}|${iteration}`,
                    termName: term,
                    term: iteration > 1 ? `${termText} (${calculator.properties.iterationTerm}=${iteration})` : termText,
                    iteration: iteration
                };
                for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
                    const userValue = iteration > 1 ? calculator.getUserInput(term, iteration, caseNumber) : undefined;
                    row[this.getCaseColumnKey(caseNumber)] = userValue !== undefined ? userValue : system.getByNameOnIteration(iteration, term, caseNumber);
                }
                rows.push(row);
            }
        }
        return rows;
    }

    onTableCellValueChanged(payload) {
        const row = payload?.row;
        const column = payload?.column;
        const termName = row?.termName;
        if (!row || !column || !termName)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        const calculator = this.board.calculator;
        const iteration = Math.max(1, Math.floor(Number(row.iteration) || 1));
        const caseNumber = Number(column.caseNumber);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return false;
        const roundedValue = Utils.roundToPrecision(numericValue, calculator.getPrecision());
        if (!calculator.setUserInput(termName, roundedValue, iteration, caseNumber))
            return false;
        calculator.emit("iterate", { calculator: calculator });
        return true;
    }

    onTableRowDeleteRequested(payload) {
        const termName = payload?.row?.termName;
        const iteration = Math.floor(Number(payload?.row?.iteration) || 0);
        if (!termName || iteration <= 1)
            return false;
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        let removed = false;
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            removed = calculator.removeUserInput(termName, iteration, caseNumber) || removed;
        if (!removed)
            return false;
        calculator.emit("iterate", { calculator: calculator });
        return true;
    }

    addInputRowForFocusedCells() {
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        const termName = focusedRows?.[0]?.row?.termName;
        if (!termName)
            return false;
        const calculator = this.board.calculator;
        const existingIterations = calculator.getUserInputIterations(termName);
        const nextIteration = (existingIterations.length > 0 ? existingIterations[existingIterations.length - 1] : 1) + 1;
        const casesCount = this.getCasesCount();
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
            let value = calculator.system.getByNameOnIteration(nextIteration, termName, caseNumber);
            if (!Number.isFinite(value))
                value = calculator.system.getByNameOnIteration(1, termName, caseNumber);
            if (!Number.isFinite(value))
                value = 0;
            calculator.setUserInput(termName, value, nextIteration, caseNumber);
        }
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        this.table?.render();
        return true;
    }

    getCellsToolbarItems() {
        return [
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedAddInputRowButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedInputDeleteButton(container);
                    return container;
                }
            }
        ];
    }

    createFocusedAddInputRowButton(itemElement) {
        const button = $('<div>');
        button.dxButton({
            stylingMode: "text",
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-plus"></i></span>`;
            },
            onClick: () => this.addInputRowForFocusedCells()
        });
        button.appendTo(itemElement);
    }

    createFocusedInputDeleteButton(itemElement) {
        const button = $('<div>');
        button.dxButton({
            stylingMode: "text",
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
            },
            onClick: () => {
                this.table?.deleteFocusedRows();
                this.table?.clearFocusedCells();
                if (this.table)
                    this.table.selectedCell = null;
                this.refreshTableRows();
                this.table?.render();
            }
        });
        button.appendTo(itemElement);
    }

    async copyAsCsv() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        const casesCount = this.getCasesCount();
        const precision = this.board.calculator.getPrecision();
        const header = [this.board.translations.get("Term") ?? "Term"];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            header.push(casesCount > 1 ? `case ${caseNumber}` : (this.board.translations.get("Value") ?? "Value"));
        const rows = [header.join(",")];
        const inputRows = this.buildTableRows(columns);
        for (let index = 0; index < inputRows.length; index++) {
            const inputRow = inputRows[index];
            const values = [inputRow.term];
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
                const value = inputRow[this.getCaseColumnKey(caseNumber)];
                values.push(Number.isFinite(value) ? Utils.roundToPrecision(value, precision) : "");
            }
            rows.push(values.join(","));
        }
        await navigator.clipboard.writeText(rows.join("\n"));
    }
}
