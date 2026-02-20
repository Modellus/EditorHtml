class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.mathfieldCaretClamping = false;
        this.mathfieldCaretLocked = false;
    }

    createTransformer() {
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push({
            itemType: "group",
            colCount: "auto",
            minColWidth: 200,
            items: [
                {
                    colSpan: 2,
                    label: { text: "Shortcuts" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        elementAttr: { class: "mdl-shortcuts" },
                        buttonTemplate: function (data, container) {
                            $("<math-field>")
                                .attr("read-only", true)
                                .html(data.text)
                                .css("height", "auto", "width", "auto")
                                .addClass("form-math-field")
                                .appendTo(container);
                        },
                        items: [
                            { name: "Differential", text: "\\frac{dx}{dt}" },
                            { name: "Power", text: "x^2" },
                            { name: "Squareroot", text: "\\sqrt{x}" },
                            { name: "Index", text: "x_{t-1}" }
                        ],
                        keyExpr: "name",
                        selectionMode: "none",
                        onItemClick: e => this.insert(e.itemData.text)
                    }
                }
            ]
        });
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Expression Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 25;
        this.properties.width = 300;
        this.properties.height = 50;
        this.properties.rotation = 0;
        this.properties.expression = "\\displaylines{\\placeholder{}}";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");
        $(div).css({ width: "100%", height: "100%", "background-color": "transparent" });
        foreignObject.appendChild(div);
        this.mathfield = new MathfieldElement();
        this.mathfield.popoverPolicy = "off";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.placeholder = "Enter a formula";
        this.mathfield.smartMode = false;
        this.mathfield.multiline = true;
        this.mathfield.returnKeyAction = "none";
        this.mathfield.addEventListener("change", _ => this.onChange());
        this.mathfield.addEventListener("focus", _ => this.onFocus());
        this.mathfield.addEventListener("mount", _ => this.onMount());
        div.appendChild(this.mathfield);
        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true,
            scrollByThumb: true
        });
        this.mathfield.value = this.properties.expression ?? "\\displaylines{\\placeholder{}}";
        return foreignObject;
    }

    onMount() {
        this.removeExpressionInlineShortcuts();
        this.lockCaret(this.mathfield);
        this.mathfield.addEventListener("keydown", keydownEvent => this.onKeyDown(keydownEvent), true);
        this.mathfield.focus();
        this.ensureCaretIsClamped();
    }

    removeExpressionInlineShortcuts() {
        const inlineShortcutMap = { ...(this.mathfield.inlineShortcuts ?? {}) };
        ["dx", "dy", "dt"].forEach(shortcutName => delete inlineShortcutMap[shortcutName]);
        this.mathfield.inlineShortcuts = inlineShortcutMap;
    }

    onKeyDown(keydownEvent) {
        if (this.handleEnterKeydown(keydownEvent))
            return;
        this.handleBackspaceKeydown(keydownEvent);
    }

    handleEnterKeydown(keydownEvent) {
        if (keydownEvent.key !== "Enter" || keydownEvent.shiftKey)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this.splitCurrentLineAtCaret();
        return true;
    }

    splitCurrentLineAtCaret() {
        if (this.hasSelection())
            this.mathfield.executeCommand("deleteBackward");
        const caretPosition = this.getCaretPosition();
        const lineEnd = this.getCurrentGroupEndPosition();
        const currentLineTailLatex = this.getTextRange(caretPosition, lineEnd);
        if (lineEnd > caretPosition)
            this.deleteTextRange(caretPosition, lineEnd);
        this.mathfield.executeCommand("addRowAfter");
        const newLineStartPosition = this.getCurrentGroupStartPosition();
        if (currentLineTailLatex)
            this.mathfield.executeCommand("insert", currentLineTailLatex);
        this.mathfield.position = newLineStartPosition;
    }

    handleBackspaceKeydown(keydownEvent) {
        if (keydownEvent.key !== "Backspace")
            return false;
        if (keydownEvent.metaKey || keydownEvent.ctrlKey || keydownEvent.altKey)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        if (this.isCaretAtCurrentGroupStart() && this.hasPreviousExpressionLine())
            this.mergeCurrentLineWithPreviousLine();
        else
            this.mathfield.executeCommand("deleteBackward");
        return true;
    }

    isCaretAtCurrentGroupStart() {
        const range = this.mathfield.selection?.ranges?.[0];
        if (!range || range[0] !== range[1])
            return false;
        const position = range[1];
        const groupStart = this.getCurrentGroupStartPosition();
        return position <= groupStart;
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

    hasPreviousExpressionLine() {
        const savedSelection = this.mathfield.selection;
        const savedPosition = this.mathfield.position;
        this.mathfield.executeCommand("moveUp");
        const movedToPreviousLine = this.mathfield.position !== savedPosition;
        this.mathfield.selection = savedSelection;
        return movedToPreviousLine;
    }

    mergeCurrentLineWithPreviousLine() {
        const currentLineLatex = this.getCurrentLineLatex();
        this.mathfield.executeCommand("removeRow");
        const mergeStartPosition = this.mathfield.position;
        if (currentLineLatex)
            this.mathfield.executeCommand("insert", currentLineLatex);
        this.mathfield.position = mergeStartPosition;
    }

    getCurrentLineLatex() {
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

    lockCaret(mathfield) {
        mathfield.addEventListener("selection-change", _ => this.clampCaretSelection(mathfield));
        mathfield.addEventListener("keydown", keydownEvent => this.handleCaretKeydown(mathfield, keydownEvent), true);
    }

    computeCaretBounds(mathfield) {
        const savedSelection = mathfield.selection;
        mathfield.position = 0;
        mathfield.executeCommand("moveToNextChar");
        const min = mathfield.position;
        const max = Math.max(min, mathfield.lastOffset - 1);
        mathfield.selection = savedSelection;
        return { min, max };
    }

    clampCaretSelection(mathfield) {
        if (this.mathfieldCaretClamping)
            return;
        const caretBounds = this.computeCaretBounds(mathfield);
        const range = mathfield.selection?.ranges?.[0];
        if (!range || !caretBounds)
            return;
        const position = range[1];
        if (position < caretBounds.min || position > caretBounds.max) {
            this.mathfieldCaretClamping = true;
            mathfield.position = position < caretBounds.min ? caretBounds.min : caretBounds.max;
            this.mathfieldCaretClamping = false;
        }
    }

    handleCaretKeydown(mathfield, keydownEvent) {
        const caretBounds = this.computeCaretBounds(mathfield);
        if (!caretBounds)
            return;
        if (keydownEvent.key === "ArrowLeft" && mathfield.position <= caretBounds.min) {
            keydownEvent.preventDefault();
            mathfield.position = caretBounds.min;
            return;
        }
        if (keydownEvent.key === "ArrowRight" && mathfield.position >= caretBounds.max) {
            keydownEvent.preventDefault();
            mathfield.position = caretBounds.max;
            return;
        }
        if (keydownEvent.key === "Home") {
            keydownEvent.preventDefault();
            mathfield.position = caretBounds.min;
            return;
        }
        if (keydownEvent.key === "End") {
            keydownEvent.preventDefault();
            mathfield.position = caretBounds.max;
        }
    }

    ensureCaretIsClamped() {
        this.clampCaretSelection(this.mathfield);
        requestAnimationFrame(() => this.clampCaretSelection(this.mathfield));
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined) {
            this.mathfield.value = properties.expression;
            this.ensureCaretIsClamped();
        }
        this.onChange();
    }

    onChange() {
        this.properties.expression = this.mathfield.getValue();
        clearTimeout(this._changeTimer);
        this._changeTimer = setTimeout(() => {
            this.dispatchEvent("changed", { expression: this.properties.expression });
        }, 300);
    }

    onFocus() {
        this.dispatchEvent("focused", {});
    }

    enterEditMode() {
        if (this.mathfield) {
            this.mathfield.focus();
            return true;
        }
        return super.enterEditMode();
    }

    update() {
        this.element.style.backgroundColor = this.properties.backgroundColor;
        this.mathfield.style.color = this.properties.foregroundColor;
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
        this.element.setAttribute("border-color", this.properties.foregroundColor);
    }

    insert(text) {
        this.mathfield.executeCommand("insert", text);
        this.mathfield.focus();
    }
}
