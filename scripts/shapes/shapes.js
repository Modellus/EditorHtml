class Shapes {
    constructor(board, calculator) {
        this.board = board;
        this.calculator = calculator;
        this.shapes = new Map();
        this.shapeRegistry = {};
    }

    registerShapes(shapeClasses) {
        shapeClasses.forEach(shapeClass => this.shapeRegistry[shapeClass.name] = shapeClass);
    }

    createShape(shapeType, parent, id) {
        const ShapeClass = this.shapeRegistry[shapeType];
        if (ShapeClass)
            return new ShapeClass(this.board, parent, id);
        throw new Error(`Shape type "${shapeType}" is not registered.`);
    }

    add(shape) {
        this.shapes.set(shape.id.toString(), shape);
    }

    clear() {
        this.shapes.clear();
    }

    get(id) {
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

    deserialize(board, data) {
        const ShapeClass = this.shapeRegistry[data.type];
        if (!ShapeClass) {
            throw new Error(`Shape type "${type}" is not registered`);
        }
        return ShapeClass.deserialize(board, data);
    }

    update() {
        this.shapes.forEach(s => s.update());
    }

    draw() {
        this.shapes.forEach(s => s.draw());
    }
}   