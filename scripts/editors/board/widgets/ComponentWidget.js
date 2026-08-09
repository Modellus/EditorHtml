class ComponentShape extends BaseShape {
    static defaultComponentType = "analogue-clock";

    constructor(board, parent, id) {
        super(board, null, id);
        this._axisTickDrag = new AxisTickDrag();
    }

    static createInstanceProperties(componentType, name = null) {
        const registration = BlockRegistry.get(componentType);
        if (!registration || registration.category !== "component")
            throw new Error(`Component type "${componentType}" is not registered.`);
        const componentName = name ?? registration.displayName;
        const definition = BlockObjects.createComponentInstance(componentType, { name: componentName });
        return Object.assign(
            { name: componentName, preset: definition.preset, definition: definition },
            BlockObjects.getInstancePropertyDefaults(componentType, definition.preset)
        );
    }

    static createDefinitionProperties(definition) {
        const componentType = BlockObjects.getComponentType(definition);
        const defaults = componentType ? BlockObjects.getInstancePropertyDefaults(componentType, definition.preset ?? "standard") : {};
        return Object.assign({ name: definition.name, preset: definition.preset ?? "standard", definition: definition }, defaults);
    }

    getComponentCompiler() {
        if (!this.board._blockCompiler)
            this.board._blockCompiler = new BlockCompiler(BlockRegistry, new BlockBindings(this.board.calculator));
        this.board._blockCompiler.setCalculator(this.board.calculator);
        return this.board._blockCompiler;
    }

    getComponentValidator() {
        if (!this.board._blockValidator)
            this.board._blockValidator = new BlockValidator(BlockRegistry, this.getComponentCompiler());
        this.board._blockValidator.setCalculator(this.board.calculator);
        return this.board._blockValidator;
    }

    setDefaults() {
        super.setDefaults();
        const componentType = this.constructor.defaultComponentType;
        const registration = BlockRegistry.get(componentType);
        this.properties.name = registration?.displayName ?? this.board.translations.get("Component Name");
        const center = this.board.getClientCenter();
        this.properties.width = 180;
        this.properties.height = 180;
        this.properties.x = center.x - this.properties.width / 2;
        this.properties.y = center.y - this.properties.height / 2;
        this.properties.preset = "standard";
        // Every shape runs this from its constructor, and a component is almost always about to be
        // given the definition it was created for. The default type is a fallback for the one that
        // is not, so an editor that does not carry it still builds the shape and waits for
        // setProperties to say what it draws.
        if (!registration)
            return;
        this.properties.definition = BlockObjects.createComponentInstance(componentType, { name: this.properties.name, source: "developer" });
        Object.assign(this.properties, BlockObjects.getInstancePropertyDefaults(componentType, this.properties.preset));
    }

    getMinimumDrawSize() {
        return { width: 180, height: 180 };
    }

    getDrawGesture() {
        return "box";
    }

    enterEditMode() {
        return false;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.hitArea = this.board.createSvgElement("rect");
        this.hitArea.setAttribute("fill", "transparent");
        this.hitArea.setAttribute("stroke", "none");
        this.hitArea.setAttribute("pointer-events", "all");
        element.appendChild(this.hitArea);
        this.contentGroup = this.board.createSvgElement("g");
        element.appendChild(this.contentGroup);
        return element;
    }

    setProperties(properties) {
        if (properties.definition)
            properties.definition = this.migrateDefinition(properties.definition);
        super.setProperties(properties);
        if (!properties.definition && Object.keys(properties).some(name => this.isComponentParameter(name)))
            BlockObjects.markEdited(this.properties.definition);
        if (Object.keys(properties).some(name => this.isMemoryDataProperty(name)))
            this.refreshModelData();
    }

    setProperty(name, value) {
        super.setProperty(name, value);
        if (name !== "definition" && this.isComponentParameter(name))
            BlockObjects.markEdited(this.properties.definition);
        // Recording writes a sample at a time, so the model is told what it now holds and works it
        // through once, when the recording ends.
        if (this.isMemoryDataProperty(name))
            this.publishModelData();
    }

    migrateDefinition(definition) {
        const migration = BlockMigrations.migrate(definition);
        if (migration.applied.length > 0)
            this.migrationsApplied = migration.applied;
        return BlockObjects.backfillInstanceParameterBindings(migration.definition);
    }

    isComponentParameter(name) {
        return BlockObjects.getComponentParameters(this.getComponentType()).some(parameter => parameter.id === name);
    }

    getComponentType() {
        return BlockObjects.getComponentType(this.properties.definition);
    }

    getComponentRegistration() {
        return BlockRegistry.get(this.getComponentType());
    }

    getShapeIcon() {
        return this.getComponentRegistration()?.icon ?? super.getShapeIcon();
    }

    getShapeThumbnailUrl() {
        const componentType = this.getComponentType();
        return BlockObjectCatalogue.getEntries().find(entry => entry.type === componentType)?.thumbnail_url ?? null;
    }

    getEditableParameters() {
        return BlockObjects.getEditableParameters(this.properties.definition);
    }

    getCompilationContext() {
        return {
            width: Number(this.properties.width) || 180,
            height: Number(this.properties.height) || 180,
            parameters: this.getCompilationParameters(),
            caseNumber: this.getTermCaseNumber("caseNumber"),
            iteration: this.board.calculator.getIteration(),
            playing: this.board.calculator.isPlaying(),
            precision: this.board.calculator.getPrecision(),
            tokens: new BlockTokens(this.properties.preset ?? this.properties.definition?.preset ?? "standard")
        };
    }

    // The character a component wears is chosen by key and drawn from the catalogue, so what the
    // definition needs — the image, the pivot and the shape of the image — is worked out here and
    // handed to the compilation beside the properties the shape holds itself.
    getCompilationParameters() {
        const character = this.getComponentCharacterValues();
        const range = this.getAxisRangeValues();
        if (!character && !this._pointerValues && !range)
            return this.properties;
        return Object.assign({}, this.properties, character, this._pointerValues, range);
    }

    // Auto scale and equal axis are the chart's two, and an object gets them by declaring them: the
    // run is fitted with the margins the chart pads its data with, and the axes are made to share a
    // scale by the same function the chart calls. What they work out is handed to the drawing and to
    // the toolbar, and never written down — the ends the object was set to are still its own.
    hasAxisRangeOptions() {
        return this.isComponentParameter("autoScale") || this.isComponentParameter("equalScales");
    }

    getStoredAxisRange() {
        return {
            xMin: Number(this.properties.minimumX),
            xMax: Number(this.properties.maximumX),
            yMin: Number(this.properties.minimumY),
            yMax: Number(this.properties.maximumY)
        };
    }

    getEffectiveAxisRange() {
        const fitted = this.properties.autoScale === true ? this.getFittedAxisRange() : null;
        const domain = fitted ?? this.getStoredAxisRange();
        if (this.properties.equalScales !== true)
            return domain;
        const plot = this.getPlotBox();
        if (!plot)
            return domain;
        return BlockChartGeometry.equalizeDomain(domain, plot.width, plot.height);
    }

    // What the object is holding, in the units of its own axes. Nothing recorded is nothing to fit.
    getFittedAxisRange() {
        const xValues = [];
        const yValues = [];
        for (const parameter of this.getMemoryParameters()) {
            for (const row of this.readMemory(parameter.id)) {
                xValues.push(BlockMemory.readField(row, "x"));
                yValues.push(BlockMemory.readField(row, "y"));
            }
        }
        if (xValues.length === 0)
            return null;
        return BlockChartGeometry.padDomain(Math.min(...xValues), Math.max(...xValues), Math.min(...yValues), Math.max(...yValues));
    }

    getAxisRangeValues() {
        if (!this.hasAxisRangeOptions())
            return null;
        const domain = this.getEffectiveAxisRange();
        return { minimumX: domain.xMin, maximumX: domain.xMax, minimumY: domain.yMin, maximumY: domain.yMax };
    }

    // Equal axis is about pixels, so it needs the box the drawing plots in. The object says where
    // that is by naming the node "plot"; the box is the same whatever the range is, so the one the
    // last drawing used is the one to measure.
    getPlotBox() {
        const node = BlockRenderer.flatten(this.lastCompilation?.nodes ?? []).find(entry => entry.sourceId === "plot");
        if (!node)
            return null;
        return { width: Number(node.attributes.width), height: Number(node.attributes.height) };
    }

    getCharacterParameter() {
        return BlockObjects.getComponentParameters(this.getComponentType()).find(parameter => parameter.valueType === "character") ?? null;
    }

    getComponentCharacterValues() {
        const parameter = this.getCharacterParameter();
        if (!parameter)
            return null;
        const characterKey = String(this.properties[parameter.id] ?? "");
        if (characterKey === "")
            return null;
        const character = CharacterLibrary.get(characterKey);
        if (!character) {
            this.loadComponentCharacter(characterKey);
            return null;
        }
        const imageUrl = CharacterLibrary.getImageUrl(character);
        CharacterLibrary.loadAspectRatio(imageUrl, () => this.board.markDirty(this));
        return {
            characterImage: imageUrl,
            characterPivotX: character.centerPoint?.x ?? 0.5,
            characterPivotY: character.centerPoint?.y ?? 0.5,
            characterAspect: CharacterLibrary.getAspectRatio(imageUrl) ?? 1
        };
    }

    // Asked for once per key: a draw that is waiting for the definition must not ask again, or the
    // drawing that follows every answer would ask a third time.
    loadComponentCharacter(characterKey) {
        const apiClient = this.board.shell?.modelsApiClient;
        if (!apiClient || this._characterFetchKey === characterKey)
            return;
        this._characterFetchKey = characterKey;
        CharacterLibrary.fetch(characterKey, apiClient)
            .then(() => this.board.markDirty(this))
            .catch(() => {});
    }

    compileComponent() {
        const compiler = this.getComponentCompiler();
        return compiler.compile(this.properties.definition, this.getCompilationContext());
    }

    validateComponent() {
        return this.getComponentValidator().validate(this.properties.definition, this.getCompilationContext());
    }

    draw() {
        super.draw();
        this.applyComponentLayout();
        this.renderComponent();
    }

    applyComponentLayout() {
        const width = Number(this.properties.width) || 0;
        const height = Number(this.properties.height) || 0;
        this.hitArea.setAttribute("x", 0);
        this.hitArea.setAttribute("y", 0);
        this.hitArea.setAttribute("width", width);
        this.hitArea.setAttribute("height", height);
        this.applyShapeTransform(width / 2, height / 2, `translate(${this.properties.x}, ${this.properties.y})`);
    }

    renderComponent() {
        this.lastCompilation = this.compileComponent();
        // Behaviours are attached while the markup is written, and the markup is only rewritten when
        // the drawing changes. Locking a shape or taking interaction away from it changes neither,
        // so the render has to be forced or the listeners from before it was locked live on.
        const interactionState = `${this.isInteractable()}:${this.isLocked()}`;
        if (this._lastInteractionState !== interactionState) {
            this._lastInteractionState = interactionState;
            this.contentGroup._blockMarkupSignature = null;
        }
        BlockRenderer.render(this.contentGroup, this.lastCompilation.nodes, this);
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }

    attachBlockBehaviour(element, behaviour, node) {
        if (behaviour.type === "drag-angle")
            this.attachDragAngleBehaviour(element, behaviour.input, false);
        if (behaviour.type === "drag-rotate")
            this.attachDragAngleBehaviour(element, behaviour.input, true);
        if (behaviour.type === "clickable")
            this.attachClickableBehaviour(element, behaviour.input);
        if (behaviour.type === "remember")
            this.attachRememberBehaviour(element, behaviour.input);
        if (behaviour.type === "forget")
            this.attachForgetBehaviour(element, behaviour.input);
        if (behaviour.type === "track-pointer")
            this.attachTrackPointerBehaviour(element, behaviour.input);
        if (behaviour.type === "drag-axis-tick")
            this.attachAxisTickDragBehaviour(element, behaviour.input);
        if (behaviour.type === "follow-pointer")
            this.attachFollowPointerBehaviour(element, behaviour.input);
    }

    // Where the pointer is, in the units the drawing is scaled in. It is answered while the model is
    // standing still: once it is playing, what the object shows is the iteration on screen, and the
    // pointer has nothing to say about it. Nothing is written to the shape — the values are handed
    // to the next compilation and forgotten — so hovering leaves no edit, no undo and no dirty file.
    attachFollowPointerBehaviour(element, input) {
        if (!this.isInteractable())
            return;
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointermove", event => this.onFollowPointerMove(event, input));
        element.addEventListener("pointerleave", () => this.onFollowPointerLeave());
    }

    onFollowPointerMove(event, input) {
        if (this.board.calculator.isPlaying())
            return;
        const sample = this.getTrackedSample(input, this.getComponentLocalPoint(event));
        this._pointerValues = {
            [input.xParameter]: sample.x,
            [input.yParameter]: sample.y,
            [input.activeParameter]: 1
        };
        this.board.markDirty(this);
    }

    onFollowPointerLeave() {
        if (!this._pointerValues)
            return;
        this._pointerValues = null;
        this.board.markDirty(this);
    }

    // Pulling a tick stretches the axis under it: the end the axis starts from stays where it is and
    // the other end follows, which is the chart's own arithmetic — the new scale is how much value
    // one pixel is worth once the tick has been dragged to where the pointer is.
    attachAxisTickDragBehaviour(element, input) {
        if (!this.isInteractable() || this.isLocked())
            return;
        if (this.getBehaviourProperty({ property: input.minimumProperty }) === null || this.getBehaviourProperty({ property: input.maximumProperty }) === null)
            return;
        element.style.cursor = input.axis === "x" ? "ew-resize" : "ns-resize";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => this.onAxisTickDragStart(event, input));
    }

    onAxisTickDragStart(event, input) {
        event.preventDefault();
        event.stopPropagation();
        const minimum = Number(this.properties[input.minimumProperty]);
        const originPixel = Number(input.originPixel);
        const lengthPixels = Number(input.lengthPixels);
        const tickPixel = input.axis === "x"
            ? originPixel + (Number(input.value) - minimum) / (Number(this.properties[input.maximumProperty]) - minimum) * lengthPixels
            : originPixel - (Number(input.value) - minimum) / (Number(this.properties[input.maximumProperty]) - minimum) * lengthPixels;
        const started = this._axisTickDrag.start(event, {
            tickOffsetValue: Number(input.value) - minimum,
            tickOffsetPixel: input.axis === "x" ? tickPixel - originPixel : originPixel - tickPixel,
            getPixelOffset: moveEvent => {
                const point = this.getComponentLocalPoint(moveEvent);
                return input.axis === "x" ? point.x - originPixel : originPixel - point.y;
            },
            onMove: newScale => {
                this.setProperty(input.maximumProperty, minimum + newScale * lengthPixels);
                this.board.markDirty(this);
            },
            onEnd: () => {
                this.board.pointerLocked = false;
                this.dragEnd();
            }
        });
        if (!started)
            return;
        this.board.pointerLocked = true;
        this.dragStart();
    }

    // A memory is a parameter of the object like any other, so writing one is writing a property:
    // the model carries it, undo restores it and collaboration sends it with nothing else to do.
    getMemoryParameter(input) {
        const memory = String(input.memory ?? "");
        if (memory === "" || !this.isComponentParameter(memory))
            return null;
        return memory;
    }

    isMemoryInteractionAllowed() {
        return this.isInteractable() && !this.isLocked();
    }

    readMemory(memory) {
        return BlockMemory.read(this.properties, memory);
    }

    appendMemoryRow(memory, row, limit) {
        const rows = BlockMemory.append(this.readMemory(memory), row, limit);
        this.setProperty(memory, rows);
        return rows;
    }

    attachRememberBehaviour(element, input) {
        const memory = this.getMemoryParameter(input);
        if (memory === null || !this.isMemoryInteractionAllowed())
            return;
        element.style.cursor = "pointer";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => {
            event.preventDefault();
            this.beginClickEdit();
            this.appendMemoryRow(memory, BlockMemory.createRow(input.text, input.x, input.y), input.limit);
            this.refreshModelData();
        });
    }

    attachForgetBehaviour(element, input) {
        const memory = this.getMemoryParameter(input);
        if (memory === null || !this.isMemoryInteractionAllowed())
            return;
        element.style.cursor = "pointer";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => {
            event.preventDefault();
            this.beginClickEdit();
            this.setProperty(memory, []);
            this.refreshModelData();
        });
    }

    attachTrackPointerBehaviour(element, input) {
        const memory = this.getMemoryParameter(input);
        if (memory === null || !this.isMemoryInteractionAllowed())
            return;
        element.style.cursor = "crosshair";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => this.onTrackPointerStart(event, input, memory));
    }

    // The whole drag is one recording: it opens with the pointer going down, samples on its own
    // clock so a pause is recorded as a pause rather than as nothing, and closes as one edit.
    onTrackPointerStart(event, input, memory) {
        if (!this.isMemoryInteractionAllowed())
            return;
        event.preventDefault();
        this.board.pointerLocked = true;
        this._trackInput = input;
        this._trackMemory = memory;
        this._trackPoint = this.getComponentLocalPoint(event);
        this.dragStart();
        if (input.mode === "replace")
            this.setProperty(memory, []);
        this._trackMove = moveEvent => { this._trackPoint = this.getComponentLocalPoint(moveEvent); };
        this._trackEnd = () => this.onTrackPointerEnd();
        window.addEventListener("pointermove", this._trackMove);
        window.addEventListener("pointerup", this._trackEnd);
        window.addEventListener("pointercancel", this._trackEnd);
        this.recordTrackedSample();
        this._trackTimer = setInterval(() => this.recordTrackedSample(), Math.max(10, Number(input.sampleMs)));
    }

    recordTrackedSample() {
        const input = this._trackInput;
        const sample = this.getTrackedSample(input, this._trackPoint);
        this.appendMemoryRow(this._trackMemory, BlockMemory.createRow("", sample.x, sample.y), input.limit);
    }

    // What is recorded is a pair of values, not a pair of pixels: the node hands over the origin and
    // the scale it is drawn with, so the sample means the same thing the axes beside it read.
    getTrackedSample(input, point) {
        const scaleX = Number(input.scaleX) || 1;
        const scaleY = Number(input.scaleY) || 1;
        return {
            x: this.clampSampleValue((point.x - Number(input.originX)) / scaleX, input.minimumX, input.maximumX),
            y: this.clampSampleValue((point.y - Number(input.originY)) / scaleY, input.minimumY, input.maximumY)
        };
    }

    clampSampleValue(value, minimum, maximum) {
        let result = value;
        if (minimum !== null && minimum !== undefined && Number.isFinite(Number(minimum)))
            result = Math.max(Number(minimum), result);
        if (maximum !== null && maximum !== undefined && Number.isFinite(Number(maximum)))
            result = Math.min(Number(maximum), result);
        return result;
    }

    onTrackPointerEnd() {
        clearInterval(this._trackTimer);
        window.removeEventListener("pointermove", this._trackMove);
        window.removeEventListener("pointerup", this._trackEnd);
        window.removeEventListener("pointercancel", this._trackEnd);
        this._trackTimer = null;
        this._trackMove = null;
        this._trackEnd = null;
        this.board.pointerLocked = false;
        this.dragEnd();
        this.refreshModelData();
    }

    // A memory whose fields name model terms is measurements: the model takes row i as iteration i,
    // the way it takes a data table's rows, and everything reading those terms — a chart, a table,
    // a body — reads the recording without knowing where it came from. The values stay on the shape
    // as well, because that is what the file, undo and collaboration carry.
    getMemoryParameters() {
        return BlockObjects.getComponentParameters(this.getComponentType()).filter(parameter => parameter.valueType === "memory");
    }

    getMemorySourceId(parameterId) {
        return `memory:${this.id}:${parameterId}`;
    }

    buildMemorySeries(parameter) {
        const fieldTerms = {};
        for (const [field, termParameter] of Object.entries(parameter.termParameters ?? {})) {
            const termName = String(this.properties[termParameter] ?? "");
            // A name the model works out for itself would be overwritten by the recording, so the
            // column is left out and the model keeps its own answer.
            if (termName === "" || !this.board.calculator.isEditable(termName))
                continue;
            fieldTerms[field] = termName;
        }
        return BlockMemory.toTermSeries(this.readMemory(parameter.id), fieldTerms);
    }

    isMemoryDataProperty(name) {
        for (const parameter of this.getMemoryParameters()) {
            if (parameter.id === name || Object.values(parameter.termParameters ?? {}).includes(name))
                return true;
        }
        return false;
    }

    publishModelData() {
        let feedsModel = false;
        for (const parameter of this.getMemoryParameters()) {
            const series = this.buildMemorySeries(parameter);
            this.board.calculator.setDataSource(this.getMemorySourceId(parameter.id), series.names, series.values);
            feedsModel = feedsModel || series.names.length > 0;
        }
        return feedsModel;
    }

    // The editing path: the model is holding different measurements now, so it works them through
    // and everything reading them is redrawn, exactly as editing a data table does.
    refreshModelData() {
        if (!this.publishModelData())
            return;
        this.board.calculator.refreshDataSources();
    }

    attachDragAngleBehaviour(element, input, relative = false) {
        if (!this.isAngleDragAllowed(input)) {
            this.markWriteLocked(element, input);
            return;
        }
        element.style.cursor = "grab";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => this.onAngleDragStart(event, input, relative));
        this.attachAngleDragHover(element, input);
    }

    // A grab area with no fill of its own is invisible, so the pointer has nothing to find. Filling
    // it faintly while the pointer rests on it shows how far the area reaches. The move handle that
    // covers a selected shape forwards pointermove and pointerleave but not pointerenter, so the
    // highlight is driven by those two.
    attachAngleDragHover(element, input) {
        const fill = String(input.hoverFill ?? "none");
        if (fill === "none" || fill === "")
            return;
        const opacity = Number(input.hoverOpacity);
        element.addEventListener("pointermove", () => {
            element.setAttribute("fill", fill);
            element.setAttribute("fill-opacity", Number.isFinite(opacity) ? opacity : 0.15);
        });
        element.addEventListener("pointerleave", () => {
            element.setAttribute("fill", "none");
            element.removeAttribute("fill-opacity");
        });
    }

    // A target reading a value the model works out for itself can never be written. Saying so with
    // the same cursor a locked handle uses beats no feedback at all. A target reading a plain number
    // is left alone: nothing there refuses the write, so there is nothing to explain.
    markWriteLocked(element, input) {
        if (!this.isInteractable() || this.isLocked())
            return;
        if (!this.board.calculator.isTerm(String(input.variable ?? "")))
            return;
        element.style.cursor = "not-allowed";
        element.setAttribute("pointer-events", "all");
    }

    attachClickableBehaviour(element, input) {
        if (!this.isClickAllowed(input)) {
            this.markWriteLocked(element, input);
            return;
        }
        element.style.cursor = "pointer";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => {
            event.preventDefault();
            this.writeClickValue(input, Number(input.value));
        });
    }

    isClickAllowed(input) {
        if (!this.isInteractable() || this.isLocked())
            return false;
        const variable = String(input.variable ?? "");
        if (this.board.calculator.isTerm(variable))
            return this.board.calculator.isEditable(variable);
        return this.getBehaviourProperty(input) !== null;
    }

    writeClickValue(input, value) {
        const property = this.getBehaviourProperty(input);
        if (this.board.calculator.isTerm(String(input.variable ?? "")) || property === null) {
            this.writeModelValue(input.variable, value);
            return;
        }
        this.beginClickEdit();
        this.setProperty(property, value);
        this.board.markDirty(this);
    }

    beginClickEdit() {
        if (this._clickEditOpen)
            return;
        this._clickEditOpen = true;
        this.dragStart();
        queueMicrotask(() => {
            this._clickEditOpen = false;
            this.dragEnd();
        });
    }

    isAngleDragAllowed(input) {
        if (!this.isInteractable() || this.isLocked())
            return false;
        const variable = String(input.variable ?? "");
        if (variable === "")
            return false;
        if (this.board.calculator.isTerm(variable))
            return this.board.calculator.isEditable(variable);
        // A property showing a plain number is edited on the shape itself, the way a gauge edits its
        // own value when it is not bound to a term.
        return this.getBehaviourProperty(input) !== null;
    }

    getBehaviourProperty(input) {
        const property = String(input.property ?? "");
        if (property === "" || !this.isComponentParameter(property))
            return null;
        return property;
    }

    // A drag that writes a property changes the drawing itself rather than the model, so it belongs
    // in the undo history the way any other property edit does.
    isAngleDragPropertyWrite(input) {
        return !this.board.calculator.isTerm(String(input.variable ?? "")) && this.getBehaviourProperty(input) !== null;
    }

    onAngleDragStart(event, input, relative = false) {
        // Asked again here because the model can stop letting a variable be written between the
        // moment the listener went on and the moment the pointer comes down.
        if (!this.isAngleDragAllowed(input))
            return;
        event.preventDefault();
        this.board.pointerLocked = true;
        this._angleDragInput = input;
        this._angleDragTurn = relative ? this.startAngleDragTurn(event, input) : null;
        this._angleDragRecordsUndo = this.isAngleDragPropertyWrite(input);
        if (this._angleDragRecordsUndo)
            this.dragStart();
        this._angleDragMove = moveEvent => this.onAngleDragMove(moveEvent, input);
        this._angleDragEnd = () => this.onAngleDragEnd();
        window.addEventListener("pointermove", this._angleDragMove);
        window.addEventListener("pointerup", this._angleDragEnd);
        window.addEventListener("pointercancel", this._angleDragEnd);
        // A relative drag turns the object by however far the pointer travels, so the grab itself
        // must not move it. An absolute drag points the object at the pointer straight away.
        if (!relative)
            this.onAngleDragMove(event, input);
    }

    // Remembers where the object stood when it was grabbed, so the pointer angle can be read as a
    // turn from that point instead of as the value itself.
    startAngleDragTurn(event, input) {
        const value = this.readAngleDragValue(input);
        return {
            lastDegrees: this.getAngleDragDegrees(event, input),
            turnedDegrees: 0,
            startValue: Number.isFinite(value) ? value : 0
        };
    }

    advanceAngleDragTurn(pointerDegrees) {
        const turn = this._angleDragTurn;
        if (turn.lastDegrees !== null)
            turn.turnedDegrees += BlockGeometry.normalizeSignedDegrees(pointerDegrees - turn.lastDegrees);
        turn.lastDegrees = pointerDegrees;
        return turn.turnedDegrees;
    }

    getAngleDragDegrees(event, input) {
        const localPoint = this.getComponentLocalPoint(event);
        const deltaX = localPoint.x - Number(input.centerX);
        const deltaY = localPoint.y - Number(input.centerY);
        if (Math.hypot(deltaX, deltaY) < 2)
            return null;
        return BlockGeometry.normalizeDegrees(Math.atan2(deltaX, -deltaY) * 180 / Math.PI);
    }

    onAngleDragMove(event, input) {
        const rotationDegrees = this.getAngleDragDegrees(event, input);
        if (rotationDegrees === null)
            return;
        const degreesPerUnit = Number(input.degreesPerUnit) || 6;
        let value = this._angleDragTurn
            ? this._angleDragTurn.startValue + this.advanceAngleDragTurn(rotationDegrees) / degreesPerUnit
            : (rotationDegrees - (Number(input.offsetDegrees) || 0)) / degreesPerUnit;
        const wrapAt = Number(input.wrapAt);
        if (Number.isFinite(wrapAt) && wrapAt > 0)
            value = ((value % wrapAt) + wrapAt) % wrapAt;
        if (input.minimum !== null && input.minimum !== undefined && Number.isFinite(Number(input.minimum)))
            value = Math.max(Number(input.minimum), value);
        if (input.maximum !== null && input.maximum !== undefined && Number.isFinite(Number(input.maximum)))
            value = Math.min(Number(input.maximum), value);
        this.writeAngleDragValue(input, value);
    }

    onAngleDragEnd() {
        window.removeEventListener("pointermove", this._angleDragMove);
        window.removeEventListener("pointerup", this._angleDragEnd);
        window.removeEventListener("pointercancel", this._angleDragEnd);
        this._angleDragMove = null;
        this._angleDragEnd = null;
        this._angleDragTurn = null;
        this.board.pointerLocked = false;
        if (this._angleDragRecordsUndo)
            this.dragEnd();
        this._angleDragRecordsUndo = false;
    }

    // A drag target reads and writes the same place: a model term when the property names one, and
    // the property itself when it holds a plain number.
    readAngleDragValue(input) {
        const variable = String(input.variable ?? "");
        const value = this.board.calculator.isTerm(variable)
            ? this.board.calculator.getByName(variable, this.getTermCaseNumber("caseNumber"))
            : Number(variable);
        return Number.isFinite(Number(value)) ? Number(value) : 0;
    }

    writeAngleDragValue(input, value) {
        const property = this.getBehaviourProperty(input);
        if (this.board.calculator.isTerm(String(input.variable ?? "")) || property === null) {
            this.writeModelValue(input.variable, value);
            return;
        }
        this.setProperty(property, Utils.roundToPrecision(value, this.board.calculator.getPrecision()));
        this.board.markDirty(this);
    }

    getComponentLocalPoint(event) {
        const boardPoint = this.board.getMouseToSvgPoint(event);
        const unrotated = this.getLocalPointFromBoardPoint(boardPoint);
        const position = this.getBoardPosition();
        return { x: unrotated.x - position.x, y: unrotated.y - position.y };
    }

    writeModelValue(variableName, value) {
        const calculator = this.board.calculator;
        if (!calculator.isTerm(variableName))
            return;
        const roundedValue = Utils.roundToPrecision(value, calculator.getPrecision());
        calculator.setTermValue(variableName, roundedValue, calculator.getIteration(), this.getTermCaseNumber("caseNumber"));
        calculator.calculate();
        this.board.markDirty(this);
    }

    getInspectionReport() {
        const compilation = this.compileComponent();
        const validation = this.validateComponent();
        const dependencies = this.getComponentCompiler().collectDependencies(this.properties.definition);
        return {
            shapeId: this.id,
            name: this.properties.name,
            componentType: this.getComponentType(),
            schemaVersion: this.properties.definition?.schemaVersion ?? null,
            preset: this.properties.preset ?? "standard",
            metadata: this.properties.definition?.metadata ?? null,
            migrationsApplied: this.migrationsApplied ?? [],
            stats: compilation.stats,
            diagnostics: compilation.diagnostics,
            validation: { valid: validation.valid, errors: validation.errors, warnings: validation.warnings },
            dependencies: dependencies,
            parameters: this.getEditableParameters().map(parameter => ({
                id: parameter.id,
                label: parameter.label,
                valueType: parameter.valueType,
                value: this.properties[parameter.id],
                resolved: parameter.valueType === "variable" ? this.board.calculator.getByName(String(this.properties[parameter.id]), 1) : undefined
            })),
            nodes: BlockRenderer.flatten(compilation.nodes).map(node => ({
                id: node.id,
                sourceType: node.sourceType,
                sourceComponent: node.sourceComponent,
                sourceComponentId: node.sourceComponentId,
                sourcePath: node.sourcePath,
                tag: node.tag,
                transform: node.transform,
                behaviours: node.behaviours.map(behaviour => behaviour.type)
            }))
        };
    }

    toPreviewSvg() {
        const compilation = this.compileComponent();
        return BlockRenderer.toStandaloneSvg(compilation.nodes, Number(this.properties.width) || 180, Number(this.properties.height) || 180, "none");
    }

    getClipboardData() {
        const data = super.getClipboardData();
        data.objects = BlockObjectLibrary.collectFromShapes([this]);
        return data;
    }
}

var ComponentWidget = ComponentShape;

BaseShape.registerPastedObjects = objects => BlockObjectLibrary.registerAll(objects);
