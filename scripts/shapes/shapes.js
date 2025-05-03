class Shapes {
    constructor(board, calculator) {
        this.board = board;
        this.calculator = calculator;
        this.shapes = [];
        this.shapeRegistry = {};
    }

    registerShape(shapeClass) {
        this.shapeRegistry[shapeClass.name] = shapeClass;
    }

    createShape(shapeType, parent, id) {
        const ShapeClass = this.shapeRegistry[shapeType];
        if (ShapeClass)
            return new ShapeClass(this.board, parent, id);
        throw new Error(`Shape type "${shapeType}" is not registered.`);
    }

    add(shape) {
        const id = shape.id.toString();
        const existingIndex = this.shapes.findIndex(s => s.id.toString() === id);
        if (existingIndex >= 0) {
            this.shapes[existingIndex] = shape;
        } else {
            this.shapes.push(shape);
        }
    }

    clear() {
        this.shapes = [];
    }

    getById(id) {
        return this.shapes.find(shape => shape.id.toString() === id) || null;
    }

    getByName(name) {
        return this.shapes.find(shape => shape.properties.name === name) || null;
    }

    remove(shape) {
        const id = shape.element.id.toString();
        this.shapes = this.shapes.filter(s => s.id.toString() !== id);
    }

    serialize() {
        return this.shapes.map(shape => shape.serialize());
    }

    deserialize(board, data) {
        const ShapeClass = this.shapeRegistry[data.type];
        if (!ShapeClass) {
            throw new Error(`Shape type "${data.type}" is not registered`);
        }
        return ShapeClass.deserialize(board, data);
    }

    update() {
        this.shapes.forEach(shape => {
            if (!shape.parent)
                shape.update();
        });
    }

    draw() {
        this.shapes.forEach(shape => {
            if (!shape.parent)
                shape.draw();
        });
    }

    getNextShape(shape) {
        const index = this.shapes.indexOf(shape);
        return index >= 0 && index < this.shapes.length - 1 ? this.shapes[index + 1] : null;
    }

    getPreviousShape(shape) {
        const index = this.shapes.indexOf(shape);
        return index > 0 ? this.shapes[index - 1] : null;
    }

    bringToFront(shape) {
        this.remove(shape);
        this.shapes.push(shape);
        this.board.svg.appendChild(shape.element);
    }

    sendToBack(shape) {
        this.remove(shape);
        this.shapes.unshift(shape);
        this.board.svg.insertBefore(shape.element, this.board.svg.firstChild);
    }

    bringForward(shape) {
        const index = this.shapes.indexOf(shape);
        if (index >= 0 && index < this.shapes.length - 1) {
            const nextShape = this.shapes[index + 1];
            this.shapes.splice(index, 1);
            this.shapes.splice(index + 1, 0, shape);
            this.board.svg.insertBefore(nextShape.element, shape.element);
        }
    }

    sendBackward(shape) {
        const index = this.shapes.indexOf(shape);
        if (index > 0) {
            const prevShape = this.shapes[index - 1];
            this.shapes.splice(index, 1);
            this.shapes.splice(index - 1, 0, shape);
            this.board.svg.insertBefore(shape.element, prevShape.element);
        }
    }
}