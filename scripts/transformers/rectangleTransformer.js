class RectangleTransformer extends CircleTransformer {
    constructor(board, shape) {
        super(board, shape);
    }

    getShapeCenter() {
        const position = this.shape.getBoardPosition();
        return {
            x: position.x + this.shape.properties.width / 2,
            y: position.y + this.shape.properties.height / 2
        };
    }

    getRotationHandleDistance(size) {
        return this.shape.properties.height / 2 + size * 1.5;
    }

    getRotationHandlePosition(size) {
        const center = this.getShapeCenter();
        const distance = this.getRotationHandleDistance(size);
        return {
            x: center.x - size / 2,
            y: center.y - distance - size / 2,
            width: size,
            height: size
        };
    }

    getRotationDegreesFromPointer(point) {
        const center = this.getShapeCenter();
        const deltaX = point.x - center.x;
        const deltaY = point.y - center.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < 1)
            return Number(this.shape.properties.rotation) || 0;
        return Math.atan2(deltaX, -deltaY) * 180 / Math.PI;
    }

    getHandles() {
        const size = 12;
        const rotationSize = 16;
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
            },
            {
                className: "handle rotation",
                getAttributes: _ => this.getRotationHandlePosition(rotationSize),
                getTransform: e => ({
                    rotation: this.getRotationDegreesFromPointer(e)
                })
            }
        ];
    }
}
