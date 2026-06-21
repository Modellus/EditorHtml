var ChartShape;
if (typeof BaseShape !== "undefined") ChartShape = class ChartShape extends BaseShape {
    constructor(boardOrNotebookEditor, parentOrHostElement, id, options = {}) {
        const notebookBlock = options.notebookBlock ?? null;
        const notebookRuntime = notebookBlock ? ChartShape.createNotebookRuntime(boardOrNotebookEditor, parentOrHostElement) : null;
        super(notebookRuntime?.board ?? boardOrNotebookEditor, null, id);
        if (!notebookRuntime)
            return;
        this.notebookEditor = boardOrNotebookEditor;
        this.block = notebookBlock;
        this.container = parentOrHostElement;
        this.contentElement = parentOrHostElement;
        this.blockElement = parentOrHostElement?.closest?.(".notebook-block") ?? null;
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
        this.draw();
        this.update();
        this._calculatorIterateHandler = () => this.onCalculatorIterate();
        this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
    }

    static createNotebookRuntime(notebookEditor, hostElement) {
        const shellTranslations = notebookEditor?.getShell?.()?.board?.translations;
        const theme = new BaseTheme();
        return {
            board: {
                isNotebookSurface: true,
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
            }
        };
    }

    isNotebookShape() {
        return this.board?.isNotebookSurface === true;
    }

    enterEditMode() {
        if (this.chart && typeof this.chart.focus === "function") {
            this.chart.focus();
            return true;
        }
        const element = this.chart?.element?.();
        if (element && typeof element.focus === "function") {
            element.focus();
            return true;
        }
        return false;
    }

    clearStaleTermCollectionReferences(staleTermNames) {
        if (!Array.isArray(this.properties.yTerms))
            return;
        let hadStale = false;
        for (let i = 0; i < this.properties.yTerms.length; i++) {
            if (staleTermNames.has(this.properties.yTerms[i].term)) {
                this.properties.yTerms[i] = { ...this.properties.yTerms[i], term: "" };
                hadStale = true;
            }
        }
        if (hadStale) {
            this.resetValues();
            this.update();
        }
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
        const dataAreaLabel = this.board.translations.get("Data Area") ?? "Data Area";
        this._dataAreaColorPicker = this.createColorPickerEditor("dataAreaColor");
        sections[0].items.push({
            text: dataAreaLabel,
            iconHtml: this.menuIconHtml("fa-chart-area", !!this.properties.dataAreaColor),
            buildControl: $p => $p.append(this._dataAreaColorPicker)
        });
        const axisLabel = this.board.translations.get("Axis") ?? "Axis";
        this._axisColorPicker = this.createColorPickerEditor("axisColor");
        sections[0].items.push({
            text: axisLabel,
            iconHtml: this.menuIconHtml("fa-axis-x", !!this.properties.axisColor),
            buildControl: $p => $p.append(this._axisColorPicker)
        });
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Chart Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.autoScale = true;
        this.properties.equalScales = false;
        this.properties.tangentColor = "#00000000";
        this.properties.axisColor = "";
        this.properties.originX = 0;
        this.properties.originY = 0;
        this.properties.xTerm = this.board.calculator.properties.independent.name;
        this.properties.yTerms = [{ term: this.board.calculator.getDefaultTerm(), case: 1, color: "", showLabel: false, chartTypes: ["line"] }];
        this.properties.domainOverride = this.getDefaultDomainOverride();
    }

    getDefaultDomainOverride() {
        const independent = this.board.calculator.properties.independent;
        let xMin = independent.start;
        let xMax = independent.end;
        if (xMin === xMax) {
            xMin -= 1;
            xMax += 1;
        }
        let yMin = independent.start;
        let yMax = independent.end;
        if (yMin === yMax) {
            yMin -= 1;
            yMax += 1;
        }
        const xMargin = (xMax - xMin) * 0.04;
        const yMargin = (yMax - yMin) * 0.08;
        return { xMin: xMin - xMargin, xMax: xMax + xMargin, yMin: yMin - yMargin, yMax: yMax + yMargin };
    }

    getChartControlOptions() {
        return {
            argumentField: "argument",
            series: [],
            argumentTitle: "",
            valueTitle: "",
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            borderColor: this.getBorderColor(),
            borderRadius: this.getBorderRadius(),
            ...(this.properties.axisColor ? { axisColor: this.properties.axisColor } : {}),
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            getPrecision: () => this.board.calculator.getPrecision(),
            onDomainChanged: domain => this.onDomainChanged(domain),
            onTickDragStarted: () => this.onTickDragStarted(),
            onTickDragEnded: () => this.onTickDragEnded(),
            onDataAreaDoubleClick: (clickedX, clickedY) => this.onDataAreaDoubleClick(clickedX, clickedY)
        };
    }

    onDomainChanged(domain) {
        this.properties.autoScale = false;
        this.properties.domainOverride = domain;
        this._autoScaleSwitchInstance?.option("value", false);
        this.refreshDomainBoxes();
        this.board.markDirty(this);
    }

    onDataAreaDoubleClick(clickedX, clickedY) {
        const currentDomain = this.chart.renderState?.domain;
        const xMin = currentDomain ? currentDomain.xMin : -1;
        const xMax = currentDomain ? currentDomain.xMax : 1;
        const yMin = currentDomain ? currentDomain.yMin : -1;
        const yMax = currentDomain ? currentDomain.yMax : 1;
        const newDomain = {
            xMin: xMin - clickedX,
            xMax: xMax - clickedX,
            yMin: yMin - clickedY,
            yMax: yMax - clickedY
        };
        this.properties.domainOverride = newDomain;
        this.properties.autoScale = false;
        this._autoScaleSwitchInstance?.option("value", false);
        this.chart.setDomainOverride(newDomain);
        this.refreshDomainBoxes();
        this.board.markDirty(this);
    }

    onTickDragStarted() {
        this._tickDragState = true;
        this.board.pointerLocked = true;
    }

    onTickDragEnded() {
        this._tickDragState = null;
        this.board.pointerLocked = false;
    }

    createElement() {
        if (this.isNotebookShape()) {
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
        const element = this.board.createSvgElement("g");
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

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".chart-focus-layer").forEach(layerElement => layerElement.remove());
        clone.querySelectorAll(".chart-focus-reference-line").forEach(lineElement => lineElement.remove());
        clone.querySelectorAll(".shape-term-label").forEach(labelElement => {
            const labelGroup = labelElement.closest("g");
            if (labelGroup)
                labelGroup.remove();
            else
                labelElement.remove();
        });
        clone.querySelectorAll(".shape-term-label-bg").forEach(backgroundElement => backgroundElement.remove());
        clone.querySelectorAll(".shape-term-case-icon-host").forEach(caseIconElement => caseIconElement.remove());
        clone.querySelectorAll(".shape-term-guide-line").forEach(guideElement => guideElement.remove());
        return clone;
    }

    initializeTermDisplayLayer() {
        BaseShape.prototype.initializeTermDisplayLayer.call(this);
        if (this.termDisplayLayer && this.element) {
            this.termDisplayLayer.setAttribute("clip-path", `url(#${this.chart.plotClipId})`);
            this.element.appendChild(this.termDisplayLayer);
        }
    }

    updateValues() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig)
            return;
        var system = this.board.calculator.system;
        const lastIteration = system.lastIteration;
        const lastCalculatedIteration = system.lastCalculatedIteration;
        if (this.lastSyncedIteration > lastIteration)
            this.resetValues();
        let hasChanges = false;
        if (lastCalculatedIteration > this.lastSyncedCalculatedIteration) {
            const recalcStart = this.lastSyncedCalculatedIteration + 1;
            const recalcEnd = Math.min(lastCalculatedIteration, this.lastSyncedIteration);
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                const row = this.chartRows[rowIndex];
                if (row.iteration >= recalcStart && row.iteration <= recalcEnd) {
                    const updated = this.createChartDataItem(row.iteration, chartDataConfig);
                    this.chartRows[rowIndex] = updated;
                    hasChanges = true;
                }
            }
            this.lastSyncedCalculatedIteration = lastCalculatedIteration;
        }
        for (let iteration = this.lastSyncedIteration + 1; iteration <= lastIteration; iteration++)
            this.chartRows.push(this.createChartDataItem(iteration, chartDataConfig));
        if (lastIteration > this.lastSyncedIteration)
            hasChanges = true;
        this.lastSyncedIteration = lastIteration;
        const calculator = this.board.calculator;
        const recalculationRevision = calculator.recalculationRevision ?? 0;
        if (recalculationRevision !== this.lastSyncedRecalculationRevision) {
            const currentIteration = system.iteration;
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                if (this.chartRows[rowIndex].iteration === currentIteration) {
                    this.chartRows[rowIndex] = this.createChartDataItem(currentIteration, chartDataConfig);
                    hasChanges = true;
                    break;
                }
            }
            this.lastSyncedRecalculationRevision = recalculationRevision;
        }
        if (!hasChanges)
            return;
        this.chart.setData(this.chartRows);
    }

    createChartDataItem(iteration, chartDataConfig) {
        const item = { iteration: iteration };
        const xValue = this.getChartTermValueOnIteration(iteration, chartDataConfig.xTerm, chartDataConfig.xCase);
        item[chartDataConfig.argumentField] = xValue;
        const system = this.board.calculator.system;
        for (let index = 0; index < chartDataConfig.ySeries.length; index++) {
            const ySeries = chartDataConfig.ySeries[index];
            item[ySeries.valueField] = this.getChartTermValueOnIteration(iteration, ySeries.term, ySeries.case);
            item[`outlier_${ySeries.valueField}`] = this.board.calculator.isOutlierIteration(ySeries.term, iteration);
            item[`singularity_${ySeries.valueField}`] = system.getSingularityType(this.normalizeYTermValue(ySeries.term), iteration, ySeries.case) !== 0;
        }
        return item;
    }

    getChartTermValueOnIteration(iteration, term, caseNumber) {
        const normalizedTerm = this.normalizeYTermValue(term);
        if (normalizedTerm === "")
            return NaN;
        const calculator = this.board.calculator;
        if (calculator.isTerm(normalizedTerm))
            return calculator.system.getByNameOnIteration(iteration, normalizedTerm, this.getClampedCaseNumber(caseNumber));
        const numericValue = Number(normalizedTerm);
        if (Number.isFinite(numericValue))
            return numericValue;
        return NaN;
    }

    resetValues() {
        this.lastSyncedIteration = 0;
        this.lastSyncedCalculatedIteration = 0;
        this.lastSyncedRecalculationRevision = 0;
        this.chartRows = [];
        if (this.chart)
            this.chart.setData(this.chartRows);
    }

    updateFocus() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        var system = this.board.calculator.system;
        if (chartDataConfig.xTerm === "" || chartDataConfig.ySeries.length === 0) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        const value = this.getChartTermValueOnIteration(system.iteration, chartDataConfig.xTerm, chartDataConfig.xCase);
        if (value == null) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        if (typeof value === "number" && !Number.isFinite(value)) {
            if (this.chart)
                this.chart.setFocusArgumentValue(null);
            return;
        }
        if (this.chart)
            this.chart.setFocusArgumentValue(value);
    }

    update() {
        this.normalizeYTerms();
        this.refreshYTermsControl();
        const selectedYTerms = this.getSelectedYTerms();
        const xTerm = this.getXTermName();
        const xCase = this.getXTermCaseNumber();
        const argumentField = "argument";
        const ySeries = selectedYTerms.map((yTerm, index) => ({
            term: yTerm.term,
            case: TermControl.getShapeCaseNumber(this, yTerm.term, yTerm.case ?? 1, value => this.normalizeYTermValue(value)),
            color: this.normalizeYTermColor(yTerm.color),
            showLabel: yTerm.showLabel === true,
            chartTypes: Array.isArray(yTerm.chartTypes) && yTerm.chartTypes.length > 0 ? yTerm.chartTypes : ["line"],
            valueField: this.getSeriesValueFieldName(index),
            name: this.getSeriesName(yTerm)
        }));
        const chartDataConfig = {
            xTerm: xTerm,
            xCase: xCase,
            argumentField: argumentField,
            ySeries: ySeries
        };
        this.chartDataConfig = chartDataConfig;
        const config = {
            equalScales: this.properties.equalScales === true,
            tangentColor: this.properties.tangentColor ?? "",
            argField: argumentField,
            series: ySeries.map(series => ({
                valueField: series.valueField,
                name: series.name,
                color: series.color === "" ? undefined : series.color,
                showLabel: series.showLabel === true,
                chartTypes: Array.isArray(series.chartTypes) && series.chartTypes.length > 0 ? series.chartTypes : ["line"]
            })),
            color: this.properties.foregroundColor,
            bg: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            axisColor: this.properties.axisColor || undefined,
            border: this.getBorderColor(),
            argTitle: this.getTermLabelWithCase(xTerm, xCase)
        };
        const dataConfig = {
            argField: config.argField,
            series: config.series.map(series => ({ valueField: series.valueField, name: series.name }))
        };
        const dataChanged = JSON.stringify(dataConfig) !== JSON.stringify(this._appliedDataConfig);
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (changed) {
            this.chart.setOptions({
                equalScales: config.equalScales,
                tangentColor: config.tangentColor,
                argumentField: config.argField,
                series: config.series,
                foregroundColor: config.color,
                backgroundColor: config.bg,
                dataAreaColor: config.dataAreaColor,
                axisColor: config.axisColor,
                borderColor: config.border,
                argumentTitle: config.argTitle
            });
            if (dataChanged)
                this.resetValues();
            this._appliedConfig = config;
            this._appliedDataConfig = dataConfig;
        }
        const domainConfig = {
            autoScale: this.properties.autoScale === true,
            domainOverride: this.properties.domainOverride ? { ...this.properties.domainOverride } : null
        };
        const domainChanged = JSON.stringify(domainConfig) !== JSON.stringify(this._appliedDomainConfig);
        if (domainChanged) {
            if (domainConfig.autoScale)
                this.chart.resetDomainOverride();
            else if (domainConfig.domainOverride)
                this.chart.setDomainOverride(domainConfig.domainOverride);
            this._appliedDomainConfig = domainConfig;
        }
        this.updateValues();
        this.updateFocus();
        this.syncYTermDisplayEntries(selectedYTerms);
    }

    syncYTermDisplayEntries(selectedYTerms) {
        this.termDisplayEntries = this.termDisplayEntries.filter(entry => !entry.term.startsWith("_yTerm"));
        for (let i = 0; i < selectedYTerms.length; i++) {
            const yTerm = selectedYTerms[i];
            const termProperty = `_yTerm${i}`;
            const caseProperty = `${termProperty}Case`;
            const displayModeProperty = `${termProperty}DisplayMode`;
            this.properties[termProperty] = yTerm.term;
            this.properties[caseProperty] = yTerm.case ?? 1;
            this.properties[displayModeProperty] = yTerm.showLabel === true ? "nameValue" : "none";
            if (!this.termDisplayEntries.some(entry => entry.term === termProperty))
                this.termDisplayEntries.push({ term: termProperty, caseProperty: caseProperty });
        }
    }

    getTermLabelAnchor() {
        const width = Number(this.isNotebookShape() ? this._notebookRenderWidth : this.properties.width);
        const height = Number(this.isNotebookShape() ? this._notebookRenderHeight : this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: width - 8, y: 20, anchor: "end" };
        return { x: 0, y: 20, anchor: "end" };
    }

    getTermEntryLabelPosition(entry, index) {
        const focusPositions = this.chart.getFocusPositions();
        const position = focusPositions[index];
        if (!position)
            return null;
        return { x: position.x, y: position.y - 12, anchor: "middle" };
    }

    getTermEntryLabelColor(entry, index) {
        const series = this.chart.renderState?.series;
        if (!series || index >= series.length)
            return null;
        return series[index].color;
    }

    draw() {
        if (this.isNotebookShape()) {
            this._notebookRenderWidth = Math.max(240, this.container?.clientWidth || 720);
            this._notebookRenderHeight = Math.max(160, this.container?.clientHeight || 240);
            this.chart.setSize(this._notebookRenderWidth, this._notebookRenderHeight);
            super.draw();
            return;
        }
        const x = this.properties.x;
        const y = this.properties.y;
        const width = this.properties.width;
        const height = this.properties.height;
        this.chart.setSize(width, height);
        this.element.setAttribute("transform", `translate(${x} ${y}) rotate(${this.properties.rotation} ${width / 2} ${height / 2})`);
        super.draw();
    }

    tick() {
        this.updateValues();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
        this.board.markDirty(this);
    }

    renderContentHtml() {
        if (!this.isNotebookShape())
            return "";
        return "";
    }

    mount(contentElement, dragHandleElement) {
        if (!this.isNotebookShape())
            return;
        this.contentElement = contentElement;
        this.dragHandleElement = dragHandleElement;
        this.blockElement = contentElement.closest(".notebook-block");
        this.container = contentElement;
    }

    unmount() {
        if (!this.isNotebookShape())
            return;
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
        if (!this.isNotebookShape())
            return;
        this.updateValues();
        this.updateFocus();
    }

    markChanged() {
        if (!this.isNotebookShape()) {
            this.board.markDirty(this);
            return;
        }
        this.notebookEditor._updateLastModified();
    }

    duplicateBlock() {
        const duplicateBlock = Utils.cloneProperties(this.properties);
        duplicateBlock.id = this.notebookEditor.nextBlockId++;
        const blockIndex = this.notebookEditor.blocks.findIndex(block => block.id === this.id);
        this.notebookEditor.blocks.splice(blockIndex + 1, 0, duplicateBlock);
        this.notebookEditor._reloadBlockList();
        this.markChanged();
    }

    async copyBlockToClipboard() {
        if (!this.isNotebookShape())
            return;
        const payload = JSON.stringify({ type: "notebook-block", block: Utils.cloneProperties(this.properties) });
        await navigator.clipboard.writeText(payload);
    }

    async pasteBlockFromClipboard() {
        if (!this.isNotebookShape())
            return;
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
        if (!this.isNotebookShape())
            return super.setPropertyCommand(name, value);
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
        if (!this.isNotebookShape())
            return super.remove();
        this.notebookEditor.removeBlock(this.id);
    }

    duplicate() {
        if (!this.isNotebookShape())
            return super.duplicate();
        this.duplicateBlock();
    }

    resetToDefaults() {
        if (!this.isNotebookShape())
            return super.resetToDefaults();
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

if (typeof NotebookShapesFactory !== "undefined") {
    NotebookShapesFactory.register("chart", {
        defaultContent: "",
        renderContentHtml: () => "",
        notebookShapeClass: ChartShape,
        getNotebookToolbarMixin: () => typeof ChartShapeToolbarMixin !== "undefined" ? ChartShapeToolbarMixin : null,
        createShape: (notebookEditor, block, hostElement) => new ChartShape(notebookEditor, hostElement, block.id, { notebookBlock: block })
    });
}
