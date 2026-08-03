class BlockObjects {
    static getComponentParameters(componentType) {
        return BlockRegistry.getParameterDefinitions(componentType);
    }

    static getInstancePropertyDefaults(componentType, presetName = "standard") {
        const tokens = new BlockTokens(presetName);
        const defaults = {};
        for (const parameter of BlockObjects.getComponentParameters(componentType)) {
            const value = parameter.defaultValue;
            defaults[parameter.id] = tokens.isTokenReference(value) ? tokens.resolveValue(value) : value;
        }
        return defaults;
    }

    static buildInstanceParameterBindings(componentType) {
        const bindings = {};
        for (const parameter of BlockObjects.getComponentParameters(componentType))
            bindings[parameter.id] = { parameter: parameter.id };
        return bindings;
    }

    // Definitions saved before a parameter was added carry no binding for it, so the instance
    // property the toolbar writes would never reach the component. Backfill the missing ones.
    static backfillInstanceParameterBindings(definition) {
        const componentType = BlockObjects.getComponentType(definition);
        if (!componentType || !definition.root)
            return definition;
        const bindings = definition.root.parameters ?? {};
        for (const parameter of BlockObjects.getComponentParameters(componentType)) {
            if (bindings[parameter.id] === undefined)
                bindings[parameter.id] = { parameter: parameter.id };
        }
        definition.root.parameters = bindings;
        return definition;
    }

    static createComponentInstance(componentType, options = {}) {
        const registration = BlockRegistry.get(componentType);
        if (!registration || registration.category !== "component")
            throw new Error(`Component type "${componentType}" is not registered.`);
        return BlockMigrations.createDefinition({
            id: options.id,
            type: componentType,
            name: options.name ?? registration.displayName,
            preset: options.preset ?? "standard",
            source: options.source ?? "developer",
            metadata: options.metadata,
            parameters: registration.parameters,
            root: {
                id: "root",
                type: componentType,
                parameters: BlockObjects.buildInstanceParameterBindings(componentType)
            }
        });
    }

    static isComponentInstance(definition) {
        const root = definition?.root;
        if (!root)
            return false;
        const registration = BlockRegistry.get(root.type);
        return registration?.category === "component";
    }

    static getComponentType(definition) {
        return definition?.root?.type ?? null;
    }

    static getEditableParameters(definition) {
        const componentType = BlockObjects.getComponentType(definition);
        if (!componentType)
            return definition?.parameters ?? [];
        return BlockObjects.getComponentParameters(componentType).filter(parameter => parameter.userEditable !== false);
    }

    static describeInstance(definition) {
        return {
            schemaVersion: definition?.schemaVersion ?? null,
            name: definition?.name ?? null,
            componentType: BlockObjects.getComponentType(definition),
            preset: definition?.preset ?? "standard",
            metadata: definition?.metadata ?? null
        };
    }

    static cloneDefinition(definition) {
        return JSON.parse(JSON.stringify(definition));
    }

    static markEdited(definition) {
        if (!definition?.metadata)
            return definition;
        definition.metadata.edited = true;
        return definition;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockObjects;
