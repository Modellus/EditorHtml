class BodyShape extends BaseShape {
    constructor(properties) {
        super(properties);
    }

    static getType() {
        return "Body";
    }

    createElement() {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('fill', this.properties.color);
        return circle;
    }

    draw() {
        this.element.setAttribute("cx", this.properties.x + this.properties.width / 2);
        this.element.setAttribute("cy", this.properties.y + this.properties.height / 2);
        this.element.setAttribute("r", Math.min(this.properties.width, this.properties.height) / 2);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }
}