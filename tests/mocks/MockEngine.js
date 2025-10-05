class MockEngine {
    constructor(system) {
        this.system = system;
        this.resetCalls = 0;
        this.iterateCalls = 0;
    }

    reset() {
        this.resetCalls++;
    }

    iterate() {
        this.iterateCalls++;
    }
}

module.exports = MockEngine;
