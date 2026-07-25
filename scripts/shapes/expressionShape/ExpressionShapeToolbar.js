var ExpressionShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ExpressionShapeToolbarMixin.createToolbar);
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
                template: () => this.createShortcutsPickerButton()
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    },
    createShortcutsPickerButton() {
        this._boundShortcutPaletteDocumentKeyDown = event => this.onShortcutPaletteDocumentKeyDown(event);
        this._shortcutsPicker = $('<div class="mdl-shortcuts-picker"></div>');
        this._shortcutsPicker.dxButton({
            stylingMode: "text",
            icon: "fa-light fa-sigma",
            onClick: _ => this.openShortcutsPalette(),
            onInitialized: event => Utils.createTranslatedTooltip(event, "Shortcuts Tooltip", this.board.translations, 280)
        });
        this.createShortcutsPopup();
        return this._shortcutsPicker;
    },
    createShortcutsPopup() {
        this._shortcutsPopupHost = $('<div class="mdl-shortcuts-popup"></div>').appendTo(document.body);
        this._shortcutsPopupHost.dxPopup({
            visible: false,
            showTitle: false,
            hideOnOutsideClick: true,
            shading: false,
            animation: {
                show: { type: "fade", duration: 0 },
                hide: { type: "fade", duration: 0 }
            },
            container: document.body,
            wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-shortcuts-picker-menu"),
            width: 330,
            height: "auto",
            maxHeight: 360,
            position: { my: "center top", at: "center bottom", of: this.mathfield, collision: "fit flip" },
            onShown: _ => this.onShortcutsPaletteOpened(),
            onHidden: _ => this.onShortcutsPaletteClosed(),
            contentTemplate: contentElement => this.createShortcutsPickerGrid(contentElement)
        });
        this._shortcutsPopup = this._shortcutsPopupHost.dxPopup("instance");
    },
    createShortcutsPickerGrid(contentElement) {
        $(contentElement).html(`
            <div class="mdl-shortcuts-palette">
                <div class="mdl-shortcuts-palette-tiles"></div>
                <div class="mdl-shortcuts-palette-status"></div>
            </div>
        `);
        this._shortcutItems = this.getTemplateShortcuts();
        this._shortcutTileControl = $(contentElement).find(".mdl-shortcuts-palette-tiles");
        this._shortcutStatusControl = $(contentElement).find(".mdl-shortcuts-palette-status");
        this._shortcutTileControl.dxTileView({
            items: this._shortcutItems,
            baseItemWidth: 69,
            baseItemHeight: 52,
            itemMargin: 3,
            direction: "vertical",
            width: 300,
            height: Math.ceil(this._shortcutItems.length / 4) * 58,
            focusStateEnabled: false,
            itemTemplate: (shortcutItem, index, element) => this.renderShortcutPaletteTile(shortcutItem, element, index),
            onItemClick: event => this.applyShortcutPaletteItem(event.itemData)
        });
        this._shortcutStatusControl.dxToolbar({ items: [] });
        this._shortcutTileView = this._shortcutTileControl.dxTileView("instance");
        this._shortcutStatusToolbar = this._shortcutStatusControl.dxToolbar("instance");
        this._shortcutTileControl.on("mouseenter", ".mdl-shortcuts-palette-tile", event => this.focusShortcutPaletteItem(Number(event.currentTarget.dataset.shortcutIndex)));
        this.focusShortcutPaletteItem(-1);
    },
    renderShortcutPaletteTile(shortcutItem, element, shortcutIndex) {
        const previewText = this.getShortcutPalettePreviewText(shortcutItem);
        $(element).html(`
            <div class="mdl-shortcuts-palette-tile" data-shortcut-index="${shortcutIndex}">
                <span class="mdl-shortcuts-palette-preview">
                    <math-field read-only class="form-math-field" style="height:auto;width:auto"></math-field>
                </span>
            </div>
        `);
        $(element).find("math-field")[0].value = previewText;
    },
    getShortcutPalettePreviewText(shortcutItem) {
        if (shortcutItem.name === "Or" || shortcutItem.name === "And")
            return shortcutItem.insertText;
        if (shortcutItem.name === "Condition")
            return "\\begin{cases}a\\\\b\\end{cases}";
        return shortcutItem.text;
    },
    getShortcutPaletteKeyText(shortcutItem) {
        const isMac = /mac/i.test(navigator.platform);
        return shortcutItem.shortcut ?? (isMac ? shortcutItem.shortcutMac : shortcutItem.shortcutWindows) ?? "";
    },
    focusShortcutPaletteItem(shortcutIndex) {
        this._focusedShortcutIndex = shortcutIndex;
        const tiles = this._shortcutTileControl.find(".dx-tile");
        tiles.removeClass("mdl-shortcuts-palette-tile-focused");
        if (shortcutIndex < 0) {
            this.updateShortcutPaletteStatus(null);
            return;
        }
        const focusedTile = tiles.eq(shortcutIndex);
        focusedTile.addClass("mdl-shortcuts-palette-tile-focused");
        focusedTile[0]?.scrollIntoView({ block: "nearest" });
        const shortcutItem = this._shortcutItems[shortcutIndex];
        this.updateShortcutPaletteStatus(shortcutItem);
    },
    updateShortcutPaletteStatus(shortcutItem) {
        if (!shortcutItem) {
            this._shortcutStatusToolbar.option("items", []);
            return;
        }
        const shortcutText = this.getShortcutPaletteKeyText(shortcutItem);
        this._shortcutStatusToolbar.option("items", [{
            location: "center",
            template: () => $(`
                <div class="mdl-shortcuts-palette-status-content" role="status">
                    <span class="mdl-shortcuts-palette-status-name">${shortcutItem.name}</span>
                    ${shortcutText ? `<kbd class="mdl-shortcuts-palette-shortcut-pill">${shortcutText}</kbd>` : ""}
                </div>
            `)
        }]);
    },
    moveShortcutPaletteFocus(key) {
        const lastShortcutIndex = this._shortcutItems.length - 1;
        if (this._focusedShortcutIndex < 0) {
            this.focusShortcutPaletteItem(0);
            return;
        }
        let nextShortcutIndex = this._focusedShortcutIndex;
        if (key === "ArrowLeft")
            nextShortcutIndex = Math.max(0, nextShortcutIndex - 1);
        if (key === "ArrowRight")
            nextShortcutIndex = Math.min(lastShortcutIndex, nextShortcutIndex + 1);
        if (key === "ArrowUp")
            nextShortcutIndex = Math.max(0, nextShortcutIndex - 4);
        if (key === "ArrowDown")
            nextShortcutIndex = Math.min(lastShortcutIndex, nextShortcutIndex + 4);
        this.focusShortcutPaletteItem(nextShortcutIndex);
    },
    applyShortcutPaletteItem(shortcutItem) {
        this.board.suppressNextFocusSelect = true;
        const enteredEditMode = this.enterEditMode();
        if (!enteredEditMode)
            this.board.suppressNextFocusSelect = false;
        else {
            this.board.selection.deselect();
            this.board.selection.clearHover();
            this.board.selection.applyEditModeHighlight(this);
            setTimeout(() => {
                if (this.board.suppressNextFocusSelect)
                    this.board.suppressNextFocusSelect = false;
            }, 150);
        }
        this.restoreShortcutPaletteSelection();
        this._shortcutPaletteSelection = null;
        this.insert(shortcutItem.insertText);
        this._shortcutsPopup.hide();
    },
    openShortcutsPalette() {
        const selection = this.mathfield.selection;
        this._shortcutPaletteSelection = {
            ranges: selection.ranges.map(range => [...range]),
            direction: selection.direction
        };
        this._shortcutPaletteDismissed = false;
        this.hideShortcutsHint();
        document.addEventListener("keydown", this._boundShortcutPaletteDocumentKeyDown, true);
        this._shortcutsPopup.option("position", { my: "center top", at: "center bottom", of: this.mathfield, collision: "fit flip" });
        this._shortcutsPopup.show();
    },
    onShortcutsPaletteOpened() {
        if (this._shortcutPaletteDismissed) {
            this._shortcutsPopup.hide();
            return;
        }
        this.hideShortcutsHint();
        document.addEventListener("keydown", this._boundShortcutPaletteDocumentKeyDown, true);
        this.focusShortcutPaletteItem(-1);
    },
    onShortcutsPaletteClosed() {
        document.removeEventListener("keydown", this._boundShortcutPaletteDocumentKeyDown, true);
        const selection = this._shortcutPaletteSelection;
        this._shortcutPaletteSelection = null;
        if (selection)
            setTimeout(() => this.restoreShortcutPaletteSelection(selection), 0);
    },
    onShortcutPaletteDocumentKeyDown(keydownEvent) {
        if (keydownEvent.key === "Enter" && this._focusedShortcutIndex >= 0) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.applyShortcutPaletteItem(this._shortcutItems[this._focusedShortcutIndex]);
            return;
        }
        const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
        if (navigationKeys.includes(keydownEvent.key)) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.moveShortcutPaletteFocus(keydownEvent.key);
            return;
        }
        if (keydownEvent.key !== "Escape")
            return;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this._shortcutPaletteDismissed = true;
        document.removeEventListener("keydown", this._boundShortcutPaletteDocumentKeyDown, true);
        this._shortcutsPopup.hide();
    },
    restoreShortcutPaletteSelection(selection = this._shortcutPaletteSelection) {
        if (!selection)
            return;
        this.mathfield.focus();
        this.mathfield.selection = selection;
    }
};
if (typeof ExpressionShape !== "undefined") Object.assign(ExpressionShape.prototype, ExpressionShapeToolbarMixin);
