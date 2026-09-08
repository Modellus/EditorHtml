    class TermDisplay {
    static _labelFontSize = null;

    constructor(shape) {
        this.shape = shape;
        this.layer = null;
        this.guidesLayer = null;
        this.labelsLayer = null;
    }

    get board() {
        return this.shape.board;
    }

    get properties() {
        return this.shape.properties;
    }

    get entries() {
        return this.shape.termDisplayEntries;
    }

    initializeLayer() {
        this.layer = null;
        this.guidesLayer = null;
        this.labelsLayer = null;
        const element = this.shape.element;
        if (!element)
            return;
        if (element.tagName?.toLowerCase() != "g")
            return;
        this.layer = this.board.createSvgElement("g");
        this.layer.setAttribute("pointer-events", "none");
        this.guidesLayer = this.board.createSvgElement("g");
        this.labelsLayer = this.board.createSvgElement("g");
        this.layer.appendChild(this.guidesLayer);
        this.layer.appendChild(this.labelsLayer);
        // The labels are there to be read, so they go over whatever the shape draws.
        element.appendChild(this.layer);
    }

    getDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    }

    isDisplayVisible(mode) {
        if (mode === false || mode === "none")
            return false;
        return true;
    }

    normalizeTermValue(value) {
        if (value && typeof value === "object")
            return value.term ?? value.text ?? value.value;
        return value;
    }

    getCaseNumber(caseProperty) {
        const rawCaseNumber = this.properties[caseProperty] ?? 1;
        const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : parseInt(rawCaseNumber, 10);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return 1;
        return caseNumber;
    }

    formatModelValue(value, termName) {
        return Utils.formatModelValue(value, this.shape.getTermModelPrecision(termName), "\u2014", this.shape.getNotation?.());
    }

    formatTermForDisplay(term) {
        if (term == null || term === "")
            return "";
        const termText = String(term);
        const numeric = Number(termText);
        if (numeric === Infinity)
            return "∞";
        if (numeric === -Infinity)
            return "-∞";
        if (!Number.isFinite(numeric)) {
            const calculator = this.board?.calculator;
            if (calculator?.isTerm(termText))
                return Utils.getDisplayedTerm(termText, calculator.system);
            return Utils.getDisplayedTerm(termText);
        }
        return this.formatModelValue(numeric);
    }

    buildLabel(entry, index) {
        const modeProperty = this.getDisplayModeProperty(entry.term);
        if (!this.isDisplayVisible(this.properties[modeProperty] ?? "none"))
            return null;
        const override = this.shape.getTermEntryDisplayValue?.(entry, index);
        if (override)
            return override;
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return null;
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getCaseNumber(entry.caseProperty);
        const isTerm = calculator.isTerm(termName);
        const value = isTerm ? calculator.getByName(termName, caseNumber) : Number(termName);
        const valueText = isTerm ? this.formatModelValue(value, termName) : this.formatTermForDisplay(termName);
        if (!isTerm) {
            const isNumericValue = Number.isFinite(Number(termName));
            const displayedMissingTerm = this.formatTermForDisplay(termName);
            // A plain value carries the unit written beside it: 100 set as 100 m reads as one.
            const valueUnitText = isNumericValue ? this.shape.getTermUnitText(termName, entry.term) : "";
            return {
                termText: isNumericValue ? "" : displayedMissingTerm,
                valueText: isNumericValue ? valueText : "\u2014",
                unitText: valueUnitText,
                text: Utils.buildTermValueText(isNumericValue ? "" : displayedMissingTerm, isNumericValue ? valueText : "\u2014", valueUnitText),
                isMissingTerm: !isNumericValue
            };
        }
        const displayedTermText = this.formatTermForDisplay(termName);
        const unitText = this.shape.getTermUnitText(termName, entry.term);
        return {
            termText: displayedTermText,
            valueText: valueText,
            unitText: unitText,
            text: Utils.buildTermValueText(displayedTermText, valueText, unitText)
        };
    }

    isCaseIndicatorVisible(entry) {
        const modeProperty = this.getDisplayModeProperty(entry.term);
        if (!this.isDisplayVisible(this.properties[modeProperty] ?? "none"))
            return false;
        const termValue = this.normalizeTermValue(this.properties[entry.term]);
        return TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getBaseShapeCaseVisibilityConfig(this.shape));
    }

    getCaseIndicatorNumber(entry) {
        if (!this.isCaseIndicatorVisible(entry))
            return null;
        const caseNumber = this.getCaseNumber(entry.caseProperty);
        return this.shape.getClampedCaseNumber(caseNumber);
    }

    createLabelDefinition(entry, labelData, x, y, anchor) {
        return {
            text: labelData?.text ?? "",
            termText: labelData?.termText ?? "",
            valueText: labelData?.valueText ?? "",
            unitText: labelData?.unitText ?? "",
            x: x,
            y: y,
            anchor: anchor,
            caseNumber: this.getCaseIndicatorNumber(entry),
            color: entry.color ?? null,
            isMissingTerm: labelData?.isMissingTerm === true
        };
    }

    ensureLabelElements(index) {
        let labelGroup = this.labelsLayer.children[index];
        if (!labelGroup || labelGroup.tagName?.toLowerCase() != "g") {
            if (labelGroup)
                this.labelsLayer.removeChild(labelGroup);
            labelGroup = this.board.createSvgElement("g");
            const sibling = this.labelsLayer.children[index] ?? null;
            this.labelsLayer.insertBefore(labelGroup, sibling);
        }
        let backgroundRect = labelGroup.children[0];
        if (!backgroundRect || backgroundRect.tagName?.toLowerCase() != "rect") {
            if (backgroundRect)
                labelGroup.removeChild(backgroundRect);
            backgroundRect = this.board.createSvgElement("rect");
            backgroundRect.setAttribute("class", "shape-term-label-bg");
            backgroundRect.setAttribute("rx", "3");
            backgroundRect.setAttribute("fill-opacity", "0.85");
            if (labelGroup.firstChild)
                labelGroup.insertBefore(backgroundRect, labelGroup.firstChild);
            else
                labelGroup.appendChild(backgroundRect);
        }
        let caseIconGroup = labelGroup.children[1];
        if (!caseIconGroup || caseIconGroup.tagName?.toLowerCase() != "g") {
            if (caseIconGroup)
                labelGroup.removeChild(caseIconGroup);
            caseIconGroup = this.board.createSvgElement("g");
            caseIconGroup.setAttribute("class", "shape-term-case-icon-host");
            if (labelGroup.children[1])
                labelGroup.insertBefore(caseIconGroup, labelGroup.children[1]);
            else
                labelGroup.appendChild(caseIconGroup);
        }
        let labelText = labelGroup.children[2];
        if (!labelText || labelText.tagName?.toLowerCase() != "text") {
            if (labelText)
                labelGroup.removeChild(labelText);
            labelText = this.board.createSvgElement("text");
            labelText.setAttribute("class", "shape-term-label");
            labelGroup.appendChild(labelText);
        }
        return { group: labelGroup, backgroundRect: backgroundRect, caseIconGroup: caseIconGroup, labelText: labelText };
    }

    getLabelFontSize(labelText) {
        if (TermDisplay._labelFontSize == null)
            TermDisplay._labelFontSize = parseFloat(getComputedStyle(labelText).fontSize) || 10;
        return TermDisplay._labelFontSize;
    }

    getCaseIconLayout(label, labelText) {
        const iconSize = this.getLabelFontSize(labelText);
        const gap = Utils.caseIconGap;
        const y = label.y - iconSize / 2;
        if (!label.caseNumber)
            return { visible: false, iconSize: iconSize, iconX: 0, iconY: y, textX: label.x };
        if (label.anchor == "start")
            return { visible: true, iconSize: iconSize, iconX: label.x, iconY: y, textX: label.x + iconSize + gap };
        let labelLeft = label.x;
        if (labelText?.getBBox)
            try {
                labelLeft = labelText.getBBox().x;
            } catch (_) {}
        return { visible: true, iconSize: iconSize, iconX: labelLeft - gap - iconSize, iconY: y, textX: label.x };
    }

    getCaseIconBounds(layout) {
        if (!layout?.visible)
            return null;
        return { x: layout.iconX, y: layout.iconY, width: layout.iconSize, height: layout.iconSize };
    }

    applyCaseIcon(caseIconGroup, caseNumber, layout) {
        Utils.applyCaseIconSvg(caseIconGroup, layout.iconX, layout.iconY, layout.iconSize, layout.visible ? caseNumber : null);
    }

    setLabelText(labelText, label) {
        Utils.setTermValueTextContent(labelText, label?.termText ?? "", label?.valueText ?? label?.text ?? "", label?.unitText ?? "");
    }

    getLabelAnchor() {
        return this.shape.getTermLabelAnchor();
    }


    clearLayerChildren(layer) {
        if (!layer)
            return;
        while (layer.firstChild)
            layer.removeChild(layer.firstChild);
    }

    getEntryLabelPosition(entry, index) {
        return this.shape.getTermEntryLabelPosition(entry, index);
    }

    getEntryLabelColor(entry, index) {
        return this.shape.getTermEntryLabelColor(entry, index);
    }

    getShapeCenterPosition() {
        const position = this.shape.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.shape.image && !this.shape.container && !this.shape.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y };
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height / 2 };
        return { x: position.x, y: position.y };
    }

    // Where the axes cross, in the referential's own frame: the frame its axes are laid out
    // straight in, before the referential is turned on the board.
    getReferentialAxesPosition() {
        const referential = this.shape.getReferentialParent();
        if (!referential)
            return null;
        const referentialPosition = referential.getBoardPosition?.();
        if (!referentialPosition)
            return null;
        const axisX = referentialPosition.x + Number(referential.properties.originX ?? 0);
        const axisY = referentialPosition.y + Number(referential.properties.originY ?? 0);
        return { x: axisX, y: axisY };
    }

    // How the referential's frame is turned on the board, and the point it turns about.
    getReferentialFrame() {
        const referential = this.shape.getReferentialParent();
        if (!referential)
            return null;
        const referentialPosition = referential.getBoardPosition?.();
        if (!referentialPosition)
            return null;
        const rotation = typeof referential.getAbsoluteRotation == "function"
            ? Number(referential.getAbsoluteRotation())
            : Number(referential.properties.rotation);
        const center = this.shape.getRotationCenterForShape?.(referential, referentialPosition) ?? null;
        return { rotation: Number.isFinite(rotation) ? rotation : 0, center: center };
    }

    // A point on the board, as it lies in the referential's own frame - and back. The labels are
    // laid out in that frame, where the axes run straight, and placed on the board afterwards.
    toReferentialFrame(point) {
        const frame = this.getReferentialFrame();
        if (!frame?.center || Math.abs(frame.rotation) < 0.00001)
            return point;
        return this.shape.rotatePointAroundCenter(point.x, point.y, frame.center.x, frame.center.y, -frame.rotation);
    }

    toBoardFrame(point) {
        const frame = this.getReferentialFrame();
        if (!frame?.center || Math.abs(frame.rotation) < 0.00001)
            return point;
        return this.shape.rotatePointAroundCenter(point.x, point.y, frame.center.x, frame.center.y, frame.rotation);
    }

    // How far the labels are turned on the board: a shape drawn straight onto the board inside a
    // turned referential turns its labels with it, so they read along its axes.
    getLabelRotationDegrees() {
        const rotation = Number(this.shape.getTermLabelRotationDegrees?.());
        return Number.isFinite(rotation) ? rotation : 0;
    }

    // A label laid out under the shape, in the frame the shape is drawn in, placed where that
    // frame lies on the board: turned about the shape by as much as the labels are.
    turnLabelPointAboutShape(point) {
        if (!point)
            return point;
        const rotation = this.getLabelRotationDegrees();
        const position = this.shape.getBoardPosition?.();
        if (!position || Math.abs(rotation) < 0.00001)
            return point;
        const turned = this.shape.rotatePointAroundCenter(point.x, point.y, position.x, position.y, rotation);
        return Object.assign({}, point, { x: turned.x, y: turned.y });
    }

    applyLabelRotation(labelGroup, x, y) {
        const rotation = this.getLabelRotationDegrees();
        if (Math.abs(rotation) < 0.00001)
            labelGroup.removeAttribute("transform");
        else
            labelGroup.setAttribute("transform", `rotate(${rotation} ${x} ${y})`);
    }

    getTermAxis(termProperty) {
        const mapping = this.shape.termsMapping.find(termMapping => termMapping.termProperty == termProperty);
        if (!mapping)
            return null;
        if (mapping.scaleProperty == "x" || mapping.scaleProperty == "y")
            return mapping.scaleProperty;
        if (mapping.property == "x" || mapping.property == "y")
            return mapping.property;
        return null;
    }

    // The label of a value sits on the far side of the axis from the shape, at the point the
    // shape projects to on that axis. The shape's point is on the board; the axes cross in the
    // referential's frame, so the layout is done there and the label placed back on the board.
    getAxisLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex) {
        const framePosition = this.toReferentialFrame(shapeCenterPosition);
        let frameLabelPosition;
        if (axis == "x") {
            const side = framePosition.y <= axesPosition.y ? 1 : -1;
            frameLabelPosition = { x: framePosition.x, y: axesPosition.y + side * (12 + axisLabelIndex * 12), anchor: "middle" };
        } else {
            const side = framePosition.x <= axesPosition.x ? 1 : -1;
            frameLabelPosition = { x: axesPosition.x + side * 6, y: framePosition.y + axisLabelIndex * 12, anchor: side > 0 ? "start" : "end" };
        }
        const boardLabelPosition = this.toBoardFrame(frameLabelPosition);
        return { x: boardLabelPosition.x, y: boardLabelPosition.y, anchor: frameLabelPosition.anchor };
    }

    // The guide runs from the shape straight to the axis - straight in the referential's frame,
    // so it lands on the axis wherever the referential is turned to.
    createGuideLine(axis, shapeCenterPosition, axesPosition, color) {
        if (!this.guidesLayer)
            return;
        const framePosition = this.toReferentialFrame(shapeCenterPosition);
        const frameAxisPoint = axis == "x"
            ? { x: framePosition.x, y: axesPosition.y }
            : { x: axesPosition.x, y: framePosition.y };
        const boardAxisPoint = this.toBoardFrame(frameAxisPoint);
        const line = this.board.createSvgElement("line");
        line.setAttribute("class", "shape-term-guide-line");
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", 1);
        line.setAttribute("stroke-dasharray", "3 2");
        line.setAttribute("x1", shapeCenterPosition.x);
        line.setAttribute("y1", shapeCenterPosition.y);
        line.setAttribute("x2", boardAxisPoint.x);
        line.setAttribute("y2", boardAxisPoint.y);
        this.guidesLayer.appendChild(line);
    }

    draw() {
        if (!this.layer || !this.labelsLayer || !this.guidesLayer)
            return;
        const color = this.shape.getShapeNameColor();
        const labels = [];
        const fallbackAnchor = this.getLabelAnchor();
        const axesPosition = this.getReferentialAxesPosition();
        const shapeCenterPosition = this.getShapeCenterPosition();
        let fallbackLabelIndex = 0;
        const axisLabelIndexByKey = new Map();
        const drawnGuideKeys = new Set();
        this.clearLayerChildren(this.guidesLayer);
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const labelData = this.buildLabel(entry, i);
            if (!labelData)
                continue;
            const entryAnchor = this.shape.getTermEntryAnchorPoint?.(entry, i) ?? shapeCenterPosition;
            if (axesPosition && entryAnchor) {
                const axis = entry.axis ?? this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const anchorKey = `${axis}:${Math.round(entryAnchor.x)}:${Math.round(entryAnchor.y)}`;
                    const axisLabelIndex = axisLabelIndexByKey.get(anchorKey) ?? 0;
                    const labelPosition = this.getAxisLabelPosition(axis, entryAnchor, axesPosition, axisLabelIndex);
                    labels.push(this.createLabelDefinition(entry, labelData, labelPosition.x, labelPosition.y, labelPosition.anchor));
                    axisLabelIndexByKey.set(anchorKey, axisLabelIndex + 1);
                    if (!drawnGuideKeys.has(anchorKey)) {
                        this.createGuideLine(axis, entryAnchor, axesPosition, color);
                        drawnGuideKeys.add(anchorKey);
                    }
                    continue;
                }
            }
            if (!fallbackAnchor)
                continue;
            const entryColor = this.getEntryLabelColor(entry, fallbackLabelIndex);
            const coloredEntry = entryColor ? { ...entry, color: entryColor } : entry;
            const entryPosition = this.turnLabelPointAboutShape(this.getEntryLabelPosition(entry, fallbackLabelIndex));
            if (entryPosition)
                labels.push(this.createLabelDefinition(coloredEntry, labelData, entryPosition.x, entryPosition.y, entryPosition.anchor ?? "middle"));
            else {
                const stackedAnchor = this.turnLabelPointAboutShape({ x: fallbackAnchor.x, y: fallbackAnchor.y + fallbackLabelIndex * 12 });
                labels.push(this.createLabelDefinition(coloredEntry, labelData, stackedAnchor.x, stackedAnchor.y, fallbackAnchor.anchor ?? "middle"));
            }
            fallbackLabelIndex++;
        }
        while (this.labelsLayer.children.length > labels.length)
            this.labelsLayer.removeChild(this.labelsLayer.lastChild);
        if (labels.length == 0)
            return;
        for (let i = 0; i < labels.length; i++) {
            const labelElements = this.ensureLabelElements(i);
            const label = labels[i];
            const labelColor = label.isMissingTerm ? "#d13438" : (label.color ?? color);
            const labelContrastColor = Utils.getContrastColor(labelColor);
            const labelText = labelElements.labelText;
            labelText.setAttribute("x", label.x);
            labelText.setAttribute("y", label.y);
            labelText.setAttribute("text-anchor", label.anchor);
            labelText.setAttribute("dominant-baseline", "central");
            labelText.setAttribute("fill", labelContrastColor);
            this.setLabelText(labelText, label);
            const iconLayout = this.getCaseIconLayout(label, labelText);
            labelText.setAttribute("x", iconLayout.textX);
            this.applyCaseIcon(labelElements.caseIconGroup, label.caseNumber, iconLayout);
            this.applyLabelBackground(labelElements.backgroundRect, labelText, labelColor, label.anchor, this.getCaseIconBounds(iconLayout));
            this.applyLabelRotation(labelElements.group, label.x, label.y);
        }
    }

    applyLabelBackground(backgroundRect, labelText, color, anchor, caseIconBounds) {
        Utils.applyTermLabelBackground(backgroundRect, labelText, color, anchor, caseIconBounds);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = TermDisplay;
