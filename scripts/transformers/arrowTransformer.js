class ArrowTransformer extends BaseTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        return [
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