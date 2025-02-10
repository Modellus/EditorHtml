class ChartShape extends BaseShape {
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
                dataField: "chartType",
                label: { text: "Type" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    items: [
                        { id: "scatter", icon: "fa-solid fa-square" },
                        { id: "line", icon: "fa-solid fa-square" },
                        { id: "area", icon: "fa-solid fa-square" },
                        { id: "bar", icon: "fa-solid fa-square" }
                    ],
                    keyExpr: "id",
                    stylingMode: "text"
                }
            },
            {
                dataField: "xTerm",
                label: { text: "Argument Axis" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            },
            {
                dataField: "yTerm",
                label: { text: "Value Axis" },
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
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.chartType = "line";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.chart = $div.dxChart({
            commonSeriesSettings: {
                argumentField: "x",
                label: {
                    visible: true, 
                    customizeText: e => e.argument === this.board.calculator.get()["x"] ? e.valueText : ""
                }
            },
            commonPaneSettings: {
                border: {
                    visible: true
                }
            },
            commonAxisSettings: {
                color: "#d3d3d3",
                grid: {
                    visible: true
                },
                tick: {
                    visible: false
                }
            },
            series: [
                {
                    name: "y",
                    valueField: "y",
                    type: "line",
                    color: "#b1f2ba",
                    point: {
                        size: 4
                    },
                    label: {
                        format: {
                            type: "fixedPoint",
                            precision: 2
                        }
                    }
                },
                {
                    name: "z",
                    valueField: "z",
                    type: "line",
                    color: "#a4d8ff",
                    point: {
                        size: 4
                    },
                    label: {
                        format: {
                            type: "fixedPoint",
                            precision: 2
                        }
                    }
                }
            ],
            legend: {
                verticalAlignment: "bottom",
                horizontalAlignment: "center",
                itemTextPosition: "bottom",
            },
            crosshair: {
                enabled: true,
                color: "#949494",
                width: 2,
                dashStyle: "dot",
                label: {
                    visible: true,
                    backgroundColor: "#949494",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                }
            },
            tooltip: {
                enabled: true,
                format: {
                    type: "fixedPoint",
                    precision: 2
                }
            }
        }).dxChart("instance");
        return foreignObject;
    }

    update() {
        this.chart.option("dataSource", this.board.calculator.getValues());
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