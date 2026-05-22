Object.assign(ChildShape.prototype, {
    createToolbar() {
        const items = Object.getPrototypeOf(ChildShape.prototype).createToolbar.call(this);
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
});
