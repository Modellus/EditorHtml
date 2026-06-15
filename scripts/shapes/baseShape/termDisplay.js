    class TermDisplay {
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
        if (element.firstChild)
            element.insertBefore(this.layer, element.firstChild);
        else
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

    formatModelValue(value) {
        const numericValue = Number(value);
        if (numericValue === Infinity)
            return "∞";
        if (numericValue === -Infinity)
            return "-∞";
        if (!Number.isFinite(numericValue))
            return "\u2014";
        const precision = this.shape.getModelPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        if (precision > 0)
            return normalized.toFixed(precision);
        return normalized.toString();
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

    buildLabel(entry) {
        const modeProperty = this.getDisplayModeProperty(entry.term);
        if (!this.isDisplayVisible(this.properties[modeProperty] ?? "none"))
            return null;
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return null;
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getCaseNumber(entry.caseProperty);
        const isTerm = calculator.isTerm(termName);
        const value = isTerm ? calculator.getByName(termName, caseNumber) : Number(termName);
        const valueText = isTerm ? this.formatModelValue(value) : this.formatTermForDisplay(termName);
        if (!isTerm)
            return {
                termText: "",
                valueText: valueText,
                text: valueText
            };
        const displayedTermText = this.formatTermForDisplay(termName);
        return {
            termText: displayedTermText,
            valueText: valueText,
            text: `${displayedTermText} = ${valueText}`
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
            x: x,
            y: y,
            anchor: anchor,
            caseNumber: this.getCaseIndicatorNumber(entry),
            color: entry.color ?? null
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

    getCaseIconLayout(label, labelText) {
        const iconSize = 9;
        const gap = 3;
        const y = label.y - iconSize / 2;
        if (!label.caseNumber)
            return { visible: false, iconSize: iconSize, iconX: 0, iconY: y, textX: label.x };
        if (label.anchor == "start")
            return { visible: true, iconSize: iconSize, iconX: label.x, iconY: y, textX: label.x + iconSize + gap };
        if (label.anchor == "end")
            return { visible: true, iconSize: iconSize, iconX: label.x - iconSize, iconY: y, textX: label.x - iconSize - gap };
        let labelLeft = label.x;
        if (labelText?.getBBox)
            try {
                labelLeft = labelText.getBBox().x;
            } catch (_) {}
        const textX = label.x;
        const iconX = labelLeft - gap - iconSize;
        return { visible: true, iconSize: iconSize, iconX: iconX, iconY: y, textX: textX };
    }

    applyCaseIcon(caseIconGroup, caseNumber, layout) {
        Utils.applyCaseIconSvg(caseIconGroup, layout.iconX, layout.iconY, layout.iconSize, layout.visible ? caseNumber : null);
    }

    setLabelText(labelText, label) {
        Utils.setTermValueTextContent(labelText, label?.termText ?? "", label?.valueText ?? label?.text ?? "");
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

    getAxisLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex) {
        if (axis == "x") {
            if (shapeCenterPosition.y <= axesPosition.y)
                return { x: shapeCenterPosition.x, y: axesPosition.y + 12 + axisLabelIndex * 12, anchor: "middle" };
            return { x: shapeCenterPosition.x, y: axesPosition.y - 12 - axisLabelIndex * 12, anchor: "middle" };
        }
        if (shapeCenterPosition.x <= axesPosition.x)
            return { x: axesPosition.x + 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "start" };
        return { x: axesPosition.x - 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "end" };
    }

    createGuideLine(axis, shapeCenterPosition, axesPosition, color) {
        if (!this.guidesLayer)
            return;
        const line = this.board.createSvgElement("line");
        line.setAttribute("class", "shape-term-guide-line");
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", 1);
        line.setAttribute("stroke-dasharray", "3 2");
        if (axis == "x") {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", shapeCenterPosition.x);
            line.setAttribute("y2", axesPosition.y);
        } else {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", axesPosition.x);
            line.setAttribute("y2", shapeCenterPosition.y);
        }
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
        let xAxisLabelIndex = 0;
        let yAxisLabelIndex = 0;
        let hasXGuide = false;
        let hasYGuide = false;
        this.clearLayerChildren(this.guidesLayer);
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            const labelData = this.buildLabel(entry);
            if (!labelData)
                continue;
            if (axesPosition && shapeCenterPosition) {
                const axis = this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const axisLabelIndex = axis == "x" ? xAxisLabelIndex : yAxisLabelIndex;
                    const labelPosition = this.getAxisLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex);
                    labels.push(this.createLabelDefinition(entry, labelData, labelPosition.x, labelPosition.y, labelPosition.anchor));
                    if (axis == "x") {
                        xAxisLabelIndex++;
                        if (!hasXGuide) {
                            this.createGuideLine("x", shapeCenterPosition, axesPosition, color);
                            hasXGuide = true;
                        }
                    } else {
                        yAxisLabelIndex++;
                        if (!hasYGuide) {
                            this.createGuideLine("y", shapeCenterPosition, axesPosition, color);
                            hasYGuide = true;
                        }
                    }
                    continue;
                }
            }
            if (!fallbackAnchor)
                continue;
            const entryColor = this.getEntryLabelColor(entry, fallbackLabelIndex);
            const coloredEntry = entryColor ? { ...entry, color: entryColor } : entry;
            const entryPosition = this.getEntryLabelPosition(entry, fallbackLabelIndex);
            if (entryPosition)
                labels.push(this.createLabelDefinition(coloredEntry, labelData, entryPosition.x, entryPosition.y, entryPosition.anchor ?? "middle"));
            else
                labels.push(this.createLabelDefinition(coloredEntry, labelData, fallbackAnchor.x, fallbackAnchor.y + fallbackLabelIndex * 12, fallbackAnchor.anchor ?? "middle"));
            fallbackLabelIndex++;
        }
        while (this.labelsLayer.children.length > labels.length)
            this.labelsLayer.removeChild(this.labelsLayer.lastChild);
        if (labels.length == 0)
            return;
        for (let i = 0; i < labels.length; i++) {
            const labelElements = this.ensureLabelElements(i);
            const label = labels[i];
            const labelColor = label.color ?? color;
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
            this.applyLabelBackground(labelElements.backgroundRect, labelText, labelColor, label.anchor);
        }
    }

    applyLabelBackground(backgroundRect, labelText, color, anchor) {
        Utils.applyTermLabelBackground(backgroundRect, labelText, color, anchor);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = TermDisplay;
