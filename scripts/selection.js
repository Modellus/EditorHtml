class Selection {
    constructor(svg) {
        this.svg = svg;
        this.selectedShape = null;
        this.transformer = null;
        this.svg.addEventListener('mousedown', (e) => this.onClickOutside(e));
        this.svg.addEventListener('mousedown', (e) => this.onSelectShape(e));
    }

    select(shape) {
        this.deselect();
        this.selectedShape = shape;
        this.transformer = new Transformer(this.svg, shape);
        this.transformer.show();
    }

    deselect() {
        if (this.transformer)
            this.transformer.hide();
        this.selectedShape = null;
        this.transformer = null;
    }

    onClickOutside(event) {
        if (!event.target.classList.contains('handle') && !event.target.classList.contains('bounding-box') && !event.target.isSameNode(this.selectedShape?.element))
            this.deselect();
    }

    onSelectShape(event) {
        const targetShape = event.target;
        var shape = this.findShape(targetShape);
        if (shape != undefined && targetShape !== this.selectedShape?.element) {
            this.select(shape);
        }
    }

    findShape(element) {
        var current = element;
        while(current != null) {
            var shape = shapes.getShape(current.id);
            if (shape != undefined)
                return shape;
            current = current.parentElement;
        }
        return undefined;
    }
}