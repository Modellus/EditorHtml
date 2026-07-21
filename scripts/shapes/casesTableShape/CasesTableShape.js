class CasesTableShape extends BaseTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Cases Table Name") ?? "Cases";
        this.properties.columns = this.buildDefaultColumns();
        this.properties.groupColors = {};
        this.properties.hiddenCases = [];
    }

    tick() {
        super.tick();
        const casesCount = this.getCasesCount();
        if (casesCount !== this._lastCasesCount) {
            this._lastCasesCount = casesCount;
            if (this._termsMenuContentElement)
                this.buildTermsMenuContent(this._termsMenuContentElement);
        }
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
        if (this.getCasesCount() > 1)
            listItems.push({ text: this.board.translations.get("Cases") ?? "Cases", stacked: true, buildControl: $p => $p.append(this.createCasesVisibilityControl()) });
        listItems.push({ text: this.board.translations.get("Rows") ?? "Rows", stacked: true, buildControl: $p => $p.append(this.createColumnsControl()) });
    }

    createCasesVisibilityControl() {
        const casesCount = this.getCasesCount();
        const items = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            items.push({
                key: caseNumber,
                iconClass: TermControl.getCaseNumberIconClass(caseNumber),
                iconColor: TermControl.getCaseIconColor(caseNumber)
            });
        const container = $('<div>');
        container.dxButtonGroup({
            items: items,
            keyExpr: "key",
            selectionMode: "multiple",
            selectedItemKeys: this.getVisibleCaseNumbers(),
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon shape-cases-visibility-group" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="${data.iconClass}" style="color:${data.iconColor}"></i>`;
            },
            onSelectionChanged: e => this.onCasesSelectionChanged(e)
        });
        return container;
    }

    onCasesSelectionChanged(e) {
        const casesCount = this.getCasesCount();
        const selectedKeys = new Set((e.component.option("selectedItemKeys") ?? []).map(Number));
        if (selectedKeys.size === 0) {
            e.component.option("selectedItemKeys", this.getVisibleCaseNumbers());
            return;
        }
        const hiddenCases = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            if (!selectedKeys.has(caseNumber))
                hiddenCases.push(caseNumber);
        this.setPropertyCommand("hiddenCases", hiddenCases);
        this.update();
    }

    setCaseVisible(caseNumber, visible) {
        const hiddenCases = new Set(Array.isArray(this.properties.hiddenCases) ? this.properties.hiddenCases : []);
        if (!visible && hiddenCases.size >= this.getCasesCount() - 1)
            return;
        if (visible)
            hiddenCases.delete(caseNumber);
        else
            hiddenCases.add(caseNumber);
        this.setPropertyCommand("hiddenCases", [...hiddenCases].sort((a, b) => a - b));
        this.update();
    }

    getVisibleCaseNumbers() {
        const casesCount = this.getCasesCount();
        const hiddenCases = new Set(Array.isArray(this.properties.hiddenCases) ? this.properties.hiddenCases : []);
        const visible = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            if (!hiddenCases.has(caseNumber))
                visible.push(caseNumber);
        return visible.length > 0 ? visible : [1];
    }

    getMomentColumnKey() {
        return this.getCaseColumnKey(this.getVisibleCaseNumbers()[0]);
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
        return `${this.getCasesCount()}|${JSON.stringify(this.getVisibleCaseNumbers())}|${super.getColumnsStateKey(columns)}`;
    }

    getCaseColumnKey(caseNumber) {
        return `case${caseNumber}`;
    }

    getSelectedTermNames(columns = this._activeColumns ?? this.getSelectedColumns()) {
        const calculator = this.board.calculator;
        const seenTerms = new Set();
        const terms = [];
        for (let index = 0; index < columns.length; index++) {
            const term = this.normalizeColumnValue(columns[index].term);
            if (term === "" || seenTerms.has(term) || !calculator.isUserInputTerm(term))
                continue;
            seenTerms.add(term);
            terms.push(term);
        }
        return terms;
    }

    formatTermSymbol(term) {
        return Utils.normalizeMathTermForWidth(this.formatTermForDisplay(term));
    }

    getPlayerTerm() {
        return this.board.shell?.properties?.playerTerm ?? "independent";
    }

    formatIndependentName() {
        const calculator = this.board.calculator;
        return this.getPlayerTerm() === "iteration" ? calculator.properties.iterationTerm : calculator.properties.independent.name;
    }

    getMomentValueForIteration(iteration) {
        if (this.getPlayerTerm() === "iteration")
            return iteration;
        const independent = this.board.calculator.properties.independent;
        return Utils.roundToPrecision(independent.start + (iteration - 1) * independent.step, this.board.calculator.getPrecision());
    }

    convertMomentValueToIteration(momentValue) {
        if (this.getPlayerTerm() === "iteration")
            return Math.max(1, Math.floor(momentValue));
        const independent = this.board.calculator.properties.independent;
        return Math.max(1, Math.round((momentValue - independent.start) / independent.step) + 1);
    }

    getDefaultGroupColor(sequenceIndex) {
        return Utils.getCaseIconColor(((Math.max(1, sequenceIndex) - 1) % 9) + 1);
    }

    getGroupColor(iteration, sequenceIndex) {
        const override = this.properties.groupColors?.[iteration];
        if (override)
            return override;
        return this.getDefaultGroupColor(sequenceIndex);
    }

    setGroupColor(iteration, color) {
        const groupColors = { ...(this.properties.groupColors ?? {}) };
        groupColors[iteration] = color;
        this.setPropertyCommand("groupColors", groupColors);
        this.refreshTableRows();
    }

    getGroupIterations() {
        const calculator = this.board.calculator;
        const terms = this.getSelectedTermNames();
        const overrideIterations = new Set();
        for (let index = 0; index < terms.length; index++) {
            const iterations = calculator.getUserInputIterations(terms[index]);
            for (let i = 0; i < iterations.length; i++)
                overrideIterations.add(iterations[i]);
        }
        return [1, ...[...overrideIterations].sort((a, b) => a - b)];
    }

    buildControlColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        const visibleCaseNumbers = this.getVisibleCaseNumbers();
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        const controlColumns = [
            {
                key: "term",
                title: "",
                isText: true,
                editable: false,
                useHeaderFontSize: true,
                valueDisplayMode: "none",
                width: Number.isFinite(columnWidths[0]) ? columnWidths[0] : null,
                precision: precision
            }
        ];
        for (let index = 0; index < visibleCaseNumbers.length; index++) {
            const caseNumber = visibleCaseNumbers[index];
            controlColumns.push({
                key: this.getCaseColumnKey(caseNumber),
                title: "",
                caseNumber: caseNumber,
                showCase: this.getCasesCount() > 1,
                editable: true,
                valueDisplayMode: "none",
                width: Number.isFinite(columnWidths[caseNumber]) ? columnWidths[caseNumber] : null,
                precision: precision
            });
        }
        return controlColumns;
    }

    getTableControlOptions(columns = this._activeColumns, controlColumns = this.buildControlColumns(columns)) {
        return {
            ...super.getTableControlOptions(columns, controlColumns),
            focusOnSingleClick: true,
            showHeader: this.getCasesCount() > 1
        };
    }

    isTableCellEditable(row, column) {
        if (row?.isIndependentRow)
            return column?.key === this.getMomentColumnKey();
        if (column?.key === "term")
            return false;
        return true;
    }

    buildTableRows(columns = this._activeColumns ?? this.getSelectedColumns()) {
        const calculator = this.board.calculator;
        const system = calculator.system;
        const visibleCaseNumbers = this.getVisibleCaseNumbers();
        const terms = this.getSelectedTermNames(columns);
        const groupIterations = this.getGroupIterations();
        const independentName = this.formatTermSymbol(this.formatIndependentName());
        const momentColumnKey = this.getMomentColumnKey();
        const rows = [];
        for (let groupIndex = 0; groupIndex < groupIterations.length; groupIndex++) {
            const iteration = groupIterations[groupIndex];
            const groupColor = this.getGroupColor(iteration, groupIndex + 1);
            rows.push({
                key: `independent|${iteration}`,
                isIndependentRow: true,
                iteration: iteration,
                term: independentName,
                [momentColumnKey]: this.getMomentValueForIteration(iteration),
                rowBackgroundColor: groupColor,
                hideColumnDividers: true
            });
            for (let index = 0; index < terms.length; index++) {
                const term = terms[index];
                const row = {
                    key: `${term}|${iteration}`,
                    termName: term,
                    term: this.formatTermSymbol(term),
                    iteration: iteration,
                    textIndent: 14
                };
                for (let i = 0; i < visibleCaseNumbers.length; i++) {
                    const caseNumber = visibleCaseNumbers[i];
                    const overrideValue = iteration > 1 ? calculator.getUserInput(term, iteration, caseNumber) : undefined;
                    row[this.getCaseColumnKey(caseNumber)] = overrideValue !== undefined ? overrideValue : system.getByNameOnIteration(iteration, term, caseNumber);
                }
                rows.push(row);
            }
        }
        return rows;
    }

    onTableCellValueChanged(payload) {
        const row = payload?.row;
        const column = payload?.column;
        if (!row || !column)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        if (row.isIndependentRow) {
            if (column.key !== this.getMomentColumnKey())
                return false;
            const fromIteration = Math.max(1, Math.floor(Number(row.iteration) || 1));
            if (fromIteration <= 1)
                return true;
            const toIteration = this.convertMomentValueToIteration(numericValue);
            return this.moveGroupIteration(fromIteration, toIteration);
        }
        const termName = row.termName;
        if (!termName)
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

    moveGroupIteration(fromIteration, toIteration) {
        if (fromIteration <= 1 || toIteration <= 1 || fromIteration === toIteration)
            return false;
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        const terms = this.getSelectedTermNames();
        for (let index = 0; index < terms.length; index++) {
            if (calculator.getUserInputIterations(terms[index]).includes(toIteration))
                return false;
        }
        let moved = false;
        for (let index = 0; index < terms.length; index++) {
            const term = terms[index];
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
                const value = calculator.getUserInput(term, fromIteration, caseNumber);
                if (value === undefined)
                    continue;
                calculator.removeUserInput(term, fromIteration, caseNumber);
                calculator.setUserInput(term, value, toIteration, caseNumber);
                moved = true;
            }
        }
        if (!moved)
            return false;
        const groupColors = { ...(this.properties.groupColors ?? {}) };
        if (groupColors[fromIteration] !== undefined) {
            groupColors[toIteration] = groupColors[fromIteration];
            delete groupColors[fromIteration];
            this.setPropertyCommand("groupColors", groupColors);
        }
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        return true;
    }

    onTableRowDeleteRequested(payload) {
        const row = payload?.row;
        if (!row)
            return false;
        if (row.isIndependentRow)
            return this.removeGroup(row.iteration);
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        const termName = row.termName;
        const iteration = Math.floor(Number(row.iteration) || 0);
        if (!termName || iteration < 1)
            return false;
        let changed = false;
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            changed = this.clearTermAtIteration(termName, iteration, caseNumber) || changed;
        if (!changed)
            return false;
        calculator.emit("iterate", { calculator: calculator });
        return true;
    }

    // The engine treats iteration 1 as the term's base value, not an overridable user input,
    // so removeUserInput always refuses it there; resetting it to 0 is the closest equivalent.
    clearTermAtIteration(term, iteration, caseNumber) {
        const calculator = this.board.calculator;
        if (iteration <= 1)
            return calculator.setUserInput(term, 0, iteration, caseNumber);
        return calculator.removeUserInput(term, iteration, caseNumber);
    }

    removeGroup(iteration) {
        iteration = Math.floor(Number(iteration) || 0);
        if (iteration < 1)
            return false;
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        const terms = this.getSelectedTermNames();
        let changed = false;
        for (let index = 0; index < terms.length; index++)
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
                changed = this.clearTermAtIteration(terms[index], iteration, caseNumber) || changed;
        if (!changed)
            return false;
        if (this.properties.groupColors?.[iteration] !== undefined) {
            const groupColors = { ...this.properties.groupColors };
            delete groupColors[iteration];
            this.setPropertyCommand("groupColors", groupColors);
        }
        calculator.emit("iterate", { calculator: calculator });
        return true;
    }

    addGroup() {
        const calculator = this.board.calculator;
        const terms = this.getSelectedTermNames();
        if (terms.length === 0)
            return false;
        const nextIteration = Math.max(...this.getGroupIterations()) + 1;
        const casesCount = this.getCasesCount();
        for (let index = 0; index < terms.length; index++) {
            const term = terms[index];
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
                let value = calculator.system.getByNameOnIteration(nextIteration, term, caseNumber);
                if (!Number.isFinite(value))
                    value = calculator.system.getByNameOnIteration(1, term, caseNumber);
                if (!Number.isFinite(value))
                    value = 0;
                calculator.setUserInput(term, value, nextIteration, caseNumber);
            }
        }
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        return true;
    }

    clearFocusAndRefresh() {
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.refreshTableRows();
        this.table?.render();
    }

    getCellsToolbarItems() {
        return [
            {
                location: "center",
                template: () => {
                    this._focusedColorSlotElement = $('<div class="mdl-focused-color-slot"></div>');
                    return this._focusedColorSlotElement;
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

    shouldShowCellsContextToolbar() {
        if (!super.shouldShowCellsContextToolbar())
            return false;
        const focusedRow = this._focusedCellsPayload?.focusedRows?.[0]?.row;
        if (!focusedRow?.isIndependentRow)
            return false;
        return this._focusedCellsPayload?.focusedColumn?.key === this.getMomentColumnKey();
    }

    refreshFocusedCellsToolbarControl() {
        this._focusedDeleteButtonElement?.dxButton("instance")?.option("visible", this.isFocusedRowDeletable());
        this.refreshFocusedColorSlot();
    }

    refreshFocusedColorSlot() {
        if (!this._focusedColorSlotElement)
            return;
        this._focusedColorSlotElement.empty();
        if (!this.shouldShowCellsContextToolbar())
            return;
        const focusedRow = this._focusedCellsPayload?.focusedRows?.[0]?.row;
        const iteration = Math.floor(Number(focusedRow.iteration) || 1);
        const sequenceIndex = this.getGroupIterations().indexOf(iteration) + 1;
        const currentColor = this.getGroupColor(iteration, sequenceIndex);
        const picker = this.getColorControl().createEditor(currentColor, value => this.setGroupColor(iteration, value));
        picker.appendTo(this._focusedColorSlotElement);
    }

    isFocusedRowDeletable() {
        return this.shouldShowCellsContextToolbar();
    }

    createFocusedInputDeleteButton(itemElement) {
        this._focusedDeleteButtonElement = $('<div>');
        this._focusedDeleteButtonElement.dxButton({
            stylingMode: "text",
            visible: this.isFocusedRowDeletable(),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
            },
            onClick: () => {
                this.table?.deleteFocusedRows();
                this.clearFocusAndRefresh();
            }
        });
        this._focusedDeleteButtonElement.appendTo(itemElement);
    }

    async copyAsCsv() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        const visibleCaseNumbers = this.getVisibleCaseNumbers();
        const precision = this.board.calculator.getPrecision();
        const header = [""];
        for (let i = 0; i < visibleCaseNumbers.length; i++)
            header.push(visibleCaseNumbers.length > 1 ? `case ${visibleCaseNumbers[i]}` : "");
        const rows = [header.join(",")];
        const inputRows = this.buildTableRows(columns);
        for (let index = 0; index < inputRows.length; index++) {
            const inputRow = inputRows[index];
            const values = [inputRow.term];
            for (let i = 0; i < visibleCaseNumbers.length; i++) {
                const value = inputRow[this.getCaseColumnKey(visibleCaseNumbers[i])];
                values.push(Number.isFinite(value) ? Utils.roundToPrecision(value, precision) : "");
            }
            rows.push(values.join(","));
        }
        await navigator.clipboard.writeText(rows.join("\n"));
    }
}
