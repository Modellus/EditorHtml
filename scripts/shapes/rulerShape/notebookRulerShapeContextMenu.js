Object.assign(RulerNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    }
});
