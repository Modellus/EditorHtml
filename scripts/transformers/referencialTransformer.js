class ReferentialTransformer extends RectangleTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        var handles = super.getHandles();
        handles.push({
            className: "handle origin",
            getAttributes: _ => ({
                x: this.shape.properties.x + this.shape.properties.originX - size / 2,
                y: this.shape.properties.y + this.shape.properties.originY - size / 2,
                width: size,
                height: size
            }),
            getTransform: e => ({
                originX: e.x - this.shape.properties.x,
                originY: e.y - this.shape.properties.y
            })
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