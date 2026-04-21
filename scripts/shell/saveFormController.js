class SaveFormController {
    constructor(shell) {
        this.shell = shell;
    }

    isUrl(value) {
        if (typeof value !== "string")
            return false;
        return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
    }

    getThumbnailSource() {
        const thumbnailUrl = this.shell.properties.thumbnailUrl;
        return typeof thumbnailUrl === "string" ? thumbnailUrl.trim() : "";
    }

    updateThumbnailPreview(previewElement, hintElement, removeButtonElement, imageSource) {
        if (!previewElement || !hintElement || !removeButtonElement)
            return;
        if (imageSource) {
            previewElement.setAttribute("src", imageSource);
            hintElement.style.display = "none";
            removeButtonElement.style.display = "flex";
            return;
        }
        previewElement.removeAttribute("src");
        hintElement.style.display = "";
        removeButtonElement.style.display = "none";
    }

    onThumbnailRemoveButtonMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        this.clearThumbnail(previewElement, hintElement, removeButtonElement);
    }

    clearThumbnail(previewElement, hintElement, removeButtonElement) {
        this.shell.properties.thumbnailUrl = "";
        this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, "");
    }

    async setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement) {
        const thumbnailUrl = await this.shell.uploadModelAsset(file, this.shell.createAssetId("thumbnail"));
        if (!thumbnailUrl)
            return;
        this.shell.properties.thumbnailUrl = thumbnailUrl;
        this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, thumbnailUrl);
    }

    _createThumbnailEditor(formData) {
        let previewElement = null;
        let hintElement = null;
        let removeButtonElement = null;
        return {
            template: () => {
                const container = $("<div class='thumbnail-dropzone'></div>");
                const preview = $("<img class='thumbnail-preview' alt='Thumbnail preview' />");
                const hint = $("<div class='thumbnail-hint'></div>")
                    .text(this.shell.board.translations.get("Thumbnail Dropzone"));
                const removeButton = $("<button type='button' class='thumbnail-remove-button' aria-label='Remove model cover'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
                const uploaderHost = $("<div class='thumbnail-uploader'></div>");
                previewElement = preview.get(0);
                hintElement = hint.get(0);
                removeButtonElement = removeButton.get(0);
                this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, this.getThumbnailSource());
                container.append(preview, hint, removeButton, uploaderHost);
                removeButton.on("mousedown", event => this.onThumbnailRemoveButtonMouseDown(event));
                removeButton.on("click", event => this.onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement));
                uploaderHost.dxFileUploader({
                    accept: "image/*",
                    multiple: false,
                    uploadMode: "useForm",
                    dropZone: container.get(0),
                    dialogTrigger: container.get(0),
                    onValueChanged: async e => {
                        const file = e.value && e.value[0];
                        if (!file)
                            return;
                        await this.setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement);
                    }
                });
                return container;
            }
        };
    }

    _createDescriptionEditor(formData) {
        return {
            dataField: "description",
            label: { text: this.shell.board.translations.get("Description"), visible: true },
            template: (data, itemElement) => {
                const $editorHost = $("<div>").appendTo(itemElement);
                const $toolbarHost = $("<div>").appendTo(itemElement);
                $editorHost.dxHtmlEditor({
                    valueType: "markdown",
                    value: formData.description,
                    height: 120,
                    stylingMode: "filled",
                    toolbar: {
                        container: $toolbarHost[0],
                        items: [
                            "bold", "italic", "underline", "separator",
                            "orderedList", "bulletList", "separator",
                            {
                                name: "generateDescription",
                                widget: "dxButton",
                                options: {
                                    icon: "fa-light fa-wand-magic-sparkles",
                                    hint: "Generate description with AI",
                                    stylingMode: "text",
                                    onClick: async e => {
                                        const buttonEl = e.element[0];
                                        buttonEl.classList.add("mdl-wand-loading");
                                        const editor = $editorHost.dxHtmlEditor("instance");
                                        try {
                                            const description = await this.shell.aiSdk.generateDescription(this.shell.getModel());
                                            editor.option("value", description);
                                            formData.description = description;
                                        } catch (error) {
                                            console.error("AI description failed:", error);
                                        } finally {
                                            buttonEl.classList.remove("mdl-wand-loading");
                                        }
                                    }
                                }
                            }
                        ]
                    },
                    onValueChanged: e => { formData.description = e.value; }
                });
            }
        };
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
                    const thumbnailItem = this._createThumbnailEditor(formData);
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            thumbnailItem,
                            {
                                dataField: "name",
                                label: { text: this.shell.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            },
                            this._createDescriptionEditor(formData)
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
    }

    promptDuplicateMetadata() {
        return new Promise(resolve => {
            const popupHost = document.getElementById("save-metadata-popup");
            if (!popupHost) {
                resolve(null);
                return;
            }
            const currentName = this.shell.properties.name || "";
            const formData = {
                name: currentName === "Model" ? "" : currentName,
                description: this.shell.properties.description || ""
            };
            let formInstance = null;
            const popup = $(popupHost).dxPopup({
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                showTitle: true,
                title: this.shell.board.translations.get("Duplicate Model"),
                hideOnOutsideClick: false,
                visible: true,
                wrapperAttr: { class: "mdl-save-metadata-popup" },
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.shell.board.translations.get("Duplicate"),
                            type: "default",
                            stylingMode: "contained",
                            onClick: () => {
                                const validation = formInstance.validate();
                                if (!validation.isValid)
                                    return;
                                popup.dxPopup("hide");
                                resolve({ name: formData.name, description: formData.description });
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
                                resolve(null);
                            }
                        }
                    }
                ],
                contentTemplate: () => {
                    const thumbnailItem = this._createThumbnailEditor(formData);
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            thumbnailItem,
                            {
                                dataField: "name",
                                label: { text: this.shell.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            },
                            this._createDescriptionEditor(formData)
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
    }

    promptModelMetadata() {
        return this._promptMetadata(this.shell.board.translations.get("Save Model"), this.shell.board.translations.get("Save"));
    }

    promptSaveAsMetadata() {
        return this._promptMetadata(this.shell.board.translations.get("Save Model As"), this.shell.board.translations.get("Save"));
    }

    _promptMetadata(title, saveButtonText) {
        return new Promise(resolve => {
            const popupHost = document.getElementById("save-metadata-popup");
            if (!popupHost) {
                resolve(null);
                return;
            }
            const currentName = this.shell.properties.name || "";
            const formData = {
                name: currentName === "Model" ? "" : currentName,
                description: this.shell.properties.description || ""
            };
            let formInstance = null;
            const popup = $(popupHost).dxPopup({
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                showTitle: true,
                title,
                hideOnOutsideClick: false,
                visible: true,
                wrapperAttr: { class: "mdl-save-metadata-popup" },
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: saveButtonText,
                            type: "default",
                            stylingMode: "contained",
                            onClick: () => {
                                const validation = formInstance.validate();
                                if (!validation.isValid)
                                    return;
                                this.shell.properties.name = formData.name;
                                this.shell.properties.description = formData.description;
                                popup.dxPopup("hide");
                                resolve({ name: formData.name, description: formData.description });
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
                                resolve(null);
                            }
                        }
                    }
                ],
                contentTemplate: () => {
                    const thumbnailItem = this._createThumbnailEditor(formData);
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            thumbnailItem,
                            {
                                dataField: "name",
                                label: { text: this.shell.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            },
                            this._createDescriptionEditor(formData)
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
    }
}
