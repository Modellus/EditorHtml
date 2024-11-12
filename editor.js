function getRandomPastelColor() {
    const r = Math.floor((Math.random() * 127) + 127);
    const g = Math.floor((Math.random() * 127) + 127);
    const b = Math.floor((Math.random() * 127) + 127);
    return `rgb(${r},${g},${b})`;
}

function getRandomRadius(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createShape(width, height) {
    const svgRect = svg.svg.getBoundingClientRect();
    const divRect = svg.svg.parentNode.getBoundingClientRect();
    const divCenterX = divRect.left + divRect.width / 2;
    const divCenterY = divRect.top + divRect.height / 2;
    const svgPoint = svg.svg.createSVGPoint();
    svgPoint.x = divCenterX;
    svgPoint.y = divCenterY;
    const svgCTM = svg.svg.getScreenCTM().inverse();
    const svgCoords = svgPoint.matrixTransform(svgCTM);
    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("cx", svgCoords.x);
    foreignObject.setAttribute("cy", svgCoords.y);
    foreignObject.setAttribute("width", width);
    foreignObject.setAttribute("height", height);
    const $div = $("<div>").appendTo(foreignObject);
    $div.css({ "width": "100%", "height": "100%" });
    svg.svg.appendChild(foreignObject);
    new Shape(svg, foreignObject);
    return $div;
}

function createContextMenu() {
    var menuItems = [
        {
            text: 'New',
            icon: 'fa-light fa-file',
            shortcut: 'Ctrl+N'
        },
        {
            text: 'Open...',
            icon: 'fa-light fa-folder',
            shortcut: 'Ctrl+O'
        },
        {
            text: 'Save...',
            icon: 'fa-light fa-arrow-down-to-bracket',
            shortcut: 'Ctrl+S'
        },
        {
            text: 'Close',
            icon: 'fa-light fa-times',
            shortcut: 'Ctrl+W'
        }
    ];
    $("#context-menu").dxContextMenu({
        items: menuItems.map(item => ({
            text: item.text,
            icon: item.icon,
            shortcut: item.shortcut,
            template: function (itemData) {
                return `<div style="display: flex; justify-content: space-between; align-items: center;width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                            <span style="color: #999;">${itemData.shortcut}</span>
                        </div>`;
            }
        })),
        target: "#toolbar",
        position: {
            my: "top left",
            at: "bottom left",
            of: "#menu-button",
            offset: "0 10"
        }
    });
}

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
                    onClick: function() {
                        $expression = createShape(200, 50);
                        $expression.addClass("mq-editable-field mq-math-mode");
                        var MQ = MathQuill.getInterface(2);
                        var mathField = MQ.MathField($expression[0], {
                            spaceBehavesLikeTab: true,
                            handlers: {
                                edit: function() { 
                                    
                                }
                            }
                        });
                    }
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-circle",
                    onClick: function() {
                        const radius = getRandomRadius(50, 150);
                        const color = getRandomPastelColor();
                        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        circle.setAttribute('cx', svg.svg.clientWidth / 2);
                        circle.setAttribute('cy', svg.svg.clientHeight / 2);
                        circle.setAttribute('r', radius);
                        circle.setAttribute('fill', color);
                        svg.svg.appendChild(circle);
                        var data = { name: "particle", backgroundColor: color, foreGroundColor: color, xVariable: "", yVariable: "" };
                        new Shape(svg, circle, data);
                    }
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
                    icon: "fa-light fa-play",
                    onClick: function () {
                        console.log("Play clicked");
                    }
                },
                location: "center"
            },
            {
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-pause",
                    onClick: function () {
                        console.log("Pause clicked");
                    }
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
    $("#shape-popup").dxPopup({
        width: 200,
        height: 400,
        shading: false,
        showTitle: false,
        dragEnabled: false,
        hideOnOutsideClick: false,
        animation: null,
        contentTemplate: function () {
            return $("<div id='shape-form'></div>").dxForm({
                colCount: 1,
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
                        dataField: "xVariable",
                        label: { text: "X Variable" },
                        editorType: "dxTextBox",
                        editorOptions: {
                            stylingMode: "filled"
                        }
                      },
                      {
                        dataField: "yVariable",
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

function onSelected(e) {
    var shapePopup = $("#shape-popup").dxPopup("instance");
    shapePopup.show();
    var shapeForm = $("#shape-form").dxForm("instance");
    shapeForm.formData = e.detail.shape.data;
    shapeForm.updateData(e.detail.shape.data);
}

function onDeselected(e) {
    var shapePopup = $("#shape-popup").dxPopup("instance");
    var shapeForm = $("#shape-form").dxForm("instance");
    if (shapeForm != undefined) {
        var data = shapeForm.option("formData");
        Object.assign(e.detail.shape.data, data);
    }
    shapePopup.hide();
}

DevExpress.config({ licenseKey: "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjQxCn0=.RwzuszxP0EZpb1mjikhmz6G0g5QUrgDILiiRTePC1SeHd3o9co5aGr7mMPuysN6kKb16+UZ0uwtnUXeiOwJcvFTd9wDPT8UqhPXr3uBXmEonDisUwgOBZrfrbZc1satfHazSYg=="});
const system = new Modellus.System("t");
const parser = new Modellus.Parser(system);
var svg = new SVG(document.getElementById("svg"));
new Selection(document.getElementById("svg"));
new MiniMap(svg, document.getElementById('minimap-image'), document.getElementById('minimap-viewport'));
createContextMenu();
createTopToolbar();
createBottomToolbar();
createChat();
createShapePopup();
svg.svg.addEventListener("selected", (e) => onSelected(e));
svg.svg.addEventListener("deselected", (e) => onDeselected(e));