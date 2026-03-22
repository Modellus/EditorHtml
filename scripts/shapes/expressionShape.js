class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.mathfieldCaretClamping = false;
        this.mathfieldCaretLocked = false;
        this.focusDispatchFrame = null;
    }

    createToolbar() {
        const items = super.createToolbar();
        this._fgColorPicker = this.createColorPickerEditor("foregroundColor");
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        this._borderColorPicker = this.createColorPickerEditor("borderColor");
        items.push(
            {
                location: "center",
                template: () => {
                    const wrapper = $('<div style="width:180px"></div>');
                    wrapper.append(this.createNameFormControl());
                    return wrapper;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => this.createShortcutsPickerButton()
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => this._fgColorPicker
            },
            {
                location: "center",
                template: () => this._bgColorPicker
            },
            {
                location: "center",
                template: () => this._borderColorPicker
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    template: "<div class='dx-icon'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></div>",
                    stylingMode: "text",
                    onClick: () => this.remove()
                }
            }
        );
        return items;
    }

    createShortcutsPickerButton() {
        const baseItemSize = 50;
        const columns = 4;
        const itemMargin = 2;
        const step = baseItemSize + itemMargin * 2;
        const popupPadding = 6;
        this._shortcutsPicker = $('<div class="mdl-shortcuts-picker"></div>');
        this._shortcutsPicker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Shortcuts",
            icon: "fa-light fa-sigma",
            dropDownOptions: {
                width: columns * step + popupPadding * 2,
                wrapperAttr: { class: "mdl-shortcuts-picker-menu" },
                contentTemplate: contentElement => this.createShortcutsPickerGrid(contentElement)
            }
        });
        return this._shortcutsPicker;
    }

    createShortcutsPickerGrid(contentElement) {
        const baseItemSize = 50;
        const columns = 4;
        const itemMargin = 2;
        const step = baseItemSize + itemMargin * 2;
        const shortcutItems = [
            { name: "Differential", text: "\\frac{dx}{dt}" },
            { name: "Power", text: "x^2" },
            { name: "Squareroot", text: "\\sqrt{x}" },
            { name: "Index", text: "x_{t-1}" }
        ];
        const rows = Math.ceil(shortcutItems.length / columns);
        $(contentElement).empty();
        const container = $('<div class="mdl-shortcuts-picker-grid"></div>');
        $(contentElement).append(container);
        container.dxTileView({
            items: shortcutItems,
            baseItemHeight: baseItemSize,
            baseItemWidth: baseItemSize,
            itemMargin: itemMargin,
            direction: "vertical",
            height: rows * step,
            width: columns * step,
            itemTemplate: (itemData, index, element) => {
                const cell = $(`<div class="mdl-shortcuts-picker-item" title="${itemData.name}"></div>`);
                cell.html(`<math-field read-only class="form-math-field" style="height:auto;width:auto">${itemData.text}</math-field>`);
                $(element).append(cell);
            },
            onItemClick: e => {
                this.insert(e.itemData.text);
                this._shortcutsPicker?.dxDropDownButton("instance")?.close();
            }
        });
    }

    showContextToolbar() {
        this.refreshNameToolbarControl();
        if (this._fgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._fgColorPicker, this.properties.foregroundColor);
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
        if (this._borderColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._borderColorPicker, this.properties.borderColor);
        super.showContextToolbar();
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Expression Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 25;
        this.properties.width = 300;
        this.properties.height = 150;
        this.properties.expression = "\\displaylines{}";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");
        this.container = div;
        $(div).css({ width: "100%", height: "100%", "background-color": "transparent" });
        foreignObject.appendChild(div);
        this.mathfield = new MathfieldElement();
        this.mathfield.popoverPolicy = "off";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.smartMode = false;
        this.mathfield.multiline = true;
        this.mathfield.returnKeyAction = "none";
        this.mathfield.soundsDirectory = null;
        this.mathfield.addEventListener("input", inputEvent => this.onInput(inputEvent));
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
        this.mathfield.value = this.properties.expression ?? "\\displaylines{}";
        return foreignObject;
    }

    onMount() {
        this.removeExpressionInlineShortcuts();
        this.lockCaret(this.mathfield);
        this.mathfield.addEventListener("keydown", keydownEvent => this.onKeyDown(keydownEvent), true);
        this.interceptDeadKeySuperscript();
        this.mathfield.focus();
        this.ensureCaretIsClamped();
    }

    removeExpressionInlineShortcuts() {
        const inlineShortcutMap = { ...this.mathfield.inlineShortcuts };
        delete inlineShortcutMap.dx;
        delete inlineShortcutMap.dy;
        delete inlineShortcutMap.dt;
        inlineShortcutMap["#"] = "\\sqrt{#0}";
        inlineShortcutMap["%"] = "\\Delta";
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            inlineShortcutMap[functionShortcut.shortcutText] = functionShortcut.functionLatex;
        }
        this.mathfield.inlineShortcuts = inlineShortcutMap;
        this.mathfield.inlineShortcutTimeout = 0;
    }

    onKeyDown(keydownEvent) {
        if (this.handleEnterKeydown(keydownEvent))
            return;
        this.handleBackspaceKeydown(keydownEvent);
    }

    interceptDeadKeySuperscript() {
        const sink = this.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
        sink.addEventListener('compositionstart', () => {
            this._preCompositionValue = this.mathfield.getValue();
            this._preCompositionPosition = this.mathfield.position;
        }, true);
        sink.addEventListener('compositionupdate', (compositionEvent) => {
            if (compositionEvent.data !== '^')
                return;
            this._deadKeyComposition = true;
        }, true);
    }

    fixDeadKeySuperscript() {
        const sink = this.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
        sink.dispatchEvent(new CompositionEvent('compositionend', { data: '^', bubbles: true }));
        this.mathfield.setValue(this._preCompositionValue, { silenceNotifications: true });
        this.mathfield.position = this._preCompositionPosition;
        this.mathfield.executeCommand("moveToSuperscript");
    }

    onInput() {
        if (this._deadKeyComposition) {
            this._deadKeyComposition = false;
            this.fixDeadKeySuperscript();
        }
        this.deferFixContentOutsideDisplaylines();
        this.applyExpressionFunctionShortcuts();
        this.syncExpression();
    }

    deferFixContentOutsideDisplaylines() {
        cancelAnimationFrame(this._fixContentFrame);
        this._fixContentFrame = requestAnimationFrame(() => this.fixContentOutsideDisplaylines());
    }

    fixContentOutsideDisplaylines() {
        const value = this.mathfield.getValue();
        const prefix = '\\displaylines{';
        if (!value.startsWith(prefix))
            return;
        let depth = 1;
        let closingIndex = -1;
        for (let i = prefix.length; i < value.length; i++) {
            if (value[i] === '{')
                depth++;
            else if (value[i] === '}') {
                depth--;
                if (depth === 0) {
                    closingIndex = i;
                    break;
                }
            }
        }
        if (closingIndex < 0 || closingIndex === value.length - 1)
            return;
        const inside = value.substring(prefix.length, closingIndex);
        const leaked = value.substring(closingIndex + 1);
        const savedPosition = this.mathfield.position;
        this.mathfield.value = `${prefix}${inside}${leaked}}`;
        this.mathfield.position = Math.min(savedPosition, this.mathfield.lastOffset);
    }

    applyExpressionFunctionShortcuts() {
        if (this.hasSelection())
            return;
        const caretPosition = this.getCaretPosition();
        const groupStart = this.getCurrentGroupStartPosition();
        const typedLength = caretPosition - groupStart;
        if (typedLength < 2)
            return;
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            if (functionShortcut.shortcutText.length > typedLength)
                continue;
            if (this.applyFunctionShortcut(functionShortcut.shortcutText, functionShortcut.functionLatex, caretPosition, groupStart))
                return;
        }
    }

    applyFunctionShortcut(shortcutText, functionLatex, caretPosition, groupStart) {
        const shortcutStart = caretPosition - shortcutText.length;
        if (shortcutStart < groupStart)
            return false;
        const typedShortcut = this.getTextRange(shortcutStart, caretPosition);
        if (typedShortcut !== shortcutText)
            return false;
        const previousCharacter = shortcutStart > groupStart ? this.getTextRange(shortcutStart - 1, shortcutStart) : "";
        if (previousCharacter === "\\" || this.isAsciiLetter(previousCharacter))
            return false;
        this.mathfield.selection = { ranges: [[shortcutStart, caretPosition]], direction: "forward" };
        this.mathfield.executeCommand("insert", functionLatex);
        return true;
    }

    getExpressionFunctionShortcuts() {
        return [
            { shortcutText: "cosec", functionLatex: "\\cosec" },
            { shortcutText: "sqrt", functionLatex: "\\sqrt" },
            { shortcutText: "frac", functionLatex: "\\frac" },
            { shortcutText: "cdot", functionLatex: "\\cdot" },
            { shortcutText: "sign", functionLatex: "sign" },
            { shortcutText: "int", functionLatex: "int" },
            { shortcutText: "round", functionLatex: "round" },
            { shortcutText: "irnd", functionLatex: "irnd" },
            { shortcutText: "rnd", functionLatex: "rnd" },
            { shortcutText: "sin", functionLatex: "\\sin" },
            { shortcutText: "cos", functionLatex: "\\cos" },
            { shortcutText: "tan", functionLatex: "\\tan" },
            { shortcutText: "sec", functionLatex: "\\sec" },
            { shortcutText: "cot", functionLatex: "\\cot" },
            { shortcutText: "log", functionLatex: "\\log" },
            { shortcutText: "epsilon", functionLatex: "\\epsilon" },
            { shortcutText: "lambda", functionLatex: "\\lambda" },
            { shortcutText: "Lambda", functionLatex: "\\Lambda" },
            { shortcutText: "omega", functionLatex: "\\omega" },
            { shortcutText: "Omega", functionLatex: "\\Omega" },
            { shortcutText: "theta", functionLatex: "\\theta" },
            { shortcutText: "Theta", functionLatex: "\\Theta" },
            { shortcutText: "alpha", functionLatex: "\\alpha" },
            { shortcutText: "sigma", functionLatex: "\\sigma" },
            { shortcutText: "Sigma", functionLatex: "\\Sigma" },
            { shortcutText: "gamma", functionLatex: "\\gamma" },
            { shortcutText: "Gamma", functionLatex: "\\Gamma" },
            { shortcutText: "delta", functionLatex: "\\delta" },
            { shortcutText: "Delta", functionLatex: "\\Delta" },
            { shortcutText: "beta", functionLatex: "\\beta" },
            { shortcutText: "phi", functionLatex: "\\phi" },
            { shortcutText: "Phi", functionLatex: "\\Phi" },
            { shortcutText: "tau", functionLatex: "\\tau" },
            { shortcutText: "rho", functionLatex: "\\rho" },
            { shortcutText: "mu", functionLatex: "\\mu" },
            { shortcutText: "PI", functionLatex: "\\PI" },
            { shortcutText: "pi", functionLatex: "\\pi" }
        ];
    }

    isAsciiLetter(text) {
        return /^[A-Za-z]$/.test(text);
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
        if (this.isCaretAtDisplaylineStart() && this.hasPreviousExpressionLine()) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.mergeCurrentLineWithPreviousLine();
            return true;
        }
        return false;
    }

    isCaretAtDisplaylineStart() {
        if (this.hasSelection())
            return false;
        const position = this.getCaretPosition();
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
        mathfield.addEventListener("keydown", keydownEvent => this.handleCaretKeydown(mathfield, keydownEvent), true);
    }

    computeCaretBounds(mathfield) {
        return { min: 1, max: mathfield.lastOffset };
    }

    clampCaretPosition(mathfield) {
        if (this.mathfieldCaretClamping)
            return;
        const bounds = this.computeCaretBounds(mathfield);
        if (mathfield.position >= bounds.min && mathfield.position <= bounds.max)
            return;
        this.mathfieldCaretClamping = true;
        mathfield.position = 0;
        mathfield.executeCommand("moveToNextChar");
        this.mathfieldCaretClamping = false;
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
            mathfield.executeCommand("moveToGroupStart");
            return;
        }
        if (keydownEvent.key === "End") {
            keydownEvent.preventDefault();
            mathfield.executeCommand("moveToGroupEnd");
        }
    }

    ensureCaretIsClamped() {
        this.mathfieldCaretClamping = true;
        this.mathfield.position = 0;
        this.mathfield.executeCommand("moveToNextChar");
        this.mathfieldCaretClamping = false;
        requestAnimationFrame(() => {
            this.mathfieldCaretClamping = true;
            this.mathfield.position = 0;
            this.mathfield.executeCommand("moveToNextChar");
            this.mathfieldCaretClamping = false;
        });
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined) {
            this.mathfield.value = properties.expression;
            this.ensureCaretIsClamped();
        }
        this.onChange();
    }

    syncExpression() {
        cancelAnimationFrame(this._syncFrame);
        this._syncFrame = requestAnimationFrame(() => this.onChange());
    }

    onChange() {
        const expression = this.mathfield.getValue();
        if (expression === this.properties.expression)
            return;
        this.properties.expression = expression;
        clearTimeout(this._changeTimer);
        this._changeTimer = setTimeout(() => {
            this.dispatchEvent("changed", { expression: this.properties.expression });
        }, 300);
    }

    onFocus() {
        if (this.focusDispatchFrame != null)
            cancelAnimationFrame(this.focusDispatchFrame);
        this.focusDispatchFrame = requestAnimationFrame(() => {
            this.focusDispatchFrame = null;
            this.dispatchEvent("focused", {});
        });
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
        this.applyBorderStyle(this.container, 1);
        this.mathfield.style.color = this.properties.foregroundColor;
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
        super.draw();
    }

    toImageBlob() {
        const width = this.properties.width;
        const height = this.properties.height;
        const color = this.properties.foregroundColor || "black";
        const backgroundColor = this.properties.backgroundColor || "transparent";
        const markup = MathLive.convertLatexToMarkup(this.properties.expression);
        const mathStyles = BaseShape.embeddedMathStyles || "";
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <defs><style>${mathStyles}</style></defs>
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;width:${width}px;height:${height}px;padding:4px;box-sizing:border-box;background:${backgroundColor};color:${color};font-size:16px;overflow:hidden;">
                    ${markup}
                </div>
            </foreignObject>
        </svg>`;
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = width * 2;
                canvas.height = height * 2;
                const ctx = canvas.getContext("2d");
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => resolve(blob), "image/png");
            };
            img.onerror = () => reject(new Error("SVG render failed"));
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        });
    }

    async copyToClipboard() {
        const shapeData = this.getClipboardData();
        const json = JSON.stringify(shapeData);
        const jsonBlob = new Blob([json], { type: "text/plain" });
        try {
            const imageBlob = await this.toImageBlob();
            await navigator.clipboard.write([new ClipboardItem({
                "text/plain": jsonBlob,
                "image/png": imageBlob
            })]);
        } catch (_) {
            await navigator.clipboard.writeText(json);
        }
    }

    insert(text) {
        this.mathfield.executeCommand("insert", text);
        this.mathfield.focus();
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ExpressionShape;
