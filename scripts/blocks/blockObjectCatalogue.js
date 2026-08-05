class BlockObjectCatalogue {
    static pageSize = 200;
    static entries = [];
    static loadPromise = null;

    static getEntries() {
        return BlockObjectCatalogue.entries;
    }

    static getEntry(objectId) {
        return BlockObjectCatalogue.entries.find(entry => entry.id === objectId) ?? null;
    }

    static reset() {
        BlockObjectCatalogue.entries = [];
        BlockObjectCatalogue.loadPromise = null;
    }

    static load(apiClient) {
        if (!apiClient)
            return Promise.resolve([]);
        if (!BlockObjectCatalogue.loadPromise)
            BlockObjectCatalogue.loadPromise = BlockObjectCatalogue.fetchEntries(apiClient);
        return BlockObjectCatalogue.loadPromise;
    }

    // The catalogue is an addition to the palette, never a condition for it: when it cannot be
    // read the editor still offers everything it ships with, and the next open tries again.
    static async fetchEntries(apiClient) {
        try {
            const page = await apiClient.fetchObjectsPage({ limit: BlockObjectCatalogue.pageSize });
            BlockObjectCatalogue.entries = page.items.filter(entry => typeof entry.type === "string" && entry.type !== "");
        } catch (error) {
            BlockObjectCatalogue.loadPromise = null;
            BlockObjectCatalogue.entries = [];
        }
        return BlockObjectCatalogue.entries;
    }

    // The list carries what the palette shows; the definition is read only when an object is
    // actually placed, and once registered it is the model that carries it from then on.
    static async ensureRegistered(objectId, apiClient) {
        const entry = BlockObjectCatalogue.getEntry(objectId);
        if (BlockRegistry.has(entry.type))
            return entry.type;
        const document = await apiClient.fetchObjectDefinition(objectId);
        BlockObjectLibrary.registerDocument(document);
        return entry.type;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockObjectCatalogue;
