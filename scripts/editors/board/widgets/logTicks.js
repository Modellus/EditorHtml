/**
 * getClassicLogRulerTicks
 *
 * Generates a complete, sorted tick array for a classic logarithmic ruler
 * (slide-rule style).  Returns one flat array containing both major and
 * minor ticks; the renderer decides how to draw each based on tick.type.
 *
 * Tick hierarchy
 * ──────────────
 *   Major ticks  — decade boundaries only: 1, 10, 100, 1000 …
 *                  minValue and maxValue are always included as major ticks
 *                  even when they are not exact powers of ten.
 *
 *   Minor ticks  — digit ticks: k × 10^n for k ∈ {2,3,4,5,6,7,8,9}
 *                  Generated for every decade that overlaps [minValue, maxValue].
 *                  Only values strictly inside (minValue, maxValue) are kept.
 *                  These are NEVER promoted to major status.
 *
 * Positioning
 * ───────────
 *   Every tick position is computed with the exact logarithmic equation:
 *
 *     normalizedPosition = (log10(v) − log10(min)) / (log10(max) − log10(min))
 *     pixelPosition      = normalizedPosition × rulerLengthPx
 *
 *   Spacing between adjacent digit ticks is therefore non-uniform and
 *   decreasing toward the end of each decade — exactly as on a slide rule.
 *
 * Labels
 * ──────
 *   tick.showLabel === true  → major ticks only; renderer should draw a label.
 *   tick.showLabel === false → minor ticks; label value is populated but hidden.
 *
 * @param {number} minValue        Positive lower bound of the visible range.
 * @param {number} maxValue        Positive upper bound (must be > minValue).
 * @param {number} rulerLengthPx   Physical ruler length in pixels.
 * @param {number} [maxMajorTicks] Maximum number of major ticks to display
 *                                 (including the two boundary ticks).  When the
 *                                 number of decade boundaries exceeds this limit,
 *                                 decades are thinned by increasing the step.
 *                                 Defaults to Infinity (show every decade).
 * @returns {Array<{value, label, type, showLabel, normalizedPosition, pixelPosition}>}
 */
function getClassicLogRulerTicks(minValue, maxValue, rulerLengthPx, maxMajorTicks = Infinity) {
    if (
        !Number.isFinite(minValue) || !Number.isFinite(maxValue) ||
        minValue <= 0 || maxValue <= minValue || rulerLengthPx <= 0
    ) return [];

    const logMin   = Math.log10(minValue);
    const logMax   = Math.log10(maxValue);
    const logRange = logMax - logMin;

    const makeTick = (v, type) => {
        const norm = Math.max(0, Math.min(1, (Math.log10(v) - logMin) / logRange));
        return {
            value: v,
            label: _formatLogLabel(v),
            type,
            showLabel: type === "major",
            normalizedPosition: norm,
            pixelPosition: norm * rulerLengthPx,
        };
    };

    const result   = [];
    const seenKeys = new Set();

    const add = (v, type) => {
        const key = _logKey(v);
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        result.push(makeTick(v, type));
    };

    // ── Major ticks: boundary values + integer powers of 10 in range ────────
    const nFirst      = Math.ceil(logMin + 1e-9);
    const nLast       = Math.floor(logMax - 1e-9);
    const decadeCount = Math.max(0, nLast - nFirst + 1);

    // Thin decades when there are more than maxMajorTicks allows.
    // The +2 accounts for the two boundary ticks (minValue and maxValue).
    let step = 1;
    if (Number.isFinite(maxMajorTicks) && maxMajorTicks >= 2)
        while (decadeCount > 0 && Math.ceil(decadeCount / step) + 2 > maxMajorTicks)
            step++;

    add(minValue, "major");
    for (let n = nFirst; n <= nLast; n += step)
        add(Math.pow(10, n), "major");
    add(maxValue, "major");

    // ── Minor ticks: k × 10^n, k ∈ {2…9}, for every decade in range ────────
    const nStart = Math.floor(logMin);
    const nEnd   = Math.ceil(logMax);

    for (let n = nStart; n < nEnd; n++) {
        const d = Math.pow(10, n);
        for (const k of [2, 3, 4, 5, 6, 7, 8, 9]) {
            const v = k * d;
            if (v > minValue && v < maxValue)
                add(v, "minor");
        }
    }

    return result.sort((a, b) => a.value - b.value);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Stable integer key for deduplication in log10 space.
 * Rounds to 9 decimal places, handling all practical floating-point values.
 */
function _logKey(v) {
    return Math.round(Math.log10(v) * 1e9);
}

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
