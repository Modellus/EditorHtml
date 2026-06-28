/**
 * getClassicLogRulerTicks
 *
 * Generates the complete tick array for a logarithmic ruler, following the
 * same structural rules as the linear ruler:
 *
 *   • Exactly majorTickCount major tick intervals (majorTickCount + 1 ticks),
 *     evenly distributed in log space from minValue to maxValue.
 *
 *   • Between every pair of consecutive major ticks, exactly 9 minor ticks,
 *     also evenly distributed in log space (equal pixel spacing within each
 *     major interval).  The middle one (index 5 of 9) is flagged as
 *     isMiddle = true so the renderer can draw it slightly taller, mirroring
 *     the linear ruler's half-way tick.
 *
 * Positioning
 * ───────────
 *   All positions are derived from the logarithmic formula:
 *
 *     normalizedPosition = (log10(v) − log10(min)) / (log10(max) − log10(min))
 *     pixelPosition      = normalizedPosition × rulerLengthPx
 *
 *   Because major ticks are placed at equal log-space intervals, they are
 *   also equally spaced in pixels.  Minor ticks subdivide each major interval
 *   into 10 equal log-space (= pixel) sub-intervals.
 *
 * Labels
 * ──────
 *   tick.showLabel === true  → major ticks only.
 *   tick.showLabel === false → minor ticks; label field is populated but hidden.
 *
 * @param {number} minValue        Positive lower bound.
 * @param {number} maxValue        Positive upper bound (must be > minValue).
 * @param {number} rulerLengthPx   Physical ruler length in pixels.
 * @param {number} majorTickCount  Number of major tick intervals (i.e. the
 *                                 value from the toolbar).  Produces
 *                                 majorTickCount + 1 major ticks.
 * @returns {Array<{value, label, type, showLabel, isMiddle, normalizedPosition, pixelPosition}>}
 */
function getClassicLogRulerTicks(minValue, maxValue, rulerLengthPx, majorTickCount) {
    if (
        !Number.isFinite(minValue) || !Number.isFinite(maxValue) ||
        minValue <= 0 || maxValue <= minValue || rulerLengthPx <= 0 ||
        !Number.isFinite(majorTickCount) || majorTickCount < 1
    ) return [];

    const logMin   = Math.log10(minValue);
    const logRange = Math.log10(maxValue) - logMin;

    const result = [];

    for (let i = 0; i <= majorTickCount; i++) {
        const tMajor = i / majorTickCount;
        const logV   = logMin + tMajor * logRange;
        const v      = Math.pow(10, logV);

        result.push({
            value:              v,
            label:              _formatLogLabel(v),
            type:               "major",
            showLabel:          true,
            isMiddle:           false,
            normalizedPosition: tMajor,
            pixelPosition:      tMajor * rulerLengthPx,
        });

        if (i < majorTickCount) {
            const vNext     = Math.pow(10, logMin + ((i + 1) / majorTickCount) * logRange);
            const valueStep = (vNext - v) / 10;

            for (let j = 1; j <= 9; j++) {
                const minorV = v + j * valueStep;
                const norm   = (Math.log10(minorV) - logMin) / logRange;

                result.push({
                    value:              minorV,
                    label:              _formatLogLabel(minorV),
                    type:               "minor",
                    showLabel:          false,
                    isMiddle:           j === 5,
                    normalizedPosition: norm,
                    pixelPosition:      norm * rulerLengthPx,
                });
            }
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compact, human-readable label for a positive number.
 * 1000 → "1k"  |  2 500 000 → "2.5M"  |  0.005 → "0.005"
 */
function _formatLogLabel(value) {
    if (value >= 1e9) return _compact(value / 1e9) + "G";
    if (value >= 1e6) return _compact(value / 1e6) + "M";
    if (value >= 1e3) return _compact(value / 1e3) + "k";
    return _compact(value);
}

/** Up to 4 significant figures, no trailing zeros. */
function _compact(v) {
    const r = parseFloat(v.toPrecision(4));
    return r % 1 === 0 ? String(Math.round(r)) : String(r);
}
