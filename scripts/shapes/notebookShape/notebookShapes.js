class NotebookShape {
    constructor(notebookEditor, block) {
        this.notebookEditor = notebookEditor;
        this.block = block;
        this._contextMenuElement = null;
        this._contextMenuColumnsSyncFrameId = null;
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

    getHostId() {
        return `notebook-shape-${this.block.type}-${this.block.id}`;
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

    getNotebookTermItems() {
        const calculator = window.shell?.board?.calculator;
        if (!calculator)
            return [];
        const termNames = calculator.getTermsNames?.() ?? [];
        const system = calculator.system;
        return Utils.getTerms(termNames, system);
    }

    normalizeNotebookTermValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    createNotebookTermControl($container, value, onValueChanged, options = {}) {
        const termItems = this.getNotebookTermItems();
        const normalizedValue = this.normalizeNotebookTermValue(value);
        const width = options.width ?? 120;
        const editor = $("<div>").appendTo($container);
        editor.dxSelectBox({
            dataSource: termItems,
            valueExpr: "term",
            displayExpr: "text",
            value: normalizedValue,
            acceptCustomValue: true,
            searchEnabled: true,
            stylingMode: "filled",
            width: width,
            onCustomItemCreating: event => {
                const customValue = this.normalizeNotebookTermValue(event.text);
                event.customItem = { text: customValue, term: customValue };
            },
            onValueChanged: event => {
                onValueChanged(this.normalizeNotebookTermValue(event.value));
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

    createNotebookTermsCollectionControl($container, values, onValueChanged, options = {}) {
        const termItems = this.getNotebookTermItems();
        const normalizedValues = this.normalizeNotebookTermList(values);
        const width = options.width ?? 140;
        const editor = $("<div>").appendTo($container);
        editor.dxTagBox({
            dataSource: termItems,
            valueExpr: "term",
            displayExpr: "text",
            value: normalizedValues,
            acceptCustomValue: true,
            searchEnabled: true,
            hideSelectedItems: false,
            stylingMode: "filled",
            width: width,
            onCustomItemCreating: event => {
                const customValue = this.normalizeNotebookTermValue(event.text);
                event.customItem = { text: customValue, term: customValue };
            },
            onValueChanged: event => {
                onValueChanged(this.normalizeNotebookTermList(event.value));
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

    static createShape(notebookEditor, block) {
        const descriptor = this.shapeDescriptors[block.type] ?? this.shapeDescriptors["text"];
        return descriptor.createShape(notebookEditor, block);
    }

    static createDefaultBlock(type, id) {
        const descriptor = this.shapeDescriptors[type] ?? this.shapeDescriptors["text"];
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
