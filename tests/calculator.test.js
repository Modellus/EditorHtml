const Utils = require('../scripts/utils.js');
const MockSystem = require('./mocks/MockSystem.js');
const MockParser = require('./mocks/MockParser.js');
const MockEngine = require('./mocks/MockEngine.js');

if (typeof globalThis.CustomEvent === 'undefined') {
    globalThis.CustomEvent = class CustomEvent extends Event {
        constructor(type, options = {}) {
            super(type, options);
            this.detail = options.detail;
        }
    };
}

globalThis.Utils = Utils;

globalThis.Modellus = {
    System: MockSystem,
    Parser: MockParser,
    Engine: MockEngine,
};

if (typeof globalThis.requestAnimationFrame === 'undefined')
    globalThis.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0);

if (typeof globalThis.cancelAnimationFrame === 'undefined')
    globalThis.cancelAnimationFrame = id => clearTimeout(id);

const Calculator = require('../scripts/calculator.js');

describe('Calculator', () => {
    function createCalculator() {
        return new Calculator();
    }

    test('constructor applies defaults and wires Modellus dependencies', () => {
        const calculator = createCalculator();
        expect(calculator.getPrecision()).toBe(2);
        expect(calculator.properties.independent).toEqual({ name: 't', start: 0, end: 10, step: 0.1 });
        expect(calculator.properties.iterationTerm).toBe('n');
        expect(calculator.system.constructedWith).toEqual({ independentName: 't', iterationTerm: 'n' });
    });

    test('setProperties merges nested fields and resets the Modellus system', () => {
        const calculator = createCalculator();
        calculator.setProperties({
            precision: 5,
            independent: { start: 1, end: 4 },
            iterationTerm: 'k',
        });

        expect(calculator.getPrecision()).toBe(5);
        expect(calculator.properties.independent).toEqual({ name: 't', start: 1, end: 4, step: 0.1 });
        expect(calculator.system.independent).toBe('t');
        expect(calculator.system.initialIndependent).toBe(1);
        expect(calculator.system.step).toBe(0.1);
        expect(calculator.system.iterationTerm).toBe('k');
        expect(calculator.system.clearCalls).toBe(1);
        expect(calculator.system.resetCalls).toBe(1);
        expect(calculator.engine.resetCalls).toBe(1);
    });

    test('setProperty updates deep properties and triggers reset', () => {
        const calculator = createCalculator();
        calculator.setProperty('independent.step', 0.25);

        expect(calculator.getStep()).toBe(0.25);
        expect(calculator.system.step).toBe(0.25);
        expect(calculator.system.clearCalls).toBe(1);
        expect(calculator.system.resetCalls).toBe(1);
    });

    test('calculate delegates to Modellus and emits iterate events', () => {
        const calculator = createCalculator();
        let eventCount = 0;
        calculator.on('iterate', event => {
            eventCount++;
            expect(event.detail.calculator).toBe(calculator);
        });

        calculator.calculate();

        expect(calculator.system.calculateCalls).toBe(1);
        expect(eventCount).toBe(1);
    });

    test('stepForward and stepBackward adjust iteration and emit iterate', () => {
        const calculator = createCalculator();
        calculator.system.iteration = 5;
        let events = 0;
        const listener = () => events++;
        calculator.on('iterate', listener);

        calculator.stepForward();
        calculator.stepBackward();

        expect(calculator.system.iteration).toBe(5);
        expect(events).toBe(2);
        calculator.off('iterate', listener);
    });

    test('setIteration updates the Modellus iteration and publishes event', () => {
        const calculator = createCalculator();
        let iterated = false;
        calculator.on('iterate', event => {
            iterated = true;
            expect(event.detail.calculator).toBe(calculator);
        });

        calculator.setIteration(7);

        expect(calculator.system.iteration).toBe(7);
        expect(iterated).toBe(true);
    });

    test('parse cleans displaylines wrapper, removes placeholders, and resets engine/system', () => {
        const calculator = createCalculator();
        const source = '\\displaylines{x=1\\\\y=2\\placeholder{}}';

        calculator.parse(source);

        expect(calculator.parser.calls).toEqual(['x=1', 'y=2']);
        expect(calculator.engine.resetCalls).toBe(1);
        expect(calculator.system.resetCalls).toBe(1);
    });

    test('getByName returns values from the current iteration', () => {
        const calculator = createCalculator();
        calculator.system.iteration = 3;
        calculator.system.values = { 3: { speed: 88 } };

        expect(calculator.getByName('speed')).toBe(88);
    });

    test('setTermValue writes via Modellus and captures initial iteration', () => {
        const calculator = createCalculator();
        const term = { name: 'position' };
        calculator.system.terms.position = term;

        calculator.system.iteration = 1;
        calculator.setTermValue('position', 42);
        expect(calculator.system.setCalls).toEqual([{ term, value: 42, iteration: 1 }]);
        expect(calculator.system.initialSetCalls).toEqual([{ name: 'position', value: 42 }]);

        calculator.system.iteration = 3;
        calculator.setTermValue('position', 21);
        expect(calculator.system.setCalls.length).toBe(2);
        expect(calculator.system.initialSetCalls.length).toBe(1);
    });

    test('isEditable returns true when term missing or Modellus allows edits', () => {
        const calculator = createCalculator();
        const term = { name: 'velocity' };
        calculator.system.terms.velocity = term;
        calculator.system.editableTerms.add(term);

        expect(calculator.isEditable('missing')).toBe(true);
        expect(calculator.isEditable('velocity')).toBe(true);

        calculator.system.editableTerms.clear();
        expect(calculator.isEditable('velocity')).toBe(false);
    });

    test('getFinalIteration follows the configured independent interval', () => {
        const calculator = createCalculator();
        calculator.setProperties({ independent: { start: 2, end: 5, step: 1 } });

        expect(calculator.getFinalIteration()).toBe(6);
    });

    test('clear restores defaults and resets system state', () => {
        const calculator = createCalculator();
        calculator.setProperties({
            precision: 4,
            independent: { name: 'time', start: 3, end: 8, step: 0.5 },
        });

        calculator.clear();

        expect(calculator.getPrecision()).toBe(2);
        expect(calculator.properties.independent).toEqual({ name: 't', start: 0, end: 10, step: 0.1 });
        expect(calculator.system.independent).toBe('t');
        expect(calculator.system.initialIndependent).toBe(0);
        expect(calculator.system.step).toBe(0.1);
        expect(calculator.system.clearCalls).toBeGreaterThanOrEqual(1);
        expect(calculator.system.resetCalls).toBeGreaterThanOrEqual(1);
    });
});
