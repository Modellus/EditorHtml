class ProtractorShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    enterEditMode() {
        return false;
    }

    showContextToolbar() {
        const popup = this._scaleDropdownElement?.dxDropDownButton("instance")?.option("dropDownOptions");
        if (popup?.visible)
            this._scaleDropdownElement.dxDropDownButton("instance").close();
        super.showContextToolbar();
    }

    onAngleUnitChanged(previousUnit) {
        return;
    }

    getAngleUnit() {
        if (this.properties.angleUnit === "radians" || this.properties.angleUnit === "degrees")
            return this.properties.angleUnit;
        const modelAngleUnit = this.board.calculator.properties.angleUnit === "degrees" ? "degrees" : "radians";
        this.properties.angleUnit = modelAngleUnit;
        return modelAngleUnit;
    }

    setAngleUnitCommand(nextAngleUnit) {
        const currentAngleUnit = this.getAngleUnit();
        if (nextAngleUnit === currentAngleUnit)
            return;
        const storedStartAngle = Number(this.properties.startAngle) || 0;
        const storedEndAngle = Number(this.properties.endAngle) || 0;
        let convertedStartAngle = storedStartAngle;
        let convertedEndAngle = storedEndAngle;
        if (currentAngleUnit === "radians" && nextAngleUnit === "degrees") {
            convertedStartAngle = storedStartAngle * 180;
            convertedEndAngle = storedEndAngle * 180;
        }
        if (currentAngleUnit === "degrees" && nextAngleUnit === "radians") {
            convertedStartAngle = storedStartAngle / 180;
            convertedEndAngle = storedEndAngle / 180;
        }
        const command = new SetShapePropertiesCommand(this.board, this, {
            angleUnit: nextAngleUnit,
            startAngle: convertedStartAngle,
            endAngle: convertedEndAngle
        });
        this.board.invoker.execute(command);
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
        this.properties.angleUnit = this.board.calculator.properties.angleUnit === "degrees" ? "degrees" : "radians";
        this.properties.startAngle = 0;
        this.properties.endAngle = this.properties.angleUnit === "radians" ? 1 : 180;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = "#1E1E1E";
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.clipPathId = `protractor-clip-${this.id}`;
        this.clipDefs = this.board.createSvgElement("defs");
        this.clipPath = this.board.createSvgElement("clipPath");
        this.clipPath.setAttribute("id", this.clipPathId);
        this.clipShape = this.board.createSvgElement("path");
        this.clipPath.appendChild(this.clipShape);
        this.clipDefs.appendChild(this.clipPath);
        this.ringPath = this.board.createSvgElement("path");
        this.baseLine = this.board.createSvgElement("line");
        this.centerLinesLayer = this.board.createSvgElement("g");
        this.minorTicksLayer = this.board.createSvgElement("g");
        this.majorTicksLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        this.minorTicksLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        this.majorTicksLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        this.labelsLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        element.appendChild(this.clipDefs);
        element.appendChild(this.ringPath);
        element.appendChild(this.baseLine);
        element.appendChild(this.centerLinesLayer);
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

    gcd(a, b) {
        return b === 0 ? a : this.gcd(b, a % b);
    }

    formatPiFractionLatex(piMultiple) {
        const rounded = Math.round(piMultiple * 1000000) / 1000000;
        if (Math.abs(rounded) < 0.000001) return "0";
        for (const d of [1, 2, 3, 4, 6, 8, 12]) {
            const n = Math.round(rounded * d);
            if (Math.abs(n / d - rounded) < 0.0001) {
                const g = this.gcd(Math.abs(n), d);
                const sn = n / g, sd = d / g;
                if (sd === 1) return sn === 1 ? "\\pi" : sn === -1 ? "-\\pi" : `${sn}\\pi`;
                const num = sn === 1 ? "\\pi" : sn === -1 ? "-\\pi" : `${sn}\\pi`;
                return `\\frac{${num}}{${sd}}`;
            }
        }
        return this.formatAngleValue(rounded * Math.PI, 2);
    }

    formatAngleValue(value, decimalPlaces) {
        const numValue = Number(value) || 0;
        const factor = Math.pow(10, decimalPlaces ?? 0);
        const rounded = Math.round(numValue * factor) / factor;
        if (Object.is(rounded, -0))
            return "0";
        return decimalPlaces ? rounded.toFixed(decimalPlaces).replace(/\.?0+$/, "") : `${rounded}`;
    }

    getVisualSpanDegrees() {
        const startDeg = this.getStartAngleDegrees();
        const endDeg = this.getEndAngleDegrees();
        if (endDeg > startDeg)
            return endDeg - startDeg;
        return 180;
    }

    getVisualStartDegrees() {
        const startDeg = this.getStartAngleDegrees();
        const normalized = startDeg % 360;
        return normalized < 0 ? normalized + 360 : normalized;
    }

    getProtractorGeometry() {
        const position = this.getBoardPosition();
        const width = Math.max(40, Number(this.properties.width) || 40);
        const height = Math.max(24, Number(this.properties.height) || 24);
        const x = position.x;
        const y = position.y;
        const isFullCircle = this.getVisualSpanDegrees() >= 360;
        const centerX = x + width / 2;
        const centerY = isFullCircle ? y + height / 2 : y + height;
        const outerRadius = isFullCircle
            ? Math.max(10, Math.min(width / 2 - 2, height / 2 - 2))
            : Math.max(10, Math.min(width / 2 - 2, height - 2));
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
        const visualSpanDeg = this.getVisualSpanDegrees();
        if (visualSpanDeg >= 360) {
            const cx = geometry.centerX;
            const cy = geometry.centerY;
            const outerR = geometry.outerRadius;
            const innerR = geometry.innerRadius;
            const path = [
                `M ${cx - outerR} ${cy}`,
                `A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}`,
                `A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}`,
                `Z`,
                `M ${cx - innerR} ${cy}`,
                `A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}`,
                `A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}`,
                `Z`
            ].join(" ");
            this.ringPath.setAttribute("d", path);
            this.ringPath.setAttribute("fill", this.properties.backgroundColor);
            this.ringPath.setAttribute("fill-rule", "evenodd");
            this.clipShape.setAttribute("d", path);
            this.clipShape.setAttribute("fill-rule", "evenodd");
            this.applyBorderStroke(this.ringPath, 1);
            this.baseLine.setAttribute("visibility", "hidden");
        } else {
            this.ringPath.removeAttribute("fill-rule");
            const largeArc = visualSpanDeg > 180 ? 1 : 0;
            const visualStartDeg = this.getVisualStartDegrees();
            const visualEndDeg = visualStartDeg + visualSpanDeg;
            const outerArcStart = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, visualStartDeg);
            const outerArcEnd = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, visualEndDeg);
            const innerArcStart = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, visualStartDeg);
            const innerArcEnd = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, visualEndDeg);
            const path = [
                `M ${outerArcStart.x} ${outerArcStart.y}`,
                `A ${geometry.outerRadius} ${geometry.outerRadius} 0 ${largeArc} 0 ${outerArcEnd.x} ${outerArcEnd.y}`,
                `L ${innerArcEnd.x} ${innerArcEnd.y}`,
                `A ${geometry.innerRadius} ${geometry.innerRadius} 0 ${largeArc} 1 ${innerArcStart.x} ${innerArcStart.y}`,
                "Z"
            ].join(" ");
            this.ringPath.setAttribute("d", path);
            this.ringPath.setAttribute("fill", this.properties.backgroundColor);
            this.clipShape.setAttribute("d", path);
            this.clipShape.removeAttribute("fill-rule");
            this.applyBorderStroke(this.ringPath, 1);
            this.baseLine.setAttribute("visibility", "hidden");
        }
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

    containsVisualAngle(visualSpanDeg, targetAngleDeg) {
        if (visualSpanDeg >= 360)
            return true;
        return targetAngleDeg >= 0 && targetAngleDeg <= visualSpanDeg;
    }

    getRelativeAngleDegrees(visualStartDeg, absoluteAngleDeg) {
        const relative = (absoluteAngleDeg - visualStartDeg) % 360;
        return relative < 0 ? relative + 360 : relative;
    }

    pushUniqueAngle(angles, value) {
        if (angles.some(angle => Math.abs(angle - value) < 0.0001))
            return;
        angles.push(value);
    }

    drawCenterLines(geometry) {
        this.clearLayerChildren(this.centerLinesLayer);
        const visualSpanDeg = this.getVisualSpanDegrees();
        const visualStartDeg = this.getVisualStartDegrees();
        const visualEndDeg = visualStartDeg + visualSpanDeg;
        const lineAngles = [];
        this.pushUniqueAngle(lineAngles, visualStartDeg);
        this.pushUniqueAngle(lineAngles, visualEndDeg);
        for (const cardinalAngle of [0, 90, 180, 270]) {
            const relative = this.getRelativeAngleDegrees(visualStartDeg, cardinalAngle);
            if (!this.containsVisualAngle(visualSpanDeg, relative))
                continue;
            this.pushUniqueAngle(lineAngles, cardinalAngle);
        }
        for (const angle of lineAngles) {
            const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, angle);
            this.addTickLine(this.centerLinesLayer, geometry.centerX, geometry.centerY, innerPoint.x, innerPoint.y, 1);
        }
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

    addLatexAngleLabel(x, y, latex) {
        const fo = Utils.createLatexLabel(latex, x, y, this.properties.foregroundColor, 10);
        this.labelsLayer.appendChild(fo);
    }

    getStartAngleDegrees() {
        const useRadians = this.getAngleUnit() === "radians";
        const storedStart = Number(this.properties.startAngle) || 0;
        return useRadians ? storedStart * 180 : storedStart;
    }

    getEndAngleDegrees() {
        const useRadians = this.getAngleUnit() === "radians";
        const storedEnd = Number(this.properties.endAngle) || 0;
        return useRadians ? storedEnd * 180 : storedEnd;
    }

    drawTicksAndLabels(geometry) {
        this.clearLayerChildren(this.minorTicksLayer);
        this.clearLayerChildren(this.majorTicksLayer);
        this.clearLayerChildren(this.labelsLayer);
        const useRadians = this.getAngleUnit() === "radians";
        const degreeSymbol = useRadians ? "" : "\u00ba";
        const storedStart = Number(this.properties.startAngle) || 0;
        const storedEnd = Number(this.properties.endAngle) || 0;
        const visualSpanDeg = this.getVisualSpanDegrees();
        const totalStored = storedEnd > storedStart ? storedEnd - storedStart : (useRadians ? 1 : 180);
        const isFullCircle = visualSpanDeg >= 360;
        const visualStartDeg = this.getVisualStartDegrees();
        const tickUpperBound = isFullCircle ? 359 : Math.round(visualSpanDeg);
        for (let angle = 0; angle <= tickUpperBound; angle++) {
            const isMajorTick = angle % 10 == 0;
            const isMiddleTick = !isMajorTick && angle % 5 == 0;
            const tickLength = isMajorTick ? 12 : (isMiddleTick ? 8 : 5);
            const visualAngle = visualStartDeg + angle;
            const outerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, visualAngle);
            const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength, visualAngle);
            this.addTickLine(isMajorTick ? this.majorTicksLayer : this.minorTicksLayer, outerPoint.x, outerPoint.y, innerPoint.x, innerPoint.y, isMajorTick ? 1.2 : 1);
            if (isMajorTick) {
                const labelPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength - 16, visualAngle);
                const mappedAngleValue = storedStart + (angle / visualSpanDeg) * totalStored;
                if (useRadians) {
                    this.addLatexAngleLabel(labelPoint.x, labelPoint.y, this.formatPiFractionLatex(mappedAngleValue));
                } else {
                    this.addAngleLabel(labelPoint.x, labelPoint.y, this.formatAngleValue(mappedAngleValue, 0) + degreeSymbol);
                }
            }
        }
    }

    draw() {
        super.draw();
        const geometry = this.getProtractorGeometry();
        this.drawProtractorBody(geometry);
        this.drawCenterLines(geometry);
        this.drawTicksAndLabels(geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}

var ProtractorWidget = ProtractorShape;
