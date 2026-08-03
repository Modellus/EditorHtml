class BlockBindings {
    static kinds = ["constant", "parameter", "variable", "expression", "formula", "token", "format"];

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

    getParser() {
        return this.calculator?.parser ?? null;
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
            branch = parser.parse(latex);
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
        if (kind === "expression")
            return this.resolveExpression(binding, context, fallbackValue);
        if (kind === "formula")
            return this.resolveFormula(binding, context, fallbackValue);
        if (kind === "format")
            return this.resolveFormat(binding, context, fallbackValue);
        return fallbackValue;
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

    resolveVariable(binding, context, fallbackValue) {
        const value = this.resolveTermValue(binding.variable, this.getCaseNumber(binding, context));
        if (!Number.isFinite(value))
            return fallbackValue;
        return value;
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

    coerceFormulaInput(value, caseNumber) {
        if (typeof value === "number")
            return value;
        if (typeof value === "string")
            return this.resolveTermValue(value, caseNumber);
        return NaN;
    }

    resolveFormat(binding, context, fallbackValue) {
        const value = this.resolve(binding.format, context, null);
        if (value === null || value === undefined)
            return fallbackValue;
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return `${binding.prefix ?? ""}${value}${binding.suffix ?? ""}`;
        const digits = Number.isFinite(Number(binding.digits)) ? Math.max(0, Math.min(10, Math.floor(Number(binding.digits)))) : 2;
        return `${binding.prefix ?? ""}${numeric.toFixed(digits)}${binding.suffix ?? ""}`;
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
        return { variables: [], parameters: [] };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockBindings;
