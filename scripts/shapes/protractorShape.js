class ProtractorShape extends BaseShape {
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
                template: () => {
                    const container = $('<div></div>');
                    this.createScaleDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    createScaleDropDownButton(container) {
        this._scaleDropdownContainer = container;
        this._scaleDropdownElement = $('<div>');
        this._scaleDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Scale Tooltip", this.board.translations, 280),
            icon: "fa-light fa-ruler",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildScaleMenuContent(contentElement)
            }
        });
        this._scaleDropdownElement.appendTo(container);
    }

    buildScaleMenuContent(contentElement) {
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        const angleMax = useRadians ? 2 : 360;
        const angleSuffix = useRadians ? "\u03c0" : "\u00ba";
        const angleFormat = {
            formatter: value => {
                const num = Number(value) || 0;
                const str = useRadians
                    ? String(Math.round(num * 100) / 100).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")
                    : String(Math.round(num));
                return `${str} ${angleSuffix}`;
            },
            parser: text => parseFloat(text) || 0
        };
        const listItems = [
            {
                text: "Scale",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0.000001 }), {
                        value: this.properties.scale,
                        onValueChanged: e => this.setPropertyCommand("scale", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Start angle",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: true, min: 0, max: angleMax }), {
                        value: this.properties.startAngle,
                        format: angleFormat,
                        onValueChanged: e => this.setPropertyCommand("startAngle", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "End angle",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: true, min: 0, max: angleMax }), {
                        value: this.properties.endAngle,
                        format: angleFormat,
                        onValueChanged: e => this.setPropertyCommand("endAngle", e.value)
                    })).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 200, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-control"));
            }
        });
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $container => $container.append(this._bgColorPicker)
        });
    }

    refreshShapeColorToolbarControl() {
        super.refreshShapeColorToolbarControl();
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
    }

    showContextToolbar() {
        const popup = this._scaleDropdownElement?.dxDropDownButton("instance")?.option("dropDownOptions");
        if (popup?.visible)
            this._scaleDropdownElement.dxDropDownButton("instance").close();
        super.showContextToolbar();
    }

    onAngleUnitChanged(previousUnit) {
        const previousIsRadians = previousUnit === "radians";
        const storedStart = Number(this.properties.startAngle) || 0;
        const storedEnd = Number(this.properties.endAngle) || 0;
        if (previousIsRadians) {
            this.properties.startAngle = storedStart * 180;
            this.properties.endAngle = storedEnd * 180;
        } else {
            this.properties.startAngle = storedStart / 180;
            this.properties.endAngle = storedEnd / 180;
        }
        if (this._scaleDropdownElement && this._scaleDropdownContainer) {
            this._scaleDropdownElement.dxDropDownButton("instance")?.dispose();
            this._scaleDropdownElement.remove();
            this._scaleDropdownElement = null;
            this.createScaleDropDownButton(this._scaleDropdownContainer);
        }
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
        this.properties.startAngle = 0;
        this.properties.endAngle = this.board.calculator.properties.angleUnit === "radians" ? 1 : 180;
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
        this.minorTicksLayer = this.board.createSvgElement("g");
        this.majorTicksLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        this.minorTicksLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        this.majorTicksLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        this.labelsLayer.setAttribute("clip-path", `url(#${this.clipPathId})`);
        element.appendChild(this.clipDefs);
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
            const outerArcStart = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, 0);
            const outerArcEnd = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, visualSpanDeg);
            const innerArcStart = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, 0);
            const innerArcEnd = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.innerRadius, visualSpanDeg);
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
            this.baseLine.removeAttribute("visibility");
            this.baseLine.setAttribute("x1", outerArcStart.x);
            this.baseLine.setAttribute("y1", outerArcStart.y);
            this.baseLine.setAttribute("x2", outerArcEnd.x);
            this.baseLine.setAttribute("y2", outerArcEnd.y);
            this.baseLine.setAttribute("stroke", this.properties.foregroundColor);
            this.baseLine.setAttribute("stroke-width", "1");
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

    getStartAngleDegrees() {
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        const storedStart = Number(this.properties.startAngle) || 0;
        return useRadians ? storedStart * 180 : storedStart;
    }

    getEndAngleDegrees() {
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        const storedEnd = Number(this.properties.endAngle) || 0;
        return useRadians ? storedEnd * 180 : storedEnd;
    }

    drawTicksAndLabels(geometry) {
        this.clearLayerChildren(this.minorTicksLayer);
        this.clearLayerChildren(this.majorTicksLayer);
        this.clearLayerChildren(this.labelsLayer);
        const scaleValue = this.normalizeScaleValue();
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        const degreeSymbol = useRadians ? "" : "\u00ba";
        const storedStart = Number(this.properties.startAngle) || 0;
        const storedEnd = Number(this.properties.endAngle) || 0;
        const visualSpanDeg = this.getVisualSpanDegrees();
        const totalStored = storedEnd > storedStart ? storedEnd - storedStart : (useRadians ? 1 : 180);
        const labelDecimalPlaces = useRadians ? 2 : 0;
        const isFullCircle = visualSpanDeg >= 360;
        const tickUpperBound = isFullCircle ? 359 : Math.round(visualSpanDeg);
        for (let angle = 0; angle <= tickUpperBound; angle++) {
            const isMajorTick = angle % 10 == 0;
            const isMiddleTick = !isMajorTick && angle % 5 == 0;
            const tickLength = isMajorTick ? 12 : (isMiddleTick ? 8 : 5);
            const outerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius, angle);
            const innerPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength, angle);
            this.addTickLine(isMajorTick ? this.majorTicksLayer : this.minorTicksLayer, outerPoint.x, outerPoint.y, innerPoint.x, innerPoint.y, isMajorTick ? 1.2 : 1);
            if (isMajorTick) {
                const labelPoint = this.getArcPoint(geometry.centerX, geometry.centerY, geometry.outerRadius - tickLength - 10, angle);
                const mappedAngleValue = storedStart + (angle / visualSpanDeg) * totalStored;
                const displayValue = useRadians ? mappedAngleValue * Math.PI : mappedAngleValue;
                this.addAngleLabel(labelPoint.x, labelPoint.y, this.formatAngleValue(displayValue * scaleValue, labelDecimalPlaces) + degreeSymbol);
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
