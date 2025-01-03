class VectorShape extends BaseShape {
    constructor(board, calculator, properties, parent) {
        super(board, calculator, properties, parent);
        this.hasForm = true;
        this.properties.color = this.board.theme.getBackgroundColors()[2].color;
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
                        items: this.board.theme.backgroundColors.map(c => ({
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
                        items: this.strokeColors.map(c => ({
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
        this.properties.x = this.properties.xTerm != "" ? this.calculator.getByName(this.properties.xTerm) : this.properties.x;
        this.properties.y = this.properties.yTerm != "" ? this.calculator.getByName(this.properties.yTerm) : this.properties.y; 
    }

    draw() {
        var x1 = this.parent ? this.parent.properties.x + this.parent.properties.width / 2 : 0;
        var y1 = this.parent ? this.parent.properties.y + this.parent.properties.height / 2 : 0;
        var x2 = this.properties.x + x1;
        var y2 = this.properties.y + y1;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowheadSize = 5;
        const arrowheadX1 = x2 - arrowheadSize * Math.cos(angle - Math.PI / 6);
        const arrowheadY1 = y2 - arrowheadSize * Math.sin(angle - Math.PI / 6);
        const arrowheadX2 = x2 - arrowheadSize * Math.cos(angle + Math.PI / 6);
        const arrowheadY2 = y2 - arrowheadSize * Math.sin(angle + Math.PI / 6);
        const pathData = `M ${x1} ${y1} L ${x2} ${y2} L ${arrowheadX1} ${arrowheadY1} L ${arrowheadX2} ${arrowheadY2} L ${x2} ${y2} Z`;
        this.element.setAttribute("d", pathData);
        this.element.setAttribute("fill", this.properties.color ?? this.board.theme.getBackgroundColors()[2].color);
        this.element.setAttribute("stroke", this.properties.color ?? this.board.theme.getBackgroundColors()[2].color);
    }
}