// Common base for value tables that render term columns over iterations with per-column
// value-display modes (bars/lines), regression analysis, outlier tagging and CSV/TSV/HTML
// export. Shared by TableShape (iterations) and DataTableShape (external data). It is
// mode-agnostic: it never inspects `externalData` — subclasses layer that behavior on top.
class BaseValueTableShape extends BaseTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.iterationSkip = 0;
        const defaultTerm = this.board.calculator.getDefaultTerm();
        this.properties.columns = [
            { term: this.board.calculator.properties.independent.name, case: 1, color: "transparent", valueDisplayMode: "bars" },
            { term: defaultTerm, case: 1, color: "transparent", valueDisplayMode: "bars" }
        ];
    }

    // ---- Column value-display mode (bars / lines / none) -----------------

    getColumnValueDisplayModeItems() {
        return [
            { value: "bars", text: this.board.translations.get("Bars") ?? "Bars", icon: "fa-light fa-chart-simple" },
            { value: "lines", text: this.board.translations.get("Lines") ?? "Lines", icon: "fa-light fa-chart-line" },
            { value: "none", text: this.board.translations.get("None") ?? "None", icon: "fa-light fa-ban" }
        ];
    }

    getColumnValueDisplayModeIcon(value) {
        const normalizedValue = this.normalizeColumnValueDisplayMode(value);
        const items = this.getColumnValueDisplayModeItems();
        const selectedItem = items.find(item => item.value === normalizedValue);
        return selectedItem?.icon ?? "fa-light fa-chart-simple";
    }

    normalizeColumnListItem(sourceItem, normalizedItem) {
        normalizedItem.valueDisplayMode = this.normalizeColumnValueDisplayMode(sourceItem?.valueDisplayMode);
    }

    createEmptyColumnListItem() {
        return { valueDisplayMode: "bars" };
    }

    setColumnValueDisplayModeByIndex(index, value) {
        if (!Array.isArray(this.properties.columns))
            return;
        const normalizedValue = this.normalizeColumnValueDisplayMode(value);
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        columns[index].valueDisplayMode = normalizedValue;
        this.setPropertyCommand("columns", columns);
    }

    // ---- Menu sections ---------------------------------------------------

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Columns", stacked: true, buildControl: $p => $p.append(this.createColumnsControl()) });
    }

    // "Row Step" skips iterations when building rows. Iteration-based tables add this to their
    // color menu; the data table (rows come from an imported dataset) does not.
    createRowStepMenuItem() {
        return {
            text: this.board.translations.get("Row Step") ?? "Row Step",
            buildControl: $container => {
                $('<div>').appendTo($container).dxNumberBox({
                    value: this.properties.iterationSkip ?? 0,
                    min: 0,
                    step: 1,
                    format: "#",
                    showSpinButtons: true,
                    width: 80,
                    onValueChanged: e => {
                        const value = Math.max(0, Math.floor(Number(e.value) || 0));
                        this.setPropertyCommand("iterationSkip", value);
                    }
                });
            }
        };
    }

    createColumnsControl() {
        this.normalizeColumns();
        this._columnsControl = TermControl.createShapeTermsCollectionControl(this, "columns", {
            hostClassName: "shape-terms-control table-columns-control",
            listClassName: "shape-terms-list table-columns-list",
            rowClassName: "shape-term-row table-column-row",
            dragHandleClassName: "shape-term-drag-handle table-column-drag-handle",
            includeColor: true,
            includeCase: this.columnsControlIncludesCase(),
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeColumnListItem(sourceItem, normalizedItem),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getLegacyColumns(),
            getTermItems: item => this.getColumnTermItems(item),
            termEditor: {
                acceptCustomValue: (item, index) => this.shouldAllowCustomColumnName(item, index),
                onCustomItemCreating: event => this.onColumnTermCustomItemCreating(event)
            },
            lock: {
                width: "42px",
                editorType: "dxDropDownButton",
                getValue: item => this.normalizeColumnValueDisplayMode(item?.valueDisplayMode),
                getItems: () => this.getColumnValueDisplayModeItems(),
                valueExpr: "value",
                displayExpr: "text",
                buttonTemplate: (element, item, index, selectedValue) => {
                    const iconClassName = this.getColumnValueDisplayModeIcon(selectedValue);
                    $(element).empty().append(`<div class="shape-term-secondary-button"><i class="${iconClassName} shape-term-secondary-icon"></i></div>`);
                },
                itemTemplate: (itemData, itemIndex, element) => {
                    $(element).empty().append(`<div class="shape-term-secondary-item" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;width:100%"><i class="${itemData.icon} shape-term-secondary-icon"></i><span>${itemData.text}</span></div>`);
                },
                dropDownOptions: {
                    width: 180
                },
                onValueChanged: (index, value) => this.setColumnValueDisplayModeByIndex(index, value)
            },
            onChanged: () => this.refreshTableColumns()
        });
        return this._columnsControl.createHost();
    }

    // Terms offered by a column's term dropdown. Subclasses can narrow this (e.g. the data
    // table only offers terms that came from the loaded dataset).
    getColumnTermItems(item) {
        return TermControl.buildShapeTermsCollectionTermItems(this, item?.term, value => this.normalizeColumnValue(value));
    }

    // Whether the columns editor offers a per-column case selector. Tables that carry a single,
    // externally-chosen case (see DataTableShape) turn this off.
    columnsControlIncludesCase() {
        return true;
    }

    // ---- Regression ------------------------------------------------------

    getRegressionMethodItems() {
        return [
            { value: "none", text: this.board.translations.get("No Regression"), icon: "fa-light fa-chart-scatter" },
            { value: "Linear", text: this.board.translations.get("Linear Regression"), icon: "fa-light fa-chart-line" },
            { value: "Quadratic", text: this.board.translations.get("Quadratic Regression"), icon: "fa-light fa-chart-sine" }
        ];
    }

    getRegressionMethodDropDownWidth() {
        const items = this.getRegressionMethodItems();
        let maximumLabelLength = 0;
        for (let index = 0; index < items.length; index++) {
            const itemText = String(items[index]?.text ?? "");
            if (itemText.length > maximumLabelLength)
                maximumLabelLength = itemText.length;
        }
        return Math.max(120, maximumLabelLength * 8 + 64);
    }

    getRegressionTypeFromTermName(termName, caseNumber = 1) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "none";
        const normalizedCaseNumber = this.getClampedCaseNumber(caseNumber ?? 1);
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        if (!term || term.type !== Modellus.TermType.REGRESSION || !Array.isArray(term.ranges))
            return "none";
        const matchingRanges = term.ranges.filter(range => range?.caseNumber === normalizedCaseNumber);
        const regressionRange = matchingRanges.length > 0 ? matchingRanges[matchingRanges.length - 1] : term.ranges[term.ranges.length - 1];
        if (!regressionRange)
            return "none";
        if (regressionRange.regressionType === "Linear")
            return "Linear";
        if (regressionRange.regressionType === "Quadratic")
            return "Quadratic";
        return "none";
    }

    getRegressionSourceTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "";
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        if (!term || term.type !== Modellus.TermType.REGRESSION)
            return normalizedTermName;
        return term.sourceTermName;
    }

    normalizeRegressionType(regressionType) {
        if (regressionType === "Linear")
            return "Linear";
        if (regressionType === "Quadratic")
            return "Quadratic";
        return null;
    }

    isRegressionTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return false;
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        return term?.type === Modellus.TermType.REGRESSION;
    }

    resolveFocusedRowsIterationRange(focusedRows) {
        if (!Array.isArray(focusedRows) || focusedRows.length === 0)
            return null;
        let startIteration = Infinity;
        let endIteration = -Infinity;
        let hasIteration = false;
        for (let index = 0; index < focusedRows.length; index++) {
            const focusedRow = focusedRows[index];
            const rowIndex = Number(focusedRow?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            const iteration = Math.floor(rowIndex) + 1;
            if (iteration < 1)
                continue;
            if (iteration < startIteration)
                startIteration = iteration;
            if (iteration > endIteration)
                endIteration = iteration;
            hasIteration = true;
        }
        if (!hasIteration)
            return null;
        return { startIteration: startIteration, endIteration: endIteration };
    }

    shouldAllowCustomColumnName(item, index) {
        if (!item)
            return false;
        const termName = this.normalizeColumnValue(item.term);
        return termName !== "";
    }

    applyRegressionColumnUpdate(columns) {
        const command = new SetShapePropertiesCommand(this.board, this, { columns: columns });
        this.board.invoker.execute(command);
    }

    onColumnTermCustomItemCreating(event) {
        if (!Array.isArray(this.properties.columns))
            return;
        const index = event?.index;
        if (!Number.isInteger(index) || index < 0)
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        const previousTermName = this.normalizeColumnValue(columns[index].term);
        if (previousTermName === "")
            return;
        const nextTermName = this.normalizeColumnValue(event?.text);
        if (nextTermName === "" || nextTermName === previousTermName)
            return;
        if (this.board.calculator.isTerm(nextTermName))
            return;
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        const regressionType = this.normalizeRegressionType(this.getRegressionTypeFromTermName(previousTermName, caseNumber));
        const isRegressionTerm = regressionType != null || this.isRegressionTermName(previousTermName);
        if (!isRegressionTerm) {
            columns[index].term = nextTermName;
            this.applyRegressionColumnUpdate(columns);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        if (!regressionType)
            return;
        const sourceTermName = this.getRegressionSourceTermName(previousTermName);
        try {
            this.board.calculator.calculateDataRegression(sourceTermName, regressionType, nextTermName, caseNumber);
        } catch (error) {
            console.warn("Failed to rename regression term", error);
            return;
        }
        columns[index].term = nextTermName;
        this.applyRegressionColumnUpdate(columns);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    onColumnRegressionTypeChanged(index, regressionType) {
        if (!Array.isArray(this.properties.columns))
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        const currentTermName = this.normalizeColumnValue(columns[index].term);
        if (currentTermName === "")
            return;
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        const selectedRegressionType = this.normalizeRegressionType(regressionType);
        if (!selectedRegressionType) {
            if (this.isRegressionTermName(currentTermName)) {
                const sourceTermName = this.getRegressionSourceTermName(currentTermName);
                try {
                    this.board.calculator.removeDataRegression(currentTermName, caseNumber);
                } catch (_) {
                    return;
                }
                columns[index].term = sourceTermName;
            }
            this.applyRegressionColumnUpdate(columns);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        let regressionResult = null;
        const sourceTermName = this.getRegressionSourceTermName(currentTermName);
        try {
            regressionResult = this.board.calculator.applyDataRegression(sourceTermName, selectedRegressionType, caseNumber);
        } catch (error) {
            console.warn("Failed to calculate regression", error);
            return;
        }
        if (!regressionResult)
            return;
        columns[index].term = regressionResult.targetTermName;
        this.applyRegressionColumnUpdate(columns);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    // ---- Focused-cells context toolbar -----------------------------------

    isFocusedCellsToolbarOverlayOpen() {
        const focusedRegressionMethodControl = this.getDropDownButtonInstance(this._focusedRegressionMethodElement);
        const focusedOutlierControl = this.getDropDownButtonInstance(this._focusedOutlierButtonElement);
        const focusedDeleteControl = this.getDropDownButtonInstance(this._focusedDeleteButtonElement);
        return focusedRegressionMethodControl?.option("opened") === true
            || focusedOutlierControl?.option("opened") === true
            || focusedDeleteControl?.option("opened") === true;
    }

    getCellsToolbarItems() {
        return [
            {
                location: "center",
                template: () => {
                    const container = $('<div class="mdl-focused-regression-method"></div>');
                    this.createFocusedRegressionMethodControl(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div class="mdl-focused-regression-term"></div>');
                    this.createFocusedRegressionTermControl(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedOutlierButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedDeleteButton(container);
                    return container;
                }
            }
        ];
    }

    isOutlierTableCell(rowIndex, columnIndex) {
        const column = this.table?.getColumnByIndex(columnIndex);
        if (!column?.isPreloadedTerm)
            return false;
        const termName = this.normalizeColumnValue(column.term);
        if (termName === "")
            return false;
        return this.board.calculator.isOutlierIteration(termName, rowIndex + 1);
    }

    createFocusedOutlierButton(itemElement) {
        this._focusedOutlierButtonElement = $('<div class="mdl-outlier-selector">');
        this._focusedOutlierButtonElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-table-slash"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 160,
                contentTemplate: contentElement => this.buildFocusedOutlierMenuContent(contentElement)
            }
        });
        this._focusedOutlierButtonElement.appendTo(itemElement);
    }

    buildFocusedOutlierMenuContent(contentElement) {
        const items = [
            { value: "set", text: "Set as Outlier", icon: "fa-light fa-table-slash" },
            { value: "restore", text: "Restore", icon: "fa-light fa-arrow-rotate-left" }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                const outlierControl = this.getDropDownButtonInstance(this._focusedOutlierButtonElement);
                outlierControl?.close();
                if (event.itemData.value === "set")
                    this.setFocusedCellsAsOutliers();
                else if (event.itemData.value === "restore")
                    this.restoreFocusedCellsFromOutliers();
            }
        });
    }

    setFocusedCellsAsOutliers() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn || !Array.isArray(focusedRows) || focusedRows.length === 0)
            return;
        if (!focusedColumn.isPreloadedTerm)
            return;
        const termName = this.normalizeColumnValue(focusedColumn.term);
        if (termName === "")
            return;
        for (let index = 0; index < focusedRows.length; index++) {
            const rowIndex = Number(focusedRows[index]?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            this.board.calculator.addOutlierIteration(termName, rowIndex + 1);
        }
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.table?.render();
        this.board.resetShapeValues();
    }

    restoreFocusedCellsFromOutliers() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn || !Array.isArray(focusedRows) || focusedRows.length === 0)
            return;
        if (!focusedColumn.isPreloadedTerm)
            return;
        const termName = this.normalizeColumnValue(focusedColumn.term);
        if (termName === "")
            return;
        for (let index = 0; index < focusedRows.length; index++) {
            const rowIndex = Number(focusedRows[index]?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            this.board.calculator.removeOutlierIteration(termName, rowIndex + 1);
        }
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.table?.render();
        this.board.resetShapeValues();
    }

    createFocusedDeleteButton(itemElement) {
        this._focusedDeleteButtonElement = $('<div class="mdl-remove-selector">');
        this._focusedDeleteButtonElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 140,
                contentTemplate: contentElement => this.buildFocusedDeleteMenuContent(contentElement)
            }
        });
        this._focusedDeleteButtonElement.appendTo(itemElement);
    }

    buildFocusedDeleteMenuContent(contentElement) {
        const items = [
            { value: "delete", text: "Delete", icon: "fa-light fa-trash-can" },
            { value: "reset", text: "Reset", icon: "fa-light fa-arrow-rotate-left" }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                const deleteControl = this.getDropDownButtonInstance(this._focusedDeleteButtonElement);
                deleteControl?.close();
                if (event.itemData.value === "delete")
                    this.table?.deleteFocusedRows();
                else if (event.itemData.value === "reset")
                    this.resetFocusedCells();
            }
        });
    }

    // Restoring focused cells to a pristine value is only meaningful for tables backed by an
    // original dataset (see DataTableShape); the iterations table has nothing to restore to.
    resetFocusedCells() {
        return false;
    }

    createFocusedRegressionMethodControl(itemElement) {
        this._focusedRegressionMethodElement = $('<div class="mdl-focused-regression-method-control">');
        this._focusedRegressionMethodElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => this.renderFocusedRegressionMethodButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: this.getRegressionMethodDropDownWidth(),
                contentTemplate: contentElement => this.buildFocusedRegressionMethodMenuContent(contentElement)
            }
        });
        this._focusedRegressionMethodElement.appendTo(itemElement);
    }

    createFocusedRegressionTermControl(itemElement) {
        this._focusedRegressionTermElement = $('<div class="mdl-focused-regression-term-control">');
        this._focusedRegressionTermElement.appendTo(itemElement);
    }

    getSelectedFocusedRegressionMethodItem() {
        const selectedMethodValue = this._focusedRegressionMethodValue ?? "Linear";
        const methods = this.getRegressionMethodItems();
        return methods.find(item => item.value === selectedMethodValue) ?? methods[0] ?? null;
    }

    renderFocusedRegressionMethodButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-focused-toolbar-button mdl-focused-toolbar-button--method"><i class="fa-light fa-chart-scatter"></i></span>`;
    }

    buildFocusedRegressionMethodMenuContent(contentElement) {
        const methods = this.getRegressionMethodItems();
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: methods,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                this._focusedRegressionMethodValue = event.itemData.value;
                const focusedRegressionMethodControl = this.getDropDownButtonInstance(this._focusedRegressionMethodElement);
                focusedRegressionMethodControl?.close();
                if (event.itemData.value !== "none")
                    this.applyFocusedCellsRegression();
            }
        });
    }

    buildColumnsWithInsertedRegressionTerm(columns, sourceColumnIndex, regressionResult, regressionColor) {
        const nextColumns = columns.map(column => ({ ...column }));
        if (sourceColumnIndex < 0 || sourceColumnIndex >= nextColumns.length)
            return nextColumns;
        const sourceColumn = nextColumns[sourceColumnIndex];
        const normalizedTargetTermName = this.normalizeColumnValue(regressionResult?.targetTermName);
        if (normalizedTargetTermName === "")
            return nextColumns;
        const existingTargetColumnIndex = nextColumns.findIndex((column, index) => index !== sourceColumnIndex && this.normalizeColumnValue(column?.term) === normalizedTargetTermName);
        let regressionColumn = {
            term: normalizedTargetTermName,
            case: sourceColumn.case,
            color: this.normalizeColumnColor(regressionColor),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(sourceColumn.valueDisplayMode)
        };
        if (existingTargetColumnIndex >= 0) {
            regressionColumn = {
                ...nextColumns[existingTargetColumnIndex],
                term: normalizedTargetTermName,
                case: sourceColumn.case,
                color: this.normalizeColumnColor(regressionColor),
                valueDisplayMode: this.normalizeColumnValueDisplayMode(nextColumns[existingTargetColumnIndex].valueDisplayMode)
            };
            nextColumns.splice(existingTargetColumnIndex, 1);
        }
        const insertIndex = Math.min(sourceColumnIndex + 1, nextColumns.length);
        nextColumns.splice(insertIndex, 0, regressionColumn);
        return nextColumns;
    }

    refreshFocusedRegressionTermLabel(termName) {
        if (!this._focusedRegressionTermElement)
            return;
        const sourceTermName = this.getRegressionSourceTermName(termName);
        const hattedSourceTermName = sourceTermName !== "" ? `\\widehat{${sourceTermName}}` : "";
        this._focusedRegressionTermElement[0].innerHTML = hattedSourceTermName !== "" ? `<span class="mdl-focused-term-name">${Utils.buildReadOnlyMathFieldMarkup(hattedSourceTermName, "height:auto;width:auto;display:inline-block")}</span>` : "";
    }

    refreshFocusedCellsToolbarControl() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const currentTermName = this.normalizeColumnValue(focusedColumn?.term);
        const caseNumber = this.getClampedCaseNumber(focusedColumn?.caseNumber ?? focusedColumn?.sourceColumn?.case ?? 1);
        const draftFocusKey = `${currentTermName}|${caseNumber}`;
        if (this._focusedRegressionDraftFocusKey !== draftFocusKey) {
            const regressionType = this.getRegressionTypeFromTermName(currentTermName, caseNumber);
            this._focusedRegressionMethodValue = regressionType === "none" ? "Linear" : regressionType;
            this._focusedRegressionDraftColor = this.normalizeColumnColor(focusedColumn?.sourceColumn?.color);
            this._focusedRegressionDraftFocusKey = draftFocusKey;
            this.refreshFocusedRegressionTermLabel(regressionType !== "none" ? currentTermName : "");
        }
    }

    applyFocusedCellsRegression() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn)
            return;
        const currentTermName = this.normalizeColumnValue(focusedColumn.term);
        if (currentTermName === "")
            return;
        const regressionMethod = this._focusedRegressionMethodValue;
        const normalizedRegressionType = this.normalizeRegressionType(regressionMethod);
        if (!normalizedRegressionType)
            return;
        const columnIndex = this.properties.columns.findIndex(column => this.normalizeColumnValue(column?.term) === currentTermName);
        if (columnIndex < 0)
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        const caseNumber = this.getClampedCaseNumber(columns[columnIndex].case ?? 1);
        const sourceTermName = this.getRegressionSourceTermName(currentTermName);
        const focusedRowsIterationRange = this.resolveFocusedRowsIterationRange(focusedRows);
        let regressionResult = null;
        try {
            if (focusedRowsIterationRange)
                regressionResult = this.board.calculator.applyDataRegression(sourceTermName, normalizedRegressionType, caseNumber, focusedRowsIterationRange.startIteration, focusedRowsIterationRange.endIteration);
            else
                regressionResult = this.board.calculator.applyDataRegression(sourceTermName, normalizedRegressionType, caseNumber);
        } catch (_) {
            return;
        }
        if (!regressionResult)
            return;
        const nextColumns = this.buildColumnsWithInsertedRegressionTerm(columns, columnIndex, regressionResult, this._focusedRegressionDraftColor);
        this.applyRegressionColumnUpdate(nextColumns);
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    // ---- Column / row building -------------------------------------------

    buildControlColumns(columns = this._activeColumns) {
        const system = this.board.calculator.system;
        const controlColumns = columns.map(column => {
            const isPreloadedTerm = this.isPreloadedTableColumnTerm(column.term, system);
            const term = system.getTerm(column.term);
            return {
                key: column.key,
                title: this.getDisplayedColumnTitle(column.term),
                term: column.term,
                caseNumber: column.case,
                showCase: TermControl.shouldShowCaseSelectionForShapeTerm(this, column.term, value => this.normalizeColumnValue(value)),
                editable: this.canEditTableColumn(column.term, isPreloadedTerm),
                width: Number.isFinite(column.width) ? column.width : null,
                precision: this.board.calculator.getTermPrecision(column.term),
                barColor: this.normalizeColumnColor(column.color),
                valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode),
                isPreloadedTerm: isPreloadedTerm,
                termType: term?.type,
                expressionLatex: term?.expressionLatex,
                sourceColumn: column
            };
        });
        return controlColumns;
    }

    isPreloadedTableColumnTerm(term, system = this.board.calculator.system) {
        return system.getTerm(term)?.type === Modellus.TermType.PRELOADED;
    }

    canEditTableColumn(term, isPreloadedTerm = this.isPreloadedTableColumnTerm(term)) {
        return this._canEditTerm(term);
    }

    onTableCellValueChanged(payload) {
        const sourceColumn = payload?.column?.sourceColumn;
        if (!sourceColumn)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        const precision = this.board.calculator.getPrecision();
        const roundedValue = Utils.roundToPrecision(numericValue, precision);
        if (!this._canEditTerm(sourceColumn.term))
            return false;
        const iteration = payload?.rowKey ?? payload?.row?.key;
        if (iteration == null)
            return false;
        const system = this.board.calculator.system;
        const row = system.getIteration(iteration, sourceColumn.case);
        if (!row)
            return false;
        row[sourceColumn.term] = roundedValue;
        if (iteration === 1 && this.board.calculator.isTerm(sourceColumn.term))
            system.setInitialByName(sourceColumn.term, roundedValue, 1, sourceColumn.case);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
        return true;
    }

    getFocusedRowKey() {
        if (!this._activeColumns || this._activeColumns.length === 0)
            return null;
        return this.board.calculator.system.iteration;
    }

    isUserInputTableCell(rowIndex, columnIndex) {
        const column = this.table?.getColumnByIndex(columnIndex);
        if (!column?.sourceColumn)
            return false;
        const termName = this.normalizeColumnValue(column.term);
        if (termName === "")
            return false;
        const iteration = Number(this.table?.rows?.[rowIndex]?.key);
        if (!Number.isFinite(iteration) || iteration <= 1)
            return false;
        const caseNumber = this.getClampedCaseNumber(column.caseNumber ?? 1);
        return this.board.calculator.getUserInput(termName, iteration, caseNumber) !== undefined;
    }

    buildRegressionRangeOverlays(columns) {
        if (!this.table)
            return [];
        const colorPalette = this.table.options.focusedRangeColors;
        if (!Array.isArray(colorPalette) || colorPalette.length === 0)
            return [];
        const system = this.board.calculator.system;
        const independentStart = Number(this.board.calculator.properties.independent.start);
        const independentStep = Number(this.board.calculator.properties.independent.step);
        if (!Number.isFinite(independentStart) || !Number.isFinite(independentStep) || independentStep === 0)
            return [];
        const overlays = [];
        let colorIndex = 0;
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const column = columns[columnIndex];
            const termName = this.normalizeColumnValue(column.term);
            if (!this.isRegressionTermName(termName))
                continue;
            const term = system.getTerm(termName);
            if (!term || !Array.isArray(term.ranges))
                continue;
            const caseNumber = this.getClampedCaseNumber(column.case ?? 1);
            const sourceTermName = term.sourceTermName;
            const sourceColumnIndex = columns.findIndex((col, index) =>
                index !== columnIndex &&
                this.normalizeColumnValue(col.term) === sourceTermName &&
                this.getClampedCaseNumber(col.case ?? 1) === caseNumber
            );
            const caseRanges = term.ranges.filter(range => range.caseNumber === caseNumber);
            for (let rangeIndex = 0; rangeIndex < caseRanges.length; rangeIndex++) {
                const regressionRange = caseRanges[rangeIndex];
                const rangeIndependentStart = Number(regressionRange.independentStart);
                const rangeIndependentEnd = Number(regressionRange.independentEnd);
                if (!Number.isFinite(rangeIndependentStart) || !Number.isFinite(rangeIndependentEnd))
                    continue;
                const startRowIndex = Math.max(0, Math.round((rangeIndependentStart - independentStart) / independentStep));
                const endRowIndex = Math.max(0, Math.round((rangeIndependentEnd - independentStart) / independentStep));
                if (startRowIndex > endRowIndex)
                    continue;
                const color = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
                overlays.push({
                    range: { startRowIndex, endRowIndex, startColumnIndex: columnIndex, endColumnIndex: columnIndex },
                    color
                });
                if (sourceColumnIndex >= 0)
                    overlays.push({
                        range: { startRowIndex, endRowIndex, startColumnIndex: sourceColumnIndex, endColumnIndex: sourceColumnIndex },
                        color
                    });
            }
        }
        return overlays;
    }

    refreshTableRows() {
        if (!this.table)
            return;
        const columns = this._activeColumns ?? this.getSelectedColumns();
        this.table.regressionRangeOverlays = this.buildRegressionRangeOverlays(columns);
        if (columns.length === 0) {
            this.table.setRows([]);
            return;
        }
        this.table.setRows(this.buildTableRows(columns));
    }

    buildTableRows(columns = this._activeColumns ?? this.getSelectedColumns()) {
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const row = { key: iteration };
            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                row[column.key] = system.getByNameOnIteration(iteration, column.term, column.case);
            }
            rows.push(row);
        }
        return rows;
    }

    getFallbackColumns() {
        return this.getLegacyColumns();
    }

    getLegacyColumns() {
        const columns = [];
        const column1Term = this.normalizeColumnValue(this.properties.column1Term);
        const column2Term = this.normalizeColumnValue(this.properties.column2Term);
        if (column1Term !== "")
            columns.push({ term: column1Term, case: this.getClampedCaseNumber(this.properties.column1TermCase ?? 1), color: "transparent", valueDisplayMode: "bars" });
        if (column2Term !== "")
            columns.push({ term: column2Term, case: this.getClampedCaseNumber(this.properties.column2TermCase ?? 1), color: "transparent", valueDisplayMode: "bars" });
        if (columns.length === 0)
            columns.push({ term: "", case: 1, color: "transparent", valueDisplayMode: "bars" });
        return columns;
    }

    // ---- Clipboard export ------------------------------------------------

    toHtmlTable() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return "";
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const headerCells = columns.map(column => `<th>${column.term}</th>`).join("");
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const cells = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                if (value == null || !Number.isFinite(value))
                    return "<td></td>";
                return `<td>${Utils.roundToPrecision(value, this.board.calculator.getTermPrecision(column.term))}</td>`;
            }).join("");
            rows.push(`<tr>${cells}</tr>`);
        }
        return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
    }

    toTsvTable() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return "";
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const rows = [columns.map(column => column.term).join("\t")];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const values = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                return Number.isFinite(value) ? Utils.roundToPrecision(value, this.board.calculator.getTermPrecision(column.term)) : "";
            });
            rows.push(values.join("\t"));
        }
        return rows.join("\n");
    }

    async copyAsCsv() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return;
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const header = columns.map(column => column.term).join(",");
        const rows = [header];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const values = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                return Number.isFinite(value) ? Utils.roundToPrecision(value, this.board.calculator.getTermPrecision(column.term)) : "";
            });
            rows.push(values.join(","));
        }
        await navigator.clipboard.writeText(rows.join("\n"));
    }

    async copyToClipboard() {
        const shapeData = this.getClipboardData();
        const json = JSON.stringify(shapeData);
        const htmlTable = this.toHtmlTable();
        const tsvTable = this.toTsvTable();
        const imageBlob = this.toImageBlob();
        const items = [new ClipboardItem({
            "text/plain": new Blob([tsvTable], { type: "text/plain" }),
            "text/html": new Blob([htmlTable], { type: "text/html" }),
            "image/png": imageBlob
        })];
        await navigator.clipboard.write(items);
    }
}
