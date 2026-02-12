class ChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    enterEditMode() {
        if (this.chart && typeof this.chart.focus === "function") {
            this.chart.focus();
            return true;
        }
        const element = this.chart?.element?.();
        if (element && typeof element.focus === "function") {
            element.focus();
            return true;
        }
        return false;
    }

    updateGridData(e) {
        const data = [...this.properties.yTerms];
        const filledData = data.filter(row => row.term || row.color);
        if (e && filledData.length == 0 && (e.data.color || e.data.term))
            filledData.push(e.data);
        filledData.push({ term: "", color: "" });
        this.properties.yTerms = filledData;
        $("#dataGrid").dxDataGrid("option", "dataSource", this.properties.yTerms);
    }

    createYTermsGrid(itemElement) {
        var grid = $("<div>").attr("id", "dataGrid").dxDataGrid({
            dataSource: this.properties.yTerms,
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
                        displayExpr: "text",
                        valueExpr: "term",
                        dataSource: Utils.getTerms(this.board.calculator.getTermsNames())
                    },
                    editorOptions: {
                        stylingMode: "filled",
                        placeholder: "",
                        inputAttr: { class: "mdl-variable-selector" },
                        elementAttr: { class: "mdl-variable-selector" },
                        itemTemplate: (data, index, element) => {
                            const item = $("<div>").text(data.text);
                            item.addClass("mdl-variable-selector");
                            element.append(item);
                            return item;
                        },
                        fieldTemplate(data, element) {
                            const item = $("<div>").dxTextBox({
                                value: data?.text,
                                readOnly: true,
                                inputAttr: { class: "mdl-variable-selector" }
                            });
                            item.addClass("mdl-variable-selector");
                            element.append(item);
                            return item;
                        }
                    },
                    cssClass: "mdl-variable-selector"
                },
                {
                    dataField: "color",
                    caption: "Color",
                    width: 100,
                    lookup: {
                        dataSource: this.board.theme.getStrokeColors().map(c => ({
                            icon: c.color === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square",
                            color: c.color
                        })),
                        displayExpr: "color",
                        valueExpr: "color"
                    },
                    cellTemplate: function(container, options) {
                        if (!options.value)
                            return;
                        const iconClass = options.value === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square";
                        const color = options.value == "#00000000" ? "#cccccc" : options.value;
                        const icon = $("<i>")
                            .addClass(iconClass)
                            .css({
                                color: color,
                                fontSize: "16px",
                                marginRight: "6px"
                            });
                        if (options.value === "#ffffff")
                            icon.css("--fa-primary-color", "#000000");
                        const wrapper = $("<div>").css({
                            display: "flex",
                            alignItems: "center"
                        }).append(icon);
                        container.append(wrapper);
                    },
                    editorOptions: {
                        stylingMode: "filled",
                        placeholder: "",
                        itemTemplate: (data, index, element) => {
                            const iconClass = data.color === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square";
                            const color = data.color == "#00000000" ? "#cccccc" : data.color;
                            const icon = $("<i>")
                                .addClass(iconClass)
                                .css({
                                    color: color,
                                    fontSize: "16px",
                                    display: "flex",
                                    alignItems: "center"
                                });
                            if (data.color === "#ffffff")
                                icon.css("--fa-primary-color", "#000000");
                            const item = $("<div>")
                                .css({
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    width: "100%"
                                })
                                .append(icon);
                            element.append(item);
                            return item;
                        },
                        fieldTemplate(data, element) {
                            const textBox = $("<div>").dxTextBox({
                                readOnly: true,
                                value: ""
                            });
                            element.append(textBox);
                            if (!data?.color)
                                return textBox;
                            const iconClass = data.color === "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square";
                            const color = data.color == "#00000000" ? "#cccccc" : data.color;
                            textBox.find("input")
                                .before(
                                    $("<i>")
                                        .addClass(iconClass)
                                            .css({
                                                color: color,
                                                fontSize: "16px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                width: "100%"
                                            })
                                );
                            return textBox;
                        }
                    }
                }
            ],
            onRowUpdated: this.updateGridData.bind(this)
        });
        this.updateGridData();
        return grid;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                itemType: "group",
                colCount: 2,
                items: [
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
                ]
            }
        );
        this.addTermToForm("xTerm", "Horizontal", false, 2);
        items.push(
            {
                colSpan: 2,
                dataField: "yTerms",
                label: { text: "Vertical" },
                template: (data, itemElement) => this.createYTermsGrid(itemElement)
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
                    visible: false
                },
                point: {
                    visible: false
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
            legend: {
                visible: true,
                verticalAlignment: "top",
                horizontalAlignment: "center",
                orientation: "horizontal",
                itemTextPosition: "right"
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
        this._appliedConfig = {};
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
        if (this.properties.xTerm == null || this.properties.yTerms == null)
            return;
        series.forEach(s => {
            var value = system.getValueAtIteration(system.iteration, s.getArgumentField());
            var points = s.getPointsByArg(value);
            points.forEach(p => p.showTooltip())
        });
    }

    update() {
        const config = {
            chartType: this.properties.chartType,
            argField: this.properties.xTerm,
            series: this.properties.yTerms.filter(y => y.color || y.term).map(term => ({
                valueField: term.term,
                name: term.term,
                color: term.color
            })),
            color: this.properties.foregroundColor,
            bg: this.properties.backgroundColor,
            argTitle: this.properties.xTerm,
            valTitle: this.properties.yTerm
        };
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (changed) {
            this.chart.beginUpdate();
            this.chart.option("commonSeriesSettings.type", config.chartType);
            this.chart.option("commonSeriesSettings.argumentField", config.argField);
            this.chart.option("series", config.series);
            this.chart.option("commonSeriesSettings.color", config.color);
            this.chart.option("containerBackgroundColor", config.bg);
            this.chart.option("argumentAxis.title.text", config.argTitle);
            this.chart.option("valueAxis.title.text", config.valTitle);
            this.element.style.backgroundColor = config.bg;
            this.chart.endUpdate();
            this._appliedConfig = config;
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
        // Sync new calculator values and focus without reconfiguring the chart
        this.updateValues();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) { // ~30 FPS focus updates
            this.updateFocus();
            this._lastFocusTs = now;
        }
        // No board.markDirty: DevExtreme handles UI updates on data push
        super.tick();
    }
}
