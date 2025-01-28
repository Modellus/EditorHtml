class BaseShape {
    constructor(board, calculator, parent) {
        this.id = crypto.randomUUID();
        this.board = board;
        this.calculator = calculator;
        this.parent = parent;
        this.children = [];
        if (parent != null)
            parent.children.push(this);
        this.properties = {};
        this.setDefaults();
        this.initializeElement();
    }

    setProperties(properties) {
        this.properties = {};
        Object.assign(this.properties, properties);
        this.properties.rotation = 0;
        this.properties.type = this.constructor.name;
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
        return this.properties;
    }

    static deserialize(calculator, data) {
        throw new Error('Deserialize method not implemented');
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

    createForm() {
        return null;
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    setProperty(name, value) {
        this.properties[name] = value;
        this.draw();
        this.dispatchEvent("changed", { property: name, value: value });
    }

    update() {
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
}