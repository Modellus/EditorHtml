Object.assign(TextNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    }
});
