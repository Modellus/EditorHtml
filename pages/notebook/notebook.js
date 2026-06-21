DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

class Notebook extends Workspace {
    constructor() {
        super(null);
        this._ownSession = null;
        this.blocks = [];
        this.shapeInstances = new Map();
        this.nextBlockId = 1;
        this.title = "";
        this.subtitle = "";
        this.author = "Author";
        this.lastModified = new Date();
        this.coverImageUrl = "";
        this.listInstance = null;
        this.sortableInstance = null;
        this.bindShapeToolbars();
        this._createTopToolbar();
        this._createBottomToolbar();
        this.setWorkspaceSurfaceAdapter({
            refresh: () => {},
            forceRefresh: () => this._reloadBlockList()
        });
        this._createBlockList();
        this._initHeader();
        this._bindCalculatorEvents();
        this._reparseExpressions();
        this._initializeShapeInteractionController();
    }

    get session() {
        if (window.shell)
            return window.shell.session;
        if (window.parent && window.parent !== window && window.parent.shell)
            return window.parent.shell.session;
        if (window.opener?.shell)
            return window.opener.shell.session;
        if (!this._ownSession)
            this._ownSession = new ModelSession(null);
        return this._ownSession;
    }

    get calculator() {
        return this.session?.calculator ?? null;
    }

    createTranslatedTooltip(event, key, width, canShow) {
        const boardEditor = window.shell ?? window.parent?.shell ?? window.opener?.shell ?? null;
        if (boardEditor?.createTranslatedTooltip)
            return boardEditor.createTranslatedTooltip(event, key, width, canShow);
        if (!this.translations)
            this.translations = new BaseTranslations(navigator.language || "en-US");
        return Utils.createTranslatedTooltip(event, key, this.translations, width, canShow);
    }

    getIndependentStart() {
        return Number(this.calculator?.properties?.independent?.start ?? 0);
    }

    getIndependentEnd() {
        return Number(this.calculator?.properties?.independent?.end ?? 10);
    }

    getIndependentStep() {
        return Number(this.calculator?.properties?.independent?.step ?? 0.1);
    }

    getIndependentName() {
        return String(this.calculator?.properties?.independent?.name ?? "t");
    }

    getIterationCount() {
        if (!this.calculator)
            return 1;
        return Math.max(1, this.calculator.getFinalIteration());
    }

    _bindCalculatorEvents() {
        this.bindWorkspaceIterate(() => this._onCalculatorIterate());
    }

    bindShapeToolbars() {
        if (window.__shapeToolbarBindingsApplied)
            return;
        Object.assign(NotebookShape.prototype, ShapeContextToolbarMixin, ShapeToolbarPresentationMixin, BaseShapeToolbarMixin);
        NotebookShape.prototype.createToolbar = function() { return BaseShapeToolbarMixin.createToolbar.call(this); };
        const toolbarAdapter = {
            getBaseToolbarItems: shape => NotebookShape.prototype.createToolbar.call(shape),
            getScreenAnchorPoint: shape => {
                if (!shape.blockElement)
                    return null;
                const rect = shape.blockElement.getBoundingClientRect();
                return {
                    centerX: rect.left + rect.width / 2,
                    bottomY: rect.bottom
                };
            },
            bringToFront: shape => shape.notebookEditor.moveBlock(shape.id, shape.notebookEditor.blocks.length - 1),
            bringForward: shape => shape.notebookEditor.moveBlock(shape.id, shape.notebookEditor.getBlockIndex(shape.id) + 1),
            sendBackward: shape => shape.notebookEditor.moveBlock(shape.id, shape.notebookEditor.getBlockIndex(shape.id) - 1),
            sendToBack: shape => shape.notebookEditor.moveBlock(shape.id, 0),
            copyToClipboard: shape => shape.copyBlockToClipboard(),
            pasteFromClipboard: shape => shape.pasteBlockFromClipboard(),
            getCopySubMenuItems: () => []
        };
        const chartDescriptor = NotebookShapesFactory.getDescriptor("chart");
        const expressionDescriptor = NotebookShapesFactory.getDescriptor("expression");
        const resolveNotebookToolbarMixin = descriptor => {
            if (typeof descriptor?.getNotebookToolbarMixin === "function")
                return descriptor.getNotebookToolbarMixin();
            return descriptor?.notebookToolbarMixin ?? null;
        };
        const bindings = [
            [chartDescriptor.notebookShapeClass, resolveNotebookToolbarMixin(chartDescriptor)],
            [expressionDescriptor.notebookShapeClass, resolveNotebookToolbarMixin(expressionDescriptor)],
            [SliderNotebookShape, SliderShapeToolbarMixin],
            [GaugeNotebookShape, GaugeShapeToolbarMixin],
            [ValueNotebookShape, ValueShapeToolbarMixin],
            [MediaNotebookShape, MediaShapeToolbarMixin],
            [TableNotebookShape, TableShapeToolbarMixin],
            [ReferentialNotebookShape, ReferentialShapeToolbarMixin],
            [QuestionNotebookShape, QuestionShapeToolbarMixin],
            [RulerNotebookShape, RulerShapeToolbarMixin],
            [ProtractorNotebookShape, ProtractorShapeToolbarMixin],
            [TextNotebookShape, TextShapeToolbarMixin]
        ];
        for (const [shapeClass, toolbarMixin] of bindings) {
            if (!shapeClass || !toolbarMixin)
                continue;
            shapeClass.prototype.toolbarAdapter = toolbarAdapter;
            Object.assign(shapeClass.prototype, toolbarMixin);
        }
        window.__shapeToolbarBindingsApplied = true;
    }

    _initializeShapeInteractionController() {
        this.shapeInteractionController = new ShapeInteractionController({
            blockSelector: ".notebook-block",
            selectedClassName: "selected",
            clearSelectedItems: () => this.clearBlockSelection(),
            hideAllContextToolbars: () => this.hideAllShapeContextToolbars(),
            removeItem: blockId => this.removeBlock(blockId)
        });
        this.shapeInteractionController.bindGlobalDismissal();
    }

    clearBlockSelection() {
        document.querySelectorAll(".notebook-block.selected").forEach(blockElement => {
            blockElement.classList.remove("selected");
            blockElement.setAttribute("aria-selected", "false");
        });
    }

    hideAllShapeContextToolbars() {
        this.shapeInstances.forEach(shape => shape.hideContextToolbar?.());
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
        this.isPlaying = false;

        $("#bottom-toolbar").dxToolbar({
            elementAttr: {
                class: "mdl-player-toolbar"
            },
            onItemClick: () => {},
            items: [
                {
                    location: "center",
                    template: () => {
                        const container = $('<div>');
                        this._createIndependentDropDown(container);
                        return container;
                    }
                },
                {
                    location: "center",
                    template: () => $("<div class='toolbar-separator'>|</div>")
                },
                ...ModellusPlayerToolbar.createPlayerItems({
                    onPlayPause: () => this._playPausePressed(),
                    onStop: () => this._stopPressed(),
                    onStepBackward: () => this._stepBackward(),
                    onStepForward: () => this._stepForward(),
                    onReplay: () => this._replayPressed(),
                    ...ModellusPlayerToolbar.createPlayerTooltipInitializers((event, key, width) => this.createTranslatedTooltip(event, key, width)),
                    sliderMinimum: 1,
                    sliderMaximum: this.getIterationCount(),
                    sliderValue: 1,
                    sliderWidth: 400,
                    sliderTooltipFormatter: value => {
                        const currentValue = this.getIndependentStart() + (value - 1) * this.getIndependentStep();
                        return currentValue.toFixed(2);
                    },
                    onSliderValueChanged: value => {
                        this.calculatorSetIteration(value);
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
            ]
        });
        this.setPlayerViewAdapter({
            setPlayPauseIcon: icon => {
                const buttonInstance = $("#playPauseButton").dxButton("instance");
                if (buttonInstance)
                    buttonInstance.option("icon", icon);
            },
            setSliderValue: value => {
                const sliderInstance = $("#playHeadSlider").dxSlider("instance");
                if (sliderInstance)
                    sliderInstance.option("value", value);
            },
            setSliderRange: maximum => {
                const sliderInstance = $("#playHeadSlider").dxSlider("instance");
                if (sliderInstance)
                    sliderInstance.option("max", maximum);
            }
        });
    }

    _createIndependentDropDown(container) {
        const dropdownElement = $('<div id="independentDropDown">');
        dropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => {
                const span = $('<span>').css({
                    fontFamily: "KaTeX_Math, serif",
                    fontStyle: "italic",
                    fontSize: "16px"
                });
                this._independentNameLabel = span[0];
                this._updateIndependentNameLabel();
                element[0].appendChild(span[0]);
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-independent-dropdown" },
                width: "auto",
                contentTemplate: contentElement => this._buildIndependentMenuContent(contentElement)
            }
        });
        dropdownElement.appendTo(container);
    }

    _buildIndependentMenuContent(contentElement) {
        const listItems = [
            {
                text: "Independent",
                buildControl: $container => {
                    $('<div>').dxTextBox({
                        value: this.getIndependentName(),
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" },
                        onValueChanged: event => {
                            this.setIndependentName(event.value);
                            this._updateIndependentNameLabel();
                            this._reparseExpressions();
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
                        value: this.getIndependentStart(),
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
                        value: this.getIndependentStep(),
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
                        value: this.getIndependentEnd(),
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
        this.setIndependentStart(value);
        this._reparseExpressions();
        this._updateStartLabel();
    }

    _setIndependentEnd(value) {
        this.setIndependentEnd(value);
        this._reparseExpressions();
        this._updateEndLabel();
    }

    _setIndependentStep(value) {
        this.setIndependentStep(value);
        this._reparseExpressions();
        this._updateStartLabel();
    }

    _reparseExpressions() {
        if (!this.calculator)
            return;
        this.calculator.reset();
        this.calculator.setProperties({
            precision: this.calculator.properties.precision ?? 2,
            angleUnit: this.calculator.properties.angleUnit ?? "radians",
            independent: {
                name: this.calculator.properties?.independent?.name ?? "t",
                start: this.getIndependentStart(),
                end: this.getIndependentEnd(),
                step: this.getIndependentStep(),
                noLimit: false
            },
            iterationTerm: this.calculator.properties.iterationTerm ?? "n",
            casesCount: this.calculator.properties.casesCount ?? 1,
            initialValuesByCase: this.calculator.properties.initialValuesByCase ?? {}
        });
        for (const block of this.blocks) {
            if (block.type === "expression" && block.content)
                this.calculator.parse(block.content);
        }
        this.updatePlayerSliderRange(this.getIterationCount());
        this.updatePlayerSliderValue(1);
        this._updateIndependentNameLabel();
        this.reparseAndCalculateWorkspace();
    }

    _onCalculatorIterate() {
        if (!this.calculator)
            return;
        this.syncPlayerIterationFromCalculator();
        this.shapeInstances.forEach(shape => shape.onCalculatorIterate?.());
    }

    _updateStartLabel() {
        if (this._startLabel)
            this._startLabel.textContent = this.getIndependentStart().toFixed(2);
    }

    _updateEndLabel() {
        if (this._endLabel)
            this._endLabel.textContent = this.getIndependentEnd().toFixed(2);
    }

    _updateIndependentNameLabel() {
        if (this._independentNameLabel)
            this._independentNameLabel.textContent = this.getIndependentName();
    }

    _playPausePressed() {
        const isPlaying = this.toggleCalculatorPlayback();
        this.setPlayerUiState(isPlaying);
    }

    _stopPressed() {
        this.stopPlayerUiState();
        this.calculatorPause();
        this._reparseExpressions();
    }

    _stepBackward() {
        this.calculatorStepBackward();
    }

    _stepForward() {
        this.calculatorStepForward();
    }

    _replayPressed() {
        this.startPlayerUiState();
        this._reparseExpressions();
        this.replayCalculatorPlayback();
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
        const block = NotebookShapesFactory.createDefaultBlock(type, this.nextBlockId++);
        this.blocks.push(block);
        this._reloadBlockList();
        this._updateLastModified();
    }

    getBlockIndex(blockId) {
        return this.blocks.findIndex(block => block.id === blockId);
    }

    moveBlock(blockId, targetIndex) {
        const currentIndex = this.getBlockIndex(blockId);
        if (currentIndex < 0)
            return;
        const normalizedTargetIndex = Math.max(0, Math.min(targetIndex, this.blocks.length - 1));
        if (normalizedTargetIndex === currentIndex)
            return;
        const [block] = this.blocks.splice(currentIndex, 1);
        this.blocks.splice(normalizedTargetIndex, 0, block);
        this._reloadBlockList();
        this._updateLastModified();
    }

    insertBlockAfter(blockId, blockData) {
        const blockIndex = this.getBlockIndex(blockId);
        const insertedBlock = Utils.cloneProperties(blockData);
        insertedBlock.id = this.nextBlockId++;
        const insertionIndex = blockIndex < 0 ? this.blocks.length : blockIndex + 1;
        this.blocks.splice(insertionIndex, 0, insertedBlock);
        this._reloadBlockList();
        this._updateLastModified();
    }

    removeBlock(blockId) {
        this._disposeShapeInstance(blockId);
        this.blocks = this.blocks.filter(block => block.id !== blockId);
        this.shapeInteractionController?.notifyItemRemoved(blockId);
        this._reloadBlockList();
        this._updateLastModified();
    }

    _renderBlocks() {
        this._reloadBlockList();
    }

    _reloadBlockList() {
        this._disposeStaleShapeInstances();
        this.listInstance.option("dataSource", this.blocks);
        this.listInstance.reload();
    }

    _disposeShapeInstance(blockId) {
        const shapeInstance = this.shapeInstances.get(blockId);
        if (!shapeInstance)
            return;
        shapeInstance.unmount();
        this.shapeInstances.delete(blockId);
    }

    _disposeShapeInstances() {
        this.shapeInstances.forEach(shapeInstance => shapeInstance.unmount());
        this.shapeInstances.clear();
    }

    _disposeStaleShapeInstances() {
        const activeBlockIds = new Set(this.blocks.map(block => block.id));
        this.shapeInstances.forEach((shapeInstance, blockId) => {
            if (activeBlockIds.has(blockId))
                return;
            shapeInstance.unmount();
            this.shapeInstances.delete(blockId);
        });
    }

    _initBlockGripButton(buttonContainer, shape) {
        const dragHandle = shape.blockElement.querySelector(".notebook-block-drag-handle");
        const gripButton = $('<button type="button" class="notebook-block-grip-button"><i class="fa-light fa-grip-dots-vertical"></i></button>').appendTo(buttonContainer);
        gripButton.on("click", () => dragHandle.classList.toggle("is-open"));
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
        return NotebookShapesFactory.renderContentHtml(this, block);
    }

    _attachSingleBlockEvents(element, block) {
        const blockElement = element.querySelector(".notebook-block");
        blockElement.style.setProperty("--block-border-color", block.borderColor || "#e8e8e8");
        blockElement.style.setProperty("--block-bg-color", block.backgroundColor || "transparent");

        const contentElement = blockElement.querySelector(".notebook-block-content");
        const dragHandleElement = blockElement.querySelector(".notebook-block-drag-handle");
        const shape = NotebookShapesFactory.createShape(this, block, contentElement);
        const previousShape = this.shapeInstances.get(block.id);
        if (previousShape)
            previousShape.unmount();
        this.shapeInstances.set(block.id, shape);

        if (contentElement)
            shape.mount(contentElement, dragHandleElement);

        const colorButtonContainer = blockElement.querySelector(".notebook-block-color-button");
        if (colorButtonContainer)
            this._initBlockGripButton(colorButtonContainer, shape);
        this.shapeInteractionController.attachItemInteractions(blockElement, block, shape);
    }
}

const notebook = new Notebook();
