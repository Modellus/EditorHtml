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

    static syntaxPatterns = [
        { pattern: /missing (?:'(.*?)'|(\S+)) at /, key: "Expression Error Missing", placeholder: "symbol" },
        { pattern: /(?:mismatched|extraneous) input '([\s\S]*?)' expecting/, key: "Expression Error Unexpected", placeholder: "text" },
        { pattern: /no viable alternative at input '([\s\S]*)'/, key: "Expression Error Unexpected", placeholder: "text" }
    ];

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
        const text = String(message ?? "");
        for (let patternIndex = 0; patternIndex < MathErrorMessage.syntaxPatterns.length; patternIndex++) {
            const syntaxPattern = MathErrorMessage.syntaxPatterns[patternIndex];
            const match = syntaxPattern.pattern.exec(text);
            if (match === null)
                continue;
            const offendingText = match[1] ?? match[2];
            if (offendingText === MathErrorMessage.endOfInputMarker)
                return MathErrorMessage.read("Expression Error Incomplete", {}, translations) ?? MathErrorMessage.readUnreadable(translations);
            return MathErrorMessage.read(syntaxPattern.key, { [syntaxPattern.placeholder]: offendingText }, translations) ?? MathErrorMessage.readUnreadable(translations);
        }
        return MathErrorMessage.readUnreadable(translations);
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
