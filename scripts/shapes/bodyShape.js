class BodyShape extends BaseShape {
    constructor(board, calculator, properties, parent) {
        super(board, calculator, properties, parent);
        this.hasForm = true;
        this.properties.color = this.board.theme.getBackgroundColors()[1].color;
        this.properties.angle = 0;
        this.properties.radius = (properties.width ** 2 + properties.height ** 2) ** 0.5;
    }

    createTransformer() { 
        return new CircleTransformer(this.board, this);
    }

    createForm() {
        return $("<div id='shape-form'></div>").dxForm({
            colCount: 1,
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
            items: [
                  {
                    dataField: "name",
                    label: { text: "Name", visible: false },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                  },
                  {
                    dataField: "backgroundColor",
                    label: { text: "Background color" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        onContentReady: function(e) {
                            e.component.option("items").forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                buttonElement.find(".dx-icon").css("color", item.color);
                            });
                        },
                        items: this.board.theme.getBackgroundColors().map(c => ({
                            icon: "fa-solid fa-square",
                            color: c.color
                        })),
                        keyExpr: "color",
                        stylingMode: "text"
                    }
                  },
                  {
                    dataField: "foregroundColor",
                    label: { text: "Foreground color" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        onContentReady: function(e) {
                            e.component.option("items").forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                buttonElement.find(".dx-icon").css("color", item.color);
                            });
                        },
                        items: this.board.theme.getStrokeColors().map(c => ({
                            icon: "fa-solid fa-square",
                            color: c.color
                        })),
                        keyExpr: "color",
                        stylingMode: "text"
                    }
                  },
                  {
                    dataField: "xTerm",
                    label: { text: "X Variable" },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                  },
                  {
                    dataField: "yTerm",
                    label: { text: "Y Variable" },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                  }
                ]
            });
    }

    createElement() {
        const circle = this.board.createSvgElement("circle");
        return circle;
    }    

    static deserialize(calculator, data) {
        return new BodyShape(calculator, data);
    }

    update() {
        var x = this.calculator.getByName(this.properties.xTerm);
        var y = this.calculator.getByName(this.properties.yTerm)
        this.properties.x = x ?? this.properties.x;
        this.properties.y = y ?? this.properties.y; 
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.element.setAttribute("cx", position.x);
        this.element.setAttribute("cy", position.y);
        this.element.setAttribute("r", this.properties.radius ?? (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5);
        this.element.setAttribute("fill", this.properties.color ?? this.board.theme.getBackgroundColors()[1].color);
    }
}