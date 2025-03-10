class Board {
    constructor(svgElement, calculator) {
        this.shapes = new Shapes(this, calculator);
        this.calculator = calculator;
        this.svg = svgElement;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.viewBox = this.svg.viewBox.baseVal;
        this.viewBox.x = this.viewBox.x || 0;
        this.viewBox.y = this.viewBox.y || 0;
        this.viewBox.width = this.viewBox.width || this.svg.clientWidth;
        this.viewBox.height = this.viewBox.height || this.svg.clientHeight;
        this.svg.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.svg.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.svg.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.svg.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        this.svg.addEventListener("wheel", this.onWheel.bind(this));
        this.svg.addEventListener("mouseover", this.onMouseOver.bind(this));
        this.svg.addEventListener("mouseout", this.onMouseOut.bind(this));
        this.theme = new BaseTheme();
        this.translations = new BaseTranslations("en-US");
        this.selection = new Selection(this);
    }

    createSvgElement(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    createElement(name) {
        return document.createElement(name);
    }

    clear() {
        while (this.svg.firstChild)
            this.svg.removeChild(this.svg.firstChild);
        this.shapes.clear();
    }

    deserialize(model) {
        this.clear();
        model.map(data => {
            var shape = this.shapes.deserialize(this, data);
            this.addShape(shape);
        });
    }

    serialize() {
        var content = this.shapes.serialize();
        return content;
    }

    dispatchShapeEvent(name, shape) {
        const shapeEvent = new CustomEvent(name, {
            detail: {
                shape: shape
            }
        });
        this.svg.dispatchEvent(shapeEvent);
    }

    createShape(type, parent, id) {
        return this.shapes.createShape(type, parent, id);
    }

    addShape(shape) {
        this.svg.appendChild(shape.element);
        this.shapes.add(shape);
        this.dispatchShapeEvent("shapeAdded", shape);
        shape.element.addEventListener("focused", e => this.onShapeFocused(e));
        shape.element.addEventListener("changed", e => this.onShapeChanged(e));
        this.selectShape(shape);
    }

    removeShape(shape) {
        shape.children.forEach(c => this.removeShape(c));
        if (shape.parent) {
            var index = shape.parent.children.indexOf(shape);
            shape.parent.children.splice(index, 1);
        }
        this.svg.removeChild(shape.element);
        this.shapes.remove(shape);
        this.selection.deselect(shape);
        this.dispatchShapeEvent("shapeRemoved", shape);
    }

    getShape(id) {
        return this.shapes.getById(id);
    }

    selectShape(shape) {
        this.selection.select(shape);
    }

    setShapeProperties(shape, properties) {
        shape.setProperties(properties);
        this.refresh();
    }

    onShapeFocused(e) {
        this.selectShape(e.detail.shape);
    }

    onShapeChanged(e) {
        this.dispatchShapeEvent("shapeChanged", e.detail.shape);
    }

    getClientCenter() {
        const svgRect = this.svg.getBoundingClientRect();
        const parentRect = this.svg.parentNode.getBoundingClientRect();
        const parentCenterX = parentRect.left + parentRect.width / 2;
        const parentCenterY = parentRect.top + parentRect.height / 2;
        const svgPoint = this.svg.createSVGPoint();
        svgPoint.x = parentCenterX;
        svgPoint.y = parentCenterY;
        const svgCTM = this.svg.getScreenCTM().inverse();
        return svgPoint.matrixTransform(svgCTM);
    }

    dispatchSvgEvent(name) {
        const panEvent = new CustomEvent(name, {
            detail: {
                x: this.viewBox.x,
                y: this.viewBox.y,
                width: this.viewBox.width,
                height: this.viewBox.height
            }
        });
        this.svg.dispatchEvent(panEvent);
    }

    onMouseDown(event) {
        if (event.target !== this.svg)
            return;
        this.isPanning = true;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.svg.classList.add("pan-available");
    }

    onMouseMove(event) {
        if (!this.isPanning) 
            return;
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        this.viewBox.x -= dx;
        this.viewBox.y -= dy;        
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        this.dispatchSvgEvent("pan");
    }

    onMouseUp() {
        this.isPanning = false;
        this.svg.classList.remove("pan-available");
    }

    onMouseLeave() {
        this.isPanning = false;
        this.svg.classList.remove("pan-available");
    }

    onWheel(event) {
        if (event.target !== this.svg)
            return;
        event.preventDefault();
        const zoomScale = 1.05;
        const direction = event.deltaY < 0 ? 1 : -1;
        const zoomFactor = direction > 0 ? 1 / zoomScale : zoomScale;
        const mouseX = event.clientX - this.svg.getBoundingClientRect().left;
        const mouseY = event.clientY - this.svg.getBoundingClientRect().top;
        const svgWidth = this.svg.clientWidth;
        const svgHeight = this.svg.clientHeight;
        const scaleX = mouseX / svgWidth;
        const scaleY = mouseY / svgHeight;
        this.viewBox.x += (this.viewBox.width * (1 - zoomFactor)) * scaleX;
        this.viewBox.y += (this.viewBox.height * (1 - zoomFactor)) * scaleY;
        this.viewBox.width *= zoomFactor;
        this.viewBox.height *= zoomFactor;
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        this.dispatchSvgEvent("zoom");
    }

    onMouseOver(event) {
        if (event.target === this.svg)
            this.svg.classList.add("pan-available");
    }

    onMouseOut(event) {
        if (event.target === this.svg)
            this.svg.classList.remove("pan-available");
    }

    getMouseToSvgPoint(event) {
        const point = this.svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const svgPoint = point.matrixTransform(this.svg.getScreenCTM().inverse());
        return svgPoint;
    }

    getPan() {
    }

    refresh() {
        this.update();
        this.draw();
    }

    update() {
        this.shapes.update();
    }

    draw() {
        this.shapes.draw();
    }

    deselect() {     
        this.selection.deselect();
    }

    enableSelection(enable) {
        this.selection.enabled = enable;
    }
}