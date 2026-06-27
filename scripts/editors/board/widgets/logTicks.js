/**
 * Logarithmic ruler tick generation
 *
 * Core principle:
 *   Every major interval spans exactly one decade (factor of 10) and has
 *   the same physical width W = rulerLengthPx / logRange.
 *   Within each interval the minor ticks are placed using:
 *
 *     position = log10(k)          (k = 2..9 for the standard decade scale)
 *     x = intervalStart + position × W
 *
 *   This is identical to the global formula
 *     pixelPosition = (log10(v) − log10(min)) / (log10(max) − log10(min)) × rulerLengthPx
 *   evaluated for v = k × 10^n, which proves the two approaches are equivalent.
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * getLogMajorTicks
 *
 * Returns ticks at every decade boundary (power of 10) within [minValue, maxValue].
 * minValue and maxValue are always included as boundary ticks even when they
 * are not themselves powers of 10.  All intervals between consecutive ticks
 * have equal pixel width because their log10 span is always exactly 1 decade.
 *
 * @param {number} minValue        - Positive lower bound
 * @param {number} maxValue        - Positive upper bound (> minValue)
 * @param {number} desiredTickCount - Hint; decades are thinned if there are too many
 * @param {number} rulerLengthPx   - Physical ruler length in pixels
 * @returns {Array<{value, label, normalizedPosition, pixelPosition}>}
 */
function getLogMajorTicks(minValue, maxValue, desiredTickCount, rulerLengthPx) {
    if (
        !Number.isFinite(minValue) || !Number.isFinite(maxValue) ||
        minValue <= 0 || maxValue <= minValue ||
        desiredTickCount < 2 || rulerLengthPx <= 0
    ) return [];

    const logMin   = Math.log10(minValue);
    const logMax   = Math.log10(maxValue);
    const logRange = logMax - logMin;

    const makeTick = v => {
        const norm = Math.max(0, Math.min(1, (Math.log10(v) - logMin) / logRange));
        return { value: v, label: _formatLogLabel(v), normalizedPosition: norm, pixelPosition: norm * rulerLengthPx };
    };

    // Integer decade exponents strictly inside (logMin, logMax)
    const nFirst = Math.ceil(logMin + 1e-9);
    const nLast  = Math.floor(logMax - 1e-9);
    const decadeCount = Math.max(0, nLast - nFirst + 1);

    // Thin decades if there are more than desiredTickCount allows
    let step = 1;
    while (decadeCount > 0 && Math.ceil(decadeCount / step) + 2 > desiredTickCount)
        step++;

    const raw = [makeTick(minValue)];
    for (let n = nFirst; n <= nLast; n += step)
        raw.push(makeTick(Math.pow(10, n)));
    raw.push(makeTick(maxValue));

    // Remove duplicates that fall on the same normalised position
    const result = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
        if (Math.abs(raw[i].normalizedPosition - result[result.length - 1].normalizedPosition) > 1e-9)
            result.push(raw[i]);
    }
    return result;
}

/**
 * getLogMinorTicks
 *
 * For every decade n in the range [minValue, maxValue] generates minor ticks at
 * k × 10^n for k ∈ {2,3,4,5,6,7,8,9}, placed at log10(k) × W from the start
 * of the decade interval.  This pattern is identical in every decade.
 *
 * Three visual levels:
 *   Level 1 — k = 5           (the most prominent sub-tick; inserted first)
 *   Level 2 — k = 2,3,4,6,7,8,9   (all other integer sub-ticks)
 *   Level 3 — k ± 0.5 midpoints   (1.5, 2.5 … 9.5; shown only when W is wide)
 *
 * Adaptive density:
 *   Level 1 shown when W ≥ 20 px
 *   Level 2 shown when W ≥ 40 px   (collision avoidance removes crowded ticks)
 *   Level 3 shown when W ≥ 90 px
 *
 * Collision avoidance: any tick closer than MIN_GAP px to an already-placed
 * tick (major or minor) is silently skipped.
 *
 * @param {Array}  majorTicks   - Result of getLogMajorTicks
 * @param {number} minValue
 * @param {number} maxValue
 * @param {number} rulerLengthPx
 * @returns {Array<{value, normalizedPosition, pixelPosition, level}>}
 */
function getLogMinorTicks(majorTicks, minValue, maxValue, rulerLengthPx) {
    if (
        !majorTicks || majorTicks.length < 2 ||
        minValue <= 0 || maxValue <= minValue || rulerLengthPx <= 0
    ) return [];

    const logMin   = Math.log10(minValue);
    const logMax   = Math.log10(maxValue);
    const logRange = logMax - logMin;

    // Uniform decade width in pixels
    const W = rulerLengthPx / logRange;
    if (W < 20) return [];

    const toPx   = v => (Math.log10(v) - logMin) / logRange * rulerLengthPx;
    const toNorm = v => (Math.log10(v) - logMin) / logRange;
    const MIN_GAP = 6;

    // Seed the occupied-position list with every major tick
    const placedPx  = majorTicks.map(t => t.pixelPosition);
    const majorKeys = new Set(majorTicks.map(t => _logKey(t.value)));

    const results = [];

    const tryAdd = (v, level) => {
        if (v <= minValue || v >= maxValue) return;
        if (majorKeys.has(_logKey(v))) return;
        const px = toPx(v);
        if (px < 0 || px > rulerLengthPx) return;
        if (placedPx.some(p => Math.abs(p - px) < MIN_GAP)) return;
        results.push({ value: v, normalizedPosition: toNorm(v), pixelPosition: px, level });
        placedPx.push(px);
    };

    const nStart = Math.floor(logMin);
    const nEnd   = Math.ceil(logMax);

    // ── Level 1: k = 5 (inserted first so it always claims its space) ────────
    for (let n = nStart; n < nEnd; n++)
        tryAdd(5 * Math.pow(10, n), 1);

    // ── Level 2: k = 2, 3, 4, 6, 7, 8, 9 ────────────────────────────────────
    if (W >= 40) {
        for (let n = nStart; n < nEnd; n++) {
            const d = Math.pow(10, n);
            for (const k of [2, 3, 4, 6, 7, 8, 9])
                tryAdd(k * d, 2);
        }
    }

    // ── Level 3: half-step midpoints (1.5, 2.5, …, 9.5) ─────────────────────
    if (W >= 90) {
        for (let n = nStart; n < nEnd; n++) {
            const d = Math.pow(10, n);
            for (const kf of [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5])
                tryAdd(kf * d, 3);
        }
    }

    return results.sort((a, b) => a.value - b.value);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Stable key for value deduplication.
 * Uses log10 space so it works correctly across the full floating-point range.
 */
function _logKey(v) {
    return Math.round(Math.log10(v) * 1e9);
}

/**
 * Formats a positive number as a compact readable label.
 * 1000 → "1k", 2 500 000 → "2.5M", 0.005 → "0.005"
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
