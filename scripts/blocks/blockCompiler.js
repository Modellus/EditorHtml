class BlockCompiler {
    static limits = {
        maxNodes: 2000,
        maxDepth: 16,
        maxComponentDepth: 8,
        maxRepeatCount: 720,
        maxExpressionLength: 512
    };

    // The limits are the defaults every object is held to. A host that knows what it is drawing
    // may raise them for itself — a chart of a long run legitimately draws a marker per point —
    // without loosening the bound for everything else.
    constructor(registry = BlockRegistry, bindings = null, limits = null) {
        this.registry = registry;
        this.bindings = bindings ?? new BlockBindings(null);
        this.limits = Object.assign({}, BlockCompiler.limits, limits ?? {});
    }

    setCalculator(calculator) {
        this.bindings.setCalculator(calculator);
    }

    compile(definition, context = {}) {
        const startedAt = Date.now();
        const compilation = {
            nodes: [],
            diagnostics: [],
            stats: { nodeCount: 0, maxDepth: 0, componentsUsed: [], blocksUsed: [], durationMs: 0 },
            context: this.createRootContext(definition, context)
        };
        const root = definition?.root ?? null;
        if (!root)
            this.addDiagnostic(compilation, "MISSING_ROOT", "root", "The object definition has no root node.");
        else
            compilation.nodes = this.compileNode(root, compilation, compilation.context, "root", 0, 0);
        compilation.stats.durationMs = Date.now() - startedAt;
        return compilation;
    }

    createRootContext(definition, context) {
        const tokens = context.tokens ?? new BlockTokens(definition?.preset ?? "standard", context.tokenOverrides ?? null);
        const parameters = Object.assign({}, context.parameters ?? {});
        return {
            tokens: tokens,
            parameters: parameters,
            width: Number(context.width) || tokens.getNumber("size.default.width", 180),
            height: Number(context.height) || tokens.getNumber("size.default.height", 180),
            caseNumber: Number(context.caseNumber) || 1,
            componentStack: [],
            componentDepth: 0
        };
    }

    createChildContext(context, overrides) {
        return Object.assign({}, context, overrides);
    }

    attachContextResolvers(context) {
        context.resolve = (binding, fallbackValue = null) => this.bindings.resolve(binding, context, fallbackValue);
        context.resolveNumber = (binding, fallbackValue = 0) => this.bindings.resolveNumber(binding, context, fallbackValue);
        context.resolveText = (binding, fallbackValue = "") => this.bindings.resolveText(binding, context, fallbackValue);
        context.resolveTermValue = (nameOrNumber, fallbackValue = 0) => {
            const value = this.bindings.resolveTermValue(nameOrNumber, context.caseNumber);
            return Number.isFinite(value) ? value : fallbackValue;
        };
        return context;
    }

    addDiagnostic(compilation, code, path, message, severity = "error") {
        compilation.diagnostics.push({ code: code, path: path, message: message, severity: severity });
    }

    trackBlockUsage(compilation, type, category) {
        if (!compilation.stats.blocksUsed.includes(type))
            compilation.stats.blocksUsed.push(type);
        if (category === "component" && !compilation.stats.componentsUsed.includes(type))
            compilation.stats.componentsUsed.push(type);
    }

    compileNode(node, compilation, context, path, depth, siblingIndex) {
        if (compilation.stats.nodeCount >= this.limits.maxNodes) {
            this.addDiagnostic(compilation, "NODE_LIMIT_EXCEEDED", path, `A compiled object may contain at most ${this.limits.maxNodes} nodes.`);
            return [];
        }
        if (depth > this.limits.maxDepth) {
            this.addDiagnostic(compilation, "NESTING_LIMIT_EXCEEDED", path, `Nesting is limited to ${this.limits.maxDepth} levels.`);
            return [];
        }
        if (!node || typeof node !== "object") {
            this.addDiagnostic(compilation, "INVALID_NODE", path, "Node is not an object.");
            return [];
        }
        const registration = this.registry.get(node.type);
        if (!registration) {
            this.addDiagnostic(compilation, "UNKNOWN_NODE_TYPE", path, `"${node.type}" is not a registered building block.`);
            return [];
        }
        if (registration.category !== "primitive" && registration.category !== "component") {
            this.addDiagnostic(compilation, "INVALID_NODE_CATEGORY", path, `"${node.type}" is a ${registration.category} and cannot be used as a node.`);
            return [];
        }
        compilation.stats.maxDepth = Math.max(compilation.stats.maxDepth, depth);
        this.trackBlockUsage(compilation, registration.type, registration.category);
        const repeatModifier = this.findRepeatModifier(node);
        if (repeatModifier)
            return this.compileRepeatedNode(node, repeatModifier, compilation, context, path, depth, siblingIndex);
        if (registration.category === "component")
            return this.compileComponentNode(node, registration, compilation, context, path, depth, siblingIndex);
        return this.compilePrimitiveNode(node, registration, compilation, context, path, depth, siblingIndex);
    }

    findRepeatModifier(node) {
        return (node.modifiers ?? []).find(modifier => modifier?.type === "repeat") ?? null;
    }

    compileRepeatedNode(node, repeatModifier, compilation, context, path, depth, siblingIndex) {
        const repeatInput = this.resolveModifierInput(repeatModifier, compilation, context, `${path}.repeat`);
        const requestedCount = Math.floor(Number(repeatInput.count) || 0);
        if (requestedCount > this.limits.maxRepeatCount) {
            this.addDiagnostic(compilation, "REPEAT_LIMIT_EXCEEDED", path, `Repeat count ${requestedCount} exceeds the limit of ${this.limits.maxRepeatCount}.`);
            return [];
        }
        const count = Math.max(0, requestedCount);
        const singleNode = Object.assign({}, node, { modifiers: (node.modifiers ?? []).filter(modifier => modifier !== repeatModifier) });
        const nodes = [];
        for (let index = 0; index < count; index++) {
            const copyContext = this.createChildContext(context, {
                parameters: Object.assign({}, context.parameters, { $index: index, $count: count })
            });
            const copyPath = `${path}[${index}]`;
            const compiled = this.compileNode(singleNode, compilation, copyContext, copyPath, depth, siblingIndex);
            const repeatTransform = this.buildRepeatTransform(repeatInput, index);
            for (const compiledNode of compiled) {
                compiledNode.id = `${compiledNode.id}#${index}`;
                if (repeatTransform !== "")
                    compiledNode.transform = `${repeatTransform} ${compiledNode.transform}`.trim();
                nodes.push(compiledNode);
            }
        }
        return nodes;
    }

    buildRepeatTransform(repeatInput, index) {
        const parts = [];
        const angleStep = Number(repeatInput.angleStep) || 0;
        const angleStart = Number(repeatInput.angleStart) || 0;
        const angle = angleStart + angleStep * index;
        if (angle !== 0)
            parts.push(`rotate(${angle} ${Number(repeatInput.centerX) || 0} ${Number(repeatInput.centerY) || 0})`);
        const offsetX = (Number(repeatInput.dx) || 0) * index;
        const offsetY = (Number(repeatInput.dy) || 0) * index;
        if (offsetX !== 0 || offsetY !== 0)
            parts.push(`translate(${offsetX} ${offsetY})`);
        return parts.join(" ");
    }

    compilePrimitiveNode(node, registration, compilation, context, path, depth, siblingIndex) {
        const properties = this.resolveNodeProperties(node, registration, compilation, context, path);
        const accumulator = this.applyModifiers(node, compilation, context, path);
        if (!accumulator.visible || properties.visible === false)
            return [];
        const nodeId = this.buildNodeId(node, path, siblingIndex);
        const rendered = registration.render ? registration.render(properties, context) : { tag: "g", attributes: {} };
        const compiledNode = {
            id: nodeId,
            sourceId: node.id ?? null,
            sourceType: registration.type,
            sourceComponent: null,
            sourceComponentId: null,
            sourcePath: path,
            kind: registration.supportsChildren ? "group" : "element",
            tag: rendered.tag,
            attributes: Object.assign({}, rendered.attributes, accumulator.style),
            text: rendered.text ?? null,
            transform: BlockModifiers.buildTransform(accumulator),
            order: accumulator.order,
            behaviours: this.resolveBehaviours(node, compilation, context, path),
            children: []
        };
        compilation.stats.nodeCount++;
        if (registration.supportsChildren)
            compiledNode.children = this.compileChildren(node.children ?? [], compilation, context, path, depth + 1);
        return [compiledNode];
    }

    compileComponentNode(node, registration, compilation, context, path, depth, siblingIndex) {
        if (context.componentStack.includes(registration.type)) {
            this.addDiagnostic(compilation, "CIRCULAR_COMPONENT_REFERENCE", path, `Component "${registration.type}" references itself through ${context.componentStack.join(" → ")}.`);
            return [];
        }
        if (context.componentDepth >= this.limits.maxComponentDepth) {
            this.addDiagnostic(compilation, "COMPONENT_DEPTH_EXCEEDED", path, `Component nesting is limited to ${this.limits.maxComponentDepth} levels.`);
            return [];
        }
        if (typeof registration.create !== "function") {
            this.addDiagnostic(compilation, "COMPONENT_NOT_BUILDABLE", path, `Component "${registration.type}" has no factory.`);
            return [];
        }
        const parameters = this.resolveComponentParameters(node, registration, compilation, context, path);
        const componentContext = this.createChildContext(context, {
            parameters: parameters,
            componentStack: context.componentStack.concat([registration.type]),
            componentDepth: context.componentDepth + 1
        });
        this.attachContextResolvers(componentContext);
        let producedNode = null;
        try {
            producedNode = registration.create(parameters, componentContext);
        } catch (error) {
            this.addDiagnostic(compilation, "COMPONENT_BUILD_FAILED", path, `Component "${registration.type}" failed to build: ${error?.message ?? error}`);
            return [];
        }
        if (!producedNode) {
            this.addDiagnostic(compilation, "COMPONENT_BUILD_EMPTY", path, `Component "${registration.type}" produced no nodes.`);
            return [];
        }
        const accumulator = this.applyModifiers(node, compilation, context, path);
        if (!accumulator.visible)
            return [];
        const compiled = this.compileNode(producedNode, compilation, componentContext, `${this.buildNodeId(node, path, siblingIndex)}/${registration.type}`, depth + 1, siblingIndex);
        for (const compiledNode of compiled)
            this.tagComponentSource(compiledNode, registration.type, node.id ?? null);
        const wrapperTransform = BlockModifiers.buildTransform(accumulator);
        if (wrapperTransform === "" && Object.keys(accumulator.style).length === 0 && compiled.length === 1)
            return compiled;
        compilation.stats.nodeCount++;
        return [{
            id: this.buildNodeId(node, path, siblingIndex),
            sourceId: node.id ?? null,
            sourceType: registration.type,
            sourceComponent: null,
            sourceComponentId: null,
            sourcePath: path,
            kind: "group",
            tag: "g",
            attributes: Object.assign({}, accumulator.style),
            text: null,
            transform: wrapperTransform,
            order: accumulator.order,
            behaviours: this.resolveBehaviours(node, compilation, context, path),
            children: compiled
        }];
    }

    tagComponentSource(compiledNode, componentType, componentNodeId) {
        if (compiledNode.sourceComponent)
            return;
        compiledNode.sourceComponent = componentType;
        compiledNode.sourceComponentId = componentNodeId;
    }

    compileChildren(children, compilation, context, path, depth) {
        const compiled = [];
        for (let index = 0; index < children.length; index++)
            compiled.push(...this.compileNode(children[index], compilation, context, `${path}.children[${index}]`, depth, index));
        return compiled.sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
    }

    buildNodeId(node, path, siblingIndex) {
        if (typeof node.id === "string" && node.id !== "")
            return `${path}:${node.id}`;
        return `${path}:${node.type}:${siblingIndex}`;
    }

    resolveNodeProperties(node, registration, compilation, context, path) {
        const resolved = {};
        const declared = registration.inputSchema.properties;
        const supplied = node.properties ?? {};
        for (const [name, definition] of Object.entries(declared))
            resolved[name] = this.resolvePropertyValue(supplied[name], definition, compilation, context, `${path}.properties.${name}`);
        for (const name of Object.keys(supplied)) {
            if (!declared[name])
                this.addDiagnostic(compilation, "UNKNOWN_PROPERTY", `${path}.properties.${name}`, `"${node.type}" has no property "${name}".`, "warning");
        }
        const bindings = node.bindings ?? {};
        for (const [name, binding] of Object.entries(bindings)) {
            const definition = declared[name];
            if (!definition) {
                this.addDiagnostic(compilation, "UNKNOWN_PROPERTY", `${path}.bindings.${name}`, `"${node.type}" has no property "${name}" to bind.`);
                continue;
            }
            if (!definition.bindable) {
                this.addDiagnostic(compilation, "PROPERTY_NOT_BINDABLE", `${path}.bindings.${name}`, `Property "${name}" of "${node.type}" cannot be bound.`);
                continue;
            }
            resolved[name] = this.resolvePropertyValue(binding, definition, compilation, context, `${path}.bindings.${name}`);
        }
        return resolved;
    }

    resolvePropertyValue(value, definition, compilation, context, path) {
        const fallbackValue = definition.defaultValue;
        if (value === undefined)
            return fallbackValue;
        let resolved = value;
        if (BlockBindings.isBinding(value))
            resolved = this.bindings.resolve(value, context, fallbackValue);
        if (context.tokens.isTokenReference(resolved))
            resolved = context.tokens.resolveValue(resolved, fallbackValue);
        return this.coercePropertyValue(resolved, definition, compilation, path, fallbackValue);
    }

    coercePropertyValue(value, definition, compilation, path, fallbackValue) {
        if (value === null || value === undefined)
            return fallbackValue;
        if (definition.valueType === "number") {
            const numeric = Number(value);
            if (!Number.isFinite(numeric))
                return fallbackValue;
            if (Number.isFinite(definition.minimum) && numeric < definition.minimum)
                return definition.minimum;
            if (Number.isFinite(definition.maximum) && numeric > definition.maximum)
                return definition.maximum;
            return numeric;
        }
        if (definition.valueType === "boolean") {
            if (typeof value === "boolean")
                return value;
            return value === "true" || value === 1;
        }
        if (definition.valueType === "string" || definition.valueType === "colour" || definition.valueType === "variable" || definition.valueType === "expression") {
            const text = String(value);
            if (definition.enumValues && !definition.enumValues.includes(text)) {
                this.addDiagnostic(compilation, "INVALID_ENUM_VALUE", path, `"${text}" is not one of ${definition.enumValues.join(", ")}.`, "warning");
                return fallbackValue;
            }
            return text;
        }
        return value;
    }

    resolveComponentParameters(node, registration, compilation, context, path) {
        const resolved = {};
        for (const parameter of registration.parameters ?? [])
            resolved[parameter.id] = parameter.defaultValue;
        const supplied = node.parameters ?? {};
        for (const [name, value] of Object.entries(supplied)) {
            const parameter = (registration.parameters ?? []).find(entry => entry.id === name);
            if (!parameter) {
                this.addDiagnostic(compilation, "UNKNOWN_PARAMETER", `${path}.parameters.${name}`, `Component "${registration.type}" has no parameter "${name}".`, "warning");
                continue;
            }
            resolved[name] = this.resolveParameterValue(value, parameter, compilation, context, `${path}.parameters.${name}`);
        }
        resolved.$width = context.width;
        resolved.$height = context.height;
        return resolved;
    }

    resolveParameterValue(value, parameter, compilation, context, path) {
        let resolved = value;
        if (BlockBindings.isBinding(value))
            resolved = this.bindings.resolve(value, context, parameter.defaultValue);
        if (context.tokens.isTokenReference(resolved))
            resolved = context.tokens.resolveValue(resolved, parameter.defaultValue);
        if (resolved === undefined || resolved === null)
            return parameter.defaultValue;
        if (parameter.valueType === "number") {
            const numeric = Number(resolved);
            if (!Number.isFinite(numeric))
                return parameter.defaultValue;
            if (Number.isFinite(parameter.minimum) && numeric < parameter.minimum)
                return parameter.minimum;
            if (Number.isFinite(parameter.maximum) && numeric > parameter.maximum)
                return parameter.maximum;
            return numeric;
        }
        if (parameter.valueType === "boolean")
            return resolved === true || resolved === "true" || resolved === 1;
        return resolved;
    }

    resolveModifierInput(modifier, compilation, context, path) {
        const registration = this.registry.get(modifier.type);
        if (!registration || registration.category !== "modifier") {
            this.addDiagnostic(compilation, "UNKNOWN_MODIFIER", path, `"${modifier.type}" is not a registered modifier.`);
            return {};
        }
        const resolved = {};
        for (const [name, definition] of Object.entries(registration.inputSchema.properties))
            resolved[name] = this.resolvePropertyValue(modifier[name], definition, compilation, context, `${path}.${name}`);
        return resolved;
    }

    applyModifiers(node, compilation, context, path) {
        const accumulator = BlockModifiers.createAccumulator();
        const modifiers = node.modifiers ?? [];
        for (let index = 0; index < modifiers.length; index++) {
            const modifier = modifiers[index];
            if (!modifier || typeof modifier !== "object") {
                this.addDiagnostic(compilation, "INVALID_MODIFIER", `${path}.modifiers[${index}]`, "Modifier is not an object.");
                continue;
            }
            if (modifier.type === "repeat")
                continue;
            const registration = this.registry.get(modifier.type);
            if (!registration || registration.category !== "modifier") {
                this.addDiagnostic(compilation, "UNKNOWN_MODIFIER", `${path}.modifiers[${index}]`, `"${modifier.type}" is not a registered modifier.`);
                continue;
            }
            const input = this.resolveModifierInput(modifier, compilation, context, `${path}.modifiers[${index}]`);
            if (typeof registration.apply === "function")
                registration.apply(input, accumulator, context);
        }
        return accumulator;
    }

    resolveBehaviours(node, compilation, context, path) {
        const resolved = [];
        const behaviours = node.behaviours ?? [];
        for (let index = 0; index < behaviours.length; index++) {
            const behaviour = behaviours[index];
            if (!behaviour || typeof behaviour !== "object") {
                this.addDiagnostic(compilation, "INVALID_BEHAVIOUR", `${path}.behaviours[${index}]`, "Behaviour is not an object.");
                continue;
            }
            const registration = this.registry.get(behaviour.type);
            if (!registration || registration.category !== "behaviour") {
                this.addDiagnostic(compilation, "UNKNOWN_BEHAVIOUR", `${path}.behaviours[${index}]`, `"${behaviour.type}" is not a registered behaviour.`);
                continue;
            }
            if (!this.registry.supportsBehaviour(node.type, behaviour.type)) {
                this.addDiagnostic(compilation, "BEHAVIOUR_NOT_SUPPORTED", `${path}.behaviours[${index}]`, `"${node.type}" does not support the behaviour "${behaviour.type}".`);
                continue;
            }
            const input = {};
            for (const [name, definition] of Object.entries(registration.inputSchema.properties))
                input[name] = this.resolvePropertyValue(behaviour[name], definition, compilation, context, `${path}.behaviours[${index}].${name}`);
            resolved.push({ type: behaviour.type, input: input });
        }
        return resolved;
    }

    collectDependencies(definition, context = {}) {
        const variables = new Set();
        const parameters = new Set();
        this.collectNodeDependencies(definition?.root ?? null, variables, parameters, 0);
        return { variables: Array.from(variables), parameters: Array.from(parameters) };
    }

    collectNodeDependencies(node, variables, parameters, depth) {
        if (!node || typeof node !== "object" || depth > this.limits.maxDepth)
            return;
        const collections = [node.bindings ?? {}, node.parameters ?? {}, node.properties ?? {}];
        for (const collection of collections) {
            for (const value of Object.values(collection)) {
                if (!BlockBindings.isBinding(value))
                    continue;
                const dependencies = this.bindings.getBindingDependencies(value);
                dependencies.variables.forEach(name => variables.add(name));
                dependencies.parameters.forEach(name => parameters.add(name));
            }
        }
        for (const modifier of node.modifiers ?? []) {
            for (const value of Object.values(modifier ?? {})) {
                if (!BlockBindings.isBinding(value))
                    continue;
                const dependencies = this.bindings.getBindingDependencies(value);
                dependencies.variables.forEach(name => variables.add(name));
                dependencies.parameters.forEach(name => parameters.add(name));
            }
        }
        for (const child of node.children ?? [])
            this.collectNodeDependencies(child, variables, parameters, depth + 1);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockCompiler;
