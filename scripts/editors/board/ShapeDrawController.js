class ShapeDrawController {
    constructor(shell) {
        this.shell = shell;
        this.board = shell.board;
        this.pendingShapeType = null;
        this.pendingShapeName = null;
        this.armedButtonId = null;
        this.drawnShape = null;
        this.drawStartPoint = null;
        this.activePointerId = null;
        this.minimumShapeSize = 10;
        // Capture phase so draw mode wins over shape/selection pointer handlers.
        this.board.svg.addEventListener("pointerdown", e => this.onDrawPointerDown(e), true);
        window.addEventListener("keydown", e => this.onKeyDown(e));
    }

    isArmed() {
        return this.pendingShapeType != null;
    }

    toggle(type, name, buttonId) {
        const isSameShape = this.pendingShapeType === type;
        this.cancel();
        if (isSameShape)
            return;
        this.pendingShapeType = type;
        this.pendingShapeName = name;
        this.armedButtonId = buttonId;
        this.board.svg.classList.add("shape-draw-mode");
        document.getElementById(buttonId)?.classList.add("mdl-draw-armed");
    }

    cancel() {
        if (this.armedButtonId)
            document.getElementById(this.armedButtonId)?.classList.remove("mdl-draw-armed");
        this.pendingShapeType = null;
        this.pendingShapeName = null;
        this.armedButtonId = null;
        this.board.svg.classList.remove("shape-draw-mode");
    }

    onKeyDown(event) {
        if (event.key === "Escape" && this.isArmed() && !this.drawnShape)
            this.cancel();
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
        const shape = this.board.createShape(this.pendingShapeType, null);
        shape.setProperties({ name: this.shell.commands.uniquifyShapeName(this.pendingShapeName), x: point.x, y: point.y, width: 0, height: 0 });
        shape.element.addEventListener("changed", e => this.shell.onShapeChanged(e));
        this.board.addShape(shape, false);
        shape.draw();
        shape.update();
        this.drawnShape = shape;
        window.addEventListener("pointermove", this.onDrawPointerMove);
        window.addEventListener("pointerup", this.onDrawPointerUp);
        window.addEventListener("pointercancel", this.onDrawPointerUp);
    }

    onDrawPointerMove = event => {
        if (!this.drawnShape)
            return;
        if (this.activePointerId != null && event.pointerId !== this.activePointerId)
            return;
        const point = this.board.getMouseToSvgPoint(event);
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
        const shape = this.drawnShape;
        this.drawnShape = null;
        this.drawStartPoint = null;
        this.activePointerId = null;
        this.board.pointerLocked = false;
        this.cancel();
        if (!shape)
            return;
        // A plain click (no meaningful drag) creates nothing.
        if (shape.properties.width < this.minimumShapeSize || shape.properties.height < this.minimumShapeSize) {
            this.board.removeShape(shape);
            return;
        }
        const command = new AddShapeCommand(this.board, shape);
        this.shell.commands.invoker.record(command);
        this.board.selectShape(shape);
    }
}
