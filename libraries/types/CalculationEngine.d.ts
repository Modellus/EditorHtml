import * as antlr from 'antlr4ng';
import { ParseTreeListener, TerminalNode, ErrorNode, ParserRuleContext, AbstractParseTreeVisitor } from 'antlr4ng';
import { EventEmitter } from 'events';

declare class Branch {
    text: string;
    readonly children: Branch[];
    calculate: (values: {
        [name: string]: number;
    }) => number;
    op?: string;
    constructor(text: string, calculate: (values: {
        [name: string]: number;
    }) => number, ...children: Branch[]);
    withOp(op: string): this;
}

declare enum TermType {
    DIFFERENTIAL = 0,
    FUNCTION = 1,
    REGRESSION = 2,
    INDEPENDENT = 3,
    PRELOADED = 4,
    PARAMETER = 5
}

declare class Expression {
    name: string;
    calculate: (input: {
        [name: string]: number;
    }) => number;
    condition: ((input: {
        [name: string]: number;
    }) => boolean) | null;
    type: TermType;
    constructor(name: string, calculate: (input: {
        [name: string]: number;
    }) => number, type?: TermType, condition?: ((input: {
        [name: string]: number;
    }) => boolean) | null);
}

interface BodyExpressionRegistration {
    expression: Expression;
    termType: TermType;
    expressionTree?: Branch;
    conditionTree?: Branch;
}
declare class Body {
    readonly name: string;
    readonly type: string;
    readonly expressions: BodyExpressionRegistration[];
    readonly termInitialValues: {
        name: string;
        value: number;
        type: TermType;
    }[];
    constructor(name: string, type: string);
    addExpression(expression: Expression, termType?: TermType, expressionTree?: Branch, conditionTree?: Branch): void;
    addTermInitialValue(name: string, value: number, type?: TermType): void;
    afterIterate(values: {
        [name: string]: number;
    }): void;
}

declare class Term {
    name: string;
    type: TermType;
    expressionLatex: string | null;
    unitsTree: Branch | null;
    unitsText: string | null;
    private _initialValues;
    constructor(name: string, type?: TermType);
    getInitialValue(iteration?: number): number;
    setInitialValue(value: number, iteration?: number): void;
    get initialValues(): number[];
    set initialValues(values: number[]);
    hasInitialValue(iteration: number): boolean;
}

declare class PreloadedData {
    private termNames;
    private values;
    private iterationCol;
    private independentCol;
    private outliersByTermName;
    get names(): string[];
    get isEmpty(): boolean;
    load(names: string[], values: number[][], iterationTermName: string, independentTermName: string): void;
    reset(): void;
    addOutlierIteration(termName: string, iteration: number): void;
    removeOutlierIteration(termName: string, iteration: number): void;
    isOutlierIteration(termName: string, iteration: number): boolean;
    clear(): void;
    getDataTermNames(iterationTermName: string, independentTermName: string): string[];
    getMaxCoveredIteration(initialIndependent: number, step: number): number;
    apply(iteration: number, target: {
        [name: string]: number;
    }, independentTermName: string): void;
    private applyRow;
}

interface SystemProcessor {
    reset(): void;
    clear(): void;
    afterIterate(iteration: number): void;
}

declare enum SingularityType {
    None = 0,
    Infinity = 1,
    NaN = 2,
    Discontinuity = 3
}

interface Singularity {
    type: SingularityType;
    termName: string;
    iteration: number;
    caseNumber: number;
}
declare class System {
    static readonly ZERO: number;
    static readonly INFINITY: number;
    private _independent;
    private _iterationTerm;
    private _iterationTermStart;
    terms: {
        [name: string]: Term;
    };
    expressions: Array<Expression>;
    values: Array<{
        [name: string]: number;
    }>;
    iteration: number;
    step: number;
    casesCount: number;
    private caseInitialValues;
    private expressionsByName;
    private expressionTrees;
    private termNames;
    private differentialNames;
    private functionExpressionsWithCondition;
    private functionExpressionsWithoutCondition;
    private readonly piecewiseTermNames;
    private readonly iterationValuesByKey;
    private _lastIteration;
    private _lastCalculatedIteration;
    private readonly calculatedIterationKeys;
    useRadians: boolean;
    isCalculatingFunctions: boolean;
    readonly preloadedData: PreloadedData;
    private readonly bodies;
    private readonly processors;
    private readonly singularitiesByKey;
    private readonly singularityList;
    constructor(independent?: string, iterationTerm?: string, iterationTermStart?: number);
    get independent(): Term;
    set independent(name: string);
    get iterationTerm(): Term;
    set iterationTerm(name: string);
    get iterationTermStart(): number;
    set iterationTermStart(value: number);
    private normalizeIterationTermStart;
    iterationToIterationTermValue(iteration: number): number;
    iterationTermValueToIteration(termValue: number): number;
    registerProcessor(processor: SystemProcessor): void;
    setCaseCount(count: number): void;
    get lastIteration(): number;
    get lastCalculatedIteration(): number;
    get(caseNumber?: number): {
        [name: string]: number;
    };
    getIteration(iteration: number, caseNumber?: number): {
        [name: string]: number;
    };
    getByName(name: string, caseNumber?: number): number | undefined;
    getByNameOnIteration(iteration: number, name: string, caseNumber?: number): number | undefined;
    getIndependentOnIteration(iteration: number, caseNumber?: number): number;
    getIterationTermOnIteration(iteration: number, caseNumber?: number): number;
    getByExpression(expression: Expression, caseNumber?: number): number | undefined;
    getByTerm(term: Term, caseNumber?: number): number | undefined;
    addExpression(expression: Expression, termType?: TermType): void;
    addTerm(term: Term): void;
    addTermByName(term: string, type: TermType): void;
    addBody(body: Body): void;
    getBodies(): Body[];
    getBody(name: string): Body | undefined;
    loadTerms(names: string[], values: number[][]): void;
    addOutlierIteration(termName: string, iteration: number): void;
    removeOutlierIteration(termName: string, iteration: number): void;
    reset(): void;
    clear(): void;
    calculateFunctions(): void;
    private calculateFunctionsForVisibleIterations;
    private calculateFunctionsOnIteration;
    private evaluateFunctionExpressions;
    private areFunctionValuesEqual;
    addSingularity(type: SingularityType, termName: string, iteration: number, caseNumber: number): void;
    getSingularityType(termName: string, iteration: number, caseNumber?: number): SingularityType;
    getSingularities(): ReadonlyArray<Singularity>;
    getConditionalExpressions(): Expression[];
    getConditionalTermNames(): string[];
    private applyInitialValues;
    addValues(values: {
        [name: string]: number;
    }): void;
    calculate(values: {
        [name: string]: number;
    }, applyInitialValuesToCurrentIteration?: boolean): {
        [name: string]: number;
    };
    isIterationCalculated(iteration: number, caseNumber?: number): boolean;
    getIndependent(caseNumber?: number): number;
    setInitialIndependent(value: number): void;
    isEditable(term: Term): boolean;
    set(term: Term, value: number, caseNumber?: number): void;
    setByExpression(expression: Expression, value: number, caseNumber?: number): void;
    getExpression(name: string): Expression | undefined;
    markAsPiecewise(name: string): void;
    storeExpressionTree(name: string, tree: Branch): void;
    storeExpressionTreeWithCondition(name: string, expressionTree: Branch, conditionTree?: Branch): void;
    getExpressionTree(name: string): Branch | undefined;
    getExpressionTrees(name: string): Branch[];
    getExpressionTreePairs(name: string): {
        expressionTree: Branch;
        conditionTree?: Branch;
    }[];
    getTerm(name: string): Term | undefined;
    isTerm(name: string): boolean;
    renameRegressionTerm(currentName: string, newName: string): void;
    setInitialByTerm(term: Term, value: number, iteration?: number, caseNumber?: number): void;
    setInitialByName(name: string, value: number, iteration?: number, caseNumber?: number): void;
    getValue(values: {
        [name: string]: number;
    }, term: string): number;
    getValueAtIteration(iteration: number, term: string, caseNumber?: number): number;
    getValueAtIndependent(value: number, term: string, caseNumber?: number): number;
    getInitialByExpression(expression: Expression, iteration?: number): number;
    getTermsNames(): string[];
    getDifferentialTermsNames(): string[];
    assertCaseNumber(caseNumber: number): void;
    removeExpressionsByName(targetTermName: string): void;
    removeTermCompletely(termName: string): void;
    private hasInitialValueForCase;
    private getInitialValueForCase;
    private getIterationKey;
    private indexIterationValue;
    private getIterationValue;
    private assertValidCase;
    private populatePreloadedIterations;
}

declare class LatexVisitor {
    private readonly system;
    constructor(system: System);
    build(): void;
    private getTermLatexName;
    private buildConditionalLatex;
    private buildRegressionConditionalLatex;
    private formatNumber;
    visit(branch: Branch): string;
    private render;
    private renderBinaryOperator;
    private renderFunction;
    private wrapIfNeeded;
}

/**
 * This interface defines a complete listener for a parse tree produced by
 * `LatexMathParser`.
 */
declare class LatexMathListener implements ParseTreeListener {
    /**
     * Enter a parse tree produced by `LatexMathParser.program`.
     * @param ctx the parse tree
     */
    enterProgram?: (ctx: ProgramContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.program`.
     * @param ctx the parse tree
     */
    exitProgram?: (ctx: ProgramContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.statement`.
     * @param ctx the parse tree
     */
    enterStatement?: (ctx: StatementContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.statement`.
     * @param ctx the parse tree
     */
    exitStatement?: (ctx: StatementContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.differentialMarker`.
     * @param ctx the parse tree
     */
    enterDifferentialMarker?: (ctx: DifferentialMarkerContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.differentialMarker`.
     * @param ctx the parse tree
     */
    exitDifferentialMarker?: (ctx: DifferentialMarkerContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.differential`.
     * @param ctx the parse tree
     */
    enterDifferential?: (ctx: DifferentialContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.differential`.
     * @param ctx the parse tree
     */
    exitDifferential?: (ctx: DifferentialContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativePrime`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterDerivativePrime?: (ctx: DerivativePrimeContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativePrime`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitDerivativePrime?: (ctx: DerivativePrimeContext) => void;
    /**
     * Enter a parse tree produced by the `Function`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunction?: (ctx: FunctionContext) => void;
    /**
     * Exit a parse tree produced by the `Function`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunction?: (ctx: FunctionContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionSubscript`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionSubscript?: (ctx: FunctionSubscriptContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionSubscript`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionSubscript?: (ctx: FunctionSubscriptContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionSubscriptDigit`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionSubscriptDigit?: (ctx: FunctionSubscriptDigitContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionSubscriptDigit`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionSubscriptDigit?: (ctx: FunctionSubscriptDigitContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionIndependent`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionIndependent?: (ctx: FunctionIndependentContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionIndependent`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionIndependent?: (ctx: FunctionIndependentContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionConditional?: (ctx: FunctionConditionalContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionConditional?: (ctx: FunctionConditionalContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionSubscriptConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionSubscriptConditional?: (ctx: FunctionSubscriptConditionalContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionSubscriptConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionSubscriptConditional?: (ctx: FunctionSubscriptConditionalContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionSubscriptDigitConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionSubscriptDigitConditional?: (ctx: FunctionSubscriptDigitConditionalContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionSubscriptDigitConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionSubscriptDigitConditional?: (ctx: FunctionSubscriptDigitConditionalContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.caseRow`.
     * @param ctx the parse tree
     */
    enterCaseRow?: (ctx: CaseRowContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.caseRow`.
     * @param ctx the parse tree
     */
    exitCaseRow?: (ctx: CaseRowContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionAnd`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionAnd?: (ctx: ConditionAndContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionAnd`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionAnd?: (ctx: ConditionAndContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionChained`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionChained?: (ctx: ConditionChainedContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionChained`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionChained?: (ctx: ConditionChainedContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionOtherwiseText`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionOtherwiseText?: (ctx: ConditionOtherwiseTextContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionOtherwiseText`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionOtherwiseText?: (ctx: ConditionOtherwiseTextContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionOr`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionOr?: (ctx: ConditionOrContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionOr`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionOr?: (ctx: ConditionOrContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionOtherwise`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionOtherwise?: (ctx: ConditionOtherwiseContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionOtherwise`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionOtherwise?: (ctx: ConditionOtherwiseContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionNot`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionNot?: (ctx: ConditionNotContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionNot`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionNot?: (ctx: ConditionNotContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionExpression`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionExpression?: (ctx: ConditionExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionExpression`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionExpression?: (ctx: ConditionExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `ConditionParenthesis`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    enterConditionParenthesis?: (ctx: ConditionParenthesisContext) => void;
    /**
     * Exit a parse tree produced by the `ConditionParenthesis`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     */
    exitConditionParenthesis?: (ctx: ConditionParenthesisContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.conditionOperator`.
     * @param ctx the parse tree
     */
    enterConditionOperator?: (ctx: ConditionOperatorContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.conditionOperator`.
     * @param ctx the parse tree
     */
    exitConditionOperator?: (ctx: ConditionOperatorContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.units`.
     * @param ctx the parse tree
     */
    enterUnits?: (ctx: UnitsContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.units`.
     * @param ctx the parse tree
     */
    exitUnits?: (ctx: UnitsContext) => void;
    /**
     * Enter a parse tree produced by the `FractionDigits`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFractionDigits?: (ctx: FractionDigitsContext) => void;
    /**
     * Exit a parse tree produced by the `FractionDigits`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFractionDigits?: (ctx: FractionDigitsContext) => void;
    /**
     * Enter a parse tree produced by the `Multiplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterMultiplication?: (ctx: MultiplicationContext) => void;
    /**
     * Exit a parse tree produced by the `Multiplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitMultiplication?: (ctx: MultiplicationContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativePrimeExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativePrimeExpression?: (ctx: DerivativePrimeExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativePrimeExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativePrimeExpression?: (ctx: DerivativePrimeExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeDOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeDOperator?: (ctx: DerivativeDOperatorContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeDOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeDOperator?: (ctx: DerivativeDOperatorContext) => void;
    /**
     * Enter a parse tree produced by the `FunctionApplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFunctionApplication?: (ctx: FunctionApplicationContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionApplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFunctionApplication?: (ctx: FunctionApplicationContext) => void;
    /**
     * Enter a parse tree produced by the `Rnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterRnd?: (ctx: RndContext) => void;
    /**
     * Exit a parse tree produced by the `Rnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitRnd?: (ctx: RndContext) => void;
    /**
     * Enter a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSine?: (ctx: SineContext) => void;
    /**
     * Exit a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSine?: (ctx: SineContext) => void;
    /**
     * Enter a parse tree produced by the `FractionDNumerator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFractionDNumerator?: (ctx: FractionDNumeratorContext) => void;
    /**
     * Exit a parse tree produced by the `FractionDNumerator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFractionDNumerator?: (ctx: FractionDNumeratorContext) => void;
    /**
     * Enter a parse tree produced by the `Maximum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterMaximum?: (ctx: MaximumContext) => void;
    /**
     * Exit a parse tree produced by the `Maximum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitMaximum?: (ctx: MaximumContext) => void;
    /**
     * Enter a parse tree produced by the `HyperbolicTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterHyperbolicTangent?: (ctx: HyperbolicTangentContext) => void;
    /**
     * Exit a parse tree produced by the `HyperbolicTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitHyperbolicTangent?: (ctx: HyperbolicTangentContext) => void;
    /**
     * Enter a parse tree produced by the `NaturalLogarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterNaturalLogarithm?: (ctx: NaturalLogarithmContext) => void;
    /**
     * Exit a parse tree produced by the `NaturalLogarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitNaturalLogarithm?: (ctx: NaturalLogarithmContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeDNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeDNoBraces?: (ctx: DerivativeDNoBracesContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeDNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeDNoBraces?: (ctx: DerivativeDNoBracesContext) => void;
    /**
     * Enter a parse tree produced by the `Cotangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterCotangent?: (ctx: CotangentContext) => void;
    /**
     * Exit a parse tree produced by the `Cotangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitCotangent?: (ctx: CotangentContext) => void;
    /**
     * Enter a parse tree produced by the `ArcCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterArcCosine?: (ctx: ArcCosineContext) => void;
    /**
     * Exit a parse tree produced by the `ArcCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitArcCosine?: (ctx: ArcCosineContext) => void;
    /**
     * Enter a parse tree produced by the `AbsoluteValue`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterAbsoluteValue?: (ctx: AbsoluteValueContext) => void;
    /**
     * Exit a parse tree produced by the `AbsoluteValue`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitAbsoluteValue?: (ctx: AbsoluteValueContext) => void;
    /**
     * Enter a parse tree produced by the `Addition`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterAddition?: (ctx: AdditionContext) => void;
    /**
     * Exit a parse tree produced by the `Addition`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitAddition?: (ctx: AdditionContext) => void;
    /**
     * Enter a parse tree produced by the `Modulo`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterModulo?: (ctx: ModuloContext) => void;
    /**
     * Exit a parse tree produced by the `Modulo`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitModulo?: (ctx: ModuloContext) => void;
    /**
     * Enter a parse tree produced by the `Determinant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDeterminant?: (ctx: DeterminantContext) => void;
    /**
     * Exit a parse tree produced by the `Determinant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDeterminant?: (ctx: DeterminantContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeOperator?: (ctx: DerivativeOperatorContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeOperator?: (ctx: DerivativeOperatorContext) => void;
    /**
     * Enter a parse tree produced by the `FractionDDenominator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFractionDDenominator?: (ctx: FractionDDenominatorContext) => void;
    /**
     * Exit a parse tree produced by the `FractionDDenominator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFractionDDenominator?: (ctx: FractionDDenominatorContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeOperatorPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeOperatorPlain?: (ctx: DerivativeOperatorPlainContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeOperatorPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeOperatorPlain?: (ctx: DerivativeOperatorPlainContext) => void;
    /**
     * Enter a parse tree produced by the `ArcTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterArcTangent?: (ctx: ArcTangentContext) => void;
    /**
     * Exit a parse tree produced by the `ArcTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitArcTangent?: (ctx: ArcTangentContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeDMixed`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeDMixed?: (ctx: DerivativeDMixedContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeDMixed`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeDMixed?: (ctx: DerivativeDMixedContext) => void;
    /**
     * Enter a parse tree produced by the `Derivative`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivative?: (ctx: DerivativeContext) => void;
    /**
     * Exit a parse tree produced by the `Derivative`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivative?: (ctx: DerivativeContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeD`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeD?: (ctx: DerivativeDContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeD`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeD?: (ctx: DerivativeDContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativePrimeExpressionPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativePrimeExpressionPlain?: (ctx: DerivativePrimeExpressionPlainContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativePrimeExpressionPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativePrimeExpressionPlain?: (ctx: DerivativePrimeExpressionPlainContext) => void;
    /**
     * Enter a parse tree produced by the `Ceil`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterCeil?: (ctx: CeilContext) => void;
    /**
     * Exit a parse tree produced by the `Ceil`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitCeil?: (ctx: CeilContext) => void;
    /**
     * Enter a parse tree produced by the `NthRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterNthRoot?: (ctx: NthRootContext) => void;
    /**
     * Exit a parse tree produced by the `NthRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitNthRoot?: (ctx: NthRootContext) => void;
    /**
     * Enter a parse tree produced by the `IRnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterIRnd?: (ctx: IRndContext) => void;
    /**
     * Exit a parse tree produced by the `IRnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitIRnd?: (ctx: IRndContext) => void;
    /**
     * Enter a parse tree produced by the `Cosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterCosine?: (ctx: CosineContext) => void;
    /**
     * Exit a parse tree produced by the `Cosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitCosine?: (ctx: CosineContext) => void;
    /**
     * Enter a parse tree produced by the `Cosecant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterCosecant?: (ctx: CosecantContext) => void;
    /**
     * Exit a parse tree produced by the `Cosecant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitCosecant?: (ctx: CosecantContext) => void;
    /**
     * Enter a parse tree produced by the `Minimum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterMinimum?: (ctx: MinimumContext) => void;
    /**
     * Exit a parse tree produced by the `Minimum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitMinimum?: (ctx: MinimumContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeDMixedNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeDMixedNoBraces?: (ctx: DerivativeDMixedNoBracesContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeDMixedNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeDMixedNoBraces?: (ctx: DerivativeDMixedNoBracesContext) => void;
    /**
     * Enter a parse tree produced by the `Variable`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterVariable?: (ctx: VariableContext) => void;
    /**
     * Exit a parse tree produced by the `Variable`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitVariable?: (ctx: VariableContext) => void;
    /**
     * Enter a parse tree produced by the `Negation`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterNegation?: (ctx: NegationContext) => void;
    /**
     * Exit a parse tree produced by the `Negation`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitNegation?: (ctx: NegationContext) => void;
    /**
     * Enter a parse tree produced by the `Constant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterConstant?: (ctx: ConstantContext) => void;
    /**
     * Exit a parse tree produced by the `Constant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitConstant?: (ctx: ConstantContext) => void;
    /**
     * Enter a parse tree produced by the `ArcSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterArcSine?: (ctx: ArcSineContext) => void;
    /**
     * Exit a parse tree produced by the `ArcSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitArcSine?: (ctx: ArcSineContext) => void;
    /**
     * Enter a parse tree produced by the `HyperbolicSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterHyperbolicSine?: (ctx: HyperbolicSineContext) => void;
    /**
     * Exit a parse tree produced by the `HyperbolicSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitHyperbolicSine?: (ctx: HyperbolicSineContext) => void;
    /**
     * Enter a parse tree produced by the `Secant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSecant?: (ctx: SecantContext) => void;
    /**
     * Exit a parse tree produced by the `Secant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSecant?: (ctx: SecantContext) => void;
    /**
     * Enter a parse tree produced by the `Subscript`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSubscript?: (ctx: SubscriptContext) => void;
    /**
     * Exit a parse tree produced by the `Subscript`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSubscript?: (ctx: SubscriptContext) => void;
    /**
     * Enter a parse tree produced by the `Int`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterInt?: (ctx: IntContext) => void;
    /**
     * Exit a parse tree produced by the `Int`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitInt?: (ctx: IntContext) => void;
    /**
     * Enter a parse tree produced by the `DeltaName`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDeltaName?: (ctx: DeltaNameContext) => void;
    /**
     * Exit a parse tree produced by the `DeltaName`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDeltaName?: (ctx: DeltaNameContext) => void;
    /**
     * Enter a parse tree produced by the `Factorial`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFactorial?: (ctx: FactorialContext) => void;
    /**
     * Exit a parse tree produced by the `Factorial`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFactorial?: (ctx: FactorialContext) => void;
    /**
     * Enter a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterParenthesis?: (ctx: ParenthesisContext) => void;
    /**
     * Exit a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitParenthesis?: (ctx: ParenthesisContext) => void;
    /**
     * Enter a parse tree produced by the `ParenthesisPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterParenthesisPlain?: (ctx: ParenthesisPlainContext) => void;
    /**
     * Exit a parse tree produced by the `ParenthesisPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitParenthesisPlain?: (ctx: ParenthesisPlainContext) => void;
    /**
     * Enter a parse tree produced by the `DeltaExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDeltaExpression?: (ctx: DeltaExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `DeltaExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDeltaExpression?: (ctx: DeltaExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `Braces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterBraces?: (ctx: BracesContext) => void;
    /**
     * Exit a parse tree produced by the `Braces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitBraces?: (ctx: BracesContext) => void;
    /**
     * Enter a parse tree produced by the `Number`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterNumber?: (ctx: NumberContext) => void;
    /**
     * Exit a parse tree produced by the `Number`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitNumber?: (ctx: NumberContext) => void;
    /**
     * Enter a parse tree produced by the `MultiplicationDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterMultiplicationDigit?: (ctx: MultiplicationDigitContext) => void;
    /**
     * Exit a parse tree produced by the `MultiplicationDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitMultiplicationDigit?: (ctx: MultiplicationDigitContext) => void;
    /**
     * Enter a parse tree produced by the `SquareRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSquareRoot?: (ctx: SquareRootContext) => void;
    /**
     * Exit a parse tree produced by the `SquareRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSquareRoot?: (ctx: SquareRootContext) => void;
    /**
     * Enter a parse tree produced by the `Logarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterLogarithm?: (ctx: LogarithmContext) => void;
    /**
     * Exit a parse tree produced by the `Logarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitLogarithm?: (ctx: LogarithmContext) => void;
    /**
     * Enter a parse tree produced by the `DerivativeDOperatorNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDerivativeDOperatorNoBraces?: (ctx: DerivativeDOperatorNoBracesContext) => void;
    /**
     * Exit a parse tree produced by the `DerivativeDOperatorNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDerivativeDOperatorNoBraces?: (ctx: DerivativeDOperatorNoBracesContext) => void;
    /**
     * Enter a parse tree produced by the `Round`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterRound?: (ctx: RoundContext) => void;
    /**
     * Exit a parse tree produced by the `Round`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitRound?: (ctx: RoundContext) => void;
    /**
     * Enter a parse tree produced by the `Division`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterDivision?: (ctx: DivisionContext) => void;
    /**
     * Exit a parse tree produced by the `Division`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitDivision?: (ctx: DivisionContext) => void;
    /**
     * Enter a parse tree produced by the `SubscriptDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSubscriptDigit?: (ctx: SubscriptDigitContext) => void;
    /**
     * Exit a parse tree produced by the `SubscriptDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSubscriptDigit?: (ctx: SubscriptDigitContext) => void;
    /**
     * Enter a parse tree produced by the `Fraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterFraction?: (ctx: FractionContext) => void;
    /**
     * Exit a parse tree produced by the `Fraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitFraction?: (ctx: FractionContext) => void;
    /**
     * Enter a parse tree produced by the `Tangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterTangent?: (ctx: TangentContext) => void;
    /**
     * Exit a parse tree produced by the `Tangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitTangent?: (ctx: TangentContext) => void;
    /**
     * Enter a parse tree produced by the `MultiplicationImplicit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterMultiplicationImplicit?: (ctx: MultiplicationImplicitContext) => void;
    /**
     * Exit a parse tree produced by the `MultiplicationImplicit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitMultiplicationImplicit?: (ctx: MultiplicationImplicitContext) => void;
    /**
     * Enter a parse tree produced by the `Subtraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSubtraction?: (ctx: SubtractionContext) => void;
    /**
     * Exit a parse tree produced by the `Subtraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSubtraction?: (ctx: SubtractionContext) => void;
    /**
     * Enter a parse tree produced by the `Positive`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterPositive?: (ctx: PositiveContext) => void;
    /**
     * Exit a parse tree produced by the `Positive`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitPositive?: (ctx: PositiveContext) => void;
    /**
     * Enter a parse tree produced by the `HyperbolicCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterHyperbolicCosine?: (ctx: HyperbolicCosineContext) => void;
    /**
     * Exit a parse tree produced by the `HyperbolicCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitHyperbolicCosine?: (ctx: HyperbolicCosineContext) => void;
    /**
     * Enter a parse tree produced by the `Sign`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterSign?: (ctx: SignContext) => void;
    /**
     * Exit a parse tree produced by the `Sign`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitSign?: (ctx: SignContext) => void;
    /**
     * Enter a parse tree produced by the `Power`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterPower?: (ctx: PowerContext) => void;
    /**
     * Exit a parse tree produced by the `Power`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitPower?: (ctx: PowerContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.implicitMultiplicand`.
     * @param ctx the parse tree
     */
    enterImplicitMultiplicand?: (ctx: ImplicitMultiplicandContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.implicitMultiplicand`.
     * @param ctx the parse tree
     */
    exitImplicitMultiplicand?: (ctx: ImplicitMultiplicandContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.reserved`.
     * @param ctx the parse tree
     */
    enterReserved?: (ctx: ReservedContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.reserved`.
     * @param ctx the parse tree
     */
    exitReserved?: (ctx: ReservedContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.decimal`.
     * @param ctx the parse tree
     */
    enterDecimal?: (ctx: DecimalContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.decimal`.
     * @param ctx the parse tree
     */
    exitDecimal?: (ctx: DecimalContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.name`.
     * @param ctx the parse tree
     */
    enterName?: (ctx: NameContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.name`.
     * @param ctx the parse tree
     */
    exitName?: (ctx: NameContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.dname`.
     * @param ctx the parse tree
     */
    enterDname?: (ctx: DnameContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.dname`.
     * @param ctx the parse tree
     */
    exitDname?: (ctx: DnameContext) => void;
    visitTerminal(node: TerminalNode): void;
    visitErrorNode(node: ErrorNode): void;
    enterEveryRule(node: ParserRuleContext): void;
    exitEveryRule(node: ParserRuleContext): void;
}

declare class ProgramContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    statement(): StatementContext;
    EOF(): antlr.TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class StatementContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    differential(): DifferentialContext | null;
    assignment(): AssignmentContext | null;
    expression(): ExpressionContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DifferentialMarkerContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DifferentialContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    differentialMarker(): DifferentialMarkerContext[];
    differentialMarker(i: number): DifferentialMarkerContext | null;
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext;
    units(): UnitsContext | null;
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class AssignmentContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: AssignmentContext): void;
}
declare class FunctionConditionalContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    caseRow(): CaseRowContext[];
    caseRow(i: number): CaseRowContext | null;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativePrimeContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionIndependentContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptDigitContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
    expression(): ExpressionContext;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptDigitConditionalContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
    caseRow(): CaseRowContext[];
    caseRow(i: number): CaseRowContext | null;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptConditionalContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext;
    caseRow(): CaseRowContext[];
    caseRow(i: number): CaseRowContext | null;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    units(): UnitsContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class CaseRowContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    expression(): ExpressionContext;
    condition(): ConditionContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: ConditionContext): void;
}
declare class ConditionAndContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    condition(): ConditionContext[];
    condition(i: number): ConditionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionChainedContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    conditionOperator(): ConditionOperatorContext[];
    conditionOperator(i: number): ConditionOperatorContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionOtherwiseTextContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionOrContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    condition(): ConditionContext[];
    condition(i: number): ConditionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionOtherwiseContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionNotContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    condition(): ConditionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionExpressionContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    conditionOperator(): ConditionOperatorContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionParenthesisContext extends ConditionContext {
    constructor(ctx: ConditionContext);
    condition(): ConditionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConditionOperatorContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class UnitsContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    name(): NameContext;
    expression(): ExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ExpressionContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: ExpressionContext): void;
}
declare class FractionDigitsContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    DIGIT(): antlr.TerminalNode[];
    DIGIT(i: number): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class MultiplicationContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativePrimeExpressionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDOperatorContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    expression(): ExpressionContext;
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionApplicationContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class RndContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FractionDNumeratorContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    dname(): DnameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class MaximumContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class HyperbolicTangentContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NaturalLogarithmContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDNoBracesContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    name(): NameContext;
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class CotangentContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ArcCosineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class AbsoluteValueContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class AdditionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    PLUS(): antlr.TerminalNode;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ModuloContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DeterminantContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeOperatorContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    differentialMarker(): DifferentialMarkerContext[];
    differentialMarker(i: number): DifferentialMarkerContext | null;
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FractionDDenominatorContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    dname(): DnameContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeOperatorPlainContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    differentialMarker(): DifferentialMarkerContext[];
    differentialMarker(i: number): DifferentialMarkerContext | null;
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ArcTangentContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDMixedContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    differentialMarker(): DifferentialMarkerContext;
    expression(): ExpressionContext;
    name(): NameContext;
    ID(): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    differentialMarker(): DifferentialMarkerContext[];
    differentialMarker(i: number): DifferentialMarkerContext | null;
    expression(): ExpressionContext;
    name(): NameContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    name(): NameContext;
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativePrimeExpressionPlainContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class CeilContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NthRootContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class IRndContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class CosineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class CosecantContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class MinimumContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDMixedNoBracesContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    differentialMarker(): DifferentialMarkerContext;
    expression(): ExpressionContext;
    name(): NameContext;
    ID(): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class VariableContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NegationContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    MINUS(): antlr.TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ConstantContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    reserved(): ReservedContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ArcSineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class HyperbolicSineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SecantContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SubscriptContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class IntContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DeltaNameContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FactorialContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ParenthesisContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ParenthesisPlainContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DeltaExpressionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class BracesContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NumberContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    decimal(): DecimalContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class MultiplicationDigitContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    decimal(): DecimalContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SquareRootContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class LogarithmContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeDOperatorNoBracesContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    expression(): ExpressionContext;
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class RoundContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DivisionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SubscriptDigitContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FractionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class TangentContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class MultiplicationImplicitContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    decimal(): DecimalContext;
    implicitMultiplicand(): ImplicitMultiplicandContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SubtractionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    MINUS(): antlr.TerminalNode;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class PositiveContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    PLUS(): antlr.TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class HyperbolicCosineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SignContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class PowerContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ImplicitMultiplicandContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    name(): NameContext | null;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ReservedContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DecimalContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    DIGIT(): antlr.TerminalNode[];
    DIGIT(i: number): antlr.TerminalNode | null;
    DOT(): antlr.TerminalNode | null;
    PLUS(): antlr.TerminalNode | null;
    MINUS(): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NameContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    DOT(): antlr.TerminalNode[];
    DOT(i: number): antlr.TerminalNode | null;
    SPECIAL(): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DnameContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    ID(): antlr.TerminalNode[];
    ID(i: number): antlr.TerminalNode | null;
    DIGIT(): antlr.TerminalNode[];
    DIGIT(i: number): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `LatexMathParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
declare class LatexMathVisitor<Result> extends AbstractParseTreeVisitor<Result> {
    /**
     * Visit a parse tree produced by `LatexMathParser.program`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitProgram?: (ctx: ProgramContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.statement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitStatement?: (ctx: StatementContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.differentialMarker`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDifferentialMarker?: (ctx: DifferentialMarkerContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.differential`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDifferential?: (ctx: DifferentialContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativePrime`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativePrime?: (ctx: DerivativePrimeContext) => Result;
    /**
     * Visit a parse tree produced by the `Function`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunction?: (ctx: FunctionContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionSubscript`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionSubscript?: (ctx: FunctionSubscriptContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionSubscriptDigit`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionSubscriptDigit?: (ctx: FunctionSubscriptDigitContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionIndependent`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionIndependent?: (ctx: FunctionIndependentContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionConditional?: (ctx: FunctionConditionalContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionSubscriptConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionSubscriptConditional?: (ctx: FunctionSubscriptConditionalContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionSubscriptDigitConditional`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionSubscriptDigitConditional?: (ctx: FunctionSubscriptDigitConditionalContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.caseRow`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCaseRow?: (ctx: CaseRowContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionAnd`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionAnd?: (ctx: ConditionAndContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionChained`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionChained?: (ctx: ConditionChainedContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionOtherwiseText`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionOtherwiseText?: (ctx: ConditionOtherwiseTextContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionOr`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionOr?: (ctx: ConditionOrContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionOtherwise`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionOtherwise?: (ctx: ConditionOtherwiseContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionNot`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionNot?: (ctx: ConditionNotContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionExpression`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionExpression?: (ctx: ConditionExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `ConditionParenthesis`
     * labeled alternative in `LatexMathParser.condition`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionParenthesis?: (ctx: ConditionParenthesisContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.conditionOperator`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConditionOperator?: (ctx: ConditionOperatorContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.units`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitUnits?: (ctx: UnitsContext) => Result;
    /**
     * Visit a parse tree produced by the `FractionDigits`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFractionDigits?: (ctx: FractionDigitsContext) => Result;
    /**
     * Visit a parse tree produced by the `Multiplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplication?: (ctx: MultiplicationContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativePrimeExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativePrimeExpression?: (ctx: DerivativePrimeExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeDOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeDOperator?: (ctx: DerivativeDOperatorContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionApplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionApplication?: (ctx: FunctionApplicationContext) => Result;
    /**
     * Visit a parse tree produced by the `Rnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitRnd?: (ctx: RndContext) => Result;
    /**
     * Visit a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSine?: (ctx: SineContext) => Result;
    /**
     * Visit a parse tree produced by the `FractionDNumerator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFractionDNumerator?: (ctx: FractionDNumeratorContext) => Result;
    /**
     * Visit a parse tree produced by the `Maximum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMaximum?: (ctx: MaximumContext) => Result;
    /**
     * Visit a parse tree produced by the `HyperbolicTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHyperbolicTangent?: (ctx: HyperbolicTangentContext) => Result;
    /**
     * Visit a parse tree produced by the `NaturalLogarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNaturalLogarithm?: (ctx: NaturalLogarithmContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeDNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeDNoBraces?: (ctx: DerivativeDNoBracesContext) => Result;
    /**
     * Visit a parse tree produced by the `Cotangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCotangent?: (ctx: CotangentContext) => Result;
    /**
     * Visit a parse tree produced by the `ArcCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArcCosine?: (ctx: ArcCosineContext) => Result;
    /**
     * Visit a parse tree produced by the `AbsoluteValue`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAbsoluteValue?: (ctx: AbsoluteValueContext) => Result;
    /**
     * Visit a parse tree produced by the `Addition`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAddition?: (ctx: AdditionContext) => Result;
    /**
     * Visit a parse tree produced by the `Modulo`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitModulo?: (ctx: ModuloContext) => Result;
    /**
     * Visit a parse tree produced by the `Determinant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDeterminant?: (ctx: DeterminantContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeOperator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeOperator?: (ctx: DerivativeOperatorContext) => Result;
    /**
     * Visit a parse tree produced by the `FractionDDenominator`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFractionDDenominator?: (ctx: FractionDDenominatorContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeOperatorPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeOperatorPlain?: (ctx: DerivativeOperatorPlainContext) => Result;
    /**
     * Visit a parse tree produced by the `ArcTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArcTangent?: (ctx: ArcTangentContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeDMixed`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeDMixed?: (ctx: DerivativeDMixedContext) => Result;
    /**
     * Visit a parse tree produced by the `Derivative`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivative?: (ctx: DerivativeContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeD`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeD?: (ctx: DerivativeDContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativePrimeExpressionPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativePrimeExpressionPlain?: (ctx: DerivativePrimeExpressionPlainContext) => Result;
    /**
     * Visit a parse tree produced by the `Ceil`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCeil?: (ctx: CeilContext) => Result;
    /**
     * Visit a parse tree produced by the `NthRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNthRoot?: (ctx: NthRootContext) => Result;
    /**
     * Visit a parse tree produced by the `IRnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIRnd?: (ctx: IRndContext) => Result;
    /**
     * Visit a parse tree produced by the `Cosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCosine?: (ctx: CosineContext) => Result;
    /**
     * Visit a parse tree produced by the `Cosecant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCosecant?: (ctx: CosecantContext) => Result;
    /**
     * Visit a parse tree produced by the `Minimum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMinimum?: (ctx: MinimumContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeDMixedNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeDMixedNoBraces?: (ctx: DerivativeDMixedNoBracesContext) => Result;
    /**
     * Visit a parse tree produced by the `Variable`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitVariable?: (ctx: VariableContext) => Result;
    /**
     * Visit a parse tree produced by the `Negation`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNegation?: (ctx: NegationContext) => Result;
    /**
     * Visit a parse tree produced by the `Constant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConstant?: (ctx: ConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `ArcSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArcSine?: (ctx: ArcSineContext) => Result;
    /**
     * Visit a parse tree produced by the `HyperbolicSine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHyperbolicSine?: (ctx: HyperbolicSineContext) => Result;
    /**
     * Visit a parse tree produced by the `Secant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSecant?: (ctx: SecantContext) => Result;
    /**
     * Visit a parse tree produced by the `Subscript`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubscript?: (ctx: SubscriptContext) => Result;
    /**
     * Visit a parse tree produced by the `Int`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitInt?: (ctx: IntContext) => Result;
    /**
     * Visit a parse tree produced by the `DeltaName`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDeltaName?: (ctx: DeltaNameContext) => Result;
    /**
     * Visit a parse tree produced by the `Factorial`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFactorial?: (ctx: FactorialContext) => Result;
    /**
     * Visit a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParenthesis?: (ctx: ParenthesisContext) => Result;
    /**
     * Visit a parse tree produced by the `ParenthesisPlain`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParenthesisPlain?: (ctx: ParenthesisPlainContext) => Result;
    /**
     * Visit a parse tree produced by the `DeltaExpression`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDeltaExpression?: (ctx: DeltaExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `Braces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitBraces?: (ctx: BracesContext) => Result;
    /**
     * Visit a parse tree produced by the `Number`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNumber?: (ctx: NumberContext) => Result;
    /**
     * Visit a parse tree produced by the `MultiplicationDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplicationDigit?: (ctx: MultiplicationDigitContext) => Result;
    /**
     * Visit a parse tree produced by the `SquareRoot`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSquareRoot?: (ctx: SquareRootContext) => Result;
    /**
     * Visit a parse tree produced by the `Logarithm`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLogarithm?: (ctx: LogarithmContext) => Result;
    /**
     * Visit a parse tree produced by the `DerivativeDOperatorNoBraces`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivativeDOperatorNoBraces?: (ctx: DerivativeDOperatorNoBracesContext) => Result;
    /**
     * Visit a parse tree produced by the `Round`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitRound?: (ctx: RoundContext) => Result;
    /**
     * Visit a parse tree produced by the `Division`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDivision?: (ctx: DivisionContext) => Result;
    /**
     * Visit a parse tree produced by the `SubscriptDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubscriptDigit?: (ctx: SubscriptDigitContext) => Result;
    /**
     * Visit a parse tree produced by the `Fraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFraction?: (ctx: FractionContext) => Result;
    /**
     * Visit a parse tree produced by the `Tangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTangent?: (ctx: TangentContext) => Result;
    /**
     * Visit a parse tree produced by the `MultiplicationImplicit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplicationImplicit?: (ctx: MultiplicationImplicitContext) => Result;
    /**
     * Visit a parse tree produced by the `Subtraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubtraction?: (ctx: SubtractionContext) => Result;
    /**
     * Visit a parse tree produced by the `Positive`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPositive?: (ctx: PositiveContext) => Result;
    /**
     * Visit a parse tree produced by the `HyperbolicCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitHyperbolicCosine?: (ctx: HyperbolicCosineContext) => Result;
    /**
     * Visit a parse tree produced by the `Sign`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSign?: (ctx: SignContext) => Result;
    /**
     * Visit a parse tree produced by the `Power`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPower?: (ctx: PowerContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.implicitMultiplicand`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitImplicitMultiplicand?: (ctx: ImplicitMultiplicandContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.reserved`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitReserved?: (ctx: ReservedContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.decimal`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDecimal?: (ctx: DecimalContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.name`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitName?: (ctx: NameContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.dname`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDname?: (ctx: DnameContext) => Result;
}

declare class Deriver extends LatexMathVisitor<Branch> {
    private readonly variable;
    private readonly system;
    private readonly evalVisitor;
    private readonly expander;
    constructor(system: System, variable: string);
    private eval;
    private numericalDerivative;
    private constant;
    private addB;
    private subB;
    private mulB;
    private divB;
    private negB;
    private powB;
    private sinB;
    private cosB;
    private lnB;
    private sqrtB;
    visitVariable: (context: VariableContext) => Branch;
    visitName: (context: NameContext) => Branch;
    visitNumber: (context: NumberContext) => Branch;
    visitDecimal: (context: DecimalContext) => Branch;
    visitConstant: (context: ConstantContext) => Branch;
    visitAddition: (context: AdditionContext) => Branch;
    visitSubtraction: (context: SubtractionContext) => Branch;
    visitMultiplication: (context: MultiplicationContext) => Branch;
    visitMultiplicationDigit: (context: MultiplicationDigitContext) => Branch;
    private parseExpression;
    visitMultiplicationImplicit: (context: MultiplicationImplicitContext) => Branch;
    visitDivision: (context: DivisionContext) => Branch;
    visitFraction: (context: FractionContext) => Branch;
    visitFractionDNumerator: (context: FractionDNumeratorContext) => Branch;
    visitFractionDDenominator: (context: FractionDDenominatorContext) => Branch;
    private dnameVariable;
    private variableBranch;
    private deriveVariable;
    visitFractionDigits: (context: FractionDigitsContext) => Branch;
    visitPower: (context: PowerContext) => Branch;
    visitFactorial: (context: FactorialContext) => Branch;
    visitNegation: (context: NegationContext) => Branch;
    visitSine: (context: SineContext) => Branch;
    visitCosine: (context: CosineContext) => Branch;
    visitTangent: (context: TangentContext) => Branch;
    visitArcSine: (context: ArcSineContext) => Branch;
    visitArcCosine: (context: ArcCosineContext) => Branch;
    visitArcTangent: (context: ArcTangentContext) => Branch;
    visitHyperbolicSine: (context: HyperbolicSineContext) => Branch;
    visitHyperbolicCosine: (context: HyperbolicCosineContext) => Branch;
    visitHyperbolicTangent: (context: HyperbolicTangentContext) => Branch;
    visitCotangent: (context: CotangentContext) => Branch;
    visitSecant: (context: SecantContext) => Branch;
    visitCosecant: (context: CosecantContext) => Branch;
    visitSquareRoot: (context: SquareRootContext) => Branch;
    visitNthRoot: (context: NthRootContext) => Branch;
    visitLogarithm: (context: LogarithmContext) => Branch;
    visitNaturalLogarithm: (context: NaturalLogarithmContext) => Branch;
    visitMaximum: (context: MaximumContext) => Branch;
    visitMinimum: (context: MinimumContext) => Branch;
    visitModulo: (context: ModuloContext) => Branch;
    visitDeterminant: (context: DeterminantContext) => Branch;
    visitSign: (context: SignContext) => Branch;
    visitRnd: (context: RndContext) => Branch;
    visitIRnd: (context: IRndContext) => Branch;
    visitInt: (context: IntContext) => Branch;
    visitCeil: (context: CeilContext) => Branch;
    visitRound: (context: RoundContext) => Branch;
    visitParenthesis: (context: ParenthesisContext) => Branch;
    visitParenthesisPlain: (context: ParenthesisPlainContext) => Branch;
    visitBraces: (context: BracesContext) => Branch;
    visitSubscript: (context: SubscriptContext) => Branch;
    visitSubscriptDigit: (context: SubscriptDigitContext) => Branch;
    visitDeltaName: (context: DeltaNameContext) => Branch;
    visitDeltaExpression: (context: DeltaExpressionContext) => Branch;
    visitDerivative: (context: DerivativeContext) => Branch;
    visitDerivativeD: (context: DerivativeDContext) => Branch;
    visitDerivativeOperator: (context: DerivativeOperatorContext) => Branch;
    visitDerivativeOperatorPlain: (context: DerivativeOperatorPlainContext) => Branch;
    visitDerivativeDOperator: (context: DerivativeDOperatorContext) => Branch;
    visitDerivativeDOperatorNoBraces: (context: DerivativeDOperatorNoBracesContext) => Branch;
    visitDerivativePrimeExpression: (context: DerivativePrimeExpressionContext) => Branch;
    visitDerivativePrimeExpressionPlain: (context: DerivativePrimeExpressionPlainContext) => Branch;
    private derivePrimeInner;
    private deriveInnerDerivative;
}

declare class Engine extends EventEmitter {
    readonly system: System;
    constructor(system: System);
    private iterateInternal;
    iterate(): void;
    private applyBodyCorrections;
    reset(): void;
    onIterate(listener: any): void;
}

declare class ExpressionExpander {
    private readonly system;
    private readonly expandingNames;
    constructor(system: System);
    tryExpand(name: string): unknown | null;
    endExpansion(name: string): void;
}

declare class Parser {
    private readonly system;
    hasErrors: boolean;
    errors: string[];
    constructor(system: System);
    parse(expression: string): Branch | null;
}

declare class PhysicalBody extends Body {
    readonly mass: number;
    readonly initialPositionX: number;
    readonly initialPositionY: number;
    readonly initialVelocityX: number;
    readonly initialVelocityY: number;
    constructor(name: string, mass: number, initialPositionX?: number, initialPositionY?: number, initialVelocityX?: number, initialVelocityY?: number);
    private buildTerms;
    private buildExpressions;
    private buildAccelerationXBranch;
    private buildAccelerationYBranch;
    private buildCollisionVelocityBranch;
    private createVariableBranch;
    private createConstantBranch;
    private createNegationBranch;
    private createMultiplicationBranch;
    private createDivisionBranch;
    private createSubtractionBranch;
    private createLessThanBranch;
    private createLessThanOrEqualBranch;
    private createAndBranch;
}

declare class PhysicalEngine {
    readonly system: System;
    private physicsConstantsRegistered;
    constructor(system: System);
    addBody(body: PhysicalBody): void;
    getBodies(): PhysicalBody[];
    private registerPhysicsConstants;
    reset(): void;
}

declare enum RegressionType {
    LINEAR = "Linear",
    QUADRATIC = "Quadratic"
}
interface RegressionPoint {
    caseNumber: number;
    iteration: number;
    independent: number;
    source: number;
    value: number;
}
interface RegressionResult {
    sourceTermName: string;
    targetTermName: string;
    regressionType: RegressionType;
    expression: string;
    quadratic: number;
    linear: number;
    constant: number;
    slope: number;
    intercept: number;
    data: RegressionPoint[];
}
declare class Regressor {
    private static readonly LINEAR;
    private static readonly QUADRATIC;
    private static readonly ZERO;
    private readonly system;
    constructor(system: System);
    calculate(sourceTermName: string, regressionType: RegressionType | string, caseNumber?: number, startIteration?: number, endIteration?: number): RegressionResult;
    remove(targetTermName: string, caseNumber?: number, startIteration?: number, endIteration?: number): void;
    private getIndependentAtIteration;
    private getOrCreateTerm;
    private resolveRange;
    private trimRange;
    private rebuildTerm;
    private clearTerm;
    private assignParameters;
    private addRange;
    private buildRangeBranch;
    private recalculate;
    private findRange;
    private buildExpression;
    private buildParameterized;
    private buildNumeric;
    private buildPolynomial;
    private buildData;
    private setParameter;
    private normalizeType;
    private getSamples;
    private getSamplesIn;
    private getIndependentRange;
    private calculateLinear;
    private calculateQuadratic;
    private solve3x3;
    private formatNumber;
    private get systemZero();
}

interface RegressionRange {
    sourceTermName: string;
    caseNumber: number;
    independentStart: number;
    independentEnd: number;
    regressionType: RegressionType;
    quadratic: number;
    linear: number;
    constant: number;
    parameterNames: string[];
}
declare class RegressionTerm extends Term {
    readonly sourceTermName: string;
    ranges: RegressionRange[];
    constructor(name: string, sourceTermName: string);
}

declare class SingularitiesDetector implements SystemProcessor {
    private readonly system;
    private readonly previouslyActiveExpressions;
    constructor(system: System);
    reset(): void;
    clear(): void;
    afterIterate(iteration: number): void;
    getSingularityType(termName: string, iteration: number, caseNumber?: number): SingularityType;
    getSingularities(): readonly Singularity[];
    private detectValueSingularities;
    private hasInvalidFactorialDomain;
    private containsInvalidFactorial;
    private detectDiscontinuities;
    private getConditionalBranches;
}

/**
 * Simplifies a Branch expression tree by repeatedly applying algebraic identity
 * rules until the tree no longer changes. Each pass traverses the tree top-down:
 * a rule is attempted at the current node first; if one fires, the simplified
 * result is returned immediately and the children are NOT recursed into during
 * that same pass. This means deeply-nested redundancies require one pass per
 * level, which is tracked in `passCount`.
 *
 * Rules applied at each node:
 *   add:  x+0 → x,  0+x → x
 *   sub:  x-0 → x,  0-x → neg(x)
 *   mul:  x*0 → 0,  0*x → 0,  x*1 → x,  1*x → x
 *   div:  0/x → 0,  x/1 → x
 *   pow:  x^0 → 1,  x^1 → x,  1^x → 1
 *   fac:  n! (constant n) → constant factorial(n)
 *   neg:  neg(0) → 0,  neg(neg(x)) → x
 *   constant folding: any node whose direct children are all constants
 */
declare class Simplifier {
    private _passCount;
    private readonly rules;
    private readonly rebuilders;
    constructor();
    private factorial;
    /** Total number of passes executed during the last call to `simplify`. */
    get passCount(): number;
    /**
     * Simplifies the given branch tree, running passes until no further
     * simplification is possible. Returns the simplified tree.
     */
    simplify(branch: Branch): Branch;
    /**
     * A single top-down pass. Tries a rule at the current node; if one fires,
     * returns the simplified result without recursing into it (deferred to the
     * next pass). If no rule fires, recurses into children and rebuilds.
     */
    private runPass;
    /**
     * Rebuilds a branch with replacement children, creating a new `calculate`
     * closure that references the new children so evaluation stays correct.
     */
    private rebuildBranch;
    private makeConstant;
    private isConstValue;
    private isAllConst;
    private foldConst;
    private tryApplyRule;
    private simplifyAdd;
    private simplifySub;
    private simplifyMul;
    private simplifyDiv;
    private simplifyPow;
    private simplifyNeg;
    private simplifyFac;
}

declare class Visitor extends LatexMathVisitor<Branch> {
    private readonly system;
    private isParsingUnits;
    constructor(system: System);
    visitStatement: (context: StatementContext) => Branch;
    private getConditionEvaluator;
    private buildConditionTree;
    private extractUnits;
    visitFractionDigits: (context: FractionDigitsContext) => Branch;
    visitFraction: (context: FractionContext) => Branch;
    visitFractionDNumerator: (context: FractionDNumeratorContext) => Branch;
    visitFractionDDenominator: (context: FractionDDenominatorContext) => Branch;
    private dnameBranch;
    private fractionBranch;
    visitVariable: (context: VariableContext) => Branch;
    visitName: (context: NameContext) => Branch;
    visitDecimal: (context: DecimalContext) => Branch;
    visitNumber: (context: NumberContext) => Branch;
    visitConstant: (context: ConstantContext) => Branch;
    visitFunction: (context: FunctionContext) => Branch;
    visitFunctionConditional: (context: FunctionConditionalContext) => Branch;
    visitFunctionSubscriptConditional: (context: FunctionSubscriptConditionalContext) => Branch;
    visitFunctionSubscriptDigitConditional: (context: FunctionSubscriptDigitConditionalContext) => Branch;
    visitFunctionSubscript: (context: FunctionSubscriptContext) => Branch;
    visitFunctionSubscriptDigit: (context: FunctionSubscriptDigitContext) => Branch;
    visitFunctionIndependent: (context: FunctionIndependentContext) => Branch;
    visitFunctionApplication: (context: FunctionApplicationContext) => Branch;
    visitPower: (context: PowerContext) => Branch;
    private factorial;
    visitFactorial: (context: FactorialContext) => Branch;
    visitDivision: (context: DivisionContext) => Branch;
    visitMultiplication: (context: MultiplicationContext) => Branch;
    visitMultiplicationDigit: (context: MultiplicationDigitContext) => Branch;
    private parseExpression;
    visitMultiplicationImplicit: (context: MultiplicationImplicitContext) => Branch;
    visitSubtraction: (context: SubtractionContext) => Branch;
    visitAddition: (context: AdditionContext) => Branch;
    visitAbsoluteValue: (context: AbsoluteValueContext) => Branch;
    visitParenthesis: (context: ParenthesisContext) => Branch;
    visitParenthesisPlain: (context: ParenthesisPlainContext) => Branch;
    visitBraces: (context: BracesContext) => Branch;
    visitDerivativePrime: (context: DerivativePrimeContext) => Branch;
    visitDifferential: (context: DifferentialContext) => Branch;
    private toRadians;
    visitSine: (context: SineContext) => Branch;
    visitCosine: (context: CosineContext) => Branch;
    visitTangent: (context: TangentContext) => Branch;
    visitArcSine: (context: ArcSineContext) => Branch;
    visitArcCosine: (context: ArcCosineContext) => Branch;
    visitArcTangent: (context: ArcTangentContext) => Branch;
    visitHyperbolicSine: (context: HyperbolicSineContext) => Branch;
    visitHyperbolicCosine: (context: HyperbolicCosineContext) => Branch;
    visitHyperbolicTangent: (context: HyperbolicTangentContext) => Branch;
    visitCotangent: (context: CotangentContext) => Branch;
    visitSecant: (context: SecantContext) => Branch;
    visitCosecant: (context: CosecantContext) => Branch;
    visitSquareRoot: (context: SquareRootContext) => Branch;
    visitNthRoot: (context: NthRootContext) => Branch;
    visitNegation: (context: NegationContext) => Branch;
    visitPositive: (context: PositiveContext) => Branch;
    visitLogarithm: (context: LogarithmContext) => Branch;
    visitNaturalLogarithm: (context: NaturalLogarithmContext) => Branch;
    visitMaximum: (context: MaximumContext) => Branch;
    visitMinimum: (context: MinimumContext) => Branch;
    visitModulo: (context: ModuloContext) => Branch;
    visitDeterminant: (context: DeterminantContext) => Branch;
    visitSign: (context: SignContext) => Branch;
    visitRnd: (context: RndContext) => Branch;
    visitIRnd: (context: IRndContext) => Branch;
    visitInt: (context: IntContext) => Branch;
    visitCeil: (context: CeilContext) => Branch;
    visitRound: (context: RoundContext) => Branch;
    visitSubscript: (context: SubscriptContext) => Branch;
    visitSubscriptDigit: (context: SubscriptDigitContext) => Branch;
    visitDerivative: (context: DerivativeContext) => Branch;
    visitDerivativeD: (context: DerivativeDContext) => Branch;
    visitDerivativeDMixed: (context: DerivativeDMixedContext) => Branch;
    visitDerivativeDMixedNoBraces: (context: DerivativeDMixedNoBracesContext) => Branch;
    visitDerivativeDNoBraces: (context: DerivativeDNoBracesContext) => Branch;
    visitDerivativeOperator: (context: DerivativeOperatorContext) => Branch;
    visitDerivativeOperatorPlain: (context: DerivativeOperatorPlainContext) => Branch;
    visitDerivativeDOperator: (context: DerivativeDOperatorContext) => Branch;
    visitDerivativeDOperatorNoBraces: (context: DerivativeDOperatorNoBracesContext) => Branch;
    visitDerivativePrimeExpression: (context: DerivativePrimeExpressionContext) => Branch;
    visitDerivativePrimeExpressionPlain: (context: DerivativePrimeExpressionPlainContext) => Branch;
    private primeDerivativeBranch;
    private deriveExpressionBranch;
    private hasUnresolvedNames;
    private lazyDerivativeBranch;
    private deriveNamedExpression;
    visitDeltaName: (context: DeltaNameContext) => Branch;
    visitDeltaExpression: (context: DeltaExpressionContext) => Branch;
}

export { Body, Branch, RegressionType as DataRegressionType, Deriver, Engine, Expression, ExpressionExpander, LatexVisitor, Parser, PhysicalBody, PhysicalEngine, PreloadedData, RegressionTerm, Regressor, Simplifier, SingularitiesDetector, SingularityType, System, Term, TermType, Visitor };
export type { RegressionPoint as DataRegressionPoint, RegressionResult as DataRegressionResult, Singularity, SystemProcessor };
