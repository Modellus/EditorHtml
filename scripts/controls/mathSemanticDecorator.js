class MathSemanticDecorator {
    static roleColorVariables = {
        "variable": "--math-variable",
        "number": "--math-number",
        "operator": "--math-operator",
        "function": "--math-function",
        "derivative": "--math-derivative",
        "qualifier-index": "--math-qualifier-index",
        "iteration-index": "--math-iteration-index",
        "error": "--math-error",
        "warning": "--math-warning"
    };

    static fallbackRoleColors = {
        "variable": "#183b66",
        "number": "#c65d00",
        "operator": "#626b75",
        "function": "#2e7d4f",
        "derivative": "#b0185b",
        "qualifier-index": "#347dac",
        "iteration-index": "#7047b8",
        "error": "#d32f2f",
        "warning": "#ad6800"
    };

    static roleContrastTargets = {
        "operator": 4.5,
        "error": 7,
        "warning": 6.5
    };

    static defaultContrastTarget = 6;

    static caretColorVariable = "--math-caret";

    static fallbackCaretColor = "#0f6cbd";

    static caretContrastTarget = 4.5;

    static structureContrastTarget = 4.5;

    static selectionAlpha = 0.26;

    static maximumResyncLookahead = 8;

    static adaptedColors = new Map();

    constructor(mathfield, metadataProvider = null) {
        this.mathfield = mathfield;
        this.metadataProvider = metadataProvider;
        this.decoratedLatex = null;
        this.diagnostics = [];
        this.enabled = true;
        this.backgroundColor = "#ffffff";
        this.mathfieldStyle = null;
        this.structureBaseColor = null;
        this.structureBaseInlineColor = "";
        this.appliedStructureColor = null;
    }

    setMetadataProvider(metadataProvider) {
        this.metadataProvider = metadataProvider;
        this.decoratedLatex = null;
    }

    invalidate() {
        this.decoratedLatex = null;
    }

    refresh() {
        if (!this.enabled || !this.mathfield)
            return false;
        const latex = this.mathfield.getValue("latex-unstyled");
        if (latex !== "" && this.mathfield.lastOffset === 0)
            return false;
        this.backgroundColor = this.readBackgroundColor();
        this.applyStructureColor();
        this.applyCaretColors();
        const metadata = this.metadataProvider?.() ?? null;
        const signature = `${latex}::${metadata?.signature ?? ""}::${this.readColorSignature()}`;
        if (signature === this.decoratedLatex)
            return false;
        this.decoratedLatex = signature;
        const leaves = MathSemanticDecorator.readLeaves(this.mathfield);
        const tokens = MathSemantics.classify(latex, metadata);
        const roles = MathSemanticDecorator.matchTokensToLeaves(leaves, tokens);
        this.applyRoles(leaves, roles);
        this.diagnostics = MathSemanticDecorator.collectDiagnostics(tokens, metadata);
        return true;
    }

    readColorSignature() {
        return MathSemantics.rolePriority.map(role => this.readRoleColor(role)).join(",");
    }

    readMathfieldStyle() {
        if (!this.mathfieldStyle)
            this.mathfieldStyle = getComputedStyle(this.mathfield);
        return this.mathfieldStyle;
    }

    readRoleColor(role) {
        const variableName = MathSemanticDecorator.roleColorVariables[role];
        const computedColor = this.readMathfieldStyle().getPropertyValue(variableName).trim();
        const baseColor = computedColor !== "" ? computedColor : MathSemanticDecorator.fallbackRoleColors[role];
        const contrastTarget = MathSemanticDecorator.roleContrastTargets[role] ?? MathSemanticDecorator.defaultContrastTarget;
        return MathSemanticDecorator.adaptColor(baseColor, this.backgroundColor, contrastTarget);
    }

    readBackgroundColor() {
        const layers = [];
        let element = this.mathfield;
        while (element) {
            const layerColor = MathColorScheme.parse(getComputedStyle(element).backgroundColor);
            if (layerColor?.alpha > 0) {
                layers.push(layerColor);
                if (layerColor.alpha >= 1)
                    break;
            }
            element = MathSemanticDecorator.readParentElement(element);
        }
        return MathColorScheme.format(MathColorScheme.flatten(layers));
    }

    readStructureBaseColor() {
        const inlineColor = this.mathfield.style.color;
        if (inlineColor !== this.appliedStructureColor) {
            this.structureBaseInlineColor = inlineColor;
            this.structureBaseColor = inlineColor !== "" ? inlineColor : this.readMathfieldStyle().color;
        }
        return this.structureBaseColor;
    }

    applyStructureColor() {
        const structureColor = MathSemanticDecorator.adaptColor(this.readStructureBaseColor(), this.backgroundColor, MathSemanticDecorator.structureContrastTarget);
        this.mathfield.style.color = structureColor;
        this.appliedStructureColor = this.mathfield.style.color;
    }

    applyCaretColors() {
        const computedCaretColor = this.readMathfieldStyle().getPropertyValue(MathSemanticDecorator.caretColorVariable).trim();
        const baseCaretColor = computedCaretColor !== "" ? computedCaretColor : MathSemanticDecorator.fallbackCaretColor;
        const caretColor = MathSemanticDecorator.adaptColor(baseCaretColor, this.backgroundColor, MathSemanticDecorator.caretContrastTarget);
        this.mathfield.style.setProperty("--caret-color", caretColor);
        this.mathfield.style.setProperty("--selection-background-color", MathColorScheme.toRgba(MathColorScheme.parse(caretColor), MathSemanticDecorator.selectionAlpha));
    }

    static readParentElement(element) {
        if (element.parentElement)
            return element.parentElement;
        return element.getRootNode?.()?.host ?? null;
    }

    static adaptColor(baseColor, backgroundColor, contrastTarget) {
        const cacheKey = `${baseColor}|${backgroundColor}|${contrastTarget}`;
        const cachedColor = MathSemanticDecorator.adaptedColors.get(cacheKey);
        if (cachedColor)
            return cachedColor;
        const adaptedColor = MathColorScheme.adapt(baseColor, backgroundColor, contrastTarget);
        if (MathSemanticDecorator.adaptedColors.size > 400)
            MathSemanticDecorator.adaptedColors.clear();
        MathSemanticDecorator.adaptedColors.set(cacheKey, adaptedColor);
        return adaptedColor;
    }

    applyRoles(leaves, roles) {
        const savedSelection = this.mathfield.selection;
        if (this.mathfield.lastOffset > 0)
            this.mathfield.applyStyle({ color: "none" }, { range: [0, this.mathfield.lastOffset], silenceNotifications: true });
        let runStart = -1;
        let runRole = null;
        for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
            const role = roles[leafIndex];
            const offset = leaves[leafIndex].offset;
            if (role === runRole && runStart >= 0 && offset === leaves[leafIndex - 1].offset + 1)
                continue;
            if (runStart >= 0)
                this.applyRoleRange(runRole, runStart, leaves[leafIndex - 1].offset);
            runStart = offset - 1;
            runRole = role;
        }
        if (runStart >= 0)
            this.applyRoleRange(runRole, runStart, leaves[leaves.length - 1].offset);
        if (savedSelection)
            this.mathfield.selection = savedSelection;
    }

    applyRoleRange(role, startOffset, endOffset) {
        if (!role || endOffset <= startOffset)
            return;
        this.mathfield.applyStyle({ color: this.readRoleColor(role) }, { range: [startOffset, endOffset], silenceNotifications: true });
    }

    getDiagnostics() {
        return this.diagnostics;
    }

    clear() {
        if (!this.mathfield)
            return;
        const savedSelection = this.mathfield.selection;
        if (this.mathfield.lastOffset > 0)
            this.mathfield.applyStyle({ color: "none" }, { range: [0, this.mathfield.lastOffset], silenceNotifications: true });
        if (savedSelection)
            this.mathfield.selection = savedSelection;
        if (this.appliedStructureColor !== null)
            this.mathfield.style.color = this.structureBaseInlineColor;
        this.appliedStructureColor = null;
        this.decoratedLatex = null;
        this.diagnostics = [];
    }

    static readLeaves(mathfield) {
        const leaves = [];
        const lastOffset = mathfield.lastOffset;
        for (let offset = 1; offset <= lastOffset; offset++) {
            const text = mathfield.getValue([offset - 1, offset], "latex-unstyled");
            if (text !== "")
                leaves.push({ offset, text });
        }
        return leaves;
    }

    static matchTokensToLeaves(leaves, tokens) {
        const roles = new Array(leaves.length).fill(null);
        let leafIndex = 0;
        for (let tokenIndex = 0; tokenIndex < tokens.length && leafIndex < leaves.length; tokenIndex++) {
            const token = tokens[tokenIndex];
            const matchedLeafIndex = MathSemanticDecorator.findMatchingLeafIndex(leaves, leafIndex, token);
            if (matchedLeafIndex < 0)
                continue;
            for (let assignIndex = leafIndex; assignIndex <= matchedLeafIndex; assignIndex++)
                roles[assignIndex] = token.role;
            leafIndex = matchedLeafIndex + 1;
        }
        return roles;
    }

    static findMatchingLeafIndex(leaves, startIndex, token) {
        const normalizedTokenText = MathSemanticDecorator.normalizeText(token.text);
        const lastIndex = Math.min(leaves.length - 1, startIndex + MathSemanticDecorator.maximumResyncLookahead);
        for (let leafIndex = startIndex; leafIndex <= lastIndex; leafIndex++) {
            if (MathSemanticDecorator.normalizeText(leaves[leafIndex].text) === normalizedTokenText)
                return leafIndex;
        }
        return -1;
    }

    static normalizeText(text) {
        const normalizedText = String(text ?? "").trim();
        if (normalizedText === "\\differentialD")
            return "\\mathrm{d}";
        return normalizedText.replace(/\{\s*\}/g, "{}");
    }

    static collectDiagnostics(tokens, metadata) {
        const diagnostics = [];
        const reportedSymbols = new Set();
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            const token = tokens[tokenIndex];
            if (token.role !== MathSymbolRole.ERROR && token.role !== MathSymbolRole.WARNING)
                continue;
            const symbolName = token.symbolName ?? token.text;
            if (reportedSymbols.has(symbolName))
                continue;
            reportedSymbols.add(symbolName);
            diagnostics.push({ role: token.role, symbolName, message: metadata?.getDiagnosticMessage?.(symbolName, token.role) ?? symbolName });
        }
        return diagnostics;
    }

    static countLeavesBeforeOffset(mathfield, caretOffset) {
        let leafCount = 0;
        for (let offset = 1; offset <= caretOffset; offset++) {
            if (mathfield.getValue([offset - 1, offset], "latex-unstyled") !== "")
                leafCount++;
        }
        return leafCount;
    }

    static findOffsetForLeafCount(mathfield, leafCount) {
        if (leafCount <= 0)
            return 0;
        let currentCount = 0;
        const lastOffset = mathfield.lastOffset;
        for (let offset = 1; offset <= lastOffset; offset++) {
            if (mathfield.getValue([offset - 1, offset], "latex-unstyled") !== "")
                currentCount++;
            if (currentCount === leafCount)
                return offset;
        }
        return lastOffset;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathSemanticDecorator;
