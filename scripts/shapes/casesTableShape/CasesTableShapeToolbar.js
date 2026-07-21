var CasesTableShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, CasesTableShapeToolbarMixin.createToolbar);
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
                    const container = $('<div></div>');
                    this.createAddGroupButton(container);
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
    },
    createAddGroupButton(itemElement) {
        this._addGroupButtonElement = $('<div>');
        this._addGroupButtonElement.dxButton({
            icon: "fa-light fa-square-plus",
            stylingMode: "text",
            onInitialized: e => Utils.createTranslatedTooltip(e, "Add Group Tooltip", this.board.translations, 200),
            onClick: () => this.addGroup()
        });
        this._addGroupButtonElement.appendTo(itemElement);
    }
};
if (typeof CasesTableShape !== "undefined") Object.assign(CasesTableShape.prototype, CasesTableShapeToolbarMixin);
