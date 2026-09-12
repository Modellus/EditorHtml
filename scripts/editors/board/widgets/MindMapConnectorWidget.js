class MindMapConnectorShape extends BaseShape {
    hideSelectionOutline = true;

    static freehandSampleDistance = 3;

    static pencilStyles = {
        pencil: { widthFactor: 1, strokeOpacity: 0.8, lineCap: "round", blendMode: "normal", textured: true },
        pen: { widthFactor: 1.4, strokeOpacity: 1, lineCap: "round", blendMode: "normal", textured: false },
        marker: { widthFactor: 2.6, strokeOpacity: 0.95, lineCap: "round", blendMode: "normal", textured: false },
        highlighter: { widthFactor: 5, strokeOpacity: 0.35, lineCap: "butt", blendMode: "multiply", textured: false }
    };

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
        this.properties.pencilStyle = "pencil";
        this.properties.freehandStrokes = [];
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

    isFreehand() {
        return this.properties.routing === "freehand";
    }

    getShapeIcon() {
        if (this.isFreehand())
            return "fa-light fa-pencil";
        return BaseShape.shapeIcons.MindMapConnectorShape;
    }

    getStrokeColor() {
        if (this.isFreehand())
            return this.properties.foregroundColor;
        return this.getBorderColor();
    }

    getPencilStyle() {
        return MindMapConnectorShape.pencilStyles[this.properties.pencilStyle] ?? MindMapConnectorShape.pencilStyles.pencil;
    }

    getEffectiveStrokeWidth() {
        if (!this.isFreehand())
            return this.properties.lineWidth;
        return this.properties.lineWidth * this.getPencilStyle().widthFactor;
    }

    getDrawGesture(pendingProperties = null) {
        if ((pendingProperties?.routing ?? this.properties.routing) === "freehand")
            return "freehand";
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
        if (this.isFreehand())
            return false;
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
        const wasFreehand = this.isFreehand();
        super.setProperties(properties);
        if ("startShapeId" in properties || "endShapeId" in properties)
            this.board.connectorIndex.update(this);
        if ("routing" in properties || "pencilStyle" in properties)
            this.refreshConnectorTypeButtonIcon?.();
        this.rebuildContextToolbarOnFreehandChange(wasFreehand);
    }

    setProperty(name, value) {
        const wasFreehand = this.isFreehand();
        super.setProperty(name, value);
        if (name === "startShapeId" || name === "endShapeId")
            this.board.connectorIndex.update(this);
        if (name === "routing" || name === "pencilStyle")
            this.refreshConnectorTypeButtonIcon?.();
        this.rebuildContextToolbarOnFreehandChange(wasFreehand);
    }

    // The toolbar is built when the shape is constructed, before the properties that make it a
    // pencil arrive, so a connector turned into one is still carrying the connector's buttons.
    rebuildContextToolbarOnFreehandChange(wasFreehand) {
        if (this.isFreehand() === wasFreehand)
            return;
        if (!this.contextToolbar)
            return;
        this.contextToolbar.remove();
        this.contextToolbar = null;
        this.contextToolbarInstance = null;
        this._connectorLabelDropdownElement = null;
        this._connectorLabelTextBox = null;
        this._connectorTypeDropdownElement = null;
        this.initializeContextToolbar();
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

    resolveFreehandBounds() {
        const points = this.getAllFreehandPoints();
        if (points.length === 0)
            return;
        let minX = points[0].x;
        let maxX = points[0].x;
        let minY = points[0].y;
        let maxY = points[0].y;
        for (const point of points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        this.properties.startX = points[0].x;
        this.properties.startY = points[0].y;
        this.properties.endX = points[points.length - 1].x;
        this.properties.endY = points[points.length - 1].y;
        this.properties.x = minX;
        this.properties.y = minY;
        this.properties.width = maxX - minX;
        this.properties.height = maxY - minY;
    }

    resolveEndpoints() {
        if (this.isFreehand()) {
            this.resolveFreehandBounds();
            return;
        }
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

    beginFreehandStroke(point) {
        this._isDrawingFreehandStroke = true;
        this.transformShape({ freehandStrokes: this.properties.freehandStrokes.concat([[{ x: point.x, y: point.y }]]) });
    }

    extendFreehandStroke(point) {
        const strokes = this.properties.freehandStrokes;
        const current = strokes[strokes.length - 1];
        const last = current[current.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) < MindMapConnectorShape.freehandSampleDistance)
            return;
        const extended = strokes.slice(0, -1).concat([current.concat([{ x: point.x, y: point.y }])]);
        this.transformShape({ freehandStrokes: extended });
    }

    endFreehandStroke() {
        this._isDrawingFreehandStroke = false;
        const strokes = this.properties.freehandStrokes;
        const current = strokes[strokes.length - 1];
        if (this.getStrokeLength(current) < this.getMinimumDrawLength()) {
            this.transformShape({ freehandStrokes: strokes.slice(0, -1) });
            return;
        }
        this.draw();
    }

    hasFreehandContent() {
        return this.properties.freehandStrokes.length > 0;
    }

    getStrokeLength(stroke) {
        let length = 0;
        for (let index = 1; index < stroke.length; index++)
            length += Math.hypot(stroke[index].x - stroke[index - 1].x, stroke[index].y - stroke[index - 1].y);
        return length;
    }

    getAllFreehandPoints() {
        return this.properties.freehandStrokes.flat();
    }

    formatCoordinate(value) {
        return Math.round(value * 100) / 100;
    }

    getFreehandPathData() {
        return this.properties.freehandStrokes.map(stroke => this.getStrokePathData(stroke)).join(" ");
    }

    getStrokePathData(points) {
        const start = `M ${this.formatCoordinate(points[0].x)} ${this.formatCoordinate(points[0].y)}`;
        if (points.length === 1)
            return `${start} L ${this.formatCoordinate(points[0].x)} ${this.formatCoordinate(points[0].y)}`;
        let pathData = start;
        for (let index = 0; index < points.length - 1; index++)
            pathData += this.getFreehandSegmentData(points, index);
        return pathData;
    }

    getFreehandSegmentData(points, index) {
        const previous = points[Math.max(index - 1, 0)];
        const current = points[index];
        const next = points[index + 1];
        const following = points[Math.min(index + 2, points.length - 1)];
        const firstControlX = current.x + (next.x - previous.x) / 6;
        const firstControlY = current.y + (next.y - previous.y) / 6;
        const secondControlX = next.x - (following.x - current.x) / 6;
        const secondControlY = next.y - (following.y - current.y) / 6;
        return ` C ${this.formatCoordinate(firstControlX)} ${this.formatCoordinate(firstControlY)}, ${this.formatCoordinate(secondControlX)} ${this.formatCoordinate(secondControlY)}, ${this.formatCoordinate(next.x)} ${this.formatCoordinate(next.y)}`;
    }

    getPathData() {
        if (this.isFreehand())
            return this.getFreehandPathData();
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

    getFreehandMoveTransform(point) {
        return { freehandStrokes: this.properties.freehandStrokes.map(stroke => stroke.map(existing => ({ x: existing.x + point.dx, y: existing.y + point.dy }))) };
    }

    getFreehandHandles() {
        return [{
            tag: "path",
            className: "handle move mdl-freehand-move",
            getAttributes: () => ({ d: this.getPathData(), "stroke-width": Math.max(this.getEffectiveStrokeWidth() + 12, 18) }),
            getTransform: point => this.getFreehandMoveTransform(point)
        }];
    }

    getHandles() {
        if (this.isFreehand())
            return this.getFreehandHandles();
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
            strokeWidth: Math.max(1, this.getEffectiveStrokeWidth() - 1),
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
            const strokeWidth = this.getEffectiveStrokeWidth();
            this.path.setAttribute("stroke-dasharray", `${strokeWidth * 3} ${strokeWidth * 2}`);
            return;
        }
        this.path.removeAttribute("stroke-dasharray");
    }

    getPencilFilterId() {
        return `pencil-texture-${this.id}`;
    }

    buildPencilFilterMarkup() {
        const margin = this.getEffectiveStrokeWidth() + 8;
        const x = this.properties.x - margin;
        const y = this.properties.y - margin;
        const width = this.properties.width + margin * 2;
        const height = this.properties.height + margin * 2;
        return `<filter id="${this.getPencilFilterId()}" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}">`
            + `<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" result="pencilNoise" />`
            + `<feDisplacementMap in="SourceGraphic" in2="pencilNoise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />`
            + `</filter>`;
    }

    buildDefs() {
        if (!this.isFreehand())
            return this.buildMarkers();
        if (!this.getPencilStyle().textured)
            return "";
        return this.buildPencilFilterMarkup();
    }

    applyPencilStyle() {
        if (!this.isFreehand()) {
            this.path.removeAttribute("stroke-linecap");
            this.path.removeAttribute("stroke-linejoin");
            this.path.removeAttribute("stroke-opacity");
            this.path.removeAttribute("filter");
            this.path.style.mixBlendMode = "";
            return;
        }
        const style = this.getPencilStyle();
        this.path.setAttribute("stroke-linecap", style.lineCap);
        this.path.setAttribute("stroke-linejoin", "round");
        this.path.setAttribute("stroke-opacity", style.strokeOpacity);
        this.path.style.mixBlendMode = style.blendMode;
        if (style.textured && this._isDrawingFreehandStroke !== true)
            this.path.setAttribute("filter", `url(#${this.getPencilFilterId()})`);
        else
            this.path.removeAttribute("filter");
    }

    draw() {
        this.resolveEndpoints();
        super.draw();
        const pathData = this.getPathData();
        const strokeWidth = this.getEffectiveStrokeWidth();
        this.defs.innerHTML = this.buildDefs();
        this.path.setAttribute("d", pathData);
        this.path.setAttribute("stroke", this.getStrokeColor());
        this.path.setAttribute("stroke-width", strokeWidth);
        this.applyPencilStyle();
        this.applyLineStyle();
        this.applyMarkerForEnd("start", "marker-start");
        this.applyMarkerForEnd("end", "marker-end");
        this.hitPath.setAttribute("d", pathData);
        this.hitPath.setAttribute("stroke-width", Math.max(strokeWidth + 10, 14));
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
        const points = this.getAnchorCandidatePoints(startX, startY, endX, endY);
        if (this.properties.text)
            points.push(this.getLabelPoint());
        const minX = Math.min(...points.map(point => point.x));
        const maxX = Math.max(...points.map(point => point.x));
        const maxY = Math.max(...points.map(point => point.y));
        const labelClearance = this.properties.text ? 24 : 0;
        const anchorPoint = new DOMPoint((minX + maxX) / 2, maxY + labelClearance).matrixTransform(ctm);
        return { centerX: anchorPoint.x, bottomY: anchorPoint.y };
    }

    getAnchorCandidatePoints(startX, startY, endX, endY) {
        if (this.isFreehand())
            return [{ x: this.properties.x, y: this.properties.y }, { x: this.properties.x + this.properties.width, y: this.properties.y + this.properties.height }];
        return [{ x: startX, y: startY }, { x: endX, y: endY }, this.getBendPoint(startX, startY, endX, endY)];
    }

    drawLabel() {
        const hasText = !this.isFreehand() && (!!this.properties.text || this._isEditingText);
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
