class ExpressionControl {
    constructor(options = {}) {
        this.options = options;
        this.containerElement = null;
        this.mathfield = null;
        this.mathliveController = null;
    }

    create(containerElement) {
        this.containerElement = containerElement;
        $(this.containerElement).css({ width: "100%", height: "100%", "background-color": "transparent" });
        this.mathfield = new MathfieldElement();
        this.mathfield.style.setProperty("--contains-highlight-background-color", "transparent");
        this.mathfield.smartMode = false;
        this.mathfield.multiline = this.options.multiline !== false;
        this.mathfield.returnKeyAction = "none";
        MathfieldElement.soundsDirectory = null;
        this.mathfield.addEventListener("mount", () => {
            const applyMathfieldUiPolicies = () => {
                this.mathfield.menuItems = [];
                this.mathfield.mathVirtualKeyboardPolicy = "manual";
                this.mathfield.virtualKeyboardMode = "off";
                this.mathfield.popoverPolicy = "off";
                this._hideMathfieldUiButtons();
            };
            applyMathfieldUiPolicies();
            requestAnimationFrame(() => applyMathfieldUiPolicies());
            this._removeExpressionInlineShortcuts();
            this._installExpressionKeybindings();
            this.mathliveController = new MathliveController(this.mathfield);
            this.mathfield.addEventListener("keydown", keydownEvent => this._onKeyDown(keydownEvent), true);
        });
        this.mathfield.addEventListener("input", inputEvent => this._onInput(inputEvent));
        if (this.options.onInput)
            this.mathfield.addEventListener("input", inputEvent => this.options.onInput(inputEvent));
        if (this.options.onChange)
            this.mathfield.addEventListener("change", changeEvent => this.options.onChange(changeEvent));
        if (this.options.onFocus)
            this.mathfield.addEventListener("focus", focusEvent => this.options.onFocus(focusEvent));
        if (this.options.onBlur)
            this.mathfield.addEventListener("blur", blurEvent => this.options.onBlur(blurEvent));
        if (this.options.onMount)
            this.mathfield.addEventListener("mount", mountEvent => this.options.onMount(mountEvent));
        this.containerElement.appendChild(this.mathfield);
        if (this.options.useScrollView !== false)
            $(this.containerElement).dxScrollView({
                showScrollbar: "always",
                bounceEnabled: true,
                scrollByContent: true,
                scrollByThumb: true
            });
        if (typeof this.options.value === "string")
            this.setValue(this.options.value);
        return this.containerElement;
    }

    _onInput(inputEvent) {
        try {
            this.mathliveController?.handleInput(inputEvent);
        } catch (_) {
        }
        const shortcutApplied = this._applyExpressionFunctionShortcuts();
        if (!shortcutApplied && this._shouldDeferRelationalShortcut(inputEvent))
            this._deferRelationalShortcutHandling();
    }

    _shouldDeferRelationalShortcut(inputEvent) {
        const inputText = typeof inputEvent?.data === "string" ? inputEvent.data : "";
        return inputText.length > 0 && /[=<>]/.test(inputText);
    }

    _deferRelationalShortcutHandling() {
        cancelAnimationFrame(this._relationalShortcutFrame);
        this._relationalShortcutFrame = requestAnimationFrame(() => {
            this._relationalShortcutFrame = null;
            this._applyExpressionFunctionShortcuts();
        });
    }

    _installExpressionKeybindings() {
        const additionalKeybindings = [
            { key: "shift+[Digit6]", ifMode: "math", command: "moveToSuperscript" },
            { key: "[BracketLeft]", ifLayout: ["apple.french"], ifMode: "math", command: "moveToSuperscript" }
        ];
        const currentKeybindings = Array.isArray(this.mathfield.keybindings) ? this.mathfield.keybindings : [];
        const uniqueKeybindingsBySignature = new Map();
        for (let keybindingIndex = 0; keybindingIndex < currentKeybindings.length; keybindingIndex++) {
            const currentKeybinding = currentKeybindings[keybindingIndex];
            uniqueKeybindingsBySignature.set(this._getKeybindingSignature(currentKeybinding), currentKeybinding);
        }
        for (let keybindingIndex = 0; keybindingIndex < additionalKeybindings.length; keybindingIndex++) {
            const additionalKeybinding = additionalKeybindings[keybindingIndex];
            uniqueKeybindingsBySignature.set(this._getKeybindingSignature(additionalKeybinding), additionalKeybinding);
        }
        this.mathfield.keybindings = Array.from(uniqueKeybindingsBySignature.values());
    }

    _getKeybindingSignature(keybinding) {
        const keyboardKey = keybinding?.key ?? "";
        const commandName = keybinding?.command ?? "";
        const mode = keybinding?.ifMode ?? "";
        const layoutValue = keybinding?.ifLayout;
        const layout = Array.isArray(layoutValue) ? layoutValue.join("|") : (layoutValue ?? "");
        return `${keyboardKey}::${commandName}::${mode}::${layout}`;
    }

    _removeExpressionInlineShortcuts() {
        const inlineShortcutMap = { ...this.mathfield.inlineShortcuts };
        delete inlineShortcutMap.dx;
        delete inlineShortcutMap.dy;
        delete inlineShortcutMap.dt;
        delete inlineShortcutMap.in;
        inlineShortcutMap["#"] = "\\sqrt{#0}";
        inlineShortcutMap["%"] = "\\Delta";
        inlineShortcutMap["|"] = "\\left|#0\\right|";
        inlineShortcutMap["~"] = "\\neg";
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            if (functionShortcut.requiresParenthesis) {
                delete inlineShortcutMap[functionShortcut.shortcutText];
                continue;
            }
            inlineShortcutMap[functionShortcut.shortcutText] = functionShortcut.functionLatex;
        }
        this.mathfield.inlineShortcuts = inlineShortcutMap;
        this.mathfield.inlineShortcutTimeout = 0;
    }

    _hideMathfieldUiButtons() {
        const shadowRoot = this.mathfield.shadowRoot;
        if (!shadowRoot)
            return;
        let hideStyleElement = shadowRoot.querySelector("#mdl-expression-control-hide-ui-buttons");
        if (!hideStyleElement) {
            hideStyleElement = document.createElement("style");
            hideStyleElement.id = "mdl-expression-control-hide-ui-buttons";
            shadowRoot.appendChild(hideStyleElement);
        }
        hideStyleElement.textContent = `
            .ML__virtual-keyboard-toggle,
            .ML__menu-toggle,
            .ML__keyboard-toggle,
            button[aria-label="Toggle Virtual Keyboard"],
            button[aria-label="Toggle Virtual Keyboard Menu"],
            button[aria-label*="Virtual Keyboard"],
            button[aria-label*="Menu"] {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }
        `;
    }

    _getDeadKeyAction(keydownEvent) {
        if (keydownEvent.altKey) {
            if (keydownEvent.code === 'BracketLeft')
                return ["insert", "\\land"];
            if (keydownEvent.code === 'KeyI')
                return ["moveToSuperscript"];
            if (keydownEvent.code === 'KeyN')
                return ["insert", "\\neg"];
            return null;
        }
        if (keydownEvent.code === 'BracketLeft')
            return ["moveToSuperscript"];
        if (keydownEvent.code === 'Quote' && keydownEvent.shiftKey)
            return ["moveToSuperscript"];
        if (keydownEvent.code === 'Quote' && !keydownEvent.shiftKey)
            return ["insert", "\\neg"];
        return null;
    }

    _isSlashShortcutKey(keydownEvent) {
        return keydownEvent.key === '/' || (keydownEvent.code === 'Slash' && !keydownEvent.shiftKey) || (keydownEvent.code === 'Digit7' && keydownEvent.shiftKey);
    }

    _isUnderscoreShortcutKey(keydownEvent) {
        const key = keydownEvent.key;
        return key === '_' || key === '-' || key === '–' || key === '—' || key === '−' || (keydownEvent.code === 'Minus' && keydownEvent.shiftKey);
    }

    _onKeyDown(keydownEvent) {
        if ((keydownEvent.ctrlKey || keydownEvent.metaKey) && !keydownEvent.altKey && keydownEvent.key === ".") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            keydownEvent.stopPropagation();
            this.options.onOpenShortcuts();
            return;
        }
        if ((keydownEvent.ctrlKey || keydownEvent.metaKey) && keydownEvent.key === "c") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            keydownEvent.stopPropagation();
            this.copyToClipboardUsingMathlive();
            return;
        }
        if ((keydownEvent.ctrlKey || keydownEvent.metaKey) && keydownEvent.key === "v") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            keydownEvent.stopPropagation();
            this.pasteFromClipboardUsingMathlive();
            return;
        }
        this._leaveTermNamedIndexOnKeydown(keydownEvent);
        if (keydownEvent.key === "Dead") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            const action = this._getDeadKeyAction(keydownEvent);
            if (action)
                this.mathfield.executeCommand(...action);
            const sink = this.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
            sink.removeAttribute('contenteditable');
            requestAnimationFrame(() => sink.setAttribute('contenteditable', 'true'));
            return;
        }
        if (keydownEvent.key === "'") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.mathfield.executeCommand("insert", "^{\\prime}");
            this.mathfield.executeCommand("moveAfterParent");
            return;
        }
        if (keydownEvent.key === "\\") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.insert(this.getTemplateShortcut("Condition").insertText);
            return;
        }
        if (keydownEvent.altKey && !keydownEvent.ctrlKey && !keydownEvent.metaKey) {
            const key = keydownEvent.key;
            if (key === 'v' || key === '\u221A') {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert('\\lor');
                return;
            }
            if (this._isUnderscoreShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Floor").insertText);
                return;
            }
            if (this._isSlashShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Differential").insertText);
                return;
            }
        }
        if (keydownEvent.metaKey && !keydownEvent.ctrlKey && !keydownEvent.altKey && this._isUnderscoreShortcutKey(keydownEvent)) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.insert(this.getTemplateShortcut("Ceil").insertText);
            return;
        }
        if (keydownEvent.key === "(" && !keydownEvent.altKey && !keydownEvent.ctrlKey && !keydownEvent.metaKey) {
            this._applyParenthesisFunctionShortcuts();
            return;
        }
        if (this._handleTermNamedIndexKeydown(keydownEvent))
            return;
        if (this._handleSpaceKeydown(keydownEvent))
            return;
        if (this.mathliveController?.handleBackspaceKeydown(keydownEvent))
            return;
        this.mathliveController?.handleDeleteKeydown(keydownEvent);
    }

    // A dot after a name starts a named part of that name (`v.x`), written as a subscript marked with
    // '\!' so the parser tells it apart from an index and restores the dot.  A dot anywhere else, a
    // decimal separator in particular, is left to Mathlive.
    _handleTermNamedIndexKeydown(keydownEvent) {
        if (keydownEvent.key !== "." || keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey)
            return false;
        if (!this._canStartTermNamedIndex())
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this.mathfield.executeCommand("moveToSubscript");
        this.mathfield.executeCommand("insert", Utils.termNamedIndexMarker);
        return true;
    }

    // The name being named is looked for in the group holding the caret, so a dot typed at the start of
    // a group does not reach for the name written in the group before it.
    _canStartTermNamedIndex() {
        const groupLatexBeforeCaret = this._getGroupLatexBeforeCaret();
        if (groupLatexBeforeCaret === null)
            return false;
        // Mathlive keeps a single subscript per name, so a name already being named cannot take another one.
        if (Utils.endsWithOpenTermNamedIndex(groupLatexBeforeCaret))
            return false;
        return Utils.endsWithTermName(groupLatexBeforeCaret);
    }

    // A named part of a name is made of name characters only, so anything else closes it and carries
    // on with the expression.  The space key is left to the caret handling that already leaves groups.
    // This runs on every keystroke, so it only reads the latex written so far and never moves the caret.
    _leaveTermNamedIndexOnKeydown(keydownEvent) {
        if (keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey)
            return;
        const typedKey = keydownEvent.key;
        if (typedKey.length !== 1 || typedKey === " " || /[A-Za-z0-9]/.test(typedKey))
            return;
        if (!Utils.endsWithOpenTermNamedIndex(this._getLatexBeforeCaret()))
            return;
        this.mathfield.executeCommand("moveAfterParent");
    }

    _getLatexBeforeCaret() {
        if (!this.mathliveController || this.mathliveController.hasSelection())
            return "";
        return this.mathliveController.getTextRange(0, this.mathliveController.getCaretPosition());
    }

    _getGroupLatexBeforeCaret() {
        if (!this.mathliveController || this.mathliveController.hasSelection())
            return null;
        const caretPosition = this.mathliveController.getCaretPosition();
        const groupStartPosition = this.mathliveController.getCurrentGroupStartPosition();
        if (caretPosition <= groupStartPosition)
            return null;
        return this.mathliveController.getTextRange(groupStartPosition, caretPosition);
    }

    _handleSpaceKeydown(keydownEvent) {
        if (keydownEvent.key !== " ")
            return false;
        if (this.mathliveController.hasSelection())
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        const savedPosition = this.mathfield.position;
        this.mathfield.executeCommand("moveAfterParent");
        if (this.mathfield.position === savedPosition)
            this.mathfield.executeCommand("insert", "\\quad\\textcolor{gray}{\\mathrm{#0}}");
        return true;
    }

    _applyParenthesisFunctionShortcuts() {
        if (this.mathliveController.hasSelection())
            return;
        const caretPosition = this.mathliveController.getCaretPosition();
        const groupStart = this.mathliveController.getCurrentGroupStartPosition();
        const typedLength = caretPosition - groupStart;
        if (typedLength < 2)
            return;
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            if (!functionShortcut.requiresParenthesis)
                continue;
            if (functionShortcut.shortcutText.length > typedLength)
                continue;
            if (this._applyFunctionShortcut(functionShortcut.shortcutText, functionShortcut.functionLatex, caretPosition, groupStart))
                return;
        }
    }

    _applyExpressionFunctionShortcuts() {
        if (!this.mathliveController)
            return false;
        if (this.mathliveController.hasSelection())
            return false;
        const caretPosition = this.mathliveController.getCaretPosition();
        const groupStart = this.mathliveController.getCurrentGroupStartPosition();
        const typedLength = caretPosition - groupStart;
        if (typedLength < 2)
            return false;
        if (this._applyRelationalShortcuts(caretPosition, groupStart))
            return true;
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            if (functionShortcut.requiresParenthesis)
                continue;
            if (functionShortcut.shortcutText.length > typedLength)
                continue;
            if (this._applyFunctionShortcut(functionShortcut.shortcutText, functionShortcut.functionLatex, caretPosition, groupStart))
                return true;
        }
        return false;
    }

    _applyRelationalShortcuts(caretPosition, groupStart) {
        const relationalShortcuts = this.getRelationalShortcuts();
        for (let index = 0; index < relationalShortcuts.length; index++) {
            const shortcut = relationalShortcuts[index];
            const shortcutStart = caretPosition - shortcut.shortcutText.length;
            if (shortcutStart < groupStart)
                continue;
            const typedShortcut = this.mathliveController.getTextRange(shortcutStart, caretPosition);
            if (typedShortcut !== shortcut.shortcutText)
                continue;
            this.mathfield.selection = { ranges: [[shortcutStart, caretPosition]], direction: "forward" };
            this.mathfield.executeCommand("insert", shortcut.functionLatex);
            return true;
        }
        return false;
    }

    getRelationalShortcuts() {
        return [
            { shortcutText: ">=", functionLatex: "\\geq" },
            { shortcutText: "<=", functionLatex: "\\leq" },
            { shortcutText: "<>", functionLatex: "\\ne" }
        ];
    }

    _applyFunctionShortcut(shortcutText, functionLatex, caretPosition, groupStart) {
        const shortcutStart = caretPosition - shortcutText.length;
        if (shortcutStart < groupStart)
            return false;
        const typedShortcut = this.mathliveController.getTextRange(shortcutStart, caretPosition);
        if (typedShortcut !== shortcutText)
            return false;
        const previousCharacter = shortcutStart > groupStart ? this.mathliveController.getTextRange(shortcutStart - 1, shortcutStart) : "";
        if (previousCharacter === "\\" || this._isAsciiLetter(previousCharacter))
            return false;
        this.mathfield.selection = { ranges: [[shortcutStart, caretPosition]], direction: "forward" };
        this.mathfield.executeCommand("insert", functionLatex);
        return true;
    }

    getExpressionFunctionShortcuts() {
        return [
            { shortcutText: "cosec", functionLatex: "\\cosec", requiresParenthesis: true },
            { shortcutText: "arccos", functionLatex: "\\arccos", requiresParenthesis: true },
            { shortcutText: "arctan", functionLatex: "\\arctan", requiresParenthesis: true },
            { shortcutText: "arcsin", functionLatex: "\\arcsin", requiresParenthesis: true },
            { shortcutText: "cosh", functionLatex: "\\cosh", requiresParenthesis: true },
            { shortcutText: "tanh", functionLatex: "\\tanh", requiresParenthesis: true },
            { shortcutText: "sinh", functionLatex: "\\sinh", requiresParenthesis: true },
            { shortcutText: "sqrt", functionLatex: "\\sqrt" },
            { shortcutText: "frac", functionLatex: "\\frac" },
            { shortcutText: "cdot", functionLatex: "\\cdot" },
            { shortcutText: "sign", functionLatex: "sign", requiresParenthesis: true },
            { shortcutText: "round", functionLatex: "round", requiresParenthesis: true },
            { shortcutText: "irnd", functionLatex: "irnd", requiresParenthesis: true },
            { shortcutText: "rnd", functionLatex: "rnd", requiresParenthesis: true },
            { shortcutText: "sin", functionLatex: "\\sin", requiresParenthesis: true },
            { shortcutText: "cos", functionLatex: "\\cos", requiresParenthesis: true },
            { shortcutText: "tan", functionLatex: "\\tan", requiresParenthesis: true },
            { shortcutText: "sec", functionLatex: "\\sec", requiresParenthesis: true },
            { shortcutText: "cot", functionLatex: "\\cot", requiresParenthesis: true },
            { shortcutText: "log", functionLatex: "\\log", requiresParenthesis: true },
            { shortcutText: "ln", functionLatex: "\\ln", requiresParenthesis: true },
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

    _isAsciiLetter(text) {
        return /^[A-Za-z]$/.test(text);
    }

    getTemplateShortcuts() {
        if (this.options.getTemplateShortcuts)
            return this.options.getTemplateShortcuts();
        if (typeof resolveExpressionTemplateShortcuts === "function")
            return resolveExpressionTemplateShortcuts("t");
        return [
            { name: "Differential", text: "\\frac{\\mathrm{d}x}{\\mathrm{d}t}", insertText: "\\frac{\\differentialD{\\placeholder{}}}{\\differentialD{t}}", shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
            { name: "Power", text: "x^2", insertText: "\\placeholder{}^2", shortcut: "^" },
            { name: "Squareroot", text: "\\sqrt{x}", insertText: "\\sqrt{\\placeholder{}}", shortcut: "#" },
            { name: "Index", text: "x_{t-1}", insertText: "\\placeholder{}_{t-1}", shortcut: "_" },
            { name: "Condition", text: "\\begin{cases} 2 & t=0 \\\\ 4 & t\\ge2\\end{cases}", insertText: "\\begin{cases}\\placeholder{} & t=0 \\\\ \\placeholder{} & t\\ge2\\end{cases}", shortcut: "\\" },
            { name: "Not", text: "\\neg x", insertText: "\\neg", shortcut: "~" },
            { name: "Or", text: "x>0 \\lor x<5", insertText: "\\lor", shortcutMac: "⌥v", shortcutWindows: "Alt+v" },
            { name: "And", text: "x>0 \\land x<5", insertText: "\\land", shortcutMac: "⌥^", shortcutWindows: "Alt+^" },
            { name: "Floor", text: "\\lfloor x\\rfloor", insertText: "\\lfloor\\placeholder{}\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" },
            { name: "Ceil", text: "\\lceil x\\rceil", insertText: "\\lceil\\placeholder{}\\rceil", shortcutMac: "⌘_", shortcutWindows: "" }
        ];
    }

    getTemplateShortcut(name) {
        const templateShortcuts = this.getTemplateShortcuts();
        for (let templateShortcutIndex = 0; templateShortcutIndex < templateShortcuts.length; templateShortcutIndex++) {
            const templateShortcut = templateShortcuts[templateShortcutIndex];
            if (templateShortcut.name === name)
                return templateShortcut;
        }
        return null;
    }

    insert(text) {
        if (document.activeElement !== this.mathfield)
            this.mathfield.focus();
        this.mathfield.executeCommand("insert", text);
        const placeholderMatches = text.match(/\\placeholder\{\}/g);
        const placeholdersCount = placeholderMatches ? placeholderMatches.length : 0;
        for (let placeholderIndex = 0; placeholderIndex < placeholdersCount; placeholderIndex++)
            this.mathfield.executeCommand("moveToPreviousPlaceholder");
    }

    _getRowRanges() {
        const savedSelection = this.mathfield.selection;
        const lastOffset = this.mathfield.lastOffset;
        const rowRanges = [];
        let rowStart = 0;
        while (rowStart <= lastOffset) {
            this.mathfield.position = rowStart;
            this.mathfield.executeCommand("moveToGroupEnd");
            const rowEnd = this.mathfield.position;
            if (rowEnd < rowStart)
                break;
            rowRanges.push([rowStart, rowEnd]);
            if (rowEnd >= lastOffset)
                break;
            rowStart = rowEnd + 1;
        }
        this.mathfield.selection = savedSelection;
        return rowRanges;
    }

    _getSelectionRange() {
        const selectionRanges = this.mathfield.selection?.ranges ?? [];
        let start = this.mathfield.lastOffset;
        let end = 0;
        for (let rangeIndex = 0; rangeIndex < selectionRanges.length; rangeIndex++) {
            const selectionRange = selectionRanges[rangeIndex];
            start = Math.min(start, selectionRange[0], selectionRange[1]);
            end = Math.max(end, selectionRange[0], selectionRange[1]);
        }
        return [start, end];
    }

    _getRowAwareLatex(start, end) {
        const rowRanges = this._getRowRanges();
        const rowLatexParts = [];
        for (let rowIndex = 0; rowIndex < rowRanges.length; rowIndex++) {
            const [rowStart, rowEnd] = rowRanges[rowIndex];
            if (rowStart === rowEnd) {
                if (rowStart >= start && rowEnd <= end)
                    rowLatexParts.push("");
                continue;
            }
            const partStart = Math.max(start, rowStart);
            const partEnd = Math.min(end, rowEnd);
            if (partEnd <= partStart)
                continue;
            rowLatexParts.push(this.mathfield.getValue([partStart, partEnd], "latex"));
        }
        return rowLatexParts.join("\\\\");
    }

    _splitTopLevelRows(latex) {
        const expressionRows = [];
        let currentRow = "";
        let braceDepth = 0;
        let environmentDepth = 0;
        let characterIndex = 0;
        while (characterIndex < latex.length) {
            const character = latex[characterIndex];
            if (character === "\\") {
                if (latex[characterIndex + 1] === "\\" && braceDepth === 0 && environmentDepth === 0) {
                    expressionRows.push(currentRow);
                    currentRow = "";
                    characterIndex += 2;
                    continue;
                }
                const commandMatch = /^\\([a-zA-Z]+)/.exec(latex.substring(characterIndex));
                if (commandMatch) {
                    if (commandMatch[1] === "begin")
                        environmentDepth++;
                    else if (commandMatch[1] === "end")
                        environmentDepth--;
                    currentRow += commandMatch[0];
                    characterIndex += commandMatch[0].length;
                    continue;
                }
                currentRow += latex.substring(characterIndex, characterIndex + 2);
                characterIndex += 2;
                continue;
            }
            if (character === "{")
                braceDepth++;
            else if (character === "}")
                braceDepth--;
            currentRow += character;
            characterIndex++;
        }
        expressionRows.push(currentRow);
        return expressionRows;
    }

    copyToClipboardUsingMathlive() {
        let latex;
        if (this.mathfield.selectionIsCollapsed)
            latex = this.mathfield.getValue("latex");
        else {
            const [start, end] = this._getSelectionRange();
            latex = this._getRowAwareLatex(start, end);
        }
        const strippedLatex = latex.replace(/^\\displaylines\{([\s\S]*)\}$/, "$1");
        navigator.clipboard.writeText(strippedLatex);
    }

    async pasteFromClipboardUsingMathlive() {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText)
                return;
            const expressionRows = this._splitTopLevelRows(clipboardText);
            this.mathfield.focus();
            this.mathfield.executeCommand("insert", expressionRows[0] ?? "");
            for (let rowIndex = 1; rowIndex < expressionRows.length; rowIndex++) {
                this.mathfield.executeCommand("addRowAfter");
                if (expressionRows[rowIndex])
                    this.mathfield.executeCommand("insert", expressionRows[rowIndex]);
            }
        } catch (_) {
        }
    }

    updateLayout() {
        if (!this.containerElement)
            return;
        const scrollViewInstance = DevExpress.ui.dxScrollView.getInstance(this.containerElement);
        scrollViewInstance?.update();
    }

    // Names written with a dot, as they come from the parser or from a saved model, are written back as
    // named subscripts so a name always reads the same way, whoever wrote it.
    setValue(value) {
        this.mathfield.value = Utils.writeTermNames(value);
    }

    getValue(format) {
        return this.mathfield.getValue(format);
    }

    focus() {
        this.mathfield.focus();
    }

    syncHandwrittenStyle() {
        const shadowRoot = this.mathfield.shadowRoot;
        if (!shadowRoot)
            return;
        const isMidSchool = document.body.classList.contains("mid-school");
        let styleElement = shadowRoot.querySelector("#mdl-handwritten-style");
        if (isMidSchool) {
            if (!styleElement) {
                styleElement = document.createElement("style");
                styleElement.id = "mdl-handwritten-style";
                shadowRoot.appendChild(styleElement);
            }
            styleElement.textContent = `.ML__latex, .ML__text, .ML__cmr, .ML__mathit, .ML__ams, .ML__bb, .ML__cal, .ML__frak, .ML__tt, .ML__script, .ML__sans { font-family: "Caveat", cursive !important; }`;
        } else if (styleElement)
            styleElement.remove();
    }

    dispose() {
        if (this.containerElement) {
            const scrollViewInstance = DevExpress.ui.dxScrollView.getInstance(this.containerElement);
            if (scrollViewInstance)
                scrollViewInstance.dispose();
        }
        if (this.mathfield?.parentNode)
            this.mathfield.parentNode.removeChild(this.mathfield);
        this.mathfield = null;
        this.containerElement = null;
    }
}
