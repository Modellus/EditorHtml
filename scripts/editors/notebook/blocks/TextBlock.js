var TextBlock;
if (typeof BlocksRegistry !== "undefined" && typeof TextShape !== "undefined") {
    TextBlock = class TextBlock extends TextShape {
        constructor(notebookEditor, block, hostElement) {
            super(TextBlock.createNotebookRuntime(notebookEditor, hostElement), null, block.id);
            this.notebookEditor = notebookEditor;
            this.block = block;
            this.contentElement = hostElement;
            this.blockElement = hostElement?.closest?.(".notebook-block") ?? null;
            this.board.selection.removeEditModeHighlight = () => this.exitEditMode();
            this.applyNotebookBlockProperties();
            this.htmlEditor.option("placeholder", "Type something...");
            this.htmlEditor.option("value", this.properties.text ?? "");
            this.draw();
            this.update();
        }

        static createNotebookRuntime(notebookEditor, hostElement) {
            const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
            return {
                hostElement: hostElement,
                svg: null,
                translations: shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US"),
                theme: new BaseTheme(),
                suppressNextFocusSelect: false,
                pointerLocked: false,
                selection: { deselect: () => {}, clearHover: () => {}, applyEditModeHighlight: () => {}, removeEditModeHighlight: () => {} },
                markDirty: () => notebookEditor?._updateLastModified?.(),
                createSvgElement: name => document.createElementNS("http://www.w3.org/2000/svg", name),
                createElement: name => document.createElement(name),
                getClientCenter: () => ({ x: 0, y: 0 }),
                isModelCreator: () => true,
                get calculator() { return notebookEditor?.calculator ?? null; }
            };
        }

        applyNotebookBlockProperties() {
            const defaultProperties = Utils.cloneProperties(this.properties);
            const blockHasOwnText = Object.prototype.hasOwnProperty.call(this.block, "text") && typeof this.block.text === "string";
            this.properties = this.block;
            for (const [propertyName, propertyValue] of Object.entries(defaultProperties)) {
                if (!Object.prototype.hasOwnProperty.call(this.properties, propertyName))
                    this.properties[propertyName] = propertyValue;
            }
            if (!blockHasOwnText)
                this.properties.text = typeof this.properties.content === "string" ? this.properties.content : "";
        }

        renderContentHtml() {
            return "";
        }

        createElement() {
            this.board.hostElement.replaceChildren();
            const element = this.createEditorElements($(this.board.hostElement));
            element.classList.add("notebook-text-control");
            element.style.height = "auto";
            this.$editorHost.css({ "flex": "", "min-height": "40px", "overflow": "visible" });
            this._editModeDoubleClickHandler = () => this.enterEditMode();
            element.addEventListener("dblclick", this._editModeDoubleClickHandler);
            return element;
        }

        onEditorValueChanged(value) {
            if (this.properties.text === value)
                return;
            this.properties.text = value;
            this.markChanged();
        }

        enterEditMode() {
            this.hideContextToolbar();
            return super.enterEditMode();
        }

        getEditorToolbarWidth() {
            const blockWidth = this.blockElement?.getBoundingClientRect()?.width;
            return Math.max(240, blockWidth || this.contentElement?.clientWidth || 400);
        }

        draw() {
            BaseShape.prototype.draw.call(this);
            if (this.$toolbarHost?.is(":visible"))
                this.positionEditorToolbar();
        }

        mount(contentElement, dragHandleElement) {
            this.contentElement = contentElement;
            this.dragHandleElement = dragHandleElement;
            this.blockElement = contentElement.closest(".notebook-block");
        }

        unmount() {
            document.removeEventListener("mousedown", this._onDocumentMouseDown);
            if (this.contextToolbar) {
                this.contextToolbar.remove();
                this.contextToolbar = null;
            }
            this.contextToolbarInstance = null;
            if (this.$formulaPopup) {
                this.$formulaPopup.dxPopup("instance").dispose();
                this.$formulaPopup.remove();
                this.$formulaPopup = null;
            }
            if (this.$toolbarHost) {
                this.$toolbarHost.remove();
                this.$toolbarHost = null;
            }
            if (this.htmlEditor) {
                this.htmlEditor.dispose();
                this.htmlEditor = null;
            }
            this.$editorHost = null;
            this.board.hostElement?.replaceChildren();
            this.contentElement = null;
            this.dragHandleElement = null;
            this.blockElement = null;
            this.container = null;
        }

        getScreenAnchorPoint() {
            if (!this.blockElement)
                return null;
            const rect = this.blockElement.getBoundingClientRect();
            return {
                centerX: rect.left + rect.width / 2,
                bottomY: rect.bottom
            };
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
            if (name === "text")
                this.htmlEditor?.option("value", value ?? "");
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
                type: "text",
                content: "",
                text: "",
                borderColor: "#e8e8e8",
                backgroundColor: "transparent"
            };
            for (const key of Object.keys(this.properties)) {
                if (key !== "id" && key !== "type")
                    delete this.properties[key];
            }
            Object.assign(this.properties, resetBlock);
            this.htmlEditor?.option("value", "");
            this.draw();
            this.update();
            this.markChanged();
        }
    };

    BlocksRegistry.register("text", {
        defaultContent: "",
        renderContentHtml: () => "",
        notebookShapeClass: TextBlock,
        getNotebookToolbarMixin: () => typeof TextShapeToolbarMixin !== "undefined" ? TextShapeToolbarMixin : null,
        createShape: (notebookEditor, block, hostElement) => new TextBlock(notebookEditor, block, hostElement)
    });
}
