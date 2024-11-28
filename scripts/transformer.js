class Transformer {
    constructor(board, shape) {
        this.board = board;
        this.shape = shape;
        this.handles = [];
        this.boundingBox = null;
        this.dragging = false;
        this.createBoundingBox();
        this.createHandles();
        this.updateHandles();
        this.updateBoundingBox();
    }

    createBoundingBox() {
        this.boundingBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.boundingBox.setAttribute("class", "bounding-box");
        this.board.svg.appendChild(this.boundingBox);
        this.updateBoundingBox();
    }

    updateBoundingBox() {
        const { x, y, width, height, rotation } = this.shape.properties;
        this.boundingBox.setAttribute("x", x);
        this.boundingBox.setAttribute("y", y);
        this.boundingBox.setAttribute("width", width);
        this.boundingBox.setAttribute("height", height);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        this.boundingBox.setAttribute("transform", `rotate(${rotation} ${centerX} ${centerY})`);
    }

    createHandles() {
        this.handles.push(this.createResizeHandle("top-left"));
        this.handles.push(this.createResizeHandle("top-right"));
        this.handles.push(this.createResizeHandle("bottom-left"));
        this.handles.push(this.createResizeHandle("bottom-right"));
        this.handles.push(this.createRotationHandle("rotate"));
        this.updateHandles();
    }

    createResizeHandle(type) {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute("class", "handle resize-handle");
        handle.setAttribute("data-type", type);
        this.board.svg.appendChild(handle);
        handle.addEventListener("mousedown", (e) => this.onHandleDragStart(e, type));
        return handle;
    }

    createRotationHandle(type) {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute("class", "handle rotation-handle");
        handle.setAttribute("data-type", type);
        this.board.svg.appendChild(handle);
        handle.addEventListener("mousedown", (e) => this.onHandleDragStart(e, type));
        return handle;
    }

    updateHandles() {
        const handleSize = 8;
        const { x, y, width, height, rotation } = this.shape.properties;
        this.handles.forEach(h => {
            h.setAttribute("width", handleSize);
            h.setAttribute("height", handleSize); 
        });
        this.handles[0].setAttribute("x", x - handleSize / 2);
        this.handles[0].setAttribute("y", y - handleSize / 2);
        this.handles[1].setAttribute("x", x + width - handleSize / 2);
        this.handles[1].setAttribute("y", y - handleSize / 2);
        this.handles[2].setAttribute("x", x - handleSize / 2);
        this.handles[2].setAttribute("y", y + height - handleSize / 2);
        this.handles[3].setAttribute("x", x + width - handleSize / 2); 
        this.handles[3].setAttribute("y", y + height - handleSize / 2);
        this.handles[4].setAttribute("x", x + width / 2 - handleSize / 2);
        this.handles[4].setAttribute("y", y - 20 - handleSize / 2);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        this.handles.forEach(handle => {
            handle.setAttribute("transform", `rotate(${rotation} ${centerX} ${centerY})`);
        });
    }

    getMouseToSVGPoint(event) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
        return svgPoint;
    }

    onHandleDragStart = (event, type) => {
        event.preventDefault();
        this.draggingType = type;
        var point = this.getMouseToSVGPoint(event);
        this.startX = point.x;
        this.startY = point.y;
        document.addEventListener("mousemove", this.onHandleDrag);
        document.addEventListener("mouseup", this.onHandleDragEnd);
    }

    onHandleDrag = (event) => {
        var point = this.getMouseToSVGPoint(event);
        const dx = point.x - this.startX;
        const dy = point.y - this.startY;
        if (this.draggingType.startsWith("top") || this.draggingType.startsWith("bottom")) {
            const newHeight = this.shape.properties.height + (this.draggingType.includes("bottom") ? dy : -dy);
            if (newHeight > 0) this.shape.resize(this.shape.properties.width, newHeight);
            if (this.draggingType.includes("top")) this.shape.move(this.shape.properties.x, this.shape.properties.y + dy);
        }
        if (this.draggingType.includes("left") || this.draggingType.includes("right")) {
            const newWidth = this.shape.properties.width + (this.draggingType.includes("right") ? dx : -dx);
            if (newWidth > 0) this.shape.resize(newWidth, this.shape.properties.height);
            if (this.draggingType.includes("left")) this.shape.move(this.shape.properties.x + dx, this.shape.properties.y);
        }
        if (this.draggingType === "rotate") {
            const angle = Math.atan2(event.clientY - (this.shape.properties.y + this.shape.properties.height / 2), 
                event.clientX - (this.shape.properties.x + this.shape.properties.width / 2)) * 180 / Math.PI;
            this.shape.rotate(angle);
        }
        this.updateHandles();
        this.updateBoundingBox();
        this.startX = point.x;
        this.startY = point.y;
    }

    onHandleDragEnd = () => {
        document.removeEventListener("mousemove", this.onHandleDrag);
        document.removeEventListener("mouseup", this.onHandleDragEnd);
    }

    onBoundingBoxDragStart = (event) => {
        if (event.target.classList.contains("handle")) 
            return;
        event.preventDefault();
        this.dragging = true;
        var point = this.getMouseToSVGPoint(event);
        this.startX = point.x;
        this.startY = point.y;
    }

    onBoundingBoxDrag = (event) => {
        if (!this.dragging) 
            return;
        var point = this.getMouseToSVGPoint(event);
        const dx = point.x - this.startX;
        const dy = point.y - this.startY;
        this.shape.move(this.shape.properties.x + dx, this.shape.properties.y + dy);
        this.updateHandles();
        this.updateBoundingBox();
        this.startX = point.x;
        this.startY = point.y;
    }

    onBoundingBoxDragEnd = () => {
        this.dragging = false;
    }

    hide() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "hidden"));
        this.boundingBox.setAttribute("visibility", "hidden");
        this.boundingBox.removeEventListener("mousedown", this.onBoundingBoxDragStart);
        this.board.svg.removeEventListener("mousemove", this.onBoundingBoxDrag);
        this.board.svg.removeEventListener("mouseup", this.onBoundingBoxDragEnd);
    }

    show() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "visible"));
        this.boundingBox.setAttribute("visibility", "visible");
        this.boundingBox.addEventListener("mousedown", this.onBoundingBoxDragStart);
        this.board.svg.addEventListener("mousemove", this.onBoundingBoxDrag);
        this.board.svg.addEventListener("mouseup", this.onBoundingBoxDragEnd);
    }
}