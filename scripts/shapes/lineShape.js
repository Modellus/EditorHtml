class LineShape extends ChildShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const handleSize = 12;
        const lineLength = this.getLineLength();
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
            },
            {
                tag: "circle",
                className: "handle tip",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    const angleRad = this.getAngleRadians();
                    return {
                        cx: position.x + Math.cos(angleRad) * lineLength,
                        cy: position.y - Math.sin(angleRad) * lineLength,
                        r: 5
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

    getLineLength() {
        const referential = this.getReferentialParent();
        if (!referential)
            return 200;
        return Math.max(referential.properties.width, referential.properties.height) * 2;
    }

    getAngleRadians() {
        const angleDeg = this.properties.angle ?? 0;
        return angleDeg * Math.PI / 180;
    }

    createToolbar() {
        const items = super.createToolbar();
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const angleDisplayMode = this.getTermDisplayModeProperty("angleTerm");
        const angleDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "angleTerm", "angleTermCase", true, angleDisplayMode, true);
        this.termFormControls["angleTerm"] = { termControl: angleDescriptor.termControl };
        this._angleDescriptor = angleDescriptor;
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
        const xTerm = this.properties.xTerm ?? "";
        const yTerm = this.properties.yTerm ?? "";
        const angleTerm = this.properties.angleTerm ?? "";
        element.innerHTML =
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>` +
            `<i class="fa-light fa-angle mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${angleTerm}</span></span>`;
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
            template: (data, element) => this.renderLineWidthButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:20000" },
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
        super.showContextToolbar();
        this.refreshNameToolbarControl();
        this.refreshParentToolbarControl();
        this.refreshShapeColorToolbarControl();
        this.refreshMotionToolbarControl();
        this.refreshTermsToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
        this.termFormControls["angleTerm"]?.termControl?.refresh();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Line Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.xTerm = "0";
        this.properties.yTerm = "0";
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
        this.termDisplayEntries.push({ term: "xTerm", caseProperty: "xTermCase", title: "Point X" });
        this.termDisplayEntries.push({ term: "yTerm", caseProperty: "yTermCase", title: "Point Y" });
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
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        element.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        element.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }

    update() {
        super.update();
    }

    getTrajectoryPosition() {
        const position = this.getBoardPosition();
        return { x: position.x, y: position.y, angle: this.properties.angle ?? 0 };
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        const angleRad = this.getAngleRadians();
        const lineLength = this.getLineLength();
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.foregroundColor;
        const dx = Math.cos(angleRad) * lineLength;
        const dy = -Math.sin(angleRad) * lineLength;
        this.mainLine.setAttribute("x1", position.x - dx);
        this.mainLine.setAttribute("y1", position.y + dy);
        this.mainLine.setAttribute("x2", position.x + dx);
        this.mainLine.setAttribute("y2", position.y - dy);
        this.mainLine.setAttribute("stroke", color);
        this.mainLine.setAttribute("stroke-width", lineWidth);
        this.pointMarker.setAttribute("cx", position.x);
        this.pointMarker.setAttribute("cy", position.y);
        this.pointMarker.setAttribute("r", 3);
        this.pointMarker.setAttribute("fill", color);
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
            const pos = positions[i];
            const angleRad = (pos.angle ?? 0) * Math.PI / 180;
            const dx = Math.cos(angleRad) * lineLength;
            const dy = -Math.sin(angleRad) * lineLength;
            html += `<line x1="${pos.x - dx}" y1="${pos.y + dy}" x2="${pos.x + dx}" y2="${pos.y - dy}" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}"/>`;
        }
        this.stroboscopy.innerHTML = html;
    }

    getScreenAnchorPoint() {
        return this.parent?.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }
}
