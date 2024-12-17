class TableShape extends BaseShape {
    constructor(calculator, properties) {
        super(calculator, properties);
    }

    createElement() {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.dataGrid = $div.dxDataGrid({
            dataSource: this.calculator.system.values,
            scrolling: {
                mode: "virtual"
            },
            columns: [
                {
                    dataField: "x",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    dataField: "y",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    dataField: "z",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                }
            ]
        }).dxDataGrid("instance");
        return foreignObject;
    }

    static deserialize(calculator, data) {
        return new TableShape(calculator, data);
    }

    update() {
        this.dataGrid.refresh();
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