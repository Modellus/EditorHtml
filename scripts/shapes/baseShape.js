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
        ImageShape: "fa-light fa-image",
        ExpressionShape: "fa-light fa-function",
        TextShape: "fa-light fa-quotes",
        RulerShape: "fa-light fa-ruler",
        ProtractorShape: "fa-light fa-angle",
        ReferentialShape: "fa-light fa-shapes",
        GaugeShape: "fa-light fa-gauge"
    };

    static buildShapeTreeItem(shape) {
        const children = (shape.children ?? []).map(child => BaseShape.buildShapeTreeItem(child));
        const characterImage = shape.character ? `resources/characters/${shape.character.folder}/${shape.character.image}` : null;
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
            { family: "KaTeX_Main", url: "libraries/css/fonts/KaTeX_Main-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Main", url: "libraries/css/fonts/KaTeX_Main-Italic.woff2", weight: "400", style: "italic" },
            { family: "KaTeX_Main", url: "libraries/css/fonts/KaTeX_Main-Bold.woff2", weight: "700", style: "normal" },
            { family: "KaTeX_Main", url: "libraries/css/fonts/KaTeX_Main-BoldItalic.woff2", weight: "700", style: "italic" },
            { family: "KaTeX_Math", url: "libraries/css/fonts/KaTeX_Math-Italic.woff2", weight: "400", style: "italic" },
            { family: "KaTeX_Math", url: "libraries/css/fonts/KaTeX_Math-BoldItalic.woff2", weight: "700", style: "italic" },
            { family: "KaTeX_Size1", url: "libraries/css/fonts/KaTeX_Size1-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size2", url: "libraries/css/fonts/KaTeX_Size2-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size3", url: "libraries/css/fonts/KaTeX_Size3-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Size4", url: "libraries/css/fonts/KaTeX_Size4-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_AMS", url: "libraries/css/fonts/KaTeX_AMS-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Caligraphic", url: "libraries/css/fonts/KaTeX_Caligraphic-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Fraktur", url: "libraries/css/fonts/KaTeX_Fraktur-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_SansSerif", url: "libraries/css/fonts/KaTeX_SansSerif-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Script", url: "libraries/css/fonts/KaTeX_Script-Regular.woff2", weight: "400", style: "normal" },
            { family: "KaTeX_Typewriter", url: "libraries/css/fonts/KaTeX_Typewriter-Regular.woff2", weight: "400", style: "normal" }
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
        const cssResponse = await fetch("libraries/css/mathlive-static.css");
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
                    this.board.selection.select(this);
                    handle.style.pointerEvents = "none";
                    const restoreHandle = () => {
                        handle.style.pointerEvents = "";
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
                const dragPoint = this.draggedHandle.classList.contains("move") ? this.snapDragPoint(point) : point;
                const transform = this.applyTransformSnapping(this.draggedHandle.getTransform(dragPoint));
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

    createToolbar() {
        return [
            this.createPermissionsToolbarItem(),
            { location: "center", template: () => $('<div class="toolbar-separator">|</div>') }
        ];
    }

    createPermissionsToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createPermissionsDropDownButton(container);
                return container;
            }
        };
    }

    createPermissionsDropDownButton(itemElement) {
        this._permissionsDropdownElement = $('<div class="mdl-permissions-selector">');
        this._permissionsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Permissions",
            template: (data, element) => this.renderPermissionsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildPermissionsMenuContent(contentElement)
            }
        });
        this._permissionsDropdownElement.appendTo(itemElement);
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

    buildPermissionsMenuContent(contentElement) {
        const $content = $(contentElement);
        $content.empty();
        $content[0].innerHTML = `<div class="mdl-permissions-menu">
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-visibility-host"></div><span class="mdl-permissions-menu-label">Visible</span></div>
            <div class="mdl-permissions-menu-row"><div class="mdl-permissions-lock-host"></div><span class="mdl-permissions-menu-label">Locked</span></div>
        </div>`;
        TermControl.createVisibilityCheckbox($content.find(".mdl-permissions-visibility-host"), this.properties.visibleToUsers, value => {
            this.setPropertyCommand("visibleToUsers", value);
            this.refreshPermissionsButtonIcon();
        });
        TermControl.createLockCheckbox($content.find(".mdl-permissions-lock-host"), this.properties.lockedForUsers, value => {
            this.setPropertyCommand("lockedForUsers", value);
            this.refreshPermissionsButtonIcon();
        });
    }

    createTermSelectorToolbarItem(termProperty, title, showVisibilityToggle = true) {
        const caseProperty = `${termProperty}Case`;
        const displayModeProperty = this.getTermDisplayModeProperty(termProperty);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
            this.termDisplayEntries.push({ term: termProperty, caseProperty: caseProperty, title: title });
        const mockFormInstance = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        return {
            location: "center",
            template: () => {
                const wrapper = $('<div style="width:160px"></div>');
                wrapper.append(this.createTermSelectorControl(mockFormInstance, termProperty, caseProperty, false, displayModeProperty, showVisibilityToggle));
                return wrapper;
            }
        };
    }

    createTermControl(termProperty, title, showVisibilityToggle = true) {
        const caseProperty = `${termProperty}Case`;
        const lockedProperty = `${termProperty}Locked`;
        const displayModeProperty = this.getTermDisplayModeProperty(termProperty);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[lockedProperty] == null)
            this.properties[lockedProperty] = false;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
            this.termDisplayEntries.push({ term: termProperty, caseProperty, title });
        const mockFormInstance = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        return this.createTermSelectorControl(mockFormInstance, termProperty, caseProperty, false, displayModeProperty, showVisibilityToggle);
    }

    enterEditMode() {
        return false;
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

    showContextToolbar() {
        this.refreshNameToolbarControl();
        this.refreshShapeColorToolbarControl();
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

    createColorPickerEditor(dataField, options = {}) {
        const onValueChanged = value => this.setPropertyCommand(dataField, value);
        return this.getColorControl().createEditor(this.properties[dataField], onValueChanged, options);
    }

    createNameFormControl() {
        const control = $("<div>").addClass("name-packed-control");
        const visibilityHost = $("<div>").addClass("name-packed-control__button");
        const colorHost = $("<div>").addClass("name-packed-control__color");
        const inputHost = $("<div>").addClass("name-packed-control__input");
        const isVisible = this.properties.showName === true;
        control.append(visibilityHost, colorHost, inputHost);
        TermControl.createVisibilityCheckbox(visibilityHost, isVisible, value => {
            this.setPropertyCommand("showName", value);
        });
        const colorPicker = this.createColorPickerEditor("nameColor");
        colorPicker.addClass("name-packed-control__picker");
        this._nameColorPicker = colorPicker;
        colorHost.append(colorPicker);
        inputHost.dxTextBox({
            value: this.properties.name,
            stylingMode: "filled",
            onInitialized: e => { this._nameTextBoxInstance = e.component; },
            onValueChanged: event => {
                if (event.event)
                    this.setPropertyCommand("name", event.value);
            }
        });
        return control;
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

    createAddShapeDropDownButton(itemElement) {
        this._addShapeElement = $('<div class="mdl-add-shape-selector">');
        this._addShapeElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Add shape",
            template: (data, element) => this.renderAddShapeButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: this.getAddShapeMenuItems(),
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${data.icon}"></i><span class="mdl-dropdown-list-label">${data.text}</span></div>`;
                        },
                        onItemClick: e => {
                            window.shell?.commands?.addShape(e.itemData.key, e.itemData.type, this);
                            this._addShapeElement.dxDropDownButton("instance").close();
                        }
                    });
                }
            }
        });
        this._addShapeElement.appendTo(itemElement);
    }

    createShapeColorDropDownButton(itemElement) {
        this._fgColorPicker = this.createColorPickerEditor("foregroundColor");
        this._borderColorPicker = this.createColorPickerEditor("borderColor");
        this._shapeColorDropdownElement = $('<div class="mdl-shape-color-selector">');
        this._shapeColorDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Name",
            buttonTemplate: (data, element) => this.renderShapeColorButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildShapeMenuContent(contentElement)
            }
        });
        this._shapeColorDropdownElement.appendTo(itemElement);
    }

    menuIconHtml(iconName, isSet) {
        const weight = isSet ? "fa-solid" : "fa-light";
        return `<i class="${weight} ${iconName} mdl-menu-icon"></i>`;
    }

    buildShapeMenuContent(contentElement) {
        const fgLabel = this.board.translations.get("Foreground Color") ?? "Foreground";
        const borderLabel = this.board.translations.get("Border Color") ?? "Border";
        const fgColor = this.properties.foregroundColor ?? "";
        const borderColor = this.properties.borderColor ?? "";
        const hasBorder = borderColor && borderColor !== "transparent";
        const shapeIconName = (BaseShape.shapeIcons[this.constructor.name] ?? "fa-light fa-shapes").split(" ")[1];
        const sections = [
            {
                text: "Colors",
                iconHtml: this.menuIconHtml(shapeIconName, !!fgColor),
                items: [
                    {
                        text: "Name",
                        stacked: true,
                        buildControl: $p => $p.append(this.createNameFormControl())
                    },
                    {
                        text: fgLabel,
                        iconHtml: this.menuIconHtml("fa-droplet", !!fgColor),
                        buildControl: $p => $p.append(this._fgColorPicker)
                    },
                    {
                        text: borderLabel,
                        iconHtml: this.menuIconHtml("fa-square", !!hasBorder),
                        buildControl: $p => $p.append(this._borderColorPicker)
                    }
                ]
            }
        ];
        this.populateShapeColorMenuSections(sections);
        const listItems = sections.flatMap(section => section.items);
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 300, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    }

    populateShapeColorMenuSections(sections) {
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
    }

    createRemoveToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createRemoveDropDownButton(container);
                return container;
            }
        };
    }

    createRemoveDropDownButton(itemElement) {
        this._removeDropdownElement = $('<div class="mdl-remove-selector">');
        const buttonId = `remove-btn-${this.id}`;
        this._removeDropdownElement.html(`<div id="${buttonId}"></div><div id="${buttonId}-menu"></div>`);
        $(`#${buttonId}`, this._removeDropdownElement).dxButton({
            template: "<div class='dx-icon'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></div>",
            stylingMode: "text",
            hint: "Remove",
            onClick: e => {
                this._removeMenuInstance.option("target", e.component.element());
                this._removeMenuInstance.show();
            }
        });
        $(`#${buttonId}-menu`, this._removeDropdownElement).dxContextMenu({
            dataSource: [
                { text: "Remove", icon: "fa-light fa-trash-can", action: () => this.remove() },
                { text: "Reset", icon: "fa-light fa-arrow-rotate-left", action: () => this.resetToDefaults() }
            ],
            itemTemplate: itemData => {
                return `<div style="display:flex;align-items:center;width:100%">
                            <span class="${itemData.icon}" style="width:15px;margin-right:10px;text-align:left;display:inline-block"></span>
                            <span style="text-align:left;flex-grow:1">${itemData.text}</span>
                        </div>`;
            },
            onItemClick: e => {
                e.itemData.action();
            },
            showEvent: null,
            position: { my: "top left", at: "bottom left" },
            cssClass: "mdl-remove-context-menu"
        });
        this._removeMenuInstance = $(`#${buttonId}-menu`, this._removeDropdownElement).dxContextMenu("instance");
        this._removeDropdownElement.appendTo(itemElement);
    }

    createActionsToolbarItem() {
        return {
            location: "center",
            template: () => {
                const container = $('<div></div>');
                this.createActionsDropDownButton(container);
                return container;
            }
        };
    }

    getCopySubMenuItems() {
        return [
            { text: "Copy as Image", icon: "fa-light fa-image", shortcut: "", action: () => this.copyAsImage() },
            { text: "Copy as SVG", icon: "fa-light fa-vector-square", shortcut: "", action: () => this.copyAsSvg() }
        ];
    }

    createActionsDropDownButton(itemElement) {
        const isMac = /mac/i.test(navigator.platform);
        const mod = isMac ? "⌘" : "Ctrl+";
        const copySubItems = this.getCopySubMenuItems();
        this._actionsDropdownElement = $('<div class="mdl-actions-selector">');
        const buttonId = `actions-btn-${this.id}`;
        this._actionsDropdownElement.html(`<div id="${buttonId}"></div><div id="${buttonId}-menu"></div>`);
        $(`#${buttonId}`, this._actionsDropdownElement).dxButton({
            icon: "fa-light fa-ellipsis-vertical",
            stylingMode: "text",
            hint: "Actions",
            onClick: e => {
                this._actionsMenuInstance.option("target", e.component.element());
                this._actionsMenuInstance.show();
            }
        });
        $(`#${buttonId}-menu`, this._actionsDropdownElement).dxContextMenu({
            dataSource: [
                { text: "Bring to Front", icon: "fa-light fa-bring-front", shortcut: "", action: () => this.board.bringToFront(this) },
                { text: "Bring Forward", icon: "fa-light fa-bring-forward", shortcut: "", action: () => this.board.bringForward(this) },
                { text: "Send Backward", icon: "fa-light fa-send-backward", shortcut: "", action: () => this.board.sendBackward(this) },
                { text: "Send to Back", icon: "fa-light fa-send-back", shortcut: "", action: () => this.board.sendToBack(this) },
                { text: "Copy", icon: "fa-light fa-copy", shortcut: `${mod}C`, beginGroup: true, action: () => this.copyToClipboard(), items: copySubItems },
                { text: "Paste", icon: "fa-light fa-paste", shortcut: `${mod}V`, action: () => BaseShape.pasteFromClipboard(this.board, this.parent) },
                { text: "Duplicate", icon: "fa-light fa-clone", shortcut: `${mod}D`, action: () => this.duplicate() }
            ],
            itemTemplate: itemData => {
                const hasChildren = itemData.items?.length > 0;
                return `<div style="display:flex;justify-content:space-between;align-items:center;width:100%">
                            <span class="${itemData.icon}" style="width:15px;margin-right:10px;text-align:left;display:inline-block"></span>
                            <span style="text-align:left;padding-right:20px;flex-grow:1">${itemData.text}</span>
                            <span style="color:#999">${itemData.shortcut}</span>
                            <span style="width:12px;text-align:right">${hasChildren ? "<i class='fa-light fa-chevron-right'></i>" : ""}</span>
                        </div>`;
            },
            onItemClick: e => {
                if (e.itemData?.action)
                    e.itemData.action();
            },
            showEvent: null,
            position: { my: "top left", at: "bottom left" },
            cssClass: "mdl-actions-context-menu"
        });
        this._actionsMenuInstance = $(`#${buttonId}-menu`, this._actionsDropdownElement).dxContextMenu("instance");
        this._actionsDropdownElement.appendTo(itemElement);
    }

    createTermsDropDownButton(itemElement) {
        this._termsDropdownElement = $('<div class="mdl-terms-selector">');
        this._termsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Terms",
            buttonTemplate: (data, element) => this.renderTermsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildTermsMenuContent(contentElement)
            }
        });
        this._termsDropdownElement.appendTo(itemElement);
    }

    buildTermsMenuContent(contentElement) {
        const listItems = [];
        this.populateTermsMenuSections(listItems);
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 300, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else if (data.parentSelector) {
                    data.buildControl($(el));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    }

    populateTermsMenuSections(listItems) {
    }

    renderTermsButtonTemplate(element) {
    }

    refreshTermsToolbarControl() {
        if (!this._termsDropdownElement)
            return;
        const buttonContentElement = this._termsDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderTermsButtonTemplate(buttonContentElement);
    }

    createTermPairFormControls(formAdapter) {
        const xDisplayMode = this.getTermDisplayModeProperty("xTerm");
        const yDisplayMode = this.getTermDisplayModeProperty("yTerm");
        const xDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "xTerm", "xTermCase", true, xDisplayMode, true);
        this.termFormControls["xTerm"] = { termControl: xDescriptor.termControl };
        const yDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "yTerm", "yTermCase", true, yDisplayMode, true);
        this.termFormControls["yTerm"] = { termControl: yDescriptor.termControl };
        return { xDescriptor, yDescriptor };
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
        data.children = this.children.map(child => {
            const childData = child.getClipboardData();
            childData.parent = undefined;
            return childData;
        });
        return data;
    }

    toSvgString() {
        const bbox = this.element.getBBox();
        const padding = 4;
        const x = bbox.x - padding;
        const y = bbox.y - padding;
        const width = bbox.width + padding * 2;
        const height = bbox.height + padding * 2;
        let content = "";
        for (const element of this.collectSvgElements()) {
            const clone = element.cloneNode(true);
            clone.removeAttribute("id");
            clone.removeAttribute("clip-path");
            content += clone.outerHTML;
        }
        const styleBlock = BaseShape.embeddedFontStyles ? `<defs><style>${BaseShape.embeddedFontStyles}</style></defs>` : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">${styleBlock}${content}</svg>`;
    }

    collectSvgElements() {
        return [this.element];
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
    }

    static pasteChildren(board, parentShape, children) {
        if (!children)
            return;
        for (const childData of children) {
            const child = board.createShape(childData.type, parentShape);
            child.setProperties(childData.properties);
            board.addShape(child);
            child.draw();
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

    initializeTermDisplayLayer() {
        this.termDisplayLayer = null;
        this.termDisplayGuidesLayer = null;
        this.termDisplayLabelsLayer = null;
        if (!this.element)
            return;
        if (this.element.tagName?.toLowerCase() != "g")
            return;
        this.termDisplayLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.setAttribute("pointer-events", "none");
        this.termDisplayGuidesLayer = this.board.createSvgElement("g");
        this.termDisplayLabelsLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.appendChild(this.termDisplayGuidesLayer);
        this.termDisplayLayer.appendChild(this.termDisplayLabelsLayer);
        if (this.element.firstChild)
            this.element.insertBefore(this.termDisplayLayer, this.element.firstChild);
        else
            this.element.appendChild(this.termDisplayLayer);
    }

    initializeShapeNameLayer() {
        this.shapeNameLayer = null;
        this.shapeNameText = null;
        if (!this.element)
            return;
        this.shapeNameLayer = this.board.createSvgElement("g");
        this.shapeNameLayer.setAttribute("pointer-events", "none");
        if (this.element.tagName?.toLowerCase() == "g")
            this.element.appendChild(this.shapeNameLayer);
        else if (this.board?.svg)
            this.board.svg.appendChild(this.shapeNameLayer);
    }

    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    }

    getShapeNameColor() {
        return this.properties.nameColor ?? this.properties.foregroundColor ?? "#000000";
    }

    getBorderColor() {
        return this.properties.borderColor ?? this.properties.foregroundColor ?? "#000000";
    }

    applyBorderStroke(element, strokeWidth = null) {
        if (!element)
            return;
        element.setAttribute("stroke", this.getBorderColor());
        if (strokeWidth != null)
            element.setAttribute("stroke-width", `${strokeWidth}`);
    }

    applyBorderStyle(element, borderWidth = 1) {
        if (!element)
            return;
        element.style.border = `${borderWidth}px solid ${this.getBorderColor()}`;
        element.style.boxSizing = "border-box";
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

    normalizeTermValue(value) {
        if (value && typeof value === "object")
            return value.term ?? value.text ?? value.value;
        return value;
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
        if (!Number.isFinite(numericValue))
            return "-";
        const precision = this.getModelPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        if (precision > 0)
            return normalized.toFixed(precision);
        return normalized.toString();
    }

    formatTermForDisplay(term) {
        if (term == null || term === "")
            return "";
        const termText = String(term);
        const numeric = Number(termText);
        if (!Number.isFinite(numeric))
            return Utils.convertGreekLetters(termText);
        return this.formatModelValue(numeric);
    }

    buildTermDisplayLabel(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return null;
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return null;
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        const isTerm = calculator.isTerm(termName);
        const value = isTerm ? calculator.getByName(termName, caseNumber) : Number(termName);
        const valueText = Number.isFinite(value) ? this.formatModelValue(value) : termName;
        if (!isTerm)
            return {
                termText: "",
                valueText: valueText,
                text: valueText
            };
        return {
            termText: termName,
            valueText: valueText,
            text: `${termName} = ${valueText}`
        };
    }

    isTermCaseIndicatorVisible(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return false;
        const termValue = this.normalizeTermValue(this.properties[entry.term]);
        return TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getBaseShapeCaseVisibilityConfig(this));
    }

    getTermCaseIndicatorNumber(entry) {
        if (!this.isTermCaseIndicatorVisible(entry))
            return null;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        return this.getClampedCaseNumber(caseNumber);
    }

    createTermLabelDefinition(entry, labelData, x, y, anchor) {
        return {
            text: labelData?.text ?? "",
            termText: labelData?.termText ?? "",
            valueText: labelData?.valueText ?? "",
            x: x,
            y: y,
            anchor: anchor,
            caseNumber: this.getTermCaseIndicatorNumber(entry)
        };
    }

    ensureTermLabelElements(index) {
        let labelGroup = this.termDisplayLabelsLayer.children[index];
        if (!labelGroup || labelGroup.tagName?.toLowerCase() != "g") {
            if (labelGroup)
                this.termDisplayLabelsLayer.removeChild(labelGroup);
            labelGroup = this.board.createSvgElement("g");
            const sibling = this.termDisplayLabelsLayer.children[index] ?? null;
            this.termDisplayLabelsLayer.insertBefore(labelGroup, sibling);
        }
        let caseIconHost = labelGroup.children[0];
        if (!caseIconHost || caseIconHost.tagName?.toLowerCase() != "foreignobject") {
            if (caseIconHost)
                labelGroup.removeChild(caseIconHost);
            caseIconHost = this.board.createSvgElement("foreignObject");
            caseIconHost.setAttribute("class", "shape-term-case-icon-host");
            if (labelGroup.firstChild)
                labelGroup.insertBefore(caseIconHost, labelGroup.firstChild);
            else
                labelGroup.appendChild(caseIconHost);
        }
        if (!caseIconHost.firstChild || caseIconHost.firstChild.tagName?.toLowerCase() != "div") {
            const iconContainer = this.board.createElement("div");
            iconContainer.setAttribute("class", "shape-term-case-icon-container");
            caseIconHost.replaceChildren(iconContainer);
        }
        const iconContainer = caseIconHost.firstChild;
        if (!iconContainer.firstChild || iconContainer.firstChild.tagName?.toLowerCase() != "i") {
            const icon = this.board.createElement("i");
            icon.setAttribute("class", "shape-term-case-icon");
            iconContainer.replaceChildren(icon);
        }
        let labelText = labelGroup.children[1];
        if (!labelText || labelText.tagName?.toLowerCase() != "text") {
            if (labelText)
                labelGroup.removeChild(labelText);
            labelText = this.board.createSvgElement("text");
            labelText.setAttribute("class", "shape-term-label");
            labelGroup.appendChild(labelText);
        }
        return { group: labelGroup, caseIconHost: caseIconHost, caseIconElement: caseIconHost.firstChild.firstChild, labelText: labelText };
    }

    getTermCaseIconLayout(label, labelText) {
        const iconSize = 9;
        const gap = 3;
        const y = label.y + 1;
        if (!label.caseNumber)
            return { visible: false, iconSize: iconSize, iconX: 0, iconY: y, textX: label.x };
        if (label.anchor == "start")
            return { visible: true, iconSize: iconSize, iconX: label.x, iconY: y, textX: label.x + iconSize + gap };
        if (label.anchor == "end")
            return { visible: true, iconSize: iconSize, iconX: label.x - iconSize, iconY: y, textX: label.x - iconSize - gap };
        let labelWidth = 0;
        if (labelText?.getBBox)
            try {
                labelWidth = labelText.getBBox().width;
            } catch (_) {}
        const textX = label.x + (iconSize + gap) / 2;
        const iconX = textX - labelWidth / 2 - gap - iconSize;
        return { visible: true, iconSize: iconSize, iconX: iconX, iconY: y, textX: textX };
    }

    applyTermCaseIcon(caseIconHost, caseIconElement, caseNumber, layout) {
        if (!caseIconHost || !caseIconElement)
            return;
        if (!layout.visible) {
            caseIconHost.setAttribute("display", "none");
            return;
        }
        caseIconHost.removeAttribute("display");
        caseIconHost.setAttribute("x", `${layout.iconX}`);
        caseIconHost.setAttribute("y", `${layout.iconY}`);
        caseIconHost.setAttribute("width", `${layout.iconSize}`);
        caseIconHost.setAttribute("height", `${layout.iconSize + 1}`);
        const iconClass = `${TermControl.getCaseNumberIconClass(caseNumber)} shape-term-case-icon`;
        if (caseIconElement.getAttribute("class") != iconClass)
            caseIconElement.setAttribute("class", iconClass);
        const iconColor = TermControl.getCaseIconColor(caseNumber);
        if (caseIconElement.style.color != iconColor)
            caseIconElement.style.color = iconColor;
    }

    setTermLabelText(labelText, label) {
        while (labelText.firstChild)
            labelText.removeChild(labelText.firstChild);
        if (!label) {
            labelText.textContent = "";
            return;
        }
        const termText = label.termText ?? "";
        const valueText = label.valueText ?? "";
        if (termText === "" && valueText === "") {
            labelText.textContent = label.text ?? "";
            return;
        }
        if (termText === "") {
            const valueSpan = this.board.createSvgElement("tspan");
            valueSpan.setAttribute("font-family", "Katex_Main");
            valueSpan.textContent = valueText;
            labelText.appendChild(valueSpan);
            return;
        }
        const termSpan = this.board.createSvgElement("tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.textContent = Utils.convertGreekLetters(termText);
        labelText.appendChild(termSpan);
        const separatorSpan = this.board.createSvgElement("tspan");
        separatorSpan.setAttribute("font-family", "Katex_Main");
        separatorSpan.textContent = " = ";
        labelText.appendChild(separatorSpan);
        const valueSpan = this.board.createSvgElement("tspan");
        valueSpan.setAttribute("font-family", "Katex_Main");
        valueSpan.textContent = valueText;
        labelText.appendChild(valueSpan);
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

    clearLayerChildren(layer) {
        if (!layer)
            return;
        while (layer.firstChild)
            layer.removeChild(layer.firstChild);
    }

    getShapeCenterPosition() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y };
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height / 2 };
        return { x: position.x, y: position.y };
    }

    getReferentialAxesPosition() {
        const referential = this.getReferentialParent();
        if (!referential)
            return null;
        const referentialPosition = referential.getBoardPosition?.();
        if (!referentialPosition)
            return null;
        const axisX = referentialPosition.x + Number(referential.properties.originX ?? 0);
        const axisY = referentialPosition.y + Number(referential.properties.originY ?? 0);
        return { x: axisX, y: axisY };
    }

    getTermAxis(termProperty) {
        const mapping = this.termsMapping.find(termMapping => termMapping.termProperty == termProperty);
        if (!mapping)
            return null;
        if (mapping.scaleProperty == "x" || mapping.scaleProperty == "y")
            return mapping.scaleProperty;
        if (mapping.property == "x" || mapping.property == "y")
            return mapping.property;
        return null;
    }

    getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex) {
        if (axis == "x") {
            if (shapeCenterPosition.y <= axesPosition.y)
                return { x: shapeCenterPosition.x, y: axesPosition.y + 12 + axisLabelIndex * 12, anchor: "middle" };
            return { x: shapeCenterPosition.x, y: axesPosition.y - 12 - axisLabelIndex * 12, anchor: "middle" };
        }
        if (shapeCenterPosition.x <= axesPosition.x)
            return { x: axesPosition.x + 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "start" };
        return { x: axesPosition.x - 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "end" };
    }

    createTermGuideLine(axis, shapeCenterPosition, axesPosition, color) {
        if (!this.termDisplayGuidesLayer)
            return;
        const line = this.board.createSvgElement("line");
        line.setAttribute("class", "shape-term-guide-line");
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", 1);
        line.setAttribute("stroke-dasharray", "3 2");
        if (axis == "x") {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", shapeCenterPosition.x);
            line.setAttribute("y2", axesPosition.y);
        } else {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", axesPosition.x);
            line.setAttribute("y2", shapeCenterPosition.y);
        }
        this.termDisplayGuidesLayer.appendChild(line);
    }

    drawTermDisplayLabels() {
        if (!this.termDisplayLayer || !this.termDisplayLabelsLayer || !this.termDisplayGuidesLayer)
            return;
        const color = this.getShapeNameColor();
        const labels = [];
        const fallbackAnchor = this.getTermLabelAnchor();
        const axesPosition = this.getReferentialAxesPosition();
        const shapeCenterPosition = this.getShapeCenterPosition();
        let fallbackLabelIndex = 0;
        let xAxisLabelIndex = 0;
        let yAxisLabelIndex = 0;
        let hasXGuide = false;
        let hasYGuide = false;
        this.clearLayerChildren(this.termDisplayGuidesLayer);
        for (let i = 0; i < this.termDisplayEntries.length; i++) {
            const entry = this.termDisplayEntries[i];
            const labelData = this.buildTermDisplayLabel(entry);
            if (!labelData)
                continue;
            if (axesPosition && shapeCenterPosition) {
                const axis = this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const axisLabelIndex = axis == "x" ? xAxisLabelIndex : yAxisLabelIndex;
                    const labelPosition = this.getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex);
                    labels.push(this.createTermLabelDefinition(entry, labelData, labelPosition.x, labelPosition.y, labelPosition.anchor));
                    if (axis == "x") {
                        xAxisLabelIndex++;
                        if (!hasXGuide) {
                            this.createTermGuideLine("x", shapeCenterPosition, axesPosition, color);
                            hasXGuide = true;
                        }
                    } else {
                        yAxisLabelIndex++;
                        if (!hasYGuide) {
                            this.createTermGuideLine("y", shapeCenterPosition, axesPosition, color);
                            hasYGuide = true;
                        }
                    }
                    continue;
                }
            }
            if (!fallbackAnchor)
                continue;
            labels.push(this.createTermLabelDefinition(entry, labelData, fallbackAnchor.x, fallbackAnchor.y + fallbackLabelIndex * 12, "middle"));
            fallbackLabelIndex++;
        }
        while (this.termDisplayLabelsLayer.children.length > labels.length)
            this.termDisplayLabelsLayer.removeChild(this.termDisplayLabelsLayer.lastChild);
        if (labels.length == 0)
            return;
        for (let i = 0; i < labels.length; i++) {
            const labelElements = this.ensureTermLabelElements(i);
            const label = labels[i];
            const labelText = labelElements.labelText;
            labelText.setAttribute("x", label.x);
            labelText.setAttribute("y", label.y);
            labelText.setAttribute("text-anchor", label.anchor);
            labelText.setAttribute("fill", color);
            this.setTermLabelText(labelText, label);
            const iconLayout = this.getTermCaseIconLayout(label, labelText);
            labelText.setAttribute("x", iconLayout.textX);
            this.applyTermCaseIcon(labelElements.caseIconHost, labelElements.caseIconElement, label.caseNumber, iconLayout);
        }
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
        if (this.properties[`${termProperty}Locked`] !== true)
            return false;
        if (this.board.calculator.getIteration() > 1)
            return true;
        return !this.board.isModelCreator();
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

    isTermDisplayVisible(mode) {
        if (mode === false || mode === "none")
            return false;
        return true;
    }

    createTermSelectorControl(instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true) {
        const descriptor = TermControl.createBaseShapeTermFormControl(this, instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle);
        this.termFormControls[term] = { termControl: descriptor.termControl };
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
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BaseShape;
