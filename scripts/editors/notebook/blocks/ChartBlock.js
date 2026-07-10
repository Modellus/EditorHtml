var ChartBlock;
if (typeof BlocksRegistry !== "undefined" && typeof ChartShape !== "undefined") {
    ChartBlock = class ChartBlock extends ChartShape {
        constructor(notebookEditor, block, hostElement) {
            super(ChartBlock.createNotebookRuntime(notebookEditor, hostElement), null, block.id);
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

        static createNotebookRuntime(notebookEditor, hostElement) {
            const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
            const theme = new BaseTheme();
            return {
                hostElement: hostElement,
                svg: null,
                translations: shellTranslations ?? new BaseTranslations(shellTranslations?.language ?? "en-US"),
                theme: theme,
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
            this.properties = this.block;
            for (const [propertyName, propertyValue] of Object.entries(defaultProperties)) {
                if (!Object.prototype.hasOwnProperty.call(this.properties, propertyName))
                    this.properties[propertyName] = propertyValue;
            }
            if (!this.properties.xTerm)
                this.properties.xTerm = this.board.calculator?.properties?.independent?.name ?? "t";
            if (this.properties.autoScale == null)
                this.properties.autoScale = true;
            if (this.properties.equalScales == null)
                this.properties.equalScales = false;
            if (!this.properties.domainOverride && (this.properties.xMin != null || this.properties.xMax != null || this.properties.yMin != null || this.properties.yMax != null)) {
                this.properties.domainOverride = {
                    xMin: this.properties.xMin ?? null,
                    xMax: this.properties.xMax ?? null,
                    yMin: this.properties.yMin ?? null,
                    yMax: this.properties.yMax ?? null
                };
            }
        }

        renderContentHtml() {
            return "";
        }

        createElement() {
            this.board.hostElement.replaceChildren();
            const element = this.board.createSvgElement("svg");
            element.classList.add("notebook-chart-control");
            element.setAttribute("width", "100%");
            element.setAttribute("height", "100%");
            this.board.hostElement.appendChild(element);
            this.board.svg = element;
            this.container = this.board.hostElement;
            this.chartRows = [];
            this.lastSyncedIteration = 0;
            this.lastSyncedCalculatedIteration = 0;
            this.lastSyncedRecalculationRevision = 0;
            this.chartDataConfig = null;
            this.chart = new ChartControl(element, this.getChartControlOptions());
            this._appliedConfig = {};
            this._appliedDomainConfig = null;
            return element;
        }

        getTermLabelAnchor() {
            const width = Number(this._notebookRenderWidth);
            const height = Number(this._notebookRenderHeight);
            if (Number.isFinite(width) && Number.isFinite(height))
                return { x: width - 8, y: 20, anchor: "end" };
            return { x: 0, y: 20, anchor: "end" };
        }

        draw() {
            this._notebookRenderWidth = Math.max(240, this.container?.clientWidth || 720);
            this._notebookRenderHeight = Math.max(160, this.container?.clientHeight || 240);
            this.chart.setSize(this._notebookRenderWidth, this._notebookRenderHeight);
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
            this.board.hostElement?.replaceChildren();
            this.board.svg = null;
            this.contentElement = null;
            this.dragHandleElement = null;
            this.blockElement = null;
            this.container = null;
        }

        onCalculatorIterate() {
            this.updateValues();
            this.updateFocus();
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
                type: "chart",
                content: "",
                borderColor: "#e8e8e8",
                backgroundColor: "transparent",
                autoScale: true,
                equalScales: false,
                tangentColor: "#00000000",
                axisColor: "",
                originX: 0,
                originY: 0,
                xTerm: this.board.calculator?.properties?.independent?.name ?? "t",
                yTerms: [{ term: this.board.calculator?.getDefaultTerm?.() ?? "", case: 1, color: "", showLabel: false, chartTypes: ["line"] }],
                domainOverride: this.getDefaultDomainOverride()
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

    BlocksRegistry.register("chart", {
        defaultContent: "",
        renderContentHtml: () => "",
        notebookShapeClass: ChartBlock,
        getNotebookToolbarMixin: () => typeof ChartShapeToolbarMixin !== "undefined" ? ChartShapeToolbarMixin : null,
        createShape: (notebookEditor, block, hostElement) => new ChartBlock(notebookEditor, block, hostElement)
    });
}
