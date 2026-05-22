Object.assign(GaugeShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(GaugeShape.prototype).createToolbar.call(this);
        this._angleTermControl = this.createTermControl("angleTerm", "Angle");
        this._magnitudeTermControl = this.createTermControl("magnitudeTerm", "Magnitude");
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
            onInitialized: e => Utils.createTranslatedTooltip(e, "Gauge Settings Tooltip", this.board.translations, 280),
            buttonTemplate: (data, element) => this.renderGaugeSettingsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildGaugeSettingsMenuContent(contentElement)
            }
        });
        this._gaugeSettingsDropdownElement.appendTo(itemElement);
    },
    renderGaugeSettingsButtonTemplate(element) {
        element.innerHTML = `<i class="fa-light fa-dial" style="font-size:14px"></i>`;
    },
    buildGaugeSettingsMenuContent(contentElement) {
        const listItems = [
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
            },
            {
                text: "Angle step (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.anglePrecision,
                        min: 0,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        format: { type: "fixedPoint", precision: 0 },
                        onValueChanged: e => this.setPropertyCommand("anglePrecision", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Snap angle",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.snapToAngleTick === true,
                        onValueChanged: e => this.setPropertyCommand("snapToAngleTick", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Min magnitude",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.minimumMagnitude,
                        onValueChanged: e => this.setPropertyCommand("minimumMagnitude", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Max magnitude",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.maximumMagnitude,
                        onValueChanged: e => this.setPropertyCommand("maximumMagnitude", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Magnitude step",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0 }), {
                        value: this.properties.magnitudePrecision,
                        onValueChanged: e => this.setPropertyCommand("magnitudePrecision", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Snap magnitude",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.snapToMagnitudeTick === true,
                        onValueChanged: e => this.setPropertyCommand("snapToMagnitudeTick", e.value)
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 350, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
    }
});
