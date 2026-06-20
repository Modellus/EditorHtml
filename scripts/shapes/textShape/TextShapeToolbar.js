var TextShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, TextShapeToolbarMixin.createToolbar);
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
            this.createRemoveToolbarItem()
        );
        return items;
    }
};
if (typeof TextShape !== "undefined") Object.assign(TextShape.prototype, TextShapeToolbarMixin);
