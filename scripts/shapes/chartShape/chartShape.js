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
            return normalizedTerm;
        const displayedTerm = this.formatTermForDisplay(normalizedTerm);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return displayedTerm;
        const normalizedCaseNumber = TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => this.normalizeYTermValue(value));
        return `${displayedTerm} ${TermControl.getCaseIconText(normalizedCaseNumber)}`;
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

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xTermControl) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this.createYTermsControl()) }
        );
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.formatTermForDisplay(this.properties.xTerm);
        const yTerms = (this.properties.yTerms ?? []).filter(y => y.term);
        const firstYTerm = yTerms.length > 0 ? this.formatTermForDisplay(yTerms[0].term) : "";
            const xPart = xTerm ? this.createNameButtonTermMarkup(xTerm) : "";
        const separator = (xTerm && firstYTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
            const yPart = firstYTerm ? this.createNameButtonTermMarkup(firstYTerm) : "";
        const extraCount = yTerms.length - 1;
        const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
        if (!xPart && !yPart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${xPart}${separator}${yPart}${extraPart}`;
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
        const autoScale = this.properties.autoScale === true;
        const equalScales = this.properties.equalScales === true;
        const domain = autoScale ? this.chart.renderState?.domain : this.properties.domainOverride;
        this._xMinBoxInstance?.option({ value: domain?.xMin ?? null, disabled: autoScale });
        this._xMaxBoxInstance?.option({ value: domain?.xMax ?? null, disabled: autoScale });
        this._yMinBoxInstance?.option({ value: domain?.yMin ?? null, disabled: autoScale || equalScales });
        this._yMaxBoxInstance?.option({ value: domain?.yMax ?? null, disabled: autoScale || equalScales });
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
        this.chartDataConfig = null;
        this.chart = new ChartControl(element, this.getChartControlOptions());
        this._appliedConfig = {};
        this._appliedDomainConfig = null;
        return element;
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
                valueTitle: config.valTitle,
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
    }
}
