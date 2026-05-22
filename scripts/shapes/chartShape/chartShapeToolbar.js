Object.assign(ChartShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(ChartShape.prototype).createToolbar.call(this);
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
    }
});
