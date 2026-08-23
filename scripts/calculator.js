// @ts-check
/// <reference path="../libraries/types/global.d.ts" />

const STATUS = { PLAYING: 0, PAUSED: 1, REPLAYING: 2, STOPPED: 3 };

class Calculator extends EventTarget {
    constructor() {
        super();
        this.system = new Modellus.System("t", "n");
        this.regressor = new Modellus.Regressor(this.system);
        this.parser = new Modellus.Parser(this.system);
        this.engine = new Modellus.Engine(this.system);
        this.singularitiesDetector = new Modellus.SingularitiesDetector(this.system);
        this.physicalEngine = new Modellus.PhysicalEngine(this.system);
        this.status = STATUS.STOPPED;
        this.properties = this.createDefaultProperties();
        /** @type {{ [caseNumber: number]: { [term: string]: { [iteration: number]: number } } }} */
        this.userInputsByCase = {};
        /** @type {Map<string, { names: string[], values: number[][] }>} */
        this.dataSources = new Map();
        this.setDefaults();
    }

    createDefaultProperties() {
        return { precision: 2, angleUnit: "radians", independent: { name: "t", start: 0, end: 10, step: 0.1, noLimit: false }, iterationTerm: "n", iterationTermStart: 1, casesCount: 1, initialValuesByCase: {}, iterationDuration: null, termUnits: {} };
    }

    setDefaults() {
        this.properties = this.createDefaultProperties();
        this.preloadedRegressionTerms = null;
        this.preloadedOutlierIterations = null;
        this.recalculationRevision = 0;
        this.recalculatedIteration = 1;
    }

    normalizeCasesCount(value = 1) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue))
            return 1;
        const normalizedValue = Math.floor(numericValue);
        if (normalizedValue < 1)
            return 1;
        if (normalizedValue > 9)
            return 9;
        return normalizedValue;
    }

    setProperties(properties = this.createDefaultProperties()) {
        Utils.mergeProperties(properties, this.properties);
        this.properties.casesCount = this.normalizeCasesCount(this.properties.casesCount);
        if (properties?.termUnits)
            this.properties.termUnits = Utils.normalizeTermUnits(properties.termUnits);
        this.reset();
    }

    setTermUnits(termUnits) {
        this.properties.termUnits = Utils.normalizeTermUnits(termUnits);
        this.applyTermUnits();
    }

    applyTermUnits() {
        for (const termName of this.getTermsNames())
            this.system.setTermUnits(termName, this.properties.termUnits[termName] ?? null);
    }

    getTermUnit(termName) {
        return this.system.getTermUnits(termName) ?? "";
    }

    setProperty(name = "", value = 0) {
        if (name === "casesCount")
            value = this.normalizeCasesCount(value);
        Utils.setProperty(name, value, this.properties);
        this.reset();
    }

    emit(eventName = "", detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        this.dispatchEvent(event);
    }

    on(eventName = "", callback = () => {}) {
        this.addEventListener(eventName, callback);
    }

    off(eventName = "", callback = () => {}) {
        this.removeEventListener(eventName, callback);
    }

    _iterate = () => {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            clearTimeout(this.frameId);
        }
        if (this.status != STATUS.PLAYING)
            return;
        // The end is not always on a step - "0 to 2.28 by 0.1" stops on 2.20 - so the player counts
        // iterations instead of waiting for the independent to land on the end value, which an
        // off-step end never does.
        if (!this.properties.independent.noLimit && this.system.iteration >= this.getFinalIteration())
            this.pause();
        else if (this.system.iteration < this.system.lastCalculatedIteration)
            this.system.iteration++;
        else
            this.engine.iterate();
        this.emit("iterate", { calculator: this });     
        if (this.status == STATUS.PLAYING) {
            const delayMs = this.properties.iterationDuration > 0 ? this.properties.iterationDuration * 1000 : 0;
            this.frameId = delayMs > 0 ? setTimeout(this._iterate, delayMs) : requestAnimationFrame(this._iterate);
        }
    }

    calculate(iteration = this.system.iteration) {
        const normalizedIteration = Math.max(1, Math.min(Math.floor(Number(iteration) || 1), this.system.lastIteration));
        this.recalculationRevision = (this.recalculationRevision ?? 0) + 1;
        this.recalculatedIteration = normalizedIteration;
        // calculateFunctions always targets the last calculated iteration, so a value changed while
        // the player replays already-computed rows has to be recalculated on the displayed row.
        if (normalizedIteration >= this.system.lastCalculatedIteration)
            this.system.calculateFunctions();
        else
            /** @type {any} */ (this.system).calculateFunctionsOnIteration(normalizedIteration);
        this.emit("iterate", { calculator: this });
    }

    play() {
        this.status = STATUS.PLAYING;
        this._iterate();
    }

    pause() {
        this.status = STATUS.PAUSED;
    }

    stop() {
        this.engine.reset();
        this.status = STATUS.STOPPED;
    }

    stepBackward() {
        this.system.iteration = Math.max(1, this.system.iteration - 1);
        this.emit("iterate", { calculator: this });
    }

    stepForward() {
        this.system.iteration = Math.min(this.system.lastIteration, this.system.iteration + 1);
        this.emit("iterate", { calculator: this });
    }

    _replay = () => {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            clearTimeout(this.frameId);
        }
        this.emit("iterate", { calculator: this }); 
        if (this.status == STATUS.PLAYING) {
            if (this.system.iteration >= this.system.lastIteration)
                this.system.iteration = 1;
            else
                this.system.iteration++;
            const delayMs = this.properties.iterationDuration > 0 ? this.properties.iterationDuration * 1000 : 0;
            this.frameId = delayMs > 0 ? setTimeout(this._replay, delayMs) : requestAnimationFrame(this._replay);
        }
    }

    replay() {
        this.status = STATUS.PLAYING;
        this.system.iteration = 1;
        this._replay();
    }

    clear() {
        this.setDefaults();
        this.reset();
    }

    reset() {
        this.system.clear();
        this.dataSources.clear();
        this.system.independent = this.properties.independent.name;
        this.system.setInitialIndependent(this.properties.independent.start);
        this.system.step = this.properties.independent.step;
        this.system.iterationTerm = this.properties.iterationTerm;
        this.system.iterationTermStart = this.properties.iterationTermStart ?? 1;
        this.system.useRadians = this.properties.angleUnit === "radians";
        this.properties.casesCount = this.normalizeCasesCount(this.properties.casesCount);
        this.system.casesCount = this.properties.casesCount;
        this.engine.reset();
        this.system.reset();
        this.physicalEngine.bodies = [];
        this.physicalEngine.physicsConstantsRegistered = false;
        this.status = STATUS.STOPPED;
        this.recalculationRevision = 0;
        this.recalculatedIteration = 1;
        this.userInputsByCase = {};
        this.clearHook();
    }

    addPhysicalBody(name, mass = 1) {
        this.physicalEngine.addBody(new Modellus.PhysicalBody(name, mass));
    }

    removePhysicalBody(name) {
        this.physicalEngine.bodies = this.physicalEngine.bodies.filter(body => body.name !== name);
    }

    setHook(hookFunctionBody) {
        this.hookFunction = new Function("values", "setTermValue", hookFunctionBody);
    }

    clearHook() {
        this.hookFunction = null;
    }

    // Every set of values a shape hands the model — a data table's columns, an object's memory —
    // is held here under the id of what owns it, so several of them feed the model at once and one
    // being rewritten does not take the others with it. Row i is iteration i + 1: that is what
    // makes measurements, and a recording, a run the model can be stepped through.
    setDataSource(sourceId, names, values) {
        const rows = Array.isArray(values) ? values : [];
        const termNames = Array.isArray(names) ? names : [];
        if (termNames.length === 0 || rows.length === 0)
            this.dataSources.delete(sourceId);
        else
            this.dataSources.set(sourceId, { names: termNames, values: rows });
        this.applyDataSources();
    }

    removeDataSource(sourceId) {
        if (!this.dataSources.delete(sourceId))
            return;
        this.applyDataSources();
    }

    getDataSource(sourceId) {
        return this.dataSources.get(sourceId) ?? null;
    }

    applyDataSources() {
        const merged = Calculator.mergeDataSources(Array.from(this.dataSources.values()));
        this.system.loadTerms(merged.names, merged.values);
    }

    // Sources of different lengths become one table as long as the longest, with the rows a source
    // does not reach left blank, which is what a data table with an empty cell already means.
    static mergeDataSources(sources) {
        const names = [];
        for (const source of sources) {
            for (const name of source.names) {
                if (!names.includes(name))
                    names.push(name);
            }
        }
        const rowCount = sources.reduce((longest, source) => Math.max(longest, source.values.length), 0);
        const values = [];
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const row = new Array(names.length).fill(NaN);
            for (const source of sources) {
                const sourceRow = source.values[rowIndex];
                if (!sourceRow)
                    continue;
                for (let columnIndex = 0; columnIndex < source.names.length; columnIndex++)
                    row[names.indexOf(source.names[columnIndex])] = sourceRow[columnIndex];
            }
            values.push(row);
        }
        return { names: names, values: values };
    }

    loadExternalData(names, values, sourceId = "external-data") {
        this.setDataSource(sourceId, names, values);
        this.engine.reset();
    }

    refreshExternalData(names, values, sourceId = "external-data") {
        this.setDataSource(sourceId, names, values);
        this.refreshDataSources();
    }

    // What follows an edit to any of the values the model runs on: it works them through again and
    // says so, which is what everything reading them redraws on.
    refreshDataSources() {
        this.engine.reset();
        this.system.reset();
        this.emit("iterate", { calculator: this });
    }

    // The values themselves come back through the terms they feed, the way measurements do; this is
    // for whoever asked the model to hold them and needs to see what it is holding.
    getDataSourceValues(sourceId, termName) {
        const source = this.getDataSource(sourceId);
        if (!source)
            return [];
        const columnIndex = source.names.indexOf(termName);
        if (columnIndex < 0)
            return [];
        return source.values.map(row => row[columnIndex]);
    }

    getOutlierIterations() {
        const outliersByTermName = this.system.preloadedData.outliersByTermName;
        if (!outliersByTermName || outliersByTermName.size === 0)
            return null;
        const result = [];
        for (const [termName, iterationSet] of outliersByTermName)
            result.push({ termName: termName, iterations: [...iterationSet] });
        return result.length > 0 ? result : null;
    }

    loadOutlierIterations(outlierIterations = null) {
        if (!Array.isArray(outlierIterations)) {
            this.preloadedOutlierIterations = null;
            return;
        }
        this.preloadedOutlierIterations = outlierIterations;
    }

    applyPreloadedOutlierIterations() {
        if (!Array.isArray(this.preloadedOutlierIterations))
            return;
        for (let index = 0; index < this.preloadedOutlierIterations.length; index++) {
            const entry = this.preloadedOutlierIterations[index];
            if (!entry?.termName || !Array.isArray(entry.iterations))
                continue;
            for (let iterationIndex = 0; iterationIndex < entry.iterations.length; iterationIndex++)
                this.system.addOutlierIteration(entry.termName, entry.iterations[iterationIndex]);
        }
    }

    loadRegressionTerms(regressionTerms = null) {
        if (!Array.isArray(regressionTerms)) {
            this.preloadedRegressionTerms = null;
            return;
        }
        const serializedRegressionTerms = /** @type {any[]} */ (regressionTerms);
        const normalizedTerms = [];
        for (let index = 0; index < serializedRegressionTerms.length; index++) {
            const regressionTerm = /** @type {any} */ (serializedRegressionTerms[index]);
            const targetTermName = String(regressionTerm?.targetTermName ?? "").trim();
            const sourceTermName = String(regressionTerm?.sourceTermName ?? "").trim();
            if (targetTermName === "" || sourceTermName === "")
                continue;
            const ranges = Array.isArray(regressionTerm?.ranges) ? regressionTerm.ranges : [];
            const normalizedRanges = [];
            for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
                const range = ranges[rangeIndex];
                const caseNumber = parseInt(range?.caseNumber, 10);
                const regressionType = String(range?.regressionType ?? "").trim();
                const independentStart = Number(range?.independentStart);
                const independentEnd = Number(range?.independentEnd);
                if (!Number.isFinite(caseNumber) || caseNumber < 1)
                    continue;
                if (regressionType !== "Linear" && regressionType !== "Quadratic")
                    continue;
                if (!Number.isFinite(independentStart) || !Number.isFinite(independentEnd))
                    continue;
                normalizedRanges.push({ caseNumber: caseNumber, regressionType: regressionType, independentStart: independentStart, independentEnd: independentEnd });
            }
            if (normalizedRanges.length === 0)
                continue;
            const expressionLatex = String(regressionTerm?.expressionLatex ?? "").trim();
            normalizedTerms.push({ targetTermName: targetTermName, sourceTermName: sourceTermName, ranges: normalizedRanges, expressionLatex: expressionLatex });
        }
        this.preloadedRegressionTerms = normalizedTerms.length > 0 ? normalizedTerms : null;
    }

    getRegressionTermsData() {
        const termsNames = this.getTermsNames();
        const regressionTerms = [];
        for (let index = 0; index < termsNames.length; index++) {
            const targetTermName = termsNames[index];
            const term = this.system.getTerm(targetTermName);
            if (!term || term.type !== Modellus.TermType.REGRESSION)
                continue;
            const regressionTerm = /** @type {any} */ (term);
            const sourceTermName = String(regressionTerm.sourceTermName ?? "").trim();
            if (sourceTermName === "")
                continue;
            const ranges = Array.isArray(regressionTerm.ranges) ? regressionTerm.ranges : [];
            const serializedRanges = [];
            for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
                const range = ranges[rangeIndex];
                const caseNumber = parseInt(range?.caseNumber, 10);
                const regressionType = String(range?.regressionType ?? "").trim();
                const independentStart = Number(range?.independentStart);
                const independentEnd = Number(range?.independentEnd);
                if (!Number.isFinite(caseNumber) || caseNumber < 1)
                    continue;
                if (regressionType !== "Linear" && regressionType !== "Quadratic")
                    continue;
                if (!Number.isFinite(independentStart) || !Number.isFinite(independentEnd))
                    continue;
                serializedRanges.push({ caseNumber: caseNumber, regressionType: regressionType, independentStart: independentStart, independentEnd: independentEnd });
            }
            if (serializedRanges.length === 0)
                continue;
            const expressionLatex = String(regressionTerm.expressionLatex ?? "").trim();
            regressionTerms.push({ targetTermName: targetTermName, sourceTermName: sourceTermName, ranges: serializedRanges, expressionLatex: expressionLatex });
        }
        if (regressionTerms.length === 0)
            return null;
        return regressionTerms;
    }

    getIterationFromIndependentValue(independentValue = 0) {
        const independentStart = Number(this.properties?.independent?.start);
        const independentStep = Number(this.properties?.independent?.step);
        if (!Number.isFinite(independentStart) || !Number.isFinite(independentStep) || independentStep === 0)
            return 1;
        const rawIteration = Math.round((independentValue - independentStart) / independentStep) + 1;
        const finalIteration = Math.min(this.getFinalIteration(), this.system.lastIteration);
        const clampedIteration = Math.max(1, Math.min(finalIteration, rawIteration));
        return clampedIteration;
    }

    restoreRegressionRange(sourceTermName = "", targetTermName = "", regressionType = "", caseNumber = 1, independentStart = 0, independentEnd = 0) {
        const startIteration = this.getIterationFromIndependentValue(independentStart);
        const endIteration = this.getIterationFromIndependentValue(independentEnd);
        const normalizedStart = Math.min(startIteration, endIteration);
        const normalizedEnd = Math.max(startIteration, endIteration);
        const regressionResult = /** @type {any} */ (this.regressor).calculate(sourceTermName, regressionType, caseNumber, normalizedStart, normalizedEnd);
        if (!regressionResult)
            return;
        this.rebuildExpressionLatex();
        this.ensureRegressionExpressionLatex(regressionResult);
        const resultTargetName = String(regressionResult.targetTermName ?? "");
        if (resultTargetName !== targetTermName)
            return;
    }

    applyPreloadedRegressionTerms() {
        if (!Array.isArray(this.preloadedRegressionTerms) || this.preloadedRegressionTerms.length === 0)
            return;
        for (let termIndex = 0; termIndex < this.preloadedRegressionTerms.length; termIndex++) {
            const regressionTerm = this.preloadedRegressionTerms[termIndex];
            const sourceTermName = String(regressionTerm?.sourceTermName ?? "").trim();
            const targetTermName = String(regressionTerm?.targetTermName ?? "").trim();
            const savedExpressionLatex = String(regressionTerm?.expressionLatex ?? "").trim();
            const ranges = Array.isArray(regressionTerm?.ranges) ? regressionTerm.ranges : [];
            if (sourceTermName === "" || targetTermName === "")
                continue;
            for (let rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
                const range = ranges[rangeIndex];
                const caseNumber = Number(range?.caseNumber);
                const regressionType = String(range?.regressionType ?? "").trim();
                const independentStart = Number(range?.independentStart);
                const independentEnd = Number(range?.independentEnd);
                if (!Number.isFinite(caseNumber) || caseNumber < 1)
                    continue;
                if (regressionType !== "Linear" && regressionType !== "Quadratic")
                    continue;
                if (!Number.isFinite(independentStart) || !Number.isFinite(independentEnd))
                    continue;
                try {
                    this.restoreRegressionRange(sourceTermName, targetTermName, regressionType, caseNumber, independentStart, independentEnd);
                } catch (error) {
                    console.error(`[regression] restoreRegressionRange threw:`, error);
                }
            }
            const restoredTerm = /** @type {any} */ (this.system.getTerm(targetTermName));
            if (savedExpressionLatex === "")
                continue;
            if (restoredTerm)
                restoredTerm.expressionLatex = savedExpressionLatex;
        }
    }

    findMatchingBraceEnd(text = "", openBraceIndex = -1) {
        if (openBraceIndex < 0 || openBraceIndex >= text.length)
            return -1;
        if (text[openBraceIndex] !== "{")
            return -1;
        let depth = 1;
        for (let characterIndex = openBraceIndex + 1; characterIndex < text.length; characterIndex++) {
            if (text[characterIndex] === "{")
                depth++;
            else if (text[characterIndex] === "}") {
                depth--;
                if (depth === 0)
                    return characterIndex;
            }
        }
        return -1;
    }

    unwrapDisplaylines(text = "") {
        const displaylinesStart = "\\displaylines{";
        let normalizedText = "";
        for (let characterIndex = 0; characterIndex < text.length;) {
            if (!text.startsWith(displaylinesStart, characterIndex)) {
                normalizedText += text[characterIndex];
                characterIndex++;
                continue;
            }
            const openBraceIndex = characterIndex + displaylinesStart.length - 1;
            const closeBraceIndex = this.findMatchingBraceEnd(text, openBraceIndex);
            if (closeBraceIndex < 0) {
                normalizedText += text.substring(characterIndex);
                break;
            }
            normalizedText += text.substring(openBraceIndex + 1, closeBraceIndex);
            characterIndex = closeBraceIndex + 1;
        }
        return normalizedText;
    }

    removeDisplaylinesWrappers(text = "") {
        let normalizedText = text;
        let previousText = null;
        while (normalizedText !== previousText) {
            previousText = normalizedText;
            normalizedText = this.unwrapDisplaylines(normalizedText);
        }
        return normalizedText;
    }

    splitExpressions(text = "") {
        const expressions = [];
        let currentExpression = "";
        let environmentDepth = 0;
        for (let characterIndex = 0; characterIndex < text.length;) {
            if (text.startsWith("\\begin{", characterIndex)) {
                const endBraceIndex = text.indexOf("}", characterIndex + 7);
                if (endBraceIndex < 0) {
                    currentExpression += text.substring(characterIndex);
                    break;
                }
                currentExpression += text.substring(characterIndex, endBraceIndex + 1);
                environmentDepth++;
                characterIndex = endBraceIndex + 1;
                continue;
            }
            if (text.startsWith("\\end{", characterIndex)) {
                const endBraceIndex = text.indexOf("}", characterIndex + 5);
                if (endBraceIndex < 0) {
                    currentExpression += text.substring(characterIndex);
                    break;
                }
                currentExpression += text.substring(characterIndex, endBraceIndex + 1);
                environmentDepth = Math.max(0, environmentDepth - 1);
                characterIndex = endBraceIndex + 1;
                continue;
            }
            if (text.startsWith("\\\\", characterIndex) && environmentDepth === 0) {
                const expression = currentExpression.trim();
                if (expression.length > 0)
                    expressions.push(expression);
                currentExpression = "";
                characterIndex += 2;
                continue;
            }
            currentExpression += text[characterIndex];
            characterIndex++;
        }
        const expression = currentExpression.trim();
        if (expression.length > 0)
            expressions.push(expression);
        return expressions;
    }

    normalizeExpressionText(text = "") {
        let normalizedText = this.removeDisplaylinesWrappers(text);
        normalizedText = Utils.readFunctionNames(normalizedText);
        normalizedText = normalizedText.replace(/\\placeholder\{\}/g, '');
        normalizedText = normalizedText.replace(/\\differentialD\s+([A-Za-z][A-Za-z0-9]*)/g, '\\differentialD{$1}');
        return normalizedText;
    }

    parse(text = "") {
        const expressions = this.splitExpressions(this.normalizeExpressionText(text));
        expressions.forEach(e => this.parser.parse(e));
        const latexVisitor = new Modellus.LatexVisitor(this.system);
        latexVisitor.build();
        this.engine.reset();
        this.system.reset();
    }

    // Rows are checked against a system of this call's own: parsing a name is what makes it a term, and a
    // row the user is still writing would otherwise leave the model holding terms it never asked for.
    findRowParseErrors(rowsLatex = []) {
        const parser = new Modellus.Parser(new Modellus.System(this.properties.independent.name, this.properties.iterationTerm));
        return rowsLatex.map(rowLatex => this.findRowParseError(parser, rowLatex));
    }

    findRowParseError(parser, rowLatex = "") {
        const expressions = this.splitExpressions(this.normalizeExpressionText(rowLatex));
        for (let expressionIndex = 0; expressionIndex < expressions.length; expressionIndex++) {
            parser.hasErrors = false;
            parser.errors = [];
            try {
                parser.parse(expressions[expressionIndex]);
            } catch (error) {
                return String(error?.message ?? error);
            }
            if (parser.hasErrors)
                return parser.errors[0] ?? "The expression could not be parsed.";
        }
        return null;
    }

    getByName(name = "", caseNumber = 1) {
        const iteration = this.getIteration();
        return this.system.getByNameOnIteration(iteration, name, caseNumber);
    }

    setIteration(iteration = 1) {
        this.system.iteration = Math.max(1, Math.min(iteration, this.system.lastIteration));
        this.emit("iterate", { calculator: this });
        return this.system.iteration;
    }

    getIteration() {
        return this.system.iteration;
    }

    isPlaying() {
        return this.status === STATUS.PLAYING;
    }

    getLastIteration() {
        return this.system.lastIteration;
    }

    getLastCalculatedIteration() {
        return this.system.lastCalculatedIteration;
    }

    getIndependentValue(iteration = this.system.iteration) {
        return this.system.getIndependentOnIteration(Math.max(1, Math.min(iteration, this.system.lastIteration)));
    }

    getIterationTermValue(iteration = this.system.iteration) {
        return this.system.iterationToIterationTermValue(iteration);
    }

    get() {
        return this.system.get();
    }

    getValues() {
        return this.system.values;
    }
    
    getTermsNames() {
        return this.system.getTermsNames();
    }

    applyDataRegression(sourceTermName = "", regressionType = "none", caseNumber = 1, startIteration = undefined, endIteration = undefined) {
        const regressor = this.regressor;
        const regressionResult = /** @type {any} */ (regressor).calculate(sourceTermName, regressionType, caseNumber, startIteration, endIteration);
        if (regressionResult) {
            this.rebuildExpressionLatex();
            this.ensureRegressionExpressionLatex(regressionResult);
        }
        return regressionResult;
    }

    removeDataRegression(targetTermName = "", caseNumber = 1, startIteration = undefined, endIteration = undefined) {
        const regressor = this.regressor;
        return /** @type {any} */ (regressor).remove(targetTermName, caseNumber, startIteration, endIteration);
    }

    /** @param {string} sourceTermName @param {string} regressionType @param {string} targetTermName @param {number} caseNumber */
    calculateDataRegression(sourceTermName, regressionType, targetTermName, caseNumber = 1) {
        const regressor = this.regressor;
        const regressionResult = /** @type {any} */ (regressor).calculate(sourceTermName, regressionType, caseNumber);
        if (regressionResult) {
            this.rebuildExpressionLatex();
            this.ensureRegressionExpressionLatex(regressionResult);
        }
        return regressionResult;
    }

    rebuildExpressionLatex() {
        const latexVisitor = new Modellus.LatexVisitor(this.system);
        latexVisitor.build();
    }

    ensureRegressionExpressionLatex(regressionResult = null) {
        const normalizedRegressionResult = /** @type {any} */ (regressionResult ?? {});
        const targetTermName = String(normalizedRegressionResult.targetTermName ?? "").trim();
        if (targetTermName === "")
            return;
        const targetTerm = this.system.getTerm(targetTermName);
        if (!targetTerm)
            return;
        const currentExpressionLatex = String(targetTerm.expressionLatex ?? "").trim();
        if (currentExpressionLatex !== "")
            return;
        targetTerm.expressionLatex = this.buildRegressionExpressionLatex(normalizedRegressionResult, targetTermName);
    }

    buildRegressionExpressionLatex(regressionResult = null, targetTermName = "") {
        const normalizedRegressionResult = /** @type {any} */ (regressionResult ?? {});
        const independentName = this.system.independent.name;
        const normalizedRegressionType = String(normalizedRegressionResult.regressionType ?? "").trim().toLowerCase();
        if (normalizedRegressionType === "linear")
            return `${targetTermName}.m1 \\cdot ${independentName} + ${targetTermName}.m2`;
        if (normalizedRegressionType === "quadratic")
            return `${targetTermName}.m1 \\cdot ${independentName}^2 + ${targetTermName}.m2 \\cdot ${independentName} + ${targetTermName}.m3`;
        return String(normalizedRegressionResult.expression ?? "").trim();
    }

    getInitialValuesByCase() {
        const casesCount = this.normalizeCasesCount(this.properties.casesCount);
        const terms = this.getTermsNames();
        const initialValuesByCaseEntries = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++) {
            const values = this.system.getIteration(1, caseNumber);
            const caseValuesEntries = [];
            for (let i = 0; i < terms.length; i++) {
                const term = terms[i];
                if (term === this.properties.independent.name)
                    continue;
                if (term === this.properties.iterationTerm)
                    continue;
                if (this.system.getTerm(term)?.type === Modellus.TermType.PRELOADED)
                    continue;
                const value = values[term];
                if (!Number.isFinite(value))
                    continue;
                caseValuesEntries.push([term, value]);
            }
            if (caseValuesEntries.length > 0)
                initialValuesByCaseEntries.push([caseNumber, Object.fromEntries(caseValuesEntries)]);
        }
        return Object.fromEntries(initialValuesByCaseEntries);
    }

    applyInitialValuesByCase(initialValuesByCase = {}) {
        if (!initialValuesByCase || typeof initialValuesByCase !== "object")
            return;
        const casesCount = this.normalizeCasesCount(this.properties.casesCount);
        const caseValuesEntries = Object.entries(initialValuesByCase);
        for (let i = 0; i < caseValuesEntries.length; i++) {
            const caseNumber = parseInt(caseValuesEntries[i][0], 10);
            if (!Number.isFinite(caseNumber))
                continue;
            if (caseNumber < 1 || caseNumber > casesCount)
                continue;
            const caseValues = caseValuesEntries[i][1];
            if (!caseValues || typeof caseValues !== "object")
                continue;
            const termValuesEntries = Object.entries(caseValues);
            for (let j = 0; j < termValuesEntries.length; j++) {
                const term = termValuesEntries[j][0];
                if (!this.system.isTerm(term))
                    continue;
                if (this.system.getTerm(term)?.type === Modellus.TermType.PRELOADED)
                    continue;
                const rawValue = termValuesEntries[j][1];
                const value = Number(rawValue);
                if (!Number.isFinite(value))
                    continue;
                this.system.setInitialByName(term, value, 1, caseNumber);
            }
        }
        this.engine.reset();
    }

    isEditable(name = "") {
        var term = this.system.getTerm(name);
        return !term || this.system.isEditable(term);
    }

    isUserInputTerm(name = "") {
        if (!this.isTerm(name))
            return false;
        const type = this.system.getTerm(name)?.type;
        if (type === Modellus.TermType.FUNCTION || type === Modellus.TermType.INDEPENDENT || type === Modellus.TermType.PRELOADED)
            return false;
        if (name === this.properties.iterationTerm)
            return false;
        return this.isEditable(name);
    }

    setUserInput(name = "", value = 0, iteration = 1, caseNumber = 1) {
        if (!this.isUserInputTerm(name))
            return false;
        const numericValue = this.resolveTermValue(name, value);
        if (!Number.isFinite(numericValue))
            return false;
        const normalizedIteration = Math.max(1, Math.floor(Number(iteration) || 1));
        const normalizedCase = Math.floor(Number(caseNumber) || 1);
        if (normalizedCase < 1 || normalizedCase > this.normalizeCasesCount(this.properties.casesCount))
            return false;
        this.system.setInitialByName(name, numericValue, normalizedIteration, normalizedCase);
        if (normalizedIteration > 1) {
            if (!this.userInputsByCase[normalizedCase])
                this.userInputsByCase[normalizedCase] = {};
            if (!this.userInputsByCase[normalizedCase][name])
                this.userInputsByCase[normalizedCase][name] = {};
            this.userInputsByCase[normalizedCase][name][normalizedIteration] = numericValue;
        }
        const row = this.system.getIteration(normalizedIteration, normalizedCase);
        if (row)
            row[name] = numericValue;
        return true;
    }

    removeUserInput(name = "", iteration = 1, caseNumber = 1) {
        const normalizedIteration = Math.max(1, Math.floor(Number(iteration) || 1));
        const normalizedCase = Math.floor(Number(caseNumber) || 1);
        if (normalizedIteration <= 1)
            return false;
        const termInputs = this.userInputsByCase[normalizedCase]?.[name];
        if (!termInputs || termInputs[normalizedIteration] === undefined)
            return false;
        delete termInputs[normalizedIteration];
        if (Object.keys(termInputs).length === 0)
            delete this.userInputsByCase[normalizedCase][name];
        if (Object.keys(this.userInputsByCase[normalizedCase]).length === 0)
            delete this.userInputsByCase[normalizedCase];
        // Passing undefined clears the engine slot: hasInitialValueForCase treats undefined as absent.
        this.system.setInitialByName(name, /** @type {any} */ (undefined), normalizedIteration, normalizedCase);
        return true;
    }

    getUserInputIterations(name = "", caseNumber = 0) {
        const iterations = new Set();
        const caseNumbers = caseNumber >= 1 ? [caseNumber] : Object.keys(this.userInputsByCase).map(Number);
        for (let i = 0; i < caseNumbers.length; i++) {
            const termInputs = this.userInputsByCase[caseNumbers[i]]?.[name];
            if (!termInputs)
                continue;
            const iterationKeys = Object.keys(termInputs);
            for (let j = 0; j < iterationKeys.length; j++)
                iterations.add(parseInt(iterationKeys[j], 10));
        }
        return [...iterations].sort((a, b) => a - b);
    }

    getUserInput(name = "", iteration = 1, caseNumber = 1) {
        return this.userInputsByCase[caseNumber]?.[name]?.[iteration];
    }

    getUserInputsByCase() {
        if (Object.keys(this.userInputsByCase ?? {}).length === 0)
            return null;
        return JSON.parse(JSON.stringify(this.userInputsByCase));
    }

    applyUserInputsByCase(userInputsByCase = null) {
        this.userInputsByCase = {};
        if (!userInputsByCase || typeof userInputsByCase !== "object")
            return;
        const casesCount = this.normalizeCasesCount(this.properties.casesCount);
        const caseEntries = Object.entries(userInputsByCase);
        for (let i = 0; i < caseEntries.length; i++) {
            const caseNumber = parseInt(caseEntries[i][0], 10);
            if (!Number.isFinite(caseNumber) || caseNumber < 1 || caseNumber > casesCount)
                continue;
            const termInputs = caseEntries[i][1];
            if (!termInputs || typeof termInputs !== "object")
                continue;
            const termEntries = Object.entries(termInputs);
            for (let j = 0; j < termEntries.length; j++) {
                const term = termEntries[j][0];
                if (!this.isUserInputTerm(term))
                    continue;
                const iterationValues = termEntries[j][1];
                if (!iterationValues || typeof iterationValues !== "object")
                    continue;
                const iterationEntries = Object.entries(iterationValues);
                for (let k = 0; k < iterationEntries.length; k++) {
                    const iteration = parseInt(iterationEntries[k][0], 10);
                    const value = Number(iterationEntries[k][1]);
                    if (!Number.isFinite(iteration) || iteration <= 1 || !Number.isFinite(value))
                        continue;
                    this.system.setInitialByName(term, value, iteration, caseNumber);
                    if (!this.userInputsByCase[caseNumber])
                        this.userInputsByCase[caseNumber] = {};
                    if (!this.userInputsByCase[caseNumber][term])
                        this.userInputsByCase[caseNumber][term] = {};
                    this.userInputsByCase[caseNumber][term][iteration] = value;
                }
            }
        }
        this.engine.reset();
    }

    // A moment is an iteration the scenarios shape shows as a group: iteration 1 plus every
    // iteration that already holds a user input. Cases are pooled because a group spans every
    // case column, so a group opened on case 1 is also a moment for case 2.
    isMomentIteration(iteration = 1) {
        const normalizedIteration = Math.max(1, Math.floor(Number(iteration) || 1));
        if (normalizedIteration === 1)
            return true;
        const caseKeys = Object.keys(this.userInputsByCase);
        for (let i = 0; i < caseKeys.length; i++) {
            const termInputs = this.userInputsByCase[caseKeys[i]];
            const termKeys = Object.keys(termInputs);
            for (let j = 0; j < termKeys.length; j++)
                if (termInputs[termKeys[j]][normalizedIteration] !== undefined)
                    return true;
        }
        return false;
    }

    // Value changes the user drives from a shape are anchored to the moment they happen on, so the
    // scenarios shape mirrors them the same way it mirrors iteration 1. Moments are only ever
    // opened from the scenarios shape itself, so a change away from one stays transient.
    setTermValue(name = "", value = 0, iteration = this.system.iteration, caseNumber = 1) {
        const normalizedIteration = Math.max(1, Math.floor(Number(iteration) || 1));
        this.setComputedTermValue(name, value, normalizedIteration, caseNumber);
        if (normalizedIteration > 1 && this.isMomentIteration(normalizedIteration))
            this.setUserInput(name, value, normalizedIteration, caseNumber);
    }

    // The write the model itself drives, used for the model hook: it runs on every iteration, so
    // recording it would turn computed values into saved scenario overrides that the next run then
    // re-applies as initial values.
    setComputedTermValue(name = "", value = 0, iteration = this.system.iteration, caseNumber = 1) {
        const system = this.system;
        var term = system.getTerm(name);
        if (!term)
            return;
        value = this.resolveTermValue(name, value);
        const normalizedIteration = Math.max(1, Math.floor(Number(iteration) || 1));
        // system.set only ever writes on the last iteration, which is not where the user is looking
        // when the player replays already-computed rows.
        if (normalizedIteration >= system.lastIteration)
            system.set(term, value, caseNumber);
        else if (system.isEditable(term))
            system.getIteration(normalizedIteration, caseNumber)[name] = value;
        if (normalizedIteration == 1)
            system.setInitialByName(name, value, normalizedIteration, caseNumber);
    }

    getFinalIteration() {
        if (this.properties.independent.noLimit)
            return Math.max(1, this.system.lastIteration);
        const independent = this.properties.independent;
        // Binary rounding leaves a whole-step end just short of its own step - (0.3 - 0) / 0.1 is
        // 2.9999999999999996 - so the range domain counts the iterations with the engine's tolerance.
        const range = new Modellus.DiscreteRangeDomain(independent.start, independent.end, independent.step);
        return Math.max(1, range.count);
    }

    getEnd() {
        return this.properties.independent.end;
    }

    getStep() {
        return this.properties.independent.step;
    }      

    getStart() {
        return this.properties.independent.start;
    }

    getPrecision() {
        return this.properties.precision;
    }

    isTerm(name = "") {
        return this.system.terms[name] !== undefined;
    }

    isIterationTerm(name) {
        return name != null && name !== "" && name === this.properties.iterationTerm;
    }

    getTermPrecision(name) {
        return this.isIterationTerm(name) ? 0 : this.getPrecision();
    }

    // ---- Categorical terms -----------------------------------------------
    // A term constrained to a set of labels - z ∈ {green, blue, red} - holds the number the label
    // is stored as. Everything the user sees and types is the label, so these four helpers are the
    // only place the number and the label meet.

    isCategoricalTerm(name = "") {
        return this.system.getTerm(name)?.isCategorical === true;
    }

    // The {value, label} pairs a categorical term can take, in declared order, or null for every
    // other term. A dropdown is built straight from this. Every visible cell asks on every frame,
    // so the answer is kept against the domain object that produced it: parsing again builds a new
    // domain, which is the only thing that can change the list.
    getTermDomainValues(name = "") {
        if (!this.isCategoricalTerm(name))
            return null;
        const domain = this.system.getTermDomain(name);
        if (!domain)
            return null;
        if (!this._domainValuesByDomain)
            this._domainValuesByDomain = new WeakMap();
        if (this._domainValuesByDomain.has(domain))
            return this._domainValuesByDomain.get(domain);
        const values = this.system.getTermDomainMetadata(name)?.values;
        const resolved = Array.isArray(values) && values.length > 0 ? values : null;
        this._domainValuesByDomain.set(domain, resolved);
        return resolved;
    }

    getValueLabel(name = "", value = 0) {
        return this.system.getValueLabel(name, Number(value));
    }

    // The number behind a value written as a label, so a caller can pass either. A label the term's
    // domain does not hold still resolves when the model knows it, which lets the domain report the
    // violation rather than the value being dropped without a word.
    resolveTermValue(name = "", value = 0) {
        if (typeof value !== "string")
            return Number(value);
        const label = value.trim();
        if (label === "")
            return Number(value);
        const domainValues = this.getTermDomainValues(name);
        if (domainValues) {
            const match = domainValues.find(entry => entry.label === label);
            if (match)
                return match.value;
        }
        const enumValue = this.system.getEnumValue(label);
        return enumValue !== undefined ? enumValue : Number(value);
    }

    getTermsByType() {
        const independentName = this.properties.independent.name;
        const iterationName = this.properties.iterationTerm;
        const derivatives = [];
        const functions = [];
        const parameters = [];
        const termNames = this.getTermsNames();
        for (let i = 0; i < termNames.length; i++) {
            const name = termNames[i];
            if (name === independentName || name === iterationName)
                continue;
            const term = this.system.getTerm(name);
            if (!term)
                continue;
            if (term.type === Modellus.TermType.DIFFERENTIAL)
                derivatives.push(name);
            else if (term.type === Modellus.TermType.FUNCTION)
                functions.push(name);
            else if (term.type === Modellus.TermType.PARAMETER)
                parameters.push(name);
        }
        return { derivatives, functions, parameters };
    }

    getDefaultTerm() {
        const { derivatives, functions, parameters } = this.getTermsByType();
        if (derivatives.length > 0)
            return derivatives[0];
        if (functions.length > 0)
            return functions[0];
        if (parameters.length > 0)
            return parameters[0];
        return this.properties.independent.name;
    }

    addOutlierIteration(termName = "", iteration = 1) {
        this.system.addOutlierIteration(termName, iteration);
        if (!Array.isArray(this.preloadedOutlierIterations))
            this.preloadedOutlierIterations = [];
        let entry = this.preloadedOutlierIterations.find(e => e.termName === termName);
        if (!entry) {
            entry = { termName: termName, iterations: [] };
            this.preloadedOutlierIterations.push(entry);
        }
        if (!entry.iterations.includes(iteration))
            entry.iterations.push(iteration);
    }

    removeOutlierIteration(termName = "", iteration = 1) {
        this.system.removeOutlierIteration(termName, iteration);
        if (!Array.isArray(this.preloadedOutlierIterations))
            return;
        const entry = this.preloadedOutlierIterations.find(e => e.termName === termName);
        if (!entry)
            return;
        entry.iterations = entry.iterations.filter(i => i !== iteration);
        if (entry.iterations.length === 0)
            this.preloadedOutlierIterations = this.preloadedOutlierIterations.filter(e => e.termName !== termName);
        if (this.preloadedOutlierIterations.length === 0)
            this.preloadedOutlierIterations = null;
    }

    isOutlierIteration(termName = "", iteration = 1) {
        return this.system.preloadedData.isOutlierIteration(termName, iteration);
    }

    calculateArea(argumentValues = [], values = []) {
        const count = Math.min(argumentValues.length, values.length);
        let area = 0;
        for (let index = 1; index < count; index++) {
            const previousArgument = Number(argumentValues[index - 1]);
            const currentArgument = Number(argumentValues[index]);
            const previousValue = Number(values[index - 1]);
            const currentValue = Number(values[index]);
            if (!Number.isFinite(previousArgument) || !Number.isFinite(currentArgument))
                continue;
            if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue))
                continue;
            area += (currentArgument - previousArgument) * (previousValue + currentValue) / 2;
        }
        return area;
    }

    calculateTermArea(argumentTermName = "", valueTermName = "", caseNumber = 1, startIteration = 1, endIteration = this.system.lastIteration) {
        const argumentValues = [];
        const values = [];
        for (let iteration = Math.max(1, startIteration); iteration <= endIteration; iteration++) {
            argumentValues.push(this.system.getByNameOnIteration(iteration, argumentTermName, caseNumber));
            values.push(this.system.getByNameOnIteration(iteration, valueTermName, caseNumber));
        }
        return this.calculateArea(argumentValues, values);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = Calculator;
