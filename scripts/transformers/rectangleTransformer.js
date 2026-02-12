class RectangleTransformer extends CircleTransformer {
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
                    }
                },
                getTransform: e => ({
                    x: this.shape.properties.x + e.dx,
                    y: this.shape.properties.y + e.dy,
                    width: this.shape.properties.width,
                    height: this.shape.properties.height
                })
            },
            {
                className: "handle top-left",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x - size / 2,
                        y: position.y - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => ({
                    x: this.shape.properties.width - e.dx > 10 ? this.shape.properties.x + e.dx : this.shape.properties.x,
                    y: this.shape.properties.height - e.dy > 10 ? this.shape.properties.y + e.dy : this.shape.properties.y,
                    width: this.shape.properties.width - e.dx > 10 ? this.shape.properties.width - e.dx : this.shape.properties.width,
                    height: this.shape.properties.height - e.dy > 10 ? this.shape.properties.height - e.dy : this.shape.properties.height
                })
            },
            {
                className: "handle top-right",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x + this.shape.properties.width - size / 2,
                        y: position.y - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.height - e.dy > 10 ? this.shape.properties.y + e.dy : this.shape.properties.y,
                    width: this.shape.properties.width + e.dx > 10 ? this.shape.properties.width + e.dx : this.shape.properties.width,
                    height: this.shape.properties.height - e.dy > 10 ? this.shape.properties.height - e.dy : this.shape.properties.height
                })
            },
            {
                className: "handle bottom-left",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x - size / 2,
                        y: position.y + this.shape.properties.height - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => ({
                    x: this.shape.properties.width - e.dx > 10 ? this.shape.properties.x + e.dx : this.shape.properties.x,
                    y: this.shape.properties.y,
                    width: this.shape.properties.width - e.dx > 10 ? this.shape.properties.width - e.dx : this.shape.properties.width,
                    height: this.shape.properties.height + e.dy > 10 ? this.shape.properties.height + e.dy : this.shape.properties.height
                })
            },
            {
                className: "handle bottom-right",
                getAttributes: _ => {
                    const position = this.shape.getBoardPosition();
                    return {
                        x: position.x + this.shape.properties.width - size / 2,
                        y: position.y + this.shape.properties.height - size / 2,
                        width: size,
                        height: size
                    }
                },
                getTransform: e => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.y,
                    width: this.shape.properties.width + e.dx > 10 ? this.shape.properties.width + e.dx : this.shape.properties.width,
                    height: this.shape.properties.height + e.dy > 10 ? this.shape.properties.height + e.dy : this.shape.properties.height
                })
            }/*,
            {
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
            }*/
        ];
    }
}
