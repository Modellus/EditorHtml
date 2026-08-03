class BlockAgentTools {
    static toolNames = [
        "list_building_blocks",
        "search_building_blocks",
        "get_building_block_schema",
        "list_model_variables",
        "create_object_draft",
        "get_object_draft",
        "add_primitive",
        "add_component",
        "add_group",
        "add_child",
        "set_property",
        "set_parameter",
        "apply_modifier",
        "add_behaviour",
        "bind_variable",
        "bind_expression",
        "validate_object",
        "render_object_preview",
        "insert_object",
        "save_custom_component"
    ];

    constructor(host = null, registry = BlockRegistry) {
        this.host = host;
        this.registry = registry;
        this.drafts = new Map();
        this.nodeCounter = 0;
    }

    getCalculator() {
        return this.host?.board?.calculator ?? null;
    }

    getCompiler() {
        if (!this._compiler)
            this._compiler = new BlockCompiler(this.registry, new BlockBindings(this.getCalculator()));
        this._compiler.setCalculator(this.getCalculator());
        return this._compiler;
    }

    getValidator() {
        if (!this._validator)
            this._validator = new BlockValidator(this.registry, this.getCompiler());
        this._validator.setCalculator(this.getCalculator());
        return this._validator;
    }

    success(payload = {}) {
        return Object.assign({ ok: true }, payload);
    }

    failure(code, message, extra = {}) {
        return { ok: false, errors: [Object.assign({ code: code, message: message }, extra)] };
    }

    execute(toolName, input = {}) {
        if (!BlockAgentTools.toolNames.includes(toolName))
            return this.failure("UNKNOWN_TOOL", `"${toolName}" is not an available tool.`, { path: "tool", suggestion: BlockAgentTools.toolNames.join(", ") });
        const method = this[this.getMethodName(toolName)];
        if (typeof method !== "function")
            return this.failure("TOOL_NOT_IMPLEMENTED", `"${toolName}" has no implementation.`, { path: "tool" });
        try {
            return method.call(this, input ?? {});
        } catch (error) {
            return this.failure("TOOL_FAILED", String(error?.message ?? error), { path: "tool" });
        }
    }

    getMethodName(toolName) {
        return toolName.replace(/_([a-z])/g, (match, character) => character.toUpperCase());
    }

    getToolDefinitions() {
        return BlockAgentTools.toolNames.map(name => ({
            name: name,
            description: this.getToolDescription(name),
            inputSchema: this.getToolInputSchema(name)
        }));
    }

    getToolDescription(toolName) {
        const descriptions = {
            list_building_blocks: "Lists the approved building blocks, optionally filtered by category (primitive, modifier, behaviour, component).",
            search_building_blocks: "Searches the approved building blocks by keyword or capability.",
            get_building_block_schema: "Returns the full schema of one building block: properties, defaults, ranges, parameters, supported behaviours.",
            list_model_variables: "Lists the variables of the currently open Modellus model with their current values.",
            create_object_draft: "Starts a new object draft. Optionally seeds it with a registered component.",
            get_object_draft: "Returns the current draft definition.",
            add_primitive: "Adds a registered primitive node to the draft.",
            add_component: "Adds a registered component node to the draft.",
            add_group: "Adds a group node to the draft.",
            add_child: "Moves an existing draft node under another group node.",
            set_property: "Sets a declared property of a draft node to a constant value.",
            set_parameter: "Sets a declared parameter of a component node in the draft.",
            apply_modifier: "Applies a registered modifier to a draft node.",
            add_behaviour: "Adds a registered behaviour to a draft node.",
            bind_variable: "Binds a node property to a Modellus model variable.",
            bind_expression: "Binds a node property to a Modellus LaTeX expression, optionally mapping expression names to other bindings.",
            validate_object: "Validates the draft and returns structured errors.",
            render_object_preview: "Compiles the draft and returns a standalone SVG preview plus compilation statistics.",
            insert_object: "Inserts the validated draft into the open document as an editable object.",
            save_custom_component: "Registers the validated draft as a reusable custom component."
        };
        return descriptions[toolName] ?? "";
    }

    getToolInputSchema(toolName) {
        const draftId = { type: "string", description: "Identifier returned by create_object_draft." };
        const nodeId = { type: "string", description: "Identifier of a node inside the draft." };
        const schemas = {
            list_building_blocks: { type: "object", properties: { category: { type: "string", enum: BuildingBlockRegistry.categories } } },
            search_building_blocks: { type: "object", properties: { query: { type: "string" }, category: { type: "string", enum: BuildingBlockRegistry.categories } }, required: ["query"] },
            get_building_block_schema: { type: "object", properties: { type: { type: "string" } }, required: ["type"] },
            list_model_variables: { type: "object", properties: {} },
            create_object_draft: { type: "object", properties: { name: { type: "string" }, preset: { type: "string", enum: BlockTokens.getPresetNames() }, componentType: { type: "string" }, request: { type: "string" } }, required: ["name"] },
            get_object_draft: { type: "object", properties: { draftId: draftId }, required: ["draftId"] },
            add_primitive: { type: "object", properties: { draftId: draftId, type: { type: "string" }, parentNodeId: nodeId, id: { type: "string" }, properties: { type: "object" } }, required: ["draftId", "type"] },
            add_component: { type: "object", properties: { draftId: draftId, type: { type: "string" }, parentNodeId: nodeId, id: { type: "string" }, parameters: { type: "object" } }, required: ["draftId", "type"] },
            add_group: { type: "object", properties: { draftId: draftId, parentNodeId: nodeId, id: { type: "string" } }, required: ["draftId"] },
            add_child: { type: "object", properties: { draftId: draftId, parentNodeId: nodeId, nodeId: nodeId }, required: ["draftId", "parentNodeId", "nodeId"] },
            set_property: { type: "object", properties: { draftId: draftId, nodeId: nodeId, property: { type: "string" }, value: {} }, required: ["draftId", "nodeId", "property"] },
            set_parameter: { type: "object", properties: { draftId: draftId, nodeId: nodeId, parameter: { type: "string" }, value: {} }, required: ["draftId", "nodeId", "parameter"] },
            apply_modifier: { type: "object", properties: { draftId: draftId, nodeId: nodeId, type: { type: "string" }, values: { type: "object" } }, required: ["draftId", "nodeId", "type"] },
            add_behaviour: { type: "object", properties: { draftId: draftId, nodeId: nodeId, type: { type: "string" }, values: { type: "object" } }, required: ["draftId", "nodeId", "type"] },
            bind_variable: { type: "object", properties: { draftId: draftId, nodeId: nodeId, property: { type: "string" }, variable: { type: "string" }, case: { type: "number" } }, required: ["draftId", "nodeId", "property", "variable"] },
            bind_expression: { type: "object", properties: { draftId: draftId, nodeId: nodeId, property: { type: "string" }, expression: { type: "string" }, inputs: { type: "object" } }, required: ["draftId", "nodeId", "property", "expression"] },
            validate_object: { type: "object", properties: { draftId: draftId }, required: ["draftId"] },
            render_object_preview: { type: "object", properties: { draftId: draftId, width: { type: "number" }, height: { type: "number" } }, required: ["draftId"] },
            insert_object: { type: "object", properties: { draftId: draftId }, required: ["draftId"] },
            save_custom_component: { type: "object", properties: { draftId: draftId, type: { type: "string" }, displayName: { type: "string" }, description: { type: "string" } }, required: ["draftId", "type"] }
        };
        return schemas[toolName] ?? { type: "object", properties: {} };
    }

    listBuildingBlocks(input) {
        const category = input.category ?? null;
        if (category && !BuildingBlockRegistry.categories.includes(category))
            return this.failure("INVALID_CATEGORY", `"${category}" is not a building-block category.`, { path: "category", expected: BuildingBlockRegistry.categories.join(", ") });
        return this.success({
            blocks: this.registry.list(category, { agentAccessibleOnly: true }).map(registration => ({
                type: registration.type,
                category: registration.category,
                displayName: registration.displayName,
                description: registration.description,
                capabilities: registration.capabilities,
                tags: registration.tags,
                supportsChildren: registration.supportsChildren
            }))
        });
    }

    searchBuildingBlocks(input) {
        return this.success({
            blocks: this.registry.search(input.query, { category: input.category ?? null, agentAccessibleOnly: true }).map(registration => ({
                type: registration.type,
                category: registration.category,
                displayName: registration.displayName,
                description: registration.description,
                capabilities: registration.capabilities
            }))
        });
    }

    getBuildingBlockSchema(input) {
        const registration = this.registry.get(input.type);
        if (!registration || !registration.agentAccessible)
            return this.failure("UNKNOWN_BLOCK_TYPE", `"${input.type}" is not an available building block.`, { path: "type", suggestion: this.getValidator().suggestType(input.type) });
        return this.success({ block: this.registry.describe(input.type) });
    }

    listModelVariables() {
        const calculator = this.getCalculator();
        if (!calculator)
            return this.failure("NO_MODEL", "No model is currently open.", { path: "" });
        return this.success({
            variables: calculator.getTermsNames().map(name => ({
                name: name,
                value: calculator.getByName(name, 1),
                editable: calculator.isEditable(name)
            }))
        });
    }

    createObjectDraft(input) {
        if (input.preset !== undefined && !BlockTokens.isPreset(input.preset))
            return this.failure("UNKNOWN_PRESET", `"${input.preset}" is not a visual preset.`, { path: "preset", expected: BlockTokens.getPresetNames().join(", "), suggestion: "standard" });
        let root = { id: "root", type: "group", children: [] };
        if (input.componentType !== undefined) {
            const registration = this.registry.get(input.componentType);
            if (!registration || registration.category !== "component" || !registration.agentAccessible)
                return this.failure("UNKNOWN_COMPONENT", `"${input.componentType}" is not an available component.`, { path: "componentType", suggestion: this.getValidator().suggestType(input.componentType) });
            root = { id: "root", type: input.componentType, parameters: {} };
        }
        const definition = BlockMigrations.createDefinition({
            name: input.name,
            preset: input.preset ?? "standard",
            root: root,
            source: "agent",
            metadata: { source: "agent", request: input.request ?? null, edited: false }
        });
        const draftId = `draft-${this.drafts.size + 1}-${Date.now()}`;
        this.drafts.set(draftId, definition);
        return this.success({ draftId: draftId, definition: definition });
    }

    getObjectDraft(input) {
        const draft = this.drafts.get(input.draftId);
        if (!draft)
            return this.failure("UNKNOWN_DRAFT", `No draft with id "${input.draftId}".`, { path: "draftId" });
        return this.success({ definition: draft });
    }

    requireDraft(input) {
        const draft = this.drafts.get(input.draftId);
        if (!draft)
            throw new Error(`No draft with id "${input.draftId}".`);
        return draft;
    }

    findNode(definition, nodeId, current = null) {
        const node = current ?? definition.root;
        if (!node)
            return null;
        if (node.id === nodeId)
            return node;
        for (const child of node.children ?? []) {
            const found = this.findNode(definition, nodeId, child);
            if (found)
                return found;
        }
        return null;
    }

    findParent(definition, nodeId, current = null) {
        const node = current ?? definition.root;
        for (const child of node.children ?? []) {
            if (child.id === nodeId)
                return node;
            const found = this.findParent(definition, nodeId, child);
            if (found)
                return found;
        }
        return null;
    }

    createNodeId(type) {
        this.nodeCounter++;
        return `${type}-${this.nodeCounter}`;
    }

    resolveParent(definition, parentNodeId) {
        if (parentNodeId === undefined || parentNodeId === null)
            return definition.root;
        return this.findNode(definition, parentNodeId);
    }

    addNodeToDraft(definition, parentNodeId, node) {
        const parent = this.resolveParent(definition, parentNodeId);
        if (!parent)
            return this.failure("UNKNOWN_NODE", `No node with id "${parentNodeId}" in this draft.`, { path: "parentNodeId" });
        const parentRegistration = this.registry.get(parent.type);
        if (!parentRegistration?.supportsChildren)
            return this.failure("CHILDREN_NOT_SUPPORTED", `"${parent.type}" cannot contain children.`, { path: "parentNodeId", suggestion: "Add a group node first." });
        parent.children = parent.children ?? [];
        parent.children.push(node);
        return this.success({ nodeId: node.id, definition: definition });
    }

    addPrimitive(input) {
        const definition = this.requireDraft(input);
        const registration = this.registry.get(input.type);
        if (!registration || registration.category !== "primitive" || !registration.agentAccessible)
            return this.failure("UNKNOWN_PRIMITIVE", `"${input.type}" is not an available primitive.`, { path: "type", suggestion: this.getValidator().suggestType(input.type, "primitive") });
        const properties = {};
        for (const [name, value] of Object.entries(input.properties ?? {})) {
            const propertyDefinition = registration.inputSchema.properties[name];
            if (!propertyDefinition)
                return this.failure("UNKNOWN_PROPERTY", `"${input.type}" has no property "${name}".`, { path: `properties.${name}`, suggestion: this.getValidator().suggestProperty(registration, name) });
            if (propertyDefinition.agentAccessible === false)
                return this.failure("PROPERTY_NOT_AGENT_ACCESSIBLE", `Property "${name}" cannot be set automatically.`, { path: `properties.${name}` });
            properties[name] = value;
        }
        const node = { id: input.id ?? this.createNodeId(input.type), type: input.type, properties: properties };
        if (registration.supportsChildren)
            node.children = [];
        return this.addNodeToDraft(definition, input.parentNodeId, node);
    }

    addComponent(input) {
        const definition = this.requireDraft(input);
        const registration = this.registry.get(input.type);
        if (!registration || registration.category !== "component" || !registration.agentAccessible)
            return this.failure("UNKNOWN_COMPONENT", `"${input.type}" is not an available component.`, { path: "type", suggestion: this.getValidator().suggestType(input.type, "component") });
        const node = { id: input.id ?? this.createNodeId(input.type), type: input.type, parameters: {} };
        for (const [name, value] of Object.entries(input.parameters ?? {})) {
            const parameter = registration.parameters.find(entry => entry.id === name);
            if (!parameter)
                return this.failure("UNKNOWN_PARAMETER", `Component "${input.type}" has no parameter "${name}".`, { path: `parameters.${name}`, suggestion: this.getValidator().suggestParameter(registration, name) });
            if (parameter.agentAccessible === false)
                return this.failure("PARAMETER_NOT_AGENT_ACCESSIBLE", `Parameter "${name}" cannot be set automatically.`, { path: `parameters.${name}` });
            node.parameters[name] = value;
        }
        return this.addNodeToDraft(definition, input.parentNodeId, node);
    }

    addGroup(input) {
        const definition = this.requireDraft(input);
        const node = { id: input.id ?? this.createNodeId("group"), type: "group", properties: {}, children: [] };
        return this.addNodeToDraft(definition, input.parentNodeId, node);
    }

    addChild(input) {
        const definition = this.requireDraft(input);
        const node = this.findNode(definition, input.nodeId);
        if (!node)
            return this.failure("UNKNOWN_NODE", `No node with id "${input.nodeId}" in this draft.`, { path: "nodeId" });
        const parent = this.findNode(definition, input.parentNodeId);
        if (!parent)
            return this.failure("UNKNOWN_NODE", `No node with id "${input.parentNodeId}" in this draft.`, { path: "parentNodeId" });
        if (this.findNode({ root: node }, input.parentNodeId))
            return this.failure("CIRCULAR_NODE_REFERENCE", "A node cannot become a child of its own subtree.", { path: "parentNodeId" });
        const currentParent = this.findParent(definition, input.nodeId);
        if (!currentParent)
            return this.failure("CANNOT_MOVE_ROOT", "The root node cannot be moved.", { path: "nodeId" });
        currentParent.children = currentParent.children.filter(child => child !== node);
        parent.children = parent.children ?? [];
        parent.children.push(node);
        return this.success({ nodeId: node.id, definition: definition });
    }

    requireNode(definition, nodeId) {
        const node = this.findNode(definition, nodeId);
        if (!node)
            throw new Error(`No node with id "${nodeId}" in this draft.`);
        return node;
    }

    setProperty(input) {
        const definition = this.requireDraft(input);
        const node = this.requireNode(definition, input.nodeId);
        const registration = this.registry.get(node.type);
        const propertyDefinition = registration?.inputSchema.properties[input.property];
        if (!propertyDefinition)
            return this.failure("UNKNOWN_PROPERTY", `"${node.type}" has no property "${input.property}".`, { path: "property", suggestion: registration ? this.getValidator().suggestProperty(registration, input.property) : null });
        if (propertyDefinition.agentAccessible === false)
            return this.failure("PROPERTY_NOT_AGENT_ACCESSIBLE", `Property "${input.property}" cannot be set automatically.`, { path: "property" });
        if (BlockBindings.isBinding(input.value))
            return this.failure("USE_BINDING_TOOL", "Use bind_variable or bind_expression to bind a property.", { path: "value" });
        node.properties = node.properties ?? {};
        node.properties[input.property] = input.value;
        return this.success({ definition: definition });
    }

    setParameter(input) {
        const definition = this.requireDraft(input);
        const node = this.requireNode(definition, input.nodeId);
        const registration = this.registry.get(node.type);
        if (registration?.category !== "component")
            return this.failure("NOT_A_COMPONENT", `"${node.type}" is not a component and has no parameters.`, { path: "nodeId" });
        const parameter = registration.parameters.find(entry => entry.id === input.parameter);
        if (!parameter)
            return this.failure("UNKNOWN_PARAMETER", `Component "${node.type}" has no parameter "${input.parameter}".`, { path: "parameter", suggestion: this.getValidator().suggestParameter(registration, input.parameter) });
        if (parameter.agentAccessible === false)
            return this.failure("PARAMETER_NOT_AGENT_ACCESSIBLE", `Parameter "${input.parameter}" cannot be set automatically.`, { path: "parameter" });
        node.parameters = node.parameters ?? {};
        node.parameters[input.parameter] = input.value;
        return this.success({ definition: definition });
    }

    applyModifier(input) {
        const definition = this.requireDraft(input);
        const node = this.requireNode(definition, input.nodeId);
        const registration = this.registry.get(input.type);
        if (!registration || registration.category !== "modifier" || !registration.agentAccessible)
            return this.failure("UNKNOWN_MODIFIER", `"${input.type}" is not an available modifier.`, { path: "type", suggestion: this.getValidator().suggestType(input.type, "modifier") });
        const modifier = { type: input.type };
        for (const [name, value] of Object.entries(input.values ?? {})) {
            if (!registration.inputSchema.properties[name])
                return this.failure("UNKNOWN_PROPERTY", `Modifier "${input.type}" has no property "${name}".`, { path: `values.${name}`, suggestion: this.getValidator().suggestProperty(registration, name) });
            modifier[name] = value;
        }
        node.modifiers = node.modifiers ?? [];
        node.modifiers.push(modifier);
        return this.success({ definition: definition });
    }

    addBehaviour(input) {
        const definition = this.requireDraft(input);
        const node = this.requireNode(definition, input.nodeId);
        const registration = this.registry.get(input.type);
        if (!registration || registration.category !== "behaviour" || !registration.agentAccessible)
            return this.failure("UNKNOWN_BEHAVIOUR", `"${input.type}" is not an available behaviour.`, { path: "type", suggestion: this.getValidator().suggestType(input.type, "behaviour") });
        if (!this.registry.supportsBehaviour(node.type, input.type))
            return this.failure("BEHAVIOUR_NOT_SUPPORTED", `"${node.type}" does not support the behaviour "${input.type}".`, { path: "type" });
        const behaviour = { type: input.type };
        for (const [name, value] of Object.entries(input.values ?? {})) {
            if (!registration.inputSchema.properties[name])
                return this.failure("UNKNOWN_PROPERTY", `Behaviour "${input.type}" has no property "${name}".`, { path: `values.${name}`, suggestion: this.getValidator().suggestProperty(registration, name) });
            behaviour[name] = value;
        }
        node.behaviours = node.behaviours ?? [];
        node.behaviours.push(behaviour);
        return this.success({ definition: definition });
    }

    resolveBindingTarget(definition, input) {
        const node = this.requireNode(definition, input.nodeId);
        const registration = this.registry.get(node.type);
        if (registration?.category === "component") {
            const parameter = registration.parameters.find(entry => entry.id === input.property);
            if (!parameter)
                return { error: this.failure("UNKNOWN_PARAMETER", `Component "${node.type}" has no parameter "${input.property}".`, { path: "property", suggestion: this.getValidator().suggestParameter(registration, input.property) }) };
            if (parameter.bindable === false)
                return { error: this.failure("PROPERTY_NOT_BINDABLE", `Parameter "${input.property}" cannot be bound.`, { path: "property" }) };
            return { node: node, container: "parameters" };
        }
        const propertyDefinition = registration?.inputSchema.properties[input.property];
        if (!propertyDefinition)
            return { error: this.failure("UNKNOWN_PROPERTY", `"${node.type}" has no property "${input.property}".`, { path: "property", suggestion: registration ? this.getValidator().suggestProperty(registration, input.property) : null }) };
        if (!propertyDefinition.bindable)
            return { error: this.failure("PROPERTY_NOT_BINDABLE", `Property "${input.property}" cannot be bound.`, { path: "property" }) };
        return { node: node, container: "bindings" };
    }

    bindVariable(input) {
        const definition = this.requireDraft(input);
        const target = this.resolveBindingTarget(definition, input);
        if (target.error)
            return target.error;
        const calculator = this.getCalculator();
        const variableName = String(input.variable);
        if (calculator && !calculator.isTerm(variableName) && !Number.isFinite(Number(variableName)))
            return this.failure("UNKNOWN_VARIABLE", `The variable "${variableName}" does not exist in the current model.`, { path: "variable", suggestion: this.getValidator().suggestVariable(variableName) });
        target.node[target.container] = target.node[target.container] ?? {};
        target.node[target.container][input.property] = BlockBindings.variable(variableName, input.case ?? 1);
        return this.success({ definition: definition });
    }

    bindExpression(input) {
        const definition = this.requireDraft(input);
        const target = this.resolveBindingTarget(definition, input);
        if (target.error)
            return target.error;
        const inputs = {};
        for (const [name, value] of Object.entries(input.inputs ?? {})) {
            if (BlockBindings.isBinding(value)) {
                inputs[name] = value;
                continue;
            }
            if (typeof value === "number") {
                inputs[name] = BlockBindings.constant(value);
                continue;
            }
            inputs[name] = BlockBindings.variable(String(value), input.case ?? 1);
        }
        const binding = Object.keys(inputs).length > 0
            ? BlockBindings.formula(String(input.expression), inputs)
            : BlockBindings.expression(String(input.expression));
        const validation = { valid: true, errors: [], warnings: [] };
        this.getValidator().validateBinding(binding, { id: input.property, valueType: "number", bindable: true }, validation, "expression");
        if (!validation.valid)
            return { ok: false, errors: validation.errors };
        target.node[target.container] = target.node[target.container] ?? {};
        target.node[target.container][input.property] = binding;
        return this.success({ definition: definition });
    }

    validateObject(input) {
        const definition = this.requireDraft(input);
        const validation = this.getValidator().validate(definition, this.getPreviewContext(input));
        if (!validation.valid)
            return { ok: false, valid: false, errors: validation.errors, warnings: validation.warnings };
        return this.success({ valid: true, errors: [], warnings: validation.warnings });
    }

    getPreviewContext(input) {
        return {
            width: Number(input.width) || 180,
            height: Number(input.height) || 180,
            parameters: {},
            caseNumber: 1,
            tokens: new BlockTokens(this.drafts.get(input.draftId)?.preset ?? "standard")
        };
    }

    renderObjectPreview(input) {
        const definition = this.requireDraft(input);
        const context = this.getPreviewContext(input);
        const compilation = this.getCompiler().compile(definition, context);
        const blockingDiagnostics = compilation.diagnostics.filter(diagnostic => diagnostic.severity !== "warning");
        if (blockingDiagnostics.length > 0)
            return { ok: false, errors: blockingDiagnostics.map(diagnostic => ({ code: diagnostic.code, path: diagnostic.path, message: diagnostic.message })) };
        return this.success({
            svg: BlockRenderer.toStandaloneSvg(compilation.nodes, context.width, context.height, "none"),
            stats: compilation.stats,
            warnings: compilation.diagnostics.filter(diagnostic => diagnostic.severity === "warning")
        });
    }

    insertObject(input) {
        const definition = this.requireDraft(input);
        if (!this.host?.commands)
            return this.failure("NO_DOCUMENT", "No document is open to insert into.", { path: "" });
        const validation = this.getValidator().validate(definition, this.getPreviewContext(input));
        if (!validation.valid)
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        const shape = this.host.commands.addComponentFromDefinition(BlockObjects.cloneDefinition(definition));
        return this.success({ shapeId: shape.id, name: shape.properties.name });
    }

    saveCustomComponent(input) {
        const definition = this.requireDraft(input);
        const type = String(input.type ?? "");
        if (!/^[a-z][a-z0-9-]{2,48}$/.test(type))
            return this.failure("INVALID_COMPONENT_TYPE", "A custom component type must be lower-case letters, digits and dashes.", { path: "type", expected: "^[a-z][a-z0-9-]{2,48}$" });
        if (this.registry.has(type) && !this.registry.isCustomComponent(type))
            return this.failure("COMPONENT_TYPE_TAKEN", `"${type}" is already a built-in building block.`, { path: "type" });
        const validation = this.getValidator().validate(definition, this.getPreviewContext(input));
        if (!validation.valid)
            return { ok: false, errors: validation.errors, warnings: validation.warnings };
        const savedRoot = BlockObjects.cloneDefinition(definition).root;
        this.registry.registerCustomComponent({
            type: type,
            version: "1.0.0",
            category: "component",
            displayName: input.displayName ?? definition.name,
            description: input.description ?? `Custom component saved from "${definition.name}".`,
            tags: ["custom"],
            capabilities: ["custom"],
            inputSchema: { properties: {} },
            parameters: definition.parameters ?? [],
            agentAccessible: true,
            create: () => BlockObjects.cloneDefinition({ root: savedRoot }).root
        });
        return this.success({ type: type, component: this.registry.describe(type) });
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockAgentTools;
