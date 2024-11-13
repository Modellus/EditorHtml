class AddExpressionCommand extends Command {
    constructor(svg) {
        super();
        this.svg = svg;
        this.expression = null;
    }

    execute() {
        var width = 200;
        var height = 50; 
        const svgRect = this.svg.svg.getBoundingClientRect();
        const divRect = this.svg.svg.parentNode.getBoundingClientRect();
        const divCenterX = divRect.left + divRect.width / 2;
        const divCenterY = divRect.top + divRect.height / 2;
        const svgPoint = this.svg.svg.createSVGPoint();
        svgPoint.x = divCenterX;
        svgPoint.y = divCenterY;
        const svgCTM = this.svg.svg.getScreenCTM().inverse();
        const svgCoords = svgPoint.matrixTransform(svgCTM);
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("cx", svgCoords.x);
        foreignObject.setAttribute("cy", svgCoords.y);
        foreignObject.setAttribute("width", width);
        foreignObject.setAttribute("height", height);
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.svg.svg.appendChild(foreignObject);
        $div.addClass("mq-editable-field mq-math-mode");
        var MQ = MathQuill.getInterface(2);
        var mathField = MQ.MathField($div[0], {
            spaceBehavesLikeTab: true,
            handlers: {
                edit: function() { 
                    
                }
            }
        });
        var data = { name: "Expression", xVariable: "", yVariable: "" };
        this.expression = new Shape(svg, foreignObject, data);
    }
    
    undo() {
        shapes.remove(this.expression);
        this.svg.svg.removeChild(this.expression.element);
    }
}