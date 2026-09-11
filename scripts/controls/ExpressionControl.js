class ExpressionControl {
    // A row is checked once the writing of it has paused, rather than on every keystroke, so a row being
    // built up is not reported half-written.
    static errorCheckDelay = 600;

    constructor(options = {}) {
        this.options = options;
        this.containerElement = null;
        this.mathfield = null;
        this.mathliveController = null;
        this.semanticDecorator = null;
        this.colorSchemeQuery = null;
        this.errorReport = null;
        this.allFailingRows = [];
        this.failingRows = [];
        this.rowCellRanges = [];
        this.writtenRowIndex = -1;
        this.onColorSchemeChange = () => this.refreshSemanticColoring();
    }

    create(containerElement) {
        this.containerElement = containerElement;
        $(this.containerElement).css({ width: "100%", height: "100%", "background-color": "transparent", position: "relative" });
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
            this._installAlignedLayoutStyle();
            this._removeExpressionInlineShortcuts();
            this._installExpressionKeybindings();
            this.mathliveController = new MathliveController(this.mathfield);
            this.mathfield.addEventListener("keydown", keydownEvent => this._onKeyDown(keydownEvent), true);
            this._createSemanticDecorator();
            this.checkErrors();
        });
        // The row holding the caret is left unmarked while the field is being written in, so the check
        // is run again as soon as the caret leaves it, off the ranges the last check already read.
        this.mathfield.addEventListener("selection-change", () => this._syncCaretRow());
        // The check is run a frame after the field is left, so the row that was being written in is read
        // as a row nobody is standing in any more, and is reported like the rest.
        this.mathfield.addEventListener("blur", () => requestAnimationFrame(() => this.checkErrors()));
        this.mathfield.addEventListener("focus", () => this.errorReport?.refresh());
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
        if (this.options.findFailingRows) {
            this.errorReport = new ExpressionErrorReport(this);
            this.errorReport.create(this.containerElement);
        }
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
        this._scheduleAlignmentNormalization(inputEvent);
        this.scheduleSemanticColoring();
        this._writtenRowIsUnread = true;
        this.scheduleErrorCheck();
    }

    scheduleErrorCheck() {
        if (!this.errorReport)
            return;
        clearTimeout(this._errorCheckTimer);
        this._errorCheckTimer = setTimeout(() => this.checkErrors(), ExpressionControl.errorCheckDelay);
    }

    // A card taken off the board leaves no check behind it: a check landing on a card that is gone would
    // report rows of an expression nothing is drawing any more.
    cancelErrorCheck() {
        clearTimeout(this._errorCheckTimer);
    }

    checkErrors() {
        if (!this.errorReport || !this.mathfield)
            return;
        clearTimeout(this._errorCheckTimer);
        this.allFailingRows = this.options.findFailingRows?.() ?? [];
        this.rowCellRanges = this.allFailingRows.length > 0 ? this._getRowCellRanges() : [];
        this._readRowAnchors();
        this._writeFailingRows(true);
    }

    // Where each reading belongs is worked out once, with the rows, rather than every time the marks are
    // laid out again: the place moves only when the expression does, while the marks are laid out again
    // whenever the card is scrolled or the caret moves.
    _readRowAnchors() {
        for (let failingRowIndex = 0; failingRowIndex < this.allFailingRows.length; failingRowIndex++) {
            const failingRow = this.allFailingRows[failingRowIndex];
            const index = failingRow.finding?.index;
            failingRow.anchor = Number.isFinite(index) ? this.readRowAnchor(failingRow.rowIndex, index) : null;
        }
    }

    // Which row the caret stands in is only worth reading between keystrokes: while the field is being
    // written in, the rows the last check read have moved out from under it.
    _syncCaretRow() {
        if (!this.errorReport || this._readingRowRanges || this._writtenRowIsUnread || this.allFailingRows.length === 0)
            return;
        this._writeFailingRows();
    }

    // The rows the engine refused, as the card shows them. The row being written in is left out: a row is
    // half-written for as long as it is being written, and saying so under the caret is nagging rather
    // than reporting. It is the row being written in, not the row the caret happens to have landed in -
    // a card clicked into and left alone says everything that is wrong with it.
    _writeFailingRows(rowsWereJustRead = false) {
        const caretRowIndex = this._readCaretRowIndex();
        if (rowsWereJustRead && this._writtenRowIsUnread) {
            this.writtenRowIndex = caretRowIndex;
            this._writtenRowIsUnread = false;
        } else if (caretRowIndex !== this.writtenRowIndex)
            this.writtenRowIndex = -1;
        const failingRows = this.allFailingRows.filter(failingRow => failingRow.rowIndex !== this.writtenRowIndex);
        const signature = failingRows.map(failingRow => `${failingRow.rowIndex}:${failingRow.error?.message ?? ""}`).join("|");
        const reportIsUnchanged = signature === this._failingRowsSignature;
        this.failingRows = failingRows;
        this._failingRowsSignature = signature;
        // The marks are laid out again whatever the rows are: the same row failing after an edit above it
        // stands somewhere else on the card.
        this.errorReport.setFailingRows(failingRows);
        if (reportIsUnchanged)
            return;
        this.semanticDecorator?.invalidate();
        this.scheduleSemanticColoring();
        this.options.onFailingRowsChanged?.(failingRows);
    }

    getFailingRowIndexes() {
        return this.failingRows.map(failingRow => failingRow.rowIndex);
    }

    setErrorReportActive(active) {
        this.errorReport?.setActive(active);
    }

    _readCaretRowIndex() {
        if (!this.mathfield?.hasFocus())
            return -1;
        const caretPosition = this.mathfield.position;
        for (let rowIndex = 0; rowIndex < this.rowCellRanges.length; rowIndex++) {
            const cellRanges = this.rowCellRanges[rowIndex];
            for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
                if (caretPosition >= cellRanges[cellIndex][0] && caretPosition <= cellRanges[cellIndex][1])
                    return rowIndex;
            }
        }
        return -1;
    }

    // A row of an aligned expression is written as two cells, so the cells the field reports are read
    // back two at a time there and one at a time everywhere else.
    _getRowCellRanges() {
        const cellRanges = this._getRowRanges();
        const cellsPerRow = ExpressionAlignment.isAligned(this.readPresentedLatex()) ? 2 : 1;
        const rowCellRanges = [];
        for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
            const rowIndex = Math.floor(cellIndex / cellsPerRow);
            if (!rowCellRanges[rowIndex])
                rowCellRanges[rowIndex] = [];
            rowCellRanges[rowIndex].push(cellRanges[cellIndex]);
        }
        return rowCellRanges;
    }

    // Where a row stands on screen, as the rectangle its own symbols take up. A row nothing has been
    // written in yet reports nothing, and is left unmarked rather than marked in the wrong place.
    getRowBounds(rowIndex) {
        const cellRanges = this.rowCellRanges[rowIndex];
        if (!this.mathfield || !cellRanges)
            return null;
        let top = Infinity;
        let bottom = -Infinity;
        for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
            const [cellStart, cellEnd] = cellRanges[cellIndex];
            for (let offset = cellStart + 1; offset <= cellEnd; offset++) {
                const bounds = this.mathfield.getElementInfo(offset)?.bounds;
                if (!bounds || bounds.height === 0)
                    continue;
                top = Math.min(top, bounds.top);
                bottom = Math.max(bottom, bounds.bottom);
            }
        }
        if (top === Infinity)
            return null;
        return { top, bottom, height: bottom - top };
    }

    // Where in the field a place in the row's latex stands. The row is walked one symbol at a time,
    // adding up the latex passed. A place the walk lands on exactly stands between two symbols, which is
    // where something missing belongs; a place a symbol steps over stands inside that symbol, and then
    // all that can be said is which symbol it is. The walk only lands exactly where the row is written
    // flat - the field reports the contents of a fraction or a root rather than the latex wrapping them
    // - so a place inside one of those is reported as the symbol holding it rather than guessed at.
    readRowAnchor(rowIndex, rowCharacterIndex) {
        const cellRanges = this.rowCellRanges[rowIndex];
        if (!this.mathfield || !cellRanges)
            return null;
        let passedLength = 0;
        let reachedLength = 0;
        let lastOffset = null;
        for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
            const [cellStart, cellEnd] = cellRanges[cellIndex];
            for (let offset = cellStart + 1; offset <= cellEnd; offset++) {
                const offsetLength = passedLength + this._readRangeLatex(cellStart, offset).length;
                if (offsetLength > rowCharacterIndex)
                    return { offset, placement: reachedLength === rowCharacterIndex ? "before" : "on" };
                reachedLength = offsetLength;
                lastOffset = offset;
            }
            passedLength += this._readRangeLatex(cellStart, cellEnd).length;
        }
        return lastOffset === null ? null : { offset: lastOffset, placement: "after" };
    }

    getOffsetBounds(offset) {
        return this.mathfield?.getElementInfo(offset)?.bounds ?? null;
    }

    // A row reached from the panel takes the caret at its end, where writing carries on from what is
    // already written rather than in front of it.
    moveCaretToRow(rowIndex) {
        this.focus();
        const cellRanges = this._getRowCellRanges()[rowIndex];
        if (!cellRanges)
            return;
        this.mathfield.position = cellRanges[cellRanges.length - 1][1];
    }

    _createSemanticDecorator() {
        if (this.options.semanticColoring === false)
            return;
        this.semanticDecorator = new MathSemanticDecorator(this.mathfield, () => this.options.getSemanticMetadata?.() ?? null);
        this.colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
        this.colorSchemeQuery.addEventListener("change", this.onColorSchemeChange);
        this.scheduleSemanticColoring();
    }

    scheduleSemanticColoring() {
        if (!this.semanticDecorator)
            return;
        cancelAnimationFrame(this._semanticColoringFrame);
        this._semanticColoringFrame = requestAnimationFrame(() => {
            this._semanticColoringFrame = null;
            this.refreshSemanticColoring();
        });
    }

    refreshSemanticColoring() {
        if (!this.semanticDecorator || !this.mathfield)
            return;
        this.semanticDecorator.refresh();
    }

    _scheduleAlignmentNormalization(inputEvent) {
        if (this.options.alignEquations === false)
            return;
        const inputType = inputEvent?.inputType ?? "";
        if (inputType === "historyUndo" || inputType === "historyRedo")
            return;
        cancelAnimationFrame(this._alignmentFrame);
        this._alignmentFrame = requestAnimationFrame(() => {
            this._alignmentFrame = null;
            this.normalizeAlignment();
        });
    }

    buildPresentedLatex(canonicalLatex) {
        if (this.options.alignEquations === false)
            return canonicalLatex;
        const presentedLatex = ExpressionAlignment.toPresentation(canonicalLatex);
        if (ExpressionAlignment.keepsContent(presentedLatex, canonicalLatex))
            return presentedLatex;
        return canonicalLatex;
    }

    readPresentedLatex() {
        const unstyledLatex = this.mathfield.getValue("latex-unstyled");
        if (unstyledLatex !== "")
            return unstyledLatex;
        return this.mathfield.getValue();
    }

    normalizeAlignment() {
        if (this.options.alignEquations === false || !this.mathfield)
            return false;
        const presentedLatex = this.readPresentedLatex();
        if (!ExpressionAlignment.needsNormalization(presentedLatex)) {
            this.syncAlignedLayoutClass();
            return false;
        }
        const normalizedLatex = this.buildPresentedLatex(presentedLatex);
        if (normalizedLatex === presentedLatex)
            return false;
        const savedSelection = this._readSelectionLeafCounts();
        this.mathfield.value = normalizedLatex;
        this._restoreSelectionLeafCounts(savedSelection);
        this.semanticDecorator?.invalidate();
        this.scheduleSemanticColoring();
        this.syncAlignedLayoutClass();
        return true;
    }

    syncAlignedLayoutClass() {
        this.mathfield.classList.toggle("mdl-expression-aligned", ExpressionAlignment.isAligned(this.readPresentedLatex()));
    }

    _readSelectionLeafCounts() {
        const selectionRange = this.mathfield.selection?.ranges?.[0] ?? [this.mathfield.position, this.mathfield.position];
        return {
            start: MathSemanticDecorator.countLeavesBeforeOffset(this.mathfield, selectionRange[0]),
            end: MathSemanticDecorator.countLeavesBeforeOffset(this.mathfield, selectionRange[1]),
            direction: this.mathfield.selection?.direction ?? "none"
        };
    }

    _restoreSelectionLeafCounts(savedSelection) {
        const startOffset = MathSemanticDecorator.findOffsetForLeafCount(this.mathfield, savedSelection.start);
        const endOffset = MathSemanticDecorator.findOffsetForLeafCount(this.mathfield, savedSelection.end);
        if (startOffset === endOffset) {
            this.mathfield.position = startOffset;
            return;
        }
        this.mathfield.selection = { ranges: [[startOffset, endOffset]], direction: savedSelection.direction };
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

    _installAlignedLayoutStyle() {
        const shadowRoot = this.mathfield.shadowRoot;
        if (!shadowRoot || shadowRoot.querySelector("#mdl-expression-aligned-layout"))
            return;
        const styleElement = document.createElement("style");
        styleElement.id = "mdl-expression-aligned-layout";
        styleElement.textContent = `:host(.mdl-expression-aligned) .ML__content { justify-content: center; } :host(.mdl-expression-aligned) .ML__latex { text-align: center; }`;
        shadowRoot.appendChild(styleElement);
    }

    _getDeadKeyAction(keydownEvent) {
        if (keydownEvent.altKey) {
            if (keydownEvent.code === 'BracketLeft')
                return ["insert", "\\land"];
            if (keydownEvent.code === 'KeyI')
                return ["moveToSuperscript"];
            if (keydownEvent.code === 'KeyN')
                return ["insert", "\\neg"];
            if (keydownEvent.code === 'KeyE')
                return ["insert", "\\in"];
            if (keydownEvent.code === 'KeyU')
                return ["insert", "\\cup"];
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

    _isBelongsToShortcutKey(keydownEvent) {
        return keydownEvent.code === 'KeyE' || keydownEvent.key === 'e' || keydownEvent.key === '\u00e9';
    }

    _isUnionShortcutKey(keydownEvent) {
        return keydownEvent.code === 'KeyU' || keydownEvent.key === 'u' || keydownEvent.key === '\u00fc';
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
        if (this._leaveDifferentialNameOnKeydown(keydownEvent))
            return;
        if (this._breakAlignedRowOnKeydown(keydownEvent))
            return;
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
            if (this._isBelongsToShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Belongs to").insertText);
                return;
            }
            if (this._isUnionShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Union").insertText);
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
        this._startTermNamedIndexOnKeydown(keydownEvent);
        if (this._handleSpaceKeydown(keydownEvent))
            return;
        if (this._joinAlignedRowsOnKeydown(keydownEvent))
            return;
        if (this.mathliveController?.handleBackspaceKeydown(keydownEvent))
            return;
        this.mathliveController?.handleDeleteKeydown(keydownEvent);
    }

    // A dot after a name starts a named part of that name (`v.x`), written as a subscript marked with
    // '\!' so the parser tells it apart from an index and restores the dot.  Only the character after
    // the dot says which of the two dots was typed - a named part is spelled with letters, a decimal
    // separator carries digits - so the dot is written as it was typed and the named part is opened
    // around it when a letter follows.  `x1.5` stays the number it reads as, `Body1.vx` still names
    // the whole term.  The name is looked for in the group holding the caret, so a dot typed at the
    // start of a group does not reach for the name written in the group before it.
    _startTermNamedIndexOnKeydown(keydownEvent) {
        if (keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey)
            return;
        if (!/^[A-Za-z]$/.test(keydownEvent.key))
            return;
        if (!Utils.endsWithTermNameDot(this._getGroupLatexBeforeCaret()))
            return;
        this.mathfield.executeCommand("deleteBackward");
        this.mathfield.executeCommand("moveToSubscript");
        this.mathfield.executeCommand("insert", Utils.termNamedIndexMarker);
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

    // The name of a differential is made of name characters only - a named part and an index included - so
    // anything else ends it and is written after the fraction, where the rest of the row belongs. A space
    // is what ends a name and nothing else, so it is spent leaving the differential it ends.
    _leaveDifferentialNameOnKeydown(keydownEvent) {
        if (keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey)
            return false;
        const typedKey = keydownEvent.key;
        const nameEndKeys = ["Enter", "Tab", "Escape"];
        const endsTheName = nameEndKeys.includes(typedKey) || (typedKey.length === 1 && !/[A-Za-z0-9._]/.test(typedKey));
        if (!endsTheName)
            return false;
        const leftDifferential = this.mathliveController?.leaveDifferentialName();
        if (!leftDifferential || typedKey !== " ")
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        return true;
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
        this.mathfield.executeCommand("moveAfterParent");
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
        // A function written upright leaves the caret carrying its face, so the parenthesis and the
        // argument typed next would be drawn upright too - and read back as part of the function name.
        this.mathfield.applyStyle({ variant: "auto", variantStyle: "auto" });
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
            { shortcutText: "sign", functionLatex: "\\mathrm{sign}", requiresParenthesis: true },
            { shortcutText: "round", functionLatex: "\\mathrm{round}", requiresParenthesis: true },
            { shortcutText: "irnd", functionLatex: "\\mathrm{irnd}", requiresParenthesis: true },
            { shortcutText: "rnd", functionLatex: "\\mathrm{rnd}", requiresParenthesis: true },
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

    // The rows are read by walking the caret through them and putting it back where it was, so while the
    // walk is going on the caret says nothing about where the user is standing: whoever listens for the
    // caret moving is told to wait for it to be put back.
    _getRowRanges() {
        const savedSelection = this.mathfield.selection;
        const lastOffset = this.mathfield.lastOffset;
        const rowRanges = [];
        let rowStart = 0;
        this._readingRowRanges = true;
        try {
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
        } finally {
            this._readingRowRanges = false;
        }
        return rowRanges;
    }

    // A row of an aligned expression is written as two cells, so the row break MathLive writes at the caret
    // only breaks the cell holding it: breaking `y & =2x` at its head leaves `=2x` where it stands and
    // carries `y` down on its own. The row is broken whole here instead, the way a row breaks when the
    // expression is not aligned - what stands before the caret stays, what follows it opens the row below.
    // A caret standing inside a group of its own, a fraction or a pair of delimiters, breaks no row, which
    // is what MathLive does there too.
    _breakAlignedRowOnKeydown(keydownEvent) {
        if (keydownEvent.key !== "Enter" || keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey || keydownEvent.shiftKey)
            return false;
        if (this.options.alignEquations === false || !this.mathfield.selectionIsCollapsed)
            return false;
        if (!ExpressionAlignment.isAligned(this.readPresentedLatex()))
            return false;
        const brokenRows = this._readRowsBrokenAtCaret();
        if (!brokenRows)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        this._writeRows(brokenRows.rowsLatex);
        this._moveCaretToRowStart(brokenRows.openedRowIndex);
        return true;
    }

    _readRowsBrokenAtCaret() {
        const rows = this._readRows();
        const caretPlace = this._readCaretPlace(rows);
        if (!caretPlace)
            return null;
        const rowsLatex = rows.map(row => row.latex);
        const brokenRowLatex = rowsLatex[caretPlace.rowIndex];
        rowsLatex.splice(caretPlace.rowIndex, 1, brokenRowLatex.substring(0, caretPlace.rowOffset), brokenRowLatex.substring(caretPlace.rowOffset));
        return { rowsLatex, openedRowIndex: caretPlace.rowIndex + 1 };
    }

    // A row of an aligned expression is joined to the one above it when a character is deleted backwards at
    // its head, and to the one below it when a character is deleted forwards at its end, the way rows join
    // when the expression is not aligned. MathLive joins no rows of an array of its own, so a blank row
    // above an equation stays there however often it is backspaced over. The join answers first, before the
    // deletion keys that take an empty row away or reach over a cell boundary for the character before it:
    // it stands for the rows of an aligned expression alone and leaves every other row to them.
    _joinAlignedRowsOnKeydown(keydownEvent) {
        if (keydownEvent.key !== "Backspace" && keydownEvent.key !== "Delete")
            return false;
        if (keydownEvent.altKey || keydownEvent.ctrlKey || keydownEvent.metaKey || keydownEvent.shiftKey)
            return false;
        if (this.options.alignEquations === false || !this.mathfield.selectionIsCollapsed)
            return false;
        if (!ExpressionAlignment.isAligned(this.readPresentedLatex()))
            return false;
        const joinedRows = this._readRowsJoinedAtCaret(keydownEvent.key === "Backspace");
        if (!joinedRows)
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        const junctionLeafCount = MathSemanticDecorator.countLeavesBeforeOffset(this.mathfield, joinedRows.junctionOffset);
        this._writeRows(joinedRows.rowsLatex);
        this.mathfield.position = MathSemanticDecorator.findOffsetForLeafCount(this.mathfield, junctionLeafCount);
        return true;
    }

    // Joining rows leaves the caret where the two of them meet, which is where the row taking the other in
    // used to end. The join writes the same leaves in the same order, so the meeting point is found again
    // by counting them.
    _readRowsJoinedAtCaret(joinsRowAbove) {
        const rows = this._readRows();
        const caretPlace = this._readCaretPlace(rows);
        if (!caretPlace)
            return null;
        const caretRowLatex = rows[caretPlace.rowIndex].latex;
        const standsAtTheJoin = joinsRowAbove ? caretPlace.rowOffset === 0 : caretPlace.rowOffset === caretRowLatex.length;
        if (!standsAtTheJoin)
            return null;
        const joiningRowIndex = joinsRowAbove ? caretPlace.rowIndex - 1 : caretPlace.rowIndex;
        if (joiningRowIndex < 0 || joiningRowIndex + 1 >= rows.length)
            return null;
        const rowsLatex = rows.map(row => row.latex);
        rowsLatex.splice(joiningRowIndex, 2, rowsLatex[joiningRowIndex] + rowsLatex[joiningRowIndex + 1]);
        return { rowsLatex, junctionOffset: rows[joiningRowIndex].end };
    }

    // An aligned row is written as two cells, so the rows are read two cells at a time: a row holds the
    // latex of its cells one after the other and spans the offsets from the head of its first cell to the
    // end of its last.
    _readRows() {
        const cellRanges = this._getRowRanges();
        const rows = [];
        for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
            const rowIndex = Math.floor(cellIndex / 2);
            const row = rows[rowIndex] ?? { latex: "", cellRanges: [], end: 0 };
            row.cellRanges.push(cellRanges[cellIndex]);
            row.latex += this._readRangeLatex(cellRanges[cellIndex][0], cellRanges[cellIndex][1]);
            row.end = cellRanges[cellIndex][1];
            rows[rowIndex] = row;
        }
        return rows;
    }

    // The caret stands in one cell of one row, and what stands before it in that row is the latex of the
    // cells it has already passed followed by the part of its own cell written before it. A caret standing
    // inside a group of its own, a fraction or a pair of delimiters, stands in no row of the expression.
    _readCaretPlace(rows) {
        const caretPosition = this.mathfield.position;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            let rowOffset = 0;
            const cellRanges = rows[rowIndex].cellRanges;
            for (let cellIndex = 0; cellIndex < cellRanges.length; cellIndex++) {
                const [cellStart, cellEnd] = cellRanges[cellIndex];
                if (caretPosition >= cellStart && caretPosition <= cellEnd) {
                    if (this.mathliveController?.getCurrentGroupStartPosition() !== cellStart)
                        return null;
                    return { rowIndex, rowOffset: rowOffset + this._readRangeLatex(cellStart, caretPosition).length };
                }
                rowOffset += this._readRangeLatex(cellStart, cellEnd).length;
            }
        }
        return null;
    }

    _readRangeLatex(startPosition, endPosition) {
        if (endPosition <= startPosition)
            return "";
        return this.mathfield.getValue([startPosition, endPosition], "latex-unstyled");
    }

    // The rows are written back through the canonical form, so the alignment is built around them again.
    // They go in as an edit rather than as a value, so the change is one step of the undo history and is
    // announced as the input the rest of the editor listens for; a value is written in silence.
    _writeRows(rowsLatex) {
        const canonicalLatex = `${ExpressionAlignment.displaylinesPrefix}${rowsLatex.join("\\\\")}}`;
        this.mathfield.insert(this.buildPresentedLatex(canonicalLatex), { insertionMode: "replaceAll", format: "latex", suppressChangeNotifications: false });
        this.semanticDecorator?.invalidate();
        this.syncAlignedLayoutClass();
    }

    _moveCaretToRowStart(rowIndex) {
        const cellRanges = this._getRowRanges();
        const cellIndex = ExpressionAlignment.isAligned(this.readPresentedLatex()) ? rowIndex * 2 : rowIndex;
        const cellRange = cellRanges[Math.min(cellIndex, cellRanges.length - 1)];
        if (cellRange)
            this.mathfield.position = cellRange[0];
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
        const selectedParts = [];
        for (let rowIndex = 0; rowIndex < rowRanges.length; rowIndex++) {
            const [rowStart, rowEnd] = rowRanges[rowIndex];
            if (rowStart === rowEnd) {
                if (rowStart >= start && rowEnd <= end)
                    selectedParts.push({ index: rowIndex, latex: "" });
                continue;
            }
            const partStart = Math.max(start, rowStart);
            const partEnd = Math.min(end, rowEnd);
            if (partEnd <= partStart)
                continue;
            selectedParts.push({ index: rowIndex, latex: this.mathfield.getValue([partStart, partEnd], "latex-unstyled") });
        }
        return this._joinCopiedParts(selectedParts);
    }

    _joinCopiedParts(selectedParts) {
        const isAligned = ExpressionAlignment.isAligned(this.readPresentedLatex());
        const rowsLatex = [];
        let currentRowIndex = null;
        for (let partIndex = 0; partIndex < selectedParts.length; partIndex++) {
            const selectedPart = selectedParts[partIndex];
            const rowIndex = isAligned ? Math.floor(selectedPart.index / 2) : selectedPart.index;
            if (rowIndex === currentRowIndex)
                rowsLatex[rowsLatex.length - 1] += selectedPart.latex;
            else {
                rowsLatex.push(selectedPart.latex);
                currentRowIndex = rowIndex;
            }
        }
        return rowsLatex.join("\\\\");
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

    getSelectionLatex() {
        if (this.mathfield.selectionIsCollapsed)
            return this.getCanonicalValue();
        const [start, end] = this._getSelectionRange();
        return this._getRowAwareLatex(start, end);
    }

    static stripDisplaylines(latex) {
        return String(latex ?? "").replace(/^\\displaylines\{([\s\S]*)\}$/, "$1");
    }

    getClipboardRepresentations() {
        const strippedLatex = ExpressionControl.stripDisplaylines(this.getSelectionLatex());
        return [
            ClipboardService.expressionRepresentation({ latex: strippedLatex }),
            ClipboardService.mathmlRepresentation(MathLive.convertLatexToMathMl(strippedLatex)),
            ClipboardService.textRepresentation(strippedLatex)
        ];
    }

    async copyToClipboardUsingMathlive() {
        await ClipboardService.write(this.getClipboardRepresentations());
    }

    async readClipboardLatex() {
        const expressionLatex = await ClipboardService.readExpressionLatex();
        if (expressionLatex != null)
            return ExpressionControl.stripDisplaylines(expressionLatex);
        return ExpressionControl.stripDisplaylines(await navigator.clipboard.readText());
    }

    async pasteFromClipboardUsingMathlive() {
        try {
            const clipboardText = await this.readClipboardLatex();
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
            this.normalizeAlignment();
            this.scheduleSemanticColoring();
        } catch (_) {
        }
    }

    updateLayout() {
        if (!this.containerElement)
            return;
        const scrollViewInstance = DevExpress.ui.dxScrollView.getInstance(this.containerElement);
        scrollViewInstance?.update();
        this.errorReport?.refresh();
    }

    // Names written with a dot, as they come from the parser or from a saved model, are written back as
    // named subscripts so a name always reads the same way, whoever wrote it. A function the parser
    // spells in plain letters is written upright for the same reason, so it never reads as a product.
    setValue(value) {
        const canonicalLatex = Utils.writeFunctionNames(Utils.writeTermNames(value));
        this.mathfield.value = this.buildPresentedLatex(canonicalLatex);
        this.semanticDecorator?.invalidate();
        this.scheduleSemanticColoring();
        this.syncAlignedLayoutClass();
        this.scheduleErrorCheck();
    }

    getValue(format) {
        if (format !== undefined)
            return this.mathfield.getValue(format);
        return this.getCanonicalValue();
    }

    getCanonicalValue() {
        const presentedLatex = this.readPresentedLatex();
        if (this.options.alignEquations === false)
            return presentedLatex;
        return ExpressionAlignment.toCanonical(presentedLatex);
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
        cancelAnimationFrame(this._semanticColoringFrame);
        cancelAnimationFrame(this._alignmentFrame);
        clearTimeout(this._errorCheckTimer);
        this.errorReport?.dispose();
        this.errorReport = null;
        this.colorSchemeQuery?.removeEventListener("change", this.onColorSchemeChange);
        this.colorSchemeQuery = null;
        this.semanticDecorator = null;
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
