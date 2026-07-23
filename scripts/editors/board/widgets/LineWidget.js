class LineShape extends ChildShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const handleSize = this.getDragHandleHitSize();
        const tipRadius = this.getDragHandleHitRadius();
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const grip = this.getGripPositions().origin;
                    return { x: grip.x - handleSize / 2, y: grip.y - handleSize / 2, width: handleSize, height: handleSize };
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
                    const grip = this.getGripPositions().angle;
                    return {
                        cx: grip.x,
                        cy: grip.y,
                        r: tipRadius
                    };
                },
                getTransform: e => {
                    const position = this.getBoardPosition();
                    const dx = e.x - position.x;
                    const dy = -(e.y - position.y);
                    const angleRadians = Math.atan2(dy, dx);
                    const angleDegrees = angleRadians * 180 / Math.PI;
                    const scale = this.getScale();
                    const axisScale = scale.x ?? 1;
                    const scaledAngle = axisScale !== 0 ? angleDegrees : 0;
                    this.properties.angleTerm = String(Utils.roundToPrecision(scaledAngle, this.board.calculator.getPrecision()));
                    this.tick();
                    this.board.markDirty(this);
                    return {};
                }
            }
        ];
    }

    hideSelectionOutline = true;

    getReferencePointMarkers() {
        return [this.pointMarker, this.anglePointMarker];
    }

    isPointerNearShape(point) {
        const origin = this.getBoardPosition();
        const angleRad = this.getAngleRadians();
        const dirX = Math.cos(angleRad);
        const dirY = -Math.sin(angleRad);
        const perpendicular = Math.abs((point.x - origin.x) * dirY - (point.y - origin.y) * dirX);
        return perpendicular <= this.getReferencePointProximityThreshold();
    }

    getSelectionOutlinePrimitives() {
        const position = this.getBoardPosition();
        const angleRad = this.getAngleRadians();
        const lineLength = this.getLineLength();
        const lineWidth = this.properties.lineWidth ?? 1;
        const halfX = Math.cos(angleRad) * lineLength;
        const halfY = -Math.sin(angleRad) * lineLength;
        return [{
            tag: "line",
            mode: "stroke",
            strokeWidth: lineWidth,
            attributes: {
                x1: position.x - halfX,
                y1: position.y - halfY,
                x2: position.x + halfX,
                y2: position.y + halfY
            }
        }];
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

    enterEditMode() {
        return false;
    }

    getLineLength() {
        const referential = this.getReferentialParent();
        if (!referential)
            return 200;
        return Math.max(referential.properties.width, referential.properties.height) * 2;
    }

    // Distance from the anchor to the rotation grip. The line is drawn spanning
    // the whole referential, but the drag handle sits close to the anchor so it
    // stays inside the view and easy to grab.
    getAngleHandleDistance() {
        const referential = this.getReferentialParent();
        if (!referential)
            return 80;
        const size = Math.min(Number(referential.properties.width) || 0, Number(referential.properties.height) || 0);
        return Math.max(48, size * 0.35);
    }

    // Positions of the two draggable grips (origin + angle) in board coordinates.
    // Both are kept on the line and inside the referential so they stay visible
    // and grabbable even when the line's real anchor is dragged out of view. The
    // drag math itself still uses the true anchor/angle, so clamping the grips
    // does not change the line's data.
    getGripPositions() {
        const origin = this.getBoardPosition();
        const angleRad = this.getAngleRadians();
        const dir = { x: Math.cos(angleRad), y: -Math.sin(angleRad) };
        const desired = this.getAngleHandleDistance();
        const pointOnLine = t => ({ x: origin.x + dir.x * t, y: origin.y + dir.y * t });
        const rect = this.getReferentialRect();
        if (!rect)
            return { origin: pointOnLine(0), angle: pointOnLine(desired) };
        const inset = 6;
        const range = this.getVisibleLineRange(origin, dir, rect);
        if (!range) {
            const clamped = this.clampPointToRect(origin, rect, inset);
            return { origin: clamped, angle: { x: clamped.x + dir.x * desired, y: clamped.y + dir.y * desired } };
        }
        let tMin = range.tMin + inset;
        let tMax = range.tMax - inset;
        if (tMin > tMax) {
            const mid = (range.tMin + range.tMax) / 2;
            tMin = mid;
            tMax = mid;
        }
        const clamp = t => Math.min(Math.max(t, tMin), tMax);
        const originT = clamp(0);
        let angleT = clamp(desired);
        const separation = Math.min(this.getDragHandleHitRadius() * 2, tMax - tMin);
        if (Math.abs(angleT - originT) < separation) {
            angleT = (tMax - originT >= originT - tMin)
                ? Math.min(tMax, originT + separation)
                : Math.max(tMin, originT - separation);
        }
        return { origin: pointOnLine(originT), angle: pointOnLine(angleT) };
    }

    getAngleRadians() {
        const angleDeg = this.properties.angle ?? 0;
        return angleDeg * Math.PI / 180;
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) },
            { text: "Angle", stacked: true, buildControl: $p => $p.append(this._angleDescriptor.control) },
            {
                text: "Attached To",
                parentSelector: true,
                buildControl: $el => {
                    const iconSpan = $('<span class="mdl-parent-selector-icon"></span>');
                    this._parentInlineIconHolder = iconSpan;
                    this.renderParentButtonTemplate(iconSpan[0]);
                    const treeContainer = $('<div class="mdl-parent-inline-tree" style="display:none"></div>');
                    const row = $(`<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">Attached To</span></div>`);
                    row.append(iconSpan);
                    iconSpan.on("click", () => {
                        if (treeContainer.is(":visible")) {
                            treeContainer.hide();
                            return;
                        }
                        treeContainer.empty();
                        $('<div>').dxTreeView({
                            items: this.buildParentTreeItems(this.getReferential()),
                            dataStructure: "tree",
                            keyExpr: "id",
                            displayExpr: "text",
                            selectionMode: "single",
                            selectByClick: true,
                            itemTemplate: (data, _, el) => {
                                const solidIcon = data.icon.replace("fa-light", "fa-solid");
                                const colorStyle = data.color ? ` style="color:${data.color}"` : "";
                                el[0].innerHTML = `<i class="dx-icon ${solidIcon}"${colorStyle}></i>${data.text}`;
                            },
                            onItemClick: e => {
                                const targetShape = this.board.shapes.getById(e.itemData.id);
                                if (this.wouldCreateCycle(targetShape))
                                    return;
                                this.setPropertyCommand("parentId", e.itemData.id);
                                treeContainer.hide();
                                this.renderParentButtonTemplate(iconSpan[0]);
                                this._termsDropdownElement.dxDropDownButton("instance").close();
                            }
                        }).appendTo(treeContainer);
                        treeContainer.show();
                    });
                    $el.empty();
                    $el.append(row, treeContainer);
                }
            }
        );
    }

    refreshParentToolbarControl() {
        if (this._parentInlineIconHolder)
            this.renderParentButtonTemplate(this._parentInlineIconHolder[0]);
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.formatTermForDisplay(this.properties.xTerm);
        const yTerm = this.formatTermForDisplay(this.properties.yTerm);
        const angleTerm = this.formatTermForDisplay(this.properties.angleTerm);
        element.innerHTML =
            this.createNameButtonTermMarkup(xTerm) +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            this.createNameButtonTermMarkup(yTerm) +
            `<i class="fa-light fa-angle mdl-name-btn-separator"></i>` +
            this.createNameButtonTermMarkup(angleTerm);
    }

    renderLineWidthButtonTemplate(element) {
        element.innerHTML = `<i class="dx-icon fa-light fa-line-height"></i>`;
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
        this.refreshParentToolbarControl();
        this.refreshMotionToolbarControl();
        this.refreshTermsToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
        this.termFormControls["angleTerm"]?.termControl?.refresh();
        super.showContextToolbar();
    }

    setDefaults() {
        super.setDefaults();
        const metrics = this.getReferentialDefaultMetrics();
        this.properties.name = this.board.translations.get("Line Name");
        this.properties.x = metrics ? metrics.centerX / metrics.scaleX : 0;
        this.properties.y = metrics ? -metrics.centerY / metrics.scaleY : 0;
        this.properties.xTerm = metrics ? String(metrics.centerX) : "0";
        this.properties.yTerm = metrics ? String(metrics.centerY) : "0";
        this.properties.xTermCase = 1;
        this.properties.yTermCase = 1;
        this.properties.xTermDisplayMode = "none";
        this.properties.yTermDisplayMode = "none";
        this.properties.angleTerm = "45";
        this.properties.angleTermCase = 1;
        this.properties.angleTermDisplayMode = "none";
        this.properties.angle = 45;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = "transparent";
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 1;
        this.termsMapping.push({ termProperty: "xTerm", termValue: 0, property: "x", isInverted: false, scaleProperty: "x", caseProperty: "xTermCase" });
        this.termsMapping.push({ termProperty: "yTerm", termValue: 0, property: "y", isInverted: true, scaleProperty: "y", caseProperty: "yTermCase" });
        this.termsMapping.push({ termProperty: "angleTerm", termValue: 0, property: "angle", isInverted: false, scaleProperty: "x", caseProperty: "angleTermCase" });
        this.termDisplayEntries.push({ term: "xTerm", caseProperty: "xTermCase", title: "Horizontal" });
        this.termDisplayEntries.push({ term: "yTerm", caseProperty: "yTermCase", title: "Vertical" });
        this.termDisplayEntries.push({ term: "angleTerm", caseProperty: "angleTermCase", title: "Angle" });
    }

    tickShape() {
        const scale = this.getScale();
        for (const mapping of this.termsMapping) {
            const caseNumber = this.properties[mapping.caseProperty] ?? 1;
            const rawValue = this.resolveTermNumeric(this.properties[mapping.termProperty], caseNumber);
            if (mapping.property === "angle") {
                this.properties.angle = Number.isFinite(rawValue) ? rawValue : 0;
                continue;
            }
            const axisScale = scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.mainLine = this.board.createSvgElement("line");
        element.appendChild(this.mainLine);
        this.pointMarker = this.board.createSvgElement("circle");
        this.pointMarker.setAttribute("pointer-events", "all");
        element.appendChild(this.pointMarker);
        this.anglePointMarker = this.board.createSvgElement("circle");
        this.anglePointMarker.setAttribute("pointer-events", "all");
        element.appendChild(this.anglePointMarker);
        this.motionGroup = this.board.createSvgElement("g");
        this.motionGroup.setAttribute("pointer-events", "none");
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        this.motionGroup.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        this.motionGroup.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }

    update() {
        super.update();
    }

    getTrajectoryPosition() {
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const angleCase = this.properties.angleTermCase ?? 1;
        const logicalX = this.resolveTermNumeric(this.properties.xTerm, xCase);
        const logicalY = this.resolveTermNumeric(this.properties.yTerm, yCase);
        const angle = this.resolveTermNumeric(this.properties.angleTerm, angleCase);
        return {
            logicalX: Number.isFinite(logicalX) ? logicalX : 0,
            logicalY: Number.isFinite(logicalY) ? logicalY : 0,
            angle: Number.isFinite(angle) ? angle : 0
        };
    }

    logicalToBoardPosition(logicalX, logicalY) {
        const scale = this.getScale();
        const scaleX = scale.x ?? 1;
        const scaleY = scale.y ?? 1;
        const localX = scaleX !== 0 ? logicalX / scaleX : 0;
        const localY = scaleY !== 0 ? -logicalY / scaleY : 0;
        const parent = this.parent;
        if (!parent)
            return { x: localX, y: localY };
        const parentPosition = parent.getBoardPosition?.() ?? { x: 0, y: 0 };
        return {
            x: localX + parentPosition.x + (parent.properties?.originX ?? 0),
            y: localY + parentPosition.y + (parent.properties?.originY ?? 0)
        };
    }

    tickTrajectory() {
        const lastIteration = this.board.calculator.getLastIteration();
        if (this.board.calculator.getIteration() < lastIteration)
            return;
        const currentIndex = lastIteration - 1;
        if (this.trajectory.values.length > currentIndex)
            this.trajectory.values.length = currentIndex;
        this.trajectory.values[currentIndex] = this.getTrajectoryPosition();
        this.trajectory.lastCount = -1;
    }

    drawTrajectory() {
        if (this.properties.trajectoryColor && this.properties.trajectoryColor !== "transparent" && this.properties.trajectoryColor !== "#00000000") {
            const points = this.trajectory.values.map(v => {
                const pos = this.logicalToBoardPosition(v.logicalX, v.logicalY);
                return `${pos.x},${pos.y}`;
            }).join(" ");
            this.trajectory.element.setAttribute("points", points);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    tickStroboscopy() {
        const lastIteration = this.board.calculator.getLastIteration();
        if (lastIteration === 0) {
            this._stroboscopyPositions = [];
            return;
        }
        const interval = Math.max(1, this.properties.stroboscopyInterval);
        const desired = Math.floor(lastIteration / interval);
        const positions = [];
        for (let i = 0; i < desired; i++) {
            const idx = i * interval;
            const logical = this.trajectory.values[idx];
            if (logical)
                positions.push(logical);
        }
        this._stroboscopyPositions = positions;
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        const angleRad = this.getAngleRadians();
        const lineLength = this.getLineLength();
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.foregroundColor;
        // Direction of the line in screen space. +angle points up, matching the
        // angle point and the drag handle, so the line always passes through the
        // angle point (origin -> angle point define the same ray).
        const dirX = Math.cos(angleRad);
        const dirY = -Math.sin(angleRad);
        const halfX = dirX * lineLength;
        const halfY = dirY * lineLength;
        this.mainLine.setAttribute("x1", position.x - halfX);
        this.mainLine.setAttribute("y1", position.y - halfY);
        this.mainLine.setAttribute("x2", position.x + halfX);
        this.mainLine.setAttribute("y2", position.y + halfY);
        this.mainLine.setAttribute("stroke", color);
        this.mainLine.setAttribute("stroke-width", lineWidth);
        const grips = this.getGripPositions();
        this.updateReferencePointMarker(this.pointMarker, grips.origin, color);
        this.updateReferencePointMarker(this.anglePointMarker, grips.angle, color);
        this.applyReferencePointVisibility();
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    drawStroboscopy() {
        if (!this.properties.stroboscopyColor || this.properties.stroboscopyColor === "transparent" || this.properties.stroboscopyColor === "#00000000") {
            this.stroboscopy.innerHTML = "";
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.stroboscopyColor;
        const opacity = this.properties.stroboscopyOpacity;
        const lineLength = this.getLineLength();
        let html = "";
        for (let i = 0; i < desiredLength; i++) {
            const logical = positions[i];
            const pos = this.logicalToBoardPosition(logical.logicalX, logical.logicalY);
            const angleRad = (logical.angle ?? 0) * Math.PI / 180;
            const halfX = Math.cos(angleRad) * lineLength;
            const halfY = -Math.sin(angleRad) * lineLength;
            html += `<line x1="${pos.x - halfX}" y1="${pos.y - halfY}" x2="${pos.x + halfX}" y2="${pos.y + halfY}" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}"/>`;
        }
        this.stroboscopy.innerHTML = html;
    }

    getScreenAnchorPoint() {
        return this.parent.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }
}

var LineWidget = LineShape;
