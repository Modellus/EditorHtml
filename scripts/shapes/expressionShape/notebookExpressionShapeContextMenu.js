Object.assign(ExpressionNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Shortcuts",
            items: [
                {
                    text: "Multiline",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.multiline !== false,
                            onValueChanged: event => {
                                this.block.multiline = event.value;
                                if (this.expressionControl)
                                    this.expressionControl.setMultiline(event.value);
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Fraction",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Insert",
                            width: 90,
                            stylingMode: "outlined",
                            onClick: () => this.insertShortcut("\\frac{a}{b}")
                        });
                    }
                },
                {
                    text: "Square Root",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Insert",
                            width: 90,
                            stylingMode: "outlined",
                            onClick: () => this.insertShortcut("\\sqrt{x}")
                        });
                    }
                },
                {
                    text: "Power",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Insert",
                            width: 90,
                            stylingMode: "outlined",
                            onClick: () => this.insertShortcut("x^2")
                        });
                    }
                }
            ]
        });
        return items;
    },

    insertShortcut(shortcutText) {
        if (!this.expressionControl)
            return;
        const currentValue = this.expressionControl.getValue();
        this.expressionControl.setValue(`${currentValue}${shortcutText}`);
        this.block.content = this.expressionControl.getValue();
        this.markChanged();
    }
});
