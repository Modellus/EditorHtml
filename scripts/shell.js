class Shell  {
    constructor(model, modelsApiClient = null) {
        this.calculator = new Calculator();
        this.board = new Board(document.getElementById("svg"), this.calculator);
        this.commands = new Commands(this);
        this.modelsApiClient = modelsApiClient;
        this.board.assetManager = new AssetManager(modelsApiClient);
        this.selectedShapeFrame = null;
        this.pendingSelectedShape = null;
        this.pendingInitialValuesByCase = null;
        this.chatAdapter = null;
        this.agentToolBridge = null;
        this.chatInstance = null;
        this.chatThreadId = null;
        this.chatBeforeUnloadHandler = () => this.disposeChatAdapter();
        if (typeof AgentToolBridge === "function")
            this.agentToolBridge = new AgentToolBridge({
                sendToolResult: result => this.chatAdapter?.sendToolResult(
                    result.toolCallId,
                    result.toolName,
                    result.output,
                    result.state,
                    result.errorText
                )
            });
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
        this.board.svg.addEventListener("expressionChanged", e => this.onExpressionChanged(e));
        [BodyShape, ExpressionShape, ValueShape, ChartShape, TableShape, SliderShape, BackgroundShape, VectorShape, ImageShape, ReferentialShape, TextShape, CharacterShape, RulerShape, ProtractorShape].forEach(shapeClass => this.commands.registerShape(shapeClass));
        this.calculator.on("iterate", e => this.onIterate(e));
        if (model != undefined)
            this.openModel(model);
        this._resumeOnSpaceUp = false;
        this._hasChanges = false;
        window.addEventListener("keydown", e => this.onKeyDown(e));
        window.addEventListener("keyup", e => this.onKeyUp(e));
        window.addEventListener("beforeunload", e => this.onBeforeUnload(e));
        this.reset();
    }

    setDefaults() {
        this.properties.language = "en-US";
        this.properties.name = "Model";
        this.properties.description = "";
        this.properties.precision = 2;
        this.properties.angleUnit = "radians";
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1, noLimit: false };
        this.properties.iterationTerm = "n";
        this.properties.casesCount = 1;
        this.properties.initialValuesByCase = {};
        this.properties.thumbnailUrl = "";
    }

    createTooltip(e, html, width, canShow) {
        return $("<div>")
            .appendTo("body")
            .dxTooltip({
                target: e.component.element(),
                contentTemplate: function (contentElement) {
                    contentElement.append(
                        $("<div class='tooltip'/>").html(html)
                    )
                },
                onShowing: tooltipEvent => {
                    if (typeof canShow === "function" && !canShow())
                        tooltipEvent.cancel = true;
                },
                showEvent: {
                    delay: 1000,
                    name: "mouseenter" 
                },
                hideEvent: "mouseleave",
                position: "top",
                width: width ?? 200
            })
            .dxTooltip("instance");
    }

    createTranslatedTooltip(e, key, width, canShow) {
        return this.createTooltip(e, this.board.translations.get(key), width, canShow);
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
            colCount: 2,
            formData: this.properties,
            items: [
                {
                    colSpan: 2,
                    template: () => {
                        const container = $("<div class='thumbnail-dropzone'></div>");
                        const preview = $("<img class='thumbnail-preview' alt='Thumbnail preview' />");
                        const hint = $("<div class='thumbnail-hint'></div>")
                            .text(this.board.translations.get("Thumbnail Dropzone"));
                        const removeButton = $("<button type='button' class='thumbnail-remove-button' aria-label='Remove model cover'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
                        const uploaderHost = $("<div class='thumbnail-uploader'></div>");
                        const previewElement = preview.get(0);
                        const hintElement = hint.get(0);
                        const removeButtonElement = removeButton.get(0);
                        this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, this.getThumbnailSource());
                        container.append(preview, hint, removeButton, uploaderHost);
                        removeButton.on("mousedown", event => this.onThumbnailRemoveButtonMouseDown(event));
                        removeButton.on("click", event => this.onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement));
                        uploaderHost.dxFileUploader({
                            accept: "image/*",
                            multiple: false,
                            uploadMode: "useForm",
                            dropZone: container.get(0),
                            dialogTrigger: container.get(0),
                            onValueChanged: async e => {
                                const file = e.value && e.value[0];
                                if (!file)
                                    return;
                                await this.setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement);
                            }
                        });
                        return container;
                    }
                },
                {
                    colSpan: 2,
                    dataField: "name",
                    label: { text: this.board.translations.get("Name"), visible: true },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled"
                    }
                },
                {
                    colSpan: 2,
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
                    colSpan: 2,
                    dataField: "language",
                    editorType: "dxSelectBox",
                    editorOptions: {
                        items: ["en-US", "pt-BR"],
                        value: this.properties.language
                    }
                },
                {
                    itemType: "group",
                    colSpan: 2,
                    colCount: 4,
                    items: [
                        {
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
                            dataField: "casesCount",
                            label: {
                                text: this.board.translations.get("CasesCount")
                            },
                            editorType: "dxNumberBox",
                            editorOptions: {
                                min: 1,
                                max: 9,
                                step: 1,
                                showSpinButtons: true,
                                stylingMode: "filled"
                            }
                        },
                        {
                            dataField: "angleUnit",
                            label: {
                                text: this.board.translations.get("AngleUnit")
                            },
                            template: (data, itemElement) => {
                                $('<div>').appendTo(itemElement).dxButtonGroup({
                                    items: [
                                        { key: "radians", icon: "fa-solid fa-pi", hint: this.board.translations.get("Radians") },
                                        { key: "degrees", icon: "fa-solid fa-angle", hint: this.board.translations.get("Degrees") }
                                    ],
                                    keyExpr: "key",
                                    selectedItemKeys: [this.properties.angleUnit],
                                    onSelectionChanged: e => {
                                        if (e.addedItems.length > 0)
                                            this.setProperty("angleUnit", e.addedItems[0].key);
                                    },
                                    stylingMode: "outlined",
                                    elementAttr: { class: "mdl-angle-unit" }
                                });
                            }
                        }
                    ]
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
                    template: (data, itemElement) => {
                        const $container = $(`<div style="display:flex; align-items:center; gap:4px"></div>`).appendTo(itemElement);
                        const $numberBox = $('<div style="flex:1">').appendTo($container).dxNumberBox({
                            value: this.properties.independent.end,
                            stylingMode: "filled",
                            disabled: this.properties.independent.noLimit,
                            onValueChanged: e => this.setProperty("independent.end", e.value)
                        });
                        $('<div>').appendTo($container).dxButtonGroup({
                            items: [
                                { key: "noLimit", icon: "fa-solid fa-infinity", hint: "No Limit" }
                            ],
                            keyExpr: "key",
                            selectedItemKeys: this.properties.independent.noLimit ? ["noLimit"] : [],
                            onSelectionChanged: e => {
                                const noLimit = e.addedItems.length > 0;
                                this.setProperty("independent.noLimit", noLimit);
                                $numberBox.dxNumberBox("instance").option("disabled", noLimit);
                            },
                            stylingMode: "outlined",
                            elementAttr: { class: "mdl-no-limit" }
                        });
                    }
                }
            ],
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
        });
        this.settingsForm = $form.dxForm("instance");
        return $form;
    }

    getCurrentModelId() {
        return new URLSearchParams(window.location.search).get("model_id");
    }

    createChatId(prefix) {
        if (window.crypto?.randomUUID)
            return `${prefix}-${window.crypto.randomUUID()}`;
        const randomValue = Math.floor(Math.random() * 1000000000);
        return `${prefix}-${Date.now()}-${randomValue}`;
    }

    createAssetId(prefix) {
        if (window.crypto?.randomUUID)
            return `${prefix}-${window.crypto.randomUUID()}`;
        const randomValue = Math.floor(Math.random() * 1000000000);
        return `${prefix}-${Date.now()}-${randomValue}`;
    }

    getCurrentUserId() {
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        if (session?.userId)
            return String(session.userId);
        const user = window.modellus?.auth?.getUser ? window.modellus.auth.getUser() : null;
        if (user?.id)
            return String(user.id);
        return "anonymous-user";
    }

    getChatThreadId() {
        if (this.chatThreadId)
            return this.chatThreadId;
        const urlParams = new URLSearchParams(window.location.search);
        const modelId = urlParams.get("model_id");
        if (modelId) {
            this.chatThreadId = `model-${modelId}`;
            return this.chatThreadId;
        }
        const modelName = urlParams.get("model");
        if (modelName) {
            this.chatThreadId = `template-${modelName}`;
            return this.chatThreadId;
        }
        const storageKey = "modellus.chat.threadId";
        const storedThreadId = sessionStorage.getItem(storageKey);
        if (storedThreadId) {
            this.chatThreadId = storedThreadId;
            return this.chatThreadId;
        }
        const generatedThreadId = this.createChatId("draft");
        sessionStorage.setItem(storageKey, generatedThreadId);
        this.chatThreadId = generatedThreadId;
        return this.chatThreadId;
    }

    getChatConversationName() {
        const userId = this.getCurrentUserId();
        const threadId = this.getChatThreadId();
        return `${userId}:${threadId}`;
    }

    getInitialChatMessages() {
        const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
        return [{
            timestamp: Date.now(),
            author: secondUser,
            text: "Hello! I'm here to help you craft your own model. Ask me to create a model."
        }];
    }

    createChatAdapter(chat, firstUser, secondUser, initialMessages) {
        this.disposeChatAdapter();
        const chatConversationName = this.getChatConversationName();
        this.chatAdapter = new AgentChatAdapter({
            host: "agent-modellus.interactivebook.workers.dev",
            agent: "ChatAgent",
            name: chatConversationName,
            chat,
            user: firstUser,
            assistant: secondUser,
            initialItems: initialMessages,
            debugEnabled: false,
            onClientToolCall: toolCall => this.agentToolBridge?.handleToolCall(toolCall)
        });
        this.chatAdapter.connect();
    }

    disposeChatAdapter() {
        if (!this.chatAdapter)
            return;
        this.chatAdapter.destroy();
        this.chatAdapter = null;
    }

    isChatOpen() {
        return this.chatPopup?.option("visible") === true;
    }

    isUrl(value) {
        if (typeof value !== "string")
            return false;
        return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
    }

    getThumbnailSource() {
        const thumbnailUrl = this.properties.thumbnailUrl;
        return typeof thumbnailUrl === "string" ? thumbnailUrl.trim() : "";
    }

    updateThumbnailPreview(previewElement, hintElement, removeButtonElement, imageSource) {
        if (!previewElement || !hintElement || !removeButtonElement)
            return;
        if (imageSource) {
            previewElement.setAttribute("src", imageSource);
            hintElement.style.display = "none";
            removeButtonElement.style.display = "flex";
            return;
        }
        previewElement.removeAttribute("src");
        hintElement.style.display = "";
        removeButtonElement.style.display = "none";
    }

    onThumbnailRemoveButtonMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        this.clearThumbnail(previewElement, hintElement, removeButtonElement);
    }

    clearThumbnail(previewElement, hintElement, removeButtonElement) {
        this.properties.thumbnailUrl = "";
        this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, "");
    }

    async setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement) {
        const thumbnailUrl = await this.uploadModelAsset(file, this.createAssetId("thumbnail"));
        if (!thumbnailUrl)
            return;
        this.properties.thumbnailUrl = thumbnailUrl;
        this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, thumbnailUrl);
    }

    async uploadModelAsset(file, assetId) {
        return this.board.assetManager.uploadAsset(assetId, file);
    }

    createTopToolbar() {
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
                        onClick: _ => this.commands.addShape("ExpressionShape", "Expression"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Expression Tooltip", 280)
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
                            onInitialized: e => this.createTranslatedTooltip(e, "Referential Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("ChartShape", "Chart"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Chart Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("TableShape", "Table"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Table Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("SliderShape", "Slider"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Slider Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("ValueShape", "Value"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Value Tooltip", 280)
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
                        template: `<div class='dx-icon'>
                                <i class='fa-light fa-panorama fa-lg'></i>
                            </div>`,
                        onClick: _ => this.commands.addShape("BackgroundShape", "Background"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Background Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("TextShape", "Text"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Text Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("RulerShape", "Ruler"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Ruler Tooltip", 280)
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
                        onClick: _ => this.commands.addShape("ProtractorShape", "Protractor"),
                        onInitialized: e => this.createTranslatedTooltip(e, "Protractor Tooltip", 280)
                    }
                }
            ]
        });
        this.topToolbar = $("#toolbar").dxToolbar("instance");
        this.expressionButton = $("#expression-button").dxButton("instance");
        this.valueButton = $("#value-button").dxButton("instance");
        this.referentialButton = $("#referential-button").dxButton("instance");
        this.chartButton = $("#chart-button").dxButton("instance");
        this.tableButton = $("#table-button").dxButton("instance");
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
                        icon: "fa-light fa-circle-minus",
                        onInitialized: e => this.createTranslatedTooltip(e, "Zoom Out Tooltip", 280)
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
                        onClick: e => this.panAndZoom.setZoom(1),
                        onInitialized: e => this.createTranslatedTooltip(e, "Zoom Reset Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-plus",
                        onInitialized: e => this.createTranslatedTooltip(e, "Zoom In Tooltip", 280)
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
                        onClick: _ => this.undoPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Undo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-right",
                        onClick: _ => this.redoPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Redo Tooltip", 280)
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
                        onClick: _ => this.playPausePressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Play Pause Tooltip", 280)
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
                        onClick: _ => this.stopPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Stop Tooltip", 280)
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
                        onClick: _ => this.stepBackwardPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Step Backward Tooltip", 280)
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
                        onClick: _ => this.stepForwardPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Step Forward Tooltip", 280)
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
                        onClick: _ => this.replayPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Replay Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-map",
                        elementAttr: {
                            id: "minimap-button"
                        },
                        onClick: () => this.miniMapPressed(),
                        onInitialized: e => this.createTranslatedTooltip(e, "Mini Map Tooltip", 280)
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
                        onClick: _ => this.chatPressed(),
                        onInitialized: e => this.chatTooltip = this.createTranslatedTooltip(e, "Chat Tooltip", 280, () => !this.isChatOpen())
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
            showTitle: true,
            title: this.board.translations.get("Chat Title"),
            dragEnabled: false,
            hideOnOutsideClick: true,
            animation: null,
            toolbarItems: [{
                toolbar: "top",
                location: "after",
                widget: "dxButton",
                options: {
                    icon: "fa-regular fa-trash-can",
                    stylingMode: "text",
                    onClick: () => this.clearChat()
                }
            }],
            onDisposing: () => this.disposeChatAdapter(),
            contentTemplate: () => {
                const firstUser = { id: "1", name: "User" };
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
                const initialMessages = this.getInitialChatMessages();
                const $chat = $("<div>").appendTo("#chat-popup");
                const chat = $chat.dxChat({
                    width: "100%",
                    height: "100%", 
                    user: firstUser,
                    onMessageEntered: e => this.chatAdapter?.sendMessage(e.message.text),
                    items: initialMessages
                });
                this.chatInstance = chat.dxChat("instance");
                this.createChatAdapter(this.chatInstance, firstUser, secondUser, initialMessages);
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
                text: this.board.translations.get("Data"),
                icon: "fa-light fa-table",
                shortcut: "",
                name: "Data",
                items: [
                    {
                        text: this.board.translations.get("Data from file"),
                        icon: "fa-light fa-file-csv",
                        shortcut: "",
                        name: "ImportDataFromFile",
                        action: _ => this.importDataFromFile()
                    },
                    {
                        text: this.board.translations.get("Data from URL"),
                        icon: "fa-light fa-link",
                        shortcut: "",
                        name: "ImportDataFromUrl",
                        action: _ => this.importDataFromUrl()
                    },
                    {
                        text: this.board.translations.get("Preloaded Data"),
                        icon: "fa-light fa-eye",
                        shortcut: "",
                        name: "ShowPreloadedData",
                        action: _ => this.showDataPopup()
                    },
                    {
                        text: this.board.translations.get("Clear Data"),
                        icon: "fa-light fa-trash-can",
                        shortcut: "",
                        name: "ClearPreloadedData",
                        action: _ => this.clearPreloadedData()
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
                action: _ => this.exitEditor()
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
        this.properties.casesCount = this.calculator.normalizeCasesCount(this.properties.casesCount);
        this.calculator.setProperties(this.properties);
    }
    
    setProperty(name, value) {
        if (name === "casesCount")
            value = this.calculator.normalizeCasesCount(value);
        const keys = name.split('.');
        let current = this.properties;
        for (let i = 0; i < keys.length - 1; i++)
            current = current[keys[i]];
        current[keys[keys.length - 1]] = value;
        if (name.includes("independent") || name.includes("iteration") || name === "casesCount" || name === "precision" || name === "angleUnit")
            this.calculator.setProperty(name, value);    
        if (name === "casesCount" && this.board?.selection?.selectedShape)
            this.scheduleShapeSelection(this.board.selection.selectedShape);
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
    }
    
    updatePlayer() {
        var lastIteration = this.calculator.getLastIteration();
        var finalIteration = this.calculator.getFinalIteration();
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
        this.stepForward.option("disabled", isRunning || iteration >= lastIteration);
        this.playHead.option("max", finalIteration);
        this.playHead.option("value", iteration);
        this.$playHeadMin.text(this.calculator.getStart().toFixed(Utils.getPrecision(this.calculator.properties.independent.step)));
        if (this.calculator.properties.independent.noLimit)
            this.$playHeadMax.html('<i class="fa-light fa-infinity" style="font-size:14px; font-weight:400; padding-top:3px"></i>');
        else
            this.$playHeadMax.text(this.calculator.getEnd().toFixed(Utils.getPrecision(this.calculator.properties.independent.step)));
    }
    
    playPausePressed() {
        if(this.calculator.status === STATUS.PLAYING)
            this.calculator.pause();
        else {
            this.deselectShape();
            this.calculator.play();
        }
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
        this.reset();
        this.calculator.calculate();
    }
    
    replayPressed() {
        this.deselectShape();
        this.calculator.replay();
        this.updatePlayer();
    }

    miniMapPressed() {
        this.miniMap.toggle();
    }

    chatPressed() {
        this.chatTooltip?.hide();
        this.chatAdapter?.connect();
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
        const initialValuesByCase = this.pendingInitialValuesByCase ?? this.calculator.getInitialValuesByCase();
        this.pendingInitialValuesByCase = null;
        this.calculator.reset();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name == "ExpressionShape" && shape.properties.expression != undefined)
                this.calculator.parse(shape.properties.expression);
        });
        this.calculator.applyPreloadedData();
        this.calculator.applyInitialValuesByCase(initialValuesByCase);
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        this.board.refresh();
        this.updatePlayer();
        this.updateToolbar();
    }

    clearChat() {
        this.chatThreadId = this.createChatId("chat");
        const popup = $("#chat-popup").dxPopup("instance");
        if (!popup)
            return;
        const chatElement = popup.$content().find(".dx-chat");
        if (chatElement.length === 0)
            return;
        const firstUser = { id: "1", name: "User" };
        const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
        const initialMessages = this.getInitialChatMessages();
        const chat = chatElement.dxChat("instance");
        chat.option("items", initialMessages);
        this.createChatAdapter(chat, firstUser, secondUser, initialMessages);
    }

    resetChat() {
        this.clearChat();
        const popup = $("#chat-popup").dxPopup("instance");
        if (popup)
            popup.hide();
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
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        const properties = Object.assign({}, this.properties);
        delete properties.AIApiKey;
        const result = {
            properties,
            board: this.board.serialize()
        };
        const preloaded = this.calculator.getPreloadedData();
        if (preloaded)
            result.preloadedData = preloaded;
        return result;
    }

    deserialise(model) {
        this.pendingInitialValuesByCase = model?.properties?.initialValuesByCase ?? model?.properties?.initialValues ?? null;
        this.setProperties(model.properties);
        this.board.deserialize(model.board);
        if (model.preloadedData)
            this.calculator.loadTerms(model.preloadedData.names, model.preloadedData.values);
        else
            this.calculator.clearPreloadedData();
    }

    async saveToPath(filePath) {
        const fileHandle = await fetch(filePath);
        await this.saveModel(fileHandle);
    }

    async saveToApi() {
        const modelId = this.getCurrentModelId();
        if (!modelId) {
            alert("No model id found.");
            return;
        }
        if (this.isModelNameUndefined()) {
            const accepted = await this.promptModelMetadata();
            if (!accepted)
                return;
        }
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        const headers = { "Content-Type": "application/json" };
        if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
        try {
            const payload = {
                title: this.properties.name || "Untitled model",
                description: this.properties.description || "",
                definition: JSON.stringify(this.serialize()),
                lastModified: new Date().toISOString()
            };
            if (this.properties.thumbnailUrl)
                payload.thumbnail = this.properties.thumbnailUrl;
            const response = await fetch(`${apiBase}/models/${modelId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Save failed (${response.status})`);
            this._hasChanges = false;
        } catch (error) {
            alert("Failed to save model.");
        }
    }

    isModelNameUndefined() {
        const name = this.properties.name;
        return !name || name === "Model";
    }

    onBeforeUnload(event) {
        this.disposeChatAdapter();
        if (!this._hasChanges)
            return;
        event.preventDefault();
    }

    async exitEditor() {
        if (!this._hasChanges) {
            window.location.href = "/marketplace.html";
            return;
        }
        const result = await this.promptSaveBeforeExit();
        if (result === "cancel")
            return;
        if (result === "save") {
            await this.saveToApi();
            window.location.href = "/marketplace.html";
            return;
        }
        this._hasChanges = false;
        window.location.href = "/marketplace.html";
    }

    promptSaveBeforeExit() {
        return new Promise(resolve => {
            const popupHost = document.getElementById("save-metadata-popup");
            if (!popupHost) {
                resolve("discard");
                return;
            }
            const formData = {
                name: this.properties.name === "Model" ? "" : this.properties.name || "",
                description: this.properties.description || ""
            };
            let formInstance = null;
            let previewElement = null;
            let hintElement = null;
            let removeButtonElement = null;
            const popup = $(popupHost).dxPopup({
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                showTitle: true,
                title: this.board.translations.get("Unsaved Changes"),
                hideOnOutsideClick: false,
                visible: true,
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Save"),
                            type: "default",
                            stylingMode: "text",
                            onClick: () => {
                                const validation = formInstance.validate();
                                if (!validation.isValid)
                                    return;
                                this.properties.name = formData.name;
                                this.properties.description = formData.description;
                                popup.dxPopup("hide");
                                resolve("save");
                            }
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Don't Save"),
                            stylingMode: "text",
                            onClick: () => {
                                popup.dxPopup("hide");
                                resolve("discard");
                            }
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Cancel"),
                            stylingMode: "text",
                            onClick: () => {
                                popup.dxPopup("hide");
                                resolve("cancel");
                            }
                        }
                    }
                ],
                contentTemplate: () => {
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            {
                                template: () => {
                                    const container = $("<div class='thumbnail-dropzone'></div>");
                                    const preview = $("<img class='thumbnail-preview' alt='Thumbnail preview' />");
                                    const hint = $("<div class='thumbnail-hint'></div>")
                                        .text(this.board.translations.get("Thumbnail Dropzone"));
                                    const removeButton = $("<button type='button' class='thumbnail-remove-button' aria-label='Remove model cover'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
                                    const uploaderHost = $("<div class='thumbnail-uploader'></div>");
                                    previewElement = preview.get(0);
                                    hintElement = hint.get(0);
                                    removeButtonElement = removeButton.get(0);
                                    this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, this.getThumbnailSource());
                                    container.append(preview, hint, removeButton, uploaderHost);
                                    removeButton.on("mousedown", event => this.onThumbnailRemoveButtonMouseDown(event));
                                    removeButton.on("click", event => this.onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement));
                                    uploaderHost.dxFileUploader({
                                        accept: "image/*",
                                        multiple: false,
                                        uploadMode: "useForm",
                                        dropZone: container.get(0),
                                        dialogTrigger: container.get(0),
                                        onValueChanged: async e => {
                                            const file = e.value && e.value[0];
                                            if (!file)
                                                return;
                                            await this.setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement);
                                        }
                                    });
                                    return container;
                                }
                            },
                            {
                                dataField: "name",
                                label: { text: this.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            },
                            {
                                dataField: "description",
                                label: { text: this.board.translations.get("Description"), visible: true },
                                editorType: "dxHtmlEditor",
                                editorOptions: { height: 120, stylingMode: "filled" }
                            }
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
    }

    promptModelMetadata() {
        return new Promise(resolve => {
            const popupHost = document.getElementById("save-metadata-popup");
            if (!popupHost) {
                resolve(true);
                return;
            }
            const formData = {
                name: this.properties.name === "Model" ? "" : this.properties.name || "",
                description: this.properties.description || ""
            };
            let formInstance = null;
            let previewElement = null;
            let hintElement = null;
            let removeButtonElement = null;
            const popup = $(popupHost).dxPopup({
                width: 420,
                height: "auto",
                dragEnabled: false,
                shading: false,
                showTitle: true,
                title: this.board.translations.get("Save Model"),
                hideOnOutsideClick: false,
                visible: true,
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Save"),
                            type: "default",
                            stylingMode: "contained",
                            onClick: () => {
                                const validation = formInstance.validate();
                                if (!validation.isValid)
                                    return;
                                this.properties.name = formData.name;
                                this.properties.description = formData.description;
                                popup.dxPopup("hide");
                                resolve(true);
                            }
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Cancel"),
                            stylingMode: "text",
                            onClick: () => {
                                popup.dxPopup("hide");
                                resolve(false);
                            }
                        }
                    }
                ],
                contentTemplate: () => {
                    const form = $("<div></div>").dxForm({
                        formData,
                        colCount: 1,
                        items: [
                            {
                                template: () => {
                                    const container = $("<div class='thumbnail-dropzone'></div>");
                                    const preview = $("<img class='thumbnail-preview' alt='Thumbnail preview' />");
                                    const hint = $("<div class='thumbnail-hint'></div>")
                                        .text(this.board.translations.get("Thumbnail Dropzone"));
                                    const removeButton = $("<button type='button' class='thumbnail-remove-button' aria-label='Remove model cover'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
                                    const uploaderHost = $("<div class='thumbnail-uploader'></div>");
                                    previewElement = preview.get(0);
                                    hintElement = hint.get(0);
                                    removeButtonElement = removeButton.get(0);
                                    this.updateThumbnailPreview(previewElement, hintElement, removeButtonElement, this.getThumbnailSource());
                                    container.append(preview, hint, removeButton, uploaderHost);
                                    removeButton.on("mousedown", event => this.onThumbnailRemoveButtonMouseDown(event));
                                    removeButton.on("click", event => this.onThumbnailRemoveButtonClick(event, previewElement, hintElement, removeButtonElement));
                                    uploaderHost.dxFileUploader({
                                        accept: "image/*",
                                        multiple: false,
                                        uploadMode: "useForm",
                                        dropZone: container.get(0),
                                        dialogTrigger: container.get(0),
                                        onValueChanged: async e => {
                                            const file = e.value && e.value[0];
                                            if (!file)
                                                return;
                                            await this.setThumbnailFromFile(file, previewElement, hintElement, removeButtonElement);
                                        }
                                    });
                                    return container;
                                }
                            },
                            {
                                dataField: "name",
                                label: { text: this.board.translations.get("Name"), visible: true },
                                editorType: "dxTextBox",
                                editorOptions: { stylingMode: "filled" },
                                validationRules: [{ type: "required" }]
                            },
                            {
                                dataField: "description",
                                label: { text: this.board.translations.get("Description"), visible: true },
                                editorType: "dxHtmlEditor",
                                editorOptions: { height: 120, stylingMode: "filled" }
                            }
                        ]
                    });
                    formInstance = form.dxForm("instance");
                    return form;
                },
                position: { at: "center", of: window }
            });
        });
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
        if (window.modellusReadOnly)
            return;
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

    scheduleShapeSelection(shape) {
        this.pendingSelectedShape = shape;
        if (this.selectedShapeFrame != null)
            cancelAnimationFrame(this.selectedShapeFrame);
        this.selectedShapeFrame = requestAnimationFrame(() => {
            this.selectedShapeFrame = null;
            const pendingShape = this.pendingSelectedShape;
            this.pendingSelectedShape = null;
            if (!pendingShape)
                return;
            this.selectShape(pendingShape);
        });
    }

    deselectShape({ skipBoard = false } = {}) {
        this.pendingSelectedShape = null;
        if (this.selectedShapeFrame != null) {
            cancelAnimationFrame(this.selectedShapeFrame);
            this.selectedShapeFrame = null;
        }
        if (!skipBoard && this.board?.selection?.selectedShape)
            this.board.selection.deselect();
        this.updateToolbar();
        this.shapePopup.hide();
    }
    
    onSelected(e) {
        this.scheduleShapeSelection(e.detail.shape);
    }
    
    onDeselected(e) {
        this.deselectShape({ skipBoard: true });
    }
    
    onShapeChanged(e) {
        this._hasChanges = true;
    }

    onExpressionChanged(e) {
        this._hasChanges = true;
        this.reset();
        this.calculator.calculate();
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
        const isEditing = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;
        if ((e.ctrlKey || e.metaKey) && !isEditing) {
            const shape = this.board.selection.selectedShape;
            if (e.key === "c" && shape) {
                e.preventDefault();
                shape.copyToClipboard();
                return;
            }
            if (e.key === "v") {
                e.preventDefault();
                BaseShape.pasteFromClipboard(this.board, shape?.parent);
                return;
            }
            if (e.key === "d" && shape) {
                e.preventDefault();
                shape.duplicate();
                return;
            }
        }
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

    parseCsv(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        const names = lines[0].split(",").map(name => name.trim());
        const values = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(",").map(cell => parseFloat(cell.trim()));
            values.push(row);
        }
        return { names, values };
    }

    loadPreloadedData(names, values) {
        this.calculator.loadTerms(names, values);
        this.reset();
    }

    clearPreloadedData() {
        this.calculator.clearPreloadedData();
        this.reset();
    }

    async importDataFromFile() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: "CSV Files", accept: { "text/csv": [".csv"] } }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const { names, values } = this.parseCsv(text);
        this.loadPreloadedData(names, values);
        this.showDataPopup();
    }

    async importDataFromUrl() {
        const url = prompt(this.board.translations.get("Enter CSV URL"));
        if (!url)
            return;
        const response = await fetch(url);
        const text = await response.text();
        const { names, values } = this.parseCsv(text);
        this.loadPreloadedData(names, values);
        this.showDataPopup();
    }

    showDataPopup() {
        const preloaded = this.calculator.getPreloadedData();
        if (!preloaded)
            return;
        const dataSource = preloaded.values.map(row => {
            const obj = {};
            for (let i = 0; i < preloaded.names.length; i++)
                obj[preloaded.names[i]] = row[i];
            return obj;
        });
        const columns = preloaded.names.map(name => ({
            dataField: name,
            caption: name,
            dataType: "number"
        }));
        const $popup = $("#data-popup");
        if ($popup.data("dxPopup"))
            $popup.dxPopup("instance").dispose();
        $popup.dxPopup({
            width: 600,
            height: 500,
            title: this.board.translations.get("Preloaded Data"),
            showTitle: true,
            dragEnabled: true,
            resizeEnabled: true,
            hideOnOutsideClick: true,
            shading: false,
            contentTemplate: (contentElement) => {
                $('<div>').appendTo(contentElement).dxDataGrid({
                    dataSource,
                    columns,
                    editing: {
                        mode: "cell",
                        allowUpdating: true
                    },
                    paging: { enabled: false },
                    height: "100%",
                    elementAttr: { class: "mdl-preloaded-data-grid" }
                });
            }
        });
        $popup.dxPopup("instance").show();
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
            this.deselectShape();
            this.calculator.play();
        }
        if (this.playPause && this.playPause.element)
            this.playPause.element().removeClass('pulsing');
        this._resumeOnSpaceUp = false;
    }
}
