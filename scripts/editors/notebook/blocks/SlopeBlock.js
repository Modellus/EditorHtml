class SlopeNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-ruler-triangle", "Slope");
    }
}

BlocksRegistry.register("slope", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new SlopeNotebookShape(notebookEditor, block)
});

var SlopeBlock = SlopeNotebookShape;
