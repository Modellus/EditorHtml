class AddShapeCommand extends Command {
    constructor(board, shape) {
        super();
        this.board = board;
        this.shape = shape;
    }

    static getType() {
        return "AddShapeCommand";
    }
    
    execute() {
        this.board.addShape(this.shape);
    }
    
    undo() {
        if (this.shape) 
            this.board.removeShape(this.shape);
        this.shape = null;
    }
}