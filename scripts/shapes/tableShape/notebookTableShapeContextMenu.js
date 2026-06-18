Object.assign(TableNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Terms",
            icon: "fa-light fa-function",
            items: [
                {
                    text: "Columns",
                    icon: "fa-light fa-table-columns",
                    buildControl: $container => {
                        this.createNotebookTermsCollectionControl($container, this.block.columns || [], values => {
                            this.block.columns = values;
                            this.markChanged();
                        });
                    }
                }
            ]
        });
        items.push({
            text: "Data",
            icon: "fa-light fa-flask",
            items: [
                {
                    text: "Upload CSV",
                    icon: "fa-light fa-file-csv",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxButton({
                            text: "Import",
                            width: 90,
                            stylingMode: "outlined",
                            onClick: () => {
                                this.block.dataSourceMode = "upload";
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Set CSV URL",
                    icon: "fa-light fa-link",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxTextBox({
                            value: this.block.csvUrl || "",
                            placeholder: "https://...",
                            stylingMode: "filled",
                            width: 150,
                            onValueChanged: event => {
                                this.block.dataSourceMode = "url";
                                this.block.csvUrl = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Marketplace Data",
                    icon: "fa-light fa-globe",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxTextBox({
                            value: this.block.marketplaceDataset || "",
                            placeholder: "dataset id",
                            stylingMode: "filled",
                            width: 120,
                            onValueChanged: event => {
                                this.block.dataSourceMode = "marketplace";
                                this.block.marketplaceDataset = event.value;
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Row Step",
                    icon: "fa-light fa-list-ol",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.iterationSkip ?? 0,
                            min: 0,
                            step: 1,
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.iterationSkip = Math.max(0, Math.floor(Number(event.value) || 0));
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
