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
    /**
     * Set on a branch that reads or produces a categorical value, so the type check can tell a
     * comparison such as `color = red` from arithmetic on a label.
     */
    categorical?: boolean;
    constructor(text: string, calculate: (values: {
        [name: string]: number;
    }) => number, ...children: Branch[]);
    withOp(op: string): this;
    asCategorical(): this;
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
    /**
     * Names this expression reads at the current iteration, e.g. `x` for a right-hand side
     * containing `x_{n}`.  Those reads go through the stored row, so the producer of each
     * name has to be evaluated first regardless of the order the statements were written in.
     */
    currentIterationDependencies: string[];
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

declare enum DomainKind {
    FINITE_SET = "finiteSet",
    DISCRETE_RANGE = "discreteRange",
    INTERVAL = "interval",
    UNION = "union",
    BUILTIN = "builtin",
    REFERENCE = "reference"
}
/**
 * The kind of editor a host application should offer for a constrained term.  The engine does
 * not draw anything; it only says enough about the domain for the UI to decide without having
 * to read the source text again.
 */
declare enum DomainControl {
    /** A finite list of numeric or categorical values: dropdown or radio group. */
    LIST = "list",
    /** An arithmetic progression: slider snapped to the step. */
    STEPPED_SLIDER = "steppedSlider",
    /** A bounded continuous interval: plain slider. */
    CONTINUOUS_SLIDER = "continuousSlider",
    /** Anything a single simple control cannot express: domain-aware selector or editor. */
    DOMAIN_EDITOR = "domainEditor",
    /** An unbounded built-in domain: plain numeric field. */
    NUMBER_FIELD = "numberField"
}
interface DomainValueMetadata {
    value: number;
    label: string;
}
interface DomainMetadata {
    kind: DomainKind;
    control: DomainControl;
    /** Human readable rendering, e.g. `{1, 2, 3} ∪ [6, 7]`. */
    text: string;
    /** The declared name when the term was constrained through a named domain. */
    name: string | null;
    isCategorical: boolean;
    isFinite: boolean;
    /** Present when the domain is finite and small enough to list. */
    values: DomainValueMetadata[] | null;
    minimum: number | null;
    maximum: number | null;
    includesMinimum: boolean;
    includesMaximum: boolean;
    step: number | null;
    /** The parts of a union, so a selector can offer one control per part. */
    members: DomainMetadata[] | null;
}
/** Renders a number the way domains display it: no trailing zeros, no exponent noise. */
declare function formatDomainNumber(value: number): string;
declare abstract class Domain {
    /** How many values `listValues` will expand before giving up and returning null. */
    static readonly MAXIMUM_LISTED_VALUES: number;
    /** Set when this domain was reached through a named declaration such as `domain Color = ...`. */
    declaredName: string | null;
    abstract get kind(): DomainKind;
    /** True when this domain's members are categorical labels rather than plain numbers. */
    abstract get isCategorical(): boolean;
    /** True when the domain holds a countable number of values. */
    abstract get isFinite(): boolean;
    abstract get control(): DomainControl;
    /** Membership test using the engine's numerical tolerance. */
    abstract contains(value: number): boolean;
    /** Human readable rendering used in diagnostics and metadata. */
    abstract describe(): string;
    /**
     * The value a term takes when it is constrained to this domain and no valid initial value
     * was supplied.  NaN when the domain cannot suggest one.
     */
    abstract defaultValue(): number;
    /**
     * The domain's values, or null when it is infinite or larger than `limit`.  Ranges are kept
     * structurally and only expanded here, so a huge range never materialises by accident.
     */
    abstract listValues(limit: number): DomainValueMetadata[] | null;
    /** The label a categorical value is displayed with, or null when the value is plain numeric. */
    labelOf(_value: number): string | null;
    toMetadata(): DomainMetadata;
    get minimum(): number | null;
    get maximum(): number | null;
    get includesMinimum(): boolean;
    get includesMaximum(): boolean;
    /** The increment a stepped control should use, always positive; null when not stepped. */
    get controlStep(): number | null;
    /** A short hint added to a DOMAIN_VIOLATION telling the author what to write instead. */
    suggestionFor(_value: number): string;
}

declare class Term {
    name: string;
    type: TermType;
    expressionLatex: string | null;
    unitsTree: Branch | null;
    unitsText: string | null;
    /**
     * The domain the term is constrained to, from `x \in {1,2,3}` or `x = [1..5]`.  A term without
     * one is unconstrained and behaves exactly as it did before domains existed.
     */
    domain: Domain | null;
    private _initialValues;
    constructor(name: string, type?: TermType);
    /**
     * The explicitly supplied initial value when there is one.  Otherwise the value the domain
     * suggests - the first value of a finite domain, the start of a range, 0 for the numeric
     * built-ins and false for booleans - and 0 for an unconstrained term, as before.
     */
    getInitialValue(iteration?: number): number;
    setInitialValue(value: number, iteration?: number): void;
    get initialValues(): number[];
    set initialValues(values: number[]);
    hasInitialValue(iteration: number): boolean;
    /** True when the term holds categorical values such as `red`, stored as their label numbers. */
    get isCategorical(): boolean;
    /**
     * Everything a host application needs to pick an editor for this term - a list, a stepped or
     * continuous slider, or a domain-aware editor - without reading the source text again.
     */
    getDomainMetadata(): DomainMetadata | null;
    /** The categorical label a value is displayed with, or null when the value is plain numeric. */
    getValueLabel(value: number): string | null;
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

declare enum DiagnosticSeverity {
    WARNING = "warning",
    ERROR = "error"
}
/**
 * Structured problem codes reported by the domain layer.  They are strings so a host
 * application can switch on them and so they survive a JSON round trip unchanged.
 */
declare enum DiagnosticCode {
    DOMAIN_VIOLATION = "DOMAIN_VIOLATION",
    DOMAIN_INVALID_BOUND = "DOMAIN_INVALID_BOUND",
    DOMAIN_STEP_ZERO = "DOMAIN_STEP_ZERO",
    DOMAIN_STEP_DIRECTION = "DOMAIN_STEP_DIRECTION",
    DOMAIN_EMPTY = "DOMAIN_EMPTY",
    DOMAIN_MIXED_MEMBERS = "DOMAIN_MIXED_MEMBERS",
    DOMAIN_UNKNOWN_BUILTIN = "DOMAIN_UNKNOWN_BUILTIN",
    DOMAIN_UNKNOWN_NAME = "DOMAIN_UNKNOWN_NAME",
    DOMAIN_CIRCULAR = "DOMAIN_CIRCULAR",
    DOMAIN_NAME_CONFLICT = "DOMAIN_NAME_CONFLICT",
    DOMAIN_KEYWORD_EXPECTED = "DOMAIN_KEYWORD_EXPECTED",
    DOMAIN_ENUMERATION_LIMIT = "DOMAIN_ENUMERATION_LIMIT",
    DOMAIN_RANDOM_COUNT = "DOMAIN_RANDOM_COUNT",
    CATEGORICAL_ARITHMETIC = "CATEGORICAL_ARITHMETIC",
    CATEGORICAL_LABEL_CONFLICT = "CATEGORICAL_LABEL_CONFLICT",
    INDEPENDENT_ASSIGNED = "INDEPENDENT_ASSIGNED",
    EXPRESSION_CYCLE = "EXPRESSION_CYCLE"
}
interface SourceLocation {
    line: number;
    column: number;
    text?: string;
}
interface Diagnostic {
    code: DiagnosticCode;
    severity: DiagnosticSeverity;
    message: string;
    termName?: string;
    domainName?: string;
    /** The rejected value, for DOMAIN_VIOLATION. */
    value?: number;
    /** The rejected value rendered the way a reader sees it, e.g. a categorical label. */
    valueText?: string;
    /** Human readable rendering of the domain the value was checked against. */
    domainText?: string;
    suggestion?: string;
    location?: SourceLocation;
    iteration?: number;
    caseNumber?: number;
}
/**
 * Collects diagnostics without letting a long simulation grow the list without bound: the same
 * problem reported for the same term, value, iteration and case is stored once.
 */
declare class DiagnosticCollector {
    static readonly MAXIMUM_DIAGNOSTICS: number;
    private readonly diagnostics;
    private readonly keys;
    add(diagnostic: Diagnostic): void;
    private getKey;
    get all(): ReadonlyArray<Diagnostic>;
    getByCode(code: DiagnosticCode): Diagnostic[];
    hasCode(code: DiagnosticCode): boolean;
    get hasErrors(): boolean;
    clear(): void;
    /** Drops every diagnostic raised while running the model, keeping the declaration ones. */
    clearByCode(code: DiagnosticCode): void;
}

interface DomainResolver {
    resolveDomain(name: string): Domain | undefined;
}
/**
 * A use of a named domain, as in `foreground ∈ Color`.  The target is resolved through the
 * registry on every call rather than captured, so redeclaring `Color` updates every term that
 * refers to it and the declared name survives serialization.
 */
declare class DomainReference extends Domain {
    readonly referencedName: string;
    private readonly resolver;
    /** Guards against a declaration cycle that slipped past the registry check. */
    private static readonly MAXIMUM_RESOLUTION_DEPTH;
    private static resolutionDepth;
    constructor(referencedName: string, resolver: DomainResolver);
    resolve(): Domain | undefined;
    get isResolved(): boolean;
    private withTarget;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    contains(value: number): boolean;
    /** The declared name: a reader recognizes `Color` more easily than its expansion. */
    describe(): string;
    /** The name together with what it stands for, for messages that need the values spelled out. */
    describeResolved(): string;
    defaultValue(): number;
    listValues(limit: number): DomainValueMetadata[] | null;
    labelOf(value: number): string | null;
    get minimum(): number | null;
    get maximum(): number | null;
    get includesMinimum(): boolean;
    get includesMaximum(): boolean;
    get controlStep(): number | null;
    toMetadata(): DomainMetadata;
}

/**
 * A categorical value.  The engine stores every value as a number, so a categorical value is a
 * label paired with the stable number the label is stored as.
 */
declare class EnumLiteral {
    readonly label: string;
    readonly value: number;
    constructor(label: string, value: number);
}
/**
 * The system-wide table of categorical labels.  Labels are interned once and keep the same number
 * for every domain that uses them, so `color = red` compares equal whichever domain declared
 * `red`.  `false` and `true` are reserved as 0 and 1 so `𝔹` lines up with the numeric encoding
 * of a condition, but they only resolve inside expressions once a `𝔹` domain is declared, which
 * keeps models that already use `true` or `false` as term names working.
 */
interface EnumLiteralEntry {
    label: string;
    value: number;
    active: boolean;
}
declare class EnumLiteralTable {
    static readonly FALSE_LABEL: string;
    static readonly TRUE_LABEL: string;
    private static readonly RESERVED_VALUES;
    private readonly valuesByLabel;
    private readonly labelsByValue;
    private readonly activeLabels;
    private nextValue;
    constructor();
    private seed;
    /** Returns the number `label` is stored as, assigning one the first time it is seen. */
    intern(label: string): number;
    /** Makes `false` and `true` resolvable in expressions; called when a `𝔹` domain is declared. */
    activateBooleans(): void;
    /** The number a label resolves to inside an expression, or undefined when it is not a label. */
    resolve(label: string): number | undefined;
    getValue(label: string): number | undefined;
    getLabel(value: number): string | undefined;
    isActive(label: string): boolean;
    getActiveLabels(): string[];
    /** The whole table, so a model can be reloaded with the labels stored as the same numbers. */
    export(): EnumLiteralEntry[];
    restore(entries: EnumLiteralEntry[]): void;
    clear(): void;
}

interface NamedDomainDeclaration {
    name: string;
    domain: Domain;
    location?: SourceLocation;
}
/**
 * The system-wide table of named domains declared with `domain Color = {red, green, blue}`.
 *
 * Named domains are deliberately kept out of `System.terms`: they are declarations, not
 * calculation terms, so they never appear in the value rows or in a plot.
 */
declare class DomainRegistry implements DomainResolver {
    private readonly declarations;
    readonly enumLiterals: EnumLiteralTable;
    /**
     * Registers `name`, replacing an earlier declaration.  Returns null when the declaration was
     * accepted, or the diagnostic explaining why it was refused.
     */
    declare(name: string, domain: Domain, location?: SourceLocation): Diagnostic | null;
    resolveDomain(name: string): Domain | undefined;
    has(name: string): boolean;
    getDeclaration(name: string): NamedDomainDeclaration | undefined;
    getNames(): string[];
    getDeclarations(): NamedDomainDeclaration[];
    /** A use of a named domain; it resolves through this registry every time it is read. */
    createReference(name: string): DomainReference;
    remove(name: string): void;
    clear(): void;
    /** True when declaring `name` as `domain` would make `name` reachable from itself. */
    private wouldCreateCycle;
    private collectReferencedNames;
}

declare enum BuiltinDomainKind {
    REAL = "R",
    INTEGER = "Z",
    NATURAL = "N",
    BOOLEAN = "B",
    RATIONAL = "Q"
}
/**
 * `ℝ`, `ℤ`, `ℕ`, `𝔹` and `ℚ`.
 *
 * `ℝ` is every finite real the engine can represent.  `ℚ` is accepted for authoring convenience
 * but behaves exactly like `ℝ`: values are IEEE-754 doubles, so the engine cannot decide exact
 * rational membership and does not pretend to.
 */
declare class BuiltinDomain extends Domain {
    readonly builtin: BuiltinDomainKind;
    constructor(builtin: BuiltinDomainKind);
    static fromSymbol(symbol: string): BuiltinDomain | null;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    contains(value: number): boolean;
    describe(): string;
    defaultValue(): number;
    listValues(limit: number): DomainValueMetadata[] | null;
    labelOf(value: number): string | null;
    get minimum(): number | null;
    get maximum(): number | null;
    get controlStep(): number | null;
}

interface FiniteSetDomainJson {
    kind: DomainKind.FINITE_SET;
    members: {
        value: number;
        label: string | null;
    }[];
}
interface DiscreteRangeDomainJson {
    kind: DomainKind.DISCRETE_RANGE;
    start: number;
    end: number;
    step: number;
}
interface IntervalDomainJson {
    kind: DomainKind.INTERVAL;
    lower: number;
    upper: number;
    includesLower: boolean;
    includesUpper: boolean;
}
interface UnionDomainJson {
    kind: DomainKind.UNION;
    members: DomainJson[];
}
interface BuiltinDomainJson {
    kind: DomainKind.BUILTIN;
    builtin: BuiltinDomainKind;
}
interface DomainReferenceJson {
    kind: DomainKind.REFERENCE;
    name: string;
}
type DomainJson = FiniteSetDomainJson | DiscreteRangeDomainJson | IntervalDomainJson | UnionDomainJson | BuiltinDomainJson | DomainReferenceJson;
interface DomainsJson {
    /** Bumped whenever the shape below changes; a document without domains has no such section. */
    schemaVersion: number;
    enumLiterals: EnumLiteralEntry[];
    namedDomains: {
        name: string;
        domain: DomainJson;
    }[];
    termDomains: {
        term: string;
        domain: DomainJson;
    }[];
}
/**
 * Reads and writes the domain part of a model.  Named domains keep their name, and the categorical
 * label table travels with them so a reloaded model stores `red` as exactly the number it did
 * before.
 */
declare class DomainSerializer {
    static readonly SCHEMA_VERSION: number;
    static toJson(domain: Domain): DomainJson;
    /** Rebuilds a domain, reporting and skipping anything the current engine cannot honour. */
    static fromJson(json: DomainJson, registry: DomainRegistry, report: (diagnostic: Diagnostic) => void): Domain | null;
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
    /**
     * The key an element index travels under inside a row of values.  It is not a term: it exists
     * only for the span of an element read, so a name standing for many values - the oscillators of
     * a wave - knows which one is being asked for.
     */
    static readonly ELEMENT_INDEX: string;
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
    private orderedFunctionExpressionsWithCondition;
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
    /** Named domains declared with `domain Color = {...}`; they are never calculation terms. */
    readonly domains: DomainRegistry;
    private readonly diagnosticCollector;
    /** The terms carrying a domain, so an unconstrained model pays nothing for the checks. */
    private constrainedTermNames;
    private readonly domainLocations;
    /** Names that stand for a whole run of values addressed by index rather than for one number. */
    private readonly indexedSources;
    private readonly resolvingElements;
    private indexedDependentNames;
    /** Per name, the literal indexes it is assigned at - the `0` of `x_0=1` - so a seeded run is told apart. */
    private readonly literalIterationIndexesByName;
    /** Names written in terms of their own earlier value, `x_{n}=x_{n-1}+\dots`. */
    private readonly recurrenceNames;
    /** Names whose statements read each other within one row, so none of them can be evaluated first. */
    private cyclicTermNames;
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
    /**
     * Conditional function expressions ordered so that a term reading `x_{n}` runs after the
     * expressions producing `x` for that same row.  Every pass of the evaluation loop below
     * resets purely-conditional names to NaN, so a consumer evaluated ahead of its producer
     * reads NaN on every pass and never recovers — declaration order alone is not enough.
     * The sort is stable: expressions keep declaration order unless a dependency forces a move,
     * and a dependency cycle degrades to declaration order instead of dropping expressions.
     */
    private getOrderedFunctionExpressionsWithCondition;
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
    /**
     * Makes every expression producing `name` undefined.  Used when a statement turns out not to
     * be calculable - arithmetic on a categorical value, for instance - so the simulation keeps
     * running with an undefined result instead of a number that means nothing.
     */
    invalidateTermExpressions(name: string): void;
    markAsPiecewise(name: string): void;
    markLiteralIterationIndex(name: string, index: number): void;
    markRecurrence(name: string): void;
    /**
     * The names written as a recurrence on their own earlier value with no statement giving the value
     * the run starts from.  The first row has no earlier value to read, so each of these needs a first
     * value supplied before the model produces anything at all.
     */
    getSeedRequiredNames(): string[];
    private reportExpressionCycle;
    /** The names caught in a same-row cycle the last evaluation could not order. */
    getCyclicTermNames(): string[];
    storeExpressionTree(name: string, tree: Branch, indexLatex?: string): void;
    storeExpressionTreeWithCondition(name: string, expressionTree: Branch, conditionTree?: Branch, indexLatex?: string): void;
    getExpressionTree(name: string): Branch | undefined;
    getExpressionTrees(name: string): Branch[];
    getExpressionTreePairs(name: string): {
        expressionTree: Branch;
        conditionTree?: Branch;
        indexLatex?: string;
    }[];
    getTerm(name: string): Term | undefined;
    isTerm(name: string): boolean;
    setTermUnits(name: string, unitsText: string | null): void;
    getTermUnits(name: string): string | null;
    /**
     * Constrains `name` to `domain`, creating the term when it does not exist yet.  A domain
     * declaration augments a scalar term: `x \in {1,2,3}` makes x a selectable scalar, never a
     * collection and never a boolean membership expression.
     */
    setTermDomain(name: string, domain: Domain | null): void;
    getTermDomain(name: string): Domain | null;
    getTermDomainMetadata(name: string): DomainMetadata | null;
    getConstrainedTermNames(): string[];
    /**
     * The domain part of the model as plain JSON, or null when nothing is constrained so an
     * existing document keeps exactly the shape it had before domains existed.
     */
    toDomainsJson(): DomainsJson | null;
    /**
     * Restores domains saved by `toDomainsJson`.  Named domains are declared first so the terms
     * that refer to them resolve, and anything the current engine cannot honour is reported
     * rather than dropped in silence.
     */
    loadDomainsJson(json: DomainsJson | null | undefined): void;
    /** The number a categorical label such as `red` is stored as, or undefined when unknown. */
    getEnumValue(label: string): number | undefined;
    /** How a value of `name` reads to a person: its categorical label when it has one. */
    getValueLabel(name: string, value: number): string | null;
    addDiagnostic(diagnostic: Diagnostic): void;
    getDiagnostics(): ReadonlyArray<Diagnostic>;
    getDiagnosticsByCode(code: DiagnosticCode): Diagnostic[];
    clearDiagnostics(): void;
    /**
     * A value drawn uniformly from the first `count` values of the domain `name` is constrained
     * to, or null when the term has no domain that can be listed.  This is what makes `rnd(3)`
     * choose one of the first three members of the term's domain - the only way to pick a
     * categorical value at random without writing the numbers the labels are stored as.
     */
    randomDomainValue(name: string | null, count: number): number | null;
    /** True when `value` is allowed for `name`; unconstrained terms always accept every value. */
    isValueInDomain(name: string, value: number): boolean;
    /**
     * Records a DOMAIN_VIOLATION for a value the term's domain rejects and reports whether the
     * value was accepted.  Values are never clamped or rounded: the caller decides what to do.
     */
    reportDomainViolation(name: string, value: number, iteration?: number, caseNumber?: number): boolean;
    /** Remembers where a term's domain was declared so a violation can point back at it. */
    setDomainLocation(name: string, location: SourceLocation | undefined): void;
    /**
     * Checks every constrained term in a freshly produced row.  A computed term whose value left
     * its domain becomes undefined for that evaluation, which keeps the simulation loop running
     * while the diagnostic explains what happened; a value the author supplied is reported but
     * kept, so it is visible instead of silently replaced.
     */
    private enforceDomains;
    renameRegressionTerm(currentName: string, newName: string): void;
    setInitialByTerm(term: Term, value: number, iteration?: number, caseNumber?: number): void;
    setInitialByName(name: string, value: number, iteration?: number, caseNumber?: number): void;
    getValue(values: {
        [name: string]: number;
    }, term: string): number;
    getValueAtIteration(iteration: number, term: string, caseNumber?: number): number;
    /**
     * Subscripted read that also works while the target row is still being built.  During the
     * Runge-Kutta sub-steps the row for the current iteration has not been stored yet, so a
     * `term_{n}` reference has no row to read from; it resolves against the in-flight values
     * instead, which is what a plain `term` reference would see at that point.  Earlier rows
     * are always read from history, so `term_{n-1}` is unaffected.
     */
    getValueAtIterationInRow(iteration: number, term: string, values: {
        [name: string]: number;
    }, caseNumber?: number): number;
    getValueAtIndependent(value: number, term: string, caseNumber?: number): number;
    /**
     * Reads a term at a given independent while a row is still being built.  A term the engine
     * integrates or preloads has no closed form to evaluate at an arbitrary independent, so
     * `x\left(3\right)` has to be sampled from the calculated rows; the row for the iteration in
     * flight has not been stored yet, so a read of the current independent resolves against the
     * in-flight values, exactly as `getValueAtIterationInRow` does for subscripts.  An independent
     * the run has not reached, or has already passed out of, reads NaN.
     */
    getValueAtIndependentInRow(value: number, term: string, values: {
        [name: string]: number;
    }, caseNumber?: number): number;
    /** The iteration whose independent is closest to `value`, or NaN before the first row exists. */
    private independentToIteration;
    /**
     * Registers a name that stands for many values at once - the oscillators of a wave - resolved by
     * element index.  The resolver is called only for a name the model does not assign; an assignment
     * wins, so `y=x+z` over three waves defines y element by element.  Registration is dropped by
     * `clear`, so whatever holds the values registers again whenever the model is reset.
     */
    registerIndexedSource(name: string, resolver: (index: number, values: {
        [name: string]: number;
    }) => number): void;
    removeIndexedSource(name: string): void;
    isIndexedSource(name: string): boolean;
    /**
     * Reads one element of an indexed name.  This is a third index space beside the two that already
     * exist: a subscript indexes iterations and `w\left(3\right)` indexes the independent, while
     * `w\left[3\right]` indexes the elements a single name stands for.  An index that is not a whole
     * finite number reads NaN, as does a name that is neither assigned nor registered.
     */
    getElementValue(name: string, index: number, values: {
        [name: string]: number;
    }): number;
    /**
     * The assigned names that read an indexed name, and so stand for many values themselves.  Worked
     * out once and kept until the expressions or the registered sources change, because it is asked
     * for on every row.
     */
    private getIndexedDependentNames;
    private branchReadsIndexedSource;
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
    /**
     * A name written at an index is shown at that index - `a_{n}=...`, and a name given both a first
     * value and a rule as the two statements the reader wrote - rather than as a bare name followed by
     * the branches run together, which is not a statement anybody could have written.
     */
    private buildIndexedLatex;
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
     * Enter a parse tree produced by `LatexMathParser.legacyUnits`.
     * @param ctx the parse tree
     */
    enterLegacyUnits?: (ctx: LegacyUnitsContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.legacyUnits`.
     * @param ctx the parse tree
     */
    exitLegacyUnits?: (ctx: LegacyUnitsContext) => void;
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
     * Enter a parse tree produced by the `DomainConstraint`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterDomainConstraint?: (ctx: DomainConstraintContext) => void;
    /**
     * Exit a parse tree produced by the `DomainConstraint`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitDomainConstraint?: (ctx: DomainConstraintContext) => void;
    /**
     * Enter a parse tree produced by the `DomainAssignment`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterDomainAssignment?: (ctx: DomainAssignmentContext) => void;
    /**
     * Exit a parse tree produced by the `DomainAssignment`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitDomainAssignment?: (ctx: DomainAssignmentContext) => void;
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
     * Enter a parse tree produced by the `FunctionElement`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    enterFunctionElement?: (ctx: FunctionElementContext) => void;
    /**
     * Exit a parse tree produced by the `FunctionElement`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     */
    exitFunctionElement?: (ctx: FunctionElementContext) => void;
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
     * Enter a parse tree produced by the `EnumLiteralQuoted`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterEnumLiteralQuoted?: (ctx: EnumLiteralQuotedContext) => void;
    /**
     * Exit a parse tree produced by the `EnumLiteralQuoted`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitEnumLiteralQuoted?: (ctx: EnumLiteralQuotedContext) => void;
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
     * Enter a parse tree produced by the `ElementIndex`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterElementIndex?: (ctx: ElementIndexContext) => void;
    /**
     * Exit a parse tree produced by the `ElementIndex`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitElementIndex?: (ctx: ElementIndexContext) => void;
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
     * Enter a parse tree produced by the `EnumLiteralWrapped`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    enterEnumLiteralWrapped?: (ctx: EnumLiteralWrappedContext) => void;
    /**
     * Exit a parse tree produced by the `EnumLiteralWrapped`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     */
    exitEnumLiteralWrapped?: (ctx: EnumLiteralWrappedContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.namedDomainDeclaration`.
     * @param ctx the parse tree
     */
    enterNamedDomainDeclaration?: (ctx: NamedDomainDeclarationContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.namedDomainDeclaration`.
     * @param ctx the parse tree
     */
    exitNamedDomainDeclaration?: (ctx: NamedDomainDeclarationContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainKeyword`.
     * @param ctx the parse tree
     */
    enterDomainKeyword?: (ctx: DomainKeywordContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainKeyword`.
     * @param ctx the parse tree
     */
    exitDomainKeyword?: (ctx: DomainKeywordContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainMembership`.
     * @param ctx the parse tree
     */
    enterDomainMembership?: (ctx: DomainMembershipContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainMembership`.
     * @param ctx the parse tree
     */
    exitDomainMembership?: (ctx: DomainMembershipContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainExpression`.
     * @param ctx the parse tree
     */
    enterDomainExpression?: (ctx: DomainExpressionContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainExpression`.
     * @param ctx the parse tree
     */
    exitDomainExpression?: (ctx: DomainExpressionContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainUnionOperator`.
     * @param ctx the parse tree
     */
    enterDomainUnionOperator?: (ctx: DomainUnionOperatorContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainUnionOperator`.
     * @param ctx the parse tree
     */
    exitDomainUnionOperator?: (ctx: DomainUnionOperatorContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainUnionTerm`.
     * @param ctx the parse tree
     */
    enterDomainUnionTerm?: (ctx: DomainUnionTermContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainUnionTerm`.
     * @param ctx the parse tree
     */
    exitDomainUnionTerm?: (ctx: DomainUnionTermContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainLiteral`.
     * @param ctx the parse tree
     */
    enterDomainLiteral?: (ctx: DomainLiteralContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainLiteral`.
     * @param ctx the parse tree
     */
    exitDomainLiteral?: (ctx: DomainLiteralContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainUnambiguousTerm`.
     * @param ctx the parse tree
     */
    enterDomainUnambiguousTerm?: (ctx: DomainUnambiguousTermContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainUnambiguousTerm`.
     * @param ctx the parse tree
     */
    exitDomainUnambiguousTerm?: (ctx: DomainUnambiguousTermContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.finiteSet`.
     * @param ctx the parse tree
     */
    enterFiniteSet?: (ctx: FiniteSetContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.finiteSet`.
     * @param ctx the parse tree
     */
    exitFiniteSet?: (ctx: FiniteSetContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.plainFiniteSet`.
     * @param ctx the parse tree
     */
    enterPlainFiniteSet?: (ctx: PlainFiniteSetContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.plainFiniteSet`.
     * @param ctx the parse tree
     */
    exitPlainFiniteSet?: (ctx: PlainFiniteSetContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.plainFiniteSetMultiple`.
     * @param ctx the parse tree
     */
    enterPlainFiniteSetMultiple?: (ctx: PlainFiniteSetMultipleContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.plainFiniteSetMultiple`.
     * @param ctx the parse tree
     */
    exitPlainFiniteSetMultiple?: (ctx: PlainFiniteSetMultipleContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.latexFiniteSet`.
     * @param ctx the parse tree
     */
    enterLatexFiniteSet?: (ctx: LatexFiniteSetContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.latexFiniteSet`.
     * @param ctx the parse tree
     */
    exitLatexFiniteSet?: (ctx: LatexFiniteSetContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.setOpenBrace`.
     * @param ctx the parse tree
     */
    enterSetOpenBrace?: (ctx: SetOpenBraceContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.setOpenBrace`.
     * @param ctx the parse tree
     */
    exitSetOpenBrace?: (ctx: SetOpenBraceContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.setCloseBrace`.
     * @param ctx the parse tree
     */
    enterSetCloseBrace?: (ctx: SetCloseBraceContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.setCloseBrace`.
     * @param ctx the parse tree
     */
    exitSetCloseBrace?: (ctx: SetCloseBraceContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainElement`.
     * @param ctx the parse tree
     */
    enterDomainElement?: (ctx: DomainElementContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainElement`.
     * @param ctx the parse tree
     */
    exitDomainElement?: (ctx: DomainElementContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.enumLiteral`.
     * @param ctx the parse tree
     */
    enterEnumLiteral?: (ctx: EnumLiteralContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.enumLiteral`.
     * @param ctx the parse tree
     */
    exitEnumLiteral?: (ctx: EnumLiteralContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.enumName`.
     * @param ctx the parse tree
     */
    enterEnumName?: (ctx: EnumNameContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.enumName`.
     * @param ctx the parse tree
     */
    exitEnumName?: (ctx: EnumNameContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.discreteRange`.
     * @param ctx the parse tree
     */
    enterDiscreteRange?: (ctx: DiscreteRangeContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.discreteRange`.
     * @param ctx the parse tree
     */
    exitDiscreteRange?: (ctx: DiscreteRangeContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.interval`.
     * @param ctx the parse tree
     */
    enterInterval?: (ctx: IntervalContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.interval`.
     * @param ctx the parse tree
     */
    exitInterval?: (ctx: IntervalContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainOpenSquare`.
     * @param ctx the parse tree
     */
    enterDomainOpenSquare?: (ctx: DomainOpenSquareContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainOpenSquare`.
     * @param ctx the parse tree
     */
    exitDomainOpenSquare?: (ctx: DomainOpenSquareContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainCloseSquare`.
     * @param ctx the parse tree
     */
    enterDomainCloseSquare?: (ctx: DomainCloseSquareContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainCloseSquare`.
     * @param ctx the parse tree
     */
    exitDomainCloseSquare?: (ctx: DomainCloseSquareContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainOpenRound`.
     * @param ctx the parse tree
     */
    enterDomainOpenRound?: (ctx: DomainOpenRoundContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainOpenRound`.
     * @param ctx the parse tree
     */
    exitDomainOpenRound?: (ctx: DomainOpenRoundContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainCloseRound`.
     * @param ctx the parse tree
     */
    enterDomainCloseRound?: (ctx: DomainCloseRoundContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainCloseRound`.
     * @param ctx the parse tree
     */
    exitDomainCloseRound?: (ctx: DomainCloseRoundContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.elementOpen`.
     * @param ctx the parse tree
     */
    enterElementOpen?: (ctx: ElementOpenContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.elementOpen`.
     * @param ctx the parse tree
     */
    exitElementOpen?: (ctx: ElementOpenContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.elementClose`.
     * @param ctx the parse tree
     */
    enterElementClose?: (ctx: ElementCloseContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.elementClose`.
     * @param ctx the parse tree
     */
    exitElementClose?: (ctx: ElementCloseContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.builtinDomain`.
     * @param ctx the parse tree
     */
    enterBuiltinDomain?: (ctx: BuiltinDomainContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.builtinDomain`.
     * @param ctx the parse tree
     */
    exitBuiltinDomain?: (ctx: BuiltinDomainContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.domainReference`.
     * @param ctx the parse tree
     */
    enterDomainReference?: (ctx: DomainReferenceContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.domainReference`.
     * @param ctx the parse tree
     */
    exitDomainReference?: (ctx: DomainReferenceContext) => void;
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
     * Enter a parse tree produced by `LatexMathParser.eulerLetter`.
     * @param ctx the parse tree
     */
    enterEulerLetter?: (ctx: EulerLetterContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.eulerLetter`.
     * @param ctx the parse tree
     */
    exitEulerLetter?: (ctx: EulerLetterContext) => void;
    /**
     * Enter a parse tree produced by `LatexMathParser.namedIndex`.
     * @param ctx the parse tree
     */
    enterNamedIndex?: (ctx: NamedIndexContext) => void;
    /**
     * Exit a parse tree produced by `LatexMathParser.namedIndex`.
     * @param ctx the parse tree
     */
    exitNamedIndex?: (ctx: NamedIndexContext) => void;
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
    legacyUnits(): LegacyUnitsContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class LegacyUnitsContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    name(): NameContext;
    expression(): ExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class StatementContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    namedDomainDeclaration(): NamedDomainDeclarationContext | null;
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
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainConstraintContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    domainMembership(): DomainMembershipContext;
    domainExpression(): DomainExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionElementContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    elementOpen(): ElementOpenContext;
    elementClose(): ElementCloseContext;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainAssignmentContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    domainLiteral(): DomainLiteralContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DerivativePrimeContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionIndependentContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class FunctionSubscriptDigitConditionalContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext;
    DIGIT(): antlr.TerminalNode;
    caseRow(): CaseRowContext[];
    caseRow(i: number): CaseRowContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptConditionalContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    caseRow(): CaseRowContext[];
    caseRow(i: number): CaseRowContext | null;
    expression(): ExpressionContext | null;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FunctionSubscriptContext extends AssignmentContext {
    constructor(ctx: AssignmentContext);
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
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
declare class EnumLiteralQuotedContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    STRING(): antlr.TerminalNode;
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
declare class ElementIndexContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    name(): NameContext;
    elementOpen(): ElementOpenContext;
    expression(): ExpressionContext;
    elementClose(): ElementCloseContext;
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
    name(): NameContext[];
    name(i: number): NameContext | null;
    expression(): ExpressionContext | null;
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
declare class EnumLiteralWrappedContext extends ExpressionContext {
    constructor(ctx: ExpressionContext);
    SPECIAL(): antlr.TerminalNode;
    enumName(): EnumNameContext;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NamedDomainDeclarationContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainKeyword(): DomainKeywordContext;
    name(): NameContext;
    domainExpression(): DomainExpressionContext;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainKeywordContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    ID(): antlr.TerminalNode;
    SPECIAL(): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainMembershipContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainExpressionContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainUnionTerm(): DomainUnionTermContext[];
    domainUnionTerm(i: number): DomainUnionTermContext | null;
    domainUnionOperator(): DomainUnionOperatorContext[];
    domainUnionOperator(i: number): DomainUnionOperatorContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainUnionOperatorContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainUnionTermContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    finiteSet(): FiniteSetContext | null;
    discreteRange(): DiscreteRangeContext | null;
    interval(): IntervalContext | null;
    builtinDomain(): BuiltinDomainContext | null;
    domainReference(): DomainReferenceContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainLiteralContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainUnionTerm(): DomainUnionTermContext[];
    domainUnionTerm(i: number): DomainUnionTermContext | null;
    domainUnionOperator(): DomainUnionOperatorContext[];
    domainUnionOperator(i: number): DomainUnionOperatorContext | null;
    domainUnambiguousTerm(): DomainUnambiguousTermContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainUnambiguousTermContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    latexFiniteSet(): LatexFiniteSetContext | null;
    plainFiniteSetMultiple(): PlainFiniteSetMultipleContext | null;
    discreteRange(): DiscreteRangeContext | null;
    interval(): IntervalContext | null;
    builtinDomain(): BuiltinDomainContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class FiniteSetContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    plainFiniteSet(): PlainFiniteSetContext | null;
    latexFiniteSet(): LatexFiniteSetContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class PlainFiniteSetContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainElement(): DomainElementContext[];
    domainElement(i: number): DomainElementContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class PlainFiniteSetMultipleContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainElement(): DomainElementContext[];
    domainElement(i: number): DomainElementContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class LatexFiniteSetContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    setOpenBrace(): SetOpenBraceContext;
    domainElement(): DomainElementContext[];
    domainElement(i: number): DomainElementContext | null;
    setCloseBrace(): SetCloseBraceContext;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SetOpenBraceContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class SetCloseBraceContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainElementContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    decimal(): DecimalContext | null;
    enumLiteral(): EnumLiteralContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class EnumLiteralContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    enumName(): EnumNameContext | null;
    STRING(): antlr.TerminalNode | null;
    SPECIAL(): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class EnumNameContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    ID(): antlr.TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DiscreteRangeContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    domainOpenSquare(): DomainOpenSquareContext;
    decimal(): DecimalContext[];
    decimal(i: number): DecimalContext | null;
    RANGE(): antlr.TerminalNode[];
    RANGE(i: number): antlr.TerminalNode | null;
    domainCloseSquare(): DomainCloseSquareContext;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class IntervalContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    decimal(): DecimalContext[];
    decimal(i: number): DecimalContext | null;
    domainOpenSquare(): DomainOpenSquareContext | null;
    domainOpenRound(): DomainOpenRoundContext | null;
    domainCloseSquare(): DomainCloseSquareContext | null;
    domainCloseRound(): DomainCloseRoundContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainOpenSquareContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainCloseSquareContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainOpenRoundContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainCloseRoundContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ElementOpenContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ElementCloseContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class BuiltinDomainContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    BLACKBOARD(): antlr.TerminalNode | null;
    ID(): antlr.TerminalNode | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class DomainReferenceContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    ID(): antlr.TerminalNode;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class ImplicitMultiplicandContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    name(): NameContext | null;
    expression(): ExpressionContext[];
    expression(i: number): ExpressionContext | null;
    elementOpen(): ElementOpenContext | null;
    elementClose(): ElementCloseContext | null;
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
    SPECIAL(): antlr.TerminalNode | null;
    namedIndex(): NamedIndexContext[];
    namedIndex(i: number): NamedIndexContext | null;
    DOT(): antlr.TerminalNode[];
    DOT(i: number): antlr.TerminalNode | null;
    eulerLetter(): EulerLetterContext | null;
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class EulerLetterContext extends antlr.ParserRuleContext {
    constructor(parent: antlr.ParserRuleContext | null, invokingState: number);
    get ruleIndex(): number;
    enterRule(listener: LatexMathListener): void;
    exitRule(listener: LatexMathListener): void;
    accept<Result>(visitor: LatexMathVisitor<Result>): Result | null;
}
declare class NamedIndexContext extends antlr.ParserRuleContext {
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
     * Visit a parse tree produced by `LatexMathParser.legacyUnits`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLegacyUnits?: (ctx: LegacyUnitsContext) => Result;
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
     * Visit a parse tree produced by the `DomainConstraint`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainConstraint?: (ctx: DomainConstraintContext) => Result;
    /**
     * Visit a parse tree produced by the `DomainAssignment`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainAssignment?: (ctx: DomainAssignmentContext) => Result;
    /**
     * Visit a parse tree produced by the `Function`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunction?: (ctx: FunctionContext) => Result;
    /**
     * Visit a parse tree produced by the `FunctionElement`
     * labeled alternative in `LatexMathParser.assignment`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFunctionElement?: (ctx: FunctionElementContext) => Result;
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
     * Visit a parse tree produced by the `EnumLiteralQuoted`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitEnumLiteralQuoted?: (ctx: EnumLiteralQuotedContext) => Result;
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
     * Visit a parse tree produced by the `ElementIndex`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitElementIndex?: (ctx: ElementIndexContext) => Result;
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
     * Visit a parse tree produced by the `EnumLiteralWrapped`
     * labeled alternative in `LatexMathParser.expression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitEnumLiteralWrapped?: (ctx: EnumLiteralWrappedContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.namedDomainDeclaration`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNamedDomainDeclaration?: (ctx: NamedDomainDeclarationContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainKeyword`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainKeyword?: (ctx: DomainKeywordContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainMembership`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainMembership?: (ctx: DomainMembershipContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainExpression?: (ctx: DomainExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainUnionOperator`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainUnionOperator?: (ctx: DomainUnionOperatorContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainUnionTerm`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainUnionTerm?: (ctx: DomainUnionTermContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainLiteral`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainLiteral?: (ctx: DomainLiteralContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainUnambiguousTerm`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainUnambiguousTerm?: (ctx: DomainUnambiguousTermContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.finiteSet`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitFiniteSet?: (ctx: FiniteSetContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.plainFiniteSet`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPlainFiniteSet?: (ctx: PlainFiniteSetContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.plainFiniteSetMultiple`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitPlainFiniteSetMultiple?: (ctx: PlainFiniteSetMultipleContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.latexFiniteSet`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLatexFiniteSet?: (ctx: LatexFiniteSetContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.setOpenBrace`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSetOpenBrace?: (ctx: SetOpenBraceContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.setCloseBrace`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSetCloseBrace?: (ctx: SetCloseBraceContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainElement`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainElement?: (ctx: DomainElementContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.enumLiteral`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitEnumLiteral?: (ctx: EnumLiteralContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.enumName`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitEnumName?: (ctx: EnumNameContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.discreteRange`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDiscreteRange?: (ctx: DiscreteRangeContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.interval`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitInterval?: (ctx: IntervalContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainOpenSquare`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainOpenSquare?: (ctx: DomainOpenSquareContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainCloseSquare`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainCloseSquare?: (ctx: DomainCloseSquareContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainOpenRound`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainOpenRound?: (ctx: DomainOpenRoundContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainCloseRound`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainCloseRound?: (ctx: DomainCloseRoundContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.elementOpen`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitElementOpen?: (ctx: ElementOpenContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.elementClose`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitElementClose?: (ctx: ElementCloseContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.builtinDomain`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitBuiltinDomain?: (ctx: BuiltinDomainContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.domainReference`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDomainReference?: (ctx: DomainReferenceContext) => Result;
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
     * Visit a parse tree produced by `LatexMathParser.eulerLetter`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitEulerLetter?: (ctx: EulerLetterContext) => Result;
    /**
     * Visit a parse tree produced by `LatexMathParser.namedIndex`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNamedIndex?: (ctx: NamedIndexContext) => Result;
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
    /** The structured diagnostics raised while reading the last statement. */
    diagnostics: Diagnostic[];
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
    private readonly boundIndexNames;
    private readonly system;
    private isParsingUnits;
    private readonly domainBuilder;
    /** The term the expression being visited is assigned to, so `rnd` can read its domain. */
    private assignmentTargetName;
    constructor(system: System);
    /**
     * Visits an expression as a units expression: unit symbols such as m or s are turned
     * into a tree but are never registered as terms of the system.
     */
    visitUnitsExpression: (context: ExpressionContext) => Branch | null;
    /**
     * Records which term an expression is being assigned to while it is visited.  Only `rnd` uses
     * it, to read the target's domain; nothing else in the tree depends on the assignment target.
     */
    private withAssignmentTarget;
    /**
     * The independent term's values come from the run itself - its start and its step - so a statement
     * assigning to it leaves two writers disagreeing over the same column.  It is reported rather than
     * quietly accepted, because the run length still comes from the start and step while the values
     * come from the statement.
     */
    private reportIndependentAssignment;
    private markLiteralIterationIndexText;
    visitStatement: (context: StatementContext) => Branch;
    /**
     * `x \in {1,2,3}`: constrains an existing or newly created scalar term.  The statement never
     * turns x into a set or into a boolean membership test; it attaches the normalized domain to
     * the term and leaves x a plain selectable scalar.
     */
    /**
     * `\text{red}` inside an expression: the unambiguous way of writing a categorical value, so it
     * reads as that value wherever the bare label would.  A wrapper around anything that is not a
     * declared label is refused rather than read as a term, which would silently change the meaning.
     */
    visitEnumLiteralWrapped: (context: EnumLiteralWrappedContext) => Branch;
    /** `"red"` inside an expression, for a label a bare name could not spell. */
    visitEnumLiteralQuoted: (context: EnumLiteralQuotedContext) => Branch;
    private categoricalValueBranch;
    private unknownCategoricalValue;
    visitDomainConstraint: (context: DomainConstraintContext) => Branch;
    /**
     * `x = {1,2,3}`: the same thing written with `=`.  The grammar only reaches this rule for
     * shapes an ordinary expression can never produce, so `x = {1}` and `x = y` keep meaning
     * exactly what they meant before.
     */
    visitDomainAssignment: (context: DomainAssignmentContext) => Branch;
    private applyDomain;
    /**
     * `domain Color = {red, green, blue}`: a reusable domain that terms refer to by name.  The
     * keyword is read as an ordinary identifier and checked here, so a model that already uses
     * `domain` as a term name is unaffected.  MathLive's `\text{domain}` spelling is accepted and
     * stored as the same declaration.
     */
    /** Reads the keyword whether it was written plainly or wrapped by the editor in \text{...}. */
    private static readDomainKeyword;
    visitNamedDomainDeclaration: (context: NamedDomainDeclarationContext) => Branch;
    private getConditionEvaluator;
    private buildConditionTree;
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
    /**
     * Whether `x\left(3\right)` can be answered by evaluating the term's own expression at that
     * independent.  A term the engine integrates cannot: the tree stored under its name is the
     * right-hand side of its differential, so substituting there would return the derivative at
     * that independent instead of the term.  Those terms, and terms with no expression at all such
     * as preloaded data, are sampled from the calculated rows instead.  The type is read when the
     * expression runs rather than when it is parsed, so the order the statements were written in
     * does not matter.
     */
    private hasClosedForm;
    visitFunctionApplication: (context: FunctionApplicationContext) => Branch;
    /**
     * `w\left[3\right]` reads element 3 of a name that stands for many values.  The index is an
     * expression, so `w\left[i\right]` follows a term, and it is read when the expression runs rather
     * than when it is parsed - the same rule the other two index spaces follow.
     */
    visitElementIndex: (context: ElementIndexContext) => Branch;
    /**
     * `y\left[i\right]=...` defines a name over element indices rather than over time: the index is
     * bound by the assignment and the body is evaluated once per element that is asked for.  Nothing
     * is computed up front, so the name has no count of its own - whatever reads it decides how many
     * elements it wants.  The name gets no scalar expression, which is what leaves `y` free to mean
     * "the element in hand" wherever it is read bare.
     */
    visitFunctionElement: (context: FunctionElementContext) => Branch;
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
    /**
     * `rnd(n)` reads its argument as a count when the term being assigned is constrained to a
     * domain that can be listed: `z \in {green, blue, red}` with `z = rnd(3)` picks one of the
     * three labels.  Everywhere else it keeps returning a number between 0 and n.  The domain is
     * resolved when the value is calculated, not when the expression is parsed, so declaring the
     * domain after the assignment works exactly as well as declaring it before.
     */
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
    /**
     * Names read at the current iteration by `tree`, i.e. those written `name_{n}` with the
     * iteration term as the subscript.  `name_{n-1}` and friends read an earlier row and are
     * therefore not dependencies of the row being calculated.
     */
    private collectCurrentIterationDependencies;
    private collectCurrentIterationDependenciesInto;
    private hasUnresolvedNames;
    private lazyDerivativeBranch;
    private deriveNamedExpression;
    visitDeltaName: (context: DeltaNameContext) => Branch;
    visitDeltaExpression: (context: DeltaExpressionContext) => Branch;
}

interface FiniteSetMember {
    value: number;
    /** The categorical label, or null when the member is a plain number. */
    label: string | null;
}
/** `{1, 2, 3}` or `{red, green, blue}`: an explicit list of allowed scalar values. */
declare class FiniteSetDomain extends Domain {
    readonly members: FiniteSetMember[];
    constructor(members: FiniteSetMember[]);
    /** Removes repeated values while preserving the order they were declared in. */
    private static deduplicate;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    contains(value: number): boolean;
    describe(): string;
    defaultValue(): number;
    listValues(limit: number): DomainValueMetadata[] | null;
    labelOf(value: number): string | null;
    get minimum(): number | null;
    get maximum(): number | null;
}

/**
 * `[1..5]` or `[0..10..2]`: the arithmetic progression from `start` towards `end` in `step`
 * increments.  The progression is kept structurally and only expanded through `listValues`, so a
 * range spanning millions of values costs nothing until something explicitly asks for the list.
 */
declare class DiscreteRangeDomain extends Domain {
    readonly start: number;
    readonly end: number;
    readonly step: number;
    /** How many values the progression holds; 0 when the range is malformed. */
    readonly count: number;
    constructor(start: number, end: number, step: number);
    /** The step a range without an explicit one uses: +1 ascending, -1 descending. */
    static defaultStep(start: number, end: number): number;
    static isValid(start: number, end: number, step: number): boolean;
    private static countOf;
    /** Tolerance expressed in steps, so `[0..1..0.1]` still reaches 1 despite binary rounding. */
    private static spanTolerance;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    /** The last value the progression actually reaches, which is `end` only when it is on a step. */
    get lastValue(): number;
    contains(value: number): boolean;
    describe(): string;
    defaultValue(): number;
    listValues(limit: number): DomainValueMetadata[] | null;
    get minimum(): number | null;
    get maximum(): number | null;
    /** Always positive: a control steps through the range from its minimum upwards. */
    get controlStep(): number | null;
}

/**
 * `[6, 7]`, `(6, 7)`, `[6, 7)` or `(6, 7]`: every real value between the two bounds.  A comma
 * separates the bounds; two dots would make it a discrete range instead.
 */
declare class IntervalDomain extends Domain {
    readonly lower: number;
    readonly upper: number;
    readonly includesLower: boolean;
    readonly includesUpper: boolean;
    constructor(lower: number, upper: number, includesLower: boolean, includesUpper: boolean);
    static isValid(lower: number, upper: number): boolean;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    contains(value: number): boolean;
    describe(): string;
    defaultValue(): number;
    listValues(_limit: number): DomainValueMetadata[] | null;
    get minimum(): number | null;
    get maximum(): number | null;
    get includesMinimum(): boolean;
    get includesMaximum(): boolean;
}

/**
 * `{1, 2, 3} ∪ [6, 7]`: a value belongs to the union when it belongs to any of its parts.
 *
 * `normalize` is what turns the authoring shorthand `x = {1},{2},{3},[6..7]` into the single
 * finite domain `{1, 2, 3, 6, 7}`: nested unions are flattened, finite parts are merged and
 * duplicates are dropped while the declared order is preserved.  Parts that are not finite, and
 * ranges too large to expand safely, stay structural.
 */
declare class UnionDomain extends Domain {
    readonly members: Domain[];
    /** How many values a finite part may hold before it is left structural instead of merged. */
    static readonly MAXIMUM_MERGED_VALUES: number;
    private constructor();
    /** Builds the simplest domain equivalent to the union of `members`. */
    static normalize(members: Domain[]): Domain;
    get kind(): DomainKind;
    get isCategorical(): boolean;
    get isFinite(): boolean;
    get control(): DomainControl;
    contains(value: number): boolean;
    describe(): string;
    defaultValue(): number;
    listValues(limit: number): DomainValueMetadata[] | null;
    labelOf(value: number): string | null;
    get minimum(): number | null;
    get maximum(): number | null;
    toMetadata(): DomainMetadata;
}

export { Body, Branch, BuiltinDomain, BuiltinDomainKind, RegressionType as DataRegressionType, Deriver, DiagnosticCode, DiagnosticCollector, DiagnosticSeverity, DiscreteRangeDomain, Domain, DomainControl, DomainKind, DomainReference, DomainRegistry, DomainSerializer, Engine, EnumLiteral, EnumLiteralTable, Expression, ExpressionExpander, FiniteSetDomain, IntervalDomain, LatexVisitor, Parser, PhysicalBody, PhysicalEngine, PreloadedData, RegressionTerm, Regressor, Simplifier, SingularitiesDetector, SingularityType, System, Term, TermType, UnionDomain, Visitor, formatDomainNumber };
export type { RegressionPoint as DataRegressionPoint, RegressionResult as DataRegressionResult, Diagnostic, DomainJson, DomainMetadata, DomainResolver, DomainValueMetadata, DomainsJson, EnumLiteralEntry, FiniteSetMember, NamedDomainDeclaration, Singularity, SourceLocation, SystemProcessor };
