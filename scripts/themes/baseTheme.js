class BaseTheme {
    constructor() {
    }

    getStrokeColors() {
        return [
            { color: "#00000000" },
            { color: "#ffffff" },
            { color: "#1e1e1e" },
            { color: "#e03130" },
            { color: "#2f9e44" },
            { color: "#1871c2" },
            { color: "#f08c02" }
        ];
    }

    getBackgroundColors() {
        return [
            { color: "#00000000" },
            { color: "#ffffff" },
            { color: "#f7f7f7" },
            { color: "#ffc9c9" },
            { color: "#b1f2ba" },
            { color: "#a4d8ff" },
            { color: "#ffec99" }
        ];
    }

    getColorPickerPalette() {
        return [
            "#00000000", "#FFFFFF", "#F5F5F5", "#E0E0E0", "#9E9E9E", "#000000",
            "#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#C62828",
            "#FFF3E0", "#FFE0B2", "#FFCC80", "#FFB74D", "#FFA726", "#EF6C00",
            "#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#2E7D32",
            "#E3F2FD", "#BBDEFB", "#90CAF9", "#64B5F6", "#42A5F5", "#1565C0",
            "#F3E5F5", "#E1BEE7", "#CE93D8", "#BA68C8", "#AB47BC", "#6A1B9A"
        ];
    }

    getRandomStrokeColor() {
        const strokeColors = this.getStrokeColors().filter(c => c.color !== "#00000000" && c.color !== "#ffffff");
        return strokeColors[Math.floor(Math.random() * strokeColors.length)].color;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BaseTheme;