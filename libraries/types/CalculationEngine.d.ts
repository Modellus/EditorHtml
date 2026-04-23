import * as antlr from 'antlr4ng';
import { ParseTreeListener, TerminalNode, ErrorNode, ParserRuleContext, AbstractParseTreeVisitor } from 'antlr4ng';
import { EventEmitter } from 'events';

declare enum TermType {
    DIFFERENTIAL = 0,
    FUNCTION = 1,
    INDEPENDENT = 2,
    PARAMETER = 3
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

declare class Body {
    readonly name: string;
    readonly type: string;
    readonly expressions: Expression[];
    readonly termInitialValues: {
        name: string;
        value: number;
        type: TermType;
    }[];
    constructor(name: string, type: string);
    addExpression(expression: Expression): void;
    addTermInitialValue(name: string, value: number, type?: TermType): void;
    afterIterate(values: {
        [name: string]: number;
    }): void;
}

declare class Branch {
    readonly text: string;
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
    units(): UnitsContext | null;
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
declare class MinimumContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class RndContext extends ExpressionContext {
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
declare class SineContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
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
declare class MaximumContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class ArcCosineContext extends ExpressionContext {
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
declare class ArcTangentContext extends ExpressionContext {
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
declare class PositiveContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    PLUS(): antlr.TerminalNode;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativeContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    expression(): ExpressionContext;
    name(): NameContext;
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
declare class IRndContext extends ExpressionContext {
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
     * Visit a parse tree produced by the `FunctionIndependent`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionIndependent?: (ctx: FunctionIndependentContext) => Result;
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
     * Visit a parse tree produced by the `Minimum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMinimum?: (ctx: MinimumContext) => Result;
    /**
     * Visit a parse tree produced by the `Multiplication`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMultiplication?: (ctx: MultiplicationContext) => Result;
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
     * Visit a parse tree produced by the `Rnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitRnd?: (ctx: RndContext) => Result;
    /**
     * Visit a parse tree produced by the `Subscript`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSubscript?: (ctx: SubscriptContext) => Result;
    /**
     * Visit a parse tree produced by the `Sine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSine?: (ctx: SineContext) => Result;
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
     * Visit a parse tree produced by the `Maximum`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitMaximum?: (ctx: MaximumContext) => Result;
    /**
     * Visit a parse tree produced by the `Parenthesis`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitParenthesis?: (ctx: ParenthesisContext) => Result;
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
     * Visit a parse tree produced by the `ArcCosine`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArcCosine?: (ctx: ArcCosineContext) => Result;
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
     * Visit a parse tree produced by the `ArcTangent`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitArcTangent?: (ctx: ArcTangentContext) => Result;
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
     * Visit a parse tree produced by the `Derivative`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDerivative?: (ctx: DerivativeContext) => Result;
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
     * Visit a parse tree produced by the `IRnd`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIRnd?: (ctx: IRndContext) => Result;
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

declare class Term {
    name: string;
    type: TermType;
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
    get names(): string[];
    get isEmpty(): boolean;
    load(names: string[], values: number[][], iterationTermName: string, independentTermName: string): void;
    reset(): void;
    clear(): void;
    getDataTermNames(iterationTermName: string, independentTermName: string): string[];
    getMaxCoveredIteration(initialIndependent: number, step: number): number;
    apply(iteration: number, target: {
        [name: string]: number;
    }, independentTermName: string): void;
    private applyRow;
}

declare class System {
    static readonly ZERO: number;
    static readonly INFINITY: number;
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
    private expressionTrees;
    private termNames;
    private differentialNames;
    private functionExpressionsWithCondition;
    private functionExpressionsWithoutCondition;
    private readonly iterationValuesByKey;
    private _lastIteration;
    private _lastCalculatedIteration;
    private readonly calculatedIterationKeys;
    useRadians: boolean;
    isCalculatingFunctions: boolean;
    readonly preloadedData: PreloadedData;
    private readonly bodies;
    constructor(independent?: string, iterationTerm?: string);
    get independent(): Term;
    set independent(name: string);
    get iterationTerm(): Term;
    set iterationTerm(name: string);
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
    reset(): void;
    clear(): void;
    calculateFunctions(): void;
    private calculateFunctionsForVisibleIterations;
    private calculateFunctionsOnIteration;
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
    storeExpressionTree(name: string, tree: unknown): void;
    getExpressionTree(name: string): unknown | undefined;
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
    private populatePreloadedIterations;
}

declare class Deriver extends LatexMathVisitor<Branch> {
    private readonly variable;
    private readonly system;
    private readonly evalVisitor;
    private readonly expander;
    constructor(system: System, variable: string);
    private eval;
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
    visitDivision: (context: DivisionContext) => Branch;
    visitFraction: (context: FractionContext) => Branch;
    visitFractionDigits: (context: FractionDigitsContext) => Branch;
    visitPower: (context: PowerContext) => Branch;
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
    visitRound: (context: RoundContext) => Branch;
    visitParenthesis: (context: ParenthesisContext) => Branch;
    visitBraces: (context: BracesContext) => Branch;
    visitSubscript: (context: SubscriptContext) => Branch;
    visitSubscriptDigit: (context: SubscriptDigitContext) => Branch;
    visitDeltaName: (context: DeltaNameContext) => Branch;
    visitDeltaExpression: (context: DeltaExpressionContext) => Branch;
    visitDerivative: (context: DerivativeContext) => Branch;
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
    parse(expressions: string): Branch | null;
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
    afterIterate(values: {
        [name: string]: number;
    }): void;
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

declare class Visitor extends LatexMathVisitor<Branch> {
    private readonly system;
    private isParsingUnits;
    constructor(system: System);
    private extractUnits;
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
    visitBraces: (context: BracesContext) => Branch;
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
    visitRound: (context: RoundContext) => Branch;
    visitSubscript: (context: SubscriptContext) => Branch;
    visitSubscriptDigit: (context: SubscriptDigitContext) => Branch;
    visitDerivative: (context: DerivativeContext) => Branch;
    visitDeltaName: (context: DeltaNameContext) => Branch;
    visitDeltaExpression: (context: DeltaExpressionContext) => Branch;
}

export { Body, Branch, Deriver, Engine, Expression, ExpressionExpander, Parser, PhysicalBody, PhysicalEngine, PreloadedData, System, Term, TermType, Visitor };
