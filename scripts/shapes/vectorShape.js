class VectorShape extends BaseShape {
    constructor(board, calculator, properties, parent) {
        super(board, calculator, properties, parent);
        this.hasForm = true;
        this.properties.color = this.board.theme.getBackgroundColors()[3].color;
    }

    createTransformer() { 
        return new ArrowTransformer(this.board, this);
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
        const path = this.board.createSvgElement("path");
        return path;
    }    

    static deserialize(calculator, data) {
        return new VectorShape(calculator, data);
    }

    update() {
        this.properties.width = this.properties.xTerm != "" ? this.calculator.getByName(this.properties.xTerm) : this.properties.width;
        this.properties.height = this.properties.yTerm != "" ? this.calculator.getByName(this.properties.yTerm) : this.properties.height; 
    }

    draw() {
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
        this.element.setAttribute("fill", this.properties.color ?? this.board.theme.getBackgroundColors()[3].color);
        this.element.setAttribute("stroke", this.properties.color ?? this.board.theme.getBackgroundColors()[3].color);
        this.element.setAttribute("stroke-width", 1);
    }
}