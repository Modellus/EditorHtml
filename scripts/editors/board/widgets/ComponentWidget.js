class ComponentShape extends BaseShape {
    static defaultComponentType = "analogue-clock";

    constructor(board, parent, id) {
        super(board, null, id);
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
    }

    setProperty(name, value) {
        super.setProperty(name, value);
        if (name !== "definition" && this.isComponentParameter(name))
            BlockObjects.markEdited(this.properties.definition);
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

    getEditableParameters() {
        return BlockObjects.getEditableParameters(this.properties.definition);
    }

    getCompilationContext() {
        return {
            width: Number(this.properties.width) || 180,
            height: Number(this.properties.height) || 180,
            parameters: this.properties,
            caseNumber: this.getTermCaseNumber("caseNumber"),
            tokens: new BlockTokens(this.properties.preset ?? this.properties.definition?.preset ?? "standard")
        };
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
