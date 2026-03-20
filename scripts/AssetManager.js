class AssetManager {
    constructor(modelsApiClient) {
        this.modelsApiClient = modelsApiClient;
    }

    getCurrentModelId() {
        return new URLSearchParams(window.location.search).get("model_id");
    }

    async uploadAsset(assetId, file, fileName = "asset.png", onProgress = null) {
        const modelId = this.getCurrentModelId();
        if (!modelId) {
            this.showError("Open a saved model before uploading assets.");
            return null;
        }
        if (!this.modelsApiClient) {
            this.showError("Models API client is not available.");
            return null;
        }
        try {
            return await this.modelsApiClient.uploadModelAsset(modelId, assetId, file, fileName, onProgress);
        } catch (error) {
            this.showError(error?.message || "Failed to upload asset.");
            return null;
        }
    }

    showError(message) {
        if (window.DevExpress?.ui?.notify)
            window.DevExpress.ui.notify(message, "error", 3000);
    }
}
