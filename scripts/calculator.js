class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t");
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.isPlaying = false;
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
        }, 100);
        this.isPlaying = true;
    }

    pause() {
        clearInterval(this.timer);
        this.isPlaying = false;
    }

    stop() {
        this.engine.reset();
        clearInterval(this.timer);
        this.isPlaying = false;
    }

    replay() {
        var iteration = 0;
        this.timer = setInterval(() => {
            this.system.iteration = iteration++;
            this.emit("iterate", { calculator: this }); 
            if (this.system.iteration == this.system.lastIteration) {
                clearInterval(this.timer);
                this.isPlaying = false;
            }
        }, 50);
        this.isPlaying = true;
    }

    clear() {
        this.engine.reset();
        this.system.clear();
        clearInterval(this.timer);
        this.isPlaying = false;
    }

    parse(expression) {
        this.parser.parse(expression);
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
        return this.system.independentValue;
    }

    get() {
        return this.system.get();
    }

    getValues() {
        return this.system.values;
    }
}