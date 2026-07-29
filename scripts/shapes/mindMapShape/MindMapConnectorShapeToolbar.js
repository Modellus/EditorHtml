var MindMapConnectorShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, MindMapConnectorShapeToolbarMixin.createToolbar);
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
                    this.createConnectorTypeDropDownButton(container);
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
                    this.createConnectorLabelDropDownButton(container);
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
    getTipTypeItems(end) {
        const directionIcons = end === "start"
            ? { arrow: "fa-light fa-arrow-left", closed: "fa-light fa-left-long", diamond: "fa-light fa-diamond" }
            : { arrow: "fa-light fa-arrow-right", closed: "fa-light fa-right-long", diamond: "fa-light fa-diamond" };
        return [
            { key: "none", icon: "fa-light fa-dash" },
            { key: "arrow", icon: directionIcons.arrow },
            { key: "closed", icon: directionIcons.closed },
            { key: "point", icon: "fa-solid fa-circle-small" },
            { key: "diamond", icon: directionIcons.diamond }
        ];
    },
    createTipTypeButtonGroup($container, end) {
        const property = end === "start" ? "startTipType" : "endTipType";
        $('<div>').dxButtonGroup({
            items: this.getTipTypeItems(end),
            keyExpr: "key",
            selectedItemKeys: [this.properties[property]],
            stylingMode: "outlined",
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="font-size: 14px"></i>`;
            },
            onSelectionChanged: event => {
                if (event.addedItems.length > 0)
                    this.setPropertyCommand(property, event.addedItems[0].key);
            }
        }).appendTo($container);
    },
    getConnectorTypeItems() {
        return [
            { key: "straight", icon: "fa-light fa-arrow-right" },
            { key: "curved", icon: "fa-light fa-arrow-turn-right" },
            { key: "orthogonal", icon: "fa-light fa-arrow-trend-up" }
        ];
    },
    connectorTypeIcon() {
        return this.getConnectorTypeItems().find(item => item.key === this.properties.routing)?.icon ?? "fa-light fa-arrow-turn-right";
    },
    refreshConnectorTypeButtonIcon() {
        const instance = this._connectorTypeDropdownElement?.dxDropDownButton("instance");
        instance?.option("icon", this.connectorTypeIcon());
    },
    createConnectorTypeDropDownButton(container) {
        this._connectorTypeDropdownElement = $('<div class="mdl-mindmap-connector-type-selector">');
        this._connectorTypeDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: this.connectorTypeIcon(),
            onInitialized: event => Utils.createTranslatedTooltip(event, "Connector Type Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildConnectorTypeMenuContent(contentElement)
            }
        });
        this._connectorTypeDropdownElement.appendTo(container);
    },
    buildConnectorTypeMenuContent(contentElement) {
        const listItems = [
            {
                text: this.board.translations.get("Connector Start Tip"),
                buildControl: $container => this.createTipTypeButtonGroup($container, "start")
            },
            {
                text: this.board.translations.get("Connector End Tip"),
                buildControl: $container => this.createTipTypeButtonGroup($container, "end")
            },
            {
                text: this.board.translations.get("Connector Type"),
                buildControl: $container => {
                    $('<div>').dxButtonGroup({
                        items: this.getConnectorTypeItems(),
                        keyExpr: "key",
                        selectedItemKeys: [this.properties.routing],
                        stylingMode: "outlined",
                        buttonTemplate: (data, buttonContainer) => {
                            buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="font-size: 14px"></i>`;
                        },
                        onSelectionChanged: event => {
                            if (event.addedItems.length > 0)
                                this.setPropertyCommand("routing", event.addedItems[0].key);
                        }
                    }).appendTo($container);
                }
            },
            {
                text: this.board.translations.get("Connector Line Style"),
                buildControl: $container => {
                    $('<div>').dxButtonGroup({
                        items: [
                            { key: "solid", icon: "fa-light fa-hyphen" },
                            { key: "dashed", icon: "fa-light fa-ellipsis" }
                        ],
                        keyExpr: "key",
                        selectedItemKeys: [this.properties.lineStyle],
                        stylingMode: "outlined",
                        buttonTemplate: (data, buttonContainer) => {
                            buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="font-size: 14px"></i>`;
                        },
                        onSelectionChanged: event => {
                            if (event.addedItems.length > 0)
                                this.setPropertyCommand("lineStyle", event.addedItems[0].key);
                        }
                    }).appendTo($container);
                }
            },
            {
                text: this.board.translations.get("Connector Line Width"),
                buildControl: $container => {
                    $('<div>').dxSlider({
                        min: 1,
                        max: 20,
                        step: 1,
                        value: this.properties.lineWidth,
                        width: 120,
                        tooltip: { enabled: true, showMode: "onHover", position: "top" },
                        onValueChanged: event => {
                            if (event.event)
                                this.setPropertyCommand("lineWidth", event.value);
                        }
                    }).appendTo($container);
                }
            }
        ];
        this.buildConnectorMenuList(contentElement, listItems);
    },
    createConnectorLabelDropDownButton(container) {
        this._connectorLabelDropdownElement = $('<div class="mdl-mindmap-label-selector">');
        this._connectorLabelDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-text",
            onInitialized: event => Utils.createTranslatedTooltip(event, "Connector Label Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildConnectorLabelMenuContent(contentElement)
            }
        });
        this._connectorLabelDropdownElement.appendTo(container);
    },
    buildConnectorLabelMenuContent(contentElement) {
        const listItems = [
            {
                text: this.board.translations.get("Connector Label"),
                buildControl: $container => {
                    $('<div>').dxTextBox({
                        value: this.properties.text,
                        width: 160,
                        stylingMode: "filled",
                        valueChangeEvent: "change blur",
                        onInitialized: event => { this._connectorLabelTextBox = event.component; },
                        onValueChanged: event => this.setPropertyCommand("text", event.value)
                    }).appendTo($container);
                }
            },
            {
                text: this.board.translations.get("Connector Label Position"),
                buildControl: $container => {
                    $('<div>').dxSlider({
                        min: 0,
                        max: 1,
                        step: 0.05,
                        value: this.properties.textPosition,
                        width: 120,
                        tooltip: { enabled: true, showMode: "onHover", position: "top" },
                        onValueChanged: event => {
                            if (event.event)
                                this.setPropertyCommand("textPosition", event.value);
                        }
                    }).appendTo($container);
                }
            },
            {
                text: this.board.translations.get("Mind Map Font Size"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.fontSize,
                        min: 8,
                        max: 48,
                        step: 1,
                        showSpinButtons: true,
                        width: 90,
                        stylingMode: "filled",
                        onValueChanged: event => this.setPropertyCommand("fontSize", event.value)
                    }).appendTo($container);
                }
            },
            {
                text: this.board.translations.get("Mind Map Text Color"),
                buildControl: $container => $container.append(this.createColorPickerEditor("textColor"))
            }
        ];
        this.buildConnectorMenuList(contentElement, listItems);
    },
    buildConnectorMenuList(contentElement, listItems) {
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
    }
};
if (typeof MindMapConnectorShape !== "undefined") Object.assign(MindMapConnectorShape.prototype, MindMapConnectorShapeToolbarMixin);
