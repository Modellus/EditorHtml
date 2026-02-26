class SliderTransformer extends RectangleTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 12;
        var handles = super.getHandles();
        handles.push({
            className: "handle splitter",
            getAttributes: _ => {
                const position = this.shape.getBoardPosition();
                return {
                    x: position.x,
                    y: this.shape.getSplitterBoardY() - size / 2,
                    width: this.shape.properties.width,
                    height: size
                };
            },
            getTransform: e => ({
                splitterValue: this.shape.getValueFromBoardY(e.y)
            })
        });
        return handles;
    }

    transformShape(transform) {
        if (transform.splitterValue != null) {
            this.shape.setSplitterValue(transform.splitterValue);
            return;
        }
        super.transformShape(transform);
    }
}
