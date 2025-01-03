class CircleTransformer extends BaseTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getHandles() {
        const size = 8;
        return [
            {
                className: "handle move top",
                attributes: _ => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.y,
                    width: this.shape.properties.width,
                    height: 1
                }),
                event: e => ({
                    x: this.shape.properties.x + e.dx,
                    y: this.shape.properties.y + e.dy,
                    width: this.shape.properties.width,
                    height: this.shape.properties.height
                })
            },
            {
                className: "handle move bottom",
                attributes: _ => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.y + this.shape.properties.height,
                    width: this.shape.properties.width,
                    height: 1
                }),
                event: e => ({
                    x: this.shape.properties.x + e.dx,
                    y: this.shape.properties.y + e.dy,
                    width: this.shape.properties.width,
                    height: this.shape.properties.height
                })
            },
            {
                className: "handle move left",
                attributes: _ => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.y,
                    width: 1,
                    height: this.shape.properties.height
                }),
                event: e => ({
                    x: this.shape.properties.x + e.dx,
                    y: this.shape.properties.y + e.dy,
                    width: this.shape.properties.width,
                    height: this.shape.properties.height
                })
            },
            {
                className: "handle move right",
                attributes: _ => ({
                    x: this.shape.properties.x + this.shape.properties.width,
                    y: this.shape.properties.y,
                    width: 1,
                    height: this.shape.properties.height
                }),
                event: e => ({
                    x: this.shape.properties.x + e.dx,
                    y: this.shape.properties.y + e.dy,
                    width: this.shape.properties.width,
                    height: this.shape.properties.height
                })
            },
            {
                className: "handle top-left",
                attributes: _ => ({
                    x: this.shape.properties.x - size / 2,
                    y: this.shape.properties.y - size / 2,
                    width: size,
                    height: size
                }),
                event: e => ({
                    x: e.x,
                    y: e.y,
                    width: this.shape.properties.width + this.shape.properties.x - e.x,
                    height: this.shape.properties.height + this.shape.properties.y - e.y
                })
            },
            {
                className: "handle top-right",
                attributes: _ => ({
                    x: this.shape.properties.x + this.shape.properties.width - size / 2,
                    y: this.shape.properties.y - size / 2,
                    width: size,
                    height: size
                }),
                event: e => ({
                    x: this.shape.properties.x,
                    y: e.y,
                    width: e.x - this.shape.properties.x,
                    height: this.shape.properties.height + this.shape.properties.y - e.y
                })
            },
            {
                className: "handle bottom-left",
                attributes: _ => ({
                    x: this.shape.properties.x - size / 2,
                    y: this.shape.properties.y + this.shape.properties.height - size / 2,
                    width: size,
                    height: size
                }),
                event: e => ({
                    x: e.x,
                    y: this.shape.properties.y,
                    width: this.shape.properties.width + this.shape.properties.x - e.x,
                    height: e.y - this.shape.properties.y
                })
            },
            {
                className: "handle bottom-right",
                attributes: _ => ({
                    x: this.shape.properties.x + this.shape.properties.width - size / 2,
                    y: this.shape.properties.y + this.shape.properties.height - size / 2,
                    width: size,
                    height: size
                }),
                event: e => ({
                    x: this.shape.properties.x,
                    y: this.shape.properties.y,
                    width: e.x - this.shape.properties.x,
                    height: e.y - this.shape.properties.y
                })
            }
        ];
    }
}