class SaveFormController {
    constructor(shell) {
        this.shell = shell;
        this._metadataPopup = new ModelMetadataPopup({
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
            const thumbnailUrl = await this.shell.uploadModelAsset(result.thumbnailFile, this.shell.createAssetId("thumbnail"));
            if (thumbnailUrl)
                this.shell.properties.thumbnailUrl = thumbnailUrl;
        } else if (result.thumbnailCleared) {
            this.shell.properties.thumbnailUrl = "";
        }
    }

    promptSaveBeforeExit() {
        return new Promise(resolve => {
            const popupHost = document.getElementById("save-metadata-popup");
            if (!popupHost) {
                resolve("discard");
                return;
            }
            const formData = {
                name: this.shell.properties.name === "Model" ? "" : this.shell.properties.name || "",
                description: this.shell.properties.description || ""
            };
            let formInstance = null;
            const popup = $(popupHost).dxPopup({
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                showTitle: true,
                title: this.shell.board.translations.get("Unsaved Changes"),
                hideOnOutsideClick: false,
                visible: true,
                wrapperAttr: { class: "mdl-save-metadata-popup" },
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.shell.board.translations.get("Save"),
                            type: "default",
                            stylingMode: "text",
                            onClick: () => {
                                const validation = formInstance.validate();
                                if (!validation.isValid)
                                    return;
                                this.shell.properties.name = formData.name;
                                this.shell.properties.description = formData.description;
                                popup.dxPopup("hide");
                                resolve("save");
                            }
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.shell.board.translations.get("Don't Save"),
                            stylingMode: "text",
                            onClick: () => {
                                popup.dxPopup("hide");
                                resolve("discard");
                            }
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.shell.board.translations.get("Cancel"),
                            stylingMode: "text",
                            onClick: () => {
                                popup.dxPopup("hide");
                                resolve("cancel");
                            }
                        }
                    }
                ],
                contentTemplate: () => {
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            {
                                dataField: "name",
                                label: { text: this.shell.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            }
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
    }

    async promptDuplicateMetadata() {
        const result = await this._metadataPopup.show({
            popupTitle: this.shell.board.translations.get("Duplicate Model"),
            saveButtonText: this.shell.board.translations.get("Duplicate"),
            name: this.shell.properties.name || "",
            description: this.shell.properties.description || "",
            thumbnailUrl: this.getThumbnailSource()
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
            thumbnailUrl: this.getThumbnailSource()
        });
        if (!result)
            return null;
        await this._applyMetadataResult(result);
        return { name: result.name, description: result.description };
    }
}
