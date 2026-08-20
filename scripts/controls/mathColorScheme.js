class MathColorScheme {
    static white = { red: 1, green: 1, blue: 1, alpha: 1 };

    static black = { red: 0, green: 0, blue: 0, alpha: 1 };

    static namedColors = {
        "white": "#ffffff",
        "black": "#000000",
        "gray": "#808080",
        "grey": "#808080",
        "silver": "#c0c0c0",
        "whitesmoke": "#f5f5f5",
        "lightgray": "#d3d3d3",
        "lightgrey": "#d3d3d3",
        "darkgray": "#a9a9a9",
        "darkgrey": "#a9a9a9",
        "red": "#ff0000",
        "green": "#008000",
        "blue": "#0000ff",
        "yellow": "#ffff00",
        "navy": "#000080",
        "teal": "#008080"
    };

    static neutralChroma = 0.025;

    static chromaBoost = 1.3;

    static lightnessStep = 0.015;

    static minimumReadableContrast = 4.5;

    static reachableContrastShare = 0.95;

    static chromaFloorShare = 0.72;

    static parse(cssColor) {
        const text = String(cssColor ?? "").trim().toLowerCase();
        if (text === "" || text === "none" || text === "inherit" || text === "currentcolor")
            return null;
        if (text === "transparent")
            return { red: 0, green: 0, blue: 0, alpha: 0 };
        if (MathColorScheme.namedColors[text])
            return MathColorScheme.parseHex(MathColorScheme.namedColors[text]);
        if (text.startsWith("#"))
            return MathColorScheme.parseHex(text);
        if (text.startsWith("rgb"))
            return MathColorScheme.parseRgb(text);
        return null;
    }

    static parseHex(text) {
        const digits = text.slice(1);
        if (digits.length === 3 || digits.length === 4)
            return MathColorScheme.parseHex(`#${digits.split("").map(digit => digit + digit).join("")}`);
        if (digits.length !== 6 && digits.length !== 8)
            return null;
        const red = parseInt(digits.slice(0, 2), 16) / 255;
        const green = parseInt(digits.slice(2, 4), 16) / 255;
        const blue = parseInt(digits.slice(4, 6), 16) / 255;
        const alpha = digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1;
        if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue))
            return null;
        return { red, green, blue, alpha };
    }

    static parseRgb(text) {
        const parts = text.match(/-?[\d.]+%?/g);
        if (!parts || parts.length < 3)
            return null;
        const channels = parts.slice(0, 3).map(part => (part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part) / 255));
        const alphaPart = parts[3];
        const alpha = alphaPart === undefined ? 1 : (alphaPart.endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart));
        return { red: channels[0], green: channels[1], blue: channels[2], alpha };
    }

    static format(color) {
        const channel = value => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0");
        return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`;
    }

    static toRgba(color, alpha) {
        const channel = value => Math.round(Math.min(1, Math.max(0, value)) * 255);
        return `rgba(${channel(color.red)}, ${channel(color.green)}, ${channel(color.blue)}, ${alpha})`;
    }

    static blend(foreground, background) {
        const alpha = foreground.alpha;
        return {
            red: foreground.red * alpha + background.red * (1 - alpha),
            green: foreground.green * alpha + background.green * (1 - alpha),
            blue: foreground.blue * alpha + background.blue * (1 - alpha),
            alpha: 1
        };
    }

    static flatten(layers, base = MathColorScheme.white) {
        let composited = base;
        for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex--)
            composited = MathColorScheme.blend(layers[layerIndex], composited);
        return composited;
    }

    static toLinear(value) {
        if (value <= 0.04045)
            return value / 12.92;
        return Math.pow((value + 0.055) / 1.055, 2.4);
    }

    static toGamma(value) {
        if (value <= 0.0031308)
            return value * 12.92;
        return 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
    }

    static relativeLuminance(color) {
        const red = MathColorScheme.toLinear(color.red);
        const green = MathColorScheme.toLinear(color.green);
        const blue = MathColorScheme.toLinear(color.blue);
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }

    static contrastRatio(firstColor, secondColor) {
        const firstLuminance = MathColorScheme.relativeLuminance(firstColor);
        const secondLuminance = MathColorScheme.relativeLuminance(secondColor);
        const lighter = Math.max(firstLuminance, secondLuminance);
        const darker = Math.min(firstLuminance, secondLuminance);
        return (lighter + 0.05) / (darker + 0.05);
    }

    static isLight(color) {
        return MathColorScheme.contrastRatio(color, MathColorScheme.black) >= MathColorScheme.contrastRatio(color, MathColorScheme.white);
    }

    static toOklch(color) {
        const red = MathColorScheme.toLinear(color.red);
        const green = MathColorScheme.toLinear(color.green);
        const blue = MathColorScheme.toLinear(color.blue);
        const longCone = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
        const mediumCone = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
        const shortCone = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
        const lightness = 0.2104542553 * longCone + 0.7936177850 * mediumCone - 0.0040720468 * shortCone;
        const greenRedAxis = 1.9779984951 * longCone - 2.4285922050 * mediumCone + 0.4505937099 * shortCone;
        const blueYellowAxis = 0.0259040371 * longCone + 0.7827717662 * mediumCone - 0.8086757660 * shortCone;
        const chroma = Math.sqrt(greenRedAxis * greenRedAxis + blueYellowAxis * blueYellowAxis);
        const hue = Math.atan2(blueYellowAxis, greenRedAxis);
        return { lightness, chroma, hue };
    }

    static fromOklch(lightness, chroma, hue) {
        const greenRedAxis = chroma * Math.cos(hue);
        const blueYellowAxis = chroma * Math.sin(hue);
        const longCone = Math.pow(lightness + 0.3963377774 * greenRedAxis + 0.2158037573 * blueYellowAxis, 3);
        const mediumCone = Math.pow(lightness - 0.1055613458 * greenRedAxis - 0.0638541728 * blueYellowAxis, 3);
        const shortCone = Math.pow(lightness - 0.0894841775 * greenRedAxis - 1.2914855480 * blueYellowAxis, 3);
        const red = 4.0767416621 * longCone - 3.3077115913 * mediumCone + 0.2309699292 * shortCone;
        const green = -1.2684380046 * longCone + 2.6097574011 * mediumCone - 0.3413193965 * shortCone;
        const blue = -0.0041960863 * longCone - 0.7034186147 * mediumCone + 1.7076147010 * shortCone;
        return { red: MathColorScheme.toGamma(red), green: MathColorScheme.toGamma(green), blue: MathColorScheme.toGamma(blue), alpha: 1 };
    }

    static isInGamut(color) {
        const channels = [color.red, color.green, color.blue];
        return channels.every(value => Number.isFinite(value) && value >= -0.001 && value <= 1.001);
    }

    static clip(color) {
        return {
            red: Math.min(1, Math.max(0, color.red)),
            green: Math.min(1, Math.max(0, color.green)),
            blue: Math.min(1, Math.max(0, color.blue)),
            alpha: 1
        };
    }

    static maximumChroma(lightness, hue) {
        let insideChroma = 0;
        let outsideChroma = 0.45;
        for (let step = 0; step < 18; step++) {
            const middleChroma = (insideChroma + outsideChroma) / 2;
            if (MathColorScheme.isInGamut(MathColorScheme.fromOklch(lightness, middleChroma, hue)))
                insideChroma = middleChroma;
            else
                outsideChroma = middleChroma;
        }
        return insideChroma;
    }

    static buildCandidate(lightness, chroma, hue, chromaFloorShare = 0) {
        const gamutChroma = MathColorScheme.maximumChroma(lightness, hue);
        const floorChroma = chroma < MathColorScheme.neutralChroma ? chroma : gamutChroma * chromaFloorShare;
        const usedChroma = Math.min(gamutChroma, Math.max(chroma, floorChroma));
        return MathColorScheme.clip(MathColorScheme.fromOklch(lightness, usedChroma, hue));
    }

    static boostChroma(chroma) {
        if (chroma < MathColorScheme.neutralChroma)
            return chroma;
        return chroma * MathColorScheme.chromaBoost;
    }

    static reachableContrast(background) {
        return Math.max(MathColorScheme.contrastRatio(background, MathColorScheme.black), MathColorScheme.contrastRatio(background, MathColorScheme.white));
    }

    static effectiveContrast(background, minimumContrast) {
        const reachable = MathColorScheme.reachableContrast(background);
        if (reachable >= minimumContrast)
            return minimumContrast;
        if (reachable >= MathColorScheme.minimumReadableContrast)
            return MathColorScheme.minimumReadableContrast;
        return reachable * MathColorScheme.reachableContrastShare;
    }

    static adapt(baseColor, backgroundColor, minimumContrast) {
        const base = MathColorScheme.parse(baseColor);
        if (!base)
            return baseColor;
        const background = MathColorScheme.flatten([MathColorScheme.parse(backgroundColor) ?? MathColorScheme.white]);
        const targetContrast = MathColorScheme.effectiveContrast(background, minimumContrast);
        const oklch = MathColorScheme.toOklch(base);
        const chroma = MathColorScheme.boostChroma(oklch.chroma);
        const startCandidate = MathColorScheme.buildCandidate(oklch.lightness, chroma, oklch.hue);
        if (MathColorScheme.contrastRatio(startCandidate, background) >= targetContrast)
            return MathColorScheme.format(startCandidate);
        const towardsDark = MathColorScheme.isLight(background);
        const preferred = MathColorScheme.searchLightness(oklch.lightness, chroma, oklch.hue, background, targetContrast, towardsDark ? -1 : 1);
        if (preferred.ratio >= targetContrast)
            return MathColorScheme.format(preferred.color);
        const opposite = MathColorScheme.searchLightness(oklch.lightness, chroma, oklch.hue, background, targetContrast, towardsDark ? 1 : -1);
        if (opposite.ratio > preferred.ratio)
            return MathColorScheme.format(opposite.color);
        return MathColorScheme.format(preferred.color);
    }

    static searchLightness(startLightness, chroma, hue, background, minimumContrast, direction) {
        let bestColor = MathColorScheme.buildCandidate(startLightness, chroma, hue, MathColorScheme.chromaFloorShare);
        let bestRatio = MathColorScheme.contrastRatio(bestColor, background);
        for (let step = 1; step <= 70; step++) {
            const lightness = startLightness + direction * step * MathColorScheme.lightnessStep;
            if (lightness < 0 || lightness > 1)
                break;
            const candidate = MathColorScheme.buildCandidate(lightness, chroma, hue, MathColorScheme.chromaFloorShare);
            const ratio = MathColorScheme.contrastRatio(candidate, background);
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestColor = candidate;
            }
            if (ratio >= minimumContrast)
                return { color: candidate, ratio };
        }
        return { color: bestColor, ratio: bestRatio };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MathColorScheme;
