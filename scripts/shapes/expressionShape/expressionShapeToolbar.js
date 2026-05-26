Object.assign(ExpressionShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(ExpressionShape.prototype).createToolbar.call(this);
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
        const baseItemWidth = 88;
        const baseItemHeight = 56;
        const columns = 4;
        const itemMargin = 2;
        const horizontalStep = baseItemWidth + itemMargin * 2;
        const popupPadding = 6;
        this._shortcutsPicker = $('<div class="mdl-shortcuts-picker"></div>');
        this._shortcutsPicker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Shortcuts Tooltip", this.board.translations, 280),
            icon: "fa-light fa-sigma",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-shortcuts-picker-menu"),
                width: columns * horizontalStep + popupPadding * 2,
                contentTemplate: contentElement => this.createShortcutsPickerGrid(contentElement)
            }
        });
        return this._shortcutsPicker;
    },
    createShortcutsPickerGrid(contentElement) {
        const baseItemWidth = 88;
        const baseItemHeight = 56;
        const columns = 4;
        const itemMargin = 2;
        const horizontalStep = baseItemWidth + itemMargin * 2;
        const verticalStep = baseItemHeight + itemMargin * 2;
        const shortcutItems = [
            { name: "Differential", text: "\\frac{dx}{dt}", shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
            { name: "Power", text: "x^2", shortcut: "^" },
            { name: "Squareroot", text: "\\sqrt{x}", shortcut: "#" },
            { name: "Index", text: "x_{t-1}", shortcut: "_" },
            { name: "Condition", text: "\\begin{cases}1 & t=0 \\\\ y & t\\ge2\\end{cases}", shortcut: "\\" },
            { name: "Floor", text: "\\left\\lfloor x\\right\\rfloor", insertText: "\\left\\lfloor\\placeholder{}\\right\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" }
        ];
        const rows = Math.ceil(shortcutItems.length / columns);
        $(contentElement).empty();
        const container = $('<div class="mdl-shortcuts-picker-grid"></div>');
        $(contentElement).append(container);
        container.dxTileView({
            items: shortcutItems,
            baseItemHeight: baseItemHeight,
            baseItemWidth: baseItemWidth,
            itemMargin: itemMargin,
            direction: "vertical",
            height: rows * verticalStep,
            width: columns * horizontalStep,
            itemTemplate: (itemData, index, element) => {
                const cell = $('<div class="mdl-shortcuts-picker-item" style="display:flex;align-items:center;justify-content:center;height:100%;width:100%"></div>');
                cell.html(`<math-field read-only class="form-math-field" style="height:auto;width:auto">${itemData.text}</math-field>`);
                this.createShortcutTooltip(cell, itemData);
                $(element).append(cell);
            },
            onItemClick: e => {
                this.insert(e.itemData.insertText ?? e.itemData.text);
                this._shortcutsPicker?.dxDropDownButton("instance")?.close();
            }
        });
    },
    createShortcutTooltip(cell, itemData) {
        const isMac = /mac/i.test(navigator.platform);
        const shortcutText = itemData.shortcut ?? (isMac ? itemData.shortcutMac : itemData.shortcutWindows) ?? "";
        const tooltipHtml = `<div style="display: flex; align-items: center; width: 100%; font-size: 15px"><span style="text-align: left; padding-right: 10px; flex-grow: 1">${itemData.name}</span><span style="color: #999; min-width: 58px; text-align: right">${shortcutText}</span></div>`;
        $('<div>')
            .appendTo(document.body)
            .dxTooltip({
                target: cell,
                container: document.body,
                wrapperAttr: this.getShapeNestedOverlayWrapperAttr(),
                contentTemplate: contentElement => {
                    contentElement.append(
                        $('<div class="tooltip"/>').html(tooltipHtml)
                    );
                },
                showEvent: {
                    delay: 300,
                    name: 'mouseenter'
                },
                hideEvent: 'mouseleave',
                position: 'top',
                width: 220
            });
    }
});
