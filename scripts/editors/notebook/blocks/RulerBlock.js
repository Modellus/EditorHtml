class RulerNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-ruler", "Ruler");
    }
}

BlocksRegistry.register("ruler", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new RulerNotebookShape(notebookEditor, block)
});

var RulerBlock = RulerNotebookShape;
