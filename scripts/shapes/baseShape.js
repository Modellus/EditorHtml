class BaseShape {
    constructor(properties) {
        this.properties = {};
        Object.assign(this.properties, properties);
        this.properties.type = this.constructor.name;
        this.element = this.createElement();
        this.draw();
    }

    serialize() {
        return this.properties;
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    static deserialize(data) {
        throw new Error('Deserialize method not implemented');
    }

    dispatchChangedEvent(detail) {
        if (this.element === undefined)
            return;
        detail.shape = this;
        const changedEvent = new CustomEvent("changed", { detail: detail });
        this.element.dispatchEvent(changedEvent);
    }

    update() {
    }

    draw() {
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
}