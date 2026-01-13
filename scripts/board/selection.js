class Selection {
    constructor(board) {
        this.board = board;
        this.selectedShape = null;
        this.transformer = null;
        this.enabled = true;
        this.pointerDown = null;
        this.dragThreshold = 4;
        this.board.svg.addEventListener("mousedown", (e) => this.onPointerDown(e));
        this.board.svg.addEventListener("mouseup", (e) => this.onPointerUp(e));
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

    onPointerDown(event) {
        this.pointerDown = {
            x: event.clientX,
            y: event.clientY
        };
    }

    onPointerUp(event) {
        if (!this.pointerDown)
            return;
        const dx = event.clientX - this.pointerDown.x;
        const dy = event.clientY - this.pointerDown.y;
        this.pointerDown = null;
        if (Math.hypot(dx, dy) > this.dragThreshold)
            return;
        this.onClickOutside(event);
        this.onSelectShape(event);
    }

    onSelectShape(event) {
        if (!this.enabled)
            return;
        const targetShape = this.resolveSelectionTarget(event);
        const shape = this.findShape(targetShape);
        if (!shape)
            return;
        const point = this.board.getMouseToSvgPoint(event);
        const childShape = this.findChildShapeAtPoint(shape, point);
        const selectedShape = childShape ?? shape;
        if (selectedShape !== this.selectedShape)
            this.select(selectedShape);
    }

    resolveSelectionTarget(event) {
        const target = event.target;
        if (!(target instanceof Element))
            return target;
        if (!target.classList.contains("handle") || !target.classList.contains("move"))
            return target;
        const previousPointerEvents = target.style.pointerEvents;
        target.style.pointerEvents = "none";
        const underlying = document.elementFromPoint(event.clientX, event.clientY);
        target.style.pointerEvents = previousPointerEvents;
        return underlying ?? target;
    }

    findChildShapeAtPoint(shape, point) {
        if (!shape?.children?.length)
            return undefined;
        for (let i = shape.children.length - 1; i >= 0; i--) {
            const child = shape.children[i];
            const deepest = this.findChildShapeAtPoint(child, point);
            if (deepest)
                return deepest;
            if (this.shapeContainsPoint(child, point))
                return child;
        }
        return undefined;
    }

    shapeContainsPoint(shape, point) {
        if (!shape?.getBoardPosition)
            return false;
        const position = shape.getBoardPosition();
        const props = shape.properties ?? {};
        const radius = Number.isFinite(props.radius) ? props.radius : null;
        if (radius != null) {
            return (
                point.x >= position.x - radius &&
                point.x <= position.x + radius &&
                point.y >= position.y - radius &&
                point.y <= position.y + radius
            );
        }
        const width = Number.isFinite(props.width) ? props.width : null;
        const height = Number.isFinite(props.height) ? props.height : null;
        if (width == null && height == null)
            return false;
        const endX = position.x + (width ?? 0);
        const endY = position.y + (height ?? 0);
        const minX = Math.min(position.x, endX);
        const maxX = Math.max(position.x, endX);
        const minY = Math.min(position.y, endY);
        const maxY = Math.max(position.y, endY);
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
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
