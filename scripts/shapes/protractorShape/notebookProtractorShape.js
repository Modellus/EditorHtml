class ProtractorNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-angle", "Protractor");
    }
}

NotebookShapesFactory.register("protractor", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ProtractorNotebookShape(notebookEditor, block)
});
