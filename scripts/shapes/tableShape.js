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
        this.addTermToForm("column1Term", "Column 1", false);
        this.addTermToForm("column2Term", "Column 2", false);
        instance.option("items", items);
        return form;
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
        this.properties.column1Term = this.board.calculator.system.independent.name;
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.arrayStore = new DevExpress.data.ArrayStore({ key: "iteration"});
        this.lastSyncedIndex = 0;
        this.dataGrid = $div.dxDataGrid({
            dataSource: new DevExpress.data.DataSource({
                store: this.arrayStore,
                reshapeOnPush: true,
            }),
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
            columns: [
                {
                    dataField: this.properties.column1Term,
                    caption: this.properties.column1Term,
                    headerCellTemplate: container => {
                        $("<math-field>")
                            .attr("read-only", true)
                            .html(this.properties.column1Term ?? "")
                            .css("height", "auto", "width", "auto")
                            .addClass("form-math-field")
                            .appendTo(container);
                    },
                    allowEditing: this._canEditTerm(this.properties.column1Term),
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    dataField: this.properties.column2Term,
                    headerCellTemplate: container => {
                        $("<math-field>")
                            .attr("read-only", true)
                            .html(this.properties.column2Term ?? "")
                            .css("height", "auto", "width", "auto")
                            .addClass("form-math-field")
                            .appendTo(container);
                    },
                    allowEditing: this._canEditTerm(this.properties.column2Term),
                    dataType: "number",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                }
            ]
        }).dxDataGrid("instance");
        this._appliedColumns = { c1: this.properties.column1Term, c2: this.properties.column2Term };
        return foreignObject;
    }

    updateValues() {
        var system = this.board.calculator.system;
        const values = system.values;
        if (this.lastSyncedIndex > values.length) {
            this.lastSyncedIndex = 0;
            this.arrayStore.clear();
            this.dataGrid.getDataSource().load();
            this.dataGrid.refresh();
        }
        const newItems = values.slice(this.lastSyncedIndex);
        newItems.forEach(i => this.arrayStore.push([{ type: "insert", data: i }]));
        this.lastSyncedIndex = values.length;
    }

    updateFocus() {
        if (this.properties.column1Term == null && this.properties.column2Term == null)
            return;
        var system = this.board.calculator.system;
        if (this.dataGrid.option("focusedRowKey") == system.iteration)
            return;
        this.dataGrid.navigateToRow(system.iteration);
        this.dataGrid.selectRows([system.iteration]);
    }

    update() {
        const column1 = this.properties.column1Term;
        const column2 = this.properties.column2Term;
        if (this._appliedColumns.c1 !== column1 || this._appliedColumns.c2 !== column2) {
            this.dataGrid.beginUpdate();
            this.dataGrid.option("columns[0].dataField", column1);
            this.dataGrid.option("columns[0].caption", column1);
            this.dataGrid.option("columns[0].name", "Column1Term");
            this.dataGrid.option("columns[0].allowEditing", this._canEditTerm(column1));
            this.dataGrid.option("columns[1].dataField", column2);
            this.dataGrid.option("columns[1].caption", column2);
            this.dataGrid.option("columns[1].name", "Column2Term");
            this.dataGrid.option("columns[1].allowEditing", this._canEditTerm(column2));
            this.dataGrid.endUpdate();
            this._appliedColumns = { c1: column1, c2: column2 };
        }
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
        // Sync data and focus; grid updates on push
        this.updateValues();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) { // ~30 FPS focus updates
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }

    onEditorPreparing(e) {
        if (e.parentType !== "dataRow")
            return;
        const editable = this._canEditTerm(e.dataField);
        e.editorOptions.readOnly = !editable;
    }

    onCellValueChanged(e) {
        const term = e.column?.dataField;
        if (!term || !this._canEditTerm(term))
            return;
        const iteration = e.data?.iteration ?? e.key;
        if (iteration == null)
            return;
        const numericValue = Number(e.value);
        if (!Number.isFinite(numericValue)) {
            e.component.cellValue(e.rowIndex, term, e.oldValue);
            return;
        }
        const precision = this.board.calculator.getPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        e.component.cellValue(e.rowIndex, term, rounded);
        const system = this.board.calculator.system;
        const index = iteration - 1;
        if (index < 0 || index >= system.values.length)
            return;
        const row = system.values[index];
        row[term] = rounded;
        if (iteration === 1 && this.board.calculator.isTerm(term))
            system.setInitialByName(term, rounded);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
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
