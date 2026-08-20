class MathSemanticMetadata {
    constructor(options = {}) {
        this.termNames = options.termNames ?? [];
        this.definedTermNames = options.definedTermNames ?? [];
        this.functionNames = options.functionNames ?? [];
        this.iterationTermName = options.iterationTermName ?? "n";
        this.independentTermName = options.independentTermName ?? "t";
        this.unknownTermLabel = options.unknownTermLabel ?? "Unknown term";
        this.signature = `${this.termNames.join(",")}::${this.definedTermNames.join(",")}::${this.iterationTermName}::${this.independentTermName}`;
    }

    static fromCalculator(calculator, canonicalLatex, functionNames, unknownTermLabel) {
        return new MathSemanticMetadata({
            termNames: calculator.getTermsNames(),
            definedTermNames: MathSemanticMetadata.readDefinedTermNames(canonicalLatex),
            functionNames,
            iterationTermName: calculator.properties?.iterationTerm ?? "n",
            independentTermName: calculator.properties?.independent?.name ?? "t",
            unknownTermLabel
        });
    }

    static readDefinedTermNames(canonicalLatex) {
        const rows = ExpressionAlignment.readRows(canonicalLatex ?? "");
        const definedTermNames = [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const rowLatex = rows[rowIndex].cells.join("");
            const relationIndex = ExpressionAlignment.findPrimaryRelationIndex(rowLatex);
            if (relationIndex < 0)
                continue;
            const definedTermName = MathSemanticMetadata.readLeftHandSideTermName(rowLatex.substring(0, relationIndex));
            if (definedTermName !== "")
                definedTermNames.push(definedTermName);
        }
        return definedTermNames;
    }

    static readLeftHandSideTermName(leftHandSideLatex) {
        const tokens = MathSemantics.classify(leftHandSideLatex, null);
        for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
            const token = tokens[tokenIndex];
            if (token.role === MathSymbolRole.VARIABLE || token.role === MathSymbolRole.FUNCTION)
                return MathSemanticMetadata.toPlainTermName(token.symbolName);
        }
        return "";
    }

    static toPlainTermName(symbolName) {
        if (typeof Utils !== "undefined")
            return Utils.convertTermNamedIndexesToPlainText(symbolName);
        return String(symbolName ?? "").replace(/_\{\\!([A-Za-z0-9]+)\}/g, "_$1");
    }

    isFunction(name) {
        return this.functionNames.includes(name);
    }

    getIndexRole(baseName, indexText, symbolName) {
        const termName = MathSemanticMetadata.toPlainTermName(symbolName);
        if (this.termNames.includes(termName) || this.definedTermNames.includes(termName))
            return MathSymbolRole.QUALIFIER_INDEX;
        if (indexText === this.iterationTermName || indexText === this.independentTermName)
            return MathSymbolRole.ITERATION_INDEX;
        return null;
    }

    getSymbolRole(symbolName) {
        const termName = MathSemanticMetadata.toPlainTermName(symbolName);
        if (!/^[A-Za-z][A-Za-z0-9_.]*$/.test(termName))
            return null;
        if (this.isFunction(termName))
            return null;
        if (this.definedTermNames.includes(termName) || this.termNames.includes(termName))
            return MathSymbolRole.VARIABLE;
        if (termName === this.independentTermName || termName === this.iterationTermName)
            return MathSymbolRole.VARIABLE;
        if (this.termNames.length === 0 && this.definedTermNames.length === 0)
            return null;
        return MathSymbolRole.WARNING;
    }

    getDiagnosticMessage(symbolName) {
        return `${this.unknownTermLabel}: ${MathSemanticMetadata.toPlainTermName(symbolName)}`;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathSemanticMetadata;
