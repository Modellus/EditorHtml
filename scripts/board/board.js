class Board {
    constructor(svgElement, calculator) {
        this.shapes = new Shapes(this, calculator);
        this.calculator = calculator;
        this.svg = svgElement;
        this.theme = new BaseTheme();
        this.translations = new BaseTranslations("en-US");
        this.selection = new Selection(this);
        this._refreshId = null;
        this._dirtyShapes = new Set();
        this.suppressNextFocusSelect = false;
        this.pointerLocked = false;
        this.invoker = null;
    }

    createSvgElement(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    createElement(name) {
        return document.createElement(name);
    }

    clear() {
        this.deselect();
        while (this.svg.firstChild)
            this.svg.removeChild(this.svg.firstChild);
        this.shapes.clear();
        this._gridDefs = null;
        this._gridRect = null;
        this._gridPattern = null;
    }

    deserialize(model) {
        this.clear();
        model.map(data => {
            var shape = this.shapes.deserialize(this, data);
            this.addShape(shape, false);
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

    addShape(shape, select = true) {
        this.svg.appendChild(shape.element);
        this.shapes.add(shape);
        shape.element.addEventListener("focused", e => this.onShapeFocused(e));
        shape.element.addEventListener("changed", e => this.onExpressionChanged(e));
        shape.element.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        shape.element.addEventListener("shapeDragStart", e => this.onShapeDragStart(e));
        shape.element.addEventListener("shapeDragEnd", e => this.onShapeDragEnd(e));
        if (select)
            this.selectShape(shape);
        this.dispatchShapeEvent("shapeAdded", shape);
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
        shape.tick();
        this.refresh();
        this.dispatchShapeEvent("shapeChanged", shape);
        if (this.selection.selectedShape === shape)
            shape.showContextToolbar();
    }

    onShapeFocused(e) {
        if (this.suppressNextFocusSelect) {
            this.suppressNextFocusSelect = false;
            return;
        }
        this.selectShape(e.detail.shape);
    }

    onShapeChanged(e) {
        this.dispatchShapeEvent("shapeChanged", e.detail.shape);
        this.selection.update();
    }

    onExpressionChanged(e) {
        this.dispatchShapeEvent("expressionChanged", e.detail.shape);
    }

    onShapeDragStart(e) {
        this.selection.setDragging(true, e.detail.shape);
    }

    onShapeDragEnd(e) {
        this.selection.setDragging(false);
        this.selectShape(e.detail.shape);
    }

    bringForward(shape) {
        this.shapes.bringForward(shape);
    }

    sendBackward(shape) {
        this.shapes.sendBackward(shape);
    }

    bringToFront(shape) {
        this.shapes.bringToFront(shape);
    }

    sendToBack(shape) {
        this.shapes.sendToBack(shape);
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
        if (this._refreshId != null)
            return;
        this._refreshId = requestAnimationFrame(() => {
            this._refreshId = null;
            if (this._dirtyShapes.size > 0) {
                const dirty = Array.from(this._dirtyShapes);
                this._dirtyShapes.clear();
                dirty.forEach(shape => shape.update());
                dirty.forEach(shape => shape.draw());
            } else {
                this.update();
                this.draw();
            }
        });
    }

    markDirty(shape) {
        this._dirtyShapes.add(shape);
        this.refresh();
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

    updateGrid(gridSize, visible) {
        this.gridSize = gridSize;
        this.snapToGrid = visible;
        if (!visible || !gridSize) {
            if (this._gridRect)
                this._gridRect.setAttribute("visibility", "hidden");
            return;
        }
        if (!this._gridDefs) {
            this._gridDefs = this.createSvgElement("defs");
            this._gridPattern = this.createSvgElement("pattern");
            this._gridPattern.id = "board-grid-pattern";
            this._gridPattern.setAttribute("patternUnits", "userSpaceOnUse");
            const dot = this.createSvgElement("circle");
            dot.setAttribute("cx", "0");
            dot.setAttribute("cy", "0");
            dot.setAttribute("r", "0.6");
            dot.setAttribute("fill", "rgba(0,0,0,0.15)");
            this._gridDot = dot;
            this._gridPattern.appendChild(dot);
            this._gridDefs.appendChild(this._gridPattern);
            this._gridRect = this.createSvgElement("rect");
            this._gridRect.setAttribute("fill", "url(#board-grid-pattern)");
            this._gridRect.setAttribute("pointer-events", "none");
            this.svg.insertBefore(this._gridRect, this.svg.firstChild);
            this.svg.insertBefore(this._gridDefs, this.svg.firstChild);
        }
        this._gridPattern.setAttribute("width", gridSize);
        this._gridPattern.setAttribute("height", gridSize);
        this._gridRect.setAttribute("x", "-1e6");
        this._gridRect.setAttribute("y", "-1e6");
        this._gridRect.setAttribute("width", "2e6");
        this._gridRect.setAttribute("height", "2e6");
        this._gridRect.setAttribute("visibility", "visible");
    }
}
