class RulerShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    enterEditMode() {
        return false;
    }

    createToolbar() {
        const items = super.createToolbar();
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                widget: "dxNumberBox",
                options: Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0.000001 }), {
                    value: this.properties.scale,
                    hint: "Scale",
                    onInitialized: e => { this._scaleBoxInstance = e.component; },
                    onValueChanged: e => {
                        this.setPropertyCommand("scale", e.value);
                    }
                })
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    showContextToolbar() {
        this.refreshNameToolbarControl();
        this._scaleBoxInstance?.option("value", this.properties.scale);
        this.refreshShapeColorToolbarControl();
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
        this.properties.scale = 1;
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
        element.appendChild(this.container);
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

    getMajorStepPixels(usableWidth) {
        const normalizedWidth = Math.max(1, usableWidth);
        const targetTicks = Math.max(4, Math.min(12, Math.round(normalizedWidth / 32)));
        const step = normalizedWidth / targetTicks;
        return Math.max(18, step);
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
        this.container.setAttribute("rx", 3);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.container, 1);
    }

    addTickLine(layer, x, y1, y2, strokeWidth) {
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", this.properties.foregroundColor);
        line.setAttribute("stroke-width", strokeWidth);
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
        const majorStepPixels = this.getMajorStepPixels(geometry.usableWidth);
        const minorDivisions = 5;
        const minorStepPixels = majorStepPixels / minorDivisions;
        const topY = geometry.y + 1;
        const minorBottomY = geometry.y + geometry.height * 0.38;
        const majorBottomY = geometry.y + geometry.height * 0.58;
        const labelsY = geometry.y + geometry.height * 0.8;
        const scaleValue = this.normalizeScaleValue();
        const majorTicksCount = Math.floor(geometry.usableWidth / majorStepPixels);
        for (let majorIndex = 0; majorIndex <= majorTicksCount; majorIndex++) {
            const majorX = geometry.left + majorIndex * majorStepPixels;
            this.addTickLine(this.majorTicksLayer, majorX, topY, majorBottomY, 1.2);
            this.addTickLabel(majorX, labelsY, this.formatModelValue(majorIndex * scaleValue));
            for (let minorIndex = 1; minorIndex < minorDivisions; minorIndex++) {
                const minorX = majorX + minorIndex * minorStepPixels;
                if (minorX >= geometry.right)
                    break;
                this.addTickLine(this.minorTicksLayer, minorX, topY, minorBottomY, 1);
            }
        }
        const lastMajorX = geometry.left + majorTicksCount * majorStepPixels;
        if (Math.abs(geometry.right - lastMajorX) > 0.5) {
            const endValue = geometry.usableWidth / majorStepPixels * scaleValue;
            this.addTickLine(this.majorTicksLayer, geometry.right, topY, majorBottomY, 1.2);
            this.addTickLabel(geometry.right, labelsY, this.formatModelValue(endValue));
        }
    }

    draw() {
        super.draw();
        const geometry = this.getRulerGeometry();
        this.drawRulerBody(geometry);
        this.drawRulerTicks(geometry);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${geometry.x + geometry.width / 2}, ${geometry.y + geometry.height / 2})`);
    }
}
