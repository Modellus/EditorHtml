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
        const children = (shape.children ?? [])
            .filter(child => child !== this && !this.wouldCreateCycle(child))
            .map(child => this.buildParentTreeItem(child));
        return {
            id: shape.id,
            text: shape.properties.name ?? shape.constructor.name,
            icon: ChildShape.shapeIcons[shape.constructor.name] ?? "fa-light fa-shapes",
            color: shape.properties.foregroundColor ?? null,
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

    createParentDropDownButton(itemElement) {
        let dropdownInstance;
        let treeViewInstance;
        const flatItems = () => this.flattenTreeItems(this.buildParentTreeItems(this.getReferential()));
        const treeItems = () => this.buildParentTreeItems(this.getReferential());
        $("<div>").appendTo(itemElement).dxDropDownBox({
            value: this.properties.parentId,
            valueExpr: "id",
            displayExpr: "text",
            dataSource: flatItems(),
            stylingMode: "outlined",
            width: "100%",
            showClearButton: false,
            fieldAddons: [{
                location: "before",
                template: (_, container) => {
                    const allItems = flatItems();
                    const item = allItems.find(i => i.id === this.properties.parentId) ?? null;
                    if (item?.icon) {
                        const colorStyle = item.color ? ` style="color:${item.color}"` : "";
                        container[0].insertAdjacentHTML("beforeend", `<i class="dx-icon ${item.icon}"${colorStyle}></i>`);
                    }
                }
            }],
            onInitialized: e => { dropdownInstance = e.component; this._parentDropdownInstance = e.component; },
            onOpened: () => {
                const items = treeItems();
                if (treeViewInstance)
                    treeViewInstance.option("items", items);
                dropdownInstance.option("dataSource", flatItems());
            },
            contentTemplate: () => {
                const $tree = $("<div class='mdl-parent-tree'>").dxTreeView({
                    items: treeItems(),
                    dataStructure: "tree",
                    keyExpr: "id",
                    displayExpr: "text",
                    selectionMode: "single",
                    selectByClick: true,
                    itemTemplate: (data, _, el) => {
                        const colorStyle = data.color ? ` style="color:${data.color}"` : "";
                        el[0].innerHTML = `<i class="dx-icon ${data.icon}"${colorStyle}></i>${data.text}`;
                    },
                    onItemClick: e => {
                        this.setProperty("parentId", e.itemData.id);
                        dropdownInstance.option("value", e.itemData.id);
                        dropdownInstance.close();
                    }
                });
                treeViewInstance = $tree.dxTreeView("instance");
                return $tree;
            }
        });
    }

    refreshParentToolbarControl() {
        if (!this._parentDropdownInstance)
            return;
        const flatItems = this.flattenTreeItems(this.buildParentTreeItems(this.getReferential()));
        this._parentDropdownInstance.option("dataSource", flatItems);
        this._parentDropdownInstance.option("value", this.properties.parentId);
    }

}

