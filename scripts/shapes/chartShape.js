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
        super.setDefaults();
        this.properties.name = this.board.translations.get("Chart Name");
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
        this.arrayStore = new DevExpress.data.ArrayStore();
        this.lastSyncedIndex = 0;
        this.chart = $div.dxChart({
            dataSource: this.arrayStore,
            zoomAndPan: {
                valueAxis: "both",
                argumentAxis: "both",
                dragToZoom: true,
                allowMouseWheel: true,
                panKey: "shift"
            },
            commonSeriesSettings: {
                label: {
                    visible: true
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
                minorGrid: {
                    visible: true
                },
                tick: {
                    visible: true
                },
                minorTick: {
                    visible: true
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
            },
            onIncidentOccurred: e => {
                if (e.target.type === "error")
                    console.log(e.target.errorText);
            }
        }).dxChart("instance");
        return foreignObject;
    }

    updateValues() {
        var system = this.board.calculator.system;
        const values = system.values;
        if (this.lastSyncedIndex > values.length) {
            this.lastSyncedIndex = 0;
            this.arrayStore.clear();
            this.chart.getDataSource().load();
        }
        const newItems = values.slice(this.lastSyncedIndex);
        newItems.forEach(i => this.arrayStore.push([{ type: "insert", data: i }]));
        this.lastSyncedIndex = values.length;
    }

    updateFocus() {
        var system = this.board.calculator.system;
        var series = this.chart.getAllSeries();
        if (this.properties.xTerm == null || this.properties.yTerm == null)
            return;
        series.forEach(s => {
            var value = system.getValueAtIteration(system.iteration, s.getArgumentField());
            var points = s.getPointsByArg(value);
            points.forEach(p => p.showTooltip())
        });
    }

    update() {
        this.chart.beginUpdate();
        this.chart.option("commonSeriesSettings.type", this.properties.chartType);
        this.chart.option("commonSeriesSettings.argumentField", this.properties.xTerm);
        this.chart.option("commonSeriesSettings.valueField", this.properties.yTerm);
        this.chart.option("commonSeriesSettings.color", this.properties.foregroundColor);
        this.chart.option("containerBackgroundColor", this.properties.backgroundColor);
        this.chart.option("argumentAxis.title.text", this.properties.xTerm);
        this.chart.option("valueAxis.title.text", this.properties.yTerm);
        this.element.style.backgroundColor = this.properties.backgroundColor;
        this.updateValues();
        this.chart.endUpdate();
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