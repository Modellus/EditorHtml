class ValueNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-input-numeric", "Value");
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Term", stacked: true, buildControl: $container => $container.append(this._termControl) },
            { text: "Size", stacked: true, buildControl: $container => $container.append(this._fontSizeTermControl) }
        );
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        if (!term)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Term</span></span>`;
        else
            element.innerHTML = this.createNameButtonTermMarkup(term);
    }

    buildFontMenuContent(contentElement) {
        const boldButtonId = `font-bold-btn-${this.id}`;
        const italicButtonId = `font-italic-btn-${this.id}`;
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: "auto", width: "auto" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: [
                {
                    text: "Size",
                    stacked: true,
                    buildControl: $parent => $parent.append(this._fontSizeTermControl)
                },
                {
                    text: "Style",
                    stacked: true,
                    buildControl: $parent => {
                        $parent[0].innerHTML = `<div style="display:flex;gap:4px"><div id="${boldButtonId}"></div><div id="${italicButtonId}"></div></div>`;
                        $(`#${boldButtonId}`, $parent).dxButton({
                            text: "B",
                            stylingMode: this.properties.fontBold ? "contained" : "outlined",
                            onClick: () => {
                                const newValue = !this.properties.fontBold;
                                this.setPropertyCommand("fontBold", newValue);
                                $(`#${boldButtonId}`, $parent).dxButton("instance").option("stylingMode", newValue ? "contained" : "outlined");
                            }
                        });
                        $(`#${italicButtonId}`, $parent).dxButton({
                            text: "I",
                            stylingMode: this.properties.fontItalic ? "contained" : "outlined",
                            onClick: () => {
                                const newValue = !this.properties.fontItalic;
                                this.setPropertyCommand("fontItalic", newValue);
                                $(`#${italicButtonId}`, $parent).dxButton("instance").option("stylingMode", newValue ? "contained" : "outlined");
                            }
                        });
                    }
                }
            ],
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-stacked-control"));
            }
        });
    }

    refreshFontToolbarControl() {
    }
}

NotebookShapesFactory.register("value", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ValueNotebookShape(notebookEditor, block)
});
