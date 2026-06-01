class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.focusDispatchFrame = null;
    }

    createToolbar() {
        const items = super.createToolbar();
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
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
            this.createRemoveToolbarItem()
        );
        return items;
    }

    createShortcutsPickerButton() {
        const baseItemWidth = 110;
        const baseItemHeight = 70;
        const columns = 3;
        const itemMargin = 2;
        const horizontalStep = baseItemWidth + itemMargin * 2;
        const popupPadding = 6;
        this._shortcutsPicker = $('<div class="mdl-shortcuts-picker"></div>');
        this._shortcutsPicker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Shortcuts Tooltip", this.board.translations, 280),
            icon: "fa-light fa-sigma",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-shortcuts-picker-menu"),
                width: columns * horizontalStep + popupPadding * 2,
                contentTemplate: contentElement => this.createShortcutsPickerGrid(contentElement)
            }
        });
        return this._shortcutsPicker;
    }

    createShortcutsPickerGrid(contentElement) {
        const baseItemWidth = 110;
        const baseItemHeight = 70;
        const columns = 3;
        const itemMargin = 2;
        const horizontalStep = baseItemWidth + itemMargin * 2;
        const verticalStep = baseItemHeight + itemMargin * 2;
        const shortcutItems = [
            { name: "Differential", text: "\\frac{\\mathrm{d}x}{\\mathrm{d}t}" },
            { name: "Power", text: "x^2" },
            { name: "Squareroot", text: "\\sqrt{x}" },
            { name: "Index", text: "x_{t-1}" },
            { name: "Not", text: "\\neg x" },
            { name: "Or", text: "x>0 \\lor x<5" },
            { name: "And", text: "x>0 \\land x<5" },
            { name: "Condition", text: "\\begin{cases}1 & t=0 \\\\ y & t\\ge2\\end{cases}" }
        ];
        const rows = Math.ceil(shortcutItems.length / columns);
        $(contentElement).empty();
        const container = $('<div class="mdl-shortcuts-picker-grid"></div>');
        $(contentElement).append(container);
        container.dxTileView({
            items: shortcutItems,
            baseItemHeight: baseItemHeight,
            baseItemWidth: baseItemWidth,
            itemMargin: itemMargin,
            direction: "vertical",
            height: rows * verticalStep,
            width: columns * horizontalStep,
            itemTemplate: (itemData, index, element) => {
                const cell = $(`<div class="mdl-shortcuts-picker-item" title="${itemData.name}" style="display:flex;align-items:center;justify-content:center;height:100%;width:100%"></div>`);
                cell.html(`<math-field read-only class="form-math-field" style="height:auto;width:auto">${itemData.text}</math-field>`);
                $(element).append(cell);
            },
            onItemClick: e => {
                this.insert(e.itemData.text);
                this._shortcutsPicker?.dxDropDownButton("instance")?.close();
            }
        });
    }

    getCopySubMenuItems() {
        return [
            ...super.getCopySubMenuItems(),
            { text: "Copy as Math", icon: "fa-light fa-square-root-variable", shortcut: "", action: () => this.copyAsMath() }
        ];
    }

    async copyAsMath() {
        const mathml = this.mathfield.getValue("math-ml");
        await navigator.clipboard.writeText(mathml);
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
        this.installMathfieldValueNormalization();
        MathfieldElement.soundsDirectory = null;
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
        this.mathfield.value = this.normalizeExpression(this.properties.expression ?? "\\displaylines{}");
        return foreignObject;
    }

    installMathfieldValueNormalization() {
        const mathfieldPrototype = Object.getPrototypeOf(this.mathfield);
        const valueDescriptor = Object.getOwnPropertyDescriptor(mathfieldPrototype, "value");
        if (!valueDescriptor?.get || !valueDescriptor?.set)
            return;
        Object.defineProperty(this.mathfield, "value", {
            configurable: true,
            enumerable: valueDescriptor.enumerable ?? false,
            get: () => valueDescriptor.get.call(this.mathfield),
            set: value => valueDescriptor.set.call(this.mathfield, this.normalizeExpression(value))
        });
    }

    onMount() {
        this.removeExpressionInlineShortcuts();
        this.installExpressionKeybindings();
        this.caretController = new MathfieldCaretController(this.mathfield);
        this.caretController.install();
        this.mathfield.addEventListener("keydown", keydownEvent => this.onKeyDown(keydownEvent), true);
        if (this.board.selection.selectedShape === this)
            this.mathfield.focus();
        this.syncHandwrittenStyle();
    }

    installExpressionKeybindings() {
        this.mathfield.keybindings = [
            ...this.mathfield.keybindings,
            { key: "shift+[Digit6]", ifMode: "math", command: "moveToSuperscript" },
            { key: "[BracketLeft]", ifLayout: ["apple.french"], ifMode: "math", command: "moveToSuperscript" }
        ];
    }

    getDeadKeyAction(keydownEvent) {
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

    removeExpressionInlineShortcuts() {
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

    onKeyDown(keydownEvent) {
        if (keydownEvent.key === "Dead") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            const action = this.getDeadKeyAction(keydownEvent);
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
            return;
        }
        if (keydownEvent.key === "\\") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.insert("\\begin{cases}\\placeholder{} & \\placeholder{}\\end{cases}");
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
        }
        if (keydownEvent.key === "(" && !keydownEvent.altKey && !keydownEvent.ctrlKey && !keydownEvent.metaKey) {
            this.applyParenthesisFunctionShortcuts();
            return;
        }
        if (this.handleSpaceKeydown(keydownEvent))
            return;
        if (this.caretController.handleBackspaceKeydown(keydownEvent))
            return;
        this.caretController.handleDeleteKeydown(keydownEvent);
    }

    onInput(inputEvent) {
        this.mathliveController?.handleInput(inputEvent);
        this.deferFixContentOutsideDisplaylines();
        const shortcutApplied = this.applyExpressionFunctionShortcuts();
        if (!shortcutApplied && this.shouldDeferRelationalShortcut(inputEvent))
            this.deferRelationalShortcutHandling();
        this.syncExpression();
    }

    shouldDeferRelationalShortcut(inputEvent) {
        const inputText = typeof inputEvent?.data === "string" ? inputEvent.data : "";
        return inputText.length > 0 && /[=<>]/.test(inputText);
    }

    deferRelationalShortcutHandling() {
        cancelAnimationFrame(this._relationalShortcutFrame);
        this._relationalShortcutFrame = requestAnimationFrame(() => {
            this._relationalShortcutFrame = null;
            if (this.applyExpressionFunctionShortcuts())
                this.syncExpression();
        });
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

    applyParenthesisFunctionShortcuts() {
        if (this.caretController.hasSelection())
            return;
        const caretPosition = this.caretController.getCaretPosition();
        const groupStart = this.caretController.getCurrentGroupStartPosition();
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
            if (this.applyFunctionShortcut(functionShortcut.shortcutText, functionShortcut.functionLatex, caretPosition, groupStart))
                return;
        }
    }

    applyExpressionFunctionShortcuts() {
        if (this.caretController.hasSelection())
            return false;
        const caretPosition = this.caretController.getCaretPosition();
        const groupStart = this.caretController.getCurrentGroupStartPosition();
        const typedLength = caretPosition - groupStart;
        if (typedLength < 2)
            return false;
        if (this.applyRelationalShortcuts(caretPosition, groupStart))
            return true;
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            if (functionShortcut.requiresParenthesis)
                continue;
            if (functionShortcut.shortcutText.length > typedLength)
                continue;
            if (this.applyFunctionShortcut(functionShortcut.shortcutText, functionShortcut.functionLatex, caretPosition, groupStart))
                return true;
        }
        return false;
    }

    applyRelationalShortcuts(caretPosition, groupStart) {
        const relationalShortcuts = this.getRelationalShortcuts();
        for (let index = 0; index < relationalShortcuts.length; index++) {
            const shortcut = relationalShortcuts[index];
            const shortcutStart = caretPosition - shortcut.shortcutText.length;
            if (shortcutStart < groupStart)
                continue;
            const typedShortcut = this.caretController.getTextRange(shortcutStart, caretPosition);
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

    applyFunctionShortcut(shortcutText, functionLatex, caretPosition, groupStart) {
        const shortcutStart = caretPosition - shortcutText.length;
        if (shortcutStart < groupStart)
            return false;
        const typedShortcut = this.caretController.getTextRange(shortcutStart, caretPosition);
        if (typedShortcut !== shortcutText)
            return false;
        const previousCharacter = shortcutStart > groupStart ? this.caretController.getTextRange(shortcutStart - 1, shortcutStart) : "";
        if (previousCharacter === "\\" || this.isAsciiLetter(previousCharacter))
            return false;
        this.mathfield.selection = { ranges: [[shortcutStart, caretPosition]], direction: "forward" };
        this.mathfield.executeCommand("insert", functionLatex);
        return true;
    }

    getExpressionFunctionShortcuts() {
        return [
            { shortcutText: "cosec", functionLatex: "\\cosec", requiresParenthesis: true },
            { shortcutText: "sqrt", functionLatex: "\\sqrt" },
            { shortcutText: "frac", functionLatex: "\\frac" },
            { shortcutText: "cdot", functionLatex: "\\cdot" },
            { shortcutText: "sign", functionLatex: "sign", requiresParenthesis: true },
            { shortcutText: "int", functionLatex: "int", requiresParenthesis: true },
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

    isAsciiLetter(text) {
        return /^[A-Za-z]$/.test(text);
    }

    handleSpaceKeydown(keydownEvent) {
        if (keydownEvent.key !== " ")
            return false;
        if (this.caretController.hasSelection())
            return false;
        keydownEvent.preventDefault();
        keydownEvent.stopImmediatePropagation();
        const savedPosition = this.mathfield.position;
        this.mathfield.executeCommand("moveAfterParent");
        if (this.mathfield.position === savedPosition)
            this.mathfield.executeCommand("insert", "\\quad\\textcolor{gray}{\\mathrm{#0}}");
        return true;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined) {
            const normalizedExpression = this.normalizeExpression(properties.expression);
            this.mathfield.value = normalizedExpression;
            this.caretController.ensureCaretIsClamped();
            this.properties.expression = normalizedExpression;
            this._committedExpression = normalizedExpression;
        }
        this.onChange();
    }

    syncExpression() {
        cancelAnimationFrame(this._syncFrame);
        this._syncFrame = requestAnimationFrame(() => this.onChange());
    }

    normalizeExpression(expression) {
        const flattenedExpression = this.flattenNestedDisplaylines(expression);
        const derivativeNormalizedExpression = this.normalizeDerivativeFractions(flattenedExpression);
        return this.normalizeRelationalAliases(derivativeNormalizedExpression);
    }

    flattenNestedDisplaylines(expression) {
        const prefix = "\\displaylines{";
        if (!expression?.startsWith(prefix))
            return expression;
        let content = expression.slice(prefix.length, -1);
        let index = content.indexOf(prefix);
        while (index !== -1) {
            let depth = 1;
            let closeIndex = -1;
            for (let i = index + prefix.length; i < content.length; i++) {
                if (content[i] === '{')
                    depth++;
                else if (content[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        closeIndex = i;
                        break;
                    }
                }
            }
            if (closeIndex === -1)
                break;
            content = content.substring(0, index) + content.substring(index + prefix.length, closeIndex) + content.substring(closeIndex + 1);
            index = content.indexOf(prefix, index);
        }
        return prefix + content + "}";
    }

    normalizeDerivativeFractions(expression) {
        return expression.replace(/\\frac\{d([^{}]+)\}\{d([^{}]+)\}/g, (_match, numeratorVariable, denominatorVariable) => `\\frac{\\mathrm{d}${numeratorVariable}}{\\mathrm{d}${denominatorVariable}}`);
    }

    normalizeRelationalAliases(expression) {
        return expression
            .replaceAll(">=", "\\ge ")
            .replaceAll("=>", "\\ge ")
            .replaceAll("<=", "\\le ")
            .replaceAll("=<", "\\le ")
            .replaceAll("<>", "\\ne ");
    }

    applyNormalizedExpressionIfNeeded() {
        const expression = this.mathfield.getValue();
        const normalizedExpression = this.normalizeExpression(expression);
        if (normalizedExpression === expression)
            return expression;
        const savedPosition = this.mathfield.position;
        this.mathfield.value = normalizedExpression;
        this.mathfield.position = Math.min(savedPosition, this.mathfield.lastOffset);
        return normalizedExpression;
    }

    onChange() {
        const expression = this.applyNormalizedExpressionIfNeeded();
        if (expression === this.properties.expression)
            return;
        if (this._committedExpression === undefined)
            this._committedExpression = this.properties.expression;
        this.properties.expression = expression;
        clearTimeout(this._changeTimer);
        this._changeTimer = setTimeout(() => {
            const previousExpression = this._committedExpression;
            this._committedExpression = this.properties.expression;
            const currentExpression = this.properties.expression;
            if (currentExpression !== previousExpression) {
                const command = new SetShapePropertiesCommand(this.board, this, { expression: currentExpression });
                command.previousProperties = Utils.cloneProperties(this.properties);
                command.previousProperties.expression = previousExpression;
                this.board.invoker.record(command);
            }
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
            document.addEventListener("mousedown", this._onDocumentMouseDown);
            this.mathfield.focus();
            return true;
        }
        return super.enterEditMode();
    }

    update() {
        this.element.style.backgroundColor = this.properties.backgroundColor;
        this.applyBorderStyle(this.container, 1);
        this.mathfield.style.color = this.properties.foregroundColor;
        this.mathfield.style.backgroundColor = this.properties.backgroundColor ?? "transparent";
        this.syncHandwrittenStyle();
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
        const isMidSchool = document.body.classList.contains("mid-school");
        const handwrittenOverride = isMidSchool
            ? `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap'); .ML__latex, .ML__text, .ML__mathit, .ML__cmr, .ML__ams { font-family: "Caveat", cursive !important; }`
            : "";
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <defs><style>${mathStyles} ${handwrittenOverride}</style></defs>
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
