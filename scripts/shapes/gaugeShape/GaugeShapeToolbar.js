var GaugeShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, GaugeShapeToolbarMixin.createToolbar);
        this._termControl = this.createTermControl("term", "Value");
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
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createGaugeSettingsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createGaugeRangesDropDownButton(container);
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
    createGaugeSettingsDropDownButton(itemElement) {
        this._gaugeSettingsDropdownElement = $('<div class="mdl-gauge-settings-selector">');
        this._gaugeSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-ruler-vertical",
            onInitialized: e => Utils.createTranslatedTooltip(e, "Gauge Settings Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-gauge-settings-popup"),
                width: 420,
                contentTemplate: contentElement => this.buildGaugeSettingsMenuContent(contentElement)
            }
        });
        this._gaugeSettingsDropdownElement.appendTo(itemElement);
    },
    createGaugeRangesDropDownButton(itemElement) {
        this._gaugeRangesDropdownElement = $('<div class="mdl-gauge-ranges-selector">');
        this._gaugeRangesDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-bar-progress-half",
            onInitialized: e => Utils.createTranslatedTooltip(e, "Gauge Ranges Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-gauge-ranges-popup"),
                width: 420,
                contentTemplate: contentElement => this.buildGaugeRangesMenuContent(contentElement)
            }
        });
        this._gaugeRangesDropdownElement.appendTo(itemElement);
    },
    getGaugeToolbarRange() {
        if (typeof this.getGaugeRange === "function")
            return this.getGaugeRange();
        return { minimum: this.properties.minimum, maximum: this.properties.maximum };
    },
    refreshGaugeScaleControls() {
        const range = this.getGaugeToolbarRange();
        const autoScale = this.properties.autoScale === true;
        this._gaugeAutoScaleSwitchInstance?.option("value", autoScale);
        this._gaugeMinimumBoxInstance?.option({ value: range.minimum, disabled: autoScale });
        this._gaugeMaximumBoxInstance?.option({ value: range.maximum, disabled: autoScale });
    },
    setGaugeAutoScale(autoScale) {
        if (!autoScale) {
            const range = this.getGaugeToolbarRange();
            this.setPropertyCommand("minimum", range.minimum);
            this.setPropertyCommand("maximum", range.maximum);
        }
        this.setPropertyCommand("autoScale", autoScale);
        this.refreshGaugeScaleControls();
    },
    createGaugeRangesControl(container) {
        container[0].innerHTML = `<div class="mdl-gauge-ranges-editor"><div class="mdl-gauge-ranges-list"></div></div>`;
        const listElement = container.find(".mdl-gauge-ranges-list");
        listElement.dxList({
            dataSource: this.properties.ranges,
            scrollingEnabled: false,
            noDataText: "No color ranges",
            itemTemplate: (data, index, element) => this.renderGaugeRangeItem(data, index, element)
        });
        this._gaugeRangesListInstance = listElement.dxList("instance");
    },
    buildGaugeRangesMenuContent(contentElement) {
        $(contentElement).empty();
        const container = $('<div class="mdl-gauge-ranges-menu">').appendTo(contentElement);
        $('<div class="mdl-gauge-menu-title">Ranges</div>').appendTo(container);
        this.createGaugeRangesControl($('<div>').appendTo(container));
    },
    renderGaugeRangeItem(data, index, element) {
        const invalidClass = this.isGaugeRangeInvalid(index) ? " mdl-missing-term" : "";
        element[0].innerHTML = `<div class="mdl-gauge-range-row${invalidClass}"><label class="mdl-gauge-range-field"><span>Start</span><div class="mdl-gauge-range-minimum"></div></label><label class="mdl-gauge-range-field"><span>End</span><div class="mdl-gauge-range-maximum"></div></label><div class="mdl-gauge-range-color"></div><div class="mdl-gauge-range-delete"></div></div>`;
        $(element).find(".mdl-gauge-range-minimum").dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, width: 90 }), {
            value: data.minimum,
            placeholder: "Start",
            onValueChanged: e => this.updateGaugeRange(index, "minimum", e.value)
        }));
        $(element).find(".mdl-gauge-range-maximum").dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, width: 90 }), {
            value: data.maximum,
            placeholder: "End",
            onValueChanged: e => this.updateGaugeRange(index, "maximum", e.value)
        }));
        this.getColorControl().createEditor(data.color, value => this.updateGaugeRange(index, "color", value), { className: "mdl-gauge-range-color-picker" }).appendTo($(element).find(".mdl-gauge-range-color"));
        if (this.isGaugeRangeComplete(data))
            $(element).find(".mdl-gauge-range-delete").dxButton({
                stylingMode: "text",
                template: (_, buttonElement) => { buttonElement[0].innerHTML = `<i class="fa-light fa-trash-can"></i>`; },
                onClick: () => this.removeGaugeRange(index)
            });
    },
    createEmptyGaugeRange() {
        return { minimum: null, maximum: null, color: "transparent" };
    },
    isGaugeRangeComplete(range) {
        return range.minimum != null && range.maximum != null;
    },
    appendEmptyGaugeRange(ranges) {
        if (ranges.length === 0 || this.isGaugeRangeComplete(ranges[ranges.length - 1]))
            return [...ranges, this.createEmptyGaugeRange()];
        return ranges;
    },
    isGaugeRangeInvalid(index) {
        const range = this.properties.ranges[index];
        if (!this.isGaugeRangeComplete(range))
            return false;
        const rangeStart = Math.min(range.minimum, range.maximum);
        const rangeEnd = Math.max(range.minimum, range.maximum);
        for (let otherIndex = 0; otherIndex < this.properties.ranges.length; otherIndex++) {
            if (otherIndex === index)
                continue;
            const otherRange = this.properties.ranges[otherIndex];
            if (!this.isGaugeRangeComplete(otherRange))
                continue;
            const otherStart = Math.min(otherRange.minimum, otherRange.maximum);
            const otherEnd = Math.max(otherRange.minimum, otherRange.maximum);
            if (Math.max(rangeStart, otherStart) < Math.min(rangeEnd, otherEnd))
                return true;
        }
        return false;
    },
    updateGaugeRange(index, property, value) {
        const updatedRanges = this.properties.ranges.map((range, rangeIndex) => rangeIndex === index ? { ...range, [property]: value } : range);
        const ranges = this.appendEmptyGaugeRange(updatedRanges);
        this.setPropertyCommand("ranges", ranges);
        this._gaugeRangesListInstance?.option("dataSource", ranges);
    },
    removeGaugeRange(index) {
        const ranges = this.appendEmptyGaugeRange(this.properties.ranges.filter((_, rangeIndex) => rangeIndex !== index));
        this.setPropertyCommand("ranges", ranges);
        this._gaugeRangesListInstance?.option("dataSource", ranges);
    },
    buildGaugeSettingsMenuContent(contentElement) {
        const listItems = [
            {
                text: "Auto Scale",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.autoScale === true,
                        onInitialized: e => { this._gaugeAutoScaleSwitchInstance = e.component; },
                        onValueChanged: e => this.setGaugeAutoScale(e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Minimum",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.getGaugeToolbarRange().minimum,
                        disabled: this.properties.autoScale === true,
                        onInitialized: e => { this._gaugeMinimumBoxInstance = e.component; },
                        onValueChanged: e => {
                            if (this.properties.autoScale === true)
                                return;
                            this.setPropertyCommand("minimum", e.value);
                        }
                    })).appendTo($container);
                }
            },
            {
                text: "Maximum",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.getGaugeToolbarRange().maximum,
                        disabled: this.properties.autoScale === true,
                        onInitialized: e => { this._gaugeMaximumBoxInstance = e.component; },
                        onValueChanged: e => {
                            if (this.properties.autoScale === true)
                                return;
                            this.setPropertyCommand("maximum", e.value);
                        }
                    })).appendTo($container);
                }
            },
            {
                text: "Tick step",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0 }), {
                        value: this.properties.precision,
                        onValueChanged: e => this.setPropertyCommand("precision", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Snap to ticks",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.snapToTick === true,
                        onValueChanged: e => this.setPropertyCommand("snapToTick", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Start angle (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.startAngle,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        onValueChanged: e => this.setPropertyCommand("startAngle", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "End angle (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.endAngle,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        onValueChanged: e => this.setPropertyCommand("endAngle", e.value)
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 360, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => Utils.renderDropdownListItem(element, data)
        });
        this.refreshGaugeScaleControls();
    }
};
if (typeof GaugeShape !== "undefined") Object.assign(GaugeShape.prototype, GaugeShapeToolbarMixin);
