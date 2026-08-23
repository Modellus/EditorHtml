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

    handleBackspaceKeydown(keydownEvent) {
        return false;
    }

    handleDeleteKeydown(keydownEvent) {
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
