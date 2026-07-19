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

    serializeWorkspace(surfaceKey, serializeSurface) {
        const result = this.session ? this.session.serialize() : {};
        if (surfaceKey && typeof serializeSurface === "function")
            result[surfaceKey] = serializeSurface();
        return result;
    }

    applySerializedSession(model, applyProperties) {
        if (!this.session || !model)
            return;
        this.session.pendingInitialValuesByCase = model?.properties?.initialValuesByCase ?? model?.properties?.initialValues ?? null;
        this.session.pendingUserInputsByCase = model?.properties?.userInputsByCase ?? null;
        applyProperties(model.properties);
        this.calculator.loadOutlierIterations(model?.outlierIterations);
        this.calculator.loadRegressionTerms(model?.regressionTerms);
    }
}
