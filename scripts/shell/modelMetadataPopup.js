class ModelMetadataPopup {
    constructor({ translations, onGenerateDescription = null }) {
        this.translations = translations;
        this.onGenerateDescription = onGenerateDescription;
        this._popupInstance = null;
        this._formInstance = null;
        this._thumbnailFile = null;
        this._thumbnailCleared = false;
    }

    show({ popupTitle, saveButtonText, name, description, thumbnailUrl }) {
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
                const descriptionItemId = "model-metadata-description-editor-" + Date.now();
                const descriptionToolbarId = "model-metadata-description-toolbar-" + Date.now();
                const items = [
                    {
                        label: { text: this.translations.get("Thumbnail"), visible: true },
                        template: (_, itemElement) => {
                            const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
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
                                }
                            });
                            itemHost.appendChild(thumbnailControl.createHost().get(0));
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
                        label: { text: this.translations.get("Description"), visible: true },
                        template: (_, itemElement) => {
                            const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
                            itemHost.insertAdjacentHTML("beforeend", `
                                <div id="${descriptionItemId}"></div>
                                <div id="${descriptionToolbarId}" class="html-editor-toolbar"></div>
                            `);
                            const editorElement = document.getElementById(descriptionItemId);
                            const toolbarElement = document.getElementById(descriptionToolbarId);
                            const toolbarItems = [
                                "bold", "italic", "underline", "separator",
                                "orderedList", "bulletList"
                            ];
                            if (this.onGenerateDescription) {
                                toolbarItems.push("separator");
                                toolbarItems.push({
                                    name: "generateDescription",
                                    widget: "dxButton",
                                    options: {
                                        icon: "fa-light fa-wand-magic-sparkles",
                                        hint: "Generate description with AI",
                                        stylingMode: "text",
                                        onClick: async buttonEvent => {
                                            const buttonEl = buttonEvent.element[0];
                                            buttonEl.classList.add("mdl-wand-loading");
                                            try {
                                                const generatedDescription = await this.onGenerateDescription();
                                                descriptionEditor.option("value", generatedDescription);
                                                formData.description = generatedDescription;
                                            } finally {
                                                buttonEl.classList.remove("mdl-wand-loading");
                                            }
                                        }
                                    }
                                });
                            }
                            const descriptionEditor = new DevExpress.ui.dxHtmlEditor(editorElement, {
                                valueType: "markdown",
                                value: formData.description,
                                height: 120,
                                stylingMode: "filled",
                                toolbar: {
                                    container: toolbarElement,
                                    items: toolbarItems
                                },
                                onValueChanged: changeEvent => { formData.description = changeEvent.value; }
                            });
                        }
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
                this._popupInstance.option("toolbarItems", this._buildToolbarItems(saveButtonText, formData, resolve));
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
                toolbarItems: this._buildToolbarItems(saveButtonText, formData, resolve),
                contentTemplate: contentElement => buildContent(contentElement, thumbnailUrl),
                position: { at: "center", of: window }
            });
        });
    }

    _buildToolbarItems(saveButtonText, formData, resolve) {
        return [
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
            },
            {
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
            }
        ];
    }
}
