class MoveBlockCommand extends Command {
    constructor(notebookEditor, blockId, fromIndex, toIndex) {
        super();
        this.notebookEditor = notebookEditor;
        this.blockId = blockId;
        this.fromIndex = fromIndex;
        this.toIndex = toIndex;
    }

    execute() {
        this.notebookEditor.moveBlock(this.blockId, this.toIndex);
    }

    undo() {
        this.notebookEditor.moveBlock(this.blockId, this.fromIndex);
    }
}
