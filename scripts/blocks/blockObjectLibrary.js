class BlockObjectLibrary {
    // The objects this release was built with, sealed once the generated bundle has registered them
    // and before anything else can. Which objects those are is decided in the catalogue — the build
    // reads every object flagged as bundled and generates the file that registers them — so this is
    // a reading of what arrived, never a list anyone maintains.
    static bundledTypes = new Set();

    static sealBundled(registry = BlockRegistry) {
        BlockObjectLibrary.bundledTypes = new Set(registry.list("component", { includeDeprecated: true }).map(registration => registration.type));
        return BlockObjectLibrary.bundledTypes;
    }

    static isBundled(type) {
        return BlockObjectLibrary.bundledTypes.has(type);
    }

    static getDocument(type) {
        return BlockDefinitionLoader.getDocument(type);
    }

    // A catalogue copy never replaces what the release was built with. The catalogue is where an
    // object is written and may well hold a newer version of a bundled one, but what a board draws
    // changes when a release ships and not when someone saves — otherwise an edit made in the shape
    // editor would reach every board at once, mistakes included, with no release to hold it back.
    static registerDocument(document, registry = BlockRegistry) {
        if (BlockObjectLibrary.isBundled(document.type))
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
        if (typeof type !== "string" || BlockObjectLibrary.isBundled(type) || documents.has(type))
            return;
        const document = BlockObjectLibrary.getDocument(type);
        if (!document)
            return;
        documents.set(type, BlockMigrations.clone(document));
        BlockObjectLibrary.collectNode(document.root, documents);
    }
}

if (typeof BlockRegistry !== "undefined")
    BlockObjectLibrary.sealBundled();

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockObjectLibrary;
