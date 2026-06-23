class SaveFormController {
    constructor(shell) {
        this.shell = shell;
        this._metadataPopup = new ModelSavePopup({
            translations: shell.board.translations,
            onGenerateDescription: () => shell.aiSdk.generateDescription(shell.getModel())
        });
    }

    getThumbnailSource() {
        const thumbnailUrl = this.shell.properties.thumbnailUrl;
        return typeof thumbnailUrl === "string" ? thumbnailUrl.trim() : "";
    }

    async _applyMetadataResult(result) {
        this.shell.properties.name = result.name;
        this.shell.properties.description = result.description;
        if (result.thumbnailFile) {
            const thumbnailUrl = await this.shell.uploadModelThumbnail(result.thumbnailFile);
            if (thumbnailUrl)
                this.shell.properties.thumbnailUrl = thumbnailUrl;
        } else if (result.thumbnailCleared) {
            this.shell.properties.thumbnailUrl = "";
        }
    }

    async promptSaveBeforeExit() {
        const result = await this._metadataPopup.show({
            popupTitle: this.shell.board.translations.get("Unsaved Changes"),
            saveButtonText: this.shell.board.translations.get("Save"),
            discardButtonText: this.shell.board.translations.get("Don't Save"),
            name: this.shell.properties.name === "Model" ? "" : this.shell.properties.name || "",
            description: this.shell.properties.description || "",
            thumbnailUrl: this.getThumbnailSource(),
            seed: this.shell.getCurrentModelId()
        });
        if (result === false)
            return "discard";
        if (!result)
            return "cancel";
        await this._applyMetadataResult(result);
        return "save";
    }

    async promptDuplicateMetadata() {
        const result = await this._metadataPopup.show({
            popupTitle: this.shell.board.translations.get("Duplicate Model"),
            saveButtonText: this.shell.board.translations.get("Duplicate"),
            name: this.shell.properties.name || "",
            description: this.shell.properties.description || "",
            thumbnailUrl: this.getThumbnailSource(),
            seed: this.shell.getCurrentModelId()
        });
        if (!result)
            return null;
        return { name: result.name, description: result.description };
    }

    promptModelMetadata() {
        return this._promptMetadata(this.shell.board.translations.get("Save Model"), this.shell.board.translations.get("Save"));
    }

    promptSaveAsMetadata() {
        return this._promptMetadata(this.shell.board.translations.get("Save Model As"), this.shell.board.translations.get("Save"));
    }

    async _promptMetadata(title, saveButtonText) {
        const result = await this._metadataPopup.show({
            popupTitle: title,
            saveButtonText,
            name: this.shell.properties.name || "",
            description: this.shell.properties.description || "",
            thumbnailUrl: this.getThumbnailSource(),
            seed: this.shell.getCurrentModelId()
        });
        if (!result)
            return null;
        await this._applyMetadataResult(result);
        return { name: result.name, description: result.description };
    }
}
