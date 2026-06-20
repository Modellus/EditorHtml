var ReferentialShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ReferentialShapeToolbarMixin.createToolbar);
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createAddShapeDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            }
        );
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
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createSettingsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            this.createRemoveToolbarItem()
        );
        return items;
    },
    renderSettingsButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-shape-color-btn"><i class="fa-light fa-ruler-combined"></i></span>`;
    },
    createSettingsDropDownButton(itemElement) {
        this._settingsDropdownElement = $('<div class="mdl-settings-selector">');
        this._displayOptionsItems = [
            { key: "showHorizontalAxis", hint: "Show horizontal axis", iconClass: "fa-square-half-stroke-horizontal" },
            { key: "showVerticalAxis", hint: "Show vertical axis", iconClass: "fa-square-half-stroke" },
            { key: "showTicksWithValues", hint: "Show ticks with values", iconClass: "fa-square-ellipsis" },
            { key: "showHorizontalGrid", hint: "Show horizontal grid lines", iconClass: "fa-border-center-h" },
            { key: "showVerticalGrid", hint: "Show vertical grid lines", iconClass: "fa-border-center-v" }
        ];
        this._settingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Display Settings Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderSettingsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 280,
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $(contentElement).dxScrollView({ height: 450, width: "100%" });
                    const scrollContent = $(contentElement).dxScrollView("instance").content();
                    const listItems = [
                        {
                            text: "Display",
                            buildControl: $p => {
                                const wrapper = $('<div style="display: flex; gap: 6px;">');
                                this._displayButtonInstances = {};
                                const selectedKeys = this.getDisplayOptionKeys();
                                for (const item of this._displayOptionsItems) {
                                    const selected = selectedKeys.includes(item.key);
                                    $('<div>').appendTo(wrapper).dxButton({
                                        stylingMode: selected ? "outlined" : "text",
                                        elementAttr: { class: "mdl-display-group mdl-small-icon" },
                                        hint: item.hint,
                                        template: (data, container) => {
                                            $(container).html(`<i class="dx-icon fa-light ${item.iconClass}"></i>`);
                                        },
                                        onInitialized: e => { this._displayButtonInstances[item.key] = e.component; },
                                        onClick: () => {
                                            this.properties[item.key] = !this.properties[item.key];
                                            this._displayButtonInstances[item.key]?.option("stylingMode", this.properties[item.key] ? "outlined" : "text");
                                            this.tick();
                                            this.board.markDirty(this);
                                        }
                                    });
                                }
                                wrapper.appendTo($p);
                            }
                        },
                        {
                            text: "Auto Scale",
                            buildControl: $p => {
                                $('<div>').dxSwitch({
                                    value: this.properties.autoScale !== false,
                                    onInitialized: e => { this._autoScaleSwitchInstance = e.component; },
                                    onValueChanged: e => {
                                        this.properties.autoScale = e.value;
                                        this.refreshDomainBoxes();
                                        this.tick();
                                        this.board.markDirty(this);
                                    }
                                }).appendTo($p);
                            }
                        },
                        {
                            text: "Horizontal Scale",
                            buildControl: $p => {
                                $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: this.properties.scaleX,
                                    onInitialized: e => { this._scaleXBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        this.properties.scaleX = e.value;
                                        this.tick();
                                        this.board.markDirty(this);
                                    }
                                })).appendTo($p);
                            }
                        },
                        {
                            text: "Vertical Scale",
                            buildControl: $p => {
                                $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: this.properties.scaleY,
                                    onInitialized: e => { this._scaleYBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        this.properties.scaleY = e.value;
                                        this.tick();
                                        this.board.markDirty(this);
                                    }
                                })).appendTo($p);
                            }
                        },
                        {
                            text: "Equal Scales",
                            buildControl: $p => {
                                $('<div>').dxSwitch({
                                    value: this.properties.equalAxisScales === true,
                                    onInitialized: e => { this._equalScalesSwitchInstance = e.component; },
                                    onValueChanged: e => {
                                        this.properties.equalAxisScales = e.value;
                                        this.refreshDomainBoxes();
                                        this.tick();
                                        this.board.markDirty(this);
                                    }
                                }).appendTo($p);
                            }
                        },
                        {
                            text: "Horizontal",
                            buildControl: $p => {
                                const wrapper = $('<div style="display: flex; gap: 6px;">');
                                const domain = this.getVisibleDomain();
                                const disabled = this.properties.autoScale !== false;
                                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: domain.xMin,
                                    placeholder: "Min",
                                    disabled: disabled,
                                    onInitialized: e => { this._xMinBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        const d = this.getVisibleDomain();
                                        d.xMin = e.value;
                                        this.applyVisibleDomainX(d);
                                    }
                                }));
                                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: domain.xMax,
                                    placeholder: "Max",
                                    disabled: disabled,
                                    onInitialized: e => { this._xMaxBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        const d = this.getVisibleDomain();
                                        d.xMax = e.value;
                                        this.applyVisibleDomainX(d);
                                    }
                                }));
                                wrapper.appendTo($p);
                            }
                        },
                        {
                            text: "Vertical",
                            buildControl: $p => {
                                const wrapper = $('<div style="display: flex; gap: 6px;">');
                                const domain = this.getVisibleDomain();
                                const autoScale = this.properties.autoScale !== false;
                                const equalScales = this.properties.equalAxisScales === true;
                                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: domain.yMin,
                                    placeholder: "Min",
                                    disabled: autoScale || equalScales,
                                    onInitialized: e => { this._yMinBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        const d = this.getVisibleDomain();
                                        d.yMin = e.value;
                                        this.applyVisibleDomainY(d);
                                    }
                                }));
                                $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                                    value: domain.yMax,
                                    placeholder: "Max",
                                    disabled: autoScale || equalScales,
                                    onInitialized: e => { this._yMaxBoxInstance = e.component; },
                                    onValueChanged: e => {
                                        if (this.properties.autoScale !== false)
                                            return;
                                        const d = this.getVisibleDomain();
                                        d.yMax = e.value;
                                        this.applyVisibleDomainY(d);
                                    }
                                }));
                                wrapper.appendTo($p);
                            }
                        },
                        {
                            text: "Snap to Ticks",
                            buildControl: $p => {
                                $('<div>').dxSwitch({
                                    value: this.properties.snapToTicks === true,
                                    onInitialized: e => { this._snapToTicksSwitchInstance = e.component; },
                                    onValueChanged: e => {
                                        this.properties.snapToTicks = e.value;
                                        this.board.markDirty(this);
                                    }
                                }).appendTo($p);
                            }
                        }
                    ];
                    const grid = $('<div class="mdl-dropdown-grid">');
                    for (const item of listItems) {
                        if (item.fullWidth) {
                            const label = $(`<span class="mdl-dropdown-grid-label">${item.text}</span>`);
                            label.css("grid-column", "1 / -1");
                            grid.append(label);
                            const fullWidthControl = $('<div class="mdl-dropdown-grid-full">');
                            item.buildControl(fullWidthControl);
                            grid.append(fullWidthControl);
                        } else {
                            grid.append(`<span class="mdl-dropdown-grid-label">${item.text}</span>`);
                            const control = $('<div class="mdl-dropdown-grid-control">');
                            item.buildControl(control);
                            grid.append(control);
                        }
                    }
                    grid.appendTo(scrollContent);
                }
            }
        });
        this._settingsDropdownElement.appendTo(itemElement);
    },
    createBackgroundImageDropZoneEditor() {
        this._backgroundImageDropZoneControl = new ImageControl({
            imageSource: this.properties.backgroundImageUrl ?? "",
            accept: "image/*",
            dropHint: "Drop an image or click to select",
            onUploadFile: (file, onProgress) => this.board.assetManager.uploadAsset(this.id + "-background", file, file.name, onProgress),
            onImageChanged: (url) => {
                this._backgroundImageVersion = Date.now();
                this._backgroundImageDropZoneControl.setImageSource(`${url}?_v=${this._backgroundImageVersion}`);
                this.setPropertyCommand("backgroundImageUrl", url);
            },
            onImageCleared: () => this.setPropertyCommand("backgroundImageUrl", "")
        });
        return this._backgroundImageDropZoneControl.createHost();
    }
};
if (typeof ReferentialShape !== "undefined") Object.assign(ReferentialShape.prototype, ReferentialShapeToolbarMixin);
