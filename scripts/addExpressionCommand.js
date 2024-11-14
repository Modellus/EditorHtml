class AddExpressionCommand extends Command {
    constructor(svg) {
        super();
        this.svg = svg;
        this.expression = null;
    }

    execute() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", this.svg.svg.clientWidth / 2);
        foreignObject.setAttribute("y", this.svg.svg.clientHeight / 2);
        foreignObject.setAttribute("width", 200);
        foreignObject.setAttribute("height", 50);
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.classList.add("mq-editable-field", "mq-math-mode");
        this.svg.svg.appendChild(foreignObject);
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
        var data = { name: "Expression", xVariable: "", yVariable: "" };
        this.expression = new Shape(svg, foreignObject, data);
    }
    
    undo() {
        shapes.remove(this.expression);
        this.svg.svg.removeChild(this.expression.element);
    }
}