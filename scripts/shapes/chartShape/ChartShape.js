var ChartShape;
if (typeof BaseShape !== "undefined") ChartShape = class ChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
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
        this.properties.xAxisType = "decimal";
        this.properties.yAxisType = "decimal";
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
            interactable: this.isInteractable(),
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            borderColor: this.getBorderColor(),
            borderRadius: this.getBorderRadius(),
            ...(this.properties.axisColor ? { axisColor: this.properties.axisColor } : {}),
            xAxisType: this.properties.xAxisType || "decimal",
            yAxisType: this.properties.yAxisType || "decimal",
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            getPrecision: () => this.board.calculator.getPrecision(),
            getArgumentPrecision: () => this.board.calculator.getTermPrecision(this.getXTermName()),
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

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".chart-focus-layer").forEach(layerElement => layerElement.remove());
        clone.querySelectorAll(".chart-focus-reference-line").forEach(lineElement => lineElement.remove());
        clone.querySelectorAll(".shape-term-label").forEach(labelElement => {
            const labelGroup = labelElement.closest("g");
            if (labelGroup)
                labelGroup.remove();
            else
                labelElement.remove();
        });
        clone.querySelectorAll(".shape-term-label-bg").forEach(backgroundElement => backgroundElement.remove());
        clone.querySelectorAll(".shape-term-case-icon-host").forEach(caseIconElement => caseIconElement.remove());
        clone.querySelectorAll(".shape-term-guide-line").forEach(guideElement => guideElement.remove());
        return clone;
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
            interactable: this.isInteractable(),
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
            xAxisType: this.properties.xAxisType || "decimal",
            yAxisType: this.properties.yAxisType || "decimal",
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
                interactable: config.interactable,
                argumentField: config.argField,
                series: config.series,
                foregroundColor: config.color,
                backgroundColor: config.bg,
                dataAreaColor: config.dataAreaColor,
                axisColor: config.axisColor,
                xAxisType: config.xAxisType,
                yAxisType: config.yAxisType,
                borderColor: config.border,
                argumentTitle: config.argTitle
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
