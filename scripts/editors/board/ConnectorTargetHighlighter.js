class ConnectorTargetHighlighter {
    constructor(shell) {
        this.shell = shell;
        this.board = shell.board;
        this.targetShape = null;
        this.group = this.board.createSvgElement("g");
        this.group.setAttribute("class", "mdl-connection-target");
        this.group.setAttribute("visibility", "hidden");
        this.group.setAttribute("pointer-events", "none");
    }

    show(shape) {
        this.targetShape = shape;
        if (!shape) {
            this.hide();
            return;
        }
        if (this.group.parentNode !== this.board.svg)
            this.board.svg.appendChild(this.group);
        this.update();
    }

    update() {
        if (!this.targetShape)
            return;
        const primitives = this.resolvePrimitives(this.targetShape);
        if (!primitives || primitives.length === 0) {
            this.hide();
            return;
        }
        this.group.innerHTML = "";
        for (const primitive of primitives)
            this.group.appendChild(this.createElement(primitive));
        const center = this.targetShape.getShapeCenter();
        const rotation = this.targetShape.getAbsoluteRotation();
        this.group.setAttribute("transform", `rotate(${rotation} ${center.x} ${center.y})`);
        this.group.setAttribute("visibility", "visible");
    }

    resolvePrimitives(shape) {
        const custom = shape.getSelectionOutlinePrimitives?.();
        if (custom && custom.length > 0)
            return custom;
        const position = shape.getBoardPosition();
        return [{
            tag: "rect",
            mode: "fill",
            attributes: { x: position.x, y: position.y, width: shape.properties.width, height: shape.properties.height }
        }];
    }

    createElement(primitive) {
        const element = this.board.createSvgElement(primitive.tag);
        for (const [name, value] of Object.entries(primitive.attributes ?? {}))
            element.setAttribute(name, value);
        if (primitive.mode === "stroke") {
            element.setAttribute("fill", "none");
            element.setAttribute("stroke", "currentColor");
            element.setAttribute("stroke-width", primitive.strokeWidth ?? 2);
        }
        return element;
    }

    hide() {
        this.targetShape = null;
        this.group.setAttribute("visibility", "hidden");
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ConnectorTargetHighlighter;
