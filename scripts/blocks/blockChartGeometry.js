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

    static isLogarithmicScale(scaleType) {
        return scaleType === "logarithmic";
    }

    static toAxisPlace(value, logarithmic) {
        if (!logarithmic)
            return value;
        return value > 0 ? Math.log10(value) : NaN;
    }

    static fromAxisPlace(place, logarithmic) {
        return logarithmic ? Math.pow(10, place) : place;
    }

    static createScales(layout, domain, scaleTypes = {}) {
        const xLogarithmic = BlockChartGeometry.isLogarithmicScale(scaleTypes.xScaleType);
        const yLogarithmic = BlockChartGeometry.isLogarithmicScale(scaleTypes.yScaleType);
        const xPlaceMin = BlockChartGeometry.toAxisPlace(domain.xMin, xLogarithmic);
        const xPlaceMax = BlockChartGeometry.toAxisPlace(domain.xMax, xLogarithmic);
        const yPlaceMin = BlockChartGeometry.toAxisPlace(domain.yMin, yLogarithmic);
        const yPlaceMax = BlockChartGeometry.toAxisPlace(domain.yMax, yLogarithmic);
        const xScale = value => {
            const ratio = (BlockChartGeometry.toAxisPlace(value, xLogarithmic) - xPlaceMin) / (xPlaceMax - xPlaceMin);
            return layout.plotLeft + ratio * layout.plotWidth;
        };
        const yScale = value => {
            const ratio = (BlockChartGeometry.toAxisPlace(value, yLogarithmic) - yPlaceMin) / (yPlaceMax - yPlaceMin);
            return layout.plotBottom - ratio * layout.plotHeight;
        };
        const xValueAt = pixel => BlockChartGeometry.fromAxisPlace(xPlaceMin + (pixel - layout.plotLeft) / layout.plotWidth * (xPlaceMax - xPlaceMin), xLogarithmic);
        const yValueAt = pixel => BlockChartGeometry.fromAxisPlace(yPlaceMin + (layout.plotBottom - pixel) / layout.plotHeight * (yPlaceMax - yPlaceMin), yLogarithmic);
        return { xScale: xScale, yScale: yScale, xValueAt: xValueAt, yValueAt: yValueAt };
    }

    static getBaselineY(yScale, plotTop, plotBottom) {
        const zeroY = yScale(0);
        if (!Number.isFinite(zeroY))
            return plotBottom;
        return Math.min(Math.max(zeroY, plotTop), plotBottom);
    }

    static toPositiveRange(minimum, maximum) {
        let low = minimum;
        let high = maximum > 0 && Number.isFinite(maximum) ? maximum : null;
        if (!(low > 0) || !Number.isFinite(low))
            low = high === null || high > 1 ? 1 : high / 10;
        if (high === null || high <= low)
            high = low * 10;
        return { minimum: low, maximum: high };
    }

    // The room a range fitted to values leaves around them, and what it does when the values are all
    // the same one. A chart pads its data this way; an object that fits its axes to a recording pads
    // it the same, so "auto scale" means one thing on the board.
    static padDomain(xMinimum, xMaximum, yMinimum, yMaximum, xLogarithmic = false, yLogarithmic = false) {
        const xRange = BlockChartGeometry.padRange(xMinimum, xMaximum, 0.04, xLogarithmic);
        const yRange = BlockChartGeometry.padRange(yMinimum, yMaximum, 0.08, yLogarithmic);
        return { xMin: xRange.minimum, xMax: xRange.maximum, yMin: yRange.minimum, yMax: yRange.maximum };
    }

    static padRange(minimum, maximum, paddingRatio, logarithmic) {
        if (logarithmic) {
            const padded = BlockChartGeometry.padRange(Math.log10(minimum), Math.log10(maximum), paddingRatio, false);
            return { minimum: Math.pow(10, padded.minimum), maximum: Math.pow(10, padded.maximum) };
        }
        let low = minimum;
        let high = maximum;
        if (low === high) {
            low -= 1;
            high += 1;
        }
        const padding = (high - low) * paddingRatio;
        return { minimum: low - padding, maximum: high + padding };
    }

    // Widens the axis that has the finer pixels-per-unit so that one unit of x and one unit of
    // y measure the same on screen, which is what a phase portrait or a trajectory needs.
    static equalizeDomain(domain, plotWidth, plotHeight, scaleTypes = {}) {
        const xLogarithmic = BlockChartGeometry.isLogarithmicScale(scaleTypes.xScaleType);
        const yLogarithmic = BlockChartGeometry.isLogarithmicScale(scaleTypes.yScaleType);
        const xMin = BlockChartGeometry.toAxisPlace(domain.xMin, xLogarithmic);
        const xMax = BlockChartGeometry.toAxisPlace(domain.xMax, xLogarithmic);
        const yMin = BlockChartGeometry.toAxisPlace(domain.yMin, yLogarithmic);
        const yMax = BlockChartGeometry.toAxisPlace(domain.yMax, yLogarithmic);
        const xRange = xMax - xMin;
        const yRange = yMax - yMin;
        if (!(xRange > 0) || !(yRange > 0) || plotWidth <= 0 || plotHeight <= 0)
            return domain;
        const xPixelsPerUnit = plotWidth / xRange;
        const yPixelsPerUnit = plotHeight / yRange;
        if (xPixelsPerUnit > yPixelsPerUnit) {
            const targetXRange = plotWidth / yPixelsPerUnit;
            const xCenter = (xMin + xMax) / 2;
            return {
                xMin: BlockChartGeometry.fromAxisPlace(xCenter - targetXRange / 2, xLogarithmic),
                xMax: BlockChartGeometry.fromAxisPlace(xCenter + targetXRange / 2, xLogarithmic),
                yMin: domain.yMin,
                yMax: domain.yMax
            };
        }
        const targetYRange = plotHeight / xPixelsPerUnit;
        const yCenter = (yMin + yMax) / 2;
        return {
            xMin: domain.xMin,
            xMax: domain.xMax,
            yMin: BlockChartGeometry.fromAxisPlace(yCenter - targetYRange / 2, yLogarithmic),
            yMax: BlockChartGeometry.fromAxisPlace(yCenter + targetYRange / 2, yLogarithmic)
        };
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
            const x = xScale(rawXValue);
            const y = yScale(rawYValue);
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                effectiveRowIndex++;
                continue;
            }
            points.push({
                rowIndex: effectiveRowIndex,
                xValue: rawXValue,
                yValue: rawYValue,
                x: x,
                y: y,
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

    static getBarGeometry(rows, argumentField, series, seriesIndex, barSeriesCount, barWidth, xScale, yScale, baselineY = yScale(0)) {
        const offset = (seriesIndex - (barSeriesCount - 1) / 2) * barWidth;
        const bars = [];
        const outliers = [];
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const rawXValue = BlockChartGeometry.getNumericValue(row, argumentField);
            const rawYValue = BlockChartGeometry.getNumericValue(row, series.valueField);
            if (rawXValue == null || rawYValue == null)
                continue;
            const xPosition = xScale(rawXValue);
            const yPosition = yScale(rawYValue);
            if (!Number.isFinite(xPosition) || !Number.isFinite(yPosition))
                continue;
            if (row[`outlier_${series.valueField}`] === true) {
                outliers.push({ x: xPosition, y: yPosition });
                continue;
            }
            bars.push({
                xValue: rawXValue,
                x: xPosition + offset - barWidth * 0.45,
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
