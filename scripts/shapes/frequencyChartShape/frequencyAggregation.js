// How a group of readings becomes one number. A frequency chart groups the run of iterations by the
// value a term took on each of them, and each series answers for its group with one of these: how
// many readings there were, or what its own term summed, averaged or spread to across them.
class FrequencyAggregation {
    static functions = [
        { value: "count", label: "Count", mark: "count" },
        { value: "probability", label: "Probability", mark: "P" },
        { value: "sum", label: "Sum", mark: "sum" },
        { value: "mean", label: "Mean", mark: "mean" },
        { value: "median", label: "Median", mark: "median" },
        { value: "min", label: "Minimum", mark: "min" },
        { value: "max", label: "Maximum", mark: "max" },
        { value: "sd", label: "Standard Deviation", mark: "sd" }
    ];

    static defaultFunction = "count";

    static getFunction(name) {
        return FrequencyAggregation.functions.find(entry => entry.value === name) ?? FrequencyAggregation.functions[0];
    }

    static normalize(name) {
        return FrequencyAggregation.getFunction(name).value;
    }

    static getMark(name) {
        return FrequencyAggregation.getFunction(name).mark;
    }

    static getLabel(name) {
        return FrequencyAggregation.getFunction(name).label;
    }

    // Counting asks nothing of the readings but that they were made: how many there were, and what
    // share of the whole run they are. Neither carries a unit into the axis it is measured against,
    // however the term itself is measured.
    static countingFunctions = ["count", "probability"];

    static readsTermValues(name) {
        return !FrequencyAggregation.countingFunctions.includes(FrequencyAggregation.normalize(name));
    }

    static isDimensionless(name) {
        return FrequencyAggregation.countingFunctions.includes(FrequencyAggregation.normalize(name));
    }

    static isWholeNumbered(name) {
        return FrequencyAggregation.normalize(name) === "count";
    }

    // The share a category holds of every reading the series made, which is the frequency read as a
    // probability: over a long enough run it is what the model says the chance of that value is.
    static apply(name, values, readingCount = 0) {
        const functionName = FrequencyAggregation.normalize(name);
        if (functionName === "count")
            return values.length;
        if (functionName === "probability")
            return readingCount > 0 ? values.length / readingCount : 0;
        if (values.length === 0)
            return null;
        if (functionName === "sum")
            return FrequencyAggregation.getSum(values);
        if (functionName === "mean")
            return FrequencyAggregation.getSum(values) / values.length;
        if (functionName === "median")
            return FrequencyAggregation.getMedian(values);
        if (functionName === "min")
            return FrequencyAggregation.getMinimum(values);
        if (functionName === "max")
            return FrequencyAggregation.getMaximum(values);
        return FrequencyAggregation.getStandardDeviation(values);
    }

    static getSum(values) {
        let total = 0;
        for (let index = 0; index < values.length; index++)
            total += values[index];
        return total;
    }

    static getMinimum(values) {
        let lowest = values[0];
        for (let index = 1; index < values.length; index++) {
            if (values[index] < lowest)
                lowest = values[index];
        }
        return lowest;
    }

    static getMaximum(values) {
        let highest = values[0];
        for (let index = 1; index < values.length; index++) {
            if (values[index] > highest)
                highest = values[index];
        }
        return highest;
    }

    static getMedian(values) {
        const sorted = [...values].sort((left, right) => left - right);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 1)
            return sorted[middle];
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    // The spread of a sample rather than of a whole population, which is the one a class is taught
    // to read off a set of measurements. A single reading has no spread to speak of.
    static getStandardDeviation(values) {
        if (values.length < 2)
            return 0;
        const mean = FrequencyAggregation.getSum(values) / values.length;
        let squaredTotal = 0;
        for (let index = 0; index < values.length; index++)
            squaredTotal += (values[index] - mean) * (values[index] - mean);
        return Math.sqrt(squaredTotal / (values.length - 1));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = FrequencyAggregation;
