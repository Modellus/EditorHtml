class Shell  {
    constructor(model, modelsApiClient = null) {
        this.calculator = new Calculator();
        this.board = new Board(document.getElementById("svg"), this.calculator);
        this.commands = new Commands(this);
        this.modelsApiClient = modelsApiClient;
        this.board.assetManager = new AssetManager(modelsApiClient);
        this.pendingInitialValuesByCase = null;
        this.aiSdk = new AiSdk({
            host: "agent-modellus.interactivebook.workers.dev",
            agent: "ChatAgent",
            getSession: () => window.modellus?.auth?.getSession?.(),
            getUserId: () => this.aiSdk.getCurrentUserId()
        });
        this.properties = {};
        this.setDefaults();
        this.panAndZoom = new PanAndZoom(this.board);
        this.board.svg.addEventListener("zoom", e => this.onZoom(e));
        this.miniMap = new MiniMap(this.board, document.getElementById("MinimapImage"), document.getElementById("MinimapViewport"));
        this.settingsController = new SettingsController(this);
        this.contextMenuController = new ContextMenuController(this);
        this.topToolbar = new TopToolbar(this);
        this.chatController = new ChatController(this);
        this.bottomToolbar = new BottomToolbar(this);
        this.saveFormController = new SaveFormController(this);
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        this.board.svg.addEventListener("expressionChanged", e => this.onExpressionChanged(e));
        [BodyShape, ExpressionShape, ValueShape, ChartShape, TableShape, SliderShape, GaugeShape, VectorShape, LineShape, ArcShape, ImageShape, ReferentialShape, TextShape, RulerShape, ProtractorShape].forEach(shapeClass => this.commands.registerShape(shapeClass));
        this.calculator.on("iterate", e => this.onIterate(e));
        if (model != undefined)
            this.openModel(model);
        this._resumeOnSpaceUp = false;
        this._hasChanges = false;
        window.addEventListener("keydown", e => this.onKeyDown(e));
        window.addEventListener("keyup", e => this.onKeyUp(e));
        window.addEventListener("beforeunload", e => this.onBeforeUnload(e));
        window.addEventListener("popstate", e => this.onPopState(e));
        history.pushState(null, "");
        this.reset();
    }

    setDefaults() {
        this.properties.language = "en-US";
        this.properties.name = "Model";
        this.properties.description = "";
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.precision = 2;
        this.properties.angleUnit = "radians";
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1, noLimit: false };
        this.properties.iterationTerm = "n";
        this.properties.casesCount = 1;
        this.properties.initialValuesByCase = {};
        this.properties.iterationDuration = null;
        this.properties.thumbnailUrl = "";
        this.properties.instructions = "";
        this.properties.educationLevel = "university";
        this.applySvgBackgroundColor();
        this.applyEducationLevel();
    }

    applySvgBackgroundColor() {
        if (!this.board?.svg)
            return;
        this.board.svg.style.backgroundColor = this.properties.backgroundColor;
    }

    applyEducationLevel() {
        document.body.classList.toggle("mid-school", this.properties.educationLevel === "midSchool");
    }

    createTooltip(e, html, width, canShow) {
        return $("<div>")
            .appendTo("body")
            .dxTooltip({
                target: e.component.element(),
                contentTemplate: function (contentElement) {
                    contentElement.append(
                        $("<div class='tooltip'/>").html(html)
                    )
                },
                onShowing: tooltipEvent => {
                    if (typeof canShow === "function" && !canShow())
                        tooltipEvent.cancel = true;
                },
                showEvent: {
                    delay: 1000,
                    name: "mouseenter" 
                },
                hideEvent: "mouseleave",
                position: "top",
                width: width ?? 200
            })
            .dxTooltip("instance");
    }

    createTranslatedTooltip(e, key, width, canShow) {
        return this.createTooltip(e, this.board.translations.get(key), width, canShow);
    }

    getCurrentModelId() {
        return new URLSearchParams(window.location.search).get("model_id");
    }

    createAssetId(prefix) {
        if (window.crypto?.randomUUID)
            return `${prefix}-${window.crypto.randomUUID()}`;
        const randomValue = Math.floor(Math.random() * 1000000000);
        return `${prefix}-${Date.now()}-${randomValue}`;
    }

    getCurrentUserId() {
        return this.aiSdk.getCurrentUserId();
    }

    async uploadModelAsset(file, assetId) {
        return this.board.assetManager.uploadAsset(assetId, file);
    }

    setProperties(properties) {
        if (!properties)
            properties = this.properties;
        else
            Utils.mergeProperties(properties, this.properties);
        this.properties.casesCount = this.calculator.normalizeCasesCount(this.properties.casesCount);
        this.calculator.setProperties(this.properties);
        this.applySvgBackgroundColor();
        this.applyEducationLevel();
    }
    
    setProperty(name, value) {
        if (name === "casesCount")
            value = this.calculator.normalizeCasesCount(value);
        const keys = name.split('.');
        let current = this.properties;
        for (let i = 0; i < keys.length - 1; i++)
            current = current[keys[i]];
        current[keys[keys.length - 1]] = value;
        if (name === "backgroundColor")
            this.applySvgBackgroundColor();
        if (name === "educationLevel")
            this.applyEducationLevel();
        if (name.includes("independent") || name.includes("iteration") || name === "casesCount" || name === "precision" || name === "angleUnit")
            this.calculator.setProperty(name, value);
        if (name === "independent.start" || name === "independent.end")
            this.adjustChartDomainsForIndependentChange();
        if (name === "casesCount" && this.board?.selection?.selectedShape)
            this.board.selection.selectedShape.showContextToolbar?.();
        if (this.isAnonymous())
            this.saveToSessionStorage();
        this.reset();
    }

    setPropertyCommand(name, value) {
        const previousProperties = Utils.cloneProperties(this.properties);
        this.setProperty(name, value);
        const newProperties = Utils.cloneProperties(this.properties);
        const command = {
            execute: () => this.setProperties(newProperties),
            undo: () => this.setProperties(previousProperties)
        };
        this.commands.invoker.record(command);
    }

    adjustChartDomainsForIndependentChange() {
        const independent = this.properties.independent;
        let xMin = independent.start;
        let xMax = independent.end;
        if (xMin === xMax) {
            xMin -= 1;
            xMax += 1;
        }
        const xMargin = (xMax - xMin) * 0.04;
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name !== "ChartShape")
                return;
            if (shape.getXTermName() !== independent.name)
                return;
            if (!shape.properties.domainOverride)
                return;
            shape.properties.domainOverride.xMin = xMin - xMargin;
            if (!independent.noLimit)
                shape.properties.domainOverride.xMax = xMax + xMargin;
            if (shape.chart)
                shape.chart.setDomainOverride(shape.properties.domainOverride);
        });
    }

    undoPressed() {
        this.commands.invoker.undo();
    }
    
    redoPressed() {
        this.commands.invoker.redo();
    }

    updateToolbar() {
        this.topToolbar.update();
    }

    updatePlayer() {
        this.bottomToolbar.updatePlayer();
    }

    playPausePressed() {
        if(this.calculator.status === STATUS.PLAYING)
            this.calculator.pause();
        else {
            this.deselectShape();
            this.calculator.play();
        }
        this.bottomToolbar.updatePlayer();
        this.topToolbar.update();
    }

    stepBackwardPressed() {
        this.calculator.stepBackward();
        this.bottomToolbar.updatePlayer();
    }

    stepForwardPressed() {
        this.calculator.stepForward();
        this.bottomToolbar.updatePlayer();
    }
    
    stopPressed() {
        this.reset();
        this.calculator.calculate();
    }
    
    replayPressed() {
        this.deselectShape();
        this.calculator.replay();
        this.bottomToolbar.updatePlayer();
    }

    miniMapPressed() {
        this.miniMap.toggle();
    }

    chatPressed() {
        this.chatController.open();
    }

    iterationChanged(iteration) {
        this.calculator.setIteration(iteration);
    }

    openSettings() {
        this.settingsController.open();
    }

    clear() {
        this.setDefaults();
        this.calculator.clear();
        this.board.clear();
        this.bottomToolbar.updatePlayer();
        this.topToolbar.update();
        this.chatController.reset();
    }

    clearKeepIdentity() {
        const currentName = this.properties.name;
        this.clear();
        this.properties.name = currentName;
        if (this.settingsController.form)
            this.settingsController.form.updateData(this.properties);
    }
    
    reset() {
        const initialValuesByCase = this.pendingInitialValuesByCase ?? this.calculator.getInitialValuesByCase();
        this.pendingInitialValuesByCase = null;
        this.calculator.reset();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.constructor.name == "ExpressionShape" && shape.properties.expression != undefined)
                this.calculator.parse(shape.properties.expression);
        });
        this.calculator.applyPreloadedData();
        this.calculator.applyInitialValuesByCase(initialValuesByCase);
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        this.board.refresh();
        this.bottomToolbar.updatePlayer();
        this.topToolbar.update();
        if (this.properties.instructions)
            this.generateAndInstallHooks();
    }

    async generateAndInstallHooks() {
        const robotIcon = document.querySelector("#chat-button .dx-icon");
        robotIcon?.classList.add("fa-fade");
        try {
            const hooks = await this.aiSdk.generateHooks(this.properties.instructions, this.calculator.getTermsNames());
            if (hooks)
                this.calculator.setHook(hooks);
        } catch (error) {
            console.warn("Failed to generate hooks:", error);
        } finally {
            robotIcon?.classList.remove("fa-fade");
        }
    }

    async importFromFile() {
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const model = await file.text();
        this.openModel(model);
    }

    async openFromPath(filePath) {
        const file = await fetch(filePath);
        const model = await file.text();
        this.openModel(model);
    }

    openModel(model) {
        this.deserialise(JSON.parse(model));
        this.reset();
        this.calculator.stop();
        this.board.refresh();
        this.chatController.reset();
    }
    
    async exportToFile() {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: "model.json",
            types: [
                {
                    description: "Model Files",
                    accept: {
                        "application/json": [".json"]
                    }
                }
            ]
        });
        await this.saveModel(fileHandle);
    }

    async saveModel(fileHandle) {
        const writableStream = await fileHandle.createWritable();
        const model = JSON.stringify(this.serialize());
        await writableStream.write(model);
        await writableStream.close();
    }

    serialize() {
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        const properties = Object.assign({}, this.properties);
        delete properties.AIApiKey;
        const result = {
            properties,
            board: this.board.serialize()
        };
        const preloaded = this.calculator.getPreloadedData();
        if (preloaded)
            result.preloadedData = preloaded;
        return result;
    }

    deserialise(model) {
        this.pendingInitialValuesByCase = model?.properties?.initialValuesByCase ?? model?.properties?.initialValues ?? null;
        this.setProperties(model.properties);
        this.board.deserialize(model.board);
        if (model.preloadedData)
            this.calculator.loadTerms(model.preloadedData.names, model.preloadedData.values);
        else
            this.calculator.clearPreloadedData();
    }

    async saveToPath(filePath) {
        const fileHandle = await fetch(filePath);
        await this.saveModel(fileHandle);
    }

    async saveToApi() {
        if (this.isAnonymous()) {
            this.saveToSessionStorage();
            window.location.href = "/login.html";
            return;
        }
        const modelId = this.getCurrentModelId();
        if (!modelId) {
            alert("No model id found.");
            return;
        }
        const accepted = await this.saveFormController.promptModelMetadata();
        if (!accepted)
            return;
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        const headers = { "Content-Type": "application/json" };
        if (session && session.token) headers.Authorization = `Bearer ${session.token}`;
        try {
            const payload = {
                title: this.properties.name || "Untitled model",
                description: this.properties.description || "",
                definition: JSON.stringify(this.serialize()),
                lastModified: new Date().toISOString()
            };
            if (this.properties.thumbnailUrl)
                payload.thumbnail = this.properties.thumbnailUrl;
            const response = await fetch(`${apiBase}/models/${modelId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Save failed (${response.status})`);
            this._hasChanges = false;
        } catch (error) {
            alert("Failed to save model.");
        }
    }

    async duplicateModel() {
        if (this.isAnonymous()) {
            this.saveToSessionStorage();
            window.location.href = "/login.html";
            return;
        }
        const metadata = await this.saveFormController.promptDuplicateMetadata();
        if (!metadata)
            return;
        try {
            const definition = this.serialize();
            definition.properties.name = metadata.name;
            definition.properties.description = metadata.description;
            const payload = {
                title: metadata.name || "Untitled model",
                description: metadata.description || "",
                definition: JSON.stringify(definition),
                lastModified: new Date().toISOString(),
                user_id: this.getCurrentUserId()
            };
            if (this.properties.thumbnailUrl)
                payload.thumbnail = this.properties.thumbnailUrl;
            const newModel = await this.modelsApiClient.createModel(payload);
            if (newModel?.id)
                window.location.href = `/editor.html?model_id=${newModel.id}`;
        } catch (error) {
            alert("Failed to duplicate model.");
        }
    }

    isModelNameUndefined() {
        const name = this.properties.name;
        return !name || name === "Model";
    }

    onBeforeUnload(event) {
        this.chatController.disposeAdapter();
        if (!this._hasChanges)
            return;
        event.preventDefault();
    }

    async onPopState(event) {
        if (!this._hasChanges) {
            history.back();
            return;
        }
        history.pushState(null, "");
        const result = await this.saveFormController.promptSaveBeforeExit();
        if (result === "cancel")
            return;
        if (result === "save")
            await this.saveToApi();
        else
            this._hasChanges = false;
        window.location.href = "/marketplace.html";
    }

    async exitEditor() {
        if (!this._hasChanges) {
            window.location.href = "/marketplace.html";
            return;
        }
        const result = await this.saveFormController.promptSaveBeforeExit();
        if (result === "cancel")
            return;
        if (result === "save") {
            await this.saveToApi();
            window.location.href = "/marketplace.html";
            return;
        }
        this._hasChanges = false;
        window.location.href = "/marketplace.html";
    }

    getModel() {
        return this.board.serialize();
    }

    getValues() {
        return this.calculator.getValues();
    }

    deselectShape(options) {
        this.board.selection.deselect();
        this.topToolbar.update();
    }

    isChatOpen() {
        return this.chatController.isOpen();
    }

    disposeChatAdapter() {
        this.chatController.disposeAdapter();
    }

    exportData() {
        var values = this.calculator.getValues();
        var csv = "data:text/csv;charset=utf-8,";
        const headers = Object.keys(values[0]).join(",");
        const rows = values.map(v => Object.values(v).join(",")).join("\n");
        csv += `${headers}\n${rows}`;
        var encodedUri = encodeURI(csv);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", this.properties.name + ".csv");
        document.body.appendChild(link);
        link.click();
    }

    parseCsv(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        const names = lines[0].split(",").map(name => name.trim());
        const values = [];
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(",").map(cell => parseFloat(cell.trim()));
            values.push(row);
        }
        return { names, values };
    }

    loadPreloadedData(names, values) {
        this.calculator.loadTerms(names, values);
        this.reset();
    }

    clearPreloadedData() {
        this.calculator.clearPreloadedData();
        this.reset();
    }

    async importDataFromFile() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: "CSV Files", accept: { "text/csv": [".csv"] } }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const { names, values } = this.parseCsv(text);
        this.loadPreloadedData(names, values);
        this.showDataPopup();
    }

    async importDataFromUrl() {
        const url = prompt(this.board.translations.get("Enter CSV URL"));
        if (!url)
            return;
        const response = await fetch(url);
        const text = await response.text();
        const { names, values } = this.parseCsv(text);
        this.loadPreloadedData(names, values);
        this.showDataPopup();
    }

    showDataPopup() {
        const preloaded = this.calculator.getPreloadedData();
        if (!preloaded)
            return;
        const dataSource = preloaded.values.map(row => {
            const obj = {};
            for (let i = 0; i < preloaded.names.length; i++)
                obj[preloaded.names[i]] = row[i];
            return obj;
        });
        const columns = preloaded.names.map(name => ({
            dataField: name,
            caption: name,
            dataType: "number"
        }));
        const $popup = $("#data-popup");
        if ($popup.data("dxPopup"))
            $popup.dxPopup("instance").dispose();
        $popup.dxPopup({
            width: 600,
            height: 500,
            title: this.board.translations.get("Preloaded Data"),
            showTitle: true,
            dragEnabled: true,
            resizeEnabled: true,
            hideOnOutsideClick: true,
            shading: false,
            contentTemplate: (contentElement) => {
                $('<div>').appendTo(contentElement).dxDataGrid({
                    dataSource,
                    columns,
                    editing: {
                        mode: "cell",
                        allowUpdating: true
                    },
                    paging: { enabled: false },
                    height: "100%",
                    elementAttr: { class: "mdl-preloaded-data-grid" }
                });
            }
        });
        $popup.dxPopup("instance").show();
    }

    isAnonymous() {
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        if (session?.token)
            return false;
        return !this.getCurrentModelId();
    }

    saveToSessionStorage() {
        sessionStorage.setItem("mp.anon.model", JSON.stringify(this.serialize()));
    }

    onShapeChanged(e) {
        this._hasChanges = true;
        if (this.isAnonymous())
            this.saveToSessionStorage();
    }

    onExpressionChanged(e) {
        this._hasChanges = true;
        if (this.isAnonymous())
            this.saveToSessionStorage();
        this.reset();
        this.calculator.calculate();
    }

    onIterate(e) {
        if (this.calculator.hookFunction) {
            try {
                const values = this.calculator.get();
                this.calculator.hookFunction(values, this.calculator.setTermValue.bind(this.calculator));
            } catch (error) {
                console.warn("Hook execution error:", error);
            }
        }
        this.board.shapes.shapes.forEach(s => s.tick());
        this.board.refresh();
        this.bottomToolbar.updatePlayer();
    }    

    onZoom(e) {
        this.bottomToolbar.zoom.option("text", `${Math.round(e.detail.zoom * 100)} %`);
    }

    onKeyDown(e) {
        const isEditing = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;
        if ((e.ctrlKey || e.metaKey) && !isEditing) {
            const shape = this.board.selection.selectedShape;
            if (e.key === "c" && shape) {
                e.preventDefault();
                shape.copyToClipboard();
                return;
            }
            if (e.key === "v") {
                e.preventDefault();
                BaseShape.pasteFromClipboard(this.board, shape?.parent);
                return;
            }
            if (e.key === "d") {
                e.preventDefault();
                if (shape)
                    shape.duplicate();
                else
                    this.duplicateModel();
                return;
            }
        }
        if (e.code !== 'Space' && e.key !== ' ')
            return;
        if (e.repeat)
            return;
        if (this.calculator.status === STATUS.PLAYING) {
            e.preventDefault();
            this.calculator.pause();
            this._resumeOnSpaceUp = true;
            if (this.bottomToolbar.playPause && this.bottomToolbar.playPause.element)
                this.bottomToolbar.playPause.element().addClass('pulsing');
        }
    }

    onKeyUp(e) {
        if (e.code !== 'Space' && e.key !== ' ')
            return;
        if (!this._resumeOnSpaceUp)
            return;
        const sys = this.calculator.system;
        const end = this.calculator.properties.independent.end;
        const step = this.calculator.properties.independent.step;
        let current;
        try {
            current = typeof sys.getIndependent === 'function' ? sys.getIndependent() : this.calculator.getIndependentValue(sys.iteration);
        } catch (_) {
            current = this.calculator.getIndependentValue(sys.iteration);
        }
        const finished = Math.abs(current - end) < step / 10.0;
        if (!finished) {
            e.preventDefault();
            this.deselectShape();
            this.calculator.play();
        }
        if (this.bottomToolbar.playPause && this.bottomToolbar.playPause.element)
            this.bottomToolbar.playPause.element().removeClass('pulsing');
        this._resumeOnSpaceUp = false;
    }
}
