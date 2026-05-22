Object.assign(ValueShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(ValueShape.prototype).createToolbar.call(this);
        this._termControl = this.createTermControl("term", "Term", true);
        const fontSizeCaseProperty = "fontSizeTermCase";
        const fontSizeDisplayModeProperty = this.getTermDisplayModeProperty("fontSizeTerm");
        if (this.properties[fontSizeCaseProperty] == null)
            this.properties[fontSizeCaseProperty] = 1;
        if (this.properties[fontSizeDisplayModeProperty] == null)
            this.properties[fontSizeDisplayModeProperty] = "none";
        const fontSizeFormAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        this._fontSizeTermControl = this.createTermSelectorControl(fontSizeFormAdapter, "fontSizeTerm", fontSizeCaseProperty, true, fontSizeDisplayModeProperty, false);
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
                    this.createFontDropDownButton(container);
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
                    this.createTermsDropDownButton(container);
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
    createFontDropDownButton(itemElement) {
        this._fontDropdownElement = $('<div class="mdl-font-selector">');
        this._fontDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Font Tooltip", this.board.translations, 280),
            buttonTemplate: (data, element) => {
                element[0].innerHTML = `<i class="fa-light fa-text"></i>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildFontMenuContent(contentElement)
            }
        });
        this._fontDropdownElement.appendTo(itemElement);
    }
});
