class Shell  {
    constructor() {
        this.calculator = new Calculator();
        this.board = new Board(document.getElementById("svg"), this.calculator);
        this.commands = new Commands(this);
        new MiniMap(this.board, document.getElementById("minimap-image"), document.getElementById("minimap-viewport"));
        this.createContextMenu();
        this.createTopToolbar();
        this.createBottomToolbar();
        this.createChat();
        this.createShapePopup();
        this.playPause = $("#playPauseButton").dxButton("instance");
        this.stop = $("#stopButton").dxButton("instance");
        this.replay = $("#replayButton").dxButton("instance");
        this.playHead = $("#playHeadSlider").dxSlider("instance");
        this.stepBackward = $("#stepBackwardButton").dxButton("instance");
        this.stepForward = $("#stepForwardButton").dxButton("instance");
        this.board.svg.addEventListener("selected", e => this.onSelected(e));
        this.board.svg.addEventListener("deselected", e => this.onDeselected(e));
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        this.board.shapes.registerShapes([BodyShape, ExpressionShape, ChartShape, TableShape, ImageShape, VectorShape, ReferentialShape, TextShape]);
        this.calculator.on("iterate", e => this.onIterate(e));
        this.calculator.on("iterationChanged", e => this.onIterationChanged(e));
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
                        onClick: function() {
                            var contextMenu = $("#context-menu").dxContextMenu("instance");
                            contextMenu.show();
                        }
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            style: "font-family: cursive; font-size: 16px"
                        },
                        text: "X",
                        onClick: _ => this.commands.addShape("ExpressionShape"),
                    }
                },
                {
                    location: "center",
                    template() {
                      return $("<div class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-shapes",
                        onClick: _ => this.commands.addShape("ReferentialShape"),
                        template1: function() {
                            return $(`<span class="fa-stack">
                                <i class="fa-light fa-square fa-stack-1x"></i>
                                <i class="fa-light fa-circle fa-2xs fa-stack-2x"></i>
                            </span>`);
                        }
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-image",
                        onClick: _ => this.commands.addShape("ImageShape")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-quotes",
                        elementAttr: {
                            "data-fa-transform": "shrink-8 up-6"
                        },
                        template1: () => $("<i class='fa-light fa-quote-right fa-2xs' data-fa-transform='shrink-8 up-6'></i>"),
                        onClick: _ => this.commands.addShape("TextShape")
                    }
                },
                {
                    location: "center",
                    template() {
                      return $("<div class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle",
                        disabled: true,
                        onClick: _ => this.commands.addShape("BodyShape"),
                        onInitialized: e => this.bodyButton = e.component
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-arrow-right-long fa-rotate-by",
                        elementAttr: {
                            style: "--fa-rotate-angle: -45deg;"
                        },
                        disabled: true,
                        onClick: _ => this.commands.addShape("VectorShape"),
                        onInitialized: e => this.vectorButton = e.component
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-regular fa-child-reaching",
                        disabled: true,
                    }
                },
                {
                    location: "center",
                    template() {
                      return $("<div class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-chart-line",
                        onClick: _ => this.commands.addShape("ChartShape")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-table",
                        onClick: _ => this.commands.addShape("TableShape")
                    }
                }
            ]
        });
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
                        onClick: function() {
                            var chatPopup = $("#chat-popup").dxPopup("instance");
                            chatPopup.show();
                        }
                    }
                }
            ]
        });
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
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "https://devexpress.github.io/DevExtreme/images/icons/bot.png" };
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
    }
    
    createContextMenu() {
        var menuItems = [
            {
                text: "New",
                icon: "fa-light fa-file",
                shortcut: "Ctrl+N",
                name: "New"
            },
            {
                text: "Open...",
                icon: "fa-light fa-folder",
                shortcut: "Ctrl+O",
                name: "Open"
            },
            {
                text: "Save...",
                icon: "fa-light fa-arrow-down-to-bracket",
                shortcut: "Ctrl+S",
                name: "Save"
            },
            {
                text: "Close",
                icon: "fa-light fa-times",
                shortcut: "Ctrl+W",
                name: "Close"
            }
        ];
        $("#context-menu").dxContextMenu({
            items: menuItems.map(i => ({
                text: i.text,
                icon: i.icon,
                shortcut: i.shortcut,
                name: i.name,
                template: (itemData) => {
                    return `<div style="display: flex; justify-content: space-between; align-items: center;width: 100%">
                                <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                                <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                                <span style="color: #999;">${itemData.shortcut}</span>
                            </div>`;
                }
            })),
            onItemClick: (e) => {
                if (e.itemData.name == "New")
                    this.clear();
                if (e.itemData.name == "Open")
                    this.open();
                if (e.itemData.name == "Save")
                    this.save();
            },
            target: "#toolbar",
            position: {
                my: "top left",
                at: "bottom left",
                of: "#menu-button",
                offset: "0 10"
            }
        });
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
    }
    
    updatePlayer() {
        var lastIteration = this.calculator.getLastIteration();
        var iteration = this.calculator.getIteration();
        this.playPause.option("icon", this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING ? "fa-light fa-pause" : "fa-light fa-play");
        this.playPause.repaint();
        this.stop.option("disabled", this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING);
        this.replay.option("disabled", this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING);
        this.stepBackward.option("disabled", this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING || iteration == 0);
        this.stepForward.option("disabled", this.calculator.status == STATUS.PLAYING || this.calculator.status == STATUS.REPLAYING || iteration == lastIteration);
        this.playHead.option("max", lastIteration);
        this.playHead.option("value", iteration);
    }
    
    playPausePressed() {
        this.calculator.status === STATUS.PLAYING ? this.calculator.pause() : this.calculator.play();
        this.updatePlayer();
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
    }
    
    reset() {
        this.calculator.clear();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name == "ExpressionShape")
                this.calculator.parse(shape.properties.expression);
        });
        this.updatePlayer();
    }
    
    async open() {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const content = await file.text();
        this.board.deserialize(JSON.parse(content));
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
        const writableStream = await fileHandle.createWritable();
        var content = this.board.serialize();
        await writableStream.write(content);
        await writableStream.close();
    }
    
    onSelected(e) {
        this.updateToolbar();
        var form = e.detail.shape.getForm();
        if (form == null)
            return;
        var shapePopup = $("#shape-popup").dxPopup("instance");
        shapePopup.content().empty();
        shapePopup.content().append(form);
        shapePopup.show();
    }
    
    onDeselected(e) {
        this.updateToolbar();
        var shapePopup = $("#shape-popup").dxPopup("instance");
        shapePopup.hide();
    }
    
    onShapeChanged(e) {
        if (e.detail.shape.constructor.name == "ExpressionShape")
            this.reset();
    }
    
    onIterate(e) {
        this.board.refresh();
        this.updatePlayer();
    }    
}