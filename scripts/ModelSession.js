class ModelSession {
    constructor(modelsApiClient) {
        this.calculator = new Calculator();
        this.modelsApiClient = modelsApiClient;
        this.properties = {};
        this.pendingInitialValuesByCase = null;
        this.setDefaults();
    }

    setDefaults() {
        this.properties.name = "Model";
        this.properties.description = "";
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.precision = 2;
        this.properties.angleUnit = "radians";
        this.properties.independent = { name: "t", start: 0, end: 10, step: 0.1, noLimit: false };
        this.properties.iterationTerm = "n";
        this.properties.iterationTermStart = 1;
        this.properties.playerTerm = "independent";
        this.properties.casesCount = 1;
        this.properties.initialValuesByCase = {};
        this.properties.iterationDuration = null;
        this.properties.thumbnailUrl = "";
        this.properties.instructions = "";
        this.properties.educationLevel = "university";
        this.properties.gridSize = 20;
        this.properties.snapToGrid = false;
        this.properties.backgroundId = "";
        this.properties.autoPlay = false;
    }

    setProperties(properties) {
        if (!properties)
            properties = this.properties;
        else
            Utils.mergeProperties(properties, this.properties);
        this.properties.casesCount = this.calculator.normalizeCasesCount(this.properties.casesCount);
        this.calculator.setProperties(this.properties);
    }

    serialize() {
        this.properties.initialValuesByCase = this.calculator.getInitialValuesByCase();
        const properties = Object.assign({}, this.properties);
        delete properties.AIApiKey;
        const result = { properties };
        const outlierIterations = this.calculator.getOutlierIterations();
        if (outlierIterations)
            result.outlierIterations = outlierIterations;
        const regressionTerms = this.calculator.getRegressionTermsData();
        if (regressionTerms)
            result.regressionTerms = regressionTerms;
        return result;
    }

    deserialise(model) {
        this.pendingInitialValuesByCase = model?.properties?.initialValuesByCase ?? model?.properties?.initialValues ?? null;
        this.setProperties(model.properties);
        this.calculator.loadOutlierIterations(model?.outlierIterations);
        this.calculator.loadRegressionTerms(model?.regressionTerms);
    }
}
