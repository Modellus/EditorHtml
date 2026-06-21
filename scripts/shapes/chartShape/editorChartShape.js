var ChartShape;
if (typeof BaseShape !== "undefined") ChartShape = class ChartShape extends BaseShape {
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
            colorSelection: {
                getValue: (item, index) => this.getYTermControlDisplayColor(item, index)
            },
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value),
            normalizeItem: (sourceItem, normalizedItem) => {
                normalizedItem.chartTypes = Array.isArray(sourceItem?.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : ["line"];
            },
            createEmptyItem: () => ({ chartTypes: ["line"] }),
            lock: {
                width: "auto",
                editorType: "dxDropDownButton",
                valueExpr: "value",
                getValue: item => item?.chartTypes ?? ["line"],
                getItems: () => [
                    { value: "scatter", text: "Scatter", icon: "fa-light fa-chart-scatter" },
                    { value: "line", text: "Line", icon: "fa-light fa-chart-line" },
                    { value: "area", text: "Area", icon: "fa-light fa-chart-area" },
                    { value: "bar", text: "Bar", icon: "fa-light fa-chart-column" }
                ],
                buttonTemplate: (element, item, index, selectedValue) => {
                    $(element).empty().append(`<div class="shape-term-secondary-button" style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fa-light fa-chart-mixed shape-term-secondary-icon"></i></div>`);
                },
                itemTemplate: (itemData, itemIndex, element, item) => {
                    const selectedTypes = item?.chartTypes ?? ["line"];
                    const isSelected = selectedTypes.includes(itemData.value);
                    const chartTypeIconsLight = { scatter: "fa-light fa-chart-scatter", line: "fa-light fa-chart-line", area: "fa-light fa-chart-area", bar: "fa-light fa-chart-column" };
                    const chartTypeIconsSolid = { scatter: "fa-solid fa-chart-scatter", line: "fa-solid fa-chart-line", area: "fa-solid fa-chart-area", bar: "fa-solid fa-chart-column" };
                    const iconClass = isSelected ? (chartTypeIconsSolid[itemData.value] ?? "fa-solid fa-chart-line") : (chartTypeIconsLight[itemData.value] ?? "fa-light fa-chart-line");
                    $(element).empty().append(`<div class="shape-term-secondary-item" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;"><i class="${iconClass} shape-term-secondary-icon"></i><span>${itemData.text}</span></div>`);
                },
                dropDownOptions: { width: 140 },
                onValueChanged: (index, clickedType) => {
                    TermControl.applyShapeTermsCollectionMutation(this, "yTerms", {
                        normalizeTermValue: value => this.normalizeYTermValue(value),
                        normalizeColorValue: value => this.normalizeYTermColor(value),
                        includeColor: true,
                        normalizeItem: (sourceItem, normalizedItem) => {
                            normalizedItem.chartTypes = Array.isArray(sourceItem?.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : ["line"];
                        },
                        createEmptyItem: () => ({ chartTypes: ["line"] })
                    }, items => {
                        if (!items[index])
                            return;
                        const currentTypes = items[index].chartTypes ?? ["line"];
                        const typeIndex = currentTypes.indexOf(clickedType);
                        if (typeIndex >= 0) {
                            if (currentTypes.length > 1)
                                items[index].chartTypes = currentTypes.filter(t => t !== clickedType);
                        } else {
                            items[index].chartTypes = [...currentTypes, clickedType];
                        }
                    });
                }
            }
        });
        return this._yTermsControl.createHost();
    }

    refreshYTermsControl() {
        if (!this._yTermsControl)
            return;
        this._yTermsControl.refresh();
    }

    clearStaleTermCollectionReferences(staleTermNames) {
        if (!Array.isArray(this.properties.yTerms))
            return;
        let hadStale = false;
        for (let i = 0; i < this.properties.yTerms.length; i++) {
            if (staleTermNames.has(this.properties.yTerms[i].term)) {
                this.properties.yTerms[i] = { ...this.properties.yTerms[i], term: "" };
                hadStale = true;
            }
        }
        if (hadStale) {
            this.resetValues();
            this.update();
        }
    }

    normalizeYTerms() {
        TermControl.normalizeShapeTermsCollection(this, "yTerms", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value),
            normalizeItem: (sourceItem, normalizedItem) => {
                normalizedItem.chartTypes = Array.isArray(sourceItem?.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : ["line"];
            },
            createEmptyItem: () => ({ chartTypes: ["line"] })
        });
    }

    getSelectedYTerms() {
        return TermControl.getSelectedShapeTermsCollection(this, "yTerms", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value),
            normalizeItem: (sourceItem, normalizedItem) => {
                normalizedItem.chartTypes = Array.isArray(sourceItem?.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : ["line"];
            }
        });
    }

    shouldShowCaseLabelForTerm(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term, value => this.normalizeYTermValue(value));
    }

    getTermLabelWithCase(term, caseNumber = 1) {
        const normalizedTerm = this.normalizeYTermValue(term);
        if (normalizedTerm === "")
            return { termLatex: "", caseNumber: null };
        const displayedTerm = this.formatTermForDisplay(normalizedTerm);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return { termLatex: displayedTerm, caseNumber: null };
        const normalizedCaseNumber = TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => this.normalizeYTermValue(value));
        return { termLatex: displayedTerm, caseNumber: normalizedCaseNumber };
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

    getYTermControlDisplayColor(item, index) {
        const explicitColor = this.normalizeYTermColor(item?.color);
        if (explicitColor !== "")
            return explicitColor;
        const renderedColor = this.chart?.renderState?.series?.[index]?.color;
        if (renderedColor)
            return renderedColor;
        return Utils.getColorByIndex(index);
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xTermControl) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this.createYTermsControl()) }
        );
    }

    renderTermsButtonTemplate(element) {
        renderChartTermsToolbarButton(this, element);
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
        const dataAreaLabel = this.board.translations.get("Data Area") ?? "Data Area";
        this._dataAreaColorPicker = this.createColorPickerEditor("dataAreaColor");
        sections[0].items.push({
            text: dataAreaLabel,
            iconHtml: this.menuIconHtml("fa-chart-area", !!this.properties.dataAreaColor),
            buildControl: $p => $p.append(this._dataAreaColorPicker)
        });
        const axisLabel = this.board.translations.get("Axis") ?? "Axis";
        this._axisColorPicker = this.createColorPickerEditor("axisColor");
        sections[0].items.push({
            text: axisLabel,
            iconHtml: this.menuIconHtml("fa-axis-x", !!this.properties.axisColor),
            buildControl: $p => $p.append(this._axisColorPicker)
        });
    }

    refreshDomainBoxes() {
        refreshChartDomainEditorValues(this);
    }

    showContextToolbar() {
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.refreshYTermsControl();
        this.refreshTermsToolbarControl();
        this.refreshDomainBoxes();
        this._autoScaleSwitchInstance?.option("value", this.properties.autoScale === true);
        this._equalScalesSwitchInstance?.option("value", this.properties.equalScales === true);
        super.showContextToolbar();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Chart Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.autoScale = true;
        this.properties.equalScales = false;
        this.properties.tangentColor = "#00000000";
        this.properties.axisColor = "";
        this.properties.originX = 0;
        this.properties.originY = 0;
        this.properties.xTerm = this.board.calculator.properties.independent.name;
        this.properties.yTerms = [{ term: this.board.calculator.getDefaultTerm(), case: 1, color: "", showLabel: false, chartTypes: ["line"] }];
        this.properties.domainOverride = this.getDefaultDomainOverride();
    }

    getDefaultDomainOverride() {
        const independent = this.board.calculator.properties.independent;
        let xMin = independent.start;
        let xMax = independent.end;
        if (xMin === xMax) {
            xMin -= 1;
            xMax += 1;
        }
        let yMin = independent.start;
        let yMax = independent.end;
        if (yMin === yMax) {
            yMin -= 1;
            yMax += 1;
        }
        const xMargin = (xMax - xMin) * 0.04;
        const yMargin = (yMax - yMin) * 0.08;
        return { xMin: xMin - xMargin, xMax: xMax + xMargin, yMin: yMin - yMargin, yMax: yMax + yMargin };
    }

    getChartControlOptions() {
        return {
            argumentField: "argument",
            series: [],
            argumentTitle: "",
            valueTitle: "",
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            borderColor: this.getBorderColor(),
            borderRadius: this.getBorderRadius(),
            ...(this.properties.axisColor ? { axisColor: this.properties.axisColor } : {}),
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            precision: this.board.calculator.getPrecision(),
            onDomainChanged: domain => this.onDomainChanged(domain),
            onTickDragStarted: () => this.onTickDragStarted(),
            onTickDragEnded: () => this.onTickDragEnded(),
            onDataAreaDoubleClick: (clickedX, clickedY) => this.onDataAreaDoubleClick(clickedX, clickedY)
        };
    }

    onDomainChanged(domain) {
        this.properties.autoScale = false;
        this.properties.domainOverride = domain;
        this._autoScaleSwitchInstance?.option("value", false);
        this.refreshDomainBoxes();
        this.board.markDirty(this);
    }

    onDataAreaDoubleClick(clickedX, clickedY) {
        const currentDomain = this.chart.renderState?.domain;
        const xMin = currentDomain ? currentDomain.xMin : -1;
        const xMax = currentDomain ? currentDomain.xMax : 1;
        const yMin = currentDomain ? currentDomain.yMin : -1;
        const yMax = currentDomain ? currentDomain.yMax : 1;
        const newDomain = {
            xMin: xMin - clickedX,
            xMax: xMax - clickedX,
            yMin: yMin - clickedY,
            yMax: yMax - clickedY
        };
        this.properties.domainOverride = newDomain;
        this.properties.autoScale = false;
        this._autoScaleSwitchInstance?.option("value", false);
        this.chart.setDomainOverride(newDomain);
        this.refreshDomainBoxes();
        this.board.markDirty(this);
    }

    onTickDragStarted() {
        this._tickDragState = true;
        this.board.pointerLocked = true;
    }

    onTickDragEnded() {
        this._tickDragState = null;
        this.board.pointerLocked = false;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.chartRows = [];
        this.lastSyncedIteration = 0;
        this.lastSyncedCalculatedIteration = 0;
        this.lastSyncedRecalculationRevision = 0;
        this.chartDataConfig = null;
        this.chart = new ChartControl(element, this.getChartControlOptions());
        this._appliedConfig = {};
        this._appliedDomainConfig = null;
        return element;
    }

    initializeTermDisplayLayer() {
        BaseShape.prototype.initializeTermDisplayLayer.call(this);
        if (this.termDisplayLayer && this.element) {
            this.termDisplayLayer.setAttribute("clip-path", `url(#${this.chart.plotClipId})`);
            this.element.appendChild(this.termDisplayLayer);
        }
    }

    updateValues() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig)
            return;
        var system = this.board.calculator.system;
        const lastIteration = system.lastIteration;
        const lastCalculatedIteration = system.lastCalculatedIteration;
        if (this.lastSyncedIteration > lastIteration)
            this.resetValues();
        let hasChanges = false;
        if (lastCalculatedIteration > this.lastSyncedCalculatedIteration) {
            const recalcStart = this.lastSyncedCalculatedIteration + 1;
            const recalcEnd = Math.min(lastCalculatedIteration, this.lastSyncedIteration);
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                const row = this.chartRows[rowIndex];
                if (row.iteration >= recalcStart && row.iteration <= recalcEnd) {
                    const updated = this.createChartDataItem(row.iteration, chartDataConfig);
                    this.chartRows[rowIndex] = updated;
                    hasChanges = true;
                }
            }
            this.lastSyncedCalculatedIteration = lastCalculatedIteration;
        }
        for (let iteration = this.lastSyncedIteration + 1; iteration <= lastIteration; iteration++)
            this.chartRows.push(this.createChartDataItem(iteration, chartDataConfig));
        if (lastIteration > this.lastSyncedIteration)
            hasChanges = true;
        this.lastSyncedIteration = lastIteration;
        const calculator = this.board.calculator;
        const recalculationRevision = calculator.recalculationRevision ?? 0;
        if (recalculationRevision !== this.lastSyncedRecalculationRevision) {
            const currentIteration = system.iteration;
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                if (this.chartRows[rowIndex].iteration === currentIteration) {
                    this.chartRows[rowIndex] = this.createChartDataItem(currentIteration, chartDataConfig);
                    hasChanges = true;
                    break;
                }
            }
            this.lastSyncedRecalculationRevision = recalculationRevision;
        }
        if (!hasChanges)
            return;
        this.chart.setData(this.chartRows);
    }

    createChartDataItem(iteration, chartDataConfig) {
        const item = { iteration: iteration };
        const xValue = this.getChartTermValueOnIteration(iteration, chartDataConfig.xTerm, chartDataConfig.xCase);
        item[chartDataConfig.argumentField] = xValue;
        const system = this.board.calculator.system;
        for (let index = 0; index < chartDataConfig.ySeries.length; index++) {
            const ySeries = chartDataConfig.ySeries[index];
            item[ySeries.valueField] = this.getChartTermValueOnIteration(iteration, ySeries.term, ySeries.case);
            item[`outlier_${ySeries.valueField}`] = this.board.calculator.isOutlierIteration(ySeries.term, iteration);
            item[`singularity_${ySeries.valueField}`] = system.getSingularityType(this.normalizeYTermValue(ySeries.term), iteration, ySeries.case) !== 0;
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

    resetValues() {
        this.lastSyncedIteration = 0;
        this.lastSyncedCalculatedIteration = 0;
        this.lastSyncedRecalculationRevision = 0;
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
            chartTypes: Array.isArray(yTerm.chartTypes) && yTerm.chartTypes.length > 0 ? yTerm.chartTypes : ["line"],
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
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            argField: argumentField,
            series: ySeries.map(series => ({
                valueField: series.valueField,
                name: series.name,
                color: series.color === "" ? undefined : series.color,
                showLabel: series.showLabel === true,
                chartTypes: Array.isArray(series.chartTypes) && series.chartTypes.length > 0 ? series.chartTypes : ["line"]
            })),
            color: this.properties.foregroundColor,
            bg: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            axisColor: this.properties.axisColor || undefined,
            border: this.getBorderColor(),
            argTitle: this.getTermLabelWithCase(xTerm, xCase)
        };
        const dataConfig = {
            argField: config.argField,
            series: config.series.map(series => ({ valueField: series.valueField, name: series.name }))
        };
        const dataChanged = JSON.stringify(dataConfig) !== JSON.stringify(this._appliedDataConfig);
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (changed) {
            this.chart.setOptions({
                equalScales: config.equalScales,
                tangentColor: config.tangentColor,
                argumentField: config.argField,
                series: config.series,
                foregroundColor: config.color,
                backgroundColor: config.bg,
                dataAreaColor: config.dataAreaColor,
                axisColor: config.axisColor,
                borderColor: config.border,
                argumentTitle: config.argTitle,
                precision: this.board.calculator.getPrecision()
            });
            if (dataChanged)
                this.resetValues();
            this._appliedConfig = config;
            this._appliedDataConfig = dataConfig;
        }
        const domainConfig = {
            autoScale: this.properties.autoScale === true,
            domainOverride: this.properties.domainOverride ? { ...this.properties.domainOverride } : null
        };
        const domainChanged = JSON.stringify(domainConfig) !== JSON.stringify(this._appliedDomainConfig);
        if (domainChanged) {
            if (domainConfig.autoScale)
                this.chart.resetDomainOverride();
            else if (domainConfig.domainOverride)
                this.chart.setDomainOverride(domainConfig.domainOverride);
            this._appliedDomainConfig = domainConfig;
        }
        this.updateValues();
        this.updateFocus();
        this.syncYTermDisplayEntries(selectedYTerms);
    }

    syncYTermDisplayEntries(selectedYTerms) {
        this.termDisplayEntries = this.termDisplayEntries.filter(entry => !entry.term.startsWith("_yTerm"));
        for (let i = 0; i < selectedYTerms.length; i++) {
            const yTerm = selectedYTerms[i];
            const termProperty = `_yTerm${i}`;
            const caseProperty = `${termProperty}Case`;
            const displayModeProperty = `${termProperty}DisplayMode`;
            this.properties[termProperty] = yTerm.term;
            this.properties[caseProperty] = yTerm.case ?? 1;
            this.properties[displayModeProperty] = yTerm.showLabel === true ? "nameValue" : "none";
            if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
                this.termDisplayEntries.push({ term: termProperty, caseProperty: caseProperty });
        }
    }

    getTermLabelAnchor() {
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: width - 8, y: 20, anchor: "end" };
        return { x: 0, y: 20, anchor: "end" };
    }

    getTermEntryLabelPosition(entry, index) {
        const focusPositions = this.chart.getFocusPositions();
        const position = focusPositions[index];
        if (!position)
            return null;
        return { x: position.x, y: position.y - 12, anchor: "middle" };
    }

    getTermEntryLabelColor(entry, index) {
        const series = this.chart.renderState?.series;
        if (!series || index >= series.length)
            return null;
        return series[index].color;
    }

    draw() {
        const x = this.properties.x;
        const y = this.properties.y;
        const width = this.properties.width;
        const height = this.properties.height;
        this.chart.setSize(width, height);
        this.element.setAttribute("transform", `translate(${x} ${y}) rotate(${this.properties.rotation} ${width / 2} ${height / 2})`);
        super.draw();
    }

    tick() {
        this.updateValues();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
        this.board.markDirty(this);
    }
};

if (typeof NotebookShapesFactory !== "undefined") {
    var ChartNotebookShape = class ChartNotebookShape extends NotebookShape {
        renderContentHtml() {
            return `<svg id="${this.getHostId()}" class="notebook-chart-control"></svg>`;
        }

        mount(contentElement, dragHandleElement) {
            super.mount(contentElement, dragHandleElement);
            const chartContainer = contentElement.querySelector(`#${this.getHostId()}`);
            if (!chartContainer)
                return;
            const width = Math.max(240, contentElement.clientWidth || 720);
            const height = 280;
            this.chartControl = new ChartControl(chartContainer, {
                chartType: this.block.chartType || "line",
                argumentField: "x",
                argumentTitle: this.block.xTitle || "",
                valueTitle: this.block.yTitle || "",
                series: this._buildSeriesFromYTerms(),
                backgroundColor: "transparent",
                axisColor: "#5a5a5a",
                gridColor: "#dddddd"
            });
            this.chartControl.setSize(width, height);
            this._calculatorIterateHandler = () => this.onCalculatorIterate();
            this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
            this.onCalculatorIterate();
            this._applyDomainOverride();
        }

        _buildSeriesFromYTerms() {
            const yTermNames = Array.isArray(this.block.yTerms) ? this.block.yTerms : [];
            const colors = ["#2f6db5", "#e67e22", "#2ecc71", "#e74c3c", "#9b59b6"];
            if (yTermNames.length === 0)
                return [{ valueField: "y", name: "y", color: colors[0], chartTypes: [this.block.chartType || "line"] }];
            return yTermNames.map((termName, index) => ({
                valueField: `series${index}`,
                name: termName,
                color: colors[index % colors.length],
                chartTypes: [this.block.chartType || "line"]
            }));
        }

        onCalculatorIterate() {
            const calculator = this.notebookEditor.calculator;
            if (!calculator || !this.chartControl)
                return;
            const yTermNames = Array.isArray(this.block.yTerms) ? this.block.yTerms : [];
            if (yTermNames.length === 0)
                return;
            const xTermName = this.block.xTerm || calculator.properties.independent.name;
            const series = this._buildSeriesFromYTerms();
            this.chartControl.setOptions({ series, argumentField: "x" });
            const lastIteration = calculator.system.lastIteration;
            const rows = [];
            for (let iteration = 1; iteration <= lastIteration; iteration++) {
                const row = { x: calculator.system.getByNameOnIteration(iteration, xTermName, 1) };
                for (let seriesIndex = 0; seriesIndex < yTermNames.length; seriesIndex++)
                    row[`series${seriesIndex}`] = calculator.system.getByNameOnIteration(iteration, yTermNames[seriesIndex], 1);
                rows.push(row);
            }
            this.chartControl.setData(rows);
        }

        get chart() {
            return this.chartControl;
        }

        normalizeYTerms() {
            if (!Array.isArray(this.block.yTerms))
                this.block.yTerms = this.block.yTerms ? [this.block.yTerms] : [];
        }

        populateTermsMenuSections(listItems) {
            listItems.push(
                { text: "Horizontal", stacked: true, buildControl: $container => $container.append(this._xTermControl) },
                { text: "Vertical", stacked: true, buildControl: $container => {
                    const wrapper = $('<div style="width:160px"></div>');
                    this.createNotebookTermsCollectionControl(wrapper, {
                        propertyName: "yTerms",
                        system: this.board.calculator?.system
                    });
                    $container.append(wrapper);
                }}
            );
        }

        renderTermsButtonTemplate(element) {
            renderChartTermsToolbarButton(this, element);
        }

        refreshDomainBoxes() {
            refreshChartDomainEditorValues(this);
        }

        _applyDomainOverride() {
            if (!this.chartControl)
                return;
            this.chartControl.domainOverride = {
                xMin: this.block.xMin ?? null,
                xMax: this.block.xMax ?? null,
                yMin: this.block.yMin ?? null,
                yMax: this.block.yMax ?? null
            };
            this.chartControl.render();
        }

        unmount() {
            if (this._calculatorIterateHandler) {
                this.notebookEditor.calculator?.off("iterate", this._calculatorIterateHandler);
                this._calculatorIterateHandler = null;
            }
            if (this.chartControl)
                this.chartControl.dispose();
            this.chartControl = null;
            super.unmount();
        }
    };

    NotebookShapesFactory.register("chart", {
        defaultContent: "",
        notebookShapeClass: ChartNotebookShape,
        getNotebookToolbarMixin: () => typeof ChartShapeToolbarMixin !== "undefined" ? ChartShapeToolbarMixin : null,
        createShape: (notebookEditor, block) => new ChartNotebookShape(notebookEditor, block)
    });
}
