class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    setDefaults() {
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 25;
        this.properties.width = 300;
        this.properties.height = 50;
        this.properties.rotation = 0;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[1].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[0].color;
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");
        $(div).css({ "width": "100%", "height": "100%", "background-color": "transparent" });
        foreignObject.appendChild(div);
        this.mathfield = new MathfieldElement();
        this.mathfield.smartMode = true;
        this.mathfield.popoverPolicy = "none";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.addEventListener("change", _ => this.onChange());
        this.mathfield.addEventListener("focus", _ => this.onFocus());
        div.appendChild(this.mathfield);
        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true, 
            scrollByThumb: true
        });
        var expression = this.properties.expression ?? "{\\frac{dx}{dt}}=y";
        this.mathfield.value = expression;
        return foreignObject;
    }

    static deserialize(board, data) {
        var shape = super.deserialize(board, data);
        shape.mathfield.value = data.properties.expression;
        return shape;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression == undefined)
            return;
        this.mathfield.value = properties.expression;
        this.onChange();
    }

    onChange() {
        this.properties.expression = this.mathfield.getValue();
        this.dispatchEvent("changed", { expression: this.properties.expression });
    }

    onFocus() {
        this.dispatchEvent("focused", {});
    }

    update() {
        this.element.style.backgroundColor = this.properties.backgroundColor;
        this.mathfield.style.color = this.properties.foregroundColor;
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