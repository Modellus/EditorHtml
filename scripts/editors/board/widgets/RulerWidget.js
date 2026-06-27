class RulerShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    enterEditMode() {
        return false;
    }

    showContextToolbar() {
        super.showContextToolbar();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Ruler Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 130;
        this.properties.y = center.y - 24;
        this.properties.width = 260;
        this.properties.height = 48;
        this.properties.minimum = 0;
        this.properties.maximum = 10;
        this.properties.majorTicks = 10;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = "#1E1E1E";
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("rect");
        this.minorTicksLayer = this.board.createSvgElement("g");
        this.majorTicksLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        const defs = this.board.createSvgElement("defs");
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", `ruler-clip-${this.id}`);
        this._clipRect = this.board.createSvgElement("rect");
        clipPath.appendChild(this._clipRect);
        defs.appendChild(clipPath);
        element.appendChild(defs);
        const clipUrl = `url(#ruler-clip-${this.id})`;
        this.minorTicksLayer.setAttribute("clip-path", clipUrl);
        this.majorTicksLayer.setAttribute("clip-path", clipUrl);
        this.labelsLayer.setAttribute("clip-path", clipUrl);
        element.appendChild(this.container);
        element.appendChild(this.minorTicksLayer);
        element.appendChild(this.majorTicksLayer);
        element.appendChild(this.labelsLayer);
        return element;
    }

    isLogarithmic() {
        return this.properties.scaleType === "logarithmic";
    }

    setScaleTypeCommand(scaleType) {
        const updates = { scaleType };
        if (scaleType === "logarithmic" && Number(this.properties.minimum) <= 0)
            updates.minimum = 1;
        const command = new SetShapePropertiesCommand(this.board, this, updates);
        this.board.invoker.execute(command);
    }

    getMajorTicksCount() {
        const majorTicks = Number(this.properties.majorTicks);
        if (!Number.isFinite(majorTicks) || majorTicks < 1)
            return 10;
        return Math.max(1, Math.round(majorTicks));
    }

    getRulerGeometry() {
        const position = this.getBoardPosition();
        const width = Math.max(10, Number(this.properties.width) || 10);
        const height = Math.max(10, Number(this.properties.height) || 10);
        const x = position.x;
        const y = position.y;
        const minimumPadding = 4;
        const preferredPadding = 18;
        const maximumPadding = Math.max(minimumPadding, (width - 2) / 2);
        const edgePadding = Math.min(preferredPadding, maximumPadding);
        const left = x + edgePadding;
        const right = x + width - edgePadding;
        const usableWidth = Math.max(1, right - left);
        return { x: x, y: y, width: width, height: height, left: left, right: right, usableWidth: usableWidth };
    }

    drawRulerBody(geometry) {
        this.container.setAttribute("x", geometry.x);
        this.container.setAttribute("y", geometry.y);
        this.container.setAttribute("width", geometry.width);
        this.container.setAttribute("height", geometry.height);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.container, 1);
    }

    addTickLine(layer, x, y1, y2, strokeWidth, strokeOpacity) {
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", this.properties.foregroundColor);
        line.setAttribute("stroke-width", strokeWidth);
        if (strokeOpacity !== undefined)
            line.setAttribute("stroke-opacity", strokeOpacity);
        layer.appendChild(line);
    }

    addTickLabel(x, y, textValue) {
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "Katex_Main");
        label.setAttribute("font-size", "11");
        label.textContent = textValue;
        this.labelsLayer.appendChild(label);
    }

    drawRulerTicks(geometry) {
        this.clearLayerChildren(this.minorTicksLayer);
        this.clearLayerChildren(this.majorTicksLayer);
        this.clearLayerChildren(this.labelsLayer);
        const topY = geometry.y + 1;
        const minorBottomY = geometry.y + geometry.height * 0.38;
        const middleMinorBottomY = geometry.y + geometry.height * 0.48;
        const majorBottomY = geometry.y + geometry.height * 0.58;
        const labelsY = majorBottomY + 12;
        if (this.isLogarithmic()) {
            this.drawLogarithmicTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY);
        } else {
            this.drawLinearTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY);
        }
    }

    drawLinearTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY) {
        const majorTicksCount = this.getMajorTicksCount();
        const majorStepPixels = geometry.usableWidth / majorTicksCount;
        const minorDivisions = 10;
        const minorStepPixels = majorStepPixels / minorDivisions;
        const minimum = Number.isFinite(Number(this.properties.minimum)) ? Number(this.properties.minimum) : 0;
        const maximum = Number.isFinite(Number(this.properties.maximum)) ? Number(this.properties.maximum) : 10;
        const range = maximum - minimum;
        for (let majorIndex = 0; majorIndex <= majorTicksCount; majorIndex++) {
            const majorX = geometry.left + majorIndex * majorStepPixels;
            const tickValue = minimum + (majorIndex * majorStepPixels / geometry.usableWidth) * range;
            this.addTickLine(this.majorTicksLayer, majorX, topY, majorBottomY, 1.2);
            this.addTickLabel(majorX, labelsY, this.formatModelValue(tickValue));
            for (let minorIndex = 1; minorIndex < minorDivisions; minorIndex++) {
                const minorX = majorX + minorIndex * minorStepPixels;
                if (minorX >= geometry.right)
                    break;
                const isMiddleMinorTick = minorIndex === minorDivisions / 2;
                const tickBottomY = isMiddleMinorTick ? middleMinorBottomY : minorBottomY;
                const tickWidth = isMiddleMinorTick ? 1.1 : 1;
                const tickOpacity = isMiddleMinorTick ? 0.5 : 0.25;
                this.addTickLine(this.minorTicksLayer, minorX, topY, tickBottomY, tickWidth, tickOpacity);
            }
        }
    }

    drawLogarithmicTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY) {
        const minimum = Number(this.properties.minimum);
        const maximum = Number(this.properties.maximum);
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum)
            return;
        const logMin = Math.log10(minimum);
        const logRange = Math.log10(maximum) - logMin;
        // getMajorTicksCount() is the number of intervals; +1 gives the tick count
        const ticks = getLogMajorTicks(minimum, maximum, this.getMajorTicksCount() + 1, geometry.usableWidth);
        if (ticks.length === 0) return;
        for (const tick of ticks) {
            const majorX = geometry.left + tick.pixelPosition;
            this.addTickLine(this.majorTicksLayer, majorX, topY, majorBottomY, 1.2);
            this.addTickLabel(majorX, labelsY, tick.label);
        }
        const level2BottomY = minorBottomY + (middleMinorBottomY - minorBottomY) * 0.5;
        const levelStyle = [
            null,
            { bottomY: middleMinorBottomY, width: 1.1, opacity: 0.50 },
            { bottomY: level2BottomY,      width: 1.0, opacity: 0.35 },
            { bottomY: minorBottomY,       width: 1.0, opacity: 0.20 },
        ];
        const minorTicks = getLogMinorTicks(ticks, minimum, maximum, geometry.usableWidth);
        for (const minor of minorTicks) {
            const style = levelStyle[minor.level] ?? levelStyle[3];
            this.addTickLine(
                this.minorTicksLayer,
                geometry.left + minor.pixelPosition, topY,
                style.bottomY, style.width, style.opacity
            );
        }
    }

    draw() {
        super.draw();
        const geometry = this.getRulerGeometry();
        this.drawRulerBody(geometry);
        const margin = 3;
        this._clipRect.setAttribute("x", geometry.x + margin);
        this._clipRect.setAttribute("y", geometry.y);
        this._clipRect.setAttribute("width", geometry.width - 2 * margin);
        this._clipRect.setAttribute("height", geometry.height);
        this.drawRulerTicks(geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}

var RulerWidget = RulerShape;
