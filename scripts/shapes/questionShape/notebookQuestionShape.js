class QuestionNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-clipboard-question", "Question");
    }
}

NotebookShapesFactory.register("question", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new QuestionNotebookShape(notebookEditor, block)
});
