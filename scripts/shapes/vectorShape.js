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
        this.addTermToForm("xTerm", "Horizontal");
        this.addTermToForm("yTerm", "Vertical");
        items.push(
            {
                colSpan: 2,
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

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Vector Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.width = 30;
        this.properties.height = 30;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[1].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[1].color;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.path = this.board.createSvgElement("path");
        element.appendChild(this.path);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        element.appendChild(this.trajectory.element);
        return element;
    }    

    update() {
        super.update();
        // Property-driven updates only
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
        this.path.setAttribute("d", arrowPath);
        this.path.setAttribute("fill", this.properties.backgroundColor);
        this.path.setAttribute("stroke", this.properties.foregroundColor);
        this.path.setAttribute("stroke-width", 1);
        this.drawTrajectory();
    }

    drawTrajectory () {
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    tick() {
        super.tick();
        const calculator = this.board.calculator;
        const newW = calculator.getByName(this.properties.xTerm);
        const newH = calculator.getByName(this.properties.yTerm);
        if (newW != null) this.properties.width = newW;
        if (newH != null) this.properties.height = newH;
        this.trajectory.values = this.trajectory.values.slice(0, calculator.getLastIteration());
        if (this.trajectory.values.length <= calculator.getLastIteration()) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x + this.properties.width, y: position.y + this.properties.height });
        }
        // Maintain cached string
        if (this.trajectory.values.length < this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = this.trajectory.values.length;
        } else if (this.trajectory.values.length > this.trajectory.lastCount) {
            const newPoints = this.trajectory.values.slice(this.trajectory.lastCount)
                .map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.pointsString += (this.trajectory.pointsString && newPoints ? " " : "") + newPoints;
            this.trajectory.lastCount = this.trajectory.values.length;
        }
        this.board.markDirty(this);
    }

    getDragTermMapping() {
        // Vector uses width/height as term values, no referential scaling, no Y inversion
        return { xProp: 'width', yProp: 'height', useScale: false, invertY: false };
    }
}
