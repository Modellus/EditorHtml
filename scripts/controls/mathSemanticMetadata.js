class MathSemanticMetadata {
    constructor(options = {}) {
        this.termNames = options.termNames ?? [];
        this.definedTermNames = options.definedTermNames ?? [];
        this.functionNames = options.functionNames ?? [];
        this.iterationTermName = options.iterationTermName ?? "n";
        this.independentTermName = options.independentTermName ?? "t";
        this.failingRowIndexes = options.failingRowIndexes ?? [];
        this.signature = `${this.termNames.join(",")}::${this.definedTermNames.join(",")}::${this.iterationTermName}::${this.independentTermName}::${this.failingRowIndexes.join(",")}`;
    }

    static fromCalculator(calculator, canonicalLatex, functionNames, failingRowIndexes = []) {
        return new MathSemanticMetadata({
            termNames: calculator.getTermsNames(),
            definedTermNames: MathSemanticMetadata.readDefinedTermNames(canonicalLatex),
            functionNames,
            iterationTermName: calculator.properties?.iterationTerm ?? "n",
            independentTermName: calculator.properties?.independent?.name ?? "t",
            failingRowIndexes
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

    isFailingRow(rowIndex) {
        return this.failingRowIndexes.includes(rowIndex);
    }

    // `a_n` and `a_{n+1}` are the same `a` at two steps of the same iteration, so the iteration term is read
    // as an index wherever it stands in the subscript, before the symbol is looked up as a name of its own.
    getIndexRole(baseName, indexText, symbolName) {
        if (this.isIterationIndexText(indexText))
            return MathSymbolRole.ITERATION_INDEX;
        const termName = MathSemanticMetadata.toPlainTermName(symbolName);
        if (this.termNames.includes(termName) || this.definedTermNames.includes(termName))
            return MathSymbolRole.QUALIFIER_INDEX;
        return null;
    }

    isIterationIndexText(indexText) {
        const normalizedIndexText = String(indexText ?? "").replace(/\s+/g, "");
        return [this.iterationTermName, this.independentTermName].some(termName => {
            if (normalizedIndexText === termName)
                return true;
            return new RegExp(`^${MathSemanticMetadata.escapeForPattern(termName)}[+\\-\u2212][0-9]+$`).test(normalizedIndexText);
        });
    }

    static escapeForPattern(text) {
        return String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        return null;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathSemanticMetadata;
