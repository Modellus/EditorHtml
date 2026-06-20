class Selection {
    constructor(board) {
        this.board = board;
        this.interactionAdapter = null;
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

    setInteractionAdapter(interactionAdapter) {
        this.interactionAdapter = interactionAdapter ?? null;
    }

    resolveInteractionAdapter() {
        return this.interactionAdapter;
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
        this.removeEditModeHighlight();
        this.selectedShape = shape;
        shape.createHandles();
        shape.showHandles();
        this.applyHighlight(shape);
        if (shape.showContextToolbar)
            shape.showContextToolbar();
        this.resolveInteractionAdapter()?.onShapeSelected?.(shape, modifiers, this);
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
        this.resolveInteractionAdapter()?.onShapeDeselected?.(selectedShape, this);
        if (selectedShape != null)
            this.dispatchEvent("deselected", selectedShape);
    }

    onClickOutside(event) {
        if (this._editModeShape)
            this.removeEditModeHighlight();
        const shouldDeselect = this.resolveShouldDeselectOnClickOutside(event);
        if (shouldDeselect)
            this.deselect();
    }

    resolveShouldDeselectOnClickOutside(event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldDeselectOnClickOutside)
            return interactionAdapter.shouldDeselectOnClickOutside(event, this) === true;
        if (event.target.classList.contains("handle"))
            return false;
        if (event.target.classList.contains("bounding-box"))
            return false;
        if (event.target.isSameNode(this.selectedShape?.element))
            return false;
        return true;
    }

    onPointerDown(event) {
        const pointerDown = this.resolvePointerDown(event);
        if (!pointerDown)
            return;
        this.pointerDown = pointerDown;
    }

    resolvePointerDown(event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolvePointerDown) {
            const adaptedPointerDown = interactionAdapter.resolvePointerDown(event, this);
            if (adaptedPointerDown)
                return adaptedPointerDown;
            return null;
        }
        if (event.defaultPrevented)
            return null;
        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    onPointerUp(event) {
        if (this.shouldSkipPointerUp(event))
            return;
        const pointerMovement = this.resolvePointerMovement(event);
        this.pointerDown = null;
        if (!this.shouldProcessPointerUpSelection(pointerMovement, event))
            return;
        this.onClickOutside(event);
        this.onSelectShape(event);
    }

    shouldSkipPointerUp(event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldSkipPointerUp)
            return interactionAdapter.shouldSkipPointerUp(event, this) === true;
        if (event.defaultPrevented)
            return true;
        if (this.board.pointerLocked)
            return true;
        if (!this.pointerDown)
            return true;
        return false;
    }

    resolvePointerMovement(event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolvePointerMovement)
            return interactionAdapter.resolvePointerMovement(event, this) ?? { dx: 0, dy: 0 };
        return {
            dx: event.clientX - this.pointerDown.x,
            dy: event.clientY - this.pointerDown.y
        };
    }

    shouldProcessPointerUpSelection(pointerMovement, event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldProcessPointerUpSelection)
            return interactionAdapter.shouldProcessPointerUpSelection(pointerMovement, event, this) === true;
        return Math.hypot(pointerMovement.dx, pointerMovement.dy) <= this.dragThreshold;
    }

    onPointerMove(event) {
        if (this.shouldSkipPointerMove(event))
            return;
        const targetShape = this.resolveSelectionTarget(event);
        const shape = this.findShape(targetShape);
        if (!shape) {
            this.clearHover();
            return;
        }
        const hoveredShape = this.resolveHoveredShapeFromPointer(shape, event);
        if (hoveredShape === this.selectedShape) {
            this.clearHover();
            return;
        }
        if (hoveredShape !== this.hoveredShape)
            this.setHover(hoveredShape);
    }

    shouldSkipPointerMove(event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldSkipPointerMove)
            return interactionAdapter.shouldSkipPointerMove(event, this) === true;
        if (!this.enabled)
            return true;
        if (this.isDragging)
            return true;
        if (this.board.pointerLocked)
            return true;
        return false;
    }

    resolveHoveredShapeFromPointer(shape, event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolveHoveredShapeFromPointer)
            return interactionAdapter.resolveHoveredShapeFromPointer(shape, event, this) ?? shape;
        const point = this.board.getMouseToSvgPoint(event);
        const childShape = this.findChildShapeAtPoint(shape, point);
        return childShape ?? shape;
    }

    onDoubleClick(event) {
        if (event.defaultPrevented)
            return;
        if (!this.enabled)
            return;
        const targetShape = this.resolveSelectionTarget(event);
        let shape = this.findShape(targetShape);
        if (!shape && this.isOverlayElement(event.target))
            shape = this.selectedShape ?? this.hoveredShape;
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolveDoubleClickShape)
            shape = interactionAdapter.resolveDoubleClickShape(shape, event, this) ?? shape;
        if (!shape)
            return;
        this.board.suppressNextFocusSelect = true;
        const entered = shape.enterEditMode?.(event);
        if (!entered) {
            this.board.suppressNextFocusSelect = false;
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.deselect();
        this.clearHover();
        this.applyEditModeHighlight(shape);
        interactionAdapter?.onShapeEnterEditMode?.(shape, event, this);
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
        const selectedShape = this.resolveSelectedShape(shape, point, event);
        if (selectedShape !== this.selectedShape)
            this.select(selectedShape, { altKey: event.altKey === true });
    }

    resolveSelectedShape(shape, point, event) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolveSelectedShape) {
            const adaptedShape = interactionAdapter.resolveSelectedShape(shape, point, event, this);
            if (adaptedShape)
                return adaptedShape;
        }
        const childShape = this.findChildShapeAtPoint(shape, point);
        return childShape ?? shape;
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
        const previousHoveredShape = this.hoveredShape;
        this.hoveredShape = shape;
        shape.createHandles();
        this.applyHighlight(shape);
        this.resolveInteractionAdapter()?.onHoverShapeChanged?.(shape, previousHoveredShape, this);
    }

    clearHover() {
        const previousHoveredShape = this.hoveredShape;
        if (this.hoveredShape) {
            this.hoveredShape.removeHandles();
            this.removeHighlight(this.hoveredShape);
        }
        this.hoveredShape = null;
        this.resolveInteractionAdapter()?.onHoverShapeChanged?.(null, previousHoveredShape, this);
    }

    applyHighlight(shape) {
        const color = this.resolveHighlightColor(shape);
        this.addHighlightProxy(shape, color);
    }

    resolveHighlightColor(shape) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.resolveHighlightColor) {
            const adaptedColor = interactionAdapter.resolveHighlightColor(shape, this);
            if (adaptedColor)
                return adaptedColor;
        }
        const borderColor = shape.properties?.borderColor ?? shape.properties?.foregroundColor;
        return this.isTransparentColor(borderColor) ? "#000000" : borderColor;
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
        this.removeHighlightProxy(shape);
    }

    addHighlightProxy(shape, color) {
        if (!shape.element)
            return;
        const bounds = this.getOutlineBounds(shape);
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height))
            return;
        this.ensureHoverGlowFilter();
        const proxy = this.board.createSvgElement("g");
        proxy.setAttribute("class", "highlight-proxy");
        proxy.setAttribute("pointer-events", "none");
        proxy.innerHTML = `<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${color}" stroke="none" filter="url(#mdl-hover-glow)" style="color: ${color}" pointer-events="none"/>
            <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="none" stroke="${color}" stroke-width="1.5" pointer-events="none"/>`;
        this.applyOutlineRotation(proxy, shape, bounds);
        this.board.svg.appendChild(proxy);
        shape._highlightProxy = proxy;
    }

    ensureHoverGlowFilter() {
        if (this.board.svg.querySelector("#mdl-hover-glow"))
            return;
        const defs = this.board.createSvgElement("defs");
        defs.innerHTML = `<filter id="mdl-hover-glow" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
            <feComposite in="blur" in2="SourceAlpha" operator="out" result="outer-glow"/>
            <feFlood flood-color="currentColor" result="flood-color"/>
            <feComposite in="flood-color" in2="outer-glow" operator="in"/>
        </filter>`;
        this.board.svg.insertBefore(defs, this.board.svg.firstChild);
    }

    removeHighlightProxy(shape) {
        if (shape._highlightProxy) {
            shape._highlightProxy.remove();
            shape._highlightProxy = null;
        }
    }

    applyEditModeHighlight(shape) {
        if (!this.shouldApplyEditModeHighlight(shape))
            return;
        this.removeEditModeHighlight();
        this._editModeShape = shape;
        const bounds = this.getOutlineBounds(shape);
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height))
            return;
        const rotation = Number(shape.properties?.rotation) || 0;
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rotateAttr = Math.abs(rotation) > 0.00001 ? ` transform="rotate(${rotation} ${cx} ${cy})"` : "";
        const proxy = this.board.createSvgElement("g");
        proxy.setAttribute("class", "highlight-proxy edit-mode");
        proxy.setAttribute("pointer-events", "none");
        proxy.innerHTML = `<defs>
            <mask id="mdl-edit-mode-mask">
                <rect x="-100000" y="-100000" width="200000" height="200000" fill="white"/>
                <rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="black"${rotateAttr}/>
            </mask>
        </defs>
        <rect x="-100000" y="-100000" width="200000" height="200000" fill="rgba(0,0,0,0.15)" mask="url(#mdl-edit-mode-mask)"/>`;
        this.board.svg.appendChild(proxy);
        this._editModeProxy = proxy;
        this.resolveInteractionAdapter()?.onEditModeHighlightChanged?.(shape, true, this);
    }

    shouldApplyEditModeHighlight(shape) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldApplyEditModeHighlight)
            return interactionAdapter.shouldApplyEditModeHighlight(shape, this) === true;
        return true;
    }

    removeEditModeHighlight() {
        const shape = this._editModeShape;
        if (shape) {
            this._editModeShape = null;
            shape.exitEditMode();
        }
        let removedOverlay = false;
        if (this._editModeProxy) {
            this._editModeProxy.remove();
            this._editModeProxy = null;
            removedOverlay = true;
        }
        if (removedOverlay)
            this.resolveInteractionAdapter()?.onEditModeHighlightChanged?.(shape, false, this);
    }

    setDragging(isDragging) {
        this.isDragging = isDragging;
        if (isDragging) {
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
        if (!this.shouldShowOutline(shape)) {
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

    shouldShowOutline(shape) {
        const interactionAdapter = this.resolveInteractionAdapter();
        if (interactionAdapter?.shouldShowOutline)
            return interactionAdapter.shouldShowOutline(shape, this) === true;
        if (this.isDragging)
            return false;
        if (shape?.hideSelectionOutline)
            return false;
        return true;
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
