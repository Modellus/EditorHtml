class Shape {
    constructor(svg, element) {
        this.svg = svg;
        var box = element.getBoundingClientRect();
        this.x = box.x;
        this.y = box.y;
        this.width = box.width;
        this.height = box.height;
        this.rotation = 0;
        this.element = element;
        this.isCircle = element.tagName.toLowerCase() === 'circle';
        shapes.add(this, element);
        this.dispatchAddShapeEvent();
    }

    dispatchAddShapeEvent() {
        const addShapeEvent = new CustomEvent("addShape", {
            detail: {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.height
            }
        });
        this.svg.svg.dispatchEvent(addShapeEvent);
    }

    draw() {
        if (this.isCircle) {
            this.element.setAttribute("cx", this.x + this.width / 2);
            this.element.setAttribute("cy", this.y + this.height / 2);
            this.element.setAttribute("r", Math.min(this.width, this.height) / 2);
            this.element.setAttribute("transform", `rotate(${this.rotation}, ${this.x + this.width / 2}, ${this.y + this.height / 2})`);
        } else {
            this.element.setAttribute("x", this.x);
            this.element.setAttribute("y", this.y);
            this.element.setAttribute("width", this.width);
            this.element.setAttribute("height", this.height);
            this.element.setAttribute("transform", `rotate(${this.rotation}, ${this.x + this.width / 2}, ${this.y + this.height / 2})`);
        }
        this.dispatchAddShapeEvent();
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.draw();
    }

    rotate(angle) {
        this.rotation = angle;
        this.draw();
    }

    move(x, y) {
        this.x = x;
        this.y = y;
        this.draw();
    }
}
