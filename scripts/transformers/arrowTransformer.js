class ArrowTransformer extends BaseTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 12;
        return [
            {
                className: "handle move",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x,
                        y: position.y,
                        width: this.shape.properties.width,
                        height: this.shape.properties.height
                    };
                },
                getTransform: e => ({
                    x: this.shape.delta("x", e.dx),
                    y: this.shape.delta("y", e.dy)
                })
            },
            {
                className: "handle tip",
                getAttributes: _ => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        x: boardPosition.x + this.shape.properties.width - size / 2,
                        y: boardPosition.y + this.shape.properties.height - size / 2,
                        width: size,
                        height: size
                    };
                },
                getTransform: e => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        x: 0,
                        y: 0,
                        width: e.x - boardPosition.x,
                        height: e.y - boardPosition.y
                    };
                }
            }
        ];
    }
}
