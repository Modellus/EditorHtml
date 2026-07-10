class RemoveBlockCommand extends Command {
    constructor(notebookEditor, blockId) {
        super();
        this.notebookEditor = notebookEditor;
        this.blockId = blockId;
    }

    execute() {
        this.index = this.notebookEditor.getBlockIndex(this.blockId);
        this.block = this.notebookEditor.getBlockById(this.blockId);
        this.notebookEditor.removeBlock(this.blockId);
    }

    undo() {
        if (this.block)
            this.notebookEditor.insertBlockAt(this.block, this.index);
    }
}
