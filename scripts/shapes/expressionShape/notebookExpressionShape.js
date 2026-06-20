class ExpressionNotebookShape extends NotebookShape {
    renderContentHtml() {
        return `<div id="${this.getHostId()}" class="notebook-expression-control"></div>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        const expressionContainer = contentElement.querySelector(`#${this.getHostId()}`);
        if (!expressionContainer)
            return;
        this.expressionControl = new ExpressionControl({
            multiline: true,
            useScrollView: true,
            value: this.block.content || "\\displaylines{}",
            onInput: () => this.onInput()
        });
        this.expressionControl.create(expressionContainer);
        this.expressionControl.syncHandwrittenStyle();
    }

    onInput() {
        this.block.content = this.expressionControl.getValue();
        this.markChanged();
        this.notebookEditor._reparseExpressions();
    }

    unmount() {
        if (this.expressionControl)
            this.expressionControl.dispose();
        this.expressionControl = null;
        super.unmount();
    }
}

NotebookShapesFactory.register("expression", {
    defaultContent: "\\displaylines{}",
    createShape: (notebookEditor, block) => new ExpressionNotebookShape(notebookEditor, block)
});
