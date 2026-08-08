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
if (typeof BodyShape !== "undefined") Object.assign(BodyShape.prototype, CharacterPickerMixin, BodyShapeToolbarMixin);
