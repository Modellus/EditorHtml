class ShapeSvgChartControl {
    constructor(hostElement, options) {
        this.hostElement = hostElement;
        this.options = this.createDefaultOptions();
        this.dataRows = [];
        this.renderState = null;
        this.focusArgumentValue = null;
        this.width = 0;
        this.height = 0;
        this.caseIconData = {};
        this.caseIconsLoadingPromise = null;
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
            foregroundColor: "#666666",
            gridColor: "#d3d3d3",
            axisColor: "#7a7a7a",
            fontFamily: "Assistant, sans-serif",
            termFontFamily: "Katex_Math",
            termFontStyle: "italic",
            termFontWeight: 400,
            iconFontFamily: "Font Awesome 7 Pro",
            fontSize: 13,
            fontWeight: 900
        };
    }

    initializeRoot() {
        this.rootElement = this.createSvgElement("g");
        this.rootElement.setAttribute("tabindex", "0");
        this.backgroundLayer = this.createSvgElement("g");
        this.gridLayer = this.createSvgElement("g");
        this.seriesLayer = this.createSvgElement("g");
        this.axisLayer = this.createSvgElement("g");
        this.focusLayer = this.createSvgElement("g");
        this.rootElement.appendChild(this.backgroundLayer);
        this.rootElement.appendChild(this.gridLayer);
        this.rootElement.appendChild(this.seriesLayer);
        this.rootElement.appendChild(this.axisLayer);
        this.rootElement.appendChild(this.focusLayer);
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
            color: this.normalizeColor(item?.color, index)
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
        const axisTitleSize = this.options.fontSize + 2;
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
        return {
            xMin: xMin - xPadding,
            xMax: xMax + xPadding,
            yMin: yMin - yPadding,
            yMax: yMax + yPadding
        };
    }

    buildTicks(minValue, maxValue, count = 5) {
        const ticks = [];
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue))
            return ticks;
        if (count < 2) {
            ticks.push(minValue);
            return ticks;
        }
        const step = (maxValue - minValue) / (count - 1);
        for (let index = 0; index < count; index++)
            ticks.push(minValue + step * index);
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
        textElement.textContent = textValue;
        layer.appendChild(textElement);
    }

    renderTitleIconSegment(layer, xPosition, yPosition, fontSize, fill, caseNumber, fallbackCharacter) {
        const size = this.getCaseIconSize(caseNumber, fontSize);
        const iconData = this.caseIconData[caseNumber];
        const caseIconColor = ShapeTermsSelectorControl.getCaseIconColor(caseNumber);
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

    render() {
        const size = this.getChartSize();
        const width = size.width;
        const height = size.height;
        this.clearLayer(this.backgroundLayer);
        this.clearLayer(this.gridLayer);
        this.clearLayer(this.seriesLayer);
        this.clearLayer(this.axisLayer);
        this.clearLayer(this.focusLayer);
        this.renderState = null;
        if (width <= 2 || height <= 2)
            return;
        this.renderBackground(width, height);
        const domain = this.getDomain(this.options.argumentField, this.options.series, this.options.chartType);
        const xTicks = this.buildTicks(domain.xMin, domain.xMax, 5);
        const yTicks = this.buildTicks(domain.yMin, domain.yMax, 5);
        const layout = this.getLayout(width, height, xTicks, yTicks);
        const scales = this.getScales(layout, domain);
        this.renderGrid(layout, scales.xScale, scales.yScale, xTicks, yTicks);
        this.renderAxes(layout, scales.xScale, scales.yScale, xTicks, yTicks);
        this.renderSeries(layout, scales.xScale, scales.yScale);
        this.renderTitles(layout, width);
        this.renderState = {
            layout: layout,
            xScale: scales.xScale,
            yScale: scales.yScale,
            series: this.options.series,
            argumentField: this.options.argumentField
        };
        this.renderFocus();
    }

    renderBackground(width, height) {
        const rectangle = this.createSvgElement("rect");
        rectangle.setAttribute("x", "0");
        rectangle.setAttribute("y", "0");
        rectangle.setAttribute("width", `${width}`);
        rectangle.setAttribute("height", `${height}`);
        rectangle.setAttribute("fill", this.options.backgroundColor);
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

    renderSeries(layout, xScale, yScale) {
        const chartType = this.options.chartType;
        if (chartType === "bar") {
            this.renderBarSeries(layout, xScale, yScale);
            return;
        }
        for (let seriesIndex = 0; seriesIndex < this.options.series.length; seriesIndex++) {
            const series = this.options.series[seriesIndex];
            const points = this.getSeriesPoints(series, xScale, yScale);
            if (points.length === 0)
                continue;
            if (chartType === "scatter")
                this.renderScatterSeries(points, series.color);
            else if (chartType === "area")
                this.renderAreaSeries(points, series.color, layout.plotBottom);
            else
                this.renderLineSeries(points, series.color);
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
            this.renderScatterSeries(points, color);
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

    renderScatterSeries(points, color) {
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
        const titleFontSize = this.options.fontSize + 2;
        this.renderTitleWithCaseIcons(this.axisLayer, this.options.argumentTitle ?? "", layout.plotLeft + layout.plotWidth / 2, layout.axisTitleX, titleFontSize, this.options.foregroundColor);
        this.renderTitleWithCaseIcons(this.axisLayer, this.options.valueTitle ?? "", layout.axisTitleLeft, layout.axisTitleY, titleFontSize, this.options.foregroundColor, {
            angle: -90,
            cx: layout.axisTitleLeft,
            cy: layout.axisTitleY
        });
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
        const focusLine = this.createSvgElement("line");
        focusLine.setAttribute("x1", `${focusX}`);
        focusLine.setAttribute("y1", `${layout.plotTop}`);
        focusLine.setAttribute("x2", `${focusX}`);
        focusLine.setAttribute("y2", `${layout.plotBottom}`);
        focusLine.setAttribute("stroke", "#949494");
        focusLine.setAttribute("stroke-width", "1.4");
        focusLine.setAttribute("stroke-dasharray", "4 3");
        this.focusLayer.appendChild(focusLine);
        for (let seriesIndex = 0; seriesIndex < this.renderState.series.length; seriesIndex++)
            this.renderFocusMarker(seriesIndex, xScale, yScale);
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
}
