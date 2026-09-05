// The drawing of a frequency chart: one axis carries the values a term can take, and every series
// answers for each of them with a single number.
//
// What separates it from the chart control is that the series are not all measured against the same
// axis. A series is assigned to the primary or to the secondary value axis, and each of those two
// carries a scale of its own — a count on the left, an average on the right — so the two can be read
// side by side without one flattening the other. Turning the chart on its side swaps which edge each
// axis runs along and nothing else: the same layout, ticks and marks are read through one pair of
// helpers that answer in the orientation being drawn.
class FrequencyChartControl {
    static markShapes = ["bar", "circle", "square", "triangle", "diamond"];
    static axisKeys = ["primary", "secondary"];

    constructor(hostElement, options) {
        this.hostElement = hostElement;
        this.options = this.createDefaultOptions();
        this.dataRows = [];
        this.renderState = null;
        this.width = 0;
        this.height = 0;
        this.initializeRoot();
        Utils.ensureCaseIconsLoaded(() => this.render());
        this.setOptions(options);
    }

    createDefaultOptions() {
        return {
            orientation: "vertical",
            categories: [],
            series: [],
            categoryTitle: null,
            backgroundColor: "#ffffff",
            dataAreaColor: "",
            borderColor: "#666666",
            borderRadius: 4,
            foregroundColor: "#666666",
            gridColor: "#d3d3d3",
            axisColor: "#7a7a7a",
            fontFamily: "KaTeX_Main",
            termFontFamily: "KaTeX_Math",
            tickFontSize: 10,
            titleFontSize: 14,
            precision: 2,
            valueRanges: { primary: null, secondary: null }
        };
    }

    initializeRoot() {
        this.rootElement = this.createSvgElement("g");
        this.rootElement.setAttribute("tabindex", "0");
        this.plotClipId = `frequency-clip-${crypto.randomUUID()}`;
        this.plotClipRect = this.appendClipPath(this.plotClipId);
        this.shapeClipId = `frequency-shape-clip-${crypto.randomUUID()}`;
        this.shapeClipRect = this.appendClipPath(this.shapeClipId);
        this.categoryClipId = `frequency-category-clip-${crypto.randomUUID()}`;
        this.categoryClipRect = this.appendClipPath(this.categoryClipId);
        this.valueClipId = `frequency-value-clip-${crypto.randomUUID()}`;
        this.valueClipRect = this.appendClipPath(this.valueClipId);
        this.backgroundLayer = this.createSvgElement("g");
        this.gridLayer = this.createSvgElement("g");
        this.gridLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.seriesLayer = this.createSvgElement("g");
        this.seriesLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.labelLayer = this.createSvgElement("g");
        this.labelLayer.setAttribute("class", "frequency-value-labels");
        this.labelLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.axisLayer = this.createSvgElement("g");
        this.axisLayer.setAttribute("clip-path", `url(#${this.shapeClipId})`);
        this.rootElement.appendChild(this.backgroundLayer);
        this.rootElement.appendChild(this.gridLayer);
        this.rootElement.appendChild(this.seriesLayer);
        this.rootElement.appendChild(this.axisLayer);
        this.rootElement.appendChild(this.labelLayer);
        if (this.hostElement)
            this.hostElement.appendChild(this.rootElement);
    }

    appendClipPath(clipId) {
        const clipPath = this.createSvgElement("clipPath");
        clipPath.setAttribute("id", clipId);
        const clipRect = this.createSvgElement("rect");
        clipPath.appendChild(clipRect);
        this.rootElement.appendChild(clipPath);
        return clipRect;
    }

    dispose() {
        if (!this.rootElement || !this.hostElement)
            return;
        if (this.rootElement.parentNode === this.hostElement)
            this.hostElement.removeChild(this.rootElement);
    }

    createSvgElement(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    appendSvgMarkup(layerElement, markup) {
        if (!layerElement || !markup)
            return;
        layerElement.insertAdjacentHTML("beforeend", markup);
    }

    escapeMarkupText(textValue) {
        return String(textValue ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    clearLayer(layerElement) {
        if (!layerElement)
            return;
        while (layerElement.firstChild)
            layerElement.removeChild(layerElement.firstChild);
    }

    element() {
        return this.rootElement;
    }

    focus() {
        if (!this.rootElement || typeof this.rootElement.focus !== "function")
            return;
        this.rootElement.focus();
    }

    setSize(width, height) {
        const normalizedWidth = Math.max(0, Number(width) || 0);
        const normalizedHeight = Math.max(0, Number(height) || 0);
        if (this.width === normalizedWidth && this.height === normalizedHeight)
            return;
        this.width = normalizedWidth;
        this.height = normalizedHeight;
        this.render();
    }

    setOptions(options) {
        const normalizedOptions = options ?? {};
        const definedOptions = Object.fromEntries(Object.entries(normalizedOptions).filter(([, value]) => value !== undefined));
        this.options = {
            ...this.options,
            ...definedOptions,
            series: this.normalizeSeries(normalizedOptions.series ?? this.options.series)
        };
        this.render();
    }

    setData(dataRows) {
        this.dataRows = Array.isArray(dataRows) ? dataRows.map(row => ({ ...row })) : [];
        this.render();
    }

    normalizeSeries(series) {
        if (!Array.isArray(series))
            return [];
        return series.map((item, index) => ({
            valueField: item?.valueField ?? `series${index}`,
            name: item?.name ?? { termLatex: "", caseNumber: null, isMissingTerm: false },
            color: this.normalizeColor(item?.color, index),
            mark: this.normalizeMark(item?.mark),
            axis: this.normalizeAxis(item?.axis),
            showLabel: item?.showLabel === true,
            wholeNumbered: item?.wholeNumbered === true
        }));
    }

    normalizeColor(colorValue, index) {
        if (colorValue != null && String(colorValue).trim() !== "")
            return String(colorValue).trim();
        return Utils.getColorByIndex(index);
    }

    normalizeMark(mark) {
        return FrequencyChartControl.markShapes.includes(mark) ? mark : "bar";
    }

    normalizeAxis(axis) {
        return FrequencyChartControl.axisKeys.includes(axis) ? axis : "primary";
    }

    isHorizontal() {
        return this.options.orientation === "horizontal";
    }

    getSeriesOnAxis(axisKey) {
        return this.options.series.filter(series => series.axis === axisKey);
    }

    getUsedAxisKeys() {
        const usedKeys = FrequencyChartControl.axisKeys.filter(axisKey => this.getSeriesOnAxis(axisKey).length > 0);
        return usedKeys.length > 0 ? usedKeys : ["primary"];
    }

    getChartSize() {
        return { width: this.width, height: this.height };
    }

    estimateTextWidth(textValue, fontSize) {
        return String(textValue ?? "").length * fontSize * 0.58;
    }

    // A series is named by an expression — count(z), mean(v) — rather than by a bare term, and the
    // estimate a term name is measured by counts the latex that writes it, so it reads a name like
    // this as three times the width it takes. Measured from what the name says instead.
    estimateSeriesNameWidth(name, fontSize) {
        const width = this.estimateTextWidth(FrequencyChartControl.getPlainNameText(name?.termLatex), fontSize);
        if (name?.caseNumber == null)
            return width;
        return width + Utils.caseIconGap + Utils.getCaseIconSize(name.caseNumber, fontSize).width;
    }

    static getPlainNameText(termLatex) {
        return String(termLatex ?? "")
            .replaceAll("\\;/\\;", " / ")
            .replace(/\\mathrm\{([^}]*)\}/g, "$1")
            .replaceAll("\\left", "")
            .replaceAll("\\right", "")
            .replace(/[\\{}]/g, "");
    }

    getPrecision() {
        if (typeof this.options.getPrecision === "function")
            return this.options.getPrecision();
        return Number.isFinite(this.options.precision) ? this.options.precision : 2;
    }

    formatValue(value, wholeNumbered) {
        if (!Number.isFinite(value))
            return "";
        return wholeNumbered ? String(Math.round(value)) : Utils.formatModelValue(value, this.getPrecision(), "");
    }

    getNumericValue(row, fieldName) {
        return BlockChartGeometry.getNumericValue(row, fieldName);
    }

    // The range an axis is read against: what its own series reached, opened out to include zero
    // whenever a bar is measured against it, since a bar is drawn from zero and would otherwise be
    // cut off by its own axis. A range that has been set by hand replaces whichever end it names.
    getValueDomain(axisKey) {
        const axisSeries = this.getSeriesOnAxis(axisKey);
        let lowest = Number.POSITIVE_INFINITY;
        let highest = Number.NEGATIVE_INFINITY;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            for (let seriesIndex = 0; seriesIndex < axisSeries.length; seriesIndex++) {
                const value = this.getNumericValue(this.dataRows[rowIndex], axisSeries[seriesIndex].valueField);
                if (value == null)
                    continue;
                if (value < lowest)
                    lowest = value;
                if (value > highest)
                    highest = value;
            }
        }
        if (lowest === Number.POSITIVE_INFINITY) {
            lowest = 0;
            highest = 1;
        }
        if (axisSeries.some(series => series.mark === "bar")) {
            lowest = Math.min(0, lowest);
            highest = Math.max(0, highest);
        }
        if (lowest === highest) {
            lowest -= lowest === 0 ? 0 : Math.abs(lowest) * 0.1;
            highest += highest === 0 ? 1 : Math.abs(highest) * 0.1;
        }
        const padding = (highest - lowest) * 0.08;
        const domain = { min: lowest === 0 ? 0 : lowest - padding, max: highest + padding };
        return this.applyValueRangeOverride(domain, axisKey);
    }

    applyValueRangeOverride(domain, axisKey) {
        const override = this.options.valueRanges?.[axisKey];
        const minimum = Number.isFinite(override?.min) ? override.min : domain.min;
        const maximum = Number.isFinite(override?.max) ? override.max : domain.max;
        if (maximum <= minimum)
            return { min: minimum, max: minimum + 1 };
        return { min: minimum, max: maximum };
    }

    buildValueTicks(domain, axisKey) {
        const ticks = buildNiceTickValues(domain.min, domain.max, 5, { axisType: "decimal", anchor: "outside" }).filter(value => value >= domain.min && value <= domain.max);
        if (this.getSeriesOnAxis(axisKey).every(series => series.wholeNumbered))
            return ticks.filter(value => Number.isInteger(value));
        return ticks;
    }

    getCategoryLabels() {
        return Array.isArray(this.options.categories) ? this.options.categories : [];
    }

    getBandSize(layout) {
        const categoryCount = Math.max(1, this.getCategoryLabels().length);
        return (this.isHorizontal() ? layout.plotHeight : layout.plotWidth) / categoryCount;
    }

    getCategoryPosition(categoryIndex, layout) {
        const bandSize = this.getBandSize(layout);
        const start = this.isHorizontal() ? layout.plotTop : layout.plotLeft;
        return start + bandSize * (categoryIndex + 0.5);
    }

    getValuePosition(value, axisKey, layout, domains) {
        const domain = domains[axisKey];
        const ratio = (value - domain.min) / (domain.max - domain.min);
        if (this.isHorizontal())
            return layout.plotLeft + ratio * layout.plotWidth;
        return layout.plotBottom - ratio * layout.plotHeight;
    }

    getPlotPoint(categoryPosition, valuePosition) {
        if (this.isHorizontal())
            return { x: valuePosition, y: categoryPosition };
        return { x: categoryPosition, y: valuePosition };
    }

    // The room each edge needs before the plot can be measured: the value ticks and their legend on
    // the two value edges, the labels of the categories and the name of their term on the third.
    // The category labels are laid out last because whether they have to be turned to fit depends on
    // how wide a band is, which is only known once the value edges have taken their room.
    getLayout(width, height, ticksByAxis) {
        const tickFontSize = this.options.tickFontSize;
        const titleFontSize = this.options.titleFontSize;
        const usedAxisKeys = this.getUsedAxisKeys();
        const tickWidths = {};
        for (const axisKey of FrequencyChartControl.axisKeys) {
            let widest = 0;
            for (const tickValue of ticksByAxis[axisKey] ?? []) {
                const labelWidth = this.estimateTextWidth(formatAxisTickValue(tickValue), tickFontSize);
                if (labelWidth > widest)
                    widest = labelWidth;
            }
            tickWidths[axisKey] = widest;
        }
        const horizontal = this.isHorizontal();
        const primaryThickness = this.getValueEdgeThickness("primary", usedAxisKeys, tickWidths);
        const secondaryThickness = this.getValueEdgeThickness("secondary", usedAxisKeys, tickWidths);
        const categoryLabels = this.getCategoryLabels();
        const widestCategoryLabel = this.getWidestCategoryLabelWidth();
        if (horizontal) {
            const categoryThickness = Math.ceil(widestCategoryLabel) + titleFontSize + 16;
            const plotLeft = categoryThickness;
            const plotRight = Math.max(plotLeft + 12, width - 14);
            const plotTop = secondaryThickness;
            const plotBottom = Math.max(plotTop + 12, height - primaryThickness);
            return this.buildLayoutBox(plotLeft, plotRight, plotTop, plotBottom, { rotateCategoryLabels: false, categoryThickness: categoryThickness, primaryThickness: primaryThickness, secondaryThickness: secondaryThickness, tickWidths: tickWidths });
        }
        const plotLeft = primaryThickness;
        const plotRight = Math.max(plotLeft + 12, width - secondaryThickness);
        const bandSize = (plotRight - plotLeft) / Math.max(1, categoryLabels.length);
        const rotateCategoryLabels = widestCategoryLabel > bandSize - 4;
        const categoryLabelBlock = rotateCategoryLabels ? Math.min(64, Math.ceil(widestCategoryLabel * 0.57) + tickFontSize) : tickFontSize + 6;
        const categoryThickness = categoryLabelBlock + titleFontSize + 12;
        const plotTop = 14;
        const plotBottom = Math.max(plotTop + 12, height - categoryThickness);
        return this.buildLayoutBox(plotLeft, plotRight, plotTop, plotBottom, { rotateCategoryLabels: rotateCategoryLabels, categoryThickness: categoryThickness, categoryLabelBlock: categoryLabelBlock, primaryThickness: primaryThickness, secondaryThickness: secondaryThickness, tickWidths: tickWidths });
    }

    getValueEdgeThickness(axisKey, usedAxisKeys, tickWidths) {
        if (!usedAxisKeys.includes(axisKey))
            return 12;
        if (this.isHorizontal())
            return this.options.tickFontSize + this.options.titleFontSize + 18;
        return Math.max(58, Math.ceil(tickWidths[axisKey]) + this.options.titleFontSize + 12);
    }

    buildLayoutBox(plotLeft, plotRight, plotTop, plotBottom, extras) {
        return Object.assign({
            plotLeft: plotLeft,
            plotRight: plotRight,
            plotTop: plotTop,
            plotBottom: plotBottom,
            plotWidth: plotRight - plotLeft,
            plotHeight: plotBottom - plotTop
        }, extras);
    }

    render() {
        const size = this.getChartSize();
        this.clearRenderLayers();
        this.renderState = null;
        if (size.width <= 2 || size.height <= 2)
            return;
        const plan = this.buildRenderPlan(size.width, size.height);
        this.applyClipRects(plan);
        this.paintChart(plan);
        this.renderState = plan;
    }

    clearRenderLayers() {
        this.clearLayer(this.backgroundLayer);
        this.clearLayer(this.gridLayer);
        this.clearLayer(this.seriesLayer);
        this.clearLayer(this.axisLayer);
        this.clearLayer(this.labelLayer);
    }

    buildRenderPlan(width, height) {
        const domains = {};
        const ticksByAxis = {};
        for (const axisKey of FrequencyChartControl.axisKeys) {
            domains[axisKey] = this.getValueDomain(axisKey);
            ticksByAxis[axisKey] = this.buildValueTicks(domains[axisKey], axisKey);
        }
        const layout = this.getLayout(width, height, ticksByAxis);
        return {
            width: width,
            height: height,
            layout: layout,
            domains: domains,
            ticksByAxis: ticksByAxis,
            categories: this.getCategoryLabels(),
            bandSize: this.getBandSize(layout),
            series: this.options.series,
            orientation: this.options.orientation
        };
    }

    applyClipRects(plan) {
        const layout = plan.layout;
        this.setClipRect(this.plotClipRect, layout.plotLeft, layout.plotTop, layout.plotWidth, layout.plotHeight);
        this.setClipRect(this.shapeClipRect, 0, 0, plan.width, plan.height);
        this.shapeClipRect.setAttribute("rx", `${this.options.borderRadius ?? 4}`);
        const margin = this.getTickLabelClipMargin();
        if (this.isHorizontal()) {
            this.setClipRect(this.categoryClipRect, 0, layout.plotTop - margin.category, plan.width, layout.plotHeight + margin.category * 2);
            this.setClipRect(this.valueClipRect, layout.plotLeft - margin.value, 0, layout.plotWidth + margin.value * 2, plan.height);
            return;
        }
        this.setClipRect(this.categoryClipRect, layout.plotLeft - margin.category, 0, layout.plotWidth + margin.category * 2, plan.height);
        this.setClipRect(this.valueClipRect, 0, layout.plotTop - margin.value, plan.width, layout.plotHeight + margin.value * 2);
    }

    // A tick at either end of an axis is labelled on the end itself, so the label straddles the edge
    // of the plot. The clip is opened by as much as that label reaches past it — half its height
    // where it is stacked, half its width where it is laid out — and no further.
    getTickLabelClipMargin() {
        const alongCategory = this.isHorizontal() ? this.options.tickFontSize : this.getWidestCategoryLabelWidth() / 2;
        const alongValue = this.isHorizontal() ? this.estimateTextWidth("00000", this.options.tickFontSize) / 2 : this.options.tickFontSize;
        return { category: Math.ceil(alongCategory), value: Math.ceil(alongValue) };
    }

    setClipRect(clipRect, x, y, width, height) {
        clipRect.setAttribute("x", `${x}`);
        clipRect.setAttribute("y", `${y}`);
        clipRect.setAttribute("width", `${Math.max(0, width)}`);
        clipRect.setAttribute("height", `${Math.max(0, height)}`);
    }

    paintChart(plan) {
        this.renderBackground(plan);
        this.renderGrid(plan);
        this.renderAxisFrame(plan);
        this.renderCategoryAxis(plan);
        for (const axisKey of this.getUsedAxisKeys())
            this.renderValueAxis(plan, axisKey);
        this.renderSeries(plan);
        this.renderTitles(plan);
    }

    renderBackground(plan) {
        const borderRadius = this.options.borderRadius ?? 4;
        this.appendSvgMarkup(this.backgroundLayer, `
            <rect x="0" y="0" width="${plan.width}" height="${plan.height}" rx="${borderRadius}" fill="${this.options.backgroundColor}" stroke="${this.options.borderColor}" stroke-width="1" />
        `);
        if (!this.options.dataAreaColor)
            return;
        const layout = plan.layout;
        this.appendSvgMarkup(this.backgroundLayer, `
            <rect x="${layout.plotLeft}" y="${layout.plotTop}" width="${layout.plotWidth}" height="${layout.plotHeight}" fill="${this.options.dataAreaColor}" />
        `);
    }

    // The grid is drawn for the primary axis alone. A second set of lines for the secondary scale
    // would cross it at values that mean nothing on it, and the reader would have no way of telling
    // which line belongs to which axis.
    renderGrid(plan) {
        const layout = plan.layout;
        let gridMarkup = "";
        for (const tickValue of plan.ticksByAxis.primary) {
            const position = this.getValuePosition(tickValue, "primary", layout, plan.domains);
            if (this.isHorizontal())
                gridMarkup += `<line x1="${position}" y1="${layout.plotTop}" x2="${position}" y2="${layout.plotBottom}" stroke="${this.options.gridColor}" stroke-opacity="0.75" stroke-width="1" />`;
            else
                gridMarkup += `<line x1="${layout.plotLeft}" y1="${position}" x2="${layout.plotRight}" y2="${position}" stroke="${this.options.gridColor}" stroke-opacity="0.75" stroke-width="1" />`;
        }
        for (let categoryIndex = 1; categoryIndex < plan.categories.length; categoryIndex++) {
            const position = this.getCategoryPosition(categoryIndex, layout) - plan.bandSize / 2;
            if (this.isHorizontal())
                gridMarkup += `<line x1="${layout.plotLeft}" y1="${position}" x2="${layout.plotRight}" y2="${position}" stroke="${this.options.gridColor}" stroke-opacity="0.4" stroke-width="1" />`;
            else
                gridMarkup += `<line x1="${position}" y1="${layout.plotTop}" x2="${position}" y2="${layout.plotBottom}" stroke="${this.options.gridColor}" stroke-opacity="0.4" stroke-width="1" />`;
        }
        this.appendSvgMarkup(this.gridLayer, gridMarkup);
    }

    renderAxisFrame(plan) {
        const layout = plan.layout;
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${layout.plotLeft}" y1="${layout.plotTop}" x2="${layout.plotLeft}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotLeft}" y1="${layout.plotBottom}" x2="${layout.plotRight}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotLeft}" y1="${layout.plotTop}" x2="${layout.plotRight}" y2="${layout.plotTop}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotRight}" y1="${layout.plotTop}" x2="${layout.plotRight}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
        `);
    }

    // Every value gets a tick of its own, but only as many labels as there is room for: a run over a
    // term with a hundred values would otherwise write a hundred labels over one another, and the
    // axis would say less than an axis labelled every tenth value.
    getCategoryLabelStep(plan) {
        const neededSpace = this.isHorizontal() || plan.layout.rotateCategoryLabels ? this.options.tickFontSize + 2 : this.getWidestCategoryLabelWidth() + 4;
        if (plan.bandSize <= 0 || neededSpace <= plan.bandSize)
            return 1;
        return Math.ceil(neededSpace / plan.bandSize);
    }

    getWidestCategoryLabelWidth() {
        let widest = 0;
        for (const label of this.getCategoryLabels()) {
            const labelWidth = this.estimateTextWidth(label, this.options.tickFontSize);
            if (labelWidth > widest)
                widest = labelWidth;
        }
        return widest;
    }

    renderCategoryAxis(plan) {
        const layout = plan.layout;
        const tickFontSize = this.options.tickFontSize;
        const labelStep = this.getCategoryLabelStep(plan);
        let markup = "";
        for (let categoryIndex = 0; categoryIndex < plan.categories.length; categoryIndex++) {
            const position = this.getCategoryPosition(categoryIndex, layout);
            const labelText = categoryIndex % labelStep === 0 ? this.escapeMarkupText(plan.categories[categoryIndex]) : "";
            if (this.isHorizontal()) {
                markup += `<line x1="${layout.plotLeft - 4}" y1="${position}" x2="${layout.plotLeft}" y2="${position}" stroke="${this.options.axisColor}" stroke-width="1" />`;
                if (labelText !== "")
                    markup += `<text class="shape-tick-label frequency-category-label" x="${layout.plotLeft - 7}" y="${position + 3}" text-anchor="end" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="${tickFontSize}">${labelText}</text>`;
                continue;
            }
            markup += `<line x1="${position}" y1="${layout.plotBottom}" x2="${position}" y2="${layout.plotBottom + 4}" stroke="${this.options.axisColor}" stroke-width="1" />`;
            if (labelText === "")
                continue;
            if (layout.rotateCategoryLabels)
                markup += `<text class="shape-tick-label frequency-category-label" x="${position}" y="${layout.plotBottom + 14}" text-anchor="end" transform="rotate(-35 ${position} ${layout.plotBottom + 14})" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="${tickFontSize}">${labelText}</text>`;
            else
                markup += `<text class="shape-tick-label frequency-category-label" x="${position}" y="${layout.plotBottom + 14}" text-anchor="middle" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="${tickFontSize}">${labelText}</text>`;
        }
        this.appendSvgMarkup(this.axisLayer, `<g clip-path="url(#${this.categoryClipId})">${markup}</g>`);
    }

    renderValueAxis(plan, axisKey) {
        const layout = plan.layout;
        const tickFontSize = this.options.tickFontSize;
        const horizontal = this.isHorizontal();
        const atStart = axisKey === "primary";
        let markup = "";
        for (const tickValue of plan.ticksByAxis[axisKey]) {
            const position = this.getValuePosition(tickValue, axisKey, layout, plan.domains);
            const labelText = this.escapeMarkupText(formatAxisTickValue(tickValue));
            if (horizontal) {
                const axisY = atStart ? layout.plotBottom : layout.plotTop;
                const tickEndY = atStart ? axisY + 4 : axisY - 4;
                const labelY = atStart ? axisY + 14 : axisY - 7;
                markup += `
                    <line x1="${position}" y1="${axisY}" x2="${position}" y2="${tickEndY}" stroke="${this.options.axisColor}" stroke-width="1" />
                    <text class="shape-tick-label" x="${position}" y="${labelY}" text-anchor="middle" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="${tickFontSize}">${labelText}</text>
                `;
                continue;
            }
            const axisX = atStart ? layout.plotLeft : layout.plotRight;
            const tickEndX = atStart ? axisX - 4 : axisX + 4;
            const labelX = atStart ? axisX - 7 : axisX + 7;
            markup += `
                <line x1="${axisX}" y1="${position}" x2="${tickEndX}" y2="${position}" stroke="${this.options.axisColor}" stroke-width="1" />
                <text class="shape-tick-label" x="${labelX}" y="${position + 3}" text-anchor="${atStart ? "end" : "start"}" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="${tickFontSize}">${labelText}</text>
            `;
        }
        this.appendSvgMarkup(this.axisLayer, `<g clip-path="url(#${this.valueClipId})">${markup}</g>`);
    }

    getBarSeries() {
        return this.options.series.filter(series => series.mark === "bar");
    }

    getBarWidth(plan) {
        const barSeriesCount = Math.max(1, this.getBarSeries().length);
        return Math.max(2, Math.min(48, plan.bandSize * 0.8 / barSeriesCount));
    }

    getMarkSize(plan) {
        return Math.max(4, Math.min(13, plan.bandSize * 0.32));
    }

    renderSeries(plan) {
        const barSeries = this.getBarSeries();
        const barWidth = this.getBarWidth(plan);
        const markSize = this.getMarkSize(plan);
        for (const series of this.options.series) {
            if (series.mark === "bar")
                this.renderBarSeries(plan, series, barSeries.indexOf(series), barSeries.length, barWidth);
            else
                this.renderMarkSeries(plan, series, markSize);
        }
    }

    // Bars stand side by side inside the band of their category, one slot per bar series, so no bar
    // hides another. A symbol is drawn on the middle of the band instead: it reads as a value taken
    // over the whole category rather than as one column among several.
    renderBarSeries(plan, series, barIndex, barSeriesCount, barWidth) {
        const layout = plan.layout;
        const baselineValue = Math.min(Math.max(0, plan.domains[series.axis].min), plan.domains[series.axis].max);
        const baselinePosition = this.getValuePosition(baselineValue, series.axis, layout, plan.domains);
        const slotOffset = (barIndex - (barSeriesCount - 1) / 2) * barWidth;
        let markup = "";
        for (let categoryIndex = 0; categoryIndex < plan.categories.length; categoryIndex++) {
            const value = this.getNumericValue(this.dataRows[categoryIndex], series.valueField);
            if (value == null)
                continue;
            const categoryPosition = this.getCategoryPosition(categoryIndex, layout) + slotOffset;
            const valuePosition = this.getValuePosition(value, series.axis, layout, plan.domains);
            const barThickness = barWidth * 0.86;
            if (this.isHorizontal())
                markup += `<rect x="${Math.min(valuePosition, baselinePosition)}" y="${categoryPosition - barThickness / 2}" width="${Math.max(1, Math.abs(valuePosition - baselinePosition))}" height="${barThickness}" fill="${series.color}" fill-opacity="0.85" />`;
            else
                markup += `<rect x="${categoryPosition - barThickness / 2}" y="${Math.min(valuePosition, baselinePosition)}" width="${barThickness}" height="${Math.max(1, Math.abs(valuePosition - baselinePosition))}" fill="${series.color}" fill-opacity="0.85" />`;
            if (series.showLabel)
                this.renderValueLabel(plan, series, value, categoryPosition, valuePosition, baselinePosition, 5);
        }
        this.appendSvgMarkup(this.seriesLayer, markup);
    }

    renderMarkSeries(plan, series, markSize) {
        const layout = plan.layout;
        let markup = "";
        for (let categoryIndex = 0; categoryIndex < plan.categories.length; categoryIndex++) {
            const value = this.getNumericValue(this.dataRows[categoryIndex], series.valueField);
            if (value == null)
                continue;
            const categoryPosition = this.getCategoryPosition(categoryIndex, layout);
            const valuePosition = this.getValuePosition(value, series.axis, layout, plan.domains);
            const point = this.getPlotPoint(categoryPosition, valuePosition);
            markup += this.getMarkMarkup(series.mark, point.x, point.y, markSize, series.color);
            if (series.showLabel)
                this.renderValueLabel(plan, series, value, categoryPosition, valuePosition, valuePosition, markSize / 2 + 4);
        }
        this.appendSvgMarkup(this.seriesLayer, markup);
    }

    getMarkMarkup(mark, centerX, centerY, size, color) {
        const radius = size / 2;
        if (mark === "square")
            return `<rect x="${centerX - radius}" y="${centerY - radius}" width="${size}" height="${size}" fill="${color}" />`;
        if (mark === "triangle")
            return `<polygon points="${centerX} ${centerY - radius},${centerX + radius} ${centerY + radius},${centerX - radius} ${centerY + radius}" fill="${color}" />`;
        if (mark === "diamond")
            return `<polygon points="${centerX} ${centerY - radius},${centerX + radius} ${centerY},${centerX} ${centerY + radius},${centerX - radius} ${centerY}" fill="${color}" />`;
        return `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${color}" />`;
    }

    // The number a series answered with, written beside its mark and turned back inside the plot when
    // the mark it belongs to stands at an edge, so a value at the top of the scale is still readable.
    renderValueLabel(plan, series, value, categoryPosition, valuePosition, baselinePosition, clearance) {
        const labelText = this.escapeMarkupText(this.formatValue(value, series.wholeNumbered));
        if (labelText === "")
            return;
        const layout = plan.layout;
        const fontSize = 10;
        if (this.isHorizontal()) {
            const labelWidth = this.estimateTextWidth(labelText, fontSize);
            const growsRight = valuePosition >= baselinePosition;
            const fitsOutside = growsRight ? valuePosition + clearance + labelWidth <= layout.plotRight : valuePosition - clearance - labelWidth >= layout.plotLeft;
            const placeAfter = growsRight === fitsOutside;
            const labelX = valuePosition + (placeAfter ? clearance : -clearance);
            this.appendSvgMarkup(this.labelLayer, `<text class="frequency-value-label" x="${labelX}" y="${categoryPosition + 3}" text-anchor="${placeAfter ? "start" : "end"}" fill="${series.color}" font-family="${this.options.fontFamily}" font-size="${fontSize}">${labelText}</text>`);
            return;
        }
        const growsUp = valuePosition <= baselinePosition;
        const placeAbove = growsUp ? valuePosition - clearance >= layout.plotTop + fontSize : valuePosition + clearance + fontSize > layout.plotBottom;
        const labelY = placeAbove ? valuePosition - clearance : valuePosition + clearance + fontSize;
        this.appendSvgMarkup(this.labelLayer, `<text class="frequency-value-label" x="${categoryPosition}" y="${labelY}" text-anchor="middle" fill="${series.color}" font-family="${this.options.fontFamily}" font-size="${fontSize}">${labelText}</text>`);
    }

    renderTitles(plan) {
        this.renderCategoryTitle(plan);
        for (const axisKey of this.getUsedAxisKeys())
            this.renderAxisLegend(plan, axisKey);
    }

    renderCategoryTitle(plan) {
        const title = this.options.categoryTitle;
        if (!title?.termLatex)
            return;
        const layout = plan.layout;
        const titleFontSize = this.options.titleFontSize;
        const totalWidth = Utils.estimateCaseTermWidth(title.caseNumber, title.termLatex, titleFontSize);
        const termColor = title.isMissingTerm ? "#d13438" : this.options.foregroundColor;
        const hostGroup = this.createSvgElement("g");
        this.axisLayer.appendChild(hostGroup);
        if (this.isHorizontal()) {
            const centerY = layout.plotTop + layout.plotHeight / 2;
            const centerX = Math.max(titleFontSize, layout.plotLeft - (layout.categoryThickness ?? 0) + titleFontSize);
            hostGroup.setAttribute("transform", `rotate(-90 ${centerX} ${centerY})`);
            Utils.appendCaseTermSvg(hostGroup, centerX - totalWidth / 2, centerY, titleFontSize, termColor, title.caseNumber, title.termLatex);
            return;
        }
        const startX = layout.plotLeft + layout.plotWidth / 2 - totalWidth / 2;
        Utils.appendCaseTermSvg(hostGroup, startX, plan.height - 8, titleFontSize, termColor, title.caseNumber, title.termLatex);
    }

    // What an axis is measuring, written along it: every series read against that axis, each behind
    // the mark it is drawn with, so a reader can tell which scale a mark belongs to without a legend
    // sitting apart from the chart.
    renderAxisLegend(plan, axisKey) {
        const axisSeries = this.getSeriesOnAxis(axisKey);
        if (axisSeries.length === 0)
            return;
        const fontSize = this.options.titleFontSize;
        const contrastColor = Utils.getContrastColor(this.options.backgroundColor || "#ffffff");
        const indicatorWidth = 14;
        const indicatorGap = 4;
        const separatorText = ", ";
        const entries = [];
        let totalWidth = 0;
        for (let index = 0; index < axisSeries.length; index++) {
            if (index > 0) {
                const separatorWidth = this.estimateTextWidth(separatorText, fontSize);
                entries.push({ type: "separator", width: separatorWidth });
                totalWidth += separatorWidth;
            }
            const series = axisSeries[index];
            const labelWidth = this.estimateSeriesNameWidth(series.name, fontSize);
            entries.push({ type: "series", series: series, width: indicatorWidth + indicatorGap + labelWidth });
            totalWidth += indicatorWidth + indicatorGap + labelWidth;
        }
        const anchor = this.getAxisLegendAnchor(plan, axisKey);
        const hostGroup = this.createSvgElement("g");
        hostGroup.setAttribute("clip-path", `url(#${this.shapeClipId})`);
        this.axisLayer.appendChild(hostGroup);
        const innerGroup = this.createSvgElement("g");
        if (anchor.rotate)
            innerGroup.setAttribute("transform", `rotate(-90 ${anchor.x} ${anchor.y})`);
        hostGroup.appendChild(innerGroup);
        let cursorX = anchor.x - totalWidth / 2;
        for (const entry of entries) {
            if (entry.type === "separator") {
                this.appendSvgMarkup(innerGroup, `<text x="${cursorX}" y="${anchor.y}" fill="${contrastColor}" font-family="${this.options.termFontFamily}" font-size="${fontSize}">${separatorText}</text>`);
                cursorX += entry.width;
                continue;
            }
            this.appendSvgMarkup(innerGroup, this.getLegendIndicatorMarkup(entry.series, cursorX, anchor.y - fontSize * 0.35, indicatorWidth));
            cursorX += indicatorWidth + indicatorGap;
            const termColor = entry.series.name.isMissingTerm ? "#d13438" : contrastColor;
            Utils.appendCaseTermSvg(innerGroup, cursorX, anchor.y, fontSize, termColor, entry.series.name.caseNumber, entry.series.name.termLatex ?? "");
            cursorX += entry.width - indicatorWidth - indicatorGap;
        }
    }

    getAxisLegendAnchor(plan, axisKey) {
        const layout = plan.layout;
        const titleFontSize = this.options.titleFontSize;
        if (this.isHorizontal()) {
            const centerX = layout.plotLeft + layout.plotWidth / 2;
            if (axisKey === "primary")
                return { x: centerX, y: plan.height - 8, rotate: false };
            return { x: centerX, y: Math.max(titleFontSize, layout.plotTop - this.options.tickFontSize - 8), rotate: false };
        }
        const centerY = layout.plotTop + layout.plotHeight / 2;
        if (axisKey === "primary")
            return { x: Math.max(titleFontSize, layout.plotLeft - Math.ceil(layout.tickWidths.primary) - 12), y: centerY, rotate: true };
        return { x: Math.min(plan.width - titleFontSize * 0.4, layout.plotRight + Math.ceil(layout.tickWidths.secondary) + 14), y: centerY, rotate: true };
    }

    getLegendIndicatorMarkup(series, xPosition, centerY, indicatorWidth) {
        if (series.mark === "bar")
            return `<rect x="${xPosition + 2}" y="${centerY - 4}" width="${indicatorWidth - 4}" height="8" fill="${series.color}" fill-opacity="0.85" />`;
        return this.getMarkMarkup(series.mark, xPosition + indicatorWidth / 2, centerY, 8, series.color);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = FrequencyChartControl;
