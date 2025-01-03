class Selection {
    constructor(board) {
        this.board = board;
        this.selectedShape = null;
        this.transformer = null;
        this.board.svg.addEventListener("mousedown", (e) => this.onClickOutside(e));
        this.board.svg.addEventListener("mousedown", (e) => this.onSelectShape(e));
    }

    dispatchSelectedEvent() {
        const selectedEvent = new CustomEvent('selected', {
            detail: {
                shape: this.selectedShape
            }
        });
        this.board.svg.dispatchEvent(selectedEvent);
    }

    dispatchDeselectedEvent() {
        const deselectedEvent = new CustomEvent('deselected', {
            detail: {
                shape: this.selectedShape
            }
        });
        this.board.svg.dispatchEvent(deselectedEvent);
    }

    select(shape) {
        this.deselect();
        this.selectedShape = shape;
        this.transformer = shape.createTransformer();
        this.transformer.show();
        this.dispatchSelectedEvent();
    }

    deselect() {
        if (this.transformer)
            this.transformer.hide();
        if (this.selectedShape != null)
            this.dispatchDeselectedEvent();
        this.selectedShape = null;
        this.transformer = null;
    }

    onClickOutside(event) {
        if (!event.target.classList.contains("handle") && !event.target.classList.contains("bounding-box") && !event.target.isSameNode(this.selectedShape?.element))
            this.deselect();
    }

    onSelectShape(event) {
        const targetShape = event.target;
        var shape = this.findShape(targetShape);
        if (shape != undefined && targetShape !== this.selectedShape?.element)
            this.select(shape);
    }

    findShape(element) {
        var current = element;
        while(current != null) {
            var shape = board.getShape(current.id);
            if (shape != undefined)
                return shape;
            current = current.parentElement;
        }
        return undefined;
    }
}