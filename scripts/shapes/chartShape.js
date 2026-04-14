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
            this.resetChartValues();
            this.update();
        }
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

    createToolbar() {
        const items = super.createToolbar();
        this.normalizeYTerms();
        this._xTermControl = this.createTermControl("xTerm", "Horizontal", false);
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createChartTypeDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    createChartTypeDropDownButton(container) {
        this._chartTypeDropdownElement = $('<div class="mdl-chart-type-selector">');
        this._chartTypeDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-chart-mixed",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: 280,
                contentTemplate: contentElement => this.buildChartTypeMenuContent(contentElement)
            }
        });
        this._chartTypeDropdownElement.appendTo(container);
    }

    buildChartTypeMenuContent(contentElement) {
        const chartTypes = [
            { type: "scatter", iconName: "fa-chart-scatter" },
            { type: "line", iconName: "fa-chart-line" },
            { type: "area", iconName: "fa-chart-area" },
            { type: "bar", iconName: "fa-chart-column" }
        ];
        const listItems = [{
            text: "Display",
            buildControl: $container => {
                const wrapper = $('<div style="display: flex; gap: 6px;">');
                this._chartTypeButtonInstances = {};
                for (const chartType of chartTypes) {
                    const selected = (this.properties.chartType ?? []).includes(chartType.type);
                    $('<div>').appendTo(wrapper).dxButton({
                        stylingMode: selected ? "outlined" : "text",
                        elementAttr: { class: "mdl-display-group mdl-small-icon" },
                        template: (data, container) => {
                            $(container).html(`<i class="dx-icon fa-light ${chartType.iconName}"></i>`);
                        },
                        onInitialized: e => { this._chartTypeButtonInstances[chartType.type] = e.component; },
                        onClick: () => {
                            const current = new Set(this.properties.chartType ?? []);
                            if (current.has(chartType.type)) {
                                if (current.size > 1)
                                    current.delete(chartType.type);
                            } else {
                                current.add(chartType.type);
                            }
                            this.setPropertyCommand("chartType", [...current]);
                            this.refreshChartTypeButtons();
                        }
                    });
                }
                wrapper.appendTo($container);
            }
        }];
        listItems.push({
            text: "Auto Scale",
            buildControl: $container => {
                $('<div>').appendTo($container).dxSwitch({
                    value: this.properties.autoScale === true,
                    onInitialized: e => { this._autoScaleSwitchInstance = e.component; },
                    onValueChanged: e => {
                        this.properties.autoScale = e.value;
                        if (e.value) {
                            this.properties.domainOverride = null;
                            this.chart.resetDomainOverride();
                        } else {
                            const currentDomain = this.chart.renderState?.domain;
                            if (currentDomain) {
                                this.properties.domainOverride = { ...currentDomain };
                                this.chart.setDomainOverride(this.properties.domainOverride);
                            }
                        }
                        this.refreshDomainBoxes();
                        this.board.markDirty(this);
                    }
                });
            }
        });
        listItems.push({
            text: "Equal Scales",
            buildControl: $container => {
                $('<div>').appendTo($container).dxSwitch({
                    value: this.properties.equalScales === true,
                    onInitialized: e => { this._equalScalesSwitchInstance = e.component; },
                    onValueChanged: e => {
                        this.properties.equalScales = e.value;
                        this.chart.setOptions({ equalScales: e.value });
                        this.refreshDomainBoxes();
                        this.board.markDirty(this);
                    }
                });
            }
        });
        this._tangentColorPicker = this.createColorPickerEditor("tangentColor");
        listItems.push({
            text: "Tangent",
            buildControl: $container => $container.append(this._tangentColorPicker)
        });
        listItems.push({
            text: "Horizontal",
            buildControl: $container => {
                const wrapper = $('<div style="display: flex; gap: 6px;">');
                const disabled = this.properties.autoScale === true;
                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                    value: this.properties.domainOverride?.xMin ?? null,
                    placeholder: "Min",
                    disabled: disabled,
                    onInitialized: e => { this._xMinBoxInstance = e.component; },
                    onValueChanged: e => {
                        if (this.properties.autoScale === true)
                            return;
                        if (!this.properties.domainOverride)
                            this.properties.domainOverride = this.getDefaultDomainOverride();
                        this.properties.domainOverride.xMin = e.value;
                        this.chart.setDomainOverride(this.properties.domainOverride);
                        this.board.markDirty(this);
                    }
                }));
                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                    value: this.properties.domainOverride?.xMax ?? null,
                    placeholder: "Max",
                    disabled: disabled,
                    onInitialized: e => { this._xMaxBoxInstance = e.component; },
                    onValueChanged: e => {
                        if (this.properties.autoScale === true)
                            return;
                        if (!this.properties.domainOverride)
                            this.properties.domainOverride = this.getDefaultDomainOverride();
                        this.properties.domainOverride.xMax = e.value;
                        this.chart.setDomainOverride(this.properties.domainOverride);
                        this.board.markDirty(this);
                    }
                }));
                wrapper.appendTo($container);
            }
        });
        listItems.push({
            text: "Vertical",
            buildControl: $container => {
                const wrapper = $('<div style="display: flex; gap: 6px;">');
                const autoScale = this.properties.autoScale === true;
                const equalScales = this.properties.equalScales === true;
                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                    value: this.properties.domainOverride?.yMin ?? null,
                    placeholder: "Min",
                    disabled: autoScale || equalScales,
                    onInitialized: e => { this._yMinBoxInstance = e.component; },
                    onValueChanged: e => {
                        if (this.properties.autoScale === true)
                            return;
                        if (!this.properties.domainOverride)
                            this.properties.domainOverride = this.getDefaultDomainOverride();
                        this.properties.domainOverride.yMin = e.value;
                        this.chart.setDomainOverride(this.properties.domainOverride);
                        this.board.markDirty(this);
                    }
                }));
                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                    value: this.properties.domainOverride?.yMax ?? null,
                    placeholder: "Max",
                    disabled: autoScale || equalScales,
                    onInitialized: e => { this._yMaxBoxInstance = e.component; },
                    onValueChanged: e => {
                        if (this.properties.autoScale === true)
                            return;
                        if (!this.properties.domainOverride)
                            this.properties.domainOverride = this.getDefaultDomainOverride();
                        this.properties.domainOverride.yMax = e.value;
                        this.chart.setDomainOverride(this.properties.domainOverride);
                        this.board.markDirty(this);
                    }
                }));
                wrapper.appendTo($container);
            }
        });
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 400, width: "100%" });
        const grid = $('<div class="mdl-dropdown-grid">');
        for (const item of listItems) {
            grid.append(`<span class="mdl-dropdown-grid-label">${item.text}</span>`);
            const control = $('<div class="mdl-dropdown-grid-control">');
            item.buildControl(control);
            grid.append(control);
        }
        grid.appendTo($(contentElement).dxScrollView("instance").content());
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
        const xPart = xTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` : "";
        const separator = (xTerm && firstYTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
        const yPart = firstYTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${firstYTerm}</span></span>` : "";
        const extraCount = yTerms.length - 1;
        const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
        if (!xPart && !yPart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${xPart}${separator}${yPart}${extraPart}`;
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
    }

    refreshChartTypeButtons() {
        const selected = new Set(this.properties.chartType ?? []);
        for (const [type, instance] of Object.entries(this._chartTypeButtonInstances ?? {}))
            instance?.option("stylingMode", selected.has(type) ? "outlined" : "text");
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
        this.refreshChartTypeButtons();
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
        this.properties.chartType = ["line"];
        this.properties.autoScale = true;
        this.properties.equalScales = false;
        this.properties.tangentColor = "#00000000";
        this.properties.xTerm = this.board.calculator.properties.independent.name;
        this.properties.yTerms = [{ term: this.board.calculator.getDefaultTerm(), case: 1, color: "", showLabel: false }];
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
            chartType: this.properties.chartType,
            argumentField: "argument",
            series: [],
            argumentTitle: "",
            valueTitle: "",
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            borderColor: this.getBorderColor(),
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            onDomainChanged: domain => this.onDomainChanged(domain),
            onTickDragStarted: () => this.onTickDragStarted(),
            onTickDragEnded: () => this.onTickDragEnded()
        };
    }

    onDomainChanged(domain) {
        this.properties.autoScale = false;
        this.properties.domainOverride = domain;
        this._autoScaleSwitchInstance?.option("value", false);
        this.refreshDomainBoxes();
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
        this.chartDataConfig = null;
        this.chart = new ChartControl(element, this.getChartControlOptions());
        if (this.properties.domainOverride && this.properties.autoScale !== true)
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
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
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
                equalScales: config.equalScales,
                tangentColor: config.tangentColor,
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
