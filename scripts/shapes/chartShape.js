class ChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    updateGridData(e) {
        const data = gridData;
        if (e && e.dataField)
            data[e.rowIndex][e.dataField] = e.value;
        const allFilled = data.every(row => row.variable && row.color);
        const emptyRows = data.filter(row => !row.variable && !row.color);
        if (allFilled)
            data.push({ variable: null, color: null });
        else if (emptyRows.length > 1) {
            gridData = data.filter(row => row.variable || row.color);
            gridData.push({ variable: null, color: null });
        } else
            gridData = data;
        $("#dataGrid").dxDataGrid("option", "dataSource", gridData);
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
            }
        );
        this.addTermToForm("xTerm", "Horizontal", false, 2);
        //this.addTermToForm("yTerm", "Vertical", false);
        items.push(
            {
                colSpan: 2,
                dataField: "yTerms",
                label: { text: "Vertical" },
                template: (data, itemElement) => {
                    return $("<div>").attr("id", "dataGrid").dxDataGrid({
                        dataSource: [...this.properties.yTerms, { term: "", color: "" }],
                        editing: {
                            mode: "cell",
                            allowUpdating: true,
                            allowAdding: false,
                            allowDeleting: false
                        },
                        showColumnHeaders: false,
                        columns: [
                            {
                                dataField: "term",
                                lookup: {
                                    dataSource: ['Temperature', 'Pressure', 'Humidity']
                                }
                            },
                            {
                                dataField: "color",
                                caption: "Color",
                                lookup: {
                                    dataSource: this.board.theme.getStrokeColors().map(c => ({
                                        icon: c.color === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square",
                                        color: c.color
                                    })),
                                    displayExpr: "color",
                                    valueExpr: "color",
                                    itemTemplate: function (itemData) {
                                        return $("<div>")
                                            .addClass("color-item")
                                            .append($("<i>")
                                                    .addClass(itemData.icon)
                                                    .css("color", itemData.color)
                                            );
                                    },
                                    valueTemplate: function (itemData) {
                                        if (!itemData) 
                                            return "";
                                        const iconClass = itemData === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square";
                                        return $("<div>")
                                            .addClass("color-value")
                                            .append(
                                                $("<i>")
                                                    .addClass(iconClass)
                                                    .css("color", itemData.color)
                                            );
                                    }
                                }
                            }
                        ],
                        onCellValueChanged: this.updateGridData
                    });
                }
            });
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
        this.properties.xTerm = null;
        this.properties.yTerms = [];
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