Object.assign(BaseShape.prototype, {
    initializeTermDisplayLayer() {
        this.termDisplay = new TermDisplay(this);
        this.termDisplay.initializeLayer();
        this.termDisplayLayer = this.termDisplay.layer;
    },
    drawTermDisplayLabels() {
        this.termDisplay.draw();
    },
    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
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
    formatModelValue(value, termName) {
        const numericValue = Number(value);
        if (numericValue === Infinity)
            return "∞";
        if (numericValue === -Infinity)
            return "-∞";
        if (!Number.isFinite(numericValue))
            return "\u2014";
        const precision = this.getTermModelPrecision(termName);
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        return Utils.formatNumber(normalized, precision);
    },
    getTermModelPrecision(termName) {
        if (termName != null && this.board?.calculator?.isIterationTerm(termName))
            return 0;
        return this.getModelPrecision();
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
    getTermEntryLabelPosition(entry, index) {
        return null;
    },
    getTermEntryLabelColor(entry, index) {
        return null;
    },
    getTermEntryAnchorPoint(entry, index) {
        return null;
    },
    getTermEntryDisplayValue(entry, index) {
        return null;
    }
});

if (typeof module !== "undefined" && module.exports)
    module.exports = BaseShape;
