import { EventEmitter } from 'events';
import { AbstractParseTreeVisitor } from 'antlr4ts/tree/AbstractParseTreeVisitor';
import { ParserRuleContext } from 'antlr4ts/ParserRuleContext';
import { TerminalNode } from 'antlr4ts/tree/TerminalNode';
import { ParseTreeListener } from 'antlr4ts/tree/ParseTreeListener';
import { ParseTreeVisitor } from 'antlr4ts/tree/ParseTreeVisitor';

declare class Branch {
    readonly text: string;
    readonly children: Branch[];
    calculate: (values: {
        [name: string]: number;
    }) => number;
    constructor(text: string, calculate: (values: {
        [name: string]: number;
    }) => number, ...children: Branch[]);
}

declare enum TermType {
    DIFFERENTIAL = 0,
    FUNCTION = 1,
    INDEPENDENT = 2,
    PARAMETER = 3
}

declare class Term {
    name: string;
    type: TermType;
    private _initialValues;
    constructor(name: string, type?: TermType);
    getInitialValue(iteration?: number): number;
    setInitialValue(value: number, iteration?: number): void;
    get initialValues(): number[];
    set initialValues(values: number[]);
    hasInitialValue(iteration: number): boolean;
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

declare class System {
    private _independent;
    private _iterationTerm;
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
    private termNames;
    private differentialNames;
    private functionExpressionsWithCondition;
    private functionExpressionsWithoutCondition;
    private readonly iterationValuesByKey;
    private _lastIteration;
    constructor(independent?: string, iterationTerm?: string);
    get independent(): Term;
    set independent(name: string);
    get iterationTerm(): Term;
    set iterationTerm(name: string);
    setCaseCount(count: number): void;
    get lastIteration(): number;
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
    reset(): void;
    clear(): void;
    calculateFunctions(): void;
    private applyInitialValues;
    addValues(values: {
        [name: string]: number;
    }): void;
    calculate(values: {
        [name: string]: number;
    }, applyInitialValuesToCurrentIteration?: boolean): {
        [name: string]: number;
    };
    getIndependent(caseNumber?: number): number;
    setInitialIndependent(value: number): void;
    isEditable(term: Term): boolean;
    set(term: Term, value: number, caseNumber?: number): void;
    setByExpression(expression: Expression, value: number, caseNumber?: number): void;
    getExpression(name: string): Expression | undefined;
    getTerm(name: string): Term | undefined;
    isTerm(name: string): boolean;
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
    private hasInitialValueForCase;
    private getInitialValueForCase;
    private getIterationKey;
    private indexIterationValue;
    private getIterationValue;
    private assertValidCase;
}

declare class Engine extends EventEmitter {
    readonly system: System;
    constructor(system: System);
    private iterateInternal;
    iterate(): void;
    reset(): void;
    onIterate(listener: any): void;
}

declare class Parser {
    private readonly system;
    hasErrors: boolean;
    errors: string[];
    constructor(system: System);
    parse(expressions: string): Branch | null;
}

/**
 * This interface defines a complete listener for a parse tree produced by
 * `LatexMathParser`.
 */
interface LatexMathListener extends ParseTreeListener {
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
     * Enter a parse tree produced by `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterAssignment?: (ctx: AssignmentContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitAssignment?: (ctx: AssignmentContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterExpression?: (ctx: ExpressionContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitExpression?: (ctx: ExpressionContext) => void;
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
}

/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `LatexMathParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
interface LatexMathVisitor<Result> extends ParseTreeVisitor<Result> {
    /**
     * Visit a parse tree produced by the `Power`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPower?: (ctx: PowerContext) => Result;
    /**
     * Visit a parse tree produced by the `Negation`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNegation?: (ctx: NegationContext) => Result;
    /**
     * Visit a parse tree produced by the `Division`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDivision?: (ctx: DivisionContext) => Result;
    /**
     * Visit a parse tree produced by the `Multiplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplication?: (ctx: MultiplicationContext) => Result;
    /**
     * Visit a parse tree produced by the `MultiplicationDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplicationDigit?: (ctx: MultiplicationDigitContext) => Result;
    /**
     * Visit a parse tree produced by the `Addition`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAddition?: (ctx: AdditionContext) => Result;
    /**
     * Visit a parse tree produced by the `Subtraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubtraction?: (ctx: SubtractionContext) => Result;
    /**
     * Visit a parse tree produced by the `Subscript`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubscript?: (ctx: SubscriptContext) => Result;
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
     * Visit a parse tree produced by the `FractionDigits`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFractionDigits?: (ctx: FractionDigitsContext) => Result;
    /**
     * Visit a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSine?: (ctx: SineContext) => Result;
    /**
     * Visit a parse tree produced by the `Cosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCosine?: (ctx: CosineContext) => Result;
    /**
     * Visit a parse tree produced by the `Tangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTangent?: (ctx: TangentContext) => Result;
    /**
     * Visit a parse tree produced by the `Cosecant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCosecant?: (ctx: CosecantContext) => Result;
    /**
     * Visit a parse tree produced by the `Secant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSecant?: (ctx: SecantContext) => Result;
    /**
     * Visit a parse tree produced by the `Cotangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCotangent?: (ctx: CotangentContext) => Result;
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
     * Visit a parse tree produced by the `Constant`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConstant?: (ctx: ConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `Number`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNumber?: (ctx: NumberContext) => Result;
    /**
     * Visit a parse tree produced by the `Variable`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitVariable?: (ctx: VariableContext) => Result;
    /**
     * Visit a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParenthesis?: (ctx: ParenthesisContext) => Result;
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
     * Visit a parse tree produced by `LatexMathParser.differential`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDifferential?: (ctx: DifferentialContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAssignment?: (ctx: AssignmentContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitExpression?: (ctx: ExpressionContext) => Result;
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
}

declare class ProgramContext extends ParserRuleContext {
    statement(): StatementContext;
    EOF(): TerminalNode;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class StatementContext extends ParserRuleContext {
    differential(): DifferentialContext | undefined;
    assignment(): AssignmentContext | undefined;
    expression(): ExpressionContext | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class DifferentialContext extends ParserRuleContext {
    name(): NameContext[];
    name(i: number): NameContext;
    expression(): ExpressionContext;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class AssignmentContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: AssignmentContext): void;
}
declare class FunctionContext extends AssignmentContext {
    name(): NameContext;
    expression(): ExpressionContext;
    constructor(ctx: AssignmentContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class FunctionSubscriptContext extends AssignmentContext {
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: AssignmentContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class FunctionSubscriptDigitContext extends AssignmentContext {
    name(): NameContext;
    DIGIT(): TerminalNode;
    expression(): ExpressionContext;
    constructor(ctx: AssignmentContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class FunctionIndependentContext extends AssignmentContext {
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: AssignmentContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class ExpressionContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    copyFrom(ctx: ExpressionContext): void;
}
declare class PowerContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class NegationContext extends ExpressionContext {
    MINUS(): TerminalNode;
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class DivisionContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class MultiplicationContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class MultiplicationDigitContext extends ExpressionContext {
    expression(): ExpressionContext;
    decimal(): DecimalContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class AdditionContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    PLUS(): TerminalNode;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SubtractionContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    MINUS(): TerminalNode;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SubscriptContext extends ExpressionContext {
    name(): NameContext;
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SubscriptDigitContext extends ExpressionContext {
    name(): NameContext;
    DIGIT(): TerminalNode;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class FractionContext extends ExpressionContext {
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class FractionDigitsContext extends ExpressionContext {
    DIGIT(): TerminalNode[];
    DIGIT(i: number): TerminalNode;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SineContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class CosineContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class TangentContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class CosecantContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SecantContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class CotangentContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class SquareRootContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class LogarithmContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class ConstantContext extends ExpressionContext {
    reserved(): ReservedContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class NumberContext extends ExpressionContext {
    decimal(): DecimalContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class VariableContext extends ExpressionContext {
    name(): NameContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class ParenthesisContext extends ExpressionContext {
    expression(): ExpressionContext;
    constructor(ctx: ExpressionContext);
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class ReservedContext extends ParserRuleContext {
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class DecimalContext extends ParserRuleContext {
    DIGIT(): TerminalNode[];
    DIGIT(i: number): TerminalNode;
    DOT(): TerminalNode | undefined;
    PLUS(): TerminalNode | undefined;
    MINUS(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}
declare class NameContext extends ParserRuleContext {
    ID(): TerminalNode | undefined;
    SPECIAL(): TerminalNode | undefined;
    constructor(parent: ParserRuleContext | undefined, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result;
}

declare class Visitor extends AbstractParseTreeVisitor<Branch> {
    private readonly system;
    constructor(system: System);
    protected defaultResult(): Branch;
    visitFractionDigits: (context: FractionDigitsContext) => Branch;
    visitFraction: (context: FractionContext) => Branch;
    visitVariable: (context: VariableContext) => Branch;
    visitName: (context: NameContext) => Branch;
    visitDecimal: (context: DecimalContext) => Branch;
    visitNumber: (context: NumberContext) => Branch;
    visitConstant: (context: ConstantContext) => Branch;
    visitFunction: (context: FunctionContext) => Branch;
    visitFunctionSubscript: (context: FunctionSubscriptContext) => Branch;
    visitFunctionSubscriptDigit: (context: FunctionSubscriptDigitContext) => Branch;
    visitFunctionIndependent: (context: FunctionIndependentContext) => Branch;
    visitPower: (context: PowerContext) => Branch;
    visitDivision: (context: DivisionContext) => Branch;
    visitMultiplication: (context: MultiplicationContext) => Branch;
    visitMultiplicationDigit: (context: MultiplicationDigitContext) => Branch;
    visitSubtraction: (context: SubtractionContext) => Branch;
    visitAddition: (context: AdditionContext) => Branch;
    visitParenthesis: (context: ParenthesisContext) => Branch;
    visitDifferential: (context: DifferentialContext) => Branch;
    visitSine: (context: SineContext) => Branch;
    visitCosine: (context: CosineContext) => Branch;
    visitTangent: (context: TangentContext) => Branch;
    visitCotangent: (context: CotangentContext) => Branch;
    visitSecant: (context: SecantContext) => Branch;
    visitCosecant: (context: CosecantContext) => Branch;
    visitSquareRoot: (context: SquareRootContext) => Branch;
    visitNegation: (context: NegationContext) => Branch;
    visitLogarithm: (context: LogarithmContext) => Branch;
    visitSubscript: (context: SubscriptContext) => Branch;
    visitSubscriptDigit: (context: SubscriptDigitContext) => Branch;
}

export { Branch, Engine, Expression, Parser, System, Term, TermType, Visitor };
