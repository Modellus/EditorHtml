class Transformer {
    constructor(board, shape) {
        this.board = board;
        this.shape = shape;
        this.handles = [];
        this.boundingBox = null;
        this.dragging = false;
        this.createBoundingBox();
        this.createHandles();
    }

    createBoundingBox() {
        this.boundingBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        this.boundingBox.setAttribute("class", "bounding-box");
        this.board.svg.appendChild(this.boundingBox);
        this.boundingBox.addEventListener("mousedown", (e) => this.onBoundingBoxDragStart(e));
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
        this.updateBoundingBox();
    }

    onHandleDragStart = (event, type) => {
        event.preventDefault();
        this.draggingType = type;
        this.startX = event.clientX;
        this.startY = event.clientY;
        document.addEventListener("mousemove", this.onHandleDrag);
        document.addEventListener("mouseup", this.onHandleDragEnd);
    }

    onHandleDrag = (event) => {
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
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
        this.startX = event.clientX;
        this.startY = event.clientY;
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
        this.startX = event.clientX;
        this.startY = event.clientY;
        document.addEventListener("mousemove", this.onBoundingBoxDrag);
        document.addEventListener("mouseup", this.onBoundingBoxDragEnd);
    }

    onBoundingBoxDrag = (event) => {
        if (!this.dragging) 
            return;
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        this.shape.move(this.shape.properties.x + dx, this.shape.properties.y + dy);
        this.updateHandles();
        this.startX = event.clientX;
        this.startY = event.clientY;
    }

    onBoundingBoxDragEnd = () => {
        this.dragging = false;
        document.removeEventListener("mousemove", this.onBoundingBoxDrag);
        document.removeEventListener("mouseup", this.onBoundingBoxDragEnd);
    }

    hide() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "hidden"));
        this.boundingBox.setAttribute("visibility", "hidden");
    }

    show() {
        this.handles.forEach(handle => handle.setAttribute("visibility", "visible"));
        this.boundingBox.setAttribute("visibility", "visible");
    }
}