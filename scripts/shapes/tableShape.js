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
                template: function(data, itemElement) {
                    var mathfield = new MathfieldElement();
                    mathfield.smartMode = true;
                    mathfield.popoverPolicy = "none";
                    mathfield.virtualKeyboardMode = "off";
                    mathfield.mathVirtualKeyboardPolicy = "manual";
                    mathfield.placeholder = "Enter a formula";
                    mathfield.smartMode = false;
                    mathfield.style.backgroundColor = "#f5f5f5";
                    mathfield.value = data.component.option("formData")[data.dataField];
                    data.mathfieldInstance = mathfield;
                    mathfield.addEventListener("input", () => {
                        data.component.updateData(data.dataField, mathfield.value);
                    });
                    data.component.option("onOptionChanged", function(args) {
                        if(args.fullName === "formData." + data.dataField)
                            mathfield.value = args.value;
                    });
                    itemElement.append(mathfield);
                }
            },
            {
                colSpan: 1,
                dataField: "column2Term",
                label: { text: "Column 2" },
                template: function(data, itemElement) {
                    var mathfield = new MathfieldElement();
                    mathfield.smartMode = true;
                    mathfield.popoverPolicy = "none";
                    mathfield.virtualKeyboardMode = "off";
                    mathfield.mathVirtualKeyboardPolicy = "manual";
                    mathfield.placeholder = "Enter a formula";
                    mathfield.smartMode = false;
                    mathfield.style.backgroundColor = "#f5f5f5";
                    mathfield.value = data.component.option("formData")[data.dataField];
                    data.mathfieldInstance = mathfield;
                    mathfield.addEventListener("input", () => {
                        data.component.updateData(data.dataField, mathfield.value);
                    });
                    data.component.option("onOptionChanged", function(args) {
                        if(args.fullName === "formData." + data.dataField)
                            mathfield.value = args.value;
                    });
                    itemElement.append(mathfield);
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

    update() {
        this.dataGrid.beginUpdate();
        this.dataGrid.option("columns[0].dataField", this.properties.column1Term);
        this.dataGrid.option("columns[1].dataField", this.properties.column2Term);
        this.dataGrid.option("columns[0].caption", this.properties.column1Term);
        this.dataGrid.option("columns[1].caption", this.properties.column2Term);
        this.dataGrid.endUpdate();
        this.dataGrid.refresh();
        this.dataGrid.repaint();
        const rowCount = this.dataGrid.totalCount();
        if (rowCount > 0)
            this.dataGrid.option("focusedRowIndex", rowCount - 1);
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