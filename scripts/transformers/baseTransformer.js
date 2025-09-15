class BaseTransformer {
    constructor(board, shape) {
        this.board = board;
        this.shape = shape;
        this.handles = [];
        this.draggedHandle = null;
        this._dragRaf = null;
        this._pendingPoint = null;
        this._usingPointer = false;
        this._activePointerId = null;
        this.createHandles();
        this.updateHandles();
    }

    setAttributes(handle, attributes) {
        for (const [attribute, value] of Object.entries(attributes))
            handle.setAttribute(attribute, value);
    };

    getHandles() {
        return [];
    }

    createHandles() {
        var handles = this.getHandles();
        handles.forEach(({ className, getAttributes, getTransform }) =>
            this.addHandle(className, handle => this.setAttributes(handle, getAttributes()), getTransform)
        );
    }

    addHandle(className, update, getTransform) {
        const handle = this.board.createSvgElement("rect");
        handle.setAttribute("class", className);
        this.board.svg.appendChild(handle);
        this.handles.push(handle);
        handle.addEventListener("pointerdown", e => this.onHandleDragStart(e, handle));
        handle.update = update;
        handle.getTransform = getTransform;
    }

    updateHandles() {
        this.handles.forEach(h => h.update(h));
    }

    onHandleDragStart = (event, handle) => {
        event.preventDefault();
        this.draggedHandle = handle;
        const point = this.board.getMouseToSvgPoint(event);
        this.startX = point.x;
        this.startY = point.y;
        this._usingPointer = true;
        this._activePointerId = event.pointerId;
        try { handle.setPointerCapture(this._activePointerId); } catch (_) {}
        handle.addEventListener("pointermove", this.onHandleDrag);
        handle.addEventListener("pointerup", this.onHandleDragEnd);
        handle.addEventListener("pointercancel", this.onHandleDragEnd);
        handle.addEventListener("pointerout", this.onHandleDragEnd);
        if (this.shape.onDragStart)
            this.shape.onDragStart();
    }

    onHandleDrag = event => {
        const p = this.board.getMouseToSvgPoint(event);
        p.dx = p.x - this.startX;
        p.dy = p.y - this.startY;
        this._pendingPoint = p;
        if (this._dragRaf == null) {
            this._dragRaf = requestAnimationFrame(() => {
                this._dragRaf = null;
                if (!this._pendingPoint || !this.draggedHandle)
                    return;
                const point = this._pendingPoint;
                this._pendingPoint = null;
                const transform = this.draggedHandle.getTransform(point);
                this.transformShape(transform);
                if (this.shape.applyDragToTerms)
                    this.shape.applyDragToTerms(point);
                this.shape.draw();
                this.updateHandles();
                this.startX = point.x;
                this.startY = point.y;
            });
        }
    }

    onHandleDragEnd = _ => {
        if (this.draggedHandle) {
            try { this.draggedHandle.releasePointerCapture(this._activePointerId); } catch (_) {}
            this.draggedHandle.removeEventListener("pointermove", this.onHandleDrag);
            this.draggedHandle.removeEventListener("pointerup", this.onHandleDragEnd);
            this.draggedHandle.removeEventListener("pointercancel", this.onHandleDragEnd);
            this.draggedHandle.removeEventListener("pointerout", this.onHandleDragEnd);
        }
        this.draggedHandle = null;
        this._activePointerId = null;
        if (this._dragRaf != null) {
            cancelAnimationFrame(this._dragRaf);
            this._dragRaf = null;
        }
        this._pendingPoint = null;
        if (this.shape.onDragEnd)
            this.shape.onDragEnd();
    }

    transformShape(transform) {
        for (const [attribute, value] of Object.entries(transform))
            this.shape.properties[attribute] = value;
    }

    hide() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "hidden"));
    }

    show() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "visible"));
    }
}
