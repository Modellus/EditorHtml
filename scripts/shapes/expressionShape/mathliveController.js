class MathliveController {
    constructor(mathfield) {
        this.mathfield = mathfield;
    }

    handleInput(inputEvent) {
        if (!this.shouldProcessInputEvent(inputEvent))
            return false;
        if (this.hasCollapsedSelection() && this.applyDifferentialFractionShortcut())
            return true;
        const normalized = this.applyDifferentialFractionNormalization();
        return normalized;
    }

    shouldProcessInputEvent(inputEvent) {
        if (inputEvent?.isComposing)
            return false;
        const inputType = inputEvent?.inputType ?? "";
        if (inputType.startsWith("delete"))
            return false;
        return true;
    }

    hasCollapsedSelection() {
        const selectionRange = this.mathfield.selection?.ranges?.[0];
        if (!selectionRange)
            return true;
        return selectionRange[0] === selectionRange[1];
    }

    hasSelection() {
        return !this.hasCollapsedSelection();
    }

    getCaretPosition() {
        const selectionRange = this.mathfield.selection?.ranges?.[0];
        if (!selectionRange)
            return this.mathfield.position;
        return selectionRange[1];
    }

    getCurrentGroupStartPosition() {
        const savedSelection = this.mathfield.selection;
        this.mathfield.executeCommand("moveToGroupStart");
        const groupStartPosition = this.mathfield.position;
        if (savedSelection)
            this.mathfield.selection = savedSelection;
        else
            this.mathfield.position = groupStartPosition;
        return groupStartPosition;
    }

    getTextRange(startPosition, endPosition) {
        if (endPosition <= startPosition)
            return "";
        return this.mathfield.getValue([startPosition, endPosition], "latex-unstyled");
    }

    // An aligned row is an array of cells, and Mathlive writes nothing where one cell ends and the next
    // begins, so a caret standing at the start of a later cell reads as standing right after the last
    // character of the cell before it. Mathlive's own backspace does nothing there, and neither does
    // its forward delete at the end of the cell before, so both are carried over the cell boundary to
    // the character the user sees next to the caret. Mathlive also takes an emptied row away when a
    // deletion key reaches it in a one-column block but leaves it standing once the rows are aligned
    // into two cells, so the aligned rows get the same courtesy.
    handleBackspaceKeydown(keydownEvent) {
        if (!this.isPlainDeletionKey(keydownEvent, "Backspace"))
            return false;
        const caretOffset = this.mathfield.position;
        const caretAtom = this.getModelAtom(caretOffset);
        if (this.isLaterCellStartAtom(caretAtom)) {
            this.consumeKeydown(keydownEvent);
            this.mathfield.executeCommand("moveToPreviousChar");
            this.mathfield.executeCommand("deleteBackward");
            return true;
        }
        if (this.isEmptyLaterRowStart(caretAtom, caretOffset)) {
            this.consumeKeydown(keydownEvent);
            this.removeRowStartingAt(caretOffset);
            return true;
        }
        return false;
    }

    handleDeleteKeydown(keydownEvent) {
        if (!this.isPlainDeletionKey(keydownEvent, "Delete"))
            return false;
        const nextOffset = this.mathfield.position + 1;
        const nextAtom = this.getModelAtom(nextOffset);
        if (this.isLaterCellStartAtom(nextAtom)) {
            this.consumeKeydown(keydownEvent);
            this.mathfield.executeCommand("moveToNextChar");
            this.mathfield.executeCommand("deleteForward");
            return true;
        }
        if (this.isEmptyLaterRowStart(nextAtom, nextOffset)) {
            this.consumeKeydown(keydownEvent);
            this.removeRowStartingAt(nextOffset);
            return true;
        }
        return false;
    }

    isPlainDeletionKey(keydownEvent, keyName) {
        if (keydownEvent?.key !== keyName)
            return false;
        if (keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey || keydownEvent.shiftKey)
            return false;
        return this.hasCollapsedSelection();
    }

    consumeKeydown(keydownEvent) {
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
    }

    // The atoms are only reachable through the mathfield Mathlive keeps to itself, so a build that
    // hides them leaves the deletion keys to Mathlive.
    getModelAtom(offset) {
        const model = this.mathfield._mathfield?.model;
        if (!model || typeof model.at !== "function" || offset < 0 || offset > this.mathfield.lastOffset)
            return null;
        return model.at(offset) ?? null;
    }

    // Every cell opens with a "first" atom whose branch names the row and the column of the cell.
    isCellStartAtom(atom) {
        if (!atom || atom.type !== "first" || atom.parent?.type !== "array")
            return false;
        return Array.isArray(atom.parentBranch);
    }

    isLaterCellStartAtom(atom) {
        return this.isCellStartAtom(atom) && atom.parentBranch[1] > 0;
    }

    isEmptyLaterRowStart(atom, rowStartOffset) {
        if (!this.isCellStartAtom(atom) || atom.parentBranch[0] === 0 || atom.parentBranch[1] !== 0)
            return false;
        return this.isEmptyRow(atom.parent, atom.parentBranch[0], rowStartOffset);
    }

    // The atoms of a row follow the atom opening its first cell, so the row is empty while every atom
    // the array holds for it opens a cell.
    isEmptyRow(arrayAtom, rowIndex, rowStartOffset) {
        for (let offset = rowStartOffset; offset <= this.mathfield.lastOffset; offset++) {
            const atom = this.getModelAtom(offset);
            if (!atom || atom.parent !== arrayAtom || atom.parentBranch?.[0] !== rowIndex)
                return true;
            if (atom.type !== "first")
                return false;
        }
        return true;
    }

    // The row is taken away from inside it, and the caret is left where the row before it ends.
    removeRowStartingAt(rowStartOffset) {
        this.mathfield.position = rowStartOffset;
        this.mathfield.executeCommand("removeRow");
        this.mathfield.position = Math.max(0, rowStartOffset - 1);
    }

    replaceTextRange(startPosition, endPosition, replacementLatex) {
        this.mathfield.selection = { ranges: [[startPosition, endPosition]], direction: "forward" };
        this.mathfield.executeCommand("insert", replacementLatex);
        this.mathfield.executeCommand("moveAfterParent");
    }

    getDifferentialShortcutPattern() {
        return new RegExp(`(^|[\\s([\\{,+\\-*=<>])d(${Utils.termNameLatexSource})/d(${Utils.termNameLatexSource})$`);
    }

    getDifferentialFractionPattern(patternFlags = "g") {
        return new RegExp(`\\\\frac\\{d\\s*(${Utils.termNameLatexSource})\\}\\{d\\s*(${Utils.termNameLatexSource})\\}`, patternFlags);
    }

    // Mathlive writes the latex up to the caret with the enclosing groups left open, so the name of a
    // differential still being written follows its command with nothing closing it.
    getDifferentialNameEndPattern() {
        return new RegExp(`\\\\differentialD\\s+${Utils.termNameLatexSource}$`);
    }

    getLoneDifferentialPattern() {
        return new RegExp(`^\\\\differentialD\\{${Utils.termNameLatexSource}\\}$`);
    }

    buildDifferentialFractionLatex(numeratorVariableName, denominatorVariableName) {
        return `\\frac{\\differentialD{${Utils.writeGreekLetterName(numeratorVariableName)}}}{\\differentialD{${Utils.writeGreekLetterName(denominatorVariableName)}}}`;
    }

    // A name can carry named parts written as subscripts, so the latex of what was typed is longer than
    // the number of positions it takes in the mathfield and the start is looked for position by position.
    findTypedLatexStartPosition(caretPosition, groupStartPosition, typedLatex) {
        for (let startPosition = caretPosition - 1; startPosition >= groupStartPosition; startPosition--)
            if (this.getTextRange(startPosition, caretPosition) === typedLatex)
                return startPosition;
        return -1;
    }

    applyDifferentialFractionShortcut() {
        const caretPosition = this.getCaretPosition();
        const groupStartPosition = this.getCurrentGroupStartPosition();
        if (caretPosition <= groupStartPosition)
            return false;
        const groupLatexBeforeCaret = this.getTextRange(groupStartPosition, caretPosition);
        const shortcutMatch = groupLatexBeforeCaret.match(this.getDifferentialShortcutPattern());
        if (!shortcutMatch)
            return false;
        const numeratorVariableName = shortcutMatch[2];
        const denominatorVariableName = shortcutMatch[3];
        const typedShortcutLatex = `d${numeratorVariableName}/d${denominatorVariableName}`;
        const shortcutStartPosition = this.findTypedLatexStartPosition(caretPosition, groupStartPosition, typedShortcutLatex);
        if (shortcutStartPosition < 0)
            return false;
        const replacementLatex = this.buildDifferentialFractionLatex(numeratorVariableName, denominatorVariableName);
        this.replaceTextRange(shortcutStartPosition, caretPosition, replacementLatex);
        return true;
    }

    applyDifferentialFractionNormalization() {
        const expressionLatex = this.mathfield.getValue("latex-unstyled");
        const differentialFractionPattern = this.getDifferentialFractionPattern();
        const savedCaretPosition = this.mathfield.position;
        const fractionBeingWritten = this.readDifferentialFractionBeingWritten(expressionLatex);
        const normalizedExpressionLatex = expressionLatex.replace(differentialFractionPattern, (matchedLatex, numeratorVariableName, denominatorVariableName, matchOffset) => {
            const replacementLatex = this.buildDifferentialFractionLatex(numeratorVariableName, denominatorVariableName);
            return replacementLatex;
        });
        if (normalizedExpressionLatex === expressionLatex)
            return false;
        this.mathfield.value = normalizedExpressionLatex;
        if (fractionBeingWritten && this.moveCaretIntoDifferentialName(savedCaretPosition, fractionBeingWritten))
            return true;
        this.mathfield.position = Math.min(savedCaretPosition, this.mathfield.lastOffset);
        this.moveCaretAfterParentChain();
        return true;
    }

    // A name goes on growing while it is being written, so the fraction the caret is writing is the one
    // whose denominator is the group holding the caret.
    readDifferentialFractionBeingWritten(expressionLatex) {
        const differentialFractions = expressionLatex.match(this.getDifferentialFractionPattern());
        if (!differentialFractions || this.hasSelection())
            return null;
        const caretPosition = this.getCaretPosition();
        const groupStartPosition = this.getCurrentGroupStartPosition();
        if (caretPosition <= groupStartPosition)
            return null;
        const groupLatexBeforeCaret = this.getTextRange(groupStartPosition, caretPosition);
        const fractionBeingWritten = differentialFractions.find(fractionLatex => fractionLatex.endsWith(`}{${groupLatexBeforeCaret}}`));
        if (!fractionBeingWritten)
            return null;
        const namesMatch = fractionBeingWritten.match(this.getDifferentialFractionPattern(""));
        return { numeratorName: namesMatch[1], denominatorName: namesMatch[2] };
    }

    // Writing the differentials moves everything after them along, so the caret is put back by the latex
    // it now reads before it: the name it was writing, inside the differential that was written around it.
    moveCaretIntoDifferentialName(searchStartPosition, fractionBeingWritten) {
        const latexBeforeCaret = `\\differentialD{${fractionBeingWritten.numeratorName}}\\differentialD ${fractionBeingWritten.denominatorName}`;
        for (let position = searchStartPosition; position <= this.mathfield.lastOffset; position++) {
            if (!this.getTextRange(0, position).endsWith(latexBeforeCaret))
                continue;
            this.mathfield.position = position;
            return true;
        }
        return false;
    }

    isWritingDifferentialName() {
        if (this.hasSelection())
            return false;
        return this.getDifferentialNameEndPattern().test(this.getTextRange(0, this.getCaretPosition()));
    }

    isAfterLoneDifferential() {
        if (this.hasSelection())
            return false;
        const caretPosition = this.getCaretPosition();
        const groupStartPosition = this.getCurrentGroupStartPosition();
        if (caretPosition <= groupStartPosition)
            return false;
        return this.getLoneDifferentialPattern().test(this.getTextRange(groupStartPosition, caretPosition));
    }

    // A key that ends a name is the last chance to write the differential the name belongs to: the fraction
    // stops reading as one the moment anything else is written into it.
    writeDifferentialBeingLeft() {
        const expressionLatex = this.mathfield.getValue("latex-unstyled");
        if (!this.readDifferentialFractionBeingWritten(expressionLatex))
            return false;
        return this.applyDifferentialFractionNormalization();
    }

    // A name is made of name characters only, so anything else ends the differential being written and
    // carries on after the fraction, where the rest of the row belongs.
    leaveDifferentialName() {
        this.writeDifferentialBeingLeft();
        if (this.hasSelection() || !this.getTextRange(0, this.getCaretPosition()).includes("\\differentialD"))
            return false;
        let leftDifferential = false;
        for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
            if (!this.isWritingDifferentialName() && !this.isAfterLoneDifferential())
                break;
            const positionBeforeMove = this.mathfield.position;
            this.mathfield.executeCommand("moveAfterParent");
            if (this.mathfield.position === positionBeforeMove)
                break;
            leftDifferential = true;
        }
        return leftDifferential;
    }

    moveCaretAfterParentChain() {
        for (let moveIndex = 0; moveIndex < 4; moveIndex++) {
            const positionBeforeMove = this.mathfield.position;
            this.mathfield.executeCommand("moveAfterParent");
            if (this.mathfield.position === positionBeforeMove)
                break;
        }
    }

    debugMathliveController(eventName, payload) {
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathliveController;
