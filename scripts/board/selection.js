class Selection {
    constructor(board) {
        this.board = board;
        this.selectedShape = null;
        this.transformer = null;
        this.hoveredShape = null;
        this.hoverTransformer = null;
        this.isDragging = false;
        this.hoverOutline = this.board.createSvgElement("rect");
        this.hoverOutline.setAttribute("class", "hover-outline");
        this.hoverOutline.setAttribute("visibility", "hidden");
        this.board.svg.appendChild(this.hoverOutline);
        this.selectedOutline = this.board.createSvgElement("rect");
        this.selectedOutline.setAttribute("class", "selected-outline");
        this.selectedOutline.setAttribute("visibility", "hidden");
        this.board.svg.appendChild(this.selectedOutline);
        this.enabled = true;
        this.pointerDown = null;
        this.dragThreshold = 4;
        this.board.svg.addEventListener("mousedown", (e) => this.onPointerDown(e));
        this.board.svg.addEventListener("mouseup", (e) => this.onPointerUp(e));
        this.board.svg.addEventListener("mousemove", (e) => this.onPointerMove(e));
        this.board.svg.addEventListener("dblclick", (e) => this.onDoubleClick(e));
        this.board.svg.addEventListener("mouseleave", () => this.clearHover());
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
        this.clearHover();
        this.selectedShape = shape;
        this.transformer = shape.createTransformer();
        this.transformer.show();
        this.updateOutline(this.selectedOutline, shape);
        if (shape.showContextToolbar)
            shape.showContextToolbar();
        this.dispatchEvent("selected", this.selectedShape);
    }

    deselect() {
        var selectedShape = this.selectedShape;
        var transformer = this.transformer;
        this.selectedShape = null;
        this.transformer = null;
        if (transformer)
            transformer.hide();
        this.selectedOutline.setAttribute("visibility", "hidden");
        if (selectedShape?.hideContextToolbar)
            selectedShape.hideContextToolbar();
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

    onPointerMove(event) {
        if (!this.enabled || this.isDragging)
            return;
        const targetShape = this.resolveSelectionTarget(event);
        const shape = this.findShape(targetShape);
        if (!shape) {
            this.clearHover();
            return;
        }
        const point = this.board.getMouseToSvgPoint(event);
        const childShape = this.findChildShapeAtPoint(shape, point);
        const hoveredShape = childShape ?? shape;
        if (hoveredShape === this.selectedShape) {
            this.clearHover();
            return;
        }
        if (hoveredShape !== this.hoveredShape)
            this.setHover(hoveredShape);
        else {
            this.updateHoverHandles();
            this.updateHoverOutline(hoveredShape);
        }
    }

    onDoubleClick(event) {
        if (!this.enabled)
            return;
        const targetShape = this.resolveSelectionTarget(event);
        const shape = this.findShape(targetShape);
        if (!shape)
            return;
        this.board.suppressNextFocusSelect = true;
        const entered = shape.enterEditMode?.();
        if (!entered) {
            this.board.suppressNextFocusSelect = false;
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.deselect();
        this.clearHover();
        setTimeout(() => {
            if (this.board.suppressNextFocusSelect)
                this.board.suppressNextFocusSelect = false;
        }, 150);
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
        if (!target.classList.contains("handle") && !target.classList.contains("bounding-box"))
            return target;
        const previousPointerEvents = target.style.pointerEvents;
        target.style.pointerEvents = "none";
        const underlying = document.elementFromPoint(event.clientX, event.clientY);
        target.style.pointerEvents = previousPointerEvents;
        return underlying ?? target;
    }

    setHover(shape) {
        this.clearHover();
        if (!shape)
            return;
        this.hoveredShape = shape;
        this.hoverTransformer = shape.createTransformer();
        this.hoverTransformer.show();
        this.updateHoverHandles();
        this.updateHoverOutline(shape);
    }

    updateHoverOutline(shape) {
        this.updateOutline(this.hoverOutline, shape);
    }

    updateHoverHandles() {
        if (!this.hoverTransformer)
            return;
        this.hoverTransformer.updateHandles();
        if (this.hoverTransformer.handles) {
            this.hoverTransformer.handles.forEach(handle => {
                if (handle.parentNode !== this.board.svg || this.board.svg.lastChild !== handle)
                    this.board.svg.appendChild(handle);
            });
        }
    }

    clearHover() {
        if (this.hoverTransformer?.handles)
            this.hoverTransformer.handles.forEach(handle => handle.remove());
        this.hoverTransformer = null;
        this.hoveredShape = null;
        this.hoverOutline.setAttribute("visibility", "hidden");
    }

    setDragging(isDragging, shape = null) {
        this.isDragging = isDragging;
        if (isDragging) {
            if (shape && shape !== this.hoveredShape)
                this.clearHover();
            this.hoverOutline.setAttribute("visibility", "hidden");
            this.selectedOutline.setAttribute("visibility", "hidden");
        }
    }

    updateOutline(outline, shape) {
        if (this.isDragging) {
            outline.setAttribute("visibility", "hidden");
            return;
        }
        const bounds = this.getOutlineBounds(shape);
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
            outline.setAttribute("visibility", "hidden");
            return;
        }
        if (outline.parentNode !== this.board.svg || this.board.svg.lastChild !== outline)
            this.board.svg.appendChild(outline);
        outline.setAttribute("x", bounds.x);
        outline.setAttribute("y", bounds.y);
        outline.setAttribute("width", bounds.width);
        outline.setAttribute("height", bounds.height);
        outline.setAttribute("visibility", "visible");
    }

    getOutlineBounds(shape) {
        if (!shape?.getBoardPosition)
            return shape?.getBounds?.() ?? null;
        const position = shape.getBoardPosition();
        const props = shape.properties ?? {};
        const radius = Number.isFinite(props.radius) ? props.radius : null;
        if (radius != null) {
            return {
                x: position.x - radius,
                y: position.y - radius,
                width: radius * 2,
                height: radius * 2
            };
        }
        const width = Number.isFinite(props.width) ? props.width : null;
        const height = Number.isFinite(props.height) ? props.height : null;
        if (width == null || height == null)
            return shape?.getBounds?.() ?? null;
        const endX = position.x + width;
        const endY = position.y + height;
        const minX = Math.min(position.x, endX);
        const maxX = Math.max(position.x, endX);
        const minY = Math.min(position.y, endY);
        const maxY = Math.max(position.y, endY);
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
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
        if (element?._shape)
            return element._shape;
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
        if (this.selectedShape)
            this.updateOutline(this.selectedOutline, this.selectedShape);
    }
}
