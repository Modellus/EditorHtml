DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

class NotebookEditor {
    constructor() {
        this.blocks = [];
        this.expressionControls = new Map();
        this.nextBlockId = 1;
        this.title = "";
        this.subtitle = "";
        this.author = "Author";
        this.lastModified = new Date();
        this.coverImageUrl = "";
        this.listInstance = null;
        this.sortableInstance = null;
        this._createTopToolbar();
        this._createBottomToolbar();
        this._createBlockList();
        this._initHeader();
    }

    _createTopToolbar() {
        $("#toolbar").dxToolbar({
            elementAttr: {
                class: "mdl-shape-toolbar"
            },
            onItemClick: () => {},
            items: [
                {
                    location: "before",
                    cssClass: "mdl-menu-button-item",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-bars",
                        hint: "",
                        elementAttr: {
                            id: "menu-button",
                            title: ""
                        },
                        onClick: () => this._menuController.show()
                    }
                },
                ...ModellusShapeToolbar.notebookItems(this)
            ]
        });
        this._menuController = new MenuController({
            type: "notebook",
            isReadOnly: false,
            canSave: false,
            exit: () => window.history.back()
        });
    }

    _createBottomToolbar() {
        this.independentStart = 0;
        this.independentEnd = 10;
        this.independentStep = 0.1;
        this.iterationCount = Math.round((this.independentEnd - this.independentStart) / this.independentStep);
        this.currentIteration = 1;
        this.isPlaying = false;

        $("#bottom-toolbar").dxToolbar({
            elementAttr: {
                class: "mdl-player-toolbar"
            },
            onItemClick: () => {},
            items: ModellusPlayerToolbar.createPlayerItems({
                onPlayPause: () => this._playPausePressed(),
                onStop: () => this._stopPressed(),
                onStepBackward: () => this._stepBackward(),
                onStepForward: () => this._stepForward(),
                onReplay: () => this._replayPressed(),
                sliderMinimum: 1,
                sliderMaximum: this.iterationCount || 1,
                sliderValue: 1,
                sliderWidth: 400,
                sliderTooltipFormatter: value => {
                    const currentValue = this.independentStart + (value - 1) * this.independentStep;
                    return currentValue.toFixed(2);
                },
                onSliderValueChanged: value => {
                    this.currentIteration = value;
                },
                itemsBeforeSlider: [
                    {
                        location: "center",
                        template: () => {
                            const container = $('<div>');
                            this._createStartDropDown(container);
                            return container;
                        }
                    }
                ],
                itemsAfterSlider: [
                    {
                        location: "center",
                        template: () => {
                            const container = $('<div>');
                            this._createEndDropDown(container);
                            return container;
                        }
                    }
                ]
            })
        });
    }

    _createStartDropDown(container) {
        const dropdownElement = $('<div id="startDropDown">');
        dropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const span = $('<span>').css({ fontFamily: "KaTeX_Main, serif", fontSize: "15px" });
                this._startLabel = span[0];
                this._updateStartLabel();
                element[0].appendChild(span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this._buildStartMenuContent(contentElement)
            }
        });
        dropdownElement.appendTo(container);
    }

    _buildStartMenuContent(contentElement) {
        const listItems = [
            {
                text: "Start",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.independentStart,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: event => this._setIndependentStart(event.value)
                    }).appendTo($container);
                }
            },
            {
                text: "Step",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.independentStep,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: event => this._setIndependentStep(event.value)
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

    _createEndDropDown(container) {
        const dropdownElement = $('<div id="endDropDown">');
        dropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const span = $('<span>').css({ fontFamily: "KaTeX_Main, serif", fontSize: "15px" });
                this._endLabel = span[0];
                this._updateEndLabel();
                element[0].appendChild(span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this._buildEndMenuContent(contentElement)
            }
        });
        dropdownElement.appendTo(container);
    }

    _buildEndMenuContent(contentElement) {
        const listItems = [
            {
                text: "End",
                buildControl: $container => {
                    $('<div>').dxNumberBox({
                        value: this.independentEnd,
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: event => this._setIndependentEnd(event.value)
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

    _setIndependentStart(value) {
        this.independentStart = value;
        this._updateIterationCount();
        this._updateStartLabel();
    }

    _setIndependentEnd(value) {
        this.independentEnd = value;
        this._updateIterationCount();
        this._updateEndLabel();
    }

    _setIndependentStep(value) {
        this.independentStep = value;
        this._updateIterationCount();
        this._updateStartLabel();
    }

    _updateIterationCount() {
        this.iterationCount = Math.max(1, Math.round((this.independentEnd - this.independentStart) / this.independentStep));
        this.currentIteration = 1;
        $("#playHeadSlider").dxSlider("instance").option("max", this.iterationCount);
        $("#playHeadSlider").dxSlider("instance").option("value", 1);
    }

    _updateStartLabel() {
        if (this._startLabel)
            this._startLabel.textContent = this.independentStart.toFixed(2);
    }

    _updateEndLabel() {
        if (this._endLabel)
            this._endLabel.textContent = this.independentEnd.toFixed(2);
    }

    _playPausePressed() {
        this.isPlaying = !this.isPlaying;
        const icon = this.isPlaying ? "fa-light fa-pause" : "fa-light fa-play";
        $("#playPauseButton").dxButton("instance").option("icon", icon);
        if (this.isPlaying)
            this._startPlayback();
        else
            this._stopPlayback();
    }

    _stopPressed() {
        this.isPlaying = false;
        $("#playPauseButton").dxButton("instance").option("icon", "fa-light fa-play");
        this._stopPlayback();
        this.currentIteration = 1;
        $("#playHeadSlider").dxSlider("instance").option("value", 1);
    }

    _stepBackward() {
        if (this.currentIteration > 1) {
            this.currentIteration--;
            $("#playHeadSlider").dxSlider("instance").option("value", this.currentIteration);
        }
    }

    _stepForward() {
        if (this.currentIteration < this.iterationCount) {
            this.currentIteration++;
            $("#playHeadSlider").dxSlider("instance").option("value", this.currentIteration);
        }
    }

    _replayPressed() {
        this._stopPressed();
        this._playPausePressed();
    }

    _startPlayback() {
        this._playInterval = setInterval(() => {
            if (this.currentIteration >= this.iterationCount) {
                this._stopPressed();
                return;
            }
            this.currentIteration++;
            $("#playHeadSlider").dxSlider("instance").option("value", this.currentIteration);
        }, 50);
    }

    _stopPlayback() {
        if (this._playInterval) {
            clearInterval(this._playInterval);
            this._playInterval = null;
        }
    }

    _createBlockList() {
        const container = document.getElementById("notebook-blocks");
        $(container).dxList({
            dataSource: this.blocks,
            keyExpr: "id",
            repaintChangesOnly: true,
            itemDragging: {
                allowReordering: true,
                handle: ".notebook-block-drag-handle",
                data: this.blocks,
                onDragStart: e => {
                    e.itemData = e.fromData[e.fromIndex];
                },
                onReorder: ({ fromIndex, toIndex, fromData, component }) => {
                    const item = fromData.splice(fromIndex, 1)[0];
                    fromData.splice(toIndex, 0, item);
                    component.reload();
                }
            },
            itemTemplate: (block, index, element) => {
                element[0].innerHTML = this._renderBlockHtml(block);
                this._attachSingleBlockEvents(element[0], block);
            }
        });
        this.listInstance = $(container).dxList("instance");
    }

    _initHeader() {
        const titleElement = document.getElementById("notebook-title");
        const subtitleElement = document.getElementById("notebook-subtitle");
        const authorElement = document.getElementById("notebook-author");
        const dateElement = document.getElementById("notebook-date");

        titleElement.addEventListener("input", () => {
            this.title = titleElement.textContent;
            this._updateLastModified();
        });

        subtitleElement.addEventListener("input", () => {
            this.subtitle = subtitleElement.textContent;
            this._updateLastModified();
        });

        authorElement.textContent = this.author;
        dateElement.textContent = this._formatDate(this.lastModified);

        document.getElementById("notebook-cover-image").addEventListener("click", () => {
            this._changeCoverImage();
        });
    }

    _changeCoverImage() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = event => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = readerEvent => {
                this.coverImageUrl = readerEvent.target.result;
                const coverElement = document.getElementById("notebook-cover-image");
                coverElement.style.backgroundImage = `url(${this.coverImageUrl})`;
                coverElement.style.background = `url(${this.coverImageUrl}) center/cover no-repeat`;
                this._updateLastModified();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    _updateLastModified() {
        this.lastModified = new Date();
        document.getElementById("notebook-date").textContent = this._formatDate(this.lastModified);
    }

    _formatDate(date) {
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    addBlock(type) {
        const block = {
            id: this.nextBlockId++,
            type: type,
            content: type === "expression" ? "\\displaylines{}" : "",
            borderColor: "#e8e8e8",
            backgroundColor: "transparent"
        };
        this.blocks.push(block);
        this._reloadBlockList();
        this._updateLastModified();
    }

    removeBlock(blockId) {
        this._disposeExpressionControl(blockId);
        this.blocks = this.blocks.filter(block => block.id !== blockId);
        this._reloadBlockList();
        this._updateLastModified();
    }

    _renderBlocks() {
        this._reloadBlockList();
    }

    _reloadBlockList() {
        this._disposeExpressionControls();
        this.listInstance.option("dataSource", this.blocks);
        this.listInstance.reload();
    }

    _disposeExpressionControl(blockId) {
        const expressionControl = this.expressionControls.get(blockId);
        if (!expressionControl)
            return;
        expressionControl.dispose();
        this.expressionControls.delete(blockId);
    }

    _disposeExpressionControls() {
        this.expressionControls.forEach(expressionControl => expressionControl.dispose());
        this.expressionControls.clear();
    }

    _initBlockColorButton(block, blockElement, buttonContainer) {
        const colorControl = new ColorControl();
        const borderColorPicker = colorControl.createEditor(block.borderColor || "#e8e8e8", value => {
            block.borderColor = value;
            blockElement.style.setProperty("--block-border-color", value);
            this._updateLastModified();
        });
        const backgroundColorPicker = colorControl.createEditor(block.backgroundColor || "transparent", value => {
            block.backgroundColor = value;
            blockElement.style.setProperty("--block-bg-color", value);
            this._updateLastModified();
        });
        const dragHandle = blockElement.querySelector(".notebook-block-drag-handle");
        const dropdownElement = $('<div class="notebook-block-color-selector">').appendTo(buttonContainer);
        dropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                element[0].innerHTML = `<i class="fa-light fa-grip-dots-vertical"></i>`;
            },
            onOpened: () => dragHandle.classList.add("is-open"),
            onClosed: () => dragHandle.classList.remove("is-open"),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-shape-overlay-popup notebook-block-color-menu" },
                width: "auto",
                contentTemplate: contentElement => {
                    const items = [
                        { text: "Background", buildControl: $p => $p.append(backgroundColorPicker) },
                        { text: "Border", buildControl: $p => $p.append(borderColorPicker) }
                    ];
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: items,
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                            data.buildControl($(el).find(".mdl-dropdown-list-control"));
                        }
                    });
                }
            }
        });
    }

    _renderBlockHtml(block) {
        const contentHtml = this._renderBlockContent(block);

        return `
            <div class="notebook-block block-type-${block.type}" data-block-id="${block.id}">
                <div class="notebook-block-drag-handle">
                    <div class="notebook-block-color-button"></div>
                </div>
                <div class="notebook-block-body">
                    <div class="notebook-block-content">${contentHtml}</div>
                </div>
            </div>
        `;
    }

    _renderBlockContent(block) {
        switch (block.type) {
            case "text":
                return `<div contenteditable="true" data-placeholder="Type something...">${block.content}</div>`;
            case "header":
                return `<div contenteditable="true" data-placeholder="Heading">${block.content}</div>`;
            case "expression":
                return `<div id="expression-block-${block.id}" class="notebook-expression-control"></div>`;
            case "chart":
                return `<div class="notebook-block-placeholder"><i class="fa-light fa-chart-line"></i><span>Chart</span></div>`;
            case "simulation":
                return `<div class="notebook-block-placeholder"><i class="fa-light fa-shapes"></i><span>Simulation</span></div>`;
            case "slider":
                return `<div class="notebook-block-placeholder" id="slider-block-${block.id}"><i class="fa-light fa-slider"></i><span>Slider</span></div>`;
            case "media":
                return `<div class="notebook-block-placeholder"><i class="fa-light fa-photo-film-music"></i><span>Media</span></div>`;
            default:
                return "";
        }
    }

    _attachSingleBlockEvents(element, block) {
        const blockElement = element.querySelector(".notebook-block");
        blockElement.style.setProperty("--block-border-color", block.borderColor || "#e8e8e8");
        blockElement.style.setProperty("--block-bg-color", block.backgroundColor || "transparent");

        const colorButtonContainer = blockElement.querySelector(".notebook-block-color-button");
        if (colorButtonContainer)
            this._initBlockColorButton(block, blockElement, colorButtonContainer);

        blockElement.addEventListener("click", () => {
            document.querySelectorAll(".notebook-block.selected").forEach(el => el.classList.remove("selected"));
            blockElement.classList.add("selected");
        });

        blockElement.addEventListener("keydown", event => {
            if (event.key === "Backspace" && blockElement.querySelector("[contenteditable]")?.textContent === "" && !blockElement.contains(document.activeElement))
                this.removeBlock(block.id);
        });

        if (block.type === "slider") {
            const sliderContainer = element.querySelector(`#slider-block-${block.id}`);
            if (sliderContainer)
                $(sliderContainer).dxSlider({
                    min: 0,
                    max: 100,
                    value: 50,
                    tooltip: { enabled: true, showMode: "always", position: "top" }
                });
        }

        if (block.type === "expression") {
            const expressionContainer = element.querySelector(`#expression-block-${block.id}`);
            if (expressionContainer) {
                const expressionControl = new ExpressionControl({
                    multiline: true,
                    useScrollView: true,
                    value: block.content || "\\displaylines{}",
                    onInput: () => {
                        block.content = expressionControl.getValue();
                        this._updateLastModified();
                    }
                });
                expressionControl.create(expressionContainer);
                expressionControl.syncHandwrittenStyle();
                this.expressionControls.set(block.id, expressionControl);
            }
        }

        const editable = blockElement.querySelector("[contenteditable]");
        if (editable)
            editable.addEventListener("input", () => {
                block.content = editable.textContent;
                this._updateLastModified();
            });
    }
}

const notebook = new NotebookEditor();
