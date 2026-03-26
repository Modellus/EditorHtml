class ChildShape extends BaseShape {
    setDefaults() {
        super.setDefaults();
        this.properties.parentId = this.parent?.id ?? null;
        this.properties.trajectoryColor = "transparent";
        this.properties.stroboscopyColor = "transparent";
        this.properties.stroboscopyInterval = 10;
        this.properties.stroboscopyOpacity = 0.5;
    }

    tick() {
        super.tick();
        this.tickShape();
        this.tickTrajectory();
        this.tickStroboscopy();
        this.board.markDirty(this);
    }

    tickShape() {
        const scale = this.getScale();
        for (const mapping of this.termsMapping) {
            const caseNumber = this.properties[mapping.caseProperty] ?? 1;
            const rawValue = this.resolveTermNumeric(this.properties[mapping.termProperty], caseNumber);
            const axisScale = scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
    }

    getTrajectoryPosition() {
        return this.getBoardPosition();
    }

    tickTrajectory() {
        const lastIteration = this.board.calculator.getLastIteration();
        this.trajectory.values = this.trajectory.values.slice(0, lastIteration);
        if (this.trajectory.values.length <= lastIteration)
            this.trajectory.values.push(this.getTrajectoryPosition());
        const currentCount = this.trajectory.values.length;
        if (currentCount !== this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = currentCount;
        }
    }

    tickStroboscopy() {
        if (!this.properties.stroboscopyColor || this.properties.stroboscopyColor === "transparent" || this.properties.stroboscopyColor === "#00000000") {
            this._stroboscopyPositions = [];
            return;
        }
        const lastIteration = this.board.calculator.getLastIteration();
        if (lastIteration === 0)
            this._stroboscopyPositions = [];
        const interval = Math.max(1, this.properties.stroboscopyInterval);
        const desired = Math.floor(lastIteration / interval);
        const positions = [];
        for (let i = 0; i < desired; i++) {
            const idx = i * interval;
            const pos = this.trajectory.values[idx] ?? this.getTrajectoryPosition();
            positions.push(pos);
        }
        this._stroboscopyPositions = positions;
    }

    drawTrajectory() {
        if (this.properties.trajectoryColor && this.properties.trajectoryColor !== "transparent" && this.properties.trajectoryColor !== "#00000000") {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    getStroboscopyRadius() {
        return 3;
    }

    drawStroboscopy() {
        if (!this.properties.stroboscopyColor || this.properties.stroboscopyColor === "transparent" || this.properties.stroboscopyColor === "#00000000") {
            while (this.stroboscopy.firstChild)
                this.stroboscopy.removeChild(this.stroboscopy.firstChild);
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        while (this.stroboscopy.children.length > desiredLength)
            this.stroboscopy.removeChild(this.stroboscopy.lastChild);
        const radius = this.getStroboscopyRadius();
        for (let i = 0; i < desiredLength; i++) {
            const pos = positions[i];
            let circle = this.stroboscopy.children[i];
            if (!circle) {
                circle = this.board.createSvgElement("circle");
                this.stroboscopy.appendChild(circle);
            }
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", radius);
            circle.setAttribute("fill", this.properties.stroboscopyColor);
            circle.setAttribute("opacity", this.properties.stroboscopyOpacity);
        }
    }

    wouldCreateCycle(candidate) {
        let node = candidate;
        while (node) {
            if (node === this)
                return true;
            node = node.parent;
        }
        return false;
    }

    getReferential() {
        let node = this.parent;
        while (node) {
            if (node.constructor.name === "ReferentialShape")
                return node;
            node = node.parent;
        }
        return this.board.shapes.shapes.find(s => s.constructor.name === "ReferentialShape") ?? null;
    }

    buildParentTreeItem(shape) {
        const children = (shape.children ?? []).map(child => this.buildParentTreeItem(child));
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

    buildParentTreeItems(referential) {
        if (!referential)
            return [];
        return [this.buildParentTreeItem(referential)];
    }

    flattenTreeItems(items) {
        const result = [];
        for (const item of items) {
            result.push({ id: item.id, text: item.text, icon: item.icon, color: item.color });
            if (item.items?.length)
                result.push(...this.flattenTreeItems(item.items));
        }
        return result;
    }

    setProperty(name, value) {
        if (name === "parentId") {
            this.reparent(value);
            return;
        }
        super.setProperty(name, value);
        if (name === "trajectoryColor" || name === "stroboscopyColor")
            this.refreshMotionToolbarControl();
    }

    reparent(newParentId) {
        const newParent = newParentId ? this.board.shapes.getById(newParentId) : null;
        if (this.parent)
            this.parent.children = this.parent.children.filter(c => c !== this);
        this.parent = newParent;
        if (newParent)
            newParent.children.push(this);
        this.properties.parentId = newParentId;
        const clipId = newParent?.getClipId();
        if (clipId)
            this.element.setAttribute("clip-path", `url(#${clipId})`);
        else
            this.element.removeAttribute("clip-path");
        this.board.markDirty(this);
    }

    renderParentButtonTemplate(element) {
        const parentShape = this.parent ?? this.getReferential();
        const name = parentShape?.properties?.name ?? "";
        const icon = BaseShape.shapeIcons[parentShape?.constructor?.name] ?? "fa-light fa-shapes";
        element.innerHTML = `<i class="${icon}" title="${name}"></i>`;
    }

    createParentDropDownButton(itemElement) {
        const treeItems = () => this.buildParentTreeItems(this.getReferential());
        this._parentDropdownElement = $('<div class="mdl-parent-selector">');
        this._parentDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Attached To",
            buttonTemplate: (data, element) => this.renderParentButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:20000" },
                width: "auto",
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $(contentElement).dxScrollView({ height: 300, width: "100%" });
                    $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxTreeView({
                        items: treeItems(),
                        dataStructure: "tree",
                        keyExpr: "id",
                        displayExpr: "text",
                        selectionMode: "single",
                        selectByClick: true,
                        itemTemplate: (data, _, el) => {
                            if (data.characterImage)
                                el[0].innerHTML = `<img class="mdl-parent-tree-character" src="${data.characterImage}" alt="${data.text}"/>${data.text}`;
                            else {
                                const solidIcon = data.icon.replace("fa-light", "fa-solid");
                                const colorStyle = data.color ? ` style="color:${data.color}"` : "";
                                el[0].innerHTML = `<i class="dx-icon ${solidIcon}"${colorStyle}></i>${data.text}`;
                            }
                        },
                        onItemClick: e => {
                            const targetShape = this.board.shapes.getById(e.itemData.id);
                            if (this.wouldCreateCycle(targetShape))
                                return;
                            this.setProperty("parentId", e.itemData.id);
                            this._parentDropdownElement.dxDropDownButton("instance").close();
                            this.refreshParentToolbarControl();
                        }
                    });
                }
            }
        });
        this._parentDropdownElement.appendTo(itemElement);
    }

    refreshParentToolbarControl() {
        if (!this._parentDropdownElement)
            return;
        const buttonContentElement = this._parentDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderParentButtonTemplate(buttonContentElement);
    }

    renderMotionButtonTemplate(element) {
        element.innerHTML = `<i class="fa-light fa-scribble"></i>`;
    }

    createMotionDropDownButton(itemElement) {
        this._trajectoryColorPicker = this.createColorPickerEditor("trajectoryColor");
        this._stroboscopyColorPicker = this.createColorPickerEditor("stroboscopyColor");
        this._motionDropdownElement = $('<div class="mdl-motion-selector">');
        this._motionDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Trajectory",
            buttonTemplate: (data, element) => this.renderMotionButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:20000" },
                width: "auto",
                contentTemplate: contentElement => {
                    const sections = [
                        {
                            text: "Motion",
                            items: [
                                {
                                    text: "Trajectory color",
                                    buildControl: $p => $p.append(this._trajectoryColorPicker)
                                }
                            ]
                        }
                    ];
                    this.populateMotionMenuSections(sections);
                    const listItems = sections.flatMap(section => section.items);
                    $(contentElement).empty();
                    $(contentElement).dxScrollView({ height: 300, width: "100%" });
                    $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
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
        this._motionDropdownElement.appendTo(itemElement);
    }

    populateMotionMenuSections(sections) {
        sections[0].items.push(
            {
                text: "Stroboscopy color",
                buildControl: $p => $p.append(this._stroboscopyColorPicker)
            },
            {
                text: "Interval",
                buildControl: $p => $('<div>').dxNumberBox({
                    value: this.properties.stroboscopyInterval,
                    showSpinButtons: true,
                    min: 1,
                    width: 90,
                    stylingMode: "filled",
                    onInitialized: e => { this.stroboscopyIntervalToolbarWidget = e.component; },
                    onValueChanged: e => { this.setProperty("stroboscopyInterval", e.value); this.board.markDirty(this); }
                }).appendTo($p)
            },
            {
                text: "Opacity",
                buildControl: $p => $('<div>').dxNumberBox({
                    value: this.properties.stroboscopyOpacity,
                    showSpinButtons: true,
                    min: 0,
                    max: 1,
                    step: 0.1,
                    width: 90,
                    stylingMode: "filled",
                    onInitialized: e => { this.stroboscopyOpacityToolbarWidget = e.component; },
                    onValueChanged: e => { this.setProperty("stroboscopyOpacity", e.value); this.board.markDirty(this); }
                }).appendTo($p)
            }
        );
    }

    refreshMotionToolbarControl() {
        if (!this._motionDropdownElement)
            return;
        const buttonContentElement = this._motionDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderMotionButtonTemplate(buttonContentElement);
        if (this._trajectoryColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._trajectoryColorPicker, this.properties.trajectoryColor);
        this.refreshStroboscopyToolbarControl();
    }

    refreshStroboscopyToolbarControl() {
        if (this._stroboscopyColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._stroboscopyColorPicker, this.properties.stroboscopyColor);
        this.stroboscopyIntervalToolbarWidget?.option("value", this.properties.stroboscopyInterval);
        this.stroboscopyOpacityToolbarWidget?.option("value", this.properties.stroboscopyOpacity);
    }
}

