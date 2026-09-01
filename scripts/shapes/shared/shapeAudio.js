// The board's own sound. One audio graph serves every shape that makes a noise: a browser gives out
// a handful of audio contexts and no more, so a board of twenty sounding objects has to share one.
// A clip is fetched and decoded once per address and kept, since the same audio is very often the
// sound of several objects at once.
class ShapeAudio {
    static context = null;
    static masterGain = null;
    static buffers = new Map();
    // What a value is read against when nothing says otherwise: a shape that names no scale of its
    // own is heard over this one.
    static defaultWindow = 200;
    static lowestPlaybackRate = 0.5;
    static highestPlaybackRate = 2;

    static getContext() {
        const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContextClass)
            return null;
        if (!ShapeAudio.context)
            ShapeAudio.context = new AudioContextClass();
        if (ShapeAudio.context.state === "suspended")
            ShapeAudio.context.resume().catch(() => {});
        return ShapeAudio.context;
    }

    static getMasterGain() {
        const context = ShapeAudio.getContext();
        if (!context)
            return null;
        if (!ShapeAudio.masterGain) {
            ShapeAudio.masterGain = context.createGain();
            ShapeAudio.masterGain.gain.value = 1;
            ShapeAudio.masterGain.connect(context.destination);
        }
        return ShapeAudio.masterGain;
    }

    // Null while the clip is still being read, and null for good if it could not be read at all: the
    // address is entered before the fetch starts, so a clip that fails is not asked for again on
    // every iteration of the model.
    static getBuffer(url) {
        if (url === "")
            return null;
        if (!ShapeAudio.buffers.has(url)) {
            ShapeAudio.buffers.set(url, null);
            ShapeAudio.loadBuffer(url);
        }
        return ShapeAudio.buffers.get(url);
    }

    static async loadBuffer(url) {
        const context = ShapeAudio.getContext();
        if (!context)
            return;
        try {
            const response = await fetch(url);
            ShapeAudio.buffers.set(url, await context.decodeAudioData(await response.arrayBuffer()));
        } catch (error) {
            ShapeAudio.buffers.set(url, null);
        }
    }

    // Where the value stands between the two ends it is heard over. A window with no width leaves
    // the sound in the middle of its range rather than at one end of it.
    static getNormalizedValue(value, minimum, maximum) {
        const low = Number.isFinite(minimum) ? Number(minimum) : -ShapeAudio.defaultWindow;
        const high = Number.isFinite(maximum) ? Number(maximum) : ShapeAudio.defaultWindow;
        if (high === low)
            return 0.5;
        return Math.max(0, Math.min(1, (value - low) / (high - low)));
    }

    // Two octaves, one either side of the clip's own pitch, spread evenly over the window: an even
    // spread in pitch is an even spread in the ratio, not in the rate, which is what makes a value
    // climbing at a steady rate sound like it is climbing at a steady rate.
    static getPlaybackRate(normalized) {
        return ShapeAudio.lowestPlaybackRate * Math.pow(ShapeAudio.highestPlaybackRate / ShapeAudio.lowestPlaybackRate, normalized);
    }

    static getVolume(normalized) {
        return normalized;
    }

    static isVolumeModulation(modulation) {
        return String(modulation ?? "") === "volume";
    }
}

// A note the board makes for itself, where a clip would be the wrong instrument: a struck string is
// not a single tone — it sounds its own pitch loudest, a handful of harmonics above it, and it fades
// from the moment the hammer leaves it. One oscillator carrying that harmonic recipe, under an
// envelope that decays while the key is still held, is what makes the ear hear an instrument rather
// than a test tone. It goes through the board's one audio graph, like every clip does.
class ShapeTone {
    static harmonicGains = [1, 0.42, 0.28, 0.16, 0.09, 0.05, 0.03, 0.02];
    static attackSeconds = 0.006;
    static decayTimeConstant = 0.3;
    static sustainRatio = 0.32;
    static releaseSeconds = 0.35;
    // Ten fingers down at once still have to leave the sum inside the graph's headroom.
    static peakGain = 0.16;
    static periodicWave = null;
    static periodicWaveContext = null;

    static getPeriodicWave(context) {
        if (ShapeTone.periodicWaveContext === context && ShapeTone.periodicWave)
            return ShapeTone.periodicWave;
        const real = new Float32Array(ShapeTone.harmonicGains.length + 1);
        const imaginary = new Float32Array(ShapeTone.harmonicGains.length + 1);
        for (let harmonic = 0; harmonic < ShapeTone.harmonicGains.length; harmonic++)
            imaginary[harmonic + 1] = ShapeTone.harmonicGains[harmonic];
        ShapeTone.periodicWaveContext = context;
        ShapeTone.periodicWave = context.createPeriodicWave(real, imaginary);
        return ShapeTone.periodicWave;
    }

    constructor() {
        this.oscillator = null;
        this.gainNode = null;
    }

    start(frequency) {
        const context = ShapeAudio.getContext();
        const masterGain = ShapeAudio.getMasterGain();
        if (!context || !masterGain || this.oscillator || !(frequency > 0))
            return;
        const now = context.currentTime;
        this.gainNode = context.createGain();
        this.gainNode.gain.setValueAtTime(0, now);
        this.gainNode.gain.linearRampToValueAtTime(ShapeTone.peakGain, now + ShapeTone.attackSeconds);
        this.gainNode.gain.setTargetAtTime(ShapeTone.peakGain * ShapeTone.sustainRatio, now + ShapeTone.attackSeconds, ShapeTone.decayTimeConstant);
        this.gainNode.connect(masterGain);
        this.oscillator = context.createOscillator();
        this.oscillator.setPeriodicWave(ShapeTone.getPeriodicWave(context));
        this.oscillator.frequency.value = frequency;
        this.oscillator.connect(this.gainNode);
        this.oscillator.start(now);
    }

    // Letting go damps the string rather than cutting it off, so the note is ramped down and the
    // oscillator is only taken out of the graph once it has gone quiet.
    stop() {
        if (!this.oscillator)
            return;
        const context = ShapeAudio.getContext();
        const oscillator = this.oscillator;
        const gainNode = this.gainNode;
        this.oscillator = null;
        this.gainNode = null;
        const now = context.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + ShapeTone.releaseSeconds);
        oscillator.onended = () => gainNode.disconnect();
        oscillator.stop(now + ShapeTone.releaseSeconds);
    }
}

// One clip sounding for one shape. The value moves on every iteration of the model, and a fresh
// voice on each of them would pile the clip on top of itself; so the first move starts it and the
// moves after it steer the voice already sounding. The clip is heard afresh once it has run out,
// which is what makes a short sound repeat while the model runs and stop when it stops.
class ShapeAudioPlayer {
    constructor() {
        this.url = "";
        this.source = null;
        this.gainNode = null;
    }

    setSource(url) {
        if (this.url === url)
            return;
        this.url = url;
        this.stop();
    }

    play(value, modulation, minimum, maximum) {
        const buffer = ShapeAudio.getBuffer(this.url);
        if (!buffer)
            return;
        const context = ShapeAudio.getContext();
        const masterGain = ShapeAudio.getMasterGain();
        if (!context || !masterGain)
            return;
        const normalized = ShapeAudio.getNormalizedValue(value, minimum, maximum);
        const isVolume = ShapeAudio.isVolumeModulation(modulation);
        const playbackRate = isVolume ? 1 : ShapeAudio.getPlaybackRate(normalized);
        const volume = isVolume ? ShapeAudio.getVolume(normalized) : 1;
        if (this.source) {
            this.source.playbackRate.setTargetAtTime(playbackRate, context.currentTime, 0.02);
            this.gainNode.gain.setTargetAtTime(volume, context.currentTime, 0.02);
            return;
        }
        this.gainNode = context.createGain();
        this.gainNode.gain.setValueAtTime(volume, context.currentTime);
        this.gainNode.connect(masterGain);
        this.source = context.createBufferSource();
        this.source.buffer = buffer;
        this.source.playbackRate.setValueAtTime(playbackRate, context.currentTime);
        this.source.connect(this.gainNode);
        this.source.onended = () => this.releaseSource();
        this.source.start(context.currentTime);
    }

    releaseSource() {
        this.source = null;
        this.gainNode = null;
    }

    stop() {
        if (!this.source)
            return;
        const source = this.source;
        this.releaseSource();
        source.onended = null;
        source.stop();
    }
}
