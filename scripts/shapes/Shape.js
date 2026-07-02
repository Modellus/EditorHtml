class BaseShape {
    
    static embeddedFontStyles = "";
    static embeddedMathStyles = "";
    static shapeIcons = {
        BodyShape: "fa-light fa-circle",
        PointShape: "fa-solid fa-dot",
        VectorShape: "fa-light fa-arrow-right-long",
        LineShape: "fa-light fa-slash-forward",
        ArcShape: "fa-light fa-circle-half-stroke",
        ChartShape: "fa-light fa-chart-line",
        TableShape: "fa-light fa-table",
        SliderShape: "fa-light fa-slider",
        ValueShape: "fa-light fa-input-numeric",
        MediaShape: "fa-light fa-photo-film-music",
        ExpressionShape: "fa-light fa-function",
        TextShape: "fa-light fa-text",
        QuestionShape: "fa-light fa-clipboard-question",
        RulerShape: "fa-light fa-ruler",
        ProtractorShape: "fa-light fa-angle",
        ReferentialShape: "fa-light fa-shapes",
        GaugeShape: "fa-light fa-gauge"
    };

    static buildShapeTreeItem(shape) {
        const children = (shape.children ?? []).map(child => BaseShape.buildShapeTreeItem(child));
        const characterImage = shape.character ? `../../resources/characters/${shape.character.folder}/${shape.character.image}` : null;
        return {
            id: shape.id,
            text: shape.properties.name ?? "",
            icon: BaseShape.shapeIcons[shape.constructor.name] ?? "fa-light fa-shapes",
            color: shape.properties.foregroundColor ?? null,
            characterImage,
            expanded: true,
            items: children
        };
    }

    static renderShapeTreeItemHtml(data) {
        if (data.characterImage)
            return `<img class="mdl-parent-tree-character" src="${data.characterImage}" alt="${data.text}"/>${data.text}`;
        const solidIcon = data.icon.replace("fa-light", "fa-solid");
        const colorPart = data.color ? `color:${data.color};` : "";
        return `<i class="dx-icon ${solidIcon}" style="${colorPart}margin-right:8px"></i>${data.text}`;
    }

    static setup() {
        BaseShape.loadEmbeddedFonts();
    }

    static async loadEmbeddedFonts() {
        const fonts = [
            { family: "KaTeX_Main", url: "../../libraries/css/fonts/KaTeX_Main-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Main", url: "../../libraries/css/fonts/KaTeX_Main-Italic.woff2", weight: "400", style: "italic" },
            { family: "KaTeX_Main", url: "../../libraries/css/fonts/KaTeX_Main-Bold.woff2", weight: "700", style: "normal" },
            { family: "KaTeX_Main", url: "../../libraries/css/fonts/KaTeX_Main-BoldItalic.woff2", weight: "700", style: "italic" },
            { family: "KaTeX_Math", url: "../../libraries/css/fonts/KaTeX_Math-Italic.woff2", weight: "400", style: "italic" },
            { family: "KaTeX_Math", url: "../../libraries/css/fonts/KaTeX_Math-BoldItalic.woff2", weight: "700", style: "italic" },
            { family: "KaTeX_Size1", url: "../../libraries/css/fonts/KaTeX_Size1-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size2", url: "../../libraries/css/fonts/KaTeX_Size2-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size3", url: "../../libraries/css/fonts/KaTeX_Size3-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size4", url: "../../libraries/css/fonts/KaTeX_Size4-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_AMS", url: "../../libraries/css/fonts/KaTeX_AMS-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Caligraphic", url: "../../libraries/css/fonts/KaTeX_Caligraphic-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Fraktur", url: "../../libraries/css/fonts/KaTeX_Fraktur-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_SansSerif", url: "../../libraries/css/fonts/KaTeX_SansSerif-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Script", url: "../../libraries/css/fonts/KaTeX_Script-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Typewriter", url: "../../libraries/css/fonts/KaTeX_Typewriter-Regular.woff2", weight: "400", style: "normal" }
        ];
        const rules = [];
        const fontDataByFilename = {};
        for (const font of fonts) {
            const response = await fetch(font.url);
            const buffer = await response.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            const filename = font.url.split("/").pop();
            fontDataByFilename[filename] = base64;
            rules.push(`@font-face { font-family: "${font.family}"; src: url("data:font/woff2;base64,${base64}") format("woff2"); font-weight: ${font.weight}; font-style: ${font.style}; }`);
        }
        BaseShape.embeddedFontStyles = rules.join("\n");
        const cssResponse = await fetch("../../libraries/css/mathlive-static.css");
        const cssText = await cssResponse.text();
        BaseShape.embeddedMathStyles = cssText.replace(/url\(fonts\/([^)]+)\)/g, (match, filename) => {
            const data = fontDataByFilename[filename];
            if (data)
                return `url(data:font/woff2;base64,${data})`;
            return match;
        });
    }
    
    constructor(board, parent, id) {
        this.id = id ?? crypto.randomUUID();
        this.board = board;
        this.parent = parent;
        this.children = [];
        if (parent != null)
            parent.children.push(this);
        this.properties = {};
        this.termsMapping = [];
        this.termDisplayEntries = [];
        this.termFormControls = {};
        this.isReferential = false;
        this.setDefaults();
        this.initializeElement();
    }

    setProperties(properties) {
        const hasBorderColor = properties != null && Object.prototype.hasOwnProperty.call(properties, "borderColor");
        const hasForegroundColor = properties != null && Object.prototype.hasOwnProperty.call(properties, "foregroundColor");
        Object.assign(this.properties, properties);
        if (!hasBorderColor && hasForegroundColor)
            this.properties.borderColor = this.properties.foregroundColor;
    }

    setDefaults() {
        this.properties.foregroundColor = "#000000";
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
        this.properties.rotation = 0;
        this.properties.showName = false;
        this.properties.nameColor = null;
        this.properties.visibleToUsers = true;
        this.properties.lockedForUsers = false;
        var name = this.constructor.name.split(/(?=[A-Z])/)[0];
        this.properties.name = name;
    }

    initializeElement() {
        this.element = this.createElement();
        this.element.setAttribute("id", this.id);
        this.element.setAttribute("clip-path", `url(#${this.getClipId()})`);
        if (this.properties.nameColor == null)
            this.properties.nameColor = this.properties.foregroundColor;
        if (this.properties.borderColor == null)
            this.properties.borderColor = this.properties.foregroundColor;
        this.initializeTermDisplayLayer();
        this.initializeShapeNameLayer();
        this.draw();
        this.update();
        this.initializeContextToolbar();
    }



    serialize() {
        return { type: this.constructor.name, id: this.id, parent: this.parent?.id, properties: this.properties };
    }

    static deserialize(board, data) {
        var parent = board.getShape(data.parent);
        var shape = board.createShape(data.type, parent, data.id);
        shape.setProperties(data.properties);
        shape.draw();
        shape.update();
        return shape;
    }

    dispatchEvent(name, detail) {
        if (this.element === undefined)
            return;
        detail.shape = this;
        const event = new CustomEvent(name, { detail: detail });
        this.element.dispatchEvent(event);
    }

    getHandles() {
        const handleRadius = 4;
        const rotationSize = 8;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x, y: position.y, width: this.properties.width, height: this.properties.height };
                },
                getTransform: e => ({
                    x: this.properties.x + e.dx,
                    y: this.properties.y + e.dy,
                    width: this.properties.width,
                    height: this.properties.height
                })
            },
            {
                tag: "circle",
                className: "handle top-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { cx: position.x, cy: position.y, r: handleRadius };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                tag: "circle",
                className: "handle top-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { cx: position.x + this.properties.width, cy: position.y, r: handleRadius };
                },
                getTransform: e => ({
                    x: this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width + e.dx > 10 ? this.properties.width + e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                tag: "circle",
                className: "handle bottom-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { cx: position.x, cy: position.y + this.properties.height, r: handleRadius };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height + e.dy > 10 ? this.properties.height + e.dy : this.properties.height
                })
            },
            {
                tag: "circle",
                className: "handle bottom-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { cx: position.x + this.properties.width, cy: position.y + this.properties.height, r: handleRadius };
                },
                getTransform: e => ({
                    x: this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width + e.dx > 10 ? this.properties.width + e.dx : this.properties.width,
                    height: this.properties.height + e.dy > 10 ? this.properties.height + e.dy : this.properties.height
                })
            },
            {
                className: "handle rotation",
                getAttributes: () => this.getRotationHandlePosition(rotationSize),
                getTransform: e => ({ rotation: this.getRotationDegreesFromPointer(e) })
            }
        ];
    }

    createHandles() {
        this.handleElements = [];
        this.draggedHandle = null;
        this.handleDragThreshold = 4;
        this._handlePending = null;
        this._handlePendingStart = null;
        this._handleDragRaf = null;
        this._handlePendingPoint = null;
        this._handleActivePointerId = null;
        const handles = this.getHandles();
        handles.forEach(({ tag, className, getAttributes, getTransform }) => {
            const handle = this.board.createSvgElement(tag ?? "rect");
            handle.setAttribute("class", className);
            handle.setAttribute("visibility", "hidden");
            handle._shape = this;
            this.board.svg.appendChild(handle);
            this.handleElements.push(handle);
            handle.addEventListener("pointerdown", e => this.onHandlePointerDown(e, handle));
            handle.addEventListener("pointermove", e => this.onHandlePointerMove(e, handle));
            handle.addEventListener("wheel", e => this.onHandleWheel(e), { passive: false });
            handle.addEventListener("contextmenu", e => this.onHandleContextMenu(e));
            handle.update = h => {
                for (const [attr, val] of Object.entries(getAttributes()))
                    h.setAttribute(attr, val);
            };
            handle.getTransform = getTransform;
        });
        this.updateHandles();
    }

    updateHandles() {
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => {
            handle.update(handle);
            this.applyHandleRotation(handle);
        });
    }

    showHandles() {
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => {
            if (handle.classList.contains("rotation"))
                handle.setAttribute("visibility", "visible");
        });
    }

    hideHandles() {
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => handle.setAttribute("visibility", "hidden"));
    }

    removeHandles() {
        if (this._lastUnderlyingMoveElement) {
            this._lastUnderlyingMoveElement.dispatchEvent(new PointerEvent("pointerleave"));
            this._lastUnderlyingMoveElement = null;
        }
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => handle.remove());
        this.handleElements = null;
    }

    getShapeCenter() {
        const position = this.getBoardPosition();
        return {
            x: position.x + this.properties.width / 2,
            y: position.y + this.properties.height / 2
        };
    }

    getRotationHandleDistance(size) {
        return this.properties.height / 2 + size * 1.5;
    }

    getRotationHandlePosition(size) {
        const center = this.getShapeCenter();
        const distance = this.getRotationHandleDistance(size);
        return { x: center.x - size / 2, y: center.y - distance - size / 2, width: size, height: size };
    }

    getRotationDegreesFromPointer(point) {
        const center = this.getShapeCenter();
        const deltaX = point.x - center.x;
        const deltaY = point.y - center.y;
        const distance = Math.hypot(deltaX, deltaY);
        if (distance < 1)
            return Number(this.properties.rotation) || 0;
        return Math.atan2(deltaX, -deltaY) * 180 / Math.PI;
    }

    getRotationSnapIncrementDegrees() {
        return 90;
    }

    getRotationSnapThresholdDegrees() {
        return 4;
    }

    getSnappedRotationDegrees(angleDegrees) {
        if (!Number.isFinite(angleDegrees))
            return angleDegrees;
        const snapIncrement = Number(this.getRotationSnapIncrementDegrees());
        if (!(snapIncrement > 0))
            return angleDegrees;
        const nearestSnap = Math.round(angleDegrees / snapIncrement) * snapIncrement;
        const snapThreshold = Number(this.getRotationSnapThresholdDegrees());
        if (!(snapThreshold >= 0))
            return angleDegrees;
        if (Math.abs(angleDegrees - nearestSnap) <= snapThreshold)
            return nearestSnap;
        return angleDegrees;
    }

    isRotationHandle(handle) {
        if (!(handle instanceof Element))
            return false;
        return handle.classList.contains("rotation");
    }

    applyTransformSnapping(transform) {
        if (!transform || typeof transform !== "object")
            return transform;
        const withRotationSnapping = this.applyRotationTransformSnapping(transform);
        return this.applyResizeTransformSnapping(withRotationSnapping);
    }

    applyRotationTransformSnapping(transform) {
        if (!this.isRotationHandle(this.draggedHandle))
            return transform;
        const rotation = Number(transform.rotation);
        if (!Number.isFinite(rotation))
            return transform;
        const snappedRotation = this.getSnappedRotationDegrees(rotation);
        if (snappedRotation === rotation)
            return transform;
        return Object.assign({}, transform, { rotation: snappedRotation });
    }

    applyResizeTransformSnapping(transform) {
        if (!this.board.snapToGrid)
            return transform;
        if (!this.draggedHandle || this.draggedHandle.classList.contains("move") || this.draggedHandle.classList.contains("rotation"))
            return transform;
        const gridSize = Number(this.board.gridSize);
        if (!Number.isFinite(gridSize) || gridSize <= 0)
            return transform;
        if (!Object.prototype.hasOwnProperty.call(transform, "width") && !Object.prototype.hasOwnProperty.call(transform, "height") && !Object.prototype.hasOwnProperty.call(transform, "x") && !Object.prototype.hasOwnProperty.call(transform, "y") && !Object.prototype.hasOwnProperty.call(transform, "radius"))
            return transform;
        const handleClasses = this.draggedHandle.classList;
        const usesCornerHandle = handleClasses.contains("top-left") || handleClasses.contains("top-right") || handleClasses.contains("bottom-left") || handleClasses.contains("bottom-right");
        const snappedTransform = Object.assign({}, transform);
        if (usesCornerHandle)
            return snappedTransform;
        if (Object.prototype.hasOwnProperty.call(transform, "width"))
            snappedTransform.width = Math.max(10, Math.round(Number(transform.width) / gridSize) * gridSize);
        if (Object.prototype.hasOwnProperty.call(transform, "height"))
            snappedTransform.height = Math.max(10, Math.round(Number(transform.height) / gridSize) * gridSize);
        if (Object.prototype.hasOwnProperty.call(transform, "radius")) {
            if (Object.prototype.hasOwnProperty.call(snappedTransform, "width"))
                snappedTransform.radius = snappedTransform.width / 2;
            else
                snappedTransform.radius = Math.max(5, Math.round(Number(transform.radius) / gridSize) * gridSize);
        }
        return snappedTransform;
    }

    captureResizeFixedCorner() {
        if (!this.board.snapToGrid)
            return;
        if (!this.draggedHandle)
            return;
        const cls = this.draggedHandle.classList;
        const isCorner = cls.contains("top-left") || cls.contains("top-right") || cls.contains("bottom-left") || cls.contains("bottom-right");
        if (!isCorner)
            return;
        const boardPosition = this.getBoardPosition();
        const shapeWidth = Number(this.properties.width) || 0;
        const shapeHeight = Number(this.properties.height) || 0;
        const fixedBoardX = (cls.contains("top-left") || cls.contains("bottom-left")) ? boardPosition.x + shapeWidth : boardPosition.x;
        const fixedBoardY = (cls.contains("top-left") || cls.contains("top-right")) ? boardPosition.y + shapeHeight : boardPosition.y;
        this._resizeFixedCorner = {
            fixedBoardX: fixedBoardX,
            fixedBoardY: fixedBoardY,
            localX: Number(this.properties.x) || 0,
            localY: Number(this.properties.y) || 0,
            boardX: boardPosition.x,
            boardY: boardPosition.y
        };
    }

    getDirectionalResizeTransformFromAbsolutePoint(point) {
        if (!this.board.snapToGrid)
            return null;
        if (!this.draggedHandle)
            return null;
        if (!this._resizeFixedCorner)
            return null;
        const cls = this.draggedHandle.classList;
        const isCorner = cls.contains("top-left") || cls.contains("top-right") || cls.contains("bottom-left") || cls.contains("bottom-right");
        if (!isCorner)
            return null;
        const gridSize = Number(this.board.gridSize);
        if (!Number.isFinite(gridSize) || gridSize <= 0)
            return null;
        const fixedCorner = this._resizeFixedCorner;
        const snappedMouseX = Math.round(point.x / gridSize) * gridSize;
        const snappedMouseY = Math.round(point.y / gridSize) * gridSize;
        const left = Math.min(snappedMouseX, fixedCorner.fixedBoardX);
        const right = Math.max(snappedMouseX, fixedCorner.fixedBoardX);
        const top = Math.min(snappedMouseY, fixedCorner.fixedBoardY);
        const bottom = Math.max(snappedMouseY, fixedCorner.fixedBoardY);
        const transform = {};
        transform.x = fixedCorner.localX + (left - fixedCorner.boardX);
        transform.y = fixedCorner.localY + (top - fixedCorner.boardY);
        transform.width = Math.max(10, right - left);
        transform.height = Math.max(10, bottom - top);
        if (Object.prototype.hasOwnProperty.call(this.properties, "radius"))
            transform.radius = transform.width / 2;
        return transform;
    }

    snapDragPoint(point) {
        if (!this.board.snapToGrid)
            return point;
        const gridSize = this.board.gridSize;
        if (!gridSize)
            return point;
        const boardPosition = this.getBoardPosition();
        if (!this._gridSnapGrabOffset)
            this._gridSnapGrabOffset = { x: point.x - boardPosition.x, y: point.y - boardPosition.y };
        const desiredX = point.x - this._gridSnapGrabOffset.x;
        const desiredY = point.y - this._gridSnapGrabOffset.y;
        const snappedX = Math.round(desiredX / gridSize) * gridSize;
        const snappedY = Math.round(desiredY / gridSize) * gridSize;
        return { x: point.x, y: point.y, dx: snappedX - boardPosition.x, dy: snappedY - boardPosition.y };
    }

    getHandleRotationCenter() {
        const position = this.getBoardPosition();
        const radius = Number(this.properties?.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(this.properties?.width);
        const height = Number(this.properties?.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height / 2 };
        return null;
    }

    getHandleRotationDegrees() {
        const rotation = typeof this.getAbsoluteRotation == "function"
            ? Number(this.getAbsoluteRotation())
            : Number(this.properties?.rotation);
        if (!Number.isFinite(rotation))
            return 0;
        return rotation;
    }

    applyHandleRotation(handle) {
        if (!handle)
            return;
        const center = this.getHandleRotationCenter();
        const rotation = this.getHandleRotationDegrees();
        if (!center || Math.abs(rotation) < 0.00001) {
            handle.removeAttribute("transform");
            return;
        }
        handle.setAttribute("transform", `rotate(${rotation} ${center.x} ${center.y})`);
    }

    getElementUnderMoveHandle(handle, event) {
        const overlays = this.board.svg.querySelectorAll(".handle, .bounding-box, .hover-outline, .selected-outline, .resize-handle, .rotation-handle");
        const savedStyles = [];
        overlays.forEach(element => {
            savedStyles.push({ element: element, pointerEvents: element.style.pointerEvents });
            element.style.pointerEvents = "none";
        });
        const elements = document.elementsFromPoint(event.clientX, event.clientY);
        savedStyles.forEach(entry => entry.element.style.pointerEvents = entry.pointerEvents);
        for (const element of elements) {
            if (element && this.element.contains(element))
                return element;
        }
        return null;
    }

    onHandlePointerMove = (event, handle) => {
        if (this.draggedHandle)
            return;
        if (!handle.classList.contains("move"))
            return;
        const underlying = this.getElementUnderMoveHandle(handle, event);
        if (underlying)
            handle.style.cursor = window.getComputedStyle(underlying).cursor;
        else
            handle.style.cursor = "";
        if (underlying !== this._lastUnderlyingMoveElement) {
            if (this._lastUnderlyingMoveElement)
                this._lastUnderlyingMoveElement.dispatchEvent(new PointerEvent("pointerleave", event));
            this._lastUnderlyingMoveElement = underlying;
        }
        if (underlying)
            underlying.dispatchEvent(new PointerEvent("pointermove", event));
    }

    onHandlePointerDown = (event, handle) => {
        if (handle.classList.contains("move")) {
            const underlying = this.getElementUnderMoveHandle(handle, event);
            if (underlying) {
                const probeEvent = new PointerEvent("pointerdown", event);
                underlying.dispatchEvent(probeEvent);
                if (probeEvent.defaultPrevented) {
                    event.stopPropagation();
                    event.preventDefault();
                    if (this.isPassthroughDoubleClickSelectionEnabled()) {
                        const now = Date.now();
                        if (this._lastPassthroughTime && now - this._lastPassthroughTime < 400) {
                            this._lastPassthroughTime = 0;
                            handle.dispatchEvent(new MouseEvent("dblclick", {
                                bubbles: true, cancelable: true,
                                clientX: event.clientX, clientY: event.clientY
                            }));
                            return;
                        }
                        this._lastPassthroughTime = now;
                        this.board.selection.select(this);
                    }
                    handle.style.pointerEvents = "none";
                    const clickTarget = underlying;
                    const clickEvent = event;
                    const restoreHandle = () => {
                        handle.style.pointerEvents = "";
                        clickTarget.dispatchEvent(new MouseEvent("click", {
                            bubbles: true, cancelable: true,
                            clientX: clickEvent.clientX, clientY: clickEvent.clientY
                        }));
                        window.removeEventListener("pointerup", restoreHandle);
                        window.removeEventListener("pointercancel", restoreHandle);
                    };
                    window.addEventListener("pointerup", restoreHandle);
                    window.addEventListener("pointercancel", restoreHandle);
                    return;
                }
            }
        }
        event.stopPropagation();
        this.board.pointerLocked = true;
        const point = this.board.getMouseToSvgPoint(event);
        this._handlePending = handle;
        this._handlePendingStart = { x: point.x, y: point.y };
        this._handleActivePointerId = event.pointerId;
        try { handle.setPointerCapture(this._handleActivePointerId); } catch (_) {}
        handle.addEventListener("pointermove", this.onHandleDrag);
        handle.addEventListener("pointerup", this.onHandleDragEnd);
        handle.addEventListener("pointercancel", this.onHandleDragEnd);
        window.addEventListener("pointermove", this.onHandleDrag);
        window.addEventListener("pointerup", this.onHandleDragEnd);
        window.addEventListener("pointercancel", this.onHandleDragEnd);
    }

    onHandleDrag = event => {
        if (this._tickDragState)
            return;
        if (this._handleActivePointerId != null && event.pointerId !== this._handleActivePointerId)
            return;
        const p = this.board.getMouseToSvgPoint(event);
        if (!this.draggedHandle) {
            if (!this._handlePendingStart || !this._handlePending)
                return;
            const dx = p.x - this._handlePendingStart.x;
            const dy = p.y - this._handlePendingStart.y;
            if (Math.hypot(dx, dy) <= this.handleDragThreshold)
                return;
            this.dragStart();
            event.preventDefault();
            this.draggedHandle = this._handlePending;
            this.captureResizeFixedCorner();
            this.handleStartX = this._handlePendingStart.x;
            this.handleStartY = this._handlePendingStart.y;
        }
        p.dx = p.x - this.handleStartX;
        p.dy = p.y - this.handleStartY;
        this._handlePendingPoint = p;
        if (this._handleDragRaf == null) {
            this._handleDragRaf = requestAnimationFrame(() => {
                this._handleDragRaf = null;
                if (!this._handlePendingPoint || !this.draggedHandle)
                    return;
                const point = this._handlePendingPoint;
                this._handlePendingPoint = null;
                const directionalResizeTransform = this.getDirectionalResizeTransformFromAbsolutePoint(point);
                const dragPoint = this.draggedHandle.classList.contains("move") ? this.snapDragPoint(point) : point;
                const transform = directionalResizeTransform ?? this.applyTransformSnapping(this.draggedHandle.getTransform(dragPoint));
                this.transformShape(transform);
                this.updateHandles();
                this.handleStartX = point.x;
                this.handleStartY = point.y;
            });
        }
    }

    onHandleDragEnd = event => {
        if (this._handleActivePointerId != null && event.pointerId != null && event.pointerId !== this._handleActivePointerId)
            return;
        const handle = this.draggedHandle ?? this._handlePending;
        if (handle) {
            try { handle.releasePointerCapture(this._handleActivePointerId); } catch (_) {}
            handle.removeEventListener("pointermove", this.onHandleDrag);
            handle.removeEventListener("pointerup", this.onHandleDragEnd);
            handle.removeEventListener("pointercancel", this.onHandleDragEnd);
        }
        window.removeEventListener("pointermove", this.onHandleDrag);
        window.removeEventListener("pointerup", this.onHandleDragEnd);
        window.removeEventListener("pointercancel", this.onHandleDragEnd);
        if (!this.draggedHandle) {
            this._handlePending = null;
            this._handlePendingStart = null;
            this._handleActivePointerId = null;
            this.board.pointerLocked = false;
            return;
        }
        this.draggedHandle = null;
        this._handlePending = null;
        this._handlePendingStart = null;
        this._handleActivePointerId = null;
        if (this._handleDragRaf != null) {
            cancelAnimationFrame(this._handleDragRaf);
            this._handleDragRaf = null;
        }
        this._handlePendingPoint = null;
        this._resizeFixedCorner = null;
        this.board.pointerLocked = false;
        this.dragEnd();
    }

    transformShape(transform) {
        for (const [attribute, value] of Object.entries(transform))
            this.setProperty(attribute, value);
    }

    onHandleWheel(event) {
        const target = this.resolveWheelTarget(event);
        if (!target)
            return;
        event.preventDefault();
        event.stopPropagation();
        if (target instanceof Element && target.classList.contains("handle"))
            return;
        if (target instanceof HTMLElement && this.scrollWheelTarget(target, event))
            return;
        if (target === this.board.svg) {
            this.dispatchWheelToSvg(event);
            return;
        }
        this.dispatchWheelToTarget(target, event);
    }

    dispatchWheelToSvg(event) {
        if (!this.board?.svg)
            return;
        this.dispatchWheelToTarget(this.board.svg, event);
    }

    dispatchWheelToTarget(target, event) {
        if (!(target instanceof EventTarget))
            return;
        target.dispatchEvent(new WheelEvent("wheel", {
            bubbles: true, cancelable: true,
            clientX: event.clientX, clientY: event.clientY,
            screenX: event.screenX, screenY: event.screenY,
            deltaX: event.deltaX, deltaY: event.deltaY, deltaZ: event.deltaZ, deltaMode: event.deltaMode,
            ctrlKey: event.ctrlKey, shiftKey: event.shiftKey, altKey: event.altKey, metaKey: event.metaKey
        }));
    }

    resolveWheelTarget(event) {
        const disabledHandles = [];
        const currentTarget = event.currentTarget;
        if (currentTarget instanceof Element && currentTarget.classList.contains("handle"))
            this.disableWheelHandle(currentTarget, disabledHandles);
        let target = document.elementFromPoint(event.clientX, event.clientY);
        while (target instanceof Element && target.classList.contains("handle")) {
            this.disableWheelHandle(target, disabledHandles);
            target = document.elementFromPoint(event.clientX, event.clientY);
        }
        this.restoreWheelHandles(disabledHandles);
        if (target instanceof Element)
            return target;
        return this.board.svg;
    }

    disableWheelHandle(handle, disabledHandles) {
        disabledHandles.push({ handle: handle, pointerEvents: handle.style.pointerEvents });
        handle.style.pointerEvents = "none";
    }

    restoreWheelHandles(disabledHandles) {
        for (let index = disabledHandles.length - 1; index >= 0; index--)
            disabledHandles[index].handle.style.pointerEvents = disabledHandles[index].pointerEvents;
    }

    scrollWheelTarget(target, event) {
        const scrollTarget = this.getWheelScrollTarget(target);
        if (!scrollTarget)
            return false;
        const previousScrollTop = scrollTarget.scrollTop;
        const previousScrollLeft = scrollTarget.scrollLeft;
        scrollTarget.scrollBy({ left: event.deltaX, top: event.deltaY, behavior: "auto" });
        return scrollTarget.scrollTop !== previousScrollTop || scrollTarget.scrollLeft !== previousScrollLeft;
    }

    getWheelScrollTarget(target) {
        let element = target;
        while (element instanceof HTMLElement) {
            const style = window.getComputedStyle(element);
            const canScrollY = (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflowY === "overlay") && element.scrollHeight > element.clientHeight;
            const canScrollX = (style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowX === "overlay") && element.scrollWidth > element.clientWidth;
            if (canScrollX || canScrollY)
                return element;
            element = element.parentElement;
        }
        return null;
    }

    onHandleContextMenu(event) {
        if (!this.element)
            return;
        event.preventDefault();
        event.stopPropagation();
        this.element.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: true, cancelable: true,
            clientX: event.clientX, clientY: event.clientY, button: 2
        }));
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    getPermissionsIconClass() {
        const hidden = !this.properties.visibleToUsers;
        const locked = this.properties.lockedForUsers;
        if (hidden && locked)
            return "fa-solid fa-shield";
        if (hidden || locked)
            return "fa-solid fa-shield-halved";
        return "fa-regular fa-shield";
    }

    renderPermissionsButtonTemplate(element) {
        element.innerHTML = `<i class="${this.getPermissionsIconClass()} mdl-permissions-icon"></i>`;
    }

    refreshPermissionsButtonIcon() {
        const icon = this._permissionsDropdownElement?.find(".mdl-permissions-icon")[0];
        if (!icon)
            return;
        const newClass = this.getPermissionsIconClass();
        if (icon.classList.contains(newClass.split(" ")[0]) && icon.classList.contains(newClass.split(" ")[1]))
            return;
        icon.classList.add("mdl-permissions-icon-animate");
        icon.className = `${newClass} mdl-permissions-icon mdl-permissions-icon-animate`;
        icon.addEventListener("animationend", () => icon.classList.remove("mdl-permissions-icon-animate"), { once: true });
    }

    getShapeOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup ${extraClass}` : "mdl-shape-overlay-popup";
        return { class: wrapperClassName };
    }

    getShapeNestedOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup mdl-shape-overlay-popup-nested ${extraClass}` : "mdl-shape-overlay-popup mdl-shape-overlay-popup-nested";
        return { class: wrapperClassName };
    }

    getDropDownButtonInstance(element) {
        const hostElement = element?.[0] ?? element;
        if (!(hostElement instanceof Element))
            return null;
        return window.DevExpress?.ui?.dxDropDownButton?.getInstance(hostElement) ?? null;
    }

    _onDocumentMouseDown = e => {
        const outside = this.isClickOutsideEditArea(e.target);
        if (outside)
            this.board.selection.removeEditModeHighlight();
    };

    isClickOutsideEditArea(target) {
        return !this.element.contains(target) && !$(target).closest(".dx-overlay-wrapper").length;
    }

    enterEditMode() {
        return false;
    }

    isPassthroughDoubleClickSelectionEnabled() {
        return false;
    }

    exitEditMode() {
        document.removeEventListener("mousedown", this._onDocumentMouseDown);
    }

    initializeContextToolbar() {
        const toolbarItems = this.createToolbar();
        if (!toolbarItems || !toolbarItems.length || !window.DevExpress?.ui?.dxToolbar)
            return;
        const separator = { location: "center", template: () => $('<div class="toolbar-separator">|</div>') };
        toolbarItems.splice(toolbarItems.length - 1, 0, this.createActionsToolbarItem(), separator);
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        $(toolbarHost).dxToolbar({ items: toolbarItems, width: "auto" });
        this.contextToolbar = toolbarHost;
        this.contextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    refreshTermControlVisibilities() {
        for (const term of Object.keys(this.termFormControls)) {
            const checkbox = this.termFormControls[term]?.visibilityCheckbox;
            if (!checkbox)
                continue;
            const displayModeProperty = this.getTermDisplayModeProperty(term);
            const displayModeValue = this.properties[displayModeProperty] ?? "none";
            const isVisible = displayModeValue !== false && displayModeValue !== "none";
            checkbox.option("value", isVisible);
            TermControl.updateVisibilityCheckboxIcon(checkbox);
        }
    }

    showContextToolbar() {
        this.refreshNameToolbarControl();
        this.refreshShapeColorToolbarControl();
        this.refreshTermControlVisibilities();
        if (this.contextToolbar)
            this.contextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionContextToolbar()));
    }

    hideContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.remove("visible");
    }

    positionContextToolbar() {
        if (!this.contextToolbar || !this.element)
            return;
        const anchor = this.getScreenAnchorPoint();
        if (!anchor)
            return;
        const toolbarRect = this.contextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.contextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.contextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = anchor.centerX - toolbarWidth / 2;
        let top = anchor.bottomY + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.contextToolbar.style.left = `${left}px`;
        this.contextToolbar.style.top = `${top}px`;
    }

    getScreenAnchorPoint() {
        if (this.container?.getBoundingClientRect) {
            const rect = this.container.getBoundingClientRect();
            return {
                centerX: rect.left + rect.width / 2,
                bottomY: rect.bottom
            };
        }
        if (!this.board?.svg)
            return null;
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const props = this.properties ?? {};
        const width = Number.isFinite(props.width) ? props.width : 0;
        const height = Number.isFinite(props.height) ? props.height : 0;
        const radius = Number.isFinite(props.radius) ? props.radius : null;
        const svgRect = this.board.svg.getBoundingClientRect();
        const ctm = this.board.svg.getScreenCTM();
        if (!ctm)
            return null;
        const centerX = radius != null ? position.x : position.x + width / 2;
        const centerY = radius != null ? position.y : position.y + height / 2;
        const bottomY = radius != null ? position.y + radius : position.y + height;
        const centerPoint = new DOMPoint(centerX, centerY).matrixTransform(ctm);
        const bottomPoint = new DOMPoint(centerX, bottomY).matrixTransform(ctm);
        return {
            centerX: centerPoint.x,
            bottomY: bottomPoint.y
        };
    }

    getColorControl() {
        if (!this.colorControl)
            this.colorControl = new ColorControl({ palette: this.board.theme.getColorPickerPalette() });
        return this.colorControl;
    }

    refreshNameToolbarControl() {
        this._nameTextBoxInstance?.option("value", this.properties.name);
        if (this._nameColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._nameColorPicker, this.properties.nameColor);
    }

    renderShapeColorButtonTemplate(element) {
        const name = this.properties.name ?? "";
        const icon = BaseShape.shapeIcons[this.constructor.name] ?? "fa-light fa-shapes";
        element.innerHTML = `<span class="mdl-shape-color-btn"><i class="${icon}"></i></span><span>${name}</span>`;
    }

    renderAddShapeButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-shape-color-btn"><i class="fa-light fa-circle-plus"></i></span>`;
    }

    getAddShapeMenuItems() {
        return [
            { key: "BodyShape", type: "Body", icon: "fa-light fa-circle", text: this.board.translations.get("Body Name") },
            { key: "PointShape", type: "Point", icon: "fa-solid fa-dot", text: this.board.translations.get("Point Name") },
            { key: "VectorShape", type: "Vector", icon: "fa-light fa-arrow-right-long fa-rotate-by", text: this.board.translations.get("Vector Name") },
            { key: "LineShape", type: "Line", icon: "fa-light fa-slash-forward", text: this.board.translations.get("Line Name") },
            { key: "ArcShape", type: "Arc", icon: "fa-light fa-circle-half-stroke", text: this.board.translations.get("Arc Name") }
        ];
    }

    menuIconHtml(iconName, isSet) {
        const weight = isSet ? "fa-solid" : "fa-light";
        return `<i class="${weight} ${iconName} mdl-menu-icon"></i>`;
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
    }

    refreshShapeColorToolbarControl() {
        if (!this._shapeColorDropdownElement)
            return;
        const buttonContentElement = this._shapeColorDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderShapeColorButtonTemplate(buttonContentElement);
        if (this._fgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._fgColorPicker, this.properties.foregroundColor);
        if (this._borderColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._borderColorPicker, this.properties.borderColor);
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
    }

    getCopySubMenuItems() {
        return [
            { text: "Copy as Image", icon: "fa-light fa-image", shortcut: "", action: () => this.copyAsImage() }
        ];
    }

    populateTermsMenuSections(listItems) {
    }

    renderTermsButtonTemplate(element) {
    }

    clearStaleTermCollectionReferences(staleTermNames) {
    }

    refreshTermsToolbarControl() {
        if (!this._termsDropdownElement)
            return;
        const buttonContentElement = this._termsDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderTermsButtonTemplate(buttonContentElement);
    }

    delta(property, delta) {
        var termMapping = this.termsMapping.find(t => t.property === property);
        let updatedValue = this.properties[property];
        let value;
        if (termMapping != null) {
            if (this.isTermLocked(termMapping.termProperty))
                return updatedValue;
            const scale = this.getScale();
            let axisScale = scale[termMapping.scaleProperty] ?? 1;
            var term = this.properties[termMapping.termProperty];
            const rawCaseNumber = this.properties[termMapping.caseProperty] ?? 1;
            const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : (parseInt(rawCaseNumber, 10) || 1);
            const calculator = this.board.calculator;
            var isTerm = calculator.isTerm(term);
            delta = delta * axisScale * (termMapping.isInverted ? -1 : 1);
            if (isTerm) {
                value = calculator.getByName(term, caseNumber);
                if (!Number.isFinite(value)) {
                    const fallback = Number.isFinite(this.properties[property]) ? this.properties[property] : 0;
                    value = (termMapping.isInverted ? -fallback : fallback) * axisScale;
                }
                calculator.setTermValue(term, value + delta, calculator.system.iteration, caseNumber);
                calculator.calculate();
            } else {
                const currentTermValue = parseFloat(this.properties[termMapping.termProperty]);
                const baseValue = Number.isFinite(currentTermValue) ? currentTermValue : 0;
                this.properties[termMapping.termProperty] = Utils.roundToPrecision(baseValue + delta, calculator.getPrecision());
            }
        } else
            this.properties[property] = parseFloat(this.properties[property]) + delta;
        this.tick();
        this.board.markDirty(this);
        updatedValue = this.properties[property];
        this.dispatchEvent("shapeChanged", { property: property, value: updatedValue });
        return updatedValue;
    }

    setProperty(name, value) {
        this.properties[name] = value;
        this.tick();
        this.board.markDirty(this);
        this.dispatchEvent("shapeChanged", { property: name, value: value });
    }

    setPropertyCommand(name, value) {
        const command = new SetShapePropertiesCommand(this.board, this, { [name]: value });
        this.board.invoker.execute(command);
    }

    applyUserPermissions() {
        if (!this.properties.visibleToUsers)
            this.element.style.display = "none";
        if (this.properties.lockedForUsers)
            this.element.style.pointerEvents = "none";
        this.children.forEach(child => child.applyUserPermissions());
    }

    restoreUserPermissions() {
        this.element.style.display = "";
        this.element.style.pointerEvents = "";
        this.children.forEach(child => child.restoreUserPermissions());
    }

    update() {
        this.children.forEach(child => child.update());
    }

    draw() {
        this.children.forEach(child => child.draw());
        this.drawTermDisplayLabels();
        this.drawShapeNameLabel();
    }

    tick() {
        this.children.forEach(child => child.tick());
    }

    getBounds() {
        var parentBounds = this.parent?.getBounds() ?? {};
        return {
            x: this.properties.x + (parentBounds.originX ?? 0),
            y: this.properties.y + (parentBounds.originY ?? 0),
            width: this.properties.width,
            height: this.properties.height,
            originX: this.properties.x + (parentBounds.originX ?? 0) + this.properties.width / 2,
            originY: this.properties.y + (parentBounds.originY ?? 0) + this.properties.height / 2,
            rotation: this.properties.rotation + (parentBounds.rotation ?? 0)
        };
    }

    getAbsoluteRotation() {
        const localRotation = Number(this.properties?.rotation);
        const normalizedLocalRotation = Number.isFinite(localRotation) ? localRotation : 0;
        if (!this.parent)
            return normalizedLocalRotation;
        if (typeof this.parent.getAbsoluteRotation == "function")
            return normalizedLocalRotation + this.parent.getAbsoluteRotation();
        const parentRotation = Number(this.parent?.properties?.rotation);
        if (!Number.isFinite(parentRotation))
            return normalizedLocalRotation;
        return normalizedLocalRotation + parentRotation;
    }

    rotatePointAroundCenter(pointX, pointY, centerX, centerY, angleDegrees) {
        const radians = angleDegrees * Math.PI / 180;
        const dx = pointX - centerX;
        const dy = pointY - centerY;
        const rotatedX = centerX + dx * Math.cos(radians) - dy * Math.sin(radians);
        const rotatedY = centerY + dx * Math.sin(radians) + dy * Math.cos(radians);
        return { x: rotatedX, y: rotatedY };
    }

    getRotationCenterForShape(shape, shapePosition = null) {
        if (!shape)
            return null;
        const position = shapePosition ?? shape.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(shape?.properties?.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(shape?.properties?.width);
        const height = Number(shape?.properties?.height);
        if (!Number.isFinite(width) || !Number.isFinite(height))
            return null;
        return { x: position.x + width / 2, y: position.y + height / 2 };
    }

    getBoardPosition() {
        const parent = this.parent;
        if (!parent)
            return {
                x: this.properties.x,
                y: this.properties.y
            };
        const parentPosition = parent.getBoardPosition?.() ?? { x: 0, y: 0 };
        let x = this.properties.x + parentPosition.x + (parent.properties?.originX ?? 0);
        let y = this.properties.y + parentPosition.y + (parent.properties?.originY ?? 0);
        const parentRotation = typeof parent.getAbsoluteRotation == "function" ? parent.getAbsoluteRotation() : Number(parent?.properties?.rotation ?? 0);
        if (!Number.isFinite(parentRotation) || Math.abs(parentRotation) < 0.00001)
            return { x: x, y: y };
        const rotationCenter = this.getRotationCenterForShape(parent, parentPosition);
        if (!rotationCenter)
            return { x: x, y: y };
        return this.rotatePointAroundCenter(x, y, rotationCenter.x, rotationCenter.y, parentRotation);
    }

    getClipId() {
        return this.parent?.getClipId();
    }

    getScale() {
        const referential = this.getReferentialParent();
        return {
            x: referential?.properties.scaleX ?? 1,
            y: referential?.properties.scaleY ?? 1,
        };
    }

    getReferentialParent() {
        var referential = this.parent;
        while (referential != null && !referential.isReferential)
            referential = referential.parent;
        return referential;
    }

    remove() {
        const command = new RemoveShapeCommand(this.board, this);
        this.board.invoker.execute(command);
    }

    resetToDefaults() {
        const previousProperties = Utils.cloneProperties(this.properties);
        this.setDefaults();
        const defaultProperties = { ...this.properties, x: previousProperties.x, y: previousProperties.y, width: previousProperties.width, height: previousProperties.height };
        this.setProperties(previousProperties);
        const command = new SetShapePropertiesCommand(this.board, this, defaultProperties);
        this.board.invoker.execute(command);
    }

    getClipboardData() {
        const data = this.serialize();
        data.id = undefined;
        data.properties = Utils.cloneProperties(data.properties);
        data.children = this.children.map(child => {
            const childData = child.getClipboardData();
            childData.parent = undefined;
            return childData;
        });
        return data;
    }

    toSvgString() {
        const elements = this.collectSvgElements();
        const bbox = this.getExportBoundingBox(elements);
        const padding = 4;
        const x = bbox.x - padding;
        const y = bbox.y - padding;
        const width = Math.max(1, bbox.width + padding * 2);
        const height = Math.max(1, bbox.height + padding * 2);
        let content = "";
        for (const element of elements) {
            const clone = this.createExportElementClone(element);
            content += clone.outerHTML;
        }
        const styleBlock = BaseShape.embeddedFontStyles ? `<defs><style>${BaseShape.embeddedFontStyles}</style></defs>` : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${styleBlock}${content}</svg>`;
    }

    getExportBoundingBox(elements) {
        let minimumX = Infinity;
        let minimumY = Infinity;
        let maximumX = -Infinity;
        let maximumY = -Infinity;
        for (const element of elements) {
            const elementBoundingBox = this.getExportElementBoundingBox(element);
            if (!elementBoundingBox)
                continue;
            minimumX = Math.min(minimumX, elementBoundingBox.x);
            minimumY = Math.min(minimumY, elementBoundingBox.y);
            maximumX = Math.max(maximumX, elementBoundingBox.x + elementBoundingBox.width);
            maximumY = Math.max(maximumY, elementBoundingBox.y + elementBoundingBox.height);
        }
        if (!Number.isFinite(minimumX) || !Number.isFinite(minimumY) || !Number.isFinite(maximumX) || !Number.isFinite(maximumY))
            return { x: 0, y: 0, width: 1, height: 1 };
        return {
            x: minimumX,
            y: minimumY,
            width: Math.max(1, maximumX - minimumX),
            height: Math.max(1, maximumY - minimumY)
        };
    }

    getExportElementBoundingBox(element) {
        let localBoundingBox;
        try {
            localBoundingBox = element.getBBox();
        } catch (_) {
            return null;
        }
        const transformMatrix = element.getCTM();
        if (!transformMatrix)
            return localBoundingBox;
        const firstPoint = this.transformPointWithMatrix(transformMatrix, localBoundingBox.x, localBoundingBox.y);
        const secondPoint = this.transformPointWithMatrix(transformMatrix, localBoundingBox.x + localBoundingBox.width, localBoundingBox.y);
        const thirdPoint = this.transformPointWithMatrix(transformMatrix, localBoundingBox.x + localBoundingBox.width, localBoundingBox.y + localBoundingBox.height);
        const fourthPoint = this.transformPointWithMatrix(transformMatrix, localBoundingBox.x, localBoundingBox.y + localBoundingBox.height);
        const minimumX = Math.min(firstPoint.x, secondPoint.x, thirdPoint.x, fourthPoint.x);
        const minimumY = Math.min(firstPoint.y, secondPoint.y, thirdPoint.y, fourthPoint.y);
        const maximumX = Math.max(firstPoint.x, secondPoint.x, thirdPoint.x, fourthPoint.x);
        const maximumY = Math.max(firstPoint.y, secondPoint.y, thirdPoint.y, fourthPoint.y);
        return {
            x: minimumX,
            y: minimumY,
            width: maximumX - minimumX,
            height: maximumY - minimumY
        };
    }

    transformPointWithMatrix(matrix, x, y) {
        return {
            x: matrix.a * x + matrix.c * y + matrix.e,
            y: matrix.b * x + matrix.d * y + matrix.f
        };
    }

    collectSvgElements() {
        return [this.element];
    }

    createExportElementClone(element) {
        const clone = element.cloneNode(true);
        clone.removeAttribute("id");
        clone.removeAttribute("clip-path");
        return clone;
    }

    toImageBlob() {
        return new Promise(resolve => {
            const svgString = this.toSvgString();
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth * 2;
                canvas.height = img.naturalHeight * 2;
                const ctx = canvas.getContext("2d");
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => resolve(blob), "image/png");
            };
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        });
    }

    async copyToClipboard() {
        const shapeData = this.getClipboardData();
        const json = JSON.stringify(shapeData);
        const imageBlob = this.toImageBlob();
        const items = [new ClipboardItem({
            "text/plain": new Blob([json], { type: "text/plain" }),
            "image/png": imageBlob
        })];
        await navigator.clipboard.write(items);
    }

    async copyAsImage() {
        const imageBlob = await this.toImageBlob();
        const items = [new ClipboardItem({ "image/png": imageBlob })];
        await navigator.clipboard.write(items);
    }

    async copyAsSvg() {
        const svgString = this.toSvgString();
        await navigator.clipboard.writeText(svgString);
    }

    static async pasteFromClipboard(board, parent) {
        const text = await navigator.clipboard.readText();
        let data;
        try { data = JSON.parse(text); } catch (_) { return; }
        if (!data?.type || !data?.properties)
            return;
        data.properties.x = (data.properties.x ?? 0) + 20;
        data.properties.y = (data.properties.y ?? 0) + 20;
        const shape = board.createShape(data.type, parent ?? null);
        shape.setProperties(data.properties);
        const command = new AddShapeCommand(board, shape);
        board.invoker.execute(command);
        BaseShape.pasteChildren(board, shape, data.children);
        shape.draw();
        shape.update();
    }

    duplicate() {
        const data = this.getClipboardData();
        data.properties.x = (data.properties.x ?? 0) + 20;
        data.properties.y = (data.properties.y ?? 0) + 20;
        const shape = this.board.createShape(data.type, this.parent);
        shape.setProperties(data.properties);
        const command = new AddShapeCommand(this.board, shape);
        this.board.invoker.execute(command);
        BaseShape.pasteChildren(this.board, shape, data.children);
        shape.draw();
        shape.update();
    }

    static pasteChildren(board, parentShape, children) {
        if (!children)
            return;
        for (const childData of children) {
            const child = board.createShape(childData.type, parentShape);
            childData.properties.parentId = parentShape.id;
            child.setProperties(childData.properties);
            board.addShape(child);
            child.draw();
            child.update();
            BaseShape.pasteChildren(board, child, childData.children);
        }
    }

    dragStart() {
        this._dragStartSnapshot = Utils.cloneProperties(this.properties);
        this.dispatchEvent("shapeDragStart", {});
    }

    dragEnd() {
        this._gridSnapGrabOffset = null;
        this.dispatchEvent("shapeDragEnd", {});
        if (!this._dragStartSnapshot)
            return;
        const command = new SetShapePropertiesCommand(this.board, this, Utils.cloneProperties(this.properties));
        command.previousProperties = this._dragStartSnapshot;
        this._dragStartSnapshot = null;
        this.board.invoker.record(command);
    }

    getModelPrecision() {
        const precision = Number(this.board?.calculator?.getPrecision?.());
        if (!Number.isFinite(precision) || precision < 0)
            return 0;
        return Math.floor(precision);
    }

    getPrecisionNumberEditorOptions(editorOptions = {}) {
        const precision = this.getModelPrecision();
        const step = precision > 0 ? 1 / (10 ** precision) : 1;
        return Object.assign({
            showSpinButtons: true,
            stylingMode: "filled",
            elementAttr: { class: "mdl-math-input" },
            format: { type: "fixedPoint", precision: precision },
            step: step
        }, editorOptions);
    }

    createForeignObjectGroup() {
        const group = this.board.createSvgElement("g");
        const foreignObject = this.board.createSvgElement("foreignObject");
        group.appendChild(foreignObject);
        this.foreignObject = foreignObject;
        return { group, foreignObject };
    }

    applyForeignObjectLayout() {
        if (!this.foreignObject)
            return;
        this.element.setAttribute("transform", `translate(${this.properties.x}, ${this.properties.y}) rotate(${this.properties.rotation}, ${this.properties.width / 2}, ${this.properties.height / 2})`);
        this.foreignObject.setAttribute("x", 0);
        this.foreignObject.setAttribute("y", 0);
        this.foreignObject.setAttribute("width", this.properties.width);
        this.foreignObject.setAttribute("height", this.properties.height);
    }

    initializeShapeNameLayer() {
        this.shapeNameLayer = null;
        this.shapeNameText = null;
        if (!this.element)
            return;
        this.shapeNameLayer = this.board.createSvgElement("g");
        this.shapeNameLayer.setAttribute("pointer-events", "none");
        this.attachShapeNameLayer();
    }

    attachShapeNameLayer() {
        if (!this.shapeNameLayer)
            return;
        if (this.element?.tagName?.toLowerCase() == "g")
            this.element.appendChild(this.shapeNameLayer);
        else if (this.board?.svg)
            this.board.svg.appendChild(this.shapeNameLayer);
        this.drawShapeNameLabel();
    }

    detachShapeNameLayer() {
        if (this.shapeNameLayer?.parentNode)
            this.shapeNameLayer.parentNode.removeChild(this.shapeNameLayer);
    }

    getShapeNameColor() {
        return this.properties.nameColor ?? this.properties.foregroundColor ?? "#000000";
    }

    getBorderColor() {
        return this.properties.borderColor ?? this.properties.foregroundColor ?? "#000000";
    }

    getBorderRadius() {
        return 4;
    }

    applyBorderStroke(element, strokeWidth = null) {
        if (!element)
            return;
        element.setAttribute("stroke", this.getBorderColor());
        if (strokeWidth != null)
            element.setAttribute("stroke-width", `${strokeWidth}`);
        if (element.tagName === "rect")
            element.setAttribute("rx", this.getBorderRadius());
    }

    applyBorderStyle(element, borderWidth = 1) {
        if (!element)
            return;
        element.style.border = `${borderWidth}px solid ${this.getBorderColor()}`;
        element.style.boxSizing = "border-box";
        element.style.borderRadius = `${this.getBorderRadius()}px`;
    }

    isShapeNameVisible() {
        if (this.properties.showName !== true)
            return false;
        return typeof this.properties.name === "string" && this.properties.name.trim() !== "";
    }

    getShapeNameLabelAnchor() {
        const margin = 8;
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const nameLayerIsLocal = this.shapeNameLayer?.parentNode === this.element;
        const elementHasTranslate = nameLayerIsLocal && this.element.getAttribute("transform")?.includes("translate");
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y - radius - margin };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height)) {
            if (elementHasTranslate)
                return { x: width / 2, y: -margin };
            const left = Math.min(position.x, position.x + width);
            const right = Math.max(position.x, position.x + width);
            const top = Math.min(position.y, position.y + height);
            return { x: (left + right) / 2, y: top - margin };
        }
        return { x: position.x, y: position.y - margin };
    }

    drawShapeNameLabel() {
        if (!this.shapeNameLayer)
            return;
        if (!this.isShapeNameVisible()) {
            if (this.shapeNameText)
                this.shapeNameText.textContent = "";
            return;
        }
        const anchor = this.getShapeNameLabelAnchor();
        if (!anchor)
            return;
        if (!this.shapeNameText) {
            this.shapeNameText = this.board.createSvgElement("text");
            this.shapeNameText.setAttribute("class", "shape-name-label");
            this.shapeNameLayer.appendChild(this.shapeNameText);
        }
        if (this.shapeNameLayer.parentNode == this.element && this.shapeNameLayer.nextSibling != null)
            this.element.appendChild(this.shapeNameLayer);
        if (this.board?.svg && this.shapeNameLayer.parentNode == this.board.svg && this.board.svg.lastChild != this.shapeNameLayer)
            this.board.svg.appendChild(this.shapeNameLayer);
        this.shapeNameText.setAttribute("x", anchor.x);
        this.shapeNameText.setAttribute("y", anchor.y);
        this.shapeNameText.setAttribute("text-anchor", "middle");
        this.shapeNameText.setAttribute("fill", this.getShapeNameColor());
        this.shapeNameText.textContent = this.properties.name;
    }

    static escapeMathTermName(text) {
        return Utils.formatMathTermName(text);
    }

    createNameButtonTermMarkup(termText) {
        const normalizedTermText = String(termText ?? "").trim();
        if (normalizedTermText === "")
            return "";
        const mathFieldMarkup = Utils.buildReadOnlyMathFieldMarkup(normalizedTermText, "height:auto;width:auto;display:inline-block;pointer-events:none");
        return `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${mathFieldMarkup}</span></span>`;
    }

    addTerm(termProperty, property, title, isInverted = false, isEditable = true, colSpan = 1, scaleProperty = null) {
        const caseProperty = `${termProperty}Case`;
        const lockedProperty = `${termProperty}Locked`;
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[lockedProperty] == null)
            this.properties[lockedProperty] = false;
        this.termsMapping.push({
            termProperty: termProperty,
            termValue: 0,
            property: property,
            isInverted: isInverted,
            scaleProperty: scaleProperty,
            caseProperty: caseProperty
        });
        this.addTermToForm(termProperty, title, isEditable, colSpan);
    }

    isTermLocked(termProperty) {
        return this.properties[`${termProperty}Locked`] === true;
    }

    getCasesCount() {
        const rawCount = parseInt(this.board.calculator.properties.casesCount ?? 1, 10) || 1;
        return this.getClampedCaseNumber(rawCount);
    }

    getClampedCaseNumber(caseNumber) {
        const normalizedCaseNumber = parseInt(caseNumber, 10);
        if (!Number.isFinite(normalizedCaseNumber))
            return 1;
        if (normalizedCaseNumber < 1)
            return 1;
        if (normalizedCaseNumber > 9)
            return 9;
        return normalizedCaseNumber;
    }

    buildCaseItems(caseColors) {
        const count = this.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    createTermSelectorControl(instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true) {
        const descriptor = TermControl.createBaseShapeTermFormControl(this, instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle);
        this.termFormControls[term] = { termControl: descriptor.termControl, visibilityCheckbox: descriptor.visibilityCheckbox };
        return descriptor.control;
    }

    refreshTermFormLayouts(instance) {
        if (!instance)
            return;
        for (let index = 0; index < this.termDisplayEntries.length; index++) {
            const entry = this.termDisplayEntries[index];
            const controls = this.termFormControls[entry.term];
            const termControl = controls?.termControl ?? null;
            TermControl.syncBaseShapeTermControl(this, instance, entry.term, entry.caseProperty, termControl);
        }
    }

    addTermToForm(term, title, isEditable = true, colSpan = 1, options = {}) {
        if (this.form == null)
            return;
        var instance = this.form.dxForm("instance");
        var items = instance.option("items");
        const caseProperty = `${term}Case`;
        const lockedProperty = `${term}Locked`;
        const displayModeProperty = this.getTermDisplayModeProperty(term);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[lockedProperty] == null)
            this.properties[lockedProperty] = false;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === term))
            this.termDisplayEntries.push({ term: term, caseProperty: caseProperty, title: title });
        const showVisibilityToggle = options.showVisibilityToggle !== false;
        items.push(
            {
                colSpan: 2,
                name: `${term}Item`,
                label: { text: title },
                template: _ => this.createTermSelectorControl(instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle)
            }
        );
        instance.option("items", items);
        TermControl.syncBaseShapeTermControl(this, instance, term, caseProperty);
    }

    resolveTermNumeric(term, caseNumber = 1) {
        const calculator = this.board.calculator;
        if (calculator.isTerm(term))
            return calculator.getByName(term, caseNumber);
        return parseFloat(term);
    }

    initializeTermDisplayLayer() {
        this.termDisplay = new TermDisplay(this);
        this.termDisplay.initializeLayer();
        this.termDisplayLayer = this.termDisplay.layer;
    }

    drawTermDisplayLabels() {
        this.termDisplay.draw();
    }

    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    }

    normalizeTermValue(value) {
        if (value && typeof value === "object")
            return value.term ?? value.text ?? value.value;
        return value;
    }

    clearLayerChildren(layer) {
        if (!layer)
            return;
        while (layer.firstChild)
            layer.removeChild(layer.firstChild);
    }

    getTermCaseNumber(caseProperty) {
        const rawCaseNumber = this.properties[caseProperty] ?? 1;
        const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : parseInt(rawCaseNumber, 10);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return 1;
        return caseNumber;
    }

    formatModelValue(value) {
        const numericValue = Number(value);
        if (numericValue === Infinity)
            return "∞";
        if (numericValue === -Infinity)
            return "-∞";
        if (!Number.isFinite(numericValue))
            return "\u2014";
        const precision = this.getModelPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        return Utils.formatNumber(normalized, precision);
    }

    formatTermForDisplay(term) {
        if (term == null || term === "")
            return "";
        const termText = String(term);
        const numeric = Number(termText);
        if (numeric === Infinity)
            return "∞";
        if (numeric === -Infinity)
            return "-∞";
        if (!Number.isFinite(numeric)) {
            const calculator = this.board?.calculator;
            if (calculator?.isTerm(termText))
                return Utils.getDisplayedTerm(termText, calculator.system);
            return Utils.getDisplayedTerm(termText);
        }
        return this.formatModelValue(numeric);
    }

    getTermLabelAnchor() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x + radius, y: position.y + radius * 2 + 4 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height + 4 };
        return { x: position.x, y: position.y + 4 };
    }

    getTermEntryLabelPosition(entry, index) {
        return null;
    }

    getTermEntryLabelColor(entry, index) {
        return null;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BaseShape;
