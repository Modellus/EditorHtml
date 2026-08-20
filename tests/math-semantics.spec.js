const { test, expect } = require('@playwright/test');

const { MathSemantics, MathSymbolRole } = require('../scripts/controls/mathSemantics.js');
const ExpressionAlignment = require('../scripts/controls/expressionAlignment.js');
global.MathSemantics = MathSemantics;
global.MathSymbolRole = MathSymbolRole;
global.ExpressionAlignment = ExpressionAlignment;
const MathSemanticMetadata = require('../scripts/controls/mathSemanticMetadata.js');
global.MathSemanticMetadata = MathSemanticMetadata;
const MathSemanticDecorator = require('../scripts/controls/mathSemanticDecorator.js');

function rolesOf(latex, metadata = null) {
    return MathSemantics.classify(latex, metadata).map(token => `${token.text}:${token.role}`);
}

function roleOf(latex, text, metadata = null) {
    const tokens = MathSemantics.classify(latex, metadata);
    const token = tokens.find(candidate => candidate.text === text);
    return token ? token.role : null;
}

test.describe('semantic classification', () => {
    test('variables, numbers and operators are told apart', () => {
        expect(rolesOf('a=0.10')).toEqual(['a:variable', '=:operator', '0:number', '.:number', '1:number', '0:number']);
    });

    test('numbers keep their category inside powers and fractions', () => {
        expect(rolesOf('K_c=\\frac{b}{a^2}')).toEqual([
            'K:variable', 'c:qualifier-index', '=:operator', 'b:variable', 'a:variable', '2:number'
        ]);
    });

    test('recognized functions are read as functions', () => {
        expect(roleOf('y=\\sin\\left(x\\right)', '\\sin')).toBe(MathSymbolRole.FUNCTION);
        expect(roleOf('y=\\ln\\left(x\\right)', '\\ln')).toBe(MathSymbolRole.FUNCTION);
        expect(roleOf('y=sign\\left(x\\right)', 's')).toBe(MathSymbolRole.FUNCTION);
    });

    test('a function name is not mistaken for a run of variables', () => {
        const tokens = MathSemantics.classify('y=round\\left(x\\right)');
        const functionTokens = tokens.filter(token => token.role === MathSymbolRole.FUNCTION);
        expect(functionTokens.map(token => token.text).join('')).toBe('round');
    });

    test('differential fractions colour the differential operator', () => {
        expect(rolesOf('\\frac{\\differentialD{NO_2}}{\\differentialD{t}}=2\\left(v_i-v_d\\right)')).toEqual([
            '\\mathrm{d}:derivative', 'N:variable', 'O:variable', '2:qualifier-index',
            '\\mathrm{d}:derivative', 't:variable',
            '=:operator', '2:number',
            'v:variable', 'i:qualifier-index', '-:operator', 'v:variable', 'd:qualifier-index'
        ]);
    });

    test('a plain d over d fraction is read as a derivative too', () => {
        expect(roleOf('\\frac{dx}{dt}=1', 'd')).toBe(MathSymbolRole.DERIVATIVE);
    });

    test('partial derivatives, primes and dot derivatives are derivatives', () => {
        expect(roleOf('\\frac{\\partial u}{\\partial t}=0', '\\partial')).toBe(MathSymbolRole.DERIVATIVE);
        expect(roleOf('x^{\\prime}=1', '\\prime')).toBe(MathSymbolRole.DERIVATIVE);
        expect(roleOf('\\dot{x}=1', 'x')).toBe(MathSymbolRole.DERIVATIVE);
    });

    test('a variable inside a derivative keeps its own colour', () => {
        const tokens = MathSemantics.classify('\\frac{\\differentialD{NO_2}}{\\differentialD{t}}=v');
        expect(tokens.find(token => token.text === 'N').role).toBe(MathSymbolRole.VARIABLE);
        expect(tokens.find(token => token.text === 't').role).toBe(MathSymbolRole.VARIABLE);
    });

    test('a named subscript is a qualifying index', () => {
        expect(roleOf('v_{\\!x}=3', 'x')).toBe(MathSymbolRole.QUALIFIER_INDEX);
    });

    test('a compound subscript is an iteration index', () => {
        expect(roleOf('x_{i+1}=x_i', 'i')).toBe(MathSymbolRole.ITERATION_INDEX);
        expect(roleOf('M_{ij}=1', 'i')).toBe(MathSymbolRole.ITERATION_INDEX);
    });

    test('metadata tells a qualifying subscript from an iteration index', () => {
        const qualifierMetadata = { getIndexRole: () => MathSymbolRole.QUALIFIER_INDEX };
        const iterationMetadata = { getIndexRole: () => MathSymbolRole.ITERATION_INDEX };
        expect(roleOf('k_i=1', 'i', qualifierMetadata)).toBe(MathSymbolRole.QUALIFIER_INDEX);
        expect(roleOf('x_i=1', 'i', iterationMetadata)).toBe(MathSymbolRole.ITERATION_INDEX);
    });

    test('a single letter subscript falls back to a qualifying index', () => {
        expect(roleOf('k_d=1', 'd')).toBe(MathSymbolRole.QUALIFIER_INDEX);
        expect(roleOf('Q_c=1', 'c')).toBe(MathSymbolRole.QUALIFIER_INDEX);
    });

    test('metadata reports errors and warnings', () => {
        const metadata = { getSymbolRole: name => (name === 'Q' ? MathSymbolRole.ERROR : name === 'r' ? MathSymbolRole.WARNING : null) };
        expect(roleOf('Q=r', 'Q', metadata)).toBe(MathSymbolRole.ERROR);
        expect(roleOf('Q=r', 'r', metadata)).toBe(MathSymbolRole.WARNING);
    });

    test('an error outranks every other category', () => {
        const metadata = { getSymbolRole: () => MathSymbolRole.ERROR, isFunction: () => true };
        expect(roleOf('\\frac{\\differentialD{x}}{\\differentialD{t}}=sin', 's', metadata)).toBe(MathSymbolRole.ERROR);
    });

    test('the role priority follows the requested order', () => {
        expect(MathSemantics.rolePriority).toEqual([
            'error', 'warning', 'derivative', 'function', 'qualifier-index', 'iteration-index', 'number', 'variable', 'operator'
        ]);
        expect(MathSemantics.resolveRole([MathSymbolRole.VARIABLE, MathSymbolRole.NUMBER])).toBe(MathSymbolRole.NUMBER);
        expect(MathSemantics.resolveRole([MathSymbolRole.OPERATOR, MathSymbolRole.QUALIFIER_INDEX])).toBe(MathSymbolRole.QUALIFIER_INDEX);
        expect(MathSemantics.resolveRole([MathSymbolRole.FUNCTION, MathSymbolRole.DERIVATIVE])).toBe(MathSymbolRole.DERIVATIVE);
    });

    test('classification reads rows and cells of an aligned block', () => {
        expect(rolesOf('\\begin{align}a & =1\\\\ b & =2\\end{align}')).toEqual([
            'a:variable', '=:operator', '1:number', 'b:variable', '=:operator', '2:number'
        ]);
    });

    test('classification reaches inside roots, delimiters and powers', () => {
        expect(rolesOf('y=\\sqrt{b+1}+\\left(c\\right)^2')).toEqual([
            'y:variable', '=:operator', 'b:variable', '+:operator', '1:number', '+:operator', 'c:variable', '2:number'
        ]);
    });
});

test.describe('semantic metadata', () => {
    const calculator = {
        getTermsNames: () => ['t', 'n', 'a', 'b'],
        properties: { iterationTerm: 'n', independent: { name: 't' } }
    };

    test('terms defined by the block are not reported as unknown', () => {
        const metadata = MathSemanticMetadata.fromCalculator(calculator, '\\displaylines{K_c=1\\\\v=K_c}', [], 'Unknown term');
        expect(metadata.definedTermNames).toEqual(['K_c', 'v']);
        expect(metadata.getSymbolRole('K_c')).toBe(MathSymbolRole.VARIABLE);
        expect(metadata.getSymbolRole('a')).toBe(MathSymbolRole.VARIABLE);
    });

    test('a term nobody defines is reported as a warning', () => {
        const metadata = MathSemanticMetadata.fromCalculator(calculator, '\\displaylines{v=r}', [], 'Unknown term');
        expect(metadata.getSymbolRole('r')).toBe(MathSymbolRole.WARNING);
        expect(metadata.getDiagnosticMessage('r')).toBe('Unknown term: r');
    });

    test('the independent and iteration terms are always known', () => {
        const metadata = MathSemanticMetadata.fromCalculator(calculator, '\\displaylines{v=t}', [], 'Unknown term');
        expect(metadata.getSymbolRole('t')).toBe(MathSymbolRole.VARIABLE);
        expect(metadata.getSymbolRole('n')).toBe(MathSymbolRole.VARIABLE);
    });

    test('a known term names its subscript a qualifying index and the iteration term an iteration index', () => {
        const metadata = MathSemanticMetadata.fromCalculator(calculator, '\\displaylines{k_d=1\\\\x=k_d}', [], 'Unknown term');
        expect(metadata.getIndexRole('k', 'd', 'k_d')).toBe(MathSymbolRole.QUALIFIER_INDEX);
        expect(metadata.getIndexRole('x', 'n', 'x_n')).toBe(MathSymbolRole.ITERATION_INDEX);
        expect(metadata.getIndexRole('x', 'q', 'x_q')).toBe(null);
    });

    test('a left hand side written as a derivative names the term it defines', () => {
        expect(MathSemanticMetadata.readLeftHandSideTermName('\\frac{\\differentialD{NO_2}}{\\differentialD{t}}')).toBe('NO_2');
        expect(MathSemanticMetadata.readLeftHandSideTermName('NO_2\\left(0\\right)')).toBe('NO_2');
    });
});

test.describe('equation alignment adapter', () => {
    test('several equations are presented as an aligned block', () => {
        expect(ExpressionAlignment.toPresentation('\\displaylines{a=0.10\\\\b=21.55}'))
            .toBe('\\begin{align}a&=0.10\\\\b&=21.55\\end{align}');
    });

    test('a single equation is left alone', () => {
        expect(ExpressionAlignment.toPresentation('\\displaylines{a=0.10}')).toBe('\\displaylines{a=0.10}');
    });

    test('an aligned block is read back as the stored rows', () => {
        expect(ExpressionAlignment.toCanonical('\\begin{align}a & =0.10\\\\ b & =21.55\\end{align}'))
            .toBe('\\displaylines{a=0.10\\\\b=21.55}');
    });

    test('alignment markers do not pile up over a round trip', () => {
        let latex = '\\displaylines{a=1\\\\b=2}';
        for (let roundTrip = 0; roundTrip < 5; roundTrip++)
            latex = ExpressionAlignment.toPresentation(ExpressionAlignment.toCanonical(ExpressionAlignment.toPresentation(latex)));
        expect(latex).toBe('\\begin{align}a&=1\\\\b&=2\\end{align}');
        expect(ExpressionAlignment.toCanonical(latex)).toBe('\\displaylines{a=1\\\\b=2}');
    });

    test('an equals sign inside a nested expression is not aligned', () => {
        const rowLatex = 'f=\\begin{cases}1 & t=0\\\\2 & t\\ge2\\end{cases}';
        expect(ExpressionAlignment.findPrimaryRelationIndex(rowLatex)).toBe(1);
        expect(ExpressionAlignment.toPresentation(`\\displaylines{${rowLatex}\\\\g=3}`))
            .toBe(`\\begin{align}f&=\\begin{cases}1 & t=0\\\\2 & t\\ge2\\end{cases}\\\\g&=3\\end{align}`);
    });

    test('an equals sign inside delimiters or braces is not the primary one', () => {
        expect(ExpressionAlignment.findPrimaryRelationIndex('f\\left(a=1\\right)=2')).toBe(17);
        expect(ExpressionAlignment.findPrimaryRelationIndex('x^{a=1}=2')).toBe(7);
    });

    test('fractions and derivatives on the left hand side keep the shared column', () => {
        const canonical = '\\displaylines{\\frac{\\differentialD{NO_2}}{\\differentialD{t}}=2\\\\\\frac{a}{b}=3}';
        expect(ExpressionAlignment.toPresentation(canonical))
            .toBe('\\begin{align}\\frac{\\differentialD{NO_2}}{\\differentialD{t}}&=2\\\\\\frac{a}{b}&=3\\end{align}');
    });

    test('rows without an equals sign stay in the left column', () => {
        expect(ExpressionAlignment.toPresentation('\\displaylines{a=1\\\\b=2\\\\c}'))
            .toBe('\\begin{align}a&=1\\\\b&=2\\\\c\\end{align}');
    });

    test('normalization is asked for only when the cells are misplaced', () => {
        expect(ExpressionAlignment.needsNormalization('\\begin{align}a & =1\\\\ b & =2\\end{align}')).toBe(false);
        expect(ExpressionAlignment.needsNormalization('\\begin{align}a & =1\\\\  & b=2\\end{align}')).toBe(true);
        expect(ExpressionAlignment.needsNormalization('\\begin{align}a & =1\\\\  & \\end{align}')).toBe(false);
        expect(ExpressionAlignment.needsNormalization('\\displaylines{a=1}')).toBe(false);
        expect(ExpressionAlignment.needsNormalization('\\displaylines{a=1\\\\b=2}')).toBe(true);
    });

    test('a block goes back to a plain row when a single equation is left', () => {
        expect(ExpressionAlignment.toPresentation('\\begin{align}a & =1\\end{align}')).toBe('\\displaylines{a=1}');
    });
});

test.describe('decoration matching', () => {
    test('tokens are matched to the atoms of the model in order', () => {
        const leaves = [{ offset: 1, text: 'a' }, { offset: 2, text: '=' }, { offset: 3, text: '1' }];
        const tokens = MathSemantics.classify('a=1');
        expect(MathSemanticDecorator.matchTokensToLeaves(leaves, tokens)).toEqual(['variable', 'operator', 'number']);
    });

    test('matching resynchronizes over atoms the parser does not emit', () => {
        const leaves = [{ offset: 1, text: 'x' }, { offset: 2, text: '' }, { offset: 3, text: '\\ne' }, { offset: 4, text: 'y' }];
        const tokens = MathSemantics.classify('x\\ne y');
        const roles = MathSemanticDecorator.matchTokensToLeaves(leaves, tokens);
        expect(roles[0]).toBe('variable');
        expect(roles[3]).toBe('variable');
    });

    test('a differential atom is matched by the way MathLive writes it', () => {
        expect(MathSemanticDecorator.normalizeText('\\differentialD')).toBe('\\mathrm{d}');
    });

    test('diagnostics are collected once per symbol', () => {
        const tokens = MathSemantics.classify('r=r+q', { getSymbolRole: name => (name === 'r' ? MathSymbolRole.WARNING : name === 'q' ? MathSymbolRole.ERROR : null) });
        const diagnostics = MathSemanticDecorator.collectDiagnostics(tokens, { getDiagnosticMessage: symbolName => `Unknown term: ${symbolName}` });
        expect(diagnostics).toEqual([
            { role: 'warning', symbolName: 'r', message: 'Unknown term: r' },
            { role: 'error', symbolName: 'q', message: 'Unknown term: q' }
        ]);
    });

    test('every semantic category has a theme token and a fallback colour', () => {
        for (const role of MathSemantics.rolePriority) {
            expect(MathSemanticDecorator.roleColorVariables[role]).toBe(`--math-${role}`);
            expect(MathSemanticDecorator.fallbackRoleColors[role]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });
});
