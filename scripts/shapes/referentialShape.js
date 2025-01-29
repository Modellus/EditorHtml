class ReferentialShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
        this.hasForm = true;
        this.properties.color = this.board.theme.getStrokeColors()[1].color;
        this.properties.originX = this.properties.width / 2;
        this.properties.originY = this.properties.height / 2;
    }

    createTransformer() { 
        return new ReferentialTransformer(this.board, this);
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

    setDefaults() {
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.color = this.board.theme.getStrokeColors()[0].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[5].color;
    }

    createElement() {
        const g = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("rect");
        this.container.setAttribute("stroke-width", 1);
        g.appendChild(this.container);
        this.horizontalAxis = this.board.createSvgElement("line");
        this.horizontalAxis.setAttribute("stroke-width", 1);
        g.appendChild(this.horizontalAxis);
        this.verticalAxis = this.board.createSvgElement("line");
        this.verticalAxis.setAttribute("stroke-width", 1);
        g.appendChild(this.verticalAxis);
        const defs = this.board.createSvgElement("defs");
        g.appendChild(defs);
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", this.getClipId());
        defs.appendChild(clipPath);
        this.containerClip = this.board.createSvgElement("rect");
        clipPath.appendChild(this.containerClip);
        return g;
    }    

    update() {
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", this.properties.width);
        this.container.setAttribute("height", this.properties.height);
        this.container.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + this.properties.width / 2}, 
            ${position.y + this.properties.height / 2})`);
        this.containerClip.setAttribute("x", position.x);
        this.containerClip.setAttribute("y", position.y);
        this.containerClip.setAttribute("width", this.properties.width);
        this.containerClip.setAttribute("height", this.properties.height);
        this.containerClip.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + this.properties.width / 2}, 
            ${position.y + this.properties.height / 2})`);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.container.setAttribute("stroke", this.properties.color);
        this.horizontalAxis.setAttribute("x1", position.x);
        this.horizontalAxis.setAttribute("y1", position.y + (this.properties.originY ?? this.properties.height / 2));
        this.horizontalAxis.setAttribute("x2", position.x + this.properties.width);
        this.horizontalAxis.setAttribute("y2", position.y + (this.properties.originY ?? this.properties.height / 2));
        this.horizontalAxis.setAttribute("stroke", this.properties.color);
        this.verticalAxis.setAttribute("x1", position.x + (this.properties.originX ?? this.properties.width / 2));
        this.verticalAxis.setAttribute("y1", position.y);
        this.verticalAxis.setAttribute("x2", position.x + (this.properties.originX ?? this.properties.width / 2));
        this.verticalAxis.setAttribute("y2", position.y + this.properties.height);
        this.verticalAxis.setAttribute("stroke", this.properties.color);
    }

    getClipId() {
        return `clip-${this.id}`;
    }
}