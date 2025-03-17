class Shell  {
    constructor(model) {
        this.calculator = new Calculator();
        this.board = new Board(document.getElementById("svg"), this.calculator);
        this.commands = new Commands(this);
        this.properties = {};
        this.setDefaults();
        new MiniMap(this.board, document.getElementById("minimap-image"), document.getElementById("minimap-viewport"));
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
    }

    setDefaults() {
        this.properties.language = "en-US";
        this.properties.name = "Model";
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
            height: 200,
            dragEnabled: false,
            shading: false,
            title: this.board.translations.get("Settings Title"),
            showTitle: false,
            hideOnOutsideClick: true,
            contentTemplate: () => {
                const $form = $("<div>").appendTo("#settings-popup");
                const form = $form.dxForm({
                    formData: this.properties,
                    colCount: 4,
                    items: [
                        {
                            colSpan: 4,
                            dataField: "name",
                            label: { text: "Name", visible: false },
                            editorType: "dxTextBox",
                            editorOptions: {
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
                            editorType: "dxTextBox",
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
                            editorType: "dxTextBox",
                            editorOptions: {
                                stylingMode: "filled"
                            }
                        }
                    ],
                    onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
                });
                return $form;
            },
            position: {
                at: "center",
                of: window
            }
        });
        this.settingsPopup = $("#settings-popup").dxPopup("instance");
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
                        onClick: _ => this.commands.addShape("ExpressionShape")
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
                        onClick: _ => this.commands.addShape("ReferentialShape"),
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
                        onClick: _ => this.commands.addShape("ChartShape")
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
                        onClick: _ => this.commands.addShape("TableShape")
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
                        onClick: _ => this.commands.addShape("BodyShape")
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
                        onClick: _ => this.commands.addShape("VectorShape")
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
                        onClick: _ => this.commands.addShape("ImageShape")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "character-button"
                        },
                        icon: "fa-regular fa-child-reaching",
                        disabled: true,
                        onClick: _ => this.commands.addShape("CharacterShape"),
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
                        onClick: _ => this.commands.addShape("BackgroundShape")
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
                        onClick: _ => this.commands.addShape("TextShape")
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
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        stylingMode: "text",
                        text: "90 %",
                        onClick: e => e.component.option("text", "100 %")
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-plus"
                    },
                    location: "before"
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
                    widget: "dxSlider",
                    cssClass: "slider",
                    options: {
                        min: 0,
                        max: 0,
                        value: 0,
                        width: 400,
                        elementAttr: {
                            id: "playHeadSlider"
                        },
                        tooltip: {
                            enabled: true,
                            format: _ => this.calculator.getIndependentValue().toFixed(2),
                            showMode: "always",
                            position: "top",
                        }, 
                        onValueChanged: e => this.iterationChanged(e.value)
                    },
                    location: "center"
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
                        onClick: () => {
                            console.log("Map clicked");
                        }
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
                        onClick: _ => this.chatPopup.show()
                    }
                }
            ]
        });
        this.bottomToolbar = $("#bottom-toolbar").dxToolbar("instance");
        this.playPause = $("#playPauseButton").dxButton("instance");
        this.stop = $("#stopButton").dxButton("instance");
        this.replay = $("#replayButton").dxButton("instance");
        this.playHead = $("#playHeadSlider").dxSlider("instance");
        this.stepBackward = $("#stepBackwardButton").dxButton("instance");
        this.stepForward = $("#stepForwardButton").dxButton("instance");
    }
        
    createChat() {
        $("#chat-popup").dxPopup({
            width: 300,
            height: 400,
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
                    onMessageSend: (e) => {
                        sendToBackend(e.message, chat);
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
        $("#shape-popup").dxPopup({
            width: 200,
            height: 400,
            shading: false,
            showTitle: false,
            dragEnabled: false,
            hideOnOutsideClick: false,
            focusStateEnabled: false,
            animation: null,
            target: "#svg",
            position: {
                my: "left center",
                at: "left center",
                of: "#svg",
                offset: "20, 0"
            }
        });
        this.shapePopup = $("#shape-popup").dxPopup("instance");
    }
    
    createContextMenu() {
        var menuItems = [
            {
                text: this.board.translations.get("New"),
                icon: "fa-light fa-file",
                shortcut: "Ctrl+N",
                name: "New",
                action: _ => this.clear()
            },
            {
                text: this.board.translations.get("Open..."),
                icon: "fa-light fa-folder",
                shortcut: "Ctrl+O",
                name: "Open",
                action: _ => this.open()
            },
            {
                text: this.board.translations.get("Save..."),
                icon: "fa-light fa-arrow-down-to-bracket",
                shortcut: "Ctrl+S",
                name: "Save",
                action: _ => this.save()
            },
            {
                text: this.board.translations.get("Export..."),
                icon: "fa-light fa-file-excel",
                shortcut: "",
                beginGroup: true,
                name: "Export",
                action: _ => this.export()
            },
            {
                text: this.board.translations.get("Settings..."),
                icon: "fa-light fa-gear",
                shortcut: "",
                beginGroup: true,
                name: "Settings",
                action: _ => this.openSettings()
            }
        ];
        $("#context-menu").dxContextMenu({
            dataSource: menuItems,
            itemTemplate: itemData => {
                return `<div style="display: flex; justify-content: space-between; align-items: center;width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                            <span style="color: #999;">${itemData.shortcut}</span>
                        </div>`;
            },
            onItemClick: e => e.itemData.action(),
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
    
    setProperty(name, value) {
        this.properties[name] = value;
        if(name.contains("independent")) {
            this.calculator.setProperty(name, value);
            this.updatePlayer();
            this.updateToolbar();
        }
    }

    sendToBackend(message, chat) {
        const answer = (message) => {
            setTimeout(() => {
                chat.renderMessage({
                text: message, 
                author: secondUser,
                timestamp: Date.now() 
                });
            }, 1000);
        };
    }
    
    undoPressed() {
        this.commands.invoker.undo();
    }
    
    redoPressed() {
        this.commands.invoker.redo();
    }
    
    updateToolbar() {
        var disabled = this.board.selection.selectedShape == null || !["BodyShape", "VectorShape", "ReferentialShape"].includes(this.board.selection.selectedShape.constructor.name);
        this.bodyButton.option("disabled", disabled);
        this.vectorButton.option("disabled", disabled);
        var isStopped = this.calculator.status == STATUS.STOPPED;
        for (var tool = 1; tool < 15; tool++)
            this.topToolbar.option(`items[${tool}].visible`, isStopped);
    }
    
    updatePlayer() {
        var lastIteration = this.calculator.getLastIteration();
        var iteration = this.calculator.getIteration();
        var icon = this.playPause.option("icon");
        var isRunning = this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING;
        var isStopped = this.calculator.status == STATUS.STOPPED;
        if (isRunning && icon != "fa-light fa-pause" || !isRunning && icon != "fa-light fa-play") {
            this.playPause.option("icon", isRunning ? "fa-light fa-pause" : "fa-light fa-play");
            this.playPause.repaint();
        }
        this.stop.option("disabled", isRunning);
        this.replay.option("disabled", isRunning);
        this.stepBackward.option("disabled", isRunning || iteration == 0);
        this.stepForward.option("disabled", isRunning || iteration == lastIteration);
        this.playHead.option("max", lastIteration);
        this.playHead.option("value", iteration);
        this.board.enableSelection(isStopped);
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
    
    iterationChanged(iteration) {
        this.calculator.setIteration(iteration);
    }
    
    clear() {
        this.calculator.clear();
        this.board.clear();   
        this.updatePlayer();
        this.updateToolbar();
    }
    
    reset() {
        this.calculator.clear();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name == "ExpressionShape" && shape.properties.expression != undefined)
                this.calculator.parse(shape.properties.expression);
        });
        this.updatePlayer();
    }

    openSettings() {
        this.board.deselect();
        this.settingsPopup.show();
    }
    
    async open() {
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
        this.board.deserialize(JSON.parse(model));
        this.reset();
        this.board.refresh();
    }
    
    async save() {
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
        var model = this.board.serialize();
        await writableStream.write(model);
        await writableStream.close();
    }

    async saveToPath(filePath) {
        const fileHandle = await fetch(filePath);
        await this.saveModel(fileHandle);
    }

    getModel() {
        return this.board.serialize();
    }

    getValues() {
        return this.calculator.getValues();
    }

    export() {
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
    
    onSelected(e) {
        this.updateToolbar();
        var form = e.detail.shape.getForm();
        if (form == null)
            return;
        this.shapePopup.content().empty();
        this.shapePopup.content().append(form);
        this.shapePopup.show();
    }
    
    onDeselected(e) {
        this.updateToolbar();
        this.shapePopup.hide();
    }
    
    onShapeChanged(e) {
        var shape = e.detail.shape;
        if (shape.constructor.name == "ExpressionShape")
            this.reset();
    }
    
    onIterate(e) {
        this.board.deselect();
        this.board.refresh();
        this.updatePlayer();
    }    
}