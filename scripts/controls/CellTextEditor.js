class CellTextEditor {
    static numericCharacterPattern = /^[0-9eE+\-.,]$/;

    constructor(text, options = {}) {
        this.text = text;
        this.caretIndex = text.length;
        this.acceptedCharacterPattern = options.acceptedCharacterPattern ?? CellTextEditor.numericCharacterPattern;
        this.normalizesDecimalSeparator = options.normalizesDecimalSeparator !== false;
    }

    setText(text) {
        this.text = text;
        this.caretIndex = text.length;
    }

    setCaretIndex(index) {
        this.caretIndex = Math.max(0, Math.min(this.text.length, index));
    }

    moveCaretLeft() {
        if (this.caretIndex === 0)
            return false;
        this.caretIndex--;
        return true;
    }

    moveCaretRight() {
        if (this.caretIndex >= this.text.length)
            return false;
        this.caretIndex++;
        return true;
    }

    moveCaretToStart() {
        if (this.caretIndex === 0)
            return false;
        this.caretIndex = 0;
        return true;
    }

    moveCaretToEnd() {
        if (this.caretIndex >= this.text.length)
            return false;
        this.caretIndex = this.text.length;
        return true;
    }

    isAcceptedCharacter(character) {
        return this.acceptedCharacterPattern.test(character);
    }

    normalizeCharacter(character) {
        if (this.normalizesDecimalSeparator && character === ",")
            return ".";
        return character;
    }

    insertCharacter(character) {
        const insertedText = this.normalizeCharacter(character);
        this.text = `${this.text.slice(0, this.caretIndex)}${insertedText}${this.text.slice(this.caretIndex)}`;
        this.caretIndex += insertedText.length;
    }

    deleteBeforeCaret() {
        if (this.caretIndex === 0)
            return false;
        this.text = `${this.text.slice(0, this.caretIndex - 1)}${this.text.slice(this.caretIndex)}`;
        this.caretIndex--;
        return true;
    }

    deleteAfterCaret() {
        if (this.caretIndex >= this.text.length)
            return false;
        this.text = `${this.text.slice(0, this.caretIndex)}${this.text.slice(this.caretIndex + 1)}`;
        return true;
    }

    clear() {
        this.text = "";
        this.caretIndex = 0;
    }

    handleKey(key, hasCommandModifier) {
        if (key === "ArrowLeft") {
            this.moveCaretLeft();
            return true;
        }
        if (key === "ArrowRight") {
            this.moveCaretRight();
            return true;
        }
        if (key === "Home") {
            this.moveCaretToStart();
            return true;
        }
        if (key === "End") {
            this.moveCaretToEnd();
            return true;
        }
        if (key === "Backspace") {
            this.deleteBeforeCaret();
            return true;
        }
        if (key === "Delete") {
            this.deleteAfterCaret();
            return true;
        }
        if (!hasCommandModifier && this.isAcceptedCharacter(key)) {
            this.insertCharacter(key);
            return true;
        }
        return false;
    }

    static getCharacterX(textContentElement, characterIndex, fallbackX) {
        const characterCount = textContentElement.getNumberOfChars();
        if (characterCount === 0)
            return fallbackX;
        if (characterIndex >= characterCount)
            return textContentElement.getEndPositionOfChar(characterCount - 1).x;
        return textContentElement.getStartPositionOfChar(Math.max(0, characterIndex)).x;
    }

    static getCharacterIndexAtX(textContentElement, x) {
        const characterCount = textContentElement.getNumberOfChars();
        for (let characterIndex = 0; characterIndex < characterCount; characterIndex++) {
            const startX = textContentElement.getStartPositionOfChar(characterIndex).x;
            const endX = textContentElement.getEndPositionOfChar(characterIndex).x;
            if (x < (startX + endX) / 2)
                return characterIndex;
        }
        return characterCount;
    }

    static appendCaret(parentElement, x, topY, bottomY, color) {
        const caret = document.createElementNS("http://www.w3.org/2000/svg", "line");
        caret.setAttribute("x1", `${x}`);
        caret.setAttribute("y1", `${topY}`);
        caret.setAttribute("x2", `${x}`);
        caret.setAttribute("y2", `${bottomY}`);
        caret.setAttribute("stroke", color);
        caret.setAttribute("stroke-width", "1");
        parentElement.appendChild(caret);
        return caret;
    }
}
