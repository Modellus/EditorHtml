class SliderNotebookShape extends NotebookShape {
    renderContentHtml() {
        return `<div id="${this.getHostId()}" class="notebook-slider-control"></div>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        const sliderContainer = contentElement.querySelector(`#${this.getHostId()}`);
        if (!sliderContainer)
            return;
        const sliderValue = Number.isFinite(Number(this.block.content)) ? Number(this.block.content) : 50;
        const min = this.block.sliderMin ?? 0;
        const max = this.block.sliderMax ?? 100;
        const step = this.block.sliderStep ?? 1;
        $(sliderContainer).dxSlider({
            min,
            max,
            step,
            value: sliderValue,
            tooltip: { enabled: true, showMode: "always", position: "top" },
            onValueChanged: event => this.onValueChanged(event.value)
        });
        this._sliderContainer = sliderContainer;
    }

    onValueChanged(value) {
        this.block.content = String(value);
        this.markChanged();
    }

    refreshSlider() {
        if (!this._sliderContainer)
            return;
        const instance = $(this._sliderContainer).dxSlider("instance");
        if (!instance)
            return;
        instance.option("min", this.block.sliderMin ?? 0);
        instance.option("max", this.block.sliderMax ?? 100);
        instance.option("step", this.block.sliderStep ?? 1);
    }

    unmount() {
        if (this._sliderContainer) {
            const instance = $(this._sliderContainer).dxSlider("instance");
            if (instance)
                instance.dispose();
        }
        this._sliderContainer = null;
        super.unmount();
    }
}

NotebookShapesFactory.register("slider", {
    defaultContent: "50",
    createShape: (notebookEditor, block) => new SliderNotebookShape(notebookEditor, block)
});
