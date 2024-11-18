class Shapes {
    constructor() {
        this.lastId = 0;
        this.shapes = new Map();
        this.shapeRegistry = {};
    }

    registerShape(shapeClass) {
        this.shapeRegistry[shapeClass.getType()] = shapeClass;
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
}   