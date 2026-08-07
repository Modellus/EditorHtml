class GaugeShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    enterEditMode() {
        return false;
    }

    getHandles() {
        const handleSize = 14;
        const handles = super.getHandles();
        handles.push({
            className: "handle gauge-pointer",
            getAttributes: () => {
                const point = this.getPointerBoardPoint();
                return {
                    x: point.x - handleSize / 2,
                    y: point.y - handleSize / 2,
                    width: handleSize,
                    height: handleSize
                };
            },
            getTransform: event => ({
                pointerDrag: { x: event.x, y: event.y }
            })
        });
        return handles;
    }

    transformShape(transform) {
        if (transform.pointerDrag != null) {
            this.applyPointerDrag(transform.pointerDrag);
            return;
        }
        super.transformShape(transform);
    }

    isPointerDraggable() {
        if (this.isTermLocked("term"))
            return false;
        const term = this.properties.term;
        if (!term || !this.board.calculator.isTerm(term))
            return true;
        return this.board.calculator.isEditable(term);
    }

    isHandleDragAllowed(handle) {
        if (handle?.classList.contains("gauge-pointer"))
            return super.isHandleDragAllowed(handle) && this.isPointerDraggable();
        return super.isHandleDragAllowed(handle);
    }

    updateHandles() {
        super.updateHandles();
        const pointerHandle = this.handleElements?.find(handle => handle.classList.contains("gauge-pointer"));
        if (pointerHandle)
            pointerHandle.style.pointerEvents = this.isPointerDraggable() ? "" : "none";
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Gauge Name");
        const center = this.board.getClientCenter();
        this.properties.x = center.x - 90;
        this.properties.y = center.y - 90;
        this.properties.width = 180;
        this.properties.height = 180;
        this.properties.term = this.board.calculator.getDefaultTerm();
        this.properties.value = 0;
        this.properties.autoScale = true;
        this.properties.minimum = 0;
        this.properties.maximum = 10;
        this.properties.precision = 1;
        this.properties.snapToTick = false;
        this.properties.startAngle = 225;
        this.properties.endAngle = -45;
        this.properties.ranges = [{ minimum: this.properties.minimum, maximum: this.properties.maximum, color: "transparent" }, { minimum: null, maximum: null, color: "transparent" }];
        this.properties.backgroundColor = "#f7f7f7";
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
    }

    showContextToolbar() {
        this.termFormControls["term"]?.termControl?.refresh();
        this.refreshTermsToolbarControl();
        this.refreshGaugeSettingsToolbarControl();
        this.refreshGaugeScaleControls();
        super.showContextToolbar();
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Value", buildControl: $container => $container.append(this._termControl) });
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? this.createNameButtonTermMarkup(term, this.properties.term)
            : `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Value</span></span>`;
    }

    refreshGaugeSettingsToolbarControl() {
        this._gaugeRangesListInstance?.option("dataSource", this.properties.ranges);
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.hitArea = this.board.createSvgElement("rect");
        this.hitArea.setAttribute("fill", "transparent");
        this.hitArea.setAttribute("stroke", "none");
        this.hitArea.setAttribute("pointer-events", "all");
        element.appendChild(this.hitArea);
        this.gaugeBg = this.board.createSvgElement("path");
        this.rangeLayer = this.board.createSvgElement("g");
        this.tickLayer = this.board.createSvgElement("g");
        this.labelLayer = this.board.createSvgElement("g");
        this.pointerLine = this.board.createSvgElement("line");
        this.hubCircle = this.board.createSvgElement("circle");
        this.crosshairLayer = this.board.createSvgElement("g");
        this.crosshairLayer.setAttribute("pointer-events", "none");
        this.crosshairLayer.setAttribute("class", "gauge-export-exclude");
        element.appendChild(this.gaugeBg);
        element.appendChild(this.rangeLayer);
        element.appendChild(this.tickLayer);
        element.appendChild(this.labelLayer);
        element.appendChild(this.pointerLine);
        element.appendChild(this.hubCircle);
        element.appendChild(this.crosshairLayer);
        element.addEventListener("pointermove", e => this.onGaugePointerMove(e));
        element.addEventListener("pointerleave", () => this.clearLayerChildren(this.crosshairLayer));
        return element;
    }

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".gauge-export-exclude").forEach(node => node.remove());
        return clone;
    }

    getGaugeGeometry() {
        const width = Math.max(40, Number(this.properties.width) || 40);
        const height = Math.max(40, Number(this.properties.height) || 40);
        const centerX = width / 2;
        const centerY = height / 2;
        const maximumRadius = Math.min(centerX, centerY);
        const outerRadius = Math.max(10, maximumRadius - 4);
        const innerRadius = Math.max(8, outerRadius - 10);
        const hubRadius = Math.max(4, Math.min(outerRadius * 0.1, 8));
        const needleRadius = Math.max(hubRadius + 4, innerRadius - 6);
        const labelRadius = Math.max(hubRadius + 12, innerRadius - 19);
        return { width, height, centerX, centerY, outerRadius, innerRadius, hubRadius, needleRadius, labelRadius };
    }

    // The label layer lives inside the shape element, so the anchor is in the
    // gauge's own frame: just below the hub circle at the base of the needle.
    getTermLabelAnchor() {
        const geometry = this.getGaugeGeometry();
        return { x: geometry.centerX, y: geometry.centerY + geometry.hubRadius + 12, anchor: "middle" };
    }

    getTermEntryLabelColor(entry, index) {
        return this.properties.foregroundColor;
    }

    getGaugeValue() {
        const term = this.properties.term;
        if (term && this.board.calculator.isTerm(term))
            return this.board.calculator.getByName(term, this.getTermCaseNumber("termCase"));
        return this.properties.value;
    }

    getConfiguredGaugeRange() {
        return { minimum: this.properties.minimum, maximum: this.properties.maximum };
    }

    getObservedGaugeRange() {
        const term = this.properties.term;
        if (!term || !this.board.calculator.isTerm(term))
            return this.getConfiguredGaugeRange();
        const caseNumber = this.getTermCaseNumber("termCase");
        const values = this.board.calculator.system.values;
        let minimum = Number.POSITIVE_INFINITY;
        let maximum = Number.NEGATIVE_INFINITY;
        for (let index = 0; index < values.length; index++) {
            const iterationValues = values[index];
            if ((iterationValues.case ?? 1) !== caseNumber)
                continue;
            const value = iterationValues[term];
            if (!Number.isFinite(value))
                continue;
            minimum = Math.min(minimum, value);
            maximum = Math.max(maximum, value);
        }
        const currentValue = this.getGaugeValue();
        if (Number.isFinite(currentValue)) {
            minimum = Math.min(minimum, currentValue);
            maximum = Math.max(maximum, currentValue);
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
            return this.getConfiguredGaugeRange();
        if (minimum === maximum) {
            const margin = Math.max(Math.abs(minimum) * 0.1, 1);
            return { minimum: minimum - margin, maximum: maximum + margin };
        }
        return { minimum, maximum };
    }

    getGaugeRange() {
        return this.properties.autoScale === true ? this.getObservedGaugeRange() : this.getConfiguredGaugeRange();
    }

    getGaugeSpan() {
        return ((this.properties.startAngle - this.properties.endAngle) % 360 + 360) % 360 || 360;
    }

    clampGaugeValue(value, range) {
        return Math.max(range.minimum, Math.min(range.maximum, value));
    }

    getGaugeValueRatio(value, range) {
        if (range.minimum === range.maximum)
            return 0;
        return (this.clampGaugeValue(value, range) - range.minimum) / (range.maximum - range.minimum);
    }

    getPointerVisualAngleDeg() {
        const range = this.getGaugeRange();
        return this.properties.startAngle - this.getGaugeValueRatio(this.getGaugeValue(), range) * this.getGaugeSpan();
    }

    getPointerLocalPoint() {
        const geometry = this.getGaugeGeometry();
        const radians = this.getPointerVisualAngleDeg() * Math.PI / 180;
        return {
            x: geometry.centerX + geometry.needleRadius * Math.cos(radians),
            y: geometry.centerY - geometry.needleRadius * Math.sin(radians)
        };
    }

    getPointerBoardPoint() {
        const position = this.getBoardPosition();
        const geometry = this.getGaugeGeometry();
        const localPoint = this.getPointerLocalPoint();
        const mirrored = this.mirrorBoardPoint({ x: position.x + localPoint.x, y: position.y + localPoint.y });
        const rotation = Number(this.properties.rotation) || 0;
        if (Math.abs(rotation) < 0.00001)
            return mirrored;
        const boardCenterX = position.x + geometry.centerX;
        const boardCenterY = position.y + geometry.centerY;
        return this.rotatePointAroundCenter(mirrored.x, mirrored.y, boardCenterX, boardCenterY, rotation);
    }

    clampToGaugeAngle(angleDegrees) {
        const span = this.getGaugeSpan();
        const offset = ((this.properties.startAngle - angleDegrees) % 360 + 360) % 360;
        if (offset <= span)
            return angleDegrees;
        const distanceToEnd = offset - span;
        const distanceToStart = (360 - offset) % 360;
        return distanceToEnd <= distanceToStart ? this.properties.endAngle : this.properties.startAngle;
    }

    snapGaugeValue(value) {
        if (!this.properties.snapToTick)
            return value;
        if (this.properties.precision <= 0)
            return value;
        return Math.round(value / this.properties.precision) * this.properties.precision;
    }

    applyPointerDrag({ x, y }) {
        const geometry = this.getGaugeGeometry();
        const position = this.getBoardPosition();
        const boardCenterX = position.x + geometry.centerX;
        const boardCenterY = position.y + geometry.centerY;
        const localPoint = this.getLocalPointFromBoardPoint({ x, y });
        const localX = localPoint.x - boardCenterX;
        const localY = localPoint.y - boardCenterY;
        const angleDegrees = this.clampToGaugeAngle(Math.atan2(-localY, localX) * 180 / Math.PI);
        const range = this.getGaugeRange();
        this.setGaugeValue(this.getGaugeValueAtAngle(angleDegrees, range));
    }

    getGaugeValueAtAngle(angleDegrees, range) {
        const angleOffset = ((this.properties.startAngle - angleDegrees) % 360 + 360) % 360;
        const ratio = Math.max(0, Math.min(1, angleOffset / this.getGaugeSpan()));
        const value = this.snapGaugeValue(range.minimum + ratio * (range.maximum - range.minimum));
        return this.clampGaugeValue(value, range);
    }

    setGaugeValue(value) {
        if (!this.isPointerDraggable())
            return;
        const term = this.properties.term;
        if (!term || !this.board.calculator.isTerm(term)) {
            this.properties.value = value;
            this.board.markDirty(this);
            return;
        }
        const caseNumber = this.getTermCaseNumber("termCase");
        this.board.calculator.setTermValue(term, value, this.board.calculator.getIteration(), caseNumber);
        this.board.calculator.calculate();
    }

    getArcPoint(centerX, centerY, radius, angleDegrees) {
        return BlockGeometry.polarPoint(centerX, centerY, radius, angleDegrees);
    }

    buildAnnularSectorPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle) {
        return BlockGeometry.annularSectorPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle);
    }

    addGaugeTick(value, isEndpoint, geometry, range) {
        const ratio = this.getGaugeValueRatio(value, range);
        const angleDegrees = this.properties.startAngle - ratio * this.getGaugeSpan();
        const tickLength = isEndpoint ? 9 : 6;
        const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius - tickLength, angleDegrees);
        const outerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius - 2, angleDegrees);
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", innerPoint.x);
        line.setAttribute("y1", innerPoint.y);
        line.setAttribute("x2", outerPoint.x);
        line.setAttribute("y2", outerPoint.y);
        line.setAttribute("stroke", this.properties.foregroundColor);
        line.setAttribute("stroke-width", isEndpoint ? 1.5 : 1);
        this.tickLayer.appendChild(line);
        return angleDegrees;
    }

    formatGaugeValue(value) {
        const rounded = parseFloat(value.toFixed(2));
        const rawValue = Object.is(rounded, -0) || rounded === 0 ? "0" : rounded.toString();
        return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    addGaugeLabel(value, angleDegrees, geometry) {
        const point = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.labelRadius, angleDegrees);
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", point.x);
        label.setAttribute("y", point.y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "KaTeX_Main");
        label.setAttribute("font-size", "8.5");
        label.textContent = this.formatGaugeValue(value);
        this.labelLayer.appendChild(label);
    }

    drawGaugeTicks(geometry, range) {
        this.clearLayerChildren(this.tickLayer);
        this.clearLayerChildren(this.labelLayer);
        if (this.properties.precision <= 0)
            return;
        const tickCount = Math.floor((range.maximum - range.minimum) / this.properties.precision);
        if (tickCount > 200)
            return;
        for (let index = 0; index <= tickCount; index++) {
            const value = range.minimum + index * this.properties.precision;
            const isEndpoint = index === 0 || index === tickCount;
            const angleDegrees = this.addGaugeTick(value, isEndpoint, geometry, range);
            if (tickCount <= 12)
                this.addGaugeLabel(value, angleDegrees, geometry);
        }
        const lastValue = range.minimum + tickCount * this.properties.precision;
        if (lastValue < range.maximum) {
            const angleDegrees = this.addGaugeTick(range.maximum, true, geometry, range);
            if (tickCount < 12)
                this.addGaugeLabel(range.maximum, angleDegrees, geometry);
        }
    }

    drawGaugeRanges(geometry, range) {
        this.clearLayerChildren(this.rangeLayer);
        for (let index = 0; index < this.properties.ranges.length; index++) {
            const colorRange = this.properties.ranges[index];
            if (colorRange.minimum == null || colorRange.maximum == null)
                continue;
            const colorRangeMinimum = Math.min(colorRange.minimum, colorRange.maximum);
            const colorRangeMaximum = Math.max(colorRange.minimum, colorRange.maximum);
            const rangeMinimum = Math.max(range.minimum, colorRangeMinimum);
            const rangeMaximum = Math.min(range.maximum, colorRangeMaximum);
            if (rangeMaximum <= rangeMinimum)
                continue;
            const startRatio = this.getGaugeValueRatio(rangeMinimum, range);
            const endRatio = this.getGaugeValueRatio(rangeMaximum, range);
            const startAngle = this.properties.startAngle - startRatio * this.getGaugeSpan();
            const endAngle = this.properties.startAngle - endRatio * this.getGaugeSpan();
            const path = this.board.createSvgElement("path");
            path.setAttribute("d", this.buildAnnularSectorPath(geometry.centerX, geometry.centerY, geometry.innerRadius, geometry.outerRadius, startAngle, endAngle));
            path.setAttribute("fill", colorRange.color);
            path.setAttribute("stroke", "none");
            this.rangeLayer.appendChild(path);
        }
    }

    // The pointer position is read in the gauge's own frame, so the rotation and
    // the mirror of the shape element are already undone by the screen matrix.
    getGaugeLocalPointerPoint(event) {
        const svgPoint = this.board.svg.createSVGPoint();
        svgPoint.x = event.clientX;
        svgPoint.y = event.clientY;
        return svgPoint.matrixTransform(this.element.getScreenCTM().inverse());
    }

    onGaugePointerMove(event) {
        const geometry = this.getGaugeGeometry();
        const localPoint = this.getGaugeLocalPointerPoint(event);
        const localX = localPoint.x - geometry.centerX;
        const localY = geometry.centerY - localPoint.y;
        const distance = Math.hypot(localX, localY);
        const angleDegrees = Math.atan2(localY, localX) * 180 / Math.PI;
        const angleOffset = ((this.properties.startAngle - angleDegrees) % 360 + 360) % 360;
        // Over the hub the angle is meaningless, and outside the scale span or
        // the dial there is no value to read.
        if (distance < geometry.hubRadius || distance > geometry.outerRadius || angleOffset > this.getGaugeSpan()) {
            this.clearLayerChildren(this.crosshairLayer);
            return;
        }
        const range = this.getGaugeRange();
        const value = this.getGaugeValueAtAngle(angleDegrees, range);
        const foregroundColor = this.properties.foregroundColor;
        const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.hubRadius, angleDegrees);
        const outerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, angleDegrees);
        const badgePoint = this.getArcPoint(geometry.centerX, geometry.centerY, (geometry.innerRadius + geometry.outerRadius) / 2, angleDegrees);
        this.clearLayerChildren(this.crosshairLayer);
        this.crosshairLayer.insertAdjacentHTML("beforeend",
            Utils.crosshairLineSvgMarkup(innerPoint.x, innerPoint.y, outerPoint.x, outerPoint.y, foregroundColor) +
            Utils.valueBadgeSvgMarkup(this.formatGaugeValue(value), badgePoint.x, badgePoint.y, { backgroundColor: foregroundColor, textColor: Utils.getContrastColor(foregroundColor), fontSize: 10 })
        );
    }

    draw() {
        super.draw();
        const geometry = this.getGaugeGeometry();
        const range = this.getGaugeRange();
        this.hitArea.setAttribute("x", "0");
        this.hitArea.setAttribute("y", "0");
        this.hitArea.setAttribute("width", geometry.width);
        this.hitArea.setAttribute("height", geometry.height);
        this.gaugeBg.setAttribute("d", this.buildAnnularSectorPath(geometry.centerX, geometry.centerY, geometry.innerRadius, geometry.outerRadius, this.properties.startAngle, this.properties.endAngle));
        this.gaugeBg.setAttribute("fill", this.properties.backgroundColor);
        this.gaugeBg.setAttribute("stroke", this.getBorderColor());
        this.gaugeBg.setAttribute("stroke-width", "1");
        this.gaugeBg.setAttribute("stroke-linejoin", "round");
        this.drawGaugeRanges(geometry, range);
        this.drawGaugeTicks(geometry, range);
        const pointerPoint = this.getPointerLocalPoint();
        this.pointerLine.setAttribute("x1", geometry.centerX);
        this.pointerLine.setAttribute("y1", geometry.centerY);
        this.pointerLine.setAttribute("x2", pointerPoint.x);
        this.pointerLine.setAttribute("y2", pointerPoint.y);
        this.pointerLine.setAttribute("stroke", this.properties.foregroundColor);
        this.pointerLine.setAttribute("stroke-width", "2.5");
        this.pointerLine.setAttribute("stroke-linecap", "round");
        this.hubCircle.setAttribute("cx", geometry.centerX);
        this.hubCircle.setAttribute("cy", geometry.centerY);
        this.hubCircle.setAttribute("r", geometry.hubRadius);
        this.hubCircle.setAttribute("fill", this.properties.backgroundColor);
        this.hubCircle.setAttribute("stroke", this.properties.foregroundColor);
        this.hubCircle.setAttribute("stroke-width", "2.5");
        const position = this.getBoardPosition();
        this.applyShapeTransform(geometry.centerX, geometry.centerY, `translate(${position.x} ${position.y})`);
        this.updateHandles();
        this.refreshGaugeScaleControls();
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }
}

var GaugeWidget = GaugeShape;
