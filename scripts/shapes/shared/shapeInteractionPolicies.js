function isShapeToolbarOrOverlayTarget(targetElement) {
    if (!(targetElement instanceof Element))
        return false;
    const clickedInsideToolbar = $(targetElement).closest(".shape-context-toolbar, .dx-toolbar, .dx-toolbar-item, .dx-button").length > 0;
    if (clickedInsideToolbar)
        return true;
    const clickedInsideOverlay = $(targetElement).closest(".dx-overlay-wrapper, .dx-overlay-content, .dx-context-menu").length > 0;
    if (clickedInsideOverlay)
        return true;
    return false;
}

function shouldIgnoreDismissForTarget(targetElement, blockSelector = null) {
    if (!(targetElement instanceof Element))
        return false;
    if (blockSelector && $(targetElement).closest(blockSelector).length > 0)
        return true;
    return isShapeToolbarOrOverlayTarget(targetElement);
}

function resolveEditorSelectedShapeTarget(selection, shape, point) {
    const childShape = selection.findChildShapeAtPoint(shape, point);
    return childShape ?? shape;
}

function resolveEditorDoubleClickShapeTarget(selection, shape, event) {
    if (shape)
        return shape;
    if (!selection.isOverlayElement(event?.target))
        return shape;
    return selection.selectedShape ?? selection.hoveredShape;
}

function shouldDeselectEditorOnClickOutside(event, selection) {
    const targetElement = event?.target;
    if (!(targetElement instanceof Element))
        return false;
    if (isShapeToolbarOrOverlayTarget(targetElement))
        return false;
    if (targetElement.classList.contains("handle"))
        return false;
    if (targetElement.classList.contains("bounding-box"))
        return false;
    if (targetElement.isSameNode(selection.selectedShape?.element))
        return false;
    return true;
}

function resolveEditorPointerDown(event, selection) {
    if (event.defaultPrevented)
        return null;
    return {
        x: event.clientX,
        y: event.clientY
    };
}

function shouldSkipEditorPointerUp(event, selection) {
    if (event.defaultPrevented)
        return true;
    if (selection.board.pointerLocked)
        return true;
    if (!selection.pointerDown)
        return true;
    return false;
}

function resolveEditorPointerMovement(event, selection) {
    return {
        dx: event.clientX - selection.pointerDown.x,
        dy: event.clientY - selection.pointerDown.y
    };
}

function shouldProcessEditorPointerUpSelection(pointerMovement, event, selection) {
    return Math.hypot(pointerMovement.dx, pointerMovement.dy) <= selection.dragThreshold;
}

function shouldSkipEditorPointerMove(event, selection) {
    if (!selection.enabled)
        return true;
    if (selection.isDragging)
        return true;
    if (selection.board.pointerLocked)
        return true;
    return false;
}

function resolveEditorHoveredShapeFromPointer(shape, event, selection) {
    const point = selection.board.getMouseToSvgPoint(event);
    const childShape = selection.findChildShapeAtPoint(shape, point);
    return childShape ?? shape;
}

function resolveEditorHighlightColor(shape, selection) {
    const borderColor = shape.properties?.borderColor ?? shape.properties?.foregroundColor;
    return selection.isTransparentColor(borderColor) ? "#000000" : borderColor;
}

function shouldShowEditorOutline(shape, selection) {
    if (selection.isDragging)
        return false;
    if (shape?.hideSelectionOutline)
        return false;
    return true;
}

function shouldApplyEditorEditModeHighlight(shape, selection) {
    return true;
}