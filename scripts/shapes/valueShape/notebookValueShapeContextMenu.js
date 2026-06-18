Object.assign(ValueNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Font",
            icon: "fa-light fa-text",
            items: [
                {
                    text: "Size",
                    icon: "fa-light fa-arrows-up-down",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.fontSizeTerm || "14", value => {
                            this.block.fontSizeTerm = value;
                            this.markChanged();
                        }, { width: 90 });
                    }
                },
                {
                    text: "Style",
                    icon: "fa-light fa-bold",
                    buildControl: $container => {
                        const styleHost = $("<div style=\"display:flex;gap:4px\"></div>").appendTo($container);
                        $("<div>").appendTo(styleHost).dxButton({
                            text: "B",
                            stylingMode: this.block.fontBold === true ? "contained" : "outlined",
                            onClick: () => {
                                this.block.fontBold = !(this.block.fontBold === true);
                                this.markChanged();
                                this.notebookEditor._reloadBlockList();
                            }
                        });
                        $("<div>").appendTo(styleHost).dxButton({
                            text: "I",
                            stylingMode: this.block.fontItalic === true ? "contained" : "outlined",
                            onClick: () => {
                                this.block.fontItalic = !(this.block.fontItalic === true);
                                this.markChanged();
                                this.notebookEditor._reloadBlockList();
                            }
                        });
                    }
                },
            ]
        });
        items.push({
            text: "Terms",
            icon: "fa-light fa-function",
            items: [
                {
                    text: "Term",
                    icon: "fa-light fa-input-text",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.term || "", value => {
                            this.block.term = value;
                            this.markChanged();
                        });
                    }
                },
                {
                    text: "Sound",
                    icon: "fa-light fa-volume",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSelectBox({
                            items: ["none", "triangle", "sine", "square", "sawtooth"],
                            value: this.block.soundInstrument || "none",
                            stylingMode: "filled",
                            width: 120,
                            onValueChanged: event => {
                                this.block.soundInstrument = event.value;
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
