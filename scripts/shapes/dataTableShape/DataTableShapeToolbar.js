var DataTableShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, DataTableShapeToolbarMixin.createToolbar);
        this.normalizeColumns();
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
                template: () => $('<div class="toolbar-separator">|</div>')
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
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    // Case selector + its trailing separator, toggled as a unit; only visible when
                    // the model defines more than one case (see refreshDataCaseToolbarControl).
                    this._dataCaseItemElement = $('<div class="mdl-data-case-item" style="display:none;align-items:center"></div>');
                    const buttonContainer = $('<div></div>');
                    this._dataCaseItemElement.append(buttonContainer, $('<div class="toolbar-separator">|</div>'));
                    this.createDataCaseDropDownButton(buttonContainer);
                    return this._dataCaseItemElement;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createDataDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }
};
if (typeof DataTableShape !== "undefined") Object.assign(DataTableShape.prototype, DataTableShapeToolbarMixin);
