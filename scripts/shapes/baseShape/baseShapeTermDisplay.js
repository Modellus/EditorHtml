Object.assign(BaseShape.prototype, {
    initializeTermDisplayLayer() {
        this.termDisplayLayer = null;
        this.termDisplayGuidesLayer = null;
        this.termDisplayLabelsLayer = null;
        if (!this.element)
            return;
        if (this.element.tagName?.toLowerCase() != "g")
            return;
        this.termDisplayLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.setAttribute("pointer-events", "none");
        this.termDisplayGuidesLayer = this.board.createSvgElement("g");
        this.termDisplayLabelsLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.appendChild(this.termDisplayGuidesLayer);
        this.termDisplayLayer.appendChild(this.termDisplayLabelsLayer);
        if (this.element.firstChild)
            this.element.insertBefore(this.termDisplayLayer, this.element.firstChild);
        else
            this.element.appendChild(this.termDisplayLayer);
    },
    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    },
    isTermDisplayVisible(mode) {
        if (mode === false || mode === "none")
            return false;
        return true;
    },
    normalizeTermValue(value) {
        if (value && typeof value === "object")
            return value.term ?? value.text ?? value.value;
        return value;
    },
    getTermCaseNumber(caseProperty) {
        const rawCaseNumber = this.properties[caseProperty] ?? 1;
        const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : parseInt(rawCaseNumber, 10);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return 1;
        return caseNumber;
    },
    formatModelValue(value) {
        const numericValue = Number(value);
        if (numericValue === Infinity)
            return "∞";
        if (numericValue === -Infinity)
            return "-∞";
        if (!Number.isFinite(numericValue))
            return "\u2014";
        const precision = this.getModelPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        if (precision > 0)
            return normalized.toFixed(precision);
        return normalized.toString();
    },
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
    },
    buildTermDisplayLabel(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return null;
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return null;
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
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
    },
    isTermCaseIndicatorVisible(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return false;
        const termValue = this.normalizeTermValue(this.properties[entry.term]);
        return TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getBaseShapeCaseVisibilityConfig(this));
    },
    getTermCaseIndicatorNumber(entry) {
        if (!this.isTermCaseIndicatorVisible(entry))
            return null;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        return this.getClampedCaseNumber(caseNumber);
    },
    createTermLabelDefinition(entry, labelData, x, y, anchor) {
        return {
            text: labelData?.text ?? "",
            termText: labelData?.termText ?? "",
            valueText: labelData?.valueText ?? "",
            x: x,
            y: y,
            anchor: anchor,
            caseNumber: this.getTermCaseIndicatorNumber(entry)
        };
    },
    ensureTermLabelElements(index) {
        let labelGroup = this.termDisplayLabelsLayer.children[index];
        if (!labelGroup || labelGroup.tagName?.toLowerCase() != "g") {
            if (labelGroup)
                this.termDisplayLabelsLayer.removeChild(labelGroup);
            labelGroup = this.board.createSvgElement("g");
            const sibling = this.termDisplayLabelsLayer.children[index] ?? null;
            this.termDisplayLabelsLayer.insertBefore(labelGroup, sibling);
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
        let caseIconHost = labelGroup.children[1];
        if (!caseIconHost || caseIconHost.tagName?.toLowerCase() != "foreignobject") {
            if (caseIconHost)
                labelGroup.removeChild(caseIconHost);
            caseIconHost = this.board.createSvgElement("foreignObject");
            caseIconHost.setAttribute("class", "shape-term-case-icon-host");
            if (labelGroup.children[1])
                labelGroup.insertBefore(caseIconHost, labelGroup.children[1]);
            else
                labelGroup.appendChild(caseIconHost);
        }
        if (!caseIconHost.firstChild || caseIconHost.firstChild.tagName?.toLowerCase() != "div") {
            const iconContainer = this.board.createElement("div");
            iconContainer.setAttribute("class", "shape-term-case-icon-container");
            caseIconHost.replaceChildren(iconContainer);
        }
        const iconContainer = caseIconHost.firstChild;
        if (!iconContainer.firstChild || iconContainer.firstChild.tagName?.toLowerCase() != "i") {
            const icon = this.board.createElement("i");
            icon.setAttribute("class", "shape-term-case-icon");
            iconContainer.replaceChildren(icon);
        }
        let labelText = labelGroup.children[2];
        if (!labelText || labelText.tagName?.toLowerCase() != "text") {
            if (labelText)
                labelGroup.removeChild(labelText);
            labelText = this.board.createSvgElement("text");
            labelText.setAttribute("class", "shape-term-label");
            labelGroup.appendChild(labelText);
        }
        return { group: labelGroup, backgroundRect: backgroundRect, caseIconHost: caseIconHost, caseIconElement: caseIconHost.firstChild.firstChild, labelText: labelText };
    },
    getTermCaseIconLayout(label, labelText) {
        const iconSize = 9;
        const gap = 3;
        const y = label.y + 1;
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
    },
    applyTermCaseIcon(caseIconHost, caseIconElement, caseNumber, layout) {
        if (!caseIconHost || !caseIconElement)
            return;
        if (!layout.visible) {
            caseIconHost.setAttribute("display", "none");
            return;
        }
        caseIconHost.removeAttribute("display");
        caseIconHost.setAttribute("x", `${layout.iconX}`);
        caseIconHost.setAttribute("y", `${layout.iconY}`);
        caseIconHost.setAttribute("width", `${layout.iconSize}`);
        caseIconHost.setAttribute("height", `${layout.iconSize + 1}`);
        const iconClass = `${TermControl.getCaseNumberIconClass(caseNumber)} shape-term-case-icon`;
        if (caseIconElement.getAttribute("class") != iconClass)
            caseIconElement.setAttribute("class", iconClass);
        const iconColor = TermControl.getCaseIconColor(caseNumber);
        if (caseIconElement.style.color != iconColor)
            caseIconElement.style.color = iconColor;
    },
    setTermLabelText(labelText, label) {
        while (labelText.firstChild)
            labelText.removeChild(labelText.firstChild);
        if (!label) {
            labelText.textContent = "";
            return;
        }
        const termText = label.termText ?? "";
        const valueText = label.valueText ?? "";
        if (termText === "" && valueText === "") {
            labelText.textContent = label.text ?? "";
            return;
        }
        if (termText === "") {
            const valueSpan = this.board.createSvgElement("tspan");
            valueSpan.setAttribute("font-family", "Katex_Main");
            valueSpan.textContent = valueText;
            labelText.appendChild(valueSpan);
            return;
        }
        if (label.anchor === "middle") {
            const equalsGap = 3;
            const termSpan = this.board.createSvgElement("tspan");
            termSpan.setAttribute("font-family", "Katex_Math");
            termSpan.setAttribute("x", label.x - equalsGap);
            termSpan.setAttribute("text-anchor", "end");
            termSpan.textContent = Utils.convertGreekLetters(termText);
            labelText.appendChild(termSpan);
            const valueSpan = this.board.createSvgElement("tspan");
            valueSpan.setAttribute("font-family", "Katex_Main");
            valueSpan.setAttribute("x", label.x + equalsGap);
            valueSpan.setAttribute("text-anchor", "start");
            valueSpan.textContent = `= ${valueText}`;
            labelText.appendChild(valueSpan);
            return;
        }
        const termSpan = this.board.createSvgElement("tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.textContent = Utils.convertGreekLetters(termText);
        labelText.appendChild(termSpan);
        const separatorSpan = this.board.createSvgElement("tspan");
        separatorSpan.setAttribute("font-family", "Katex_Main");
        separatorSpan.textContent = " = ";
        labelText.appendChild(separatorSpan);
        const valueSpan = this.board.createSvgElement("tspan");
        valueSpan.setAttribute("font-family", "Katex_Main");
        valueSpan.textContent = valueText;
        labelText.appendChild(valueSpan);
    },
    getTermLabelAnchor() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x + radius, y: position.y + radius * 2 + 4 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height + 4 };
        return { x: position.x, y: position.y + 4 };
    },
    clearLayerChildren(layer) {
        if (!layer)
            return;
        while (layer.firstChild)
            layer.removeChild(layer.firstChild);
    },
    getShapeCenterPosition() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y };
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height / 2 };
        return { x: position.x, y: position.y };
    },
    getReferentialAxesPosition() {
        const referential = this.getReferentialParent();
        if (!referential)
            return null;
        const referentialPosition = referential.getBoardPosition?.();
        if (!referentialPosition)
            return null;
        const axisX = referentialPosition.x + Number(referential.properties.originX ?? 0);
        const axisY = referentialPosition.y + Number(referential.properties.originY ?? 0);
        return { x: axisX, y: axisY };
    },
    getTermAxis(termProperty) {
        const mapping = this.termsMapping.find(termMapping => termMapping.termProperty == termProperty);
        if (!mapping)
            return null;
        if (mapping.scaleProperty == "x" || mapping.scaleProperty == "y")
            return mapping.scaleProperty;
        if (mapping.property == "x" || mapping.property == "y")
            return mapping.property;
        return null;
    },
    getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex) {
        if (axis == "x") {
            if (shapeCenterPosition.y <= axesPosition.y)
                return { x: shapeCenterPosition.x, y: axesPosition.y + 12 + axisLabelIndex * 12, anchor: "middle" };
            return { x: shapeCenterPosition.x, y: axesPosition.y - 12 - axisLabelIndex * 12, anchor: "middle" };
        }
        if (shapeCenterPosition.x <= axesPosition.x)
            return { x: axesPosition.x + 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "start" };
        return { x: axesPosition.x - 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "end" };
    },
    createTermGuideLine(axis, shapeCenterPosition, axesPosition, color) {
        if (!this.termDisplayGuidesLayer)
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
        this.termDisplayGuidesLayer.appendChild(line);
    },
    drawTermDisplayLabels() {
        if (!this.termDisplayLayer || !this.termDisplayLabelsLayer || !this.termDisplayGuidesLayer)
            return;
        const color = this.getShapeNameColor();
        const labels = [];
        const fallbackAnchor = this.getTermLabelAnchor();
        const axesPosition = this.getReferentialAxesPosition();
        const shapeCenterPosition = this.getShapeCenterPosition();
        let fallbackLabelIndex = 0;
        let xAxisLabelIndex = 0;
        let yAxisLabelIndex = 0;
        let hasXGuide = false;
        let hasYGuide = false;
        this.clearLayerChildren(this.termDisplayGuidesLayer);
        for (let i = 0; i < this.termDisplayEntries.length; i++) {
            const entry = this.termDisplayEntries[i];
            const labelData = this.buildTermDisplayLabel(entry);
            if (!labelData)
                continue;
            if (axesPosition && shapeCenterPosition) {
                const axis = this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const axisLabelIndex = axis == "x" ? xAxisLabelIndex : yAxisLabelIndex;
                    const labelPosition = this.getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex);
                    labels.push(this.createTermLabelDefinition(entry, labelData, labelPosition.x, labelPosition.y, labelPosition.anchor));
                    if (axis == "x") {
                        xAxisLabelIndex++;
                        if (!hasXGuide) {
                            this.createTermGuideLine("x", shapeCenterPosition, axesPosition, color);
                            hasXGuide = true;
                        }
                    } else {
                        yAxisLabelIndex++;
                        if (!hasYGuide) {
                            this.createTermGuideLine("y", shapeCenterPosition, axesPosition, color);
                            hasYGuide = true;
                        }
                    }
                    continue;
                }
            }
            if (!fallbackAnchor)
                continue;
            labels.push(this.createTermLabelDefinition(entry, labelData, fallbackAnchor.x, fallbackAnchor.y + fallbackLabelIndex * 12, "middle"));
            fallbackLabelIndex++;
        }
        while (this.termDisplayLabelsLayer.children.length > labels.length)
            this.termDisplayLabelsLayer.removeChild(this.termDisplayLabelsLayer.lastChild);
        if (labels.length == 0)
            return;
        const contrastColor = Utils.getContrastColor(color);
        for (let i = 0; i < labels.length; i++) {
            const labelElements = this.ensureTermLabelElements(i);
            const label = labels[i];
            const labelText = labelElements.labelText;
            labelText.setAttribute("x", label.x);
            labelText.setAttribute("y", label.y);
            labelText.setAttribute("text-anchor", label.anchor);
            labelText.setAttribute("fill", contrastColor);
            this.setTermLabelText(labelText, label);
            const iconLayout = this.getTermCaseIconLayout(label, labelText);
            labelText.setAttribute("x", iconLayout.textX);
            this.applyTermCaseIcon(labelElements.caseIconHost, labelElements.caseIconElement, label.caseNumber, iconLayout);
            this.applyTermLabelBackground(labelElements.backgroundRect, labelText, color, label.anchor);
        }
    },
    applyTermLabelBackground(backgroundRect, labelText, color, anchor) {
        const paddingX = 4;
        const paddingY = 2;
        let textWidth = 0;
        let textHeight = 12;
        let textX = 0;
        let textY = 0;
        if (labelText?.getBBox)
            try {
                const bbox = labelText.getBBox();
                textWidth = bbox.width;
                textHeight = bbox.height;
                textX = bbox.x;
                textY = bbox.y;
            } catch (_) {}
        if (textWidth <= 0) {
            backgroundRect.setAttribute("display", "none");
            return;
        }
        backgroundRect.removeAttribute("display");
        backgroundRect.setAttribute("x", textX - paddingX);
        backgroundRect.setAttribute("y", textY - paddingY);
        backgroundRect.setAttribute("width", textWidth + paddingX * 2);
        backgroundRect.setAttribute("height", textHeight + paddingY * 2);
        backgroundRect.setAttribute("fill", color);
    }
});

if (typeof module !== "undefined" && module.exports)
    module.exports = BaseShape;
