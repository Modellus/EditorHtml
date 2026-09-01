class BlockBindings {
    static kinds = ["constant", "parameter", "variable", "expression", "formula", "token", "format", "choose", "concat", "contrast", "direction", "memory", "memoryCount", "independent", "opaque", "termUnit", "element"];

    static isBinding(value) {
        if (value === null || typeof value !== "object" || Array.isArray(value))
            return false;
        return BlockBindings.kinds.some(kind => Object.prototype.hasOwnProperty.call(value, kind));
    }

    static getKind(binding) {
        return BlockBindings.kinds.find(kind => Object.prototype.hasOwnProperty.call(binding, kind)) ?? null;
    }

    static constant(value) {
        return { constant: value };
    }

    static parameter(parameterId) {
        return { parameter: parameterId };
    }

    static variable(termName, caseNumber = 1) {
        return { variable: termName, case: caseNumber };
    }

    // The model's own clock, whatever the reader has called it. A drawing asking for it by name would
    // be wrong for every model that named it something else, so it is asked for by what it is: "value"
    // is how far the run has got, "name" is the term that holds it.
    static independent(field = "value") {
        return { independent: field };
    }

    static element(termBinding, indexBinding) {
        return { element: termBinding, index: indexBinding };
    }

    // Whether a colour paints anything at all. A part of a drawing is left out by being given no
    // colour rather than by a switch of its own, so what decides it is the colour itself: nothing,
    // "none", "transparent" and a fully clear colour all read as 0, and every real colour as 1.
    static opaque(binding) {
        return { opaque: binding };
    }

    static isOpaqueColour(value) {
        const colour = String(value ?? "").trim().toLowerCase();
        if (colour === "" || colour === "none" || colour === "transparent")
            return false;
        return !/^#[0-9a-f]{6}00$/.test(colour) && !/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0?\.?0+\s*\)$/.test(colour);
    }

    // What the term a parameter names is measured in, as the model holds it. A component reading a
    // term reads its unit from the same place every other drawing of that term does — the unit picked
    // beside the term itself — rather than from a unit of its own that could say something else.
    static termUnit(binding) {
        return { termUnit: binding };
    }

    static expression(latex) {
        return { expression: latex };
    }

    static formula(latex, inputs) {
        return { formula: latex, inputs: inputs ?? {} };
    }

    constructor(calculator = null) {
        this.calculator = calculator;
        this.branchCache = new Map();
        this.parseErrors = new Map();
    }

    setCalculator(calculator) {
        if (this.calculator === calculator)
            return;
        this.calculator = calculator;
        this.branchCache.clear();
        this.parseErrors.clear();
    }

    // Formulas are parsed against a system of this layer's own, never the model's. Parsing a name
    // is what makes it a term, so parsing "plotX+gap" with the model's parser would leave the model
    // holding variables the drawing invented — and a local named like something the engine keeps for
    // itself would break it. The values a formula reads still come from the model, at evaluation.
    getParser() {
        if (!this.formulaParser)
            this.formulaParser = new Modellus.Parser(new Modellus.System("t", "n"));
        return this.formulaParser;
    }

    parseLatex(latex) {
        if (this.branchCache.has(latex))
            return this.branchCache.get(latex);
        const parser = this.getParser();
        if (!parser) {
            this.branchCache.set(latex, null);
            this.parseErrors.set(latex, "No expression engine available.");
            return null;
        }
        parser.hasErrors = false;
        parser.errors = [];
        let branch = null;
        try {
            branch = parser.parse(Utils.readFunctionNames(latex));
        } catch (error) {
            branch = null;
            this.parseErrors.set(latex, String(error?.message ?? error));
        }
        if (parser.hasErrors) {
            branch = null;
            this.parseErrors.set(latex, parser.errors[0] ?? "Invalid expression.");
        }
        this.branchCache.set(latex, branch);
        return branch;
    }

    getParseError(latex) {
        return this.parseErrors.get(latex) ?? null;
    }

    isValidExpression(latex) {
        return this.parseLatex(latex) != null;
    }

    collectExpressionVariables(latex) {
        const branch = this.parseLatex(latex);
        if (!branch)
            return [];
        const names = new Set();
        this.collectBranchVariables(branch, names);
        return Array.from(names);
    }

    collectBranchVariables(branch, names) {
        if (!branch)
            return;
        if (branch.op === "var" && typeof branch.text === "string")
            names.add(branch.text);
        for (const child of branch.children ?? [])
            this.collectBranchVariables(child, names);
    }

    getModelValues(caseNumber = 1) {
        if (!this.calculator?.system)
            return {};
        const iteration = this.calculator.getIteration();
        return this.calculator.system.getIteration(iteration, caseNumber) ?? {};
    }

    isModelTerm(name) {
        if (!this.calculator)
            return false;
        return this.calculator.isTerm(name);
    }

    resolveTermValue(termName, caseNumber = 1) {
        const numeric = Number(termName);
        if (Number.isFinite(numeric))
            return numeric;
        if (!this.calculator || !this.calculator.isTerm(termName))
            return NaN;
        const value = this.calculator.getByName(termName, caseNumber);
        return Number.isFinite(value) ? value : NaN;
    }

    resolve(binding, context, fallbackValue = null) {
        if (binding === undefined || binding === null)
            return fallbackValue;
        if (!BlockBindings.isBinding(binding))
            return binding;
        const kind = BlockBindings.getKind(binding);
        if (kind === "constant")
            return binding.constant;
        if (kind === "token")
            return context.tokens ? context.tokens.get(binding.token, fallbackValue) : fallbackValue;
        if (kind === "parameter")
            return this.resolveParameter(binding, context, fallbackValue);
        if (kind === "variable")
            return this.resolveVariable(binding, context, fallbackValue);
        if (kind === "independent")
            return this.resolveIndependent(binding, fallbackValue);
        if (kind === "element")
            return this.resolveElement(binding, context, fallbackValue);
        if (kind === "opaque")
            return BlockBindings.isOpaqueColour(this.resolve(binding.opaque, context, "")) ? 1 : 0;
        if (kind === "expression")
            return this.resolveExpression(binding, context, fallbackValue);
        if (kind === "formula")
            return this.resolveFormula(binding, context, fallbackValue);
        if (kind === "format")
            return this.resolveFormat(binding, context, fallbackValue);
        if (kind === "choose")
            return this.resolveChoice(binding, context, fallbackValue);
        if (kind === "concat")
            return this.resolveConcat(binding, context, fallbackValue);
        if (kind === "contrast")
            return this.resolveContrast(binding, context, fallbackValue);
        if (kind === "direction")
            return this.resolveDirection(binding, context, fallbackValue);
        if (kind === "memory")
            return this.resolveMemory(binding, context, fallbackValue);
        if (kind === "memoryCount")
            return BlockMemory.count(BlockMemory.read(context.parameters, binding.memoryCount));
        if (kind === "termUnit")
            return this.resolveTermUnit(binding, context, fallbackValue);
        return fallbackValue;
    }

    // Reads one of the object's own memories: the whole list when nothing else is asked for, the
    // row at an index, or one field of it. The index is a binding like any other, so a repeated
    // node draws row $index and a playhead reads the row it stands on.
    resolveMemory(binding, context, fallbackValue) {
        const rows = BlockMemory.read(context.parameters, binding.memory);
        if (binding.row === undefined && binding.field === undefined)
            return rows;
        const index = this.resolveNumber(binding.row, context, 0);
        if (binding.field === undefined)
            return BlockMemory.getRow(rows, index, binding.from) ?? fallbackValue;
        const value = BlockMemory.getField(rows, index, binding.from, binding.field);
        return value === null ? fallbackValue : value;
    }

    // Reads back as black or white against whatever colour it is given, so a label placed on a
    // surface the reader chooses stays legible without the definition guessing the surface.
    resolveContrast(binding, context, fallbackValue) {
        const color = this.resolve(binding.contrast, context, null);
        if (color === null || color === undefined || color === "")
            return fallbackValue;
        return Utils.getContrastColor(String(color));
    }

    // Picks between two bindings, so a declarative definition can express what a create()
    // function writes as a conditional expression. A blank string and a zero are the empty
    // cases: "no unit" and "no span left" read as false, as they do in the code they replace.
    static isTruthy(value) {
        if (typeof value === "boolean")
            return value;
        if (typeof value === "number")
            return Number.isFinite(value) && value !== 0;
        if (typeof value === "string")
            return value !== "" && value !== "false";
        return value !== null && value !== undefined;
    }

    // Joins resolved parts into one string, so a readout can be built from a formatted number
    // and a unit without a create() function to concatenate them.
    resolveConcat(binding, context, fallbackValue) {
        if (!Array.isArray(binding.concat))
            return fallbackValue;
        return binding.concat.map(part => {
            const value = this.resolve(part, context, "");
            return value === null || value === undefined ? "" : String(value);
        }).join("");
    }

    resolveDirection(binding, context, fallbackValue) {
        const across = this.resolveNumber(binding.direction?.x, context, NaN);
        const up = this.resolveNumber(binding.direction?.y, context, NaN);
        if (!Number.isFinite(across) || !Number.isFinite(up) || (across === 0 && up === 0))
            return fallbackValue;
        return BlockGeometry.toDegrees(Math.atan2(across, up));
    }

    resolveChoice(binding, context, fallbackValue) {
        const condition = this.resolve(binding.choose, context, false);
        const branch = this.isChosen(binding, condition, context) ? binding.then : binding.otherwise;
        if (branch === undefined)
            return fallbackValue;
        return this.resolve(branch, context, fallbackValue);
    }

    isChosen(binding, condition, context) {
        if (binding.equals === undefined)
            return BlockBindings.isTruthy(condition);
        const wanted = this.resolve(binding.equals, context, null);
        if (condition === null || condition === undefined || wanted === null || wanted === undefined)
            return false;
        return String(condition) === String(wanted);
    }

    resolveParameter(binding, context, fallbackValue) {
        const parameters = context.parameters ?? {};
        const value = parameters[binding.parameter];
        if (value === undefined || value === null || value === "")
            return fallbackValue;
        if (binding.as === "number" || binding.as === "value")
            return this.resolveTermValue(value, this.getCaseNumber(binding, context));
        return value;
    }

    resolveTermUnit(binding, context, fallbackValue) {
        const termName = this.resolve(binding.termUnit, context, "");
        if (termName === null || termName === undefined || termName === "")
            return fallbackValue;
        if (!this.calculator?.isTerm(String(termName)))
            return fallbackValue;
        return this.calculator.getTermUnit(String(termName)) ?? fallbackValue;
    }

    resolveVariable(binding, context, fallbackValue) {
        const value = this.resolveTermValue(binding.variable, this.getCaseNumber(binding, context));
        if (!Number.isFinite(value))
            return fallbackValue;
        return value;
    }

    // One element of a name the model defined over element indices, as `y\left[i\right]=...` does.
    // The name is read from whatever binding supplies it, so an object points at a wave the reader
    // names rather than at a term written into the definition.
    resolveElement(binding, context, fallbackValue) {
        const termName = String(this.resolve(binding.element, context, "")).trim();
        const index = Number(this.resolve(binding.index, context, NaN));
        if (termName === "" || !Number.isFinite(index))
            return fallbackValue;
        const values = this.getModelValues(this.getCaseNumber(binding, context));
        const value = Number(this.calculator?.system?.getElementValue(termName, index, values));
        return Number.isFinite(value) ? value : fallbackValue;
    }

    resolveIndependent(binding, fallbackValue) {
        const name = String(this.calculator?.properties?.independent?.name ?? "");
        if (binding.independent === "name")
            return name;
        const value = Number(this.calculator?.getIndependentValue?.());
        return Number.isFinite(value) ? value : fallbackValue;
    }

    resolveExpression(binding, context, fallbackValue) {
        const branch = this.parseLatex(binding.expression);
        if (!branch)
            return fallbackValue;
        const values = this.getModelValues(this.getCaseNumber(binding, context));
        const result = Number(branch.calculate(values));
        if (!Number.isFinite(result))
            return fallbackValue;
        return result;
    }

    resolveFormula(binding, context, fallbackValue) {
        const branch = this.parseLatex(binding.formula);
        if (!branch)
            return fallbackValue;
        const caseNumber = this.getCaseNumber(binding, context);
        const values = Object.assign({}, this.getModelValues(caseNumber));
        for (const [name, inputBinding] of Object.entries(binding.inputs ?? {})) {
            const inputValue = this.resolve(inputBinding, context, NaN);
            values[name] = this.coerceFormulaInput(inputValue, caseNumber);
        }
        const result = Number(branch.calculate(values));
        if (!Number.isFinite(result))
            return fallbackValue;
        return result;
    }

    // A definition that works a wave out for itself hands it to the model as a name defined over
    // element indices: the formula is the displacement of one oscillator, and the index it is written
    // over is bound here the way the model binds the index of `y\left[i\right]=...`.
    //
    // The row the engine is building is what the formula is read against, not the iteration on
    // screen. A wave is asked for while a row is being worked out — a term superposing two of them is
    // read exactly then — so the independent, and any parameter naming a term of the model, are taken
    // from that row; everything else is a value of the object's own and is read once, here, because
    // an object republishes whenever one of its parameters is edited.
    buildElementResolver(declaration, context) {
        const branch = this.parseLatex(declaration?.formula ?? "");
        if (!branch)
            return null;
        const caseNumber = this.getCaseNumber(declaration, context);
        const indexName = String(declaration.index ?? "n");
        const independentName = String(this.calculator?.properties?.independent?.name ?? "");
        const terms = this.buildElementTerms(declaration, context);
        return (index, values) => {
            let total = 0;
            for (const term of terms) {
                const frame = Object.assign({}, values, term.frame, { [indexName]: index });
                for (const input of term.inputs)
                    frame[input.name] = input.readsIndependent ? Number(values[independentName]) : this.coerceElementInput(input.value, values, caseNumber);
                const result = Number(branch.calculate(frame));
                if (!Number.isFinite(result))
                    return NaN;
                total += result;
            }
            return total;
        };
    }

    // What the element is the sum of. A declaration that names no sum is one source, read once; one
    // that sums over an index is that many, and each of them resolves its own inputs against the
    // value the index has for it. They are worked out here rather than per element, because what the
    // sources are is settled by the object's parameters and only the element moves between calls —
    // which is what keeps a wave of twenty sources read over two hundred samples a loop rather than
    // four thousand bindings.
    buildElementTerms(declaration, context) {
        const over = declaration?.over;
        if (!over)
            return [{ frame: {}, inputs: this.resolveElementInputs(declaration, context) }];
        const overIndexName = String(over.index ?? "k");
        const count = Math.floor(this.resolveNumber(over.count, context, 0));
        const terms = [];
        for (let position = 1; position <= count; position++) {
            const frame = { [overIndexName]: position };
            const overContext = Object.assign({}, context, { parameters: Object.assign({}, context.parameters, frame) });
            terms.push({ frame: frame, inputs: this.resolveElementInputs(declaration, overContext) });
        }
        return terms;
    }

    resolveElementInputs(declaration, context) {
        const inputs = [];
        for (const [name, binding] of Object.entries(declaration.inputs ?? {})) {
            const readsIndependent = BlockBindings.getKind(binding) === "independent" && binding.independent !== "name";
            inputs.push({ name: name, readsIndependent: readsIndependent, value: readsIndependent ? null : this.resolve(binding, context, NaN) });
        }
        return inputs;
    }

    // A parameter pointing at a term reads it from the row in hand, so a wave whose amplitude is a
    // term of the model is the amplitude that row holds rather than the one on screen. A row that
    // does not carry the term — it is read before that row exists — falls back to the model's
    // current value, which is what every other binding reads.
    coerceElementInput(value, values, caseNumber) {
        if (typeof value === "boolean")
            return value ? 1 : 0;
        if (typeof value === "string" && Number.isFinite(Number(values[value])))
            return Number(values[value]);
        return this.coerceFormulaInput(value, caseNumber);
    }

    coerceFormulaInput(value, caseNumber) {
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return this.resolveTermValue(value, caseNumber);
        return NaN;
    }

    // The decimals, prefix and suffix are resolved like any other binding, so a component can
    // format a readout with the digits and unit its own parameters carry.
    resolveFormat(binding, context, fallbackValue) {
        const value = this.resolve(binding.format, context, null);
        if (value === null || value === undefined)
            return fallbackValue;
        const prefix = this.resolve(binding.prefix, context, "");
        const suffix = this.resolve(binding.suffix, context, "");
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return `${prefix}${value}${suffix}`;
        const requestedDigits = Number(this.resolve(binding.digits, context, NaN));
        const digits = Number.isFinite(requestedDigits) ? Math.max(0, Math.min(10, Math.floor(requestedDigits))) : 2;
        return `${prefix}${numeric.toFixed(digits)}${suffix}`;
    }

    getCaseNumber(binding, context) {
        const bindingCase = Number(binding.case);
        if (Number.isFinite(bindingCase) && bindingCase >= 1)
            return Math.floor(bindingCase);
        const contextCase = Number(context?.caseNumber);
        if (Number.isFinite(contextCase) && contextCase >= 1)
            return Math.floor(contextCase);
        return 1;
    }

    resolveNumber(binding, context, fallbackValue = 0) {
        const value = this.resolve(binding, context, fallbackValue);
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return fallbackValue;
        return numeric;
    }

    resolveText(binding, context, fallbackValue = "") {
        const value = this.resolve(binding, context, fallbackValue);
        if (value === null || value === undefined)
            return fallbackValue;
        return String(value);
    }

    resolveBoolean(binding, context, fallbackValue = false) {
        const value = this.resolve(binding, context, fallbackValue);
        if (typeof value === "boolean")
            return value;
        if (typeof value === "number")
            return value !== 0;
        if (typeof value === "string")
            return value === "true" || value === "1";
        return fallbackValue;
    }

    getBindingDependencies(binding) {
        if (!BlockBindings.isBinding(binding))
            return { variables: [], parameters: [] };
        const kind = BlockBindings.getKind(binding);
        if (kind === "variable")
            return { variables: [binding.variable], parameters: [] };
        if (kind === "parameter")
            return { variables: [], parameters: [binding.parameter] };
        if (kind === "expression")
            return { variables: this.collectExpressionVariables(binding.expression), parameters: [] };
        if (kind === "formula") {
            const boundNames = Object.keys(binding.inputs ?? {});
            const freeVariables = this.collectExpressionVariables(binding.formula).filter(name => !boundNames.includes(name));
            const dependencies = { variables: freeVariables, parameters: [] };
            for (const inputBinding of Object.values(binding.inputs ?? {})) {
                const inputDependencies = this.getBindingDependencies(inputBinding);
                dependencies.variables = dependencies.variables.concat(inputDependencies.variables);
                dependencies.parameters = dependencies.parameters.concat(inputDependencies.parameters);
            }
            return dependencies;
        }
        if (kind === "format")
            return this.getBindingDependencies(binding.format);
        if (kind === "memory")
            return { variables: [], parameters: [binding.memory] };
        if (kind === "memoryCount")
            return { variables: [], parameters: [binding.memoryCount] };
        if (kind === "independent")
            return { variables: [String(this.calculator?.properties?.independent?.name ?? "")].filter(name => name !== ""), parameters: [] };
        if (kind === "element") {
            const termDependencies = this.getBindingDependencies(binding.element);
            const indexDependencies = this.getBindingDependencies(binding.index);
            return {
                variables: termDependencies.variables.concat(indexDependencies.variables),
                parameters: termDependencies.parameters.concat(indexDependencies.parameters)
            };
        }
        if (kind === "opaque")
            return this.getBindingDependencies(binding.opaque);
        return { variables: [], parameters: [] };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockBindings;
