const MathSymbolRole = {
    VARIABLE: "variable",
    FUNCTION: "function",
    QUALIFIER_INDEX: "qualifier-index",
    ITERATION_INDEX: "iteration-index",
    DERIVATIVE: "derivative",
    NUMBER: "number",
    OPERATOR: "operator",
    ERROR: "error",
    WARNING: "warning"
};

class MathSemanticsParser {
    constructor(latex) {
        this.latex = String(latex ?? "");
        this.index = 0;
    }

    parse() {
        return this.parseSequence(null);
    }

    parseSequence(closingCommand) {
        const nodes = [];
        while (this.index < this.latex.length) {
            if (closingCommand && this.latex.startsWith(closingCommand, this.index))
                break;
            if (this.latex[this.index] === "}")
                break;
            const node = this.parseNode();
            if (node === null)
                break;
            if (node.type === "subscript" || node.type === "superscript")
                this.attachScript(nodes, node);
            else
                nodes.push(node);
        }
        return nodes;
    }

    attachScript(nodes, scriptNode) {
        const baseNode = nodes.length > 0 ? nodes[nodes.length - 1] : null;
        if (!baseNode) {
            nodes.push({ type: "group", body: scriptNode.body });
            return;
        }
        if (scriptNode.type === "subscript")
            baseNode.subscript = scriptNode;
        else
            baseNode.superscript = scriptNode;
    }

    parseNode() {
        this.skipInsignificantWhitespace();
        const character = this.latex[this.index];
        if (character === undefined)
            return null;
        if (character === "\\")
            return this.parseCommandNode();
        if (character === "{")
            return { type: "group", body: this.parseGroupBody() };
        if (character === "_" || character === "^") {
            this.index++;
            const scriptType = character === "_" ? "subscript" : "superscript";
            return { type: scriptType, body: this.parseArgument() };
        }
        if (character === "&") {
            this.index++;
            return { type: "cellSeparator" };
        }
        this.index++;
        return { type: "character", text: character };
    }

    parseCommandNode() {
        if (this.latex.startsWith("\\\\", this.index)) {
            this.index += 2;
            return { type: "rowSeparator" };
        }
        const commandMatch = /^\\([a-zA-Z]+|.)/.exec(this.latex.substring(this.index));
        if (!commandMatch) {
            this.index++;
            return { type: "character", text: "\\" };
        }
        const commandName = `\\${commandMatch[1]}`;
        this.index += commandMatch[0].length;
        if (commandName === "\\begin")
            return this.parseEnvironmentNode();
        if (commandName === "\\end") {
            this.parseArgument();
            return { type: "environmentEnd" };
        }
        if (commandName === "\\left" || commandName === "\\right")
            return this.parseDelimiterNode(commandName);
        if (commandName === "\\displaylines")
            return { type: "rows", body: this.parseArgument() };
        if (MathSemantics.fractionCommandNames.has(commandName))
            return { type: "fraction", command: commandName, numerator: this.parseArgument(), denominator: this.parseArgument() };
        if (commandName === "\\sqrt")
            return { type: "root", rootIndex: this.parseOptionalArgument(), radicand: this.parseArgument() };
        if (MathSemantics.differentialCommandNames.has(commandName))
            return { type: "differential", command: commandName, body: this.parseArgument() };
        if (MathSemantics.discardedArgumentCommandNames.has(commandName)) {
            this.parseArgument();
            return { type: "group", body: this.parseArgument() };
        }
        if (MathSemantics.uprightCommandNames.has(commandName))
            return { type: "upright", command: commandName, body: this.parseArgument() };
        if (MathSemantics.accentCommandNames.has(commandName))
            return { type: "accent", command: commandName, body: this.parseArgument() };
        if (MathSemantics.wrapperCommandNames.has(commandName))
            return { type: "group", body: this.parseArgument() };
        if (commandName === "\\placeholder") {
            this.parseArgument();
            return { type: "placeholder" };
        }
        return { type: "command", text: commandName };
    }

    parseEnvironmentNode() {
        const environmentName = this.readGroupText();
        const rows = [];
        let cells = [];
        let currentCell = [];
        const closingCommand = "\\end";
        while (this.index < this.latex.length) {
            if (this.latex.startsWith(closingCommand, this.index))
                break;
            const nodes = this.parseSequence(closingCommand);
            for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
                const node = nodes[nodeIndex];
                if (node.type === "cellSeparator") {
                    cells.push(currentCell);
                    currentCell = [];
                    continue;
                }
                if (node.type === "rowSeparator") {
                    cells.push(currentCell);
                    rows.push(cells);
                    cells = [];
                    currentCell = [];
                    continue;
                }
                currentCell.push(node);
            }
            if (nodes.length === 0)
                break;
        }
        if (this.latex.startsWith(closingCommand, this.index)) {
            this.index += closingCommand.length;
            this.readGroupText();
        }
        cells.push(currentCell);
        rows.push(cells);
        return { type: "environment", name: environmentName, rows };
    }

    parseDelimiterNode(commandName) {
        const delimiterMatch = /^(\\[a-zA-Z]+|.)/.exec(this.latex.substring(this.index));
        if (delimiterMatch)
            this.index += delimiterMatch[0].length;
        if (commandName === "\\right")
            return { type: "delimiterEnd" };
        const body = [];
        while (this.index < this.latex.length) {
            if (this.latex[this.index] === "}")
                break;
            const node = this.parseNode();
            if (node === null)
                break;
            if (node.type === "delimiterEnd")
                break;
            if (node.type === "subscript" || node.type === "superscript")
                this.attachScript(body, node);
            else
                body.push(node);
        }
        return { type: "delimited", body };
    }

    parseOptionalArgument() {
        if (this.latex[this.index] !== "[")
            return null;
        const closingIndex = this.latex.indexOf("]", this.index);
        if (closingIndex < 0)
            return null;
        const optionalLatex = this.latex.substring(this.index + 1, closingIndex);
        this.index = closingIndex + 1;
        return new MathSemanticsParser(optionalLatex).parse();
    }

    parseArgument() {
        this.skipWhitespace();
        if (this.latex[this.index] === "{")
            return this.parseGroupBody();
        const node = this.parseNode();
        return node === null ? [] : [node];
    }

    parseGroupBody() {
        this.index++;
        const nodes = this.parseSequence(null);
        if (this.latex[this.index] === "}")
            this.index++;
        return nodes;
    }

    readGroupText() {
        this.skipWhitespace();
        if (this.latex[this.index] !== "{")
            return "";
        const closingIndex = this.latex.indexOf("}", this.index);
        if (closingIndex < 0)
            return "";
        const groupText = this.latex.substring(this.index + 1, closingIndex);
        this.index = closingIndex + 1;
        return groupText;
    }

    skipInsignificantWhitespace() {
        while (this.index < this.latex.length && /[ \t\n\r]/.test(this.latex[this.index]))
            this.index++;
    }

    skipWhitespace() {
        while (this.index < this.latex.length && /\s/.test(this.latex[this.index]))
            this.index++;
    }
}

class MathSemantics {
    static rolePriority = [
        MathSymbolRole.ERROR,
        MathSymbolRole.WARNING,
        MathSymbolRole.DERIVATIVE,
        MathSymbolRole.FUNCTION,
        MathSymbolRole.QUALIFIER_INDEX,
        MathSymbolRole.ITERATION_INDEX,
        MathSymbolRole.NUMBER,
        MathSymbolRole.VARIABLE,
        MathSymbolRole.OPERATOR
    ];

    static fractionCommandNames = new Set(["\\frac", "\\dfrac", "\\tfrac", "\\cfrac"]);
    static differentialCommandNames = new Set(["\\differentialD", "\\partialD"]);
    static discardedArgumentCommandNames = new Set(["\\textcolor", "\\class", "\\htmlClass", "\\cssId", "\\htmlId", "\\htmlData", "\\style", "\\htmlStyle"]);
    static uprightCommandNames = new Set(["\\operatorname", "\\mathrm", "\\text", "\\textrm"]);
    static accentCommandNames = new Set(["\\dot", "\\ddot", "\\dddot", "\\vec", "\\hat", "\\bar", "\\overline", "\\widehat", "\\tilde", "\\overrightarrow"]);
    static wrapperCommandNames = new Set(["\\mathit", "\\mathbf", "\\mathsf", "\\mathtt", "\\mathbb", "\\mathcal", "\\boldsymbol", "\\underline", "\\overbrace", "\\underbrace"]);
    static derivativeAccentCommandNames = new Set(["\\dot", "\\ddot", "\\dddot"]);
    static functionCommandNames = new Set([
        "\\sin", "\\cos", "\\tan", "\\sec", "\\csc", "\\cot", "\\cosec", "\\arcsin", "\\arccos", "\\arctan",
        "\\sinh", "\\cosh", "\\tanh", "\\log", "\\ln", "\\lg", "\\exp", "\\min", "\\max", "\\gcd", "\\det",
        "\\deg", "\\dim", "\\arg", "\\lim", "\\sup", "\\inf", "\\sum", "\\prod", "\\int"
    ]);
    static textFunctionNames = new Set(["sign", "round", "irnd", "rnd", "abs", "sqrt", "exp", "ln", "log", "min", "max", "mod", "trunc", "floor", "ceil", "random"]);
    static operatorCommandNames = new Set([
        "\\cdot", "\\times", "\\div", "\\pm", "\\mp", "\\le", "\\leq", "\\ge", "\\geq", "\\ne", "\\neq",
        "\\approx", "\\equiv", "\\lor", "\\land", "\\neg", "\\to", "\\rightarrow", "\\Rightarrow", "\\mapsto",
        "\\quad", "\\qquad", "\\,", "\\;", "\\:", "\\ ", "\\!", "\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
        "\\vert", "\\Vert", "\\langle", "\\rangle", "\\cdots", "\\ldots", "\\colon"
    ]);
    static operatorCharacters = new Set(["+", "-", "=", "<", ">", "/", "*", ",", ";", ":", "|", "(", ")", "[", "]", "!", "−", "·"]);

    static classify(latex, metadata = null) {
        const nodes = new MathSemanticsParser(latex).parse();
        const tokens = [];
        MathSemantics.emitNodes(nodes, MathSemantics.createContext(), tokens, metadata);
        return tokens;
    }

    static createContext(overrides = {}) {
        return { forcedRole: null, inDerivative: false, isIndexContent: false, ...overrides };
    }

    static emitNodes(nodes, context, tokens, metadata) {
        let nodeIndex = 0;
        while (nodeIndex < nodes.length) {
            const node = nodes[nodeIndex];
            if (node.type === "character" && MathSemantics.isLetter(node.text)) {
                nodeIndex = MathSemantics.emitNameRun(nodes, nodeIndex, context, tokens, metadata);
                continue;
            }
            if (node.type === "character" && MathSemantics.isDigitOrDecimalSeparator(node.text)) {
                nodeIndex = MathSemantics.emitNumberRun(nodes, nodeIndex, context, tokens, metadata);
                continue;
            }
            MathSemantics.emitNode(node, context, tokens, metadata);
            nodeIndex++;
        }
    }

    static emitNameRun(nodes, startIndex, context, tokens, metadata) {
        let endIndex = startIndex;
        while (endIndex < nodes.length && nodes[endIndex].type === "character" && MathSemantics.isLetter(nodes[endIndex].text))
            endIndex++;
        const runNodes = nodes.slice(startIndex, endIndex);
        const name = runNodes.map(node => node.text).join("");
        const lastNode = runNodes[runNodes.length - 1];
        const symbolName = MathSemantics.buildSymbolName(name, lastNode);
        const role = MathSemantics.resolveNameRole(name, symbolName, context, metadata);
        for (let runIndex = 0; runIndex < runNodes.length; runIndex++) {
            const runNode = runNodes[runIndex];
            tokens.push(MathSemantics.createToken(runNode.text, role, symbolName));
            MathSemantics.emitScripts(runNode, name, MathSemantics.buildSymbolName(name, runNode), context, tokens, metadata);
        }
        return endIndex;
    }

    static emitNumberRun(nodes, startIndex, context, tokens, metadata) {
        let endIndex = startIndex;
        while (endIndex < nodes.length && nodes[endIndex].type === "character" && MathSemantics.isDigitOrDecimalSeparator(nodes[endIndex].text))
            endIndex++;
        const runNodes = nodes.slice(startIndex, endIndex);
        const numberText = runNodes.map(node => node.text).join("");
        const role = MathSemantics.resolveRole([context.forcedRole, MathSymbolRole.NUMBER]);
        for (let runIndex = 0; runIndex < runNodes.length; runIndex++) {
            const runNode = runNodes[runIndex];
            tokens.push(MathSemantics.createToken(runNode.text, role, numberText));
            MathSemantics.emitScripts(runNode, numberText, numberText, context, tokens, metadata);
        }
        return endIndex;
    }

    static emitScripts(node, name, symbolName, context, tokens, metadata) {
        if (node.subscript)
            MathSemantics.emitIndex(node.subscript, name, symbolName, context, tokens, metadata);
        if (node.superscript)
            MathSemantics.emitSuperscript(node.superscript, context, tokens, metadata);
    }

    static emitIndex(subscriptNode, name, symbolName, context, tokens, metadata) {
        const indexText = MathSemantics.getPlainText(subscriptNode.body);
        const isNamedIndex = MathSemantics.isNamedIndex(subscriptNode.body);
        const indexRole = MathSemantics.resolveIndexRole(name, symbolName, indexText, isNamedIndex, metadata);
        const indexContext = MathSemantics.createContext({ forcedRole: indexRole, inDerivative: context.inDerivative, isIndexContent: true });
        MathSemantics.emitNodes(subscriptNode.body, indexContext, tokens, metadata);
    }

    static emitSuperscript(superscriptNode, context, tokens, metadata) {
        const superscriptText = MathSemantics.getPlainText(superscriptNode.body);
        const isPrime = MathSemantics.primeTexts.has(superscriptText);
        const superscriptContext = MathSemantics.createContext({ forcedRole: isPrime ? MathSymbolRole.DERIVATIVE : context.forcedRole, inDerivative: context.inDerivative });
        MathSemantics.emitNodes(superscriptNode.body, superscriptContext, tokens, metadata);
    }

    static emitNode(node, context, tokens, metadata) {
        if (node.type === "character") {
            tokens.push(MathSemantics.createToken(node.text, MathSemantics.resolveRole([context.forcedRole, MathSymbolRole.OPERATOR]), node.text));
            MathSemantics.emitScripts(node, node.text, node.text, context, tokens, metadata);
            return;
        }
        if (node.type === "command") {
            MathSemantics.emitCommandNode(node, context, tokens, metadata);
            return;
        }
        if (node.type === "placeholder") {
            tokens.push(MathSemantics.createToken("\\placeholder{}", MathSemantics.resolveRole([context.forcedRole, MathSymbolRole.OPERATOR]), ""));
            return;
        }
        if (node.type === "group" || node.type === "delimited" || node.type === "rows") {
            MathSemantics.emitNodes(node.body, context, tokens, metadata);
            MathSemantics.emitScripts(node, "", "", context, tokens, metadata);
            return;
        }
        if (node.type === "fraction") {
            MathSemantics.emitFractionNode(node, context, tokens, metadata);
            return;
        }
        if (node.type === "root") {
            if (node.rootIndex)
                MathSemantics.emitNodes(node.rootIndex, context, tokens, metadata);
            MathSemantics.emitNodes(node.radicand, context, tokens, metadata);
            MathSemantics.emitScripts(node, "", "", context, tokens, metadata);
            return;
        }
        if (node.type === "differential") {
            tokens.push(MathSemantics.createToken(MathSemantics.differentialLeafText, MathSymbolRole.DERIVATIVE, node.command));
            MathSemantics.emitNodes(node.body, MathSemantics.createContext({ inDerivative: true }), tokens, metadata);
            MathSemantics.emitScripts(node, "", "", context, tokens, metadata);
            return;
        }
        if (node.type === "accent") {
            const accentRole = MathSemantics.derivativeAccentCommandNames.has(node.command) ? MathSymbolRole.DERIVATIVE : context.forcedRole;
            MathSemantics.emitNodes(node.body, MathSemantics.createContext({ forcedRole: accentRole, inDerivative: context.inDerivative }), tokens, metadata);
            MathSemantics.emitScripts(node, "", "", context, tokens, metadata);
            return;
        }
        if (node.type === "upright") {
            MathSemantics.emitUprightNode(node, context, tokens, metadata);
            return;
        }
        if (node.type === "environment") {
            MathSemantics.emitEnvironmentNode(node, context, tokens, metadata);
            return;
        }
    }

    static emitCommandNode(node, context, tokens, metadata) {
        const role = MathSemantics.resolveCommandRole(node.text, context, metadata);
        tokens.push(MathSemantics.createToken(node.text, role, node.text));
        MathSemantics.emitScripts(node, node.text, node.text, context, tokens, metadata);
    }

    static emitUprightNode(node, context, tokens, metadata) {
        const uprightText = MathSemantics.getPlainText(node.body);
        const role = MathSemantics.resolveRole([context.forcedRole, MathSemantics.isFunctionName(uprightText, metadata) ? MathSymbolRole.FUNCTION : MathSymbolRole.VARIABLE]);
        for (let characterIndex = 0; characterIndex < uprightText.length; characterIndex++)
            tokens.push(MathSemantics.createToken(`\\mathrm{${uprightText[characterIndex]}}`, role, uprightText));
        MathSemantics.emitScripts(node, uprightText, uprightText, context, tokens, metadata);
    }

    static emitFractionNode(node, context, tokens, metadata) {
        const isDerivativeFraction = MathSemantics.isDifferentialSequence(node.numerator) && MathSemantics.isDifferentialSequence(node.denominator);
        const numeratorContext = MathSemantics.createContext({ inDerivative: isDerivativeFraction, forcedRole: context.forcedRole });
        MathSemantics.emitDifferentialAwareNodes(node.numerator, numeratorContext, tokens, metadata, isDerivativeFraction);
        MathSemantics.emitDifferentialAwareNodes(node.denominator, numeratorContext, tokens, metadata, isDerivativeFraction);
        MathSemantics.emitScripts(node, "", "", context, tokens, metadata);
    }

    static emitDifferentialAwareNodes(nodes, context, tokens, metadata, isDerivativeFraction) {
        if (!isDerivativeFraction || nodes.length === 0) {
            MathSemantics.emitNodes(nodes, context, tokens, metadata);
            return;
        }
        const leadingNode = nodes[0];
        if (leadingNode.type === "character" && (leadingNode.text === "d" || leadingNode.text === "∂")) {
            tokens.push(MathSemantics.createToken(leadingNode.text, MathSymbolRole.DERIVATIVE, leadingNode.text));
            MathSemantics.emitNodes(nodes.slice(1), MathSemantics.createContext({ inDerivative: true }), tokens, metadata);
            return;
        }
        MathSemantics.emitNodes(nodes, context, tokens, metadata);
    }

    static emitEnvironmentNode(node, context, tokens, metadata) {
        for (let rowIndex = 0; rowIndex < node.rows.length; rowIndex++) {
            const cells = node.rows[rowIndex];
            for (let cellIndex = 0; cellIndex < cells.length; cellIndex++)
                MathSemantics.emitNodes(cells[cellIndex], context, tokens, metadata);
        }
    }

    static createToken(text, role, symbolName) {
        return { text, role, symbolName };
    }

    static resolveNameRole(name, symbolName, context, metadata) {
        const metadataRole = context.isIndexContent ? null : metadata?.getSymbolRole?.(symbolName) ?? metadata?.getSymbolRole?.(name) ?? null;
        if (context.inDerivative && (name === "d" || name === "∂"))
            return MathSemantics.resolveRole([metadataRole, MathSymbolRole.DERIVATIVE]);
        if (MathSemantics.isFunctionName(name, metadata))
            return MathSemantics.resolveRole([metadataRole, context.forcedRole, MathSymbolRole.FUNCTION]);
        return MathSemantics.resolveRole([metadataRole, context.forcedRole, MathSymbolRole.VARIABLE]);
    }

    static resolveCommandRole(commandName, context, metadata) {
        const metadataRole = context.isIndexContent ? null : metadata?.getSymbolRole?.(commandName) ?? null;
        if (commandName === "\\partial" || commandName === "\\prime" || commandName === "\\differentialD")
            return MathSemantics.resolveRole([metadataRole, MathSymbolRole.DERIVATIVE]);
        if (MathSemantics.functionCommandNames.has(commandName))
            return MathSemantics.resolveRole([metadataRole, context.forcedRole, MathSymbolRole.FUNCTION]);
        if (MathSemantics.operatorCommandNames.has(commandName))
            return MathSemantics.resolveRole([metadataRole, context.forcedRole, MathSymbolRole.OPERATOR]);
        return MathSemantics.resolveRole([metadataRole, context.forcedRole, MathSymbolRole.VARIABLE]);
    }

    static resolveIndexRole(name, symbolName, indexText, isNamedIndex, metadata) {
        if (isNamedIndex)
            return MathSymbolRole.QUALIFIER_INDEX;
        const metadataRole = metadata?.getIndexRole?.(name, indexText, symbolName) ?? null;
        if (metadataRole)
            return metadataRole;
        return MathSemantics.getFallbackIndexRole(indexText);
    }

    static getFallbackIndexRole(indexText) {
        const normalizedIndexText = String(indexText ?? "").trim();
        if (normalizedIndexText === "")
            return MathSymbolRole.QUALIFIER_INDEX;
        if (/^[0-9]+$/.test(normalizedIndexText))
            return MathSymbolRole.QUALIFIER_INDEX;
        if (/^[A-Za-z][A-Za-z0-9]*$/.test(normalizedIndexText) && normalizedIndexText.length === 1)
            return MathSymbolRole.QUALIFIER_INDEX;
        return MathSymbolRole.ITERATION_INDEX;
    }

    static resolveRole(candidateRoles) {
        let resolvedRole = MathSymbolRole.OPERATOR;
        let resolvedPriority = MathSemantics.rolePriority.length;
        for (let candidateIndex = 0; candidateIndex < candidateRoles.length; candidateIndex++) {
            const candidateRole = candidateRoles[candidateIndex];
            if (!candidateRole)
                continue;
            const candidatePriority = MathSemantics.rolePriority.indexOf(candidateRole);
            if (candidatePriority >= 0 && candidatePriority < resolvedPriority) {
                resolvedPriority = candidatePriority;
                resolvedRole = candidateRole;
            }
        }
        return resolvedRole;
    }

    static isFunctionName(name, metadata) {
        if (metadata?.isFunction?.(name))
            return true;
        return MathSemantics.textFunctionNames.has(name);
    }

    static isDifferentialSequence(nodes) {
        if (!nodes || nodes.length === 0)
            return false;
        const leadingNode = nodes[0];
        if (leadingNode.type === "differential")
            return true;
        if (leadingNode.type === "command" && (leadingNode.text === "\\partial" || leadingNode.text === "\\differentialD"))
            return true;
        if (leadingNode.type !== "character")
            return false;
        if (leadingNode.text !== "d" && leadingNode.text !== "∂")
            return false;
        if (leadingNode.subscript || leadingNode.superscript)
            return false;
        return nodes.length > 1;
    }

    static isNamedIndex(nodes) {
        if (!nodes || nodes.length === 0)
            return false;
        return nodes[0].type === "command" && nodes[0].text === "\\!";
    }

    static getPlainText(nodes) {
        if (!nodes)
            return "";
        let plainText = "";
        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            const node = nodes[nodeIndex];
            if (node.type === "character")
                plainText += node.text;
            else if (node.type === "command")
                plainText += node.text === "\\!" ? "" : node.text;
            else if (node.type === "group" || node.type === "delimited")
                plainText += MathSemantics.getPlainText(node.body);
            else if (node.type === "upright")
                plainText += MathSemantics.getPlainText(node.body);
            if (node.subscript)
                plainText += `_${MathSemantics.getPlainText(node.subscript.body)}`;
        }
        return plainText;
    }

    static buildSymbolName(name, lastNode) {
        if (!lastNode?.subscript)
            return name;
        const indexText = MathSemantics.getPlainText(lastNode.subscript.body);
        if (MathSemantics.isNamedIndex(lastNode.subscript.body))
            return `${name}.${indexText}`;
        return `${name}_${indexText}`;
    }

    static isLetter(text) {
        return /^[A-Za-zΑ-ω]$/.test(text);
    }

    static isDigitOrDecimalSeparator(text) {
        return /^[0-9.]$/.test(text);
    }
}

MathSemantics.primeTexts = new Set(["\\prime", "'", "\\prime\\prime", "''"]);
MathSemantics.differentialLeafText = "\\mathrm{d}";

if (typeof module !== "undefined" && module.exports)
    module.exports = { MathSemantics, MathSemanticsParser, MathSymbolRole };
