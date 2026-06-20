class ShapeInteractionController {
    constructor(adapter) {
        this.adapter = adapter;
        this.selectedItemId = null;
        this._boundDocumentMouseDown = event => this.onDocumentMouseDown(event);
    }

    bindGlobalDismissal() {
        document.addEventListener("mousedown", this._boundDocumentMouseDown);
    }

    unbindGlobalDismissal() {
        document.removeEventListener("mousedown", this._boundDocumentMouseDown);
    }

    onDocumentMouseDown(event) {
        const targetElement = event.target;
        const shouldIgnoreDismiss = typeof shouldIgnoreDismissForTarget === "function"
            ? shouldIgnoreDismissForTarget(targetElement, this.adapter.blockSelector)
            : $(targetElement).closest(this.adapter.blockSelector).length > 0;
        if (shouldIgnoreDismiss)
            return;
        this.clearSelection();
    }

    attachItemInteractions(itemElement, itemData, shape) {
        this.initializeItemAccessibility(itemElement, itemData);
        itemElement.addEventListener("click", event => this.onItemClick(event, itemElement, itemData, shape));
        itemElement.addEventListener("keydown", event => this.onItemKeyDown(event, itemElement, itemData, shape));
        if (itemData.id === this.selectedItemId)
            this.selectItem(itemElement, itemData, shape);
    }

    initializeItemAccessibility(itemElement, itemData) {
        itemElement.setAttribute("tabindex", "0");
        itemElement.setAttribute("role", "group");
        itemElement.setAttribute("aria-selected", "false");
        itemElement.setAttribute("aria-label", `${itemData.type} block`);
    }

    onItemClick(event, itemElement, itemData, shape) {
        this.selectItem(itemElement, itemData, shape);
    }

    onItemKeyDown(event, itemElement, itemData, shape) {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.focusAdjacentItem(itemElement, -1);
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.focusAdjacentItem(itemElement, 1);
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this.selectItem(itemElement, itemData, shape);
            this.focusPrimaryEditable(itemElement);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            this.clearSelection();
            itemElement.blur();
            return;
        }
        if (!this.shouldRemoveItemOnBackspace(event, itemElement))
            return;
        event.preventDefault();
        this.adapter.removeItem(itemData.id);
    }

    selectItem(itemElement, itemData, shape) {
        this.clearSelection();
        this.selectedItemId = itemData.id;
        itemElement.classList.add(this.adapter.selectedClassName);
        itemElement.setAttribute("aria-selected", "true");
        shape.showContextToolbar?.();
    }

    clearSelection() {
        this.adapter.clearSelectedItems();
        this.adapter.hideAllContextToolbars();
        this.selectedItemId = null;
    }

    notifyItemRemoved(itemId) {
        if (this.selectedItemId !== itemId)
            return;
        this.selectedItemId = null;
    }

    shouldRemoveItemOnBackspace(event, itemElement) {
        if (event.key !== "Backspace")
            return false;
        const editableElement = itemElement.querySelector("[contenteditable]");
        if (editableElement?.textContent === "" && !itemElement.contains(document.activeElement))
            return true;
        return false;
    }

    focusPrimaryEditable(itemElement) {
        const editableElement = itemElement.querySelector("[contenteditable]");
        if (!editableElement)
            return;
        editableElement.focus();
    }

    focusAdjacentItem(itemElement, offset) {
        const items = Array.from(document.querySelectorAll(this.adapter.blockSelector));
        const currentIndex = items.indexOf(itemElement);
        if (currentIndex < 0)
            return;
        const nextIndex = Math.max(0, Math.min(currentIndex + offset, items.length - 1));
        if (nextIndex === currentIndex)
            return;
        const nextElement = items[nextIndex];
        nextElement?.focus();
    }

    handleRuntimeKeyDown(event) {
        if (!this.adapter)
            return false;
        if (event.defaultPrevented)
            return false;
        if (event.ctrlKey || event.metaKey || event.altKey)
            return false;
        if (this.adapter.isEditingTarget?.(event.target) === true)
            return false;
        if (event.key === "Escape") {
            event.preventDefault();
            this.adapter.clearSelection?.();
            return true;
        }
        if (event.key === "Delete" || event.key === "Backspace") {
            if (this.adapter.canRemoveSelectedItem?.(event) === false)
                return false;
            const removed = this.adapter.removeSelectedItem?.(event);
            if (removed !== true)
                return false;
            event.preventDefault();
            return true;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            const selectedItem = this.adapter.selectPreviousItem?.(event);
            if (!selectedItem)
                return false;
            event.preventDefault();
            return true;
        }
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            const selectedItem = this.adapter.selectNextItem?.(event);
            if (!selectedItem)
                return false;
            event.preventDefault();
            return true;
        }
        return false;
    }
}