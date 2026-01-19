import { EventEmitter } from 'events';
import * as antlr from 'antlr4ng';
import { ParseTreeListener, TerminalNode, ErrorNode, ParserRuleContext, AbstractParseTreeVisitor } from 'antlr4ng';

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

type IterationValues = {
    [name: string]: number;
} & {
    case: number;
    iteration: number;
};
declare class Values {
    private data;
    get length(): number;
    getCaseCount(): number;
    clear(): void;
    ensureCase(caseNumber: number): void;
    resetCase(caseNumber: number): void;
    setCaseIterations(caseNumber: number, iterations: IterationValues[]): void;
    getCaseIterations(caseNumber: number): IterationValues[];
    getLastIteration(caseNumber: number): IterationValues;
    getIteration(caseNumber: number, iteration: number): IterationValues | undefined;
    addIteration(caseNumber: number, values: IterationValues): void;
}

declare class System {
    private _independent;
    private _iterationTerm;
    terms: {
        [name: string]: Term;
    };
    expressions: Array<Expression>;
    values: Values;
    iteration: number;
    step: number;
    private expressionsByName;
    private termNames;
    private differentialNames;
    private functionExpressionsWithCondition;
    private functionExpressionsWithoutCondition;
    private initialValuesByCase;
    constructor(independent?: string, iterationTerm?: string);
    get independent(): Term;
    set independent(name: string);
    get iterationTerm(): Term;
    set iterationTerm(name: string);
    get lastIteration(): number;
    get(): IterationValues;
    getIteration(iteration: number, caseNumber?: number): IterationValues;
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
    addValues(values: {
        [name: string]: number;
    }[], caseNumber?: number): void;
    addValues(values: {
        [name: string]: number;
    }, caseNumber: number): void;
    calculate(values: {
        [name: string]: number;
    }): {
        [name: string]: number;
    };
    calculate(values: {
        [name: string]: number;
    }[]): {
        [name: string]: number;
    }[];
    calculateForCase(values: {
        [name: string]: number;
    }, caseNumber: number): {
        [name: string]: number;
    };
    private calculateSingle;
    getIndependent(caseNumber?: number): number;
    setInitialIndependent(value: number): void;
    isEditable(term: Term): boolean;
    set(term: Term, value: number, caseNumber?: number): void;
    setByExpression(expression: Expression, value: number, caseNumber?: number): void;
    getExpression(name: string): Expression | undefined;
    getTerm(name: string): Term | undefined;
    isTerm(name: string): boolean;
    setInitialByTerm(term: Term, value: number, iteration?: number): void;
    setInitialByTerm(term: Term, value: number, iteration: number, caseNumber: number): void;
    setInitialByName(name: string, value: number, iteration?: number): void;
    setInitialByName(name: string, value: number, iteration: number, caseNumber: number): void;
    getValue(values: {
        [name: string]: number;
    }, term: string): number;
    getValueAtIteration(iteration: number, term: string, caseNumber?: number): number;
    getValueAtIndependent(value: number, term: string, caseNumber?: number): number;
    getInitialByExpression(expression: Expression, iteration?: number): number;
    getTermsNames(): string[];
    getDifferentialTermsNames(): string[];
    getCaseIterations(caseNumber: number): IterationValues[];
    getCasesCount(): number;
    private ensureCaseInitialValues;
    private hasInitialValueForCase;
    private getInitialValueForCase;
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
declare class DifferentialContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext;
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
declare class FunctionContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptDigitContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class AdditionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    PLUS(): antlr.TerminalNode;
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
declare class FractionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class TangentContext extends ExpressionContext {
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
declare class SubtractionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    MINUS(): antlr.TerminalNode;
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
declare class DivisionContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class SubscriptDigitContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
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
    ID(): antlr.TerminalNode | null;
    SPECIAL(): antlr.TerminalNode | null;
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
     * Visit a parse tree produced by `LatexMathParser.differential`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDifferential?: (ctx: DifferentialContext) => Result;
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
     * Visit a parse tree produced by the `Addition`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAddition?: (ctx: AdditionContext) => Result;
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
     * Visit a parse tree produced by the `Fraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFraction?: (ctx: FractionContext) => Result;
    /**
     * Visit a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSine?: (ctx: SineContext) => Result;
    /**
     * Visit a parse tree produced by the `Tangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTangent?: (ctx: TangentContext) => Result;
    /**
     * Visit a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParenthesis?: (ctx: ParenthesisContext) => Result;
    /**
     * Visit a parse tree produced by the `Subtraction`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubtraction?: (ctx: SubtractionContext) => Result;
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
     * Visit a parse tree produced by the `Division`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDivision?: (ctx: DivisionContext) => Result;
    /**
     * Visit a parse tree produced by the `Cotangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCotangent?: (ctx: CotangentContext) => Result;
    /**
     * Visit a parse tree produced by the `SubscriptDigit`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubscriptDigit?: (ctx: SubscriptDigitContext) => Result;
    /**
     * Visit a parse tree produced by the `Power`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPower?: (ctx: PowerContext) => Result;
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

declare class Visitor extends LatexMathVisitor<Branch> {
    private readonly system;
    constructor(system: System);
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

export { Branch, Engine, Expression, Parser, System, Term, TermType, Values, Visitor };
export type { IterationValues };
