class SelectShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
    }

    execute() {
        this.previousSelection = this.board.selection.selectedShape;
        this.board.selection.select(this.shape);
    }
    
    undo() {
        this.board.selection.select(this.previousSelection);
    }
}