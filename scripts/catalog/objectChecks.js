// What an object is supposed to do, and whether it still does it.
//
// A definition is a document of formulas, and until now the only thing anyone could say about one
// was that it compiled. That is a low bar: the catalogue's preview binds the compiler to a
// calculator holding no model at all, so every formula falls back to zero and a gauge with every
// radius at 0 draws "successfully". A check closes that gap by standing the object somewhere
// definite — a model, a row of it, a size, a preset, a set of parameter values — and saying what
// has to be true there.
//
// It runs the object exactly as a board would: the same compiler, the same bindings, the same
// calculator reading the same LaTeX the model is written in. That is the whole point — a check that
// ran the object some other way would be testing the checker.
class ObjectChecks {
    static defaultGiven = { model: "", iteration: 1, parameters: {}, width: 180, height: 180, preset: "standard" };

    static normalizeGiven(given = {}) {
        const merged = Object.assign({}, ObjectChecks.defaultGiven, given);
        return {
            model: String(merged.model ?? ""),
            iteration: Math.max(1, Math.floor(Number(merged.iteration) || 1)),
            parameters: merged.parameters ?? {},
            width: Math.max(1, Number(merged.width) || 180),
            height: Math.max(1, Number(merged.height) || 180),
            preset: BlockTokens.isPreset(merged.preset) ? merged.preset : "standard"
        };
    }

    // The model a check stands the object on, written in the same LaTeX an Expression shape holds.
    // A model that will not parse is not a silent zero: it is reported, because a check passing
    // against a model nobody could read would be worse than one that fails.
    static createCalculator(model, iteration) {
        const calculator = new Calculator();
        const problems = [];
        if (model.trim() !== "") {
            try {
                calculator.parse(model);
            } catch (error) {
                problems.push({ severity: "error", path: "given.model", message: `The model could not be read: ${error?.message ?? error}` });
                return { calculator, problems };
            }
        }
        try {
            calculator.calculate(iteration);
            calculator.setIteration(iteration);
        } catch (error) {
            problems.push({ severity: "error", path: "given.iteration", message: `The model could not be run to row ${iteration}: ${error?.message ?? error}` });
        }
        return { calculator, problems };
    }

    // Deliberately not ObjectDrawing's compile. That one poses the object for its catalogue card —
    // a fitted box, the preview parameters, no model — and this one stands it where the check says,
    // at the size the check names, on the row of the run the check names.
    static compile(definitionDocument, given) {
        const settings = ObjectChecks.normalizeGiven(given);
        const model = ObjectChecks.createCalculator(settings.model, settings.iteration);
        const instance = BlockObjects.createComponentInstance(definitionDocument.type);
        instance.preset = settings.preset;
        const parameters = Object.assign(
            BlockObjects.getInstancePropertyDefaults(definitionDocument.type, settings.preset),
            settings.parameters
        );
        const context = {
            width: settings.width,
            height: settings.height,
            parameters: parameters,
            caseNumber: 1,
            iteration: settings.iteration,
            tokens: new BlockTokens(settings.preset)
        };
        const bindings = new BlockBindings(model.calculator);
        const compiler = new BlockCompiler(BlockRegistry, bindings);
        const compilation = compiler.compile(instance, context);
        const validator = new BlockValidator(BlockRegistry, compiler);
        validator.setCalculator(model.calculator);
        return {
            given: settings,
            calculator: model.calculator,
            modelProblems: model.problems,
            instance: instance,
            context: context,
            compilation: compilation,
            validation: validator.validate(instance, context)
        };
    }

    // Everything that can be said against an object, in one list, because the reader is asking one
    // question. The document's own shape is checked first: a key the loader would refuse never gets
    // as far as compiling, and saying "it drew nothing" about a document that was never legal sends
    // the author looking in the wrong place.
    static problems(definitionDocument, given) {
        const documentProblems = BlockDefinitionLoader.inspect(definitionDocument)
            .map(message => ({ severity: "error", path: "definition", message: message }));
        if (documentProblems.length > 0)
            return { problems: documentProblems, inspection: null };
        const inspection = ObjectChecks.compile(definitionDocument, given);
        const problems = inspection.modelProblems.slice();
        for (const diagnostic of inspection.compilation.diagnostics ?? [])
            problems.push({ severity: diagnostic.severity === "warning" ? "warning" : "error", path: diagnostic.path, message: diagnostic.message });
        for (const error of inspection.validation.errors ?? [])
            problems.push({ severity: "error", path: error.path, message: error.message });
        for (const warning of inspection.validation.warnings ?? [])
            problems.push({ severity: "warning", path: warning.path, message: warning.message });
        if (inspection.compilation.nodes.length === 0)
            problems.push({ severity: "error", path: "root", message: "The definition compiles to nothing: it would draw an empty object." });
        return { problems: problems, inspection: inspection };
    }

    // A node is found by the id the document wrote, not by the id the compiler generated: a part a
    // component built carries its own id and the instance's, and the second is the one an author
    // can name in a check.
    static findNode(nodes, id) {
        for (const node of BlockRenderer.flatten(nodes)) {
            if (node.sourceComponentId === id || node.sourceId === id)
                return node;
        }
        return null;
    }

    static readNodeValue(node, attribute) {
        if (attribute === "transform")
            return node.transform ?? "";
        if (attribute === "text")
            return node.text ?? "";
        return node.attributes?.[attribute];
    }

    // The markup is deterministic, so a hash of it is a stable way to say "and nothing else about
    // the drawing changed" without keeping a copy of the drawing in the check.
    static markupHash(nodes) {
        const markup = BlockRenderer.toMarkup(nodes);
        let hash = 2166136261;
        for (let index = 0; index < markup.length; index++) {
            hash ^= markup.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return `${(hash >>> 0).toString(16)}:${markup.length}`;
    }

    static describeExpectation(expectation) {
        if (expectation.validator !== undefined)
            return `the validator is ${expectation.validator}`;
        if (expectation.local !== undefined)
            return `${expectation.local} is ${expectation.equals ?? expectation.equalsText}`;
        if (expectation.node !== undefined)
            return `#${expectation.node} ${expectation.attribute} is ${expectation.equals ?? expectation.contains}`;
        if (expectation.nodes !== undefined)
            return `at least ${expectation.nodes.atLeast} nodes are drawn`;
        if (expectation.markup !== undefined)
            return "the drawing is unchanged";
        return "an expectation nobody recognises";
    }

    static evaluate(expectation, inspection, problems) {
        if (expectation.validator !== undefined) {
            const blocking = problems.filter(problem => problem.severity === "error" || expectation.strict === true);
            if (blocking.length > 0)
                return `${blocking.length} problem${blocking.length === 1 ? "" : "s"}, the first being "${blocking[0].message}"`;
            return null;
        }
        if (expectation.local !== undefined) {
            const value = inspection?.compilation?.componentFrame?.[expectation.local];
            if (value === undefined)
                return `there is no local called "${expectation.local}"`;
            if (expectation.equalsText !== undefined)
                return String(value) === String(expectation.equalsText) ? null : `it reads "${value}"`;
            const tolerance = Number.isFinite(Number(expectation.tolerance)) ? Number(expectation.tolerance) : 1e-9;
            if (!Number.isFinite(Number(value)))
                return `it reads ${ObjectChecks.formatValue(value)}, which is not a number`;
            return Math.abs(Number(value) - Number(expectation.equals)) <= tolerance ? null : `it reads ${ObjectChecks.formatValue(value)}`;
        }
        if (expectation.node !== undefined) {
            const node = ObjectChecks.findNode(inspection?.compilation?.nodes ?? [], expectation.node);
            if (!node)
                return `nothing in the drawing is called "#${expectation.node}"`;
            const actual = ObjectChecks.readNodeValue(node, expectation.attribute);
            if (actual === undefined || actual === null)
                return `#${expectation.node} has no ${expectation.attribute}`;
            if (expectation.contains !== undefined)
                return String(actual).includes(String(expectation.contains)) ? null : `it reads "${actual}"`;
            return String(actual) === String(expectation.equals) ? null : `it reads "${actual}"`;
        }
        if (expectation.nodes !== undefined) {
            const count = inspection?.compilation?.stats?.nodeCount ?? 0;
            return count >= Number(expectation.nodes.atLeast) ? null : `only ${count} were drawn`;
        }
        if (expectation.markup !== undefined) {
            const hash = ObjectChecks.markupHash(inspection?.compilation?.nodes ?? []);
            if (expectation.markup === "snapshot" || expectation.markup === hash)
                return null;
            return `the drawing is now ${hash}`;
        }
        return "the expectation names nothing this runner understands";
    }

    static run(definitionDocument, check) {
        const outcome = ObjectChecks.problems(definitionDocument, check.given ?? {});
        const failures = [];
        for (const expectation of check.expect ?? []) {
            const reason = ObjectChecks.evaluate(expectation, outcome.inspection, outcome.problems);
            if (reason)
                failures.push({ expectation: ObjectChecks.describeExpectation(expectation), reason: reason });
        }
        return {
            name: check.name ?? "an unnamed check",
            passed: failures.length === 0,
            failures: failures,
            // What the drawing hashes to on this run, so recording a snapshot needs no second pass.
            markup: outcome.inspection ? ObjectChecks.markupHash(outcome.inspection.compilation.nodes) : null
        };
    }

    static runAll(definitionDocument, checks) {
        const results = (checks ?? []).map(check => ObjectChecks.run(definitionDocument, check));
        return { results: results, passed: results.filter(result => result.passed).length, total: results.length };
    }

    static formatValue(value) {
        if (typeof value === "boolean")
            return String(value);
        if (typeof value === "number")
            return Number.isFinite(value) ? String(Math.round(value * 1e6) / 1e6) : String(value);
        if (typeof value === "string")
            return `"${value}"`;
        if (value === null || value === undefined)
            return "nothing";
        if (Array.isArray(value))
            return `${value.length} rows`;
        return "{…}";
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectChecks;
