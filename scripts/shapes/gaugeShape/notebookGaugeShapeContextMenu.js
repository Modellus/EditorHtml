Object.assign(GaugeNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Terms",
            icon: "fa-light fa-function",
            items: [
                {
                    text: "Angle",
                    icon: "fa-light fa-angle",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.angleTerm || "", value => {
                            this.block.angleTerm = value;
                            this.markChanged();
                        });
                    }
                },
                {
                    text: "Magnitude",
                    icon: "fa-light fa-arrows-left-right",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.magnitudeTerm || "", value => {
                            this.block.magnitudeTerm = value;
                            this.markChanged();
                        });
                    }
                }
            ]
        });
        items.push({
            text: "Gauge Settings",
            icon: "fa-light fa-dial",
            items: [
                {
                    text: "Start angle (°)",
                    icon: "fa-light fa-play",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.startAngle ?? 135,
                            showSpinButtons: true,
                            step: 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.startAngle = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "End angle (°)",
                    icon: "fa-light fa-stop",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.endAngle ?? 45,
                            showSpinButtons: true,
                            step: 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.endAngle = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Angle step (°)",
                    icon: "fa-light fa-ruler-combined",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.anglePrecision ?? 1,
                            min: 0,
                            showSpinButtons: true,
                            step: 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.anglePrecision = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Snap angle",
                    icon: "fa-light fa-magnet",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.snapToAngleTick === true,
                            onValueChanged: event => {
                                this.block.snapToAngleTick = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Min magnitude",
                    icon: "fa-light fa-arrow-down-short-wide",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.minimumMagnitude ?? 0,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.minimumMagnitude = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Max magnitude",
                    icon: "fa-light fa-arrow-up-wide-short",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.maximumMagnitude ?? 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.maximumMagnitude = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Magnitude step",
                    icon: "fa-light fa-ruler-triangle",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.magnitudePrecision ?? 0.1,
                            min: 0,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.magnitudePrecision = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Snap magnitude",
                    icon: "fa-light fa-magnet",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.snapToMagnitudeTick === true,
                            onValueChanged: event => {
                                this.block.snapToMagnitudeTick = event.value;
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
