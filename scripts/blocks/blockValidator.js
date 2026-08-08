class BlockValidator {
    static schemaVersion = "1.0.0";

    constructor(registry = BlockRegistry, compiler = null) {
        this.registry = registry;
        this.compiler = compiler ?? new BlockCompiler(registry);
    }

    setCalculator(calculator) {
        this.calculator = calculator;
        this.compiler.setCalculator(calculator);
    }

    createResult() {
        return { valid: true, errors: [], warnings: [] };
    }

    addError(result, code, path, message, extra = {}) {
        result.valid = false;
        result.errors.push(Object.assign({ code: code, path: path, message: message }, extra));
    }

    addWarning(result, code, path, message, extra = {}) {
        result.warnings.push(Object.assign({ code: code, path: path, message: message }, extra));
    }

    validate(definition, context = {}) {
        const result = this.createResult();
        this.validateDefinitionShape(definition, result);
        if (!result.valid)
            return result;
        const seenIds = new Set();
        this.validateNode(definition.root, result, "root", 0, seenIds, definition);
        const compilation = this.compiler.compile(definition, context);
        this.applyCompilationDiagnostics(compilation, result);
        this.validateRuntimeSafety(compilation, result);
        this.validateVisualOutcome(compilation, result, context);
        return result;
    }

    validateDefinitionShape(definition, result) {
        if (!definition || typeof definition !== "object") {
            this.addError(result, "INVALID_DEFINITION", "", "The object definition must be an object.", { expected: "object" });
            return;
        }
        if (typeof definition.schemaVersion !== "string")
            this.addError(result, "MISSING_SCHEMA_VERSION", "schemaVersion", "The object definition must declare a schemaVersion.", { expected: "string", suggestion: BlockValidator.schemaVersion });
        else if (!BlockMigrations.isSupportedVersion(definition.schemaVersion))
            this.addError(result, "UNSUPPORTED_SCHEMA_VERSION", "schemaVersion", `Schema version "${definition.schemaVersion}" is not supported.`, { expected: BlockMigrations.getSupportedVersions().join(", ") });
        if (typeof definition.name !== "string" || definition.name.trim() === "")
            this.addError(result, "MISSING_NAME", "name", "The object definition must have a non-empty name.", { expected: "string" });
        if (!definition.root)
            this.addError(result, "MISSING_ROOT", "root", "The object definition must have a root node.", { expected: "node" });
        if (definition.preset !== undefined && !BlockTokens.isPreset(definition.preset))
            this.addError(result, "UNKNOWN_PRESET", "preset", `"${definition.preset}" is not a known visual preset.`, { expected: BlockTokens.getPresetNames().join(", "), suggestion: "standard" });
    }

    validateNode(node, result, path, depth, seenIds, definition) {
        if (!node || typeof node !== "object") {
            this.addError(result, "INVALID_NODE", path, "Node must be an object.", { expected: "object" });
            return;
        }
        if (depth > BlockCompiler.limits.maxDepth) {
            this.addError(result, "NESTING_LIMIT_EXCEEDED", path, `Nesting is limited to ${BlockCompiler.limits.maxDepth} levels.`);
            return;
        }
        if (typeof node.id === "string" && node.id !== "") {
            if (seenIds.has(node.id))
                this.addError(result, "DUPLICATE_NODE_ID", `${path}.id`, `Node id "${node.id}" is used more than once.`, { suggestion: `${node.id}-2` });
            seenIds.add(node.id);
        }
        const registration = this.registry.get(node.type);
        if (!registration) {
            this.addError(result, "UNKNOWN_NODE_TYPE", `${path}.type`, `"${node.type}" is not a registered building block.`, { suggestion: this.suggestType(node.type) });
            return;
        }
        if (registration.category !== "primitive" && registration.category !== "component")
            this.addError(result, "INVALID_NODE_CATEGORY", `${path}.type`, `"${node.type}" is a ${registration.category} and cannot be used as a node.`, { expected: "primitive or component" });
        if (registration.deprecated)
            this.addWarning(result, "DEPRECATED_BLOCK", `${path}.type`, `"${node.type}" is deprecated.`, { suggestion: registration.replacedBy });
        this.validateNodeProperties(node, registration, result, path);
        this.validateNodeBindings(node, registration, result, path);
        this.validateNodeParameters(node, registration, result, path);
        this.validateNodeModifiers(node, result, path);
        this.validateNodeBehaviours(node, registration, result, path);
        if ((node.children ?? []).length > 0 && !registration.supportsChildren)
            this.addError(result, "CHILDREN_NOT_SUPPORTED", `${path}.children`, `"${node.type}" cannot contain children.`, { suggestion: "group" });
        for (let index = 0; index < (node.children ?? []).length; index++)
            this.validateNode(node.children[index], result, `${path}.children[${index}]`, depth + 1, seenIds, definition);
        if (typeof registration.validate === "function") {
            const registrationResult = registration.validate(node.properties ?? {}, { registry: this.registry, calculator: this.calculator });
            for (const error of registrationResult?.errors ?? [])
                this.addError(result, error.code, error.path ?? path, error.message, { suggestion: error.suggestion });
        }
    }

    validateNodeProperties(node, registration, result, path) {
        for (const [name, value] of Object.entries(node.properties ?? {})) {
            const definition = registration.inputSchema.properties[name];
            if (!definition) {
                this.addError(result, "UNKNOWN_PROPERTY", `${path}.properties.${name}`, `"${node.type}" has no property "${name}".`, { suggestion: this.suggestProperty(registration, name) });
                continue;
            }
            this.validatePropertyValue(value, definition, result, `${path}.properties.${name}`);
        }
        for (const definition of Object.values(registration.inputSchema.properties)) {
            if (!definition.required)
                continue;
            const hasProperty = (node.properties ?? {})[definition.id] !== undefined || (node.bindings ?? {})[definition.id] !== undefined;
            if (!hasProperty)
                this.addError(result, "MISSING_REQUIRED_PROPERTY", `${path}.properties.${definition.id}`, `Property "${definition.id}" is required by "${node.type}".`, { expected: definition.valueType });
        }
    }

    validatePropertyValue(value, definition, result, path) {
        if (BlockBindings.isBinding(value)) {
            this.validateBinding(value, definition, result, path);
            return;
        }
        if (typeof value === "string" && value.startsWith("token:"))
            return;
        if (definition.valueType === "number" && value !== null && !Number.isFinite(Number(value))) {
            this.addError(result, "INVALID_VALUE_TYPE", path, `Property "${definition.id}" expects a number.`, { expected: "number" });
            return;
        }
        if (definition.valueType === "boolean" && typeof value !== "boolean")
            this.addError(result, "INVALID_VALUE_TYPE", path, `Property "${definition.id}" expects a boolean.`, { expected: "boolean" });
        if (definition.enumValues && !definition.enumValues.includes(value))
            this.addError(result, "INVALID_ENUM_VALUE", path, `"${value}" is not allowed for "${definition.id}".`, { expected: definition.enumValues.join(", "), suggestion: definition.enumValues[0] });
        if (definition.valueType === "number" && Number.isFinite(Number(value))) {
            const numeric = Number(value);
            if (Number.isFinite(definition.minimum) && numeric < definition.minimum)
                this.addError(result, "VALUE_OUT_OF_RANGE", path, `"${definition.id}" must be at least ${definition.minimum}.`, { expected: `>= ${definition.minimum}`, suggestion: definition.minimum });
            if (Number.isFinite(definition.maximum) && numeric > definition.maximum)
                this.addError(result, "VALUE_OUT_OF_RANGE", path, `"${definition.id}" must be at most ${definition.maximum}.`, { expected: `<= ${definition.maximum}`, suggestion: definition.maximum });
        }
    }

    validateNodeBindings(node, registration, result, path) {
        for (const [name, binding] of Object.entries(node.bindings ?? {})) {
            const definition = registration.inputSchema.properties[name];
            if (!definition) {
                this.addError(result, "UNKNOWN_PROPERTY", `${path}.bindings.${name}`, `"${node.type}" has no property "${name}" to bind.`, { suggestion: this.suggestProperty(registration, name) });
                continue;
            }
            if (!definition.bindable) {
                this.addError(result, "PROPERTY_NOT_BINDABLE", `${path}.bindings.${name}`, `Property "${name}" of "${node.type}" cannot be bound.`);
                continue;
            }
            if (!BlockBindings.isBinding(binding)) {
                this.addError(result, "INVALID_BINDING", `${path}.bindings.${name}`, "A binding must be one of constant, parameter, variable, expression, formula, token or format.", { expected: BlockBindings.kinds.join(", ") });
                continue;
            }
            this.validateBinding(binding, definition, result, `${path}.bindings.${name}`);
        }
    }

    validateBinding(binding, definition, result, path) {
        const kind = BlockBindings.getKind(binding);
        if (kind === "variable")
            this.validateVariableReference(binding.variable, result, path);
        if (kind === "expression")
            this.validateExpression(binding.expression, result, path, []);
        if (kind === "formula") {
            const inputNames = Object.keys(binding.inputs ?? {});
            this.validateExpression(binding.formula, result, path, inputNames);
            for (const [name, inputBinding] of Object.entries(binding.inputs ?? {})) {
                if (BlockBindings.isBinding(inputBinding))
                    this.validateBinding(inputBinding, { id: name, valueType: "number", bindable: true }, result, `${path}.inputs.${name}`);
            }
        }
        if (kind === "format")
            this.validateBinding(binding.format, { id: definition.id, valueType: "number", bindable: true }, result, `${path}.format`);
        if (kind === "token" && !new BlockTokens().has(binding.token))
            this.addWarning(result, "UNKNOWN_TOKEN", path, `"${binding.token}" is not a known design token.`);
        if ((kind === "variable" || kind === "expression" || kind === "formula") && definition.valueType === "string" && definition.id !== "text")
            this.addWarning(result, "BINDING_TYPE_MISMATCH", path, `Property "${definition.id}" is a ${definition.valueType}; a numeric binding will be converted to text.`, { expected: definition.valueType });
    }

    validateVariableReference(name, result, path) {
        const termName = String(name ?? "");
        if (termName === "") {
            this.addError(result, "MISSING_VARIABLE", path, "A variable binding needs a variable name.", { expected: "string" });
            return;
        }
        if (Number.isFinite(Number(termName)))
            return;
        if (!this.calculator) {
            this.addWarning(result, "VARIABLE_NOT_CHECKED", path, `The variable "${termName}" could not be checked because no model is loaded.`);
            return;
        }
        if (this.calculator.isTerm(termName))
            return;
        this.addError(result, "UNKNOWN_VARIABLE", path, `The variable "${termName}" does not exist in the current model.`, { expected: "an existing model variable", suggestion: this.suggestVariable(termName) });
    }

    validateExpression(latex, result, path, boundInputNames) {
        const text = String(latex ?? "");
        if (text.trim() === "") {
            this.addError(result, "EMPTY_EXPRESSION", path, "An expression binding needs an expression.", { expected: "LaTeX expression" });
            return;
        }
        if (text.length > BlockCompiler.limits.maxExpressionLength) {
            this.addError(result, "EXPRESSION_TOO_COMPLEX", path, `Expressions are limited to ${BlockCompiler.limits.maxExpressionLength} characters.`);
            return;
        }
        const bindings = this.compiler.bindings;
        if (!bindings.getParser()) {
            this.addWarning(result, "EXPRESSION_NOT_CHECKED", path, "The expression could not be checked because no model is loaded.");
            return;
        }
        if (!bindings.isValidExpression(text)) {
            this.addError(result, "INVALID_EXPRESSION", path, bindings.getParseError(text) ?? "The expression could not be parsed.", { expected: "valid Modellus LaTeX expression" });
            return;
        }
        for (const name of bindings.collectExpressionVariables(text)) {
            if (boundInputNames.includes(name))
                continue;
            this.validateVariableReference(name, result, path);
        }
    }

    validateNodeParameters(node, registration, result, path) {
        if (registration.category !== "component")
            return;
        for (const [name, value] of Object.entries(node.parameters ?? {})) {
            const parameter = (registration.parameters ?? []).find(entry => entry.id === name);
            if (!parameter) {
                this.addError(result, "UNKNOWN_PARAMETER", `${path}.parameters.${name}`, `Component "${node.type}" has no parameter "${name}".`, { suggestion: this.suggestParameter(registration, name) });
                continue;
            }
            // The pass-through an instance carries for every parameter — { parameter: "<its own
            // id>" } — is not a value set on the object: it is how the shape's own property reaches
            // it, and a parameter the object keeps for itself has one like every other.
            if (parameter.agentAccessible === false && value?.parameter !== name)
                this.addWarning(result, "PARAMETER_NOT_AGENT_ACCESSIBLE", `${path}.parameters.${name}`, `Parameter "${name}" is not meant to be set automatically.`);
            this.validatePropertyValue(value, Object.assign({ bindable: parameter.bindable !== false }, parameter), result, `${path}.parameters.${name}`);
        }
        for (const parameter of registration.parameters ?? []) {
            if (parameter.required && (node.parameters ?? {})[parameter.id] === undefined)
                this.addError(result, "MISSING_REQUIRED_PARAMETER", `${path}.parameters.${parameter.id}`, `Parameter "${parameter.id}" is required by "${node.type}".`, { expected: parameter.valueType });
        }
    }

    validateNodeModifiers(node, result, path) {
        for (let index = 0; index < (node.modifiers ?? []).length; index++) {
            const modifier = node.modifiers[index];
            const modifierPath = `${path}.modifiers[${index}]`;
            if (!modifier || typeof modifier !== "object") {
                this.addError(result, "INVALID_MODIFIER", modifierPath, "Modifier must be an object with a type.", { expected: "object" });
                continue;
            }
            const registration = this.registry.get(modifier.type);
            if (!registration || registration.category !== "modifier") {
                this.addError(result, "UNKNOWN_MODIFIER", `${modifierPath}.type`, `"${modifier.type}" is not a registered modifier.`, { suggestion: this.suggestType(modifier.type, "modifier") });
                continue;
            }
            for (const [name, value] of Object.entries(modifier)) {
                if (name === "type")
                    continue;
                const definition = registration.inputSchema.properties[name];
                if (!definition) {
                    this.addError(result, "UNKNOWN_PROPERTY", `${modifierPath}.${name}`, `Modifier "${modifier.type}" has no property "${name}".`, { suggestion: this.suggestProperty(registration, name) });
                    continue;
                }
                this.validatePropertyValue(value, definition, result, `${modifierPath}.${name}`);
            }
        }
    }

    validateNodeBehaviours(node, registration, result, path) {
        for (let index = 0; index < (node.behaviours ?? []).length; index++) {
            const behaviour = node.behaviours[index];
            const behaviourPath = `${path}.behaviours[${index}]`;
            if (!behaviour || typeof behaviour !== "object") {
                this.addError(result, "INVALID_BEHAVIOUR", behaviourPath, "Behaviour must be an object with a type.", { expected: "object" });
                continue;
            }
            const behaviourRegistration = this.registry.get(behaviour.type);
            if (!behaviourRegistration || behaviourRegistration.category !== "behaviour") {
                this.addError(result, "UNKNOWN_BEHAVIOUR", `${behaviourPath}.type`, `"${behaviour.type}" is not a registered behaviour.`, { suggestion: this.suggestType(behaviour.type, "behaviour") });
                continue;
            }
            if (!this.registry.supportsBehaviour(node.type, behaviour.type))
                this.addError(result, "BEHAVIOUR_NOT_SUPPORTED", behaviourPath, `"${node.type}" does not support the behaviour "${behaviour.type}".`);
            if (behaviour.variable !== undefined)
                this.validateVariableReference(behaviour.variable, result, `${behaviourPath}.variable`);
        }
    }

    applyCompilationDiagnostics(compilation, result) {
        for (const diagnostic of compilation.diagnostics) {
            if (diagnostic.severity === "warning")
                this.addWarning(result, diagnostic.code, diagnostic.path, diagnostic.message);
            else
                this.addError(result, diagnostic.code, diagnostic.path, diagnostic.message);
        }
    }

    validateRuntimeSafety(compilation, result) {
        if (compilation.stats.nodeCount > BlockCompiler.limits.maxNodes)
            this.addError(result, "NODE_LIMIT_EXCEEDED", "root", `A compiled object may contain at most ${BlockCompiler.limits.maxNodes} nodes.`);
        if (compilation.stats.maxDepth > BlockCompiler.limits.maxDepth)
            this.addError(result, "NESTING_LIMIT_EXCEEDED", "root", `Nesting is limited to ${BlockCompiler.limits.maxDepth} levels.`);
        if (compilation.stats.nodeCount > 400)
            this.addWarning(result, "HIGH_UPDATE_COST", "root", `This object compiles to ${compilation.stats.nodeCount} nodes and may be slow to animate.`);
    }

    validateVisualOutcome(compilation, result, context) {
        const nodes = BlockRenderer.flatten(compilation.nodes);
        const drawable = nodes.filter(node => node.kind === "element");
        if (drawable.length === 0) {
            this.addError(result, "EMPTY_OBJECT", "root", "The object compiles to nothing that can be drawn.", { suggestion: "Add at least one primitive." });
            return;
        }
        const visible = drawable.filter(node => this.isNodeVisible(node));
        if (visible.length === 0)
            this.addError(result, "INVISIBLE_OBJECT", "root", "Every drawn node is transparent, has no fill and no stroke, or has zero size.", { suggestion: "Set a fill or a stroke colour." });
        const width = Number(context.width) || 180;
        const height = Number(context.height) || 180;
        for (const node of drawable) {
            const bounds = this.estimateBounds(node);
            if (!bounds)
                continue;
            if (bounds.width === 0 && bounds.height === 0 && node.behaviours?.length)
                this.addError(result, "ZERO_SIZE_INTERACTIVE_TARGET", node.sourcePath, "An interactive node has no size and cannot be clicked or dragged.");
            const isFarOutside = bounds.x > width * 3 || bounds.y > height * 3 || bounds.x + bounds.width < -width * 2 || bounds.y + bounds.height < -height * 2;
            if (isFarOutside)
                this.addWarning(result, "NODE_OUTSIDE_BOUNDS", node.sourcePath, "A node is placed far outside the object bounds and will not be visible.");
        }
    }

    isNodeVisible(node) {
        const attributes = node.attributes ?? {};
        const opacity = attributes.opacity === undefined ? 1 : Number(attributes.opacity);
        if (Number.isFinite(opacity) && opacity <= 0)
            return false;
        const fill = attributes.fill ?? "none";
        const stroke = attributes.stroke ?? "none";
        const hasPaint = (fill !== "none" && fill !== "transparent" && fill !== "#00000000") || (stroke !== "none" && stroke !== "transparent" && stroke !== "#00000000");
        if (!hasPaint && node.tag !== "image" && node.tag !== "text")
            return false;
        const bounds = this.estimateBounds(node);
        if (bounds && bounds.width === 0 && bounds.height === 0 && node.tag !== "text")
            return false;
        return true;
    }

    estimateBounds(node) {
        const attributes = node.attributes ?? {};
        if (node.tag === "circle") {
            const radius = Number(attributes.r) || 0;
            return { x: Number(attributes.cx) - radius, y: Number(attributes.cy) - radius, width: radius * 2, height: radius * 2 };
        }
        if (node.tag === "ellipse") {
            const radiusX = Number(attributes.rx) || 0;
            const radiusY = Number(attributes.ry) || 0;
            return { x: Number(attributes.cx) - radiusX, y: Number(attributes.cy) - radiusY, width: radiusX * 2, height: radiusY * 2 };
        }
        if (node.tag === "rect" || node.tag === "image")
            return { x: Number(attributes.x) || 0, y: Number(attributes.y) || 0, width: Number(attributes.width) || 0, height: Number(attributes.height) || 0 };
        if (node.tag === "line") {
            const x1 = Number(attributes.x1) || 0;
            const y1 = Number(attributes.y1) || 0;
            const x2 = Number(attributes.x2) || 0;
            const y2 = Number(attributes.y2) || 0;
            return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
        }
        if (node.tag === "text") {
            const fontSize = Number(attributes["font-size"]) || 11;
            const width = String(node.text ?? "").length * fontSize * 0.6;
            return { x: Number(attributes.x) || 0, y: (Number(attributes.y) || 0) - fontSize / 2, width: width, height: fontSize };
        }
        if (node.tag === "polygon" || node.tag === "polyline") {
            const points = String(attributes.points ?? "").trim();
            if (points === "")
                return { x: 0, y: 0, width: 0, height: 0 };
            const parsed = points.split(/\s+/).map(pair => {
                const [x, y] = pair.split(",").map(Number);
                return { x: x, y: y };
            });
            return BlockGeometry.boundsOfPoints(parsed);
        }
        return null;
    }

    suggestType(type, category = null) {
        const candidates = this.registry.list(category, { agentAccessibleOnly: false }).map(registration => registration.type);
        return this.findClosest(String(type ?? ""), candidates);
    }

    suggestProperty(registration, name) {
        return this.findClosest(String(name ?? ""), Object.keys(registration.inputSchema.properties));
    }

    suggestParameter(registration, name) {
        return this.findClosest(String(name ?? ""), (registration.parameters ?? []).map(parameter => parameter.id));
    }

    suggestVariable(name) {
        if (!this.calculator)
            return null;
        return this.findClosest(String(name ?? ""), this.calculator.getTermsNames());
    }

    findClosest(value, candidates) {
        let best = null;
        let bestDistance = Infinity;
        const lowerValue = value.toLowerCase();
        for (const candidate of candidates) {
            const distance = this.editDistance(lowerValue, String(candidate).toLowerCase());
            if (distance < bestDistance) {
                bestDistance = distance;
                best = candidate;
            }
        }
        if (best === null)
            return null;
        if (bestDistance > Math.max(2, Math.floor(value.length / 2)))
            return null;
        return best;
    }

    editDistance(first, second) {
        const rows = first.length + 1;
        const columns = second.length + 1;
        let previousRow = new Array(columns);
        for (let column = 0; column < columns; column++)
            previousRow[column] = column;
        for (let row = 1; row < rows; row++) {
            const currentRow = new Array(columns);
            currentRow[0] = row;
            for (let column = 1; column < columns; column++) {
                const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
                currentRow[column] = Math.min(previousRow[column] + 1, currentRow[column - 1] + 1, previousRow[column - 1] + substitutionCost);
            }
            previousRow = currentRow;
        }
        return previousRow[columns - 1];
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockValidator;
