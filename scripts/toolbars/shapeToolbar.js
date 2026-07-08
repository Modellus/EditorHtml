class ModellusShapeToolbar {
    static createSeparator(templateId = "") {
        if (templateId)
            return $(`<div id="${templateId}" class="toolbar-separator">|</div>`);
        return $("<div class='toolbar-separator'>|</div>");
    }

    static notebookItems(notebook) {
        return [
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-heading",
                    hint: "Header",
                    onClick: () => notebook.addBlock("header")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-text",
                    hint: "Text",
                    onClick: () => notebook.addBlock("text")
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createSeparator()
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-function",
                    hint: "Expression",
                    onClick: () => notebook.addBlock("expression")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-chart-line",
                    hint: "Chart",
                    onClick: () => notebook.addBlock("chart")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-table",
                    hint: "Table",
                    onClick: () => notebook.addBlock("table")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-shapes",
                    hint: "Simulation",
                    onClick: () => notebook.addBlock("simulation")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-gauge",
                    hint: "Gauge",
                    onClick: () => notebook.addBlock("gauge")
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createSeparator()
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-slider",
                    hint: "Slider",
                    onClick: () => notebook.addBlock("slider")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-input-numeric",
                    hint: "Value",
                    onClick: () => notebook.addBlock("value")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-photo-film-music",
                    hint: "Media",
                    onClick: () => notebook.addBlock("media")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-clipboard-question",
                    hint: "Question",
                    onClick: () => notebook.addBlock("question")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-ruler",
                    hint: "Ruler",
                    onClick: () => notebook.addBlock("ruler")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-angle",
                    hint: "Protractor",
                    onClick: () => notebook.addBlock("protractor")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-ruler-triangle",
                    hint: "Slope",
                    onClick: () => notebook.addBlock("slope")
                }
            }
        ];
    }

    static editorItems(shell) {
        return [
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-function",
                    elementAttr: {
                        id: "expression-button"
                    },
                    onClick: _ => shell.commands.addShape("ExpressionShape", "Expression"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Expression Tooltip", 280)
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
                    onClick: _ => shell.commands.addShape("ReferentialShape", "Simulation"),
                    template1: `<div class='dx-icon'>
                                <span class="fa-layers">
                                    <i class="fa-regular fa-circle" data-fa-transform="shrink-12 right-1 up-2"></i>
                                    <i class="fa-regular fa-arrow-right-long fa-rotate-by" data-fa-transform="shrink-12 right-3 up-2"></i>
                                    <i class="fa-thin fa-horizontal-rule" data-fa-transform="down-1"></i>
                                    <i class="fa-thin fa-pipe" data-fa-transform="shrink-4 left-4"></i>
                                    <i class="fa-thin fa-rectangle-wide"></i>
                                </span>
                            </div>`,
                    onInitialized: event => shell.createTranslatedTooltip(event, "Referential Tooltip", 280)
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createSeparator("representation-tools-separator")
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    elementAttr: {
                        id: "chart-button"
                    },
                    icon: "fa-light fa-chart-line",
                    onClick: _ => shell.commands.addShape("ChartShape", "Chart"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Chart Tooltip", 280)
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
                    onClick: _ => shell.commands.addShape("TableShape", "Table"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Table Tooltip", 280)
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
                    onClick: _ => shell.commands.addShape("SliderShape", "Slider"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Slider Tooltip", 280)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-gauge",
                    elementAttr: {
                        id: "gauge-button"
                    },
                    onClick: _ => shell.commands.addShape("GaugeShape", "Gauge"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Gauge Tooltip", 280)
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
                    onClick: _ => shell.commands.addShape("ValueShape", "Value"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Value Tooltip", 280)
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createSeparator("shape-tools-separator")
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    elementAttr: {
                        id: "background-button"
                    },
                    icon: "fa-light fa-photo-film-music",
                    onClick: _ => shell.commands.addShape("MediaShape", "Media"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Media Tooltip", 280)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-text",
                    elementAttr: {
                        id: "text-button",
                        "data-fa-transform": "shrink-8 up-6"
                    },
                    onClick: _ => shell.commands.addShape("TextShape", "Text"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Text Tooltip", 280)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-clipboard-question",
                    elementAttr: {
                        id: "question-button"
                    },
                    onClick: _ => shell.commands.addShape("QuestionShape", "Question"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Question Tooltip", 280)
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createSeparator("measurement-tools-separator")
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-ruler",
                    elementAttr: {
                        id: "ruler-button"
                    },
                    onClick: _ => shell.commands.addShape("RulerShape", "Ruler"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Ruler Tooltip", 280)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-angle",
                    elementAttr: {
                        id: "protractor-button"
                    },
                    onClick: _ => shell.commands.addShape("ProtractorShape", "Protractor"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Protractor Tooltip", 280)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-ruler-triangle",
                    elementAttr: {
                        id: "slope-button"
                    },
                    onClick: _ => shell.commands.addShape("SlopeShape", "Slope"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Slope Tooltip", 280)
                }
            }
        ];
    }
}
