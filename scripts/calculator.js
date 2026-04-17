// @ts-check
/// <reference path="../libraries/types/global.d.ts" />

const STATUS = { PLAYING: 0, PAUSED: 1, REPLAYING: 2, STOPPED: 3 };

class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t", "n");
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.physicalEngine = new Modellus.PhysicalEngine(this.system);
        this.status = STATUS.STOPPED;
        this.properties = this.createDefaultProperties();
        this.setDefaults();
    }

    createDefaultProperties() {
        return { precision: 2, angleUnit: "radians", independent: { name: "t", start: 0, end: 10, step: 0.1, noLimit: false }, iterationTerm: "n", casesCount: 1, initialValuesByCase: {}, iterationDuration: null };
    }

    setDefaults() {
        this.properties = this.createDefaultProperties();
        this.preloadedTermNames = null;
        this.preloadedTermValues = null;
    }

    normalizeCasesCount(value = 1) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue))
            return 1;
        const normalizedValue = Math.floor(numericValue);
        if (normalizedValue < 1)
            return 1;
        if (normalizedValue > 9)
            return 9;
        return normalizedValue;
    }

    setProperties(properties = this.createDefaultProperties()) {
        Utils.mergeProperties(properties, this.properties);
        this.properties.casesCount = this.normalizeCasesCount(this.properties.casesCount);
        this.reset();
    }

    setProperty(name = "", value = 0) {
        if (name === "casesCount")
            value = this.normalizeCasesCount(value);
        Utils.setProperty(name, value, this.properties);
        this.reset();
    }

    emit(eventName = "", detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.dispatchEvent(event);
    }

    on(eventName = "", callback = () => {}) {
        this.addEventListener(eventName, callback);
    }

    off(eventName = "", callback = () => {}) {
        this.removeEventListener(eventName, callback);
    }

    _iterate = () => {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            clearTimeout(this.frameId);
        }
        if (this.status != STATUS.PLAYING)
            return;
        if (!this.properties.independent.noLimit && Math.abs(this.system.getIndependent() - this.properties.independent.end) < this.properties.independent.step / 10.0)
            this.pause();
        else
            this.engine.iterate();
        this.emit("iterate", { calculator: this });     
        if (this.status == STATUS.PLAYING) {
            const delayMs = this.properties.iterationDuration > 0 ? this.properties.iterationDuration * 1000 : 0;
            this.frameId = delayMs > 0 ? setTimeout(this._iterate, delayMs) : requestAnimationFrame(this._iterate);
        }
    }

    calculate() {
        this.system.calculateFunctions();
        this.emit("iterate", { calculator: this });
    }

    play() {
        this.status = STATUS.PLAYING;
        this._iterate();
    }

    pause() {
        this.status = STATUS.PAUSED;
    }

    stop() {
        this.engine.reset();
        this.status = STATUS.STOPPED;
    }

    stepBackward() {
        this.system.iteration--;
        this.emit("iterate", { calculator: this });
    }

    stepForward() {
        this.system.iteration++;
        this.emit("iterate", { calculator: this });
    }

    _replay = () => {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            clearTimeout(this.frameId);
        }
        this.emit("iterate", { calculator: this }); 
        if (this.system.iteration > this.system.lastIteration)
            this.system.iteration = 1;
        if (this.status == STATUS.PLAYING) {
            this.system.iteration++;
            const delayMs = this.properties.iterationDuration > 0 ? this.properties.iterationDuration * 1000 : 0;
            this.frameId = delayMs > 0 ? setTimeout(this._replay, delayMs) : requestAnimationFrame(this._replay);
        }
    }

    replay() {
        this.status = STATUS.PLAYING;
        this.system.iteration = 1;
        this._replay();
    }

    clear() {
        this.setDefaults();
        this.reset();
    }

    reset() {
        this.system.clear();
        this.system.independent = this.properties.independent.name;
        this.system.setInitialIndependent(this.properties.independent.start);
        this.system.step = this.properties.independent.step;
        this.system.iterationTerm = this.properties.iterationTerm;
        this.system.useRadians = this.properties.angleUnit === "radians";
        this.properties.casesCount = this.normalizeCasesCount(this.properties.casesCount);
        this.system.casesCount = this.properties.casesCount;
        this.engine.reset();
        this.system.reset();
        this.physicalEngine.bodies = [];
        this.physicalEngine.physicsConstantsRegistered = false;
        this.status = STATUS.STOPPED;
        this.clearHook();
    }

    addPhysicalBody(name, mass = 1) {
        this.physicalEngine.addBody(new Modellus.PhysicalBody(name, mass));
    }

    removePhysicalBody(name) {
        this.physicalEngine.bodies = this.physicalEngine.bodies.filter(body => body.name !== name);
    }

    setHook(hookFunctionBody) {
        this.hookFunction = new Function("values", "setTermValue", hookFunctionBody);
    }

    clearHook() {
        this.hookFunction = null;
    }

    /** @param {string[]} names @param {number[][]} values */
    loadTerms(names, values) {
        this.preloadedTermNames = names;
        this.preloadedTermValues = values;
        this.system.loadTerms(names, values);
    }

    applyPreloadedData() {
        if (this.preloadedTermNames && this.preloadedTermValues)
            this.system.loadTerms(this.preloadedTermNames, this.preloadedTermValues);
    }

    hasPreloadedData() {
        return this.preloadedTermNames != null && this.preloadedTermValues != null;
    }

    getPreloadedData() {
        if (!this.preloadedTermNames || !this.preloadedTermValues)
            return null;
        return { names: this.preloadedTermNames, values: this.preloadedTermValues };
    }

    clearPreloadedData() {
        this.preloadedTermNames = null;
        this.preloadedTermValues = null;
    }

    parse(text = "") {
        var start = "\\displaylines{";
        var end = "}";
        if (text.startsWith(start) && text.endsWith(end))
            text = text.substring(start.length, text.length - end.length);
        text = text.replace(/\\placeholder\{\}/g, '');
        const expressions = text.split('\\\\').map(line => line.trim());
        expressions.forEach(e => this.parser.parse(e));
        this.engine.reset();
        this.system.reset();
    }

    getByName(name = "", caseNumber = 1) {
        const iteration = this.getIteration();
        return this.system.getByNameOnIteration(iteration, name, caseNumber);
    }

    setIteration(iteration = 1) {
        this.system.iteration = iteration;
        this.emit("iterate", { calculator: this });
    }

    getIteration() {
        return this.system.iteration;
    }

    getLastIteration() {
        return this.system.lastIteration;
    }

    getIndependentValue(iteration = this.system.iteration) {
        return this.system.getIndependentOnIteration(iteration);
    }

    get() {
        return this.system.get();
    }

    getValues() {
        return this.system.values;
    }
    
    getTermsNames() {
        return this.system.getTermsNames();
    }

    getInitialValuesByCase() {
        const casesCount = this.normalizeCasesCount(this.properties.casesCount);
        const terms = this.getTermsNames();
        const initialValuesByCaseEntries = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
            const values = this.system.getIteration(1, caseNumber);
            const caseValuesEntries = [];
            for (let i = 0; i < terms.length; i++) {
                const term = terms[i];
                if (term === this.properties.independent.name)
                    continue;
                if (term === this.properties.iterationTerm)
                    continue;
                const value = values[term];
                if (!Number.isFinite(value))
                    continue;
                caseValuesEntries.push([term, value]);
            }
            if (caseValuesEntries.length > 0)
                initialValuesByCaseEntries.push([caseNumber, Object.fromEntries(caseValuesEntries)]);
        }
        return Object.fromEntries(initialValuesByCaseEntries);
    }

    applyInitialValuesByCase(initialValuesByCase = {}) {
        if (!initialValuesByCase || typeof initialValuesByCase !== "object")
            return;
        const casesCount = this.normalizeCasesCount(this.properties.casesCount);
        const caseValuesEntries = Object.entries(initialValuesByCase);
        for (let i = 0; i < caseValuesEntries.length; i++) {
            const caseNumber = parseInt(caseValuesEntries[i][0], 10);
            if (!Number.isFinite(caseNumber))
                continue;
            if (caseNumber < 1 || caseNumber > casesCount)
                continue;
            const caseValues = caseValuesEntries[i][1];
            if (!caseValues || typeof caseValues !== "object")
                continue;
            const termValuesEntries = Object.entries(caseValues);
            for (let j = 0; j < termValuesEntries.length; j++) {
                const term = termValuesEntries[j][0];
                if (!this.system.isTerm(term))
                    continue;
                const rawValue = termValuesEntries[j][1];
                const value = Number(rawValue);
                if (!Number.isFinite(value))
                    continue;
                this.system.setInitialByName(term, value, 1, caseNumber);
            }
        }
        this.engine.reset();
    }

    isEditable(name = "") {
        var term = this.system.getTerm(name);
        return !term || this.system.isEditable(term);
    }

    setTermValue(name = "", value = 0, iteration = this.system.iteration, caseNumber = 1) {
        const system = this.system;
        var term = system.getTerm(name);
        if (!term)
            return;
        system.set(term, value, caseNumber);
        if (iteration == 1)
            system.setInitialByName(name, value, iteration, caseNumber);
    }

    getFinalIteration() {
        if (this.properties.independent.noLimit)
            return Math.max(1, this.system.lastIteration);
        var independent = this.properties.independent;
        return Math.floor((independent.end - independent.start) / independent.step) + 1;
    }

    getEnd() {
        return this.properties.independent.end;
    }

    getStep() {
        return this.properties.independent.step;
    }      

    getStart() {
        return this.properties.independent.start;
    }

    getPrecision() {
        return this.properties.precision;
    }

    isTerm(name = "") {
        return this.system.terms[name] !== undefined;
    }

    getTermsByType() {
        const independentName = this.properties.independent.name;
        const iterationName = this.properties.iterationTerm;
        const derivatives = [];
        const functions = [];
        const parameters = [];
        const termNames = this.getTermsNames();
        for (let i = 0; i < termNames.length; i++) {
            const name = termNames[i];
            if (name === independentName || name === iterationName)
                continue;
            const term = this.system.getTerm(name);
            if (!term)
                continue;
            if (term.type === Modellus.TermType.DIFFERENTIAL)
                derivatives.push(name);
            else if (term.type === Modellus.TermType.FUNCTION)
                functions.push(name);
            else if (term.type === Modellus.TermType.PARAMETER)
                parameters.push(name);
        }
        return { derivatives, functions, parameters };
    }

    getDefaultTerm() {
        const { derivatives, functions, parameters } = this.getTermsByType();
        if (derivatives.length > 0)
            return derivatives[0];
        if (functions.length > 0)
            return functions[0];
        if (parameters.length > 0)
            return parameters[0];
        return this.properties.independent.name;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = Calculator;
