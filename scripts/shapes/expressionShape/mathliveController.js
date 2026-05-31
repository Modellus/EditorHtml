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
        return this.mathfield.getValue(startPosition, endPosition);
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

    applyDifferentialFractionShortcut() {
        const caretPosition = this.getCaretPosition();
        const groupStartPosition = this.getCurrentGroupStartPosition();
        if (caretPosition <= groupStartPosition)
            return false;
        const groupLatexBeforeCaret = this.getTextRange(groupStartPosition, caretPosition);
        const differentialShortcutPattern = /(^|[\s([\{,+\-*=<>])d([A-Za-z][A-Za-z0-9]*)\/d([A-Za-z][A-Za-z0-9]*)$/;
        const shortcutMatch = groupLatexBeforeCaret.match(differentialShortcutPattern);
        if (!shortcutMatch)
            return false;
        const numeratorVariableName = shortcutMatch[2];
        const denominatorVariableName = shortcutMatch[3];
        const typedShortcutLatex = `d${numeratorVariableName}/d${denominatorVariableName}`;
        const shortcutStartPosition = caretPosition - typedShortcutLatex.length;
        const replacementLatex = `\\frac{\\differentialD{${numeratorVariableName}}}{\\differentialD{${denominatorVariableName}}}`;
        this.replaceTextRange(shortcutStartPosition, caretPosition, replacementLatex);
        return true;
    }

    applyDifferentialFractionNormalization() {
        const expressionLatex = this.mathfield.getValue();
        const differentialFractionPattern = /\\frac\{d\s*([A-Za-z][A-Za-z0-9]*)\}\{d\s*([A-Za-z][A-Za-z0-9]*)\}/g;
        const savedCaretPosition = this.mathfield.position;
        const normalizedExpressionLatex = expressionLatex.replace(differentialFractionPattern, (matchedLatex, numeratorVariableName, denominatorVariableName, matchOffset) => {
            const replacementLatex = `\\frac{\\differentialD{${numeratorVariableName}}}{\\differentialD{${denominatorVariableName}}}`;
            return replacementLatex;
        });
        if (normalizedExpressionLatex === expressionLatex)
            return false;
        this.mathfield.value = normalizedExpressionLatex;
        this.mathfield.position = Math.min(savedCaretPosition, this.mathfield.lastOffset);
        this.moveCaretAfterParentChain();
        return true;
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
