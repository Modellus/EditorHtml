class ExpressionShape extends BaseShape {
    constructor(board, calculator, properties) {
        super(board, calculator, properties);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.classList.add("mq-editable-field", "mq-math-mode");
        foreignObject.appendChild(div);
        var MQ = MathQuill.getInterface(2);
        var shape = this;
        this.mathField = MQ.MathField(div, {
            spaceBehavesLikeTab: true,
            handlers: {
                edit: _ => shape.onEdit()
            }
        });
        var expression = this.properties.expression ?? "{\\frac{dx}{dt}}=y";
        this.mathField.latex(expression);
        return foreignObject;
    }

    onEdit() {
        this.properties.expression = this.mathField.latex();
        var detail = { 
            shape: this,
            expression: this.properties.expression 
        };
        this.dispatchChangedEvent(detail);
    }

    static deserialize(calculator, data) {
        return new ExpressionShape(calculator, data);
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