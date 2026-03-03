class TableShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() {
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        this.normalizeColumns();
        items.push({
            colSpan: 2,
            itemType: "group",
            colCount: 1,
            items: [
                {
                    colSpan: 2,
                    label: { text: "Columns" },
                    template: _ => this.createColumnsControl()
                }
            ]
        });
        instance.option("items", items);
        return form;
    }

    createColumnsControl() {
        this.normalizeColumns();
        this._columnsControl = ShapeTermsSelectorControl.createShapeTermsCollectionControl(this, "columns", {
            hostClassName: "shape-terms-control table-columns-control",
            listClassName: "shape-terms-list table-columns-list",
            rowClassName: "shape-term-row table-column-row",
            dragHandleClassName: "shape-term-drag-handle table-column-drag-handle",
            normalizeTermValue: value => this.normalizeColumnValue(value),
            getFallbackItems: () => this.getLegacyColumns(),
            onChanged: () => this.refreshGridColumns()
        });
        return this._columnsControl.createHost();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Table Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.columns = [{ term: "", case: 1 }];
    }

    createElement() {
        this.normalizeColumns();
        this._activeColumns = this.getSelectedColumns();
        this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.dataGrid = $div.dxDataGrid({
            dataSource: [],
            keyExpr: "iteration",
            editing: {
                mode: "cell",
                allowUpdating: true,
                selectTextOnEditStart: true,
                startEditAction: "click",
                useIcons: true
            },
            scrolling: {
                mode: "virtual"
            },
            showBorders: true,
            selection: {
                mode: "single"
            },
            noDataText: "",
            onEditorPreparing: e => this.onEditorPreparing(e),
            onCellValueChanged: e => this.onCellValueChanged(e),
            columns: this.buildGridColumns(this._activeColumns)
        }).dxDataGrid("instance");
        return foreignObject;
    }

    updateFocus() {
        if (!this._activeColumns || this._activeColumns.length === 0)
            return;
        var system = this.board.calculator.system;
        if (this.dataGrid.option("focusedRowKey") == system.iteration)
            return;
        this.dataGrid.navigateToRow(system.iteration);
        this.dataGrid.selectRows([system.iteration]);
    }

    update() {
        this.normalizeColumns();
        this.refreshGridColumns();
        this.refreshColumnsControl();
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }

    tick() {
        this.refreshGridData();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }

    onEditorPreparing(e) {
        if (e.parentType !== "dataRow")
            return;
        const column = this.getActiveColumnByField(e.dataField);
        if (!column) {
            e.editorOptions.readOnly = true;
            return;
        }
        e.editorOptions.readOnly = !this._canEditTerm(column.term);
    }

    onCellValueChanged(e) {
        const column = this.getActiveColumnByField(e.column?.dataField);
        if (!column || !this._canEditTerm(column.term))
            return;
        const iteration = e.data?.iteration ?? e.key;
        if (iteration == null)
            return;
        const numericValue = Number(e.value);
        if (!Number.isFinite(numericValue)) {
            e.component.cellValue(e.rowIndex, column.key, e.oldValue);
            return;
        }
        const precision = this.board.calculator.getPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        e.component.cellValue(e.rowIndex, column.key, rounded);
        const system = this.board.calculator.system;
        const row = system.getIteration(iteration, column.case);
        if (!row)
            return;
        row[column.term] = rounded;
        if (iteration === 1 && this.board.calculator.isTerm(column.term))
            system.setInitialByName(column.term, rounded, 1, column.case);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    refreshGridColumns() {
        if (!this.dataGrid)
            return;
        const columns = this.getSelectedColumns();
        const nextKey = this.getColumnsStateKey(columns);
        if (this._appliedColumnsKey === nextKey)
            return;
        this._activeColumns = columns;
        this.dataGrid.option("columns", this.buildGridColumns(columns));
        this._appliedColumnsKey = nextKey;
        this.refreshGridData();
    }

    refreshGridData() {
        if (!this.dataGrid)
            return;
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0) {
            this.dataGrid.option("dataSource", []);
            return;
        }
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const row = { iteration: iteration };
            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                row[column.key] = system.getByNameOnIteration(iteration, column.term, column.case);
            }
            rows.push(row);
        }
        this.dataGrid.option("dataSource", rows);
    }

    buildGridColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        return columns.map(column => ({
            dataField: column.key,
            caption: column.term,
            headerCellTemplate: container => this.renderGridHeader(container, column),
            allowEditing: this._canEditTerm(column.term),
            dataType: "number",
            format: {
                type: "fixedPoint",
                precision: precision
            }
        }));
    }

    renderGridHeader(container, column) {
        const header = $("<div>").css({
            display: "flex",
            alignItems: "center",
            gap: "6px"
        });
        $("<math-field>")
            .attr("read-only", true)
            .html(column.term ?? "")
            .css("height", "auto", "width", "auto")
            .addClass("form-math-field")
            .appendTo(header);
        if (ShapeTermsSelectorControl.shouldShowCaseSelectionForShapeTerm(this, column.term, value => this.normalizeColumnValue(value))) {
            const caseIndicator = $("<span>").addClass("case-select");
            const caseNumber = column.case;
            const iconClass = ShapeTermsSelectorControl.getCaseNumberIconClass(caseNumber);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", ShapeTermsSelectorControl.getCaseIconColor(caseNumber));
            icon.css("margin-right", "0");
            caseIndicator.append(icon);
            header.append(caseIndicator);
        }
        header.appendTo(container);
    }

    getActiveColumnByField(dataField) {
        if (!this._activeColumns)
            return null;
        for (let index = 0; index < this._activeColumns.length; index++) {
            const column = this._activeColumns[index];
            if (column.key === dataField)
                return column;
        }
        return null;
    }

    getSelectedColumns() {
        const selectedColumns = ShapeTermsSelectorControl.getSelectedShapeTermsCollection(this, "columns", {
            normalizeTermValue: value => this.normalizeColumnValue(value),
            getFallbackItems: () => this.getLegacyColumns()
        });
        return selectedColumns.map((column, index) => ({
            key: `column${index}`,
            term: column.term,
            case: column.case
        }));
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return JSON.stringify(columns.map(column => ({ term: column.term, case: column.case })));
    }

    refreshColumnsControl() {
        if (!this._columnsControl)
            return;
        this._columnsControl.refresh();
    }

    normalizeColumns() {
        ShapeTermsSelectorControl.normalizeShapeTermsCollection(this, "columns", {
            normalizeTermValue: value => this.normalizeColumnValue(value),
            getFallbackItems: () => this.getLegacyColumns()
        });
    }

    getLegacyColumns() {
        const columns = [];
        const column1Term = this.normalizeColumnValue(this.properties.column1Term);
        const column2Term = this.normalizeColumnValue(this.properties.column2Term);
        if (column1Term !== "")
            columns.push({ term: column1Term, case: this.getClampedCaseNumber(this.properties.column1TermCase ?? 1) });
        if (column2Term !== "")
            columns.push({ term: column2Term, case: this.getClampedCaseNumber(this.properties.column2TermCase ?? 1) });
        if (columns.length === 0)
            columns.push({ term: "", case: 1 });
        return columns;
    }

    normalizeColumnValue(value) {
        return ShapeTermsSelectorControl.normalizeTermValue(value);
    }

    _canEditTerm(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        return calculator.isTerm(term) && calculator.isEditable(term);
    }

    enterEditMode() {
        if (this.dataGrid && typeof this.dataGrid.focus === "function") {
            this.dataGrid.focus();
            return true;
        }
        return super.enterEditMode();
    }
}
