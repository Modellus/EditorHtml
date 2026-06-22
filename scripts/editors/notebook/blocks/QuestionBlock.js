class QuestionNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-clipboard-question", "Question");
    }
}

BlocksRegistry.register("question", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new QuestionNotebookShape(notebookEditor, block)
});

var QuestionBlock = QuestionNotebookShape;
