Object.assign(RulerNotebookShape.prototype, {
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
                }
            ]
        });
        return items;
    }
});
