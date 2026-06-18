Object.assign(ProtractorNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Scale",
            icon: "fa-light fa-ruler",
            items: [
                {
                    text: "Scale",
                    icon: "fa-light fa-ruler",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.scale ?? 1,
                            min: 0.000001,
                            stylingMode: "filled",
                            width: 100,
                            onValueChanged: event => {
                                this.block.scale = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Start angle",
                    icon: "fa-light fa-play",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.startAngle ?? 0,
                            stylingMode: "filled",
                            width: 100,
                            onValueChanged: event => {
                                this.block.startAngle = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "End angle",
                    icon: "fa-light fa-stop",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.endAngle ?? 180,
                            stylingMode: "filled",
                            width: 100,
                            onValueChanged: event => {
                                this.block.endAngle = event.value;
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
