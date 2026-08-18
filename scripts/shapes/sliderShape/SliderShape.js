class SliderShape extends BaseShape {

    static scaleLabelFontSize = 9;
    // Length of a major tick; the minor kinds scale down from it through AXIS_TICK_STYLES.
    static majorTickLength = 5;
    // Two centred labels need this much room between their axis positions to stay apart.
    static scaleLabelHeight = 11;

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
            cursorAngle: 90,
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
                splitterValue: this.getValueFromBoardY(this.getLocalPointFromBoardPoint(e).y)
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
        listItems.push({ text: "Value", buildControl: $p => $p.append(this._termControl) });
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? this.createNameButtonTermMarkup(term, this.properties.term)
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
                text: "Style",
                buildControl: $container => $container.append(this.createSliderStyleButtonGroup())
            },
            {
                text: "Ticks",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxSwitch({
                        value: this.showsTicks(),
                        onValueChanged: e => {
                            this.setPropertyCommand("showTicks", e.value);
                        }
                    });
                }
            },
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
        Utils.renderDropdownMenuScroll(contentElement, 300, scrollContent => {
            $('<div>').appendTo(scrollContent).dxList({
                dataSource: listItems,
                scrollingEnabled: false,
                itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
            });
        });
    }

    createSliderStyleButtonGroup() {
        const container = $('<div>');
        container.dxButtonGroup({
            items: [
                { key: "classic", icon: "fa-light fa-slider-circle" },
                { key: "bar", icon: "fa-solid fa-square-half-stroke-horizontal" }
            ],
            keyExpr: "key",
            selectedItemKeys: [this.getSliderStyle()],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="font-size: 14px"></i>`;
            },
            onSelectionChanged: e => {
                if (e.addedItems.length > 0)
                    this.setPropertyCommand("sliderStyle", e.addedItems[0].key);
            }
        });
        return container;
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
        this.properties.showTicks = true;
        this.properties.fillColor = this.board.theme.getBackgroundColors()[3].color;
        this.properties.precision = 0;
        this.properties.positiveColor = this.properties.foregroundColor;
        this.properties.negativeColor = "#C62828";
        this.properties.sliderStyle = "bar";
    }

    getSliderStyle() {
        return this.properties.sliderStyle === "classic" ? "classic" : "bar";
    }

    // Sliders saved before the toolbar switch existed carry no flag and keep their ticks.
    showsTicks() {
        return this.properties.showTicks !== false;
    }

    isClassicStyle() {
        return this.getSliderStyle() === "classic";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.topPart = this.board.createSvgElement("rect");
        this.fillPart = this.board.createSvgElement("rect");
        this.bottomPart = this.board.createSvgElement("rect");
        this.container = this.board.createSvgElement("rect");
        this.splitter = this.board.createSvgElement("line");
        this.thumb = this.board.createSvgElement("circle");
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
        element.appendChild(this.thumb);
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

    // The handle reads as part of the slider's frame, not of the value it carries,
    // so it keeps the foreground color instead of the fill's positive/negative one.
    getHandleColor() {
        return this.properties.foregroundColor ?? this.getPositiveColor();
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
        const handleColor = this.getHandleColor();
        return {
            isBoundTerm,
            caseNumber,
            style: this.getSliderStyle(),
            minimum: range.minimum,
            maximum: range.maximum,
            value: normalizedValue,
            splitterOffset: this.getSplitterOffsetFromValue(normalizedValue, range.minimum, range.maximum),
            zeroOffset: this.getSplitterOffsetFromValue(0, range.minimum, range.maximum),
            fillColor: fillColor,
            handleColor: handleColor,
            // A ring in the contrasting color keeps the handle readable wherever it
            // lands - over the rail's fill, the background, or a tick.
            handleBorderColor: Utils.getContrastColor(handleColor),
            backgroundColor: this.properties.backgroundColor,
            borderColor: this.getBorderColor(),
            draggable: this.isInteractable() && !this.isTermLocked("term")
        };
    }

    applySliderConfig(config) {
        this._sliderConfig = config;
        this.properties.value = config.value;
        const classic = config.style === "classic";
        if (this.container) {
            this.container.setAttribute("fill", "none");
            // The rectangle is the slider's hit area whatever the style, so the
            // classic rail is hovered and picked over its whole frame too - it only
            // drops the visible border.
            this.container.setAttribute("stroke", classic ? "none" : config.borderColor);
            this.container.setAttribute("pointer-events", "all");
            this.container.setAttribute("visibility", "visible");
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
            this.splitter.setAttribute("stroke", config.handleColor);
            this.splitter.setAttribute("visibility", !classic && config.draggable ? "visible" : "hidden");
        }
        if (this.thumb) {
            this.thumb.setAttribute("fill", config.handleColor);
            this.thumb.setAttribute("stroke", config.handleBorderColor);
            this.thumb.setAttribute("stroke-width", 1.5);
            this.thumb.setAttribute("visibility", classic ? "visible" : "hidden");
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

    // The splitter handle lives outside the slider's element, so it is mirrored
    // here to stay on the line it drags once the slider is flipped.
    getSplitterBoardY() {
        const position = this.getBoardPosition();
        return this.mirrorBoardPoint({ x: position.x, y: position.y + this.getSplitterOffset() }).y;
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
            this.refreshOpenContextToolbar();
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
        const classic = this.isClassicStyle();
        const inset = 1;
        const trackWidth = classic ? Math.min(6, Math.max(0, sliderWidth)) : Math.max(0, sliderWidth - inset * 2);
        const trackX = classic ? (sliderWidth - trackWidth) / 2 : inset;
        const trackY = inset;
        const trackHeight = Math.max(0, sliderHeight - inset * 2);
        const splitterY = this.getSplitterOffset();
        const zeroY = this.clamp(this.getZeroOffset(), trackY, trackY + trackHeight);
        const fillTop = Math.min(splitterY, zeroY);
        const fillBottom = Math.max(splitterY, zeroY);
        const topHeight = this.clamp(fillTop - trackY, 0, trackHeight);
        const fillHeight = this.clamp(fillBottom - fillTop, 0, trackHeight - topHeight);
        const bottomY = trackY + topHeight + fillHeight;
        const bottomHeight = Math.max(0, trackHeight - topHeight - fillHeight);
        const trackRadius = classic ? trackWidth / 2 : 0;
        this.topPart.setAttribute("x", trackX);
        this.topPart.setAttribute("y", trackY);
        this.topPart.setAttribute("width", trackWidth);
        this.topPart.setAttribute("height", classic ? trackHeight : topHeight);
        this.topPart.setAttribute("rx", trackRadius);
        this.fillPart.setAttribute("x", trackX);
        this.fillPart.setAttribute("y", fillTop);
        this.fillPart.setAttribute("width", trackWidth);
        this.fillPart.setAttribute("height", fillHeight);
        this.fillPart.setAttribute("rx", trackRadius);
        this.bottomPart.setAttribute("x", trackX);
        this.bottomPart.setAttribute("y", bottomY);
        this.bottomPart.setAttribute("width", trackWidth);
        this.bottomPart.setAttribute("height", classic ? 0 : bottomHeight);
        this.container.setAttribute("x", 0);
        this.container.setAttribute("y", 0);
        this.container.setAttribute("width", sliderWidth);
        this.container.setAttribute("height", sliderHeight);
        this.container.setAttribute("rx", this.getBorderRadius());
        this.splitter.setAttribute("x1", trackX);
        this.splitter.setAttribute("y1", splitterY);
        this.splitter.setAttribute("x2", trackX + trackWidth);
        this.splitter.setAttribute("y2", splitterY);
        const thumbRadius = Math.max(4, Math.min(9, sliderWidth / 2 - 1));
        this.thumb.setAttribute("cx", sliderWidth / 2);
        this.thumb.setAttribute("cy", splitterY);
        this.thumb.setAttribute("r", thumbRadius);
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const zeroInsideRange = config.minimum < 0 && config.maximum > 0;
        const zeroOverhang = classic ? 4 : 0;
        this.zeroLine.setAttribute("visibility", zeroInsideRange ? "visible" : "hidden");
        this.zeroLine.setAttribute("x1", trackX - zeroOverhang);
        this.zeroLine.setAttribute("y1", zeroY);
        this.zeroLine.setAttribute("x2", trackX + trackWidth + zeroOverhang);
        this.zeroLine.setAttribute("y2", zeroY);
        this.drawTicks(trackX, trackWidth, sliderHeight);
        this.drawScaleLabels(trackX, trackWidth, sliderHeight, config, zeroY, zeroInsideRange);
        this.applyShapeTransform(sliderWidth / 2, sliderHeight / 2, `translate(${position.x} ${position.y})`);
    }

    drawTicks(trackX, trackWidth, sliderHeight) {
        if (!this.ticksGroup)
            return;
        while (this.ticksGroup.firstChild)
            this.ticksGroup.removeChild(this.ticksGroup.firstChild);
        const config = this._sliderConfig ?? this.buildSliderConfig();
        const classic = this.isClassicStyle();
        const geometry = this.getTickGeometry(trackX, trackWidth);
        if (this.showsTicks() && geometry.majorLength > 0) {
            const borderColor = config.borderColor || "#999";
            for (const mark of this.getTickMarks(config, sliderHeight)) {
                const style = axisTickStyle(mark.kind);
                const y = sliderHeight - mark.pixel;
                const tick = this.board.createSvgElement("line");
                tick.setAttribute("x1", geometry.x);
                tick.setAttribute("y1", y);
                tick.setAttribute("x2", geometry.x + geometry.majorLength * style.lengthRatio);
                tick.setAttribute("y2", y);
                tick.setAttribute("stroke", borderColor);
                tick.setAttribute("stroke-width", style.strokeWidth);
                tick.setAttribute("stroke-opacity", style.opacity);
                this.ticksGroup.appendChild(tick);
            }
        }
        if (classic)
            this._updateTickInteractionHandles(0, Number(this.properties.width) || 0, sliderHeight, config);
        else
            this._updateTickInteractionHandles(trackX, trackWidth, sliderHeight, config);
    }

    drawScaleLabels(trackX, trackWidth, sliderHeight, config, zeroY, zeroInsideRange) {
        if (!this.scaleLabelsGroup)
            return;
        while (this.scaleLabelsGroup.firstChild)
            this.scaleLabelsGroup.removeChild(this.scaleLabelsGroup.firstChild);
        // The values read on the same side as the ticks: past the tick ends of the
        // classic rail, and outside the left border of the bar style.
        const geometry = this.getTickGeometry(trackX, trackWidth);
        const classic = this.isClassicStyle();
        const labelX = classic ? geometry.x + geometry.majorLength + 3 : -4;
        const anchor = classic ? "start" : "end";
        const showMaximum = this.properties.showMaximumValue === true;
        const showMinimum = this.properties.showMinimumValue === true;
        // Each value reads against its own spot on the axis, so it is centred on
        // the tick line it names rather than tucked inside the slider ends.
        if (showMaximum)
            this.appendScaleLabel(this.formatScaleValue(config.maximum), labelX, 0, anchor);
        if (showMinimum)
            this.appendScaleLabel(this.formatScaleValue(config.minimum), labelX, sliderHeight, anchor);
        if (zeroInsideRange) {
            const clearOfMaximum = !showMaximum || zeroY > SliderShape.scaleLabelHeight;
            const clearOfMinimum = !showMinimum || zeroY < sliderHeight - SliderShape.scaleLabelHeight;
            if (clearOfMaximum && clearOfMinimum)
                this.appendScaleLabel("0", labelX, zeroY, anchor);
        }
    }

    // Zero marks an exact spot on the axis, so it never carries the scale precision.
    formatScaleValue(value) {
        if (Number(value) === 0)
            return "0";
        return this.formatModelValue(value);
    }

    // y is the axis position the value marks; the digits are centred on it.
    appendScaleLabel(text, x, y, anchor = "end") {
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", x);
        label.setAttribute("y", y);
        label.setAttribute("dy", "0.35em");
        label.setAttribute("text-anchor", anchor);
        label.setAttribute("fill", this.properties.foregroundColor);
        label.setAttribute("font-family", "KaTeX_Main");
        label.setAttribute("font-size", SliderShape.scaleLabelFontSize);
        label.textContent = text;
        this.scaleLabelsGroup.appendChild(label);
    }

    // Ticks grow straight out of the track: from the right edge of the thin
    // classic rail, and from just inside the left border of the bar style.
    getTickGeometry(trackX, trackWidth) {
        const sliderWidth = Number(this.properties.width) || 0;
        const majorLength = SliderShape.majorTickLength;
        if (!this.isClassicStyle())
            return { x: trackX, majorLength: Math.max(0, Math.min(majorLength, trackWidth * 0.175)) };
        const x = trackX + trackWidth;
        return { x: x, majorLength: Math.max(0, Math.min(majorLength, sliderWidth - 1 - x)) };
    }

    // Major ticks land on round values, and the precision — the increment the
    // slider snaps to — drives the minor ticks whenever they still fit.
    getTickMarks(config, sliderHeight) {
        const range = config.maximum - config.minimum;
        const step = this.getMajorTickStep(range, sliderHeight);
        const precision = Number(this.properties.precision);
        return buildLinearTickMarks({
            minimum: config.minimum,
            maximum: config.maximum,
            lengthPixels: sliderHeight,
            step: step,
            anchor: "nice",
            preferredDivisions: precision > 0 ? Math.round(step / precision) : 0
        });
    }

    getMajorTickStep(range, sliderHeight) {
        const step = niceAxisTickStep(range, sliderHeight, 22);
        const precision = Number(this.properties.precision);
        if (!(step > 0) || !(precision > 0))
            return step;
        // Ticks are only worth showing where the slider can actually stop, so the
        // major grid stays on multiples of the snapping precision — unless the
        // precision is coarser than the whole scale, which would leave no ticks.
        const alignedStep = Math.max(precision, Math.round(step / precision) * precision);
        return alignedStep <= range ? alignedStep : step;
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
        // The scale drags along the slider's own vertical axis, so the arrow
        // follows that axis once the shape is rotated.
        const tickCursor = this.getRotatedResizeCursorStyle(this.getHandleRotationDegrees() + 90);
        for (let i = 0; i < ticks.length; i++) {
            const tick = ticks[i];
            const y = sliderHeight - tick.pixelFromOrigin;
            const halfHeight = extents[i];
            let hitRect = this.tickInteractionLayer.children[i];
            if (!hitRect) {
                hitRect = this.board.createSvgElement("rect");
                hitRect.setAttribute("fill", "transparent");
                hitRect.setAttribute("pointer-events", "all");
                hitRect.onpointerdown = e => this.onAxisPointerDown(e);
                this.tickInteractionLayer.appendChild(hitRect);
            }
            hitRect.style.cursor = tickCursor;
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
                this.refreshOpenContextToolbar();
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
