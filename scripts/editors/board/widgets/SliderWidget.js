class SliderShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this._tickDragState = null;
        this._axisTickDrag = new AxisTickDrag();
    }

    getHandles() {
        const handleSize = 12;
        var handles = super.getHandles();
        handles.push({
            className: "handle splitter",
            getAttributes: () => {
                const position = this.getBoardPosition();
                return {
                    x: position.x,
                    y: this.getSplitterBoardY() - handleSize / 2,
                    width: this.properties.width,
                    height: handleSize
                };
            },
            getTransform: e => ({
                splitterValue: this.getValueFromBoardY(e.y)
            })
        });
        return handles;
    }

    transformShape(transform) {
        if (transform.splitterValue != null) {
            this.setSplitterValue(transform.splitterValue);
            return;
        }
        super.transformShape(transform);
    }

    enterEditMode() {
        return false;
    }

    showContextToolbar() {
        this.termFormControls["term"]?.termControl?.refresh();
        this.refreshTermsToolbarControl();
        super.showContextToolbar();
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Value", stacked: true, buildControl: $p => $p.append(this._termControl) });
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? this.createNameButtonTermMarkup(term)
            : `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Value</span></span>`;
    }

    createScaleDropDownButton(container) {
        this._scaleDropdownElement = $('<div>');
        this._scaleDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Slider Scale Tooltip", this.board.translations, 280),
            icon: "fa-light fa-ruler-vertical",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildScaleMenuContent(contentElement)
            }
        });
        this._scaleDropdownElement.appendTo(container);
    }

    buildScaleMenuContent(contentElement) {
        const listItems = [
            {
                text: "Auto Scale",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxSwitch({
                        value: this.properties.autoScale !== false,
                        onValueChanged: e => {
                            this.setPropertyCommand("autoScale", e.value);
                        }
                    });
                }
            },
            {
                text: "Minimum",
                buildControl: $container => $container.append(this.createScaleValueControl("minimum", "showMinimumValue"))
            },
            {
                text: "Maximum",
                buildControl: $container => $container.append(this.createScaleValueControl("maximum", "showMaximumValue"))
            },
            {
                text: "Precision",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.precision,
                        min: 0,
                        step: 0.1,
                        showSpinButtons: true,
                        stylingMode: "filled",
                        onValueChanged: e => this.setPropertyCommand("precision", e.value)
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 300, width: "100%" });
        const scrollContent = $(contentElement).dxScrollView("instance").content();
        $('<div>').appendTo(scrollContent).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
    }

    createScaleValueControl(valueProperty, visibilityProperty) {
        const control = $('<div class="name-packed-control">');
        const visibilityHost = $("<div>").addClass("name-packed-control__button").appendTo(control);
        TermControl.createVisibilityCheckbox(visibilityHost, this.properties[visibilityProperty] === true, value => {
            this.setPropertyCommand(visibilityProperty, value);
        });
        const inputHost = $("<div>").addClass("name-packed-control__input").appendTo(control);
        inputHost.dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
            value: this.properties[valueProperty],
            onValueChanged: e => this.setPropertyCommand(valueProperty, e.value)
        }));
        return control;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Slider Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 35;
        this.properties.y = center.y - 125;
        this.properties.width = 70;
        this.properties.height = 250;
        this.properties.term = this.board.calculator.getDefaultTerm();
        this.properties.termDisplayMode = "visible";
        this.properties.value = 0;
        this.properties.autoScale = true;
        this.properties.minimum = 0;
        this.properties.maximum = 10;
        this.properties.showMinimumValue = true;
        this.properties.showMaximumValue = true;
        this.properties.fillColor = this.board.theme.getBackgroundColors()[3].color;
        this.properties.precision = 0;
        this.properties.positiveColor = this.properties.foregroundColor;
        this.properties.negativeColor = "#C62828";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.topPart = this.board.createSvgElement("rect");
        this.fillPart = this.board.createSvgElement("rect");
        this.bottomPart = this.board.createSvgElement("rect");
        this.container = this.board.createSvgElement("rect");
        this.splitter = this.board.createSvgElement("line");
        this.zeroLine = this.board.createSvgElement("line");
        this.ticksGroup = this.board.createSvgElement("g");
        this.scaleLabelsGroup = this.board.createSvgElement("g");
        this.tickInteractionLayer = this.board.createSvgElement("g");
        this.tickInteractionLayer.setAttribute("class", "slider-export-exclude");
        this.container.setAttribute("stroke-width", 1);
        this.splitter.setAttribute("stroke-width", 4);
        this.zeroLine.setAttribute("stroke-width", 1);
        element.appendChild(this.topPart);
        element.appendChild(this.fillPart);
        element.appendChild(this.bottomPart);
        element.appendChild(this.ticksGroup);
        element.appendChild(this.zeroLine);
        element.appendChild(this.scaleLabelsGroup);
        element.appendChild(this.container);
        element.appendChild(this.splitter);
        element.appendChild(this.tickInteractionLayer);
        this._appliedConfig = null;
        this.updateSliderState();
        return element;
    }

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".slider-export-exclude").forEach(node => node.remove());
        return clone;
    }

    getBoundTermValue(term, caseNumber) {
        const value = this.board.calculator.getByName(term, caseNumber);
        if (Number.isFinite(value))
            return value;
        return 0;
    }

    clamp(value, minimum, maximum) {
        if (value < minimum)
            return minimum;
        if (value > maximum)
            return maximum;
        return value;
    }

    getRange() {
        let minimum = Number(this.properties.minimum);
        let maximum = Number(this.properties.maximum);
        if (!Number.isFinite(minimum))
            minimum = 0;
        if (!Number.isFinite(maximum))
            maximum = 1;
        if (minimum > maximum) {
            const swapped = minimum;
            minimum = maximum;
            maximum = swapped;
        }
        if (minimum === maximum)
            maximum = minimum + 1;
        return { minimum, maximum };
    }

    getBoundTermRange(term, caseNumber, currentValue) {
        const values = this.board.calculator?.system?.values;
        if (!Array.isArray(values))
            return null;
        let minimum = Number.POSITIVE_INFINITY;
        let maximum = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < values.length; i++) {
            const iterationValues = values[i];
            const rowCase = iterationValues.case ?? 1;
            if (rowCase !== caseNumber)
                continue;
            const value = iterationValues[term];
            if (!Number.isFinite(value))
                continue;
            if (value < minimum)
                minimum = value;
            if (value > maximum)
                maximum = value;
        }
        if (Number.isFinite(currentValue)) {
            minimum = Math.min(minimum, currentValue);
            maximum = Math.max(maximum, currentValue);
        }
        if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
            return null;
        return { minimum, maximum };
    }

    getAutoRange(term, caseNumber, currentValue, range) {
        if (this.properties.autoScale === false)
            return range;
        if (!term || !this.board.calculator.isTerm(term))
            return range;
        const observedRange = this.getBoundTermRange(term, caseNumber, currentValue);
        if (!observedRange)
            return range;
        let minimum = range.minimum;
        let maximum = range.maximum;
        if (observedRange.minimum >= minimum && observedRange.maximum <= maximum)
            return range;
        const observedSpan = observedRange.maximum - observedRange.minimum;
        let margin = observedSpan * 0.3;
        if (!(margin > 0))
            margin = Math.max(Math.abs(observedRange.minimum), Math.abs(observedRange.maximum), 1) * 0.3;
        minimum = Math.min(minimum, observedRange.minimum - margin);
        maximum = Math.max(maximum, observedRange.maximum + margin);
        this.properties.minimum = minimum;
        this.properties.maximum = maximum;
        return { minimum, maximum };
    }

    getSplitterOffsetFromValue(value, minimum, maximum) {
        const height = Math.max(1, Number(this.properties.height) || 1);
        if (maximum === minimum)
            return height / 2;
        const ratio = (value - minimum) / (maximum - minimum);
        return height - ratio * height;
    }

    getPositiveColor() {
        return this.properties.positiveColor ?? this.properties.foregroundColor ?? "#000000";
    }

    getNegativeColor() {
        return this.properties.negativeColor ?? this.getPositiveColor();
    }

    buildSliderConfig() {
        const term = this.properties.term;
        const caseNumber = this.getCaseNumber();
        const isBoundTerm = !!term && this.board.calculator.isTerm(term);
        let value = isBoundTerm ? this.getBoundTermValue(term, caseNumber) : Number(this.properties.value);
        if (!Number.isFinite(value))
            value = Number(this.properties.value);
        if (!Number.isFinite(value))
            value = 0;
        const manualRange = this.getRange();
        const range = this.getAutoRange(term, caseNumber, value, manualRange);
        const normalizedValue = this.clamp(value, range.minimum, range.maximum);
        const fillColor = normalizedValue < 0 ? this.getNegativeColor() : this.getPositiveColor();
        return {
            isBoundTerm,
            caseNumber,
            minimum: range.minimum,
            maximum: range.maximum,
            value: normalizedValue,
            splitterOffset: this.getSplitterOffsetFromValue(normalizedValue, range.minimum, range.maximum),
            zeroOffset: this.getSplitterOffsetFromValue(0, range.minimum, range.maximum),
            fillColor: fillColor,
            splitterColor: Utils.darkenColor(fillColor, 0.35),
            backgroundColor: this.properties.backgroundColor,
            borderColor: this.getBorderColor(),
            draggable: this.isInteractable() && !this.isTermLocked("term")
        };
    }

    applySliderConfig(config) {
        this._sliderConfig = config;
        this.properties.value = config.value;
        if (this.container) {
            this.container.setAttribute("fill", "none");
            this.container.setAttribute("stroke", config.borderColor);
        }
        if (this.topPart) {
            this.topPart.setAttribute("fill", config.backgroundColor);
            this.topPart.setAttribute("stroke", "none");
        }
        if (this.bottomPart) {
            this.bottomPart.setAttribute("fill", config.backgroundColor);
            this.bottomPart.setAttribute("stroke", "none");
        }
        if (this.fillPart) {
            this.fillPart.setAttribute("fill", config.fillColor);
            this.fillPart.setAttribute("stroke", "none");
        }
        if (this.splitter) {
            this.splitter.setAttribute("stroke", config.splitterColor);
            this.splitter.setAttribute("visibility", config.draggable ? "visible" : "hidden");
        }
        if (this.zeroLine)
            this.zeroLine.setAttribute("stroke", config.borderColor);
    }

    updateSliderState() {
        if (!this.container)
            return;
        const config = this.buildSliderConfig();
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (!changed)
            return;
        this.applySliderConfig(config);
        this._appliedConfig = config;
    }

    getCaseNumber() {
        const caseNumber = parseInt(this.properties.termCase ?? 1, 10);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return 1;
        return caseNumber;
    }

    getSplitterOffset() {
        const config = this._sliderConfig ?? this.buildSliderConfig();
        if (Number.isFinite(config?.splitterOffset))
            return config.splitterOffset;
        const height = Math.max(1, Number(this.properties.height) || 1);
        return height / 2;
    }

    getZeroOffset() {
        const config = this._sliderConfig ?? this.buildSliderConfig();
        if (Number.isFinite(config?.zeroOffset))
            return config.zeroOffset;
        const height = Math.max(1, Number(this.properties.height) || 1);
        return height / 2;
    }

    getSplitterBoardY() {
        const position = this.getBoardPosition();
        return position.y + this.getSplitterOffset();
    }

    getValueFromBoardY(boardY) {
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const sliderHeight = Math.max(1, Number(this.properties.height) || 1);
        const position = this.getBoardPosition();
        const localY = this.clamp(boardY - position.y, 0, sliderHeight);
        const ratio = 1 - localY / sliderHeight;
        const rawValue = config.minimum + ratio * (config.maximum - config.minimum);
        return this.snapToPrecision(rawValue);
    }

    snapToPrecision(value) {
        const precision = Number(this.properties.precision);
        if (!precision || precision <= 0)
            return value;
        return Math.round(value / precision) * precision;
    }

    setSplitterValue(value) {
        if (!Number.isFinite(value))
            return;
        if (this.isTermLocked("term"))
            return;
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const adjustedValue = this.clamp(value, config.minimum, config.maximum);
        const term = this.properties.term;
        if (!term || !this.board.calculator.isTerm(term)) {
            this.properties.value = adjustedValue;
            this.updateSliderState();
            this.board.markDirty(this);
            return;
        }
        const caseNumber = this.getCaseNumber();
        this.board.calculator.setTermValue(term, adjustedValue, this.board.calculator.getIteration(), caseNumber);
        this.board.calculator.calculate();
    }

    update() {
        super.update();
        this.updateSlider();
    }

    updateSlider() {
        this.updateSliderState();
    }

    draw() {
        this.updateSliderState();
        this.drawShape();
        super.draw();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const sliderWidth = Number(this.properties.width) || 0;
        const sliderHeight = Number(this.properties.height) || 0;
        const inset = 1;
        const trackX = inset;
        const trackY = inset;
        const trackWidth = Math.max(0, sliderWidth - inset * 2);
        const trackHeight = Math.max(0, sliderHeight - inset * 2);
        const splitterY = this.getSplitterOffset();
        const zeroY = this.clamp(this.getZeroOffset(), trackY, trackY + trackHeight);
        const fillTop = Math.min(splitterY, zeroY);
        const fillBottom = Math.max(splitterY, zeroY);
        const topHeight = this.clamp(fillTop - trackY, 0, trackHeight);
        const fillHeight = this.clamp(fillBottom - fillTop, 0, trackHeight - topHeight);
        const bottomY = trackY + topHeight + fillHeight;
        const bottomHeight = Math.max(0, trackHeight - topHeight - fillHeight);
        this.topPart.setAttribute("x", trackX);
        this.topPart.setAttribute("y", trackY);
        this.topPart.setAttribute("width", trackWidth);
        this.topPart.setAttribute("height", topHeight);
        this.fillPart.setAttribute("x", trackX);
        this.fillPart.setAttribute("y", fillTop);
        this.fillPart.setAttribute("width", trackWidth);
        this.fillPart.setAttribute("height", fillHeight);
        this.bottomPart.setAttribute("x", trackX);
        this.bottomPart.setAttribute("y", bottomY);
        this.bottomPart.setAttribute("width", trackWidth);
        this.bottomPart.setAttribute("height", bottomHeight);
        this.container.setAttribute("x", 0);
        this.container.setAttribute("y", 0);
        this.container.setAttribute("width", sliderWidth);
        this.container.setAttribute("height", sliderHeight);
        this.container.setAttribute("rx", this.getBorderRadius());
        this.splitter.setAttribute("x1", trackX);
        this.splitter.setAttribute("y1", splitterY);
        this.splitter.setAttribute("x2", trackX + trackWidth);
        this.splitter.setAttribute("y2", splitterY);
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const zeroInsideRange = config.minimum < 0 && config.maximum > 0;
        this.zeroLine.setAttribute("visibility", zeroInsideRange ? "visible" : "hidden");
        this.zeroLine.setAttribute("x1", trackX);
        this.zeroLine.setAttribute("y1", zeroY);
        this.zeroLine.setAttribute("x2", trackX + trackWidth);
        this.zeroLine.setAttribute("y2", zeroY);
        this.drawTicks(trackX, trackWidth, sliderHeight);
        this.drawScaleLabels(trackX, sliderHeight, config, zeroY, zeroInsideRange);
        this.element.setAttribute("transform", `translate(${position.x} ${position.y}) rotate(${this.properties.rotation} ${sliderWidth / 2} ${sliderHeight / 2})`);
    }

    drawTicks(trackX, trackWidth, sliderHeight) {
        if (!this.ticksGroup)
            return;
        while (this.ticksGroup.firstChild)
            this.ticksGroup.removeChild(this.ticksGroup.firstChild);
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const range = config.maximum - config.minimum;
        const precision = Number(this.properties.precision);
        if (range > 0 && precision > 0) {
            const ratios = this._getTickRatios(range, precision, sliderHeight);
            const borderColor = config.borderColor || "#999";
            const tickLength = Math.min(6, trackWidth * 0.15);
            for (const ratio of ratios) {
                const y = sliderHeight - ratio * sliderHeight;
                const tick = this.board.createSvgElement("line");
                tick.setAttribute("x1", trackX);
                tick.setAttribute("y1", y);
                tick.setAttribute("x2", trackX + tickLength);
                tick.setAttribute("y2", y);
                tick.setAttribute("stroke", borderColor);
                tick.setAttribute("stroke-width", 0.5);
                tick.setAttribute("opacity", "0.5");
                this.ticksGroup.appendChild(tick);
            }
        }
        this._updateTickInteractionHandles(trackX, trackWidth, sliderHeight, config);
    }

    drawScaleLabels(trackX, sliderHeight, config, zeroY, zeroInsideRange) {
        if (!this.scaleLabelsGroup)
            return;
        while (this.scaleLabelsGroup.firstChild)
            this.scaleLabelsGroup.removeChild(this.scaleLabelsGroup.firstChild);
        const labelX = trackX + 8;
        const showMaximum = this.properties.showMaximumValue === true;
        const showMinimum = this.properties.showMinimumValue === true;
        if (showMaximum)
            this.appendScaleLabel(this.formatModelValue(config.maximum), labelX, 11);
        if (showMinimum)
            this.appendScaleLabel(this.formatModelValue(config.minimum), labelX, sliderHeight - 5);
        if (zeroInsideRange) {
            const clearOfMaximum = !showMaximum || zeroY > 22;
            const clearOfMinimum = !showMinimum || zeroY < sliderHeight - 16;
            if (clearOfMaximum && clearOfMinimum)
                this.appendScaleLabel("0", labelX, zeroY - 3);
        }
    }

    appendScaleLabel(text, x, y) {
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("text-anchor", "start");
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "KaTeX_Main");
        label.setAttribute("font-size", "9");
        label.textContent = text;
        this.scaleLabelsGroup.appendChild(label);
    }

    _getTickRatios(range, precision, sliderHeight) {
        const ratios = [];
        const precisionTickCount = Math.floor(range / precision);
        if (precisionTickCount > 0 && sliderHeight / precisionTickCount >= 5) {
            for (let i = 0; i <= precisionTickCount; i++)
                ratios.push((i * precision) / range);
            return ratios;
        }
        const divisions = minorTickDivisions(sliderHeight);
        if (divisions < 2)
            return ratios;
        for (let i = 0; i <= divisions; i++)
            ratios.push(i / divisions);
        return ratios;
    }

    _getSliderTickData(sliderHeight, config) {
        const ticks = [];
        const range = config.maximum - config.minimum;
        if (!(range > 0))
            return ticks;
        ticks.push({ value: config.maximum, pixelFromOrigin: sliderHeight });
        return ticks;
    }

    _updateTickInteractionHandles(trackX, trackWidth, sliderHeight, config) {
        if (!this.tickInteractionLayer)
            return;
        const ticks = this._getSliderTickData(sliderHeight, config);
        const extents = tickHitExtents(ticks.map(tick => sliderHeight - tick.pixelFromOrigin), 5);
        while (this.tickInteractionLayer.children.length > ticks.length)
            this.tickInteractionLayer.removeChild(this.tickInteractionLayer.lastChild);
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[i];
            const y = sliderHeight - tick.pixelFromOrigin;
            const halfHeight = extents[i];
            let hitRect = this.tickInteractionLayer.children[i];
            if (!hitRect) {
                hitRect = this.board.createSvgElement("rect");
                hitRect.setAttribute("fill", "transparent");
                hitRect.setAttribute("pointer-events", "all");
                hitRect.style.cursor = "ns-resize";
                hitRect.onpointerdown = e => this.onAxisPointerDown(e);
                this.tickInteractionLayer.appendChild(hitRect);
            }
            hitRect.setAttribute("x", trackX);
            hitRect.setAttribute("y", y - halfHeight);
            hitRect.setAttribute("width", trackWidth);
            hitRect.setAttribute("height", halfHeight * 2);
            hitRect._tickValue = tick.value;
            hitRect._tickPixelFromOrigin = tick.pixelFromOrigin;
        }
    }

    onAxisPointerDown(event) {
        if (!this.isInteractable())
            return;
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
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const minimum = config.minimum;
        const sliderHeight = Math.max(1, Number(this.properties.height) || 1);
        const svgRoot = this.board.svg;
        const element = this.element;
        const started = this._axisTickDrag.start(event, {
            tickOffsetValue: grabValue - minimum,
            tickOffsetPixel: grabPixelFromOrigin,
            getPixelOffset: e => {
                const pt = svgRoot.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const localY = pt.matrixTransform(element.getScreenCTM().inverse()).y;
                return sliderHeight - localY;
            },
            onMove: scale => {
                const newRange = scale * sliderHeight;
                if (newRange <= 0)
                    return;
                this.properties.maximum = minimum + newRange;
                this.board.markDirty(this);
            },
            onEnd: () => {
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

    getTermLabelAnchor() {
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: width / 2, y: height + 12 };
        return super.getTermLabelAnchor();
    }

    getTermEntryLabelColor(entry, index) {
        return this.properties.foregroundColor;
    }

    tick() {
        super.tick();
        this.tickSlider();
        this.board.markDirty(this);
    }

    tickSlider() {
        this.updateSliderState();
    }
}

var SliderWidget = SliderShape;
