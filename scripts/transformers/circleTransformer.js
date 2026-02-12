class CircleTransformer extends BaseTransformer {
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
                    const radius = this.shape.properties.radius ?? 0;
                    return {
                        x: position.x - radius,
                        y: position.y - radius,
                        width: radius * 2,
                        height: radius * 2
                    }
                },
                getTransform: e => ({
                    x: this.shape.delta("x", e.dx),
                    y: this.shape.delta("y", e.dy)
                })
            },
            {
                className: "handle origin",
                getAttributes: _ => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        x: boardPosition.x - size / 2,
                        y: boardPosition.y - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => {
                    const boardPosition = this.shape.getBoardPosition();
                    return {
                        x: this.shape.delta("x", e.dx),
                        y: this.shape.delta("y", e.dy)
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
