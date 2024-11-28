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
        }, 10);
        this.isPlaying = true;
    }

    pause() {
        clearInterval(this.timer);
        this.isPlaying = false;
    }

    reset() {
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
}