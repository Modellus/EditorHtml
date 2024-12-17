class ChartShape extends BaseShape {
    constructor(calculator, properties) {
        super(calculator, properties);
        this.properties.chartType = "line";
        this.hasForm = true;
    }

    getForm() {
        return $("<div id='shape-form'></div>").dxForm({
            colCount: 1,
            onFieldDataChanged: e => onFieldDataChanged(e),
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
                        onContentReady: function(e) {
                            e.component.option('items').forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                buttonElement.find(".dx-icon").css("color", item.color);
                            });
                        },
                        items: this.backgroundColors.map(c => ({
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
                            { id: "scatter", icon: "fa-solid fa-square"},
                            { id: "line", icon: "fa-solid fa-square"},
                            { id: "area", icon: "fa-solid fa-square"}, 
                            { id: "bar", icon: "fa-solid fa-square"}
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

    createElement() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.chart = $div.dxChart({
            dataSource: this.calculator.system.values,
            series: [
                {
                    argumentField: "x",
                    name: "y",
                    valueField: "y",
                    type: "line",
                    color: "#b1f2ba",
                    point: {
                        size: 4
                    }
                },
                {
                    argumentField: "x",
                    name: "z",
                    valueField: "z",
                    type: "line",
                    color: "#a4d8ff",
                    point: {
                        size: 4
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
                color: '#949494',
                width: 2,
                dashStyle: 'dot',
                label: {
                    visible: true,
                    backgroundColor: '#949494'
                }
            }
        }).dxChart("instance");
        return foreignObject;
    }

    static deserialize(calculator, data) {
        return new ChartShape(calculator, data);
    }

    update() {
        this.chart.refresh();
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