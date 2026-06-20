var VectorShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, VectorShapeToolbarMixin.createToolbar);
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const xOriginDisplayMode = this.getTermDisplayModeProperty("xOriginTerm");
        const xOriginDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "xOriginTerm", "xOriginTermCase", true, xOriginDisplayMode, true);
        this.termFormControls["xOriginTerm"] = { termControl: xOriginDescriptor.termControl };
        this._xOriginDescriptor = xOriginDescriptor;
        const yOriginDisplayMode = this.getTermDisplayModeProperty("yOriginTerm");
        const yOriginDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "yOriginTerm", "yOriginTermCase", true, yOriginDisplayMode, true);
        this.termFormControls["yOriginTerm"] = { termControl: yOriginDescriptor.termControl };
        this._yOriginDescriptor = yOriginDescriptor;
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
                    this.createTipTypeDropDownButton(container);
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
    }
};
if (typeof VectorShape !== "undefined") Object.assign(VectorShape.prototype, VectorShapeToolbarMixin);
