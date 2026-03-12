class VectorShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new ArrowTransformer(this.board, this);
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        const colorGroup = items.find(item => item.itemType === "group" && item.colCount === 3);
        if (colorGroup) {
            colorGroup.colCount = 3;
            colorGroup.items = colorGroup.items.filter(item => item.dataField !== "backgroundColor");
            colorGroup.items.push({
                colSpan: 1,
                dataField: "lineWidth",
                label: { text: "Width" },
                editorType: "dxNumberBox",
                editorOptions: {
                    showSpinButtons: true,
                    min: 1,
                    max: 50,
                    step: 1,
                    stylingMode: "filled"
                }
            });
        }
        instance.option("items", items);
        this.addTermToForm("xTerm", "Horizontal");
        this.addTermToForm("yTerm", "Vertical");
        items = instance.option("items");
        items.push(
            this.createColorPickerFormItem("trajectoryColor", "Trajectory color")
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
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 1;
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
    }

    draw() {
        super.draw();
        const lineWidth = this.properties.lineWidth ?? 1;
        const arrowHeadSize = Math.max(5, lineWidth + 4);
        const halfWidth = lineWidth / 2;
        const position = this.getBoardPosition();
        const startX = position.x;
        const startY = position.y;
        const tipX = this.properties.width + startX;
        const tipY = this.properties.height + startY;
        const angle = Math.atan2(tipY - startY, tipX - startX);
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        const baseX = tipX - cosA * arrowHeadSize;
        const baseY = tipY - sinA * arrowHeadSize;
        const shaftStartLeftX = startX - sinA * halfWidth;
        const shaftStartLeftY = startY + cosA * halfWidth;
        const shaftStartRightX = startX + sinA * halfWidth;
        const shaftStartRightY = startY - cosA * halfWidth;
        const shaftEndLeftX = baseX - sinA * halfWidth;
        const shaftEndLeftY = baseY + cosA * halfWidth;
        const shaftEndRightX = baseX + sinA * halfWidth;
        const shaftEndRightY = baseY - cosA * halfWidth;
        const wingLeftX = baseX - sinA * (arrowHeadSize / 2);
        const wingLeftY = baseY + cosA * (arrowHeadSize / 2);
        const wingRightX = baseX + sinA * (arrowHeadSize / 2);
        const wingRightY = baseY - cosA * (arrowHeadSize / 2);
        const arrowPath = `M ${shaftStartLeftX} ${shaftStartLeftY} L ${shaftEndLeftX} ${shaftEndLeftY} L ${wingLeftX} ${wingLeftY} L ${tipX} ${tipY} L ${wingRightX} ${wingRightY} L ${shaftEndRightX} ${shaftEndRightY} L ${shaftStartRightX} ${shaftStartRightY} Z`;
        this.path.setAttribute("d", arrowPath);
        this.path.setAttribute("fill", this.properties.foregroundColor);
        this.applyBorderStroke(this.path, 1);
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
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const newW = calculator.getByName(this.properties.xTerm, xCase);
        const newH = calculator.getByName(this.properties.yTerm, yCase);
        if (newW != null) this.properties.width = newW;
        if (newH != null) this.properties.height = -newH;
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
        return { xPropertyName: 'width', yPropertyName: 'height', useScale: false, invertYAxis: false };
    }
}
