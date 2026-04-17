class ArcShape extends ChildShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const handleSize = 12;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x - handleSize / 2, y: position.y - handleSize / 2, width: handleSize, height: handleSize };
                },
                getTransform: e => ({
                    x: this.delta("x", e.dx),
                    y: this.delta("y", e.dy)
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

    getUseRadians() {
        return this.board.calculator.properties.angleUnit === "radians";
    }

    toRadians(angle) {
        if (this.getUseRadians())
            return angle;
        return angle * Math.PI / 180;
    }

    createToolbar() {
        const items = super.createToolbar();
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const radiusDisplayMode = this.getTermDisplayModeProperty("radiusTerm");
        const radiusDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "radiusTerm", "radiusTermCase", true, radiusDisplayMode, true);
        this.termFormControls["radiusTerm"] = { termControl: radiusDescriptor.termControl };
        this._radiusDescriptor = radiusDescriptor;
        const startAngleDisplayMode = this.getTermDisplayModeProperty("startAngleTerm");
        const startAngleDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "startAngleTerm", "startAngleTermCase", true, startAngleDisplayMode, true);
        this.termFormControls["startAngleTerm"] = { termControl: startAngleDescriptor.termControl };
        this._startAngleDescriptor = startAngleDescriptor;
        const endAngleDisplayMode = this.getTermDisplayModeProperty("endAngleTerm");
        const endAngleDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "endAngleTerm", "endAngleTermCase", true, endAngleDisplayMode, true);
        this.termFormControls["endAngleTerm"] = { termControl: endAngleDescriptor.termControl };
        this._endAngleDescriptor = endAngleDescriptor;
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
                    this.createLineWidthDropDownButton(container);
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
            { text: "Point X", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Point Y", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) },
            { text: "Radius", stacked: true, buildControl: $p => $p.append(this._radiusDescriptor.control) },
            { text: "Start Angle", stacked: true, buildControl: $p => $p.append(this._startAngleDescriptor.control) },
            { text: "End Angle", stacked: true, buildControl: $p => $p.append(this._endAngleDescriptor.control) },
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
        const radiusTerm = this.formatTermForDisplay(this.properties.radiusTerm);
        const startAngleTerm = this.formatTermForDisplay(this.properties.startAngleTerm);
        const endAngleTerm = this.formatTermForDisplay(this.properties.endAngleTerm);
        element.innerHTML =
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>` +
            `<i class="fa-light fa-pipe mdl-name-btn-separator" style="opacity:0.3"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${radiusTerm}</span></span>` +
            `<i class="fa-light fa-pipe mdl-name-btn-separator" style="opacity:0.3"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${startAngleTerm}</span></span>` +
            `<i class="fa-light fa-arrow-right mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${endAngleTerm}</span></span>`;
    }

    renderLineWidthButtonTemplate(element) {
        element.innerHTML = `<i class="dx-icon fa-light fa-line-height"></i>`;
    }

    createLineWidthDropDownButton(container) {
        this._lineWidthDropdownElement = $('<div class="mdl-line-width-selector">');
        this._lineWidthDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Line Width Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderLineWidthButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => {
                    const listItems = [
                        {
                            text: "Width",
                            buildControl: $container => {
                                $('<div>').dxNumberBox({
                                    value: this.properties.lineWidth,
                                    min: 1,
                                    max: 50,
                                    step: 1,
                                    showSpinButtons: true,
                                    width: 80,
                                    stylingMode: "filled",
                                    onValueChanged: e => this.setPropertyCommand("lineWidth", e.value)
                                }).appendTo($container);
                            }
                        }
                    ];
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: listItems,
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                            data.buildControl($(el).find(".mdl-dropdown-list-control"));
                        }
                    });
                }
            }
        });
        this._lineWidthDropdownElement.appendTo(container);
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
        this.termFormControls["radiusTerm"]?.termControl?.refresh();
        this.termFormControls["startAngleTerm"]?.termControl?.refresh();
        super.showContextToolbar();
        this.termFormControls["endAngleTerm"]?.termControl?.refresh();
    }

    setDefaults() {
        super.setDefaults();
        const metrics = this.getReferentialDefaultMetrics();
        this.properties.name = this.board.translations.get("Arc Name");
        this.properties.x = metrics ? metrics.centerX / metrics.scaleX : 0;
        this.properties.y = metrics ? -metrics.centerY / metrics.scaleY : 0;
        this.properties.xTerm = metrics ? String(metrics.centerX) : "0";
        this.properties.yTerm = metrics ? String(metrics.centerY) : "0";
        this.properties.xTermCase = 1;
        this.properties.yTermCase = 1;
        this.properties.xTermDisplayMode = "none";
        this.properties.yTermDisplayMode = "none";
        this.properties.radiusTerm = metrics ? String(metrics.size) : "5";
        this.properties.radiusTermCase = 1;
        this.properties.radiusTermDisplayMode = "none";
        this.properties.radius = metrics ? metrics.size / metrics.scaleX : 50;
        this.properties.startAngleTerm = "0";
        this.properties.startAngleTermCase = 1;
        this.properties.startAngleTermDisplayMode = "none";
        this.properties.startAngle = 0;
        this.properties.endAngleTerm = this.getUseRadians() ? String(Math.PI / 2) : "90";
        this.properties.endAngleTermCase = 1;
        this.properties.endAngleTermDisplayMode = "none";
        this.properties.endAngle = this.getUseRadians() ? Math.PI / 2 : 90;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = "transparent";
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 2;
        this.termsMapping.push({ termProperty: "xTerm", termValue: 0, property: "x", isInverted: false, scaleProperty: "x", caseProperty: "xTermCase" });
        this.termsMapping.push({ termProperty: "yTerm", termValue: 0, property: "y", isInverted: true, scaleProperty: "y", caseProperty: "yTermCase" });
        this.termsMapping.push({ termProperty: "radiusTerm", termValue: 0, property: "radius", isInverted: false, scaleProperty: "x", caseProperty: "radiusTermCase" });
        this.termsMapping.push({ termProperty: "startAngleTerm", termValue: 0, property: "startAngle", isInverted: false, scaleProperty: null, caseProperty: "startAngleTermCase" });
        this.termsMapping.push({ termProperty: "endAngleTerm", termValue: 0, property: "endAngle", isInverted: false, scaleProperty: null, caseProperty: "endAngleTermCase" });
        this.termDisplayEntries.push({ term: "xTerm", caseProperty: "xTermCase", title: "Point X" });
        this.termDisplayEntries.push({ term: "yTerm", caseProperty: "yTermCase", title: "Point Y" });
        this.termDisplayEntries.push({ term: "radiusTerm", caseProperty: "radiusTermCase", title: "Radius" });
        this.termDisplayEntries.push({ term: "startAngleTerm", caseProperty: "startAngleTermCase", title: "Start Angle" });
        this.termDisplayEntries.push({ term: "endAngleTerm", caseProperty: "endAngleTermCase", title: "End Angle" });
    }

    tickShape() {
        const scale = this.getScale();
        for (const mapping of this.termsMapping) {
            const caseNumber = this.properties[mapping.caseProperty] ?? 1;
            const rawValue = this.resolveTermNumeric(this.properties[mapping.termProperty], caseNumber);
            if (mapping.property === "startAngle" || mapping.property === "endAngle") {
                this.properties[mapping.property] = Number.isFinite(rawValue) ? rawValue : 0;
                continue;
            }
            if (mapping.property === "radius") {
                const axisScale = scale[mapping.scaleProperty] ?? 1;
                this.properties.radius = Number.isFinite(rawValue) ? (axisScale !== 0 ? Math.abs(rawValue) / axisScale : 0) : 0;
                continue;
            }
            const axisScale = scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.arcPath = this.board.createSvgElement("path");
        this.arcPath.setAttribute("fill", "none");
        element.appendChild(this.arcPath);
        this.pointMarker = this.board.createSvgElement("circle");
        this.pointMarker.setAttribute("pointer-events", "all");
        element.appendChild(this.pointMarker);
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

    buildArcPathData(cx, cy, pixelRadius, startRad, endRad) {
        if (pixelRadius <= 0)
            return "";
        let sweep = endRad - startRad;
        if (Math.abs(sweep) >= 2 * Math.PI) {
            return `M ${cx + pixelRadius} ${cy} ` +
                `A ${pixelRadius} ${pixelRadius} 0 1 0 ${cx - pixelRadius} ${cy} ` +
                `A ${pixelRadius} ${pixelRadius} 0 1 0 ${cx + pixelRadius} ${cy}`;
        }
        const startX = cx + pixelRadius * Math.cos(startRad);
        const startY = cy - pixelRadius * Math.sin(startRad);
        const endX = cx + pixelRadius * Math.cos(endRad);
        const endY = cy - pixelRadius * Math.sin(endRad);
        const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
        const sweepFlag = sweep > 0 ? 0 : 1;
        return `M ${startX} ${startY} A ${pixelRadius} ${pixelRadius} 0 ${largeArc} ${sweepFlag} ${endX} ${endY}`;
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        const cx = position.x;
        const cy = position.y;
        const pixelRadius = Math.abs(this.properties.radius);
        const startRad = this.toRadians(this.properties.startAngle);
        const endRad = this.toRadians(this.properties.endAngle);
        const lineWidth = this.properties.lineWidth ?? 2;
        const color = this.properties.foregroundColor;
        const pathData = this.buildArcPathData(cx, cy, pixelRadius, startRad, endRad);
        if (pathData) {
            this.arcPath.setAttribute("d", pathData);
            this.arcPath.setAttribute("stroke", color);
            this.arcPath.setAttribute("stroke-width", lineWidth);
        } else
            this.arcPath.removeAttribute("d");
        this.pointMarker.setAttribute("cx", cx);
        this.pointMarker.setAttribute("cy", cy);
        this.pointMarker.setAttribute("r", 3);
        this.pointMarker.setAttribute("fill", color);
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    getTrajectoryPosition() {
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const radiusCase = this.properties.radiusTermCase ?? 1;
        const startAngleCase = this.properties.startAngleTermCase ?? 1;
        const endAngleCase = this.properties.endAngleTermCase ?? 1;
        const logicalX = this.resolveTermNumeric(this.properties.xTerm, xCase);
        const logicalY = this.resolveTermNumeric(this.properties.yTerm, yCase);
        const radius = this.resolveTermNumeric(this.properties.radiusTerm, radiusCase);
        const startAngle = this.resolveTermNumeric(this.properties.startAngleTerm, startAngleCase);
        const endAngle = this.resolveTermNumeric(this.properties.endAngleTerm, endAngleCase);
        return {
            logicalX: Number.isFinite(logicalX) ? logicalX : 0,
            logicalY: Number.isFinite(logicalY) ? logicalY : 0,
            radius: Number.isFinite(radius) ? radius : 0,
            startAngle: Number.isFinite(startAngle) ? startAngle : 0,
            endAngle: Number.isFinite(endAngle) ? endAngle : 0
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

    drawStroboscopy() {
        if (!this.properties.stroboscopyColor || this.properties.stroboscopyColor === "transparent" || this.properties.stroboscopyColor === "#00000000") {
            this.stroboscopy.innerHTML = "";
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        const color = this.properties.stroboscopyColor;
        const opacity = this.properties.stroboscopyOpacity;
        const lineWidth = this.properties.lineWidth ?? 2;
        const scale = this.getScale();
        const scaleX = scale.x ?? 1;
        let html = "";
        for (let i = 0; i < desiredLength; i++) {
            const logical = positions[i];
            const pos = this.logicalToBoardPosition(logical.logicalX, logical.logicalY);
            const pixelRadius = scaleX !== 0 ? Math.abs(logical.radius) / scaleX : 0;
            const startRad = this.toRadians(logical.startAngle);
            const endRad = this.toRadians(logical.endAngle);
            const pathData = this.buildArcPathData(pos.x, pos.y, pixelRadius, startRad, endRad);
            if (pathData)
                html += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}"/>`;
        }
        this.stroboscopy.innerHTML = html;
    }

    getScreenAnchorPoint() {
        return this.parent.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }
}
