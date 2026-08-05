class BlockObjectLibrary {
    static builtInTypes = new Set();

    static sealBuiltIns(registry = BlockRegistry) {
        BlockObjectLibrary.builtInTypes = new Set(registry.list("component", { includeDeprecated: true }).map(registration => registration.type));
        return BlockObjectLibrary.builtInTypes;
    }

    static isBuiltIn(type) {
        return BlockObjectLibrary.builtInTypes.has(type);
    }

    static getDocument(type) {
        return BlockDefinitionLoader.getDocument(type);
    }

    static registerDocument(document, registry = BlockRegistry) {
        if (BlockObjectLibrary.isBuiltIn(document.type))
            return null;
        BlockDefinitionLoader.register(document, registry);
        return document.type;
    }

    static registerAll(documents, registry = BlockRegistry) {
        const registered = [];
        const problems = [];
        for (const document of documents ?? []) {
            try {
                const type = BlockObjectLibrary.registerDocument(document, registry);
                if (type)
                    registered.push(type);
            } catch (error) {
                problems.push(error.message);
            }
        }
        return { registered: registered, problems: problems };
    }

    static collectFromShapes(shapes) {
        const documents = new Map();
        for (const shape of shapes)
            BlockObjectLibrary.collectNode(shape.properties.definition?.root, documents);
        return Array.from(documents.values());
    }

    static collectFromDefinition(definition) {
        return Array.from(BlockObjectLibrary.collectNode(definition?.root, new Map()).values());
    }

    static collectNode(node, documents) {
        if (!node || typeof node !== "object")
            return documents;
        BlockObjectLibrary.collectType(node.type, documents);
        for (const child of node.children ?? [])
            BlockObjectLibrary.collectNode(child, documents);
        return documents;
    }

    static collectType(type, documents) {
        if (typeof type !== "string" || BlockObjectLibrary.isBuiltIn(type) || documents.has(type))
            return;
        const document = BlockObjectLibrary.getDocument(type);
        if (!document)
            return;
        documents.set(type, BlockMigrations.clone(document));
        BlockObjectLibrary.collectNode(document.root, documents);
    }
}

if (typeof BlockRegistry !== "undefined")
    BlockObjectLibrary.sealBuiltIns();

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockObjectLibrary;
