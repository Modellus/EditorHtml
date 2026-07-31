class GaugeNotebookShape extends PlaceholderNotebookShape {
    constructor(notebookEditor, block) {
        super(notebookEditor, block, "fa-light fa-gauge", "Gauge");
        if (this.properties.term == null)
            this.properties.term = this.board.calculator.getDefaultTerm();
        if (this.properties.value == null)
            this.properties.value = 0;
        if (this.properties.autoScale == null)
            this.properties.autoScale = true;
        if (this.properties.minimum == null)
            this.properties.minimum = 0;
        if (this.properties.maximum == null)
            this.properties.maximum = 10;
        if (this.properties.precision == null)
            this.properties.precision = 1;
        if (this.properties.snapToTick == null)
            this.properties.snapToTick = false;
        if (this.properties.startAngle == null)
            this.properties.startAngle = 225;
        if (this.properties.endAngle == null)
            this.properties.endAngle = -45;
        if (this.properties.ranges == null)
            this.properties.ranges = [{ minimum: this.properties.minimum, maximum: this.properties.maximum, color: "transparent" }, { minimum: null, maximum: null, color: "transparent" }];
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Value", stacked: true, buildControl: $container => $container.append(this._termControl) });
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? this.createNameButtonTermMarkup(term, this.properties.term)
            : `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Value</span></span>`;
    }
}

BlocksRegistry.register("gauge", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new GaugeNotebookShape(notebookEditor, block)
});

var GaugeBlock = GaugeNotebookShape;
