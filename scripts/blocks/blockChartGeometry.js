// Pure chart geometry: rows and a domain in, pixels out. The chart control and the chart
// building blocks both read from here, so the drawing a block produces sits on exactly the
// numbers the control uses for hit testing, focus markers and the crosshair.
class BlockChartGeometry {
    static getNumericValue(row, fieldName) {
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

    static createScales(layout, domain) {
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

    // The room a range fitted to values leaves around them, and what it does when the values are all
    // the same one. A chart pads its data this way; an object that fits its axes to a recording pads
    // it the same, so "auto scale" means one thing on the board.
    static padDomain(xMinimum, xMaximum, yMinimum, yMaximum) {
        let xMin = xMinimum;
        let xMax = xMaximum;
        let yMin = yMinimum;
        let yMax = yMaximum;
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
        return { xMin: xMin - xPadding, xMax: xMax + xPadding, yMin: yMin - yPadding, yMax: yMax + yPadding };
    }

    // Widens the axis that has the finer pixels-per-unit so that one unit of x and one unit of
    // y measure the same on screen, which is what a phase portrait or a trajectory needs.
    static equalizeDomain(domain, plotWidth, plotHeight) {
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

    // The row index carried by each point is the position in the run of iterations, counting the
    // ones that produced no value. A gap in that count is where the line has to break.
    static getSeriesPoints(rows, argumentField, series, xScale, yScale) {
        const points = [];
        let effectiveRowIndex = 0;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const rawXValue = BlockChartGeometry.getNumericValue(row, argumentField);
            const rawYValue = BlockChartGeometry.getNumericValue(row, series.valueField);
            if (rawXValue == null || rawYValue == null) {
                effectiveRowIndex++;
                continue;
            }
            if (row[`singularity_${series.valueField}`] === true)
                effectiveRowIndex++;
            points.push({
                rowIndex: effectiveRowIndex,
                xValue: rawXValue,
                yValue: rawYValue,
                x: xScale(rawXValue),
                y: yScale(rawYValue),
                isOutlier: row[`outlier_${series.valueField}`] === true
            });
            effectiveRowIndex++;
        }
        return points;
    }

    static getPolylinePath(points) {
        if (points.length === 0)
            return "";
        let pathValue = `M ${points[0].x} ${points[0].y}`;
        for (let index = 1; index < points.length; index++)
            pathValue += points[index].rowIndex !== points[index - 1].rowIndex + 1 ? ` M ${points[index].x} ${points[index].y}` : ` L ${points[index].x} ${points[index].y}`;
        return pathValue;
    }

    static getAreaPath(points, baseY) {
        if (points.length === 0)
            return "";
        let pathValue = `M ${points[0].x} ${baseY}`;
        for (let index = 0; index < points.length; index++)
            pathValue += ` L ${points[index].x} ${points[index].y}`;
        pathValue += ` L ${points[points.length - 1].x} ${baseY} Z`;
        return pathValue;
    }

    // Bars are as wide as the tightest gap between two argument values allows, shared between the
    // bar series so that they stand side by side instead of hiding one another.
    static getBarWidth(rows, argumentField, barSeriesCount, xScale, plotWidth, maximumBarWidth = 24) {
        const xValues = [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const rawXValue = BlockChartGeometry.getNumericValue(rows[rowIndex], argumentField);
            if (rawXValue == null)
                continue;
            xValues.push(rawXValue);
        }
        const uniqueXValues = [...new Set(xValues)].sort((leftValue, rightValue) => leftValue - rightValue);
        let stepPixels = plotWidth / Math.max(1, uniqueXValues.length + 1);
        for (let index = 1; index < uniqueXValues.length; index++) {
            const diff = Math.abs(xScale(uniqueXValues[index]) - xScale(uniqueXValues[index - 1]));
            if (diff > 0)
                stepPixels = Math.min(stepPixels, diff);
        }
        return Math.max(2, Math.min(maximumBarWidth, stepPixels / Math.max(1, barSeriesCount + 1)));
    }

    static getBarGeometry(rows, argumentField, series, seriesIndex, barSeriesCount, barWidth, xScale, yScale) {
        const baselineY = yScale(0);
        const offset = (seriesIndex - (barSeriesCount - 1) / 2) * barWidth;
        const bars = [];
        const outliers = [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const rawXValue = BlockChartGeometry.getNumericValue(row, argumentField);
            const rawYValue = BlockChartGeometry.getNumericValue(row, series.valueField);
            if (rawXValue == null || rawYValue == null)
                continue;
            if (row[`outlier_${series.valueField}`] === true) {
                outliers.push({ x: xScale(rawXValue), y: yScale(rawYValue) });
                continue;
            }
            const yPosition = yScale(rawYValue);
            bars.push({
                xValue: rawXValue,
                x: xScale(rawXValue) + offset - barWidth * 0.45,
                y: Math.min(yPosition, baselineY),
                width: barWidth * 0.9,
                height: Math.max(1, Math.abs(yPosition - baselineY))
            });
        }
        return { bars: bars, outliers: outliers };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockChartGeometry;
