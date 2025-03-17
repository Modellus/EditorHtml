class Commands {
    constructor(shell) {
        this.shell = shell;
        this.shapes = shell.board.shapes;
        this.invoker = new CommandsInvoker();
    }

    registerShape(shapeClass) {
        this.shapes.registerShape(shapeClass);
    }

    selectShape(name) {
        var shape = this.shapes.getByName(name);
        if (shape === null) 
            throw new Error(`Shape "${name}" not found.`);
        const command = new SelectShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    getFreePosition(shape) {
        var position = { x: shape.properties.x, y: shape.properties.y };
        if (shape.parent !== null) 
            return position;
        position = shape.getBoardPosition();
        while(true) {
            var overlaps = false;
            for(const s of this.shapes.shapes.values()) {
                var shapePosition = s.getBoardPosition();
                if (shapePosition.x === position.x && shapePosition.y === position.y) {
                    overlaps = true;
                    break;
                }
            }
            if (!overlaps)
                break;
            position.x += 20;
            position.y += 20;
        }
        return position;
    }

    addShape(type, name, parentName) {
        var parentShape = parentName ? this.shapes.getByName(parentName) : this.shell.board.selection.selectedShape;
        var shape = this.shapes.createShape(type, parentShape);
        var position = this.getFreePosition(shape);
        shape.setProperties({ name: name, x: position.x, y: position.y });
        shape.element.addEventListener("changed", e => this.shell.onShapeChanged(e));
        const command = new AddShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    removeShape(name) {
        var shape = this.shapes.getByName(name);
        if (shape === null) 
            throw new Error(`Shape "${name}" not found.`);
        const command = new RemoveShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    removeShapeById(id) {
        var shape = this.shapes.getById(id);
        if (shape === null) 
            throw new Error(`Shape "${id}" not found.`);
        const command = new RemoveShapeCommand(this.shell.board, shape);
        this.invoker.execute(command);
    }

    setShapeProperties(name, properties) {
        var shape = this.shapes.getByName(name);
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