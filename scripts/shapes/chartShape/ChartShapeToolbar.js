function getChartYTermDefaultTypes(shape) {
    return [shape.properties?.chartType ?? shape.block?.chartType ?? "line"];
}

function normalizeChartYTermItem(shape, sourceItem, normalizedItem) {
    normalizedItem.chartTypes = Array.isArray(sourceItem?.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : getChartYTermDefaultTypes(shape);
}

function getChartYTermsMutationOptions(shape) {
    return {
        includeColor: true,
        normalizeTermValue: value => shape.normalizeYTermValue(value),
        normalizeColorValue: value => shape.normalizeYTermColor(value),
        normalizeItem: (sourceItem, normalizedItem) => normalizeChartYTermItem(shape, sourceItem, normalizedItem),
        createEmptyItem: () => ({ chartTypes: getChartYTermDefaultTypes(shape) })
    };
}

function getChartYTermTypeItems() {
    return [
        { value: "scatter", text: "Scatter", icon: "fa-light fa-chart-scatter" },
        { value: "line", text: "Line", icon: "fa-light fa-chart-line" },
        { value: "area", text: "Area", icon: "fa-light fa-chart-area" },
        { value: "bar", text: "Bar", icon: "fa-light fa-chart-column" }
    ];
}

var ChartShapeToolbarMixin = {
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
            normalizeItem: (sourceItem, normalizedItem) => normalizeChartYTermItem(this, sourceItem, normalizedItem),
            createEmptyItem: () => ({ chartTypes: getChartYTermDefaultTypes(this) }),
            lock: {
                width: "auto",
                editorType: "dxDropDownButton",
                valueExpr: "value",
                getValue: item => item?.chartTypes ?? getChartYTermDefaultTypes(this),
                getItems: () => getChartYTermTypeItems(),
                buttonTemplate: element => {
                    $(element).empty().append(`<div class="shape-term-secondary-button" style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fa-light fa-chart-mixed shape-term-secondary-icon"></i></div>`);
                },
                itemTemplate: (itemData, itemIndex, element, item) => {
                    const selectedTypes = item?.chartTypes ?? getChartYTermDefaultTypes(this);
                    const isSelected = selectedTypes.includes(itemData.value);
                    const chartTypeIconsLight = { scatter: "fa-light fa-chart-scatter", line: "fa-light fa-chart-line", area: "fa-light fa-chart-area", bar: "fa-light fa-chart-column" };
                    const chartTypeIconsSolid = { scatter: "fa-solid fa-chart-scatter", line: "fa-solid fa-chart-line", area: "fa-solid fa-chart-area", bar: "fa-solid fa-chart-column" };
                    const iconClass = isSelected ? (chartTypeIconsSolid[itemData.value] ?? "fa-solid fa-chart-line") : (chartTypeIconsLight[itemData.value] ?? "fa-light fa-chart-line");
                    $(element).empty().append(`<div class="shape-term-secondary-item" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;"><i class="${iconClass} shape-term-secondary-icon"></i><span>${itemData.text}</span></div>`);
                },
                dropDownOptions: { width: 140 },
                onValueChanged: (index, clickedType) => {
                    TermControl.applyShapeTermsCollectionMutation(this, "yTerms", getChartYTermsMutationOptions(this), items => {
                        if (!items[index])
                            return;
                        const currentTypes = items[index].chartTypes ?? getChartYTermDefaultTypes(this);
                        const typeIndex = currentTypes.indexOf(clickedType);
                        if (typeIndex >= 0) {
                            if (currentTypes.length > 1)
                                items[index].chartTypes = currentTypes.filter(typeName => typeName !== clickedType);
                        } else {
                            items[index].chartTypes = [...currentTypes, clickedType];
                        }
                    });
                }
            }
        });
        return this._yTermsControl.createHost();
    },
    refreshYTermsControl() {
        if (!this._yTermsControl)
            return;
        this._yTermsControl.refresh();
    },
    normalizeYTerms() {
        const sourceYTerms = Array.isArray(this.properties.yTerms) ? this.properties.yTerms : (this.properties.yTerms ? [this.properties.yTerms] : []);
        this.properties.yTerms = sourceYTerms.map(sourceItem => {
            if (sourceItem && typeof sourceItem === "object") {
                return {
                    ...sourceItem,
                    term: this.normalizeYTermValue(sourceItem.term),
                    chartTypes: Array.isArray(sourceItem.chartTypes) && sourceItem.chartTypes.length > 0 ? sourceItem.chartTypes : getChartYTermDefaultTypes(this)
                };
            }
            return {
                term: this.normalizeYTermValue(sourceItem),
                case: 1,
                color: "",
                chartTypes: getChartYTermDefaultTypes(this)
            };
        }).filter(item => item.term !== "");
        TermControl.normalizeShapeTermsCollection(this, "yTerms", getChartYTermsMutationOptions(this));
    },
    getSelectedYTerms() {
        return TermControl.getSelectedShapeTermsCollection(this, "yTerms", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeYTermValue(value),
            normalizeColorValue: value => this.normalizeYTermColor(value),
            normalizeItem: (sourceItem, normalizedItem) => normalizeChartYTermItem(this, sourceItem, normalizedItem)
        });
    },
    shouldShowCaseLabelForTerm(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term, value => this.normalizeYTermValue(value));
    },
    getTermLabelWithCase(term, caseNumber = 1) {
        const normalizedTerm = this.normalizeYTermValue(term);
        if (normalizedTerm === "")
            return { termLatex: "", caseNumber: null };
        const displayedTerm = this.formatTermForDisplay(normalizedTerm);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return { termLatex: displayedTerm, caseNumber: null };
        const normalizedCaseNumber = TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => this.normalizeYTermValue(value));
        return { termLatex: displayedTerm, caseNumber: normalizedCaseNumber };
    },
    getSeriesValueFieldName(index) {
        return `series${index}`;
    },
    getSeriesName(yTerm) {
        return this.getTermLabelWithCase(yTerm.term, yTerm.case);
    },
    getXTermName() {
        return this.normalizeYTermValue(this.properties.xTerm);
    },
    getXTermCaseNumber() {
        return TermControl.getShapeCaseNumber(this, this.getXTermName(), this.properties.xTermCase ?? 1, value => this.normalizeYTermValue(value));
    },
    normalizeYTermValue(value) {
        return TermControl.normalizeTermValue(value);
    },
    normalizeYTermColor(value) {
        return TermControl.normalizeColorValue(value);
    },
    getYTermControlDisplayColor(item, index) {
        const explicitColor = this.normalizeYTermColor(item?.color);
        if (explicitColor !== "")
            return explicitColor;
        const renderedColor = this.chart?.renderState?.series?.[index]?.color;
        if (renderedColor)
            return renderedColor;
        return Utils.getColorByIndex(index);
    },
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ChartShapeToolbarMixin.createToolbar);
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
    },
    createChartTypeDropDownButton(container) {
        this._chartTypeDropdownElement = $('<div class="mdl-chart-type-selector">');
        this._chartTypeDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Chart Type Tooltip", this.board.translations, 280),
            icon: "fa-light fa-chart-mixed",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 280,
                contentTemplate: contentElement => this.buildChartTypeMenuContent(contentElement)
            }
        });
        this._chartTypeDropdownElement.appendTo(container);
    },
    buildChartTypeMenuContent(contentElement) {
        const listItems = [];
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
    },
    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $container => $container.append(this._xTermControl) },
            { text: "Vertical", stacked: true, buildControl: $container => $container.append(this.createYTermsControl()) }
        );
    },
    renderTermsButtonTemplate(element) {
        renderChartTermsToolbarButton(this, element);
    },
    refreshDomainBoxes() {
        refreshChartDomainEditorValues(this);
    },
    showContextToolbar() {
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.refreshYTermsControl();
        this.refreshTermsToolbarControl();
        this.refreshDomainBoxes();
        this._autoScaleSwitchInstance?.option("value", this.properties.autoScale === true);
        this._equalScalesSwitchInstance?.option("value", this.properties.equalScales === true);
        if (typeof BaseShape !== "undefined" && this instanceof BaseShape)
            return BaseShape.prototype.showContextToolbar.call(this);
        return NotebookShape.prototype.showContextToolbar.call(this);
    }
};
if (typeof ChartShape !== "undefined") Object.assign(ChartShape.prototype, ChartShapeToolbarMixin);
