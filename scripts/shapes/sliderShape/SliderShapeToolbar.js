var SliderShapeToolbarMixin = {
    populateShapeColorMenuSections(sections) {
        const backgroundLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: backgroundLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $container => $container.append(this._bgColorPicker)
        });
        const positiveLabel = this.board.translations.get("Positive") ?? "Positive";
        this._positiveColorPicker = this.createColorPickerEditor("positiveColor");
        sections[0].items.push({
            text: positiveLabel,
            iconHtml: this.menuIconHtml("fa-plus", !!this.properties.positiveColor),
            buildControl: $container => $container.append(this._positiveColorPicker)
        });
        const negativeLabel = this.board.translations.get("Negative") ?? "Negative";
        this._negativeColorPicker = this.createColorPickerEditor("negativeColor");
        sections[0].items.push({
            text: negativeLabel,
            iconHtml: this.menuIconHtml("fa-minus", !!this.properties.negativeColor),
            buildControl: $container => $container.append(this._negativeColorPicker)
        });
    },
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, SliderShapeToolbarMixin.createToolbar);
        this._termControl = this.createTermControl("term", "Value");
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
                    this.createTermsDropDownButton(container);
                    return container;
                }
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
    }
};
if (typeof SliderShape !== "undefined") Object.assign(SliderShape.prototype, SliderShapeToolbarMixin);
