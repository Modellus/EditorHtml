class VectorShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    getHandles() {
        const handleSize = 12;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return { x: position.x, y: position.y, width: this.properties.width, height: this.properties.height };
                },
                getTransform: e => ({
                    x: this.delta("x", e.dx),
                    y: this.delta("y", e.dy)
                })
            },
            {
                className: "handle tip",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    return {
                        x: position.x + this.properties.width - handleSize / 2,
                        y: position.y + this.properties.height - handleSize / 2,
                        width: handleSize,
                        height: handleSize
                    };
                },
                getTransform: e => {
                    const position = this.getBoardPosition();
                    return {
                        x: 0,
                        y: 0,
                        width: e.x - position.x,
                        height: e.y - position.y
                    };
                }
            }
        ];
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        const colorGroup = items.find(item => item.itemType === "group" && item.colCount === 3);
        if (colorGroup)
            colorGroup.items = colorGroup.items.filter(item => item.dataField !== "backgroundColor");
        items.push({
            itemType: "group",
            colCount: 2,
            items: [
                {
                    colSpan: 1,
                    dataField: "tipType",
                    label: { text: "Tip" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        items: [
                            { key: "arrow", icon: "fa-light fa-arrow-right" },
                            { key: "closed", icon: "fa-light fa-right-long" },
                            { key: "none", icon: "fa-light fa-dash" }
                        ],
                        keyExpr: "key",
                        stylingMode: "text",
                        selectedItemKeys: [this.properties.tipType],
                        onItemClick: e => {
                            let formInstance = $("#shape-form").dxForm("instance");
                            formInstance.updateData("tipType", e.itemData.key);
                            this.setProperty("tipType", e.itemData.key);
                        }
                    }
                },
                {
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
                }
            ]
        });
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
        this.properties.foregroundColor = "#000000";
        this.properties.borderColor = "transparent";
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.lineWidth = 1;
        this.properties.tipType = "arrow";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.defs = this.board.createSvgElement("defs");
        element.appendChild(this.defs);
        this.borderLine = this.board.createSvgElement("line");
        element.appendChild(this.borderLine);
        this.line = this.board.createSvgElement("line");
        element.appendChild(this.line);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        element.appendChild(this.trajectory.element);
        return element;
    }    

    update() {
        super.update();
    }

    getMarkerId() {
        return `vector-marker-${this.id}`;
    }

    buildMarker() {
        const tipType = this.properties.tipType;
        const lineWidth = this.properties.lineWidth ?? 1;
        const color = this.properties.foregroundColor;
        const borderColor = this.getBorderColor();
        const markerId = this.getMarkerId();
        const borderMarkerId = markerId + "-border";
        if (tipType === "none")
            return "";
        const size = Math.max(8, lineWidth * 3);
        const spread = tipType === "arrow" ? size * 0.7 : size * 0.5;
        const half = spread;
        const markerWidth = size + lineWidth;
        const markerHeight = half * 2 + lineWidth;
        const refX = size + lineWidth / 2;
        const refY = half + lineWidth / 2;
        const ox = lineWidth / 2;
        const oy = lineWidth / 2;
        if (tipType === "closed")
            return `<marker id="${borderMarkerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polygon points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="${borderColor}" stroke="${borderColor}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker><marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polygon points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="${color}" stroke="none"/></marker>`;
        return `<marker id="${borderMarkerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polyline points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="none" stroke="${borderColor}" stroke-width="${lineWidth + 2}" stroke-linejoin="round"/></marker><marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="auto" markerUnits="userSpaceOnUse"><polyline points="${ox} ${oy}, ${size + ox} ${half + oy}, ${ox} ${markerHeight - oy}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker>`;
    }

    draw() {
        super.draw();
        const lineWidth = this.properties.lineWidth ?? 1;
        const position = this.getBoardPosition();
        const startX = position.x;
        const startY = position.y;
        const tipX = this.properties.width + startX;
        const tipY = this.properties.height + startY;
        const color = this.properties.foregroundColor;
        const borderColor = this.getBorderColor();
        this.defs.innerHTML = this.buildMarker();
        this.borderLine.setAttribute("x1", startX);
        this.borderLine.setAttribute("y1", startY);
        this.borderLine.setAttribute("x2", tipX);
        this.borderLine.setAttribute("y2", tipY);
        this.borderLine.setAttribute("stroke", borderColor);
        this.borderLine.setAttribute("stroke-width", lineWidth + 2);
        this.line.setAttribute("x1", startX);
        this.line.setAttribute("y1", startY);
        this.line.setAttribute("x2", tipX);
        this.line.setAttribute("y2", tipY);
        this.line.setAttribute("stroke", color);
        this.line.setAttribute("stroke-width", lineWidth);
        if (this.properties.tipType !== "none") {
            this.borderLine.setAttribute("marker-end", `url(#${this.getMarkerId()}-border)`);
            this.line.setAttribute("marker-end", `url(#${this.getMarkerId()})`);
        } else {
            this.borderLine.removeAttribute("marker-end");
            this.line.removeAttribute("marker-end");
        }
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
