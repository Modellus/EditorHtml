class MindMapBubbleShape extends MindMapNodeShape {
    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Mind Map Bubble Name");
        this.properties.height = 120;
        const center = this.board.getClientCenter();
        this.properties.y = center.y - this.properties.height / 2;
    }

    getMinimumDrawSize() {
        return { width: 180, height: 120 };
    }

    getBodyTag() {
        return "path";
    }

    getTailHeight() {
        return Math.min(20, this.properties.height * 0.2);
    }

    getTextInset() {
        return { horizontal: 14, vertical: 10 };
    }

    getBodyHeight() {
        return this.properties.height - this.getTailHeight();
    }

    getBodyPathData() {
        const width = this.properties.width;
        const bodyHeight = this.getBodyHeight();
        const radius = Math.min(16, bodyHeight / 2, width / 2);
        const tailRight = Math.min(width - radius, width * 0.38);
        const tailLeft = Math.max(radius, width * 0.24);
        const tailTipX = Math.max(2, width * 0.18);
        return `M ${radius} 0 H ${width - radius} A ${radius} ${radius} 0 0 1 ${width} ${radius} V ${bodyHeight - radius} A ${radius} ${radius} 0 0 1 ${width - radius} ${bodyHeight} H ${tailRight} L ${tailTipX} ${this.properties.height} L ${tailLeft} ${bodyHeight} H ${radius} A ${radius} ${radius} 0 0 1 0 ${bodyHeight - radius} V ${radius} A ${radius} ${radius} 0 0 1 ${radius} 0 Z`;
    }

    drawBody() {
        this.bodyElement.setAttribute("d", this.getBodyPathData());
        this.applyBodyStyle();
    }

    drawText() {
        super.drawText();
        this.textHost.style.height = `${this.getBodyHeight()}px`;
    }

    getSelectionOutlinePrimitives() {
        const position = this.getBoardPosition();
        return [{
            tag: "rect",
            mode: "fill",
            attributes: { x: position.x, y: position.y, width: this.properties.width, height: this.getBodyHeight() }
        }];
    }
}

var MindMapBubbleWidget = MindMapBubbleShape;

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapBubbleShape;
