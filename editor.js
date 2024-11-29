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
                    onClick: function() {
                        $chart = createShape(400, 400);
                        $chart.dxChart({
                            dataSource: [
                                { day: "Monday", sales: 10 },
                                { day: "Tuesday", sales: 20 },
                                { day: "Wednesday", sales: 30 },
                                { day: "Thursday", sales: 40 },
                                { day: "Friday", sales: 50 }
                            ],
                            series: {
                                argumentField: "day",
                                valueField: "sales",
                                name: "Sales",
                                type: "bar",
                                color: "#ffaa66"
                            }
                        });
                    }
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
                    onClick: function () {
                        console.log("Stop clicked");
                    }
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
        contentTemplate: function () {
            return $("<div id='shape-form'></div>").dxForm({
                colCount: 1,
                onFieldDataChanged: e => onFieldDataChanged(e),
                items: [
                      {
                        dataField: "name",
                        label: { text: "Name", visible: false },
                        editorType: "dxTextBox",
                        editorOptions: {
                            stylingMode: "filled"
                        }
                      },
                      {
                        dataField: "backgroundColor",
                        label: { text: "Background color" },
                        editorType: "dxButtonGroup",
                        editorOptions: {
                            onContentReady: function(e) {
                                e.component.option('items').forEach((item, index) => {
                                    const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                    buttonElement.find(".dx-icon").css("color", item.color);
                                });
                            },
                            items: backgroundColors.map(c => ({
                                icon: "fa-solid fa-square",
                                color: c.color
                            })),
                            keyExpr: "color",
                            stylingMode: "text"
                        }
                      },
                      {
                        dataField: "foregroundColor",
                        label: { text: "Foreground color" },
                        editorType: "dxButtonGroup",
                        editorOptions: {
                            onContentReady: function(e) {
                                e.component.option('items').forEach((item, index) => {
                                    const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                    buttonElement.find(".dx-icon").css("color", item.color);
                                });
                            },
                            items: strokeColors.map(c => ({
                                icon: "fa-solid fa-square",
                                color: c.color
                            })),
                            keyExpr: "color",
                            stylingMode: "text"
                        }
                      },
                      {
                        dataField: "xTerm",
                        label: { text: "X Variable" },
                        editorType: "dxTextBox",
                        editorOptions: {
                            stylingMode: "filled"
                        }
                      },
                      {
                        dataField: "yTerm",
                        label: { text: "Y Variable" },
                        editorType: "dxTextBox",
                        editorOptions: {
                            stylingMode: "filled"
                        }
                      }
                    ]
              });
        },
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

const strokeColors = [
    { color: "#1e1e1e"},
    { color: "#ffc9c9" },
    { color: "#b1f2ba" },
    { color: "#a4d8ff" },
    { color: "#ffec99" }
];
const backgroundColors = [
    { color: "#ebebeb"},
    { color: "#e03130" },
    { color: "#2f9e44" },
    { color: "#1871c2" },
    { color: "#f08c02" }
];

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

function createShape(width, height) {
    const svgRect = board.svg.getBoundingClientRect();
    const divRect = board.svg.parentNode.getBoundingClientRect();
    const divCenterX = divRect.left + divRect.width / 2;
    const divCenterY = divRect.top + divRect.height / 2;
    const svgPoint = board.svg.createSVGPoint();
    svgPoint.x = divCenterX;
    svgPoint.y = divCenterY;
    const svgCTM = board.svg.getScreenCTM().inverse();
    const svgCoords = svgPoint.matrixTransform(svgCTM);
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("cx", svgCoords.x);
    foreignObject.setAttribute("cy", svgCoords.y);
    foreignObject.setAttribute("width", width);
    foreignObject.setAttribute("height", height);
    const $div = $("<div>").appendTo(foreignObject);
    $div.css({ "width": "100%", "height": "100%" });
    board.svg.appendChild(foreignObject);
    new Shape(board, foreignObject);
    return $div;
}

function addBody() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("BodyShape", { name: "Body", x: center.x - 50, y: center.y - 50, width: 100, height: 100, rotation: 0, color: backgroundColors[1].color });
    shape.calculator = calculator;
    commands.execute(new AddShapeCommand(board, shape));
}

function addExpresssion() {
    var center = this.board.getClientCenter();
    var shape = board.shapes.createShape("ExpressionShape", { name: "Expression", x: center.x - 150, y: center.y - 25, width: 300, height: 50, rotation: 0 });
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

function clear() {
    board.clear();    
}

async function open() {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    const content = await file.text();
    board.deserialize(JSON.parse(content));
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

function onFieldDataChanged(e) {
    if (selection.selectedShape)
        selection.selectedShape.properties[e.dataField] = e.value;
}

function onSelected(e) {
    var shapePopup = $("#shape-popup").dxPopup("instance");
    shapePopup.show();
    var shapeForm = $("#shape-form").dxForm("instance");
    shapeForm.formData = null;
    shapeForm.updateData(e.detail.shape.properties);
}

function onDeselected(e) {
    var shapePopup = $("#shape-popup").dxPopup("instance");
    shapePopup.hide();
}

function onChanged(e) {
    calculator.reset();
    board.shapes.shapes.forEach(shape => {
        if (shape.properties.type == 'ExpressionShape')
            calculator.parse(shape.expression);
    });
    setPlayPauseButton();
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
calculator.on("iterate", e => onIterate(e))