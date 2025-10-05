// @ts-check
/// <reference path="../libraries/types/CalculationEngine.d.ts" />
/* global Modellus */

const STATUS = { PLAYING: 0, PAUSED: 1, REPLAYING: 2, STOPPED: 3 };

class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t", "n");
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.status = STATUS.STOPPED;
        this.properties = {};
        this.setDefaults();
    }

    setDefaults() {
        this.properties.precision = 2;
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1 };
        this.properties.iterationTerm = "n";
    }

    setProperties(properties) {
        Utils.mergeProperties(properties, this.properties);
        this.reset();
    }

    setProperty(name, value) {
        Utils.setProperty(name, value, this.properties);
        this.reset();
    }

    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.dispatchEvent(event);
    }

    on(eventName, callback) {
        this.addEventListener(eventName, callback);
    }

    off(eventName, callback) {
        this.removeEventListener(eventName, callback);
    }

    _iterate = () => {
        if (this.frameId)
            cancelAnimationFrame(this.frameId);
        if (this.status != STATUS.PLAYING)
            return;
        if (Math.abs(this.system.getIndependent() - this.properties.independent.end) < this.properties.independent.step / 10.0)
            this.pause();
        else
            this.engine.iterate();
        this.emit("iterate", { calculator: this });     
        if (this.status == STATUS.PLAYING)
            this.frameId = requestAnimationFrame(this._iterate);
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
        if (this.frameId)
            cancelAnimationFrame(this.frameId);
        this.emit("iterate", { calculator: this }); 
        if (this.system.iteration > this.system.lastIteration)
            this.system.iteration = 1;
        if (this.status == STATUS.PLAYING) {
            this.system.iteration++;
            this.frameId = requestAnimationFrame(this._replay);
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
        this.engine.reset();
        this.system.reset();
        this.status = STATUS.STOPPED;
    }

    parse(text) {
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

    getByName(name) {
        const iteration = this.getIteration();
        return this.system.getByNameOnIteration(iteration, name);
    }

    setIteration(iteration) {
        this.system.iteration = iteration;
        this.emit("iterate", { calculator: this });
    }

    getIteration() {
        return this.system.iteration;
    }

    getLastIteration() {
        return this.system.lastIteration;
    }

    getIndependentValue(iteration) {
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

    isEditable(name) {
        var term = this.system.getTerm(name);
        return !term || this.system.isEditable(term);
    }

    setTermValue(name, value, iteration = this.system.iteration) {
        const system = this.system;
        var term = system.getTerm(name);
        system.set(term, value);
        if (iteration == 1)
            system.setInitialByName(name, value);
    }

    getFinalIteration() {
        var independent = this.properties.independent;
        return independent.start + Math.floor((independent.end - independent.start) / independent.step) + 1;
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

    isTerm(name) {
        return this.system.terms[name] !== undefined;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = Calculator;
