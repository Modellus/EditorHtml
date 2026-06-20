var BodyShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, BodyShapeToolbarMixin.createToolbar);
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const sizeDisplayMode = this.getTermDisplayModeProperty("sizeTerm");
        const sizeDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "sizeTerm", "sizeTermCase", true, sizeDisplayMode, true);
        this.termFormControls["sizeTerm"] = { termControl: sizeDescriptor.termControl };
        this._sizeDescriptor = sizeDescriptor;
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createMotionDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            this.createRemoveToolbarItem()
        );
        return items;
    },
    showCharacterPickerPopup() {
        this._selectedCharacterKey = this.properties.characterKey ?? "";
        if (this._characterPickerPopupInstance) {
            this._buildCharacterPickerContent(this._characterPickerPopupInstance.content());
            this._characterPickerPopupInstance.show();
            return;
        }
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        this._characterPickerPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: true,
            showTitle: true,
            title: this.board.translations.get("Select Character") ?? "Select Character",
            width: 1040,
            height: 600,
            dragEnabled: true,
            hideOnOutsideClick: true,
            showCloseButton: true,
            wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-character-picker-popup"),
            toolbarItems: [
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Select") ?? "Select",
                        type: "default",
                        stylingMode: "contained",
                        onClick: () => {
                            this.setPropertyCommand("characterKey", this._selectedCharacterKey);
                            this.refreshShapeColorToolbarControl();
                            this._characterPickerPopupInstance.hide();
                        }
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Remove") ?? "Remove",
                        type: "danger",
                        stylingMode: "outlined",
                        onClick: () => {
                            this.setPropertyCommand("characterKey", "");
                            this.refreshShapeColorToolbarControl();
                            this._characterPickerPopupInstance.hide();
                        }
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Cancel") ?? "Cancel",
                        stylingMode: "text",
                        onClick: () => this._characterPickerPopupInstance.hide()
                    }
                }
            ],
            contentTemplate: contentElement => this._buildCharacterPickerContent(contentElement)
        });
    },
    createImageDropZoneEditor() {
        this.imageDropZoneControl = new ImageControl({
            imageSource: this.getImageSource(),
            onUploadFile: (file, onProgress) => this.board.assetManager.uploadAsset(this.id, file, file.name, onProgress),
            onImageChanged: imageSource => this.onImageControlChanged(imageSource),
            onImageCleared: () => this.onImageControlCleared()
        });
        return this.imageDropZoneControl.createHost();
    }
};
if (typeof BodyShape !== "undefined") Object.assign(BodyShape.prototype, BodyShapeToolbarMixin);
