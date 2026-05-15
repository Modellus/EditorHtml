class ModelSavePopup {
    constructor({ translations, onGenerateDescription = null }) {
        this.translations = translations;
        this.onGenerateDescription = onGenerateDescription;
        this._popupInstance = null;
        this._formInstance = null;
        this._thumbnailControl = null;
        this._thumbnailFile = null;
        this._thumbnailCleared = false;
    }

    show({ popupTitle, saveButtonText, name, description, thumbnailUrl, discardButtonText = null, seed = null }) {
        return new Promise(resolve => {
            let popupHost = document.getElementById("model-metadata-popup");
            if (!popupHost) {
                document.body.insertAdjacentHTML("beforeend", `<div id="model-metadata-popup"></div>`);
                popupHost = document.getElementById("model-metadata-popup");
            }
            this._thumbnailFile = null;
            this._thumbnailCleared = false;
            const formData = { name: name || "", description: description || "" };
            const buildContent = (contentElement, initialThumbnailUrl) => {
                const host = contentElement.get ? contentElement.get(0) : contentElement;
                host.innerHTML = `<div id="model-metadata-popup-form"></div>`;
                const formHost = document.getElementById("model-metadata-popup-form");
                const items = [
                    {
                        label: { text: this.translations.get("Thumbnail"), visible: true },
                        template: (_, itemElement) => {
                            const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
                            const placeholderStyle = Utils.generateThumbPlaceholder(seed ?? name);
                            const thumbnailControl = new ImageControl({
                                dropHint: this.translations.get("Thumbnail Dropzone"),
                                imageSource: initialThumbnailUrl || "",
                                onUploadFile: file => {
                                    this._thumbnailFile = file;
                                    this._thumbnailCleared = false;
                                    return Promise.resolve(URL.createObjectURL(file));
                                },
                                onImageCleared: () => {
                                    this._thumbnailFile = null;
                                    this._thumbnailCleared = true;
                                    thumbnailControl.container[0].setAttribute("style", placeholderStyle);
                                }
                            });
                            this._thumbnailControl = thumbnailControl;
                            const hostElement = thumbnailControl.createHost().get(0);
                            this._thumbnailControl.activateDocumentPaste();
                            if (!initialThumbnailUrl)
                                hostElement.setAttribute("style", placeholderStyle);
                            itemHost.appendChild(hostElement);
                        }
                    },
                    {
                        dataField: "name",
                        label: { text: this.translations.get("Name"), visible: true },
                        editorType: "dxTextBox",
                        editorOptions: { stylingMode: "filled" },
                        validationRules: [{ type: "required" }]
                    },
                    {
                        dataField: "description",
                        label: { text: this.translations.get("Description"), visible: true },
                        editorType: "dxTextArea",
                        editorOptions: { stylingMode: "filled", height: 100 }
                    }
                ];
                this._formInstance = new DevExpress.ui.dxForm(formHost, {
                    formData,
                    colCount: 1,
                    items
                });
            };
            if (this._popupInstance) {
                buildContent(this._popupInstance.content(), thumbnailUrl);
                this._popupInstance.option("title", popupTitle);
                this._popupInstance.option("toolbarItems", this._buildToolbarItems(saveButtonText, discardButtonText, formData, resolve));
                this._popupInstance.show();
                return;
            }
            this._popupInstance = new DevExpress.ui.dxPopup(popupHost, {
                visible: true,
                showTitle: true,
                title: popupTitle,
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                hideOnOutsideClick: false,
                wrapperAttr: { class: "mdl-save-metadata-popup" },
                toolbarItems: this._buildToolbarItems(saveButtonText, discardButtonText, formData, resolve),
                contentTemplate: contentElement => buildContent(contentElement, thumbnailUrl),
                onHidden: () => this._thumbnailControl?.deactivateDocumentPaste(),
                position: { at: "center", of: window }
            });
        });
    }

    _buildToolbarItems(saveButtonText, discardButtonText, formData, resolve) {
        const items = [
            {
                widget: "dxButton",
                location: "after",
                toolbar: "bottom",
                options: {
                    text: saveButtonText,
                    type: "default",
                    stylingMode: "contained",
                    onClick: () => {
                        const validation = this._formInstance?.validate();
                        if (validation && !validation.isValid)
                            return;
                        this._popupInstance.hide();
                        resolve({
                            name: formData.name,
                            description: formData.description,
                            thumbnailFile: this._thumbnailFile,
                            thumbnailCleared: this._thumbnailCleared
                        });
                    }
                }
            }
        ];
        if (discardButtonText) {
            items.push({
                widget: "dxButton",
                location: "after",
                toolbar: "bottom",
                options: {
                    text: discardButtonText,
                    stylingMode: "text",
                    onClick: () => {
                        this._popupInstance.hide();
                        resolve(false);
                    }
                }
            });
        }
        items.push({
            widget: "dxButton",
            location: "after",
            toolbar: "bottom",
            options: {
                text: this.translations.get("Cancel"),
                stylingMode: "text",
                onClick: () => {
                    this._popupInstance.hide();
                    resolve(null);
                }
            }
        });
        return items;
    }
}
