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
        this._zoomDragState = null;
        this._onPointerMove = e => this.onTickPointerMove(e);
        this._onPointerUp = e => this.onTickPointerUp(e);
        this._onZoomPointerMove = e => this.onZoomPointerMove(e);
        this._onZoomPointerUp = e => this.onZoomPointerUp(e);
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
            tangentColor: "#00000000",
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
        this.axisLayer = this.createSvgElement("g");
        this.focusLayer = this.createSvgElement("g");
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

    buildMinorTicks(majorTicks, minValue, maxValue, subdivisions = 5) {
        const ticks = [];
        if (!Array.isArray(majorTicks) || majorTicks.length < 2)
            return this.buildTicks(minValue, maxValue, Math.max(6, subdivisions * 4 + 1));
        const step = majorTicks[1] - majorTicks[0];
        if (!Number.isFinite(step) || step <= 0 || subdivisions <= 1)
            return ticks;
        const minorStep = step / subdivisions;
        for (let majorIndex = 0; majorIndex < majorTicks.length - 1; majorIndex++) {
            const startValue = majorTicks[majorIndex];
            for (let minorIndex = 1; minorIndex < subdivisions; minorIndex++) {
                const tickValue = startValue + minorStep * minorIndex;
                if (tickValue <= minValue || tickValue >= maxValue)
                    continue;
                ticks.push(Math.round(tickValue * 1e10) / 1e10);
            }
        }
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

    renderTitleWithCaseIcons(targetLayer, textValue, centerX, centerY, fontSize, fill, rotation = null, clipId = null) {
        const segments = this.parseCaseIconSegments(textValue);
        if (segments.length === 0)
            return;
        const hostGroup = this.createSvgElement("g");
        if (rotation)
            hostGroup.setAttribute("transform", `rotate(${rotation.angle} ${rotation.cx} ${rotation.cy})`);
        if (clipId)
            hostGroup.setAttribute("clip-path", `url(#${clipId})`);
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

    renderValueTitleLegend(targetLayer, layout, fontSize, clipId = null) {
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
        this.clearLayer(this.zoomLayer);
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
        const xMinorTicks = this.buildMinorTicks(xTicks, domain.xMin, domain.xMax, 5);
        const yMinorTicks = this.buildMinorTicks(yTicks, domain.yMin, domain.yMax, 5);
        const layout = this.getLayout(width, height, xTicks, yTicks);
        this.plotClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.plotClipRect.setAttribute("y", `${layout.plotTop}`);
        this.plotClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.plotClipRect.setAttribute("height", `${layout.plotHeight}`);
        const scales = this.getScales(layout, domain);
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
        this.appendSvgMarkup(this.backgroundLayer, `
            <rect x="0" y="0" width="${width}" height="${height}" fill="${this.options.backgroundColor}" stroke="${this.options.borderColor}" stroke-width="1" />
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
        `);
        for (let index = 0; index < xMinorTicks.length; index++)
            this.renderXAxisMinorTick(layout, xScale, xMinorTicks[index]);
        for (let index = 0; index < yMinorTicks.length; index++)
            this.renderYAxisMinorTick(layout, yScale, yMinorTicks[index]);
        for (let index = 0; index < xTicks.length; index++)
            this.renderXAxisTick(layout, xScale, xTicks[index], index, xTicks.length);
        for (let index = 0; index < yTicks.length; index++)
            this.renderYAxisTick(layout, yScale, yTicks[index]);
    }

    renderXAxisMinorTick(layout, xScale, xValue) {
        const xPosition = xScale(xValue);
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${xPosition}" y1="${layout.plotBottom}" x2="${xPosition}" y2="${layout.plotBottom + 2.5}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
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
        const labelText = this.escapeMarkupText(this.formatAxisValue(xValue));
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${xPosition}" y1="${layout.plotBottom}" x2="${xPosition}" y2="${layout.plotBottom + 4}" stroke="${this.options.axisColor}" stroke-width="1" />
            <text class="shape-tick-label" x="${labelX}" y="${layout.plotBottom + 18}" text-anchor="${anchor}" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="10">${labelText}</text>
        `);
    }

    renderYAxisTick(layout, yScale, yValue) {
        const yPosition = yScale(yValue);
        const labelText = this.escapeMarkupText(this.formatAxisValue(yValue));
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${layout.plotLeft - 4}" y1="${yPosition}" x2="${layout.plotLeft}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-width="1" />
            <text class="shape-tick-label" x="${layout.plotLeft - 7}" y="${yPosition + 3}" text-anchor="end" fill="${this.options.foregroundColor}" font-family="${this.options.fontFamily}" font-size="10">${labelText}</text>
        `);
    }

    renderYAxisMinorTick(layout, yScale, yValue) {
        const yPosition = yScale(yValue);
        this.appendSvgMarkup(this.axisLayer, `
            <line x1="${layout.plotLeft - 2.5}" y1="${yPosition}" x2="${layout.plotLeft}" y2="${yPosition}" stroke="${this.options.axisColor}" stroke-opacity="0.45" stroke-width="1" />
        `);
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
                rowIndex: rowIndex,
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
        let barsMarkup = "";
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
                barsMarkup += `
                    <rect x="${xPosition}" y="${Math.min(yPosition, baselineY)}" width="${barWidth * 0.9}" height="${Math.max(1, Math.abs(yPosition - baselineY))}" fill="${series.color}" fill-opacity="0.8" />
                `;
            }
        }
        this.appendSvgMarkup(this.seriesLayer, barsMarkup);
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
        this.xTitleClipRect.setAttribute("x", `${layout.plotLeft}`);
        this.xTitleClipRect.setAttribute("y", `${layout.plotBottom}`);
        this.xTitleClipRect.setAttribute("width", `${layout.plotWidth}`);
        this.xTitleClipRect.setAttribute("height", `${height - layout.plotBottom}`);
        this.yTitleClipRect.setAttribute("x", "0");
        this.yTitleClipRect.setAttribute("y", `${layout.plotTop}`);
        this.yTitleClipRect.setAttribute("width", `${layout.plotLeft}`);
        this.yTitleClipRect.setAttribute("height", `${layout.plotHeight}`);
    }

    renderTitles(layout, width, height) {
        this.updateTitleClipRects(layout, height);
        const titleFontSize = Number(this.options.titleFontSize) || 16;
        this.renderTitleWithCaseIcons(this.axisLayer, this.options.argumentTitle ?? "", layout.plotLeft + layout.plotWidth / 2, layout.axisTitleX, titleFontSize, this.options.foregroundColor, null, this.xTitleClipId);
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
            <line x1="${focusX}" y1="${topY}" x2="${focusX}" y2="${layout.plotBottom}" stroke="#949494" stroke-width="1.4" stroke-dasharray="4 3" />
        `;
        for (const point of focusPoints) {
            focusMarkup += `
                <line x1="${layout.plotLeft}" y1="${point.yPosition}" x2="${point.xPosition}" y2="${point.yPosition}" stroke="#949494" stroke-width="1.4" stroke-dasharray="4 3" />
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
        if (series.showLabel) {
            const labelText = this.escapeMarkupText(`${series.name} = ${this.formatAxisValue(nearestPoint.yValue)}`);
            markerMarkup += `
                <text x="${xPosition}" y="${yPosition - 8}" text-anchor="middle" font-family="Katex_Main" font-size="${this.options.fontSize}" fill="${series.color}">${labelText}</text>
            `;
        }
        this.appendSvgMarkup(this.focusLayer, markerMarkup);
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
            const endX = xScale(tangent.xValue + deltaX);
            const endY = yScale(tangent.yValue + deltaY);
            tangentMarkup += `
                <polygon points="${pointX},${pointY} ${endX},${pointY} ${endX},${endY}" fill="${tangentColor}" fill-opacity="0.25" stroke="none" />
                <line x1="${xScale(tangent.xValue - deltaX)}" y1="${yScale(tangent.yValue - deltaY)}" x2="${xScale(tangent.xValue + deltaX)}" y2="${yScale(tangent.yValue + deltaY)}" stroke="${tangentColor}" stroke-width="1.5" />
                <line x1="${pointX}" y1="${pointY}" x2="${endX}" y2="${pointY}" stroke="${tangentColor}" stroke-width="1.2" stroke-dasharray="4 3" />
                <line x1="${endX}" y1="${pointY}" x2="${endX}" y2="${endY}" stroke="${tangentColor}" stroke-width="1.2" stroke-dasharray="4 3" />
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
        event.stopPropagation();
        event.preventDefault();
        if (this._tickDragState)
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
            currentY: startY
        };
        this.clearCrosshair();
        this.renderZoomSelectionRectangle(this._zoomDragState);
        if (typeof this.options.onTickDragStarted === "function")
            this.options.onTickDragStarted();
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
        this.renderZoomSelectionRectangle(zoomDragState);
    }

    onZoomPointerUp(event) {
        const zoomDragState = this._zoomDragState;
        if (!zoomDragState)
            return;
        if (event.pointerId !== zoomDragState.pointerId)
            return;
        window.removeEventListener("pointermove", this._onZoomPointerMove);
        window.removeEventListener("pointerup", this._onZoomPointerUp);
        window.removeEventListener("pointercancel", this._onZoomPointerUp);
        this._zoomDragState = null;
        this.clearLayer(this.zoomLayer);
        if (typeof this.options.onTickDragEnded === "function")
            this.options.onTickDragEnded();
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
        hitArea.addEventListener("pointerdown", e => this.onZoomPointerDown(e));
        hitArea.addEventListener("pointermove", e => this.onCrosshairPointerMove(e));
        hitArea.addEventListener("pointerleave", () => this.clearCrosshair());
        this.crosshairInteractionLayer.appendChild(hitArea);
    }

    onCrosshairPointerMove(event) {
        if (this._tickDragState)
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
        const firstSeries = state.series.length > 0 ? this.getNearestSeriesPoint(state.series[0], argumentValue) : null;
        const snappedX = firstSeries ? firstSeries.xValue : argumentValue;
        const axisLabelX = xScale(snappedX);
        const axisLabelText = this.formatAxisValue(snappedX);
        const axisLabelWidth = this.estimateTextWidth(axisLabelText, 10) + 8;
        let crosshairMarkup = `
            <line x1="${crosshairX}" y1="${layout.plotTop}" x2="${crosshairX}" y2="${layout.plotBottom}" stroke="${this.options.foregroundColor}" stroke-width="1" stroke-opacity="0.5" />
            <rect x="${axisLabelX - axisLabelWidth / 2}" y="${layout.plotBottom + 4}" width="${axisLabelWidth}" height="16" rx="3" fill="${this.options.foregroundColor}" fill-opacity="0.85" />
            <text x="${axisLabelX}" y="${layout.plotBottom + 16}" text-anchor="middle" font-family="${this.options.fontFamily}" font-size="10" fill="${this.options.backgroundColor || "#ffffff"}">${this.escapeMarkupText(axisLabelText)}</text>
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
            crosshairMarkup += `
                <circle cx="${pointX}" cy="${pointY}" r="4" fill="${series.color}" stroke="#ffffff" stroke-width="1.5" />
                <text x="${pointX + 6}" y="${pointY - 6}" font-family="${this.options.fontFamily}" font-size="11" fill="${series.color}">${this.escapeMarkupText(this.formatAxisValue(nearestPoint.yValue))}</text>
            `;
        }
        this.appendSvgMarkup(this.crosshairLayer, crosshairMarkup);
    }
}
