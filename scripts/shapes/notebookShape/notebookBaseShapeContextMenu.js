Object.assign(NotebookShape.prototype, {
    createContextMenuItems() {
        return [
            this.createPermissionsMenuGroup(),
            this.createColorsMenuGroup(),
            this.createActionsMenuGroup()
        ];
    },

    createPermissionsMenuGroup() {
        return {
            text: "Permissions",
            icon: "fa-light fa-user-lock",
            items: [
                {
                    text: "Visible",
                    icon: "fa-light fa-eye",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.visibleToUsers !== false,
                            onValueChanged: event => {
                                this.block.visibleToUsers = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Locked",
                    icon: "fa-light fa-lock",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.lockedForUsers === true,
                            onValueChanged: event => {
                                this.block.lockedForUsers = event.value;
                                this.markChanged();
                            }
                        });
                    }
                }
            ]
        };
    },

    createColorsMenuGroup() {
        const colorControl = new ColorControl();
        const backgroundColorPicker = colorControl.createEditor(this.block.backgroundColor || "transparent", value => {
            this.block.backgroundColor = value;
            this.blockElement?.style.setProperty("--block-bg-color", value);
            this.markChanged();
        });
        const borderColorPicker = colorControl.createEditor(this.block.borderColor || "#e8e8e8", value => {
            this.block.borderColor = value;
            this.blockElement?.style.setProperty("--block-border-color", value);
            this.markChanged();
        });
        return {
            text: "Colors",
            icon: "fa-light fa-palette",
            items: [
                { text: "Background", icon: "fa-light fa-fill", buildControl: $p => $p.append(backgroundColorPicker) },
                { text: "Border", icon: "fa-light fa-square", buildControl: $p => $p.append(borderColorPicker) }
            ]
        };
    },

    createActionsMenuGroup() {
        return {
            text: "Actions",
            icon: "fa-light fa-ellipsis-vertical",
            items: [
                {
                    text: "Remove",
                    icon: "fa-light fa-trash-can",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Remove",
                            stylingMode: "contained",
                            type: "danger",
                            width: 100,
                            onClick: () => {
                                this.notebookEditor.removeBlock(this.block.id);
                            }
                        });
                    }
                },
                {
                    text: "Reset",
                    icon: "fa-light fa-arrow-rotate-left",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Reset",
                            stylingMode: "outlined",
                            width: 100,
                            onClick: () => {
                                const resetBlock = NotebookShapesFactory.createDefaultBlock(this.block.type, this.block.id);
                                const currentId = this.block.id;
                                const currentType = this.block.type;
                                for (const key of Object.keys(this.block)) {
                                    if (key !== "id" && key !== "type")
                                        delete this.block[key];
                                }
                                Object.assign(this.block, resetBlock);
                                this.block.id = currentId;
                                this.block.type = currentType;
                                this.notebookEditor._reloadBlockList();
                                this.markChanged();
                            }
                        });
                    }
                }
            ]
        };
    }
});
