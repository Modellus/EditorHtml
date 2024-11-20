class ExpressionShape extends BaseShape {
    constructor(properties) {
        super(properties);
    }

    createElement() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.classList.add("mq-editable-field", "mq-math-mode");
        foreignObject.appendChild(div);
        var MQ = MathQuill.getInterface(2);
        var mathField = MQ.MathField(div, {
            spaceBehavesLikeTab: true,
            handlers: {
                edit: function() { 
                }
            }
        });
        mathField.latex("{\\frac{dx}{dt}}=y");
        return foreignObject;
    }

    static deserialize(data) {
        return new ExpressionShape(data);
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