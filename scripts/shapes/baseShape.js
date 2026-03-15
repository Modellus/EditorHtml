class BaseShape {
    
    static setup() {
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
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
        this.properties.rotation = 0;
        this.properties.showName = false;
        this.properties.nameColor = null;
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
        this.initializeContextToolbar();
    }

    getForm() {
        var form = this.createForm();
        if (form == null)
            return null;
        var instance = form.dxForm("instance");
        instance.formData = null;
        instance.updateData(this.properties);
        this.refreshTermFormLayouts(instance);
        const observer = new ResizeObserver(e => instance.option("colCount", e[0].contentRect.width > 300 ? 2 : 1));
        observer.observe(form[0]);
        return form;
    };

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
        const handleSize = 12;
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
                className: "handle top-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x - handleSize / 2, y: position.y - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                className: "handle top-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x + this.properties.width - handleSize / 2, y: position.y - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.x,
                    y: this.properties.height - e.dy > 10 ? this.properties.y + e.dy : this.properties.y,
                    width: this.properties.width + e.dx > 10 ? this.properties.width + e.dx : this.properties.width,
                    height: this.properties.height - e.dy > 10 ? this.properties.height - e.dy : this.properties.height
                })
            },
            {
                className: "handle bottom-left",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x - handleSize / 2, y: position.y + this.properties.height - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.properties.width - e.dx > 10 ? this.properties.x + e.dx : this.properties.x,
                    y: this.properties.y,
                    width: this.properties.width - e.dx > 10 ? this.properties.width - e.dx : this.properties.width,
                    height: this.properties.height + e.dy > 10 ? this.properties.height + e.dy : this.properties.height
                })
            },
            {
                className: "handle bottom-right",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x + this.properties.width - handleSize / 2, y: position.y + this.properties.height - handleSize / 2, width: handleSize, height: handleSize };
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
        handles.forEach(({ className, getAttributes, getTransform }) => {
            const handle = this.board.createSvgElement("rect");
            handle.setAttribute("class", className);
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
        this.handleElements.forEach(handle => handle.setAttribute("visibility", "visible"));
    }

    hideHandles() {
        if (!this.handleElements)
            return;
        this.handleElements.forEach(handle => handle.setAttribute("visibility", "hidden"));
    }

    removeHandles() {
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

    getElementUnderHandle(handle, event) {
        const saved = handle.style.pointerEvents;
        handle.style.pointerEvents = "none";
        const element = document.elementFromPoint(event.clientX, event.clientY);
        handle.style.pointerEvents = saved;
        return element;
    }

    onHandlePointerDown = (event, handle) => {
        if (handle.classList.contains("move")) {
            const underlying = this.getElementUnderHandle(handle, event);
            if (underlying?.classList?.contains("chart-tick-handle")) {
                handle.style.pointerEvents = "none";
                const restoreHandle = () => {
                    handle.style.pointerEvents = "";
                    window.removeEventListener("pointerup", restoreHandle);
                    window.removeEventListener("pointercancel", restoreHandle);
                };
                window.addEventListener("pointerup", restoreHandle);
                window.addEventListener("pointercancel", restoreHandle);
                underlying.dispatchEvent(new PointerEvent("pointerdown", event));
                return;
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

    onHandlePointerMove = (event, handle) => {
        if (this.draggedHandle)
            return;
        if (!handle.classList.contains("move"))
            return;
        const underlying = this.getElementUnderHandle(handle, event);
        if (underlying?.classList?.contains("chart-tick-handle"))
            handle.style.cursor = underlying.classList.contains("chart-tick-handle-x") ? "ew-resize" : "ns-resize";
        else
            handle.style.cursor = "";
    }

    onHandleDrag = event => {
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
                const transform = this.applyTransformSnapping(this.draggedHandle.getTransform(point));
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
        return [];
    }

    enterEditMode() {
        return false;
    }

    initializeContextToolbar() {
        const toolbarItems = this.createToolbar();
        if (!toolbarItems || !toolbarItems.length || !window.DevExpress?.ui?.dxToolbar)
            return;
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        $(toolbarHost).dxToolbar({ items: toolbarItems, width: "auto" });
        this.contextToolbar = toolbarHost;
        this.contextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    showContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionContextToolbar()));
        const referential = this.getReferentialParent();
        if (referential && referential !== this)
            referential.showContextToolbar();
    }

    hideContextToolbar() {
        if (this.contextToolbar)
            this.contextToolbar.classList.remove("visible");
        const referential = this.getReferentialParent();
        if (referential && referential !== this)
            referential.hideContextToolbar();
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
            this.colorControl = new ColorControl();
        return this.colorControl;
    }

    createColorPickerEditor(dataField, options = {}) {
        const onValueChanged = value => {
            const formInstance = this.getShapeFormInstance();
            if (formInstance)
                formInstance.updateData(dataField, value);
            else
                this.setProperty(dataField, value);
        };
        return this.getColorControl().createEditor(this.properties[dataField], onValueChanged, options);
    }

    createColorPickerFormItem(dataField, label, colSpan = 2, options = {}) {
        return {
            colSpan: colSpan,
            dataField: dataField,
            label: { text: label },
            template: _ => this.createColorPickerEditor(dataField, options)
        };
    }

    getShapeFormInstance() {
        const formElement = $("#shape-form");
        if (formElement.length == 0)
            return null;
        return formElement.dxForm("instance");
    }

    createNameFormControl() {
        const control = $("<div>").addClass("name-packed-control");
        const visibilityHost = $("<div>").addClass("name-packed-control__button");
        const colorHost = $("<div>").addClass("name-packed-control__color");
        const inputHost = $("<div>").addClass("name-packed-control__input");
        const isVisible = this.properties.showName === true;
        control.append(visibilityHost, colorHost, inputHost);
        TermControl.createVisibilityCheckbox(visibilityHost, isVisible, value => {
            const formInstance = this.getShapeFormInstance();
            if (formInstance)
                formInstance.updateData("showName", value);
            else
                this.setProperty("showName", value);
        });
        const colorPicker = this.createColorPickerEditor("nameColor");
        colorPicker.addClass("name-packed-control__picker");
        colorHost.append(colorPicker);
        inputHost.dxTextBox({
            value: this.properties.name,
            stylingMode: "filled",
            onValueChanged: event => {
                const formInstance = this.getShapeFormInstance();
                if (formInstance)
                    formInstance.updateData("name", event.value);
                else
                    this.setProperty("name", event.value);
            }
        });
        return control;
    }

    createForm() {
        this.form = $("<div id='shape-form'></div>").dxForm({
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
            colCount: "1",
            minColWidth: 300,
            items: [
                {
                    itemType: "group",
                    colCount: 2,
                    items: [
                        {
                            colSpan: 2,
                            dataField: "name",
                            label: { text: this.board.translations.get("Name") },
                            template: _ => this.createNameFormControl()
                        },
                        {
                            colSpan: 1,
                            label: { text: "Layers" },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                selectionMode: "none",
                                items: [
                                    { icon: "fa-light fa-send-back", action: () => this.board.sendToBack(this) },
                                    { icon: "fa-light fa-send-backward", action: () => this.board.sendBackward(this) },
                                    { icon: "fa-light fa-bring-forward", action: () => this.board.bringForward(this) },
                                    { icon: "fa-light fa-bring-front", action: () => this.board.bringToFront(this) }                            
                                ],
                                stylingMode: "text",
                                onItemClick: e => e.itemData.action()
                            }
                        },
                        {
                            colSpan: 1,
                            label: { text: "Actions" },
                            editorType: "dxButton",
                            editorOptions: {
                                template: "<div class='dx-icon'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></div>",
                                onClick: _ => this.remove(),
                                stylingMode: "text"
                            }
                        }
                    ]
                },
                {
                    itemType: "group",
                    colCount: 3,
                    items: [
                        {
                            colSpan: 1,
                            dataField: "foregroundColor",
                            label: { text: "Color" },
                            template: _ => this.createColorPickerEditor("foregroundColor")
                        },
                        {
                            colSpan: 1,
                            dataField: "borderColor",
                            label: { text: "Border" },
                            template: _ => this.createColorPickerEditor("borderColor")
                        },
                        {
                            colSpan: 1,
                            dataField: "backgroundColor",
                            label: { text: "Background" },
                            template: _ => this.createColorPickerEditor("backgroundColor")
                        }
                    ]
                }
            ]
        });
        return this.form;
    }

    delta(property, delta) {
        var termMapping = this.termsMapping.find(t => t.property === property);
        let updatedValue = this.properties[property];
        let value;
        if (termMapping != null) {
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
            } else
                this.properties[termMapping.termProperty] = Utils.roundToPrecision(
                    parseFloat(this.properties[termMapping.termProperty]) + delta, calculator.getPrecision());
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
        let x = this.properties.x + parentPosition.x + (parent?.properties?.originX ?? 0);
        let y = this.properties.y + parentPosition.y + (parent?.properties?.originY ?? 0);
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
        this.board.removeShape(this);
    }

    dragStart() {
        this.dispatchEvent("shapeDragStart", {});
        const calculator = this.board?.calculator;
        if (!calculator)
            return;
        const casesCount = Math.max(1, parseInt(calculator.properties.casesCount ?? 1, 10) || 1);
        const terms = typeof calculator.getTermsNames === "function" ? calculator.getTermsNames() : [];
        const iteration = typeof calculator.getIteration === "function" ? calculator.getIteration() : undefined;
        terms.forEach(term => {
            const values = [];
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
                values.push({ case: caseNumber, value: calculator.getByName(term, caseNumber) });
        });
    }

    dragEnd() {
        this.dispatchEvent("shapeDragEnd", {});
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
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y - radius - 2 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y - height / 2 - 2 };
        if (Number.isFinite(width) && Number.isFinite(height)) {
            const left = Math.min(position.x, position.x + width);
            const right = Math.max(position.x, position.x + width);
            const top = Math.min(position.y, position.y + height);
            return { x: (left + right) / 2, y: top - 2 };
        }
        return { x: position.x, y: position.y - 2 };
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
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
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
        const displayModeProperty = this.getTermDisplayModeProperty(term);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
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
