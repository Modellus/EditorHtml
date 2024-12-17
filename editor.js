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
                    onClick: _ => addExpresssion()
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-circle",
                    onClick: _ => addBody()
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-arrow-right-long",
                    onClick: function() {
                        alert("Pointer button clicked!");
                    }
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-chart-line",
                    onClick: _ => addChart()
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-table",
                    onClick: _ => addTable()
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
                    onClick: e => playPausePressed(e)
                },
                location: "center"
            },
            {
                widget: "dxSlider",
                cssClass: "slider",
                options: {
                    min: 0,
                    max: 100,
                    value: 0,
                    width: 400,
                    onValueChanged: function (e) {
                        console.log("Slider value:", e.value);
                    }
                },
                location: "center"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-stop", 
                    onClick: e => stopPressed(e)
                },
                location: "center"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-repeat",
                    onClick: function () {
                        console.log("Replay clicked");
                    }
                },
                location: "center"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-map",
                    onClick: function () {
                        console.log("Replay clicked");
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
            const firstUser = { id: '1', name: 'User' };
            const secondUser = { id:'2', name: 'Modellus', avatarUrl: 'https://devexpress.github.io/DevExtreme/images/icons/bot.png' };
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
            text: 'New',
            icon: 'fa-light fa-file',
            shortcut: 'Ctrl+N',
            name: "New"
        },
        {
            text: 'Open...',
            icon: 'fa-light fa-folder',
            shortcut: 'Ctrl+O',
            name: "Open"
        },
        {
            text: 'Save...',
            icon: 'fa-light fa-arrow-down-to-bracket',
            shortcut: 'Ctrl+S',
            name: "Save"
        },
        {
            text: 'Close',
            icon: 'fa-light fa-times',
            shortcut: 'Ctrl+W',
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

function addChart() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("ChartShape", calculator, { name: "Chart", x: center.x - 250, y: center.y - 250, width: 500, height: 500, rotation: 0 });
    commands.execute(new AddShapeCommand(board, shape));
}

function addTable() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("TableShape", calculator, { name: "Table", x: center.x - 250, y: center.y - 250, width: 500, height: 500, rotation: 0 });
    commands.execute(new AddShapeCommand(board, shape));
}

function addBody() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("BodyShape", calculator, { name: "Body", x: center.x - 50, y: center.y - 50, width: 100, height: 100, rotation: 0 });
    commands.execute(new AddShapeCommand(board, shape));
}

function addExpresssion() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("ExpressionShape", calculator, { name: "Expression", x: center.x - 150, y: center.y - 25, width: 300, height: 50, rotation: 0 });
    shape.element.addEventListener("changed", e => onChanged(e));
    commands.execute(new AddShapeCommand(board, shape));
}

function undoPressed() {
    commands.undo();
}

function redoPressed() {
    commands.redo();
}

function setPlayPauseButton() {
    var button = $("#playPauseButton").dxButton("instance");
    button.option("icon", calculator.isPlaying ? "fa-light fa-pause" : "fa-light fa-play");
    button.repaint();
}

function playPausePressed(e) {
    if (calculator.isPlaying)
        calculator.pause();
    else
        calculator.play();
    setPlayPauseButton();
}

function stopPressed(e) {
    calculator.stop();
    board.refresh();
    setPlayPauseButton();
}

function clear() {
    calculator.clear();
    board.clear();    
}

function reset() {
    calculator.clear();
    debugger;
    board.shapes.shapes.forEach(shape => {
        if (shape.properties.type == 'ExpressionShape')
            calculator.parse(shape.properties.expression);
    });
    setPlayPauseButton();
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
    var shape = e.detail.shape;
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
    reset();
}

function onIterate(e) {
    board.refresh();
}

DevExpress.config({ licenseKey: "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjQxCn0=.RwzuszxP0EZpb1mjikhmz6G0g5QUrgDILiiRTePC1SeHd3o9co5aGr7mMPuysN6kKb16+UZ0uwtnUXeiOwJcvFTd9wDPT8UqhPXr3uBXmEonDisUwgOBZrfrbZc1satfHazSYg=="});
var calculator = new Calculator();
var board = new Board(document.getElementById("svg"));
var selection = new Selection(board);
new MiniMap(board, document.getElementById('minimap-image'), document.getElementById('minimap-viewport'));
createContextMenu();
createTopToolbar();
createBottomToolbar();
createChat();
createShapePopup();
board.svg.addEventListener("selected", e => onSelected(e));
board.svg.addEventListener("deselected", e => onDeselected(e));
board.shapes.registerShape(BodyShape);
board.shapes.registerShape(ExpressionShape);
board.shapes.registerShape(ChartShape);
board.shapes.registerShape(TableShape);
calculator.on("iterate", e => onIterate(e))