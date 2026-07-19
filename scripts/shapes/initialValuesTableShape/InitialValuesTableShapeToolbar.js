var InitialValuesTableShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, InitialValuesTableShapeToolbarMixin.createToolbar);
        this.normalizeColumns();
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
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }
};
if (typeof InitialValuesTableShape !== "undefined") Object.assign(InitialValuesTableShape.prototype, InitialValuesTableShapeToolbarMixin);
