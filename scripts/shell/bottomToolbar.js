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
        this._create();
    }

    _create() {
        $("#bottom-toolbar").dxToolbar({
            elementAttr: {
                class: "mdl-player-toolbar"
            },
            onItemClick: e => {
                if (e.itemData?.preserveSelectionOnClick)
                    return;
                this.shell.deselectShape();
            },
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
                    preserveSelectionOnClick: true,
                    options: {
                        icon: "fa-light fa-rotate-left",
                        onClick: _ => this.shell.undoPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Undo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    preserveSelectionOnClick: true,
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
                    template: () => $("<div class='toolbar-separator'>|</div>")
                },
                ...ModellusPlayerToolbar.createPlayerItems({
                    onPlayPause: () => this.shell.playPausePressed(),
                    onStop: () => this.shell.stopPressed(),
                    onStepBackward: () => this.shell.stepBackwardPressed(),
                    onStepForward: () => this.shell.stepForwardPressed(),
                    onReplay: () => this.shell.replayPressed(),
                    ...ModellusPlayerToolbar.createPlayerTooltipInitializers((event, key, width) => this.shell.createTranslatedTooltip(event, key, width)),
                    sliderMinimum: 1,
                    sliderMaximum: 1,
                    sliderValue: 1,
                    sliderWidth: 400,
                    sliderTooltipFormatter: value => {
                        const precision = Utils.getPrecision(this.shell.calculator.properties.independent.step);
                        return Utils.formatNumber(this.shell.calculator.getIndependentValue(value), precision);
                    },
                    onSliderValueChanged: (value, isUserInitiated) => this.shell.iterationChanged(value, isUserInitiated),
                    itemsBeforeSlider: [
                        {
                            location: "center",
                            template: () => {
                                const container = $('<div>');
                                this.createStartDropDown(container);
                                return container;
                            }
                        }
                    ],
                    itemsAfterSlider: [
                        {
                            location: "center",
                            template: () => {
                                const container = $('<div>');
                                this.createEndDropDown(container);
                                return container;
                            }
                        }
                    ]
                }),
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
                        icon: this.shell.properties.snapToGrid ? "fa-solid fa-grid" : "fa-light fa-grid",
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
                        icon: "fa-light fa-message-dots",
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
    }

    createStartDropDown(container) {
        this._startDropdownElement = $('<div id="startDropDown">');
        this._startDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const $span = $('<span>')
                    .css({ fontFamily: "KaTeX_Main, serif", fontSize: "15px" });
                this._startLabel = $span[0];
                element[0].appendChild($span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this.buildStartMenuContent(contentElement)
            }
        });
        this._startDropdownElement.appendTo(container);
    }

    buildStartMenuContent(contentElement) {
        const independent = this.shell.calculator.properties.independent;
        const listItems = [
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
                text: this.shell.board.translations.get("StepDelay"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.shell.calculator.properties.iterationDuration,
                        stylingMode: "filled",
                        min: 0,
                        showClearButton: true,
                        inputAttr: { style: "font-family: Atma, sans-serif" },
                        onValueChanged: e => this.shell.setPropertyCommand("iterationDuration", e.value)
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
    }

    createEndDropDown(container) {
        this._endDropdownElement = $('<div id="endDropDown">');
        this._endDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const $span = $('<span>')
                    .css({ fontFamily: "KaTeX_Main, serif", fontSize: "15px" });
                this._endLabel = $span[0];
                element[0].appendChild($span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this.buildEndMenuContent(contentElement)
            }
        });
        this._endDropdownElement.appendTo(container);
    }

    buildEndMenuContent(contentElement) {
        const independent = this.shell.calculator.properties.independent;
        const listItems = [
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
                        buttonTemplate: (data, buttonContainer) => {
                            buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
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
        $('<div>').appendTo(contentElement).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-control"));
            }
        });
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
        const listItems = [
            {
                text: this.shell.board.translations.get("Independent.Name"),
                buildControl: $container => {
                    $('<div>').appendTo($container).dxTextBox({
                        value: this.shell.calculator.properties.independent.name,
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
                text: this.shell.board.translations.get("Precision"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.shell.properties.precision,
                        min: 0,
                        max: 10,
                        step: 1,
                        showSpinButtons: true,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        inputAttr: { style: "font-family: Atma, sans-serif" },
                        onValueChanged: e => this.shell.setPropertyCommand("precision", e.value)
                    }).appendTo($container);
                }
            },
            {
                text: this.shell.board.translations.get("AngleUnit"),
                buildControl: $container => {
                    $('<div>').dxButtonGroup({
                        items: [
                            { key: "radians", icon: "fa-light fa-pi",  hint: "Radians" },
                            { key: "degrees", icon: "fa-light fa-dot", hint: "Degrees" }
                        ],
                        keyExpr: "key",
                        selectedItemKeys: [this.shell.properties.angleUnit],
                        stylingMode: "outlined",
                        elementAttr: { class: "mdl-pill-group mdl-small-icon" },
                        buttonTemplate: (data, buttonContainer) => {
                            const style = data.key === "degrees" ? "font-size:20px; position:relative; top:-4px" : "";
                            buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}" style="${style}"></i>`;
                        },
                        onContentReady: e => this._initPillButtonGroup(e.element[0]),
                        onSelectionChanged: e => {
                            if (e.addedItems.length > 0)
                                this.shell.setPropertyCommand("angleUnit", e.addedItems[0].key);
                            this._movePill(e.component.element()[0]);
                            e.component.repaint();
                        }
                    }).appendTo($container);
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 250, width: "100%" });
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
            this.shell.updatePlayerIcon(isRunning ? "fa-light fa-pause" : "fa-light fa-play");
            this.playPause.repaint();
        }
        this.stop.option("disabled", isRunning);
        this.replay.option("disabled", isRunning);
        this.stepBackward.option("disabled", isRunning || iteration == 1);
        this.stepForward.option("disabled", isRunning || iteration >= lastIteration);
        this.shell.updatePlayerSliderRange(finalIteration);
        this.shell.updatePlayerSliderValue(iteration);
        ModellusPlayerToolbar.updateCalculatedProgress(this.playHead, this.shell.calculator.getLastCalculatedIteration());
        const precision = Utils.getPrecision(this.shell.calculator.properties.independent.step);
        if (this._startLabel)
            this._startLabel.textContent = Utils.formatNumber(this.shell.calculator.getStart(), precision);
        if (this._endLabel) {
            if (this.shell.calculator.properties.independent.noLimit)
                this._endLabel.innerHTML = '<i class="fa-light fa-infinity" style="font-size:14px; font-weight:400; padding-top:3px"></i>';
            else
                this._endLabel.textContent = Utils.formatNumber(this.shell.calculator.getEnd(), precision);
        }
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
