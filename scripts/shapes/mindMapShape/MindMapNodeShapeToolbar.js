var MindMapNodeShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, MindMapNodeShapeToolbarMixin.createToolbar);
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
                    this.createNodeStyleDropDownButton(container);
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
    createNodeStyleDropDownButton(container) {
        this._nodeStyleDropdownElement = $('<div class="mdl-mindmap-style-selector">');
        this._nodeStyleDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-font",
            onInitialized: event => Utils.createTranslatedTooltip(event, "Mind Map Style Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildNodeStyleMenuContent(contentElement)
            }
        });
        this._nodeStyleDropdownElement.appendTo(container);
    },
    buildNodeStyleMenuContent(contentElement) {
        const listItems = [
            {
                text: this.board.translations.get("Mind Map Font Size"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.fontSize,
                        min: 8,
                        max: 72,
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
            },
            {
                text: this.board.translations.get("Mind Map Border Width"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.lineWidth,
                        min: 0,
                        max: 20,
                        step: 1,
                        showSpinButtons: true,
                        width: 90,
                        stylingMode: "filled",
                        onValueChanged: event => this.setPropertyCommand("lineWidth", event.value)
                    }).appendTo($container);
                }
            }
        ];
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
if (typeof MindMapBubbleShape !== "undefined") Object.assign(MindMapBubbleShape.prototype, MindMapNodeShapeToolbarMixin);
if (typeof MindMapRectangleShape !== "undefined") Object.assign(MindMapRectangleShape.prototype, MindMapNodeShapeToolbarMixin);
if (typeof MindMapCircleShape !== "undefined") Object.assign(MindMapCircleShape.prototype, MindMapNodeShapeToolbarMixin);
