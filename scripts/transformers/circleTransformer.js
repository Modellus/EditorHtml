class CircleTransformer extends BaseTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        return [
            {
                className: "handle origin",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x - size / 2,
                        y: position.y - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: this.shape.properties.x + e.dx,
                        y: this.shape.properties.y + e.dy
                    }
                }
            },
            {
                className: "handle radius",
                getAttributes: _ => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        x: boardPosition.x + Math.cos(this.shape.properties.angle) * this.shape.properties.radius,
                        y: boardPosition.y + Math.sin(this.shape.properties.angle) * this.shape.properties.radius,
                        width: size,
                        height: size
                    };
                },
                getTransform: e => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        radius: Math.sqrt((e.x - boardPosition.x) ** 2 + (e.y - boardPosition.y) ** 2),
                        angle: Math.atan2(e.y - boardPosition.y, e.x - boardPosition.x)
                    };
                }
            }
        ];
    }
}