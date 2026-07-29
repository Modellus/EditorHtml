class MindMapRectangleShape extends MindMapNodeShape {
    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Mind Map Rectangle Name");
    }

    getBodyTag() {
        return "rect";
    }

    drawBody() {
        super.drawBody();
        this.bodyElement.setAttribute("rx", this.getBorderRadius());
    }
}

var MindMapRectangleWidget = MindMapRectangleShape;

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapRectangleShape;
