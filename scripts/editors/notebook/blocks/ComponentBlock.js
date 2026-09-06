// An object built from blocks, standing in a notebook block instead of on the board. It is the same
// `ComponentShape` the board hosts — the same definition, the same compiler, the same drawing and
// the same interactions — given a runtime of its own: the notebook block is its canvas, its box is
// the block's own, and what the reader edits is written into the block rather than into a shape on a
// board. The measuring instruments are what it carries; anything else the editor ships would stand
// here the same way.
var ComponentBlock;
if (typeof BlocksRegistry !== "undefined" && typeof ComponentShape !== "undefined") {
    ComponentBlock = class ComponentBlock extends ComponentShape {
        constructor(notebookEditor, block, hostElement, componentType) {
            super(ComponentBlock.createNotebookRuntime(notebookEditor, hostElement), null, block.id);
            this.notebookEditor = notebookEditor;
            this.block = block;
            this.componentType = componentType;
            this.container = hostElement;
            this.contentElement = hostElement;
            this.blockElement = hostElement?.closest?.(".notebook-block") ?? null;
            this.board.shape = this;
            this.applyNotebookBlockProperties();
            this.draw();
            this.update();
            this._calculatorIterateHandler = () => this.onCalculatorIterate();
            this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
        }

        // The board a notebook block stands on: everything a shape asks of one, answered by the
        // block. The pointer is read against the block's own drawing, which is what lets an object
        // that follows the pointer follow it here too.
        static createNotebookRuntime(notebookEditor, hostElement) {
            const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
            const runtime = {
                hostElement: hostElement,
                svg: null,
                translations: shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US"),
                theme: new BaseTheme(),
                suppressNextFocusSelect: false,
                pointerLocked: false,
                selection: { deselect: () => {}, clearHover: () => {}, applyEditModeHighlight: () => {}, removeEditModeHighlight: () => {} },
                // On the board this is what asks for the next drawing, and it is asked for by
                // everything the reader does to the object — following the pointer included. It is
                // not an edit: hovering redraws and leaves the page alone.
                markDirty: () => runtime.shape?.redraw(),
                createSvgElement: name => document.createElementNS("http://www.w3.org/2000/svg", name),
                createElement: name => document.createElement(name),
                getClientCenter: () => ({ x: 0, y: 0 }),
                isModelCreator: () => true,
                getMouseToSvgPoint: event => {
                    if (!runtime.svg)
                        return { x: 0, y: 0 };
                    const point = runtime.svg.createSVGPoint();
                    point.x = event.clientX;
                    point.y = event.clientY;
                    return point.matrixTransform(runtime.svg.getScreenCTM().inverse());
                },
                get calculator() { return notebookEditor?.calculator ?? null; }
            };
            return runtime;
        }

        // The block is the shape's properties, so everything the reader sets is written where the
        // notebook keeps it and saved with the page. A block that has never carried a definition is
        // given the one its type stands for.
        applyNotebookBlockProperties() {
            const defaultProperties = Utils.cloneProperties(this.properties);
            this.properties = this.block;
            for (const [propertyName, propertyValue] of Object.entries(defaultProperties)) {
                if (!Object.prototype.hasOwnProperty.call(this.properties, propertyName))
                    this.properties[propertyName] = propertyValue;
            }
            // A block that is not yet the object its type names is made into it, under the name that
            // object goes by rather than under whatever the shape was called before it was told.
            if (BlockObjects.getComponentType(this.properties.definition) !== this.componentType)
                Object.assign(this.properties, ComponentShape.createInstanceProperties(this.componentType));
            this.properties.x = 0;
            this.properties.y = 0;
            this.properties.rotation = 0;
        }

        renderContentHtml() {
            return "";
        }

        createElement() {
            this.board.hostElement.replaceChildren();
            const drawing = this.board.createSvgElement("svg");
            drawing.classList.add("notebook-component-drawing");
            drawing.setAttribute("width", "100%");
            drawing.setAttribute("height", "100%");
            this.board.hostElement.appendChild(drawing);
            this.board.svg = drawing;
            const element = super.createElement();
            drawing.appendChild(element);
            return element;
        }

        // The box the object is drawn in is the block's, so it is measured before every drawing:
        // a block the reader has stretched draws a longer ruler rather than a scaled picture of one.
        draw() {
            const size = ComponentShape.getDefaultSize(this.componentType);
            this.properties.width = Math.max(40, this.container?.clientWidth || size.width);
            this.properties.height = Math.max(24, this.container?.clientHeight || size.height);
            super.draw();
        }

        mount(contentElement, dragHandleElement) {
            this.contentElement = contentElement;
            this.dragHandleElement = dragHandleElement;
            this.blockElement = contentElement.closest(".notebook-block");
            this.container = contentElement;
        }

        unmount() {
            if (this._calculatorIterateHandler) {
                this.notebookEditor.calculator?.off("iterate", this._calculatorIterateHandler);
                this._calculatorIterateHandler = null;
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

        // Drawing is what answers a redraw, and a redraw asked for while one is being written would
        // be answered by the drawing it is already writing.
        redraw() {
            if (this._redrawing)
                return;
            this._redrawing = true;
            try {
                this.draw();
            } finally {
                this._redrawing = false;
            }
        }

        onCalculatorIterate() {
            this.redraw();
        }

        markChanged() {
            this.notebookEditor._updateLastModified();
        }

        duplicateBlock() {
            this.notebookEditor.insertBlockAfter(this.id, this.properties);
        }

        getClipboardRepresentations() {
            return [ClipboardService.blockRepresentation(Utils.cloneProperties(this.properties))];
        }

        async copyBlockToClipboard() {
            await ClipboardService.write(this.getClipboardRepresentations());
        }

        async pasteBlockFromClipboard() {
            const block = await ClipboardService.readNotebookBlock();
            if (block)
                this.notebookEditor.insertBlockAfter(this.id, block);
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
            const kept = { id: this.id, type: this.block.type, content: "", borderColor: "#e8e8e8", backgroundColor: "transparent" };
            for (const key of Object.keys(this.properties)) {
                if (key !== "id" && key !== "type")
                    delete this.properties[key];
            }
            Object.assign(this.properties, kept, ComponentShape.createInstanceProperties(this.componentType));
            this.properties.x = 0;
            this.properties.y = 0;
            this.properties.rotation = 0;
            this.draw();
            this.update();
            this.markChanged();
        }
    };

    // The measuring instruments the notebook offers, each the object of that name. A block type is
    // the object it draws, so nothing here knows what a ruler is.
    for (const [componentType, contentHeight] of [["ruler", 96], ["protractor", 220]]) {
        BlocksRegistry.register(componentType, {
            defaultContent: "",
            resizable: true,
            defaultProperties: { contentHeight: contentHeight },
            renderContentHtml: () => "",
            notebookShapeClass: ComponentBlock,
            getNotebookToolbarMixin: () => typeof ComponentShapeToolbarMixin !== "undefined" ? ComponentShapeToolbarMixin : null,
            createShape: (notebookEditor, block, hostElement) => new ComponentBlock(notebookEditor, block, hostElement, componentType)
        });
    }
}
