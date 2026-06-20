var ChildShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ChildShapeToolbarMixin.createToolbar);
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createAddShapeDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            }
        );
        return items;
    }
};
if (typeof ChildShape !== "undefined") Object.assign(ChildShape.prototype, ChildShapeToolbarMixin);
