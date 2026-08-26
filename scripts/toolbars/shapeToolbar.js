class ModellusShapeToolbar {
    static createSeparator(templateId = "") {
        if (templateId)
            return $(`<div id="${templateId}" class="toolbar-separator">|</div>`);
        return $("<div class='toolbar-separator'>|</div>");
    }

    static getMindMapShapeTypes(shell) {
        const translations = shell.board.translations;
        return [
            { text: translations.get("Mind Map Bubble Name"), icon: "fa-light fa-comment", type: "MindMapBubbleShape", name: "Bubble", properties: null },
            { text: translations.get("Mind Map Rectangle Name"), icon: "fa-light fa-rectangle", type: "MindMapRectangleShape", name: "Rectangle", properties: null },
            { text: translations.get("Mind Map Circle Name"), icon: "fa-light fa-circle", type: "MindMapCircleShape", name: "Circle", properties: null },
            { text: translations.get("Mind Map Line Name"), icon: "fa-light fa-slash-forward", type: "MindMapConnectorShape", name: "Line", properties: { startTipType: "none", endTipType: "none", routing: "straight" } },
            { text: translations.get("Connector Name"), icon: "fa-light fa-arrow-right-long", type: "MindMapConnectorShape", name: "Connector", properties: { startTipType: "none", endTipType: "arrow", routing: "curved" } }
        ];
    }

    // The two charts share one toolbar button, the way the three tables do: the button carries the
    // family, the list says which of them is being drawn.
    static getChartShapeTypes(shell) {
        const translations = shell.board.translations;
        return [
            { text: translations.get("Chart Name") ?? "Chart", icon: "fa-light fa-chart-line", type: "ChartShape", name: "Chart", properties: null },
            { text: translations.get("Frequency Chart Name") ?? "Frequencies", icon: "fa-light fa-chart-simple", type: "FrequencyChartShape", name: "Frequencies", properties: null }
        ];
    }

    static getTableShapeTypes(shell) {
        const translations = shell.board.translations;
        return [
            { text: translations.get("Table Name") ?? "Table", icon: "fa-light fa-table", type: "TableShape", name: "Table", properties: null },
            { text: translations.get("Cases Table Name") ?? "Scenarios", icon: "fa-light fa-table-list", type: "CasesTableShape", name: "Scenarios", properties: null },
            { text: translations.get("Data Table Name") ?? "Data Analysis", icon: "fa-light fa-flask", type: "DataTableShape", name: "Data Analysis", properties: null }
        ];
    }

    // A toolbar button that stands for a family of shapes: clicking it opens the list, and picking
    // from the list arms that shape for drawing under the same button. The list is read when the
    // button opens, so it carries whatever the translations say at that moment.
    static createShapeTypeDropDownButton(shell, buttonId, className, icon, tooltipKey, getShapeTypes) {
        const dropdownElement = $(`<div id="${buttonId}" class="${className}">`);
        dropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: icon,
            onInitialized: event => shell.createTranslatedTooltip(event, tooltipKey, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-shape-overlay-popup" },
                width: "auto",
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    $("<div>").appendTo(contentElement).dxList({
                        dataSource: getShapeTypes(),
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${data.icon}"></i><span class="mdl-dropdown-list-label">${data.text}</span></div>`;
                        },
                        onItemClick: event => {
                            dropdownElement.dxDropDownButton("instance").close();
                            shell.shapeDrawController.toggle(event.itemData.type, event.itemData.name, buttonId, event.itemData.properties);
                        }
                    });
                }
            }
        });
        return dropdownElement;
    }

    static createObjectsButton(shell) {
        const buttonElement = $(`<div id="${ObjectPicker.buttonId}" class="mdl-component-type-selector">`);
        buttonElement.dxButton({
            stylingMode: "text",
            icon: "fa-light fa-compass-drafting",
            onInitialized: event => shell.createTranslatedTooltip(event, "Objects Tooltip", 280),
            onClick: () => shell.objectPicker.show()
        });
        return buttonElement;
    }

    static createMindMapDropDownButton(shell) {
        return ModellusShapeToolbar.createShapeTypeDropDownButton(shell, "mindmap-button", "mdl-mindmap-type-selector", "fa-light fa-diagram-project", "Mind Map Tooltip", () => ModellusShapeToolbar.getMindMapShapeTypes(shell));
    }

    static createChartDropDownButton(shell) {
        return ModellusShapeToolbar.createShapeTypeDropDownButton(shell, "chart-button", "mdl-chart-type-selector", "fa-light fa-chart-line", "Chart Tooltip", () => ModellusShapeToolbar.getChartShapeTypes(shell));
    }

    static createTableDropDownButton(shell) {
        return ModellusShapeToolbar.createShapeTypeDropDownButton(shell, "table-button", "mdl-table-type-selector", "fa-light fa-table", "Table Tooltip", () => ModellusShapeToolbar.getTableShapeTypes(shell));
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
                    onClick: _ => shell.shapeDrawController.toggle("ExpressionShape", "Expression", "expression-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("ReferentialShape", "Simulation", "referential-button"),
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
                template: () => ModellusShapeToolbar.createChartDropDownButton(shell)
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createTableDropDownButton(shell)
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    elementAttr: {
                        id: "range-selector-button"
                    },
                    icon: "fa-light fa-slider",
                    onClick: _ => shell.shapeDrawController.toggle("SliderShape", "Slider", "range-selector-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("GaugeShape", "Gauge", "gauge-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("ValueShape", "Value", "value-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("MediaShape", "Media", "background-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("TextShape", "Text", "text-button"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Text Tooltip", 280)
                }
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createMindMapDropDownButton(shell)
            },
            {
                location: "center",
                template: () => ModellusShapeToolbar.createObjectsButton(shell)
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-clipboard-question",
                    elementAttr: {
                        id: "question-button"
                    },
                    onClick: _ => shell.shapeDrawController.toggle("QuestionShape", "Question", "question-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("RulerShape", "Ruler", "ruler-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("ProtractorShape", "Protractor", "protractor-button"),
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
                    onClick: _ => shell.shapeDrawController.toggle("SlopeShape", "Slope", "slope-button"),
                    onInitialized: event => shell.createTranslatedTooltip(event, "Slope Tooltip", 280)
                }
            }
        ];
    }
}
