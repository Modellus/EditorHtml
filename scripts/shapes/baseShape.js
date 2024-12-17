class BaseShape {
    constructor(calculator, properties) {
        this.strokeColors = [
            { color: "#1e1e1e"},
            { color: "#ffc9c9" },
            { color: "#b1f2ba" },
            { color: "#a4d8ff" },
            { color: "#ffec99" }
        ];
        this.backgroundColors = [
            { color: "#ebebeb"},
            { color: "#e03130" },
            { color: "#2f9e44" },
            { color: "#1871c2" },
            { color: "#f08c02" }
        ];
        this.calculator = calculator;
        this.properties = {};
        Object.assign(this.properties, properties);
        this.properties.type = this.constructor.name;
        this.element = this.createElement();
        this.draw();
        this.form = null;
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

    createForm() {
        return null;
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
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