class ReferentialShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() { 
        return new ReferentialTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                dataField: "axisColor",
                label: { text: "Axis colors" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    onContentReady: function(e) {
                        e.component.option("items").forEach((item, index) => {
                            const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                            buttonElement.find(".dx-icon").css("color", item.color == "#00000000" ? "#cccccc" : item.color);
                        });
                    },
                    items: this.board.theme.getBackgroundColors().map(c => ({
                        icon: "fa-solid " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                        color: c.color
                    })),
                    keyExpr: "color",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.axisColor],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("axisColor", e.itemData.color);
                        this.setProperty("axisColor", e.itemData.color);
                    }
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[0].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[1].color;
        this.properties.axisColor = this.board.theme.getBackgroundColors()[4].color;
        this.properties.originX = this.properties.width / 2;
        this.properties.originY = this.properties.height / 2;
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
        this.container.setAttribute("stroke", this.properties.foregroundColor);
        this.horizontalAxis.setAttribute("x1", position.x);
        this.horizontalAxis.setAttribute("y1", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("x2", position.x + this.properties.width);
        this.horizontalAxis.setAttribute("y2", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("stroke", this.properties.axisColor);
        this.verticalAxis.setAttribute("x1", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y1", position.y);
        this.verticalAxis.setAttribute("x2", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y2", position.y + this.properties.height);
        this.verticalAxis.setAttribute("stroke", this.properties.axisColor);
    }

    getClipId() {
        return `clip-${this.id}`;
    }
}