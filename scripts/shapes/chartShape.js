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
                colSpan: 2,
                dataField: "chartType",
                label: { text: "Type" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    items: [
                        { type: "scatter", icon: "fa-light fa-chart-scatter" },
                        { type: "line", icon: "fa-light fa-chart-line" },
                        { type: "area", icon: "fa-light fa-chart-area" },
                        { type: "bar", icon: "fa-light fa-chart-column" }
                    ],
                    keyExpr: "type",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.chartType],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("chartType", e.itemData.type);
                        this.setProperty("chartType", e.itemData.type);
                    }
                }
            },
            {
                colSpan: 1,
                dataField: "xTerm",
                label: { text: "Horizontal" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 1,
                dataField: "yTerm",
                label: { text: "Vertical" },
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
                label: {
                    visible: true, 
                    customizeText1: e => e.argument === this.board.calculator.get()["x"] ? e.valueText : ""
                }
            },
            commonPaneSettings: {
                border: {
                    visible: true
                }
            },
            commonAxisSettings: {
                title: {
                    font: {
                        family: "Katex_Math",
                        size: "1em",
                        weight: 400
                    }
                },
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
                    point: {
                        size: 4
                    },
                    label: {
                        visible: false,
                        format: {
                            type: "fixedPoint",
                            precision: 2
                        }
                    }
                }
            ],
            legend: {
                visible: false,
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
        this.chart.beginUpdate();
        this.chart.option("commonSeriesSettings.type", this.properties.chartType);
        this.chart.option("commonSeriesSettings.argumentField", this.properties.xTerm);
        this.chart.option("commonSeriesSettings.valueField", this.properties.yTerm);
        this.chart.option("commonSeriesSettings.color", this.properties.foregroundColor);
        this.chart.option("commonPaneSettings.backgroundColor", this.properties.backgroundColor);
        this.chart.option("argumentAxis.title.text", this.properties.xTerm);
        this.chart.option("valueAxis.title.text", this.properties.yTerm);
        this.chart.option("dataSource", this.board.calculator.getValues());
        this.chart.endUpdate();
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