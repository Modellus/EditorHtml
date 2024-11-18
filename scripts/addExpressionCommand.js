class AddExpressionCommand extends Command {
    constructor(board) {
        super();
        this.board = board;
        this.expression = null;
    }

    execute() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", this.board.svg.clientWidth / 2);
        foreignObject.setAttribute("y", this.board.svg.clientHeight / 2);
        foreignObject.setAttribute("width", 200);
        foreignObject.setAttribute("height", 50);
        const div = document.createElement("div");
        div.style.width = "100%";
        div.style.height = "100%";
        div.classList.add("mq-editable-field", "mq-math-mode");
        this.board.svg.appendChild(foreignObject);
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
        this.expression = new Shape(board, foreignObject, data);
    }
    
    undo() {
        shapes.remove(this.expression);
        this.board.svg.removeChild(this.expression.element);
    }
}