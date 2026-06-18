class ValueNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-input-numeric", "Value");
    }
}

NotebookShapesFactory.register("value", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ValueNotebookShape(notebookEditor, block)
});
