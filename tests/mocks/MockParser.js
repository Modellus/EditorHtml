class MockParser {
    constructor(system) {
        this.system = system;
        this.calls = [];
    }

    parse(expression) {
        this.calls.push(expression);
    }
}

module.exports = MockParser;
