function createTopToolbar() {
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
                    onClick: _ => addShape("ExpressionShape", "Expression", 300, 50),
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
                    elementAttr1: {
                        style: "font-family: cursive; font-size: 16px"
                    },
                    onClick: _ => addShape("ReferentialShape", "Referential", 400, 200),
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
                    onClick: _ => addShape("ImageShape", "Image", 100, 100)
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
                    onClick: _ => addShape("BodyShape", "Body", 20, 20)
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
                    onClick: _ => addShape("VectorShape", "Vector", 30, 30)
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
                    onClick: _ => addShape("ChartShape", "Chart", 200, 200)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-table",
                    onClick: _ => addShape("TableShape", "Table", 200, 200)
                }
            }
        ]
    });
}

function createBottomToolbar() {
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
                    onClick: _ => undoPressed()
                },
                location: "before"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-rotate-right",
                    onClick: _ => redoPressed()
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
                    onClick: _ => playPausePressed()
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
                        format: _ => calculator.getIndependentValue().toFixed(2),
                        showMode: "always",
                        position: "top",
                    }, 
                    onValueChanged: e => iterationChanged(e.value)
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
                    onClick: _ => stopPressed()
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
                    onClick: _ => replayPressed()
                },
                location: "center"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-map",
                    onClick: function () {
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
    
function createChat() {
    $("#chat-popup").dxPopup({
        width: 300,
        height: 400,
        shading: false,
        showTitle: false,
        dragEnabled: false,
        hideOnOutsideClick: true,
        animation: null,
        contentTemplate: function () {
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

function createShapePopup() {
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

function createContextMenu() {
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
                clear();
            if (e.itemData.name == "Open")
                open();
            if (e.itemData.name == "Save")
                save();
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

function sendToBackend(message, chat) {
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

function addShape(type, name, width, height) {
    var center = selection.selectedShape == null ? this.board.getClientCenter() : { x: 0, y: 0};
    var shape = board.shapes.createShape(type, this.board, calculator, { name: name, x: center.x, y: center.y, width: width, height: height }, selection.selectedShape);
    shape.element.addEventListener("changed", e => onChanged(e));
    commands.execute(new AddShapeCommand(board, shape));
}

function undoPressed() {
    commands.undo();
}

function redoPressed() {
    commands.redo();
}

function updatePlayer() {
    playPause.option("icon", calculator.status == STATUS.PLAYING || calculator.status == STATUS.REPLAYING ? "fa-light fa-pause" : "fa-light fa-play");
    playPause.repaint();
    stop.option("disabled", calculator.status == STATUS.PLAYING || calculator.status == STATUS.REPLAYING);
    replay.option("disabled", calculator.status == STATUS.PLAYING || calculator.status == STATUS.REPLAYING);
    playHead.option("max", calculator.getLastIteration());
    playHead.option("value", calculator.getIteration());
}

function playPausePressed() {
    calculator.status === STATUS.PLAYING ? calculator.pause() : calculator.play();
    updatePlayer();
}

function stopPressed() {
    calculator.stop();
    board.refresh();
    updatePlayer();
}

function replayPressed() {
    calculator.replay();
    updatePlayer();
}

function iterationChanged(iteration) {
    calculator.setIteration(iteration);
}

function clear() {
    calculator.clear();
    board.clear();    
}

function reset() {
    calculator.clear();
    board.shapes.shapes.forEach(shape => {
        if (shape.properties.type == "ExpressionShape")
            calculator.parse(shape.properties.expression);
    });
    updatePlayer();
}

async function open() {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    const content = await file.text();
    board.deserialize(calculator, JSON.parse(content));
    reset();
}

async function save() {
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
    var content = board.serialize();
    await writableStream.write(content);
    await writableStream.close();
}

function onSelected(e) {
    shape = e.detail.shape;
    var form = shape.getForm();
    if (form == null)
        return;
    var shapePopup = $("#shape-popup").dxPopup("instance");
    shapePopup.content().empty();
    shapePopup.content().append(form);
    shapePopup.show();
}

function onDeselected(e) {
    var shapePopup = $("#shape-popup").dxPopup("instance");
    shapePopup.hide();
}

function onChanged(e) {
    if (e.detail.shape.properties.type == "ExpressionShape")
        reset();
}

function onIterate(e) {
    board.refresh();
    updatePlayer();
}

DevExpress.config({ licenseKey: "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjQxCn0=.RwzuszxP0EZpb1mjikhmz6G0g5QUrgDILiiRTePC1SeHd3o9co5aGr7mMPuysN6kKb16+UZ0uwtnUXeiOwJcvFTd9wDPT8UqhPXr3uBXmEonDisUwgOBZrfrbZc1satfHazSYg=="});
var calculator = new Calculator();
var board = new Board(document.getElementById("svg"));
var selection = new Selection(board);
new MiniMap(board, document.getElementById("minimap-image"), document.getElementById("minimap-viewport"));
createContextMenu();
createTopToolbar();
createBottomToolbar();
createChat();
createShapePopup();
var playPause = $("#playPauseButton").dxButton("instance");
var stop = $("#stopButton").dxButton("instance");
var replay = $("#replayButton").dxButton("instance");
var playHead = $("#playHeadSlider").dxSlider("instance");
board.svg.addEventListener("selected", e => onSelected(e));
board.svg.addEventListener("deselected", e => onDeselected(e));
board.shapes.registerShapes([BodyShape, ExpressionShape, ChartShape, TableShape, ImageShape, VectorShape, ReferentialShape]);
calculator.on("iterate", e => onIterate(e));
calculator.on("iterationChanged", e => onIterationChanged(e));