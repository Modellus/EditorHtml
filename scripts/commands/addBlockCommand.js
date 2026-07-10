class AddBlockCommand extends Command {
    constructor(notebookEditor, block, index) {
        super();
        this.notebookEditor = notebookEditor;
        this.block = block;
        this.index = index;
    }

    execute() {
        this.notebookEditor.insertBlockAt(this.block, this.index);
    }

    undo() {
        this.notebookEditor.removeBlock(this.block.id);
    }
}
