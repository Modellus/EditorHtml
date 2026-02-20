class BaseTransformer {
    constructor(board, shape) {
        this.board = board;
        this.shape = shape;
        this.handles = [];
        this.draggedHandle = null;
        this.dragThreshold = 4;
        this._pendingHandle = null;
        this._pendingStart = null;
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
        handle._shape = this.shape;
        this.board.svg.appendChild(handle);
        this.handles.push(handle);
        handle.addEventListener("pointerdown", e => this.onHandlePointerDown(e, handle));
        handle.addEventListener("contextmenu", e => this.onHandleContextMenu(e));
        handle.update = update;
        handle.getTransform = getTransform;
    }

    updateHandles() {
        this.handles.forEach(h => h.update(h));
    }

    onHandlePointerDown = (event, handle) => {
        const point = this.board.getMouseToSvgPoint(event);
        this._pendingHandle = handle;
        this._pendingStart = { x: point.x, y: point.y };
        this._usingPointer = true;
        this._activePointerId = event.pointerId;
        try { handle.setPointerCapture(this._activePointerId); } catch (_) {}
        handle.addEventListener("pointermove", this.onHandleDrag);
        handle.addEventListener("pointerup", this.onHandleDragEnd);
        handle.addEventListener("pointercancel", this.onHandleDragEnd);
        window.addEventListener("pointermove", this.onHandleDrag);
        window.addEventListener("pointerup", this.onHandleDragEnd);
        window.addEventListener("pointercancel", this.onHandleDragEnd);
    }

    onHandleDrag = event => {
        if (this._activePointerId != null && event.pointerId !== this._activePointerId)
            return;
        const p = this.board.getMouseToSvgPoint(event);
        if (!this.draggedHandle) {
            if (!this._pendingStart || !this._pendingHandle)
                return;
            const dx = p.x - this._pendingStart.x;
            const dy = p.y - this._pendingStart.y;
            if (Math.hypot(dx, dy) <= this.dragThreshold)
                return;
            this.shape.dragStart();
            event.preventDefault();
            this.draggedHandle = this._pendingHandle;
            this.startX = this._pendingStart.x;
            this.startY = this._pendingStart.y;
        }
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
                this.updateHandles();
                this.startX = point.x;
                this.startY = point.y;
            });
        }
    }

    onHandleDragEnd = _ => {
        if (this._activePointerId != null && _.pointerId != null && _.pointerId !== this._activePointerId)
            return;
        const handle = this.draggedHandle ?? this._pendingHandle;
        if (handle) {
            try { handle.releasePointerCapture(this._activePointerId); } catch (_) {}
            handle.removeEventListener("pointermove", this.onHandleDrag);
            handle.removeEventListener("pointerup", this.onHandleDragEnd);
            handle.removeEventListener("pointercancel", this.onHandleDragEnd);
        }
        window.removeEventListener("pointermove", this.onHandleDrag);
        window.removeEventListener("pointerup", this.onHandleDragEnd);
        window.removeEventListener("pointercancel", this.onHandleDragEnd);
        if (!this.draggedHandle) {
            this._pendingHandle = null;
            this._pendingStart = null;
            this._activePointerId = null;
            return;
        }
        this.draggedHandle = null;
        this._pendingHandle = null;
        this._pendingStart = null;
        this._activePointerId = null;
        if (this._dragRaf != null) {
            cancelAnimationFrame(this._dragRaf);
            this._dragRaf = null;
        }
        this._pendingPoint = null;
        this.shape.dragEnd();
    }

    onHandleContextMenu(event) {
        if (!this.shape?.element)
            return;
        event.preventDefault();
        event.stopPropagation();
        const contextEvent = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            clientX: event.clientX,
            clientY: event.clientY,
            button: 2
        });
        this.shape.element.dispatchEvent(contextEvent);
    }

    transformShape(transform) {
        for (const [attribute, value] of Object.entries(transform))
            this.shape.setProperty(attribute, value);
    }

    hide() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "hidden"));
    }

    show() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "visible"));
    }
}
