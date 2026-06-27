var RulerShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, RulerShapeToolbarMixin.createToolbar);
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
                    this.createRulerSettingsDropDownButton(container);
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
    createRulerSettingsDropDownButton(itemElement) {
        this._rulerSettingsDropdownElement = $('<div class="mdl-ruler-settings-selector">');
        this._rulerSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Ruler Settings Tooltip", this.board.translations, 280),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-ruler-combined"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildRulerSettingsMenuContent(contentElement)
            }
        });
        this._rulerSettingsDropdownElement.appendTo(itemElement);
    },
    buildRulerSettingsMenuContent(contentElement) {
        const listItems = [
            {
                text: "Scale",
                buildControl: container => this.createScaleTypeButtonGroup(container)
            },
            {
                text: "Minimum",
                buildControl: container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.minimum,
                        onValueChanged: e => this.setPropertyCommand("minimum", e.value)
                    })).appendTo(container);
                }
            },
            {
                text: "Maximum",
                buildControl: container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.maximum,
                        onValueChanged: e => this.setPropertyCommand("maximum", e.value)
                    })).appendTo(container);
                }
            },
            {
                text: "Major ticks",
                buildControl: container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.majorTicks,
                        min: 1,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        format: { type: "fixedPoint", precision: 0 },
                        onValueChanged: e => this.setPropertyCommand("majorTicks", e.value)
                    }).appendTo(container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 220, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-control"));
            }
        });
    },
    createScaleTypeButtonGroup(container) {
        const currentType = this.properties.scaleType || "linear";
        const t = key => this.board.translations.get(key);
        $('<div>').dxButtonGroup({
            items: [
                { key: "linear", text: t("Scale Linear") },
                { key: "logarithmic", text: t("Scale Logarithmic") }
            ],
            keyExpr: "key",
            selectedItemKeys: [currentType],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group" },
            onContentReady: e => this.initScaleTypePill(e.element[0]),
            onSelectionChanged: e => {
                if (e.addedItems.length > 0)
                    this.setScaleTypeCommand(e.addedItems[0].key);
                this.moveScaleTypePill(e.component.element()[0]);
                e.component.repaint();
            }
        }).appendTo(container);
    },
    initScaleTypePill(element) {
        const pill = document.createElement("div");
        pill.className = "mdl-pill";
        element.style.position = "relative";
        element.appendChild(pill);
        this.moveScaleTypePill(element);
    },
    moveScaleTypePill(element) {
        const pill = element.querySelector(".mdl-pill");
        if (!pill) return;
        const selected = element.querySelector(".dx-item-selected .dx-button");
        if (!selected) return;
        pill.style.left = selected.offsetLeft + "px";
        pill.style.width = selected.offsetWidth + "px";
    }
};
if (typeof RulerShape !== "undefined") Object.assign(RulerShape.prototype, RulerShapeToolbarMixin);
