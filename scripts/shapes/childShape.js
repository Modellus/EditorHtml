class ChildShape extends BaseShape {
    setDefaults() {
        super.setDefaults();
        this.properties.parentId = this.parent?.id ?? null;
        this.properties.trajectoryColor = "transparent";
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
        const icon = (BaseShape.shapeIcons[parentShape?.constructor?.name] ?? "fa-light fa-shapes").replace("fa-light", "fa-solid");
        const color = parentShape?.properties?.foregroundColor ?? "";
        const colorStyle = color ? `color:${color}` : "";
        element.innerHTML = `<i class="${icon}" title="${name}" style="${colorStyle}"></i>`;
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
                wrapperAttr: { style: "z-index:10000" },
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
        const trajColor = this.properties.trajectoryColor ?? "";
        const trajSet = !!trajColor && trajColor !== "transparent" && trajColor !== "#00000000";
        if (trajSet)
            element.innerHTML = `<i class="fa-duotone fa-arrow-down-big-small fa-rotate-270" style="--fa-primary-color:${trajColor};--fa-primary-opacity:1;--fa-secondary-color:transparent;--fa-secondary-opacity:0"></i>`;
        else
            element.innerHTML = `<i class="fa-thin fa-arrow-down-big-small fa-rotate-270" style="color:#000"></i>`;
    }

    createMotionDropDownButton(itemElement) {
        this._trajectoryColorPicker = this.createColorPickerEditor("trajectoryColor");
        this._motionDropdownElement = $('<div class="mdl-motion-selector">');
        this._motionDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Trajectory",
            buttonTemplate: (data, element) => this.renderMotionButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:10000" },
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
    }

    refreshMotionToolbarControl() {
        if (!this._motionDropdownElement)
            return;
        const buttonContentElement = this._motionDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderMotionButtonTemplate(buttonContentElement);
        if (this._trajectoryColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._trajectoryColorPicker, this.properties.trajectoryColor);
    }
}

