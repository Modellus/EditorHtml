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
        this.caseIconData = {};
        this.caseIconsLoadingPromise = null;
        this._tickDragState = null;
        this._onPointerMove = e => this.onTickPointerMove(e);
        this._onPointerUp = e => this.onTickPointerUp(e);
        this.initializeRoot();
        this.ensureCaseIconsLoaded();
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
            borderColor: "#666666",
            foregroundColor: "#666666",
            gridColor: "#d3d3d3",
            axisColor: "#7a7a7a",
            fontFamily: "Katex_Main",
            termFontFamily: "Katex_Math",
            termFontStyle: "italic",
            termFontWeight: 400,
            iconFontFamily: "Font Awesome 7 Pro",
            equalScales: false,
            showTangent: false,
            fontSize: 13,
            titleFontSize: 16,
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
        this.backgroundLayer = this.createSvgElement("g");
        this.gridLayer = this.createSvgElement("g");
        this.gridLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.seriesLayer = this.createSvgElement("g");
        this.seriesLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.axisLayer = this.createSvgElement("g");
        this.focusLayer = this.createSvgElement("g");
        this.focusLayer.setAttribute("clip-path", `url(#${this.plotClipId})`);
        this.crosshairLayer = this.createSvgElement("g");
        this.tickInteractionLayer = this.createSvgElement("g");
        this.crosshairInteractionLayer = this.createSvgElement("g");
        this.rootElement.appendChild(this.backgroundLayer);
        this.rootElement.appendChild(this.gridLayer);
        this.rootElement.appendChild(this.seriesLayer);
        this.rootElement.appendChild(this.axisLayer);
        this.rootElement.appendChild(this.focusLayer);
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
            showLabel: item?.showLabel === true
        }));
    }

    normalizeColor(colorValue, index) {
        if (colorValue != null && String(colorValue).trim() !== "")
            return String(colorValue).trim();
        const palette = ["#1E88E5", "#E53935", "#43A047", "#FB8C00", "#8E24AA", "#00897B", "#6D4C41", "#546E7A", "#F4511E"];
        return palette[index % palette.length];
    }

    setOptions(options) {
        const normalizedOptions = options ?? {};
        this.options = {
            ...this.options,
            ...normalizedOptions,
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
            const labelWidth = this.estimateTextWidth(this.formatAxisValue(xTicks[index]), tickFontSize);
            if (labelWidth > maxXTickWidth)
                maxXTickWidth = labelWidth;
        }
        for (let index = 0; index < yTicks.length; index++) {
            const labelWidth = this.estimateTextWidth(this.formatAxisValue(yTicks[index]), tickFontSize);
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
        const numericValue = Number(row[fieldName]);
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
        this.render();
    }

    getDomain(argumentField, series, chartType) {
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
        if (chartType === "bar" || chartType === "area")
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

    buildTicks(minValue, maxValue, targetCount = 5) {
        const ticks = [];
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue >= maxValue)
            return ticks;
        const range = maxValue - minValue;
        const rawStep = range / Math.max(1, targetCount - 1);
        const exponent = Math.floor(Math.log10(rawStep));
        const magnitude = Math.pow(10, exponent);
        const normalized = rawStep / magnitude;
        let step;
        if (normalized < 1.5)
            step = magnitude;
        else if (normalized < 3)
            step = 2 * magnitude;
        else if (normalized < 7)
            step = 5 * magnitude;
        else
            step = 10 * magnitude;
        const firstTick = Math.ceil(minValue / step) * step;
        for (let value = firstTick; value <= maxValue + step * 0.001; value += step)
            ticks.push(Math.round(value * 1e10) / 1e10);
        return ticks;
    }

    formatAxisValue(value) {
        if (!Number.isFinite(value))
            return "";
        const absoluteValue = Math.abs(value);
        if (absoluteValue >= 10000 || (absoluteValue > 0 && absoluteValue < 0.001))
            return value.toExponential(2);
        const roundedValue = Math.round(value * 1000) / 1000;
        return String(roundedValue);
    }

    isCaseIconCharacter(character) {
        if (!character || character.length === 0)
            return false;
        const codePoint = character.codePointAt(0);
        if (!Number.isFinite(codePoint))
            return false;
        return codePoint >= 0xe256 && codePoint <= 0xe25e;
    }

    getCaseIconNumberFromCharacter(character) {
        if (!this.isCaseIconCharacter(character))
            return null;
        return character.codePointAt(0) - 0xe255;
    }

    parseCaseIconSegments(textValue) {
        const value = String(textValue ?? "");
        const segments = [];
        if (value === "")
            return segments;
        let textBuffer = "";
        for (let index = 0; index < value.length; index++) {
            const character = value[index];
            const caseNumber = this.getCaseIconNumberFromCharacter(character);
            if (caseNumber == null) {
                textBuffer += character;
                continue;
            }
            if (textBuffer !== "") {
                segments.push({ type: "text", value: textBuffer });
                textBuffer = "";
            }
            segments.push({ type: "icon", caseNumber: caseNumber, rawValue: character });
        }
        if (textBuffer !== "")
            segments.push({ type: "text", value: textBuffer });
        return segments;
    }

    getCaseIconAssetPath(caseNumber) {
        return `libraries/fontawesome/svgs/solid/square-${caseNumber}.svg`;
    }

    ensureCaseIconsLoaded() {
        if (this.caseIconsLoadingPromise)
            return this.caseIconsLoadingPromise;
        this.caseIconsLoadingPromise = this.loadCaseIcons();
        return this.caseIconsLoadingPromise;
    }

    async loadCaseIcons() {
        const loaders = [];
        for (let caseNumber = 1; caseNumber <= 9; caseNumber++)
            loaders.push(this.loadCaseIcon(caseNumber));
        await Promise.all(loaders);
        this.render();
    }

    async loadCaseIcon(caseNumber) {
        const iconPath = this.getCaseIconAssetPath(caseNumber);
        try {
            const response = await fetch(iconPath);
            if (!response.ok)
                return;
            const svgText = await response.text();
            const parser = new DOMParser();
            const document = parser.parseFromString(svgText, "image/svg+xml");
            const svgElement = document.querySelector("svg");
            const pathElement = document.querySelector("path");
            const pathData = pathElement?.getAttribute("d");
            if (!pathData)
                return;
            const viewBox = this.parseViewBox(svgElement?.getAttribute("viewBox"));
            this.caseIconData[caseNumber] = {
                width: viewBox.width,
                height: viewBox.height,
                pathData: pathData
            };
        } catch (_) {
        }
    }

    parseViewBox(viewBoxText) {
        const rawValue = String(viewBoxText ?? "").trim();
        if (rawValue === "")
            return { width: 448, height: 512 };
        const values = rawValue.split(/\s+/).map(value => Number(value));
        if (values.length !== 4)
            return { width: 448, height: 512 };
        const width = Number(values[2]);
        const height = Number(values[3]);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
            return { width: 448, height: 512 };
        return { width: width, height: height };
    }

    getCaseIconSize(caseNumber, fontSize) {
        const iconData = this.caseIconData[caseNumber];
        const baseHeight = fontSize * 0.9;
        const iconWidth = iconData?.width ?? 448;
        const iconHeight = iconData?.height ?? 512;
        const ratio = iconWidth / iconHeight;
        return {
            width: baseHeight * ratio,
            height: baseHeight
        };
    }

    estimateTitleSegmentsWidth(segments, fontSize) {
        let totalWidth = 0;
        for (let index = 0; index < segments.length; index++) {
            const segment = segments[index];
            if (segment.type === "icon") {
                totalWidth += this.getCaseIconSize(segment.caseNumber, fontSize).width;
                continue;
            }
            totalWidth += this.estimateTextWidth(segment.value, fontSize);
        }
        return totalWidth;
    }

    renderTitleTextSegment(layer, xPosition, yPosition, fontSize, fill, textValue) {
        const textElement = this.createSvgElement("text");
        textElement.setAttribute("x", `${xPosition}`);
        textElement.setAttribute("y", `${yPosition}`);
        textElement.setAttribute("fill", fill);
        textElement.setAttribute("font-family", this.options.termFontFamily);
        textElement.setAttribute("font-style", `${this.options.termFontStyle}`);
        textElement.setAttribute("font-weight", `${this.options.termFontWeight}`);
        textElement.setAttribute("font-size", `${fontSize}`);
        textElement.textContent = Utils.convertGreekLetters(textValue);
        layer.appendChild(textElement);
    }

    renderTitleIconSegment(layer, xPosition, yPosition, fontSize, fill, caseNumber, fallbackCharacter) {
        const size = this.getCaseIconSize(caseNumber, fontSize);
        const iconData = this.caseIconData[caseNumber];
        const caseIconColor = TermControl.getCaseIconColor(caseNumber);
        if (!iconData?.pathData) {
            const fallbackText = this.createSvgElement("text");
            fallbackText.setAttribute("x", `${xPosition}`);
            fallbackText.setAttribute("y", `${yPosition}`);
            fallbackText.setAttribute("fill", caseIconColor);
            fallbackText.setAttribute("font-family", this.options.iconFontFamily);
            fallbackText.setAttribute("font-style", "normal");
            fallbackText.setAttribute("font-weight", "900");
            fallbackText.setAttribute("font-size", `${fontSize}`);
            fallbackText.textContent = fallbackCharacter;
            layer.appendChild(fallbackText);
            return;
        }
        const scaleX = size.width / iconData.width;
        const scaleY = size.height / iconData.height;
        const topY = yPosition - size.height * 0.82;
        const iconGroup = this.createSvgElement("g");
        iconGroup.setAttribute("transform", `translate(${xPosition} ${topY}) scale(${scaleX} ${scaleY})`);
        const iconPath = this.createSvgElement("path");
        iconPath.setAttribute("d", iconData.pathData);
        iconPath.setAttribute("fill", caseIconColor);
        iconGroup.appendChild(iconPath);
        layer.appendChild(iconGroup);
    }

    renderTitleWithCaseIcons(targetLayer, textValue, centerX, centerY, fontSize, fill, rotation = null) {
        const segments = this.parseCaseIconSegments(textValue);
        if (segments.length === 0)
            return;
        const hostGroup = this.createSvgElement("g");
        if (rotation)
            hostGroup.setAttribute("transform", `rotate(${rotation.angle} ${rotation.cx} ${rotation.cy})`);
        targetLayer.appendChild(hostGroup);
        const totalWidth = this.estimateTitleSegmentsWidth(segments, fontSize);
        let cursorX = centerX - totalWidth / 2;
        for (let index = 0; index < segments.length; index++) {
            const segment = segments[index];
            if (segment.type === "icon") {
                this.renderTitleIconSegment(hostGroup, cursorX, centerY, fontSize, fill, segment.caseNumber, segment.rawValue);
                cursorX += this.getCaseIconSize(segment.caseNumber, fontSize).width;
                continue;
            }
            this.renderTitleTextSegment(hostGroup, cursorX, centerY, fontSize, fill, segment.value);
            cursorX += this.estimateTextWidth(segment.value, fontSize);
        }
    }

    renderValueTitleLegend(targetLayer, layout, fontSize) {
        const series = this.options.series;
        if (!series || series.length === 0)
            return;
        const foregroundColor = this.options.foregroundColor;
        const separatorText = ", ";
        let totalWidth = 0;
        const entries = [];
        for (let index = 0; index < series.length; index++) {
            if (index > 0) {
                const separatorWidth = this.estimateTextWidth(separatorText, fontSize);
                entries.push({ type: "separator", width: separatorWidth });
                totalWidth += separatorWidth;
            }
            const segments = this.parseCaseIconSegments(series[index].name ?? "");
            const segmentsWidth = this.estimateTitleSegmentsWidth(segments, fontSize);
            entries.push({ type: "series", segments: segments, color: series[index].color || foregroundColor, width: segmentsWidth });
            totalWidth += segmentsWidth;
        }
        const centerX = layout.axisTitleLeft;
        const centerY = layout.axisTitleY;
        const hostGroup = this.createSvgElement("g");
        hostGroup.setAttribute("transform", `rotate(-90 ${centerX} ${centerY})`);
        targetLayer.appendChild(hostGroup);
        let cursorX = centerX - totalWidth / 2;
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            if (entry.type === "separator") {
                this.renderTitleTextSegment(hostGroup, cursorX, centerY, fontSize, foregroundColor, separatorText);
                cursorX += entry.width;
                continue;
            }
            for (let segmentIndex = 0; segmentIndex < entry.segments.length; segmentIndex++) {
                const segment = entry.segments[segmentIndex];
                if (segment.type === "icon") {
                    this.renderTitleIconSegment(hostGroup, cursorX, centerY, fontSize, entry.color, segment.caseNumber, segment.rawValue);
                    cursorX += this.getCaseIconSize(segment.caseNumber, fontSize).width;
                    continue;
                }
                this.renderTitleTextSegment(hostGroup, cursorX, centerY, fontSize, entry.color, segment.value);
                cursorX += this.estimateTextWidth(segment.value, fontSize);
            }
        }
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
        this.clearLayer(this.crosshairLayer);
        this.clearLayer(this.tickInteractionLayer);
        this.clearLayer(this.crosshairInteractionLayer);
        this.renderState = null;
        if (width <= 2 || height <= 2)
            return;
        this.renderBackground(width, height);
        const rawDomain = this.getDomain(this.options.argumentField, this.options.series, this.options.chartType);
        const preliminaryTicks = this.buildTicks(rawDomain.xMin, rawDomain.xMax, 5);
        const preliminaryYTicks = this.buildTicks(rawDomain.yMin, rawDomain.yMax, 5);
        const preliminaryLayout = this.getLayout(width, height, preliminaryTicks, preliminaryYTicks);
        const domain = this.options.equalScales
            ? this.equalizeDomain(rawDomain, preliminaryLayout.plotWidth, preliminaryLayout.plotHeight)
            : rawDomain;
        const xTicks = this.buildTicks(domain.xMin, domain.xMax, 5);
        const yTicks = this.buildTicks(domain.yMin, domain.yMax, 5);
        const layout = this.getLayout(width, height, xTicks, yTicks);
        this.plotClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.plotClipRect.setAttribute("y", `${layout.plotTop}`);
        this.plotClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.plotClipRect.setAttribute("height", `${layout.plotHeight}`);
        const scales = this.getScales(layout, domain);
        this.renderGrid(layout, scales.xScale, scales.yScale, xTicks, yTicks);
        this.renderAxes(layout, scales.xScale, scales.yScale, xTicks, yTicks);
        this.renderSeries(layout, scales.xScale, scales.yScale);
        this.renderTitles(layout, width);
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
        const rectangle = this.createSvgElement("rect");
        rectangle.setAttribute("x", "0");
        rectangle.setAttribute("y", "0");
        rectangle.setAttribute("width", `${width}`);
        rectangle.setAttribute("height", `${height}`);
        rectangle.setAttribute("fill", this.options.backgroundColor);
        rectangle.setAttribute("stroke", this.options.borderColor);
        rectangle.setAttribute("stroke-width", "1");
        this.backgroundLayer.appendChild(rectangle);
    }

    renderGrid(layout, xScale, yScale, xTicks, yTicks) {
        for (let index = 0; index < xTicks.length; index++) {
            const xValue = xTicks[index];
            const xPosition = xScale(xValue);
            const line = this.createSvgElement("line");
            line.setAttribute("x1", `${xPosition}`);
            line.setAttribute("y1", `${layout.plotTop}`);
            line.setAttribute("x2", `${xPosition}`);
            line.setAttribute("y2", `${layout.plotBottom}`);
            line.setAttribute("stroke", this.options.gridColor);
            line.setAttribute("stroke-width", "1");
            this.gridLayer.appendChild(line);
        }
        for (let index = 0; index < yTicks.length; index++) {
            const yValue = yTicks[index];
            const yPosition = yScale(yValue);
            const line = this.createSvgElement("line");
            line.setAttribute("x1", `${layout.plotLeft}`);
            line.setAttribute("y1", `${yPosition}`);
            line.setAttribute("x2", `${layout.plotRight}`);
            line.setAttribute("y2", `${yPosition}`);
            line.setAttribute("stroke", this.options.gridColor);
            line.setAttribute("stroke-width", "1");
            this.gridLayer.appendChild(line);
        }
    }

    renderAxes(layout, xScale, yScale, xTicks, yTicks) {
        const verticalAxis = this.createSvgElement("line");
        verticalAxis.setAttribute("x1", `${layout.plotLeft}`);
        verticalAxis.setAttribute("y1", `${layout.plotTop}`);
        verticalAxis.setAttribute("x2", `${layout.plotLeft}`);
        verticalAxis.setAttribute("y2", `${layout.plotBottom}`);
        verticalAxis.setAttribute("stroke", this.options.axisColor);
        verticalAxis.setAttribute("stroke-width", "1.2");
        this.axisLayer.appendChild(verticalAxis);
        const horizontalAxis = this.createSvgElement("line");
        horizontalAxis.setAttribute("x1", `${layout.plotLeft}`);
        horizontalAxis.setAttribute("y1", `${layout.plotBottom}`);
        horizontalAxis.setAttribute("x2", `${layout.plotRight}`);
        horizontalAxis.setAttribute("y2", `${layout.plotBottom}`);
        horizontalAxis.setAttribute("stroke", this.options.axisColor);
        horizontalAxis.setAttribute("stroke-width", "1.2");
        this.axisLayer.appendChild(horizontalAxis);
        for (let index = 0; index < xTicks.length; index++)
            this.renderXAxisTick(layout, xScale, xTicks[index], index, xTicks.length);
        for (let index = 0; index < yTicks.length; index++)
            this.renderYAxisTick(layout, yScale, yTicks[index]);
    }

    renderXAxisTick(layout, xScale, xValue, tickIndex, totalTicks) {
        const xPosition = xScale(xValue);
        const tick = this.createSvgElement("line");
        tick.setAttribute("x1", `${xPosition}`);
        tick.setAttribute("y1", `${layout.plotBottom}`);
        tick.setAttribute("x2", `${xPosition}`);
        tick.setAttribute("y2", `${layout.plotBottom + 4}`);
        tick.setAttribute("stroke", this.options.axisColor);
        tick.setAttribute("stroke-width", "1");
        this.axisLayer.appendChild(tick);
        const label = this.createSvgElement("text");
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
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", `${labelX}`);
        label.setAttribute("y", `${layout.plotBottom + 18}`);
        label.setAttribute("text-anchor", anchor);
        label.setAttribute("fill", this.options.foregroundColor);
        label.setAttribute("font-family", this.options.fontFamily);
        label.setAttribute("font-size", "10");
        label.textContent = this.formatAxisValue(xValue);
        this.axisLayer.appendChild(label);
    }

    renderYAxisTick(layout, yScale, yValue) {
        const yPosition = yScale(yValue);
        const tick = this.createSvgElement("line");
        tick.setAttribute("x1", `${layout.plotLeft - 4}`);
        tick.setAttribute("y1", `${yPosition}`);
        tick.setAttribute("x2", `${layout.plotLeft}`);
        tick.setAttribute("y2", `${yPosition}`);
        tick.setAttribute("stroke", this.options.axisColor);
        tick.setAttribute("stroke-width", "1");
        this.axisLayer.appendChild(tick);
        const label = this.createSvgElement("text");
        label.setAttribute("class", "shape-tick-label");
        label.setAttribute("x", `${layout.plotLeft - 7}`);
        label.setAttribute("y", `${yPosition + 3}`);
        label.setAttribute("text-anchor", "end");
        label.setAttribute("fill", this.options.foregroundColor);
        label.setAttribute("font-family", this.options.fontFamily);
        label.setAttribute("font-size", "10");
        label.textContent = this.formatAxisValue(yValue);
        this.axisLayer.appendChild(label);
    }

    getSeriesPoints(series, xScale, yScale) {
        const points = [];
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const row = this.dataRows[rowIndex];
            const xValue = this.getNumericValue(row, this.options.argumentField);
            const yValue = this.getNumericValue(row, series.valueField);
            if (xValue == null || yValue == null)
                continue;
            points.push({
                xValue: xValue,
                yValue: yValue,
                x: xScale(xValue),
                y: yScale(yValue)
            });
        }
        return points;
    }

    getChartTypes() {
        const chartType = this.options.chartType;
        if (Array.isArray(chartType))
            return chartType;
        return [chartType];
    }

    renderSeries(layout, xScale, yScale) {
        const chartTypes = this.getChartTypes();
        if (chartTypes.includes("bar")) {
            this.renderBarSeries(layout, xScale, yScale);
            return;
        }
        const areaBaseY = Math.min(Math.max(yScale(0), layout.plotTop), layout.plotBottom);
        for (let seriesIndex = 0; seriesIndex < this.options.series.length; seriesIndex++) {
            const series = this.options.series[seriesIndex];
            const points = this.getSeriesPoints(series, xScale, yScale);
            if (points.length === 0)
                continue;
            if (chartTypes.includes("area"))
                this.renderAreaSeries(points, series.color, areaBaseY);
            else if (chartTypes.includes("line"))
                this.renderLineSeries(points, series.color);
            if (chartTypes.includes("scatter"))
                this.renderPointMarkers(points, series.color);
        }
    }

    renderLineSeries(points, color) {
        const path = this.createSvgElement("path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("d", this.getPolylinePath(points));
        this.seriesLayer.appendChild(path);
    }

    renderAreaSeries(points, color, baseY) {
        if (points.length < 2) {
            this.renderPointMarkers(points, color);
            return;
        }
        const areaPath = this.createSvgElement("path");
        areaPath.setAttribute("fill", color);
        areaPath.setAttribute("fill-opacity", "0.22");
        areaPath.setAttribute("stroke", "none");
        areaPath.setAttribute("d", this.getAreaPath(points, baseY));
        this.seriesLayer.appendChild(areaPath);
        this.renderLineSeries(points, color);
    }

    renderPointMarkers(points, color) {
        for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
            const point = points[pointIndex];
            const circle = this.createSvgElement("circle");
            circle.setAttribute("cx", `${point.x}`);
            circle.setAttribute("cy", `${point.y}`);
            circle.setAttribute("r", "3");
            circle.setAttribute("fill", color);
            this.seriesLayer.appendChild(circle);
        }
    }

    renderScatterSeries(points, color) {
        this.renderPointMarkers(points, color);
    }

    renderBarSeries(layout, xScale, yScale) {
        const barSeries = this.options.series;
        if (barSeries.length === 0)
            return;
        const xValues = [];
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const xValue = this.getNumericValue(this.dataRows[rowIndex], this.options.argumentField);
            if (xValue == null)
                continue;
            xValues.push(xValue);
        }
        const uniqueXValues = [...new Set(xValues)].sort((leftValue, rightValue) => leftValue - rightValue);
        let stepPixels = layout.plotWidth / Math.max(1, uniqueXValues.length + 1);
        for (let index = 1; index < uniqueXValues.length; index++) {
            const diff = Math.abs(xScale(uniqueXValues[index]) - xScale(uniqueXValues[index - 1]));
            if (diff > 0)
                stepPixels = Math.min(stepPixels, diff);
        }
        const barWidth = Math.max(2, Math.min(24, stepPixels / Math.max(1, barSeries.length + 1)));
        const baselineY = yScale(0);
        for (let seriesIndex = 0; seriesIndex < barSeries.length; seriesIndex++) {
            const series = barSeries[seriesIndex];
            const offset = (seriesIndex - (barSeries.length - 1) / 2) * barWidth;
            for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
                const row = this.dataRows[rowIndex];
                const xValue = this.getNumericValue(row, this.options.argumentField);
                const yValue = this.getNumericValue(row, series.valueField);
                if (xValue == null || yValue == null)
                    continue;
                const xPosition = xScale(xValue) + offset - barWidth * 0.45;
                const yPosition = yScale(yValue);
                const rectangle = this.createSvgElement("rect");
                rectangle.setAttribute("x", `${xPosition}`);
                rectangle.setAttribute("y", `${Math.min(yPosition, baselineY)}`);
                rectangle.setAttribute("width", `${barWidth * 0.9}`);
                rectangle.setAttribute("height", `${Math.max(1, Math.abs(yPosition - baselineY))}`);
                rectangle.setAttribute("fill", series.color);
                rectangle.setAttribute("fill-opacity", "0.8");
                this.seriesLayer.appendChild(rectangle);
            }
        }
    }

    getPolylinePath(points) {
        if (points.length === 0)
            return "";
        let pathValue = `M ${points[0].x} ${points[0].y}`;
        for (let index = 1; index < points.length; index++)
            pathValue += ` L ${points[index].x} ${points[index].y}`;
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

    renderTitles(layout, width) {
        const titleFontSize = Number(this.options.titleFontSize) || 16;
        this.renderTitleWithCaseIcons(this.axisLayer, this.options.argumentTitle ?? "", layout.plotLeft + layout.plotWidth / 2, layout.axisTitleX, titleFontSize, this.options.foregroundColor);
        this.renderValueTitleLegend(this.axisLayer, layout, titleFontSize);
        const clippingRectangle = this.createSvgElement("rect");
        clippingRectangle.setAttribute("x", "0");
        clippingRectangle.setAttribute("y", "0");
        clippingRectangle.setAttribute("width", `${width}`);
        clippingRectangle.setAttribute("height", `${layout.plotBottom + 22}`);
        clippingRectangle.setAttribute("fill", "none");
        clippingRectangle.setAttribute("stroke", "none");
        this.axisLayer.appendChild(clippingRectangle);
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
        const focusLine = this.createSvgElement("line");
        focusLine.setAttribute("x1", `${focusX}`);
        focusLine.setAttribute("y1", `${topY}`);
        focusLine.setAttribute("x2", `${focusX}`);
        focusLine.setAttribute("y2", `${layout.plotBottom}`);
        focusLine.setAttribute("stroke", "#949494");
        focusLine.setAttribute("stroke-width", "1.4");
        focusLine.setAttribute("stroke-dasharray", "4 3");
        this.focusLayer.appendChild(focusLine);
        for (const point of focusPoints) {
            const horizontalLine = this.createSvgElement("line");
            horizontalLine.setAttribute("x1", `${layout.plotLeft}`);
            horizontalLine.setAttribute("y1", `${point.yPosition}`);
            horizontalLine.setAttribute("x2", `${point.xPosition}`);
            horizontalLine.setAttribute("y2", `${point.yPosition}`);
            horizontalLine.setAttribute("stroke", "#949494");
            horizontalLine.setAttribute("stroke-width", "1.4");
            horizontalLine.setAttribute("stroke-dasharray", "4 3");
            this.focusLayer.appendChild(horizontalLine);
        }
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

    renderFocusMarker(seriesIndex, xScale, yScale) {
        const series = this.renderState.series[seriesIndex];
        const nearestPoint = this.getNearestSeriesPoint(series, this.focusArgumentValue);
        if (!nearestPoint)
            return;
        const xPosition = xScale(nearestPoint.xValue);
        const yPosition = yScale(nearestPoint.yValue);
        if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition))
            return;
        const marker = this.createSvgElement("circle");
        marker.setAttribute("cx", `${xPosition}`);
        marker.setAttribute("cy", `${yPosition}`);
        marker.setAttribute("r", "3.5");
        marker.setAttribute("fill", series.color);
        marker.setAttribute("stroke", "#ffffff");
        marker.setAttribute("stroke-width", "1");
        this.focusLayer.appendChild(marker);
        if (series.showLabel) {
            const label = this.createSvgElement("text");
            label.setAttribute("x", `${xPosition}`);
            label.setAttribute("y", `${yPosition - 8}`);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("font-family", "Katex_Main");
            label.setAttribute("font-size", `${this.options.fontSize}`);
            label.setAttribute("fill", series.color);
            label.textContent = `${series.name} = ${this.formatAxisValue(nearestPoint.yValue)}`;
            this.focusLayer.appendChild(label);
        }
    }

    getNearestSeriesPoint(series, focusArgumentValue) {
        let nearestPoint = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const row = this.dataRows[rowIndex];
            const xValue = this.getNumericValue(row, this.renderState.argumentField);
            const yValue = this.getNumericValue(row, series.valueField);
            if (xValue == null || yValue == null)
                continue;
            const distance = Math.abs(xValue - focusArgumentValue);
            if (distance >= nearestDistance)
                continue;
            nearestDistance = distance;
            nearestPoint = { xValue: xValue, yValue: yValue };
        }
        return nearestPoint;
    }

    getTangentAtFocusPoint(series) {
        const argumentField = this.renderState.argumentField;
        let nearestIndex = -1;
        let nearestDistance = Infinity;
        for (let rowIndex = 0; rowIndex < this.dataRows.length; rowIndex++) {
            const xValue = this.getNumericValue(this.dataRows[rowIndex], argumentField);
            const yValue = this.getNumericValue(this.dataRows[rowIndex], series.valueField);
            if (xValue == null || yValue == null)
                continue;
            const distance = Math.abs(xValue - this.focusArgumentValue);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = rowIndex;
            }
        }
        if (nearestIndex < 0)
            return null;
        const currentRow = this.dataRows[nearestIndex];
        const currentX = this.getNumericValue(currentRow, argumentField);
        const currentY = this.getNumericValue(currentRow, series.valueField);
        let prevX = null, prevY = null, nextX = null, nextY = null;
        for (let i = nearestIndex - 1; i >= 0; i--) {
            const x = this.getNumericValue(this.dataRows[i], argumentField);
            const y = this.getNumericValue(this.dataRows[i], series.valueField);
            if (x != null && y != null) {
                prevX = x;
                prevY = y;
                break;
            }
        }
        for (let i = nearestIndex + 1; i < this.dataRows.length; i++) {
            const x = this.getNumericValue(this.dataRows[i], argumentField);
            const y = this.getNumericValue(this.dataRows[i], series.valueField);
            if (x != null && y != null) {
                nextX = x;
                nextY = y;
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
        if (!this.options.showTangent)
            return;
        const domain = this.renderState.domain;
        const deltaX = (domain.xMax - domain.xMin) * 0.12;
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++) {
            const series = this.renderState.series[seriesIndex];
            const tangent = this.getTangentAtFocusPoint(series);
            if (!tangent)
                continue;
            const deltaY = tangent.slope * deltaX;
            const tangentLine = this.createSvgElement("line");
            tangentLine.setAttribute("x1", `${xScale(tangent.xValue - deltaX)}`);
            tangentLine.setAttribute("y1", `${yScale(tangent.yValue - deltaY)}`);
            tangentLine.setAttribute("x2", `${xScale(tangent.xValue + deltaX)}`);
            tangentLine.setAttribute("y2", `${yScale(tangent.yValue + deltaY)}`);
            tangentLine.setAttribute("stroke", series.color);
            tangentLine.setAttribute("stroke-width", "1.5");
            this.focusLayer.appendChild(tangentLine);
            const pointX = xScale(tangent.xValue);
            const pointY = yScale(tangent.yValue);
            const endX = xScale(tangent.xValue + deltaX);
            const endY = yScale(tangent.yValue + deltaY);
            const horizontalLine = this.createSvgElement("line");
            horizontalLine.setAttribute("x1", `${pointX}`);
            horizontalLine.setAttribute("y1", `${pointY}`);
            horizontalLine.setAttribute("x2", `${endX}`);
            horizontalLine.setAttribute("y2", `${pointY}`);
            horizontalLine.setAttribute("stroke", series.color);
            horizontalLine.setAttribute("stroke-width", "1.2");
            horizontalLine.setAttribute("stroke-dasharray", "4 3");
            this.focusLayer.appendChild(horizontalLine);
            const verticalLine = this.createSvgElement("line");
            verticalLine.setAttribute("x1", `${endX}`);
            verticalLine.setAttribute("y1", `${pointY}`);
            verticalLine.setAttribute("x2", `${endX}`);
            verticalLine.setAttribute("y2", `${endY}`);
            verticalLine.setAttribute("stroke", series.color);
            verticalLine.setAttribute("stroke-width", "1.2");
            verticalLine.setAttribute("stroke-dasharray", "4 3");
            this.focusLayer.appendChild(verticalLine);
        }
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
        if (!Number.isFinite(tickOffsetValue) || Math.abs(tickOffsetValue) < 0.0001)
            return;
        if (!Number.isFinite(tickOffsetPixel) || Math.abs(tickOffsetPixel) < 0.0001)
            return;
        if (tickOffsetPixel * tickOffsetValue <= 0)
            return;
        this._tickDragState = {
            axis,
            tickValue,
            startPixel,
            layout: layout,
            baseValue: baseValue,
            tickOffsetValue: tickOffsetValue,
            startX: event.clientX,
            startY: event.clientY,
            pointerId: event.pointerId
        };
        if (typeof this.options.onTickDragStarted === "function")
            this.options.onTickDragStarted();
        window.addEventListener("pointermove", this._onPointerMove);
        window.addEventListener("pointerup", this._onPointerUp);
        window.addEventListener("pointercancel", this._onPointerUp);
    }

    onTickPointerMove(event) {
        const drag = this._tickDragState;
        if (!drag)
            return;
        if (event.pointerId !== drag.pointerId)
            return;
        event.preventDefault();
        const layout = drag.layout;
        if (drag.axis === "x") {
            const pixelX = drag.startPixel + (event.clientX - drag.startX);
            const pixelDistance = pixelX - layout.plotLeft;
            if (Math.abs(pixelDistance) < 0.0001)
                return;
            if (pixelDistance * drag.tickOffsetValue <= 0)
                return;
            const scale = Math.abs(drag.tickOffsetValue / pixelDistance);
            this.domainOverride.xMin = drag.baseValue;
            this.domainOverride.xMax = drag.baseValue + scale * layout.plotWidth;
        }
        if (drag.axis === "y") {
            const pixelY = drag.startPixel + (event.clientY - drag.startY);
            const pixelDistance = layout.plotBottom - pixelY;
            if (Math.abs(pixelDistance) < 0.0001)
                return;
            if (pixelDistance * drag.tickOffsetValue <= 0)
                return;
            const scale = Math.abs(drag.tickOffsetValue / pixelDistance);
            this.domainOverride.yMin = drag.baseValue;
            this.domainOverride.yMax = drag.baseValue + scale * layout.plotHeight;
        }
        this.render();
    }

    onTickPointerUp(event) {
        const drag = this._tickDragState;
        if (!drag)
            return;
        if (event.pointerId !== drag.pointerId)
            return;
        window.removeEventListener("pointermove", this._onPointerMove);
        window.removeEventListener("pointerup", this._onPointerUp);
        window.removeEventListener("pointercancel", this._onPointerUp);
        this._tickDragState = null;
        if (typeof this.options.onTickDragEnded === "function")
            this.options.onTickDragEnded();
        if (typeof this.options.onDomainChanged === "function")
            this.options.onDomainChanged({ ...this.domainOverride });
    }

    resetDomainOverride() {
        this.domainOverride = { xMin: null, xMax: null, yMin: null, yMax: null };
        this.render();
    }

    renderCrosshairHitArea(layout) {
        const hitArea = this.createSvgElement("rect");
        hitArea.setAttribute("x", `${layout.plotLeft}`);
        hitArea.setAttribute("y", `${layout.plotTop}`);
        hitArea.setAttribute("width", `${layout.plotWidth}`);
        hitArea.setAttribute("height", `${layout.plotHeight}`);
        hitArea.setAttribute("fill", "transparent");
        hitArea.setAttribute("style", "pointer-events: all");
        hitArea.addEventListener("pointermove", e => this.onCrosshairPointerMove(e));
        hitArea.addEventListener("pointerleave", () => this.clearCrosshair());
        this.crosshairInteractionLayer.appendChild(hitArea);
    }

    onCrosshairPointerMove(event) {
        if (this._tickDragState)
            return;
        const state = this.renderState;
        if (!state)
            return;
        const svgRoot = this.rootElement.closest("svg");
        if (!svgRoot)
            return;
        const point = svgRoot.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const localPoint = point.matrixTransform(this.rootElement.getScreenCTM().inverse());
        const mouseX = localPoint.x;
        if (mouseX < state.layout.plotLeft || mouseX > state.layout.plotRight) {
            this.clearCrosshair();
            return;
        }
        const domain = state.domain;
        const layout = state.layout;
        const dataX = domain.xMin + (mouseX - layout.plotLeft) / layout.plotWidth * (domain.xMax - domain.xMin);
        this.renderCrosshair(dataX);
    }

    clearCrosshair() {
        this.clearLayer(this.crosshairLayer);
    }

    renderCrosshair(argumentValue) {
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
        const verticalLine = this.createSvgElement("line");
        verticalLine.setAttribute("x1", `${crosshairX}`);
        verticalLine.setAttribute("y1", `${layout.plotTop}`);
        verticalLine.setAttribute("x2", `${crosshairX}`);
        verticalLine.setAttribute("y2", `${layout.plotBottom}`);
        verticalLine.setAttribute("stroke", this.options.foregroundColor);
        verticalLine.setAttribute("stroke-width", "1");
        verticalLine.setAttribute("stroke-opacity", "0.5");
        this.crosshairLayer.appendChild(verticalLine);
        const firstSeries = state.series.length > 0 ? this.getNearestSeriesPoint(state.series[0], argumentValue) : null;
        const snappedX = firstSeries ? firstSeries.xValue : argumentValue;
        const axisLabelX = xScale(snappedX);
        const axisBackground = this.createSvgElement("rect");
        const axisLabelText = this.formatAxisValue(snappedX);
        const axisLabelWidth = this.estimateTextWidth(axisLabelText, 10) + 8;
        axisBackground.setAttribute("x", `${axisLabelX - axisLabelWidth / 2}`);
        axisBackground.setAttribute("y", `${layout.plotBottom + 4}`);
        axisBackground.setAttribute("width", `${axisLabelWidth}`);
        axisBackground.setAttribute("height", "16");
        axisBackground.setAttribute("rx", "3");
        axisBackground.setAttribute("fill", this.options.foregroundColor);
        axisBackground.setAttribute("fill-opacity", "0.85");
        this.crosshairLayer.appendChild(axisBackground);
        const axisLabel = this.createSvgElement("text");
        axisLabel.setAttribute("x", `${axisLabelX}`);
        axisLabel.setAttribute("y", `${layout.plotBottom + 16}`);
        axisLabel.setAttribute("text-anchor", "middle");
        axisLabel.setAttribute("font-family", this.options.fontFamily);
        axisLabel.setAttribute("font-size", "10");
        axisLabel.setAttribute("fill", this.options.backgroundColor || "#ffffff");
        axisLabel.textContent = axisLabelText;
        this.crosshairLayer.appendChild(axisLabel);
        for (let seriesIndex = 0; seriesIndex < state.series.length; seriesIndex++) {
            const series = state.series[seriesIndex];
            const nearestPoint = this.getNearestSeriesPoint(series, argumentValue);
            if (!nearestPoint)
                continue;
            const pointX = xScale(nearestPoint.xValue);
            const pointY = yScale(nearestPoint.yValue);
            if (!Number.isFinite(pointX) || !Number.isFinite(pointY))
                continue;
            const marker = this.createSvgElement("circle");
            marker.setAttribute("cx", `${pointX}`);
            marker.setAttribute("cy", `${pointY}`);
            marker.setAttribute("r", "4");
            marker.setAttribute("fill", series.color);
            marker.setAttribute("stroke", "#ffffff");
            marker.setAttribute("stroke-width", "1.5");
            this.crosshairLayer.appendChild(marker);
            const label = this.createSvgElement("text");
            label.setAttribute("x", `${pointX + 6}`);
            label.setAttribute("y", `${pointY - 6}`);
            label.setAttribute("font-family", this.options.fontFamily);
            label.setAttribute("font-size", "11");
            label.setAttribute("fill", series.color);
            label.textContent = this.formatAxisValue(nearestPoint.yValue);
            this.crosshairLayer.appendChild(label);
        }
    }
}
