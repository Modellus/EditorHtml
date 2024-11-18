class BaseShape {
    constructor(properties) {
        this.properties = {};
        Object.assign(this.properties, properties);
        this.element = this.createElement();
        this.draw();
    }

    static getType() {
        throw new Error("getType should be implemented in subclasses.");
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    save() {
        return {
            type: this.constructor.name,
            properties: { ...this.properties }
        };
    }

    static load(state) {
        return shapeFactory.createShape(state.type, state.properties);
    }

    draw() {
        throw new Error("draw should be implemented in subclasses.");
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