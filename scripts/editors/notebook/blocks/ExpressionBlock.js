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
                getSemanticMetadata: () => this.getSemanticMetadata(),
                onInput: () => this.onInput()
            });
            this.expressionControl.create(expressionContainer);
            this.expressionControl.syncHandwrittenStyle();
        }

        onInput() {
            this.block.content = this.expressionControl.getValue();
            this.expressionControl.scheduleSemanticColoring();
            this.markChanged();
            this.notebookEditor._reparseExpressions();
        }

        draw() {
            // Keep the scroll view in sync when the block is resized.
            this.expressionControl?.updateLayout();
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

        getSemanticMetadata() {
            const functionNames = this.expressionControl.getExpressionFunctionShortcuts().map(shortcut => shortcut.shortcutText);
            return MathSemanticMetadata.fromCalculator(this.notebookEditor.calculator, this.expressionControl.getCanonicalValue(), functionNames);
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
        resizable: true,
        notebookShapeClass: ExpressionBlock,
        getNotebookToolbarMixin: () => typeof ExpressionShapeToolbarMixin !== "undefined" ? ExpressionShapeToolbarMixin : null,
        createShape: (notebookEditor, block) => new ExpressionBlock(notebookEditor, block)
    });
}
