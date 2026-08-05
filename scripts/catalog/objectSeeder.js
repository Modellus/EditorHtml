class ObjectSeeder {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    // The catalogue is keyed by the definition's own type, so seeding a second time finds what the
    // first run wrote and leaves it alone unless the caller asks for an update.
    async readCatalogueEntriesByType() {
        const page = await this.apiClient.fetchObjectsPage({ limit: ObjectSeeder.pageSize });
        return new Map(page.items.map(entry => [entry.type, entry]));
    }

    static describe(definitionDocument) {
        return {
            title: definitionDocument.displayName ?? definitionDocument.type,
            description: definitionDocument.description ?? "",
            definition: definitionDocument
        };
    }

    // Reports what it would do for every document, and does it only when asked to write. A failure
    // on one object is recorded against that object and the rest are still seeded.
    //
    // Writing without knowing what the catalogue already holds would publish a second copy of every
    // object, so a listing that cannot be read stops a write. A dry run carries on against an empty
    // catalogue instead, which is what makes the plan and the drawings readable before the
    // endpoints exist at all.
    async seed(definitionDocuments, options = {}) {
        let entriesByType = new Map();
        let catalogueProblem = null;
        try {
            entriesByType = await this.readCatalogueEntriesByType();
        } catch (error) {
            if (options.write)
                throw new Error(`The catalogue could not be listed, so nothing was written: ${error.message}`);
            catalogueProblem = error.message;
        }
        const results = [];
        for (const definitionDocument of definitionDocuments)
            results.push(await this.seedOne(definitionDocument, entriesByType.get(definitionDocument.type) ?? null, options));
        return { results: results, catalogueProblem: catalogueProblem };
    }

    async seedOne(definitionDocument, existingEntry, options) {
        const payload = ObjectSeeder.describe(definitionDocument);
        const action = existingEntry ? (options.update ? "update" : "skip") : "create";
        const result = { type: definitionDocument.type, title: payload.title, action: action };
        if (existingEntry)
            result.id = existingEntry.id;
        if (action === "skip")
            return result;
        const svg = ObjectDrawing.toSvg(definitionDocument);
        if (options.includeDrawing)
            result.svg = svg;
        if (!options.write)
            return result;
        try {
            const screenshot = await ObjectDrawing.toScreenshotFile(svg, ObjectDrawing.screenshotSize);
            if (action === "create") {
                const created = await this.apiClient.createObject(payload, screenshot);
                result.id = created.id;
                return result;
            }
            await this.apiClient.patchObject(existingEntry.id, payload);
            await this.apiClient.uploadObjectThumbnail(existingEntry.id, screenshot);
            return result;
        } catch (error) {
            result.action = "failed";
            result.error = error.message;
            return result;
        }
    }
}

ObjectSeeder.pageSize = 500;

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectSeeder;
