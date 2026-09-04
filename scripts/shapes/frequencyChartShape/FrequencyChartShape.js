// A chart of how often, and of how much, a term's discrete values occur.
//
// One axis carries the values a term can take — the labels of a categorical term, or the distinct
// numbers a term was seen to hold — and the run of iterations is grouped by which of them each
// reading fell into. Every series answers for each group with one number: how many readings there
// were, or what its own term summed, averaged, or spread to across them.
//
// Each series is read against the primary or the secondary value axis, and the two carry scales of
// their own, so a count and an average can be shown side by side without one flattening the other.
// Turning the chart on its side moves the category axis from the bottom to the left and the two
// value axes from left and right to bottom and top.
var FrequencyChartShape;
if (typeof BaseShape !== "undefined") FrequencyChartShape = class FrequencyChartShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Frequency Chart Name") ?? "Frequencies";
        const center = this.board.getClientCenter();
        this.properties.x = center.x - 210;
        this.properties.y = center.y - 130;
        this.properties.width = 420;
        this.properties.height = 260;
        this.properties.orientation = "vertical";
        this.properties.autoScale = true;
        this.properties.axisColor = "";
        this.properties.dataAreaColor = "";
        const categoryTerm = this.getDefaultCategoryTerm();
        this.properties.categoryTerm = categoryTerm;
        this.properties.categoryTermCase = 1;
        this.properties.series = [{ term: categoryTerm, case: 1, aggregate: "count", axis: "primary", mark: "bar", color: "", showLabel: false }];
        this.properties.valueRange = { primaryMin: null, primaryMax: null, secondaryMin: null, secondaryMax: null };
    }

    // A term held to a set of labels is what this chart is for, so one is taken as the category the
    // chart opens on when the model already has one; otherwise it opens on whatever the model would
    // offer any other chart, and says so with an axis carrying the values that term was seen to hold.
    getDefaultCategoryTerm() {
        const calculator = this.board.calculator;
        const termNames = calculator.getTermsNames();
        for (let index = 0; index < termNames.length; index++) {
            if (calculator.isCategoricalTerm(termNames[index]))
                return termNames[index];
        }
        return calculator.getDefaultTerm();
    }

    enterEditMode() {
        if (this.chart)
            this.chart.focus();
        return this.chart != null;
    }

    populateShapeColorMenuSections(sections) {
        for (const [property, item] of Object.entries(BaseShapeToolbarMixin.plotColorMenuItems))
            this.pushColorMenuItem(sections, property, item.label, item.icon);
    }

    clearStaleTermCollectionReferences(staleTermNames) {
        const series = Array.isArray(this.properties.series) ? this.properties.series : [];
        const hasStale = staleTermNames.has(this.properties.categoryTerm) || series.some(item => staleTermNames.has(item.term));
        if (!hasStale)
            return;
        this.resetValues();
        this.update();
    }

    // The chart paints its own frame in its background layer, so the fade goes on the chart's
    // layers instead of the group they sit in.
    getOpacityPaintControl() {
        return this.chart ?? null;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.chartRows = [];
        this.lastSyncedIteration = 0;
        this.lastSyncedCalculatedIteration = 0;
        this.lastSyncedRecalculationRevision = 0;
        this.chartDataConfig = null;
        this.chart = new FrequencyChartControl(element, this.getChartControlOptions());
        this._appliedConfig = {};
        this._appliedDataConfig = null;
        return element;
    }

    getChartControlOptions() {
        return {
            orientation: this.properties.orientation,
            categories: [],
            series: [],
            categoryTitle: null,
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            borderColor: this.getBorderColor(),
            borderRadius: this.getBorderRadius(),
            ...(this.properties.axisColor ? { axisColor: this.properties.axisColor } : {}),
            getPrecision: () => this.board.calculator.getPrecision()
        };
    }

    createExportElementClone(element) {
        const clone = super.createExportElementClone(element);
        clone.querySelectorAll(".shape-term-label").forEach(labelElement => labelElement.remove());
        return clone;
    }

    normalizeCategoryTerm() {
        return TermControl.normalizeTermValue(this.properties.categoryTerm);
    }

    getCategoryTermCaseNumber() {
        return TermControl.getShapeCaseNumber(this, this.normalizeCategoryTerm(), this.properties.categoryTermCase ?? 1, value => TermControl.normalizeTermValue(value));
    }

    // The values the category axis carries. A term held to a set answers with its whole set, in the
    // order it was declared, so a label that never came up still has a place of its own rather than
    // being missing from the picture. Any other term answers with the values it was seen to hold,
    // read to the precision the model works to so that the same reading is not counted twice, and
    // written as whole numbers when that is what they are: a player number is 7, not 7.00.
    getCategoryDefinition() {
        const categoryTerm = this.normalizeCategoryTerm();
        if (categoryTerm === "")
            return { labels: [], values: [], isCategorical: false };
        const domainValues = this.board.calculator.getTermDomainValues(categoryTerm);
        if (domainValues)
            return { labels: domainValues.map(entry => entry.label), values: domainValues.map(entry => entry.value), isCategorical: true };
        const precision = this.board.calculator.getTermPrecision(categoryTerm);
        const seenValues = [];
        for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
            const value = this.roundToPrecision(this.chartRows[rowIndex].category, precision);
            if (value != null && !seenValues.includes(value))
                seenValues.push(value);
        }
        seenValues.sort((left, right) => left - right);
        const areWholeNumbers = seenValues.every(value => Number.isInteger(value));
        return { labels: seenValues.map(value => areWholeNumbers ? String(value) : Utils.formatNumber(value, precision)), values: seenValues, isCategorical: false };
    }

    roundToPrecision(value, precision) {
        if (!Number.isFinite(value))
            return null;
        return Number(value.toFixed(precision));
    }

    getCategoryIndexByValue(categories) {
        const indexByValue = new Map();
        for (let index = 0; index < categories.values.length; index++)
            indexByValue.set(categories.values[index], index);
        return indexByValue;
    }

    getCategoryIndex(rawValue, chartDataConfig) {
        if (chartDataConfig.categories.isCategorical) {
            const index = chartDataConfig.categoryIndexByValue.get(rawValue);
            return index === undefined ? -1 : index;
        }
        const roundedValue = this.roundToPrecision(rawValue, chartDataConfig.categoryPrecision);
        const index = chartDataConfig.categoryIndexByValue.get(roundedValue);
        return index === undefined ? -1 : index;
    }

    // The rows the chart is drawn from: one per category, each carrying what every series makes of
    // the readings that fell into it.
    buildAggregatedRows(chartDataConfig) {
        const categories = chartDataConfig.categories;
        const valuesByCategoryBySeries = chartDataConfig.series.map(() => categories.labels.map(() => []));
        for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
            const row = this.chartRows[rowIndex];
            const categoryIndex = this.getCategoryIndex(row.category, chartDataConfig);
            if (categoryIndex < 0)
                continue;
            for (let seriesIndex = 0; seriesIndex < chartDataConfig.series.length; seriesIndex++) {
                const value = row[chartDataConfig.series[seriesIndex].valueField];
                if (Number.isFinite(value))
                    valuesByCategoryBySeries[seriesIndex][categoryIndex].push(value);
            }
        }
        const readingCounts = valuesByCategoryBySeries.map(valuesByCategory => valuesByCategory.reduce((total, values) => total + values.length, 0));
        return categories.labels.map((label, categoryIndex) => {
            const aggregatedRow = { category: categoryIndex };
            for (let seriesIndex = 0; seriesIndex < chartDataConfig.series.length; seriesIndex++) {
                const series = chartDataConfig.series[seriesIndex];
                aggregatedRow[series.valueField] = FrequencyAggregation.apply(series.aggregate, valuesByCategoryBySeries[seriesIndex][categoryIndex], readingCounts[seriesIndex]);
            }
            return aggregatedRow;
        });
    }

    createChartDataItem(iteration, chartDataConfig) {
        const item = { iteration: iteration };
        item.category = this.getTermValueOnIteration(iteration, chartDataConfig.categoryTerm, chartDataConfig.categoryCase);
        for (let index = 0; index < chartDataConfig.series.length; index++) {
            const series = chartDataConfig.series[index];
            item[series.valueField] = this.getTermValueOnIteration(iteration, series.term, series.case);
        }
        return item;
    }

    getTermValueOnIteration(iteration, term, caseNumber) {
        if (term === "")
            return NaN;
        const calculator = this.board.calculator;
        if (calculator.isTerm(term))
            return calculator.system.getByNameOnIteration(iteration, term, this.getClampedCaseNumber(caseNumber));
        const numericValue = Number(term);
        return Number.isFinite(numericValue) ? numericValue : NaN;
    }

    updateValues() {
        const chartDataConfig = this.chartDataConfig;
        if (!chartDataConfig)
            return;
        const system = this.board.calculator.system;
        const lastIteration = system.lastIteration;
        const lastCalculatedIteration = system.lastCalculatedIteration;
        if (this.lastSyncedIteration > lastIteration)
            this.resetValues();
        let hasChanges = false;
        if (lastCalculatedIteration > this.lastSyncedCalculatedIteration) {
            const recalculationStart = this.lastSyncedCalculatedIteration + 1;
            const recalculationEnd = Math.min(lastCalculatedIteration, this.lastSyncedIteration);
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                const row = this.chartRows[rowIndex];
                if (row.iteration >= recalculationStart && row.iteration <= recalculationEnd) {
                    this.chartRows[rowIndex] = this.createChartDataItem(row.iteration, chartDataConfig);
                    hasChanges = true;
                }
            }
            this.lastSyncedCalculatedIteration = lastCalculatedIteration;
        }
        for (let iteration = this.lastSyncedIteration + 1; iteration <= lastIteration; iteration++)
            this.chartRows.push(this.createChartDataItem(iteration, chartDataConfig));
        if (lastIteration > this.lastSyncedIteration)
            hasChanges = true;
        this.lastSyncedIteration = lastIteration;
        const calculator = this.board.calculator;
        const recalculationRevision = calculator.recalculationRevision ?? 0;
        if (recalculationRevision !== this.lastSyncedRecalculationRevision) {
            const recalculatedIteration = calculator.recalculatedIteration ?? system.iteration;
            for (let rowIndex = 0; rowIndex < this.chartRows.length; rowIndex++) {
                if (this.chartRows[rowIndex].iteration === recalculatedIteration) {
                    this.chartRows[rowIndex] = this.createChartDataItem(recalculatedIteration, chartDataConfig);
                    hasChanges = true;
                    break;
                }
            }
            this.lastSyncedRecalculationRevision = recalculationRevision;
        }
        if (!hasChanges)
            return;
        this.applyChartData(chartDataConfig);
    }

    // A category axis read off the values a term was seen to hold grows as the run does, so the axis
    // is settled again from the rows before the counts on it are.
    applyChartData(chartDataConfig) {
        if (!chartDataConfig.categories.isCategorical) {
            const categories = this.getCategoryDefinition();
            const labelsChanged = categories.labels.length !== chartDataConfig.categories.labels.length;
            chartDataConfig.categories = categories;
            chartDataConfig.categoryIndexByValue = this.getCategoryIndexByValue(categories);
            if (labelsChanged)
                this.chart.setOptions({ categories: categories.labels });
        }
        this.chart.setData(this.buildAggregatedRows(chartDataConfig));
    }

    resetValues() {
        this.lastSyncedIteration = 0;
        this.lastSyncedCalculatedIteration = 0;
        this.lastSyncedRecalculationRevision = 0;
        this.chartRows = [];
        if (this.chart)
            this.chart.setData([]);
    }

    getSeriesValueFieldName(index) {
        return `series${index}`;
    }

    update() {
        this.normalizeSeries();
        this.refreshSeriesControl();
        const categoryTerm = this.normalizeCategoryTerm();
        const categoryCase = this.getCategoryTermCaseNumber();
        const selectedSeries = this.getSelectedSeries().map((item, index) => ({
            term: item.term,
            case: TermControl.getShapeCaseNumber(this, item.term, item.case ?? 1, value => TermControl.normalizeTermValue(value)),
            aggregate: FrequencyAggregation.normalize(item.aggregate),
            axis: item.axis === "secondary" ? "secondary" : "primary",
            mark: FrequencyChartControl.markShapes.includes(item.mark) ? item.mark : "bar",
            color: TermControl.normalizeColorValue(item.color),
            showLabel: item.showLabel === true,
            valueField: this.getSeriesValueFieldName(index)
        }));
        const categories = this.getCategoryDefinition();
        const chartDataConfig = {
            categoryTerm: categoryTerm,
            categoryCase: categoryCase,
            categoryPrecision: this.board.calculator.getTermPrecision(categoryTerm),
            categories: categories,
            categoryIndexByValue: this.getCategoryIndexByValue(categories),
            series: selectedSeries
        };
        this.chartDataConfig = chartDataConfig;
        const config = {
            orientation: this.properties.orientation === "horizontal" ? "horizontal" : "vertical",
            categories: categories.labels,
            categoryTitle: this.getTermLabelWithCase(categoryTerm, categoryCase),
            series: selectedSeries.map(series => ({
                valueField: series.valueField,
                name: this.getSeriesName(series),
                color: series.color === "" ? undefined : series.color,
                mark: series.mark,
                axis: series.axis,
                showLabel: series.showLabel,
                wholeNumbered: FrequencyAggregation.isWholeNumbered(series.aggregate)
            })),
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            dataAreaColor: this.properties.dataAreaColor,
            axisColor: this.properties.axisColor || undefined,
            borderColor: this.getBorderColor(),
            valueRanges: this.getValueRanges()
        };
        const dataConfig = {
            categoryTerm: categoryTerm,
            categoryCase: categoryCase,
            series: selectedSeries.map(series => ({ term: series.term, case: series.case, aggregate: series.aggregate, valueField: series.valueField }))
        };
        const dataChanged = JSON.stringify(dataConfig) !== JSON.stringify(this._appliedDataConfig);
        if (JSON.stringify(config) !== JSON.stringify(this._appliedConfig)) {
            this.chart.setOptions(config);
            this._appliedConfig = config;
        }
        if (dataChanged) {
            this.resetValues();
            this._appliedDataConfig = dataConfig;
        }
        this.updateValues();
    }

    // While the chart is scaling itself it is given no range at all; once it is not, each end that
    // has been set replaces the one it worked out, and an end left empty is still its own to find.
    getValueRanges() {
        if (this.properties.autoScale === true)
            return { primary: null, secondary: null };
        const valueRange = this.properties.valueRange ?? {};
        return {
            primary: { min: valueRange.primaryMin, max: valueRange.primaryMax },
            secondary: { min: valueRange.secondaryMin, max: valueRange.secondaryMax }
        };
    }

    draw() {
        this.chart.setSize(this.properties.width, this.properties.height);
        this.applyShapeTransform(this.properties.width / 2, this.properties.height / 2, `translate(${this.properties.x} ${this.properties.y})`);
        super.draw();
    }

    tick() {
        this.updateValues();
        super.tick();
        this.board.markDirty(this);
    }
};
