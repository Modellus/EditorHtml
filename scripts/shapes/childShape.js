class ChildShape extends BaseShape {
    static shapeIcons = {
        BodyShape: "fa-light fa-circle",
        VectorShape: "fa-light fa-arrow-right-long",
        ChartShape: "fa-light fa-chart-line",
        TableShape: "fa-light fa-table",
        SliderShape: "fa-light fa-slider",
        ValueShape: "fa-light fa-input-numeric",
        ImageShape: "fa-light fa-image",
        ExpressionShape: "fa-light fa-function",
        TextShape: "fa-light fa-quotes",
        RulerShape: "fa-light fa-ruler",
        ProtractorShape: "fa-light fa-angle",
        ReferentialShape: "fa-light fa-shapes"
    };

    setDefaults() {
        super.setDefaults();
        this.properties.parentId = this.parent?.id ?? null;
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
            icon: ChildShape.shapeIcons[shape.constructor.name] ?? "fa-light fa-shapes",
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
        const icon = (ChildShape.shapeIcons[parentShape?.constructor?.name] ?? "fa-light fa-shapes").replace("fa-light", "fa-solid");
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

    renderShapeColorButtonTemplate(element) {
        const icon = (ChildShape.shapeIcons[this.constructor.name] ?? "fa-light fa-shapes").replace("fa-light", "fa-solid");
        const fgColor = this.properties.foregroundColor ?? "";
        const borderColor = this.properties.borderColor ?? "";
        const fgStyle = fgColor ? `color:${fgColor}` : "";
        const hasBorder = borderColor && borderColor !== "transparent";
        const borderStyle = hasBorder ? `border:1px solid ${borderColor}` : "";
        element.innerHTML = `<span class="mdl-shape-color-btn" style="${borderStyle}"><i class="${icon}" style="${fgStyle}"></i></span>`;
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
                wrapperAttr: { style: "z-index:10000" },
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
        const shapeIconName = (ChildShape.shapeIcons[this.constructor.name] ?? "fa-light fa-shapes").split(" ")[1];
        const sections = [
            {
                text: "Colors",
                iconHtml: this.menuIconHtml(shapeIconName, !!fgColor),
                items: [
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

}

