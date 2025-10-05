class MockSystem {
    constructor(independentName, iterationTerm) {
        this.constructedWith = { independentName, iterationTerm };
        this.independent = independentName;
        this.iterationTerm = iterationTerm;
        this.iteration = 1;
        this.lastIteration = 1;
        this.step = 0;
        this.values = {};
        this.independentValues = {};
        this.terms = {};
        this.termNames = null;
        this.editableTerms = new Set();
        this.clearCalls = 0;
        this.resetCalls = 0;
        this.calculateCalls = 0;
        this.initialIndependent = undefined;
        this.setCalls = [];
        this.initialSetCalls = [];
        this.currentIndependent = undefined;
    }

    clear() {
        this.clearCalls++;
    }

    setInitialIndependent(value) {
        this.initialIndependent = value;
    }

    calculateFunctions() {
        this.calculateCalls++;
    }

    reset() {
        this.resetCalls++;
    }

    getIndependent() {
        if (this.currentIndependent !== undefined)
            return this.currentIndependent;
        if (Object.prototype.hasOwnProperty.call(this.independentValues, this.iteration))
            return this.independentValues[this.iteration];
        return 0;
    }

    getIndependentOnIteration(iteration) {
        return this.independentValues[iteration];
    }

    getByNameOnIteration(iteration, name) {
        const iterationValues = this.values[iteration];
        return iterationValues ? iterationValues[name] : undefined;
    }

    get() {
        return this.values;
    }

    getTermsNames() {
        return this.termNames ?? Object.keys(this.terms);
    }

    getTerm(name) {
        return this.terms[name];
    }

    isEditable(term) {
        return this.editableTerms.has(term);
    }

    set(term, value) {
        this.setCalls.push({ term, value, iteration: this.iteration });
        if (!this.values[this.iteration])
            this.values[this.iteration] = {};
        const key = term?.name ?? term;
        this.values[this.iteration][key] = value;
    }

    setInitialByName(name, value) {
        this.initialSetCalls.push({ name, value });
    }
}

module.exports = MockSystem;
