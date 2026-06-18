Object.assign(ChartNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        const chartTypes = ["line", "scatter", "area", "bar"];
        items.push({
            text: "Chart Type",
            icon: "fa-light fa-chart-mixed",
            items: [
                {
                    text: "Type",
                    icon: "fa-light fa-chart-mixed",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSelectBox({
                            items: chartTypes,
                            value: this.block.chartType || "line",
                            stylingMode: "filled",
                            width: 110,
                            onValueChanged: event => {
                                this.block.chartType = event.value;
                                if (this.chartControl)
                                    this.chartControl.setOptions({ series: [{ valueField: "y", name: "y", color: "#2f6db5", chartTypes: [event.value] }] });
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Auto Scale",
                    icon: "fa-light fa-up-right-and-down-left-from-center",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.autoScale !== false,
                            onValueChanged: event => {
                                this.block.autoScale = event.value;
                                if (this.chartControl && event.value)
                                    this.chartControl.domainOverride = { xMin: null, xMax: null, yMin: null, yMax: null };
                                this.chartControl?.render();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Equal Scales",
                    icon: "fa-light fa-equals",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.equalScales === true,
                            onValueChanged: event => {
                                this.block.equalScales = event.value;
                                if (this.chartControl)
                                    this.chartControl.setOptions({ equalScales: event.value });
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Horizontal min",
                    icon: "fa-light fa-arrow-left-long",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.xMin ?? null,
                            placeholder: "Auto",
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.xMin = event.value;
                                this._applyDomainOverride();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Horizontal max",
                    icon: "fa-light fa-arrow-right-long",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.xMax ?? null,
                            placeholder: "Auto",
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.xMax = event.value;
                                this._applyDomainOverride();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Vertical min",
                    icon: "fa-light fa-arrow-down-long",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.yMin ?? null,
                            placeholder: "Auto",
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.yMin = event.value;
                                this._applyDomainOverride();
                                this.markChanged();
                            }
                        });
                    }
                },
                {
                    text: "Vertical max",
                    icon: "fa-light fa-arrow-up-long",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxNumberBox({
                            value: this.block.yMax ?? null,
                            placeholder: "Auto",
                            stylingMode: "filled",
                            width: 90,
                            onValueChanged: event => {
                                this.block.yMax = event.value;
                                this._applyDomainOverride();
                                this.markChanged();
                            }
                        });
                    }
                }
            ]
        });
        items.push({
            text: "Terms",
            icon: "fa-light fa-function",
            items: [
                {
                    text: "Horizontal",
                    icon: "fa-light fa-arrow-right",
                    buildControl: $container => {
                        this.createNotebookTermControl($container, this.block.xTerm || "", value => {
                            this.block.xTerm = value;
                            this.markChanged();
                        });
                    }
                },
                {
                    text: "Vertical",
                    icon: "fa-light fa-arrow-up",
                    buildControl: $container => {
                        this.createNotebookTermsCollectionControl($container, this.block.yTerms || [], values => {
                            this.block.yTerms = values;
                            this.markChanged();
                        });
                    }
                }
            ]
        });
        return items;
    },
    _applyDomainOverride() {
        if (!this.chartControl)
            return;
        this.chartControl.domainOverride = {
            xMin: this.block.xMin ?? null,
            xMax: this.block.xMax ?? null,
            yMin: this.block.yMin ?? null,
            yMax: this.block.yMax ?? null
        };
        this.chartControl.render();
    }
});
