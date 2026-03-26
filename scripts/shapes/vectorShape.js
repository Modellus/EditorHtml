class VectorShape extends ChildShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const tipRadius = 5;
        return [
            {
                tag: "line",
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x1: position.x, y1: position.y, x2: position.x + this.properties.width, y2: position.y + this.properties.height };
                },
                getTransform: e => ({
                    x: this.delta("x", e.dx),
                    y: this.delta("y", e.dy)
                })
            },
            {
                tag: "circle",
                className: "handle tip",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return {
                        cx: position.x + this.properties.width,
                        cy: position.y + this.properties.height,
                        r: tipRadius
                    };
                },
                getTransform: e => ({
                    width: this.delta("width", e.dx),
                    height: this.delta("height", e.dy)
                })
            }
        ];
    }

    hideSelectionOutline = true;

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

    enterEditMode() {
        return false;
    }

    createToolbar() {
        const items = super.createToolbar();
        const formAdapter = { updateData: (field, value) => this.setProperty(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createParentDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                widget: "dxDropDownButton",
                options: {
                    items: [
                        { key: "arrow", icon: "fa-light fa-arrow-right", text: "" },
                        { key: "closed", icon: "fa-light fa-right-long", text: "" },
                        { key: "none", icon: "fa-light fa-dash", text: "" }
                    ],
                    keyExpr: "key",
                    displayExpr: "text",
                    useSelectMode: true,
                    showArrowIcon: false,
                    stylingMode: "text",
                    selectedItemKey: this.properties.tipType,
                    onInitialized: e => { this._tipTypeControl = e.component; },
                    onSelectionChanged: e => this.setProperty("tipType", e.item.key),
                    dropDownOptions: { width: 52 },
                    buttonTemplate: (data, element) => {
                        const key = data?.selectedItem?.key ?? this.properties.tipType;
                        const iconMap = { arrow: "fa-light fa-arrow-right", closed: "fa-light fa-right-long", none: "fa-light fa-dash" };
                        element[0].innerHTML = `<i class="dx-icon ${iconMap[key] ?? iconMap.arrow}"></i>`;
                    }
                }
            },
            {
                location: "center",
                widget: "dxNumberBox",
                options: {
                    value: this.properties.lineWidth,
                    min: 1,
                    max: 50,
                    step: 1,
                    showSpinButtons: true,
                    width: 50,
                    hint: "Line width",
                    stylingMode: "filled",
                    onInitialized: e => { this._lineWidthControl = e.component; },
                    onValueChanged: e => this.setProperty("lineWidth", e.value)
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createMotionDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) }
        );
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.properties.xTerm ?? "";
        const yTerm = this.properties.yTerm ?? "";
        const xPart = xTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` : "";
        const separator = (xTerm && yTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
        const yPart = yTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>` : "";
        if (!xPart && !yPart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${xPart}${separator}${yPart}`;
    }

    positionContextToolbar() {
        const referential = this.getReferentialParent();
        if (referential && referential !== this) {
            if (!this.contextToolbar)
                return;
            const anchor = referential.getScreenAnchorPoint();
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
            return;
        }
        super.positionContextToolbar();
    }

    showContextToolbar() {
        super.showContextToolbar();
        this.refreshNameToolbarControl();
        this.refreshParentToolbarControl();
        if (this._tipTypeControl) {
            this._tipTypeControl.option("selectedItemKey", this.properties.tipType);
            this._tipTypeControl.repaint();
        }
        if (this._lineWidthControl)
            this._lineWidthControl.option("value", this.properties.lineWidth);
        this.refreshShapeColorToolbarControl();
        this.refreshMotionToolbarControl();
        this.refreshTermsToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Vector Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.width = 30;
        this.properties.height = -30;
        this.properties.xTerm = "30";
        this.properties.yTerm = "30";
        this.properties.xTermCase = 1;
        this.properties.yTermCase = 1;
        this.properties.xTermDisplayMode = "none";
        this.properties.yTermDisplayMode = "none";
        this.properties.foregroundColor = "#000000";
        this.properties.borderColor = "transparent";
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 1;
        this.properties.tipType = "arrow";
        this.termsMapping.push({ termProperty: "xTerm", termValue: 0, property: "width", isInverted: false, scaleProperty: "x", caseProperty: "xTermCase" });
        this.termsMapping.push({ termProperty: "yTerm", termValue: 0, property: "height", isInverted: true, scaleProperty: "y", caseProperty: "yTermCase" });
        this.termDisplayEntries.push({ term: "xTerm", caseProperty: "xTermCase", title: "Horizontal" });
        this.termDisplayEntries.push({ term: "yTerm", caseProperty: "yTermCase", title: "Vertical" });
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.defs = this.board.createSvgElement("defs");
        element.appendChild(this.defs);
        this.borderLine = this.board.createSvgElement("line");
        element.appendChild(this.borderLine);
        this.line = this.board.createSvgElement("line");
        element.appendChild(this.line);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        element.appendChild(this.trajectory.element);
        return element;
    }    

    update() {
        super.update();
    }

    getMarkerId() {
        return `vector-marker-${this.id}`;
    }

    buildMarker() {
        const tipType = this.properties.tipType;
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.foregroundColor;
        const borderColor = this.getBorderColor();
        const markerId = this.getMarkerId();
        const borderMarkerId = markerId + "-border";
        if (tipType === "none")
            return "";
        const size = Math.max(8, lineWidth * 3);
        const spread = tipType === "arrow" ? size * 0.7 : size * 0.5;
        const half = spread;
        const markerWidth = size + lineWidth;
        const markerHeight = half * 2 + lineWidth;
        const refX = size + lineWidth / 2;
        const refY = half + lineWidth / 2;
        const ox = lineWidth / 2;
        const oy = lineWidth / 2;
        if (tipType === "closed")
            return `<marker id="${borderMarkerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polygon points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="${borderColor}" stroke="${borderColor}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker><marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polygon points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="${color}" stroke="none"/></marker>`;
        return `<marker id="${borderMarkerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polyline points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="none" stroke="${borderColor}" stroke-width="${lineWidth + 2}" stroke-linejoin="round"/></marker><marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polyline points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker>`;
    }

    draw() {
        super.draw();
        const lineWidth = this.properties.lineWidth ?? 1;
        const position = this.getBoardPosition();
        const startX = position.x;
        const startY = position.y;
        const tipX = this.properties.width + startX;
        const tipY = this.properties.height + startY;
        const color = this.properties.foregroundColor;
        const borderColor = this.getBorderColor();
        this.defs.innerHTML = this.buildMarker();
        this.borderLine.setAttribute("x1", startX);
        this.borderLine.setAttribute("y1", startY);
        this.borderLine.setAttribute("x2", tipX);
        this.borderLine.setAttribute("y2", tipY);
        this.borderLine.setAttribute("stroke", borderColor);
        this.borderLine.setAttribute("stroke-width", lineWidth + 2);
        this.line.setAttribute("x1", startX);
        this.line.setAttribute("y1", startY);
        this.line.setAttribute("x2", tipX);
        this.line.setAttribute("y2", tipY);
        this.line.setAttribute("stroke", color);
        this.line.setAttribute("stroke-width", lineWidth);
        if (this.properties.tipType !== "none") {
            this.borderLine.setAttribute("marker-end", `url(#${this.getMarkerId()}-border)`);
            this.line.setAttribute("marker-end", `url(#${this.getMarkerId()})`);
        } else {
            this.borderLine.removeAttribute("marker-end");
            this.line.removeAttribute("marker-end");
        }
        this.drawTrajectory();
    }

    drawTrajectory () {
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    getShapeCenterPosition() {
        const position = this.getBoardPosition();
        return { x: position.x + this.properties.width, y: position.y + this.properties.height };
    }

    getDefaultComponent() {
        return (this.parent?.properties?.width ?? 150) * 0.2;
    }

    tick() {
        super.tick();
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const newW = this.resolveTermNumeric(this.properties.xTerm, xCase);
        const newH = this.resolveTermNumeric(this.properties.yTerm, yCase);
        this.properties.width = Number.isFinite(newW) ? newW : this.getDefaultComponent();
        this.properties.height = Number.isFinite(newH) ? -newH : -this.getDefaultComponent();
        const calculator = this.board.calculator;
        this.trajectory.values = this.trajectory.values.slice(0, calculator.getLastIteration());
        if (this.trajectory.values.length <= calculator.getLastIteration()) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x + this.properties.width, y: position.y + this.properties.height });
        }
        if (this.trajectory.values.length < this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = this.trajectory.values.length;
        } else if (this.trajectory.values.length > this.trajectory.lastCount) {
            const newPoints = this.trajectory.values.slice(this.trajectory.lastCount)
                .map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.pointsString += (this.trajectory.pointsString && newPoints ? " " : "") + newPoints;
            this.trajectory.lastCount = this.trajectory.values.length;
        }
        this.board.markDirty(this);
    }
}
