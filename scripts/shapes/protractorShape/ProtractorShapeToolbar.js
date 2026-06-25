var ProtractorShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ProtractorShapeToolbarMixin.createToolbar);
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
                    this.createScaleDropDownButton(container);
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
    createScaleDropDownButton(container) {
        this._scaleDropdownContainer = container;
        this._scaleDropdownElement = $('<div>');
        this._scaleDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Scale Tooltip", this.board.translations, 280),
            icon: "fa-light fa-ruler",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildScaleMenuContent(contentElement)
            }
        });
        this._scaleDropdownElement.appendTo(container);
    },
    buildScaleMenuContent(contentElement) {
        const useRadians = this.getAngleUnit() === "radians";
        const angleMax = useRadians ? 2 : 360;
        const listItems = [
            {
                text: this.board.translations.get("AngleUnit"),
                buildControl: $container => this.createAngleUnitButtonGroup($container)
            },
            {
                text: "Scale",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0.000001 }), {
                        value: this.properties.scale,
                        onValueChanged: e => this.setPropertyCommand("scale", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Start angle",
                buildControl: $container => {
                    $('<div>').dxNumberBox(this.getAngleNumberEditorOptions(useRadians, angleMax, this.properties.startAngle, "startAngle")).appendTo($container);
                }
            },
            {
                text: "End angle",
                buildControl: $container => {
                    $('<div>').dxNumberBox(this.getAngleNumberEditorOptions(useRadians, angleMax, this.properties.endAngle, "endAngle")).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 250, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-control"));
            }
        });
    },
    createAngleUnitButtonGroup(container) {
        $('<div>').dxButtonGroup({
            items: [
                { key: "radians", icon: "fa-light fa-pi", hint: "Radians" },
                { key: "degrees", icon: "fa-light fa-dot", hint: "Degrees" }
            ],
            keyExpr: "key",
            selectedItemKeys: [this.getAngleUnit()],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon" },
            buttonTemplate: (data, buttonContainer) => {
                const style = data.key === "degrees" ? "font-size:20px; position:relative; top:-4px" : "";
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="${style}"></i>`;
            },
            onContentReady: e => this.initAngleUnitPill(e.element[0]),
            onSelectionChanged: e => {
                if (e.addedItems.length > 0)
                    this.setAngleUnitCommand(e.addedItems[0].key);
                this.moveAngleUnitPill(e.component.element()[0]);
                e.component.repaint();
            }
        }).appendTo(container);
    },
    initAngleUnitPill(element) {
        const pill = document.createElement("div");
        pill.className = "mdl-pill";
        element.style.position = "relative";
        element.appendChild(pill);
        this.moveAngleUnitPill(element);
    },
    moveAngleUnitPill(element) {
        const pill = element.querySelector(".mdl-pill");
        if (!pill)
            return;
        const selected = element.querySelector(".dx-item-selected .dx-button");
        if (!selected)
            return;
        pill.style.left = selected.offsetLeft + "px";
        pill.style.width = selected.offsetWidth + "px";
    },
    applyAngleSuffix(numberBoxElement, angleSuffix) {
        const host = $(numberBoxElement);
        host.find(".mdl-numberbox-angle-suffix").remove();
        const input = host.find(".dx-texteditor-input");
        input.css("padding-right", "20px");
        const inputContainer = host.find(".dx-texteditor-input-container");
        if (!inputContainer.length)
            return;
        inputContainer.css("position", "relative");
        const suffix = $("<span class='mdl-numberbox-angle-suffix'></span>");
        suffix.text(angleSuffix);
        suffix.css({ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: angleSuffix === "\u00ba" ? "20px" : "14px", lineHeight: "1", opacity: "0.8" });
        inputContainer.append(suffix);
    },
    getAngleNumberEditorOptions(useRadians, angleMax, value, propertyName) {
        const angleSuffix = useRadians ? "\u03c0" : "\u00ba";
        return Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: true, min: 0, max: angleMax }), {
            value: value,
            step: 0.01,
            format: { type: "fixedPoint", precision: 2 },
            onInitialized: e => this.applyAngleSuffix(e.element, angleSuffix),
            onContentReady: e => this.applyAngleSuffix(e.element, angleSuffix),
            onValueChanged: e => this.setPropertyCommand(propertyName, e.value)
        });
    }
};
if (typeof ProtractorShape !== "undefined") Object.assign(ProtractorShape.prototype, ProtractorShapeToolbarMixin);
