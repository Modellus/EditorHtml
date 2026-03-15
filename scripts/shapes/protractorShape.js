class ProtractorShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                colSpan: 2,
                dataField: "scale",
                label: { text: "Scale" },
                editorType: "dxNumberBox",
                editorOptions: this.getPrecisionNumberEditorOptions({ min: 0.000001 })
            }
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Protractor Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 130;
        this.properties.y = center.y - 90;
        this.properties.width = 260;
        this.properties.height = 130;
        this.properties.scale = 1;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = "#1E1E1E";
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.ringPath = this.board.createSvgElement("path");
        this.baseLine = this.board.createSvgElement("line");
        this.minorTicksLayer = this.board.createSvgElement("g");
        this.majorTicksLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        element.appendChild(this.ringPath);
        element.appendChild(this.baseLine);
        element.appendChild(this.minorTicksLayer);
        element.appendChild(this.majorTicksLayer);
        element.appendChild(this.labelsLayer);
        return element;
    }

    normalizeScaleValue() {
        const scaleValue = Number(this.properties.scale);
        if (!Number.isFinite(scaleValue) || scaleValue <= 0)
            return 1;
        return scaleValue;
    }

    formatAngleValue(value) {
        const roundedValue = Math.round(Number(value) || 0);
        if (Object.is(roundedValue, -0))
            return "0";
        return `${roundedValue}`;
    }

    getProtractorGeometry() {
        const position = this.getBoardPosition();
        const width = Math.max(40, Number(this.properties.width) || 40);
        const height = Math.max(24, Number(this.properties.height) || 24);
        const x = position.x;
        const y = position.y;
        const centerX = x + width / 2;
        const centerY = y + height;
        const outerRadius = Math.max(10, Math.min(width / 2 - 2, height - 2));
        const innerRadius = Math.max(6, outerRadius * 0.72);
        const labelRadius = Math.max(innerRadius - 9, outerRadius * 0.58);
        return { x: x, y: y, width: width, height: height, centerX: centerX, centerY: centerY, outerRadius: outerRadius, innerRadius: innerRadius, labelRadius: labelRadius };
    }

    getArcPoint(centerX, centerY, radius, angleDegrees) {
        const radians = angleDegrees * Math.PI / 180;
        return {
            x: centerX + radius * Math.cos(radians),
            y: centerY - radius * Math.sin(radians)
        };
    }

    drawProtractorBody(geometry) {
        const leftOuter = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, 180);
        const rightOuter = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, 0);
        const rightInner = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, 0);
        const leftInner = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, 180);
        const path = [
            `M ${leftOuter.x} ${leftOuter.y}`,
            `A ${geometry.outerRadius} ${geometry.outerRadius} 0 0 1 ${rightOuter.x} ${rightOuter.y}`,
            `L ${rightInner.x} ${rightInner.y}`,
            `A ${geometry.innerRadius} ${geometry.innerRadius} 0 0 0 ${leftInner.x} ${leftInner.y}`,
            "Z"
        ].join(" ");
        this.ringPath.setAttribute("d", path);
        this.ringPath.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.ringPath, 1);
        this.baseLine.setAttribute("x1", leftOuter.x);
        this.baseLine.setAttribute("y1", leftOuter.y);
        this.baseLine.setAttribute("x2", rightOuter.x);
        this.baseLine.setAttribute("y2", rightOuter.y);
        this.baseLine.setAttribute("stroke", this.properties.foregroundColor);
        this.baseLine.setAttribute("stroke-width", "1");
    }

    addTickLine(layer, x1, y1, x2, y2, strokeWidth) {
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", this.properties.foregroundColor);
        line.setAttribute("stroke-width", strokeWidth);
        layer.appendChild(line);
    }

    addAngleLabel(x, y, textValue) {
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "Katex_Main");
        label.setAttribute("font-size", "10");
        label.textContent = textValue;
        this.labelsLayer.appendChild(label);
    }

    drawTicksAndLabels(geometry) {
        this.clearLayerChildren(this.minorTicksLayer);
        this.clearLayerChildren(this.majorTicksLayer);
        this.clearLayerChildren(this.labelsLayer);
        const scaleValue = this.normalizeScaleValue();
        for (let angle = 0; angle <= 180; angle++) {
            const isMajorTick = angle % 10 == 0;
            const isMiddleTick = !isMajorTick && angle % 5 == 0;
            const tickLength = isMajorTick ? 12 : (isMiddleTick ? 8 : 5);
            const outerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, angle);
            const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength, angle);
            this.addTickLine(isMajorTick ? this.majorTicksLayer : this.minorTicksLayer, outerPoint.x, outerPoint.y, innerPoint.x, innerPoint.y, isMajorTick ? 1.2 : 1);
            if (isMajorTick) {
                const labelPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength - 10, angle);
                this.addAngleLabel(labelPoint.x, labelPoint.y, this.formatAngleValue(angle * scaleValue));
            }
        }
    }

    draw() {
        super.draw();
        const geometry = this.getProtractorGeometry();
        this.drawProtractorBody(geometry);
        this.drawTicksAndLabels(geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}
