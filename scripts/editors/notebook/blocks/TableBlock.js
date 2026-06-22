class TableNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-table", "Table");
    }
}

BlocksRegistry.register("table", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new TableNotebookShape(notebookEditor, block)
});

var TableBlock = TableNotebookShape;
