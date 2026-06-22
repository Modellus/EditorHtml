class ReferentialNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-shapes", "Simulation");
    }
}

BlocksRegistry.register("simulation", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ReferentialNotebookShape(notebookEditor, block)
});

var ReferentialBlock = ReferentialNotebookShape;
