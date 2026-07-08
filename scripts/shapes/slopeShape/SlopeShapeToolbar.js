var SlopeShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, SlopeShapeToolbarMixin.createToolbar);
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
                    this.createSlopeSettingsDropDownButton(container);
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
                    this.createFlipButton(container, "fa-light fa-reflect-horizontal", "flippedHorizontally", "Flip Horizontal Tooltip");
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFlipButton(container, "fa-light fa-reflect-vertical", "flippedVertically", "Flip Vertical Tooltip");
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
    createFlipButton(itemElement, iconClass, property, tooltipKey) {
        const buttonElement = $('<div>');
        buttonElement.dxButton({
            stylingMode: "text",
            onInitialized: e => Utils.createTranslatedTooltip(e, tooltipKey, this.board.translations, 280),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="${iconClass}"></i></span>`;
            },
            onClick: () => this.setPropertyCommand(property, this.properties[property] !== true)
        });
        buttonElement.appendTo(itemElement);
    },
    createSlopeSettingsDropDownButton(itemElement) {
        this._slopeSettingsDropdownElement = $('<div class="mdl-slope-settings-selector">');
        this._slopeSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Slope Settings Tooltip", this.board.translations, 280),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-ruler-triangle"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildSlopeSettingsMenuContent(contentElement)
            }
        });
        this._slopeSettingsDropdownElement.appendTo(itemElement);
    },
    buildSlopeSettingsMenuContent(contentElement) {
        const listItems = [
            this.createSlopeNumberListItem("Horizontal minimum", "horizontalMinimum"),
            this.createSlopeNumberListItem("Horizontal maximum", "horizontalMaximum"),
            this.createSlopeTicksListItem("Horizontal ticks", "horizontalMajorTicks"),
            this.createSlopeNumberListItem("Vertical minimum", "verticalMinimum"),
            this.createSlopeNumberListItem("Vertical maximum", "verticalMaximum"),
            this.createSlopeTicksListItem("Vertical ticks", "verticalMajorTicks")
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 320, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-control"));
            }
        });
    },
    createSlopeNumberListItem(text, property) {
        return {
            text: text,
            buildControl: container => {
                $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                    value: this.properties[property],
                    onValueChanged: e => this.setPropertyCommand(property, e.value)
                })).appendTo(container);
            }
        };
    },
    createSlopeTicksListItem(text, property) {
        return {
            text: text,
            buildControl: container => {
                $('<div>').dxNumberBox({
                    value: this.properties[property],
                    min: 1,
                    showSpinButtons: true,
                    step: 1,
                    stylingMode: "filled",
                    format: { type: "fixedPoint", precision: 0 },
                    onValueChanged: e => this.setPropertyCommand(property, e.value)
                }).appendTo(container);
            }
        };
    }
};
if (typeof SlopeShape !== "undefined") Object.assign(SlopeShape.prototype, SlopeShapeToolbarMixin);
