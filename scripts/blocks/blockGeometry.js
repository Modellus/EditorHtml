class BlockGeometry {
    static toRadians(angleDegrees) {
        return angleDegrees * Math.PI / 180;
    }

    static toDegrees(angleRadians) {
        return angleRadians * 180 / Math.PI;
    }

    static normalizeDegrees(angleDegrees) {
        return ((angleDegrees % 360) + 360) % 360;
    }

    static normalizeSignedDegrees(angleDegrees) {
        return ((angleDegrees % 360) + 540) % 360 - 180;
    }

    static polarPoint(centerX, centerY, radius, angleDegrees) {
        const radians = BlockGeometry.toRadians(angleDegrees);
        return { x: centerX + radius * Math.cos(radians), y: centerY - radius * Math.sin(radians) };
    }

    static rotatePoint(pointX, pointY, centerX, centerY, angleDegrees) {
        const radians = BlockGeometry.toRadians(angleDegrees);
        const deltaX = pointX - centerX;
        const deltaY = pointY - centerY;
        return {
            x: centerX + deltaX * Math.cos(radians) - deltaY * Math.sin(radians),
            y: centerY + deltaX * Math.sin(radians) + deltaY * Math.cos(radians)
        };
    }

    // How far an arc sweeps, always the way the drawing goes round. A whole turn and more is a whole
    // turn: the two ends stand at the same place, which is the difference between sweeping nothing
    // and sweeping everything, and only how far apart they were asked to be says which it is.
    static clockwiseSpan(startAngleDegrees, endAngleDegrees) {
        const span = Number(startAngleDegrees) - Number(endAngleDegrees);
        if (Math.abs(span) >= 360)
            return 360;
        return BlockGeometry.normalizeDegrees(span);
    }

    // A whole circle, drawn as the two halves a single arc command cannot be: an arc that ends where
    // it began is no arc at all to SVG.
    static circlePath(centerX, centerY, radius) {
        return [
            `M ${centerX - radius} ${centerY}`,
            `A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`,
            `A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY}`,
            "Z"
        ].join(" ");
    }

    static arcPath(centerX, centerY, radius, startAngleDegrees, endAngleDegrees) {
        const span = BlockGeometry.clockwiseSpan(startAngleDegrees, endAngleDegrees);
        if (span < 0.001)
            return "";
        if (span >= 360)
            return BlockGeometry.circlePath(centerX, centerY, radius);
        const largeArc = span > 180 ? 1 : 0;
        const start = BlockGeometry.polarPoint(centerX, centerY, radius, startAngleDegrees);
        const end = BlockGeometry.polarPoint(centerX, centerY, radius, endAngleDegrees);
        return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    }

    static annularSectorPath(centerX, centerY, innerRadius, outerRadius, startAngleDegrees, endAngleDegrees) {
        const span = BlockGeometry.clockwiseSpan(startAngleDegrees, endAngleDegrees);
        if (span < 0.001)
            return "";
        // Swept the whole way round, a sector is the disc it was cut from, and one with a hole in it
        // is the ring.
        if (span >= 360)
            return innerRadius > 0
                ? BlockGeometry.ringPath(centerX, centerY, innerRadius, outerRadius)
                : BlockGeometry.circlePath(centerX, centerY, outerRadius);
        const largeArc = span > 180 ? 1 : 0;
        const outerStart = BlockGeometry.polarPoint(centerX, centerY, outerRadius, startAngleDegrees);
        const outerEnd = BlockGeometry.polarPoint(centerX, centerY, outerRadius, endAngleDegrees);
        const innerEnd = BlockGeometry.polarPoint(centerX, centerY, innerRadius, endAngleDegrees);
        const innerStart = BlockGeometry.polarPoint(centerX, centerY, innerRadius, startAngleDegrees);
        return [
            `M ${outerStart.x} ${outerStart.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
            `L ${innerEnd.x} ${innerEnd.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
            "Z"
        ].join(" ");
    }

    static ringPath(centerX, centerY, innerRadius, outerRadius) {
        return [
            BlockGeometry.circlePath(centerX, centerY, outerRadius),
            `M ${centerX - innerRadius} ${centerY}`,
            `A ${innerRadius} ${innerRadius} 0 1 0 ${centerX + innerRadius} ${centerY}`,
            `A ${innerRadius} ${innerRadius} 0 1 0 ${centerX - innerRadius} ${centerY}`,
            "Z"
        ].join(" ");
    }

    static polygonPoints(points) {
        return points.map(point => `${point.x},${point.y}`).join(" ");
    }

    static distributeAngles(count, startAngleDegrees, spanDegrees, includeEnd = false) {
        const angles = [];
        const total = Math.max(0, Math.floor(count));
        if (total === 0)
            return angles;
        const divisor = includeEnd ? Math.max(1, total - 1) : total;
        for (let index = 0; index < total; index++)
            angles.push(startAngleDegrees - spanDegrees * index / divisor);
        return angles;
    }

    static tickMarks(centerX, centerY, innerRadius, outerRadius, angles) {
        return angles.map(angleDegrees => {
            const inner = BlockGeometry.polarPoint(centerX, centerY, innerRadius, angleDegrees);
            const outer = BlockGeometry.polarPoint(centerX, centerY, outerRadius, angleDegrees);
            return { angle: angleDegrees, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
        });
    }

    static needlePolygon(centerX, centerY, angleDegrees, length, baseWidth, tailLength = 0) {
        const tip = BlockGeometry.polarPoint(centerX, centerY, length, angleDegrees);
        const leftBase = BlockGeometry.polarPoint(centerX, centerY, baseWidth / 2, angleDegrees + 90);
        const rightBase = BlockGeometry.polarPoint(centerX, centerY, baseWidth / 2, angleDegrees - 90);
        if (tailLength <= 0)
            return [tip, leftBase, rightBase];
        const tail = BlockGeometry.polarPoint(centerX, centerY, tailLength, angleDegrees + 180);
        return [tip, leftBase, tail, rightBase];
    }

    static boundsOfPoints(points) {
        if (!points.length)
            return { x: 0, y: 0, width: 0, height: 0 };
        let minimumX = Infinity;
        let minimumY = Infinity;
        let maximumX = -Infinity;
        let maximumY = -Infinity;
        for (const point of points) {
            minimumX = Math.min(minimumX, point.x);
            minimumY = Math.min(minimumY, point.y);
            maximumX = Math.max(maximumX, point.x);
            maximumY = Math.max(maximumY, point.y);
        }
        return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY };
    }

    static angleFromCenter(centerX, centerY, pointX, pointY) {
        return BlockGeometry.toDegrees(Math.atan2(-(pointY - centerY), pointX - centerX));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockGeometry;
