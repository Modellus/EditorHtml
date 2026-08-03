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
        return migration.definition;
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
        BlockRenderer.render(this.contentGroup, this.lastCompilation.nodes, this);
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }

    attachBlockBehaviour(element, behaviour, node) {
        if (behaviour.type === "drag-angle")
            this.attachDragAngleBehaviour(element, behaviour.input);
        if (behaviour.type === "clickable")
            this.attachClickableBehaviour(element, behaviour.input);
    }

    attachDragAngleBehaviour(element, input) {
        if (!this.isAngleDragAllowed(input))
            return;
        element.style.cursor = "grab";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => this.onAngleDragStart(event, input));
    }

    attachClickableBehaviour(element, input) {
        if (!this.isInteractable() || this.isLocked())
            return;
        element.style.cursor = "pointer";
        element.setAttribute("pointer-events", "all");
        element.addEventListener("pointerdown", event => {
            event.preventDefault();
            this.writeModelValue(input.variable, Number(input.value));
        });
    }

    isAngleDragAllowed(input) {
        if (!this.isInteractable() || this.isLocked())
            return false;
        const variable = String(input.variable ?? "");
        if (variable === "" || !this.board.calculator.isTerm(variable))
            return false;
        return this.board.calculator.isEditable(variable);
    }

    onAngleDragStart(event, input) {
        event.preventDefault();
        this.board.pointerLocked = true;
        this._angleDragInput = input;
        this._angleDragMove = moveEvent => this.onAngleDragMove(moveEvent, input);
        this._angleDragEnd = () => this.onAngleDragEnd();
        window.addEventListener("pointermove", this._angleDragMove);
        window.addEventListener("pointerup", this._angleDragEnd);
        window.addEventListener("pointercancel", this._angleDragEnd);
        this.onAngleDragMove(event, input);
    }

    onAngleDragMove(event, input) {
        const localPoint = this.getComponentLocalPoint(event);
        const deltaX = localPoint.x - Number(input.centerX);
        const deltaY = localPoint.y - Number(input.centerY);
        if (Math.hypot(deltaX, deltaY) < 2)
            return;
        const rotationDegrees = BlockGeometry.normalizeDegrees(Math.atan2(deltaX, -deltaY) * 180 / Math.PI);
        const degreesPerUnit = Number(input.degreesPerUnit) || 6;
        let value = (rotationDegrees - (Number(input.offsetDegrees) || 0)) / degreesPerUnit;
        const wrapAt = Number(input.wrapAt);
        if (Number.isFinite(wrapAt) && wrapAt > 0)
            value = ((value % wrapAt) + wrapAt) % wrapAt;
        if (input.minimum !== null && input.minimum !== undefined && Number.isFinite(Number(input.minimum)))
            value = Math.max(Number(input.minimum), value);
        if (input.maximum !== null && input.maximum !== undefined && Number.isFinite(Number(input.maximum)))
            value = Math.min(Number(input.maximum), value);
        this.writeModelValue(input.variable, value);
    }

    onAngleDragEnd() {
        window.removeEventListener("pointermove", this._angleDragMove);
        window.removeEventListener("pointerup", this._angleDragEnd);
        window.removeEventListener("pointercancel", this._angleDragEnd);
        this._angleDragMove = null;
        this._angleDragEnd = null;
        this.board.pointerLocked = false;
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
}

var ComponentWidget = ComponentShape;
