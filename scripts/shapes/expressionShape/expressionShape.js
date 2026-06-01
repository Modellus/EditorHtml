class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.focusDispatchFrame = null;
    }

    isPassthroughDoubleClickSelectionEnabled() {
        return true;
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
        this.mathfield.style.setProperty("--contains-highlight-background-color", "transparent");
        this.mathfield.popoverPolicy = "off";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.smartMode = false;
        this.mathfield.multiline = true;
        this.mathfield.returnKeyAction = "none";
        MathfieldElement.soundsDirectory = null;
        this.mathfield.addEventListener("input", inputEvent => this.onInput(inputEvent));
        this.mathfield.addEventListener("change", _ => this.onChange());
        this.mathfield.addEventListener("focus", _ => this.onFocus());
        this.mathfield.addEventListener("blur", _ => this.onBlur());
        this.mathfield.addEventListener("mount", _ => this.onMount());
        div.appendChild(this.mathfield);
        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true,
            scrollByThumb: true
        });
        this.mathfield.value = this.flattenNestedDisplaylines(this.properties.expression ?? "\\displaylines{}");
        return foreignObject;
    }

    onMount() {
        this.removeExpressionInlineShortcuts();
        this.installExpressionKeybindings();
        this.mathliveController = new MathliveController(this.mathfield);
        this.mathfield.addEventListener("keydown", keydownEvent => this.onKeyDown(keydownEvent), true);
        const sink = this.mathfield.shadowRoot.querySelector('.ML__keyboard-sink');
        sink.addEventListener('keydown', e => console.log("[ExprShape] SINK keydown", { key: e.key, code: e.code, defaultPrevented: e.defaultPrevented }), true);
        sink.addEventListener('beforeinput', e => console.log("[ExprShape] SINK beforeinput", { inputType: e.inputType, data: e.data }), true);
        sink.addEventListener('input', e => console.log("[ExprShape] SINK input", { inputType: e.inputType, data: e.data }), true);
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
        inlineShortcutMap["#"] = "\\sqrt{#0}";
        inlineShortcutMap["%"] = "\\Delta";
        inlineShortcutMap["|"] = "\\left|#0\\right|";
        inlineShortcutMap["~"] = "\\neg";
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
            inlineShortcutMap[functionShortcut.shortcutText] = functionShortcut.functionLatex;
        }
        this.mathfield.inlineShortcuts = inlineShortcutMap;
        this.mathfield.inlineShortcutTimeout = 0;
    }

    getTemplateShortcuts() {
        const independentTermName = this.board.calculator.properties?.independent?.name ?? "t";
        const previewTermName = independentTermName === "x" ? "y" : "x";
        return [
            { name: "Differential", text: `\\frac{\\mathrm{d}${previewTermName}}{\\mathrm{d}${independentTermName}}`, insertText: `\\frac{\\mathrm{d}\\placeholder{}}{\\mathrm{d}${independentTermName}}`, shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
            { name: "Power", text: `${previewTermName}^2`, insertText: "\\placeholder{}^2", shortcut: "^" },
            { name: "Squareroot", text: `\\sqrt{${previewTermName}}`, insertText: "\\sqrt{\\placeholder{}}", shortcut: "#" },
            { name: "Index", text: `${previewTermName}_{${independentTermName}-1}`, insertText: `\\placeholder{}_{${independentTermName}-1}`, shortcut: "_" },
            { name: "Condition", text: `\\begin{cases} 2 & ${independentTermName}=0 \\\\ 4 & ${independentTermName}\\ge2\\end{cases}`, insertText: `\\begin{cases}\\placeholder{} & ${independentTermName}=0 \\\\ \\placeholder{} & ${independentTermName}\\ge2\\end{cases}`, shortcut: "\\" },
            { name: "Not", text: `\\neg ${previewTermName}`, insertText: "\\neg", shortcut: "~" },
            { name: "Or", text: `${previewTermName}>0 \\lor ${previewTermName}<5`, insertText: "\\lor", shortcutMac: "⌥v", shortcutWindows: "Alt+v" },
            { name: "And", text: `${previewTermName}>0 \\land ${previewTermName}<5`, insertText: "\\land", shortcutMac: "⌥^", shortcutWindows: "Alt+^" },
            { name: "Floor", text: `\\lfloor ${previewTermName}\\rfloor`, insertText: "\\lfloor\\placeholder{}\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" },
            { name: "Ceil", text: `\\lceil ${previewTermName}\\rceil`, insertText: "\\lceil\\placeholder{}\\rceil", shortcutMac: "⌘_", shortcutWindows: "" }
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

    isSlashShortcutKey(keydownEvent) {
        return keydownEvent.key === '/' || (keydownEvent.code === 'Slash' && !keydownEvent.shiftKey) || (keydownEvent.code === 'Digit7' && keydownEvent.shiftKey);
    }

    isUnderscoreShortcutKey(keydownEvent) {
        const key = keydownEvent.key;
        return key === '_' || key === '-' || key === '–' || key === '—' || key === '−' || (keydownEvent.code === 'Minus' && keydownEvent.shiftKey);
    }

    onKeyDown(keydownEvent) {
        console.log("[ExprShape] onKeyDown", { key: keydownEvent.key, code: keydownEvent.code, altKey: keydownEvent.altKey, shiftKey: keydownEvent.shiftKey, target: keydownEvent.target.tagName, composed: keydownEvent.composedPath().map(el => el.tagName || el.constructor.name).slice(0, 4) });
        if (keydownEvent.key === "Dead") {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            const action = this.getDeadKeyAction(keydownEvent);
            console.log("[ExprShape] Dead key action:", action);
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
            if (this.isUnderscoreShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Floor").insertText);
                return;
            }
            if (this.isSlashShortcutKey(keydownEvent)) {
                keydownEvent.preventDefault();
                keydownEvent.stopImmediatePropagation();
                this.insert(this.getTemplateShortcut("Differential").insertText);
                return;
            }
        }
        if (keydownEvent.metaKey && !keydownEvent.ctrlKey && !keydownEvent.altKey && this.isUnderscoreShortcutKey(keydownEvent)) {
            keydownEvent.preventDefault();
            keydownEvent.stopImmediatePropagation();
            this.insert(this.getTemplateShortcut("Ceil").insertText);
            return;
        }
        if (this.handleSpaceKeydown(keydownEvent))
            return;
        if (this.mathliveController?.handleBackspaceKeydown(keydownEvent))
            return;
        this.mathliveController?.handleDeleteKeydown(keydownEvent);
    }

    onInput(inputEvent) {
        try {
            this.mathliveController?.handleInput(inputEvent);
        } catch (_) {
        }
        this.deferFixContentOutsideDisplaylines();
        const shortcutApplied = this.applyExpressionFunctionShortcuts();
        if (!shortcutApplied && this.shouldDeferRelationalShortcut(inputEvent))
            this.deferRelationalShortcutHandling();
        this.syncExpressionFromMathfield();
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
        this.syncExpressionFromMathfield();
    }

    applyExpressionFunctionShortcuts() {
        if (this.mathliveController.hasSelection())
            return false;
        const caretPosition = this.mathliveController.getCaretPosition();
        const groupStart = this.mathliveController.getCurrentGroupStartPosition();
        const typedLength = caretPosition - groupStart;
        if (typedLength < 2)
            return false;
        if (this.applyRelationalShortcuts(caretPosition, groupStart))
            return true;
        const functionShortcuts = this.getExpressionFunctionShortcuts();
        for (let functionShortcutIndex = 0; functionShortcutIndex < functionShortcuts.length; functionShortcutIndex++) {
            const functionShortcut = functionShortcuts[functionShortcutIndex];
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

    applyFunctionShortcut(shortcutText, functionLatex, caretPosition, groupStart) {
        const shortcutStart = caretPosition - shortcutText.length;
        if (shortcutStart < groupStart)
            return false;
        const typedShortcut = this.mathliveController.getTextRange(shortcutStart, caretPosition);
        if (typedShortcut !== shortcutText)
            return false;
        const previousCharacter = shortcutStart > groupStart ? this.mathliveController.getTextRange(shortcutStart - 1, shortcutStart) : "";
        if (previousCharacter === "\\" || this.isAsciiLetter(previousCharacter))
            return false;
        this.mathfield.selection = { ranges: [[shortcutStart, caretPosition]], direction: "forward" };
        this.mathfield.executeCommand("insert", functionLatex);
        return true;
    }

    getExpressionFunctionShortcuts() {
        return [
            { shortcutText: "cosec", functionLatex: "\\cosec" },
            { shortcutText: "arccos", functionLatex: "\\arccos" },
            { shortcutText: "arctan", functionLatex: "\\arctan" },
            { shortcutText: "arcsin", functionLatex: "\\arcsin" },
            { shortcutText: "cosh", functionLatex: "\\cosh" },
            { shortcutText: "tanh", functionLatex: "\\tanh" },
            { shortcutText: "sinh", functionLatex: "\\sinh" },
            { shortcutText: "sqrt", functionLatex: "\\sqrt" },
            { shortcutText: "frac", functionLatex: "\\frac" },
            { shortcutText: "cdot", functionLatex: "\\cdot" },
            { shortcutText: "sign", functionLatex: "sign" },
            { shortcutText: "round", functionLatex: "round" },
            { shortcutText: "irnd", functionLatex: "irnd" },
            { shortcutText: "rnd", functionLatex: "rnd" },
            { shortcutText: "sin", functionLatex: "\\sin" },
            { shortcutText: "cos", functionLatex: "\\cos" },
            { shortcutText: "tan", functionLatex: "\\tan" },
            { shortcutText: "sec", functionLatex: "\\sec" },
            { shortcutText: "cot", functionLatex: "\\cot" },
            { shortcutText: "log", functionLatex: "\\log" },
            { shortcutText: "ln", functionLatex: "\\ln" },
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

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined) {
            const flattened = this.flattenNestedDisplaylines(properties.expression);
            const ensured = flattened?.startsWith("\\displaylines{") ? flattened : `\\displaylines{${flattened ?? ""}}`;
            this.mathfield.value = ensured;
            this.properties.expression = ensured;
            this._committedExpression = ensured;
        }
        this.onChange();
    }

    syncExpression() {
        cancelAnimationFrame(this._syncFrame);
        this._syncFrame = requestAnimationFrame(() => this.syncExpressionFromMathfield());
    }

    syncExpressionFromMathfield() {
        const rawExpression = this.mathfield.getValue();
        const expression = rawExpression.startsWith("\\displaylines{") ? rawExpression : `\\displaylines{${rawExpression}}`;
        if (expression === this.properties.expression)
            return;
        if (this._committedExpression === undefined)
            this._committedExpression = this.properties.expression;
        this.properties.expression = expression;
        this.dispatchEvent("changed", { expression: this.properties.expression });
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
        }, 300);
    }

    onChange() {
        this.syncExpressionFromMathfield();
    }

    onFocus() {
        if (this.focusDispatchFrame != null)
            cancelAnimationFrame(this.focusDispatchFrame);
        this.focusDispatchFrame = requestAnimationFrame(() => {
            this.focusDispatchFrame = null;
            this.dispatchEvent("focused", {});
        });
    }

    onBlur() {
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
        if (document.activeElement !== this.mathfield)
            this.mathfield.focus();
        this.mathfield.executeCommand("insert", text);
        const placeholderMatches = text.match(/\\placeholder\{\}/g);
        const placeholdersCount = placeholderMatches ? placeholderMatches.length : 0;
        for (let placeholderIndex = 0; placeholderIndex < placeholdersCount; placeholderIndex++)
            this.mathfield.executeCommand("moveToPreviousPlaceholder");
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ExpressionShape;
