class RemoveShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
    }

    execute() {
        this.board.removeShape(this.shape);
    }
    
    undo() {
        this.board.addShape(this.shape);
    }
}