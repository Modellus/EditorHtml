// Shared "drag a tick to rescale an axis" interaction.
//
// Formula: newScale = |tickOffsetValue / currentPixelOffset|
//
// Each consumer provides:
//   tickOffsetValue  — signed value distance from anchor to tick (non-zero, same sign as tickOffsetPixel)
//   tickOffsetPixel  — signed pixel distance from anchor to tick at drag start
//   getPixelOffset   — function(event) → current signed pixel distance from anchor
//   onMove(scale)    — called each frame; consumer applies newScale to its own properties
//   onEnd()          — called on pointerup/cancel; consumer cleans up

class AxisTickDrag {
    constructor() {
        this._state = null;
        this._onMove = e => this._handleMove(e);
        this._onUp = e => this._handleUp(e);
    }

    start(event, { tickOffsetValue, tickOffsetPixel, getPixelOffset, onMove, onEnd } = {}) {
        if (!Number.isFinite(tickOffsetValue) || Math.abs(tickOffsetValue) < 1e-10) return false;
        if (!Number.isFinite(tickOffsetPixel) || Math.abs(tickOffsetPixel) < 0.5) return false;
        if (tickOffsetPixel * tickOffsetValue <= 0) return false;
        this._state = { pointerId: event.pointerId, tickOffsetValue, getPixelOffset, onMove, onEnd };
        window.addEventListener("pointermove", this._onMove);
        window.addEventListener("pointerup", this._onUp);
        window.addEventListener("pointercancel", this._onUp);
        return true;
    }

    _handleMove(event) {
        const state = this._state;
        if (!state || event.pointerId !== state.pointerId) return;
        event.preventDefault();
        const pixelOffset = state.getPixelOffset(event);
        if (!Number.isFinite(pixelOffset) || Math.abs(pixelOffset) < 1e-10) return;
        if (pixelOffset * state.tickOffsetValue <= 0) return;
        state.onMove(Math.abs(state.tickOffsetValue / pixelOffset));
    }

    _handleUp(event) {
        const state = this._state;
        if (!state || event.pointerId !== state.pointerId) return;
        window.removeEventListener("pointermove", this._onMove);
        window.removeEventListener("pointerup", this._onUp);
        window.removeEventListener("pointercancel", this._onUp);
        const onEnd = state.onEnd;
        this._state = null;
        if (onEnd) onEnd();
    }

    get isDragging() { return this._state !== null; }
}

// Rounds a raw value-step up/down to the nearest "nice" number (1, 2, 5 or 10
// times a power of ten). Shared by the referential and the ruler so both thin
// out their ticks the same way when they would otherwise crowd together.
function niceTickStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 0;
    const exponent = Math.floor(Math.log10(rawStep));
    const magnitude = Math.pow(10, exponent);
    const normalized = rawStep / magnitude;
    if (normalized < 1.5) return magnitude;
    if (normalized < 3) return 2 * magnitude;
    if (normalized < 7) return 5 * magnitude;
    return 10 * magnitude;
}

// Same idea as niceTickStep, but the returned step is a "nice" multiple of π so
// axes displayed in π units land on values like π/6, π/4, π/2, π, 2π. Fractions
// of π use the denominators 12, 6, 4, 3, 2; whole multiples reuse the 1/2/5/10
// progression. Returns the step measured in the axis' own value units (× π).
function nicePiTickStep(rawStep) {
    if (!Number.isFinite(rawStep) || rawStep <= 0) return 0;
    const rawStepInPi = rawStep / Math.PI;
    if (rawStepInPi < 1) {
        const candidates = [1 / 12, 1 / 6, 1 / 4, 1 / 3, 1 / 2, 1];
        const stepInPi = candidates.find(candidate => candidate >= rawStepInPi - 1e-9) ?? 1;
        return stepInPi * Math.PI;
    }
    return niceTickStep(rawStepInPi) * Math.PI;
}

// How a number reads under a tick: rounded to three decimals, and in exponent form once it is too
// long to read otherwise. Every axis in the editor labels itself this way — the chart, and the
// objects built from blocks that draw against a scale.
function formatAxisTickValue(value, axisType = "decimal") {
    if (!Number.isFinite(value))
        return "";
    if (axisType === "pi")
        return formatPiTickValue(value);
    const absoluteValue = Math.abs(value);
    if (absoluteValue >= 10000 || (absoluteValue > 0 && absoluteValue < 0.001))
        return value.toExponential(2);
    return String(Math.round(value * 1000) / 1000);
}

function formatPiTickValue(value) {
    if (!Number.isFinite(value))
        return "";
    if (Math.abs(value) < 1e-10)
        return "0";
    const ratio = value / Math.PI;
    const sign = ratio < 0 ? "-" : "";
    const absoluteRatio = Math.abs(ratio);
    let match = null;
    for (let denominator = 1; denominator <= 12; denominator++) {
        const numerator = Math.round(absoluteRatio * denominator);
        if (numerator === 0)
            continue;
        if (Math.abs(absoluteRatio - numerator / denominator) < 1e-6) {
            match = { numerator: numerator, denominator: denominator };
            break;
        }
    }
    if (!match)
        return `${formatAxisTickValue(ratio)}π`;
    const divisor = greatestCommonDivisor(match.numerator, match.denominator);
    const numerator = match.numerator / divisor;
    const denominator = match.denominator / divisor;
    const numeratorText = numerator === 1 ? "π" : `${numerator}π`;
    return denominator === 1 ? `${sign}${numeratorText}` : `${sign}${numeratorText}/${denominator}`;
}

function greatestCommonDivisor(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const temp = y;
        y = x % y;
        x = temp;
    }
    return x || 1;
}

function minorTickDivisions(majorSpacingPixels, minimumSpacingPixels = 5) {
    if (!Number.isFinite(majorSpacingPixels) || majorSpacingPixels <= 0)
        return 1;
    if (majorSpacingPixels / 10 >= minimumSpacingPixels)
        return 10;
    if (majorSpacingPixels / 2 >= minimumSpacingPixels)
        return 2;
    return 1;
}

// Lays out the major tick values of an axis on a grid of "nice" steps covering
// [minValue, maxValue]. The anchor decides where that grid starts: "inside" keeps
// every tick within the range (the referential), while "outside" starts on the
// last multiple at or before the minimum (the chart, which clips its own edges).
function buildNiceTickValues(minValue, maxValue, targetCount = 5, { axisType = "decimal", anchor = "inside" } = {}) {
    const ticks = [];
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue >= maxValue)
        return ticks;
    const rawStep = (maxValue - minValue) / Math.max(1, targetCount - 1);
    const step = axisType === "pi" ? nicePiTickStep(rawStep) : niceTickStep(rawStep);
    if (!(step > 0))
        return ticks;
    const firstTick = anchor === "outside" ? Math.floor(minValue / step) * step : Math.ceil(minValue / step) * step;
    for (let value = firstTick; value <= maxValue + step * 0.001; value += step)
        ticks.push(Math.round(value * 1e10) / 1e10);
    return ticks;
}

// Picks a "nice" major-tick step for an axis of the given length, aiming to keep
// consecutive major ticks at least minimumSpacingPixels apart.
function niceAxisTickStep(range, lengthPixels, minimumSpacingPixels = 24, axisType = "decimal") {
    if (!Number.isFinite(range) || range <= 0 || !(lengthPixels > 0))
        return 0;
    const maximumTicks = Math.max(1, Math.floor(lengthPixels / Math.max(1, minimumSpacingPixels)));
    const rawStep = range / maximumTicks;
    return axisType === "pi" ? nicePiTickStep(rawStep) : niceTickStep(rawStep);
}

// Walks the minor ticks that subdivide the major interval starting at startValue,
// calling cb(value, isMiddle) for each. The middle tick is flagged so renderers can
// draw it slightly taller, which is how every axis in the editor marks the half-way
// point of a major interval.
function forEachMinorTick(startValue, step, divisions, cb) {
    if (!(step > 0) || !(divisions >= 2))
        return;
    for (let index = 1; index < divisions; index++)
        cb(startValue + (index * step) / divisions, index * 2 === divisions);
}

// Shared look of the three tick kinds, expressed relative to the major tick so
// every axis (ruler, slope, slider) draws the same hierarchy whatever its size.
const AXIS_TICK_STYLES = {
    major: { lengthRatio: 1, strokeWidth: 1.2, opacity: 1 },
    middleMinor: { lengthRatio: 48 / 58, strokeWidth: 1.1, opacity: 0.5 },
    minor: { lengthRatio: 38 / 58, strokeWidth: 1, opacity: 0.25 }
};

function axisTickStyle(kind) {
    return AXIS_TICK_STYLES[kind] ?? AXIS_TICK_STYLES.minor;
}

// Builds the major and minor tick marks of a linear axis running from minimum to
// maximum over lengthPixels. Major ticks sit on a grid of `step` value units,
// anchored either at the axis minimum or at whole multiples of the step ("nice"),
// and each interval is subdivided whenever the minor ticks stay at least
// minorSpacingPixels apart. preferredDivisions wins over the automatic count when
// it fits, which lets a consumer align the minor ticks with its own increment.
// Returns [{ value, ratio, pixel, kind }] with kind in major/middleMinor/minor.
function buildLinearTickMarks({ minimum, maximum, lengthPixels, step, anchor = "minimum", preferredDivisions = 0, minorSpacingPixels = 5, maximumMajorTicks = 200 } = {}) {
    const marks = [];
    const range = maximum - minimum;
    if (!Number.isFinite(range) || range <= 0 || !(step > 0) || !(lengthPixels > 0))
        return marks;
    const majorSpacingPixels = (step / range) * lengthPixels;
    let divisions = minorTickDivisions(majorSpacingPixels, minorSpacingPixels);
    if (preferredDivisions >= 2 && majorSpacingPixels / preferredDivisions >= minorSpacingPixels)
        divisions = preferredDivisions;
    const epsilon = step * 1e-6;
    const firstMajor = anchor === "nice" ? Math.ceil((minimum - epsilon) / step) * step : minimum;
    const majorCount = Math.floor((maximum - firstMajor + epsilon) / step);
    if (majorCount < 0 || majorCount > maximumMajorTicks)
        return marks;
    const addMark = (value, kind) => {
        if (value < minimum - epsilon || value > maximum + epsilon)
            return;
        const ratio = (value - minimum) / range;
        marks.push({ value: value, ratio: ratio, pixel: ratio * lengthPixels, kind: kind });
    };
    // The grid starts at the first major tick, so the interval below it still owes
    // its minor ticks to the stretch of axis before that tick.
    forEachMinorTick(firstMajor - step, step, divisions, (value, isMiddle) => addMark(value, isMiddle ? "middleMinor" : "minor"));
    for (let index = 0; index <= majorCount; index++) {
        const majorValue = firstMajor + index * step;
        addMark(majorValue, "major");
        forEachMinorTick(majorValue, step, divisions, (value, isMiddle) => addMark(value, isMiddle ? "middleMinor" : "minor"));
    }
    return marks;
}

function tickHitExtents(pixelPositions, maxHalfExtent) {
    const order = pixelPositions.map((_, index) => index).sort((a, b) => pixelPositions[a] - pixelPositions[b]);
    const extents = new Array(pixelPositions.length).fill(maxHalfExtent);
    for (let k = 0; k < order.length; k++) {
        const i = order[k];
        let halfExtent = maxHalfExtent;
        if (k > 0)
            halfExtent = Math.min(halfExtent, (pixelPositions[i] - pixelPositions[order[k - 1]]) / 2);
        if (k < order.length - 1)
            halfExtent = Math.min(halfExtent, (pixelPositions[order[k + 1]] - pixelPositions[i]) / 2);
        extents[i] = Math.max(0, halfExtent);
    }
    return extents;
}
