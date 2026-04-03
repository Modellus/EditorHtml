class BottomToolbar {
    constructor(shell) {
        this.shell = shell;
        this.instance = null;
        this.zoom = null;
        this.playPause = null;
        this.stop = null;
        this.replay = null;
        this.playHead = null;
        this.stepBackward = null;
        this.stepForward = null;
        this.$playHeadMin = null;
        this.$playHeadMax = null;
        this._create();
    }

    _create() {
        $("#bottom-toolbar").dxToolbar({
            items: [
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-minus",
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom Out Tooltip", 280)
                    },
                    location: "before",
                    onClick: e => this.shell.panAndZoom.setZoom(this.shell.panAndZoom.getZoom() - 0.1)
                },
                {
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "zoomButton"
                        },
                        stylingMode: "text",
                        text: "100 %",
                        onClick: e => this.shell.panAndZoom.setZoom(1),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom Reset Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-plus",
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom In Tooltip", 280)
                    },
                    location: "before",
                    onClick: e => this.shell.panAndZoom.setZoom(this.shell.panAndZoom.getZoom() + 0.1)
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
                        onClick: _ => this.shell.undoPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Undo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-right",
                        onClick: _ => this.shell.redoPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Redo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    location: "center",
                    template: () => {
                        const container = $('<div></div>');
                        this.createIndependentDropDownButton(container);
                        return container;
                    }
                },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-play",
                        elementAttr: {
                            id: "playPauseButton"
                        },
                        onClick: _ => this.shell.playPausePressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Play Pause Tooltip", 280)
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
                        onClick: _ => this.shell.stopPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Stop Tooltip", 280)
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
                                const precision = Utils.getPrecision(this.shell.calculator.properties.independent.step);
                                return this.shell.calculator.getIndependentValue(v).toFixed(precision);
                            },
                            showMode: "always",
                            position: "top",
                        },
                        onValueChanged: e => this.shell.iterationChanged(e.value)
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
                        onClick: _ => this.shell.stepBackwardPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Step Backward Tooltip", 280)
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
                        onClick: _ => this.shell.stepForwardPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Step Forward Tooltip", 280)
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
                        onClick: _ => this.shell.replayPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Replay Tooltip", 280)
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
                        onClick: () => this.shell.miniMapPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Mini Map Tooltip", 280)
                    },
                    location: "after"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-solid fa-grid",
                        elementAttr: {
                            id: "snap-grid-button"
                        },
                        onClick: () => this.shell.snapToGridPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Snap Grid Tooltip", 280)
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
                        onClick: _ => this.shell.chatPressed(),
                        onInitialized: e => {
                            this.shell.chatController.tooltip = this.shell.createTranslatedTooltip(e, "Chat Tooltip", 280, () => !this.shell.chatController.isOpen());
                        }
                    }
                }
            ]
        });
        this.instance = $("#bottom-toolbar").dxToolbar("instance");
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

    createIndependentDropDownButton(container) {
        this._independentDropdownElement = $('<div id="independentDropDown">');
        this._independentDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const $span = $('<span>')
                    .css({
                        fontFamily: "KaTeX_Math, serif",
                        fontStyle: "italic",
                        fontSize: "16px"
                    })
                    .text(this.shell.calculator.properties.independent.name);
                this._independentNameLabel = $span[0];
                element[0].appendChild($span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this.buildIndependentMenuContent(contentElement)
            }
        });
        this._independentDropdownElement.appendTo(container);
    }

    buildIndependentMenuContent(contentElement) {
        const independent = this.shell.calculator.properties.independent;
        const listItems = [
            {
                text: this.shell.board.translations.get("Independent.Name"),
                buildControl: $container => {
                    $('<div>').appendTo($container).dxTextBox({
                        value: independent.name,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: e => {
                            this.shell.setPropertyCommand("independent.name", e.value);
                            this._independentNameLabel.textContent = e.value;
                        }
                    });
                }
            },
            {
                text: this.shell.board.translations.get("Independent.Start"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: independent.start,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: e => this.shell.setPropertyCommand("independent.start", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: this.shell.board.translations.get("Independent.End"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: independent.end,
                        stylingMode: "filled",
                        disabled: independent.noLimit,
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: e => this.shell.setPropertyCommand("independent.end", e.value)
                    }).appendTo($container);
                    this._endEditor = $container.find(".dx-numberbox").dxNumberBox("instance");
                }
            },
            {
                text: this.shell.board.translations.get("Independent.Step"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: independent.step,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: e => this.shell.setPropertyCommand("independent.step", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Type",
                buildControl: $container => {
                    $('<div>').dxButtonGroup({
                        items: [
                            { key: false, icon: "fa-light fa-bracket-square-right", hint: "Limited" },
                            { key: true,  icon: "fa-light fa-infinity",             hint: "Unlimited" }
                        ],
                        keyExpr: "key",
                        selectedItemKeys: [independent.noLimit],
                        stylingMode: "outlined",
                        elementAttr: { class: "mdl-pill-group mdl-small-icon" },
                        buttonTemplate: (data, container) => {
                            container[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
                        },
                        onContentReady: e => this._initPillButtonGroup(e.element[0]),
                        onSelectionChanged: e => {
                            if (e.addedItems.length > 0) {
                                const noLimit = e.addedItems[0].key;
                                this.shell.setPropertyCommand("independent.noLimit", noLimit);
                                this._endEditor?.option("disabled", noLimit);
                            }
                            this._movePill(e.component.element()[0]);
                            e.component.repaint();
                        }
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 350, width: "100%" });
        const scrollContent = $(contentElement).dxScrollView("instance").content();
        $('<div>').appendTo(scrollContent).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    }

    _initPillButtonGroup(element) {
        const pill = document.createElement("div");
        pill.className = "mdl-pill";
        element.style.position = "relative";
        element.appendChild(pill);
        this._movePill(element);
    }

    _movePill(element) {
        const pill = element.querySelector(".mdl-pill");
        if (!pill)
            return;
        const selected = element.querySelector(".dx-item-selected .dx-button");
        if (!selected)
            return;
        pill.style.left = selected.offsetLeft + "px";
        pill.style.width = selected.offsetWidth + "px";
    }

    updatePlayer() {
        const lastIteration = this.shell.calculator.getLastIteration();
        const finalIteration = this.shell.calculator.getFinalIteration();
        const iteration = this.shell.calculator.getIteration();
        const icon = this.playPause.option("icon");
        const isRunning = this.shell.calculator.status == STATUS.PLAYING || this.shell.calculator.status == STATUS.REPLAYING;
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
        this.$playHeadMin.text(this.shell.calculator.getStart().toFixed(Utils.getPrecision(this.shell.calculator.properties.independent.step)));
        if (this.shell.calculator.properties.independent.noLimit)
            this.$playHeadMax.html('<i class="fa-light fa-infinity" style="font-size:14px; font-weight:400; padding-top:3px"></i>');
        else
            this.$playHeadMax.text(this.shell.calculator.getEnd().toFixed(Utils.getPrecision(this.shell.calculator.properties.independent.step)));
        if (this._independentNameLabel)
            this._independentNameLabel.textContent = this.shell.calculator.properties.independent.name;
    }

    updateSnapToGridButton() {
        const button = $("#snap-grid-button").dxButton("instance");
        if (!button)
            return;
        const active = this.shell.properties.snapToGrid;
        button.option("icon", active ? "fa-solid fa-grid" : "fa-light fa-grid");
    }

}
