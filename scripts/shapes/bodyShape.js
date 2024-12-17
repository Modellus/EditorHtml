class BodyShape extends BaseShape {
    constructor(calculator, properties) {
        super(calculator, properties);
        this.hasForm = true;
        this.properties.color = this.backgroundColors[1].color;
    }

    createForm() {
        return $("<div id='shape-form'></div>").dxForm({
            colCount: 1,
            onFieldDataChanged: e => this.properties[e.dataField] = e.value,
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
                            e.component.option('items').forEach((item, index) => {
                                const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                buttonElement.find(".dx-icon").css("color", item.color);
                            });
                        },
                        items: this.backgroundColors.map(c => ({
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
                            e.component.option('items').forEach((item, index) => {
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
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('fill', this.properties.color);
        return circle;
    }    

    static deserialize(calculator, data) {
        return new BodyShape(calculator, data);
    }

    update() {
        this.properties.x = this.properties.xTerm != "" ? this.calculator.getByName(this.properties.xTerm) : this.properties.x;
        this.properties.y = this.properties.yTerm != "" ? this.calculator.getByName(this.properties.yTerm) : this.properties.y; 
    }

    draw() {
        this.element.setAttribute("cx", this.properties.x + this.properties.width / 2);
        this.element.setAttribute("cy", this.properties.y + this.properties.height / 2);
        this.element.setAttribute("r", Math.min(this.properties.width, this.properties.height) / 2);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }
}