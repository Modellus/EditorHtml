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
                        if (this.getPlayerTerm() === "iteration")
                            return Utils.formatNumber(this.shell.calculator.getIterationTermValue(value), 0);
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
                    location: "after",
                    template: () => {
                        const container = $('<div>');
                        this.createGridDropDownButton(container);
                        return container;
                    }
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
        this.updateSnapToGridButton();
        this.updateMiniMapButton();
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
            itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
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
                        value: this.getPlayerTermEnd(),
                        stylingMode: "filled",
                        disabled: independent.noLimit,
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: e => this.setPlayerTermEnd(e.value)
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
            itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
        });
    }

    getPlayerTermEnd() {
        const calculator = this.shell.calculator;
        if (this.getPlayerTerm() === "iteration")
            return calculator.getIterationTermValue(calculator.getFinalIteration());
        return calculator.properties.independent.end;
    }

    setPlayerTermEnd(value) {
        if (this.getPlayerTerm() !== "iteration") {
            this.shell.setPropertyCommand("independent.end", value);
            return;
        }
        const independent = this.shell.calculator.properties.independent;
        const finalIteration = Math.max(1, this.shell.calculator.system.iterationTermValueToIteration(Math.floor(value)));
        const end = independent.start + (finalIteration - 1) * independent.step;
        this.shell.setPropertyCommand("independent.end", Utils.roundToPrecision(end, Utils.getPrecision(independent.step)));
    }

    createGridDropDownButton(container) {
        this._gridDropdownElement = $('<div id="snap-grid-button">');
        this._gridDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: this.shell.properties.snapToGrid ? "fa-solid fa-grid" : "fa-light fa-grid",
            onInitialized: e => this.shell.createTranslatedTooltip(e, "Snap Grid Tooltip", 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this.buildGridMenuContent(contentElement)
            }
        });
        this._gridDropdownElement.appendTo(container);
    }

    buildGridMenuContent(contentElement) {
        const listItems = [
            {
                text: this.shell.board.translations.get("Grid"),
                buildControl: $container => {
                    const switchElement = $('<div>').appendTo($container).dxSwitch({
                        value: this.shell.properties.snapToGrid === true,
                        switchedOnText: this.shell.board.translations.get("On"),
                        switchedOffText: this.shell.board.translations.get("Off"),
                        onValueChanged: e => {
                            if (e.value !== this.shell.properties.snapToGrid)
                                this.shell.setPropertyCommand("snapToGrid", e.value);
                        }
                    });
                    this._gridSwitch = switchElement.dxSwitch("instance");
                }
            },
            {
                text: this.shell.board.translations.get("Grid Size"),
                buildControl: $container => {
                    const sizeElement = $('<div>').appendTo($container).dxNumberBox({
                        value: this.shell.properties.gridSize,
                        min: 5,
                        max: 100,
                        step: 5,
                        showSpinButtons: true,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        inputAttr: { style: "font-family: Atma, sans-serif" },
                        onValueChanged: e => {
                            if (e.value !== this.shell.properties.gridSize)
                                this.shell.setPropertyCommand("gridSize", e.value);
                        }
                    });
                    this._gridSizeEditor = sizeElement.dxNumberBox("instance");
                }
            }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
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
                    .text(this.getPlayerTermName());
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
                buildControl: $container => this.createPlayerTermNameEditor($container, "independent")
            },
            {
                text: this.shell.board.translations.get("IterationTerm"),
                buildControl: $container => this.createPlayerTermNameEditor($container, "iteration")
            },
            {
                text: this.shell.board.translations.get("CasesCount"),
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.shell.properties.casesCount,
                        min: 1,
                        max: 9,
                        step: 1,
                        showSpinButtons: true,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        inputAttr: { style: "font-family: Atma, sans-serif" },
                        onValueChanged: e => this.shell.setPropertyCommand("casesCount", e.value)
                    }).appendTo($container);
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
            },
            {
                text: this.shell.board.translations.get("Auto Play") ?? "Auto Play",
                buildControl: $container => {
                    const switchElement = $('<div>').appendTo($container).dxSwitch({
                        value: this.shell.properties.autoPlay === true,
                        switchedOnText: this.shell.board.translations.get("On"),
                        switchedOffText: this.shell.board.translations.get("Off"),
                        onValueChanged: e => {
                            if (e.value !== this.shell.properties.autoPlay)
                                this.shell.setPropertyCommand("autoPlay", e.value);
                        }
                    });
                    this._autoPlaySwitch = switchElement.dxSwitch("instance");
                }
            }
        ];
        Utils.renderDropdownMenuScroll(contentElement, 300, scrollContent => {
            $('<div>').appendTo(scrollContent).dxList({
                dataSource: listItems,
                scrollingEnabled: false,
                itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
            });
        });
    }

    getPlayerTerm() {
        return this.shell.properties.playerTerm ?? "independent";
    }

    getPlayerTermName() {
        const properties = this.shell.calculator.properties;
        return this.getPlayerTerm() === "iteration" ? properties.iterationTerm : properties.independent.name;
    }

    createPlayerTermNameEditor($container, key) {
        const control = $("<div>").addClass("term-packed-control");
        const buttonHost = $("<div>").addClass("term-packed-control__button");
        control.append(buttonHost);
        const checkbox = TermControl.createVisibilityCheckbox(buttonHost, this.getPlayerTerm() === key, value => {
            if (this._syncingPlayerTermVisibility)
                return;
            if (value && key !== this.getPlayerTerm())
                this.shell.setPropertyCommand("playerTerm", key);
            this.syncPlayerTermVisibilityCheckboxes();
        });
        if (key === "independent")
            this._independentVisibilityCheckbox = checkbox;
        else
            this._iterationVisibilityCheckbox = checkbox;
        const editorHost = $("<div>").addClass("term-packed-control__select");
        control.append(editorHost);
        const properties = this.shell.calculator.properties;
        $('<div>').appendTo(editorHost).dxTextBox({
            value: key === "independent" ? properties.independent.name : properties.iterationTerm,
            width: "100%",
            stylingMode: "filled",
            elementAttr: { class: "mdl-math-input mdl-variable-selector" },
            inputAttr: { class: "mdl-variable-selector" },
            onValueChanged: e => this.shell.setPropertyCommand(key === "independent" ? "independent.name" : "iterationTerm", e.value)
        });
        this.createPlayerTermUnitsEditor(control, key);
        if (key === "iteration")
            this.createIterationDomainButtonGroup(control);
        control.appendTo($container);
    }

    // The two terms the player names are terms like any other, so the unit is chosen where the name
    // is written, from the same picker every other term selector opens.
    createPlayerTermUnitsEditor(control, key) {
        const unitsHost = $("<div>").addClass("term-packed-control__units");
        control.append(unitsHost);
        UnitsControl.createEditor(unitsHost, {
            value: this.shell.calculator.getTermUnit(this.getPlayerTermNameFor(key)),
            nested: true,
            onValueChanged: unitText => this.shell.setTermUnitCommand(this.getPlayerTermNameFor(key), unitText)
        });
    }

    getPlayerTermNameFor(key) {
        const properties = this.shell.calculator.properties;
        return key === "independent" ? properties.independent.name : properties.iterationTerm;
    }

    createIterationDomainButtonGroup(control) {
        const host = $("<div>").css({ marginLeft: "8px", flex: "0 0 auto", alignSelf: "center" });
        control.append(host);
        this._iterationDomainGroupElement = $('<div>').dxButtonGroup({
            items: [
                { key: 0, text: "ℕ₀", hint: this.shell.board.translations.get("StartsAtZero") },
                { key: 1, text: "ℕ", hint: this.shell.board.translations.get("StartsAtOne") }
            ],
            keyExpr: "key",
            selectedItemKeys: [this.shell.properties.iterationTermStart ?? 1],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<span class="mdl-button-text">${data.text}</span>`;
            },
            onContentReady: e => this._initPillButtonGroup(e.element[0]),
            onSelectionChanged: e => {
                if (e.addedItems.length > 0 && e.addedItems[0].key !== (this.shell.properties.iterationTermStart ?? 1))
                    this.shell.setPropertyCommand("iterationTermStart", e.addedItems[0].key);
                this._movePill(e.component.element()[0]);
                e.component.repaint();
            }
        });
        this._iterationDomainGroupElement.appendTo(host);
    }

    syncIterationDomainButtonGroup() {
        const element = this._iterationDomainGroupElement?.[0];
        if (!element)
            return;
        const group = this._iterationDomainGroupElement.dxButtonGroup("instance");
        const selectedKey = this.shell.properties.iterationTermStart ?? 1;
        if (group.option("selectedItemKeys")[0] !== selectedKey)
            group.option("selectedItemKeys", [selectedKey]);
    }

    syncPlayerTermVisibilityCheckboxes() {
        if (!this._independentVisibilityCheckbox && !this._iterationVisibilityCheckbox)
            return;
        this._syncingPlayerTermVisibility = true;
        const playerTerm = this.getPlayerTerm();
        this._independentVisibilityCheckbox?.option("value", playerTerm === "independent");
        this._iterationVisibilityCheckbox?.option("value", playerTerm === "iteration");
        this._syncingPlayerTermVisibility = false;
    }

    _initPillButtonGroup(element) {
        Utils.initPillButtonGroup(element);
    }

    _movePill(element) {
        Utils.movePillButtonGroup(element);
    }

    updatePlayer() {
        const lastIteration = this.shell.calculator.getLastIteration();
        const finalIteration = this.shell.calculator.getFinalIteration();
        const iteration = this.shell.calculator.getIteration();
        const icon = this.playPause.option("icon");
        const isRunning = this.shell.calculator.status == STATUS.PLAYING || this.shell.calculator.status == STATUS.REPLAYING;
        // A model with an expression the engine cannot read still plays, and what it plays is wrong: the
        // button that starts it is filled in and turns red, so the state is read before anything is run.
        const hasExpressionErrors = this.shell.hasExpressionErrors?.() === true;
        const playPauseIcon = `${hasExpressionErrors ? "fa-solid" : "fa-light"} ${isRunning ? "fa-pause" : "fa-play"}`;
        if (icon != playPauseIcon) {
            this.shell.updatePlayerIcon(playPauseIcon);
            this.playPause.repaint();
        }
        $(this.playPause.element()).toggleClass("mdl-player-error", hasExpressionErrors);
        this.stop.option("disabled", isRunning);
        this.replay.option("disabled", isRunning);
        this.stepBackward.option("disabled", isRunning || iteration == 1);
        this.stepForward.option("disabled", isRunning || iteration >= lastIteration);
        this.shell.updatePlayerSliderRange(finalIteration);
        this.shell.updatePlayerSliderValue(iteration);
        ModellusPlayerToolbar.updateCalculatedProgress(this.playHead, this.shell.calculator.getLastCalculatedIteration());
        const showIterationTerm = this.getPlayerTerm() === "iteration";
        const precision = showIterationTerm ? 0 : Utils.getPrecision(this.shell.calculator.properties.independent.step);
        if (this._startLabel) {
            const start = showIterationTerm ? this.shell.calculator.getIterationTermValue(1) : this.shell.calculator.getStart();
            this._startLabel.textContent = Utils.formatNumber(start, precision);
        }
        if (this._endLabel) {
            if (this.shell.calculator.properties.independent.noLimit)
                this._endLabel.innerHTML = '<i class="fa-light fa-infinity" style="font-size:14px; font-weight:400; padding-top:3px"></i>';
            else {
                const end = showIterationTerm ? this.shell.calculator.getIterationTermValue(finalIteration) : this.shell.calculator.getEnd();
                this._endLabel.textContent = Utils.formatNumber(end, precision);
            }
        }
        if (this._independentNameLabel)
            this._independentNameLabel.textContent = this.getPlayerTermName();
        this.syncPlayerTermVisibilityCheckboxes();
        this.syncIterationDomainButtonGroup();
        if (this._autoPlaySwitch && this._autoPlaySwitch.option("value") !== (this.shell.properties.autoPlay === true))
            this._autoPlaySwitch.option("value", this.shell.properties.autoPlay === true);
    }

    updateToggleButton(buttonId, active, iconName) {
        const button = $(`#${buttonId}`).dxButton("instance");
        if (!button)
            return;
        button.option("icon", `${active ? "fa-solid" : "fa-light"} ${iconName}`);
        $(button.element()).toggleClass("dx-state-selected", active === true);
    }

    updateSnapToGridButton() {
        const active = this.shell.properties.snapToGrid === true;
        const dropDownButton = this._gridDropdownElement?.dxDropDownButton("instance");
        if (dropDownButton) {
            dropDownButton.option("icon", `${active ? "fa-solid" : "fa-light"} fa-grid`);
            $(dropDownButton.element()).find(".dx-button").toggleClass("dx-state-selected", active);
        }
        if (this._gridSwitch && this._gridSwitch.option("value") !== active)
            this._gridSwitch.option("value", active);
        if (this._gridSizeEditor && this._gridSizeEditor.option("value") !== this.shell.properties.gridSize)
            this._gridSizeEditor.option("value", this.shell.properties.gridSize);
    }

    updateMiniMapButton() {
        this.updateToggleButton("minimap-button", this.shell.miniMap?.isVisible(), "fa-map");
    }

}
