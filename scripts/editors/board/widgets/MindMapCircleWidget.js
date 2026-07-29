class MindMapCircleShape extends MindMapNodeShape {
    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Mind Map Circle Name");
        this.properties.width = 140;
        this.properties.height = 140;
        const center = this.board.getClientCenter();
        this.properties.x = center.x - this.properties.width / 2;
        this.properties.y = center.y - this.properties.height / 2;
    }

    getMinimumDrawSize() {
        return { width: 140, height: 140 };
    }

    getBodyTag() {
        return "ellipse";
    }

    getTextInset() {
        return { horizontal: this.properties.width * 0.16, vertical: this.properties.height * 0.16 };
    }

    drawBody() {
        this.bodyElement.setAttribute("cx", this.properties.width / 2);
        this.bodyElement.setAttribute("cy", this.properties.height / 2);
        this.bodyElement.setAttribute("rx", this.properties.width / 2);
        this.bodyElement.setAttribute("ry", this.properties.height / 2);
        this.applyBodyStyle();
    }

    getSelectionOutlinePrimitives() {
        const position = this.getBoardPosition();
        return [{
            tag: "ellipse",
            mode: "fill",
            attributes: {
                cx: position.x + this.properties.width / 2,
                cy: position.y + this.properties.height / 2,
                rx: this.properties.width / 2,
                ry: this.properties.height / 2
            }
        }];
    }
}

var MindMapCircleWidget = MindMapCircleShape;

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapCircleShape;
