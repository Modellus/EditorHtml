Object.assign(ExpressionNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    },

    insertShortcut(shortcutText) {
        if (!this.expressionControl)
            return;
        const currentValue = this.expressionControl.getValue();
        this.expressionControl.setValue(`${currentValue}${shortcutText}`);
        this.block.content = this.expressionControl.getValue();
        this.markChanged();
    },

    insert(text) {
        this.insertShortcut(text);
    },

    getTemplateShortcuts() {
        const independentTermName = this.notebookEditor?.calculator?.properties?.independent?.name ?? "t";
        return resolveExpressionTemplateShortcuts(independentTermName);
    },

    createShortcutTooltip(cell, itemData) {
    }
});
