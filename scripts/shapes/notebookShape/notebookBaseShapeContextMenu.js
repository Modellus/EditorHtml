Object.assign(NotebookShape.prototype, {
    createContextMenuItems() {
        return [this.createDuplicateContextMenuItem(), this.createRemoveContextMenuItem()];
    },

    createDuplicateContextMenuItem() {
        return {
            text: "Duplicate",
            icon: "fa-light fa-clone",
            buildControl: $container => {
                $("<div>").appendTo($container).dxButton({
                    text: "Duplicate",
                    stylingMode: "outlined",
                    width: 100,
                    onClick: () => {
                        this.duplicateBlock();
                    }
                });
            }
        };
    },

    createRemoveContextMenuItem() {
        return {
            text: "Remove",
            icon: "fa-light fa-trash-can",
            buildControl: $container => {
                $("<div>").appendTo($container).dxButton({
                    text: "Remove",
                    stylingMode: "contained",
                    type: "danger",
                    width: 100,
                    onClick: () => {
                        this.notebookEditor.removeBlock(this.block.id);
                    }
                });
            }
        };
    }
});
