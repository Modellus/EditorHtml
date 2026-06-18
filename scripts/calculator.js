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
        this.setDefaults();
    }

    createDefaultProperties() {
        return { precision: 2, angleUnit: "radians", independent: { name: "t", start: 0, end: 10, step: 0.1, noLimit: false }, iterationTerm: "n", casesCount: 1, initialValuesByCase: {}, iterationDuration: null };
    }

    setDefaults() {
        this.properties = this.createDefaultProperties();
        this.preloadedRegressionTerms = null;
        this.preloadedOutlierIterations = null;
        this.recalculationRevision = 0;
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
        this.reset();
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
        if (this.system.iteration < this.system.lastCalculatedIteration)
            this.system.iteration++;
        else if (!this.properties.independent.noLimit && Math.abs(this.getIndependentValue(this.system.iteration) - this.properties.independent.end) < this.properties.independent.step / 10.0)
            this.pause();
        else
            this.engine.iterate();
        this.emit("iterate", { calculator: this });     
        if (this.status == STATUS.PLAYING) {
            const delayMs = this.properties.iterationDuration > 0 ? this.properties.iterationDuration * 1000 : 0;
            this.frameId = delayMs > 0 ? setTimeout(this._iterate, delayMs) : requestAnimationFrame(this._iterate);
        }
    }

    calculate() {
        this.recalculationRevision = (this.recalculationRevision ?? 0) + 1;
        this.system.calculateFunctions();
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
        this.system.independent = this.properties.independent.name;
        this.system.setInitialIndependent(this.properties.independent.start);
        this.system.step = this.properties.independent.step;
        this.system.iterationTerm = this.properties.iterationTerm;
        this.system.useRadians = this.properties.angleUnit === "radians";
        this.properties.casesCount = this.normalizeCasesCount(this.properties.casesCount);
        this.system.casesCount = this.properties.casesCount;
        this.engine.reset();
        this.system.reset();
        this.physicalEngine.bodies = [];
        this.physicalEngine.physicsConstantsRegistered = false;
        this.status = STATUS.STOPPED;
        this.recalculationRevision = 0;
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

    loadExternalData(names, values) {
        this.system.loadTerms(names, values);
        this.engine.reset();
    }

    refreshExternalData(names, values) {
        this.system.loadTerms(names, values);
        this.engine.reset();
        this.system.reset();
        this.emit("iterate", { calculator: this });
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

    parse(text = "") {
        text = this.removeDisplaylinesWrappers(text);
        text = text.replace(/\\placeholder\{\}/g, '');
        const expressions = this.splitExpressions(text);
        expressions.forEach(e => this.parser.parse(e));
        const latexVisitor = new Modellus.LatexVisitor(this.system);
        latexVisitor.build();
        this.engine.reset();
        this.system.reset();
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

    getLastIteration() {
        return this.system.lastIteration;
    }

    getIndependentValue(iteration = this.system.iteration) {
        return this.system.getIndependentOnIteration(Math.max(1, Math.min(iteration, this.system.lastIteration)));
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

    setTermValue(name = "", value = 0, iteration = this.system.iteration, caseNumber = 1) {
        const system = this.system;
        var term = system.getTerm(name);
        if (!term)
            return;
        system.set(term, value, caseNumber);
        if (iteration == 1)
            system.setInitialByName(name, value, iteration, caseNumber);
    }

    getFinalIteration() {
        if (this.properties.independent.noLimit)
            return Math.max(1, this.system.lastIteration);
        var independent = this.properties.independent;
        return Math.floor((independent.end - independent.start) / independent.step) + 1;
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
}

if (typeof module !== "undefined" && module.exports)
    module.exports = Calculator;
