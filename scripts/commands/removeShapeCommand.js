class RemoveShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
        this.removedShapes = [];
        this.attachedConnectors = [];
    }

    execute() {
        this.removedShapes = this.collectShapes(this.shape);
        this.attachedConnectors = this.collectAttachedConnectors();
        this.board.removeShape(this.shape);
        this.attachedConnectors.forEach(connector => this.board.removeShape(connector));
    }

    collectShapes(shape) {
        const shapes = [{ shape: shape, parent: shape.parent }];
        for (const child of shape.children)
            shapes.push(...this.collectShapes(child));
        return shapes;
    }

    collectAttachedConnectors() {
        if (this.shape.isConnector())
            return [];
        return Array.from(this.board.connectorIndex.collectForSubtree(this.shape));
    }

    undo() {
        for (const entry of this.removedShapes) {
            entry.shape.parent = entry.parent;
            if (entry.parent)
                entry.parent.children.push(entry.shape);
            this.board.addShape(entry.shape, entry.shape === this.shape);
        }
        this.attachedConnectors.forEach(connector => this.board.addShape(connector, false));
    }
}
