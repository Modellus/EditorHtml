function resolveShapeToolbarBaseItems(shape, currentCreateToolbar = null) {
    const injectedBaseResolver = shape?.toolbarAdapter?.getBaseToolbarItems;
    if (typeof injectedBaseResolver === "function")
        return injectedBaseResolver(shape) ?? [];

    let parentPrototype = null;
    if (typeof currentCreateToolbar === "function") {
        let ownerPrototype = Object.getPrototypeOf(shape);
        while (ownerPrototype) {
            const ownsCreateToolbar = Object.prototype.hasOwnProperty.call(ownerPrototype, "createToolbar");
            if (ownsCreateToolbar && ownerPrototype.createToolbar === currentCreateToolbar)
                break;
            ownerPrototype = Object.getPrototypeOf(ownerPrototype);
        }
        parentPrototype = ownerPrototype ? Object.getPrototypeOf(ownerPrototype) : null;
    }

    if (!parentPrototype) {
        const shapePrototype = Object.getPrototypeOf(shape);
        parentPrototype = shapePrototype ? Object.getPrototypeOf(shapePrototype) : null;
    }

    const createToolbar = parentPrototype?.createToolbar;
    if (typeof currentCreateToolbar === "function" && createToolbar === currentCreateToolbar)
        return [];
    if (typeof createToolbar !== "function")
        return [];
    return createToolbar.call(shape) ?? [];
}

const ShapeToolbarIconMap = {
    BodyShape: "fa-light fa-circle",
    PointShape: "fa-solid fa-dot",
    VectorShape: "fa-light fa-arrow-right-long",
    LineShape: "fa-light fa-slash-forward",
    ArcShape: "fa-light fa-circle-half-stroke",
    ChartShape: "fa-light fa-chart-line",
    TableShape: "fa-light fa-table",
    SliderShape: "fa-light fa-slider",
    ValueShape: "fa-light fa-input-numeric",
    MediaShape: "fa-light fa-photo-film-music",
    ExpressionShape: "fa-light fa-function",
    TextShape: "fa-light fa-text",
    QuestionShape: "fa-light fa-clipboard-question",
    RulerShape: "fa-light fa-ruler",
    ProtractorShape: "fa-light fa-angle",
    SlopeShape: "fa-light fa-ruler-triangle",
    ReferentialShape: "fa-light fa-shapes",
    GaugeShape: "fa-light fa-gauge",
    BodyNotebookShape: "fa-light fa-circle",
    PointNotebookShape: "fa-solid fa-dot",
    VectorNotebookShape: "fa-light fa-arrow-right-long",
    LineNotebookShape: "fa-light fa-slash-forward",
    ArcNotebookShape: "fa-light fa-circle-half-stroke",
    ChartNotebookShape: "fa-light fa-chart-line",
    TableNotebookShape: "fa-light fa-table",
    SliderNotebookShape: "fa-light fa-slider",
    ValueNotebookShape: "fa-light fa-input-numeric",
    MediaNotebookShape: "fa-light fa-photo-film-music",
    ExpressionNotebookShape: "fa-light fa-function",
    TextNotebookShape: "fa-light fa-text",
    QuestionNotebookShape: "fa-light fa-clipboard-question",
    RulerNotebookShape: "fa-light fa-ruler",
    ProtractorNotebookShape: "fa-light fa-angle",
    SlopeNotebookShape: "fa-light fa-ruler-triangle",
    ReferentialNotebookShape: "fa-light fa-shapes",
    GaugeNotebookShape: "fa-light fa-gauge"
};

function resolveShapeToolbarIcon(shape) {
    const injectedIcon = shape?.toolbarAdapter?.getShapeIcon?.(shape);
    if (injectedIcon)
        return injectedIcon;
    const baseShapeIcons = typeof BaseShape !== "undefined" ? BaseShape.shapeIcons : null;
    return baseShapeIcons?.[shape.constructor.name] ?? ShapeToolbarIconMap[shape.constructor.name] ?? "fa-light fa-shapes";
}

function resolveShapeToolbarPaste(shape) {
    const injectedPaste = shape?.toolbarAdapter?.pasteFromClipboard;
    if (typeof injectedPaste === "function")
        return () => injectedPaste(shape);
    if (typeof BaseShape !== "undefined" && typeof BaseShape.pasteFromClipboard === "function")
        return () => BaseShape.pasteFromClipboard(shape.board, shape.parent);
    return () => {};
}

function resolveShapeToolbarAnchorPoint(shape) {
    const injectedAnchorPoint = shape?.toolbarAdapter?.getScreenAnchorPoint;
    if (typeof injectedAnchorPoint === "function")
        return injectedAnchorPoint(shape);
    if (shape.container?.getBoundingClientRect) {
        const rect = shape.container.getBoundingClientRect();
        return {
            centerX: rect.left + rect.width / 2,
            bottomY: rect.bottom
        };
    }
    if (!shape.board?.svg)
        return null;
    const position = shape.getBoardPosition?.();
    if (!position)
        return null;
    const properties = shape.properties ?? {};
    const width = Number.isFinite(properties.width) ? properties.width : 0;
    const height = Number.isFinite(properties.height) ? properties.height : 0;
    const radius = Number.isFinite(properties.radius) ? properties.radius : null;
    const ctm = shape.board.svg.getScreenCTM();
    if (!ctm)
        return null;
    const centerX = radius != null ? position.x : position.x + width / 2;
    const centerY = radius != null ? position.y : position.y + height / 2;
    const bottomY = radius != null ? position.y + radius : position.y + height;
    const centerPoint = new DOMPoint(centerX, centerY).matrixTransform(ctm);
    const bottomPoint = new DOMPoint(centerX, bottomY).matrixTransform(ctm);
    return {
        centerX: centerPoint.x,
        bottomY: bottomPoint.y
    };
}

function resolveShapeToolbarOpacity(shape) {
    const opacity = parseFloat(shape?.properties?.opacity);
    if (!Number.isFinite(opacity))
        return 1;
    return Math.min(1, Math.max(0, opacity));
}

function resolveShapeToolbarBoardAction(shape, actionName) {
    const injectedAction = shape?.toolbarAdapter?.[actionName];
    if (typeof injectedAction === "function")
        return () => injectedAction(shape);
    if (typeof shape.board?.[actionName] === "function")
        return () => shape.board[actionName](shape);
    return () => {};
}

function resolveShapeToolbarCopyAction(shape) {
    if (typeof shape.copyToClipboard === "function")
        return () => shape.copyToClipboard();
    const injectedCopy = shape?.toolbarAdapter?.copyToClipboard;
    if (typeof injectedCopy === "function")
        return () => injectedCopy(shape);
    return () => {};
}

function finalizeShapeContextToolbarItems(shape, toolbarItems) {
    const resolvedItems = toolbarItems ?? [];
    if (!resolvedItems.length)
        return resolvedItems;
    const separator = { location: "center", template: () => $('<div class="toolbar-separator">|</div>') };
    resolvedItems.splice(resolvedItems.length - 1, 0, shape.createActionsToolbarItem(), separator);
    return resolvedItems;
}

var ShapeContextToolbarMixin = {
    initializeContextToolbar() {
        const toolbarItems = finalizeShapeContextToolbarItems(this, this.createToolbar?.() ?? []);
        if (!toolbarItems.length || !window.DevExpress?.ui?.dxToolbar)
            return;
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        $(toolbarHost).dxToolbar({ items: toolbarItems, width: "auto" });
        this.contextToolbar = toolbarHost;
        this.contextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    },
    showContextToolbar() {
        this.refreshNameToolbarControl?.();
        this.refreshShapeColorToolbarControl?.();
        this.refreshTermControlVisibilities?.();
        if (this.contextToolbar)
            this.contextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionContextToolbar()));
    },
    hideContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.remove("visible");
    },
    positionContextToolbar() {
        if (!this.contextToolbar)
            return;
        const anchorPoint = resolveShapeToolbarAnchorPoint(this);
        if (!anchorPoint)
            return;
        const toolbarRect = this.contextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.contextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.contextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = anchorPoint.centerX - toolbarWidth / 2;
        let top = anchorPoint.bottomY + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.contextToolbar.style.left = `${left}px`;
        this.contextToolbar.style.top = `${top}px`;
    }
};

var ShapeToolbarPresentationMixin = {
    getPermissionsIconClass() {
        const restrictions = [
            !this.properties.visibleToUsers,
            this.properties.lockedForUsers === true,
            this.properties.interactableForUsers === false
        ];
        const restrictedCount = restrictions.filter(Boolean).length;
        if (restrictedCount === 0)
            return "fa-regular fa-shield";
        if (restrictedCount === restrictions.length)
            return "fa-solid fa-shield";
        return "fa-solid fa-shield-halved";
    },
    renderPermissionsButtonTemplate(element) {
        element.innerHTML = `<i class="${this.getPermissionsIconClass()} mdl-permissions-icon"></i>`;
    },
    refreshPermissionsButtonIcon() {
        const icon = this._permissionsDropdownElement?.find(".mdl-permissions-icon")[0];
        if (!icon)
            return;
        const newClass = this.getPermissionsIconClass();
        if (icon.classList.contains(newClass.split(" ")[0]) && icon.classList.contains(newClass.split(" ")[1]))
            return;
        icon.classList.add("mdl-permissions-icon-animate");
        icon.className = `${newClass} mdl-permissions-icon mdl-permissions-icon-animate`;
        icon.addEventListener("animationend", () => icon.classList.remove("mdl-permissions-icon-animate"), { once: true });
    },
    refreshNameToolbarControl() {
        this._nameTextBoxInstance?.option("value", this.properties.name);
        if (this._nameColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._nameColorPicker, this.properties.nameColor);
    },
    renderShapeColorButtonTemplate(element) {
        const name = this.properties.name ?? "";
        const icon = resolveShapeToolbarIcon(this);
        element.innerHTML = `<span class="mdl-shape-color-btn"><i class="${icon}"></i></span><span>${name}</span>`;
    },
    renderAddShapeButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-shape-color-btn"><i class="fa-light fa-circle-plus"></i></span>`;
    },
    getAddShapeMenuItems() {
        const injectedItems = this?.toolbarAdapter?.getAddShapeMenuItems?.(this);
        if (Array.isArray(injectedItems))
            return injectedItems;
        return [
            { key: "BodyShape", type: "Body", icon: "fa-light fa-circle", text: this.board.translations.get("Body Name") },
            { key: "PointShape", type: "Point", icon: "fa-solid fa-dot", text: this.board.translations.get("Point Name") },
            { key: "VectorShape", type: "Vector", icon: "fa-light fa-arrow-right-long fa-rotate-by", text: this.board.translations.get("Vector Name") },
            { key: "LineShape", type: "Line", icon: "fa-light fa-slash-forward", text: this.board.translations.get("Line Name") },
            { key: "ArcShape", type: "Arc", icon: "fa-light fa-circle-half-stroke", text: this.board.translations.get("Arc Name") }
        ];
    },
    menuIconHtml(iconName, isSet) {
        const weight = isSet ? "fa-solid" : "fa-light";
        return `<i class="${weight} ${iconName} mdl-menu-icon"></i>`;
    },
    populateShapeColorMenuSections(sections) {
        const backgroundLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: backgroundLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $container => $container.append(this._bgColorPicker)
        });
    },
    refreshShapeColorToolbarControl() {
        if (!this._shapeColorDropdownElement)
            return;
        const buttonContentElement = this._shapeColorDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderShapeColorButtonTemplate(buttonContentElement);
        if (this._fgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._fgColorPicker, this.properties.foregroundColor);
        if (this._borderColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._borderColorPicker, this.properties.borderColor);
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
        this._opacitySliderInstance?.option("value", Math.round(resolveShapeToolbarOpacity(this) * 100));
    },
    getCopySubMenuItems() {
        const injectedItems = this?.toolbarAdapter?.getCopySubMenuItems?.(this);
        if (Array.isArray(injectedItems))
            return injectedItems;
        const items = [];
        if (typeof this.copyAsImage === "function")
            items.push({ text: "Copy as Image", icon: "fa-light fa-image", shortcut: "", action: () => this.copyAsImage() });
        return items;
    }
};

var BaseShapeToolbarMixin = {
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
        const isVisible = this.properties.visibleToUsers;
        const isLocked = this.properties.lockedForUsers === true;
        const isInteractable = this.properties.interactableForUsers !== false;
        $content[0].innerHTML = `<div class="mdl-permissions-menu">
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-visibility-host"></div><span class="mdl-permissions-menu-label mdl-permissions-visibility-label">${TermControl.getVisibilityLabel(isVisible)}</span></div>
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-lock-host"></div><span class="mdl-permissions-menu-label mdl-permissions-lock-label">${TermControl.getLockLabel(isLocked)}</span></div>
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-interactable-host"></div><span class="mdl-permissions-menu-label mdl-permissions-interactable-label">${TermControl.getInteractableLabel(isInteractable)}</span></div>
        </div>`;
        TermControl.createVisibilityCheckbox($content.find(".mdl-permissions-visibility-host"), isVisible, value => {
            this.setPropertyCommand("visibleToUsers", value);
            $content.find(".mdl-permissions-visibility-label").text(TermControl.getVisibilityLabel(value));
            this.refreshPermissionsButtonIcon();
        });
        TermControl.createLockCheckbox($content.find(".mdl-permissions-lock-host"), isLocked, value => {
            this.setPropertyCommand("lockedForUsers", value);
            $content.find(".mdl-permissions-lock-label").text(TermControl.getLockLabel(value));
            this.refreshPermissionsButtonIcon();
        });
        TermControl.createInteractableCheckbox($content.find(".mdl-permissions-interactable-host"), isInteractable, value => {
            this.setPropertyCommand("interactableForUsers", value);
            $content.find(".mdl-permissions-interactable-label").text(TermControl.getInteractableLabel(value));
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
    createOpacitySliderControl() {
        const slider = $('<div class="mdl-opacity-slider">');
        slider.dxSlider({
            min: 0,
            max: 100,
            step: 5,
            value: Math.round(resolveShapeToolbarOpacity(this) * 100),
            width: 120,
            tooltip: { enabled: true, showMode: "onHover", position: "top" },
            onInitialized: e => { this._opacitySliderInstance = e.component; },
            onValueChanged: event => {
                if (!event.event)
                    return;
                const opacity = event.value / 100;
                this.previewShapeOpacity?.(opacity);
                this.scheduleOpacityPropertyCommand(opacity);
            }
        });
        return slider;
    },
    scheduleOpacityPropertyCommand(opacity) {
        if (this._opacityCommandTimer)
            clearTimeout(this._opacityCommandTimer);
        this._opacityCommandTimer = setTimeout(() => {
            this._opacityCommandTimer = null;
            if (opacity !== resolveShapeToolbarOpacity(this))
                this.setPropertyCommand("opacity", opacity);
        }, 300);
    },
    createOpacityMenuItem() {
        const opacityLabel = this.board.translations.get("Opacity") ?? "Opacity";
        return {
            text: opacityLabel,
            iconHtml: this.menuIconHtml("fa-circle-half-stroke", resolveShapeToolbarOpacity(this) < 1),
            buildControl: $container => $container.append(this.createOpacitySliderControl())
        };
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
        const shapeIconName = resolveShapeToolbarIcon(this).split(" ")[1];
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
        sections[0].items.push(this.createOpacityMenuItem());
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
        const showCopySubItems = copySubItems.length > 1;
        const layerItems = [
            { text: "Bring to Front", icon: "fa-light fa-bring-front", shortcut: "", action: resolveShapeToolbarBoardAction(this, "bringToFront") },
            { text: "Bring Forward", icon: "fa-light fa-bring-forward", shortcut: "", action: resolveShapeToolbarBoardAction(this, "bringForward") },
            { text: "Send Backward", icon: "fa-light fa-send-backward", shortcut: "", action: resolveShapeToolbarBoardAction(this, "sendBackward") },
            { text: "Send to Back", icon: "fa-light fa-send-back", shortcut: "", action: resolveShapeToolbarBoardAction(this, "sendToBack") }
        ];
        const actionItems = [
            { text: "Copy", icon: "fa-light fa-copy", shortcut: `${mod}C`, action: resolveShapeToolbarCopyAction(this) },
            ...(showCopySubItems ? copySubItems.map(subItem => ({ ...subItem, isSubItem: true })) : []),
            { text: "Paste", icon: "fa-light fa-paste", shortcut: `${mod}V`, action: resolveShapeToolbarPaste(this) },
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
};
if (typeof BaseShape !== "undefined") Object.assign(BaseShape.prototype, ShapeContextToolbarMixin, ShapeToolbarPresentationMixin, BaseShapeToolbarMixin);
