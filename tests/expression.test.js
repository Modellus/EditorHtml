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

if (typeof globalThis.crypto === 'undefined')
    globalThis.crypto = { randomUUID: () => `test-${Date.now()}-${Math.random()}` };

function createMockElement(tag) {
    const element = new EventTarget();
    element.tagName = tag;
    element.id = '';
    element.style = {};
    element.children = [];
    element.firstChild = null;
    element.setAttribute = () => {};
    element.getAttribute = () => null;
    element.appendChild = child => { element.children.push(child); element.firstChild = element.children[0]; return child; };
    element.removeChild = () => {};
    element.insertBefore = () => {};
    element.dispatchEvent = function(event) { EventTarget.prototype.dispatchEvent.call(this, event); };
    return element;
}

class MockMathfieldElement {
    constructor() {
        this._value = '';
        this._listeners = {};
        this.position = 0;
        this.lastOffset = 0;
        this.selection = { ranges: [[0, 0]], direction: 'forward' };
        this.inlineShortcuts = {};
        this.inlineShortcutTimeout = 0;
        this.style = {};
    }
    get value() { return this._value; }
    set value(v) {
        this._value = v;
        this.lastOffset = v.length;
    }
    getValue() { return this._value; }
    addEventListener(type, handler) {
        if (!this._listeners[type])
            this._listeners[type] = [];
        this._listeners[type].push(handler);
    }
    removeEventListener() {}
    dispatchEvent(event) {
        const handlers = this._listeners[event.type || event] || [];
        handlers.forEach(h => h(event));
    }
    executeCommand() {}
    focus() {}
    setAttribute() {}
    getAttribute() { return null; }
}

globalThis.MathfieldElement = MockMathfieldElement;

globalThis.document = {
    createElementNS: (ns, tag) => createMockElement(tag),
    createElement: tag => createMockElement(tag),
    querySelector: () => null,
    body: { appendChild: () => {} }
};

globalThis.window = globalThis.window || globalThis;
globalThis.window.DevExpress = undefined;

globalThis.$ = function(selector) {
    const wrapper = {
        css: () => wrapper,
        dxScrollView: () => wrapper,
        dxForm: () => ({ instance: () => ({ option: () => [], updateData: () => {} }) }),
        appendTo: () => wrapper,
        append: () => wrapper,
        get: () => [null],
        0: null,
        length: 1
    };
    return wrapper;
};

globalThis.ResizeObserver = class { constructor() {} observe() {} disconnect() {} };

const Calculator = require('../scripts/calculator.js');
const BaseTheme = require('../scripts/themes/baseTheme.js');
const BaseTranslations = require('../scripts/themes/baseTranslations.js');
const Shapes = require('../scripts/shapes/shapes.js');
const BaseShape = require('../scripts/shapes/baseShape.js');

globalThis.BaseShape = BaseShape;
globalThis.RectangleTransformer = class { constructor() {} };

const ExpressionShape = require('../scripts/shapes/expressionShape.js');

function createMockBoard() {
    const svgElement = createMockElement('svg');
    const calculator = new Calculator();
    const board = {
        svg: svgElement,
        calculator: calculator,
        theme: new BaseTheme(),
        translations: new BaseTranslations('en-US'),
        shapes: new Shapes(null, calculator),
        selection: { selectedShape: null, select: () => {}, deselect: () => {}, update: () => {} },
        createSvgElement: name => createMockElement(name),
        createElement: name => createMockElement(name),
        getClientCenter: () => ({ x: 400, y: 300 }),
        refresh: () => {},
        addShape: shape => {
            svgElement.appendChild(shape.element);
            board.shapes.add(shape);
        },
        selectShape: () => {},
        dispatchShapeEvent: () => {}
    };
    board.shapes.board = board;
    board.shapes.registerShape(ExpressionShape);
    return board;
}

describe('ExpressionShape', () => {
    test('typed content stays inside displaylines brackets', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        board.addShape(shape);
        expect(shape.properties.expression).toBe('\\displaylines{}');
        shape.mathfield.value = '\\displaylines{x}';
        shape.mathfield.lastOffset = shape.mathfield.value.length;
        shape.onChange();
        expect(shape.properties.expression).toBe('\\displaylines{x}');
    });

    test('setProperties with expression preserves displaylines wrapper', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        board.addShape(shape);
        shape.setProperties({ expression: '\\displaylines{x+1}' });
        expect(shape.properties.expression).toBe('\\displaylines{x+1}');
        expect(shape.mathfield.getValue()).toBe('\\displaylines{x+1}');
    });

    test('default expression is an empty displaylines', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        expect(shape.properties.expression).toBe('\\displaylines{}');
        expect(shape.mathfield.getValue()).toBe('\\displaylines{}');
    });

    test('fixContentOutsideDisplaylines moves leaked content inside', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        board.addShape(shape);
        shape.mathfield.value = '\\displaylines{}x';
        shape.fixContentOutsideDisplaylines();
        expect(shape.mathfield.getValue()).toBe('\\displaylines{x}');
    });

    test('fixContentOutsideDisplaylines handles nested braces', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        board.addShape(shape);
        shape.mathfield.value = '\\displaylines{x^{2}}y';
        shape.fixContentOutsideDisplaylines();
        expect(shape.mathfield.getValue()).toBe('\\displaylines{x^{2}y}');
    });

    test('fixContentOutsideDisplaylines does nothing when content is inside', () => {
        const board = createMockBoard();
        const shape = board.shapes.createShape('ExpressionShape', null);
        board.addShape(shape);
        shape.mathfield.value = '\\displaylines{x+1}';
        shape.fixContentOutsideDisplaylines();
        expect(shape.mathfield.getValue()).toBe('\\displaylines{x+1}');
    });
});
