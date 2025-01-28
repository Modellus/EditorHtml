class Commands {
    constructor(shell) {
        this.shell = shell;
        this.invoker = new CommandsInvoker();
    }

    addShape(type) {
        var shape = this.shell.board.shapes.createShape(type, this.shell.board.selection.selectedShape);
        shape.element.addEventListener("changed", e => this.shell.onShapeChanged(e));
        const command = new AddShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }
}