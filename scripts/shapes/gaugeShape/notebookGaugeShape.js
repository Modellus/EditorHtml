class GaugeNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-gauge", "Gauge");
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Angle", stacked: true, buildControl: $container => $container.append(this._angleTermControl) },
            { text: "Magnitude", stacked: true, buildControl: $container => $container.append(this._magnitudeTermControl) }
        );
    }

    renderTermsButtonTemplate(element) {
        const angleTerm = this.formatTermForDisplay(this.properties.angleTerm);
        const magnitudeTerm = this.formatTermForDisplay(this.properties.magnitudeTerm);
        const anglePart = angleTerm ? this.createNameButtonTermMarkup(angleTerm) : "";
        const separator = (angleTerm && magnitudeTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
        const magnitudePart = magnitudeTerm ? this.createNameButtonTermMarkup(magnitudeTerm) : "";
        if (!anglePart && !magnitudePart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${anglePart}${separator}${magnitudePart}`;
    }
}

NotebookShapesFactory.register("gauge", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new GaugeNotebookShape(notebookEditor, block)
});
