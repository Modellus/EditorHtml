var TableBlock;
if (typeof BlocksRegistry !== "undefined" && typeof DataTableShape !== "undefined") {
    TableBlock = class TableBlock extends DataTableShape {
        constructor(notebookEditor, block, hostElement) {
            super(TableBlock.createNotebookRuntime(notebookEditor, hostElement), null, block.id);
            this.notebookEditor = notebookEditor;
            this.block = block;
            this.container = hostElement;
            this.contentElement = hostElement;
            this.blockElement = hostElement?.closest?.(".notebook-block") ?? null;
            this.applyNotebookBlockProperties();
            this.draw();
            this.update();
            this._calculatorIterateHandler = () => this.onCalculatorIterate();
            this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
        }

        setDefaults() {
            super.setDefaults();
            // Unlike the board data table (which starts empty), a notebook table block defaults to
            // showing the model's iterations, matching its long-standing behavior.
            const defaultTerm = this.board.calculator.getDefaultTerm();
            this.properties.columns = [
                { term: this.board.calculator.properties.independent.name, case: 1, color: "transparent", valueDisplayMode: "bars" },
                { term: defaultTerm, case: 1, color: "transparent", valueDisplayMode: "bars" }
            ];
        }

        // The notebook table shows iterations by default, so it keeps the Row Step control that the
        // board data table drops.
        populateShapeColorMenuSections(sections) {
            super.populateShapeColorMenuSections(sections);
            sections[0].items.push(this.createRowStepMenuItem());
        }

        static createNotebookRuntime(notebookEditor, hostElement) {
            const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
            const translations = shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US");
            const theme = new BaseTheme();
            const parseCsv = text => {
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                const names = lines[0].split(",").map(name => name.trim());
                const values = [];
                for (let i = 1; i < lines.length; i++)
                    values.push(lines[i].split(",").map(cell => parseFloat(cell.trim())));
                return { names, values };
            };
            return {
                hostElement: hostElement,
                svg: null,
                translations: translations,
                theme: theme,
                suppressNextFocusSelect: false,
                pointerLocked: false,
                selection: { deselect: () => {}, clearHover: () => {}, applyEditModeHighlight: () => {}, removeEditModeHighlight: () => {}, selectedShape: null },
                markDirty: () => notebookEditor?._updateLastModified?.(),
                createSvgElement: name => document.createElementNS("http://www.w3.org/2000/svg", name),
                createElement: name => document.createElement(name),
                getClientCenter: () => ({ x: 0, y: 0 }),
                isModelCreator: () => true,
                resetShapeValues: () => {
                    notebookEditor?.shapeInstances?.forEach(shape => shape.resetValues?.());
                    notebookEditor?.calculator?.emit("iterate", { calculator: notebookEditor.calculator });
                },
                shell: {
                    parseCsv: parseCsv,
                    importDataFromFile: async () => {
                        const [fileHandle] = await window.showOpenFilePicker({
                            types: [{ description: "CSV Files", accept: { "text/csv": [".csv"] } }]
                        });
                        const file = await fileHandle.getFile();
                        const text = await file.text();
                        return parseCsv(text);
                    },
                    importDataFromUrl: async () => {
                        const url = prompt(translations.get("Enter CSV URL"));
                        if (!url)
                            return null;
                        const response = await fetch(url);
                        const text = await response.text();
                        return parseCsv(text);
                    },
                    reset: () => notebookEditor?._reparseExpressions?.(),
                    get modelsApiClient() { return notebookEditor?.modelsApiClient ?? null; }
                },
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
        }

        renderContentHtml() {
            return "";
        }

        createElement() {
            this.board.hostElement.replaceChildren();
            const element = this.board.createSvgElement("svg");
            element.classList.add("notebook-table-control");
            element.setAttribute("width", "100%");
            element.setAttribute("height", "100%");
            this.board.hostElement.appendChild(element);
            this.board.svg = element;
            this.container = this.board.hostElement;
            this.normalizeColumns();
            this._activeColumns = this.getSelectedColumns();
            this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
            this._appliedControlColumnsKey = this.getControlColumnsStateKey(this.buildControlColumns(this._activeColumns));
            this._appliedStyleKey = "";
            this.table = new TableControl(element, this.getTableControlOptions(this._activeColumns));
            this.initializeCellsContextToolbar();
            return element;
        }

        draw() {
            this._notebookRenderWidth = Math.max(240, this.container?.clientWidth || 720);
            this._notebookRenderHeight = Math.max(160, this.container?.clientHeight || 240);
            if (this.table)
                this.table.setSize(this._notebookRenderWidth, this._notebookRenderHeight);
            BaseShape.prototype.draw.call(this);
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
            if (this.cellsContextToolbar) {
                this.cellsContextToolbar.remove();
                this.cellsContextToolbar = null;
            }
            this.cellsContextToolbarInstance = null;
            this.table?.dispose();
            this.table = null;
            this.board.hostElement?.replaceChildren();
            this.board.svg = null;
            this.contentElement = null;
            this.dragHandleElement = null;
            this.blockElement = null;
            this.container = null;
        }

        onCalculatorIterate() {
            this.refreshTableRows();
            this.updateFocus();
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

        onTableFocusedCellsChanged(payload) {
            this._focusedCellsPayload = payload ?? null;
            this.refreshFocusedCellsToolbarControl();
            if (payload?.hasFocusedCells === true) {
                this.hideContextToolbar();
                this.showCellsContextToolbar();
                return;
            }
            this.hideCellsContextToolbar();
        }

        setExternalDataColumns(columns) {
            this.setPropertyCommand("columns", columns);
            this.setPropertyCommand("columnWidths", []);
        }

        applyRegressionColumnUpdate(columns) {
            this.setPropertyCommand("columns", columns);
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
            const independentName = this.board.calculator?.properties?.independent?.name ?? "t";
            const defaultTerm = this.board.calculator?.getDefaultTerm?.() ?? "";
            const resetBlock = {
                id: this.id,
                type: "table",
                content: "",
                borderColor: "#e8e8e8",
                backgroundColor: "transparent",
                columnWidths: [],
                headerBackgroundColor: "#f7f7f7",
                iterationSkip: 0,
                externalData: null,
                originalExternalData: null,
                columns: [
                    { term: independentName, case: 1, color: "transparent", valueDisplayMode: "bars" },
                    { term: defaultTerm, case: 1, color: "transparent", valueDisplayMode: "bars" }
                ]
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
    };

    BlocksRegistry.register("table", {
        defaultContent: "",
        resizable: true,
        renderContentHtml: () => "",
        notebookShapeClass: TableBlock,
        getNotebookToolbarMixin: () => typeof DataTableShapeToolbarMixin !== "undefined" ? DataTableShapeToolbarMixin : null,
        createShape: (notebookEditor, block, hostElement) => new TableBlock(notebookEditor, block, hostElement)
    });
}
