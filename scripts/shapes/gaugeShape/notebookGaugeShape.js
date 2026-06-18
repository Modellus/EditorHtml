class GaugeNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-gauge", "Gauge");
    }
}

NotebookShapesFactory.register("gauge", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new GaugeNotebookShape(notebookEditor, block)
});
