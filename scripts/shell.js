class Shell  {
    constructor(model) {
        this.aiLogic = new AILogic(this);
        this.calculator = new Calculator();
        this.board = new Board(document.getElementById("svg"), this.calculator);
        this.commands = new Commands(this);
        this.properties = {};
        this.setDefaults();
        this.panAndZoom = new PanAndZoom(this.board);
        this.board.svg.addEventListener("zoom", e => this.onZoom(e));
        this.miniMap = new MiniMap(this.board, document.getElementById("MinimapImage"), document.getElementById("MinimapViewport"));
        this.createSettingsPopup();
        this.createContextMenu();
        this.createTopToolbar();
        this.createBottomToolbar();
        this.createChat();
        this.createShapePopup();
        this.board.svg.addEventListener("selected", e => this.onSelected(e));
        this.board.svg.addEventListener("deselected", e => this.onDeselected(e));
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        [BodyShape, ExpressionShape, ChartShape, TableShape, BackgroundShape, VectorShape, ImageShape, ReferentialShape, TextShape, CharacterShape].forEach(shapeClass => this.commands.registerShape(shapeClass));
        this.calculator.on("iterate", e => this.onIterate(e));
        if (model != undefined)
            this.openModel(model);
        this._resumeOnSpaceUp = false;
        window.addEventListener("keydown", e => this.onKeyDown(e));
        window.addEventListener("keyup", e => this.onKeyUp(e));
        this.reset();
    }

    setDefaults() {
        this.properties.language = "en-US";
        this.properties.name = "Model";
        this.properties.description = "";
        this.properties.precision = 2;
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1 };
        this.properties.iterationTerm = "n";
    }

    createTooltip(e, html, width) {
        $("<div>")
            .appendTo("body")
            .dxTooltip({
                target: e.component.element(),
                contentTemplate: function (contentElement) {
                    contentElement.append(
                        $("<div class='tooltip'/>").html(html)
                    )
                },
                showEvent: {
                    delay: 1000,
                    name: "mouseenter" 
                },
                hideEvent: "mouseleave",
                position: "top",
                width: width ?? 200
            });
    }

    createSettingsPopup() {
        $("#settings-popup").dxPopup({
            width: 400,
            height: 400,
            dragEnabled: false,
            shading: false,
            title: this.board.translations.get("Settings Title"),
            showTitle: true,
            hideOnOutsideClick: true,
            contentTemplate: () => this.createSettingsForm(),
            position: {
                at: "center",
                of: window
            }
        });
        this.settingsPopup = $("#settings-popup").dxPopup("instance");
    }

    createSettingsForm() {
        const $form = $("<div id='settings-form'></div>").dxForm({
            colCount: 4,
            formData: this.properties,
            items: [
                {
                    colSpan: 4,
                    template: () => {
                        const container = $("<div class='thumbnail-dropzone'></div>");
                        const preview = $("<img class='thumbnail-preview' alt='Thumbnail preview' />");
                        const hint = $("<div class='thumbnail-hint'></div>")
                            .text(this.board.translations.get("Thumbnail Dropzone"));
                        const uploaderHost = $("<div class='thumbnail-uploader'></div>");
                        const updatePreview = base64 => {
                            if (base64) {
                                preview.attr("src", `data:image/png;base64,${base64}`);
                                hint.hide();
                            } else {
                                preview.removeAttr("src");
                                hint.show();
                            }
                        };
                        updatePreview(this.properties.thumbnailBase64 || "");
                        container.append(preview, hint, uploaderHost);
                        uploaderHost.dxFileUploader({
                            accept: "image/*",
                            multiple: false,
                            uploadMode: "useForm",
                            dropZone: container,
                            dialogTrigger: container,
                            onValueChanged: e => {
                                const file = e.value && e.value[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = event => {
                                    const result = event.target && event.target.result ? event.target.result : "";
                                    const parts = typeof result === "string" ? result.split(",") : [];
                                    const base64 = parts.length > 1 ? parts[1] : "";
                                    this.setProperty("thumbnailBase64", base64);
                                    updatePreview(base64);
                                };
                                reader.readAsDataURL(file);
                            }
                        });
                        return container;
                    }
                },
                {
                    colSpan: 4,
                    dataField: "name",
                    label: { text: this.board.translations.get("Name"), visible: true },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 4,
                    dataField: "description",
                    label: {
                        text: this.board.translations.get("Description")
                    },
                    editorType: "dxHtmlEditor",
                    editorOptions: {
                        height: 120,
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 1,
                    dataField: "precision",
                    label: { 
                        text: this.board.translations.get("Precision") 
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        min: 0,
                        max: 10,
                        step: 1,
                        showSpinButtons: true,
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 4,
                    dataField: "language",
                    editorType: "dxSelectBox",
                    editorOptions: {
                        items: ["en-US", "pt-BR"],
                        value: this.properties.language
                    }
                },
                {
                    colSpan: 1,
                    dataField: "independent.name",
                    label: { 
                        text: this.board.translations.get("Independent.Name") 
                    },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 1,
                    dataField: "independent.start",
                    label: { 
                        text: this.board.translations.get("Independent.Start") 
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 1,
                    dataField: "independent.end",
                    label: { 
                        text: this.board.translations.get("Independent.End") 
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 1,
                    dataField: "independent.step",
                    label: { 
                        text: this.board.translations.get("Independent.Step") 
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 1,
                    dataField: "iterationTerm",
                    label: { 
                        text: this.board.translations.get("IterationTerm") 
                    },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 3
                },
                {
                    colSpan: 4,
                    dataField: "AIApiKey",
                    label: { 
                        text: this.board.translations.get("AIApiKey") 
                    },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                }
            ],
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
        });
        this.settingsForm = $form.dxForm("instance");
        return $form;
    }

    createTopToolbar() {
        $("#toolbar").dxToolbar({
            items: [
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-bars",
                        elementAttr: {
                            id: "menu-button"
                        },
                        onClick: _ => this.contextMenu.show()
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
                        onClick: _ => this.commands.addShape("ExpressionShape", "Expression")
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
                        icon: "fa-light fa-shapes",
                        elementAttr: {
                            id: "referential-button"
                        },
                        onClick: _ => this.commands.addShape("ReferentialShape", "Simulation"),
                        template1: `<div class='dx-icon'>
                                <span class="fa-layers">
                                    <i class="fa-regular fa-circle" data-fa-transform="shrink-12 right-1 up-2"></i>
                                    <i class="fa-regular fa-arrow-right-long fa-rotate-by" data-fa-transform="shrink-12 right-3 up-2"></i>
                                    <i class="fa-thin fa-horizontal-rule" data-fa-transform="down-1"></i>
                                    <i class="fa-thin fa-pipe" data-fa-transform="shrink-4 left-4"></i>
                                    <i class="fa-thin fa-rectangle-wide"></i>
                                </span>
                            </div>`,
                            onInitialized: e => this.createTooltip(e, this.board.translations.get("Referential Tooltip"))
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
                        onClick: _ => this.commands.addShape("ChartShape", "Chart")
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
                        onClick: _ => this.commands.addShape("TableShape", "Table")
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
                            id: "body-button"
                        },
                        icon: "fa-light fa-circle",
                        disabled: true,
                        onClick: _ => this.commands.addShape("BodyShape", "Body")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-arrow-right-long fa-rotate-by",
                        elementAttr: {
                            id: "vector-button",
                            style: "--fa-rotate-angle: -45deg;"
                        },
                        disabled: true,
                        onClick: _ => this.commands.addShape("VectorShape", "Vector")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "image-button"
                        },
                        icon: "fa-light fa-image",
                        disabled: true,
                        onClick: _ => this.commands.addShape("ImageShape", "Image")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "character-button"
                        },
                        disabled: true,
                        icon: "fa-regular fa-child-reaching",
                        onClick: _ => this.commands.addShape("CharacterShape", "Character"),
                        onInitialized: e => this.characterButton = e.component
                    }
                },
                {
                    location: "center",
                    template() {
                      return $("<div id='description-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "background-button"
                        },
                        template: `<div class='dx-icon'>
                                <i class='fa-light fa-panorama fa-lg'></i>
                            </div>`,
                        onClick: _ => this.commands.addShape("BackgroundShape", "Background")
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
                        onClick: _ => this.commands.addShape("TextShape", "Text")
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
                        }
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-angle",
                        elementAttr: {
                            id: "protractor-button"
                        }
                    }
                }
            ]
        });
        this.topToolbar = $("#toolbar").dxToolbar("instance");
        this.expressionButton = $("#expression-button").dxButton("instance");
        this.referentialButton = $("#referential-button").dxButton("instance");
        this.chartButton = $("#chart-button").dxButton("instance");
        this.tableButton = $("#table-button").dxButton("instance");
        this.bodyButton = $("#body-button").dxButton("instance");
        this.vectorButton = $("#vector-button").dxButton("instance");
        this.imageButton = $("#image-button").dxButton("instance");
        this.characterButton = $("#character-button").dxButton("instance");
        this.backgroundButton = $("#background-button").dxButton("instance");
        this.textButton = $("#text-button").dxButton("instance");
        this.rulerButton = $("#ruler-button").dxButton("instance");
        this.protractorButton = $("#protractor-button").dxButton("instance");
    }
    
    createBottomToolbar() {
        $("#bottom-toolbar").dxToolbar({
            items: [
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-minus"
                    },
                    location: "before",
                    onClick: e => this.panAndZoom.setZoom(this.panAndZoom.getZoom() - 0.1)
                },
                {
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "zoomButton"
                        },
                        stylingMode: "text",
                        text: "100 %",
                        onClick: e => this.panAndZoom.setZoom(1)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-plus"
                    },
                    location: "before",
                    onClick: e => this.panAndZoom.setZoom(this.panAndZoom.getZoom() + 0.1)
                },
                {
                    location: "before",
                    template() {
                      return $("<div class='toolbar-separator'>|</div>");
                    }
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-left",
                        onClick: _ => this.undoPressed()
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-right",
                        onClick: _ => this.redoPressed()
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-play",
                        elementAttr: {
                            id: "playPauseButton"
                        },
                        onClick: _ => this.playPausePressed()
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-stop", 
                        elementAttr: {
                            id: "stopButton"
                        },
                        onClick: _ => this.stopPressed()
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template: _ => $("<div id='playHeadMinLabel'></div>")
                },
                {
                    widget: "dxSlider",
                    cssClass: "slider",
                    options: {
                        min: 1,
                        max: 1,
                        value: 1,
                        width: 400,
                        elementAttr: {
                            id: "playHeadSlider"
                        },
                        tooltip: {
                            enabled: true,
                            format: v => {
                                var precision = Utils.getPrecision(this.calculator.properties.independent.step);
                                return this.calculator.getIndependentValue(v).toFixed(precision);
                            },
                            showMode: "always",
                            position: "top",
                        }, 
                        onValueChanged: e => this.iterationChanged(e.value)
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template: _ => $("<div id='playHeadMaxLabel'></div>")
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-backward-step", 
                        elementAttr: {
                            id: "stepBackwardButton"
                        },
                        onClick: _ => this.stepBackwardPressed()
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-forward-step", 
                        elementAttr: {
                            id: "stepForwardButton"
                        },
                        onClick: _ => this.stepForwardPressed()
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template() {
                      return $("<div id='representation-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-repeat",
                        elementAttr: {
                            id: "replayButton"
                        },
                        onClick: _ => this.replayPressed()
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-map",
                        onClick: () => this.miniMapPressed()
                    },
                    location: "after"
                },
                {
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-robot",
                        elementAttr: {
                            id: "chat-button"
                        },
                        onClick: _ => this.chatPressed()
                    }
                }
            ]
        });
        this.bottomToolbar = $("#bottom-toolbar").dxToolbar("instance");
        this.zoom = $("#zoomButton").dxButton("instance");
        this.playPause = $("#playPauseButton").dxButton("instance");
        this.stop = $("#stopButton").dxButton("instance");
        this.replay = $("#replayButton").dxButton("instance");
        this.playHead = $("#playHeadSlider").dxSlider("instance");
        this.stepBackward = $("#stepBackwardButton").dxButton("instance");
        this.stepForward = $("#stepForwardButton").dxButton("instance");
        this.$playHeadMin = $("#playHeadMinLabel");
        this.$playHeadMax = $("#playHeadMaxLabel");
    }
        
    createChat() {
        $("#chat-popup").dxPopup({
            width: 300,
            height: 500,
            shading: false,
            showTitle: false,
            dragEnabled: false,
            hideOnOutsideClick: true,
            animation: null,
            contentTemplate: () => {
                const firstUser = { id: "1", name: "User" };
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
                const initialMessages = [{
                    timestamp: Date.now(),
                    author: secondUser,
                    text: "Hello! I'm here to help you craft your own model. Ask me to create a model."
                }];
                const $chat = $("<div>").appendTo("#chat-popup");
                const chat = $chat.dxChat({
                    width: "100%",
                    height: "100%", 
                    user: firstUser,
                    onMessageEntered: (e) => {
                        var instance = chat.dxChat("instance");
                        instance.renderMessage({
                            text: e.message.text, 
                            author: firstUser,
                            timestamp: Date.now() 
                        });
                        instance.renderMessage({
                            text: e.message.text + "? OK.", 
                            author: secondUser,
                            timestamp: Date.now() 
                        });
                        this.aiLogic.sendToBackend(e.message, instance);
                    },
                    items: initialMessages
                });
                return $chat;
            },
            target: "#toolbar",
            position: {
                my: "bottom right",
                at: "top right",
                of: "#chat-button",
                offset: "0 -20"
            }
        });
        this.chatPopup = $("#chat-popup").dxPopup("instance");
    }
    
    createShapePopup() {
        let savedPosition = null;
        let savedSize = { width: 240, height: 400 };
        try {
            const stored = localStorage.getItem("modellus.shapePopupState");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.position)
                    savedPosition = parsed.position;
                if (parsed && parsed.size)
                    savedSize = parsed.size;
            }
        } catch (error) {
        }
        $("#shape-popup").dxPopup({
            width: savedSize.width,
            height: savedSize.height,
            shading: false,
            showTitle: true,
            dragEnabled: true,
            resizeEnabled: true,
            hideOnOutsideClick: false,
            focusStateEnabled: false,
            showCloseButton: false,
            animation: null,
            title: this.board.translations.get("Properties Title"),
            target: "#svg",
            position: {
                my: "left center",
                at: "left center",
                of: "#svg",
                offset: "20, 0"
            },
            onInitialized(e) {
                this.shapePopup = e.component;
            },
            onPositioned: e => {
                const $content = e.component.content();
                const $overlay = $content.closest(".dx-overlay-content");
                const rect = $overlay.length ? $overlay.get(0).getBoundingClientRect() : null;
                if (rect) {
                    savedPosition = { left: rect.left, top: rect.top };
                    savedSize = { width: rect.width, height: rect.height };
                }
                try {
                    localStorage.setItem("modellus.shapePopupState", JSON.stringify({
                        position: savedPosition,
                        size: savedSize
                    }));
                } catch (error) {
                }
            },
            onHiding: e => {
                const $content = e.component.content();
                const $overlay = $content.closest(".dx-overlay-content");
                const rect = $overlay.length ? $overlay.get(0).getBoundingClientRect() : null;
                if (rect) {
                    savedPosition = { left: rect.left, top: rect.top };
                    savedSize = { width: rect.width, height: rect.height };
                }
                try {
                    localStorage.setItem("modellus.shapePopupState", JSON.stringify({
                        position: savedPosition,
                        size: savedSize
                    }));
                } catch (error) {
                }
            },
            onShowing: e => {
                if (savedPosition) {
                    e.component.option("position", {
                        my: "top left",
                        at: "top left",
                        of: window,
                        offset: `${savedPosition.left} ${savedPosition.top}`
                    });
                    if (savedSize && savedSize.width && savedSize.height) {
                        e.component.option("width", savedSize.width);
                        e.component.option("height", savedSize.height);
                    }
                }
            },
            onShown: e => {
                if (savedSize && savedSize.width && savedSize.height) {
                    e.component.option("width", savedSize.width);
                    e.component.option("height", savedSize.height);
                }
            }
        });
        this.shapePopup = $("#shape-popup").dxPopup("instance");
    }
    
    createContextMenu() {
        var menuItems = [
            {
                text: this.board.translations.get("Clear"),
                icon: "fa-light fa-file",
                shortcut: "Ctrl+N",
                name: "Clear",
                action: _ => this.clearKeepIdentity()
            },
            {
                text: this.board.translations.get("Save"),
                icon: "fa-light fa-cloud-arrow-down",
                shortcut: "Ctrl+S",
                name: "Save",
                action: _ => this.saveToApi()
            },
            {
                text: this.board.translations.get("Import"),
                icon: "fa-light fa-arrow-up-from-square",
                shortcut: "",
                beginGroup: true,
                name: "Import",
                items: [
                    {
                        text: this.board.translations.get("From file"),
                        icon: "fa-light fa-file-import",
                        shortcut: "Ctrl+O",
                        name: "ImportFromFile",
                        action: _ => this.importFromFile()
                    }
                ]
            },
            {
                text: this.board.translations.get("Export"),
                icon: "fa-light fa-arrow-down-to-square",
                shortcut: "",
                name: "Export",
                items: [
                    {
                        text: this.board.translations.get("To file"),
                        icon: "fa-light fa-file-export",
                        shortcut: "",
                        name: "ExportToFile",
                        action: _ => this.exportToFile()
                    },
                    {
                        text: this.board.translations.get("Data"),
                        icon: "fa-light fa-file-excel",
                        shortcut: "",
                        name: "ExportData",
                        action: _ => this.exportData()
                    }
                ]
            },
            {
                text: this.board.translations.get("Settings..."),
                icon: "fa-light fa-gear",
                shortcut: "",
                beginGroup: true,
                name: "Settings",
                action: _ => this.openSettings()
            },
            {
                text: this.board.translations.get("Exit"),
                icon: "fa-light fa-chevrons-left",
                shortcut: "",
                beginGroup: true,
                name: "Exit",
                action: _ => window.location.href = "/marketplace.html"
            }
        ];
        $("#context-menu").dxContextMenu({
            dataSource: menuItems,
            itemTemplate: itemData => {
                const hasChildren = itemData && itemData.items && itemData.items.length;
                return `<div style="display: flex; justify-content: space-between; align-items: center;width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                            <span style="color: #999;">${itemData.shortcut}</span>
                            <span style="width: 12px; text-align: right;">${hasChildren ? "<i class='fa-light fa-chevron-right'></i>" : ""}</span>
                        </div>`;
            },
            onItemClick: e => {
                if (e.itemData && e.itemData.action)
                    e.itemData.action();
            },
            target: "#toolbar",
            position: {
                my: "top left",
                at: "bottom left",
                of: "#menu-button",
                offset: "0 10"
            }
        });
        this.contextMenu = $("#context-menu").dxContextMenu("instance");
    }

    setProperties(properties) {
        if (!properties)
            properties = this.properties;
        else
            Utils.mergeProperties(properties, this.properties);
        this.calculator.setProperties(properties.precision, properties.independent, properties.iterationTerm);
    }
    
    setProperty(name, value) {
        const keys = name.split('.');
        let current = this.properties;
        for (let i = 0; i < keys.length - 1; i++)
            current = current[keys[i]];
        current[keys[keys.length - 1]] = value;
        if(name.includes("independent") || name.includes("iteration"))
            this.calculator.setProperty(name, value);    
        if (name == "AIApiKey") {
            this.aiLogic.apiKey = value;
            this.resetChat();
        }
        this.reset();
    }
    
    undoPressed() {
        this.commands.invoker.undo();
    }
    
    redoPressed() {
        this.commands.invoker.redo();
    }
    
    updateToolbar() {
        var disabled = this.board.selection.selectedShape == null || !["BodyShape", "VectorShape", "ImageShape", "CharacterShape", "ReferentialShape"].includes(this.board.selection.selectedShape.constructor.name);
        this.bodyButton.option("disabled", disabled);
        this.vectorButton.option("disabled", disabled);
        this.imageButton.option("disabled", disabled);
        this.characterButton.option("disabled", disabled);
    }
    
    updatePlayer() {
        var lastIteration = this.calculator.getFinalIteration();
        var iteration = this.calculator.getIteration();
        var icon = this.playPause.option("icon");
        var isRunning = this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING;
        if (isRunning && icon != "fa-light fa-pause" || !isRunning && icon != "fa-light fa-play") {
            this.playPause.option("icon", isRunning ? "fa-light fa-pause" : "fa-light fa-play");
            this.playPause.repaint();
        }
        this.stop.option("disabled", isRunning);
        this.replay.option("disabled", isRunning);
        this.stepBackward.option("disabled", isRunning || iteration == 1);
        this.stepForward.option("disabled", isRunning || iteration == lastIteration);
        this.playHead.option("max", lastIteration);
        this.playHead.option("value", iteration);
        this.$playHeadMin.text(this.calculator.getStart().toFixed(Utils.getPrecision(this.calculator.properties.independent.step)));
        this.$playHeadMax.text(this.calculator.getEnd().toFixed(Utils.getPrecision(this.calculator.properties.independent.step)));
    }
    
    playPausePressed() {
        if(this.calculator.status === STATUS.PLAYING)
            this.calculator.pause();
        else
            this.calculator.play();
        this.updatePlayer();
        this.updateToolbar();
    }

    stepBackwardPressed() {
        this.calculator.stepBackward();
        this.updatePlayer();
    }

    stepForwardPressed() {
        this.calculator.stepForward();
        this.updatePlayer();
    }
    
    stopPressed() {
        this.calculator.stop();
        this.board.refresh();
        this.updatePlayer();
        this.updateToolbar();
    }
    
    replayPressed() {
        this.calculator.replay();
        this.updatePlayer();
    }

    miniMapPressed() {
        this.miniMap.toggle();
    }

    chatPressed() {
        if (!this.properties.AIApiKey) {
            if (!this.toast) {
                this.toast = $("#toast").dxToast({
                    type: "error",
                    displayTime: 5000,
                    closeOnClick: true,
                    hideOnOutsideClick: true,
                    position: { at: "center" },
                    message: "ChatGPT API Key is required. Add it in Settings. Go to Open AI and request it.",
                }).dxToast("instance");
            }
            this.toast.show();
            return;
        }
        this.aiLogic.apiKey = this.properties.AIApiKey;
        this.chatPopup.show();
    }

    iterationChanged(iteration) {
        this.calculator.setIteration(iteration);
    }

    clear() {
        this.setDefaults();
        this.calculator.clear();
        this.board.clear();   
        this.updatePlayer();
        this.updateToolbar();
        this.aiLogic.resetSimulation();
        this.resetChat();
    }

    clearKeepIdentity() {
        const currentName = this.properties.name;
        this.clear();
        this.properties.name = currentName;
        if (this.settingsForm)
            this.settingsForm.updateData(this.properties);
    }
    
    reset() {
        this.calculator.reset();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name == "ExpressionShape" && shape.properties.expression != undefined)
                this.calculator.parse(shape.properties.expression);
        });
        this.updatePlayer();
        this.updateToolbar();
    }

    resetChat() {
        const popup = $("#chat-popup").dxPopup("instance");
        if (popup) {
            const chatElement = popup.$content().find(".dx-chat");
            if (chatElement.length > 0) {
                const chat = chatElement.dxChat("instance");
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
                const initialMessages = [{
                    timestamp: Date.now(),
                    author: secondUser,
                    text: "Hello! I'm here to help you craft your own model. Ask me to create a model."
                }];
                chat.option("items", initialMessages);
                popup.hide();
            }
        }
    }

    openSettings() {
        this.board.deselect();        
        if (this.settingsForm) {
            this.settingsForm.formData = null;
            this.settingsForm.updateData(this.properties);
        }
        this.settingsPopup.show();
    }
    
    async importFromFile() {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const model = await file.text();
        this.openModel(model);
    }

    async openFromPath(filePath) {
        const file = await fetch(filePath);
        const model = await file.text();
        this.openModel(model);
    }

    openModel(model) {
        this.deserialise(JSON.parse(model));
        this.reset();
        this.calculator.stop();
        this.board.refresh();
        this.resetChat();
    }
    
    async exportToFile() {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: "model.json",
            types: [
                {
                    description: "Model Files",
                    accept: {
                        "application/json": [".json"]
                    }
                }
            ]
        });
        await this.saveModel(fileHandle);
    }

    async saveModel(fileHandle) {
        const writableStream = await fileHandle.createWritable();
        var model = JSON.stringify(this.serialize());
        await writableStream.write(model);
        await writableStream.close();
    }

    serialize() {
        return {
            properties: this.properties,
            board: this.board.serialize()
        };
    }

    deserialise(model) {
        this.setProperties(model.properties);
        this.board.deserialize(model.board);
    }

    async saveToPath(filePath) {
        const fileHandle = await fetch(filePath);
        await this.saveModel(fileHandle);
    }

    async saveToApi() {
        const modelId = new URLSearchParams(window.location.search).get("model_id");
        if (!modelId) {
            alert("No model id found.");
            return;
        }
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        const headers = { "Content-Type": "application/json" };
        if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
        try {
            const thumbnail = await this.captureThumbnail();
            const payload = {
                title: this.properties.name || "Untitled model",
                description: this.properties.description || "",
                definition: JSON.stringify(this.serialize()),
                lastModified: new Date().toISOString()
            };
            if (thumbnail)
                payload.thumbnail = thumbnail;
            const response = await fetch(`${apiBase}/models/${modelId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Save failed (${response.status})`);
        } catch (error) {
            alert("Failed to save model.");
        }
    }

    async captureThumbnail() {
        const svg = document.getElementById("svg");
        if (!svg)
            return null;
        const bounds = svg.getBoundingClientRect();
        if (!bounds.width || !bounds.height)
            return null;
        const clone = svg.cloneNode(true);
        clone.querySelectorAll("foreignObject").forEach(node => node.remove());
        clone.setAttribute("width", bounds.width);
        clone.setAttribute("height", bounds.height);
        const serialized = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        try {
            const image = new Image();
            const dataUrl = await new Promise(resolve => {
                image.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = bounds.width;
                    canvas.height = bounds.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(image, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                };
                image.onerror = () => resolve(null);
                image.src = url;
            });
            if (!dataUrl)
                return null;
            const parts = dataUrl.split(",");
            return parts.length > 1 ? parts[1] : null;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    getModel() {
        return this.board.serialize();
    }

    getValues() {
        return this.calculator.getValues();
    }

    exportData() {
        var values = this.calculator.getValues();
        var csv = "data:text/csv;charset=utf-8,";
        const headers = Object.keys(values[0]).join(",");
        const rows = values.map(v => Object.values(v).join(",")).join("\n");
        csv += `${headers}\n${rows}`;
        var encodedUri = encodeURI(csv);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", this.properties.name + ".csv");
        document.body.appendChild(link);
        link.click();
    }

    selectShape(shape) {
        this.updateToolbar();
        this.shapeForm = null;
        var form = shape.getForm();
        if (form == null)
            return;
        this.shapeForm = form.dxForm("instance");
        this.shapePopup.content().empty();
        this.shapePopup.content().append(form);
        this.shapePopup.show();
    }

    deselectShape() {
        this.updateToolbar();
        this.shapePopup.hide();
    }
    
    onSelected(e) {
        this.selectShape(e.detail.shape);
    }
    
    onDeselected(e) {
        this.deselectShape();
    }
    
    onShapeChanged(e) {
        var shape = e.detail.shape;
        if (shape.constructor.name == "ExpressionShape")
            this.reset();
    }

    onIterate(e) {
        this.board.shapes.shapes.forEach(s => s.tick());
        this.board.refresh();
        this.updatePlayer();
    }    

    onZoom(e) {
        this.zoom.option("text", `${Math.round(e.detail.zoom * 100)} %`);
    }

    onKeyDown(e) {
        if (e.code !== 'Space' && e.key !== ' ')
            return;
        if (e.repeat)
            return;
        if (this.calculator.status === STATUS.PLAYING) {
            e.preventDefault();
            this.calculator.pause();
            this._resumeOnSpaceUp = true;
            if (this.playPause && this.playPause.element)
                this.playPause.element().addClass('pulsing');
        }
    }

    onKeyUp(e) {
        if (e.code !== 'Space' && e.key !== ' ')
            return;
        if (!this._resumeOnSpaceUp)
            return;
        const sys = this.calculator.system;
        const end = this.calculator.properties.independent.end;
        const step = this.calculator.properties.independent.step;
        let current;
        try {
            current = typeof sys.getIndependent === 'function' ? sys.getIndependent() : this.calculator.getIndependentValue(sys.iteration);
        } catch (_) {
            current = this.calculator.getIndependentValue(sys.iteration);
        }
        const finished = Math.abs(current - end) < step / 10.0;
        if (!finished) {
            e.preventDefault();
            this.calculator.play();
        }
        if (this.playPause && this.playPause.element)
            this.playPause.element().removeClass('pulsing');
        this._resumeOnSpaceUp = false;
    }
}
