class AddBodyCommand extends Command {
    constructor(svg) {
        super();
        this.svg = svg;
        this.body = null;
    }

    getRandomPastelColor() {
        const r = Math.floor((Math.random() * 127) + 127);
        const g = Math.floor((Math.random() * 127) + 127);
        const b = Math.floor((Math.random() * 127) + 127);
        return `rgb(${r},${g},${b})`;
    }
    
    getRandomRadius(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }    
    
    execute() {
        const radius = this.getRandomRadius(50, 150);
        const color = this.getRandomPastelColor();
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', this.svg.svg.clientWidth / 2);
        circle.setAttribute('cy', this.svg.svg.clientHeight / 2);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', color);
        this.svg.svg.appendChild(circle);
        var data = { name: "Particle", backgroundColor: color, foreGroundColor: color, xVariable: "", yVariable: "" };
        this.body = new Shape(this.svg, circle, data);
    }
    
    undo() {
        shapes.remove(this.body);
        this.svg.svg.removeChild(this.body.element);
    }
}