// Every problem the engine reports carries the named values its sentence was composed from, under a
// `parameters.key` naming the sentence. The editor words each key itself, in the reader's language,
// as prose with fragments of the model in it: a wording marks its maths between `$` signs, and each
// fragment is typeset wherever the message is shown. The engine's own sentence is kept only for a
// key the editor has no wording of its own for.
class MathErrorMessage {
    static cycleKey = "expressionCycle";

    static unreadableKey = "Expression Error Unreadable";

    static endOfInputMarker = "<EOF>";

    static listSeparatorKey = "Expression Error List Separator";

    static listLastSeparatorKey = "Expression Error List Last Separator";

    // A placeholder is a braced word that is not the argument of a command: {name} is filled, but
    // \text{domain} and \mathbb{R} are maths of the wording's own.
    static placeholderPattern = /(?<![A-Za-z\\])\{([a-zA-Z]+)\}/g;

    // A key is one sentence, so this is the table a translation is written against. Each entry names
    // the translation to read and the values to fill it with, spelled the way a field writes them: a
    // categorical label as \text{}, a domain as the field's own notation. A count picks a singular or
    // plural wording, and a list stays a list so the joining word is the language's own.
    static wordings = {
        independentAssigned: parameters => ["Expression Error Independent Assigned", { name: parameters.name }],
        selfReferenceCurrentRow: parameters => ["Expression Error Self Reference Current Row", { name: parameters.name, index: parameters.index, suggestedIndex: parameters.suggestedIndex }],
        selfReferenceAhead: parameters => [MathErrorMessage.countKey("Expression Error Self Reference Ahead", parameters.rowsAhead), { name: parameters.name, index: parameters.index, rowsAhead: parameters.rowsAhead, suggestedIndex: parameters.suggestedIndex }],
        futureRowReadUnsettled: parameters => ["Expression Error Future Row Read Unsettled", { name: parameters.name, index: parameters.index, iterationTerm: parameters.iterationTerm }],
        futureRowReadComputed: parameters => ["Expression Error Future Row Read Computed", { name: parameters.name, index: parameters.index, iterationTerm: parameters.iterationTerm }],
        expressionCycle: parameters => ["Expression Error Cycle", { names: MathErrorMessage.list(parameters.names) }],
        categoricalArithmetic: parameters => [MathErrorMessage.countKey("Expression Error Categorical Arithmetic", parameters.names?.length), { names: MathErrorMessage.list(parameters.names), expression: parameters.expression }],
        domainKeywordExpected: parameters => ["Expression Error Domain Keyword", { statement: parameters.statement, name: parameters.name }],
        domainNameConflict: parameters => ["Expression Error Domain Name Conflict", { name: parameters.name }],
        domainCircular: parameters => ["Expression Error Domain Circular", { name: parameters.name }],
        domainUnknownName: parameters => parameters.declaredNames?.length > 0
            ? ["Expression Error Unknown Domain Among Declared", { name: parameters.name, declaredNames: MathErrorMessage.list(parameters.declaredNames) }]
            : ["Expression Error Unknown Domain", { name: parameters.name }],
        domainUnknownBuiltin: parameters => ["Expression Error Domain Builtin", { text: parameters.text }],
        domainEmpty: () => ["Expression Error Domain Empty", {}],
        domainMixedMembers: () => ["Expression Error Domain Members Mixed", {}],
        elementNotFinite: parameters => ["Expression Error Element Not Finite", { text: parameters.text }],
        labelReserved: parameters => ["Expression Error Label Reserved", { label: MathErrorMessage.label(parameters.label) }],
        labelIsTerm: parameters => ["Expression Error Label Is Term", { label: MathErrorMessage.label(parameters.label) }],
        labelNotWritable: parameters => ["Expression Error Domain Members", { command: parameters.command }],
        unknownCategoricalValue: parameters => ["Expression Error Unknown Category", { text: parameters.text, label: MathErrorMessage.label(parameters.label) }],
        rangeBoundsNotFinite: parameters => ["Expression Error Domain Bound", { range: parameters.range }],
        rangeStepZero: parameters => ["Expression Error Domain Step Zero", { range: parameters.range, suggestedStep: parameters.suggestedStep }],
        rangeStepDirection: parameters => ["Expression Error Domain Step Direction", { step: parameters.step, start: parameters.start, end: parameters.end, suggestedStep: parameters.suggestedStep }],
        intervalInvalid: parameters => ["Expression Error Interval Invalid", { interval: parameters.interval, suggestedLower: parameters.suggestedLower, suggestedUpper: parameters.suggestedUpper }],
        domainViolation: parameters => ["Expression Error Domain Violation", { name: parameters.name, valueText: MathErrorMessage.value(parameters.valueText), domainText: MathErrorMessage.domain(parameters.domainText) }],
        randomCountTooLarge: parameters => [MathErrorMessage.countKey("Expression Error Random Count", parameters.available), { name: parameters.name, requested: parameters.requested, available: parameters.available, domainText: MathErrorMessage.domain(parameters.domainText) }],
        storedSchemaNewer: parameters => ["Expression Error Stored Schema Newer", { storedVersion: parameters.storedVersion, engineVersion: parameters.engineVersion }],
        storedFiniteEmpty: () => ["Expression Error Stored Finite Empty", {}],
        storedRangeUnwalkable: parameters => ["Expression Error Stored Range Unwalkable", { start: parameters.start, end: parameters.end, step: parameters.step }],
        storedIntervalBounds: parameters => ["Expression Error Stored Interval Bounds", { lower: parameters.lower, upper: parameters.upper }],
        storedUnknownBuiltin: parameters => ["Expression Error Stored Unknown Builtin", { builtin: MathErrorMessage.builtin(parameters.builtin) }],
        storedUnknownKind: () => ["Expression Error Stored Unknown Kind", {}]
    };

    // What the grammar says when it stops: where it stopped, what it was holding, and what it would
    // have accepted there. The editor reads all three - the sentence and the mark in the field are
    // written from the same reading, so the row says the same thing twice, once in words and once
    // where the words are about.
    static syntaxHeaderPattern = /^Syntax error at line \d+, column (\d+): ([\s\S]*)$/;

    static missingPattern = /^missing (?:'([\s\S]*?)'|(\S+)) at /;

    static unexpectedPattern = /^(?:mismatched|extraneous) input '([\s\S]*?)' expecting ([\s\S]*)$/;

    static noAlternativePattern = /^no viable alternative at input '([\s\S]*)'$/;

    // The grammar names a value it would have accepted by its lexer rules rather than one at a time, so
    // a set offering either of these is a set offering a value - a number, a name, or anything that
    // opens one - however many functions the grammar grows.
    static operandTokenNames = ["DIGIT", "ID", "STRING"];

    static syntaxWordings = {
        operand: () => ["Expression Error Operand Missing", {}],
        symbol: finding => ["Expression Error Missing", { symbol: MathErrorMessage.symbol(finding.symbol) }],
        surplus: finding => ["Expression Error Does Not Belong", { text: MathErrorMessage.symbol(finding.text) }],
        incomplete: () => ["Expression Error Incomplete", {}],
        unreadable: finding => ["Expression Error Unexpected", { text: finding.text }]
    };

    static get utils() {
        return typeof Utils !== "undefined" ? Utils : require("../utils.js");
    }

    // The same-row cycle the editor finds for itself is worded like the one the engine reports.
    static cycleError(termNames) {
        return { code: "EXPRESSION_CYCLE", parameters: { key: MathErrorMessage.cycleKey, names: termNames.slice() } };
    }

    static list(names) {
        return Array.isArray(names) && names.length > 0 ? { list: names.map(name => String(name)) } : undefined;
    }

    static label(label) {
        return label === undefined || label === null || label === "" ? undefined : MathErrorMessage.utils.writeCategoricalLabel(label);
    }

    // A rejected value is a number or the label the domain gave it, and only a label is written as text.
    static value(valueText) {
        const text = String(valueText ?? "");
        if (text === "")
            return undefined;
        return Number.isFinite(Number(text)) ? text : MathErrorMessage.utils.writeCategoricalLabel(text);
    }

    static domain(domainText) {
        return domainText === undefined || domainText === null || domainText === "" ? undefined : MathErrorMessage.utils.convertDomainTextToLatex(domainText);
    }

    // The grammar names a delimiter by the command that sizes it, and a brace by the character that
    // groups latex. A reader wrote neither: they wrote the bracket, so that is what is shown to them.
    static symbol(symbol) {
        return String(symbol ?? "").replace(/^\\(?:left|right)(?=[^a-zA-Z])/, "").replace(/^[{}]$/, brace => `\\${brace}`);
    }

    static builtin(kind) {
        return kind === undefined || kind === null || kind === "" ? undefined : `\\mathbb{${kind}}`;
    }

    // The message as parts: prose to show as it is, and fragments of the model to typeset.
    static translate(error, translations) {
        if (!error)
            return [];
        if (error.code === undefined)
            return MathErrorMessage.translateSyntaxError(error.message, translations);
        return MathErrorMessage.translateDiagnostic(error, translations);
    }

    static toPlainText(parts) {
        return (parts ?? []).map(part => "latex" in part ? part.latex : part.text).join("");
    }

    static translateSyntaxError(message, translations) {
        return MathErrorMessage.translateFinding(MathErrorMessage.readSyntax(message), translations) ?? MathErrorMessage.readUnreadable(translations);
    }

    // A finding the editor made for itself is worded the same way as one read from the grammar, so a
    // row says the same thing however the editor came to know it.
    static translateFinding(finding, translations) {
        const wording = MathErrorMessage.syntaxWordings[finding?.kind];
        if (wording === undefined)
            return null;
        const [key, values] = wording(finding);
        return MathErrorMessage.read(key, values, translations);
    }

    // What the grammar stopped over, as something the editor can both word and point at: `column` is
    // where it stopped, counted in the text the engine was given, and `kind` says what would have made
    // the row readable there - a value, a symbol the grammar names, or one token too many.
    static readSyntax(message) {
        const text = String(message ?? "");
        const header = MathErrorMessage.syntaxHeaderPattern.exec(text);
        const column = header === null ? null : Number(header[1]);
        const body = header === null ? text : header[2];
        const missing = MathErrorMessage.missingPattern.exec(body);
        if (missing !== null)
            return { column, kind: "symbol", symbol: missing[1] ?? missing[2] };
        const unexpected = MathErrorMessage.unexpectedPattern.exec(body);
        if (unexpected !== null)
            return { column, text: unexpected[1], ...MathErrorMessage.readExpectation(unexpected[2], unexpected[1]) };
        const noAlternative = MathErrorMessage.noAlternativePattern.exec(body);
        if (noAlternative !== null)
            return { column, kind: "unreadable", text: noAlternative[1] };
        return { column, kind: "unknown" };
    }

    // A row that stops where a value was expected is a row missing a value, whatever it stopped on; a
    // row stopping where the grammar was ready to finish has one token too many, and a row stopping
    // where one symbol and no other would do is missing that symbol.
    static readExpectation(expectedText, offendingText) {
        const expectedTokens = MathErrorMessage.readExpectedTokens(expectedText);
        if (expectedTokens.some(token => MathErrorMessage.operandTokenNames.includes(token)))
            return { kind: "operand" };
        if (expectedTokens.includes(MathErrorMessage.endOfInputMarker))
            return offendingText === MathErrorMessage.endOfInputMarker ? { kind: "incomplete" } : { kind: "surplus" };
        const namedSymbols = expectedTokens.filter(token => token.startsWith("'") && token.endsWith("'"));
        if (namedSymbols.length === 1)
            return { kind: "symbol", symbol: namedSymbols[0].slice(1, -1) };
        return offendingText === MathErrorMessage.endOfInputMarker ? { kind: "incomplete" } : { kind: "surplus" };
    }

    static readExpectedTokens(expectedText) {
        const text = String(expectedText ?? "").trim();
        const listed = text.startsWith("{") && text.endsWith("}") ? text.slice(1, -1) : text;
        return listed.split(",").map(token => token.trim()).filter(token => token !== "");
    }

    // A sentence the editor has worded is written from the values the engine named; one it has not,
    // or one arriving without a value its wording needs, keeps the sentence the engine wrote, typeset
    // where the engine split it into prose and maths.
    static translateDiagnostic(diagnostic, translations) {
        const worded = MathErrorMessage.word(diagnostic.parameters, translations);
        if (worded !== null)
            return worded;
        if (Array.isArray(diagnostic.messageParts) && diagnostic.messageParts.length > 0)
            return diagnostic.messageParts.map(part => ({ ...part }));
        const message = String(diagnostic.message ?? "").trim();
        return message !== "" ? [{ text: message }] : MathErrorMessage.readUnreadable(translations);
    }

    static word(parameters, translations) {
        const wording = MathErrorMessage.wordings[parameters?.key];
        if (wording === undefined)
            return null;
        const [key, values] = wording(parameters, translations);
        return MathErrorMessage.read(key, values, translations);
    }

    static countKey(key, count) {
        return count === 1 ? `${key} One` : `${key} Many`;
    }

    static read(key, values, translations) {
        const template = translations.get(key);
        if (template === undefined)
            return null;
        return MathErrorMessage.fill(template, values, translations);
    }

    static readUnreadable(translations) {
        const text = translations.get(MathErrorMessage.unreadableKey);
        return text === undefined ? [] : [{ text }];
    }

    // A wording alternates prose and maths on its `$` signs. Prose keeps its words and lets a list of
    // names sit in it as typeset fragments joined by the language's own separators; maths becomes one
    // fragment with its placeholders filled. A placeholder with nothing to fill it refuses the wording.
    static fill(template, values, translations) {
        const parts = [];
        const segments = String(template).split("$");
        for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            const isLatex = segmentIndex % 2 === 1;
            const filled = isLatex
                ? MathErrorMessage.fillLatexSegment(segments[segmentIndex], values, parts)
                : MathErrorMessage.fillTextSegment(segments[segmentIndex], values, parts, translations);
            if (!filled)
                return null;
        }
        return parts;
    }

    static fillTextSegment(segment, values, parts, translations) {
        let filled = true;
        let lastIndex = 0;
        segment.replace(MathErrorMessage.placeholderPattern, (placeholder, name, offset) => {
            MathErrorMessage.pushText(parts, segment.substring(lastIndex, offset));
            lastIndex = offset + placeholder.length;
            const value = values[name];
            if (MathErrorMessage.isEmpty(value))
                filled = false;
            else if (value.list !== undefined)
                MathErrorMessage.pushList(parts, value.list, translations);
            else
                MathErrorMessage.pushText(parts, String(value));
            return placeholder;
        });
        MathErrorMessage.pushText(parts, segment.substring(lastIndex));
        return filled;
    }

    static fillLatexSegment(segment, values, parts) {
        let filled = true;
        const latex = segment.replace(MathErrorMessage.placeholderPattern, (placeholder, name) => {
            const value = values[name];
            if (MathErrorMessage.isEmpty(value)) {
                filled = false;
                return placeholder;
            }
            return value.list !== undefined ? value.list.join(", ") : String(value);
        });
        if (filled && latex !== "")
            parts.push({ latex });
        return filled;
    }

    static pushList(parts, items, translations) {
        const separator = translations.get(MathErrorMessage.listSeparatorKey) ?? ", ";
        const lastSeparator = translations.get(MathErrorMessage.listLastSeparatorKey) ?? separator;
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            if (itemIndex > 0)
                MathErrorMessage.pushText(parts, itemIndex === items.length - 1 ? lastSeparator : separator);
            parts.push({ latex: items[itemIndex] });
        }
    }

    static pushText(parts, text) {
        if (text === "")
            return;
        const last = parts[parts.length - 1];
        if (last !== undefined && "text" in last)
            last.text += text;
        else
            parts.push({ text });
    }

    static isEmpty(value) {
        return value === undefined || value === null || value === "";
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathErrorMessage;
