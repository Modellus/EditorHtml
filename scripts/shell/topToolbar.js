class TopToolbar {
    constructor(shell) {
        this.shell = shell;
        this.instance = null;
        this.expressionButton = null;
        this.valueButton = null;
        this.referentialButton = null;
        this.chartButton = null;
        this.tableButton = null;
        this.backgroundButton = null;
        this.textButton = null;
        this.rulerButton = null;
        this.protractorButton = null;
        this.gaugeButton = null;
        this._create();
    }

    _create() {
        $("#toolbar").dxToolbar({
            items: [
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-bars",
                        hint: "",
                        elementAttr: {
                            id: "menu-button",
                            title: ""
                        },
                        onClick: _ => this.shell.contextMenuController.show()
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "expression-button",
                            style: "font-family: cursive; font-size: 16px"
                        },
                        text: "X",
                        onClick: _ => this.shell.commands.addShape("ExpressionShape", "Expression"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Expression Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-shapes",
                        elementAttr: {
                            id: "referential-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ReferentialShape", "Simulation"),
                        template1: `<div class='dx-icon'>
                                <span class="fa-layers">
                                    <i class="fa-regular fa-circle" data-fa-transform="shrink-12 right-1 up-2"></i>
                                    <i class="fa-regular fa-arrow-right-long fa-rotate-by" data-fa-transform="shrink-12 right-3 up-2"></i>
                                    <i class="fa-thin fa-horizontal-rule" data-fa-transform="down-1"></i>
                                    <i class="fa-thin fa-pipe" data-fa-transform="shrink-4 left-4"></i>
                                    <i class="fa-thin fa-rectangle-wide"></i>
                                </span>
                            </div>`,
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Referential Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='representation-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "chart-button"
                        },
                        icon: "fa-light fa-chart-line",
                        onClick: _ => this.shell.commands.addShape("ChartShape", "Chart"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Chart Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "table-button"
                        },
                        icon: "fa-light fa-table",
                        onClick: _ => this.shell.commands.addShape("TableShape", "Table"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Table Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "range-selector-button"
                        },
                        icon: "fa-light fa-slider",
                        onClick: _ => this.shell.commands.addShape("SliderShape", "Slider"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Slider Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {                        icon: "fa-light fa-gauge",
                        elementAttr: {
                            id: "gauge-button"
                        },
                        onClick: _ => this.shell.commands.addShape("GaugeShape", "Gauge"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Gauge Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-input-numeric",
                        elementAttr: {
                            id: "value-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ValueShape", "Value"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Value Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='shape-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "background-button"
                        },
                        icon: "fa-light fa-image",
                        onClick: _ => this.shell.commands.addShape("ImageShape", "Image"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Background Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-quotes",
                        elementAttr: {
                            id: "text-button",
                            "data-fa-transform": "shrink-8 up-6"
                        },
                        onClick: _ => this.shell.commands.addShape("TextShape", "Text"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Text Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='measurement-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-ruler",
                        elementAttr: {
                            id: "ruler-button"
                        },
                        onClick: _ => this.shell.commands.addShape("RulerShape", "Ruler"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Ruler Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {                        icon: "fa-light fa-angle",
                        elementAttr: {
                            id: "protractor-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ProtractorShape", "Protractor"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Protractor Tooltip", 280)
                    }
                }
            ]
        });
        this.instance = $("#toolbar").dxToolbar("instance");
        this.expressionButton = $("#expression-button").dxButton("instance");
        this.valueButton = $("#value-button").dxButton("instance");
        this.referentialButton = $("#referential-button").dxButton("instance");
        this.chartButton = $("#chart-button").dxButton("instance");
        this.tableButton = $("#table-button").dxButton("instance");
        this.backgroundButton = $("#background-button").dxButton("instance");
        this.textButton = $("#text-button").dxButton("instance");
        this.rulerButton = $("#ruler-button").dxButton("instance");
        this.protractorButton = $("#protractor-button").dxButton("instance");
        this.gaugeButton = $("#gauge-button").dxButton("instance");
    }

    update() {
        const disabled = this.shell.board.selection.selectedShape == null || !["BodyShape", "VectorShape", "ImageShape", "ReferentialShape"].includes(this.shell.board.selection.selectedShape.constructor.name);
    }
}
