class BodyShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new CircleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                dataField: "xTerm",
                label: { text: "Horizontal Variable" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            },
            {
                dataField: "yTerm",
                label: { text: "Vertical Variable" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    createElement() {
        const circle = this.board.createSvgElement("circle");
        return circle;
    }    

    setDefaults() {
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.angle = 0;
        this.properties.width = 30;
        this.properties.height = 30;
        this.properties.radius = (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[1].color;
        this.properties.foregroundColor = this.board.theme.getBackgroundColors()[1].color;
    }

    update() {
        var x = this.board.calculator.getByName(this.properties.xTerm);
        var y = this.board.calculator.getByName(this.properties.yTerm)
        this.properties.x = x ?? this.properties.x;
        this.properties.y = y ?? this.properties.y; 
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.element.setAttribute("cx", position.x);
        this.element.setAttribute("cy", position.y);
        this.element.setAttribute("r", this.properties.radius);
        this.element.setAttribute("fill", this.properties.backgroundColor);
        this.element.setAttribute("stroke", this.properties.foregroundColor);
    }
}