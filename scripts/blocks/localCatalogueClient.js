// The catalogue an installed copy carries, behind the same reads the online client answers. Every
// picker asks the shell for a client and calls these methods, so an application that never reaches
// the network lists the same objects, characters and samples without any of them knowing.
//
// The snapshot stores an image as the path it was written to, relative to the catalogue folder;
// the page that reads it sits two levels down, so the prefix is added here rather than baked into
// the file, which keeps the snapshot the same wherever it is opened from.
class LocalCatalogueClient {
    static assetBase = "../../resources/catalogue";

    static isAvailable() {
        return typeof window !== "undefined" && !!window.ModellusLocalCatalogue;
    }

    constructor(catalogue = window.ModellusLocalCatalogue) {
        this.catalogue = catalogue;
    }

    static resolveAsset(storedPath) {
        if (typeof storedPath !== "string" || storedPath === "")
            return null;
        return `${LocalCatalogueClient.assetBase}/${storedPath}`;
    }

    static withResolvedThumbnail(entry) {
        return Object.assign({}, entry, { thumbnail_url: LocalCatalogueClient.resolveAsset(entry.thumbnail_url) });
    }

    static page(items) {
        return { items: items, total: items.length };
    }

    async fetchObjectsPage() {
        return LocalCatalogueClient.page(this.catalogue.objects.items.map(LocalCatalogueClient.withResolvedThumbnail));
    }

    async fetchObjects() {
        return this.catalogue.objects.items.map(LocalCatalogueClient.withResolvedThumbnail);
    }

    async fetchObjectById(objectId) {
        const entry = this.catalogue.objects.items.find(item => item.id === objectId);
        return entry ? LocalCatalogueClient.withResolvedThumbnail(entry) : null;
    }

    async fetchObjectDefinition(objectId) {
        return this.catalogue.objects.definitions[objectId] ?? null;
    }

    async fetchCharacters() {
        return this.catalogue.characters.items.map(LocalCatalogueClient.withResolvedThumbnail);
    }

    async fetchCharacterCategories() {
        return this.catalogue.characters.categories;
    }

    async fetchCharacterById(characterId) {
        const record = this.catalogue.characters.records[characterId];
        return record ? LocalCatalogueClient.withResolvedThumbnail(record) : null;
    }

    // The frames are addresses the animation plays in turn, so they are resolved the same way the
    // thumbnail is: a definition handed back with stored paths would draw nothing.
    async fetchCharacterDefinition(characterId) {
        const definition = this.catalogue.characters.definitions[characterId];
        if (!definition)
            return null;
        const animations = (definition.animations ?? []).map(animation => Object.assign({}, animation, {
            frames: (animation.frames ?? []).map(frame => Object.assign({}, frame, { image_url: LocalCatalogueClient.resolveAsset(frame.image_url) }))
        }));
        return Object.assign({}, definition, { animations: animations, thumbnail_url: LocalCatalogueClient.resolveAsset(definition.thumbnail_url) });
    }

    async fetchPublicModels() {
        return this.catalogue.models.items.map(LocalCatalogueClient.withResolvedThumbnail);
    }

    async fetchPublicModelsPage() {
        return LocalCatalogueClient.page(this.catalogue.models.items.map(LocalCatalogueClient.withResolvedThumbnail));
    }

    async fetchModelById(modelId) {
        const record = this.catalogue.models.records[modelId];
        return record ? LocalCatalogueClient.withResolvedThumbnail(record) : null;
    }

    // An installed copy reads its catalogue and writes nothing back to one.
    async sendModelUsage() {
        return null;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = LocalCatalogueClient;
