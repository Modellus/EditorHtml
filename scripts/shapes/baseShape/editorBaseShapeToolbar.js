Object.assign(BaseShape.prototype, {
    createToolbar() {
        return [
            this.createPermissionsToolbarItem(),
            { location: "center", template: () => $('<div class="toolbar-separator">|</div>') }
        ];
    },
    createPermissionsToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createPermissionsDropDownButton(container);
                return container;
            }
        };
    },
    createPermissionsDropDownButton(itemElement) {
        this._permissionsDropdownElement = $('<div class="mdl-permissions-selector">');
        this._permissionsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Permissions Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderPermissionsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildPermissionsMenuContent(contentElement)
            }
        });
        this._permissionsDropdownElement.appendTo(itemElement);
    },
    buildPermissionsMenuContent(contentElement) {
        const $content = $(contentElement);
        $content.empty();
        $content[0].innerHTML = `<div class="mdl-permissions-menu">
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-visibility-host"></div><span class="mdl-permissions-menu-label">Visible</span></div>
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-lock-host"></div><span class="mdl-permissions-menu-label">Locked</span></div>
        </div>`;
        TermControl.createVisibilityCheckbox($content.find(".mdl-permissions-visibility-host"), this.properties.visibleToUsers, value => {
            this.setPropertyCommand("visibleToUsers", value);
            this.refreshPermissionsButtonIcon();
        });
        TermControl.createLockCheckbox($content.find(".mdl-permissions-lock-host"), this.properties.lockedForUsers, value => {
            this.setPropertyCommand("lockedForUsers", value);
            this.refreshPermissionsButtonIcon();
        });
    },
    createTermSelectorToolbarItem(termProperty, title, showVisibilityToggle = true) {
        const caseProperty = `${termProperty}Case`;
        const displayModeProperty = this.getTermDisplayModeProperty(termProperty);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
            this.termDisplayEntries.push({ term: termProperty, caseProperty: caseProperty, title: title });
        const mockFormInstance = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        return {
            location: "center",
            template: () => {
                const wrapper = $('<div style="width:160px"></div>');
                wrapper.append(this.createTermSelectorControl(mockFormInstance, termProperty, caseProperty, false, displayModeProperty, showVisibilityToggle));
                return wrapper;
            }
        };
    },
    createTermControl(termProperty, title, showVisibilityToggle = true) {
        const caseProperty = `${termProperty}Case`;
        const lockedProperty = `${termProperty}Locked`;
        const displayModeProperty = this.getTermDisplayModeProperty(termProperty);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[lockedProperty] == null)
            this.properties[lockedProperty] = false;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
            this.termDisplayEntries.push({ term: termProperty, caseProperty, title });
        const mockFormInstance = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        return this.createTermSelectorControl(mockFormInstance, termProperty, caseProperty, false, displayModeProperty, showVisibilityToggle);
    },
    createColorPickerEditor(dataField, options = {}) {
        const onValueChanged = value => this.setPropertyCommand(dataField, value);
        return this.getColorControl().createEditor(this.properties[dataField], onValueChanged, options);
    },
    createNameFormControl() {
        const control = $("<div>").addClass("name-packed-control");
        const visibilityHost = $("<div>").addClass("name-packed-control__button");
        const colorHost = $("<div>").addClass("name-packed-control__color");
        const inputHost = $("<div>").addClass("name-packed-control__input");
        const isVisible = this.properties.showName === true;
        control.append(visibilityHost, colorHost, inputHost);
        TermControl.createVisibilityCheckbox(visibilityHost, isVisible, value => {
            this.setPropertyCommand("showName", value);
        });
        const colorPicker = this.createColorPickerEditor("nameColor");
        colorPicker.addClass("name-packed-control__picker");
        this._nameColorPicker = colorPicker;
        colorHost.append(colorPicker);
        inputHost.dxTextBox({
            value: this.properties.name,
            stylingMode: "filled",
            onInitialized: e => { this._nameTextBoxInstance = e.component; },
            onValueChanged: event => {
                if (event.event)
                    this.setPropertyCommand("name", event.value);
            }
        });
        return control;
    },
    createAddShapeDropDownButton(itemElement) {
        this._addShapeElement = $('<div class="mdl-add-shape-selector">');
        this._addShapeElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Add Shape Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderAddShapeButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: this.getAddShapeMenuItems(),
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${data.icon}"></i><span class="mdl-dropdown-list-label">${data.text}</span></div>`;
                        },
                        onItemClick: e => {
                            window.shell?.commands?.addShape(e.itemData.key, e.itemData.type, this);
                            this._addShapeElement.dxDropDownButton("instance").close();
                        }
                    });
                }
            }
        });
        this._addShapeElement.appendTo(itemElement);
    },
    createShapeColorDropDownButton(itemElement) {
        this._fgColorPicker = this.createColorPickerEditor("foregroundColor");
        this._borderColorPicker = this.createColorPickerEditor("borderColor");
        this._shapeColorDropdownElement = $('<div class="mdl-shape-color-selector">');
        this._shapeColorDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Name Tooltip", this.board.translations, 280),
            buttonTemplate: (data, element) => this.renderShapeColorButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildShapeMenuContent(contentElement)
            }
        });
        this._shapeColorDropdownElement.appendTo(itemElement);
    },
    buildShapeMenuContent(contentElement) {
        const fgLabel = this.board.translations.get("Foreground Color") ?? "Foreground";
        const borderLabel = this.board.translations.get("Border Color") ?? "Border";
        const fgColor = this.properties.foregroundColor ?? "";
        const borderColor = this.properties.borderColor ?? "";
        const hasBorder = borderColor && borderColor !== "transparent";
        const shapeIconName = (BaseShape.shapeIcons[this.constructor.name] ?? "fa-light fa-shapes").split(" ")[1];
        const sections = [
            {
                text: "Colors",
                iconHtml: this.menuIconHtml(shapeIconName, !!fgColor),
                items: [
                    {
                        text: "Name",
                        stacked: true,
                        buildControl: $p => $p.append(this.createNameFormControl())
                    },
                    {
                        text: fgLabel,
                        iconHtml: this.menuIconHtml("fa-droplet", !!fgColor),
                        buildControl: $p => $p.append(this._fgColorPicker)
                    },
                    {
                        text: borderLabel,
                        iconHtml: this.menuIconHtml("fa-square", !!hasBorder),
                        buildControl: $p => $p.append(this._borderColorPicker)
                    }
                ]
            }
        ];
        this.populateShapeColorMenuSections(sections);
        const listItems = sections.flatMap(section => section.items);
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 300, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    },
    createRemoveToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createRemoveDropDownButton(container);
                return container;
            }
        };
    },
    createRemoveDropDownButton(itemElement) {
        this._removeDropdownElement = $('<div class="mdl-remove-selector">');
        this._removeDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Remove Tooltip", this.board.translations, 280),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 140,
                contentTemplate: contentElement => this.buildRemoveMenuContent(contentElement)
            }
        });
        this._removeDropdownElement.appendTo(itemElement);
    },
    buildRemoveMenuContent(contentElement) {
        const items = [
            { text: "Remove", icon: "fa-light fa-trash-can", action: () => this.remove() },
            { text: "Reset", icon: "fa-light fa-arrow-rotate-left", action: () => this.resetToDefaults() }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                const removeControl = this.getDropDownButtonInstance(this._removeDropdownElement);
                removeControl?.close();
                event.itemData.action();
            }
        });
    },
    createActionsToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createActionsDropDownButton(container);
                return container;
            }
        };
    },
    createActionsDropDownButton(itemElement) {
        const isMac = /mac/i.test(navigator.platform);
        const mod = isMac ? "⌘" : "Ctrl+";
        this._actionsDropdownElement = $('<div class="mdl-actions-selector">');
        this._actionsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Actions Tooltip", this.board.translations, 280),
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-ellipsis-vertical"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 220,
                contentTemplate: contentElement => this.buildActionsMenuContent(contentElement, mod)
            }
        });
        this._actionsDropdownElement.appendTo(itemElement);
    },
    buildActionsMenuContent(contentElement, mod) {
        const copySubItems = this.getCopySubMenuItems();
        const layerItems = [
            { text: "Bring to Front", icon: "fa-light fa-bring-front", shortcut: "", action: () => this.board.bringToFront(this) },
            { text: "Bring Forward", icon: "fa-light fa-bring-forward", shortcut: "", action: () => this.board.bringForward(this) },
            { text: "Send Backward", icon: "fa-light fa-send-backward", shortcut: "", action: () => this.board.sendBackward(this) },
            { text: "Send to Back", icon: "fa-light fa-send-back", shortcut: "", action: () => this.board.sendToBack(this) }
        ];
        const actionItems = [
            { text: "Copy", icon: "fa-light fa-copy", shortcut: `${mod}C`, action: () => this.copyToClipboard() },
            ...copySubItems.map(subItem => ({ ...subItem, isSubItem: true })),
            { text: "Paste", icon: "fa-light fa-paste", shortcut: `${mod}V`, action: () => BaseShape.pasteFromClipboard(this.board, this.parent) },
            { text: "Duplicate", icon: "fa-light fa-clone", shortcut: `${mod}D`, action: () => this.duplicate() }
        ];
        const close = () => this.getDropDownButtonInstance(this._actionsDropdownElement)?.close();
        const renderItem = (item) => {
            const indent = item.isSubItem ? "padding-left:24px;" : "";
            const shortcut = item.shortcut ? `<span style="color:#999;margin-left:auto">${item.shortcut}</span>` : "";
            return `<div class="mdl-dropdown-list-item" style="${indent}cursor:pointer" data-action-item><i class="dx-icon ${item.icon}"></i><span class="mdl-dropdown-list-label">${item.text}</span>${shortcut}</div>`;
        };
        const container = $(contentElement).empty()[0];
        const allItems = [...layerItems, ...actionItems];
        const markup = `<div class="mdl-actions-menu">
            ${layerItems.map(renderItem).join("")}
            <div class="mdl-actions-menu-separator"></div>
            ${actionItems.map(renderItem).join("")}
        </div>`;
        container.innerHTML = markup;
        container.querySelectorAll("[data-action-item]").forEach((element, index) => {
            element.addEventListener("click", () => {
                close();
                allItems[index]?.action?.();
            });
        });
    },
    createTermsDropDownButton(itemElement) {
        this._termsDropdownElement = $('<div class="mdl-terms-selector">');
        this._termsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Terms Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderTermsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildTermsMenuContent(contentElement)
            }
        });
        this._termsDropdownElement.appendTo(itemElement);
    },
    buildTermsMenuContent(contentElement) {
        this._termsMenuContentElement = contentElement;
        const listItems = [];
        this.populateTermsMenuSections(listItems);
        if ($(contentElement).data("dxScrollView"))
            $(contentElement).dxScrollView("instance").dispose();
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 300, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else if (data.parentSelector) {
                    data.buildControl($(el));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    },
    createTermPairFormControls(formAdapter) {
        const xDisplayMode = this.getTermDisplayModeProperty("xTerm");
        const yDisplayMode = this.getTermDisplayModeProperty("yTerm");
        const xDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "xTerm", "xTermCase", true, xDisplayMode, true);
        this.termFormControls["xTerm"] = { termControl: xDescriptor.termControl };
        const yDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "yTerm", "yTermCase", true, yDisplayMode, true);
        this.termFormControls["yTerm"] = { termControl: yDescriptor.termControl };
        return { xDescriptor, yDescriptor };
    }
});
