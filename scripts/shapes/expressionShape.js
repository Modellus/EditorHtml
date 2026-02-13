class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
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
        this.properties.expression = "\\placeholder{}";
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
        this.mathfield.addEventListener("mount", _ => this.handleMathfieldMount());

        div.appendChild(this.mathfield);

        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true,
            scrollByThumb: true
        });

        this.mathfield.value =
            this.properties.expression ??
            "\\displaylines{\\placeholder{}}";

        return foreignObject;
    }

    handleMathfieldMount() {
        this.removeExpressionInlineShortcuts();
        this.mathfield.addEventListener("keydown", keydownEvent => this.handleMathfieldKeydown(keydownEvent), true);
        this.mathfield.executeCommand("selectAll");
        this.mathfield.focus();
    }

    removeExpressionInlineShortcuts() {
        const inlineShortcutMap = { ...(this.mathfield.inlineShortcuts ?? {}) };
        ["dx", "dy", "dt"].forEach(shortcutName => delete inlineShortcutMap[shortcutName]);
        this.mathfield.inlineShortcuts = inlineShortcutMap;
    }

    handleMathfieldKeydown(keydownEvent) {
        if (this.handleMathfieldEnterKeydown(keydownEvent))
            return;
        if (this.handleMathfieldShiftEnterKeydown(keydownEvent))
            return;
        this.handleMathfieldBackspaceKeydown(keydownEvent);
    }

    handleMathfieldEnterKeydown(keydownEvent) {
        if (keydownEvent.key !== "Enter" || keydownEvent.shiftKey)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this.mathfield.executeCommand("addRowAfter");
        return true;
    }

    handleMathfieldShiftEnterKeydown(keydownEvent) {
        if (keydownEvent.key !== "Enter" || !keydownEvent.shiftKey)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this.mathfield.executeCommand("commit");
        return true;
    }

    handleMathfieldBackspaceKeydown(keydownEvent) {
        if (keydownEvent.key !== "Backspace")
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        if (this.mergeRowIntoPreviousAtRowStart()) {
            return true;
        }
        const lineBreakSpanBeforeCaret = this.findLineBreakSpanBeforeCaret();
        if (lineBreakSpanBeforeCaret) {
            this.mathfield.selection = { ranges: [[lineBreakSpanBeforeCaret.start, lineBreakSpanBeforeCaret.end]] };
            this.mathfield.executeCommand("deleteBackward");
            return true;
        }
        const deleteBackwardResult = this.mathfield.executeCommand("deleteBackward");
        if (deleteBackwardResult !== false)
            return true;
        return this.mergeRowIntoPreviousAtRowStart();
    }

    findLineBreakSpanBeforeCaret() {
        const caretPosition = this.mathfield.position;
        const maximumProbeLength = 32;
        for (let relativeOffset = 1; relativeOffset <= maximumProbeLength && caretPosition - relativeOffset >= 0; relativeOffset++) {
            const latexSegment = this.mathfield.getValue([caretPosition - relativeOffset, caretPosition], "latex").trim();
            if (latexSegment === "\\\\" || latexSegment === "\\cr")
                return { start: caretPosition - relativeOffset, end: caretPosition };
        }
        return null;
    }

    mergeRowIntoPreviousAtRowStart() {
        const mathfieldModel = this.getMathfieldModel();
        if (!mathfieldModel?.selectionIsCollapsed)
            return false;
        const atomAtCaret = mathfieldModel.at(mathfieldModel.position);
        const probeAtomList = [atomAtCaret, atomAtCaret?.rightSibling].filter(Boolean);
        for (const probeAtom of probeAtomList) {
            const parentBranch = probeAtom.parentBranch;
            const parentGrid = probeAtom.parent;
            if (!Array.isArray(parentBranch) || typeof parentGrid?.getCell !== "function" || typeof parentGrid?.colCount !== "number" || parentGrid.colCount !== 1)
                continue;
            const [rowIndex, columnIndex] = parentBranch;
            if (!Number.isInteger(rowIndex) || !Number.isInteger(columnIndex) || rowIndex <= 0)
                continue;
            const currentCell = parentGrid.getCell(rowIndex, columnIndex);
            if (!Array.isArray(currentCell) || currentCell.length === 0)
                continue;
            const rowFirstAtom = currentCell[0];
            const firstVisibleAtom = currentCell.find(atom => atom?.type !== "first") ?? rowFirstAtom;
            const rowFirstOffset = mathfieldModel.offsetOf(rowFirstAtom);
            const rowFirstVisibleOffset = mathfieldModel.offsetOf(firstVisibleAtom);
            const isAtRowStart = mathfieldModel.position === rowFirstOffset || atomAtCaret === rowFirstAtom || atomAtCaret?.rightSibling === rowFirstAtom;
            if (!isAtRowStart)
                continue;
            const cellEndOffset = mathfieldModel.offsetOf(currentCell[currentCell.length - 1]);
            const currentCellLatex = rowFirstVisibleOffset <= cellEndOffset ? this.mathfield.getValue([rowFirstVisibleOffset, cellEndOffset + 1], "latex") : "";
            const normalizedCellContent = currentCellLatex.trim();
            const hasContent = normalizedCellContent.length > 0 && normalizedCellContent !== "\\placeholder{}";
            this.mathfield.executeCommand("removeRow");
            if (hasContent)
                this.mathfield.executeCommand("insert", currentCellLatex);
            return true;
        }
        return false;
    }

    getMathfieldModel() {
        return this.mathfield.model ?? this.mathfield._mathfield?.model;
    }

    static deserialize(board, data) {
        var shape = super.deserialize(board, data);
        shape.mathfield.value = data.properties.expression;
        return shape;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined)
            this.mathfield.value = properties.expression;
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
