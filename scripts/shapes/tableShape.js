class TableShape extends BaseShape {
    constructor(board, calculator, properties) {
        super(board, calculator, properties);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.dataGrid = $div.dxDataGrid({
            dataSource: this.calculator.system.values,
            scrolling: {
                mode: "virtual"
            },
            showBorders: true,
            columns: [
                {
                    dataField: "x",
                    caption: "x",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    dataField: "y",
                    caption: "y",
                    format: {
                        type: "fixedPoint",
                        precision: 2
                    }
                },
                {
                    dataField: "z",
                    caption: "z",
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