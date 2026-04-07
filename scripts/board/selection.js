class Selection {
    constructor(board) {
        this.board = board;
        this.selectedShape = null;
        this.hoveredShape = null;
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

    dispatchEvent(name, shape, modifiers = null) {
        const selectedEvent = new CustomEvent(name, {
            detail: {
                shape: shape,
                modifiers: modifiers
            }
        });
        this.board.svg.dispatchEvent(selectedEvent);
    }

    select(shape, modifiers = null) {
        this.deselect();
        this.clearHover();
        this.selectedShape = shape;
        shape.createHandles();
        shape.showHandles();
        this.applyHighlight(shape);
        if (shape.showContextToolbar)
            shape.showContextToolbar();
        this.dispatchEvent("selected", this.selectedShape, modifiers);
    }

    deselect() {
        var selectedShape = this.selectedShape;
        this.selectedShape = null;
        if (selectedShape) {
            selectedShape.removeHandles();
            this.removeHighlight(selectedShape);
        }
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
        if (this.board.pointerLocked)
            return;
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
        if (!this.enabled || this.isDragging || this.board.pointerLocked)
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
    }

    onDoubleClick(event) {
        if (!this.enabled)
            return;
        const targetShape = this.resolveSelectionTarget(event);
        let shape = this.findShape(targetShape);
        if (!shape && this.isOverlayElement(event.target))
            shape = this.selectedShape ?? this.hoveredShape;
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
            this.select(selectedShape, { altKey: event.altKey === true });
    }

    resolveSelectionTarget(event) {
        const target = event.target;
        if (!(target instanceof Element))
            return target;
        if (!this.isOverlayElement(target))
            return target;
        const overlayElements = this.getOverlayElements();
        if (!overlayElements.includes(target))
            overlayElements.push(target);
        const previousPointerEvents = overlayElements.map(element => ({ element: element, pointerEvents: element.style.pointerEvents }));
        overlayElements.forEach(entry => entry.style.pointerEvents = "none");
        const underlying = document.elementFromPoint(event.clientX, event.clientY);
        previousPointerEvents.forEach(entry => entry.element.style.pointerEvents = entry.pointerEvents);
        return underlying ?? target;
    }

    isOverlayElement(element) {
        if (!(element instanceof Element))
            return false;
        if (element.classList.contains("handle"))
            return true;
        if (element.classList.contains("bounding-box"))
            return true;
        if (element.classList.contains("hover-outline"))
            return true;
        if (element.classList.contains("selected-outline"))
            return true;
        if (element.classList.contains("resize-handle"))
            return true;
        if (element.classList.contains("rotation-handle"))
            return true;
        return !!element._shape;
    }

    getOverlayElements() {
        return Array.from(this.board.svg.querySelectorAll(".handle, .bounding-box, .hover-outline, .selected-outline, .resize-handle, .rotation-handle"));
    }

    setHover(shape) {
        this.clearHover();
        if (!shape)
            return;
        this.hoveredShape = shape;
        shape.createHandles();
        this.applyHighlight(shape);
    }

    clearHover() {
        if (this.hoveredShape) {
            this.hoveredShape.removeHandles();
            this.removeHighlight(this.hoveredShape);
        }
        this.hoveredShape = null;
    }

    applyHighlight(shape) {
        const foreground = shape.properties?.foregroundColor;
        const color = this.isTransparentColor(foreground) ? "#000000" : foreground;
        shape.element?.style.setProperty("--highlight-filter", `drop-shadow(0 0 2px ${color})`);
        shape.element?.classList.add("highlighted");
        this.addHighlightProxy(shape, color);
    }

    isTransparentColor(color) {
        if (!color || color === "transparent")
            return true;
        if (color.length === 9 && color.startsWith("#") && color.endsWith("00"))
            return true;
        if (color.length === 5 && color.startsWith("#") && color.endsWith("0"))
            return true;
        return false;
    }

    removeHighlight(shape) {
        shape.element?.classList.remove("highlighted");
        shape.element?.style.removeProperty("--highlight-filter");
        this.removeHighlightProxy(shape);
    }

    addHighlightProxy(shape, color) {
        if (!shape.element)
            return;
        const bounds = this.getOutlineBounds(shape);
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height))
            return;
        const proxy = this.board.createSvgElement("rect");
        proxy.setAttribute("class", "highlight-proxy");
        proxy.setAttribute("x", bounds.x);
        proxy.setAttribute("y", bounds.y);
        proxy.setAttribute("width", bounds.width);
        proxy.setAttribute("height", bounds.height);
        proxy.setAttribute("fill", "none");
        proxy.setAttribute("stroke", color);
        proxy.setAttribute("stroke-width", "0.5");
        proxy.setAttribute("pointer-events", "none");
        this.applyOutlineRotation(proxy, shape, bounds);
        shape.element.appendChild(proxy);
        shape._highlightProxy = proxy;
    }

    removeHighlightProxy(shape) {
        if (shape._highlightProxy) {
            shape._highlightProxy.remove();
            shape._highlightProxy = null;
        }
    }

    setDragging(isDragging, shape = null) {
        this.isDragging = isDragging;
        if (isDragging) {
            if (shape && shape !== this.hoveredShape)
                this.clearHover();
            if (this.selectedShape)
                this.removeHighlight(this.selectedShape);
            this.selectedShape?.hideHandles();
        } else {
            if (this.selectedShape)
                this.applyHighlight(this.selectedShape);
            this.selectedShape?.showHandles();
        }
    }

    updateOutline(outline, shape) {
        if (this.isDragging || shape?.hideSelectionOutline) {
            outline.setAttribute("visibility", "hidden");
            outline.removeAttribute("transform");
            return;
        }
        const bounds = this.getOutlineBounds(shape);
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)) {
            outline.setAttribute("visibility", "hidden");
            outline.removeAttribute("transform");
            return;
        }
        if (outline.parentNode !== this.board.svg || this.board.svg.lastChild !== outline)
            this.board.svg.appendChild(outline);
        outline.setAttribute("x", bounds.x);
        outline.setAttribute("y", bounds.y);
        outline.setAttribute("width", bounds.width);
        outline.setAttribute("height", bounds.height);
        this.applyOutlineRotation(outline, shape, bounds);
        outline.setAttribute("visibility", "visible");
    }

    getOutlineRotationDegrees(shape) {
        const bounds = shape?.getBounds?.();
        const boundsRotation = Number(bounds?.rotation);
        if (Number.isFinite(boundsRotation))
            return boundsRotation;
        const shapeRotation = Number(shape?.properties?.rotation);
        if (Number.isFinite(shapeRotation))
            return shapeRotation;
        return 0;
    }

    applyOutlineRotation(outline, shape, bounds) {
        const rotation = this.getOutlineRotationDegrees(shape);
        if (!Number.isFinite(rotation) || Math.abs(rotation) < 0.00001) {
            outline.removeAttribute("transform");
            return;
        }
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        outline.setAttribute("transform", `rotate(${rotation} ${centerX} ${centerY})`);
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
        if (this.selectedShape)
            this.selectedShape.updateHandles();
    }
}
