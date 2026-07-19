class BaseTableShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    setDefaults() {
        super.setDefaults();
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.columnWidths = [];
        this.properties.headerBackgroundColor = "#f7f7f7";
    }

    // ---- Subclass hooks -------------------------------------------------

    buildControlColumns(columns = this._activeColumns) {
        return [];
    }

    buildTableRows(columns = this._activeColumns ?? this.getSelectedColumns()) {
        return [];
    }

    onTableCellValueChanged(payload) {
        return false;
    }

    onTableRowDeleteRequested(payload) {
        return false;
    }

    isOutlierTableCell(rowIndex, columnIndex) {
        return false;
    }

    isUserInputTableCell(rowIndex, columnIndex) {
        return false;
    }

    isTableCellEditable(row, column, rowIndex, columnIndex) {
        return true;
    }

    getCellsToolbarItems() {
        return [];
    }

    refreshFocusedCellsToolbarControl() {
    }

    refreshShapeSpecificToolbarControls() {
    }

    isFocusedCellsToolbarOverlayOpen() {
        return false;
    }

    getFocusedRowKey() {
        return null;
    }

    getTermsButtonPlaceholder() {
        return "Columns";
    }

    normalizeColumnListItem(sourceItem, normalizedItem) {
    }

    createEmptyColumnListItem() {
        return {};
    }

    getFallbackColumns() {
        return [{ term: "", case: 1, color: "transparent" }];
    }

    normalizeColumnValueDisplayMode(value) {
        if (value === "lines")
            return "lines";
        if (value === "none")
            return "none";
        return "bars";
    }

    async copyAsCsv() {
    }

    // ---- Columns collection ---------------------------------------------

    getColumnsCollectionOptions() {
        return {
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeColumnListItem(sourceItem, normalizedItem),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getFallbackColumns()
        };
    }

    normalizeColumns() {
        TermControl.normalizeShapeTermsCollection(this, "columns", this.getColumnsCollectionOptions());
    }

    getSelectedColumns() {
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        const selectedColumns = TermControl.getSelectedShapeTermsCollection(this, "columns", this.getColumnsCollectionOptions());
        return selectedColumns.map((column, index) => ({
            key: `column${index}`,
            term: column.term,
            case: column.case,
            color: this.normalizeColumnColor(column.color),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode),
            width: Number.isFinite(columnWidths[index]) ? columnWidths[index] : null
        }));
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return JSON.stringify(columns.map(column => ({ term: column.term, case: column.case, color: this.normalizeColumnColor(column.color), valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode), width: Number.isFinite(column.width) ? column.width : null })));
    }

    getControlColumnsStateKey(controlColumns = this.buildControlColumns(this._activeColumns ?? this.getSelectedColumns())) {
        return JSON.stringify(controlColumns.map(column => ({
            key: column.key,
            title: column.title,
            term: column.term,
            caseNumber: column.caseNumber,
            showCase: column.showCase === true,
            isText: column.isText === true,
            editable: column.editable === true,
            isPreloadedTerm: column.isPreloadedTerm === true,
            termType: Number.isFinite(column.termType) ? column.termType : null,
            expressionLatex: typeof column.expressionLatex === "string" ? column.expressionLatex : null,
            width: Number.isFinite(column.width) ? column.width : null,
            precision: Number.isFinite(column.precision) ? column.precision : null,
            barColor: this.normalizeColumnColor(column.barColor),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode)
        })));
    }

    refreshColumnsControl() {
        if (!this._columnsControl)
            return;
        this._columnsControl.refresh();
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

    normalizeColumnValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    normalizeColumnColor(value) {
        const normalizedColor = TermControl.normalizeColorValue(value);
        if (normalizedColor === "")
            return "transparent";
        return normalizedColor;
    }

    getDisplayedColumnTitle(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "";
        const displayedTerm = Utils.getDisplayedTerm(normalizedTermName, this.board.calculator.system);
        return Utils.formatMathTermName(displayedTerm);
    }

    _canEditTerm(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        return calculator.isTerm(term) && calculator.isEditable(term);
    }

    renderTermsButtonTemplate(element) {
        const columns = (this.properties.columns ?? []).filter(c => c.term);
        const firstTerm = columns.length > 0 ? this.formatTermForDisplay(columns[0].term) : "";
        const extraCount = columns.length - 1;
        if (firstTerm) {
            const termPart = this.createNameButtonTermMarkup(firstTerm);
            const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
            element.innerHTML = `${termPart}${extraPart}`;
        } else
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">${this.getTermsButtonPlaceholder()}</span></span>`;
    }

    // ---- Table control hosting ------------------------------------------

    createElement() {
        this.normalizeColumns();
        this._activeColumns = this.getSelectedColumns();
        this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
        this._appliedControlColumnsKey = this.getControlColumnsStateKey(this.buildControlColumns(this._activeColumns));
        this._appliedStyleKey = "";
        const element = this.board.createSvgElement("g");
        this.table = new TableControl(element, this.getTableControlOptions(this._activeColumns));
        this.initializeCellsContextToolbar();
        return element;
    }

    getTableControlOptions(columns = this._activeColumns, controlColumns = this.buildControlColumns(columns)) {
        return {
            columns: controlColumns,
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            headerBackgroundColor: this.getHeaderBackgroundColor(),
            borderColor: this.getBorderColor(),
            borderRadius: this.getBorderRadius(),
            precision: this.board.calculator.getPrecision(),
            onCellValueChanged: payload => this.onTableCellValueChanged(payload),
            onColumnWidthChanged: payload => this.onTableColumnWidthChanged(payload),
            onRowDeleteRequested: payload => this.onTableRowDeleteRequested(payload),
            onFocusedCellsChanged: payload => this.onTableFocusedCellsChanged(payload),
            shouldKeepFocusedCellsOnPointerDown: payload => this.shouldKeepFocusedCellsOnPointerDown(payload),
            isOutlierCell: (rowIndex, columnIndex) => this.isOutlierTableCell(rowIndex, columnIndex),
            isCellEditable: (row, column, rowIndex, columnIndex) => this.isTableCellEditable(row, column, rowIndex, columnIndex),
            isUserInputCell: (rowIndex, columnIndex) => this.isUserInputTableCell(rowIndex, columnIndex)
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

    getHeaderBackgroundColor() {
        if (this.properties.headerBackgroundColor)
            return this.properties.headerBackgroundColor;
        return this.deriveHeaderColor(this.properties.backgroundColor);
    }

    getTableStyleKey() {
        const precision = this.board.calculator.getPrecision();
        return `${this.properties.foregroundColor}|${this.properties.backgroundColor}|${this.getHeaderBackgroundColor()}|${this.getBorderColor()}|${precision}`;
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
        this.table.setFocusedRowKey(this.getFocusedRowKey());
    }

    update() {
        this.normalizeColumns();
        this.refreshTableColumns();
        this.refreshColumnsControl();
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
        this.table.setRows(this.buildTableRows(columns));
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

    getCopySubMenuItems() {
        return [
            ...super.getCopySubMenuItems(),
            { text: "Copy as CSV", icon: "fa-light fa-file-csv", shortcut: "", action: () => this.copyAsCsv() }
        ];
    }

    // ---- Focused-cells context toolbar ----------------------------------

    initializeCellsContextToolbar() {
        if (this.cellsContextToolbar || !window.DevExpress?.ui?.dxToolbar)
            return;
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        const items = this.getCellsToolbarItems();
        $(toolbarHost).dxToolbar({ items: items, width: "auto" });
        this.cellsContextToolbar = toolbarHost;
        this.cellsContextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    getDropDownButtonInstance(element) {
        const hostElement = element?.[0] ?? element;
        if (!(hostElement instanceof Element))
            return null;
        return window.DevExpress?.ui?.dxDropDownButton?.getInstance(hostElement) ?? null;
    }

    shouldKeepFocusedCellsOnPointerDown(payload) {
        const target = payload?.target;
        if (!(target instanceof Node))
            return false;
        if (this.cellsContextToolbar?.contains(target))
            return true;
        if (!(target instanceof Element))
            return false;
        if (!this.isFocusedCellsToolbarOverlayOpen())
            return false;
        return target.closest(".dx-overlay-wrapper") != null;
    }

    onTableFocusedCellsChanged(payload) {
        this._focusedCellsPayload = payload ?? null;
        this.refreshFocusedCellsToolbarControl();
        if (this.board.selection.selectedShape !== this)
            return;
        if (payload?.hasFocusedCells === true) {
            super.hideContextToolbar();
            this.showCellsContextToolbar();
            return;
        }
        this.hideCellsContextToolbar();
        super.showContextToolbar();
    }

    showCellsContextToolbar() {
        this.refreshFocusedCellsToolbarControl();
        if (this.cellsContextToolbar)
            this.cellsContextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionCellsContextToolbar()));
    }

    hideCellsContextToolbar() {
        if (this.cellsContextToolbar)
            this.cellsContextToolbar.classList.remove("visible");
    }

    positionCellsContextToolbar() {
        if (!this.cellsContextToolbar)
            return;
        const anchor = this.getScreenAnchorPoint();
        if (!anchor)
            return;
        const toolbarRect = this.cellsContextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.cellsContextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.cellsContextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = anchor.centerX - toolbarWidth / 2;
        let top = anchor.bottomY + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.cellsContextToolbar.style.left = `${left}px`;
        this.cellsContextToolbar.style.top = `${top}px`;
    }

    showContextToolbar() {
        if (this.table?.hasFocusedCells?.()) {
            this.showCellsContextToolbar();
            super.hideContextToolbar();
            return;
        }
        this.hideCellsContextToolbar();
        if (this._columnsControl)
            this._columnsControl.refresh();
        this.refreshTermsToolbarControl();
        this.refreshShapeSpecificToolbarControls();
        super.showContextToolbar();
    }

    hideContextToolbar() {
        this.hideCellsContextToolbar();
        super.hideContextToolbar();
    }
}
