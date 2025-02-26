class TextShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    setDefaults() {
        this.properties.name = this.board.translations.get("Text Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.text = "Unleash your inner scientist—type, format, and let the math magic happen!";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.htmlEditor = $div.dxHtmlEditor({
            toolbar1: {
                items: [
                    "undo", "redo", "separator", "bold", "italic", "separator",
                    {
                        name: "header",
                        acceptedValues: [false, 1, 2, 3, 4, 5],
                        options: { 
                            inputAttr: { 
                                "aria-label": "Header" } 
                            },
                    },
                    "separator",
                    "orderedList", "bulletList",
                ],
            },
            value: this.properties.text,
            onValueChanged: e => this.properties.text = e.value
        }).dxHtmlEditor("instance");
        return foreignObject;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.text == undefined)
            return;
        this.htmlEditor.option("value", properties.text);
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }
}