class SetShapePropertiesCommand extends Command {
    constructor(board, shape, properties) {
        super();
        this.board = board;
        this.shape = shape;
        this.properties = properties;
    }

    execute() {
        this.previousProperties = this.shape.properties;
        this.board.setShapeProperties(this.shape, this.properties);
    }
    
    undo() {
        this.board.setShapeProperties(this.shape, this.previousProperties);
    }
}