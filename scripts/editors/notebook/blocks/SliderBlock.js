var SliderBlock;
if (typeof BlocksRegistry !== "undefined" && typeof SliderShape !== "undefined") {
    SliderBlock = class SliderBlock extends SliderShape {
        static WIDTH = 70;
        static MARGIN = 12;
        // Vertical space reserved below the track for the term label.
        static LABEL_RESERVE = 22;
        // Default height of the block content area when it has not been resized.
        static DEFAULT_HEIGHT = 224;
        // Smallest usable track height so the slider stays interactable when shrunk.
        static MIN_TRACK_HEIGHT = 40;

        constructor(notebookEditor, block, hostElement) {
            super(SliderBlock.createNotebookRuntime(notebookEditor, hostElement), null, block.id);
            this.notebookEditor = notebookEditor;
            this.block = block;
            // Note: do NOT set this.container here — SliderShape uses this.container
            // for the SVG border rect. Measuring uses this.contentElement instead.
            this.contentElement = hostElement;
            this.blockElement = hostElement?.closest?.(".notebook-block") ?? null;
            this.applyNotebookBlockProperties();
            this.draw();
            this.update();
            this._calculatorIterateHandler = () => this.onCalculatorIterate();
            this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
        }

        static createNotebookRuntime(notebookEditor, hostElement) {
            const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
            return {
                hostElement: hostElement,
                svg: null,
                pointerLocked: false,
                translations: shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US"),
                theme: new BaseTheme(),
                suppressNextFocusSelect: false,
                selection: { deselect: () => {}, clearHover: () => {}, applyEditModeHighlight: () => {}, removeEditModeHighlight: () => {} },
                markDirty: shape => {
                    shape?.draw?.();
                    notebookEditor?._updateLastModified?.();
                },
                createSvgElement: name => document.createElementNS("http://www.w3.org/2000/svg", name),
                createElement: name => document.createElement(name),
                getClientCenter: () => ({ x: 0, y: 0 }),
                isModelCreator: () => true,
                get calculator() { return notebookEditor?.calculator ?? null; }
            };
        }

        applyNotebookBlockProperties() {
            const defaultProperties = Utils.cloneProperties(this.properties);
            this.properties = this.block;
            for (const [propertyName, propertyValue] of Object.entries(defaultProperties)) {
                if (!Object.prototype.hasOwnProperty.call(this.properties, propertyName))
                    this.properties[propertyName] = propertyValue;
            }
            this.properties.y = SliderBlock.MARGIN;
            this.properties.width = SliderBlock.WIDTH;
            this.properties.rotation = 0;
        }

        renderContentHtml() {
            return "";
        }

        createElement() {
            this.board.hostElement.replaceChildren();
            const svg = this.board.createSvgElement("svg");
            svg.classList.add("notebook-slider-control");
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", SliderBlock.DEFAULT_HEIGHT);
            this.board.hostElement.appendChild(svg);
            this.board.svg = svg;
            const group = super.createElement();
            svg.appendChild(group);
            return group;
        }

        draw() {
            const contentHeight = this.contentElement?.clientHeight || this.board.hostElement?.clientHeight || SliderBlock.DEFAULT_HEIGHT;
            const hostWidth = this.contentElement?.clientWidth || this.board.hostElement?.clientWidth || 0;
            // Match the SVG viewport to the measured content height so the slider parts,
            // which are drawn in absolute pixels, stay aligned with the visible area.
            this.board.svg?.setAttribute("height", contentHeight);
            // Fit the slider track to the block, leaving room for the top margin and the term label below.
            this.properties.height = Math.max(SliderBlock.MIN_TRACK_HEIGHT, contentHeight - SliderBlock.MARGIN - SliderBlock.LABEL_RESERVE);
            this.properties.width = SliderBlock.WIDTH;
            this.properties.y = SliderBlock.MARGIN;
            this.properties.x = hostWidth > 0 ? Math.max(SliderBlock.MARGIN, (hostWidth - SliderBlock.WIDTH) / 2) : SliderBlock.MARGIN;
            SliderShape.prototype.draw.call(this);
        }

        mount(contentElement, dragHandleElement) {
            this.contentElement = contentElement;
            this.dragHandleElement = dragHandleElement;
            this.blockElement = contentElement.closest(".notebook-block");
            this.bindSliderPointer();
            this.draw();
        }

        bindSliderPointer() {
            if (!this.element)
                return;
            this.element.style.cursor = "ns-resize";
            this._onSliderPointerDown = event => this.onSliderPointerDown(event);
            this.element.addEventListener("pointerdown", this._onSliderPointerDown);
        }

        onSliderPointerDown(event) {
            if (!this.isInteractable() || this.isTermLocked("term"))
                return;
            event.preventDefault();
            event.stopPropagation();
            this._onSliderPointerMove = moveEvent => {
                this.setSplitterValue(this.getValueFromPointer(moveEvent));
                this.draw();
            };
            this._onSliderPointerUp = () => {
                window.removeEventListener("pointermove", this._onSliderPointerMove);
                window.removeEventListener("pointerup", this._onSliderPointerUp);
                if (!this.board.calculator?.isTerm(this.properties.term))
                    this.setPropertyCommand("value", this.properties.value);
            };
            this.setSplitterValue(this.getValueFromPointer(event));
            this.draw();
            window.addEventListener("pointermove", this._onSliderPointerMove);
            window.addEventListener("pointerup", this._onSliderPointerUp);
        }

        getValueFromPointer(event) {
            const svg = this.board.svg;
            if (!svg)
                return this.properties.value;
            const point = svg.createSVGPoint();
            point.x = event.clientX;
            point.y = event.clientY;
            const svgY = point.matrixTransform(svg.getScreenCTM().inverse()).y;
            return this.getValueFromBoardY(svgY);
        }

        onCalculatorIterate() {
            this.draw();
        }

        markChanged() {
            this.notebookEditor._updateLastModified();
        }

        duplicateBlock() {
            this.notebookEditor.insertBlockAfter(this.id, this.properties);
        }

        async copyBlockToClipboard() {
            const payload = JSON.stringify({ type: "notebook-block", block: Utils.cloneProperties(this.properties) });
            await navigator.clipboard.writeText(payload);
        }

        async pasteBlockFromClipboard() {
            let text = "";
            try {
                text = await navigator.clipboard.readText();
            } catch {
                return;
            }
            if (!text)
                return;
            let payload = null;
            try {
                payload = JSON.parse(text);
            } catch {
                return;
            }
            if (payload?.type !== "notebook-block" || !payload.block)
                return;
            this.notebookEditor.insertBlockAfter(this.id, payload.block);
        }

        setPropertyCommand(name, value) {
            this.notebookEditor.setBlockPropertyCommand(this.id, name, value);
        }

        applyProperty(name, value) {
            Utils.setProperty(name, value, this.properties);
            if (name === "backgroundColor")
                this.blockElement?.style.setProperty("--block-bg-color", value);
            if (name === "borderColor")
                this.blockElement?.style.setProperty("--block-border-color", value);
            this.draw();
            this.update();
            this.markChanged();
        }

        remove() {
            this.notebookEditor.removeBlockCommand(this.id);
        }

        duplicate() {
            this.duplicateBlock();
        }

        resetToDefaults() {
            const resetBlock = {
                id: this.id,
                type: "slider",
                content: "",
                borderColor: "#e8e8e8",
                backgroundColor: "transparent",
                term: this.board.calculator?.getDefaultTerm?.() ?? "",
                termDisplayMode: "visible",
                value: 0,
                autoScale: true,
                minimum: 0,
                maximum: 10,
                showMinimumValue: true,
                showMaximumValue: true,
                precision: 0
            };
            for (const key of Object.keys(this.properties)) {
                if (key !== "id" && key !== "type")
                    delete this.properties[key];
            }
            Object.assign(this.properties, resetBlock);
            this.draw();
            this.update();
            this.markChanged();
        }

        unmount() {
            if (this._calculatorIterateHandler) {
                this.notebookEditor.calculator?.off("iterate", this._calculatorIterateHandler);
                this._calculatorIterateHandler = null;
            }
            if (this._onSliderPointerMove) {
                window.removeEventListener("pointermove", this._onSliderPointerMove);
                this._onSliderPointerMove = null;
            }
            if (this._onSliderPointerUp) {
                window.removeEventListener("pointerup", this._onSliderPointerUp);
                this._onSliderPointerUp = null;
            }
            if (this.contextToolbar) {
                this.contextToolbar.remove();
                this.contextToolbar = null;
            }
            this.contextToolbarInstance = null;
            this.board.hostElement?.replaceChildren();
            this.board.svg = null;
            this.contentElement = null;
            this.dragHandleElement = null;
            this.blockElement = null;
            this.container = null;
        }
    };

    BlocksRegistry.register("slider", {
        defaultContent: "",
        resizable: true,
        renderContentHtml: () => "",
        notebookShapeClass: SliderBlock,
        getNotebookToolbarMixin: () => typeof SliderShapeToolbarMixin !== "undefined" ? SliderShapeToolbarMixin : null,
        createShape: (notebookEditor, block, hostElement) => new SliderBlock(notebookEditor, block, hostElement)
    });
}
