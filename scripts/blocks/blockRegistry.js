class BuildingBlockRegistry {
    static categories = ["primitive", "modifier", "behaviour", "component"];

    constructor() {
        this.registrations = new Map();
        this.customComponentTypes = new Set();
        this.aliases = new Map();
    }

    // A block that has been renamed answers to the name it used to have as well, because the files
    // already saved carry the old one and a model is not reopened to be told its clock no longer
    // exists. The alias only finds the block; everything the registry lists is the current name.
    register(registration) {
        const normalized = this.normalizeRegistration(registration);
        this.registrations.set(normalized.type, normalized);
        for (const alias of registration.aliases ?? [])
            this.aliases.set(alias, normalized.type);
        return normalized;
    }

    resolveType(type) {
        if (this.registrations.has(type))
            return type;
        return this.aliases.get(type) ?? type;
    }

    // A name a block used to be called, rather than the one it goes by now. What answers to it is the
    // same block under its current name, so a list that has already offered that block has nothing to
    // add by offering the old name beside it.
    isAlias(type) {
        return !this.registrations.has(type) && this.aliases.has(type);
    }

    registerCustomComponent(registration) {
        const normalized = this.register(registration);
        this.customComponentTypes.add(normalized.type);
        return normalized;
    }

    markCustomComponent(type) {
        this.customComponentTypes.add(type);
        return type;
    }

    normalizeRegistration(registration) {
        return {
            type: registration.type,
            version: registration.version ?? "1.0.0",
            category: registration.category,
            displayName: registration.displayName ?? registration.type,
            description: registration.description ?? "",
            icon: registration.icon ?? "fa-light fa-shapes",
            tags: registration.tags ?? [],
            inputSchema: this.normalizeInputSchema(registration.inputSchema),
            parameters: registration.parameters ?? [],
            supportsChildren: registration.supportsChildren === true,
            supportedBindings: registration.supportedBindings ?? null,
            supportedBehaviours: registration.supportedBehaviours ?? null,
            capabilities: registration.capabilities ?? [],
            // What a component publishes back to the model: the wave it draws, as a name defined over
            // element indices. Nothing is published unless the definition says so.
            indexedSource: registration.indexedSource ?? null,
            // And what it hands back as one value: the reading an object takes of the wave it works
            // out for itself, written under a name the model leaves free.
            valueSource: registration.valueSource ?? null,
            aliases: registration.aliases ?? [],
            agentAccessible: registration.agentAccessible !== false,
            deprecated: registration.deprecated === true,
            replacedBy: registration.replacedBy ?? null,
            create: registration.create ?? null,
            render: registration.render ?? null,
            apply: registration.apply ?? null,
            attach: registration.attach ?? null,
            validate: registration.validate ?? null,
            migrate: registration.migrate ?? null,
            examples: registration.examples ?? []
        };
    }

    normalizeInputSchema(inputSchema) {
        const properties = {};
        for (const [name, definition] of Object.entries(inputSchema?.properties ?? {})) {
            properties[name] = {
                id: name,
                label: definition.label ?? name,
                description: definition.description ?? "",
                valueType: definition.valueType ?? "number",
                defaultValue: definition.defaultValue,
                required: definition.required === true,
                minimum: definition.minimum,
                maximum: definition.maximum,
                enumValues: definition.enumValues ?? null,
                unit: definition.unit ?? null,
                category: definition.category ?? "general",
                bindable: definition.bindable !== false,
                agentAccessible: definition.agentAccessible !== false,
                userEditable: definition.userEditable !== false
            };
        }
        return { properties: properties };
    }

    has(type) {
        return this.registrations.has(this.resolveType(type));
    }

    get(type) {
        return this.registrations.get(this.resolveType(type)) ?? null;
    }

    isCustomComponent(type) {
        return this.customComponentTypes.has(type);
    }

    list(category = null, options = {}) {
        const includeDeprecated = options.includeDeprecated === true;
        const agentOnly = options.agentAccessibleOnly === true;
        const result = [];
        for (const registration of this.registrations.values()) {
            if (category && registration.category !== category)
                continue;
            if (!includeDeprecated && registration.deprecated)
                continue;
            if (agentOnly && !registration.agentAccessible)
                continue;
            result.push(registration);
        }
        return result.sort((first, second) => first.type.localeCompare(second.type));
    }

    search(query, options = {}) {
        const terms = String(query ?? "").toLowerCase().split(/\s+/).filter(term => term !== "");
        const candidates = this.list(options.category ?? null, options);
        if (terms.length === 0)
            return candidates;
        const scored = [];
        for (const registration of candidates) {
            const haystack = [registration.type, registration.displayName, registration.description, registration.tags.join(" "), registration.capabilities.join(" ")].join(" ").toLowerCase();
            let score = 0;
            for (const term of terms) {
                if (haystack.includes(term))
                    score++;
            }
            if (score > 0)
                scored.push({ registration: registration, score: score });
        }
        return scored.sort((first, second) => second.score - first.score).map(entry => entry.registration);
    }

    findByCapability(capability, options = {}) {
        return this.list(options.category ?? null, options).filter(registration => registration.capabilities.includes(capability));
    }

    describe(type) {
        const registration = this.get(type);
        if (!registration)
            return null;
        return {
            type: registration.type,
            version: registration.version,
            category: registration.category,
            displayName: registration.displayName,
            description: registration.description,
            icon: registration.icon,
            tags: registration.tags,
            capabilities: registration.capabilities,
            supportsChildren: registration.supportsChildren,
            supportedBindings: registration.supportedBindings,
            supportedBehaviours: registration.supportedBehaviours,
            agentAccessible: registration.agentAccessible,
            deprecated: registration.deprecated,
            replacedBy: registration.replacedBy,
            properties: Object.values(registration.inputSchema.properties),
            parameters: registration.parameters,
            examples: registration.examples
        };
    }

    getDefaults(type) {
        const registration = this.get(type);
        if (!registration)
            return {};
        const defaults = {};
        for (const [name, definition] of Object.entries(registration.inputSchema.properties)) {
            if (definition.defaultValue !== undefined)
                defaults[name] = definition.defaultValue;
        }
        return defaults;
    }

    getParameterDefinitions(type) {
        const registration = this.get(type);
        if (!registration)
            return [];
        return registration.parameters;
    }

    getParameterDefaults(type) {
        const defaults = {};
        for (const parameter of this.getParameterDefinitions(type)) {
            if (parameter.defaultValue !== undefined)
                defaults[parameter.id] = parameter.defaultValue;
        }
        return defaults;
    }

    isPropertyBindable(type, propertyName) {
        const registration = this.get(type);
        if (!registration)
            return false;
        const definition = registration.inputSchema.properties[propertyName];
        if (!definition)
            return false;
        return definition.bindable;
    }

    supportsBehaviour(type, behaviourType) {
        const registration = this.get(type);
        if (!registration)
            return false;
        if (registration.supportedBehaviours === null)
            return true;
        return registration.supportedBehaviours.includes(behaviourType);
    }

    toAgentCatalogue() {
        return this.list(null, { agentAccessibleOnly: true }).map(registration => ({
            type: registration.type,
            category: registration.category,
            displayName: registration.displayName,
            description: registration.description,
            capabilities: registration.capabilities,
            tags: registration.tags
        }));
    }
}

var BlockRegistry = new BuildingBlockRegistry();

if (typeof module !== "undefined" && module.exports)
    module.exports = { BuildingBlockRegistry, BlockRegistry };
