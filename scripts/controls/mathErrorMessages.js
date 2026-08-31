class MathErrorMessage {
    static cycleCode = "EXPRESSION_CYCLE";

    static unreadableKey = "Expression Error Unreadable";

    static endOfInputMarker = "<EOF>";

    static diagnosticKeys = {
        "INDEPENDENT_ASSIGNED": "Expression Error Independent Assigned",
        "EXPRESSION_CYCLE": "Expression Error Cycle",
        "DOMAIN_KEYWORD_EXPECTED": "Expression Error Domain Keyword",
        "DOMAIN_EMPTY": "Expression Error Domain Empty",
        "DOMAIN_INVALID_BOUND": "Expression Error Domain Bound",
        "DOMAIN_STEP_ZERO": "Expression Error Domain Step Zero",
        "DOMAIN_STEP_DIRECTION": "Expression Error Domain Step Direction",
        "DOMAIN_MIXED_MEMBERS": "Expression Error Domain Members",
        "DOMAIN_UNKNOWN_BUILTIN": "Expression Error Domain Builtin",
        "DOMAIN_CIRCULAR": "Expression Error Domain Circular"
    };

    static syntaxPatterns = [
        { pattern: /missing (?:'(.*?)'|(\S+)) at /, key: "Expression Error Missing", placeholder: "symbol" },
        { pattern: /(?:mismatched|extraneous) input '([\s\S]*?)' expecting/, key: "Expression Error Unexpected", placeholder: "text" },
        { pattern: /no viable alternative at input '([\s\S]*)'/, key: "Expression Error Unexpected", placeholder: "text" }
    ];

    static cycleError(termNames) {
        return { code: MathErrorMessage.cycleCode, termNames: termNames.slice() };
    }

    static translate(error, translations) {
        if (!error)
            return "";
        if (error.code === undefined)
            return MathErrorMessage.translateSyntaxError(error.message, translations);
        return MathErrorMessage.translateDiagnostic(error, translations);
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
                return MathErrorMessage.read("Expression Error Incomplete", {}, translations);
            return MathErrorMessage.read(syntaxPattern.key, { [syntaxPattern.placeholder]: offendingText }, translations);
        }
        return MathErrorMessage.readUnreadable(translations);
    }

    static translateDiagnostic(diagnostic, translations) {
        const key = MathErrorMessage.readDiagnosticKey(diagnostic);
        if (key === null)
            return MathErrorMessage.readUnreadable(translations);
        return MathErrorMessage.read(key, MathErrorMessage.readDiagnosticValues(diagnostic), translations);
    }

    static readDiagnosticKey(diagnostic) {
        if (diagnostic.code === "DOMAIN_UNKNOWN_NAME")
            return diagnostic.domainName ? "Expression Error Unknown Domain" : "Expression Error Unknown Category";
        return MathErrorMessage.diagnosticKeys[diagnostic.code] ?? null;
    }

    static readDiagnosticValues(diagnostic) {
        return {
            term: diagnostic.termName,
            domain: diagnostic.domainName,
            text: diagnostic.location?.text,
            terms: diagnostic.termNames?.join(", ")
        };
    }

    static read(key, values, translations) {
        const template = translations.get(key);
        if (template === undefined)
            return MathErrorMessage.readUnreadable(translations);
        const filled = MathErrorMessage.fill(template, values);
        if (filled === null)
            return MathErrorMessage.readUnreadable(translations);
        return filled;
    }

    static readUnreadable(translations) {
        return translations.get(MathErrorMessage.unreadableKey) ?? "";
    }

    static fill(template, values) {
        let hasUnfilledPlaceholder = false;
        const filled = template.replace(/\{([a-z]+)\}/g, (placeholder, name) => {
            const value = values[name];
            if (value === undefined || value === "") {
                hasUnfilledPlaceholder = true;
                return placeholder;
            }
            return value;
        });
        return hasUnfilledPlaceholder ? null : filled;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathErrorMessage;
