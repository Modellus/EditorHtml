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
        items.push(
            {
                colSpan: 1,
                dataField: "column1Term",
                label: { text: "Column 1" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 1,
                dataField: "column2Term",
                label: { text: "Column 2" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        this.properties.name = this.board.translations.get("Table Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.rotation = 0;
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.dataGrid = $div.dxDataGrid({
            dataSource: this.board.calculator.system.values,
            scrolling: {
                mode: "virtual"
            },
            showBorders: true,
            columns: [
                {
                    headerCellTemplate: container => {
                        $("<div>")
                            .css({
                                "font-family": "Katex_Math",
                                "font-size": "16px"
                            })
                            .text(this.properties.column1Term)
                            .appendTo(container);
                    },
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    headerCellTemplate: container => {
                        $("<div>")
                            .css({
                                "font-family": "Katex_Math",
                                "font-size": "16px"
                            })
                            .text(this.properties.column2Term)
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

    update() {
        this.dataGrid.beginUpdate();
        this.dataGrid.option("columns[0].dataField", this.properties.column1Term);
        this.dataGrid.option("columns[1].dataField", this.properties.column2Term);
        this.dataGrid.option("columns[0].caption", this.properties.column1Term);
        this.dataGrid.option("columns[1].caption", this.properties.column2Term);
        this.dataGrid.endUpdate();
        this.dataGrid.refresh();
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