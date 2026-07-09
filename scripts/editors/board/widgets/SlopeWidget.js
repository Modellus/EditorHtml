class SlopeShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this._tickDragState = null;
        this._axisTickDrag = new AxisTickDrag();
        this._dragLinearSteps = { horizontal: null, vertical: null };
        this._dragAnchorValues = { horizontal: null, vertical: null };
    }

    enterEditMode() {
        return false;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Slope Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 140;
        this.properties.y = center.y - 110;
        this.properties.width = 280;
        this.properties.height = 220;
        this.properties.horizontalMinimum = 0;
        this.properties.horizontalMaximum = 10;
        this.properties.horizontalMajorTicks = 5;
        this.properties.verticalMinimum = 0;
        this.properties.verticalMaximum = 10;
        this.properties.verticalMajorTicks = 5;
        this.properties.flippedHorizontally = false;
        this.properties.flippedVertically = false;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = "#1E1E1E";
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("path");
        this.minorTicksLayer = this.board.createSvgElement("g");
        this.majorTicksLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        this.slopeLayer = this.board.createSvgElement("g");
        this.slopeLayer.setAttribute("pointer-events", "none");
        const defs = this.board.createSvgElement("defs");
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", `slope-clip-${this.id}`);
        this._clipRect = this.board.createSvgElement("rect");
        clipPath.appendChild(this._clipRect);
        defs.appendChild(clipPath);
        element.appendChild(defs);
        const clipUrl = `url(#slope-clip-${this.id})`;
        this.minorTicksLayer.setAttribute("clip-path", clipUrl);
        this.majorTicksLayer.setAttribute("clip-path", clipUrl);
        this.labelsLayer.setAttribute("clip-path", clipUrl);
        this.horizontalTickInteractionLayer = this.board.createSvgElement("g");
        this.horizontalTickInteractionLayer.setAttribute("class", "slope-export-exclude");
        this.verticalTickInteractionLayer = this.board.createSvgElement("g");
        this.verticalTickInteractionLayer.setAttribute("class", "slope-export-exclude");
        element.appendChild(this.container);
        element.appendChild(this.minorTicksLayer);
        element.appendChild(this.majorTicksLayer);
        element.appendChild(this.labelsLayer);
        element.appendChild(this.slopeLayer);
        element.appendChild(this.horizontalTickInteractionLayer);
        element.appendChild(this.verticalTickInteractionLayer);
        return element;
    }

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".slope-export-exclude").forEach(node => node.remove());
        return clone;
    }

    getAxisMinimum(axis) {
        const property = axis === "horizontal" ? "horizontalMinimum" : "verticalMinimum";
        const minimum = Number(this.properties[property]);
        return Number.isFinite(minimum) ? minimum : 0;
    }

    getAxisMaximum(axis) {
        const property = axis === "horizontal" ? "horizontalMaximum" : "verticalMaximum";
        const maximum = Number(this.properties[property]);
        return Number.isFinite(maximum) ? maximum : 10;
    }

    getAxisMajorTicksCount(axis) {
        const property = axis === "horizontal" ? "horizontalMajorTicks" : "verticalMajorTicks";
        const majorTicks = Number(this.properties[property]);
        if (!Number.isFinite(majorTicks) || majorTicks < 1)
            return 5;
        return Math.max(1, Math.round(majorTicks));
    }

    getSlopeValue() {
        const horizontalRange = this.getAxisMaximum("horizontal") - this.getAxisMinimum("horizontal");
        const verticalRange = this.getAxisMaximum("vertical") - this.getAxisMinimum("vertical");
        return verticalRange / horizontalRange;
    }

    getSlopeGeometry() {
        const position = this.getBoardPosition();
        const width = Math.max(120, Number(this.properties.width) || 120);
        const height = Math.max(120, Number(this.properties.height) || 120);
        const thickness = 48;
        const edgePadding = 18;
        const x = position.x;
        const y = position.y;
        const flippedHorizontally = this.properties.flippedHorizontally === true;
        const flippedVertically = this.properties.flippedVertically === true;
        const cornerX = flippedHorizontally ? x + width - thickness : x + thickness;
        const cornerY = flippedVertically ? y + thickness : y + height - thickness;
        const horizontalDirection = flippedHorizontally ? -1 : 1;
        const verticalDirection = flippedVertically ? 1 : -1;
        const horizontalFarX = flippedHorizontally ? x + edgePadding : x + width - edgePadding;
        const verticalFarY = flippedVertically ? y + height - edgePadding : y + edgePadding;
        const horizontalUsable = Math.max(1, Math.abs(horizontalFarX - cornerX));
        const verticalUsable = Math.max(1, Math.abs(verticalFarY - cornerY));
        const tickDirectionX = flippedHorizontally ? 1 : -1;
        const tickDirectionY = flippedVertically ? -1 : 1;
        return { x, y, width, height, thickness, cornerX, cornerY, horizontalDirection, verticalDirection, horizontalFarX, verticalFarY, horizontalUsable, verticalUsable, tickDirectionX, tickDirectionY, flippedHorizontally, flippedVertically };
    }

    getBodyOutlinePoints(geometry) {
        const { x, y, width, height, cornerX, cornerY, flippedHorizontally, flippedVertically } = geometry;
        const right = x + width;
        const bottom = y + height;
        if (!flippedHorizontally && !flippedVertically)
            return [[x, y], [cornerX, y], [cornerX, cornerY], [right, cornerY], [right, bottom], [x, bottom]];
        if (flippedHorizontally && !flippedVertically)
            return [[cornerX, y], [right, y], [right, bottom], [x, bottom], [x, cornerY], [cornerX, cornerY]];
        if (!flippedHorizontally && flippedVertically)
            return [[x, y], [right, y], [right, cornerY], [cornerX, cornerY], [cornerX, bottom], [x, bottom]];
        return [[x, y], [right, y], [right, bottom], [cornerX, bottom], [cornerX, cornerY], [x, cornerY]];
    }

    buildRoundedPath(points, radius) {
        let pathData = "";
        for (let i = 0; i < points.length; i++) {
            const previous = points[(i + points.length - 1) % points.length];
            const current = points[i];
            const next = points[(i + 1) % points.length];
            const inLength = Math.hypot(current[0] - previous[0], current[1] - previous[1]) || 1;
            const outLength = Math.hypot(next[0] - current[0], next[1] - current[1]) || 1;
            const cornerRadius = Math.min(radius, inLength / 2, outLength / 2);
            const entryX = current[0] - ((current[0] - previous[0]) / inLength) * cornerRadius;
            const entryY = current[1] - ((current[1] - previous[1]) / inLength) * cornerRadius;
            const exitX = current[0] + ((next[0] - current[0]) / outLength) * cornerRadius;
            const exitY = current[1] + ((next[1] - current[1]) / outLength) * cornerRadius;
            pathData += (i === 0 ? `M ${entryX} ${entryY}` : ` L ${entryX} ${entryY}`) + ` Q ${current[0]} ${current[1]} ${exitX} ${exitY}`;
        }
        return pathData + " Z";
    }

    drawBody(geometry) {
        this.container.setAttribute("d", this.buildRoundedPath(this.getBodyOutlinePoints(geometry), this.getBorderRadius()));
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.container.setAttribute("stroke-linejoin", "round");
        this.applyBorderStroke(this.container, 1);
    }

    getLinearTickStep(axis, minimum, maximum) {
        const dragStep = this._dragLinearSteps?.[axis];
        if (dragStep && dragStep > 0)
            return dragStep;
        return (maximum - minimum) / this.getAxisMajorTicksCount(axis);
    }

    forEachLinearMajorTick(axis, minimum, maximum, usableLength, cb) {
        const range = maximum - minimum;
        if (!(range > 0))
            return;
        const step = this.getLinearTickStep(axis, minimum, maximum);
        if (!(step > 0))
            return;
        const eps = step * 1e-6;
        let lastIndex = Math.floor((range + eps) / step);
        if (this._dragLinearSteps?.[axis])
            lastIndex = Math.min(lastIndex, 100);
        const anchorValue = this._dragAnchorValues?.[axis];
        const draggedValue = (this._dragLinearSteps?.[axis] && Number.isFinite(anchorValue)) ? anchorValue : null;
        let draggedOnGrid = false;
        for (let i = 0; i <= lastIndex; i++) {
            const value = minimum + i * step;
            if (draggedValue !== null && Math.abs(value - draggedValue) <= eps)
                draggedOnGrid = true;
            cb(value, ((value - minimum) / range) * usableLength, i, step);
        }
        if (draggedValue !== null && !draggedOnGrid && draggedValue > minimum + eps && draggedValue < maximum - eps)
            cb(draggedValue, ((draggedValue - minimum) / range) * usableLength, null, step);
    }

    addTickLine(layer, x1, y1, x2, y2, strokeWidth, strokeOpacity) {
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", this.properties.foregroundColor);
        line.setAttribute("stroke-width", strokeWidth);
        if (strokeOpacity !== undefined)
            line.setAttribute("stroke-opacity", strokeOpacity);
        layer.appendChild(line);
    }

    addTickLabel(x, y, textAnchor, textValue, rotationDegrees) {
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("text-anchor", textAnchor);
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "Katex_Main");
        label.setAttribute("font-size", "10");
        if (rotationDegrees)
            label.setAttribute("transform", `rotate(${rotationDegrees}, ${x}, ${y})`);
        label.textContent = textValue;
        this.labelsLayer.appendChild(label);
    }

    drawHorizontalTicks(geometry) {
        const minorDivisions = 10;
        const startY = geometry.cornerY + geometry.tickDirectionY;
        const minorEndY = geometry.cornerY + geometry.tickDirectionY * geometry.thickness * 0.38;
        const middleMinorEndY = geometry.cornerY + geometry.tickDirectionY * geometry.thickness * 0.48;
        const majorEndY = geometry.cornerY + geometry.tickDirectionY * geometry.thickness * 0.58;
        const labelsY = majorEndY + (geometry.tickDirectionY === 1 ? 12 : -5);
        const minimum = this.getAxisMinimum("horizontal");
        const maximum = this.getAxisMaximum("horizontal");
        const range = maximum - minimum;
        this.forEachLinearMajorTick("horizontal", minimum, maximum, geometry.horizontalUsable, (tickValue, pixelFromOrigin, i, step) => {
            const majorX = geometry.cornerX + geometry.horizontalDirection * pixelFromOrigin;
            this.addTickLine(this.majorTicksLayer, majorX, startY, majorX, majorEndY, 1.2);
            this.addTickLabel(majorX, labelsY, "middle", this.formatModelValue(tickValue));
            if (i === null)
                return;
            const minorStep = step / minorDivisions;
            for (let minorIndex = 1; minorIndex < minorDivisions; minorIndex++) {
                const minorValue = tickValue + minorIndex * minorStep;
                if (minorValue > maximum + step * 1e-6)
                    break;
                const minorPixel = ((minorValue - minimum) / range) * geometry.horizontalUsable;
                if (minorPixel >= geometry.horizontalUsable)
                    break;
                const minorX = geometry.cornerX + geometry.horizontalDirection * minorPixel;
                const isMiddleMinorTick = minorIndex === minorDivisions / 2;
                const tickEndY = isMiddleMinorTick ? middleMinorEndY : minorEndY;
                const tickWidth = isMiddleMinorTick ? 1.1 : 1;
                const tickOpacity = isMiddleMinorTick ? 0.5 : 0.25;
                this.addTickLine(this.minorTicksLayer, minorX, startY, minorX, tickEndY, tickWidth, tickOpacity);
            }
        });
    }

    drawVerticalTicks(geometry) {
        const minorDivisions = 10;
        const startX = geometry.cornerX + geometry.tickDirectionX;
        const minorEndX = geometry.cornerX + geometry.tickDirectionX * geometry.thickness * 0.38;
        const middleMinorEndX = geometry.cornerX + geometry.tickDirectionX * geometry.thickness * 0.48;
        const majorEndX = geometry.cornerX + geometry.tickDirectionX * geometry.thickness * 0.58;
        const labelsX = majorEndX + geometry.tickDirectionX * 8;
        const minimum = this.getAxisMinimum("vertical");
        const maximum = this.getAxisMaximum("vertical");
        const range = maximum - minimum;
        this.forEachLinearMajorTick("vertical", minimum, maximum, geometry.verticalUsable, (tickValue, pixelFromOrigin, i, step) => {
            const majorY = geometry.cornerY + geometry.verticalDirection * pixelFromOrigin;
            this.addTickLine(this.majorTicksLayer, startX, majorY, majorEndX, majorY, 1.2);
            this.addTickLabel(labelsX, majorY, "middle", this.formatModelValue(tickValue), -90);
            if (i === null)
                return;
            const minorStep = step / minorDivisions;
            for (let minorIndex = 1; minorIndex < minorDivisions; minorIndex++) {
                const minorValue = tickValue + minorIndex * minorStep;
                if (minorValue > maximum + step * 1e-6)
                    break;
                const minorPixel = ((minorValue - minimum) / range) * geometry.verticalUsable;
                if (minorPixel >= geometry.verticalUsable)
                    break;
                const minorY = geometry.cornerY + geometry.verticalDirection * minorPixel;
                const isMiddleMinorTick = minorIndex === minorDivisions / 2;
                const tickEndX = isMiddleMinorTick ? middleMinorEndX : minorEndX;
                const tickWidth = isMiddleMinorTick ? 1.1 : 1;
                const tickOpacity = isMiddleMinorTick ? 0.5 : 0.25;
                this.addTickLine(this.minorTicksLayer, startX, minorY, tickEndX, minorY, tickWidth, tickOpacity);
            }
        });
    }

    drawSlopeSection(geometry) {
        this.clearLayerChildren(this.slopeLayer);
        const foregroundColor = this.properties.foregroundColor;
        const startX = geometry.cornerX;
        const startY = geometry.verticalFarY;
        const endX = geometry.horizontalFarX;
        const endY = geometry.cornerY;
        const slope = this.getSlopeValue();
        const middleX = (startX + endX) / 2;
        const middleY = (startY + endY) / 2;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.hypot(deltaX, deltaY) || 1;
        const normalX = (deltaY / length) * 26;
        const normalY = (-deltaX / length) * 26;
        this.slopeLayer.insertAdjacentHTML("beforeend",
            `<polygon points="${startX},${startY} ${startX},${endY} ${endX},${endY}" fill="${foregroundColor}" fill-opacity="0.05" />` +
            Utils.crosshairLineSvgMarkup(startX, startY, startX, endY, foregroundColor) +
            Utils.crosshairLineSvgMarkup(startX, endY, endX, endY, foregroundColor) +
            `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${foregroundColor}" stroke-width="1.5" />`
        );
        const slopeLatex = this.getSlopeLatex(slope);
        this.slopeLayer.appendChild(Utils.createLatexLabel(slopeLatex, middleX + normalX, middleY + normalY, foregroundColor, 12));
    }

    getSlopeLatex(slope) {
        const verticalRange = this.getAxisMaximum("vertical") - this.getAxisMinimum("vertical");
        const horizontalRange = this.getAxisMaximum("horizontal") - this.getAxisMinimum("horizontal");
        const slopeText = this.formatModelValue(slope);
        const verticalText = this.formatModelValue(verticalRange);
        const horizontalText = this.formatModelValue(horizontalRange);
        return `${slopeText}=\\frac{${verticalText}}{${horizontalText}}`;
    }

    _getAxisTickData(axis, usableLength) {
        const ticks = [];
        const minimum = this.getAxisMinimum(axis);
        const maximum = this.getAxisMaximum(axis);
        const range = maximum - minimum;
        const minorDivisions = 10;
        this.forEachLinearMajorTick(axis, minimum, maximum, usableLength, (value, pixelFromOrigin, i, step) => {
            ticks.push({ value, pixelFromOrigin });
            if (i === null)
                return;
            const minorStep = step / minorDivisions;
            for (let j = 1; j < minorDivisions; j++) {
                const minorValue = value + j * minorStep;
                if (minorValue > maximum + step * 1e-6)
                    break;
                const minorPixel = ((minorValue - minimum) / range) * usableLength;
                if (minorPixel >= usableLength)
                    break;
                ticks.push({ value: minorValue, pixelFromOrigin: minorPixel });
            }
        });
        return ticks;
    }

    _updateAxisInteractionHandles(axis, layer, geometry) {
        const usableLength = axis === "horizontal" ? geometry.horizontalUsable : geometry.verticalUsable;
        const ticks = this._getAxisTickData(axis, usableLength);
        const hitThickness = 8;
        const hitLength = geometry.thickness * 0.58;
        while (layer.children.length > ticks.length)
            layer.removeChild(layer.lastChild);
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[i];
            let hitRect = layer.children[i];
            if (!hitRect) {
                hitRect = this.board.createSvgElement("rect");
                hitRect.setAttribute("fill", "transparent");
                hitRect.setAttribute("pointer-events", "all");
                hitRect.style.cursor = axis === "horizontal" ? "ew-resize" : "ns-resize";
                hitRect.onpointerdown = e => this.onAxisPointerDown(e, axis);
                layer.appendChild(hitRect);
            }
            if (axis === "horizontal") {
                hitRect.setAttribute("x", geometry.cornerX + geometry.horizontalDirection * tick.pixelFromOrigin - hitThickness / 2);
                hitRect.setAttribute("y", geometry.flippedVertically ? geometry.cornerY - hitLength : geometry.cornerY);
                hitRect.setAttribute("width", hitThickness);
                hitRect.setAttribute("height", hitLength);
            } else {
                hitRect.setAttribute("x", geometry.flippedHorizontally ? geometry.cornerX : geometry.cornerX - hitLength);
                hitRect.setAttribute("y", geometry.cornerY + geometry.verticalDirection * tick.pixelFromOrigin - hitThickness / 2);
                hitRect.setAttribute("width", hitLength);
                hitRect.setAttribute("height", hitThickness);
            }
            hitRect._tickValue = tick.value;
            hitRect._tickPixelFromOrigin = tick.pixelFromOrigin;
        }
    }

    onAxisPointerDown(event, axis) {
        event.stopPropagation();
        event.preventDefault();
        this._handlePending = null;
        this._handlePendingStart = null;
        this._handleActivePointerId = null;
        const hitRect = event.currentTarget || event.target;
        const grabValue = hitRect._tickValue;
        const grabPixelFromOrigin = hitRect._tickPixelFromOrigin;
        if (!(grabPixelFromOrigin >= 1))
            return;
        const geometry = this.getSlopeGeometry();
        const minimum = this.getAxisMinimum(axis);
        const maximum = this.getAxisMaximum(axis);
        const majorTicksCount = this.getAxisMajorTicksCount(axis);
        const usableLength = axis === "horizontal" ? geometry.horizontalUsable : geometry.verticalUsable;
        const maximumProperty = axis === "horizontal" ? "horizontalMaximum" : "verticalMaximum";
        const majorTicksProperty = axis === "horizontal" ? "horizontalMajorTicks" : "verticalMajorTicks";
        const svgRoot = this.board.svg;
        const element = this.element;
        const originRange = maximum - minimum;
        const tickStep = originRange / majorTicksCount;
        const started = this._axisTickDrag.start(event, {
            tickOffsetValue: grabValue - minimum,
            tickOffsetPixel: grabPixelFromOrigin,
            getPixelOffset: e => {
                const point = svgRoot.createSVGPoint();
                point.x = e.clientX;
                point.y = e.clientY;
                const localPoint = point.matrixTransform(element.getScreenCTM().inverse());
                return axis === "horizontal"
                    ? (localPoint.x - geometry.cornerX) * geometry.horizontalDirection
                    : (localPoint.y - geometry.cornerY) * geometry.verticalDirection;
            },
            onMove: scale => {
                if (!tickStep)
                    return;
                const newRange = scale * usableLength;
                if (newRange <= 0)
                    return;
                const ratio = originRange > 0 ? newRange / originRange : 1;
                const factor = niceTickStep(ratio) || 1;
                this._dragAnchorValues[axis] = grabValue;
                this._dragLinearSteps[axis] = factor * tickStep;
                this.properties[maximumProperty] = minimum + newRange;
                this.properties[majorTicksProperty] = Math.max(1, Math.min(100, Math.round(newRange / this._dragLinearSteps[axis])));
                this.board.markDirty(this);
            },
            onEnd: () => {
                const step = this._dragLinearSteps[axis];
                if (step) {
                    const count = Math.max(1, Math.round((this.properties[maximumProperty] - minimum) / step));
                    this.properties[maximumProperty] = minimum + count * step;
                    this.properties[majorTicksProperty] = count;
                    this._dragLinearSteps[axis] = null;
                    this._dragAnchorValues[axis] = null;
                }
                this._tickDragState = null;
                this.board.pointerLocked = false;
                this.dragEnd();
                this.board.markDirty(this);
            }
        });
        if (!started)
            return;
        this._tickDragState = { pointerId: event.pointerId };
        this.board.pointerLocked = true;
        this.dragStart();
    }

    draw() {
        super.draw();
        const geometry = this.getSlopeGeometry();
        this.drawBody(geometry);
        const margin = 1;
        this._clipRect.setAttribute("x", geometry.x + margin);
        this._clipRect.setAttribute("y", geometry.y + margin);
        this._clipRect.setAttribute("width", geometry.width - 2 * margin);
        this._clipRect.setAttribute("height", geometry.height - 2 * margin);
        this.clearLayerChildren(this.minorTicksLayer);
        this.clearLayerChildren(this.majorTicksLayer);
        this.clearLayerChildren(this.labelsLayer);
        this.drawHorizontalTicks(geometry);
        this.drawVerticalTicks(geometry);
        this.drawSlopeSection(geometry);
        this._updateAxisInteractionHandles("horizontal", this.horizontalTickInteractionLayer, geometry);
        this._updateAxisInteractionHandles("vertical", this.verticalTickInteractionLayer, geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}

var SlopeWidget = SlopeShape;
