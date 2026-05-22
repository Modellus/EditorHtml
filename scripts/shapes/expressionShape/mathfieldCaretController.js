class MathfieldCaretController {
    constructor(mathfield) {
        this.mathfield = mathfield;
        this._caretClamping = false;
    }

    install() {
        this.mathfield.addEventListener("keydown", keydownEvent => this._handleBoundaryKeydown(keydownEvent), true);
        this.ensureCaretIsClamped();
    }

    ensureCaretIsClamped() {
        this._caretClamping = true;
        this.mathfield.position = 0;
        this.mathfield.executeCommand("moveToNextChar");
        this._caretClamping = false;
        requestAnimationFrame(() => {
            this._caretClamping = true;
            this.mathfield.position = 0;
            this.mathfield.executeCommand("moveToNextChar");
            this._caretClamping = false;
        });
    }

    _computeCaretBounds() {
        return { min: 1, max: this.mathfield.lastOffset };
    }

    _handleBoundaryKeydown(keydownEvent) {
        const caretBounds = this._computeCaretBounds();
        if (keydownEvent.key === "ArrowLeft" && this.mathfield.position <= caretBounds.min) {
            keydownEvent.preventDefault();
            this.mathfield.position = caretBounds.min;
            return;
        }
        if (keydownEvent.key === "ArrowRight" && this.mathfield.position >= caretBounds.max) {
            keydownEvent.preventDefault();
            this.mathfield.position = caretBounds.max;
            return;
        }
        if (keydownEvent.key === "Home") {
            keydownEvent.preventDefault();
            this.mathfield.executeCommand("moveToGroupStart");
            return;
        }
        if (keydownEvent.key === "End") {
            keydownEvent.preventDefault();
            this.mathfield.executeCommand("moveToGroupEnd");
        }
    }

    hasSelection() {
        const range = this.mathfield.selection?.ranges?.[0];
        if (!range)
            return false;
        return range[0] !== range[1];
    }

    getCaretPosition() {
        const range = this.mathfield.selection?.ranges?.[0];
        if (!range)
            return this.mathfield.position;
        return range[1];
    }

    getTextRange(start, end) {
        if (end <= start)
            return "";
        return this.mathfield.getValue(start, end);
    }

    deleteTextRange(start, end) {
        if (end <= start)
            return;
        this.mathfield.selection = { ranges: [[start, end]], direction: "forward" };
        this.mathfield.executeCommand("deleteBackward");
        if (this.mathfield.position !== start)
            this.mathfield.position = start;
    }

    getCurrentGroupStartPosition() {
        const savedSelection = this.mathfield.selection;
        this.mathfield.executeCommand("moveToGroupStart");
        const groupStart = this.mathfield.position;
        this.mathfield.selection = savedSelection;
        return groupStart;
    }

    getCurrentGroupEndPosition() {
        const savedSelection = this.mathfield.selection;
        this.mathfield.executeCommand("moveToGroupEnd");
        const groupEnd = this.mathfield.position;
        this.mathfield.selection = savedSelection;
        return groupEnd;
    }

    isCaretAtDisplaylineStart() {
        if (this.hasSelection())
            return false;
        const position = this.getCaretPosition();
        const groupStart = this.getCurrentGroupStartPosition();
        return position <= groupStart;
    }

    _isComplexAtomBeforeCaret() {
        const caretPosition = this.getCaretPosition();
        if (caretPosition <= 0)
            return false;
        const atomLatex = this.mathfield.getValue(caretPosition - 1, caretPosition);
        return atomLatex.includes("{");
    }

    _isComplexAtomAfterCaret() {
        const caretPosition = this.getCaretPosition();
        if (caretPosition >= this.mathfield.lastOffset)
            return false;
        const atomLatex = this.mathfield.getValue(caretPosition, caretPosition + 1);
        return atomLatex.includes("{");
    }

    _hasPreviousExpressionLine() {
        const savedSelection = this.mathfield.selection;
        const savedPosition = this.mathfield.position;
        this.mathfield.executeCommand("moveUp");
        const movedToPreviousLine = this.mathfield.position !== savedPosition;
        this.mathfield.selection = savedSelection;
        return movedToPreviousLine;
    }

    _getCurrentLineLatex() {
        const savedSelection = this.mathfield.selection;
        const selectionRange = savedSelection?.ranges?.[0];
        if (!selectionRange || selectionRange[0] !== selectionRange[1])
            return "";
        const lineStart = selectionRange[1];
        const lineEnd = this.getCurrentGroupEndPosition();
        this.mathfield.selection = savedSelection;
        if (lineEnd <= lineStart)
            return "";
        return this.mathfield.getValue(lineStart, lineEnd);
    }

    _mergeCurrentLineWithPreviousLine() {
        const currentLineLatex = this._getCurrentLineLatex();
        this.mathfield.executeCommand("removeRow");
        const mergeStartPosition = this.mathfield.position;
        if (currentLineLatex)
            this.mathfield.executeCommand("insert", currentLineLatex);
        this.mathfield.position = mergeStartPosition;
    }

    handleBackspaceKeydown(keydownEvent) {
        if (keydownEvent.key !== "Backspace")
            return false;
        if (keydownEvent.metaKey || keydownEvent.ctrlKey || keydownEvent.altKey)
            return false;
        if (this.isCaretAtDisplaylineStart() && this._hasPreviousExpressionLine()) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this._mergeCurrentLineWithPreviousLine();
            return true;
        }
        if (!this.hasSelection() && this._isComplexAtomBeforeCaret()) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.mathfield.executeCommand("moveToPreviousChar");
            return true;
        }
        return false;
    }

    handleDeleteKeydown(keydownEvent) {
        if (keydownEvent.key !== "Delete")
            return false;
        if (keydownEvent.metaKey || keydownEvent.ctrlKey || keydownEvent.altKey)
            return false;
        if (!this.hasSelection() && this._isComplexAtomAfterCaret()) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.mathfield.executeCommand("moveToNextChar");
            return true;
        }
        return false;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathfieldCaretController;
