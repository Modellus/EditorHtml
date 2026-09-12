class Workspace {
    constructor(session = null) {
        this._session = session;
        this.playerViewAdapter = null;
        this.workspaceSurfaceAdapter = null;
    }

    get session() {
        return this._session;
    }

    set session(session) {
        this._session = session;
    }

    get calculator() {
        return this.session?.calculator ?? null;
    }

    get properties() {
        return this.session?.properties ?? null;
    }

    // A unit belongs to the term, not to the surface reading it, so every workspace writes one the
    // same way: the map is rewritten whole — an entry cleared by merging would never go — and handed
    // to whatever that workspace records model properties with.
    setTermUnitCommand(termName, unitText) {
        if (!termName || !this.properties)
            return false;
        const termUnits = Object.assign({}, this.properties.termUnits);
        const normalizedUnit = String(unitText ?? "").trim();
        if (normalizedUnit === "")
            delete termUnits[termName];
        else
            termUnits[termName] = normalizedUnit;
        this.writeTermUnits(termUnits);
        return true;
    }

    writeTermUnits(termUnits) {
        this.properties.termUnits = Utils.normalizeTermUnits(termUnits);
        this.calculator?.setTermUnits(this.properties.termUnits);
    }

    getIndependentStart() {
        return Number(this.calculator?.properties?.independent?.start ?? 0);
    }

    getIndependentEnd() {
        return Number(this.calculator?.properties?.independent?.end ?? 10);
    }

    getIndependentStep() {
        return Number(this.calculator?.properties?.independent?.step ?? 0.1);
    }

    getIndependentName() {
        return String(this.calculator?.properties?.independent?.name ?? "t");
    }

    getIterationCount() {
        if (!this.calculator)
            return 1;
        return Math.max(1, this.calculator.getFinalIteration());
    }

    setIndependentStart(value) {
        if (!this.calculator)
            return;
        this.calculator.properties.independent.start = value;
    }

    setIndependentEnd(value) {
        if (!this.calculator)
            return;
        this.calculator.properties.independent.end = value;
    }

    setIndependentStep(value) {
        if (!this.calculator)
            return;
        this.calculator.properties.independent.step = value;
    }

    setIndependentName(value) {
        if (!this.calculator)
            return;
        this.calculator.properties.independent.name = value;
    }

    bindWorkspaceIterate(handler) {
        if (!this.calculator)
            return;
        if (this._workspaceIterateHandler)
            this.calculator.off("iterate", this._workspaceIterateHandler);
        this._workspaceIterateHandler = handler;
        this.calculator.on("iterate", this._workspaceIterateHandler);
    }

    unbindWorkspaceIterate() {
        if (!this.calculator || !this._workspaceIterateHandler)
            return;
        this.calculator.off("iterate", this._workspaceIterateHandler);
        this._workspaceIterateHandler = null;
    }

    calculatorSetIteration(value) {
        if (!this.calculator)
            return;
        this.calculator.setIteration(value);
    }

    calculatorStepBackward() {
        if (!this.calculator)
            return;
        this.calculator.stepBackward();
    }

    calculatorStepForward() {
        if (!this.calculator)
            return;
        this.calculator.stepForward();
    }

    calculatorPlay() {
        if (!this.calculator)
            return;
        this.calculator.play();
    }

    calculatorPause() {
        if (!this.calculator)
            return;
        this.calculator.pause();
    }

    calculatorReplay() {
        if (!this.calculator)
            return;
        this.calculator.replay();
    }

    isCalculatorPlaying() {
        if (!this.calculator)
            return false;
        return this.calculator.status === STATUS.PLAYING;
    }

    onBeforePlayback() {}

    toggleCalculatorPlayback() {
        if (this.isCalculatorPlaying()) {
            this.calculatorPause();
            return false;
        }
        this.onBeforePlayback();
        this.calculatorPlay();
        return true;
    }

    replayCalculatorPlayback() {
        this.onBeforePlayback();
        this.calculatorReplay();
    }

    setPlayerViewAdapter(adapter) {
        this.playerViewAdapter = adapter;
    }

    setWorkspaceSurfaceAdapter(adapter) {
        this.workspaceSurfaceAdapter = adapter;
    }

    refreshWorkspaceSurface() {
        if (!this.workspaceSurfaceAdapter)
            return;
        this.workspaceSurfaceAdapter.refresh?.();
    }

    forceRefreshWorkspaceSurface() {
        if (!this.workspaceSurfaceAdapter)
            return;
        this.workspaceSurfaceAdapter.forceRefresh?.();
    }

    reparseAndCalculateWorkspace(reparseWorkspace) {
        if (typeof reparseWorkspace === "function")
            reparseWorkspace();
        if (!this.calculator)
            return;
        this.calculator.calculate();
    }

    reparseCalculateAndRefreshWorkspace(reparseWorkspace, forceRefresh = false) {
        if (typeof reparseWorkspace === "function")
            reparseWorkspace();
        if (!this.calculator)
            return;
        this.calculator.calculate();
        if (forceRefresh)
            this.forceRefreshWorkspaceSurface();
        else
            this.refreshWorkspaceSurface();
    }

    updatePlayerIcon(icon, setIcon) {
        if (typeof setIcon === "function")
            setIcon(icon);
        if (!this.playerViewAdapter)
            return;
        this.playerViewAdapter.setPlayPauseIcon?.(icon);
    }

    updatePlayerSliderValue(value) {
        if (!this.playerViewAdapter)
            return;
        this.playerViewAdapter.setSliderValue?.(value);
    }

    updatePlayerSliderRange(maximum) {
        if (!this.playerViewAdapter)
            return;
        this.playerViewAdapter.setSliderRange?.(maximum);
    }

    syncPlayerIterationFromCalculator() {
        if (!this.calculator)
            return;
        this.updatePlayerSliderValue(this.calculator.getIteration());
    }

    setPlayerUiState(isPlaying, setIcon) {
        this.isPlaying = isPlaying;
        const icon = isPlaying ? "fa-light fa-pause" : "fa-light fa-play";
        this.updatePlayerIcon(icon, setIcon);
    }

    startPlayerUiState(setIcon) {
        this.setPlayerUiState(true, setIcon);
    }

    stopPlayerUiState(setIcon) {
        this.setPlayerUiState(false, setIcon);
    }

    resetToFirstMoment() {
        this.reparseAndCalculateWorkspace();
    }

    setTermValues(entries = [], publishChanges = true) {
        const calculator = this.calculator;
        if (!calculator)
            return { applied: [], rejected: [], reset: false };
        const applied = [];
        const rejected = [];
        const iterations = [];
        for (const entry of entries ?? []) {
            const termName = String(entry?.term ?? "");
            const iteration = Math.max(1, Math.floor(Number(entry?.iteration) || 1));
            const caseNumber = Math.floor(Number(entry?.case) || 1);
            const value = Number(entry?.value);
            const rejection = { term: termName, iteration: iteration, case: caseNumber, reason: "" };
            if (!Number.isFinite(value))
                rejection.reason = `"${entry?.value}" is not a number.`;
            else if (!calculator.isTerm(termName))
                rejection.reason = `The model has no term called "${termName}".`;
            else if (!calculator.isUserInputTerm(termName))
                rejection.reason = `"${termName}" is worked out by the model, so a value cannot be written into it.`;
            else if (!calculator.setUserInput(termName, value, iteration, caseNumber))
                rejection.reason = `Case ${caseNumber} is outside the ${calculator.normalizeCasesCount(this.properties?.casesCount)} the model runs.`;
            if (rejection.reason !== "") {
                rejected.push(rejection);
                continue;
            }
            applied.push({ term: termName, value: value, iteration: iteration, case: caseNumber });
            iterations.push(iteration);
        }
        if (applied.length === 0)
            return { applied: applied, rejected: rejected, reset: false };
        const reset = publishChanges ? this.publishTermValueChanges(iterations) : false;
        return { applied: applied, rejected: rejected, reset: reset };
    }

    getValuesDigest(sampleSize = 8) {
        const calculator = this.calculator;
        if (!calculator)
            return null;
        const termNames = calculator.getTermsNames();
        const casesCount = calculator.normalizeCasesCount(this.properties?.casesCount);
        const lastIteration = calculator.getLastCalculatedIteration();
        const sampledIterations = this.pickSampleIterations(lastIteration, sampleSize);
        const cases = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            cases.push({
                case: caseNumber,
                ranges: this.readTermRanges(termNames, lastIteration, caseNumber),
                sample: this.readSampleRows(sampledIterations, caseNumber)
            });
        return { terms: termNames, iterations: lastIteration, casesCount: casesCount, sampledIterations: sampledIterations, cases: cases };
    }

    pickSampleIterations(lastIteration, sampleSize) {
        if (lastIteration < 1)
            return [];
        const count = Math.min(Math.max(2, Math.floor(Number(sampleSize) || 8)), lastIteration);
        if (count < 2)
            return [1];
        const step = (lastIteration - 1) / (count - 1);
        const iterations = [];
        for (let index = 0; index < count; index++)
            iterations.push(Math.round(1 + index * step));
        return Array.from(new Set(iterations));
    }

    readTermRanges(termNames, lastIteration, caseNumber) {
        const ranges = {};
        for (const termName of termNames) {
            let minimum = Number.POSITIVE_INFINITY;
            let maximum = Number.NEGATIVE_INFINITY;
            let first = null;
            let last = null;
            for (let iteration = 1; iteration <= lastIteration; iteration++) {
                const value = this.calculator.system.getByNameOnIteration(iteration, termName, caseNumber);
                if (!Number.isFinite(value))
                    continue;
                if (value < minimum)
                    minimum = value;
                if (value > maximum)
                    maximum = value;
                if (first === null)
                    first = value;
                last = value;
            }
            if (first === null)
                continue;
            ranges[termName] = { minimum: minimum, maximum: maximum, first: first, last: last };
        }
        return ranges;
    }

    readSampleRows(iterations, caseNumber) {
        return iterations.map(iteration => Object.assign({ iteration: iteration }, this.calculator.system.getIteration(iteration, caseNumber)));
    }

    publishTermValueChanges(iterations = []) {
        const calculator = this.calculator;
        if (!calculator)
            return false;
        if (iterations.some(iteration => calculator.hasMomentElapsed(iteration))) {
            this.resetToFirstMoment();
            return true;
        }
        calculator.calculate();
        return false;
    }

    serializeWorkspace(surfaceKey, serializeSurface) {
        const result = this.session ? this.session.serialize() : {};
        if (surfaceKey && typeof serializeSurface === "function")
            result[surfaceKey] = serializeSurface();
        return result;
    }

    applySerializedSession(model, applyProperties) {
        if (!this.session || !model)
            return;
        this.session.pendingInitialValuesByCase = model?.properties?.initialValuesByCase ?? model?.properties?.initialValues;
        this.session.pendingUserInputsByCase = model?.properties?.userInputsByCase;
        applyProperties(model.properties);
        this.calculator.loadOutlierIterations(model?.outlierIterations);
        this.calculator.loadRegressionTerms(model?.regressionTerms);
    }
}
