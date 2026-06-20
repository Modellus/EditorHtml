Object.assign(MediaNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    }
});
