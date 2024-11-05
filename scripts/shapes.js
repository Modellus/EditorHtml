class Shapes {
    constructor() {
        this.lastId = 0;
        this.shapes = new Map();
    }

    add(shape, element) {
        var id = this.getNextId();
        element.id = id;
        this.shapes.set(id.toString(), shape);
    }

    getNextId() {
        this.lastId++;
        return this.lastId;
    }

    getShape(id) {
        return this.shapes.get(id);
    }
}

const shapes = new Shapes();