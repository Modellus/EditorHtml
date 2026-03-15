class ImageShape extends BodyShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const handleSize = 12;
        const rotationSize = 8;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x, y: position.y, width: this.properties.width, height: this.properties.height };
                },
                getTransform: e => ({
                    x: this.properties.x + e.dx,
                    y: this.properties.y + e.dy,
                    width: this.properties.width,
                    height: this.properties.height
                })
            },
            {
                className: "handle top-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x - handleSize / 2, y: position.y - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                className: "handle top-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x + this.properties.width - handleSize / 2, y: position.y - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width + e.dx > 10 ? this.properties.width + e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                className: "handle bottom-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x - handleSize / 2, y: position.y + this.properties.height - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height + e.dy > 10 ? this.properties.height + e.dy : this.properties.height
                })
            },
            {
                className: "handle bottom-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x + this.properties.width - handleSize / 2, y: position.y + this.properties.height - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width + e.dx > 10 ? this.properties.width + e.dx : this.properties.width,
                    height: this.properties.height + e.dy > 10 ? this.properties.height + e.dy : this.properties.height
                })
            },
            {
                className: "handle rotation",
                getAttributes: () => this.getRotationHandlePosition(rotationSize),
                getTransform: e => ({ rotation: this.getRotationDegreesFromPointer(e) })
            }
        ];
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Image Name");
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
    }
}
