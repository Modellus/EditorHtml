class ChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
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

    createYTermsControl() {
        this.normalizeYTerms();
        this._yTermsControl = TermControl.createShapeTermsCollectionControl(this, "yTerms", {
            hostClassName: "shape-terms-control chart-yterms-control",
            listClassName: "shape-terms-list chart-yterms-list",
            rowClassName: "shape-term-row chart-yterm-row",
            dragHandleClassName: "shape-term-drag-handle chart-yterm-drag-handle",
            includeColor: true,
            includeVisibility: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value)
        });
        return this._yTermsControl.createHost();
    }

    refreshYTermsControl() {
        if (!this._yTermsControl)
            return;
        this._yTermsControl.refresh();
    }

    normalizeYTerms() {
        TermControl.normalizeShapeTermsCollection(this, "yTerms", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value)
        });
    }

    getSelectedYTerms() {
        return TermControl.getSelectedShapeTermsCollection(this, "yTerms", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value)
        });
    }

    shouldShowCaseLabelForTerm(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term, value => this.normalizeYTermValue(value));
    }

    getTermLabelWithCase(term, caseNumber = 1) {
        const normalizedTerm = this.normalizeYTermValue(term);
        if (normalizedTerm === "")
            return normalizedTerm;
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return normalizedTerm;
        const normalizedCaseNumber = TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => this.normalizeYTermValue(value));
        return `${normalizedTerm} ${TermControl.getCaseIconText(normalizedCaseNumber)}`;
    }

    getSeriesValueFieldName(index) {
        return `series${index}`;
    }

    getSeriesName(yTerm) {
        return this.getTermLabelWithCase(yTerm.term, yTerm.case);
    }

    getXTermName() {
        return this.normalizeYTermValue(this.properties.xTerm);
    }

    getXTermCaseNumber() {
        return TermControl.getShapeCaseNumber(this, this.getXTermName(), this.properties.xTermCase ?? 1, value => this.normalizeYTermValue(value));
    }

    normalizeYTermValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    normalizeYTermColor(value) {
        return TermControl.normalizeColorValue(value);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        this.normalizeYTerms();
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
                            elementAttr: { class: "toggle-option-group" },
                            items: [
                                { type: "scatter", iconName: "fa-chart-scatter" },
                                { type: "line", iconName: "fa-chart-line" },
                                { type: "area", iconName: "fa-chart-area" },
                                { type: "bar", iconName: "fa-chart-column" }
                            ],
                            keyExpr: "type",
                            stylingMode: "text",
                            selectionMode: "multiple",
                            selectedItemKeys: [...this.properties.chartType],
                            buttonTemplate: (itemData, container) => {
                                const iconWeight = "fa-light";
                                container.html(`<i class="dx-icon ${iconWeight} ${itemData.iconName}"></i>`);
                            },
                            onSelectionChanged: e => {
                                const selectedKeys = e.component.option("selectedItemKeys");
                                if (selectedKeys.length === 0)
                                    return;
                                let formInstance = $("#shape-form").dxForm("instance");
                                formInstance.updateData("chartType", [...selectedKeys]);
                                this.setProperty("chartType", [...selectedKeys]);
                                e.component.repaint();
                            }
                        }
                    }
                ]
            }
        );
        instance.option("items", items);
        this.addTermToForm("xTerm", "Horizontal", false, 2, { showVisibilityToggle: false });
        items = instance.option("items");
        items.push(
            {
                colSpan: 2,
                dataField: "yTerms",
                label: { text: "Vertical" },
                template: _ => this.createYTermsControl()
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
        this.properties.chartType = ["line"];
        this.properties.xTerm = null;
        this.properties.yTerms = [{ term: "", case: 1, color: "", showLabel: false }];
    }

    getChartControlOptions() {
        return {
            chartType: this.properties.chartType,
            argumentField: "argument",
            series: [],
            argumentTitle: "",
            valueTitle: "",
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            borderColor: this.getBorderColor(),
            onDomainChanged: domain => this.onDomainChanged(domain)
        };
    }

    onDomainChanged(domain) {
        this.properties.domainOverride = domain;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.chartRows = [];
        this.lastSyncedIteration = 0;
        this.chartDataConfig = null;
        this.chart = new ChartControl(element, this.getChartControlOptions());
        if (this.properties.domainOverride)
            this.chart.setDomainOverride(this.properties.domainOverride);
        this._appliedConfig = {};
        return element;
    }

    updateValues() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig)
            return;
        var system = this.board.calculator.system;
        const lastIteration = system.lastIteration;
        if (this.lastSyncedIteration > lastIteration)
            this.resetChartValues();
        let hasChanges = false;
        for (let iteration = this.lastSyncedIteration + 1; iteration <= lastIteration; iteration++)
            this.chartRows.push(this.createChartDataItem(iteration, chartDataConfig));
        if (lastIteration > this.lastSyncedIteration)
            hasChanges = true;
        this.lastSyncedIteration = lastIteration;
        if (!hasChanges)
            return;
        this.chart.setData(this.chartRows);
    }

    createChartDataItem(iteration, chartDataConfig) {
        const item = { iteration: iteration };
        const xValue = this.getChartTermValueOnIteration(iteration, chartDataConfig.xTerm, chartDataConfig.xCase);
        item[chartDataConfig.argumentField] = xValue;
        for (let index = 0; index < chartDataConfig.ySeries.length; index++) {
            const ySeries = chartDataConfig.ySeries[index];
            item[ySeries.valueField] = this.getChartTermValueOnIteration(iteration, ySeries.term, ySeries.case);
        }
        return item;
    }

    getChartTermValueOnIteration(iteration, term, caseNumber) {
        const normalizedTerm = this.normalizeYTermValue(term);
        if (normalizedTerm === "")
            return NaN;
        const calculator = this.board.calculator;
        if (calculator.isTerm(normalizedTerm))
            return calculator.system.getByNameOnIteration(iteration, normalizedTerm, this.getClampedCaseNumber(caseNumber));
        const numericValue = Number(normalizedTerm);
        if (Number.isFinite(numericValue))
            return numericValue;
        return NaN;
    }

    resetChartValues() {
        this.lastSyncedIteration = 0;
        this.chartRows = [];
        if (this.chart)
            this.chart.setData(this.chartRows);
    }

    updateFocus() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        var system = this.board.calculator.system;
        if (chartDataConfig.xTerm === "" || chartDataConfig.ySeries.length === 0) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        const value = this.getChartTermValueOnIteration(system.iteration, chartDataConfig.xTerm, chartDataConfig.xCase);
        if (value == null) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        if (typeof value === "number" && !Number.isFinite(value)) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        if (this.chart)
            this.chart.setFocusArgumentValue(value);
    }

    update() {
        this.normalizeYTerms();
        this.refreshYTermsControl();
        const selectedYTerms = this.getSelectedYTerms();
        const xTerm = this.getXTermName();
        const xCase = this.getXTermCaseNumber();
        const argumentField = "argument";
        const ySeries = selectedYTerms.map((yTerm, index) => ({
            term: yTerm.term,
            case: TermControl.getShapeCaseNumber(this, yTerm.term, yTerm.case ?? 1, value => this.normalizeYTermValue(value)),
            color: this.normalizeYTermColor(yTerm.color),
            showLabel: yTerm.showLabel === true,
            valueField: this.getSeriesValueFieldName(index),
            name: this.getSeriesName(yTerm)
        }));
        const chartDataConfig = {
            xTerm: xTerm,
            xCase: xCase,
            argumentField: argumentField,
            ySeries: ySeries
        };
        this.chartDataConfig = chartDataConfig;
        const config = {
            chartType: this.properties.chartType,
            argField: argumentField,
            series: ySeries.map(series => ({
                valueField: series.valueField,
                name: series.name,
                color: series.color === "" ? undefined : series.color,
                showLabel: series.showLabel === true
            })),
            color: this.properties.foregroundColor,
            bg: this.properties.backgroundColor,
            border: this.getBorderColor(),
            argTitle: this.getTermLabelWithCase(xTerm, xCase),
            valTitle: ySeries.map(series => series.name).join(", ")
        };
        const dataConfig = {
            argField: config.argField,
            series: config.series.map(series => ({ valueField: series.valueField, name: series.name }))
        };
        const dataChanged = JSON.stringify(dataConfig) !== JSON.stringify(this._appliedDataConfig);
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (changed) {
            this.chart.setOptions({
                chartType: config.chartType,
                argumentField: config.argField,
                series: config.series,
                foregroundColor: config.color,
                backgroundColor: config.bg,
                borderColor: config.border,
                argumentTitle: config.argTitle,
                valueTitle: config.valTitle
            });
            if (dataChanged)
                this.resetChartValues();
            this._appliedConfig = config;
            this._appliedDataConfig = dataConfig;
        }
    }

    draw() {
        const x = this.properties.x;
        const y = this.properties.y;
        const width = this.properties.width;
        const height = this.properties.height;
        this.chart.setSize(width, height);
        this.element.setAttribute("transform", `translate(${x} ${y}) rotate(${this.properties.rotation} ${width / 2} ${height / 2})`);
    }

    tick() {
        this.updateValues();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }
}
