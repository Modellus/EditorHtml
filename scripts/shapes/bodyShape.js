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
            },
            {
              dataField: "trajectoryColor",
              label: { text: "Trajectory color" },
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
                  selectedItemKeys: [this.properties.trajectoryColor],
                  onItemClick: e => {
                      let formInstance = $("#shape-form").dxForm("instance");
                      formInstance.updateData("trajectoryColor", e.itemData.color);
                      this.setProperty("trajectoryColor", e.itemData.color);
                  }
              }
            }
        );
        instance.option("items", items);
        return form;
    }

    createElement() {
        const g = this.board.createSvgElement("g");
        this.circle = this.board.createSvgElement("circle");
        g.appendChild(this.circle);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [] };
        this.trajectory.element.setAttribute("fill", "none");
        g.appendChild(this.trajectory.element);
        return g;
    }    

    setDefaults() {
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.angle = 0;
        this.properties.width = 30;
        this.properties.height = 30;
        this.properties.radius = (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
        this.properties.foregroundColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
    }

    update() {
        const calculator = this.board.calculator;
        this.properties.x = calculator.getByName(this.properties.xTerm) ?? this.properties.x;
        this.properties.y = calculator.getByName(this.properties.yTerm) ?? this.properties.y; 
        var currentIteration = this.trajectory.values.length;
        this.trajectory.values = this.trajectory.values.slice(0, calculator.getLastIteration());
        if (calculator.getLastIteration() > currentIteration || calculator.getLastIteration() == 0) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x, y: position.y });
        }
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", this.properties.radius);
        this.circle.setAttribute("fill", this.properties.backgroundColor);
        this.circle.setAttribute("stroke", this.properties.foregroundColor);
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            const trajectoryPolyLine = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.element.setAttribute("points", trajectoryPolyLine);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("d");
    }
}