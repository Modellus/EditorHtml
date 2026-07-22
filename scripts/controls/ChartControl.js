class ChartControl {
    constructor(hostElement, options) {
        this.hostElement = hostElement;
        this.options = this.createDefaultOptions();
        this.dataRows = [];
        this.renderState = null;
        this.focusArgumentValue = null;
        this.domainOverride = { xMin: null, xMax: null, yMin: null, yMax: null };
        this.width = 0;
        this.height = 0;
        this._axisTickDrag = new AxisTickDrag();
        this._pinnedTickValues = { x: null, y: null };
        this._zoomDragState = null;
        this._onZoomPointerMove = e => this.onZoomPointerMove(e);
        this._onZoomPointerUp = e => this.onZoomPointerUp(e);
        this._lastPlotClick = null;
        this.initializeRoot();
        Utils.ensureCaseIconsLoaded(() => this.render());
        this.setOptions(options);
    }

    createDefaultOptions() {
        return {
            chartType: "line",
            argumentField: "argument",
            series: [],
            argumentTitle: "",
            valueTitle: "",
            backgroundColor: "#ffffff",
            dataAreaColor: "",
            borderColor: "#666666",
            foregroundColor: "#666666",
            gridColor: "#d3d3d3",
            axisColor: "#7a7a7a",
            fontFamily: "Katex_Main",
            xAxisType: "decimal",
            yAxisType: "decimal",
            termFontFamily: "Katex_Math",
            termFontStyle: "italic",
            termFontWeight: 400,
            equalScales: false,
            interactable: true,
            precision: 2,
            tangentColor: "#00000000",
            fontSize: 13,
            titleFontSize: 14,
            fontWeight: 900
        };
    }

    initializeRoot() {
        this.rootElement = this.createSvgElement("g");
        this.rootElement.setAttribute("tabindex", "0");
        this.plotClipId = `chart-clip-${crypto.randomUUID()}`;
        const clipPath = this.createSvgElement("clipPath");
        clipPath.setAttribute("id", this.plotClipId);
        this.plotClipRect = this.createSvgElement("rect");
        clipPath.appendChild(this.plotClipRect);
        this.rootElement.appendChild(clipPath);
        this.xTitleClipId = `chart-xtitle-clip-${crypto.randomUUID()}`;
        const xTitleClipPath = this.createSvgElement("clipPath");
        xTitleClipPath.setAttribute("id", this.xTitleClipId);
        this.xTitleClipRect = this.createSvgElement("rect");
        xTitleClipPath.appendChild(this.xTitleClipRect);
        this.rootElement.appendChild(xTitleClipPath);
        this.yTitleClipId = `chart-ytitle-clip-${crypto.randomUUID()}`;
        const yTitleClipPath = this.createSvgElement("clipPath");
        yTitleClipPath.setAttribute("id", this.yTitleClipId);
        this.yTitleClipRect = this.createSvgElement("rect");
        yTitleClipPath.appendChild(this.yTitleClipRect);
        this.rootElement.appendChild(yTitleClipPath);
        this.backgroundLayer = this.createSvgElement("g");
        this.gridLayer = this.createSvgElement("g");
        this.gridLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.seriesLayer = this.createSvgElement("g");
        this.seriesLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.shapeClipId = `chart-shape-clip-${crypto.randomUUID()}`;
        const shapeClipPath = this.createSvgElement("clipPath");
        shapeClipPath.setAttribute("id", this.shapeClipId);
        this.shapeClipRect = this.createSvgElement("rect");
        shapeClipPath.appendChild(this.shapeClipRect);
        this.rootElement.appendChild(shapeClipPath);
        this.xTicksClipId = `chart-xticks-clip-${crypto.randomUUID()}`;
        const xTicksClipPath = this.createSvgElement("clipPath");
        xTicksClipPath.setAttribute("id", this.xTicksClipId);
        this.xTicksClipRect = this.createSvgElement("rect");
        xTicksClipPath.appendChild(this.xTicksClipRect);
        this.rootElement.appendChild(xTicksClipPath);
        this.yTicksClipId = `chart-yticks-clip-${crypto.randomUUID()}`;
        const yTicksClipPath = this.createSvgElement("clipPath");
        yTicksClipPath.setAttribute("id", this.yTicksClipId);
        this.yTicksClipRect = this.createSvgElement("rect");
        yTicksClipPath.appendChild(this.yTicksClipRect);
        this.rootElement.appendChild(yTicksClipPath);
        this.axisLayer = this.createSvgElement("g");
        this.axisLayer.setAttribute("clip-path", `url(#${this.shapeClipId})`);
        this.focusLayer = this.createSvgElement("g");
        this.focusLayer.setAttribute("class", "chart-focus-layer");
        this.focusLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.zoomLayer = this.createSvgElement("g");
        this.zoomLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.crosshairLayer = this.createSvgElement("g");
        this.tickInteractionLayer = this.createSvgElement("g");
        this.crosshairInteractionLayer = this.createSvgElement("g");
        this.rootElement.appendChild(this.backgroundLayer);
        this.rootElement.appendChild(this.gridLayer);
        this.rootElement.appendChild(this.seriesLayer);
        this.rootElement.appendChild(this.axisLayer);
        this.rootElement.appendChild(this.focusLayer);
        this.rootElement.appendChild(this.zoomLayer);
        this.rootElement.appendChild(this.crosshairLayer);
        this.rootElement.appendChild(this.tickInteractionLayer);
        this.rootElement.appendChild(this.crosshairInteractionLayer);
        if (this.hostElement)
            this.hostElement.appendChild(this.rootElement);
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

    focus() {
        if (!this.rootElement || typeof this.rootElement.focus !== "function")
            return;
        this.rootElement.focus();
    }

    element() {
        return this.rootElement;
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

    normalizeSeries(series) {
        if (!Array.isArray(series))
            return [];
        return series.map((item, index) => ({
            valueField: item?.valueField ?? `series${index}`,
            name: item?.name ?? `Series ${index + 1}`,
            color: this.normalizeColor(item?.color, index),
            showLabel: item?.showLabel === true,
            chartTypes: this.normalizeChartTypes(item?.chartTypes)
        }));
    }

    normalizeChartTypes(chartTypes) {
        const validTypes = ["line", "scatter", "area", "bar"];
        if (Array.isArray(chartTypes) && chartTypes.length > 0) {
            const filtered = chartTypes.filter(t => validTypes.includes(t));
            if (filtered.length > 0)
                return filtered;
        }
        return ["line"];
    }

    normalizeColor(colorValue, index) {
        if (colorValue != null && String(colorValue).trim() !== "")
            return String(colorValue).trim();
        return Utils.getColorByIndex(index);
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
        if (!Array.isArray(dataRows))
            this.dataRows = [];
        else
            this.dataRows = dataRows.map(row => ({ ...row }));
        this.render();
    }

    setFocusArgumentValue(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue))
            this.focusArgumentValue = null;
        else
            this.focusArgumentValue = numericValue;
        this.renderFocus();
    }

    getChartSize() {
        return { width: this.width, height: this.height };
    }

    estimateTextWidth(textValue, fontSize) {
        const value = String(textValue ?? "");
        return value.length * fontSize * 0.58;
    }

    getLayout(width, height, xTicks, yTicks) {
        const tickFontSize = 10;
        const axisTitleSize = Number(this.options.titleFontSize) || 16;
        let maxXTickWidth = 0;
        let maxYTickWidth = 0;
        for (let index = 0; index < xTicks.length; index++) {
            const labelWidth = this.estimateTextWidth(this.formatAxisValue(xTicks[index], this.options.xAxisType), tickFontSize);
            if (labelWidth > maxXTickWidth)
                maxXTickWidth = labelWidth;
        }
        for (let index = 0; index < yTicks.length; index++) {
            const labelWidth = this.estimateTextWidth(this.formatAxisValue(yTicks[index], this.options.yAxisType), tickFontSize);
            if (labelWidth > maxYTickWidth)
                maxYTickWidth = labelWidth;
        }
        const topPadding = 8;
        const rightPadding = Math.max(12, Math.ceil(maxXTickWidth / 2) + 4);
        const leftPadding = Math.max(58, Math.ceil(maxYTickWidth) + 16);
        const bottomPadding = Math.max(44, tickFontSize + axisTitleSize + 20);
        const minimumPlotWidth = 12;
        const minimumPlotHeight = 12;
        let plotLeft = leftPadding;
        let plotRight = width - rightPadding;
        if (plotRight - plotLeft < minimumPlotWidth) {
            plotLeft = Math.max(0, width - rightPadding - minimumPlotWidth);
            plotRight = Math.min(width, plotLeft + minimumPlotWidth);
        }
        let plotTop = topPadding;
        let plotBottom = height - bottomPadding;
        if (plotBottom - plotTop < minimumPlotHeight) {
            plotTop = Math.max(0, height - bottomPadding - minimumPlotHeight);
            plotBottom = Math.min(height, plotTop + minimumPlotHeight);
        }
        const axisTitleLeft = Math.max(12, leftPadding - Math.ceil(maxYTickWidth) - 12);
        return {
            plotLeft: plotLeft,
            plotRight: plotRight,
            plotTop: plotTop,
            plotBottom: plotBottom,
            plotWidth: plotRight - plotLeft,
            plotHeight: plotBottom - plotTop,
            axisTitleX: height - 8,
            axisTitleY: topPadding + (plotBottom - plotTop) / 2,
            axisTitleLeft: axisTitleLeft
        };
    }

    getNumericValue(row, fieldName) {
        if (!row)
            return null;
        const rawValue = row[fieldName];
        if (rawValue == null || rawValue === "")
            return null;
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue))
            return null;
        return numericValue;
    }

    setDomainOverride(override) {
        this.domainOverride = {
            xMin: override?.xMin ?? null,
            xMax: override?.xMax ?? null,
            yMin: override?.yMin ?? null,
            yMax: override?.yMax ?? null
        };
        this._pinnedTickValues = { x: null, y: null };
        this.render();
    }

    getDomain(argumentField, series) {
        const xValues = [];
        const yValues = [];
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const row = this.dataRows[rowIndex];
            const xValue = this.getNumericValue(row, argumentField);
            if (xValue == null)
                continue;
            xValues.push(xValue);
            for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
                const seriesValue = this.getNumericValue(row, series[seriesIndex].valueField);
                if (seriesValue == null)
                    continue;
                yValues.push(seriesValue);
            }
        }
        const hasBaselineType = series.some(s => {
            const types = s.chartTypes ?? ["line"];
            return types.includes("bar") || types.includes("area");
        });
        if (hasBaselineType)
            yValues.push(0);
        xValues.push(0);
        yValues.push(0);
        if (xValues.length === 0)
            xValues.push(0, 1);
        if (yValues.length === 0)
            yValues.push(0, 1);
        let xMin = Math.min(...xValues);
        let xMax = Math.max(...xValues);
        let yMin = Math.min(...yValues);
        let yMax = Math.max(...yValues);
        if (xMin === xMax) {
            xMin -= 1;
            xMax += 1;
        }
        if (yMin === yMax) {
            yMin -= 1;
            yMax += 1;
        }
        const xPadding = (xMax - xMin) * 0.04;
        const yPadding = (yMax - yMin) * 0.08;
        const domain = {
            xMin: xMin - xPadding,
            xMax: xMax + xPadding,
            yMin: yMin - yPadding,
            yMax: yMax + yPadding
        };
        if (this.domainOverride.xMin != null)
            domain.xMin = this.domainOverride.xMin;
        if (this.domainOverride.xMax != null)
            domain.xMax = this.domainOverride.xMax;
        if (this.domainOverride.yMin != null)
            domain.yMin = this.domainOverride.yMin;
        if (this.domainOverride.yMax != null)
            domain.yMax = this.domainOverride.yMax;
        if (domain.xMin >= domain.xMax)
            domain.xMax = domain.xMin + 1;
        if (domain.yMin >= domain.yMax)
            domain.yMax = domain.yMin + 1;
        return domain;
    }

    buildTicks(minValue, maxValue, targetCount = 5, axisType = "decimal") {
        const ticks = [];
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue >= maxValue)
            return ticks;
        const range = maxValue - minValue;
        const rawStep = range / Math.max(1, targetCount - 1);
        const step = axisType === "pi" ? nicePiTickStep(rawStep) : niceTickStep(rawStep);
        if (!(step > 0))
            return ticks;
        const firstTick = Math.floor(minValue / step) * step;
        for (let value = firstTick; value <= maxValue + step * 0.001; value += step)
            ticks.push(Math.round(value * 1e10) / 1e10);
        return ticks;
    }

    injectPinnedTick(ticks, pinnedValue, domainMin, domainMax) {
        if (!Number.isFinite(pinnedValue) || pinnedValue <= domainMin || pinnedValue >= domainMax)
            return ticks;
        const range = domainMax - domainMin;
        const dedupeEpsilon = range * 1e-6;
        if (ticks.some(value => Math.abs(value - pinnedValue) <= dedupeEpsilon))
            return ticks;
        return [...ticks, pinnedValue];
    }

    buildMinorTicks(majorTicks, minValue, maxValue, subdivisions = 5) {
        const ticks = [];
        if (!Array.isArray(majorTicks) || majorTicks.length < 2)
            return this.buildTicks(minValue, maxValue, Math.max(6, subdivisions * 4 + 1));
        const step = majorTicks[1] - majorTicks[0];
        if (!Number.isFinite(step) || step <= 0 || subdivisions <= 1)
            return ticks;
        const minorStep = step / subdivisions;
        const firstMajor = majorTicks[0];
        const extendedStart = firstMajor - step;
        const lastMajor = majorTicks[majorTicks.length - 1];
        for (let majorStart = extendedStart; majorStart <= lastMajor + step * 0.001; majorStart += step) {
            const majorStartRounded = Math.round(majorStart * 1e10) / 1e10;
            for (let minorIndex = 1; minorIndex < subdivisions; minorIndex++) {
                const tickValue = Math.round((majorStartRounded + minorStep * minorIndex) * 1e10) / 1e10;
                if (tickValue <= minValue || tickValue >= maxValue)
                    continue;
                ticks.push(tickValue);
            }
        }
        return ticks;
    }

    formatAxisValue(value, axisType = "decimal") {
        if (!Number.isFinite(value))
            return "";
        if (axisType === "pi")
            return this.formatPiValue(value);
        const absoluteValue = Math.abs(value);
        if (absoluteValue >= 10000 || (absoluteValue > 0 && absoluteValue < 0.001))
            return value.toExponential(2);
        const roundedValue = Math.round(value * 1000) / 1000;
        return String(roundedValue);
    }

    formatPiValue(value) {
        if (!Number.isFinite(value))
            return "";
        if (Math.abs(value) < 1e-10)
            return "0";
        const ratio = value / Math.PI;
        const sign = ratio < 0 ? "-" : "";
        const absoluteRatio = Math.abs(ratio);
        let match = null;
        for (let denominator = 1; denominator <= 12; denominator++) {
            const numerator = Math.round(absoluteRatio * denominator);
            if (numerator === 0)
                continue;
            if (Math.abs(absoluteRatio - numerator / denominator) < 1e-6) {
                match = { numerator: numerator, denominator: denominator };
                break;
            }
        }
        if (!match)
            return `${this.formatAxisValue(ratio)}π`;
        const divisor = greatestCommonDivisor(match.numerator, match.denominator);
        const numerator = match.numerator / divisor;
        const denominator = match.denominator / divisor;
        const numeratorText = numerator === 1 ? "π" : `${numerator}π`;
        return denominator === 1 ? `${sign}${numeratorText}` : `${sign}${numeratorText}/${denominator}`;
    }

    formatCrosshairValue(value) {
        if (!Number.isFinite(value))
            return "";
        const precision = typeof this.options.getPrecision === "function" ? this.options.getPrecision() : (Number.isFinite(this.options.precision) ? this.options.precision : 2);
        return Utils.formatNumber(value, precision);
    }

    formatArgumentValue(value) {
        if (!Number.isFinite(value))
            return "";
        if (typeof this.options.getArgumentPrecision === "function")
            return Utils.formatNumber(value, this.options.getArgumentPrecision());
        return this.formatCrosshairValue(value);
    }

    renderValueTitleLegend(targetLayer, layout, fontSize, clipId = null) {
        const series = this.options.series;
        if (!series || series.length === 0)
            return;
        const backgroundColor = this.options.backgroundColor || "#ffffff";
        const contrastColor = Utils.getContrastColor(backgroundColor);
        const separatorText = ", ";
        const indicatorWidth = 14;
        const indicatorGap = 4;
        const indicatorTotalWidth = indicatorWidth + indicatorGap;
        let totalWidth = 0;
        const entries = [];
        for (let index = 0; index < series.length; index++) {
            if (index > 0) {
                const separatorWidth = this.estimateTextWidth(separatorText, fontSize);
                entries.push({ type: "separator", width: separatorWidth });
                totalWidth += separatorWidth;
            }
            const seriesName = series[index].name ?? {};
            const seriesLabelWidth = Utils.estimateCaseTermWidth(seriesName.caseNumber, seriesName.termLatex ?? "", fontSize);
            const seriesColor = series[index].color || contrastColor;
            const chartTypes = series[index].chartTypes ?? ["line"];
            entries.push({ type: "series", name: seriesName, color: seriesColor, chartTypes: chartTypes, width: indicatorTotalWidth + seriesLabelWidth });
            totalWidth += indicatorTotalWidth + seriesLabelWidth;
        }
        const centerX = layout.axisTitleLeft;
        const centerY = layout.axisTitleY;
        const outerGroup = this.createSvgElement("g");
        if (clipId)
            outerGroup.setAttribute("clip-path", `url(#${clipId})`);
        targetLayer.appendChild(outerGroup);
        const hostGroup = this.createSvgElement("g");
        hostGroup.setAttribute("transform", `rotate(-90 ${centerX} ${centerY})`);
        outerGroup.appendChild(hostGroup);
        let cursorX = centerX - totalWidth / 2;
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            if (entry.type === "separator") {
                this.appendSvgMarkup(hostGroup, `<text x="${cursorX}" y="${centerY}" fill="${contrastColor}" font-family="${this.options.termFontFamily}" font-size="${fontSize}">${separatorText}</text>`);
                cursorX += entry.width;
                continue;
            }
            this.renderLegendIndicator(hostGroup, cursorX, centerY, fontSize, entry.color, entry.chartTypes, indicatorWidth);
            cursorX += indicatorTotalWidth;
            Utils.appendCaseTermSvg(hostGroup, cursorX, centerY, fontSize, contrastColor, entry.name.caseNumber, entry.name.termLatex ?? "");
            cursorX += entry.width - indicatorTotalWidth;
        }
    }

    renderLegendIndicator(layer, xPosition, yPosition, fontSize, color, chartTypes, indicatorWidth) {
        const types = chartTypes ?? ["line"];
        const centerY = yPosition - fontSize * 0.35;
        let indicatorMarkup = "";
        if (types.includes("area"))
            indicatorMarkup = `
                <rect x="${xPosition}" y="${centerY - 3}" width="${indicatorWidth}" height="6" fill="${color}" fill-opacity="0.22" />
                <line x1="${xPosition}" y1="${centerY}" x2="${xPosition + indicatorWidth}" y2="${centerY}" stroke="${color}" stroke-width="2" />
            `;
        else if (types.includes("line"))
            indicatorMarkup = `
                <line x1="${xPosition}" y1="${centerY}" x2="${xPosition + indicatorWidth}" y2="${centerY}" stroke="${color}" stroke-width="2" />
            `;
        else if (types.includes("scatter"))
            indicatorMarkup = `
                <circle cx="${xPosition + indicatorWidth / 2}" cy="${centerY}" r="3" fill="${color}" />
            `;
        else if (types.includes("bar"))
            indicatorMarkup = `
                <rect x="${xPosition + 2}" y="${centerY - 4}" width="${indicatorWidth - 4}" height="8" fill="${color}" fill-opacity="0.8" />
            `;
        if (indicatorMarkup)
            this.appendSvgMarkup(layer, indicatorMarkup);
    }

    getScales(layout, domain) {
        const xScale = value => {
            const ratio = (value - domain.xMin) / (domain.xMax - domain.xMin);
            return layout.plotLeft + ratio * layout.plotWidth;
        };
        const yScale = value => {
            const ratio = (value - domain.yMin) / (domain.yMax - domain.yMin);
            return layout.plotBottom - ratio * layout.plotHeight;
        };
        return { xScale: xScale, yScale: yScale };
    }

    equalizeDomain(domain, plotWidth, plotHeight) {
        const xRange = domain.xMax - domain.xMin;
        const yRange = domain.yMax - domain.yMin;
        if (xRange <= 0 || yRange <= 0 || plotWidth <= 0 || plotHeight <= 0)
            return domain;
        const xPixelsPerUnit = plotWidth / xRange;
        const yPixelsPerUnit = plotHeight / yRange;
        if (xPixelsPerUnit > yPixelsPerUnit) {
            const targetXRange = plotWidth / yPixelsPerUnit;
            const xCenter = (domain.xMin + domain.xMax) / 2;
            return { xMin: xCenter - targetXRange / 2, xMax: xCenter + targetXRange / 2, yMin: domain.yMin, yMax: domain.yMax };
        }
        const targetYRange = plotHeight / xPixelsPerUnit;
        const yCenter = (domain.yMin + domain.yMax) / 2;
        return { xMin: domain.xMin, xMax: domain.xMax, yMin: yCenter - targetYRange / 2, yMax: yCenter + targetYRange / 2 };
    }

    render() {
        const size = this.getChartSize();
        const width = size.width;
        const height = size.height;
        this.clearLayer(this.backgroundLayer);
        this.clearLayer(this.gridLayer);
        this.clearLayer(this.seriesLayer);
        this.clearLayer(this.axisLayer);
        this.clearLayer(this.focusLayer);
        this.clearLayer(this.zoomLayer);
        this.clearLayer(this.crosshairLayer);
        this.clearLayer(this.tickInteractionLayer);
        this.clearLayer(this.crosshairInteractionLayer);
        this.renderState = null;
        if (width <= 2 || height <= 2)
            return;
        this.renderBackground(width, height);
        const rawDomain = this.getDomain(this.options.argumentField, this.options.series);
        const preliminaryXTicks = this.buildTicks(rawDomain.xMin, rawDomain.xMax, 5, this.options.xAxisType);
        const preliminaryYTicks = this.buildTicks(rawDomain.yMin, rawDomain.yMax, 5, this.options.yAxisType);
        const preliminaryLayout = this.getLayout(width, height, preliminaryXTicks, preliminaryYTicks);
        const domain = this.options.equalScales
            ? this.equalizeDomain(rawDomain, preliminaryLayout.plotWidth, preliminaryLayout.plotHeight)
            : rawDomain;
        const xMajorTicks = this.buildTicks(domain.xMin, domain.xMax, 5, this.options.xAxisType);
        const yMajorTicks = this.buildTicks(domain.yMin, domain.yMax, 5, this.options.yAxisType);
        const xTicks = this.injectPinnedTick(xMajorTicks, this._pinnedTickValues.x, domain.xMin, domain.xMax);
        const yTicks = this.injectPinnedTick(yMajorTicks, this._pinnedTickValues.y, domain.yMin, domain.yMax);
        const layout = this.getLayout(width, height, xTicks, yTicks);
        const xMajorStep = xMajorTicks.length > 1 ? xMajorTicks[1] - xMajorTicks[0] : 0;
        const yMajorStep = yMajorTicks.length > 1 ? yMajorTicks[1] - yMajorTicks[0] : 0;
        const xSubdivisions = minorTickDivisions(layout.plotWidth * xMajorStep / (domain.xMax - domain.xMin));
        const ySubdivisions = minorTickDivisions(layout.plotHeight * yMajorStep / (domain.yMax - domain.yMin));
        const xMinorTicks = this.buildMinorTicks(xMajorTicks, domain.xMin, domain.xMax, xSubdivisions);
        const yMinorTicks = this.buildMinorTicks(yMajorTicks, domain.yMin, domain.yMax, ySubdivisions);
        this.plotClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.plotClipRect.setAttribute("y", `${layout.plotTop}`);
        this.plotClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.plotClipRect.setAttribute("height", `${layout.plotHeight}`);
        this.shapeClipRect.setAttribute("x", "0");
        this.shapeClipRect.setAttribute("y", "0");
        this.shapeClipRect.setAttribute("width", `${width}`);
        this.shapeClipRect.setAttribute("height", `${height}`);
        this.shapeClipRect.setAttribute("rx", `${this.options.borderRadius ?? 4}`);
        this.xTicksClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.xTicksClipRect.setAttribute("y", "0");
        this.xTicksClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.xTicksClipRect.setAttribute("height", `${height}`);
        this.yTicksClipRect.setAttribute("x", "0");
        this.yTicksClipRect.setAttribute("y", `${layout.plotTop}`);
        this.yTicksClipRect.setAttribute("width", `${width}`);
        this.yTicksClipRect.setAttribute("height", `${layout.plotHeight}`);
        const scales = this.getScales(layout, domain);
        this.renderDataAreaBackground(layout);
        this.renderGrid(layout, scales.xScale, scales.yScale, xTicks, yTicks, xMinorTicks, yMinorTicks);
        this.renderAxes(layout, scales.xScale, scales.yScale, xTicks, yTicks, xMinorTicks, yMinorTicks);
        this.renderSeries(layout, scales.xScale, scales.yScale);
        this.renderTitles(layout, width, height);
        this.renderState = {
            layout: layout,
            domain: domain,
            xScale: scales.xScale,
            yScale: scales.yScale,
            xTicks: xTicks,
            yTicks: yTicks,
            series: this.options.series,
            argumentField: this.options.argumentField
        };
        this.renderTickHitAreas(layout, scales.xScale, scales.yScale, xTicks, yTicks);
        this.renderCrosshairHitArea(layout);
        this.renderFocus();
    }

    renderBackground(width, height) {
        const borderRadius = this.options.borderRadius ?? 4;
        this.appendSvgMarkup(this.backgroundLayer, `
            <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="${this.options.backgroundColor}" stroke="${this.options.borderColor}" stroke-width="1" />
        `);
    }

    renderDataAreaBackground(layout) {
        if (!this.options.dataAreaColor)
            return;
        this.appendSvgMarkup(this.backgroundLayer, `
            <rect x="${layout.plotLeft}" y="${layout.plotTop}" width="${layout.plotWidth}" height="${layout.plotHeight}" fill="${this.options.dataAreaColor}" />
        `);
    }

    renderGrid(layout, xScale, yScale, xTicks, yTicks, xMinorTicks = [], yMinorTicks = []) {
        let gridMarkup = "";
        for (let index = 0; index < xMinorTicks.length; index++) {
            const xValue = xMinorTicks[index];
            const xPosition = xScale(xValue);
            gridMarkup += `
                <line x1="${xPosition}" y1="${layout.plotTop}" x2="${xPosition}" y2="${layout.plotBottom}" stroke="${this.options.gridColor}" stroke-opacity="0.4" stroke-width="1" />
            `;
        }
        for (let index = 0; index < yMinorTicks.length; index++) {
            const yValue = yMinorTicks[index];
            const yPosition = yScale(yValue);
            gridMarkup += `
                <line x1="${layout.plotLeft}" y1="${yPosition}" x2="${layout.plotRight}" y2="${yPosition}" stroke="${this.options.gridColor}" stroke-opacity="0.4" stroke-width="1" />
            `;
        }
        for (let index = 0; index < xTicks.length; index++) {
            const xValue = xTicks[index];
            const xPosition = xScale(xValue);
            gridMarkup += `
                <line x1="${xPosition}" y1="${layout.plotTop}" x2="${xPosition}" y2="${layout.plotBottom}" stroke="${this.options.gridColor}" stroke-opacity="0.75" stroke-width="1" />
            `;
        }
        for (let index = 0; index < yTicks.length; index++) {
            const yValue = yTicks[index];
            const yPosition = yScale(yValue);
            gridMarkup += `
                <line x1="${layout.plotLeft}" y1="${yPosition}" x2="${layout.plotRight}" y2="${yPosition}" stroke="${this.options.gridColor}" stroke-opacity="0.75" stroke-width="1" />
            `;
        }
        this.appendSvgMarkup(this.gridLayer, gridMarkup);
    }

    renderAxes(layout, xScale, yScale, xTicks, yTicks, xMinorTicks = [], yMinorTicks = []) {
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${layout.plotLeft}" y1="${layout.plotTop}" x2="${layout.plotLeft}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotLeft}" y1="${layout.plotBottom}" x2="${layout.plotRight}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotLeft}" y1="${layout.plotTop}" x2="${layout.plotRight}" y2="${layout.plotTop}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            <line x1="${layout.plotRight}" y1="${layout.plotTop}" x2="${layout.plotRight}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
        `);
        const originYPixel = yScale(0);
        if (originYPixel > layout.plotTop && originYPixel < layout.plotBottom)
            this.appendSvgMarkup(this.axisLayer, `
                <line x1="${layout.plotLeft}" y1="${originYPixel}" x2="${layout.plotRight}" y2="${originYPixel}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            `);
        const originXPixel = xScale(0);
        if (originXPixel > layout.plotLeft && originXPixel < layout.plotRight)
            this.appendSvgMarkup(this.axisLayer, `
                <line x1="${originXPixel}" y1="${layout.plotTop}" x2="${originXPixel}" y2="${layout.plotBottom}" stroke="${this.options.axisColor}" stroke-width="1.2" />
            `);
        for (let index = 0; index < xMinorTicks.length; index++)
            this.renderXAxisMinorTick(layout, xScale, xMinorTicks[index]);
        for (let index = 0; index < yMinorTicks.length; index++)
            this.renderYAxisMinorTick(layout, yScale, yMinorTicks[index]);
        const visibleXTicks = xTicks.filter(xValue => this.isTickPositionVisible(xScale(xValue), layout.plotLeft, layout.plotRight));
        const visibleYTicks = yTicks.filter(yValue => this.isTickPositionVisible(yScale(yValue), layout.plotTop, layout.plotBottom));
        for (let index = 0; index < visibleXTicks.length; index++)
            this.renderXAxisTick(layout, xScale, visibleXTicks[index], index, visibleXTicks.length);
        for (let index = 0; index < visibleYTicks.length; index++)
            this.renderYAxisTick(layout, yScale, visibleYTicks[index]);
    }

    isTickPositionVisible(position, minimumPosition, maximumPosition) {
        if (!Number.isFinite(position))
            return false;
        const tolerance = 0.01;
        return position >= minimumPosition - tolerance && position <= maximumPosition + tolerance;
    }

    renderXAxisMinorTick(layout, xScale, xValue) {
        const xPosition = xScale(xValue);
        this.appendSvgMarkup(this.axisLayer, `
            <g clip-path="url(#${this.xTicksClipId})">
                <line x1="${xPosition}" y1="${layout.plotBottom}" x2="${xPosition}" y2="${layout.plotBottom + 2.5}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
                <line x1="${xPosition}" y1="${layout.plotTop}" x2="${xPosition}" y2="${layout.plotTop - 2.5}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
            </g>
        `);
    }

    renderXAxisTick(layout, xScale, xValue, tickIndex, totalTicks) {
        const xPosition = xScale(xValue);
        let anchor = "middle";
        let labelX = xPosition;
        if (tickIndex === 0) {
            anchor = "start";
            labelX = xPosition + 2;
        }
        if (tickIndex === totalTicks - 1) {
            anchor = "end";
            labelX = xPosition - 2;
        }
        const labelText = this.escapeMarkupText(this.formatAxisValue(xValue, this.options.xAxisType));
        this.appendSvgMarkup(this.axisLayer, `
            <g clip-path="url(#${this.xTicksClipId})">
                <line x1="${xPosition}" y1="${layout.plotBottom}" x2="${xPosition}" y2="${layout.plotBottom + 4}" stroke="${this.options.axisColor}" stroke-width="1" />
                <line x1="${xPosition}" y1="${layout.plotTop}" x2="${xPosition}" y2="${layout.plotTop - 4}" stroke="${this.options.axisColor}" stroke-width="1" />
            </g>
            <text class="shape-tick-label" x="${labelX}" y="${layout.plotBottom + 18}" text-anchor="${anchor}" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="10">${labelText}</text>
        `);
    }

    renderYAxisTick(layout, yScale, yValue) {
        const yPosition = yScale(yValue);
        const labelText = this.escapeMarkupText(this.formatAxisValue(yValue, this.options.yAxisType));
        this.appendSvgMarkup(this.axisLayer, `
            <g clip-path="url(#${this.yTicksClipId})">
                <line x1="${layout.plotLeft - 4}" y1="${yPosition}" x2="${layout.plotLeft}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-width="1" />
                <line x1="${layout.plotRight}" y1="${yPosition}" x2="${layout.plotRight + 4}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-width="1" />
            </g>
            <text class="shape-tick-label" x="${layout.plotLeft - 7}" y="${yPosition + 3}" text-anchor="end" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="10">${labelText}</text>
        `);
    }

    renderYAxisMinorTick(layout, yScale, yValue) {
        const yPosition = yScale(yValue);
        this.appendSvgMarkup(this.axisLayer, `
            <g clip-path="url(#${this.yTicksClipId})">
                <line x1="${layout.plotLeft - 2.5}" y1="${yPosition}" x2="${layout.plotLeft}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
                <line x1="${layout.plotRight}" y1="${yPosition}" x2="${layout.plotRight + 2.5}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
            </g>
        `);
    }

    getSeriesPoints(series, xScale, yScale) {
        const points = [];
        let effectiveRowIndex = 0;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const row = this.dataRows[rowIndex];
            const rawXValue = this.getNumericValue(row, this.options.argumentField);
            const rawYValue = this.getNumericValue(row, series.valueField);
            if (rawXValue == null || rawYValue == null) {
                effectiveRowIndex++;
                continue;
            }
            if (row[`singularity_${series.valueField}`] === true)
                effectiveRowIndex++;
            const pixelX = xScale(rawXValue);
            const pixelY = yScale(rawYValue);
            points.push({
                rowIndex: effectiveRowIndex,
                xValue: rawXValue,
                yValue: rawYValue,
                x: pixelX,
                y: pixelY,
                isOutlier: row[`outlier_${series.valueField}`] === true
            });
            effectiveRowIndex++;
        }
        return points;
    }

    renderSeries(layout, xScale, yScale) {
        const areaBaseY = Math.min(Math.max(yScale(0), layout.plotTop), layout.plotBottom);
        const barSeriesList = this.options.series.filter(series => (series.chartTypes ?? ["line"]).includes("bar"));
        if (barSeriesList.length > 0)
            this.renderBarSeries(layout, xScale, yScale, barSeriesList);
        for (let seriesIndex = 0; seriesIndex < this.options.series.length; seriesIndex++) {
            const series = this.options.series[seriesIndex];
            const seriesChartTypes = series.chartTypes ?? ["line"];
            const points = this.getSeriesPoints(series, xScale, yScale);
            if (points.length === 0)
                continue;
            const regularPoints = points.filter(point => !point.isOutlier);
            const outlierPoints = points.filter(point => point.isOutlier);
            for (let typeIndex = 0; typeIndex < seriesChartTypes.length; typeIndex++) {
                const chartType = seriesChartTypes[typeIndex];
                if (chartType === "bar")
                    continue;
                if (chartType === "line" && seriesChartTypes.includes("area"))
                    continue;
                if (chartType === "area")
                    this.renderAreaSeries(regularPoints, series.color, areaBaseY);
                else if (chartType === "line")
                    this.renderLineSeries(regularPoints, series.color);
                else if (chartType === "scatter")
                    this.renderPointMarkers(regularPoints, series.color);
            }
            if (outlierPoints.length > 0)
                this.renderOutlierMarkers(outlierPoints, series.color);
        }
    }

    renderLineSeries(points, color) {
        this.appendSvgMarkup(this.seriesLayer, `
            <path fill="none" stroke="${color}" stroke-width="2" d="${this.getPolylinePath(points)}" />
        `);
    }

    renderAreaSeries(points, color, baseY) {
        if (points.length < 2) {
            this.renderPointMarkers(points, color);
            return;
        }
        this.appendSvgMarkup(this.seriesLayer, `
            <path fill="${color}" fill-opacity="0.22" stroke="none" d="${this.getAreaPath(points, baseY)}" />
        `);
        this.renderLineSeries(points, color);
    }

    renderPointMarkers(points, color) {
        let markersMarkup = "";
        for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const point = points[pointIndex];
            markersMarkup += `
                <circle cx="${point.x}" cy="${point.y}" r="3" fill="${color}" />
            `;
        }
        this.appendSvgMarkup(this.seriesLayer, markersMarkup);
    }

    renderScatterSeries(points, color) {
        this.renderPointMarkers(points, color);
    }

    renderOutlierMarkers(points, color) {
        let markersMarkup = "";
        for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const point = points[pointIndex];
            markersMarkup += `
                <circle cx="${point.x}" cy="${point.y}" r="3.5" fill="none" stroke="${color}" stroke-width="1.5" />
            `;
        }
        this.appendSvgMarkup(this.seriesLayer, markersMarkup);
    }

    renderBarSeries(layout, xScale, yScale, barSeriesList) {
        if (barSeriesList.length === 0)
            return;
        const xValues = [];
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const rawXValue = this.getNumericValue(this.dataRows[rowIndex], this.options.argumentField);
            if (rawXValue == null)
                continue;
            xValues.push(rawXValue);
        }
        const uniqueXValues = [...new Set(xValues)].sort((leftValue, rightValue) => leftValue - rightValue);
        let stepPixels = layout.plotWidth / Math.max(1, uniqueXValues.length + 1);
        for (let index = 1; index < uniqueXValues.length; index++) {
            const diff = Math.abs(xScale(uniqueXValues[index]) - xScale(uniqueXValues[index - 1]));
            if (diff > 0)
                stepPixels = Math.min(stepPixels, diff);
        }
        const barWidth = Math.max(2, Math.min(24, stepPixels / Math.max(1, barSeriesList.length + 1)));
        const baselineY = yScale(0);
        let barsMarkup = "";
        const outlierPointsBySeries = [];
        for (let seriesIndex = 0; seriesIndex < barSeriesList.length; seriesIndex++) {
            const series = barSeriesList[seriesIndex];
            const offset = (seriesIndex - (barSeriesList.length - 1) / 2) * barWidth;
            const seriesOutlierPoints = [];
            for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
                const row = this.dataRows[rowIndex];
                const rawXValue = this.getNumericValue(row, this.options.argumentField);
                const rawYValue = this.getNumericValue(row, series.valueField);
                if (rawXValue == null || rawYValue == null)
                    continue;
                if (row[`outlier_${series.valueField}`] === true) {
                    seriesOutlierPoints.push({ x: xScale(rawXValue), y: yScale(rawYValue) });
                    continue;
                }
                const xPosition = xScale(rawXValue) + offset - barWidth * 0.45;
                const yPosition = yScale(rawYValue);
                barsMarkup += `
                    <rect x="${xPosition}" y="${Math.min(yPosition, baselineY)}" width="${barWidth * 0.9}" height="${Math.max(1, Math.abs(yPosition - baselineY))}" fill="${series.color}" fill-opacity="0.8" />
                `;
            }
            outlierPointsBySeries.push({ points: seriesOutlierPoints, color: series.color });
        }
        this.appendSvgMarkup(this.seriesLayer, barsMarkup);
        for (let seriesIndex = 0; seriesIndex < outlierPointsBySeries.length; seriesIndex++) {
            const entry = outlierPointsBySeries[seriesIndex];
            if (entry.points.length > 0)
                this.renderOutlierMarkers(entry.points, entry.color);
        }
    }

    getPolylinePath(points) {
        if (points.length === 0)
            return "";
        let pathValue = `M ${points[0].x} ${points[0].y}`;
        for (let index = 1; index < points.length; index++)
            pathValue += points[index].rowIndex !== points[index - 1].rowIndex + 1 ? ` M ${points[index].x} ${points[index].y}` : ` L ${points[index].x} ${points[index].y}`;
        return pathValue;
    }

    getAreaPath(points, baseY) {
        if (points.length === 0)
            return "";
        let pathValue = `M ${points[0].x} ${baseY}`;
        for (let index = 0; index < points.length; index++)
            pathValue += ` L ${points[index].x} ${points[index].y}`;
        pathValue += ` L ${points[points.length - 1].x} ${baseY} Z`;
        return pathValue;
    }

    updateTitleClipRects(layout, height) {
        const titlePadding = 10;
        const xTitleClipTop = Math.max(0, layout.plotBottom - titlePadding);
        this.xTitleClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.xTitleClipRect.setAttribute("y", `${xTitleClipTop}`);
        this.xTitleClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.xTitleClipRect.setAttribute("height", `${Math.max(0, height - xTitleClipTop)}`);
        this.yTitleClipRect.setAttribute("x", "0");
        this.yTitleClipRect.setAttribute("y", `${Math.max(0, layout.plotTop - titlePadding)}`);
        this.yTitleClipRect.setAttribute("width", `${layout.plotLeft + titlePadding}`);
        this.yTitleClipRect.setAttribute("height", `${layout.plotHeight + titlePadding * 2}`);
    }

    renderTitles(layout, width, height) {
        this.updateTitleClipRects(layout, height);
        const titleFontSize = Number(this.options.titleFontSize) || 16;
        const argTitle = this.options.argumentTitle;
        if (argTitle?.termLatex) {
            const hostGroup = this.createSvgElement("g");
            hostGroup.setAttribute("clip-path", `url(#${this.xTitleClipId})`);
            this.axisLayer.appendChild(hostGroup);
            const totalWidth = Utils.estimateCaseTermWidth(argTitle.caseNumber, argTitle.termLatex, titleFontSize);
            const startX = layout.plotLeft + layout.plotWidth / 2 - totalWidth / 2;
            Utils.appendCaseTermSvg(hostGroup, startX, layout.axisTitleX, titleFontSize, this.options.foregroundColor, argTitle.caseNumber, argTitle.termLatex);
        }
        this.renderValueTitleLegend(this.axisLayer, layout, titleFontSize, this.yTitleClipId);
        this.appendSvgMarkup(this.axisLayer, `
            <rect x="0" y="0" width="${width}" height="${layout.plotBottom + 22}" fill="none" stroke="none" />
        `);
    }

    renderFocus() {
        this.clearLayer(this.focusLayer);
        if (!this.renderState)
            return;
        if (!Number.isFinite(this.focusArgumentValue))
            return;
        const layout = this.renderState.layout;
        const xScale = this.renderState.xScale;
        const yScale = this.renderState.yScale;
        const focusX = xScale(this.focusArgumentValue);
        if (!Number.isFinite(focusX))
            return;
        if (focusX < layout.plotLeft || focusX > layout.plotRight)
            return;
        const focusPoints = this.collectFocusPoints(xScale, yScale);
        const topY = focusPoints.length > 0
            ? Math.min(...focusPoints.map(p => p.yPosition))
            : layout.plotBottom;
        let focusMarkup = `
            <line class="chart-focus-reference-line" x1="${focusX}" y1="${topY}" x2="${focusX}" y2="${layout.plotBottom}" stroke="#949494" stroke-width="1.4" stroke-dasharray="4 3" />
        `;
        for (const point of focusPoints) {
            focusMarkup += `
                <line class="chart-focus-reference-line" x1="${layout.plotLeft}" y1="${point.yPosition}" x2="${point.xPosition}" y2="${point.yPosition}" stroke="#949494" stroke-width="1.4" stroke-dasharray="4 3" />
            `;
        }
        this.appendSvgMarkup(this.focusLayer, focusMarkup);
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++)
            this.renderFocusMarker(seriesIndex, xScale, yScale);
        this.renderTangent(xScale, yScale);
    }

    collectFocusPoints(xScale, yScale) {
        const points = [];
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++) {
            const series = this.renderState.series[seriesIndex];
            const nearestPoint = this.getNearestSeriesPoint(series, this.focusArgumentValue);
            if (!nearestPoint)
                continue;
            const xPosition = xScale(nearestPoint.xValue);
            const yPosition = yScale(nearestPoint.yValue);
            if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition))
                continue;
            points.push({ xPosition, yPosition });
        }
        return points;
    }

    getFocusPositions() {
        if (!this.renderState || !Number.isFinite(this.focusArgumentValue))
            return [];
        const xScale = this.renderState.xScale;
        const yScale = this.renderState.yScale;
        const layout = this.renderState.layout;
        const positions = [];
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++) {
            const series = this.renderState.series[seriesIndex];
            const nearestPoint = this.getNearestSeriesPoint(series, this.focusArgumentValue);
            if (!nearestPoint) {
                positions.push(null);
                continue;
            }
            const xPosition = xScale(nearestPoint.xValue);
            const yPosition = yScale(nearestPoint.yValue);
            if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition) || yPosition < layout.plotTop || yPosition > layout.plotBottom) {
                positions.push(null);
                continue;
            }
            positions.push({ x: xPosition, y: yPosition });
        }
        return positions;
    }

    renderFocusMarker(seriesIndex, xScale, yScale) {
        const series = this.renderState.series[seriesIndex];
        const nearestPoint = this.getNearestSeriesPoint(series, this.focusArgumentValue);
        if (!nearestPoint)
            return;
        const xPosition = xScale(nearestPoint.xValue);
        const yPosition = yScale(nearestPoint.yValue);
        if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition))
            return;
        let markerMarkup = `
            <circle cx="${xPosition}" cy="${yPosition}" r="3.5" fill="${series.color}" stroke="#ffffff" stroke-width="1" />
        `;
        this.appendSvgMarkup(this.focusLayer, markerMarkup);
    }

    getNearestSeriesPoint(series, focusArgumentValue) {
        let nearestPoint = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const row = this.dataRows[rowIndex];
            const rawXValue = this.getNumericValue(row, this.renderState.argumentField);
            const rawYValue = this.getNumericValue(row, series.valueField);
            if (rawXValue == null || rawYValue == null)
                continue;
            const distance = Math.abs(rawXValue - focusArgumentValue);
            if (distance >= nearestDistance)
                continue;
            nearestDistance = distance;
            nearestPoint = { xValue: rawXValue, yValue: rawYValue };
        }
        return nearestPoint;
    }

    getTangentAtFocusPoint(series) {
        const argumentField = this.renderState.argumentField;
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const rawXValue = this.getNumericValue(this.dataRows[rowIndex], argumentField);
            const rawYValue = this.getNumericValue(this.dataRows[rowIndex], series.valueField);
            if (rawXValue == null || rawYValue == null)
                continue;
            const distance = Math.abs(rawXValue - this.focusArgumentValue);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = rowIndex;
            }
        }
        if (nearestIndex < 0)
            return null;
        const currentRow = this.dataRows[nearestIndex];
        const rawCurrentX = this.getNumericValue(currentRow, argumentField);
        const rawCurrentY = this.getNumericValue(currentRow, series.valueField);
        if (rawCurrentX == null || rawCurrentY == null)
            return null;
        const currentX = rawCurrentX;
        const currentY = rawCurrentY;
        let prevX = null, prevY = null, nextX = null, nextY = null;
        for (let i = nearestIndex - 1; i >= 0; i--) {
            const rawX = this.getNumericValue(this.dataRows[i], argumentField);
            const rawY = this.getNumericValue(this.dataRows[i], series.valueField);
            if (rawX != null && rawY != null) {
                prevX = rawX;
                prevY = rawY;
                break;
            }
        }
        for (let i = nearestIndex + 1; i < this.dataRows.length; i++) {
            const rawX = this.getNumericValue(this.dataRows[i], argumentField);
            const rawY = this.getNumericValue(this.dataRows[i], series.valueField);
            if (rawX != null && rawY != null) {
                nextX = rawX;
                nextY = rawY;
                break;
            }
        }
        let slope;
        if (prevX != null && nextX != null)
            slope = (nextY - prevY) / (nextX - prevX);
        else if (nextX != null)
            slope = (nextY - currentY) / (nextX - currentX);
        else if (prevX != null)
            slope = (currentY - prevY) / (currentX - prevX);
        else
            return null;
        if (!Number.isFinite(slope))
            return null;
        return { xValue: currentX, yValue: currentY, slope: slope };
    }

    renderTangent(xScale, yScale) {
        const tangentColor = this.options.tangentColor;
        if (!tangentColor || tangentColor === "" || tangentColor === "transparent" || tangentColor === "#00000000")
            return;
        const domain = this.renderState.domain;
        const deltaX = (domain.xMax - domain.xMin) * 0.12;
        let tangentMarkup = "";
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++) {
            const series = this.renderState.series[seriesIndex];
            const tangent = this.getTangentAtFocusPoint(series);
            if (!tangent)
                continue;
            const deltaY = tangent.slope * deltaX;
            const pointX = xScale(tangent.xValue);
            const pointY = yScale(tangent.yValue);
            const startX = xScale(tangent.xValue - deltaX);
            const startY = yScale(tangent.yValue - deltaY);
            const endX = xScale(tangent.xValue + deltaX);
            const endY = yScale(tangent.yValue + deltaY);
            tangentMarkup += `
                <polygon points="${startX},${startY} ${endX},${startY} ${endX},${endY}" fill="${tangentColor}" fill-opacity="0.25" stroke="none" />
                <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${tangentColor}" stroke-width="1.5" />
                <line x1="${startX}" y1="${startY}" x2="${endX}" y2="${startY}" stroke="${tangentColor}" stroke-width="1.2" stroke-dasharray="4 3" />
                <line x1="${endX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="${tangentColor}" stroke-width="1.2" stroke-dasharray="4 3" />
            `;
        }
        this.appendSvgMarkup(this.focusLayer, tangentMarkup);
    }

    renderTickHitAreas(layout, xScale, yScale, xTicks, yTicks) {
        for (let index = 0; index < xTicks.length; index++) {
            const xValue = xTicks[index];
            const xPosition = xScale(xValue);
            const hitArea = this.createSvgElement("rect");
            hitArea.setAttribute("x", `${xPosition - 12}`);
            hitArea.setAttribute("y", `${layout.plotBottom}`);
            hitArea.setAttribute("width", "24");
            hitArea.setAttribute("height", "24");
            hitArea.setAttribute("fill", "transparent");
            hitArea.setAttribute("class", "chart-tick-handle chart-tick-handle-x");
            hitArea.dataset.axis = "x";
            hitArea.dataset.index = index;
            hitArea.dataset.value = xValue;
            hitArea.addEventListener("pointerdown", e => this.onTickPointerDown(e, hitArea));
            this.tickInteractionLayer.appendChild(hitArea);
        }
        for (let index = 0; index < yTicks.length; index++) {
            const yValue = yTicks[index];
            const yPosition = yScale(yValue);
            const hitArea = this.createSvgElement("rect");
            hitArea.setAttribute("x", `${layout.plotLeft - 40}`);
            hitArea.setAttribute("y", `${yPosition - 10}`);
            hitArea.setAttribute("width", "40");
            hitArea.setAttribute("height", "20");
            hitArea.setAttribute("fill", "transparent");
            hitArea.setAttribute("class", "chart-tick-handle chart-tick-handle-y");
            hitArea.dataset.axis = "y";
            hitArea.dataset.index = index;
            hitArea.dataset.value = yValue;
            hitArea.addEventListener("pointerdown", e => this.onTickPointerDown(e, hitArea));
            this.tickInteractionLayer.appendChild(hitArea);
        }
    }

    onTickPointerDown(event, hitArea) {
        if (this.options.interactable === false)
            return;
        event.stopPropagation();
        event.preventDefault();
        const axis = hitArea.dataset.axis;
        const tickValue = Number(hitArea.dataset.value);
        const state = this.renderState;
        if (!state)
            return;
        const scale = axis === "x" ? state.xScale : state.yScale;
        const startPixel = scale(tickValue);
        const layout = state.layout;
        const domain = state.domain;
        const axisStartPixel = axis === "x" ? layout.plotLeft : layout.plotBottom;
        const baseValue = axis === "x" ? domain.xMin : domain.yMin;
        const tickOffsetValue = tickValue - baseValue;
        const tickOffsetPixel = axis === "x" ? startPixel - axisStartPixel : axisStartPixel - startPixel;
        const axisLength = axis === "x" ? layout.plotWidth : layout.plotHeight;
        const started = this._axisTickDrag.start(event, {
            tickOffsetValue,
            tickOffsetPixel,
            getPixelOffset: e => {
                // Absolute cursor position in local coords (transform-correct), the
                // same approach the referential and ruler use, so the tick tracks
                // the cursor exactly under any board zoom/pan.
                const point = this.getLocalPointerPoint(e);
                if (!point) return NaN;
                return axis === "x" ? point.x - axisStartPixel : axisStartPixel - point.y;
            },
            onMove: newScale => {
                if (axis === "x") {
                    this.domainOverride.xMin = baseValue;
                    this.domainOverride.xMax = baseValue + newScale * axisLength;
                } else {
                    this.domainOverride.yMin = baseValue;
                    this.domainOverride.yMax = baseValue + newScale * axisLength;
                }
                this.render();
            },
            onEnd: () => {
                if (typeof this.options.onTickDragEnded === "function")
                    this.options.onTickDragEnded();
                if (typeof this.options.onDomainChanged === "function")
                    this.options.onDomainChanged({ ...this.domainOverride });
            }
        });
        if (started) {
            this._pinnedTickValues[axis] = tickValue;
            if (typeof this.options.onTickDragStarted === "function")
                this.options.onTickDragStarted();
        }
    }

    getLocalPointerPoint(event) {
        const svgRoot = this.rootElement.closest("svg");
        if (!svgRoot)
            return null;
        const screenTransformMatrix = this.rootElement.getScreenCTM();
        if (!screenTransformMatrix)
            return null;
        const point = svgRoot.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        return point.matrixTransform(screenTransformMatrix.inverse());
    }

    clampToPlotBounds(value, minimum, maximum) {
        if (!Number.isFinite(value))
            return minimum;
        if (value < minimum)
            return minimum;
        if (value > maximum)
            return maximum;
        return value;
    }

    renderZoomSelectionRectangle(zoomDragState) {
        this.clearLayer(this.zoomLayer);
        const left = Math.min(zoomDragState.startX, zoomDragState.currentX);
        const right = Math.max(zoomDragState.startX, zoomDragState.currentX);
        const top = Math.min(zoomDragState.startY, zoomDragState.currentY);
        const bottom = Math.max(zoomDragState.startY, zoomDragState.currentY);
        this.appendSvgMarkup(this.zoomLayer, `
            <rect x="${left}" y="${top}" width="${Math.max(0, right - left)}" height="${Math.max(0, bottom - top)}" fill="${this.options.foregroundColor}" fill-opacity="0.12" stroke="${this.options.foregroundColor}" stroke-width="1.2" stroke-dasharray="5 4" />
        `);
    }

    onZoomPointerDown(event) {
        if (event.button !== 0)
            return;
        if (this.options.interactable === false)
            return;
        event.stopPropagation();
        event.preventDefault();
        if (this._axisTickDrag.isDragging)
            return;
        const state = this.renderState;
        if (!state)
            return;
        const localPoint = this.getLocalPointerPoint(event);
        if (!localPoint)
            return;
        const layout = state.layout;
        if (localPoint.x < layout.plotLeft || localPoint.x > layout.plotRight || localPoint.y < layout.plotTop || localPoint.y > layout.plotBottom)
            return;
        const startX = this.clampToPlotBounds(localPoint.x, layout.plotLeft, layout.plotRight);
        const startY = this.clampToPlotBounds(localPoint.y, layout.plotTop, layout.plotBottom);
        this._zoomDragState = {
            pointerId: event.pointerId,
            layout: layout,
            domain: state.domain,
            startX: startX,
            startY: startY,
            currentX: startX,
            currentY: startY,
            isDragging: false
        };
        this.clearCrosshair();
        window.addEventListener("pointermove", this._onZoomPointerMove);
        window.addEventListener("pointerup", this._onZoomPointerUp);
        window.addEventListener("pointercancel", this._onZoomPointerUp);
    }

    onZoomPointerMove(event) {
        const zoomDragState = this._zoomDragState;
        if (!zoomDragState)
            return;
        if (event.pointerId !== zoomDragState.pointerId)
            return;
        event.preventDefault();
        const localPoint = this.getLocalPointerPoint(event);
        if (!localPoint)
            return;
        zoomDragState.currentX = this.clampToPlotBounds(localPoint.x, zoomDragState.layout.plotLeft, zoomDragState.layout.plotRight);
        zoomDragState.currentY = this.clampToPlotBounds(localPoint.y, zoomDragState.layout.plotTop, zoomDragState.layout.plotBottom);
        if (!zoomDragState.isDragging) {
            const deltaX = Math.abs(zoomDragState.currentX - zoomDragState.startX);
            const deltaY = Math.abs(zoomDragState.currentY - zoomDragState.startY);
            if (deltaX < 3 && deltaY < 3)
                return;
            zoomDragState.isDragging = true;
            if (typeof this.options.onTickDragStarted === "function")
                this.options.onTickDragStarted();
        }
        this.renderZoomSelectionRectangle(zoomDragState);
    }

    onZoomPointerUp(event) {
        const zoomDragState = this._zoomDragState;
        if (!zoomDragState)
            return;
        if (event.pointerId !== zoomDragState.pointerId)
            return;
        event.stopPropagation();
        event.preventDefault();
        window.removeEventListener("pointermove", this._onZoomPointerMove);
        window.removeEventListener("pointerup", this._onZoomPointerUp);
        window.removeEventListener("pointercancel", this._onZoomPointerUp);
        this._zoomDragState = null;
        this.clearLayer(this.zoomLayer);
        if (zoomDragState.isDragging && typeof this.options.onTickDragEnded === "function")
            this.options.onTickDragEnded();
        if (!zoomDragState.isDragging) {
            this.onPlotClick(zoomDragState.currentX, zoomDragState.currentY);
            return;
        }
        const left = Math.min(zoomDragState.startX, zoomDragState.currentX);
        const right = Math.max(zoomDragState.startX, zoomDragState.currentX);
        const top = Math.min(zoomDragState.startY, zoomDragState.currentY);
        const bottom = Math.max(zoomDragState.startY, zoomDragState.currentY);
        if (right - left < 8 || bottom - top < 8)
            return;
        const domain = zoomDragState.domain;
        const layout = zoomDragState.layout;
        const horizontalRange = domain.xMax - domain.xMin;
        const verticalRange = domain.yMax - domain.yMin;
        const xMin = domain.xMin + (left - layout.plotLeft) / layout.plotWidth * horizontalRange;
        const xMax = domain.xMin + (right - layout.plotLeft) / layout.plotWidth * horizontalRange;
        const yMin = domain.yMin + (layout.plotBottom - bottom) / layout.plotHeight * verticalRange;
        const yMax = domain.yMin + (layout.plotBottom - top) / layout.plotHeight * verticalRange;
        if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || !Number.isFinite(yMin) || !Number.isFinite(yMax))
            return;
        this.domainOverride.xMin = Math.min(xMin, xMax);
        this.domainOverride.xMax = Math.max(xMin, xMax);
        this.domainOverride.yMin = Math.min(yMin, yMax);
        this.domainOverride.yMax = Math.max(yMin, yMax);
        this.render();
        if (typeof this.options.onDomainChanged === "function")
            this.options.onDomainChanged({ ...this.domainOverride });
    }

    resetDomainOverride() {
        this.domainOverride = { xMin: null, xMax: null, yMin: null, yMax: null };
        this._pinnedTickValues = { x: null, y: null };
        this.render();
    }

    getDataPointFromPlotPoint(plotX, plotY) {
        const state = this.renderState;
        if (!state)
            return null;
        const layout = state.layout;
        if (plotX < layout.plotLeft || plotX > layout.plotRight || plotY < layout.plotTop || plotY > layout.plotBottom)
            return null;
        const domain = state.domain;
        const dataX = domain.xMin + (plotX - layout.plotLeft) / layout.plotWidth * (domain.xMax - domain.xMin);
        const dataY = domain.yMin + (layout.plotBottom - plotY) / layout.plotHeight * (domain.yMax - domain.yMin);
        if (!Number.isFinite(dataX) || !Number.isFinite(dataY))
            return null;
        return { x: dataX, y: dataY };
    }

    onPlotClick(plotX, plotY) {
        const now = Date.now();
        const previousClick = this._lastPlotClick;
        this._lastPlotClick = { time: now, x: plotX, y: plotY };
        if (!previousClick)
            return;
        if (now - previousClick.time > 400)
            return;
        if (Math.abs(plotX - previousClick.x) > 8 || Math.abs(plotY - previousClick.y) > 8)
            return;
        this._lastPlotClick = null;
        const dataPoint = this.getDataPointFromPlotPoint(plotX, plotY);
        if (!dataPoint)
            return;
        if (typeof this.options.onDataAreaDoubleClick === "function")
            this.options.onDataAreaDoubleClick(dataPoint.x, dataPoint.y);
    }

    renderCrosshairHitArea(layout) {
        const hitArea = this.createSvgElement("rect");
        hitArea.setAttribute("x", `${layout.plotLeft}`);
        hitArea.setAttribute("y", `${layout.plotTop}`);
        hitArea.setAttribute("width", `${layout.plotWidth}`);
        hitArea.setAttribute("height", `${layout.plotHeight}`);
        hitArea.setAttribute("fill", "transparent");
        hitArea.setAttribute("style", "pointer-events: all");
        hitArea.addEventListener("pointerdown", e => this.onZoomPointerDown(e));
        hitArea.addEventListener("pointermove", e => this.onCrosshairPointerMove(e));
        hitArea.addEventListener("pointerleave", () => this.clearCrosshair());
        this.crosshairInteractionLayer.appendChild(hitArea);
    }

    onCrosshairPointerMove(event) {
        if (this._axisTickDrag.isDragging)
            return;
        if (this._zoomDragState)
            return;
        const state = this.renderState;
        if (!state)
            return;
        const localPoint = this.getLocalPointerPoint(event);
        if (!localPoint)
            return;
        const mouseX = localPoint.x;
        const mouseY = localPoint.y;
        if (mouseX < state.layout.plotLeft || mouseX > state.layout.plotRight || mouseY < state.layout.plotTop || mouseY > state.layout.plotBottom) {
            this.clearCrosshair();
            return;
        }
        const domain = state.domain;
        const layout = state.layout;
        const dataX = domain.xMin + (mouseX - layout.plotLeft) / layout.plotWidth * (domain.xMax - domain.xMin);
        const dataY = domain.yMax - (mouseY - layout.plotTop) / layout.plotHeight * (domain.yMax - domain.yMin);
        this.renderCrosshair(dataX, dataY, mouseY);
    }

    clearCrosshair() {
        this.clearLayer(this.crosshairLayer);
    }

    renderCrosshair(argumentValue, valueY, mouseY) {
        this.clearLayer(this.crosshairLayer);
        const state = this.renderState;
        if (!state)
            return;
        const layout = state.layout;
        const xScale = state.xScale;
        const yScale = state.yScale;
        const crosshairX = xScale(argumentValue);
        if (!Number.isFinite(crosshairX))
            return;
        if (crosshairX < layout.plotLeft || crosshairX > layout.plotRight)
            return;
        const crosshairColor = Utils.getContrastColor(this.options.backgroundColor);
        const coordinateBackgroundColor = this.options.axisColor;
        const coordinateTextColor = Utils.getContrastColor(coordinateBackgroundColor);
        const firstSeries = state.series.length > 0 ? this.getNearestSeriesPoint(state.series[0], argumentValue) : null;
        const snappedX = firstSeries ? firstSeries.xValue : argumentValue;
        const axisLabelX = xScale(snappedX);
        const axisLabelText = this.formatArgumentValue(snappedX);
        const coordinateText = `${this.formatArgumentValue(argumentValue)}, ${this.formatCrosshairValue(valueY)}`;
        let crosshairMarkup = `
            ${Utils.crosshairLineSvgMarkup(crosshairX, layout.plotTop, crosshairX, layout.plotBottom, crosshairColor)}
            ${Utils.crosshairLineSvgMarkup(layout.plotLeft, mouseY, layout.plotRight, mouseY, crosshairColor)}
            ${Utils.valueBadgeSvgMarkup(axisLabelText, axisLabelX, layout.plotBottom + 12, { fontSize: 10, fontFamily: this.options.fontFamily, backgroundColor: this.options.foregroundColor })}
            ${Utils.valueBadgeSvgMarkup(coordinateText, crosshairX, mouseY - 12, { fontSize: 10, fontFamily: this.options.fontFamily, backgroundColor: coordinateBackgroundColor, textColor: coordinateTextColor })}
        `;
        for (let seriesIndex = 0; seriesIndex < state.series.length; seriesIndex++) {
            const series = state.series[seriesIndex];
            const nearestPoint = this.getNearestSeriesPoint(series, argumentValue);
            if (!nearestPoint)
                continue;
            const pointX = xScale(nearestPoint.xValue);
            const pointY = yScale(nearestPoint.yValue);
            if (!Number.isFinite(pointX) || !Number.isFinite(pointY))
                continue;
            if (pointY < layout.plotTop || pointY > layout.plotBottom)
                continue;
            const yLabelText = this.formatCrosshairValue(nearestPoint.yValue);
            const yLabelWidth = this.estimateTextWidth(yLabelText, 10) + 8;
            crosshairMarkup += `
                <circle cx="${pointX}" cy="${pointY}" r="4" fill="${series.color}" stroke="#ffffff" stroke-width="1.5" />
                ${Utils.valueBadgeSvgMarkup(yLabelText, layout.plotLeft - yLabelWidth / 2 - 4, pointY, { fontSize: 10, fontFamily: this.options.fontFamily, backgroundColor: series.color })}
            `;
        }
        this.appendSvgMarkup(this.crosshairLayer, crosshairMarkup);
    }
}
