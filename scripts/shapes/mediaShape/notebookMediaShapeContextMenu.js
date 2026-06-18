Object.assign(MediaNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Media Settings",
            icon: "fa-light fa-photo-film-music",
            items: [
                {
                    text: "Keep Proportions",
                    icon: "fa-light fa-expand",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.lockAspectRatio !== false,
                            onValueChanged: event => {
                                this.block.lockAspectRatio = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Synced",
                    icon: "fa-light fa-link",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.mediaSynced !== false,
                            onValueChanged: event => {
                                this.block.mediaSynced = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Iterations/Frame",
                    icon: "fa-light fa-clapperboard-play",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.videoStepsPerFrame ?? 1,
                            min: 1,
                            step: 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.videoStepsPerFrame = event.value;
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
