class AddBodyCommand extends Command {
    constructor(board) {
        super();
        this.board = board;
        this.body = null;
        this.radius = this.getRandomRadius(50, 150);
        this.color = this.getRandomPastelColor();
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
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', this.board.svg.clientWidth / 2);
        circle.setAttribute('cy', this.board.svg.clientHeight / 2);
        circle.setAttribute('r', this.radius);
        circle.setAttribute('fill', this.color);
        this.board.svg.appendChild(circle);
        var data = { name: "Particle", backgroundColor: this.color, foreGroundColor: this.color, xVariable: "", yVariable: "" };
        this.body = new Shape(this.board, circle, data);
    }
    
    undo() {
        shapes.remove(this.body);
        this.board.svg.removeChild(this.body.element);
    }
}