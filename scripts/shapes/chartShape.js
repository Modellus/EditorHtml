class ChartShape extends BaseShape {
    constructor(calculator, properties) {
        super(calculator, properties);
    }

    createElement() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.chart = $div.dxChart({
            dataSource: this.calculator.system.values,
            series: {
                argumentField: "x",
                valueField: "y",
                type: "scatter",
                color: "#ffaa66"
            },
            legend: {
                visible: false
            }
        }).dxChart("instance");
        return foreignObject;
    }

    static deserialize(data) {
        return new ChartShape(data);
    }

    update() {
        this.chart.refresh();
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }
}