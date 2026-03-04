class ValueShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() {
        return new RectangleTransformer(this.board, this);
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        this.addTermToForm("term", "Term", false, 2, { showVisibilityToggle: false });
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Value Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 90;
        this.properties.y = center.y - 20;
        this.properties.width = 180;
        this.properties.height = 40;
        this.properties.term = null;
        this.properties.termCase = 1;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("rect");
        this.valueText = this.board.createSvgElement("text");
        this.valueText.setAttribute("text-anchor", "middle");
        this.valueText.setAttribute("dominant-baseline", "middle");
        this.valueText.setAttribute("font-size", "14");
        this.caseIconHost = this.board.createSvgElement("foreignObject");
        this.caseIconHost.setAttribute("class", "shape-term-case-icon-host");
        const iconContainer = this.board.createElement("div");
        iconContainer.setAttribute("class", "shape-term-case-icon-container");
        const icon = this.board.createElement("i");
        icon.setAttribute("class", "shape-term-case-icon");
        iconContainer.appendChild(icon);
        this.caseIconHost.appendChild(iconContainer);
        this.caseIconElement = icon;
        element.appendChild(this.container);
        element.appendChild(this.valueText);
        element.appendChild(this.caseIconHost);
        return element;
    }

    getSelectedTerm() {
        return TermControl.normalizeTermValue(this.properties.term);
    }

    getSelectedCaseNumber(term) {
        return TermControl.getShapeCaseNumber(this, term, this.properties.termCase ?? 1);
    }

    shouldShowCaseIcon(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term);
    }

    resolveDisplayedValue(term, caseNumber) {
        if (term === "")
            return "-";
        const calculator = this.board.calculator;
        if (calculator.isTerm(term)) {
            const value = calculator.getByName(term, caseNumber);
            if (Number.isFinite(value))
                return this.formatModelValue(value);
            return "-";
        }
        const numericValue = Number(term);
        if (Number.isFinite(numericValue))
            return this.formatModelValue(numericValue);
        return term;
    }

    setValueTextContent(termText, valueText) {
        while (this.valueText.firstChild)
            this.valueText.removeChild(this.valueText.firstChild);
        if (termText === "") {
            const emptySpan = this.board.createSvgElement("tspan");
            emptySpan.setAttribute("font-family", "Katex_Main");
            emptySpan.textContent = valueText;
            this.valueText.appendChild(emptySpan);
            return;
        }
        const termSpan = this.board.createSvgElement("tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.textContent = termText;
        this.valueText.appendChild(termSpan);
        const separatorSpan = this.board.createSvgElement("tspan");
        separatorSpan.setAttribute("font-family", "Katex_Main");
        separatorSpan.textContent = " = ";
        this.valueText.appendChild(separatorSpan);
        const valueSpan = this.board.createSvgElement("tspan");
        valueSpan.setAttribute("font-family", "Katex_Main");
        valueSpan.textContent = valueText;
        this.valueText.appendChild(valueSpan);
    }

    updateCaseIcon(caseNumber, termText, showCaseIcon) {
        if (!showCaseIcon || termText === "") {
            this.caseIconHost.setAttribute("display", "none");
            return;
        }
        this.caseIconHost.removeAttribute("display");
        const iconClass = `${TermControl.getCaseNumberIconClass(caseNumber)} shape-term-case-icon`;
        if (this.caseIconElement.getAttribute("class") != iconClass)
            this.caseIconElement.setAttribute("class", iconClass);
        this.caseIconElement.style.color = TermControl.getCaseIconColor(caseNumber);
    }

    placeCaseIcon(position, width, height) {
        if (this.caseIconHost.getAttribute("display") == "none")
            return;
        let textRight = position.x + width / 2;
        try {
            const box = this.valueText.getBBox();
            textRight = box.x + box.width;
        } catch (_) {}
        const iconSize = 10;
        const iconX = Math.min(position.x + width - iconSize - 4, textRight + 4);
        const iconY = position.y + (height - iconSize) / 2;
        this.caseIconHost.setAttribute("x", `${iconX}`);
        this.caseIconHost.setAttribute("y", `${iconY}`);
        this.caseIconHost.setAttribute("width", `${iconSize}`);
        this.caseIconHost.setAttribute("height", `${iconSize + 1}`);
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        const width = Math.max(20, Number(this.properties.width) || 20);
        const height = Math.max(16, Number(this.properties.height) || 16);
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", width);
        this.container.setAttribute("height", height);
        this.container.setAttribute("rx", 4);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.container, 1);
        const termText = this.getSelectedTerm();
        const caseNumber = this.getSelectedCaseNumber(termText);
        const valueText = this.resolveDisplayedValue(termText, caseNumber);
        this.valueText.setAttribute("x", `${position.x + width / 2}`);
        this.valueText.setAttribute("y", `${position.y + height / 2}`);
        this.valueText.setAttribute("fill", this.properties.foregroundColor);
        this.setValueTextContent(termText, valueText);
        this.updateCaseIcon(caseNumber, termText, this.shouldShowCaseIcon(termText));
        this.placeCaseIcon(position, width, height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + width / 2}, ${position.y + height / 2})`);
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }
}
