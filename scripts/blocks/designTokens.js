class BlockTokens {
    static presets = {
        standard: {
            "surface.default": "#ffffff",
            "surface.emphasis": "#f7f7f7",
            "surface.muted": "#eeeeee",
            "stroke.default": "#1e1e1e",
            "stroke.strong": "#000000",
            "stroke.subtle": "#9a9a9a",
            "stroke.accent": "#1871c2",
            "stroke.warning": "#e03130",
            "text.primary": "#1e1e1e",
            "text.secondary": "#6b6b6b",
            "text.inverse": "#ffffff",
            "selection.outline": "#1871c2",
            "handle.fill": "#ffffff",
            "handle.stroke": "#1871c2",
            "strokeWidth.hairline": 0.5,
            "strokeWidth.default": 1,
            "strokeWidth.strong": 2,
            "strokeWidth.heavy": 3,
            "radius.small": 2,
            "radius.medium": 4,
            "radius.large": 8,
            "spacing.small": 4,
            "spacing.medium": 8,
            "spacing.large": 16,
            "font.family": "Inter, Segoe UI, sans-serif",
            "font.size.small": 9,
            "font.size.default": 11,
            "font.size.large": 14,
            "font.weight.default": 400,
            "font.weight.strong": 600,
            "shadow.soft": "0 1px 2px rgba(0,0,0,0.16)",
            "opacity.disabled": 0.4,
            "opacity.ghost": 0.5,
            "duration.fast": 120,
            "duration.default": 240,
            "size.default.width": 180,
            "size.default.height": 180,
            "handle.size": 8
        },
        minimal: {
            "surface.default": "#ffffff",
            "surface.emphasis": "#ffffff",
            "surface.muted": "#fafafa",
            "stroke.default": "#5c5c5c",
            "stroke.strong": "#1e1e1e",
            "stroke.subtle": "#d0d0d0",
            "stroke.accent": "#5c5c5c",
            "text.primary": "#3d3d3d",
            "text.secondary": "#9a9a9a",
            "strokeWidth.default": 0.75,
            "strokeWidth.strong": 1.25,
            "font.size.small": 8,
            "font.size.default": 10
        },
        scientific: {
            "surface.default": "#ffffff",
            "surface.emphasis": "#f4f7fa",
            "stroke.default": "#12324f",
            "stroke.strong": "#0b1f31",
            "stroke.accent": "#1871c2",
            "text.primary": "#12324f",
            "text.secondary": "#4a6c88",
            "font.family": "KaTeX_Main, Inter, serif",
            "strokeWidth.default": 1,
            "strokeWidth.strong": 1.6
        },
        classroom: {
            "surface.default": "#fffdf5",
            "surface.emphasis": "#ffec99",
            "stroke.default": "#2f4858",
            "stroke.strong": "#1d2d38",
            "stroke.accent": "#f08c02",
            "stroke.warning": "#e03130",
            "text.primary": "#2f4858",
            "text.secondary": "#7a6a4f",
            "strokeWidth.default": 1.5,
            "strokeWidth.strong": 2.5,
            "font.size.default": 12,
            "font.weight.default": 600
        },
        "high-contrast": {
            "surface.default": "#ffffff",
            "surface.emphasis": "#ffffff",
            "surface.muted": "#ffffff",
            "stroke.default": "#000000",
            "stroke.strong": "#000000",
            "stroke.subtle": "#000000",
            "stroke.accent": "#000000",
            "text.primary": "#000000",
            "text.secondary": "#000000",
            "strokeWidth.default": 2,
            "strokeWidth.strong": 3,
            "strokeWidth.heavy": 4,
            "font.weight.default": 700,
            "font.size.default": 13
        }
    };

    static getPresetNames() {
        return Object.keys(BlockTokens.presets);
    }

    static isPreset(name) {
        return Object.prototype.hasOwnProperty.call(BlockTokens.presets, name);
    }

    static resolvePreset(name) {
        const presetName = BlockTokens.isPreset(name) ? name : "standard";
        if (presetName === "standard")
            return Object.assign({}, BlockTokens.presets.standard);
        return Object.assign({}, BlockTokens.presets.standard, BlockTokens.presets[presetName]);
    }

    constructor(presetName = "standard", overrides = null) {
        this.presetName = BlockTokens.isPreset(presetName) ? presetName : "standard";
        this.values = Object.assign(BlockTokens.resolvePreset(this.presetName), overrides ?? {});
    }

    has(tokenName) {
        return Object.prototype.hasOwnProperty.call(this.values, tokenName);
    }

    get(tokenName, fallbackValue = null) {
        if (this.has(tokenName))
            return this.values[tokenName];
        return fallbackValue;
    }

    getNumber(tokenName, fallbackValue = 0) {
        const value = Number(this.get(tokenName, fallbackValue));
        if (!Number.isFinite(value))
            return fallbackValue;
        return value;
    }

    isTokenReference(value) {
        return typeof value === "string" && value.startsWith("token:");
    }

    resolveValue(value, fallbackValue = null) {
        if (!this.isTokenReference(value))
            return value;
        return this.get(value.slice(6), fallbackValue);
    }

    listTokens() {
        return Object.keys(this.values).map(name => ({ name: name, value: this.values[name] }));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockTokens;
