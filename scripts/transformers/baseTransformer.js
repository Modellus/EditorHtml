class BaseTransformer {
    constructor(board, shape) {
        this.board = board;
        this.shape = shape;
        this.handles = [];
        this.draggedHandle = null;
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
        handle.addEventListener("mousedown", e => this.onHandleDragStart(e, handle));
        handle.update = update;
        handle.getTransform = getTransform;
    }

    updateHandles() {
        this.handles.forEach(h => h.update(h));
    }

    onHandleDragStart = (event, handle) => {
        event.preventDefault();
        this.draggedHandle = handle;
        var point = this.board.getMouseToSvgPoint(event);
        this.startX = point.x;
        this.startY = point.y;
        document.addEventListener("mousemove", this.onHandleDrag);
        document.addEventListener("mouseup", this.onHandleDragEnd);
    }

    onHandleDrag = event => {
        var point = this.board.getMouseToSvgPoint(event);
        point.dx = point.x - this.startX;
        point.dy = point.y - this.startY;
        const transform = this.draggedHandle.getTransform(point);
        this.transformShape(transform);
        this.shape.draw();
        this.updateHandles();
        this.startX = point.x;
        this.startY = point.y;
    }

    onHandleDragEnd = _ => {
        this.draggedHandle = null;
        document.removeEventListener("mousemove", this.onHandleDrag);
        document.removeEventListener("mouseup", this.onHandleDragEnd);
    }

    transformShape(transform) {
        if (transform.width && transform.height)
            this.shape.resize(transform.width, transform.height);
        if (transform.x && transform.y)
            this.shape.move(transform.x, transform.y);
        if (transform.angle) 
            this.shape.rotate(transform.angle);
    }

    hide() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "hidden"));
    }

    show() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "visible"));
    }
}