const STATUS = { PLAYING: 0, PAUSED: 1, REPLAYING: 2, STOPPED: 3 };

class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t");
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.status = STATUS.STOPPED;
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

    play() {
        this.timer = setInterval(() => {
            this.engine.iterate();
            this.emit("iterate", { calculator: this }); 
        }, 10);
        this.status = STATUS.PLAYING;
    }

    pause() {
        clearInterval(this.timer);
        this.status = STATUS.PAUSED;
    }

    stop() {
        this.engine.reset();
        clearInterval(this.timer);
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

    replay() {
        var iteration = 0;
        this.timer = setInterval(() => {
            this.system.iteration = iteration++;
            this.emit("iterate", { calculator: this }); 
            if (this.system.iteration == this.system.lastIteration)
                iteration = 0;
        }, 10);
        this.status = STATUS.PLAYING;
    }

    clear() {
        this.engine.reset();
        this.system.clear();
        clearInterval(this.timer);
        this.status = STATUS.STOPPED;
    }

    parse(text) {
        const cleanedInput = text.replace(/^\\displaylines\{|\}$/g, '');
        const expressions = cleanedInput.split('\\\\').map(line => line.trim());
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

    getIndependentValue() {
        return this.system.getIndependentOnIteration(this.system.iteration);
    }

    get() {
        return this.system.get();
    }

    getValues() {
        return this.system.values;
    }
}