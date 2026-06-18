Object.assign(SliderNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Terms",
            icon: "fa-light fa-function",
            items: [
                {
                    text: "Value",
                    icon: "fa-light fa-input-numeric",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.term || "", value => {
                            this.block.term = value;
                            this.markChanged();
                        });
                    }
                }
            ]
        });
        items.push({
            text: "Scale",
            icon: "fa-light fa-ruler-vertical",
            items: [
                {
                    text: "Auto Scale",
                    icon: "fa-light fa-up-right-and-down-left-from-center",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.sliderAutoScale !== false,
                            onValueChanged: event => {
                                this.block.sliderAutoScale = event.value;
                                this.refreshSlider();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Minimum",
                    icon: "fa-light fa-arrow-down-short-wide",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.sliderMin ?? 0,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.sliderMin = event.value;
                                this.refreshSlider();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Maximum",
                    icon: "fa-light fa-arrow-up-wide-short",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.sliderMax ?? 100,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.sliderMax = event.value;
                                this.refreshSlider();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Precision",
                    icon: "fa-light fa-ruler-triangle",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.sliderStep ?? 1,
                            min: 0,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.sliderStep = event.value;
                                this.refreshSlider();
                                this.markChanged();
                            }
                        });
                    }
                }
            ]
        });
        return items;
    }
});
