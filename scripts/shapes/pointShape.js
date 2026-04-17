class PointShape extends ChildShape {
    constructor(board, parent, id) {
        super(board, parent, id);
        this.ensureMotionTermMappings();
    }

    ensureMotionTermMappings() {
        if (!this.termsMapping.some(mapping => mapping.termProperty === "xTerm")) {
            this.termsMapping.push({
                termProperty: "xTerm",
                termValue: 0,
                property: "x",
                isInverted: false,
                scaleProperty: "x",
                caseProperty: "xTermCase"
            });
        }
        if (!this.termsMapping.some(mapping => mapping.termProperty === "yTerm")) {
            this.termsMapping.push({
                termProperty: "yTerm",
                termValue: 0,
                property: "y",
                isInverted: true,
                scaleProperty: "y",
                caseProperty: "yTermCase"
            });
        }
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

    enterEditMode() {
        return false;
    }

    getScreenAnchorPoint() {
        return this.parent.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }

    createToolbar() {
        const items = super.createToolbar();
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
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
                template: () => $('<div class="toolbar-separator">|</div>')
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
                template: () => $('<div class="toolbar-separator">|</div>')
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
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) },
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
                                el[0].innerHTML = BaseShape.renderShapeTreeItemHtml(data);
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

    showContextToolbar() {
        this.refreshParentToolbarControl();
        this.refreshMotionToolbarControl();
        this.refreshTermsToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
        super.showContextToolbar();
    }

    refreshParentToolbarControl() {
        if (this._parentInlineIconHolder)
            this.renderParentButtonTemplate(this._parentInlineIconHolder[0]);
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.formatTermForDisplay(this.properties.xTerm);
        const yTerm = this.formatTermForDisplay(this.properties.yTerm);
        element.innerHTML =
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>`;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.circle = this.board.createSvgElement("circle");
        this.circle.setAttribute("pointer-events", "all");
        element.appendChild(this.circle);
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

    setDefaults() {
        super.setDefaults();
        const metrics = this.getReferentialDefaultMetrics();
        this.properties.xTerm = metrics ? String(metrics.centerX) : "0";
        this.properties.yTerm = metrics ? String(metrics.centerY) : "0";
        this.properties.name = this.board.translations.get("Point Name");
        this.properties.x = metrics ? metrics.centerX / metrics.scaleX : 0;
        this.properties.y = metrics ? -metrics.centerY / metrics.scaleY : 0;
        this.properties.radius = 4;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = this.properties.foregroundColor;
    }

    draw() {
        super.draw();
        this.drawShape();
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 4;
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", this.properties.foregroundColor);
        this.applyBorderStroke(this.circle, 1);
    }
}
