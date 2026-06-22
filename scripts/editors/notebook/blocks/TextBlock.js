class TextNotebookShape extends EditableNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "Type something...");
    }
}

BlocksRegistry.register("text", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new TextNotebookShape(notebookEditor, block)
});

var TextBlock = TextNotebookShape;
