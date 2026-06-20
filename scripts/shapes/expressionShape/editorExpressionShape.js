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
        const containerElement = this.board.createElement("div");
        foreignObject.appendChild(containerElement);
        this.expressionControl = new ExpressionControl({
            multiline: true,
            useScrollView: true,
            value: this.flattenNestedDisplaylines(this.properties.expression ?? "\\displaylines{}"),
            getTemplateShortcuts: () => this.getTemplateShortcuts(),
            onInput: _ => {
                this.mathfield = this.expressionControl.mathfield;
                this.deferFixContentOutsideDisplaylines();
                this.syncExpressionFromMathfield();
            },
            onChange: _ => {
                this.mathfield = this.expressionControl.mathfield;
                this.onChange();
            },
            onFocus: _ => {
                this.mathfield = this.expressionControl.mathfield;
                this.onFocus();
            },
            onBlur: _ => {
                this.mathfield = this.expressionControl.mathfield;
                this.onBlur();
            },
            onMount: _ => {
                this.mathfield = this.expressionControl.mathfield;
                if (this.board.selection.selectedShape === this)
                    this.mathfield.focus();
                this.syncHandwrittenStyle();
            }
        });
        this.container = this.expressionControl.create(containerElement);
        this.mathfield = this.expressionControl.mathfield;
        return foreignObject;
    }

    syncHandwrittenStyle() {
        this.expressionControl?.syncHandwrittenStyle();
    }

    getTemplateShortcuts() {
        const independentTermName = this.board.calculator.properties?.independent?.name ?? "t";
        return resolveExpressionTemplateShortcuts(independentTermName);
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
        this.expressionControl.insert(text);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ExpressionShape;
