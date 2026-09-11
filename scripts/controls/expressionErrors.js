// The rows the calculation engine refused, read from the expression as it stands. The rows go through a
// system of the engine's own, so a row still being written never leaves a term behind in the model, and
// the check can be run while the expression is being typed rather than only once it is put away.
class ExpressionRowErrors {
    static find(calculator, expressionLatex) {
        if (!calculator)
            return [];
        const rowsLatex = ExpressionAlignment.readRows(expressionLatex ?? "").map(row => row.cells.join(""));
        const rowErrors = calculator.findRowParseErrors(rowsLatex);
        const cyclicTermNames = calculator.getCyclicTermNames();
        const failingRows = [];
        for (let rowIndex = 0; rowIndex < rowErrors.length; rowIndex++) {
            if (rowErrors[rowIndex] !== null)
                failingRows.push({ rowIndex, error: rowErrors[rowIndex] });
            else if (ExpressionRowErrors.isCyclicRow(calculator, rowsLatex[rowIndex], cyclicTermNames))
                failingRows.push({ rowIndex, error: MathErrorMessage.cycleError(cyclicTermNames) });
        }
        return failingRows;
    }

    static isCyclicRow(calculator, rowLatex, cyclicTermNames) {
        if (cyclicTermNames.length === 0)
            return false;
        const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
        if (relationIndex < 0)
            return false;
        const definedName = MathSemanticMetadata.readLeftHandSideTermName(rowLatex.substring(0, relationIndex));
        const indexSuffix = `_${calculator.properties.iterationTerm}`;
        if (!definedName.endsWith(indexSuffix))
            return false;
        return cyclicTermNames.includes(definedName.slice(0, -indexSuffix.length));
    }
}

// Why a row was refused, written where the row was written: a band across the row inside the card, and a
// panel at the foot of the card carrying the sentence. Neither is hovered for - a reason that has to be
// hunted for is a reason nobody reads - so the panel stands open for as long as the card is being worked
// on, and the sentence can be read, and the row it belongs to reached, without holding a pointer still.
class ExpressionErrorReport {
    static markPulseDuration = 900;

    static maximumPanelHeightRatio = 0.6;

    constructor(control) {
        this.control = control;
        this.hostElement = null;
        this.marksElement = null;
        this.panelElement = null;
        this.markElements = new Map();
        this.failingRows = [];
        this.active = false;
        this.panelSignature = null;
        this.onHostScroll = () => this.refreshMarks();
    }

    create(hostElement) {
        this.hostElement = hostElement;
        hostElement.insertAdjacentHTML("beforeend", `<div class="mdl-expression-error-marks"></div><div class="mdl-expression-error-panel"></div>`);
        this.marksElement = hostElement.querySelector(":scope > .mdl-expression-error-marks");
        this.panelElement = hostElement.querySelector(":scope > .mdl-expression-error-panel");
        // A card is dragged by anywhere it is pressed, through a handle the board lays over the whole of
        // it, and the handle gives the press up to whatever is underneath that claims it. A press on a
        // row of the panel claims it, so the row can be reached; a press anywhere else on the panel is
        // left to the board, and drags the card as pressing the card anywhere else does.
        this.panelElement.addEventListener("pointerdown", pointerEvent => {
            if (!pointerEvent.target.closest(".mdl-expression-error-row"))
                return;
            pointerEvent.stopPropagation();
            pointerEvent.preventDefault();
        });
        this.panelElement.addEventListener("click", clickEvent => this.onPanelClick(clickEvent));
        hostElement.addEventListener("scroll", this.onHostScroll, true);
        this.refresh();
    }

    setFailingRows(failingRows) {
        this.failingRows = failingRows ?? [];
        this.refresh();
    }

    setActive(active) {
        if (this.active === active)
            return;
        this.active = active;
        this.refresh();
    }

    hasFailingRows() {
        return this.failingRows.length > 0;
    }

    // The panel is shown to whoever is working on the card - the pointer over it, the card selected, the
    // caret in it - and not to everyone else looking at the board, who already have the card's red border.
    isPanelShown() {
        return this.hasFailingRows() && (this.active || this.control.mathfield?.hasFocus() === true);
    }

    refresh() {
        if (!this.hostElement)
            return;
        this.writePanel();
        this.refreshMarks();
    }

    writePanel() {
        const isShown = this.isPanelShown();
        this.panelElement.classList.toggle("visible", isShown);
        // What the panel says is kept while it is out of sight, so a card put away and reached for again
        // is not rewritten underneath the hand reaching for it.
        if (!isShown) {
            this.writeFieldRoom(0);
            return;
        }
        const translations = this.control.options.getTranslations?.() ?? null;
        const signature = this.readPanelSignature(translations);
        if (signature !== this.panelSignature) {
            this.panelSignature = signature;
            this.panelElement.innerHTML = this.buildPanelHtml(translations);
        }
        this.panelElement.style.maxHeight = `${Math.round(this.hostElement.clientHeight * ExpressionErrorReport.maximumPanelHeightRatio)}px`;
        this.writePanelColors();
        this.writeFieldRoom(this.panelElement.offsetHeight);
    }

    readPanelSignature(translations) {
        return `${translations?.language ?? ""}::${this.failingRows.map(failingRow => `${failingRow.rowIndex}:${failingRow.error?.code ?? ""}:${failingRow.error?.message ?? ""}`).join("|")}`;
    }

    buildPanelHtml(translations) {
        const title = translations?.get("Expression Error Title") ?? "Expression error";
        const rowsHtml = this.failingRows.map(failingRow => {
            const label = (translations?.get("Expression Error Row") ?? "Line {number}").replace("{number}", failingRow.rowIndex + 1);
            const messageHtml = Utils.renderMessageHtml(MathErrorMessage.translate(failingRow.error, translations));
            return `<button type="button" class="mdl-expression-error-row" data-row-index="${failingRow.rowIndex}"><span class="mdl-expression-error-row-label">${Utils.escapeXmlText(label)}</span><span class="mdl-expression-error-row-message">${messageHtml}</span></button>`;
        }).join("");
        return `<div class="mdl-expression-error-title">${Utils.escapeXmlText(title)}</div>${rowsHtml}`;
    }

    // The panel belongs to the card, so it is written on the card's own ground and in the card's own ink.
    // Colours of its own would read as something laid over the model rather than as part of the card, and
    // a card is coloured by whoever made it - a panel following the editor's theme lands on a white card
    // in a dark room as a black band.
    writePanelColors() {
        const mathfield = this.control.mathfield;
        if (!mathfield)
            return;
        const backgroundColor = this.control.semanticDecorator?.readBackgroundColor();
        if (backgroundColor)
            this.panelElement.style.backgroundColor = backgroundColor;
        this.panelElement.style.color = getComputedStyle(mathfield).color;
    }

    // The panel takes its room from the expression rather than covering it: the foot of the card is
    // padded out by as much as the panel stands, which is what the field scrolls within, so a row is
    // never left half hidden behind the panel with nothing to say it is there.
    writeFieldRoom(panelHeight) {
        this.hostElement.style.boxSizing = "border-box";
        this.hostElement.style.paddingBottom = panelHeight > 0 ? `${panelHeight}px` : "";
        DevExpress.ui.dxScrollView.getInstance(this.hostElement)?.update();
    }

    onPanelClick(clickEvent) {
        const rowElement = clickEvent.target.closest(".mdl-expression-error-row");
        if (!rowElement)
            return;
        const rowIndex = Number(rowElement.dataset.rowIndex);
        this.control.moveCaretToRow(rowIndex);
        this.pulseMark(rowIndex);
    }

    pulseMark(rowIndex) {
        const markElement = this.markElements.get(rowIndex);
        if (!markElement)
            return;
        markElement.classList.remove("pulsing");
        void markElement.offsetWidth;
        markElement.classList.add("pulsing");
        clearTimeout(this.markPulseTimer);
        this.markPulseTimer = setTimeout(() => markElement.classList.remove("pulsing"), ExpressionErrorReport.markPulseDuration);
    }

    // The card is drawn at whatever the board is zoomed to, and a mark is written in the card's own
    // pixels, so the rectangles the field reports - which come back in screen pixels - are scaled back.
    refreshMarks() {
        if (!this.marksElement || !this.control.mathfield)
            return;
        const hostRectangle = this.hostElement.getBoundingClientRect();
        const scale = this.hostElement.offsetWidth > 0 ? hostRectangle.width / this.hostElement.offsetWidth : 1;
        const keptRowIndexes = new Set();
        for (let failingRowIndex = 0; failingRowIndex < this.failingRows.length; failingRowIndex++) {
            const rowIndex = this.failingRows[failingRowIndex].rowIndex;
            const bounds = this.control.getRowBounds(rowIndex);
            if (!bounds || scale === 0)
                continue;
            keptRowIndexes.add(rowIndex);
            const markElement = this.readMarkElement(rowIndex);
            markElement.style.top = `${(bounds.top - hostRectangle.top) / scale - 1}px`;
            markElement.style.height = `${bounds.height / scale + 2}px`;
        }
        for (const [rowIndex, markElement] of this.markElements) {
            if (keptRowIndexes.has(rowIndex))
                continue;
            markElement.remove();
            this.markElements.delete(rowIndex);
        }
    }

    readMarkElement(rowIndex) {
        let markElement = this.markElements.get(rowIndex);
        if (markElement)
            return markElement;
        this.marksElement.insertAdjacentHTML("beforeend", `<div class="mdl-expression-error-mark"><div class="mdl-expression-error-mark-band"></div><div class="mdl-expression-error-mark-bar"></div></div>`);
        markElement = this.marksElement.lastElementChild;
        this.markElements.set(rowIndex, markElement);
        return markElement;
    }

    dispose() {
        clearTimeout(this.markPulseTimer);
        this.hostElement?.removeEventListener("scroll", this.onHostScroll, true);
        this.marksElement?.remove();
        this.panelElement?.remove();
        this.markElements.clear();
        this.hostElement = null;
        this.marksElement = null;
        this.panelElement = null;
    }
}
