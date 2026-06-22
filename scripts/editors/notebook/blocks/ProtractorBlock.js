class ProtractorNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-angle", "Protractor");
    }
}

BlocksRegistry.register("protractor", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ProtractorNotebookShape(notebookEditor, block)
});

var ProtractorBlock = ProtractorNotebookShape;
