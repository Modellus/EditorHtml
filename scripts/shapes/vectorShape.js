class VectorShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new ArrowTransformer(this.board, this);
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

    setDefaults() {
        this.properties.name = this.board.translations.get("Vector Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.width = 30;
        this.properties.height = 30;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[0].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[1].color;
    }

    createElement() {
        const path = this.board.createSvgElement("path");
        return path;
    }    

    update() {
        super.update();
        this.properties.width = this.properties.xTerm != "" ? this.board.calculator.getByName(this.properties.xTerm) : this.properties.width;
        this.properties.height = this.properties.yTerm != "" ? this.board.calculator.getByName(this.properties.yTerm) : this.properties.height; 
    }

    draw() {
        super.draw();
        const arrowHeadSize = 5;
        const position = this.getBoardPosition();
        const startX = position.x;
        const startY = position.y;
        const tipX = this.properties.width + startX;
        const tipY = this.properties.height + startY;
        const angle = Math.atan2(tipY - startY, tipX - startX);
        const baseX = tipX - Math.cos(angle) * arrowHeadSize;
        const baseY = tipY - Math.sin(angle) * arrowHeadSize;
        const leftX = baseX - Math.sin(angle) * (arrowHeadSize / 2);
        const leftY = baseY + Math.cos(angle) * (arrowHeadSize / 2);
        const rightX = baseX + Math.sin(angle) * (arrowHeadSize / 2);
        const rightY = baseY - Math.cos(angle) * (arrowHeadSize / 2);
        const arrowPath = `
            M ${startX} ${startY} L ${tipX} ${tipY}
            L ${leftX} ${leftY} L ${rightX} ${rightY} L ${tipX} ${tipY} Z
        `;
        this.element.setAttribute("d", arrowPath);
        this.element.setAttribute("fill", this.properties.backgroundColor);
        this.element.setAttribute("stroke", this.properties.foregroundColor);
        this.element.setAttribute("stroke-width", 1);
    }
}