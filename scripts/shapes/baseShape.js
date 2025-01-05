class BaseShape {
    constructor(board, calculator, properties, parent) {
        this.board = board;
        this.calculator = calculator;
        this.properties = {};
        this.parent = parent;
        this.children = [];
        if (parent !== undefined)
            parent.children.push(this);
        Object.assign(this.properties, properties);
        this.properties.type = this.constructor.name;
        this.element = this.createElement();
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

    dispatchChangedEvent(detail) {
        if (this.element === undefined)
            return;
        detail.shape = this;
        const changedEvent = new CustomEvent("changed", { detail: detail });
        this.element.dispatchEvent(changedEvent);
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
        this.dispatchChangedEvent({ property: name, value: value });
    }

    update() {
    }

    draw() {
        this.children.forEach(child => child.draw());
    }

    resize(width, height) {
        this.properties.width = width;
        this.properties.height = height;
        this.draw();
    }

    rotate(angle) {
        this.properties.rotation = angle;
        this.draw();
    }

    move(x, y) {
        this.properties.x = x;
        this.properties.y = y;
        this.draw();
    }

    getBounds() {
        var parentBounds = this.parent !== undefined ? this.parent.getBounds() : { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
        return {
            x: this.properties.x + parentBounds.x,
            y: this.properties.y + parentBounds.y,
            width: this.properties.width + parentBounds.width,
            height: this.properties.height + parentBounds.height,
            rotation: this.properties.rotation + parentBounds.rotation
        };
    }

    getBoardPosition() {
        return {
            x: this.properties.x + (this.parent ? this.parent.properties.x + this.parent.properties.width / 2 : 0),
            y: this.properties.y + (this.parent ? this.parent.properties.y + this.parent.properties.height / 2 : 0)
        };
    }
}