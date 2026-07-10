class RemoveShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
        this.removedShapes = [];
    }

    execute() {
        this.removedShapes = this.collectShapes(this.shape);
        this.board.removeShape(this.shape);
    }

    collectShapes(shape) {
        const shapes = [{ shape: shape, parent: shape.parent }];
        for (const child of shape.children)
            shapes.push(...this.collectShapes(child));
        return shapes;
    }

    undo() {
        for (const entry of this.removedShapes) {
            entry.shape.parent = entry.parent;
            if (entry.parent)
                entry.parent.children.push(entry.shape);
            this.board.addShape(entry.shape, entry.shape === this.shape);
        }
    }
}
