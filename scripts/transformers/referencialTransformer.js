class ReferentialTransformer extends RectangleTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        var handles = super.getHandles();
        handles.push({
            className: "handle origin",
            getAttributes: _ => {
                const position = this.shape.getBoardPosition();
                return {
                    x: position.x + (this.shape.properties.originX ?? this.shape.properties.width / 2) - size / 2,
                    y: position.y + (this.shape.properties.originY ?? this.shape.properties.height / 2) - size / 2,
                    width: size,
                    height: size
                }
            },
            getTransform: e => {
                const position = this.shape.getBoardPosition();
                return {
                    originX: e.x - position.x,
                    originY: e.y - position.y
                }
            }
        });
        return handles;
    }

    transformShape(transform) {
        super.transformShape(transform);
        if (transform.originX && transform.originY) {
            this.shape.properties.originX = transform.originX;
            this.shape.properties.originY = transform.originY;
        }
    }
}