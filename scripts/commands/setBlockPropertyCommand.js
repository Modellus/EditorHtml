class SetBlockPropertyCommand extends Command {
    constructor(notebookEditor, blockId, name, value) {
        super();
        this.notebookEditor = notebookEditor;
        this.blockId = blockId;
        this.name = name;
        this.value = value;
        this.previousBlock = null;
    }

    execute() {
        const block = this.notebookEditor.getBlockById(this.blockId);
        if (!block)
            return;
        if (!this.previousBlock)
            this.previousBlock = Utils.cloneProperties(block);
        this.notebookEditor.applyBlockProperty(this.blockId, this.name, this.value);
    }

    undo() {
        if (this.previousBlock)
            this.notebookEditor.restoreBlockProperties(this.blockId, this.previousBlock);
    }
}
