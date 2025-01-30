class ChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board), parent, id;
        this.properties.chartType = "line";
        this.hasForm = true;
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    getForm() {
        return $("<div id='shape-form'></div>").dxForm({
            colCount: 1,
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
            items: [
                {
                    dataField: "name",
                    label: { text: "Name", visible: false },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    dataField: "backgroundColor",
                    label: { text: "Background color" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        onContentReady: function (e) {
                            e.component.option("items").forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                buttonElement.find(".dx-icon").css("color", item.color);
                            });
                        },
                        items: this.board.theme.getBackgroundColors().map(c => ({
                            icon: "fa-solid fa-square",
                            color: c.color
                        })),
                        keyExpr: "color",
                        stylingMode: "text"
                    }
                },
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
                    label: { text: "X Variable" },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    dataField: "yTerm",
                    label: { text: "Y Variable" },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                }
            ]
        });
    }

    setDefaults() {
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