class CasesTableShape extends BaseTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Cases Table Name") ?? "Scenarios";
        this.properties.columns = this.buildDefaultColumns();
        this.properties.groupColors = {};
        this.properties.visibleCases = null;
    }

    tick() {
        super.tick();
        const casesCount = this.getCasesCount();
        if (casesCount !== this._lastCasesCount) {
            this._lastCasesCount = casesCount;
            if (this._termsMenuContentElement)
                this.buildTermsMenuContent(this._termsMenuContentElement);
            this.refreshShapeSpecificToolbarControls();
        }
    }

    buildDefaultColumns() {
        return this.getAutomaticColumnTerms().map(term => ({ term: term, case: 1 }));
    }

    getAutomaticColumnTerms() {
        const calculator = this.board.calculator;
        const { derivatives, parameters } = calculator.getTermsByType();
        return [...derivatives, ...parameters].filter(term => calculator.isUserInputTerm(term));
    }

    isIntegratedTerm(term) {
        return this.board.calculator.system.getTerm(term)?.type === Modellus.TermType.DIFFERENTIAL;
    }

    createElement() {
        this.syncAutomaticColumns();
        return super.createElement();
    }

    refreshTermReferenceState() {
        if (this.syncAutomaticColumns())
            this.update();
        super.refreshTermReferenceState();
    }

    syncAutomaticColumns() {
        const automaticTerms = this.getAutomaticColumnTerms();
        const currentTerms = this.getSelectedColumns().map(column => column.term);
        if (automaticTerms.join("\n") === currentTerms.join("\n"))
            return false;
        this.properties.columns = automaticTerms.map(term => ({ term: term, case: 1 }));
        this.normalizeColumns();
        return true;
    }

    getFallbackColumns() {
        return [{ term: "", case: 1 }];
    }

    getTermsTooltipKey() {
        return "Cases Tooltip";
    }

    populateTermsMenuSections(listItems) {
        if (this.getCasesCount() > 1)
            listItems.push({ text: this.board.translations.get("Cases") ?? "Scenarios", buildControl: $p => $p.append(this.createCasesVisibilityControl()) });
    }

    renderTermsButtonTemplate(element) {
        const visibleCaseNumbers = this.getVisibleCaseNumbers();
        const extraCount = visibleCaseNumbers.length - 1;
        const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
        element.innerHTML = `<span class="mdl-name-btn-term"></span>${extraPart}`;
        element.firstChild.appendChild(Utils.createCaseIconHost(visibleCaseNumbers[0]));
    }

    refreshShapeSpecificToolbarControls() {
        if (this._casesItemElement)
            this._casesItemElement.css("display", this.getCasesCount() > 1 ? "flex" : "none");
        this.refreshTermsToolbarControl();
    }

    createCasesVisibilityControl() {
        const casesCount = this.getCasesCount();
        const items = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            items.push({ key: caseNumber });
        const container = $('<div>');
        container.dxButtonGroup({
            items: items,
            keyExpr: "key",
            selectionMode: "multiple",
            selectedItemKeys: this.getVisibleCaseNumbers(),
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon shape-cases-visibility-group" },
            buttonTemplate: (data, buttonContainer) => Utils.renderCaseIcon(buttonContainer[0], data.key),
            onSelectionChanged: e => this.onCasesSelectionChanged(e)
        });
        return container;
    }

    onCasesSelectionChanged(e) {
        const selectedCases = [...new Set((e.component.option("selectedItemKeys") ?? []).map(Number))].sort((a, b) => a - b);
        if (selectedCases.length === 0) {
            e.component.option("selectedItemKeys", this.getVisibleCaseNumbers());
            return;
        }
        this.setPropertyCommand("visibleCases", selectedCases);
        this.refreshTermsToolbarControl();
        this.update();
    }

    setCaseVisible(caseNumber, visible) {
        const visibleCases = new Set(this.getVisibleCaseNumbers());
        if (!visible && visibleCases.size <= 1)
            return;
        if (visible)
            visibleCases.add(caseNumber);
        else
            visibleCases.delete(caseNumber);
        this.setPropertyCommand("visibleCases", [...visibleCases].sort((a, b) => a - b));
        this.refreshTermsToolbarControl();
        this.update();
    }

    getAllCaseNumbers() {
        const casesCount = this.getCasesCount();
        const caseNumbers = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            caseNumbers.push(caseNumber);
        return caseNumbers;
    }

    getVisibleCaseNumbers() {
        if (!Array.isArray(this.properties.visibleCases))
            return this.getAllCaseNumbers();
        const casesCount = this.getCasesCount();
        const visible = this.properties.visibleCases.filter(caseNumber => caseNumber >= 1 && caseNumber <= casesCount).sort((a, b) => a - b);
        return visible.length > 0 ? visible : [1];
    }

    getMomentColumnKey() {
        return this.getCaseColumnKey(this.getVisibleCaseNumbers()[0]);
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
        return Utils.getDisplayedTerm(term, this.board.calculator.system);
    }

    getPlayerTerm() {
        return this.board.shell?.properties?.playerTerm ?? "independent";
    }

    formatIndependentName() {
        return this.getMomentTermName();
    }

    getMomentTermName() {
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

    getDefaultGroupColor() {
        return Utils.getSwitchOnColor();
    }

    getGroupColor(iteration) {
        const override = this.properties.groupColors?.[iteration];
        if (override)
            return override;
        return this.getDefaultGroupColor();
    }

    setGroupColor(iteration, color) {
        const groupColors = { ...(this.properties.groupColors ?? {}) };
        groupColors[iteration] = color;
        this.setPropertyCommand("groupColors", groupColors);
        this.refreshTableRows();
    }

    // Iteration 1 is the model's own initial values, which the engine never records as user input,
    // so the base group always lists every selected term while later moments list only what they hold.
    getTermNamesForIteration(iteration, columns = this._activeColumns ?? this.getSelectedColumns()) {
        const terms = this.getSelectedTermNames(columns);
        if (iteration <= 1)
            return terms;
        const calculator = this.board.calculator;
        return terms.filter(term => calculator.getUserInputIterations(term).includes(iteration));
    }

    getTermNamesMissingFromIteration(iteration) {
        const groupTerms = this.getTermNamesForIteration(iteration);
        return this.getSelectedTermNames().filter(term => !groupTerms.includes(term));
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
        const controlColumns = [
            {
                key: "term",
                title: "",
                isText: true,
                editable: false,
                useHeaderFontSize: true,
                valueDisplayMode: "none",
                width: this.getStoredColumnWidth(0),
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
                width: this.getStoredColumnWidth(caseNumber),
                precision: precision
            });
        }
        return controlColumns;
    }

    // Widths are stored per case rather than per visible position, so hiding a case and bringing
    // it back does not hand its width over to whichever case happens to sit in that slot next.
    getColumnWidthSlot(column) {
        if (!column)
            return -1;
        if (column.key === "term")
            return 0;
        const caseNumber = Math.floor(Number(column.caseNumber));
        return Number.isFinite(caseNumber) && caseNumber >= 1 ? caseNumber : -1;
    }

    getStoredColumnWidth(slot) {
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        return Number.isFinite(columnWidths[slot]) ? columnWidths[slot] : null;
    }

    onTableColumnWidthChanged(payload) {
        const slot = this.getColumnWidthSlot(payload?.column);
        const width = Number(payload?.width);
        if (slot < 0 || !Number.isFinite(width) || width <= 0)
            return;
        const columnWidths = Array.isArray(this.properties.columnWidths) ? [...this.properties.columnWidths] : [];
        columnWidths[slot] = width;
        this.setPropertyCommand("columnWidths", columnWidths);
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
        const groupIterations = this.getGroupIterations();
        const independentName = this.formatTermSymbol(this.formatIndependentName());
        const momentColumnKey = this.getMomentColumnKey();
        const momentPrecision = calculator.getTermPrecision(this.getMomentTermName());
        const rows = [];
        for (let groupIndex = 0; groupIndex < groupIterations.length; groupIndex++) {
            const iteration = groupIterations[groupIndex];
            rows.push({
                key: `independent|${iteration}`,
                isIndependentRow: true,
                iteration: iteration,
                term: independentName,
                [momentColumnKey]: this.getMomentValueForIteration(iteration),
                cellPrecision: { [momentColumnKey]: momentPrecision },
                rowBackgroundColor: this.getGroupColor(iteration),
                hideColumnDividers: true,
                spanColumnKey: momentColumnKey,
                spanLabel: independentName
            });
            const groupTerms = this.getTermNamesForIteration(iteration, columns);
            for (let index = 0; index < groupTerms.length; index++) {
                const term = groupTerms[index];
                const row = {
                    key: `${term}|${iteration}`,
                    termName: term,
                    term: this.formatTermSymbol(term),
                    iteration: iteration,
                    textIndent: 14,
                    separatorAbove: index > 0 && this.isIntegratedTerm(groupTerms[index - 1]) && !this.isIntegratedTerm(term)
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
        for (let index = 0; index < terms.length; index++)
            this.seedTermAtIteration(terms[index], nextIteration);
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        return true;
    }

    addTermToGroup(term, iteration) {
        iteration = Math.floor(Number(iteration) || 0);
        if (iteration <= 1 || !this.getSelectedTermNames().includes(term))
            return false;
        if (!this.seedTermAtIteration(term, iteration))
            return false;
        const calculator = this.board.calculator;
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        return true;
    }

    // Swapping carries the values across: the point is to move what was typed onto the term it
    // should have been on, which is what tells a swap apart from a delete followed by an add.
    swapGroupTerm(fromTerm, toTerm, iteration) {
        iteration = Math.floor(Number(iteration) || 0);
        if (iteration <= 1 || fromTerm === toTerm)
            return false;
        if (!this.getTermNamesMissingFromIteration(iteration).includes(toTerm))
            return false;
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        let swapped = false;
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
            const value = calculator.getUserInput(fromTerm, iteration, caseNumber);
            if (value === undefined)
                continue;
            calculator.removeUserInput(fromTerm, iteration, caseNumber);
            swapped = calculator.setUserInput(toTerm, value, iteration, caseNumber) || swapped;
        }
        if (!swapped)
            return false;
        calculator.emit("iterate", { calculator: calculator });
        this.refreshTableRows();
        return true;
    }

    seedTermAtIteration(term, iteration) {
        const calculator = this.board.calculator;
        const casesCount = this.getCasesCount();
        let seeded = false;
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
            let value = calculator.system.getByNameOnIteration(iteration, term, caseNumber);
            if (!Number.isFinite(value))
                value = calculator.system.getByNameOnIteration(1, term, caseNumber);
            if (!Number.isFinite(value))
                value = 0;
            seeded = calculator.setUserInput(term, value, iteration, caseNumber) || seeded;
        }
        return seeded;
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
                    this.createFocusedAddTermButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedSwapTermButton(container);
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

    shouldShowCellsContextToolbar() {
        if (!super.shouldShowCellsContextToolbar())
            return false;
        const focusedRow = this._focusedCellsPayload?.focusedRows?.[0]?.row;
        if (focusedRow?.isIndependentRow)
            return this._focusedCellsPayload?.focusedColumn?.key === this.getMomentColumnKey();
        return this.isMomentTermRow(focusedRow);
    }

    isMomentTermRow(row) {
        if (!row || row.isIndependentRow === true)
            return false;
        return Math.floor(Number(row.iteration) || 1) > 1;
    }

    isFocusedGroupRow() {
        return this._focusedCellsPayload?.focusedRows?.[0]?.row?.isIndependentRow === true && this.shouldShowCellsContextToolbar();
    }

    getFocusedGroupIteration() {
        const focusedRow = this._focusedCellsPayload?.focusedRows?.[0]?.row;
        return Math.max(1, Math.floor(Number(focusedRow?.iteration) || 1));
    }

    getFocusedTermName() {
        return this._focusedCellsPayload?.focusedRows?.[0]?.row?.termName;
    }

    isFocusedCellsToolbarOverlayOpen() {
        if (this.getDropDownButtonInstance(this._focusedAddTermButtonElement)?.option("opened") === true)
            return true;
        return this.getDropDownButtonInstance(this._focusedSwapTermButtonElement)?.option("opened") === true;
    }

    refreshFocusedCellsToolbarControl() {
        this._focusedDeleteButtonElement?.dxButton("instance")?.option("visible", this.isFocusedRowDeletable());
        this.getDropDownButtonInstance(this._focusedAddTermButtonElement)?.option("visible", this.isFocusedAddTermAvailable());
        this.getDropDownButtonInstance(this._focusedSwapTermButtonElement)?.option("visible", this.isFocusedSwapTermAvailable());
        if (this._focusedAddTermMenuContentElement)
            this.buildFocusedTermMenuContent(this._focusedAddTermMenuContentElement, term => this.applyFocusedAddTerm(term));
        if (this._focusedSwapTermMenuContentElement)
            this.buildFocusedTermMenuContent(this._focusedSwapTermMenuContentElement, term => this.applyFocusedSwapTerm(term));
        this.refreshFocusedColorSlot();
    }

    refreshFocusedColorSlot() {
        if (!this._focusedColorSlotElement)
            return;
        this._focusedColorSlotElement.empty();
        if (!this.isFocusedGroupRow())
            return;
        const iteration = this.getFocusedGroupIteration();
        const picker = this.getColorControl().createEditor(this.getGroupColor(iteration), value => this.setGroupColor(iteration, value));
        picker.appendTo(this._focusedColorSlotElement);
    }

    isFocusedRowDeletable() {
        return this.shouldShowCellsContextToolbar();
    }

    isFocusedAddTermAvailable() {
        if (!this.isFocusedGroupRow() || this.getFocusedGroupIteration() <= 1)
            return false;
        return this.getTermNamesMissingFromIteration(this.getFocusedGroupIteration()).length > 0;
    }

    isFocusedSwapTermAvailable() {
        if (!this.isMomentTermRow(this._focusedCellsPayload?.focusedRows?.[0]?.row))
            return false;
        return this.getTermNamesMissingFromIteration(this.getFocusedGroupIteration()).length > 0;
    }

    createFocusedAddTermButton(itemElement) {
        this._focusedAddTermButtonElement = this.createFocusedTermMenuButton(itemElement, "mdl-add-term-selector", "fa-light fa-plus", contentElement => {
            this._focusedAddTermMenuContentElement = contentElement;
            this.buildFocusedTermMenuContent(contentElement, term => this.applyFocusedAddTerm(term));
        });
    }

    createFocusedSwapTermButton(itemElement) {
        this._focusedSwapTermButtonElement = this.createFocusedTermMenuButton(itemElement, "mdl-swap-term-selector", "fa-light fa-right-left", contentElement => {
            this._focusedSwapTermMenuContentElement = contentElement;
            this.buildFocusedTermMenuContent(contentElement, term => this.applyFocusedSwapTerm(term));
        });
    }

    createFocusedTermMenuButton(itemElement, className, iconClass, buildContent) {
        const buttonElement = $(`<div class="${className}">`);
        buttonElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            visible: false,
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="${iconClass}"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => buildContent(contentElement)
            }
        });
        buttonElement.appendTo(itemElement);
        return buttonElement;
    }

    buildFocusedTermMenuContent(contentElement, onTermSelected) {
        const missingTerms = this.getTermNamesMissingFromIteration(this.getFocusedGroupIteration());
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: Utils.getTerms(missingTerms, this.board.calculator.system),
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-variable-selector">${Utils.buildReadOnlyMathFieldMarkup(itemData.text, "height:auto;width:auto;display:inline-block;pointer-events:none")}</div>`;
            },
            onItemClick: event => onTermSelected(event.itemData.term)
        });
    }

    applyFocusedAddTerm(term) {
        this.getDropDownButtonInstance(this._focusedAddTermButtonElement)?.close();
        this.addTermToGroup(term, this.getFocusedGroupIteration());
        this.clearFocusAndRefresh();
    }

    applyFocusedSwapTerm(term) {
        this.getDropDownButtonInstance(this._focusedSwapTermButtonElement)?.close();
        this.swapGroupTerm(this.getFocusedTermName(), term, this.getFocusedGroupIteration());
        this.clearFocusAndRefresh();
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
