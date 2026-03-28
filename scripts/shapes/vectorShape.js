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
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const xOriginDisplayMode = this.getTermDisplayModeProperty("xOriginTerm");
        const xOriginDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "xOriginTerm", "xOriginTermCase", true, xOriginDisplayMode, true);
        this.termFormControls["xOriginTerm"] = { termControl: xOriginDescriptor.termControl };
        this._xOriginDescriptor = xOriginDescriptor;
        const yOriginDisplayMode = this.getTermDisplayModeProperty("yOriginTerm");
        const yOriginDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "yOriginTerm", "yOriginTermCase", true, yOriginDisplayMode, true);
        this.termFormControls["yOriginTerm"] = { termControl: yOriginDescriptor.termControl };
        this._yOriginDescriptor = yOriginDescriptor;
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
                    this.createTipTypeDropDownButton(container);
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
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) },
            { text: "Origin X", stacked: true, buildControl: $p => $p.append(this._xOriginDescriptor.control) },
            { text: "Origin Y", stacked: true, buildControl: $p => $p.append(this._yOriginDescriptor.control) },
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
        const xOriginTerm = this.properties.xOriginTerm ?? "";
        const yOriginTerm = this.properties.yOriginTerm ?? "";
        element.innerHTML =
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xOriginTerm}</span></span>` +
            `<i class="fa-light fa-circle-dot mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yOriginTerm}</span></span>` +
            `<i class="fa-light fa-pipe mdl-name-btn-separator" style="opacity:0.3"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>`;
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
        this.refreshTipTypeToolbarControl();
        this.refreshShapeColorToolbarControl();
        this.refreshMotionToolbarControl();
        this.refreshTermsToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
        this.termFormControls["xOriginTerm"]?.termControl?.refresh();
        this.termFormControls["yOriginTerm"]?.termControl?.refresh();
    }

    refreshTipTypeToolbarControl() {
        if (!this._tipTypeDropdownElement)
            return;
        const buttonContent = this._tipTypeDropdownElement.find(".dx-button-content")[0];
        if (buttonContent)
            this.renderTipTypeButtonTemplate(buttonContent);
    }

    createTipTypeDropDownButton(container) {
        this._tipTypeDropdownElement = $('<div class="mdl-tip-type-selector">');
        this._tipTypeDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => this.renderTipTypeButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:20000" },
                width: "auto",
                contentTemplate: contentElement => {
                    const listItems = [
                        {
                            text: "Type",
                            buildControl: $container => {
                                $('<div>').dxButtonGroup({
                                    items: [
                                        { key: "arrow", icon: "fa-light fa-arrow-right" },
                                        { key: "closed", icon: "fa-light fa-right-long" },
                                        { key: "none", icon: "fa-light fa-dash" }
                                    ],
                                    keyExpr: "key",
                                    selectedItemKeys: [this.properties.tipType],
                                    stylingMode: "outlined",
                                    buttonTemplate: (data, btnContainer) => {
                                        btnContainer[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
                                    },
                                    onSelectionChanged: e => {
                                        if (e.addedItems.length > 0) {
                                            this.setPropertyCommand("tipType", e.addedItems[0].key);
                                            this.refreshTipTypeToolbarControl();
                                        }
                                    }
                                }).appendTo($container);
                            }
                        },
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
        this._tipTypeDropdownElement.appendTo(container);
    }

    renderTipTypeButtonTemplate(element) {
        const key = this.properties.tipType;
        const iconMap = { arrow: "fa-light fa-arrow-right", closed: "fa-light fa-right-long", none: "fa-light fa-dash" };
        element.innerHTML = `<i class="dx-icon ${iconMap[key] ?? iconMap.arrow}"></i>`;
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
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = "transparent";
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 1;
        this.properties.tipType = "arrow";
        this.properties.xOriginTerm = "";
        this.properties.yOriginTerm = "";
        this.termsMapping.push({ termProperty: "xTerm", termValue: 0, property: "width", isInverted: false, scaleProperty: "x", caseProperty: "xTermCase" });
        this.termsMapping.push({ termProperty: "yTerm", termValue: 0, property: "height", isInverted: true, scaleProperty: "y", caseProperty: "yTermCase" });
        this.termsMapping.push({ termProperty: "xOriginTerm", termValue: 0, property: "x", isInverted: false, scaleProperty: "x", caseProperty: "xOriginTermCase" });
        this.termsMapping.push({ termProperty: "yOriginTerm", termValue: 0, property: "y", isInverted: true, scaleProperty: "y", caseProperty: "yOriginTermCase" });
        this.termDisplayEntries.push({ term: "xTerm", caseProperty: "xTermCase", title: "Horizontal" });
        this.termDisplayEntries.push({ term: "yTerm", caseProperty: "yTermCase", title: "Vertical" });
    }

    tickShape() {
        const scale = this.getScale();
        for (const mapping of this.termsMapping) {
            const termValue = this.properties[mapping.termProperty];
            if ((mapping.termProperty === "xOriginTerm" || mapping.termProperty === "yOriginTerm") && (termValue == null || String(termValue).trim() === ""))
                continue;
            const caseNumber = this.properties[mapping.caseProperty] ?? 1;
            const rawValue = this.resolveTermNumeric(termValue, caseNumber);
            const axisScale = scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
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
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        element.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }    

    update() {
        super.update();
    }

    getMarkerId() {
        return `vector-marker-${this.id}-${this.properties.tipType}`;
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
        this.drawStroboscopy();
    }

    getShapeCenterPosition() {
        const position = this.getBoardPosition();
        return { x: position.x + this.properties.width, y: position.y + this.properties.height };
    }

    getTrajectoryPosition() {
        const position = this.getBoardPosition();
        return { x: position.x + this.properties.width, y: position.y + this.properties.height, startX: position.x, startY: position.y };
    }

    buildStroboscopyMarker() {
        const tipType = this.properties.tipType;
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.stroboscopyColor;
        const markerId = `${this.getMarkerId()}-stroboscopy`;
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
            return `<marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polygon points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="${color}" stroke="none"/></marker>`;
        return `<marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polyline points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker>`;
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
        const markerId = `${this.getMarkerId()}-stroboscopy`;
        const markerHtml = this.buildStroboscopyMarker();
        const useMarker = this.properties.tipType !== "none" && markerHtml;
        let html = markerHtml ? `<defs>${markerHtml}</defs>` : "";
        for (let i = 0; i < desiredLength; i++) {
            const pos = positions[i];
            const startX = pos.startX ?? pos.x;
            const startY = pos.startY ?? pos.y;
            html += `<line x1="${startX}" y1="${startY}" x2="${pos.x}" y2="${pos.y}" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity}"${useMarker ? ` marker-end="url(#${markerId})"` : ""}/>`;
        }
        this.stroboscopy.innerHTML = html;
    }
}
