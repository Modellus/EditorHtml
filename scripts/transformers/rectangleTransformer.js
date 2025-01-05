class RectangleTransformer extends CircleTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        var handles = super.getHandles();
        handles.push({
            className: "handle rotation",
            getAttributes: _ => ({
                x: this.shape.properties.x + this.shape.properties.width / 2 - size / 2,
                y: this.shape.properties.y - size / 2,
                width: size,
                height: size
            }),
            getTransform: e => ({
                rotation: Math.atan2(e.y + this.shape.properties.height / 2 - e.y, e.x + this.shape.properties.width / 2 - e.x) * 180 / Math.PI
            })
        });
        return handles;
    }
}