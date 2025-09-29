class Selection {
    constructor(board) {
        this.board = board;
        this.selectedShape = null;
        this.transformer = null;
        this.enabled = true;
        this.board.svg.addEventListener("mousedown", (e) => this.onClickOutside(e));
        this.board.svg.addEventListener("mousedown", (e) => this.onSelectShape(e));
    }

    dispatchEvent(name, shape) {
        const selectedEvent = new CustomEvent(name, {
            detail: {
                shape: shape
            }
        });
        this.board.svg.dispatchEvent(selectedEvent);
    }

    select(shape) {
        this.deselect();
        this.selectedShape = shape;
        this.transformer = shape.createTransformer();
        this.transformer.show();
        this.dispatchEvent("selected", this.selectedShape);
    }

    deselect() {
        var selectedShape = this.selectedShape;
        var transformer = this.transformer;
        this.selectedShape = null;
        this.transformer = null;
        if (transformer)
            transformer.hide();
        if (selectedShape != null)
            this.dispatchEvent("deselected", selectedShape);
    }

    onClickOutside(event) {
        if (!event.target.classList.contains("handle") && !event.target.classList.contains("bounding-box") && !event.target.isSameNode(this.selectedShape?.element))
            this.deselect();
    }

    onSelectShape(event) {
        if (!this.enabled)
            return;
        const targetShape = event.target;
        var shape = this.findShape(targetShape);
        if (shape != undefined && targetShape !== this.selectedShape?.element)
            this.select(shape);
    }

    findShape(element) {
        var current = element;
        while(current != null) {
            var shape = this.board.getShape(current.id);
            if (shape != undefined)
                return shape;
            current = current.parentElement;
        }
        return undefined;
    }

    update() {
        if (this.transformer)
            this.transformer.updateHandles();
    }
}