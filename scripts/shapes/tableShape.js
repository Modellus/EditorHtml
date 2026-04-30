class TableShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createToolbar() {
        const items = super.createToolbar();
        this.normalizeColumns();
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
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
                    this.createTermsDropDownButton(container);
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
                    this.createDataDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    createDataDropDownButton(itemElement) {
        this._dataDropdownElement = $('<div class="mdl-data-selector">');
        this._dataDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Table Data Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderDataButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildDataMenuContent(contentElement)
            }
        });
        this._dataDropdownElement.appendTo(itemElement);
    }

    renderDataButtonTemplate(element) {
        const iconClass = this.getDataButtonIconClass();
        element.innerHTML = `<span class="mdl-name-btn-term"><i class="${iconClass} fa-flask"></i></span>`;
    }

    getDataButtonIconClass() {
        return this.board.calculator.hasPreloadedData() ? "fa-solid" : "fa-light";
    }

    buildDataMenuContent(contentElement) {
        const dataItems = [
            {
                text: this.board.translations.get("Upload CSV"),
                icon: "fa-light fa-file-csv",
                action: () => this.importExternalDataFromFile()
            },
            {
                text: this.board.translations.get("Set CSV URL"),
                icon: "fa-light fa-link",
                action: () => this.importExternalDataFromUrl()
            }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: dataItems,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                this._dataDropdownElement.dxDropDownButton("instance").close();
                event.itemData.action();
            }
        });
    }

    async importExternalDataFromFile() {
        const result = await this.board.shell.importDataFromFile();
        this.applyExternalDataColumns(result?.names);
        this.refreshDataToolbarControl();
    }

    async importExternalDataFromUrl() {
        const result = await this.board.shell.importDataFromUrl();
        this.applyExternalDataColumns(result?.names);
        this.refreshDataToolbarControl();
    }

    applyExternalDataColumns(termNames) {
        if (!Array.isArray(termNames) || termNames.length === 0)
            return;
        const columns = [];
        for (let index = 0; index < termNames.length; index++)
            columns.push({ term: termNames[index], case: 1, color: "transparent" });
        this.setExternalDataColumns(columns);
    }

    setExternalDataColumns(columns) {
        const command = new SetShapePropertiesCommand(this.board, this, {
            columns: columns,
            columnWidths: [],
            regressionSourceByTerm: {},
            regressionTypeByTerm: {}
        });
        this.board.invoker.execute(command);
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Columns", stacked: true, buildControl: $p => $p.append(this.createColumnsControl()) });
    }

    renderTermsButtonTemplate(element) {
        const columns = (this.properties.columns ?? []).filter(c => c.term);
        const firstTerm = columns.length > 0 ? this.formatTermForDisplay(columns[0].term) : "";
        const extraCount = columns.length - 1;
        if (firstTerm) {
            const termPart = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${firstTerm}</span></span>`;
            const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
            element.innerHTML = `${termPart}${extraPart}`;
        } else
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Columns</span></span>`;
    }

    getCopySubMenuItems() {
        return [
            ...super.getCopySubMenuItems(),
            { text: "Copy as CSV", icon: "fa-light fa-file-csv", shortcut: "", action: () => this.copyAsCsv() }
        ];
    }

    async copyAsCsv() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return;
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const precision = this.board.calculator.getPrecision();
        const header = columns.map(column => column.term).join(",");
        const rows = [header];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const values = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                return Number.isFinite(value) ? Utils.roundToPrecision(value, precision) : "";
            });
            rows.push(values.join(","));
        }
        await navigator.clipboard.writeText(rows.join("\n"));
    }

    showContextToolbar() {
        if (this._columnsControl)
            this._columnsControl.refresh();
        this.refreshTermsToolbarControl();
        this.refreshDataToolbarControl();
        super.showContextToolbar();
    }

    refreshDataToolbarControl() {
        if (!this._dataDropdownElement)
            return;
        const buttonContentElement = this._dataDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderDataButtonTemplate(buttonContentElement);
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
    }

    createColumnsControl() {
        this.normalizeColumns();
        this._columnsControl = TermControl.createShapeTermsCollectionControl(this, "columns", {
            hostClassName: "shape-terms-control table-columns-control",
            listClassName: "shape-terms-list table-columns-list",
            rowClassName: "shape-term-row table-column-row",
            dragHandleClassName: "shape-term-drag-handle table-column-drag-handle",
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            getFallbackItems: () => this.getLegacyColumns(),
            termEditor: {
                acceptCustomValue: (item, index) => this.shouldAllowCustomColumnName(item, index),
                onCustomItemCreating: event => this.onColumnTermCustomItemCreating(event)
            },
            lock: {
                width: "42px",
                editorType: "dxDropDownButton",
                show: item => this.board.calculator.hasPreloadedData() && this.normalizeColumnValue(item?.term) !== "",
                getValue: item => this.getRegressionTypeFromTermName(item?.term),
                getItems: () => this.getRegressionMethodItems(),
                valueExpr: "value",
                dropDownOptions: this.getRegressionMethodDropDownOptions(),
                onValueChanged: (index, value) => this.onColumnRegressionTypeChanged(index, value)
            },
            onChanged: () => this.refreshTableColumns()
        });
        return this._columnsControl.createHost();
    }

    getRegressionMethodItems() {
        return [
            { value: "none", text: this.board.translations.get("No Regression"), icon: "fa-light fa-chart-scatter" },
            { value: "Linear", text: this.board.translations.get("Linear Regression"), icon: "fa-light fa-chart-line" },
            { value: "Quadratic", text: this.board.translations.get("Quadratic Regression"), icon: "fa-light fa-chart-sine" }
        ];
    }

    getRegressionMethodDropDownOptions() {
        return { width: this.getRegressionMethodDropDownWidth() };
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

    getRegressionTypeFromTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        const savedType = this.properties.regressionTypeByTerm?.[normalizedTermName];
        if (savedType === "Linear")
            return "Linear";
        if (savedType === "Quadratic")
            return "Quadratic";
        if (normalizedTermName.endsWith("_Linear"))
            return "Linear";
        if (normalizedTermName.endsWith("_Quadratic"))
            return "Quadratic";
        return "none";
    }

    getRegressionSourceTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        const savedSourceTermName = this.properties.regressionSourceByTerm?.[normalizedTermName];
        if (savedSourceTermName)
            return savedSourceTermName;
        if (normalizedTermName.endsWith("_Linear"))
            return normalizedTermName.slice(0, -7);
        if (normalizedTermName.endsWith("_Quadratic"))
            return normalizedTermName.slice(0, -10);
        return normalizedTermName;
    }

    buildRegressionTermName(sourceTermName, currentTermName = "") {
        const normalizedSourceTermName = this.normalizeColumnValue(sourceTermName);
        const normalizedCurrentTermName = this.normalizeColumnValue(currentTermName);
        if (normalizedCurrentTermName !== "" && normalizedCurrentTermName !== normalizedSourceTermName)
            return normalizedCurrentTermName;
        let ordinal = 1;
        while (ordinal < 1000) {
            const candidateName = `${normalizedSourceTermName}${ordinal}`;
            if (!this.board.calculator.isTerm(candidateName) || candidateName === normalizedCurrentTermName)
                return candidateName;
            ordinal++;
        }
        return `${normalizedSourceTermName}${Date.now()}`;
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

    shouldAllowCustomColumnName(item, index) {
        if (!item)
            return false;
        const termName = this.normalizeColumnValue(item.term);
        return termName !== "";
    }

    updateRegressionMappings(previousTermName, nextTermName, sourceTermName, regressionType) {
        const regressionSourceByTerm = { ...(this.properties.regressionSourceByTerm ?? {}) };
        const regressionTypeByTerm = { ...(this.properties.regressionTypeByTerm ?? {}) };
        const normalizedPreviousTermName = this.normalizeColumnValue(previousTermName);
        const normalizedNextTermName = this.normalizeColumnValue(nextTermName);
        if (normalizedPreviousTermName !== "" && normalizedPreviousTermName !== normalizedNextTermName) {
            delete regressionSourceByTerm[normalizedPreviousTermName];
            delete regressionTypeByTerm[normalizedPreviousTermName];
        }
        if (regressionType && sourceTermName) {
            regressionSourceByTerm[normalizedNextTermName] = sourceTermName;
            regressionTypeByTerm[normalizedNextTermName] = regressionType;
        } else {
            delete regressionSourceByTerm[normalizedNextTermName];
            delete regressionTypeByTerm[normalizedNextTermName];
        }
        return {
            regressionSourceByTerm: regressionSourceByTerm,
            regressionTypeByTerm: regressionTypeByTerm
        };
    }

    applyRegressionColumnUpdate(columns, previousTermName, nextTermName, sourceTermName, regressionType) {
        const mappings = this.updateRegressionMappings(previousTermName, nextTermName, sourceTermName, regressionType);
        const command = new SetShapePropertiesCommand(this.board, this, {
            columns: columns,
            regressionSourceByTerm: mappings.regressionSourceByTerm,
            regressionTypeByTerm: mappings.regressionTypeByTerm
        });
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
        const regressionType = this.normalizeRegressionType(this.getRegressionTypeFromTermName(previousTermName));
        const isRegressionTerm = regressionType != null || this.isRegressionTermName(previousTermName);
        if (!isRegressionTerm) {
            columns[index].term = nextTermName;
            this.applyRegressionColumnUpdate(columns, previousTermName, nextTermName, null, null);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        const sourceTermName = this.getRegressionSourceTermName(previousTermName);
        if (!regressionType || !this.board.calculator.isTerm(sourceTermName))
            return;
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        try {
            this.board.calculator.calculateDataRegression(sourceTermName, regressionType, nextTermName, caseNumber);
        } catch (error) {
            console.warn("Failed to rename regression term", error);
            return;
        }
        columns[index].term = nextTermName;
        this.applyRegressionColumnUpdate(columns, previousTermName, nextTermName, sourceTermName, regressionType);
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
        const isCurrentRegression = this.isRegressionTermName(currentTermName);
        const sourceTermName = isCurrentRegression ? this.getRegressionSourceTermName(currentTermName) : currentTermName;
        if (!this.board.calculator.isTerm(sourceTermName))
            return;
        const selectedRegressionType = this.normalizeRegressionType(regressionType);
        if (!selectedRegressionType) {
            columns[index].term = sourceTermName;
            this.applyRegressionColumnUpdate(columns, currentTermName, sourceTermName, null, null);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        const targetTermName = this.buildRegressionTermName(sourceTermName, currentTermName);
        try {
            this.board.calculator.calculateDataRegression(sourceTermName, selectedRegressionType, targetTermName, caseNumber);
        } catch (error) {
            console.warn("Failed to calculate regression", error);
            return;
        }
        columns[index].term = targetTermName;
        this.applyRegressionColumnUpdate(columns, currentTermName, targetTermName, sourceTermName, selectedRegressionType);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Table Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.columnWidths = [];
        this.properties.regressionSourceByTerm = {};
        this.properties.regressionTypeByTerm = {};
        const defaultTerm = this.board.calculator.getDefaultTerm();
        this.properties.columns = [
            { term: this.board.calculator.properties.independent.name, case: 1, color: "transparent" },
            { term: defaultTerm, case: 1, color: "transparent" }
        ];
    }

    createElement() {
        this.normalizeColumns();
        this._activeColumns = this.getSelectedColumns();
        this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
        this._appliedControlColumnsKey = this.getControlColumnsStateKey(this.buildControlColumns(this._activeColumns));
        this._appliedStyleKey = "";
        const element = this.board.createSvgElement("g");
        this.table = new TableControl(element, this.getTableControlOptions(this._activeColumns));
        return element;
    }

    getTableControlOptions(columns = this._activeColumns, controlColumns = this.buildControlColumns(columns)) {
        return {
            columns: controlColumns,
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            headerBackgroundColor: this.deriveHeaderColor(this.properties.backgroundColor),
            borderColor: this.getBorderColor(),
            precision: this.board.calculator.getPrecision(),
            onCellValueChanged: payload => this.onTableCellValueChanged(payload),
            onColumnWidthChanged: payload => this.onTableColumnWidthChanged(payload),
            onRowDeleteRequested: payload => this.onTableRowDeleteRequested(payload)
        };
    }

    deriveHeaderColor(backgroundColor) {
        if (!backgroundColor || backgroundColor === "transparent" || backgroundColor === "#00000000")
            return "#f7f7f7";
        const r = parseInt(backgroundColor.slice(1, 3), 16);
        const g = parseInt(backgroundColor.slice(3, 5), 16);
        const b = parseInt(backgroundColor.slice(5, 7), 16);
        const factor = 0.93;
        const dr = Math.round(r * factor);
        const dg = Math.round(g * factor);
        const db = Math.round(b * factor);
        return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
    }

    getTableStyleKey() {
        const precision = this.board.calculator.getPrecision();
        return `${this.properties.foregroundColor}|${this.properties.backgroundColor}|${this.getBorderColor()}|${precision}`;
    }

    getControlColumnsStateKey(controlColumns = this.buildControlColumns(this._activeColumns ?? this.getSelectedColumns())) {
        return JSON.stringify(controlColumns.map(column => ({
            term: column.term,
            caseNumber: column.caseNumber,
            editable: column.editable === true,
            isPreloadedTerm: column.isPreloadedTerm === true,
            width: Number.isFinite(column.width) ? column.width : null,
            precision: Number.isFinite(column.precision) ? column.precision : null,
            barColor: this.normalizeColumnColor(column.barColor)
        })));
    }

    buildControlColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        const hasPreloadedData = this.board.calculator.hasPreloadedData();
        const system = this.board.calculator.system;
        const controlColumns = columns.map(column => {
            const isPreloadedTerm = this.isPreloadedTableColumnTerm(column.term, hasPreloadedData, system);
            return {
                key: column.key,
                title: column.term,
                term: column.term,
                caseNumber: column.case,
                showCase: TermControl.shouldShowCaseSelectionForShapeTerm(this, column.term, value => this.normalizeColumnValue(value)),
                editable: this.canEditTableColumn(column.term, isPreloadedTerm),
                width: Number.isFinite(column.width) ? column.width : null,
                precision: precision,
                barColor: this.normalizeColumnColor(column.color),
                isPreloadedTerm: isPreloadedTerm,
                sourceColumn: column
            };
        });
        return controlColumns;
    }

    isPreloadedTableColumnTerm(term, hasPreloadedData = this.board.calculator.hasPreloadedData(), system = this.board.calculator.system) {
        if (hasPreloadedData && this.board.calculator.getPreloadedColumnIndex(term) >= 0)
            return true;
        return system.getTerm(term)?.type === Modellus.TermType.PRELOADED;
    }

    canEditTableColumn(term, isPreloadedTerm = this.isPreloadedTableColumnTerm(term)) {
        if (this.board.calculator.hasPreloadedData())
            return isPreloadedTerm;
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
        if (this.board.calculator.hasPreloadedData()) {
            const rowIndex = Number.isInteger(payload?.rowKey) ? payload.rowKey : payload?.rowIndex;
            if (!Number.isInteger(rowIndex))
                return false;
            return this.board.calculator.setPreloadedValue(rowIndex, sourceColumn.term, roundedValue);
        }
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

    onTableRowDeleteRequested(payload) {
        if (!this.board.calculator.hasPreloadedData())
            return false;
        const rowIndex = Number.isInteger(payload?.rowKey) ? payload.rowKey : payload?.rowIndex;
        if (!Number.isInteger(rowIndex))
            return false;
        return this.board.calculator.deletePreloadedRow(rowIndex);
    }

    onTableColumnWidthChanged(payload) {
        const columnIndex = payload?.columnIndex;
        const width = Number(payload?.width);
        if (!Number.isInteger(columnIndex) || columnIndex < 0)
            return;
        if (!Number.isFinite(width) || width <= 0)
            return;
        const columnWidths = Array.isArray(this.properties.columnWidths) ? [...this.properties.columnWidths] : [];
        columnWidths[columnIndex] = width;
        this.setPropertyCommand("columnWidths", columnWidths);
    }

    updateFocus() {
        if (!this.table)
            return;
        if (!this._activeColumns || this._activeColumns.length === 0) {
            this.table.setFocusedRowKey(null);
            return;
        }
        if (this.board.calculator.hasPreloadedData()) {
            this.table.setFocusedRowKey(null);
            return;
        }
        var system = this.board.calculator.system;
        this.table.setFocusedRowKey(system.iteration);
    }

    update() {
        this.normalizeColumns();
        this.refreshTableColumns();
        this.refreshColumnsControl();
    }

    clearStaleTermCollectionReferences(staleTermNames) {
        if (!Array.isArray(this.properties.columns))
            return;
        let hadStale = false;
        for (let i = 0; i < this.properties.columns.length; i++) {
            if (staleTermNames.has(this.properties.columns[i].term)) {
                this.properties.columns[i] = { ...this.properties.columns[i], term: "" };
                hadStale = true;
            }
        }
        if (hadStale)
            this.update();
    }

    draw() {
        super.draw();
        const x = this.properties.x;
        const y = this.properties.y;
        const width = this.properties.width;
        const height = this.properties.height;
        if (this.table)
            this.table.setSize(width, height);
        this.element.setAttribute("transform", `translate(${x} ${y}) rotate(${this.properties.rotation} ${width / 2} ${height / 2})`);
    }

    tick() {
        this.refreshTableRows();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }

    refreshTableColumns() {
        if (!this.table)
            return;
        const columns = this.getSelectedColumns();
        const controlColumns = this.buildControlColumns(columns);
        const nextKey = this.getColumnsStateKey(columns);
        const nextControlColumnsKey = this.getControlColumnsStateKey(controlColumns);
        const nextStyleKey = this.getTableStyleKey();
        if (this._appliedColumnsKey === nextKey && this._appliedControlColumnsKey === nextControlColumnsKey && this._appliedStyleKey === nextStyleKey)
            return;
        this._activeColumns = columns;
        this.table.setOptions(this.getTableControlOptions(columns, controlColumns));
        this._appliedColumnsKey = nextKey;
        this._appliedControlColumnsKey = nextControlColumnsKey;
        this._appliedStyleKey = nextStyleKey;
        this.refreshTableRows();
    }

    refreshTableRows() {
        if (!this.table)
            return;
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0) {
            this.table.setRows([]);
            return;
        }
        if (this.board.calculator.hasPreloadedData()) {
            this.table.setRows(this.buildPreloadedRows(columns));
            return;
        }
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const row = { key: iteration };
            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                row[column.key] = system.getByNameOnIteration(iteration, column.term, column.case);
            }
            rows.push(row);
        }
        this.table.setRows(rows);
    }

    buildPreloadedRows(columns) {
        const preloadedData = this.board.calculator.getPreloadedData();
        if (!preloadedData)
            return [];
        const names = Array.isArray(preloadedData.names) ? preloadedData.names : [];
        const values = Array.isArray(preloadedData.values) ? preloadedData.values : [];
        const iterationTermName = this.board.calculator.properties.iterationTerm;
        const independentTermName = this.board.calculator.properties.independent.name;
        const iterationColumnIndex = names.indexOf(iterationTermName);
        const independentColumnIndex = names.indexOf(independentTermName);
        const rows = [];
        for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
            const sourceRow = values[rowIndex];
            const row = { key: rowIndex };
            const iteration = iterationColumnIndex >= 0 ? Number(sourceRow?.[iterationColumnIndex]) : rowIndex + 1;
            const independentValue = independentColumnIndex >= 0 ? Number(sourceRow?.[independentColumnIndex]) : NaN;
            for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                const column = columns[columnIndex];
                row[column.key] = this.getPreloadedRowValue(column, names, sourceRow, iteration, independentValue, rowIndex + 1);
            }
            rows.push(row);
        }
        return rows;
    }

    getPreloadedRowValue(column, preloadedNames, sourceRow, iteration, independentValue, fallbackIteration) {
        const preloadedColumnIndex = preloadedNames.indexOf(column.term);
        if (preloadedColumnIndex >= 0)
            return sourceRow?.[preloadedColumnIndex];
        const system = this.board.calculator.system;
        if (Number.isFinite(iteration))
            return system.getByNameOnIteration(Math.round(iteration), column.term, column.case);
        if (Number.isFinite(independentValue))
            return system.getValueAtIndependent(independentValue, column.term, column.case);
        return system.getByNameOnIteration(fallbackIteration, column.term, column.case);
    }

    getSelectedColumns() {
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        const selectedColumns = TermControl.getSelectedShapeTermsCollection(this, "columns", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            getFallbackItems: () => this.getLegacyColumns()
        });
        return selectedColumns.map((column, index) => ({
            key: `column${index}`,
            term: column.term,
            case: column.case,
            color: this.normalizeColumnColor(column.color),
            width: Number.isFinite(columnWidths[index]) ? columnWidths[index] : null
        }));
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return JSON.stringify(columns.map(column => ({ term: column.term, case: column.case, color: this.normalizeColumnColor(column.color), width: Number.isFinite(column.width) ? column.width : null })));
    }

    refreshColumnsControl() {
        if (!this._columnsControl)
            return;
        this._columnsControl.refresh();
    }

    normalizeColumns() {
        TermControl.normalizeShapeTermsCollection(this, "columns", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            getFallbackItems: () => this.getLegacyColumns()
        });
    }

    getLegacyColumns() {
        const columns = [];
        const column1Term = this.normalizeColumnValue(this.properties.column1Term);
        const column2Term = this.normalizeColumnValue(this.properties.column2Term);
        if (column1Term !== "")
            columns.push({ term: column1Term, case: this.getClampedCaseNumber(this.properties.column1TermCase ?? 1), color: "transparent" });
        if (column2Term !== "")
            columns.push({ term: column2Term, case: this.getClampedCaseNumber(this.properties.column2TermCase ?? 1), color: "transparent" });
        if (columns.length === 0)
            columns.push({ term: "", case: 1, color: "transparent" });
        return columns;
    }

    normalizeColumnValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    normalizeColumnColor(value) {
        const normalizedColor = TermControl.normalizeColorValue(value);
        if (normalizedColor === "")
            return "transparent";
        return normalizedColor;
    }

    _canEditTerm(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        return calculator.isTerm(term) && calculator.isEditable(term);
    }

    enterEditMode(event) {
        if (!this.table)
            return super.enterEditMode();
        this.table.focus();
        const cell = this.table.getClickedCell(event);
        if (cell && this.table.canEditCell(cell.rowIndex, cell.columnIndex)) {
            this.table.startEditing(cell.rowIndex, cell.columnIndex, null);
            this.table.render();
        }
        return true;
    }

    toHtmlTable() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return "";
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const precision = this.board.calculator.getPrecision();
        const headerCells = columns.map(column => `<th>${column.term}</th>`).join("");
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const cells = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                if (value == null || !Number.isFinite(value))
                    return "<td></td>";
                return `<td>${Utils.roundToPrecision(value, precision)}</td>`;
            }).join("");
            rows.push(`<tr>${cells}</tr>`);
        }
        return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
    }

    async copyToClipboard() {
        const shapeData = this.getClipboardData();
        const json = JSON.stringify(shapeData);
        const htmlTable = this.toHtmlTable();
        const imageBlob = this.toImageBlob();
        const items = [new ClipboardItem({
            "text/plain": new Blob([json], { type: "text/plain" }),
            "text/html": new Blob([htmlTable], { type: "text/html" }),
            "image/png": imageBlob
        })];
        await navigator.clipboard.write(items);
    }
}
