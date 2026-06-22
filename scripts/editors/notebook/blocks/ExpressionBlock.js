var ExpressionBlock;
var ExpressionNotebookShape;
if (typeof BlocksRegistry !== "undefined") {
    ExpressionBlock = class ExpressionBlock extends BlockShape {
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

        insertShortcut(shortcutText) {
            if (!this.expressionControl)
                return;
            const currentValue = this.expressionControl.getValue();
            this.expressionControl.setValue(`${currentValue}${shortcutText}`);
            this.block.content = this.expressionControl.getValue();
            this.markChanged();
        }

        insert(text) {
            this.insertShortcut(text);
        }

        getTemplateShortcuts() {
            const independentTermName = this.notebookEditor?.calculator?.properties?.independent?.name ?? "t";
            return resolveExpressionTemplateShortcuts(independentTermName);
        }

        createShortcutTooltip(cell, itemData) {
        }

        unmount() {
            if (this.expressionControl)
                this.expressionControl.dispose();
            this.expressionControl = null;
            super.unmount();
        }
    };

    ExpressionNotebookShape = ExpressionBlock;
    BlocksRegistry.register("expression", {
        defaultContent: "\\displaylines{}",
        notebookShapeClass: ExpressionBlock,
        getNotebookToolbarMixin: () => typeof ExpressionShapeToolbarMixin !== "undefined" ? ExpressionShapeToolbarMixin : null,
        createShape: (notebookEditor, block) => new ExpressionBlock(notebookEditor, block)
    });
}
