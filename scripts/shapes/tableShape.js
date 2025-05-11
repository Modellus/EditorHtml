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
            scrolling: {
                mode: "virtual"
            },
            showBorders: true,
            selection: {
                mode: "single"
            },
            noDataText: "",
            columns: [
                {
                    dataField: this.properties.column1Term,
                    caption: this.properties.column1Term,
                    headerCellTemplate: container => {
                        $("<math-field>")
                            .attr("read-only", true)
                            .html(this.properties.column1Term)
                            .css("height", "auto", "width", "auto")
                            .addClass("form-math-field")
                            .appendTo(container);
                    },
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    headerCellTemplate: container => {
                        $("<math-field>")
                            .attr("read-only", true)
                            .html(this.properties.column2Term)
                            .css("height", "auto", "width", "auto")
                            .addClass("form-math-field")
                            .appendTo(container);
                    },
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                }
            ]
        }).dxDataGrid("instance");
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
        var column1 = this.properties.column1Term;
        var column2 = this.properties.column2Term;
        this.dataGrid.beginUpdate();
        this.dataGrid.option("columns[0].dataField", column1);
        this.dataGrid.option("columns[0].caption", column1);
        this.dataGrid.option("columns[0].name", "Column1Term");
        this.dataGrid.option("columns[1].dataField", column2);
        this.dataGrid.option("columns[1].caption", column2);
        this.dataGrid.option("columns[1].name", "Column2Term");
        this.updateValues();
        this.dataGrid.endUpdate();
        this.updateFocus();
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }
}