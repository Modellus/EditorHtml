function getFrequencySeriesDefaults() {
    return { aggregate: FrequencyAggregation.defaultFunction, axis: "primary", mark: "bar" };
}

function normalizeFrequencySeriesItem(sourceItem, normalizedItem) {
    const defaults = getFrequencySeriesDefaults();
    normalizedItem.aggregate = FrequencyAggregation.normalize(sourceItem?.aggregate ?? defaults.aggregate);
    normalizedItem.axis = sourceItem?.axis === "secondary" ? "secondary" : "primary";
    normalizedItem.mark = FrequencyChartControl.markShapes.includes(sourceItem?.mark) ? sourceItem.mark : defaults.mark;
}

function getFrequencySeriesMutationOptions(shape) {
    return {
        includeColor: true,
        normalizeTermValue: value => TermControl.normalizeTermValue(value),
        normalizeColorValue: value => TermControl.normalizeColorValue(value),
        normalizeItem: (sourceItem, normalizedItem) => normalizeFrequencySeriesItem(sourceItem, normalizedItem),
        createEmptyItem: () => getFrequencySeriesDefaults()
    };
}

function getFrequencyMarkItems() {
    return [
        { value: "bar", text: "Bar", icon: "fa-light fa-chart-simple" },
        { value: "circle", text: "Circle", icon: "fa-light fa-circle" },
        { value: "square", text: "Square", icon: "fa-light fa-square" },
        { value: "triangle", text: "Triangle", icon: "fa-light fa-triangle" },
        { value: "diamond", text: "Diamond", icon: "fa-light fa-diamond" }
    ];
}

function getFrequencyMarkItem(mark) {
    return getFrequencyMarkItems().find(entry => entry.value === mark) ?? getFrequencyMarkItems()[0];
}

function getFrequencySeriesMarkup(item) {
    const markItem = getFrequencyMarkItem(item?.mark ?? "bar");
    return `<i class="${markItem.icon} shape-term-secondary-icon"></i><span class="frequency-series-function">${FrequencyAggregation.getMark(item?.aggregate)}</span>`;
}

var FrequencyChartShapeToolbarMixin = {
    normalizeSeries() {
        const sourceSeries = Array.isArray(this.properties.series) ? this.properties.series : [];
        this.properties.series = sourceSeries.map(sourceItem => {
            const normalizedItem = { ...sourceItem, term: TermControl.normalizeTermValue(sourceItem?.term), case: sourceItem?.case ?? 1, color: TermControl.normalizeColorValue(sourceItem?.color) };
            normalizeFrequencySeriesItem(sourceItem, normalizedItem);
            return normalizedItem;
        }).filter(item => item.term !== "");
        TermControl.normalizeShapeTermsCollection(this, "series", getFrequencySeriesMutationOptions(this));
    },
    getSelectedSeries() {
        return TermControl.getSelectedShapeTermsCollection(this, "series", getFrequencySeriesMutationOptions(this));
    },
    createSeriesControl() {
        this.normalizeSeries();
        this._seriesControl = TermControl.createShapeTermsCollectionControl(this, "series", {
            hostClassName: "shape-terms-control frequency-series-control",
            listClassName: "shape-terms-list frequency-series-list",
            rowClassName: "shape-term-row frequency-series-row",
            dragHandleClassName: "shape-term-drag-handle frequency-series-drag-handle",
            includeColor: true,
            includeVisibility: true,
            allowNumericTermReference: false,
            colorSelection: {
                getValue: (item, index) => this.getSeriesControlDisplayColor(item, index)
            },
            normalizeTermValue: value => TermControl.normalizeTermValue(value),
            normalizeColorValue: value => TermControl.normalizeColorValue(value),
            normalizeItem: (sourceItem, normalizedItem) => normalizeFrequencySeriesItem(sourceItem, normalizedItem),
            createEmptyItem: () => getFrequencySeriesDefaults(),
            features: [{
                label: "Series",
                className: "shape-term-frequency-series",
                editorType: "dxDropDownButton",
                getValue: item => FrequencyAggregation.normalize(item?.aggregate),
                getItems: () => [],
                buttonTemplate: (element, item) => {
                    $(element).empty().append(`<div class="shape-term-secondary-button frequency-series-button">${getFrequencySeriesMarkup(item)}</div>`);
                },
                // A series is read as the mark it is drawn with and the function it makes of the
                // readings under it, so the chip carries the same pair the button behind it does.
                chipTemplate: item => getFrequencySeriesMarkup(item),
                dropDownOptions: (item, index) => ({
                    width: 268,
                    contentTemplate: contentElement => this.buildSeriesMenuContent(contentElement, index)
                })
            }]
        });
        return this._seriesControl.createHost();
    },
    refreshSeriesControl() {
        this._seriesControl?.refresh();
    },
    // What a series makes of the readings in a category, what it is drawn with, and which of the two
    // value axes it is measured against — the three things that belong to one series and to nothing
    // else on the chart, gathered behind the mark that stands for it in its row.
    buildSeriesMenuContent(contentElement, index) {
        const listItems = [
            { text: "Function", buildControl: $container => this.createSeriesFunctionEditor($container, index) },
            { text: "Mark", buildControl: $container => this.createSeriesMarkEditor($container, index) },
            { text: "Values", buildControl: $container => this.createSeriesAxisEditor($container, index) }
        ];
        Utils.renderDropdownMenuScroll(contentElement, 300, scrollContent => {
            const grid = $('<div class="mdl-dropdown-grid">');
            for (const item of listItems) {
                grid.append(`<span class="mdl-dropdown-grid-label">${this.board.translations.get(item.text) ?? item.text}</span>`);
                const control = $('<div class="mdl-dropdown-grid-control">');
                item.buildControl(control);
                grid.append(control);
            }
            grid.appendTo(scrollContent);
        });
    },
    getSeriesItem(index) {
        return this.properties.series?.[index] ?? getFrequencySeriesDefaults();
    },
    applySeriesMutation(index, mutate) {
        TermControl.applyShapeTermsCollectionMutation(this, "series", getFrequencySeriesMutationOptions(this), items => {
            if (items[index])
                mutate(items[index]);
        });
        this.refreshSeriesControl();
    },
    createSeriesFunctionEditor($container, index) {
        $('<div class="mdl-frequency-function-selector">').appendTo($container).dxSelectBox({
            items: FrequencyAggregation.functions.map(entry => ({ value: entry.value, text: this.board.translations.get(entry.label) ?? entry.label })),
            valueExpr: "value",
            displayExpr: "text",
            value: FrequencyAggregation.normalize(this.getSeriesItem(index).aggregate),
            stylingMode: "filled",
            dropDownOptions: { container: document.body, wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup mdl-frequency-function-popup") },
            onValueChanged: event => this.applySeriesMutation(index, item => { item.aggregate = event.value; })
        });
    },
    // The mark is chosen from a list that shows each one drawn, so what a series will look like is
    // read off the list rather than off the name of a shape.
    createSeriesMarkEditor($container, index) {
        $('<div class="mdl-frequency-mark-selector">').appendTo($container).dxSelectBox({
            items: getFrequencyMarkItems().map(entry => ({ value: entry.value, icon: entry.icon, text: this.board.translations.get(entry.text) ?? entry.text })),
            valueExpr: "value",
            displayExpr: "text",
            value: this.getSeriesItem(index).mark ?? "bar",
            stylingMode: "filled",
            fieldTemplate: (itemData, element) => this.renderSeriesMarkField(itemData, element),
            itemTemplate: (itemData, _, element) => Utils.renderIconListItem(element, itemData.icon, itemData.text),
            dropDownOptions: { container: document.body, wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup mdl-frequency-mark-popup") },
            onValueChanged: event => this.applySeriesMutation(index, item => { item.mark = event.value; })
        });
    },
    // The closed field shows the mark drawn beside its name. The text of it is a box of its own
    // because a select box is written through one, and it is read-only: the mark is picked, not typed.
    renderSeriesMarkField(itemData, element) {
        const markItem = getFrequencyMarkItem(itemData?.value ?? "bar");
        const field = $('<div class="mdl-frequency-mark-field">').appendTo(element);
        field.append(`<i class="dx-icon ${markItem.icon} mdl-frequency-mark-icon"></i>`);
        $('<div class="mdl-frequency-mark-text">').appendTo(field).dxTextBox({
            value: this.board.translations.get(markItem.text) ?? markItem.text,
            readOnly: true,
            stylingMode: "filled"
        });
    },
    // Which edge a series is read against is named by where that edge is, and where it is depends on
    // which way the chart is turned: the same two axes run down the sides of an upright chart and
    // along the foot and the head of one laid on its side.
    getSeriesAxisItems() {
        if (this.properties.orientation === "horizontal")
            return [{ key: "primary", text: "Bottom", icon: "fa-light fa-border-bottom" }, { key: "secondary", text: "Top", icon: "fa-light fa-border-top" }];
        return [{ key: "primary", text: "Left", icon: "fa-light fa-border-left" }, { key: "secondary", text: "Right", icon: "fa-light fa-border-right" }];
    },
    // The edge itself, drawn, rather than the word for it: which side of the frame a series is read
    // against is a place on the chart, and the picture of that place says it in any language.
    createSeriesAxisEditor($container, index) {
        const buttonGroup = $('<div>').appendTo($container);
        buttonGroup.dxButtonGroup({
            items: this.getSeriesAxisItems().map(entry => ({ key: entry.key, icon: entry.icon, hint: this.board.translations.get(entry.text) ?? entry.text })),
            keyExpr: "key",
            selectedItemKeys: [this.getSeriesItem(index).axis === "secondary" ? "secondary" : "primary"],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group" },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onSelectionChanged: event => {
                if (event.addedItems.length === 0)
                    return;
                this.applySeriesMutation(index, item => { item.axis = event.addedItems[0].key; });
                Utils.movePillButtonGroup(event.component.element()[0]);
            }
        });
    },
    getSeriesControlDisplayColor(item, index) {
        const explicitColor = TermControl.normalizeColorValue(item?.color);
        if (explicitColor !== "")
            return explicitColor;
        const renderedColor = this.chart?.renderState?.series?.[index]?.color;
        return renderedColor ?? Utils.getColorByIndex(index);
    },
    shouldShowCaseLabelForTerm(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term, value => TermControl.normalizeTermValue(value));
    },
    getTermLabelWithCase(term, caseNumber = 1) {
        const normalizedTerm = TermControl.normalizeTermValue(term);
        if (normalizedTerm === "")
            return { termLatex: "", caseNumber: null, isMissingTerm: false };
        const displayedTerm = Utils.buildTermWithUnitsLatex(Utils.formatMathTermName(this.formatTermForDisplay(normalizedTerm)), this.getTermUnitText(normalizedTerm));
        const isMissingTerm = this.isMissingTermReference(normalizedTerm);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return { termLatex: displayedTerm, caseNumber: null, isMissingTerm: isMissingTerm };
        return { termLatex: displayedTerm, caseNumber: TermControl.getShapeCaseNumber(this, normalizedTerm, caseNumber, value => TermControl.normalizeTermValue(value)), isMissingTerm: isMissingTerm };
    },
    // A series is named by what it makes of its term rather than by the term alone, so the axis it is
    // read against says "count of z" and not "z". Counting carries no unit into that name: however
    // the term is measured, how many times it was read is a bare number.
    getSeriesName(series) {
        const normalizedTerm = TermControl.normalizeTermValue(series.term);
        if (normalizedTerm === "")
            return { termLatex: "", caseNumber: null, isMissingTerm: false };
        const termName = Utils.formatMathTermName(this.formatTermForDisplay(normalizedTerm));
        const functionLatex = `\\mathrm{${FrequencyAggregation.getMark(series.aggregate)}}\\left(${termName}\\right)`;
        const unitText = FrequencyAggregation.isDimensionless(series.aggregate) ? "" : this.getTermUnitText(normalizedTerm);
        const isMissingTerm = this.isMissingTermReference(normalizedTerm);
        const termLatex = Utils.buildTermWithUnitsLatex(functionLatex, unitText);
        if (!this.shouldShowCaseLabelForTerm(normalizedTerm))
            return { termLatex: termLatex, caseNumber: null, isMissingTerm: isMissingTerm };
        return { termLatex: termLatex, caseNumber: TermControl.getShapeCaseNumber(this, normalizedTerm, series.case ?? 1, value => TermControl.normalizeTermValue(value)), isMissingTerm: isMissingTerm };
    },
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, FrequencyChartShapeToolbarMixin.createToolbar);
        this.normalizeSeries();
        this._categoryTermControl = this.createTermControl("categoryTerm", "Categories", false);
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
                    this.createFrequencySettingsDropDownButton(container);
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
    createFrequencySettingsDropDownButton(container) {
        this._settingsDropdownElement = $('<div class="mdl-frequency-settings-selector">');
        this._settingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Frequency Chart Settings Tooltip", this.board.translations, 280),
            icon: "fa-light fa-sliders",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 300,
                contentTemplate: contentElement => this.buildFrequencySettingsMenuContent(contentElement)
            }
        });
        this._settingsDropdownElement.appendTo(container);
    },
    buildFrequencySettingsMenuContent(contentElement) {
        this._settingsMenuContentElement = contentElement;
        const listItems = [];
        listItems.push({
            text: "Orientation",
            buildControl: $container => this.createOrientationButtonGroup($container)
        });
        listItems.push({
            text: "Auto Scale",
            buildControl: $container => {
                $('<div>').appendTo($container).dxSwitch({
                    value: this.properties.autoScale === true,
                    onInitialized: e => { this._autoScaleSwitchInstance = e.component; },
                    onValueChanged: e => {
                        this.properties.autoScale = e.value;
                        if (e.value)
                            this.properties.valueRange = { primaryMin: null, primaryMax: null, secondaryMin: null, secondaryMax: null };
                        else
                            this.properties.valueRange = this.getMeasuredValueRange();
                        this.setPropertyCommand("valueRange", this.properties.valueRange);
                        this.refreshValueRangeBoxes();
                        this.board.markDirty(this);
                    }
                });
            }
        });
        this._valueRangeControl = this.createValueRangeControl();
        for (const axisItem of this.getSeriesAxisItems())
            listItems.push({ text: axisItem.text, buildControl: $container => this._valueRangeControl.createRow(axisItem.key).appendTo($container) });
        Utils.renderDropdownMenuScroll(contentElement, 400, scrollContent => {
            const grid = $('<div class="mdl-dropdown-grid">');
            for (const item of listItems) {
                grid.append(`<span class="mdl-dropdown-grid-label">${this.board.translations.get(item.text) ?? item.text}</span>`);
                const control = $('<div class="mdl-dropdown-grid-control">');
                item.buildControl(control);
                grid.append(control);
            }
            grid.appendTo(scrollContent);
        });
    },
    createOrientationButtonGroup($container) {
        const buttonGroup = $('<div>').appendTo($container);
        buttonGroup.dxButtonGroup({
            items: [
                { key: "vertical", icon: "fa-light fa-chart-column", hint: this.board.translations.get("Vertical") ?? "Vertical" },
                { key: "horizontal", icon: "fa-light fa-chart-bar", hint: this.board.translations.get("Horizontal") ?? "Horizontal" }
            ],
            keyExpr: "key",
            selectedItemKeys: [this.properties.orientation === "horizontal" ? "horizontal" : "vertical"],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group" },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onSelectionChanged: event => {
                if (event.addedItems.length === 0)
                    return;
                this.setPropertyCommand("orientation", event.addedItems[0].key);
                Utils.movePillButtonGroup(event.component.element()[0]);
                if (this._settingsMenuContentElement)
                    this.buildFrequencySettingsMenuContent(this._settingsMenuContentElement);
                this.board.markDirty(this);
            }
        });
    },
    // Each value axis runs between ends of its own, and they are only the chart's to be set while it
    // is not scaling itself.
    createValueRangeControl() {
        return new AxisRangeControl({
            axes: ["primary", "secondary"],
            read: (axis, bound) => this.getEditedValueRange()[`${axis}${bound}`] ?? null,
            write: (axis, bound, value) => {
                this.properties.valueRange = { ...this.properties.valueRange, [`${axis}${bound}`]: value };
                this.setPropertyCommand("valueRange", this.properties.valueRange);
                this.board.markDirty(this);
            },
            isDisabled: () => this.properties.autoScale === true,
            editorOptions: () => this.getPrecisionNumberEditorOptions({ showSpinButtons: false })
        });
    },
    getEditedValueRange() {
        return this.properties.autoScale === true ? this.getMeasuredValueRange() : (this.properties.valueRange ?? {});
    },
    getMeasuredValueRange() {
        const domains = this.chart?.renderState?.domains;
        if (!domains)
            return { primaryMin: null, primaryMax: null, secondaryMin: null, secondaryMax: null };
        return { primaryMin: domains.primary.min, primaryMax: domains.primary.max, secondaryMin: domains.secondary.min, secondaryMax: domains.secondary.max };
    },
    refreshValueRangeBoxes() {
        this._valueRangeControl?.refresh();
    },
    buildTermsMenuContent(contentElement) {
        BaseShape.prototype.buildTermsMenuContent.call(this, contentElement);
        $(contentElement).addClass("mdl-frequency-terms-menu");
    },
    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Categories", buildControl: $container => $container.append(this._categoryTermControl) },
            { text: "Values", buildControl: $container => $container.append(this.createSeriesControl()) }
        );
    },
    renderTermsButtonTemplate(element) {
        renderFrequencyTermsToolbarButton(this, element);
    },
    showContextToolbar() {
        this.termFormControls["categoryTerm"]?.termControl?.refresh();
        this.refreshSeriesControl();
        this.refreshTermsToolbarControl();
        this.refreshValueRangeBoxes();
        this._autoScaleSwitchInstance?.option("value", this.properties.autoScale === true);
        return BaseShape.prototype.showContextToolbar.call(this);
    }
};
if (typeof FrequencyChartShape !== "undefined") Object.assign(FrequencyChartShape.prototype, FrequencyChartShapeToolbarMixin);
