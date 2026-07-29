class MindMapConnectorShape extends BaseShape {
    hideSelectionOutline = true;

    constructor(board, parent, id) {
        super(board, parent, id);
        this.toolbarAdapter = {
            getScreenAnchorPoint: shape => shape.getScreenAnchorPoint()
        };
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Connector Name");
        const center = this.board.getClientCenter();
        this.properties.startShapeId = null;
        this.properties.endShapeId = null;
        this.properties.startRelativeX = 0.5;
        this.properties.startRelativeY = 0.5;
        this.properties.endRelativeX = 0.5;
        this.properties.endRelativeY = 0.5;
        this.properties.startX = center.x - 100;
        this.properties.startY = center.y;
        this.properties.endX = center.x + 100;
        this.properties.endY = center.y;
        this.properties.x = this.properties.startX;
        this.properties.y = this.properties.startY;
        this.properties.width = 200;
        this.properties.height = 0;
        this.properties.routing = "curved";
        this.properties.bendAlong = 0.5;
        this.properties.bendOffset = 0;
        this.properties.startTipType = "none";
        this.properties.endTipType = "arrow";
        this.properties.lineWidth = 2;
        this.properties.lineStyle = "solid";
        this.properties.text = "";
        this.properties.textPosition = 0.5;
        this.properties.fontSize = 12;
        this.properties.textColor = "#000000";
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = this.properties.foregroundColor;
    }

    isConnector() {
        return true;
    }

    getDrawGesture() {
        return "segment";
    }

    getMinimumDrawLength() {
        return 20;
    }

    supportsFlip() {
        return false;
    }

    supportsConnectorAttachment() {
        return false;
    }

    enterEditMode() {
        this._editedText = this.properties.text;
        this._isEditingText = true;
        this.labelElement.setAttribute("contenteditable", "true");
        this.board.pointerLocked = true;
        document.addEventListener("mousedown", this._onDocumentMouseDown);
        this.drawLabel();
        this.labelElement.focus();
        document.getSelection().selectAllChildren(this.labelElement);
        return true;
    }

    exitEditMode() {
        this._isEditingText = false;
        this.labelElement.setAttribute("contenteditable", "false");
        this.board.pointerLocked = false;
        this.labelElement.blur();
        super.exitEditMode();
        const editedText = this._editedText;
        this._editedText = null;
        if (editedText != null && editedText !== this.properties.text)
            this.setPropertyCommand("text", editedText);
        this.drawLabel();
    }

    onLabelInput() {
        this._editedText = this.labelElement.textContent;
    }

    onLabelPointerDown(event) {
        if (this._isEditingText)
            return;
        if (this.board.selection.selectedShape !== this)
            return;
        event.preventDefault();
        event.stopPropagation();
        const pointerId = event.pointerId;
        const startPoint = this.board.getMouseToSvgPoint(event);
        const threshold = 4;
        let dragging = false;
        const onMove = moveEvent => {
            if (moveEvent.pointerId !== pointerId)
                return;
            const point = this.board.getMouseToSvgPoint(moveEvent);
            if (!dragging) {
                if (Math.hypot(point.x - startPoint.x, point.y - startPoint.y) <= threshold)
                    return;
                dragging = true;
                this.board.pointerLocked = true;
                this.dragStart();
            }
            this.setProperty("textPosition", this.getPositionAlongPath(point));
        };
        const onUp = upEvent => {
            if (upEvent.pointerId !== pointerId)
                return;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            if (dragging) {
                this.board.pointerLocked = false;
                this.dragEnd();
            }
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }

    getPositionAlongPath(point) {
        const totalLength = this.path.getTotalLength();
        if (!(totalLength > 0))
            return 0.5;
        const samples = 100;
        let closestFraction = this.properties.textPosition;
        let closestDistance = Infinity;
        for (let index = 0; index <= samples; index++) {
            const length = (totalLength * index) / samples;
            const samplePoint = this.path.getPointAtLength(length);
            const distance = Math.hypot(samplePoint.x - point.x, samplePoint.y - point.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestFraction = index / samples;
            }
        }
        return Math.min(1, Math.max(0, closestFraction));
    }

    setProperties(properties) {
        super.setProperties(properties);
        if ("startShapeId" in properties || "endShapeId" in properties)
            this.board.connectorIndex.update(this);
        if ("routing" in properties)
            this.refreshConnectorTypeButtonIcon?.();
    }

    setProperty(name, value) {
        super.setProperty(name, value);
        if (name === "startShapeId" || name === "endShapeId")
            this.board.connectorIndex.update(this);
        if (name === "routing")
            this.refreshConnectorTypeButtonIcon?.();
    }

    getAttachedShape(end) {
        const shapeId = end === "start" ? this.properties.startShapeId : this.properties.endShapeId;
        if (shapeId == null)
            return null;
        return this.board.shapes.getById(shapeId);
    }

    getEndpointPoint(end) {
        if (end === "start")
            return { x: this.properties.startX, y: this.properties.startY };
        return { x: this.properties.endX, y: this.properties.endY };
    }

    findAttachTargetAtPoint(point, excludeShapeId = null) {
        const shapes = this.board.shapes.shapes;
        for (let index = shapes.length - 1; index >= 0; index--) {
            const shape = shapes[index];
            if (shape === this)
                continue;
            if (shape.id === excludeShapeId)
                continue;
            if (!shape.supportsConnectorAttachment())
                continue;
            if (this.board.selection.shapeContainsPoint(shape, point))
                return shape;
        }
        return null;
    }

    attachEnd(end, target, point) {
        const relative = target.getRelativePositionForConnectorPoint(point);
        if (end === "start")
            this.setProperties({ startShapeId: target.id, startRelativeX: relative.x, startRelativeY: relative.y });
        else
            this.setProperties({ endShapeId: target.id, endRelativeX: relative.x, endRelativeY: relative.y });
        this.resolveEndpoints();
        this.board.markDirty(this);
    }

    update() {
        super.update();
        this.resolveEndpoints();
    }

    resolveEndpoints() {
        const startShape = this.getAttachedShape("start");
        const endShape = this.getAttachedShape("end");
        const start = startShape ? startShape.getConnectorPointForRelativePosition(this.properties.startRelativeX, this.properties.startRelativeY) : { x: this.properties.startX, y: this.properties.startY };
        const end = endShape ? endShape.getConnectorPointForRelativePosition(this.properties.endRelativeX, this.properties.endRelativeY) : { x: this.properties.endX, y: this.properties.endY };
        this.properties.startX = start.x;
        this.properties.startY = start.y;
        this.properties.endX = end.x;
        this.properties.endY = end.y;
        this.properties.x = Math.min(start.x, end.x);
        this.properties.y = Math.min(start.y, end.y);
        this.properties.width = Math.abs(end.x - start.x);
        this.properties.height = Math.abs(end.y - start.y);
    }

    getPathData() {
        const startX = this.properties.startX;
        const startY = this.properties.startY;
        const endX = this.properties.endX;
        const endY = this.properties.endY;
        if (this.properties.routing === "straight")
            return this.getStraightPathData(startX, startY, endX, endY);
        if (this.properties.routing === "orthogonal")
            return this.getOrthogonalPathData(startX, startY, endX, endY);
        return this.getCurvedPathData(startX, startY, endX, endY);
    }

    getStraightPathData(startX, startY, endX, endY) {
        const bend = this.getBendPoint(startX, startY, endX, endY);
        return `M ${startX} ${startY} L ${bend.x} ${bend.y} L ${endX} ${endY}`;
    }

    getCurvedPathData(startX, startY, endX, endY) {
        const bend = this.getBendPoint(startX, startY, endX, endY);
        return `M ${startX} ${startY} Q ${bend.x} ${bend.y}, ${endX} ${endY}`;
    }

    getOrthogonalPathData(startX, startY, endX, endY) {
        const along = this.properties.bendAlong;
        if (Math.abs(endX - startX) >= Math.abs(endY - startY)) {
            const middleX = startX + (endX - startX) * along;
            return `M ${startX} ${startY} L ${middleX} ${startY} L ${middleX} ${endY} L ${endX} ${endY}`;
        }
        const middleY = startY + (endY - startY) * along;
        return `M ${startX} ${startY} L ${startX} ${middleY} L ${endX} ${middleY} L ${endX} ${endY}`;
    }

    getNaturalBendOffset(startX, startY, endX, endY) {
        if (this.properties.routing !== "curved")
            return 0;
        return Math.hypot(endX - startX, endY - startY) * 0.25;
    }

    getBendPoint(startX, startY, endX, endY) {
        if (this.properties.routing === "orthogonal")
            return this.getOrthogonalBendPoint(startX, startY, endX, endY);
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY) || 1;
        const unitX = deltaX / length;
        const unitY = deltaY / length;
        const normalX = -unitY;
        const normalY = unitX;
        const along = this.properties.bendAlong;
        const baseX = startX + deltaX * along;
        const baseY = startY + deltaY * along;
        const offset = this.properties.bendOffset + this.getNaturalBendOffset(startX, startY, endX, endY);
        return { x: baseX + normalX * offset, y: baseY + normalY * offset };
    }

    getOrthogonalBendPoint(startX, startY, endX, endY) {
        const along = this.properties.bendAlong;
        if (Math.abs(endX - startX) >= Math.abs(endY - startY)) {
            const middleX = startX + (endX - startX) * along;
            return { x: middleX, y: (startY + endY) / 2 };
        }
        const middleY = startY + (endY - startY) * along;
        return { x: (startX + endX) / 2, y: middleY };
    }

    getBendPropertiesForPoint(point) {
        const startX = this.properties.startX;
        const startY = this.properties.startY;
        const endX = this.properties.endX;
        const endY = this.properties.endY;
        if (this.properties.routing === "orthogonal") {
            if (Math.abs(endX - startX) >= Math.abs(endY - startY)) {
                const span = endX - startX;
                const along = span !== 0 ? (point.x - startX) / span : 0.5;
                return { bendAlong: Math.min(1, Math.max(0, along)) };
            }
            const span = endY - startY;
            const along = span !== 0 ? (point.y - startY) / span : 0.5;
            return { bendAlong: Math.min(1, Math.max(0, along)) };
        }
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY) || 1;
        const unitX = deltaX / length;
        const unitY = deltaY / length;
        const normalX = -unitY;
        const normalY = unitX;
        const relativeX = point.x - startX;
        const relativeY = point.y - startY;
        const along = relativeX * unitX + relativeY * unitY;
        const offset = relativeX * normalX + relativeY * normalY;
        const natural = this.getNaturalBendOffset(startX, startY, endX, endY);
        return {
            bendAlong: Math.min(1, Math.max(0, along / length)),
            bendOffset: offset - natural
        };
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.defs = this.board.createSvgElement("defs");
        element.appendChild(this.defs);
        this.hitPath = this.board.createSvgElement("path");
        this.hitPath.setAttribute("fill", "none");
        this.hitPath.setAttribute("stroke", "transparent");
        this.hitPath.setAttribute("pointer-events", "stroke");
        element.appendChild(this.hitPath);
        this.path = this.board.createSvgElement("path");
        this.path.setAttribute("fill", "none");
        this.path.setAttribute("pointer-events", "none");
        element.appendChild(this.path);
        this.labelForeignObject = this.board.createSvgElement("foreignObject");
        this.labelForeignObject.setAttribute("width", 0);
        this.labelForeignObject.setAttribute("height", 0);
        this.labelForeignObject.setAttribute("pointer-events", "none");
        element.appendChild(this.labelForeignObject);
        const labelHost = $('<div class="mdl-mindmap-connector-label-host"><div class="mdl-mindmap-connector-label" contenteditable="false"></div></div>').appendTo(this.labelForeignObject);
        this.labelHost = labelHost.get(0);
        this.labelElement = this.labelHost.firstElementChild;
        this.labelElement.addEventListener("input", () => this.onLabelInput());
        this.labelElement.addEventListener("pointerdown", event => this.onLabelPointerDown(event));
        return element;
    }

    getHandles() {
        const gripRadius = 4;
        return [
            {
                tag: "circle",
                className: "handle tip mindmap-connector-endpoint",
                getAttributes: () => ({ cx: this.properties.startX, cy: this.properties.startY, r: gripRadius }),
                getTransform: point => this.getEndpointTransform("start", point)
            },
            {
                tag: "circle",
                className: "handle tip mindmap-connector-endpoint",
                getAttributes: () => ({ cx: this.properties.endX, cy: this.properties.endY, r: gripRadius }),
                getTransform: point => this.getEndpointTransform("end", point)
            },
            {
                tag: "circle",
                className: "handle tip mindmap-connector-bend",
                getAttributes: () => {
                    const point = this.getBendPoint(this.properties.startX, this.properties.startY, this.properties.endX, this.properties.endY);
                    return { cx: point.x, cy: point.y, r: gripRadius };
                },
                getTransform: point => this.getBendPropertiesForPoint(point)
            }
        ];
    }

    getEndpointTransform(end, point) {
        this._draggedEndpoint = end;
        const excludeShapeId = end === "start" ? this.properties.endShapeId : this.properties.startShapeId;
        const target = this.findAttachTargetAtPoint(point, excludeShapeId);
        this._draggedEndpointTarget = target;
        this.board.shell?.connectorTargetHighlighter?.show(target);
        if (end === "start")
            return { startShapeId: null, startX: point.x, startY: point.y };
        return { endShapeId: null, endX: point.x, endY: point.y };
    }

    dragEnd() {
        const draggedEndpoint = this._draggedEndpoint;
        const target = this._draggedEndpointTarget;
        this._draggedEndpoint = null;
        this._draggedEndpointTarget = null;
        this.board.shell?.connectorTargetHighlighter?.hide();
        if (draggedEndpoint && target)
            this.attachEnd(draggedEndpoint, target, this.getEndpointPoint(draggedEndpoint));
        super.dragEnd();
    }

    showHandles() {
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => handle.setAttribute("visibility", "visible"));
    }

    getSelectionOutlinePrimitives() {
        return [{
            tag: "path",
            mode: "stroke",
            strokeWidth: Math.max(1, this.properties.lineWidth - 1),
            attributes: { d: this.getPathData() }
        }];
    }

    buildMarkers() {
        const color = this.getBorderColor();
        const lineWidth = this.properties.lineWidth;
        return MindMapEndMarkers.buildMarkerMarkup(this.id, "start", this.properties.startTipType, color, lineWidth)
            + MindMapEndMarkers.buildMarkerMarkup(this.id, "end", this.properties.endTipType, color, lineWidth);
    }

    applyMarkerForEnd(end, attribute) {
        const tipType = end === "start" ? this.properties.startTipType : this.properties.endTipType;
        if (tipType === "none") {
            this.path.removeAttribute(attribute);
            return;
        }
        this.path.setAttribute(attribute, `url(#${MindMapEndMarkers.getMarkerId(this.id, end, tipType)})`);
    }

    applyLineStyle() {
        if (this.properties.lineStyle === "dashed") {
            this.path.setAttribute("stroke-dasharray", `${this.properties.lineWidth * 3} ${this.properties.lineWidth * 2}`);
            return;
        }
        this.path.removeAttribute("stroke-dasharray");
    }

    draw() {
        this.resolveEndpoints();
        super.draw();
        const pathData = this.getPathData();
        this.defs.innerHTML = this.buildMarkers();
        this.path.setAttribute("d", pathData);
        this.path.setAttribute("stroke", this.getBorderColor());
        this.path.setAttribute("stroke-width", this.properties.lineWidth);
        this.applyLineStyle();
        this.applyMarkerForEnd("start", "marker-start");
        this.applyMarkerForEnd("end", "marker-end");
        this.hitPath.setAttribute("d", pathData);
        this.hitPath.setAttribute("stroke-width", Math.max(this.properties.lineWidth + 10, 14));
        this.drawLabel();
        this.updateHandles();
    }

    getLabelPoint() {
        const totalLength = this.path.getTotalLength();
        return this.path.getPointAtLength(totalLength * this.properties.textPosition);
    }

    // The base bounding box only spans the endpoints, but a curved/bent path
    // and its label can bulge well past that box. Anchoring the context
    // toolbar there would let it land on top of the label, blocking the drag.
    getScreenAnchorPoint() {
        if (!this.board?.svg)
            return null;
        const ctm = this.board.svg.getScreenCTM();
        if (!ctm)
            return null;
        const startX = this.properties.startX;
        const startY = this.properties.startY;
        const endX = this.properties.endX;
        const endY = this.properties.endY;
        const points = [{ x: startX, y: startY }, { x: endX, y: endY }, this.getBendPoint(startX, startY, endX, endY)];
        if (this.properties.text)
            points.push(this.getLabelPoint());
        const minX = Math.min(...points.map(point => point.x));
        const maxX = Math.max(...points.map(point => point.x));
        const maxY = Math.max(...points.map(point => point.y));
        const labelClearance = this.properties.text ? 24 : 0;
        const anchorPoint = new DOMPoint((minX + maxX) / 2, maxY + labelClearance).matrixTransform(ctm);
        return { centerX: anchorPoint.x, bottomY: anchorPoint.y };
    }

    drawLabel() {
        const hasText = !!this.properties.text || this._isEditingText;
        if (!hasText) {
            this.labelForeignObject.setAttribute("width", 0);
            this.labelForeignObject.setAttribute("height", 0);
            this.labelForeignObject.setAttribute("pointer-events", "none");
            if (this.labelElement.textContent !== "")
                this.labelElement.textContent = "";
            return;
        }
        const point = this.getLabelPoint();
        const boxWidth = 320;
        const boxHeight = 44;
        this.labelForeignObject.setAttribute("x", point.x - boxWidth / 2);
        this.labelForeignObject.setAttribute("y", point.y - boxHeight / 2);
        this.labelForeignObject.setAttribute("width", boxWidth);
        this.labelForeignObject.setAttribute("height", boxHeight);
        this.labelForeignObject.setAttribute("pointer-events", "all");
        const badgeColor = Utils.parseColorToRgb(this.properties.backgroundColor ?? "#666666") ?? { red: 102, green: 102, blue: 102 };
        this.labelElement.style.backgroundColor = `rgba(${badgeColor.red}, ${badgeColor.green}, ${badgeColor.blue}, 0.85)`;
        this.labelElement.style.color = this.properties.textColor;
        this.labelElement.style.fontSize = `${this.properties.fontSize}px`;
        if (!this._isEditingText && this.labelElement.textContent !== this.properties.text)
            this.labelElement.textContent = this.properties.text;
    }
}

var MindMapConnectorWidget = MindMapConnectorShape;

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapConnectorShape;
