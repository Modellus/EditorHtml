var ExpressionShape;
if (typeof BaseShape !== "undefined") ExpressionShape = class ExpressionShape extends BaseShape {
    static failingBorderColor = "#d32f2f";

    static errorTooltipDelay = 400;

    constructor(board, parent, id) {
        super(board, null, id);
        this.focusDispatchFrame = null;
        this.shortcutsHintShown = false;
        this.failingRowIndexes = [];
        this.failingRows = [];
        this.toolbarAdapter = {
            pasteFromClipboard: shape => shape.pasteTextFromClipboard()
        };
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
        const mathmlDocument = ClipboardService.buildMathmlDocument(this.toMathml());
        await ClipboardService.write([ClipboardService.mathmlRepresentation(mathmlDocument), ClipboardService.textRepresentation(mathmlDocument)]);
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
        const { group, foreignObject } = this.createForeignObjectGroup();
        const containerElement = this.board.createElement("div");
        foreignObject.appendChild(containerElement);
        this.expressionControl = new ExpressionControl({
            multiline: true,
            useScrollView: true,
            value: this.flattenNestedDisplaylines(this.properties.expression ?? "\\displaylines{}"),
            getTemplateShortcuts: () => this.getTemplateShortcuts(),
            getSemanticMetadata: () => this.getSemanticMetadata(),
            onOpenShortcuts: () => this.openShortcutsPalette(),
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
        this.createErrorTooltip();
        return group;
    }

    // The card carries the reason as well as the mark: the colour says which row the engine refused,
    // and hovering the card says why, written in the language the rest of the editor is written in.
    // The card is hovered through the handles the board lays over it, so the hover comes from the
    // board rather than from the card's own pointer events.
    createErrorTooltip() {
        this.errorTooltipHost = $("<div>").appendTo("body");
        this.errorTooltip = this.errorTooltipHost.dxTooltip({
            target: this.container,
            wrapperAttr: { class: "mdl-shape-overlay-popup mdl-expression-error-tooltip" },
            contentTemplate: contentElement => contentElement.append($('<div class="tooltip mdl-expression-error"/>')),
            onShowing: tooltipEvent => this.writeErrorTooltipContent(tooltipEvent.component.$content()[0]),
            onShown: tooltipEvent => this.writeErrorTooltipContent(tooltipEvent.component.$content()[0]),
            position: "top",
            width: 340
        }).dxTooltip("instance");
    }

    onHovered() {
        this.showErrorTooltip();
    }

    onUnhovered() {
        this.hideErrorTooltip();
    }

    showErrorTooltip() {
        clearTimeout(this.errorTooltipTimer);
        if (!this.hasFailingRows())
            return;
        this.errorTooltipTimer = setTimeout(() => this.errorTooltip.show(), ExpressionShape.errorTooltipDelay);
    }

    hideErrorTooltip() {
        clearTimeout(this.errorTooltipTimer);
        this.errorTooltip?.hide();
    }

    writeErrorTooltipContent(contentElement) {
        const errorElement = contentElement.querySelector(".mdl-expression-error");
        if (!errorElement)
            return;
        errorElement.innerHTML = this.buildErrorTooltipHtml();
    }

    buildErrorTooltipHtml() {
        const translations = this.board.translations;
        const rowsHtml = this.failingRows.map(failingRow => {
            const label = translations.get("Expression Error Row").replace("{number}", failingRow.rowIndex + 1);
            const message = MathErrorMessage.translate(failingRow.error, translations);
            return `<div class="mdl-expression-error-row"><span class="mdl-expression-error-row-label">${Utils.escapeXmlText(label)}</span><span class="mdl-expression-error-row-message">${Utils.escapeXmlText(message)}</span></div>`;
        }).join("");
        return `<div class="mdl-expression-error-title">${Utils.escapeXmlText(translations.get("Expression Error Title"))}</div>${rowsHtml}`;
    }

    syncHandwrittenStyle() {
        this.expressionControl?.syncHandwrittenStyle();
    }

    getSemanticMetadata() {
        const functionNames = this.expressionControl.getExpressionFunctionShortcuts().map(shortcut => shortcut.shortcutText);
        return MathSemanticMetadata.fromCalculator(this.board.calculator, this.expressionControl.getCanonicalValue(), functionNames, this.failingRowIndexes);
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
        const value = this.mathfield.getValue("latex-unstyled");
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
        this.expressionControl.scheduleSemanticColoring();
        this.syncExpressionFromMathfield();
    }

    setProperties(properties) {
        const carriesExpression = properties.expression != undefined;
        super.setProperties(properties);
        if (carriesExpression) {
            const flattened = this.flattenNestedDisplaylines(properties.expression);
            const wrapped = flattened?.startsWith("\\displaylines{") ? flattened : `\\displaylines{${flattened ?? ""}}`;
            const ensured = Utils.writeFunctionNames(Utils.writeTermNames(wrapped));
            this.expressionControl.setValue(ensured);
            this.properties.expression = ensured;
            this._committedExpression = ensured;
        }
        this.onChange();
        // An expression that arrives written - a model being opened, an undo, a paste - has never been
        // through a blur, so this is where a row the engine cannot read gets marked.
        if (carriesExpression)
            this.refreshFailingRows();
    }

    syncExpression() {
        cancelAnimationFrame(this._syncFrame);
        this._syncFrame = requestAnimationFrame(() => this.syncExpressionFromMathfield());
    }

    syncExpressionFromMathfield() {
        const rawExpression = this.expressionControl.getCanonicalValue();
        const expression = rawExpression.startsWith("\\displaylines{") ? rawExpression : `\\displaylines{${rawExpression}}`;
        if (expression === this.properties.expression)
            return;
        if (this.isClearedByAnUnfocusedMathfield(expression))
            return;
        this.setFailingRows([]);
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

    isClearedByAnUnfocusedMathfield(expression) {
        if (!ExpressionShape.isEmptyExpression(expression))
            return false;
        if (ExpressionShape.isEmptyExpression(this.properties.expression))
            return false;
        return !this.mathfield.hasFocus();
    }

    static isEmptyExpression(expression) {
        return String(expression ?? "").replace(/\\displaylines\{|\}|\s/g, "") === "";
    }

    onChange() {
        this.syncExpressionFromMathfield();
    }

    onFocus() {
        this.showShortcutsHint();
        if (this.focusDispatchFrame != null)
            cancelAnimationFrame(this.focusDispatchFrame);
        this.focusDispatchFrame = requestAnimationFrame(() => {
            this.focusDispatchFrame = null;
            this.dispatchEvent("focused", {});
        });
    }

    onBlur() {
        this.hideShortcutsHint();
        this.refreshFailingRows();
    }

    // The engine reports a parse failure while the whole model is being rebuilt, with nothing left to say
    // which row broke. Checking the rows once the user steps out marks the offending one where they wrote it.
    refreshFailingRows() {
        // Read from the stored expression rather than the field: a shape restored with the model is
        // checked before its mathfield has mounted, and an unmounted field reads back empty.
        const rows = ExpressionAlignment.readRows(this.properties.expression ?? "");
        const rowsLatex = rows.map(row => row.cells.join(""));
        const rowErrors = this.board.calculator.findRowParseErrors(rowsLatex);
        const cyclicTermNames = this.board.calculator.getCyclicTermNames();
        const failingRows = [];
        for (let rowIndex = 0; rowIndex < rowErrors.length; rowIndex++) {
            if (rowErrors[rowIndex] !== null)
                failingRows.push({ rowIndex, error: rowErrors[rowIndex] });
            else if (this.isCyclicRow(rowsLatex[rowIndex], cyclicTermNames))
                failingRows.push({ rowIndex, error: MathErrorMessage.cycleError(cyclicTermNames) });
        }
        this.setFailingRows(failingRows);
    }

    isCyclicRow(rowLatex, cyclicTermNames) {
        if (cyclicTermNames.length === 0)
            return false;
        const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
        if (relationIndex < 0)
            return false;
        const definedName = MathSemanticMetadata.readLeftHandSideTermName(rowLatex.substring(0, relationIndex));
        const indexSuffix = `_${this.board.calculator.properties.iterationTerm}`;
        if (!definedName.endsWith(indexSuffix))
            return false;
        return cyclicTermNames.includes(definedName.slice(0, -indexSuffix.length));
    }

    setFailingRows(failingRows) {
        const failingRowIndexes = failingRows.map(failingRow => failingRow.rowIndex);
        const marksAreUnchanged = failingRowIndexes.join(",") === this.failingRowIndexes.join(",");
        this.failingRows = failingRows;
        this.failingRowIndexes = failingRowIndexes;
        if (!this.hasFailingRows())
            this.hideErrorTooltip();
        if (marksAreUnchanged)
            return;
        this.expressionControl.semanticDecorator?.invalidate();
        this.expressionControl.scheduleSemanticColoring();
        this.update();
        this.board.shell?.updatePlayer?.();
    }

    hasFailingRows() {
        return this.failingRowIndexes?.length > 0;
    }

    // The card is bordered in the colour its failing rows are written in: a card with a row the engine
    // rejected has to be recognisable across the board, before anyone reads the expression itself.
    getBorderColor() {
        if (!this.hasFailingRows())
            return super.getBorderColor();
        const themeColor = getComputedStyle(this.container ?? document.documentElement).getPropertyValue("--math-error").trim();
        return themeColor !== "" ? themeColor : ExpressionShape.failingBorderColor;
    }

    showShortcutsHint() {
        if (this.shortcutsHintShown)
            return;
        this.shortcutsHintShown = true;
        const launcherShortcut = /mac/i.test(navigator.platform) ? "⌘." : "Ctrl+.";
        this._shortcutsHint = $(`<div class="mdl-expression-shortcuts-hint" role="status">${launcherShortcut}</div>`).appendTo(document.body);
        const mathfieldRectangle = this.mathfield.getBoundingClientRect();
        const hintWidth = this._shortcutsHint.outerWidth();
        const hintHeight = this._shortcutsHint.outerHeight();
        const left = Math.max(8, Math.min(mathfieldRectangle.left, window.innerWidth - hintWidth - 8));
        const spaceBelow = window.innerHeight - mathfieldRectangle.bottom;
        const top = spaceBelow >= hintHeight + 16 ? mathfieldRectangle.bottom + 8 : mathfieldRectangle.top - hintHeight - 8;
        this._shortcutsHint.css({ left: `${left}px`, top: `${Math.max(8, top)}px` });
        clearTimeout(this._shortcutsHintTimer);
        this._shortcutsHintTimer = setTimeout(() => this.hideShortcutsHint(), 4500);
    }

    hideShortcutsHint() {
        clearTimeout(this._shortcutsHintTimer);
        this._shortcutsHint?.remove();
        this._shortcutsHint = null;
    }

    onRemoved() {
        super.onRemoved();
        this.hideShortcutsHint();
        clearTimeout(this.errorTooltipTimer);
        this.errorTooltip?.dispose();
        this.errorTooltip = null;
        this.errorTooltipHost?.remove();
        this.errorTooltipHost = null;
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
        this.expressionControl?.scheduleSemanticColoring();
        this.foreignObject.style.backgroundColor = this.properties.backgroundColor;
        this.applyBorderStyle(this.container, 1);
        this.mathfield.style.color = this.readReadableForegroundColor();
        this.mathfield.style.backgroundColor = this.properties.backgroundColor ?? "transparent";
        this.syncHandwrittenStyle();
    }

    readReadableForegroundColor() {
        const foregroundColor = this.properties.foregroundColor;
        const foreground = MathColorScheme.parse(foregroundColor);
        if (!foreground)
            return foregroundColor;
        const cardColor = MathColorScheme.parse(this.properties.backgroundColor);
        if (!cardColor || cardColor.alpha === 0)
            return foregroundColor;
        const background = MathColorScheme.flatten([cardColor]);
        if (MathColorScheme.contrastRatio(foreground, background) >= MathColorScheme.minimumReadableContrast)
            return foregroundColor;
        return MathColorScheme.adapt(foregroundColor, MathColorScheme.format(background), MathColorScheme.minimumReadableContrast);
    }

    draw() {
        this.applyForeignObjectLayout();
        super.draw();
    }

    toSvgString() {
        const width = this.properties.width;
        const height = this.properties.height;
        const color = this.properties.foregroundColor || "black";
        const backgroundColor = this.properties.backgroundColor || "transparent";
        const markup = MathLive.convertLatexToMarkup(Utils.writeFunctionNames(Utils.writeTermNames(this.properties.expression)));
        const mathStyles = BaseShape.embeddedMathStyles || "";
        const isMidSchool = document.body.classList.contains("mid-school");
        const handwrittenOverride = isMidSchool
            ? `@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap'); .ML__latex, .ML__text, .ML__mathit, .ML__cmr, .ML__ams { font-family: "Caveat", cursive !important; }`
            : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <defs><style>${mathStyles} ${handwrittenOverride}</style></defs>
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;width:${width}px;height:${height}px;padding:4px;box-sizing:border-box;background:${backgroundColor};color:${color};font-size:16px;overflow:hidden;">
                    ${markup}
                </div>
            </foreignObject>
        </svg>`;
    }

    toImageBlob() {
        const width = this.properties.width;
        const height = this.properties.height;
        const svgString = this.toSvgString();
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

    getCanonicalExpressionLatex() {
        return this.properties.expression ?? "";
    }

    getMathMLRepresentation() {
        return ClipboardService.mathmlRepresentation(this.toMathml());
    }

    getPlainTextRepresentation() {
        return ClipboardService.textRepresentation(Utils.convertLatexToPlainMath(this.getCanonicalExpressionLatex()));
    }

    getModellusRepresentation() {
        return ClipboardService.expressionRepresentation(this.getClipboardData());
    }

    toMathml() {
        return MathLive.convertLatexToMathMl(Utils.convertLatexToReadableMath(this.getCanonicalExpressionLatex()));
    }

    getClipboardRepresentations() {
        return [
            this.getModellusRepresentation(),
            this.getMathMLRepresentation(),
            this.getPlainTextRepresentation(),
            this.getSvgRepresentation(),
            this.getImageRepresentation()
        ];
    }

    async pasteTextFromClipboard() {
        this.expressionControl.pasteFromClipboardUsingMathlive();
    }

    insert(text) {
        this.expressionControl.insert(text);
    }
};

if (typeof module !== "undefined" && module.exports)
    module.exports = ExpressionShape;
