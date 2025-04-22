class BaseShape {
    constructor(board, parent, id) {
        this.id = id ?? crypto.randomUUID();
        this.board = board;
        this.parent = parent;
        this.children = [];
        if (parent != null)
            parent.children.push(this);
        this.properties = {};
        this.setDefaults();
        this.initializeElement();
    }

    setProperties(properties) {
        Object.assign(this.properties, properties);
    }

    setDefaults() {
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[1].color;
    }

    initializeElement() {
        this.element = this.createElement();
        this.element.setAttribute("id", this.id);
        this.element.setAttribute("clip-path", `url(#${this.getClipId()})`);
        this.draw();
    }

    getForm() {
        var form = this.createForm();
        if (form == null)
            return null;
        var instance = form.dxForm("instance");
        instance.formData = null;
        instance.updateData(this.properties);
        return form;
    };

    serialize() {
        return { type: this.constructor.name, id: this.id, parent: this.parent?.id, properties: this.properties };
    }

    static deserialize(board, data) {
        var parent = board.getShape(data.parent);
        var shape = board.createShape(data.type, parent, data.id);
        shape.setProperties(data.properties);
        return shape;
    }

    dispatchEvent(name, detail) {
        if (this.element === undefined)
            return;
        detail.shape = this;
        const event = new CustomEvent(name, { detail: detail });
        this.element.dispatchEvent(event);
    }

    createTransformer() {
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    createForm() {
        return $("<div id='shape-form'></div>").dxForm({
            colCount: 2,
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
            items: [
                  {
                    colSpan: 2,
                    dataField: "name",
                    label: { text: "Name", visible: false },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                  },
                  {
                    colSpan: 2,
                    label: { text: "Actions" },
                    editorType: "dxButton",
                    editorOptions: {
                        template: "<div class='dx-icon'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></div>",
                        onClick: _ => this.remove(),
                        stylingMode: "text"
                    }
                  },
                  {
                    colSpan: 2,
                    dataField: "backgroundColor",
                    label: { text: "Background color" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        onContentReady: function(e) {
                            e.component.option("items").forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                const color = item.color == "#00000000" ? "#cccccc" : item.color;
                                buttonElement.find(".dx-icon").css("color", color);
                                if (item.color == "#ffffff")
                                    buttonElement[0].style.setProperty("--fa-primary-color", "#000000");
                            });
                        },
                        items: this.board.theme.getBackgroundColors().map(c => ({
                            icon: "fa-duotone fa-thin " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                            color: c.color
                        })),
                        keyExpr: "color",
                        stylingMode: "text",
                        selectedItemKeys: [this.properties.backgroundColor],
                        onItemClick: e => {
                            let formInstance = $("#shape-form").dxForm("instance");
                            formInstance.updateData("backgroundColor", e.itemData.color);
                            this.setProperty("backgroundColor", e.itemData.color);
                        }
                    }
                  },
                  {
                    colSpan: 2,
                    dataField: "foregroundColor",
                    label: { text: "Color" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        onContentReady: function(e) {
                            e.component.option("items").forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                const color = item.color == "#00000000" ? "#cccccc" : item.color;
                                buttonElement.find(".dx-icon").css("color", color);
                                if (item.color == "#ffffff")
                                    buttonElement[0].style.setProperty("--fa-primary-color", "#000000");
                            });
                        },
                        items: this.board.theme.getStrokeColors().map(c => ({
                            icon: "fa-duotone fa-thin " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                            color: c.color
                        })),
                        keyExpr: "color",
                        stylingMode: "text",
                        selectedItemKeys: [this.properties.foregroundColor],
                        onItemClick: e => {
                            let formInstance = $("#shape-form").dxForm("instance");
                            formInstance.updateData("foregroundColor", e.itemData.color);
                            this.setProperty("foregroundColor", e.itemData.color);
                        }
                    }
                  },
                  {
                    visible: true,
                    colSpan: 2,
                    label: { text: "Layers" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        selectionMode: "none",
                        items: [
                            { icon: "fa-light fa-send-back", action: () => this.board.sendToBack(this) },
                            { icon: "fa-light fa-send-backward", action: () => this.board.sendBackward(this) },
                            { icon: "fa-light fa-bring-forward", action: () => this.board.bringForward(this) },
                            { icon: "fa-light fa-bring-front", action: () => this.board.bringToFront(this) }                            
                        ],
                        stylingMode: "text",
                        onItemClick: e => e.itemData.action()
                    }
                  }
                ]
            });
    }

    setProperty(name, value) {
        this.properties[name] = value;
        this.update();
        this.draw();
        this.dispatchEvent("changed", { property: name, value: value });
    }

    update() {
        this.children.forEach(child => child.update());
    }

    draw() {
        this.children.forEach(child => child.draw());
    }

    getBounds() {
        var parentBounds = this.parent?.getBounds() ?? {};
        return {
            x: this.properties.x + (parentBounds.originX ?? 0),
            y: this.properties.y + (parentBounds.originY ?? 0),
            width: this.properties.width,
            height: this.properties.height,
            originX: this.properties.x + (parentBounds.originX ?? 0) + this.properties.width / 2,
            originY: this.properties.y + (parentBounds.originY ?? 0) + this.properties.height / 2,
            rotation: this.properties.rotation + (parentBounds.rotation ?? 0)
        };
    }

    getBoardPosition() {
        const parentPosition = this.parent?.getBoardPosition() ?? { x: 0, y: 0 };
        return {
            x: this.properties.x + parentPosition.x + (this.parent?.properties.originX ?? 0),
            y: this.properties.y + parentPosition.y + (this.parent?.properties.originY ?? 0)
        };
    }

    getClipId() {
        return this.parent?.getClipId();
    }

    remove() {
        this.board.removeShape(this);
    }
}