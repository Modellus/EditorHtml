// The chart expressed as building blocks: a frame, a grid, a pair of axes and one node per
// series, composed by the `chart` component. Everything these components draw is a primitive,
// so a chart drawn this way carries the same inspection, validation and preview surface every
// other block object has.
//
// The numbers come in already worked out — the plot box, the domain, the ticks and the rows —
// because the host control needs the very same numbers for hit testing and the crosshair.
// Turning them into pixels is the components' own work, through `BlockChartGeometry`.
(function registerBlockChartComponents(registry) {
    const chartParameter = (id, label, valueType, defaultValue, extra = {}) =>
        BlockComponentHelpers.parameter(id, label, valueType, defaultValue, Object.assign({
            bindable: false,
            agentAccessible: false,
            userEditable: false,
            category: "chart"
        }, extra));

    const strokeLine = (id, x1, y1, x2, y2, color, width, opacity = 1) => ({
        id: id,
        type: "line",
        properties: {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            stroke: color,
            strokeWidth: width,
            strokeLinecap: "butt",
            opacity: opacity
        }
    });

    const clipped = (node, clipId) => {
        if (!clipId)
            return node;
        return Object.assign({}, node, { modifiers: (node.modifiers ?? []).concat([{ type: "clip", clipId: clipId }]) });
    };

    const isPositionVisible = (position, minimumPosition, maximumPosition) => {
        if (!Number.isFinite(position))
            return false;
        const tolerance = 0.01;
        return position >= minimumPosition - tolerance && position <= maximumPosition + tolerance;
    };

    registry.register({
        type: "chart-frame",
        category: "component",
        displayName: "Chart frame",
        description: "Panel behind a chart: the bordered background and the optional data-area fill.",
        tags: ["chart", "background", "panel"],
        capabilities: ["background"],
        agentAccessible: false,
        parameters: [
            chartParameter("plot", "Plot box", "object", null),
            chartParameter("width", "Width", "number", 0),
            chartParameter("height", "Height", "number", 0),
            chartParameter("cornerRadius", "Corner radius", "number", 4, { minimum: 0 }),
            chartParameter("backgroundColor", "Background", "colour", "#ffffff"),
            chartParameter("borderColor", "Border", "colour", "#666666"),
            chartParameter("dataAreaColor", "Data area", "colour", "")
        ],
        create: parameters => {
            const children = [{
                id: "background",
                type: "rect",
                properties: {
                    x: 0,
                    y: 0,
                    width: parameters.width,
                    height: parameters.height,
                    cornerRadius: parameters.cornerRadius,
                    fill: parameters.backgroundColor,
                    stroke: parameters.borderColor,
                    strokeWidth: 1,
                    strokeLinecap: "butt"
                }
            }];
            const plot = parameters.plot;
            if (plot && parameters.dataAreaColor) {
                children.push({
                    id: "data-area",
                    type: "rect",
                    properties: {
                        x: plot.plotLeft,
                        y: plot.plotTop,
                        width: plot.plotWidth,
                        height: plot.plotHeight,
                        fill: parameters.dataAreaColor
                    }
                });
            }
            return { id: "chart-frame", type: "group", children: children };
        }
    });

    registry.register({
        type: "chart-grid",
        category: "component",
        displayName: "Chart grid",
        description: "Grid of the plot area: a faint line at every minor tick and a stronger one at every major tick.",
        tags: ["chart", "grid", "ticks"],
        capabilities: ["layout"],
        agentAccessible: false,
        parameters: [
            chartParameter("plot", "Plot box", "object", null),
            chartParameter("color", "Grid colour", "colour", "token:grid.color"),
            chartParameter("xMajor", "Major x positions", "object", []),
            chartParameter("yMajor", "Major y positions", "object", []),
            chartParameter("xMinor", "Minor x positions", "object", []),
            chartParameter("yMinor", "Minor y positions", "object", [])
        ],
        create: (parameters, context) => {
            const plot = parameters.plot;
            const children = [];
            if (!plot)
                return { id: "chart-grid", type: "group", children: children };
            const majorOpacity = context.tokens.getNumber("grid.majorOpacity", 0.75);
            const minorOpacity = context.tokens.getNumber("grid.minorOpacity", 0.4);
            const addVertical = (positions, opacity, prefix) => {
                for (let index = 0; index < positions.length; index++)
                    children.push(strokeLine(`${prefix}${index}`, positions[index], plot.plotTop, positions[index], plot.plotBottom, parameters.color, 1, opacity));
            };
            const addHorizontal = (positions, opacity, prefix) => {
                for (let index = 0; index < positions.length; index++)
                    children.push(strokeLine(`${prefix}${index}`, plot.plotLeft, positions[index], plot.plotRight, positions[index], parameters.color, 1, opacity));
            };
            addVertical(parameters.xMinor ?? [], minorOpacity, "x-minor-");
            addHorizontal(parameters.yMinor ?? [], minorOpacity, "y-minor-");
            addVertical(parameters.xMajor ?? [], majorOpacity, "x-major-");
            addHorizontal(parameters.yMajor ?? [], majorOpacity, "y-major-");
            return { id: "chart-grid", type: "group", children: children };
        }
    });

    registry.register({
        type: "chart-axes",
        category: "component",
        displayName: "Chart axes",
        description: "Plot border, origin lines, tick marks and tick labels of a chart.",
        tags: ["chart", "axis", "ticks", "labels"],
        capabilities: ["layout", "textual"],
        agentAccessible: false,
        parameters: [
            chartParameter("plot", "Plot box", "object", null),
            chartParameter("color", "Axis colour", "colour", "token:axis.color"),
            chartParameter("labelColor", "Label colour", "colour", "token:axis.labelColor"),
            chartParameter("fontFamily", "Font family", "string", "token:font.family"),
            chartParameter("fontSize", "Font size", "number", "token:font.size.tick", { minimum: 1 }),
            chartParameter("originX", "Origin x position", "number", NaN),
            chartParameter("originY", "Origin y position", "number", NaN),
            chartParameter("xTicks", "X ticks", "object", []),
            chartParameter("yTicks", "Y ticks", "object", []),
            chartParameter("xMinor", "Minor x positions", "object", []),
            chartParameter("yMinor", "Minor y positions", "object", []),
            chartParameter("xTicksClipId", "X tick clip", "string", ""),
            chartParameter("yTicksClipId", "Y tick clip", "string", "")
        ],
        create: (parameters, context) => {
            const plot = parameters.plot;
            const children = [];
            if (!plot)
                return { id: "chart-axes", type: "group", children: children };
            const color = parameters.color;
            const axisWidth = context.tokens.getNumber("axis.strokeWidth", 1.2);
            const tickLength = context.tokens.getNumber("axis.tickLength", 4);
            const minorLength = context.tokens.getNumber("axis.minorTickLength", 2.5);
            const minorOpacity = context.tokens.getNumber("axis.minorOpacity", 0.45);
            const fontSize = Number(parameters.fontSize);
            const labelGapX = fontSize * context.tokens.getNumber("axis.labelGapX", 1.8);
            const labelGapY = fontSize * context.tokens.getNumber("axis.labelGapY", 0.7);
            const labelRise = fontSize * context.tokens.getNumber("axis.labelRise", 0.3);
            children.push(strokeLine("border-left", plot.plotLeft, plot.plotTop, plot.plotLeft, plot.plotBottom, color, axisWidth));
            children.push(strokeLine("border-bottom", plot.plotLeft, plot.plotBottom, plot.plotRight, plot.plotBottom, color, axisWidth));
            children.push(strokeLine("border-top", plot.plotLeft, plot.plotTop, plot.plotRight, plot.plotTop, color, axisWidth));
            children.push(strokeLine("border-right", plot.plotRight, plot.plotTop, plot.plotRight, plot.plotBottom, color, axisWidth));
            const originY = Number(parameters.originY);
            if (Number.isFinite(originY) && originY > plot.plotTop && originY < plot.plotBottom)
                children.push(strokeLine("origin-x", plot.plotLeft, originY, plot.plotRight, originY, color, axisWidth));
            const originX = Number(parameters.originX);
            if (Number.isFinite(originX) && originX > plot.plotLeft && originX < plot.plotRight)
                children.push(strokeLine("origin-y", originX, plot.plotTop, originX, plot.plotBottom, color, axisWidth));
            const xMinor = parameters.xMinor ?? [];
            for (let index = 0; index < xMinor.length; index++) {
                children.push(clipped({
                    id: `x-minor-tick-${index}`,
                    type: "group",
                    children: [
                        strokeLine("below", xMinor[index], plot.plotBottom, xMinor[index], plot.plotBottom + minorLength, color, 1, minorOpacity),
                        strokeLine("above", xMinor[index], plot.plotTop, xMinor[index], plot.plotTop - minorLength, color, 1, minorOpacity)
                    ]
                }, parameters.xTicksClipId));
            }
            const yMinor = parameters.yMinor ?? [];
            for (let index = 0; index < yMinor.length; index++) {
                children.push(clipped({
                    id: `y-minor-tick-${index}`,
                    type: "group",
                    children: [
                        strokeLine("left", plot.plotLeft - minorLength, yMinor[index], plot.plotLeft, yMinor[index], color, 1, minorOpacity),
                        strokeLine("right", plot.plotRight, yMinor[index], plot.plotRight + minorLength, yMinor[index], color, 1, minorOpacity)
                    ]
                }, parameters.yTicksClipId));
            }
            const xTicks = (parameters.xTicks ?? []).filter(tick => isPositionVisible(tick.position, plot.plotLeft, plot.plotRight));
            for (let index = 0; index < xTicks.length; index++) {
                const tick = xTicks[index];
                let anchor = "middle";
                let labelX = tick.position;
                if (index === 0) {
                    anchor = "start";
                    labelX = tick.position + 2;
                }
                if (index === xTicks.length - 1) {
                    anchor = "end";
                    labelX = tick.position - 2;
                }
                children.push(clipped({
                    id: `x-tick-${index}`,
                    type: "group",
                    children: [
                        strokeLine("below", tick.position, plot.plotBottom, tick.position, plot.plotBottom + tickLength, color, 1),
                        strokeLine("above", tick.position, plot.plotTop, tick.position, plot.plotTop - tickLength, color, 1)
                    ]
                }, parameters.xTicksClipId));
                children.push({
                    id: `x-tick-label-${index}`,
                    type: "text",
                    properties: {
                        x: labelX,
                        y: plot.plotBottom + labelGapX,
                        text: tick.label,
                        textAnchor: anchor,
                        baseline: "auto",
                        fill: parameters.labelColor,
                        fontFamily: parameters.fontFamily,
                        fontSize: parameters.fontSize
                    }
                });
            }
            const yTicks = (parameters.yTicks ?? []).filter(tick => isPositionVisible(tick.position, plot.plotTop, plot.plotBottom));
            for (let index = 0; index < yTicks.length; index++) {
                const tick = yTicks[index];
                children.push(clipped({
                    id: `y-tick-${index}`,
                    type: "group",
                    children: [
                        strokeLine("left", plot.plotLeft - tickLength, tick.position, plot.plotLeft, tick.position, color, 1),
                        strokeLine("right", plot.plotRight, tick.position, plot.plotRight + tickLength, tick.position, color, 1)
                    ]
                }, parameters.yTicksClipId));
                children.push({
                    id: `y-tick-label-${index}`,
                    type: "text",
                    properties: {
                        x: plot.plotLeft - labelGapY,
                        y: tick.position + labelRise,
                        text: tick.label,
                        textAnchor: "end",
                        baseline: "auto",
                        fill: parameters.labelColor,
                        fontFamily: parameters.fontFamily,
                        fontSize: parameters.fontSize
                    }
                });
            }
            return { id: "chart-axes", type: "group", children: children };
        }
    });

    registry.register({
        type: "chart-series",
        category: "component",
        displayName: "Chart series",
        description: "One series of a chart drawn as a line, a filled area, scattered markers, or a combination of them.",
        tags: ["chart", "series", "line", "area", "scatter"],
        capabilities: ["linear", "fillable"],
        agentAccessible: false,
        parameters: [
            chartParameter("points", "Points", "object", []),
            chartParameter("color", "Colour", "colour", "#1871c2"),
            chartParameter("chartTypes", "Chart types", "object", ["line"]),
            chartParameter("baseY", "Area baseline", "number", 0)
        ],
        create: parameters => {
            const points = parameters.points ?? [];
            const chartTypes = Array.isArray(parameters.chartTypes) && parameters.chartTypes.length > 0 ? parameters.chartTypes : ["line"];
            const color = parameters.color;
            const regularPoints = points.filter(point => !point.isOutlier);
            const outlierPoints = points.filter(point => point.isOutlier);
            const children = [];
            const addMarkers = (markerPoints, prefix, radius, filled) => {
                for (let index = 0; index < markerPoints.length; index++) {
                    children.push({
                        id: `${prefix}${index}`,
                        type: "circle",
                        properties: {
                            centerX: markerPoints[index].x,
                            centerY: markerPoints[index].y,
                            radius: radius,
                            fill: filled ? color : "none",
                            stroke: filled ? "none" : color,
                            strokeWidth: filled ? 0 : 1.5,
                            strokeLinecap: "butt"
                        }
                    });
                }
            };
            const addLine = idSuffix => children.push({
                id: `line${idSuffix}`,
                type: "path",
                properties: {
                    d: BlockChartGeometry.getPolylinePath(regularPoints),
                    fill: "none",
                    stroke: color,
                    strokeWidth: 2,
                    strokeLinecap: "butt"
                }
            });
            for (const chartType of chartTypes) {
                if (chartType === "bar")
                    continue;
                if (chartType === "line" && chartTypes.includes("area"))
                    continue;
                if (chartType === "area") {
                    // Fewer than two points enclose no area, so the reading falls back to the
                    // markers, exactly as the drawn chart does.
                    if (regularPoints.length < 2) {
                        addMarkers(regularPoints, "area-point-", 3, true);
                        continue;
                    }
                    children.push({
                        id: "area",
                        type: "path",
                        properties: {
                            d: BlockChartGeometry.getAreaPath(regularPoints, parameters.baseY),
                            fill: color,
                            opacity: 0.22,
                            strokeLinecap: "butt"
                        }
                    });
                    addLine("-area");
                    continue;
                }
                if (chartType === "line") {
                    addLine("");
                    continue;
                }
                if (chartType === "scatter")
                    addMarkers(regularPoints, "point-", 3, true);
            }
            addMarkers(outlierPoints, "outlier-", 3.5, false);
            return { id: "chart-series", type: "group", children: children };
        }
    });

    registry.register({
        type: "chart-bars",
        category: "component",
        displayName: "Chart bars",
        description: "Bar series of a chart, one column per argument value, placed side by side.",
        tags: ["chart", "bar", "column"],
        capabilities: ["fillable"],
        agentAccessible: false,
        parameters: [
            chartParameter("series", "Bar series", "object", [])
        ],
        create: parameters => {
            const series = parameters.series ?? [];
            const children = [];
            for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
                const entry = series[seriesIndex];
                for (let barIndex = 0; barIndex < (entry.bars ?? []).length; barIndex++) {
                    const bar = entry.bars[barIndex];
                    children.push({
                        id: `bar-${seriesIndex}-${barIndex}`,
                        type: "rect",
                        properties: {
                            x: bar.x,
                            y: bar.y,
                            width: bar.width,
                            height: bar.height,
                            fill: entry.color,
                            opacity: 0.8
                        }
                    });
                }
            }
            for (let seriesIndex = 0; seriesIndex < series.length; seriesIndex++) {
                const entry = series[seriesIndex];
                for (let outlierIndex = 0; outlierIndex < (entry.outliers ?? []).length; outlierIndex++) {
                    const outlier = entry.outliers[outlierIndex];
                    children.push({
                        id: `bar-outlier-${seriesIndex}-${outlierIndex}`,
                        type: "circle",
                        properties: {
                            centerX: outlier.x,
                            centerY: outlier.y,
                            radius: 3.5,
                            fill: "none",
                            stroke: entry.color,
                            strokeWidth: 1.5,
                            strokeLinecap: "butt"
                        }
                    });
                }
            }
            return { id: "chart-bars", type: "group", children: children };
        }
    });

    registry.register({
        type: "chart",
        category: "component",
        displayName: "Chart",
        description: "Chart of model terms: frame, grid, axes and one node per series, laid out from a plot box and a domain.",
        tags: ["chart", "plot", "graph"],
        capabilities: ["layout", "linear", "background"],
        agentAccessible: false,
        parameters: [
            chartParameter("plot", "Plot box", "object", null),
            chartParameter("domain", "Domain", "object", null),
            chartParameter("rows", "Data rows", "object", []),
            chartParameter("argumentField", "Argument field", "string", "argument"),
            chartParameter("series", "Series", "object", []),
            chartParameter("xTicks", "X ticks", "object", []),
            chartParameter("yTicks", "Y ticks", "object", []),
            chartParameter("xMinorTicks", "Minor x ticks", "object", []),
            chartParameter("yMinorTicks", "Minor y ticks", "object", []),
            chartParameter("backgroundColor", "Background", "colour", "#ffffff"),
            chartParameter("dataAreaColor", "Data area", "colour", ""),
            chartParameter("borderColor", "Border", "colour", "#666666"),
            chartParameter("cornerRadius", "Corner radius", "number", 4, { minimum: 0 }),
            chartParameter("axisColor", "Axis colour", "colour", "#7a7a7a"),
            chartParameter("gridColor", "Grid colour", "colour", "#d3d3d3"),
            chartParameter("foregroundColor", "Label colour", "colour", "#666666"),
            chartParameter("fontFamily", "Font family", "string", "Katex_Main"),
            chartParameter("tickFontSize", "Tick font size", "number", 10, { minimum: 1 }),
            chartParameter("maxBarWidth", "Max bar width", "number", 24, { minimum: 1 }),
            chartParameter("plotClipId", "Plot clip", "string", ""),
            chartParameter("shapeClipId", "Shape clip", "string", ""),
            chartParameter("xTicksClipId", "X tick clip", "string", ""),
            chartParameter("yTicksClipId", "Y tick clip", "string", "")
        ],
        create: parameters => {
            const plot = parameters.plot;
            const domain = parameters.domain;
            const children = [{
                id: "frame",
                type: "chart-frame",
                parameters: {
                    plot: plot,
                    width: parameters.$width,
                    height: parameters.$height,
                    cornerRadius: parameters.cornerRadius,
                    backgroundColor: parameters.backgroundColor,
                    borderColor: parameters.borderColor,
                    dataAreaColor: parameters.dataAreaColor
                }
            }];
            if (!plot || !domain)
                return { id: "chart", type: "group", children: children };
            const scales = BlockChartGeometry.createScales(plot, domain);
            const toPixels = (values, scale) => (values ?? []).map(value => scale(value));
            const toTicks = (ticks, scale) => (ticks ?? []).map(tick => ({ position: scale(tick.value), label: tick.label }));
            children.push(clipped({
                id: "grid",
                type: "chart-grid",
                parameters: {
                    plot: plot,
                    color: parameters.gridColor,
                    xMajor: toPixels((parameters.xTicks ?? []).map(tick => tick.value), scales.xScale),
                    yMajor: toPixels((parameters.yTicks ?? []).map(tick => tick.value), scales.yScale),
                    xMinor: toPixels(parameters.xMinorTicks, scales.xScale),
                    yMinor: toPixels(parameters.yMinorTicks, scales.yScale)
                }
            }, parameters.plotClipId));
            const rows = parameters.rows ?? [];
            const series = parameters.series ?? [];
            const barSeries = series.filter(entry => (entry.chartTypes ?? ["line"]).includes("bar"));
            if (barSeries.length > 0) {
                const barWidth = BlockChartGeometry.getBarWidth(rows, parameters.argumentField, barSeries.length, scales.xScale, plot.plotWidth, parameters.maxBarWidth);
                children.push(clipped({
                    id: "bars",
                    type: "chart-bars",
                    parameters: {
                        series: barSeries.map((entry, index) => Object.assign(
                            { color: entry.color },
                            BlockChartGeometry.getBarGeometry(rows, parameters.argumentField, entry, index, barSeries.length, barWidth, scales.xScale, scales.yScale)
                        ))
                    }
                }, parameters.plotClipId));
            }
            const areaBaseY = Math.min(Math.max(scales.yScale(0), plot.plotTop), plot.plotBottom);
            for (let index = 0; index < series.length; index++) {
                const entry = series[index];
                const points = BlockChartGeometry.getSeriesPoints(rows, parameters.argumentField, entry, scales.xScale, scales.yScale);
                if (points.length === 0)
                    continue;
                children.push(clipped({
                    id: `series-${index}`,
                    type: "chart-series",
                    parameters: {
                        points: points,
                        color: entry.color,
                        chartTypes: entry.chartTypes,
                        baseY: areaBaseY
                    }
                }, parameters.plotClipId));
            }
            children.push(clipped({
                id: "axes",
                type: "chart-axes",
                parameters: {
                    plot: plot,
                    color: parameters.axisColor,
                    labelColor: parameters.foregroundColor,
                    fontFamily: parameters.fontFamily,
                    fontSize: parameters.tickFontSize,
                    originX: scales.xScale(0),
                    originY: scales.yScale(0),
                    xTicks: toTicks(parameters.xTicks, scales.xScale),
                    yTicks: toTicks(parameters.yTicks, scales.yScale),
                    xMinor: toPixels(parameters.xMinorTicks, scales.xScale),
                    yMinor: toPixels(parameters.yMinorTicks, scales.yScale),
                    xTicksClipId: parameters.xTicksClipId,
                    yTicksClipId: parameters.yTicksClipId
                }
            }, parameters.shapeClipId));
            return { id: "chart", type: "group", children: children };
        }
    });
})(BlockRegistry);
