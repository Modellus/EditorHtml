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
            allowNumericTermReference: true,
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
            return { termLatex: "", caseNumber: null, isMissingTerm: false };
        const displayedTerm = Utils.buildTermWithUnitsLatex(Utils.formatMathTermName(this.formatTermForDisplay(normalizedTerm)), this.getTermUnitText(normalizedTerm));
        const isMissingTerm = this.isMissingTermReference(normalizedTerm);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return { termLatex: displayedTerm, caseNumber: null, isMissingTerm: isMissingTerm };
        const normalizedCaseNumber = TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => this.normalizeYTermValue(value));
        return { termLatex: displayedTerm, caseNumber: normalizedCaseNumber, isMissingTerm: isMissingTerm };
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
        this._axisRangeControl = this.createAxisRangeControl();
        listItems.push({ text: "Horizontal", buildControl: $container => this._axisRangeControl.createRow("x").appendTo($container) });
        listItems.push({ text: "Vertical", buildControl: $container => this._axisRangeControl.createRow("y").appendTo($container) });
        Utils.renderDropdownMenuScroll(contentElement, 400, scrollContent => {
            const grid = $('<div class="mdl-dropdown-grid">');
            for (const item of listItems) {
                grid.append(`<span class="mdl-dropdown-grid-label">${item.text}</span>`);
                const control = $('<div class="mdl-dropdown-grid-control">');
                item.buildControl(control);
                grid.append(control);
            }
            grid.appendTo(scrollContent);
        });
    },
    // The chart's ends live in its domain override, and are only its own to set while it is not
    // scaling itself; the axis type sits on the same row.
    createAxisRangeControl() {
        return new AxisRangeControl({
            read: (axis, bound) => this.getEditedDomain()?.[`${axis}${bound}`] ?? null,
            write: (axis, bound, value) => {
                if (!this.properties.domainOverride)
                    this.properties.domainOverride = this.getDefaultDomainOverride();
                this.properties.domainOverride[`${axis}${bound}`] = value;
                this.chart.setDomainOverride(this.properties.domainOverride);
                this.board.markDirty(this);
            },
            isDisabled: axis => this.properties.autoScale === true || (axis === "y" && this.properties.equalScales === true),
            editorOptions: () => this.getPrecisionNumberEditorOptions({ showSpinButtons: false }),
            trailing: axis => this.createAxisTypeButtonGroup(`${axis}AxisType`)
        });
    },
    // While the chart is scaling itself the boxes show what it worked out; once it is not, they show
    // what they have been set to.
    getEditedDomain() {
        return this.properties.autoScale === true ? this.chart?.renderState?.domain : this.properties.domainOverride;
    },
    createAxisTypeButtonGroup(axisProperty) {
        const currentType = this.properties[axisProperty] || "decimal";
        const container = $('<div>');
        container.dxButtonGroup({
            items: [
                { key: "decimal", text: "0" },
                { key: "pi", text: "π" }
            ],
            keyExpr: "key",
            selectedItemKeys: [currentType],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group" },
            onContentReady: e => this.initAxisTypePill(e.element[0]),
            onSelectionChanged: e => {
                if (e.addedItems.length === 0)
                    return;
                this.properties[axisProperty] = e.addedItems[0].key;
                this.chart.setOptions({ [axisProperty]: e.addedItems[0].key });
                this.moveAxisTypePill(e.component.element()[0]);
                e.component.repaint();
                this.board.markDirty(this);
            }
        });
        return container;
    },
    initAxisTypePill(element) {
        const pill = document.createElement("div");
        pill.className = "mdl-pill";
        element.style.position = "relative";
        element.appendChild(pill);
        this.moveAxisTypePill(element);
    },
    moveAxisTypePill(element) {
        const pill = element.querySelector(".mdl-pill");
        if (!pill)
            return;
        const selected = element.querySelector(".dx-item-selected .dx-button");
        if (!selected)
            return;
        pill.style.left = selected.offsetLeft + "px";
        pill.style.width = selected.offsetWidth + "px";
    },
    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", buildControl: $container => $container.append(this._xTermControl) },
            { text: "Vertical", buildControl: $container => $container.append(this.createYTermsControl()) }
        );
    },
    renderTermsButtonTemplate(element) {
        renderChartTermsToolbarButton(this, element);
    },
    refreshDomainBoxes() {
        this._axisRangeControl?.refresh();
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
