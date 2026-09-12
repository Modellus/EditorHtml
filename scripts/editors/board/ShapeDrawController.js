class ShapeDrawController {
    constructor(shell) {
        this.shell = shell;
        this.board = shell.board;
        this.pendingShapeType = null;
        this.pendingShapeName = null;
        this.pendingShapeProperties = null;
        this.armedButtonId = null;
        this.drawnShape = null;
        this.freehandShape = null;
        this.drawGesture = "box";
        this.drawStartPoint = null;
        this.activePointerId = null;
        this.minimumShapeSize = 10;
        this.dragThreshold = 4;
        this.minimumDrawSize = null;
        this.hasDragged = false;
        // Capture phase so draw mode wins over shape/selection pointer handlers.
        this.board.svg.addEventListener("pointerdown", e => this.onDrawPointerDown(e), true);
        window.addEventListener("keydown", e => this.onKeyDown(e));
    }

    isArmed() {
        return this.pendingShapeType != null;
    }

    toggle(type, name, buttonId, defaultProperties = null) {
        const isSameShape = this.pendingShapeType === type && this.pendingShapeName === name;
        this.cancel();
        if (isSameShape)
            return;
        this.pendingShapeType = type;
        this.pendingShapeName = name;
        this.pendingShapeProperties = defaultProperties;
        this.armedButtonId = buttonId;
        this.board.svg.classList.add("shape-draw-mode");
        document.getElementById(buttonId)?.classList.add("mdl-draw-armed");
    }

    cancel() {
        this.finishFreehandShape();
        if (this.armedButtonId)
            document.getElementById(this.armedButtonId)?.classList.remove("mdl-draw-armed");
        this.pendingShapeType = null;
        this.pendingShapeName = null;
        this.pendingShapeProperties = null;
        this.armedButtonId = null;
        this.board.svg.classList.remove("shape-draw-mode");
    }

    onKeyDown(event) {
        if (event.key !== "Escape" || !this.isArmed() || this.drawnShape)
            return;
        event.preventDefault();
        this.cancel();
    }

    finishFreehandShape() {
        const shape = this.freehandShape;
        this.freehandShape = null;
        if (!shape)
            return;
        if (!shape.hasFreehandContent()) {
            this.board.removeShape(shape);
            return;
        }
        const command = new AddShapeCommand(this.board, shape);
        this.shell.commands.invoker.record(command);
        this.board.selectShape(shape);
    }

    getDrawStartProperties(point) {
        if (this.drawGesture === "freehand")
            return { freehandStrokes: [], startX: point.x, startY: point.y, endX: point.x, endY: point.y };
        if (this.drawGesture === "segment")
            return { startX: point.x, startY: point.y, endX: point.x, endY: point.y };
        return { x: point.x, y: point.y, width: 0, height: 0 };
    }

    onDrawPointerDown(event) {
        if (!this.isArmed() || this.drawnShape)
            return;
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.stopPropagation();
        this.board.pointerLocked = true;
        this.board.deselect();
        const point = this.board.getMouseToSvgPoint(event);
        this.drawStartPoint = { x: point.x, y: point.y };
        this.activePointerId = event.pointerId;
        this.hasDragged = false;
        this.drawnShape = this.freehandShape ? this.continueFreehandShape(point) : this.createDrawnShape(point);
        window.addEventListener("pointermove", this.onDrawPointerMove);
        window.addEventListener("pointerup", this.onDrawPointerUp);
        window.addEventListener("pointercancel", this.onDrawPointerUp);
    }

    continueFreehandShape(point) {
        this.drawGesture = "freehand";
        this.freehandShape.beginFreehandStroke(point);
        return this.freehandShape;
    }

    createDrawnShape(point) {
        const shape = this.board.createShape(this.pendingShapeType, null);
        this.drawGesture = shape.getDrawGesture(this.pendingShapeProperties);
        // Asked with the properties the shape is about to be handed, since a component is only the
        // object it was placed for once it carries that object's definition — and asked before the
        // draw gesture shrinks the shape, since every other shape answers with the size setDefaults
        // gave it.
        const minimumSize = shape.getMinimumDrawSize(this.pendingShapeProperties);
        this.minimumDrawSize = {
            width: Number(minimumSize?.width) || 100,
            height: Number(minimumSize?.height) || 100
        };
        const startProperties = Object.assign({ name: this.shell.commands.uniquifyShapeName(this.pendingShapeName) }, this.pendingShapeProperties, this.getDrawStartProperties(point));
        shape.setProperties(startProperties);
        if (this.drawGesture === "segment")
            this.attachSegmentEnd(shape, "start", point);
        shape.element.addEventListener("changed", e => this.shell.onShapeChanged(e));
        this.board.addShape(shape, false);
        if (this.drawGesture === "freehand") {
            this.freehandShape = shape;
            shape.beginFreehandStroke(point);
        }
        shape.draw();
        shape.update();
        return shape;
    }

    attachSegmentEnd(shape, end, point) {
        const excludeShapeId = end === "start" ? shape.properties.endShapeId : shape.properties.startShapeId;
        const target = shape.findAttachTargetAtPoint(point, excludeShapeId);
        if (!target)
            return;
        shape.attachEnd(end, target, point);
    }

    onDrawPointerMove = event => {
        if (!this.drawnShape)
            return;
        if (this.activePointerId != null && event.pointerId !== this.activePointerId)
            return;
        const point = this.board.getMouseToSvgPoint(event);
        if (Math.hypot(point.x - this.drawStartPoint.x, point.y - this.drawStartPoint.y) > this.dragThreshold)
            this.hasDragged = true;
        if (this.drawGesture === "freehand") {
            this.drawnShape.extendFreehandStroke(point);
            return;
        }
        if (this.drawGesture === "segment") {
            this.drawnShape.transformShape({ endX: point.x, endY: point.y });
            const target = this.drawnShape.findAttachTargetAtPoint(point, this.drawnShape.properties.startShapeId);
            this.shell.connectorTargetHighlighter.show(target);
            return;
        }
        this.drawnShape.transformShape({
            x: Math.min(this.drawStartPoint.x, point.x),
            y: Math.min(this.drawStartPoint.y, point.y),
            width: Math.abs(point.x - this.drawStartPoint.x),
            height: Math.abs(point.y - this.drawStartPoint.y)
        });
    }

    onDrawPointerUp = event => {
        if (this.activePointerId != null && event.pointerId != null && event.pointerId !== this.activePointerId)
            return;
        window.removeEventListener("pointermove", this.onDrawPointerMove);
        window.removeEventListener("pointerup", this.onDrawPointerUp);
        window.removeEventListener("pointercancel", this.onDrawPointerUp);
        this.shell.connectorTargetHighlighter.hide();
        const shape = this.drawnShape;
        const minimumDrawSize = this.minimumDrawSize;
        const hasDragged = this.hasDragged;
        const drawGesture = this.drawGesture;
        this.drawnShape = null;
        this.drawStartPoint = null;
        this.activePointerId = null;
        this.hasDragged = false;
        this.board.pointerLocked = false;
        if (!shape)
            return;
        if (drawGesture === "freehand") {
            shape.endFreehandStroke();
            return;
        }
        this.minimumDrawSize = null;
        this.drawGesture = "box";
        this.cancel();
        // A plain click (no meaningful drag) creates nothing.
        if (!hasDragged) {
            this.board.removeShape(shape);
            return;
        }
        if (drawGesture === "segment" && !this.commitSegmentShape(shape))
            return;
        // A drag too small to be a usable size falls back to the shape's
        // recommended default size; afterwards the user resizes freely.
        if (drawGesture === "box" && (shape.properties.width < this.minimumShapeSize || shape.properties.height < this.minimumShapeSize))
            shape.transformShape({ width: minimumDrawSize.width, height: minimumDrawSize.height });
        const command = new AddShapeCommand(this.board, shape);
        this.shell.commands.invoker.record(command);
        this.board.selectShape(shape);
    }

    commitSegmentShape(shape) {
        const endPoint = { x: shape.properties.endX, y: shape.properties.endY };
        const length = Math.hypot(endPoint.x - shape.properties.startX, endPoint.y - shape.properties.startY);
        if (length < shape.getMinimumDrawLength()) {
            this.board.removeShape(shape);
            return false;
        }
        this.attachSegmentEnd(shape, "end", endPoint);
        return true;
    }
}
