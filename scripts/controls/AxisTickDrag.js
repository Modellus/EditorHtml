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
