DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

class NotebookEditor {
    constructor() {
        this.blocks = [];
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
            items: [
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-arrow-left",
                        onClick: () => window.history.back()
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-heading",
                        hint: "Header",
                        onClick: () => this.addBlock("header")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-text",
                        hint: "Text",
                        onClick: () => this.addBlock("text")
                    }
                },
                {
                    location: "center",
                    template() {
                        return $(`<div class="toolbar-separator">|</div>`);
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-function",
                        hint: "Expression",
                        onClick: () => this.addBlock("expression")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-chart-line",
                        hint: "Chart",
                        onClick: () => this.addBlock("chart")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-shapes",
                        hint: "Simulation",
                        onClick: () => this.addBlock("simulation")
                    }
                },
                {
                    location: "center",
                    template() {
                        return $(`<div class="toolbar-separator">|</div>`);
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-slider",
                        hint: "Slider",
                        onClick: () => this.addBlock("slider")
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-photo-film-music",
                        hint: "Media",
                        onClick: () => this.addBlock("media")
                    }
                }
            ]
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
            items: [
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-play",
                        elementAttr: { id: "playPauseButton" },
                        onClick: () => this._playPausePressed()
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-stop",
                        elementAttr: { id: "stopButton" },
                        onClick: () => this._stopPressed()
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-backward-step",
                        elementAttr: { id: "stepBackwardButton" },
                        onClick: () => this._stepBackward()
                    }
                },
                {
                    location: "center",
                    widget: "dxSlider",
                    cssClass: "slider",
                    options: {
                        min: 1,
                        max: this.iterationCount || 1,
                        value: 1,
                        width: 400,
                        elementAttr: { id: "playHeadSlider" },
                        tooltip: {
                            enabled: true,
                            format: value => {
                                const currentValue = this.independentStart + (value - 1) * this.independentStep;
                                return currentValue.toFixed(2);
                            },
                            showMode: "always",
                            position: "top"
                        },
                        onValueChanged: e => {
                            this.currentIteration = e.value;
                        }
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-forward-step",
                        elementAttr: { id: "stepForwardButton" },
                        onClick: () => this._stepForward()
                    }
                },
                {
                    location: "center",
                    template() {
                        return $(`<div class="toolbar-separator">|</div>`);
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-repeat",
                        elementAttr: { id: "replayButton" },
                        onClick: () => this._replayPressed()
                    }
                }
            ]
        });
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
                showDragIcons: false,
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
            content: ""
        };
        this.blocks.push(block);
        this.listInstance.option("dataSource", this.blocks);
        this.listInstance.reload();
        this._updateLastModified();
    }

    removeBlock(blockId) {
        this.blocks = this.blocks.filter(block => block.id !== blockId);
        this.listInstance.option("dataSource", this.blocks);
        this.listInstance.reload();
        this._updateLastModified();
    }

    _renderBlocks() {
        this.listInstance.option("dataSource", this.blocks);
        this.listInstance.reload();
    }

    _renderBlockHtml(block) {
        const typeLabels = {
            text: "Text",
            header: "Header",
            expression: "Expression",
            chart: "Chart",
            simulation: "Simulation",
            slider: "Slider",
            media: "Media"
        };

        const typeIcons = {
            text: "fa-light fa-text",
            header: "fa-light fa-heading",
            expression: "fa-light fa-function",
            chart: "fa-light fa-chart-line",
            simulation: "fa-light fa-shapes",
            slider: "fa-light fa-slider",
            media: "fa-light fa-photo-film-music"
        };

        const contentHtml = this._renderBlockContent(block);

        return `
            <div class="notebook-block block-type-${block.type}" data-block-id="${block.id}">
                <div class="notebook-block-drag-handle">
                    <i class="fa-light fa-grip-dots-vertical"></i>
                </div>
                <div class="notebook-block-body">
                    <div class="notebook-block-type-label">
                        <i class="${typeIcons[block.type]}"></i> ${typeLabels[block.type]}
                    </div>
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
                return `<div contenteditable="true" data-placeholder="Enter an expression...">${block.content}</div>`;
            case "chart":
                return `<i class="fa-light fa-chart-line" style="font-size: 32px"></i><span style="margin-left: 12px">Chart block</span>`;
            case "simulation":
                return `<i class="fa-light fa-shapes" style="font-size: 32px"></i><span style="margin-left: 12px">Simulation block</span>`;
            case "slider":
                return `<div id="slider-block-${block.id}"></div>`;
            case "media":
                return `<i class="fa-light fa-photo-film-music" style="font-size: 32px"></i><span style="margin-left: 12px">Media block</span>`;
            default:
                return "";
        }
    }

    _attachSingleBlockEvents(element, block) {
        const blockElement = element.querySelector(".notebook-block");

        blockElement.addEventListener("click", () => {
            document.querySelectorAll(".notebook-block.selected").forEach(el => el.classList.remove("selected"));
            blockElement.classList.add("selected");
        });

        blockElement.addEventListener("keydown", event => {
            if (event.key === "Backspace" && blockElement.querySelector("[contenteditable]")?.textContent === "")
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

        const editable = blockElement.querySelector("[contenteditable]");
        if (editable)
            editable.addEventListener("input", () => {
                block.content = editable.textContent;
                this._updateLastModified();
            });
    }
}

const notebook = new NotebookEditor();
