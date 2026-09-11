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
                failingRows.push({ rowIndex, error: rowErrors[rowIndex], finding: ExpressionRowErrors.readFinding(calculator, rowsLatex[rowIndex], rowErrors[rowIndex]) });
            else if (ExpressionRowErrors.isCyclicRow(calculator, rowsLatex[rowIndex], cyclicTermNames))
                failingRows.push({ rowIndex, error: MathErrorMessage.cycleError(cyclicTermNames), finding: null });
        }
        return failingRows;
    }

    // What would make the row readable and where in the row it belongs. The grammar answers for most
    // rows. A row whose relation has nothing on one side is answered by the editor instead: the grammar
    // stops at the relation and says only that it could read no further, which is the one thing a reader
    // writing `v=` already knows.
    static readFinding(calculator, rowLatex, error) {
        if (error.code !== undefined)
            return null;
        const emptySide = ExpressionRowErrors.findEmptyRelationSide(rowLatex);
        if (emptySide !== null)
            return emptySide;
        const finding = MathErrorMessage.readSyntax(error.message);
        if (finding.column === null)
            return null;
        const index = ExpressionRowErrors.findIndexForColumn(calculator, rowLatex, finding.column);
        return { ...finding, index, isAtEnd: index >= rowLatex.length || finding.text === MathErrorMessage.endOfInputMarker };
    }

    static findEmptyRelationSide(rowLatex) {
        const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
        if (relationIndex < 0)
            return null;
        const relationLength = rowLatex.startsWith("\\in", relationIndex) ? "\\in".length : 1;
        if (ExpressionRowErrors.isBlank(rowLatex.substring(relationIndex + relationLength)))
            return { kind: "operand", index: rowLatex.length, isAtEnd: true };
        if (ExpressionRowErrors.isBlank(rowLatex.substring(0, relationIndex)))
            return { kind: "operand", index: 0, isAtEnd: false };
        return null;
    }

    static isBlank(rowLatex) {
        return rowLatex.replace(/\\placeholder\{\}|\\[,;:!]|\\ |\s/g, "") === "";
    }

    // The grammar counts its column in the text it was handed, which is the row with the editor's own
    // spellings normalised away, so the column is walked back to the row by normalising one prefix of
    // the row after another until one of them is as long as the column.
    static findIndexForColumn(calculator, rowLatex, column) {
        for (let index = 0; index <= rowLatex.length; index++) {
            if (calculator.normalizeExpressionText(rowLatex.substring(0, index)).length >= column)
                return index;
        }
        return rowLatex.length;
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
        this.litRowIndex = null;
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
        // The card is hovered through the board's handle, which passes the pointer's movements on to
        // whatever lies under it; entering and leaving never reach the panel, so the row under the
        // pointer is read from the movements themselves.
        this.panelElement.addEventListener("pointermove", pointerEvent => this.lightRow(pointerEvent.target.closest(".mdl-expression-error-row")));
        this.panelElement.addEventListener("pointerleave", () => this.lightRow(null));
        hostElement.addEventListener("scroll", this.onHostScroll, true);
        this.refresh();
    }

    setFailingRows(failingRows) {
        this.failingRows = failingRows ?? [];
        this.litRowIndex = null;
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

    // The panel says what is wrong and which row it is wrong in, and nothing else: the card is already
    // bordered in the error colour, and a row is named by its number alone, the way a line of anything
    // else written down a page is. Reaching for a sentence lights the row it belongs to.
    buildPanelHtml(translations) {
        return this.failingRows.map(failingRow => {
            const messageHtml = Utils.renderMessageHtml(ExpressionErrorReport.readMessage(failingRow, translations));
            return `<button type="button" class="mdl-expression-error-row" data-row-index="${failingRow.rowIndex}"><span class="mdl-expression-error-row-label">${failingRow.rowIndex + 1}</span><span class="mdl-expression-error-row-message">${messageHtml}</span></button>`;
        }).join("");
    }

    // What the row is marked for and what the panel says about it are one reading: a finding the editor
    // made for itself is worded like one read from the grammar, and only a row neither could account for
    // falls back to the sentence the engine wrote.
    static readMessage(failingRow, translations) {
        return MathErrorMessage.translateFinding(failingRow.finding, translations) ?? MathErrorMessage.translate(failingRow.error, translations);
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

    // Which row a sentence is about, shown rather than said: the mark on that row is brightened for as
    // long as the sentence is being reached for.
    lightRow(rowElement) {
        const litRowIndex = rowElement === null ? null : Number(rowElement.dataset.rowIndex);
        if (litRowIndex === this.litRowIndex)
            return;
        this.litRowIndex = litRowIndex;
        for (const [rowIndex, markElement] of this.markElements)
            markElement.classList.toggle("lit", rowIndex === litRowIndex);
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
            const failingRow = this.failingRows[failingRowIndex];
            const bounds = this.control.getRowBounds(failingRow.rowIndex);
            if (!bounds || scale === 0)
                continue;
            keptRowIndexes.add(failingRow.rowIndex);
            const markElement = this.readMarkElement(failingRow.rowIndex);
            markElement.style.top = `${(bounds.top - hostRectangle.top) / scale - 1}px`;
            markElement.style.height = `${bounds.height / scale + 2}px`;
            this.writeSpot(markElement, failingRow, hostRectangle, scale);
        }
        for (const [rowIndex, markElement] of this.markElements) {
            if (keptRowIndexes.has(rowIndex))
                continue;
            markElement.remove();
            this.markElements.delete(rowIndex);
        }
    }

    // The place in the row the reading is about: a slot standing where something is missing, drawn the
    // way an empty slot of a template is drawn, or a line under the one thing that cannot stand where it
    // was written. A reading with no place of its own leaves the row marked and says no more than that.
    writeSpot(markElement, failingRow, hostRectangle, scale) {
        const spotElement = markElement.querySelector(".mdl-expression-error-spot");
        const place = this.readSpotPlace(failingRow);
        spotElement.hidden = place === null;
        if (place === null)
            return;
        spotElement.classList.toggle("hole", place.isHole);
        spotElement.style.left = `${(place.left - hostRectangle.left) / scale}px`;
        spotElement.style.width = `${place.width / scale}px`;
    }

    // A slot is drawn only where the editor knows the place between two symbols that something is
    // missing from. Everywhere else the symbol the place falls inside is underlined instead: saying
    // which symbol the row went wrong at is worth saying, and a slot drawn a symbol out from where it
    // belongs would be worse than none.
    readSpotPlace(failingRow) {
        const finding = failingRow.finding;
        const anchor = failingRow.anchor;
        if (!finding || !anchor)
            return null;
        const bounds = this.control.getOffsetBounds(anchor.offset);
        if (!bounds)
            return null;
        const isMissing = finding.kind === "operand" || finding.kind === "symbol";
        const holeWidth = Math.max(bounds.height * 0.5, 9);
        if (isMissing && anchor.placement === "before")
            return { isHole: true, left: bounds.left - holeWidth - 1, width: holeWidth };
        if (isMissing && anchor.placement === "after" && finding.isAtEnd)
            return { isHole: true, left: bounds.right + 1, width: holeWidth };
        return { isHole: false, left: bounds.left, width: Math.max(bounds.width, 3) };
    }

    readMarkElement(rowIndex) {
        let markElement = this.markElements.get(rowIndex);
        if (markElement)
            return markElement;
        this.marksElement.insertAdjacentHTML("beforeend", `<div class="mdl-expression-error-mark"><div class="mdl-expression-error-mark-band"></div><div class="mdl-expression-error-mark-bar"></div><div class="mdl-expression-error-spot" hidden></div></div>`);
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
