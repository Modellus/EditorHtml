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
        const min = this.block.minimum ?? 0;
        const max = this.block.maximum ?? 100;
        const step = this.block.precision ?? 1;
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
        instance.option("min", this.block.minimum ?? 0);
        instance.option("max", this.block.maximum ?? 100);
        instance.option("step", this.block.precision ?? 1);
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Value", stacked: true, buildControl: $container => $container.append(this._termControl) });
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? this.createNameButtonTermMarkup(term)
            : `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Value</span></span>`;
    }

    createScaleDropDownButton(container) {
        this._scaleDropdownElement = $('<div>');
        this._scaleDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-ruler-vertical",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildScaleMenuContent(contentElement)
            }
        });
        this._scaleDropdownElement.appendTo(container);
    }

    buildScaleMenuContent(contentElement) {
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: "auto", width: "auto" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: [
                {
                    text: "Auto Scale",
                    buildControl: $container => {
                        $('<div>').appendTo($container).dxSwitch({
                            value: this.properties.autoScale !== false,
                            onValueChanged: event => this.setPropertyCommand("autoScale", event.value)
                        });
                    }
                },
                {
                    text: "Minimum",
                    buildControl: $container => {
                        $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                            value: this.properties.minimum,
                            onValueChanged: event => this.setPropertyCommand("minimum", event.value)
                        })).appendTo($container);
                    }
                },
                {
                    text: "Maximum",
                    buildControl: $container => {
                        $('<div>').dxNumberBox(Object.assign(this.getPrecisionNumberEditorOptions({ showSpinButtons: false }), {
                            value: this.properties.maximum,
                            onValueChanged: event => this.setPropertyCommand("maximum", event.value)
                        })).appendTo($container);
                    }
                },
                {
                    text: "Precision",
                    buildControl: $container => {
                        $('<div>').dxNumberBox({
                            value: this.properties.precision,
                            min: 0,
                            step: 0.1,
                            showSpinButtons: true,
                            stylingMode: "filled",
                            onValueChanged: event => this.setPropertyCommand("precision", event.value)
                        }).appendTo($container);
                    }
                }
            ],
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(element).find(".mdl-dropdown-list-control"));
            }
        });
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
