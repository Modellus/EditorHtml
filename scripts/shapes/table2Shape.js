class Table2Shape extends BaseShape {
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
            onChanged: () => this.refreshTableColumns()
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
        this._appliedStyleKey = "";
        const element = this.board.createSvgElement("g");
        this.table = new ShapeSvgTableControl(element, this.getTableControlOptions(this._activeColumns));
        return element;
    }

    getTableControlOptions(columns = this._activeColumns) {
        return {
            columns: this.buildControlColumns(columns),
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            borderColor: this.getBorderColor(),
            precision: this.board.calculator.getPrecision(),
            onCellValueChanged: payload => this.onTableCellValueChanged(payload)
        };
    }

    getTableStyleKey() {
        const precision = this.board.calculator.getPrecision();
        return `${this.properties.foregroundColor}|${this.properties.backgroundColor}|${this.getBorderColor()}|${precision}`;
    }

    buildControlColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        return columns.map(column => ({
            key: column.key,
            title: column.term,
            term: column.term,
            caseNumber: column.case,
            showCase: ShapeTermsSelectorControl.shouldShowCaseSelectionForShapeTerm(this, column.term, value => this.normalizeColumnValue(value)),
            editable: this._canEditTerm(column.term),
            precision: precision,
            sourceColumn: column
        }));
    }

    onTableCellValueChanged(payload) {
        const sourceColumn = payload?.column?.sourceColumn;
        if (!sourceColumn)
            return false;
        if (!this._canEditTerm(sourceColumn.term))
            return false;
        const iteration = payload?.rowKey ?? payload?.row?.key;
        if (iteration == null)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        const precision = this.board.calculator.getPrecision();
        const roundedValue = Utils.roundToPrecision(numericValue, precision);
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

    updateFocus() {
        if (!this.table)
            return;
        if (!this._activeColumns || this._activeColumns.length === 0) {
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
        const nextKey = this.getColumnsStateKey(columns);
        const nextStyleKey = this.getTableStyleKey();
        if (this._appliedColumnsKey === nextKey && this._appliedStyleKey === nextStyleKey)
            return;
        this._activeColumns = columns;
        this.table.setOptions(this.getTableControlOptions(columns));
        this._appliedColumnsKey = nextKey;
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
        if (this.table && typeof this.table.focus === "function") {
            this.table.focus();
            return true;
        }
        return super.enterEditMode();
    }
}
