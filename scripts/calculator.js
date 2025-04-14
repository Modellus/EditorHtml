const STATUS = { PLAYING: 0, PAUSED: 1, REPLAYING: 2, STOPPED: 3 };

class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t");
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.status = STATUS.STOPPED;
        this.properties = {};
        this.setDefaults();
    }

    setDefaults() {
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1 };
    }

    setProperties(properties) {
        Utils.mergeProperties(properties, this.properties);
        this.clear();
    }

    setProperty(name, value) {
        Utils.setProperty(name, value, this.properties);
        this.clear();
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
        if (this.status != STATUS.PLAYING)
            return;
        if (Math.abs(this.system.getIndependent() - this.properties.independent.end) < this.properties.independent.step)
            this.pause();
        else
            this.engine.iterate();
        this.emit("iterate", { calculator: this });     
        if (this.status == STATUS.PLAYING)
            requestIdleCallback(this._iterate);
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
        this.emit("iterate", { calculator: this }); 
        if (this.system.iteration == this.system.lastIteration)
            this.system.iteration = 0;
        if (this.status == STATUS.PLAYING) {
            this.system.iteration++;
            requestIdleCallback(this._replay);
        }
    }

    replay() {
        this.status = STATUS.PLAYING;
        this.system.iteration = 0;
        this._replay();
    }

    clear() {
        this.system.clear();
        this.system.independent = this.properties.independent.name;
        this.system.setInitialIndependent(this.properties.independent.start);
        this.engine.step = this.properties.independent.step;
        this.engine.reset();
        this.system.reset();
        this.status = STATUS.STOPPED;
    }

    parse(text) {
        var start = "\\displaylines{";
        var end = "}";
        if (text.startsWith(start) && text.endsWith(end))
            text = text.substring(start.length, text.length - end.length);
        const expressions = text.split('\\\\').map(line => line.trim());
        expressions.forEach(e => this.parser.parse(e));
    }

    getByName(name) {
        return this.system.getByName(name);
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
}