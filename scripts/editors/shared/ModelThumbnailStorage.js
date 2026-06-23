var ModelThumbnailStorage = {
    createAssetId: function(prefix) {
        if (window.crypto?.randomUUID)
            return `${prefix}-${window.crypto.randomUUID()}`;
        const randomValue = Math.floor(Math.random() * 1000000000);
        return `${prefix}-${Date.now()}-${randomValue}`;
    },

    appendCacheBuster: function(url) {
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}t=${Date.now()}`;
    },

    uploadThumbnail: async function(modelsApiClient, modelId, file) {
        if (!modelsApiClient)
            throw new Error("Models API client is not available.");
        if (!modelId)
            throw new Error("No model id found.");
        if (!file)
            throw new Error("No thumbnail file selected.");
        const assetId = this.createAssetId("thumbnail");
        const uploadedUrl = await modelsApiClient.uploadModelAsset(modelId, assetId, file, file.name);
        if (!uploadedUrl)
            throw new Error("The API did not return an asset URL.");
        return this.appendCacheBuster(uploadedUrl);
    }
};