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
                const pt = this.getPointerBoardPoint();
                return {
                    x: pt.x - handleSize / 2,
                    y: pt.y - handleSize / 2,
                    width: handleSize,
                    height: handleSize
                };
            },
            getTransform: e => ({
                pointerDrag: { x: e.x, y: e.y }
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

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Gauge Name");
        const center = this.board.getClientCenter();
        this.properties.x = center.x - 90;
        this.properties.y = center.y - 90;
        this.properties.width = 180;
        this.properties.height = 180;
        this.properties.angleTerm = this.board.calculator.properties.independent.name;
        this.properties.angleValue = 0;
        this.properties.magnitudeTerm = this.board.calculator.getDefaultTerm();
        this.properties.magnitudeValue = 0;
        this.properties.startAngle = 225;
        this.properties.endAngle = -45;
        this.properties.minimumMagnitude = 0;
        this.properties.maximumMagnitude = 1;
        this.properties.anglePrecision = 30;
        this.properties.snapToAngleTick = false;
        this.properties.magnitudePrecision = 0;
        this.properties.snapToMagnitudeTick = false;
        this.properties.backgroundColor = "#f7f7f7";
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createToolbar() {
        const items = super.createToolbar();
        this._angleTermControl = this.createTermControl("angleTerm", "Angle");
        this._magnitudeTermControl = this.createTermControl("magnitudeTerm", "Magnitude");
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
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createGaugeSettingsDropDownButton(container);
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

    showContextToolbar() {
        this.termFormControls["angleTerm"]?.termControl?.refresh();
        this.termFormControls["magnitudeTerm"]?.termControl?.refresh();
        this.refreshTermsToolbarControl();
        this.refreshGaugeSettingsToolbarControl();
        super.showContextToolbar();
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
    }

    refreshShapeColorToolbarControl() {
        super.refreshShapeColorToolbarControl();
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Angle", stacked: true, buildControl: $p => $p.append(this._angleTermControl) },
            { text: "Magnitude", stacked: true, buildControl: $p => $p.append(this._magnitudeTermControl) }
        );
    }

    renderTermsButtonTemplate(element) {
        const angleTerm = this.formatTermForDisplay(this.properties.angleTerm);
        const magnitudeTerm = this.formatTermForDisplay(this.properties.magnitudeTerm);
        const anglePart = angleTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${angleTerm}</span></span>` : "";
        const separator = (angleTerm && magnitudeTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
        const magnitudePart = magnitudeTerm ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${magnitudeTerm}</span></span>` : "";
        if (!anglePart && !magnitudePart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${anglePart}${separator}${magnitudePart}`;
    }

    createGaugeSettingsDropDownButton(itemElement) {
        this._gaugeSettingsDropdownElement = $('<div class="mdl-gauge-settings-selector">');
        this._gaugeSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Gauge settings",
            buttonTemplate: (data, element) => this.renderGaugeSettingsButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildGaugeSettingsMenuContent(contentElement)
            }
        });
        this._gaugeSettingsDropdownElement.appendTo(itemElement);
    }

    renderGaugeSettingsButtonTemplate(element) {
        element.innerHTML = `<i class="fa-light fa-dial" style="font-size:14px"></i>`;
    }

    buildGaugeSettingsMenuContent(contentElement) {
        const listItems = [
            {
                text: "Start angle (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.startAngle,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        onValueChanged: e => this.setPropertyCommand("startAngle", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "End angle (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.endAngle,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        onValueChanged: e => this.setPropertyCommand("endAngle", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Angle step (°)",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.properties.anglePrecision,
                        min: 0,
                        showSpinButtons: true,
                        step: 1,
                        stylingMode: "filled",
                        format: { type: "fixedPoint", precision: 0 },
                        onValueChanged: e => this.setPropertyCommand("anglePrecision", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Snap angle",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.snapToAngleTick === true,
                        onValueChanged: e => this.setPropertyCommand("snapToAngleTick", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Min magnitude",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.minimumMagnitude,
                        onValueChanged: e => this.setPropertyCommand("minimumMagnitude", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Max magnitude",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                        value: this.properties.maximumMagnitude,
                        onValueChanged: e => this.setPropertyCommand("maximumMagnitude", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Magnitude step",
                buildControl: $container => {
                    $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false, min: 0 }), {
                        value: this.properties.magnitudePrecision,
                        onValueChanged: e => this.setPropertyCommand("magnitudePrecision", e.value)
                    })).appendTo($container);
                }
            },
            {
                text: "Snap magnitude",
                buildControl: $container => {
                    $('<div>').dxSwitch({
                        value: this.properties.snapToMagnitudeTick === true,
                        onValueChanged: e => this.setPropertyCommand("snapToMagnitudeTick", e.value)
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 350, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
    }

    refreshGaugeSettingsToolbarControl() {
        if (!this._gaugeSettingsDropdownElement)
            return;
        const popup = this._gaugeSettingsDropdownElement.dxDropDownButton("instance").option("dropDownOptions");
        if (popup?.visible)
            this._gaugeSettingsDropdownElement.dxDropDownButton("instance").close();
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.gaugeBg = this.board.createSvgElement("path");
        this.magnitudeTicksLayer = this.board.createSvgElement("g");
        this.angleTicksLayer = this.board.createSvgElement("g");
        this.angleLabelsLayer = this.board.createSvgElement("g");
        this.pointerLine = this.board.createSvgElement("line");
        this.pointerDot = this.board.createSvgElement("circle");
        this.hubCircle = this.board.createSvgElement("circle");
        element.appendChild(this.gaugeBg);
        element.appendChild(this.magnitudeTicksLayer);
        element.appendChild(this.angleTicksLayer);
        element.appendChild(this.angleLabelsLayer);
        element.appendChild(this.pointerLine);
        element.appendChild(this.pointerDot);
        element.appendChild(this.hubCircle);
        return element;
    }

    getGaugeGeometry() {
        const width = Math.max(40, Number(this.properties.width) || 40);
        const height = Math.max(40, Number(this.properties.height) || 40);
        const cx = width / 2;
        const cy = height / 2;
        const maxR = Math.min(cx, cy);
        const labelPadding = 14;
        const outerR = Math.max(10, maxR - labelPadding);
        const hubR = Math.max(4, Math.min(outerR * 0.1, 8));
        const innerR = Math.max(hubR + 2, outerR * 0.25);
        return { width, height, cx, cy, outerR, innerR, hubR };
    }

    getMagnitudeRange() {
        const minimum = Number(this.properties.minimumMagnitude);
        const maximum = Number(this.properties.maximumMagnitude);
        const minVal = Number.isFinite(minimum) ? minimum : 0;
        const maxVal = Number.isFinite(maximum) ? maximum : 1;
        if (minVal === maxVal)
            return { minimum: minVal, maximum: maxVal + 1 };
        return { minimum: minVal, maximum: maxVal };
    }

    getPointerVisualAngleDeg() {
        const calculator = this.board.calculator;
        const angleTerm = this.properties.angleTerm;
        let storedAngle;
        if (angleTerm && calculator.isTerm(angleTerm))
            storedAngle = calculator.getByName(angleTerm, this.getTermCaseNumber("angleTermCase"));
        else
            storedAngle = Number(this.properties.angleValue ?? 0);
        if (!Number.isFinite(storedAngle))
            storedAngle = 0;
        const useRadians = calculator.properties.angleUnit === "radians";
        return useRadians ? storedAngle * 180 / Math.PI : storedAngle;
    }

    getPointerMagnitude() {
        const calculator = this.board.calculator;
        const magnitudeTerm = this.properties.magnitudeTerm;
        let magnitude;
        if (magnitudeTerm && calculator.isTerm(magnitudeTerm))
            magnitude = calculator.getByName(magnitudeTerm, this.getTermCaseNumber("magnitudeTermCase"));
        else
            magnitude = Number(this.properties.magnitudeValue ?? 0);
        if (!Number.isFinite(magnitude))
            magnitude = 0;
        return magnitude;
    }

    getPointerLocalPoint() {
        const geo = this.getGaugeGeometry();
        const visualAngleDeg = this.getPointerVisualAngleDeg();
        const magnitude = this.getPointerMagnitude();
        const { minimum, maximum } = this.getMagnitudeRange();
        const magnitudeSpan = maximum - minimum;
        const ratio = magnitudeSpan !== 0 ? Math.max(0, Math.min(1, (magnitude - minimum) / magnitudeSpan)) : 0;
        const r = geo.innerR + ratio * (geo.outerR - geo.innerR);
        const rad = visualAngleDeg * Math.PI / 180;
        return { x: geo.cx + r * Math.cos(rad), y: geo.cy - r * Math.sin(rad) };
    }

    getPointerBoardPoint() {
        const position = this.getBoardPosition();
        const geo = this.getGaugeGeometry();
        const localPt = this.getPointerLocalPoint();
        const unrotatedX = position.x + localPt.x;
        const unrotatedY = position.y + localPt.y;
        const rotation = Number(this.properties.rotation) || 0;
        if (Math.abs(rotation) < 0.00001)
            return { x: unrotatedX, y: unrotatedY };
        const boardCx = position.x + geo.cx;
        const boardCy = position.y + geo.cy;
        return this.rotatePointAroundCenter(unrotatedX, unrotatedY, boardCx, boardCy, rotation);
    }

    clampToGaugeAngle(angleDeg) {
        const startAngle = Number(this.properties.startAngle);
        const endAngle = Number(this.properties.endAngle);
        if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle))
            return angleDeg;
        const span = ((startAngle - endAngle) % 360 + 360) % 360 || 360;
        const offset = ((startAngle - angleDeg) % 360 + 360) % 360;
        if (offset <= span)
            return angleDeg;
        const toEnd = offset - span;
        const toStart = (360 - offset) % 360;
        return toEnd <= toStart ? endAngle : startAngle;
    }

    snapVisualAngle(angleDeg) {
        if (!this.properties.snapToAngleTick)
            return angleDeg;
        const precision = Number(this.properties.anglePrecision);
        if (!precision || precision <= 0)
            return angleDeg;
        const startAngle = Number(this.properties.startAngle) || 0;
        const offset = startAngle - angleDeg;
        const snappedOffset = Math.round(offset / precision) * precision;
        return startAngle - snappedOffset;
    }

    snapMagnitude(magnitude) {
        if (!this.properties.snapToMagnitudeTick)
            return magnitude;
        const precision = Number(this.properties.magnitudePrecision);
        if (!precision || precision <= 0)
            return magnitude;
        return Math.round(magnitude / precision) * precision;
    }

    applyPointerDrag({ x, y }) {
        const geo = this.getGaugeGeometry();
        const position = this.getBoardPosition();
        const boardCx = position.x + geo.cx;
        const boardCy = position.y + geo.cy;
        const rotation = Number(this.properties.rotation) || 0;
        const unrotated = Math.abs(rotation) < 0.00001
            ? { x, y }
            : this.rotatePointAroundCenter(x, y, boardCx, boardCy, -rotation);
        const localX = unrotated.x - boardCx;
        const localY = unrotated.y - boardCy;
        let visualAngleDeg = Math.atan2(-localY, localX) * 180 / Math.PI;
        visualAngleDeg = this.clampToGaugeAngle(visualAngleDeg);
        visualAngleDeg = this.snapVisualAngle(visualAngleDeg);
        const radialSpan = geo.outerR - geo.innerR;
        let magnitudeRatio = radialSpan > 0 ? (Math.hypot(localX, localY) - geo.innerR) / radialSpan : 0;
        const { minimum, maximum } = this.getMagnitudeRange();
        let magnitude = minimum + Math.max(0, Math.min(1, magnitudeRatio)) * (maximum - minimum);
        magnitude = this.snapMagnitude(magnitude);
        magnitude = Math.max(minimum, Math.min(maximum, magnitude));
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        const storedAngle = useRadians ? visualAngleDeg * Math.PI / 180 : visualAngleDeg;
        this.setGaugeTermValue("angleTerm", "angleTermCase", "angleValue", storedAngle);
        this.setGaugeTermValue("magnitudeTerm", "magnitudeTermCase", "magnitudeValue", magnitude);
    }

    setGaugeTermValue(termProperty, caseProperty, stateProperty, value) {
        if (this.isTermLocked(termProperty))
            return;
        const term = this.properties[termProperty];
        if (!term || !this.board.calculator.isTerm(term)) {
            this.properties[stateProperty] = value;
            this.board.markDirty(this);
            return;
        }
        const caseNumber = this.getTermCaseNumber(caseProperty);
        this.board.calculator.setTermValue(term, value, this.board.calculator.getIteration(), caseNumber);
        this.board.calculator.calculate();
    }

    getArcPoint(cx, cy, r, angleDeg) {
        const rad = angleDeg * Math.PI / 180;
        return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
    }

    buildAnnularSectorPath(cx, cy, innerR, outerR, startAngle, endAngle) {
        const span = ((startAngle - endAngle) % 360 + 360) % 360;
        if (span < 0.001)
            return "";
        const largeArc = span > 180 ? 1 : 0;
        const p1 = this.getArcPoint(cx, cy, outerR, startAngle);
        const p2 = this.getArcPoint(cx, cy, outerR, endAngle);
        const p3 = this.getArcPoint(cx, cy, innerR, endAngle);
        const p4 = this.getArcPoint(cx, cy, innerR, startAngle);
        return [
            `M ${p1.x} ${p1.y}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
            `L ${p3.x} ${p3.y}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
            "Z"
        ].join(" ");
    }

    addAngleTick(angleDeg, isStart, geo, fg) {
        const tickLength = isStart ? 10 : 7;
        const strokeWidth = isStart ? 1.5 : 1;
        const p1 = this.getArcPoint(geo.cx, geo.cy, geo.outerR - tickLength, angleDeg);
        const p2 = this.getArcPoint(geo.cx, geo.cy, geo.outerR, angleDeg);
        const line = this.board.createSvgElement("line");
        line.setAttribute("x1", p1.x);
        line.setAttribute("y1", p1.y);
        line.setAttribute("x2", p2.x);
        line.setAttribute("y2", p2.y);
        line.setAttribute("stroke", fg);
        line.setAttribute("stroke-width", strokeWidth);
        this.angleTicksLayer.appendChild(line);
    }

    addAngleLabel(angleDeg, geo, fg, useRadians) {
        const labelR = geo.outerR + 10;
        const lp = this.getArcPoint(geo.cx, geo.cy, labelR, angleDeg);
        const storedVal = useRadians ? angleDeg * Math.PI / 180 : angleDeg;
        const formatted = parseFloat(storedVal.toFixed(2)).toString();
        const displayText = formatted === "-0" ? "0" : formatted;
        const label = this.board.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", lp.x);
        label.setAttribute("y", lp.y);
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", fg);
        label.setAttribute("font-family", "KaTeX_Main");
        label.setAttribute("font-size", "9");
        label.textContent = displayText;
        this.angleLabelsLayer.appendChild(label);
    }

    addMagnitudeTickArc(r, startAngle, endAngle, geo, fg) {
        const span = ((startAngle - endAngle) % 360 + 360) % 360;
        if (span < 0.001)
            return;
        const largeArc = span > 180 ? 1 : 0;
        const p1 = this.getArcPoint(geo.cx, geo.cy, r, startAngle);
        const p2 = this.getArcPoint(geo.cx, geo.cy, r, endAngle);
        const path = this.board.createSvgElement("path");
        path.setAttribute("d", `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", fg);
        path.setAttribute("stroke-width", "0.8");
        this.magnitudeTicksLayer.appendChild(path);
    }

    drawAngleTicks(geo, startAngle, endAngle, fg, precision) {
        this.clearLayerChildren(this.angleTicksLayer);
        this.clearLayerChildren(this.angleLabelsLayer);
        if (!precision || precision <= 0)
            return;
        const span = ((startAngle - endAngle) % 360 + 360) % 360;
        if (span < 0.001)
            return;
        const maxTicks = Math.min(360, Math.ceil(span / precision) + 1);
        const useRadians = this.board.calculator.properties.angleUnit === "radians";
        for (let i = 0; i <= maxTicks; i++) {
            const tickOffset = i * precision;
            if (tickOffset > span + 0.001)
                break;
            const angleDeg = startAngle - tickOffset;
            this.addAngleTick(angleDeg, i === 0, geo, fg);
            if (maxTicks <= 18)
                this.addAngleLabel(angleDeg, geo, fg, useRadians);
        }
    }

    drawMagnitudeTicks(geo, startAngle, endAngle, fg, precision, minimum, maximum) {
        this.clearLayerChildren(this.magnitudeTicksLayer);
        if (!precision || precision <= 0)
            return;
        const range = maximum - minimum;
        if (range <= 0)
            return;
        const tickCount = Math.floor(range / precision);
        if (tickCount > 200)
            return;
        for (let i = 0; i <= tickCount; i++) {
            const magnitude = minimum + i * precision;
            const ratio = (magnitude - minimum) / range;
            const r = geo.innerR + ratio * (geo.outerR - geo.innerR);
            this.addMagnitudeTickArc(r, startAngle, endAngle, geo, fg);
        }
    }

    draw() {
        super.draw();
        const geo = this.getGaugeGeometry();
        const rawStartAngle = Number(this.properties.startAngle);
        const rawEndAngle = Number(this.properties.endAngle);
        const startAngle = Number.isFinite(rawStartAngle) ? rawStartAngle : 225;
        const endAngle = Number.isFinite(rawEndAngle) ? rawEndAngle : -45;
        const fg = this.properties.foregroundColor;
        const border = this.getBorderColor();
        this.gaugeBg.setAttribute("d", this.buildAnnularSectorPath(geo.cx, geo.cy, geo.innerR, geo.outerR, startAngle, endAngle));
        this.gaugeBg.setAttribute("fill", this.properties.backgroundColor);
        this.gaugeBg.setAttribute("stroke", border);
        this.gaugeBg.setAttribute("stroke-width", "1");
        this.drawAngleTicks(geo, startAngle, endAngle, fg, Number(this.properties.anglePrecision));
        const { minimum, maximum } = this.getMagnitudeRange();
        this.drawMagnitudeTicks(geo, startAngle, endAngle, fg, Number(this.properties.magnitudePrecision), minimum, maximum);
        const pt = this.getPointerLocalPoint();
        this.pointerLine.setAttribute("x1", geo.cx);
        this.pointerLine.setAttribute("y1", geo.cy);
        this.pointerLine.setAttribute("x2", pt.x);
        this.pointerLine.setAttribute("y2", pt.y);
        this.pointerLine.setAttribute("stroke", fg);
        this.pointerLine.setAttribute("stroke-width", "2");
        this.pointerLine.setAttribute("stroke-linecap", "round");
        this.pointerDot.setAttribute("cx", pt.x);
        this.pointerDot.setAttribute("cy", pt.y);
        this.pointerDot.setAttribute("r", "4");
        this.pointerDot.setAttribute("fill", fg);
        this.pointerDot.setAttribute("stroke", "none");
        this.hubCircle.setAttribute("cx", geo.cx);
        this.hubCircle.setAttribute("cy", geo.cy);
        this.hubCircle.setAttribute("r", geo.hubR);
        this.hubCircle.setAttribute("fill", fg);
        this.hubCircle.setAttribute("stroke", "none");
        const position = this.getBoardPosition();
        this.element.setAttribute("transform", `translate(${position.x} ${position.y}) rotate(${this.properties.rotation} ${geo.cx} ${geo.cy})`);
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }
}
