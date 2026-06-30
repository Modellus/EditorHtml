class RulerShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this._tickDragState = null;
        this._axisTickDrag = new AxisTickDrag();
        this._dragLinearStep = null;
        this._dragAnchorValue = null;
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
        this.crosshairLayer = this.board.createSvgElement("g");
        this.crosshairLayer.setAttribute("pointer-events", "none");
        this.tickInteractionLayer = this.board.createSvgElement("g");
        element.appendChild(this.container);
        element.appendChild(this.minorTicksLayer);
        element.appendChild(this.majorTicksLayer);
        element.appendChild(this.labelsLayer);
        element.appendChild(this.crosshairLayer);
        element.appendChild(this.tickInteractionLayer);
        element.addEventListener("pointermove", e => this._onPointerMove(e));
        element.addEventListener("pointerleave", () => this.clearLayerChildren(this.crosshairLayer));
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

    // Value-step between major ticks. While a tick is being dragged we hold this
    // step fixed (like the referential) so the grabbed value stays exactly under
    // the cursor instead of drifting when the major-tick count is rounded.
    getLinearTickStep(minimum, maximum) {
        if (this._dragLinearStep && this._dragLinearStep > 0)
            return this._dragLinearStep;
        return (maximum - minimum) / this.getMajorTicksCount();
    }

    // Walks the linear major ticks at a fixed value step, invoking
    // cb(value, pixelFromLeft, index, step) for each tick within [minimum, maximum].
    // The grid is always anchored at the start value, so the start tick is always
    // present at the left edge and never moves. While a tick is being dragged, the
    // dragged value is also emitted (with a null index) so it stays on a line even
    // when thinning would otherwise skip it.
    forEachLinearMajorTick(minimum, maximum, geometry, cb) {
        const range = maximum - minimum;
        if (!(range > 0)) return;
        const step = this.getLinearTickStep(minimum, maximum);
        if (!(step > 0)) return;
        const eps = step * 1e-6;
        let lastIndex = Math.floor((range + eps) / step);
        // While dragging the step thins automatically, but cap as a safety net.
        if (this._dragLinearStep)
            lastIndex = Math.min(lastIndex, 100);
        const draggedValue = (this._dragLinearStep && Number.isFinite(this._dragAnchorValue))
            ? this._dragAnchorValue : null;
        let draggedOnGrid = false;
        for (let i = 0; i <= lastIndex; i++) {
            const value = minimum + i * step;
            if (draggedValue !== null && Math.abs(value - draggedValue) <= eps)
                draggedOnGrid = true;
            cb(value, ((value - minimum) / range) * geometry.usableWidth, i, step);
        }
        if (draggedValue !== null && !draggedOnGrid && draggedValue > minimum + eps && draggedValue < maximum - eps)
            cb(draggedValue, ((draggedValue - minimum) / range) * geometry.usableWidth, null, step);
    }

    _getAllTickData(geometry) {
        const ticks = [];
        if (this.isLogarithmic()) {
            const minimum = Number(this.properties.minimum);
            const maximum = Number(this.properties.maximum);
            if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum)
                return ticks;
            const allTicks = getClassicLogRulerTicks(minimum, maximum, geometry.usableWidth, this.getMajorTicksCount());
            for (const tick of allTicks)
                ticks.push({ value: tick.value, pixelFromLeft: tick.pixelPosition, isMajor: tick.type === "major" });
        } else {
            const minimum = Number.isFinite(Number(this.properties.minimum)) ? Number(this.properties.minimum) : 0;
            const maximum = Number.isFinite(Number(this.properties.maximum)) ? Number(this.properties.maximum) : 10;
            const range = maximum - minimum;
            const minorDivisions = 10;
            this.forEachLinearMajorTick(minimum, maximum, geometry, (value, pixelFromLeft, i, step) => {
                ticks.push({ value, pixelFromLeft, isMajor: true });
                if (i === null) return;
                const minorStep = step / minorDivisions;
                for (let j = 1; j < minorDivisions; j++) {
                    const minorValue = value + j * minorStep;
                    if (minorValue > maximum + step * 1e-6) break;
                    const minorPixel = ((minorValue - minimum) / range) * geometry.usableWidth;
                    if (minorPixel >= geometry.usableWidth) break;
                    ticks.push({ value: minorValue, pixelFromLeft: minorPixel, isMajor: false });
                }
            });
        }
        return ticks;
    }

    _updateTickInteractionHandles(geometry) {
        const ticks = this._getAllTickData(geometry);
        const hitWidth = 12;
        while (this.tickInteractionLayer.children.length > ticks.length)
            this.tickInteractionLayer.removeChild(this.tickInteractionLayer.lastChild);
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[i];
            const x = geometry.left + tick.pixelFromLeft;
            let hitRect = this.tickInteractionLayer.children[i];
            if (!hitRect) {
                hitRect = this.board.createSvgElement("rect");
                hitRect.setAttribute("fill", "transparent");
                hitRect.setAttribute("pointer-events", "all");
                hitRect.style.cursor = "ew-resize";
                hitRect.onpointerdown = e => this.onAxisPointerDown(e);
                this.tickInteractionLayer.appendChild(hitRect);
            }
            hitRect.setAttribute("x", x - hitWidth / 2);
            hitRect.setAttribute("y", geometry.y);
            hitRect.setAttribute("width", hitWidth);
            hitRect.setAttribute("height", geometry.height);
            hitRect._tickValue = tick.value;
            hitRect._tickPixelFromLeft = tick.pixelFromLeft;
        }
    }

    onAxisPointerDown(event) {
        event.stopPropagation();
        event.preventDefault();
        this._handlePending = null;
        this._handlePendingStart = null;
        this._handleActivePointerId = null;

        const hitRect = event.currentTarget || event.target;
        const grabValue = hitRect._tickValue;
        const grabPixelFromLeft = hitRect._tickPixelFromLeft;
        if (!(grabPixelFromLeft >= 1)) return;

        const geo = this.getRulerGeometry();
        const minimum = Number.isFinite(Number(this.properties.minimum)) ? Number(this.properties.minimum) : 0;
        const maximum = Number.isFinite(Number(this.properties.maximum)) ? Number(this.properties.maximum) : 10;
        const majorTicksCount = this.getMajorTicksCount();
        const usableWidth = geo.usableWidth;
        const svgRoot = this.board.svg;
        const element = this.element;

        const origRange = maximum - minimum;
        let tickOffsetValue, tickStep, logTickStep, logMin;
        if (this.isLogarithmic()) {
            if (!(minimum > 0) || !(grabValue > 0)) return;
            logMin = Math.log10(minimum);
            tickOffsetValue = Math.log10(grabValue) - logMin;
            logTickStep = (Math.log10(maximum) - logMin) / majorTicksCount;
        } else {
            tickOffsetValue = grabValue - minimum;
            tickStep = (maximum - minimum) / majorTicksCount;
        }

        const isLog = this.isLogarithmic();
        const started = this._axisTickDrag.start(event, {
            tickOffsetValue,
            tickOffsetPixel: grabPixelFromLeft,
            getPixelOffset: e => {
                const pt = svgRoot.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                return pt.matrixTransform(element.getScreenCTM().inverse()).x - geo.left;
            },
            onMove: scale => {
                if (isLog) {
                    if (logMin == null || !logTickStep) return;
                    const newLogRange = scale * usableWidth;
                    if (newLogRange <= 0) return;
                    this.properties.maximum = Math.pow(10, logMin + newLogRange);
                    this.properties.majorTicks = Math.max(1, Math.min(100, Math.round(newLogRange / logTickStep)));
                } else {
                    if (!tickStep) return;
                    const newRange = scale * usableWidth;
                    if (newRange <= 0) return;
                    // Thin/densify the value-step like the referential so ticks keep a
                    // readable spacing. The grid stays anchored at the start value; the
                    // dragged value is recorded so it is also kept on a line at the cursor.
                    const ratio = origRange > 0 ? newRange / origRange : 1;
                    const factor = niceTickStep(ratio) || 1;
                    this._dragAnchorValue = grabValue;
                    this._dragLinearStep = factor * tickStep;
                    this.properties.maximum = minimum + newRange;
                    this.properties.majorTicks = Math.max(1, Math.min(100, Math.round(newRange / this._dragLinearStep)));
                }
                this.board.markDirty(this);
            },
            onEnd: () => {
                // Settle on a clean range that is an exact multiple of the value-step.
                if (this._dragLinearStep) {
                    const step = this._dragLinearStep;
                    const count = Math.max(1, Math.round((this.properties.maximum - minimum) / step));
                    this.properties.maximum = minimum + count * step;
                    this.properties.majorTicks = count;
                    this._dragLinearStep = null;
                    this._dragAnchorValue = null;
                }
                this._tickDragState = null;
                this.board.pointerLocked = false;
                this.dragEnd();
                this.board.markDirty(this);
            }
        });
        if (!started) return;
        this._tickDragState = { pointerId: event.pointerId };
        this.board.pointerLocked = true;
        this.dragStart();
    }

    _onPointerMove(e) {
        if (this._tickDragState) return;
        const geometry = this.getRulerGeometry();
        const svgPt = this.board.svg.createSVGPoint();
        svgPt.x = e.clientX;
        svgPt.y = e.clientY;
        const localPt = svgPt.matrixTransform(this.element.getScreenCTM().inverse());

        const clampedX = Math.max(geometry.left, Math.min(geometry.right, localPt.x));
        const t = (clampedX - geometry.left) / geometry.usableWidth;

        let value;
        if (this.isLogarithmic()) {
            const minimum = Number(this.properties.minimum);
            const maximum = Number(this.properties.maximum);
            if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum)
                return;
            const logMin = Math.log10(minimum);
            value = Math.pow(10, logMin + t * (Math.log10(maximum) - logMin));
        } else {
            const minimum = Number.isFinite(Number(this.properties.minimum)) ? Number(this.properties.minimum) : 0;
            const maximum = Number.isFinite(Number(this.properties.maximum)) ? Number(this.properties.maximum) : 10;
            value = minimum + t * (maximum - minimum);
        }

        const topY = geometry.y + 1;
        const labelsY = geometry.y + geometry.height * 0.58 + 12;
        const fg = this.properties.foregroundColor;
        const textColor = Utils.getContrastColor(fg);

        this.clearLayerChildren(this.crosshairLayer);
        this.crosshairLayer.insertAdjacentHTML("beforeend",
            Utils.crosshairLineSvgMarkup(clampedX, topY, clampedX, geometry.y + geometry.height - 1, fg) +
            Utils.valueBadgeSvgMarkup(this.formatModelValue(value), clampedX, labelsY, { backgroundColor: fg, textColor, fontSize: 10 })
        );
    }

    drawLinearTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY) {
        const minorDivisions = 10;
        const minimum = Number.isFinite(Number(this.properties.minimum)) ? Number(this.properties.minimum) : 0;
        const maximum = Number.isFinite(Number(this.properties.maximum)) ? Number(this.properties.maximum) : 10;
        const range = maximum - minimum;
        this.forEachLinearMajorTick(minimum, maximum, geometry, (tickValue, pixelFromLeft, i, step) => {
            const majorX = geometry.left + pixelFromLeft;
            this.addTickLine(this.majorTicksLayer, majorX, topY, majorBottomY, 1.2);
            this.addTickLabel(majorX, labelsY, this.formatModelValue(tickValue));
            if (i === null) return;
            const minorStep = step / minorDivisions;
            for (let minorIndex = 1; minorIndex < minorDivisions; minorIndex++) {
                const minorValue = tickValue + minorIndex * minorStep;
                if (minorValue > maximum + step * 1e-6) break;
                const minorX = geometry.left + ((minorValue - minimum) / range) * geometry.usableWidth;
                if (minorX >= geometry.right)
                    break;
                const isMiddleMinorTick = minorIndex === minorDivisions / 2;
                const tickBottomY = isMiddleMinorTick ? middleMinorBottomY : minorBottomY;
                const tickWidth = isMiddleMinorTick ? 1.1 : 1;
                const tickOpacity = isMiddleMinorTick ? 0.5 : 0.25;
                this.addTickLine(this.minorTicksLayer, minorX, topY, tickBottomY, tickWidth, tickOpacity);
            }
        });
    }

    drawLogarithmicTicks(geometry, topY, minorBottomY, middleMinorBottomY, majorBottomY, labelsY) {
        const minimum = Number(this.properties.minimum);
        const maximum = Number(this.properties.maximum);
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum <= 0 || maximum <= minimum)
            return;
        const ticks = getClassicLogRulerTicks(minimum, maximum, geometry.usableWidth, this.getMajorTicksCount());
        if (ticks.length === 0) return;
        for (const tick of ticks) {
            const x = geometry.left + tick.pixelPosition;
            if (tick.type === "major") {
                this.addTickLine(this.majorTicksLayer, x, topY, majorBottomY, 1.2);
                this.addTickLabel(x, labelsY, tick.label);
            } else if (tick.isMiddle) {
                this.addTickLine(this.minorTicksLayer, x, topY, middleMinorBottomY, 1.1, 0.50);
            } else {
                this.addTickLine(this.minorTicksLayer, x, topY, minorBottomY, 1.0, 0.25);
            }
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
        this._updateTickInteractionHandles(geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}

var RulerWidget = RulerShape;
