class SliderShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() {
        return new SliderTransformer(this.board, this);
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        this.addTermToForm("term", "Value", false, 2);
        var items = instance.option("items");
        items.push(
            {
                colSpan: 2,
                dataField: "autoScale",
                label: { text: "Auto scale" },
                editorType: "dxSwitch"
            }
        );
        items.push({
            colSpan: 2,
            itemType: "group",
            colCount: 2,
            items: [
                {
                    dataField: "minimum",
                    label: { text: "Minimum" },
                    editorType: "dxNumberBox",
                    editorOptions: this.getPrecisionNumberEditorOptions()
                },
                {
                    dataField: "maximum",
                    label: { text: "Maximum" },
                    editorType: "dxNumberBox",
                    editorOptions: this.getPrecisionNumberEditorOptions()
                }
            ]
        });
        items.push(
            this.createColorPickerFormItem("topColor", "Top color"),
            this.createColorPickerFormItem("bottomColor", "Bottom color")
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Slider Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 35;
        this.properties.y = center.y - 125;
        this.properties.width = 70;
        this.properties.height = 250;
        this.properties.rotation = 0;
        this.properties.term = null;
        this.properties.value = 0;
        this.properties.autoScale = true;
        this.properties.minimum = 0;
        this.properties.maximum = 1;
        this.properties.topColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.bottomColor = this.board.theme.getBackgroundColors()[3].color;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.topPart = this.board.createSvgElement("rect");
        this.bottomPart = this.board.createSvgElement("rect");
        this.container = this.board.createSvgElement("rect");
        this.splitter = this.board.createSvgElement("line");
        this.container.setAttribute("stroke-width", 1);
        this.splitter.setAttribute("stroke-width", 2);
        element.appendChild(this.bottomPart);
        element.appendChild(this.topPart);
        element.appendChild(this.container);
        element.appendChild(this.splitter);
        this._appliedConfig = null;
        this.updateSliderState();
        return element;
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
        const values = this.board.calculator.system.values;
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
        return {
            isBoundTerm,
            caseNumber,
            minimum: range.minimum,
            maximum: range.maximum,
            value: normalizedValue,
            splitterOffset: this.getSplitterOffsetFromValue(normalizedValue, range.minimum, range.maximum),
            topColor: this.properties.topColor,
            bottomColor: this.properties.bottomColor,
            backgroundColor: this.properties.backgroundColor,
            foregroundColor: this.properties.foregroundColor
        };
    }

    applySliderConfig(config) {
        this._sliderConfig = config;
        this.properties.value = config.value;
        if (this.container) {
            this.container.setAttribute("fill", "none");
            this.container.setAttribute("stroke", config.foregroundColor);
        }
        if (this.topPart)
            this.topPart.setAttribute("fill", config.topColor);
        if (this.bottomPart)
            this.bottomPart.setAttribute("fill", config.bottomColor);
        if (this.splitter)
            this.splitter.setAttribute("stroke", config.foregroundColor);
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
        return config.splitterOffset;
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
        return config.minimum + ratio * (config.maximum - config.minimum);
    }

    setSplitterValue(value) {
        if (!Number.isFinite(value))
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
        super.draw();
        this.drawShape();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const centerX = position.x + this.properties.width / 2;
        const centerY = position.y + this.properties.height / 2;
        const splitterY = this.getSplitterBoardY();
        const topHeight = this.clamp(splitterY - position.y, 0, this.properties.height);
        const bottomY = position.y + topHeight;
        const bottomHeight = this.properties.height - topHeight;
        const rotation = `rotate(${this.properties.rotation}, ${centerX}, ${centerY})`;
        this.bottomPart.setAttribute("x", position.x);
        this.bottomPart.setAttribute("y", bottomY);
        this.bottomPart.setAttribute("width", this.properties.width);
        this.bottomPart.setAttribute("height", bottomHeight);
        this.bottomPart.setAttribute("transform", rotation);
        this.topPart.setAttribute("x", position.x);
        this.topPart.setAttribute("y", position.y);
        this.topPart.setAttribute("width", this.properties.width);
        this.topPart.setAttribute("height", topHeight);
        this.topPart.setAttribute("transform", rotation);
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", this.properties.width);
        this.container.setAttribute("height", this.properties.height);
        this.container.setAttribute("transform", rotation);
        this.splitter.setAttribute("x1", position.x);
        this.splitter.setAttribute("y1", splitterY);
        this.splitter.setAttribute("x2", position.x + this.properties.width);
        this.splitter.setAttribute("y2", splitterY);
        this.splitter.setAttribute("transform", rotation);
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
