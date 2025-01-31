class Commands {
    constructor(shell) {
        this.shell = shell;
        this.invoker = new CommandsInvoker();
    }

    registerShape(shapeClass) {
        this.shell.board.shapes.registerShape(shapeClass);
    }

    selectShape(name) {
        var shape = this.shell.board.shapes.getByName(name);
        if (shape === null) 
            throw new Error(`Shape "${name}" not found.`);
        const command = new SelectShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    addShape(type, name) {
        var shape = this.shell.board.shapes.createShape(type, this.shell.board.selection.selectedShape);
        shape.setProperties({ name: name });
        shape.element.addEventListener("changed", e => this.shell.onShapeChanged(e));
        const command = new AddShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    removeShape(name) {
        var shape = this.shell.board.shapes.getByName(name);
        if (shape === null) 
            throw new Error(`Shape "${name}" not found.`);
        const command = new RemoveShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    removeShapeById(id) {
        var shape = this.shell.board.shapes.getById(id);
        if (shape === null) 
            throw new Error(`Shape "${id}" not found.`);
        const command = new RemoveShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    setShapeProperties(name, properties) {
        var shape = this.shell.board.shapes.getByName(name);
        if (shape === null) 
            throw new Error(`Shape "${name}" not found.`);
        const command = new SetShapePropertiesCommand(this.shell.board, shape, properties);
        this.invoker.execute(command);
    }

    undo() {
        this.invoker.undo();
    }

    redo() {
        this.invoker.redo();
    }   
}