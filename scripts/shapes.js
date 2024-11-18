class Shapes {
    constructor() {
        this.lastId = 0;
        this.shapes = new Map();
        this.shapeRegistry = {};
    }

    registerShape(shapeClass) {
        this.shapeRegistry[shapeClass.name] = shapeClass;
    }

    createShape(shapeType, properties) {
        const ShapeClass = this.shapeRegistry[shapeType];
        if (ShapeClass)
            return new ShapeClass(properties);
        throw new Error(`Shape type "${shapeType}" is not registered.`);
    }

    addShape(shape) {
        var id = this.getNextId();
        shape.element.id = id;
        this.shapes.set(id.toString(), shape);
    }

    clear() {
        this.shapes.clear();
        this.lastId = 0;
    }

    getNextId() {
        this.lastId++;
        return this.lastId;
    }

    getShape(id) {
        return this.shapes.get(id);
    }

    remove(shape) {
        this.shapes.delete(shape.element.id);
    }

    serialize() {
        const data = [];
        this.shapes.forEach(shape => data.push(shape.serialize()));
        return JSON.stringify(data);
    }

    deserialize(data) {
        const ShapeClass = this.shapeRegistry[data.type];
        if (!ShapeClass) {
            throw new Error(`Shape type "${type}" is not registered`);
        }
        return ShapeClass.deserialize(data);
    }
}   