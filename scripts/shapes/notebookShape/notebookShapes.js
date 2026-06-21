class NotebookShape {
    constructor(notebookEditor, block) {
        this.notebookEditor = notebookEditor;
        this.block = block;
        this._contextMenuElement = null;
        this._contextMenuColumnsSyncFrameId = null;
        const self = this;
        const shellTranslations = this.notebookEditor?.getShell?.()?.board?.translations;
        this.board = {
            translations: shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US"),
            theme: { getColorPickerPalette: () => Utils.getColorPickerPalette() },
            suppressNextFocusSelect: false,
            selection: { deselect: () => {}, clearHover: () => {}, applyEditModeHighlight: () => {} },
            markDirty: () => self.markChanged(),
            get calculator() { return self.notebookEditor?.calculator ?? null; }
        };
        this.termDisplayEntries = [];
        this.termFormControls = {};
        this.initializeContextToolbar();
    }

    renderContentHtml() {
        return "";
    }

    mount(contentElement, dragHandleElement) {
        this.contentElement = contentElement;
        this.dragHandleElement = dragHandleElement;
        this.blockElement = contentElement.closest(".notebook-block");
    }

    unmount() {
        if (this._contextMenuElement) {
            this._contextMenuElement.remove();
            this._contextMenuElement = null;
        }
        if (this.contextToolbar) {
            this.contextToolbar.remove();
            this.contextToolbar = null;
        }
        this.contextToolbarInstance = null;
        if (this._contextMenuColumnsSyncFrameId)
            cancelAnimationFrame(this._contextMenuColumnsSyncFrameId);
        this._contextMenuColumnsSyncFrameId = null;
        this.contentElement = null;
        this.dragHandleElement = null;
        this.blockElement = null;
    }

    requestContextMenuColumnsSync() {
        if (this._contextMenuColumnsSyncFrameId)
            cancelAnimationFrame(this._contextMenuColumnsSyncFrameId);
        this._contextMenuColumnsSyncFrameId = requestAnimationFrame(() => {
            this._contextMenuColumnsSyncFrameId = null;
            this.syncVisibleContextMenuColumnWidths();
        });
    }

    syncVisibleContextMenuColumnWidths() {
        const menuContainerElements = Array.from(document.querySelectorAll(".dx-overlay-wrapper .dx-menu-items-container"));
        for (const menuContainerElement of menuContainerElements)
            this.syncSingleContextMenuColumnWidths(menuContainerElement);
    }

    syncSingleContextMenuColumnWidths(menuContainerElement) {
        if (menuContainerElement.getClientRects().length === 0)
            return;
        const dropdownRowElements = Array.from(menuContainerElement.querySelectorAll(".mdl-dropdown-list-item")).filter(dropdownRowElement => dropdownRowElement.closest(".dx-menu-items-container") === menuContainerElement);
        if (!dropdownRowElements.length)
            return;
        let maximumIconWidth = 0;
        let maximumLabelWidth = 0;
        let maximumControlWidth = 0;
        for (const dropdownRowElement of dropdownRowElements) {
            const iconElement = dropdownRowElement.querySelector(".mdl-dropdown-list-icon");
            const labelElement = dropdownRowElement.querySelector(".mdl-dropdown-list-label");
            const controlElement = dropdownRowElement.querySelector(".mdl-dropdown-list-control");
            if (iconElement)
                iconElement.style.width = "";
            if (labelElement)
                labelElement.style.width = "";
            if (controlElement)
                controlElement.style.width = "";
            if (iconElement)
                maximumIconWidth = Math.max(maximumIconWidth, Math.ceil(Math.max(iconElement.scrollWidth, iconElement.getBoundingClientRect().width)));
            if (labelElement)
                maximumLabelWidth = Math.max(maximumLabelWidth, Math.ceil(Math.max(labelElement.scrollWidth, labelElement.getBoundingClientRect().width)));
            if (controlElement)
                maximumControlWidth = Math.max(maximumControlWidth, Math.ceil(Math.max(controlElement.scrollWidth, controlElement.getBoundingClientRect().width)));
        }
        for (const dropdownRowElement of dropdownRowElements) {
            const iconElement = dropdownRowElement.querySelector(".mdl-dropdown-list-icon");
            const labelElement = dropdownRowElement.querySelector(".mdl-dropdown-list-label");
            const controlElement = dropdownRowElement.querySelector(".mdl-dropdown-list-control");
            if (iconElement)
                iconElement.style.width = `${maximumIconWidth}px`;
            if (labelElement)
                labelElement.style.width = `${maximumLabelWidth}px`;
            if (controlElement)
                controlElement.style.width = `${maximumControlWidth}px`;
        }
    }

    markChanged() {
        this.notebookEditor._updateLastModified();
    }

    duplicateBlock() {
        const duplicateBlock = Utils.cloneProperties(this.block);
        duplicateBlock.id = this.notebookEditor.nextBlockId++;
        const blockIndex = this.notebookEditor.blocks.findIndex(block => block.id === this.block.id);
        this.notebookEditor.blocks.splice(blockIndex + 1, 0, duplicateBlock);
        this.notebookEditor._reloadBlockList();
        this.markChanged();
    }

    getHostId() {
        return `notebook-shape-${this.block.type}-${this.block.id}`;
    }

    get properties() {
        return this.block;
    }

    initializeContextToolbar() {
        const toolbarItems = this.createToolbar?.() ?? [];
        if (!toolbarItems.length || !window.DevExpress?.ui?.dxToolbar)
            return;
        const separator = { location: "center", template: () => $('<div class="toolbar-separator">|</div>') };
        toolbarItems.splice(toolbarItems.length - 1, 0, this.createActionsToolbarItem(), separator);
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        $(toolbarHost).dxToolbar({ items: toolbarItems, width: "auto" });
        this.contextToolbar = toolbarHost;
        this.contextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    createToolbar() {
        return [];
    }

    showContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionContextToolbar()));
    }

    hideContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.remove("visible");
    }

    positionContextToolbar() {
        if (!this.contextToolbar || !this.blockElement)
            return;
        const rect = this.blockElement.getBoundingClientRect();
        const toolbarRect = this.contextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.contextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.contextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = rect.left + rect.width / 2 - toolbarWidth / 2;
        let top = rect.bottom + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.contextToolbar.style.left = `${left}px`;
        this.contextToolbar.style.top = `${top}px`;
    }

    getShapeOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup ${extraClass}` : "mdl-shape-overlay-popup";
        return { class: wrapperClassName };
    }

    getShapeNestedOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup mdl-shape-overlay-popup-nested ${extraClass}` : "mdl-shape-overlay-popup mdl-shape-overlay-popup-nested";
        return { class: wrapperClassName };
    }

    getDropDownButtonInstance(element) {
        const hostElement = element?.[0] ?? element;
        if (!(hostElement instanceof Element))
            return null;
        return window.DevExpress?.ui?.dxDropDownButton?.getInstance(hostElement) ?? null;
    }

    setPropertyCommand(name, value) {
        Utils.setProperty(name, value, this.block);
        if (name === "backgroundColor")
            this.blockElement?.style.setProperty("--block-bg-color", value);
        if (name === "borderColor")
            this.blockElement?.style.setProperty("--block-border-color", value);
        this.markChanged();
    }

    remove() {
        this.notebookEditor.removeBlock(this.block.id);
    }

    duplicate() {
        this.duplicateBlock();
    }

    async copyBlockToClipboard() {
        const payload = JSON.stringify({ type: "notebook-block", block: Utils.cloneProperties(this.block) });
        await navigator.clipboard.writeText(payload);
    }

    async pasteBlockFromClipboard() {
        let text = "";
        try {
            text = await navigator.clipboard.readText();
        } catch {
            return;
        }
        if (!text)
            return;
        let payload = null;
        try {
            payload = JSON.parse(text);
        } catch {
            return;
        }
        if (payload?.type !== "notebook-block" || !payload.block)
            return;
        this.notebookEditor.insertBlockAfter(this.block.id, payload.block);
    }

    resetToDefaults() {
        const resetBlock = NotebookShapesFactory.createDefaultBlock(this.block.type, this.block.id);
        const currentId = this.block.id;
        const currentType = this.block.type;
        for (const key of Object.keys(this.block)) {
            if (key !== "id" && key !== "type")
                delete this.block[key];
        }
        Object.assign(this.block, resetBlock);
        this.block.id = currentId;
        this.block.type = currentType;
        this.notebookEditor._reloadBlockList();
        this.markChanged();
    }

    get id() {
        return this.block.id;
    }

    getCasesCount() {
        const rawCount = parseInt(this.board.calculator?.properties?.casesCount ?? 1, 10) || 1;
        return this.getClampedCaseNumber(rawCount);
    }

    getClampedCaseNumber(caseNumber) {
        const normalizedCaseNumber = parseInt(caseNumber, 10);
        if (!Number.isFinite(normalizedCaseNumber))
            return 1;
        if (normalizedCaseNumber < 1)
            return 1;
        if (normalizedCaseNumber > 9)
            return 9;
        return normalizedCaseNumber;
    }

    getColorControl() {
        if (!this.colorControl)
            this.colorControl = new ColorControl({ palette: this.board.theme.getColorPickerPalette() });
        return this.colorControl;
    }

    createColorPickerEditor(dataField, options = {}) {
        return this.getColorControl().createEditor(this.properties[dataField], value => this.setPropertyCommand(dataField, value), options);
    }

    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    }

    menuIconHtml(iconName, isSet) {
        const weight = isSet ? "fa-solid" : "fa-light";
        return `<i class="${weight} ${iconName} mdl-menu-icon"></i>`;
    }

    populateShapeColorMenuSections(sections) {
    }

    renderShapeColorButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-palette"></i></span>`;
    }

    renderPermissionsButtonTemplate(element) {
    }

    refreshPermissionsButtonIcon() {
    }

    refreshTermsToolbarControl() {
        if (!this._termsDropdownElement)
            return;
        const buttonContentElement = this._termsDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderTermsButtonTemplate(buttonContentElement);
    }

    renderTermsButtonTemplate(element) {
    }

    populateTermsMenuSections(listItems) {
    }

    getPrecisionNumberEditorOptions(opts = {}) {
        return Object.assign({ stylingMode: "filled", width: 90 }, opts);
    }

    refreshDomainBoxes() {
    }

    getDefaultDomainOverride() {
        return { xMin: null, xMax: null, yMin: null, yMax: null };
    }

    enterEditMode() {
        return true;
    }

    normalizeYTerms() {
    }

    refreshTermFormLayouts() {
    }

    formatTermForDisplay(term) {
        if (term == null || term === "")
            return "";
        const calculator = this.notebookEditor?.calculator;
        if (calculator?.isTerm?.(String(term)))
            return Utils.getDisplayedTerm(String(term), calculator.system);
        return Utils.getDisplayedTerm(String(term));
    }

    createNameButtonTermMarkup(termText) {
        const normalized = String(termText ?? "").trim();
        if (!normalized)
            return "";
        const mathMarkup = Utils.buildReadOnlyMathFieldMarkup(normalized, "height:auto;width:auto;display:inline-block;pointer-events:none");
        return `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${mathMarkup}</span></span>`;
    }

    createTermControl(termProperty, title, showVisibilityToggle = true) {
        const wrapper = $('<div style="width:160px"></div>');
        this.createNotebookTermControl(wrapper, {
            propertyName: termProperty,
            system: this.board.calculator?.system,
            onValueChanged: value => {
                this.setPropertyCommand(termProperty, value);
            }
        });
        return wrapper;
    }

    createTermSelectorControl(formAdapter, termProperty, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true) {
        const wrapper = $('<div style="width:160px"></div>');
        this.createNotebookTermControl(wrapper, {
            propertyName: termProperty,
            system: this.board.calculator?.system,
            onValueChanged: value => {
                formAdapter.updateData(termProperty, value);
            }
        });
        return wrapper;
    }

    createShapeColorDropDownButton(itemElement) {
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        this._borderColorPicker = this.createColorPickerEditor("borderColor");
        this._shapeColorDropdownElement = $('<div class="mdl-shape-color-selector">');
        this._shapeColorDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            buttonTemplate: (data, element) => this.renderShapeColorButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: [
                            { text: "Background", buildControl: $container => $container.append(this._bgColorPicker) },
                            { text: "Border", buildControl: $container => $container.append(this._borderColorPicker) }
                        ],
                        scrollingEnabled: false,
                        itemTemplate: (data, _, element) => {
                            element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                            data.buildControl($(element).find(".mdl-dropdown-list-control"));
                        }
                    });
                }
            }
        });
        this._shapeColorDropdownElement.appendTo(itemElement);
    }

    initContextMenu(targetElement) {
        if (this._contextMenuElement) {
            this._contextMenuElement.remove();
            this._contextMenuElement = null;
        }
        const allItems = this.createContextMenuItems();
        this._contextMenuElement = $("<div>").appendTo(document.body);
        this._contextMenuElement.dxContextMenu({
            dataSource: allItems,
            target: targetElement,
            showEvent: "click",
            onShown: () => this.requestContextMenuColumnsSync(),
            closeOnOutsideClick: event => {
                const target = event?.target;
                if (!target)
                    return true;
                const clickedInsideOverlay = $(target).closest(".dx-overlay-wrapper, .dx-overlay-content, .dx-context-menu").length > 0;
                return !clickedInsideOverlay;
            },
            onItemClick: event => {
                event.cancel = true;
                event.event?.preventDefault();
                event.event?.stopPropagation();
            },
            itemTemplate: (itemData, index, element) => {
                const hasChildren = Array.isArray(itemData.items) && itemData.items.length > 0;
                const iconMarkup = itemData.icon ? `<i class="${itemData.icon}"></i>` : "";
                const submenuIndicatorMarkup = hasChildren ? '<span class="mdl-dropdown-list-submenu-indicator"><i class="fa-light fa-chevron-right"></i></span>' : "";
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-icon">${iconMarkup}</span><span class="mdl-dropdown-list-label">${itemData.text}</span><span class="mdl-dropdown-list-control">${submenuIndicatorMarkup}</span></div>`;
                if (hasChildren) {
                    this.requestContextMenuColumnsSync();
                    return;
                }
                if (!itemData.buildControl)
                    return;
                const controlContainer = $(element).find(".mdl-dropdown-list-control");
                itemData.buildControl(controlContainer);
                controlContainer[0].addEventListener("pointerdown", event => event.stopPropagation());
                controlContainer[0].addEventListener("mousedown", event => event.stopPropagation());
                controlContainer[0].addEventListener("click", event => event.stopPropagation());
                this.requestContextMenuColumnsSync();
            }
        });
    }

    createContextMenuItems() {
        return [];
    }

    getNotebookTermItems(system = null) {
        const calculator = this.notebookEditor?.calculator ?? window.shell?.board?.calculator;
        if (!calculator)
            return [];
        const termNames = calculator.getTermsNames?.() ?? [];
        const activeSystem = system ?? calculator.system;
        return Utils.getTerms(termNames, activeSystem);
    }

    normalizeNotebookTermValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    createNotebookTermControl($container, options = {}) {
        const propertyName = options.propertyName;
        const system = options.system ?? this.board.calculator?.system;
        const onValueChanged = options.onValueChanged;
        const normalizedValue = this.normalizeNotebookTermValue(propertyName ? this.properties[propertyName] : options.value);
        const width = options.width ?? 120;
        const editor = $("<div>").appendTo($container);
        editor.dxSelectBox({
            dataSource: this.getNotebookTermItems(system),
            valueExpr: "term",
            displayExpr: "text",
            value: normalizedValue,
            acceptCustomValue: true,
            searchEnabled: true,
            stylingMode: "filled",
            width: width,
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeNestedOverlayWrapperAttr()
            },
            onOpened: event => {
                const activeSystem = options.system ?? this.board.calculator?.system;
                event.component.option("dataSource", this.getNotebookTermItems(activeSystem));
            },
            onCustomItemCreating: event => {
                const customValue = this.normalizeNotebookTermValue(event.text);
                event.customItem = { text: customValue, term: customValue };
            },
            onValueChanged: event => {
                const nextValue = this.normalizeNotebookTermValue(event.value);
                if (propertyName)
                    this.setPropertyCommand(propertyName, nextValue);
                if (typeof onValueChanged === "function")
                    onValueChanged(nextValue);
            }
        });
    }

    normalizeNotebookTermList(values) {
        if (Array.isArray(values))
            return values.map(value => this.normalizeNotebookTermValue(value)).filter(value => value !== "");
        if (typeof values === "string") {
            return values
                .split(",")
                .map(value => this.normalizeNotebookTermValue(value))
                .filter(value => value !== "");
        }
        return [];
    }

    createNotebookTermsCollectionControl($container, options = {}) {
        const propertyName = options.propertyName;
        const system = options.system ?? this.board.calculator?.system;
        const onValueChanged = options.onValueChanged;
        const sourceValues = propertyName ? this.properties[propertyName] : options.values;
        const normalizedValues = this.normalizeNotebookTermList(sourceValues);
        const width = options.width ?? 140;
        const editor = $("<div>").appendTo($container);
        editor.dxTagBox({
            dataSource: this.getNotebookTermItems(system),
            valueExpr: "term",
            displayExpr: "text",
            value: normalizedValues,
            acceptCustomValue: true,
            searchEnabled: true,
            hideSelectedItems: false,
            stylingMode: "filled",
            width: width,
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeNestedOverlayWrapperAttr()
            },
            onOpened: event => {
                const activeSystem = options.system ?? this.board.calculator?.system;
                event.component.option("dataSource", this.getNotebookTermItems(activeSystem));
            },
            onCustomItemCreating: event => {
                const customValue = this.normalizeNotebookTermValue(event.text);
                event.customItem = { text: customValue, term: customValue };
            },
            onValueChanged: event => {
                const nextValues = this.normalizeNotebookTermList(event.value);
                if (propertyName)
                    this.setPropertyCommand(propertyName, nextValues);
                if (typeof onValueChanged === "function")
                    onValueChanged(nextValues);
            }
        });
    }
}

class EditableNotebookShape extends NotebookShape {
    constructor(notebookEditor, block, placeholderText, extraClassName) {
        super(notebookEditor, block);
        this.placeholderText = placeholderText;
        this.extraClassName = extraClassName ?? "";
    }

    renderContentHtml() {
        const classAttr = this.extraClassName ? ` class="${this.extraClassName}"` : "";
        return `<div${classAttr} contenteditable="true" data-placeholder="${this.placeholderText}">${this.block.content ?? ""}</div>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        this.editableElement = contentElement.querySelector("[contenteditable]");
        if (!this.editableElement)
            return;
        this.onInputBound = () => this.onInput();
        this.editableElement.addEventListener("input", this.onInputBound);
    }

    onInput() {
        this.block.content = this.editableElement.textContent;
        this.markChanged();
    }

    unmount() {
        if (this.editableElement && this.onInputBound)
            this.editableElement.removeEventListener("input", this.onInputBound);
        this.editableElement = null;
        this.onInputBound = null;
        super.unmount();
    }
}

class HeaderNotebookShape extends EditableNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "Heading", "notebook-header-shape");
    }
}

class PlaceholderNotebookShape extends NotebookShape {
    constructor(notebookEditor, block, iconClass, labelText) {
        super(notebookEditor, block);
        this.iconClass = iconClass;
        this.labelText = labelText;
    }

    renderContentHtml() {
        return `<div class="notebook-block-placeholder"><i class="${this.iconClass}"></i><span>${this.labelText}</span></div>`;
    }
}

class NotebookShapesFactory {
    static register(type, descriptor) {
        this.shapeDescriptors[type] = descriptor;
    }

    static getDescriptor(type) {
        return this.shapeDescriptors[type] ?? this.shapeDescriptors["text"];
    }

    static createShape(notebookEditor, block, hostElement = null) {
        const descriptor = this.getDescriptor(block.type);
        return descriptor.createShape(notebookEditor, block, hostElement);
    }

    static renderContentHtml(notebookEditor, block) {
        const descriptor = this.getDescriptor(block.type);
        if (typeof descriptor.renderContentHtml === "function")
            return descriptor.renderContentHtml(notebookEditor, block);
        return descriptor.createShape(notebookEditor, block).renderContentHtml();
    }

    static createDefaultBlock(type, id) {
        const descriptor = this.getDescriptor(type);
        return {
            id,
            type,
            content: descriptor.defaultContent ?? "",
            borderColor: "#e8e8e8",
            backgroundColor: "transparent"
        };
    }
}

NotebookShapesFactory.shapeDescriptors = {};

NotebookShapesFactory.register("header", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new HeaderNotebookShape(notebookEditor, block)
});
