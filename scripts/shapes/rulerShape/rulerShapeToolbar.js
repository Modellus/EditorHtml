Object.assign(RulerShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(RulerShape.prototype).createToolbar.call(this);
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
                widget: "dxNumberBox",
                options: Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0.000001 }), {
                    value: this.properties.scale,
                    onInitialized: e => {
                        this._scaleBoxInstance = e.component;
                        Utils.createTranslatedTooltip(e, "Scale Tooltip", this.board.translations, 280);
                    },
                    onValueChanged: e => {
                        this.setPropertyCommand("scale", e.value);
                    }
                })
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }
});
