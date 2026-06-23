class BoardEditor extends Workspace {
    constructor(session, model) {
        super(session);
        this.board = new Canvas(document.getElementById("svg"), session.calculator);
        this.board.shell = this;
        this.board._isModelCreator = () => this.isModelCreator();
        this.commands = new Commands(this);
        this.board.assetManager = new AssetManager(session.modelsApiClient);
        this.aiSdk = new AiSdk({
            host: "agent-modellus.interactivebook.workers.dev",
            agent: "ChatAgent",
            getSession: () => window.modellus?.auth?.getSession?.(),
            getUserId: () => this.aiSdk.getCurrentUserId()
        });
        this.modelCreatorId = null;
        this.setDefaults();
        this.panAndZoom = new PanAndZoom(this.board);
        this.board.svg.addEventListener("zoom", e => this.onZoom(e));
        this.miniMap = new MiniMap(this.board, document.getElementById("MinimapImage"), document.getElementById("MinimapViewport"));
        this.settingsController = new SettingsController(this);
        this.contextMenuController = new ContextMenuController(this);
        this.topToolbar = new TopToolbar(this);
        this.chatController = new ChatController(this);
        this.bottomToolbar = new BottomToolbar(this);
        this.setWorkspaceSurfaceAdapter({
            refresh: () => this.board.refresh(),
            forceRefresh: () => this.board.forceRefresh()
        });
        this.setPlayerViewAdapter({
            setPlayPauseIcon: icon => {
                if (this.bottomToolbar?.playPause)
                    this.bottomToolbar.playPause.option("icon", icon);
            },
            setSliderValue: value => {
                if (this.bottomToolbar?.playHead)
                    this.bottomToolbar.playHead.option("value", value);
            },
            setSliderRange: maximum => {
                if (this.bottomToolbar?.playHead)
                    this.bottomToolbar.playHead.option("max", maximum);
            }
        });
        this.saveFormController = new SaveFormController(this);
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        this.board.svg.addEventListener("expressionChanged", e => this.onExpressionChanged(e));
        [BodyWidget, PointWidget, ExpressionWidget, ValueWidget, ChartWidget, TableWidget, SliderWidget, GaugeWidget, VectorWidget, LineWidget, ArcWidget, MediaWidget, ReferentialWidget, TextWidget, QuestionWidget, RulerWidget, ProtractorWidget].forEach(shapeClass => this.commands.registerShape(shapeClass));
        this.commands.registerShapeAlias("BodyShape", BodyWidget);
        this.commands.registerShapeAlias("PointShape", PointWidget);
        this.commands.registerShapeAlias("ExpressionShape", ExpressionWidget);
        this.commands.registerShapeAlias("ValueShape", ValueWidget);
        this.commands.registerShapeAlias("ChartShape", ChartWidget);
        this.commands.registerShapeAlias("TableShape", TableWidget);
        this.commands.registerShapeAlias("SliderShape", SliderWidget);
        this.commands.registerShapeAlias("GaugeShape", GaugeWidget);
        this.commands.registerShapeAlias("VectorShape", VectorWidget);
        this.commands.registerShapeAlias("LineShape", LineWidget);
        this.commands.registerShapeAlias("ArcShape", ArcWidget);
        this.commands.registerShapeAlias("MediaShape", MediaWidget);
        this.commands.registerShapeAlias("ReferentialShape", ReferentialWidget);
        this.commands.registerShapeAlias("TextShape", TextWidget);
        this.commands.registerShapeAlias("QuestionShape", QuestionWidget);
        this.commands.registerShapeAlias("RulerShape", RulerWidget);
        this.commands.registerShapeAlias("ProtractorShape", ProtractorWidget);
        this.commands.registerShapeAlias("ImageShape", MediaWidget);
        this.bindWorkspaceIterate(() => this.onIterate());
        if (model != undefined)
            this.openModel(model);
        this._resumeOnSpaceUp = false;
        this._hasChanges = false;
        this._autoSaveTimer = null;
        this.initializeShapeInteractionController();
        this.initializeBoardSelectionAdapter();
        window.addEventListener("keydown", e => this.onKeyDown(e));
        window.addEventListener("keyup", e => this.onKeyUp(e));
        window.addEventListener("beforeunload", e => this.onBeforeUnload(e));
        window.addEventListener("popstate", e => this.onPopState(e));
        history.pushState(null, "");
        this.reparseAndCalculateWorkspace(() => this.reset());
        this.startAutoSave();
    }

    get modelsApiClient() {
        return this.session?.modelsApiClient ?? null;
    }

    setDefaults() {
        try {
            const storedUser = JSON.parse(localStorage.getItem("mp.user") || "null");
            const preferredLanguage = storedUser?.preferredLanguage;
            if (preferredLanguage && preferredLanguage in this.board.translations.languages)
                this.board.translations.language = preferredLanguage;
        } catch (_) {}
        this.session.setDefaults();
        this.applySvgBackgroundColor();
        this.applyEducationLevel();
        this.applyGrid();
        this.applyBackground();
    }

    applySvgBackgroundColor() {
        if (!this.board?.svg)
            return;
        this.board.svg.style.backgroundColor = this.properties.backgroundColor;
    }

    applyBackground() {
        if (!this.board?.svg)
            return;
        const existingDefs = this.board.svg.querySelector("#mdl-bg-defs");
        const existingRect = this.board.svg.querySelector("#mdl-bg-rect");
        const existingOverlay = this.board.svg.querySelector("#mdl-bg-overlay");
        if (existingDefs) existingDefs.remove();
        if (existingRect) existingRect.remove();
        if (existingOverlay) existingOverlay.remove();
        const backgroundId = this.properties.backgroundId;
        if (!backgroundId) {
            this.board.svg.style.backgroundColor = this.properties.backgroundColor;
            return;
        }
        const background = BACKGROUNDS.find(b => b.id === backgroundId);
        if (!background?.pattern)
            return;
        if (background.backgroundColor)
            this.board.svg.style.backgroundColor = background.backgroundColor;
        const pattern = background.pattern;
        const defs = this.board.createSvgElement("defs");
        defs.id = "mdl-bg-defs";
        const patternElement = this.board.createSvgElement("pattern");
        patternElement.id = "mdl-bg-pattern";
        patternElement.setAttribute("patternUnits", "userSpaceOnUse");
        patternElement.setAttribute("width", pattern.width);
        patternElement.setAttribute("height", pattern.height);
        patternElement.innerHTML = pattern.content;
        defs.appendChild(patternElement);
        const rect = this.board.createSvgElement("rect");
        rect.id = "mdl-bg-rect";
        rect.setAttribute("x", "-1e6");
        rect.setAttribute("y", "-1e6");
        rect.setAttribute("width", "2e6");
        rect.setAttribute("height", "2e6");
        rect.setAttribute("fill", "url(#mdl-bg-pattern)");
        rect.setAttribute("pointer-events", "none");
        this.board.svg.insertBefore(defs, this.board.svg.firstChild);
        defs.after(rect);
        if (background.overlay) {
            const overlayGroup = this.board.createSvgElement("g");
            overlayGroup.id = "mdl-bg-overlay";
            overlayGroup.setAttribute("pointer-events", "none");
            overlayGroup.innerHTML = background.overlay;
            rect.after(overlayGroup);
        }
    }

    applyEducationLevel() {
        document.body.classList.toggle("mid-school", this.properties.educationLevel === "midSchool");
    }

    applyGrid() {
        this.board?.updateGrid(this.properties.gridSize, this.properties.snapToGrid);
    }

    createTranslatedTooltip(e, key, width, canShow) {
        return Utils.createTranslatedTooltip(e, key, this.board.translations, width, canShow);
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

    isModelCreator() {
        const currentUserId = this.getCurrentUserId();
        if (!currentUserId || !this.modelCreatorId)
            return true;
        return String(currentUserId) === String(this.modelCreatorId);
    }

    async uploadModelAsset(file, assetId) {
        return this.board.assetManager.uploadAsset(assetId, file);
    }

    async uploadModelThumbnail(file) {
        return ModelThumbnailStorage.uploadThumbnail(this.modelsApiClient, this.getCurrentModelId(), file);
    }

    setProperties(properties) {
        this.session.setProperties(properties);
        this.applySvgBackgroundColor();
        this.applyEducationLevel();
        this.applyGrid();
        this.applyBackground();
        this.topToolbar?.updateModelName();
    }
    
    setProperty(name, value) {
        if (name === "casesCount")
            value = this.calculator.normalizeCasesCount(value);
        const previousAngleUnit = this.properties.angleUnit;
        const keys = name.split('.');
        let current = this.properties;
        for (let i = 0; i < keys.length - 1; i++)
            current = current[keys[i]];
        current[keys[keys.length - 1]] = value;
        if (name === "backgroundColor") {
            this.applySvgBackgroundColor();
            this.topToolbar?.updateModelNameColor();
        }
        if (name === "educationLevel")
            this.applyEducationLevel();
        if (name === "gridSize" || name === "snapToGrid")
            this.applyGrid();
        if (name === "backgroundId")
            this.applyBackground();
        if (name === "snapToGrid")
            this.bottomToolbar?.updateSnapToGridButton();
        if (name === "name")
            this.topToolbar?.updateModelName();
        if (name.includes("independent") || name.includes("iteration") || name === "casesCount" || name === "precision" || name === "angleUnit")
            this.calculator.setProperty(name, value);
        if (name === "angleUnit")
            this.board.shapes.shapes.forEach(shape => shape.onAngleUnitChanged?.(previousAngleUnit));
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
        this._hasChanges = true;
    }

    redoPressed() {
        this.commands.invoker.redo();
        this._hasChanges = true;
    }

    updateToolbar() {
        this.topToolbar.update();
    }

    updatePlayer() {
        this.bottomToolbar.updatePlayer();
    }

    onBeforePlayback() {
        this.deselectShape();
        this.applyUserPermissions();
    }

    playPausePressed() {
        this.toggleCalculatorPlayback();
        this.bottomToolbar.updatePlayer();
        this.topToolbar.update();
    }

    stepBackwardPressed() {
        this.calculatorStepBackward();
        this.bottomToolbar.updatePlayer();
    }

    stepForwardPressed() {
        this.calculatorStepForward();
        this.bottomToolbar.updatePlayer();
    }
    
    stopPressed() {
        this.reparseAndCalculateWorkspace(() => this.reset());
    }
    
    replayPressed() {
        this.replayCalculatorPlayback();
        this.bottomToolbar.updatePlayer();
    }

    miniMapPressed() {
        this.miniMap.toggle();
    }

    snapToGridPressed() {
        this.setPropertyCommand("snapToGrid", !this.properties.snapToGrid);
        this.bottomToolbar.updateSnapToGridButton();
    }

    chatPressed() {
        this.chatController.open();
    }

    iterationChanged(iteration) {
        this.calculatorSetIteration(iteration);
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

    async confirmClearKeepIdentity() {
        const translations = this.board.translations;
        const dialog = DevExpress.ui.dialog.custom({
            title: translations.get("Clear Confirmation Title"),
            messageHtml: `<div style="line-height:1.45">${translations.get("Clear Confirmation Message").replace(/\n/g, "<br>")}</div>`,
            buttons: [
                {
                    text: translations.get("Cancel"),
                    type: "normal",
                    stylingMode: "outlined",
                    onClick: () => false
                },
                {
                    text: translations.get("Clear Confirmation Confirm"),
                    type: "danger",
                    stylingMode: "contained",
                    onClick: () => true
                }
            ]
        });
        const confirmed = await dialog.show();
        if (confirmed)
            this.clearKeepIdentity();
    }
    
    reset() {
        this.restoreUserPermissions();
        const initialValuesByCase = this.session.pendingInitialValuesByCase ?? this.calculator.getInitialValuesByCase();
        this.session.pendingInitialValuesByCase = null;
        this.calculator.reset();
        this.board.shapes.shapes.forEach(shape => {
            if (shape.properties?.expression !== undefined)
                this.calculator.parse(shape.properties.expression);
            else if (shape.properties?.isPhysical)
                this.calculator.addPhysicalBody(shape.properties.name, shape.properties.mass ?? 1);
        });
        this.board.shapes.shapes.forEach(shape => {
            if (shape.properties?.externalData)
                this.calculator.loadExternalData(shape.properties.externalData.names, shape.properties.externalData.values);
        });
        this.calculator.applyPreloadedOutlierIterations();
        this.calculator.applyPreloadedRegressionTerms();
        this.calculator.applyInitialValuesByCase(initialValuesByCase);
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        this.forceRefreshWorkspaceSurface();
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
        this.board.enableSelection(true);
        this.deserialise(JSON.parse(model));
        this.reparseCalculateAndRefreshWorkspace(() => {
            this.reset();
            this.topToolbar.showWhatsNewIfNeeded();
            this.calculator.stop();
            this.board.resetShapeValues();
        });
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
        return this.serializeWorkspace("board", () => this.board.serialize());
    }

    deserialise(model) {
        this.applySerializedSession(model, properties => this.setProperties(properties));
        this.board.deserialize(model.board);
        this.applyGrid();
    }

    async saveToPath(filePath) {
        const fileHandle = await fetch(filePath);
        await this.saveModel(fileHandle);
    }

    async saveToApi() {
        if (this.isAnonymous()) {
            this.saveToSessionStorage();
            window.location.href = "/pages/login/index.html";
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
                definition: JSON.stringify(this.serialize())
            };
            if (this.properties.thumbnailUrl)
                payload.thumbnail_url = this.properties.thumbnailUrl;
            const response = await fetch(`${apiBase}/models/${modelId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Save failed (${response.status})`);
            this._hasChanges = false;
            this.topToolbar?.updateModelName();
        } catch (error) {
            alert("Failed to save model.");
        }
    }

    async duplicateModel() {
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        if (!session?.token) {
            this.saveToSessionStorage();
            window.location.href = "/pages/login/index.html";
            return;
        }
        const metadata = await this.saveFormController.promptDuplicateMetadata();
        if (!metadata)
            return;
        try {
            const now = new Date().toISOString();
                const newModel = await this.session.modelsApiClient.createModel({
                title: metadata.name || "Untitled model",
                description: metadata.description || "",
                type: "model",
                status: "draft",
                createdAt: now
            });
            if (!newModel?.id)
                return;
            const definition = this.serialize();
            definition.properties.name = metadata.name;
            definition.properties.description = metadata.description;
            const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
            const headers = { "Content-Type": "application/json" };
            if (session?.token) headers.Authorization = `Bearer ${session.token}`;
            const savePayload = {
                title: metadata.name || "Untitled model",
                description: metadata.description || "",
                definition: JSON.stringify(definition)
            };
            if (this.properties.thumbnailUrl)
                savePayload.thumbnail_url = this.properties.thumbnailUrl;
            await fetch(`${apiBase}/models/${newModel.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(savePayload)
            });
            window.location.href = `/pages/board/index.html?model_id=${newModel.id}`;
        } catch (error) {
            alert("Failed to duplicate model.");
        }
    }

    async saveAsModel() {
        if (this.isAnonymous()) {
            this.saveToSessionStorage();
            window.location.href = "/pages/login/index.html";
            return;
        }
        const metadata = await this.saveFormController.promptSaveAsMetadata();
        if (!metadata)
            return;
        try {
            const now = new Date().toISOString();
                const newModel = await this.session.modelsApiClient.createModel({
                title: metadata.name || "Untitled model",
                description: metadata.description || "",
                type: "model",
                status: "draft",
                createdAt: now
            });
            if (!newModel?.id)
                return;
            const definition = this.serialize();
            definition.properties.name = metadata.name;
            definition.properties.description = metadata.description;
            const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
            const headers = { "Content-Type": "application/json" };
            if (session?.token) headers.Authorization = `Bearer ${session.token}`;
            const savePayload = {
                title: metadata.name || "Untitled model",
                description: metadata.description || "",
                definition: JSON.stringify(definition)
            };
            if (this.properties.thumbnailUrl)
                savePayload.thumbnail_url = this.properties.thumbnailUrl;
            await fetch(`${apiBase}/models/${newModel.id}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(savePayload)
            });
            this._hasChanges = false;
            window.location.href = `/pages/board/index.html?model_id=${newModel.id}`;
        } catch (error) {
            alert("Failed to save model.");
        }
    }

    startAutoSave() {
        if (this._autoSaveTimer)
            clearInterval(this._autoSaveTimer);
        this._autoSaveTimer = setInterval(() => this.autoSaveModel(), 30000);
    }

    stopAutoSave() {
        if (this._autoSaveTimer) {
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = null;
        }
    }

    async autoSaveModel() {
        if (!this._hasChanges || this.isAnonymous())
            return;
        const modelId = this.getCurrentModelId();
        if (!modelId)
            return;
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        const headers = { "Content-Type": "application/json" };
        if (session?.token) headers.Authorization = `Bearer ${session.token}`;
        this.topToolbar?.showSavingIndicator();
        try {
            const payload = {
                title: this.properties.name || "Untitled model",
                description: this.properties.description || "",
                definition: JSON.stringify(this.serialize())
            };
            if (this.properties.thumbnailUrl)
                payload.thumbnail_url = this.properties.thumbnailUrl;
            const response = await fetch(`${apiBase}/models/${modelId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload)
            });
            if (response.ok)
                this._hasChanges = false;
        } catch (_) {
        } finally {
            this.topToolbar?.hideSavingIndicator();
        }
    }

    isModelNameUndefined() {
        const name = this.properties.name;
        return !name || name === "Model";
    }

    onBeforeUnload(event) {
        this.chatController.disposeAdapter();
        this.collabCoordinator?.destroy();
        if (!this._hasChanges)
            return;
        event.preventDefault();
    }

    setupCollab(modelId) {
        if (!modelId)
            return;
        this.collabCoordinator?.destroy();
        this.collabCoordinator = new CollabCoordinator({
            apiBase: "https://modellus-api.interactivebook.workers.dev",
            modelId,
            getToken: () => window.modellus?.auth?.getSession?.()?.token ?? "",
            onOp: op => this.applyRemoteOp(op),
            onSnapshot: model => this.applyRemoteSnapshot(model),
            getSnapshot: () => this.serialize()
        });
        if (this._collabShapeDragEndHandler)
            this.board.svg.removeEventListener("shapeDragEnd", this._collabShapeDragEndHandler);
        this.commands.invoker.onExecute = command => this.broadcastCommand(command);
        this._collabShapeDragEndHandler = e => {
            if (this.collabCoordinator?.isApplyingRemote())
                return;
            const shape = e.detail.shape;
            if (!shape)
                return;
            this.collabCoordinator?.sendOp({
                type: "setShapeProperties",
                shapeId: shape.id,
                properties: Utils.cloneProperties(shape.properties)
            });
        };
        this.board.svg.addEventListener("shapeDragEnd", this._collabShapeDragEndHandler);
        this.collabCoordinator.start();
    }

    broadcastCommand(command) {
        if (!this.collabCoordinator || this.collabCoordinator.isApplyingRemote())
            return;
        if (command instanceof AddShapeCommand) {
            this.collabCoordinator.sendOp({ type: "addShape", shapeData: command.shape.serialize() });
            this.collabCoordinator.sendSnapshot(this.serialize());
            return;
        }
        if (command instanceof RemoveShapeCommand) {
            this.collabCoordinator.sendOp({ type: "removeShape", shapeId: command.shape.id });
            this.collabCoordinator.sendSnapshot(this.serialize());
            return;
        }
        if (command instanceof SetShapePropertiesCommand) {
            this.collabCoordinator.sendOp({
                type: "setShapeProperties",
                shapeId: command.shape.id,
                properties: Utils.cloneProperties(command.shape.properties)
            });
            return;
        }
        if (command instanceof SetPropertiesCommand) {
            this.collabCoordinator.sendOp({ type: "setModelProperties", properties: Utils.cloneProperties(this.properties) });
            this.collabCoordinator.sendSnapshot(this.serialize());
        }
    }

    applyRemoteOp(op) {
        if (!this.collabCoordinator)
            return;
        if (op.type === "addShape") {
            const existingShape = this.board.shapes.getById(op.shapeData.id);
            if (existingShape)
                return;
            const parentShape = op.shapeData.parent ? this.board.shapes.getById(op.shapeData.parent) : null;
            const newShape = this.board.createShape(op.shapeData.type, parentShape, op.shapeData.id);
            newShape.setProperties(op.shapeData.properties);
            this.board.addShape(newShape, false);
            newShape.draw();
            newShape.update();
            return;
        }
        if (op.type === "removeShape") {
            const targetShape = this.board.shapes.getById(op.shapeId);
            if (targetShape)
                this.board.removeShape(targetShape);
            return;
        }
        if (op.type === "setShapeProperties") {
            const targetShape = this.board.shapes.getById(op.shapeId);
            if (targetShape)
                this.board.setShapeProperties(targetShape, op.properties);
            return;
        }
        if (op.type === "setModelProperties")
            this.setProperties(op.properties);
    }

    applyRemoteSnapshot(model) {
        if (!model || !this.collabCoordinator)
            return;
        this.board.enableSelection(true);
        this.deserialise(model);
        this.reparseCalculateAndRefreshWorkspace(() => {
            this.reset();
            this.calculator.stop();
        });
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
            await this.autoSaveModel();
        else
            this._hasChanges = false;
        window.location.href = "/pages/marketplace/index.html";
    }

    async exitEditor() {
        if (!this._hasChanges) {
            window.location.href = "/pages/marketplace/index.html";
            return;
        }
        const result = await this.saveFormController.promptSaveBeforeExit();
        if (result === "cancel")
            return;
        if (result === "save") {
            await this.autoSaveModel();
            window.location.href = "/pages/marketplace/index.html";
            return;
        }
        this._hasChanges = false;
        window.location.href = "/pages/marketplace/index.html";
    }

    getModel() {
        return this.board.serialize();
    }

    getValues() {
        return this.calculator.getValues();
    }

    applyUserPermissions() {
        this.board.shapes.shapes.forEach(shape => shape.applyUserPermissions());
    }

    restoreUserPermissions() {
        this.board.shapes.shapes.forEach(shape => shape.restoreUserPermissions());
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

    async importDataFromFile() {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: "CSV Files", accept: { "text/csv": [".csv"] } }]
        });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const { names, values } = this.parseCsv(text);
        return { names, values };
    }

    async importDataFromUrl() {
        const url = prompt(this.board.translations.get("Enter CSV URL"));
        if (!url)
            return null;
        const response = await fetch(url);
        const text = await response.text();
        const { names, values } = this.parseCsv(text);
        return { names, values };
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
        this.reparseAndCalculateWorkspace(() => this.reset());
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
        this.refreshWorkspaceSurface();
        this.bottomToolbar.updatePlayer();
    }    

    onZoom(e) {
        this.bottomToolbar.zoom.option("text", `${Math.round(e.detail.zoom * 100)} %`);
    }

    initializeShapeInteractionController() {
        this.shapeInteractionController = new ShapeInteractionController({
            isEditingTarget: target => target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable === true,
            clearSelection: () => this.board.deselect(),
            canRemoveSelectedItem: () => this.board.selection.selectedShape != null,
            removeSelectedItem: () => {
                const selectedShape = this.board.selection.selectedShape;
                if (!selectedShape)
                    return false;
                selectedShape.remove();
                return true;
            },
            selectPreviousItem: () => {
                const selectedShape = this.board.selection.selectedShape;
                if (!selectedShape)
                    return null;
                const previousShape = this.board.shapes.getPreviousShape(selectedShape);
                if (!previousShape)
                    return null;
                this.board.selectShape(previousShape);
                return previousShape;
            },
            selectNextItem: () => {
                const selectedShape = this.board.selection.selectedShape;
                if (!selectedShape)
                    return null;
                const nextShape = this.board.shapes.getNextShape(selectedShape);
                if (!nextShape)
                    return null;
                this.board.selectShape(nextShape);
                return nextShape;
            }
        });
    }

    initializeBoardSelectionAdapter() {
        this.board.selection.setInteractionAdapter({
            shouldDeselectOnClickOutside: (event, selection) => {
                if (typeof shouldDeselectEditorOnClickOutside === "function")
                    return shouldDeselectEditorOnClickOutside(event, selection);
                return false;
            },
            resolveSelectedShape: (shape, point, event, selection) => {
                if (typeof resolveEditorSelectedShapeTarget === "function")
                    return resolveEditorSelectedShapeTarget(selection, shape, point);
                return null;
            },
            resolveDoubleClickShape: (shape, event, selection) => {
                if (typeof resolveEditorDoubleClickShapeTarget === "function")
                    return resolveEditorDoubleClickShapeTarget(selection, shape, event);
                return shape;
            },
            resolvePointerDown: (event, selection) => {
                if (typeof resolveEditorPointerDown === "function")
                    return resolveEditorPointerDown(event, selection);
                return null;
            },
            shouldSkipPointerUp: (event, selection) => {
                if (typeof shouldSkipEditorPointerUp === "function")
                    return shouldSkipEditorPointerUp(event, selection);
                return false;
            },
            resolvePointerMovement: (event, selection) => {
                if (typeof resolveEditorPointerMovement === "function")
                    return resolveEditorPointerMovement(event, selection);
                return { dx: 0, dy: 0 };
            },
            shouldProcessPointerUpSelection: (pointerMovement, event, selection) => {
                if (typeof shouldProcessEditorPointerUpSelection === "function")
                    return shouldProcessEditorPointerUpSelection(pointerMovement, event, selection);
                return false;
            },
            shouldSkipPointerMove: (event, selection) => {
                if (typeof shouldSkipEditorPointerMove === "function")
                    return shouldSkipEditorPointerMove(event, selection);
                return false;
            },
            resolveHoveredShapeFromPointer: (shape, event, selection) => {
                if (typeof resolveEditorHoveredShapeFromPointer === "function")
                    return resolveEditorHoveredShapeFromPointer(shape, event, selection);
                return shape;
            },
            resolveHighlightColor: (shape, selection) => {
                if (typeof resolveEditorHighlightColor === "function")
                    return resolveEditorHighlightColor(shape, selection);
                return null;
            },
            shouldShowOutline: (shape, selection) => {
                if (typeof shouldShowEditorOutline === "function")
                    return shouldShowEditorOutline(shape, selection);
                return true;
            },
            shouldApplyEditModeHighlight: (shape, selection) => {
                if (typeof shouldApplyEditorEditModeHighlight === "function")
                    return shouldApplyEditorEditModeHighlight(shape, selection);
                return true;
            }
        });
    }

    onKeyDown(e) {
        if (this.shapeInteractionController?.handleRuntimeKeyDown(e) === true)
            return;
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

var BoardApp = BoardEditor;