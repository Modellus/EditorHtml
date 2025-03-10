class AddShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
    }

    execute() {
        this.board.addShape(this.shape);
    }
    
    undo() {
        this.board.removeShape(this.shape);
    }
}