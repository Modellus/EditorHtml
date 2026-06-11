class Utils {
    static mergeProperties(source, target) {
        for (const key in source) {
            if (source[key] instanceof Object) {
                target[key] = target[key] || {};
                Utils.mergeProperties(source[key], target[key]);
            } else
                target[key] = source[key];
        }
    }

    static cloneProperties(properties) {
        return JSON.parse(JSON.stringify(properties));
    }

    static setProperty(name, value, properties) {
        const parts = name.split(".");
        let target = properties;
        for (let index = 0; index < parts.length - 1; index++) {
            target[parts[index]] = target[parts[index]] || {};
            target = target[parts[index]];
        }
        target[parts[parts.length - 1]] = value;
    }

    static getPrecision(value) {
        const valueString = value.toString();
        return valueString.includes('.') ? valueString.split('.')[1].length : 0;
    }
     
    static greekLetters = {
        "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ",
        "\\epsilon": "ε", "\\zeta": "ζ", "\\eta": "η", "\\theta": "θ",
        "\\iota": "ι", "\\kappa": "κ", "\\lambda": "λ", "\\mu": "μ",
        "\\nu": "ν", "\\xi": "ξ", "\\omicron": "ο", "\\pi": "π",
        "\\rho": "ρ", "\\sigma": "σ", "\\tau": "τ", "\\upsilon": "υ",
        "\\phi": "φ", "\\chi": "χ", "\\psi": "ψ", "\\omega": "ω"
    };
    static greekLettersPattern = new RegExp(
        Object.keys(Utils.greekLetters)
            .sort((a, b) => b.length - a.length)
            .map(k => k.replace(/\\/g, "\\\\"))
            .join("|"), "g"
    );

    static convertGreekLetters(text) {
        if (typeof text !== "string")
            return text;
        return text.replace(Utils.greekLettersPattern, match => Utils.greekLetters[match]);
    }

    static getRegressionDisplayTerm(term, system = null) {
        const normalizedTerm = String(term ?? "").trim();
        if (normalizedTerm === "" || !system)
            return null;
        if (typeof Modellus === "undefined" || !Modellus?.TermType)
            return null;
        const resolvedTerm = system.getTerm(normalizedTerm);
        if (!resolvedTerm || resolvedTerm.type !== Modellus.TermType.REGRESSION)
            return null;
        const sourceTermName = String(resolvedTerm.sourceTermName ?? "").trim();
        if (sourceTermName === "")
            return null;
        return `\\widehat{${sourceTermName}}`;
    }

    static getDisplayedTerm(term, system = null) {
        const normalizedTerm = String(term ?? "").trim();
        if (normalizedTerm === "")
            return "";
        const regressionDisplayTerm = Utils.getRegressionDisplayTerm(normalizedTerm, system);
        if (regressionDisplayTerm)
            return regressionDisplayTerm;
        return Utils.convertGreekLetters(normalizedTerm);
    }

    static getTerms(terms, system = null) {
        return terms.map(t => ({ text: Utils.getDisplayedTerm(t, system), term: t }));
    }

    static escapeMathTermName(text) {
        const normalizedText = String(text ?? "");
        return normalizedText.replace(/(^|[^\\])_/g, "$1\\_");
    }

    static isMathTermText(text) {
        return String(text ?? "").includes("\\");
    }

    static normalizeMathTermForWidth(text) {
        const normalizedText = String(text ?? "");
        const simplifiedText = normalizedText
            .replace(/\\widehat\s*\{([^}]*)\}/g, "$1")
            .replace(/\\hat\s*\{([^}]*)\}/g, "$1")
            .replace(/\\[a-zA-Z]+/g, "")
            .replace(/[{}]/g, "");
        if (simplifiedText !== "")
            return Utils.convertGreekLetters(simplifiedText);
        return Utils.convertGreekLetters(normalizedText);
    }

    static convertMathTermToPlainText(text) {
        const normalizedText = String(text ?? "");
        const withHatText = normalizedText
            .replace(/\\widehat\s*\{([^}]*)\}/g, (_, innerText) => `${innerText}\u0302`)
            .replace(/\\hat\s*\{([^}]*)\}/g, (_, innerText) => `${innerText}\u0302`);
        return Utils.convertGreekLetters(withHatText);
    }

    static formatMathTermName(text) {
        return Utils.escapeMathTermName(String(text ?? ""));
    }

    static buildReadOnlyMathFieldMarkup(mathText, styleText = "") {
        const normalizedStyle = String(styleText ?? "").trim();
        const styleAttribute = normalizedStyle === "" ? "" : ` style=\"${normalizedStyle}\"`;
        return `<math-field read-only class=\"form-math-field\"${styleAttribute}>${Utils.formatMathTermName(mathText)}</math-field>`;
    }

    static setMathFieldValue(mathFieldElement, mathValue) {
        if (!mathFieldElement)
            return;
        const normalizedValue = Utils.formatMathTermName(mathValue);
        if (typeof mathFieldElement.setValue === "function")
            mathFieldElement.setValue(normalizedValue);
        else
            mathFieldElement.value = normalizedValue;
    }

    static throttle(func, delay) {
        let timeoutId;
        let lastArgs;
        let lastThis;
        let lastExecTime = 0;

        return function(...args) {
            lastArgs = args;
            lastThis = this;
            const currentTime = Date.now();
            if (currentTime - lastExecTime > delay) {
                lastExecTime = currentTime;
                func.apply(lastThis, lastArgs);
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    lastExecTime = Date.now();
                    func.apply(lastThis, lastArgs);
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    static roundToPrecision(value, precision) {
        const factor = 10 ** precision;
        return Math.round(value * factor) / factor;
    }

    static getContrastColor(color) {
        const rgb = Utils.parseColorToRgb(color);
        if (!rgb)
            return "#ffffff";
        const linearRed = Utils.toLinearColorChannel(rgb.red / 255);
        const linearGreen = Utils.toLinearColorChannel(rgb.green / 255);
        const linearBlue = Utils.toLinearColorChannel(rgb.blue / 255);
        const luminance = 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
        if (luminance > 0.45)
            return "#000000";
        return "#ffffff";
    }

    static parseColorToRgb(colorValue) {
        const normalizedValue = String(colorValue ?? "").trim();
        if (normalizedValue === "")
            return null;
        if (normalizedValue.startsWith("#"))
            return Utils.parseHexColor(normalizedValue);
        if (normalizedValue.startsWith("rgb"))
            return Utils.parseRgbColor(normalizedValue);
        return null;
    }

    static parseHexColor(colorValue) {
        const hexValue = colorValue.slice(1);
        if (hexValue.length === 3 || hexValue.length === 4)
            return {
                red: parseInt(hexValue[0] + hexValue[0], 16),
                green: parseInt(hexValue[1] + hexValue[1], 16),
                blue: parseInt(hexValue[2] + hexValue[2], 16)
            };
        if (hexValue.length === 6 || hexValue.length === 8)
            return {
                red: parseInt(hexValue.slice(0, 2), 16),
                green: parseInt(hexValue.slice(2, 4), 16),
                blue: parseInt(hexValue.slice(4, 6), 16)
            };
        return null;
    }

    static parseRgbColor(colorValue) {
        const match = colorValue.match(/^rgba?\(([^)]+)\)$/i);
        if (!match)
            return null;
        const channelValues = match[1].split(",").map(value => Number(value.trim()));
        if (channelValues.length < 3)
            return null;
        const red = Utils.clampColorChannel(channelValues[0]);
        const green = Utils.clampColorChannel(channelValues[1]);
        const blue = Utils.clampColorChannel(channelValues[2]);
        if (red == null || green == null || blue == null)
            return null;
        return { red, green, blue };
    }

    static clampColorChannel(value) {
        if (!Number.isFinite(value))
            return null;
        if (value < 0)
            return 0;
        if (value > 255)
            return 255;
        return Math.round(value);
    }

    static toLinearColorChannel(channelValue) {
        if (channelValue <= 0.03928)
            return channelValue / 12.92;
        return ((channelValue + 0.055) / 1.055) ** 2.4;
    }

    static valueBadgeSvgMarkup(text, x, y, options = {}) {
        const fontSize = options.fontSize ?? 10;
        const fontFamily = options.fontFamily ?? "Katex_Main";
        const backgroundColor = options.backgroundColor ?? "#666666";
        const textColor = options.textColor ?? Utils.getContrastColor(backgroundColor);
        const anchor = options.anchor ?? "middle";
        const paddingX = options.paddingX ?? 4;
        const paddingY = options.paddingY ?? 2;
        const height = fontSize + paddingY * 2;
        const charWidth = fontSize * 0.58;
        const textWidth = String(text ?? "").length * charWidth;
        const width = textWidth + paddingX * 2;
        let rectX = x - width / 2;
        if (anchor === "start")
            rectX = x - paddingX;
        else if (anchor === "end")
            rectX = x - width + paddingX;
        const rectY = y - height / 2;
        const textY = y + fontSize * 0.35;
        const escapedText = String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
        return `<rect x="${rectX}" y="${rectY}" width="${width}" height="${height}" rx="3" fill="${backgroundColor}" fill-opacity="0.85" /><text x="${x}" y="${textY}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${fontSize}" fill="${textColor}">${escapedText}</text>`;
    }

    static createTooltip(e, html, width, canShow) {
        return $('<div>')
            .appendTo('body')
            .dxTooltip({
                target: e.component.element(),
                contentTemplate: function (contentElement) {
                    contentElement.append(
                        $('<div class="tooltip"/>').html(html)
                    );
                },
                onShowing: tooltipEvent => {
                    if (typeof canShow === 'function' && !canShow())
                        tooltipEvent.cancel = true;
                },
                showEvent: {
                    delay: 1000,
                    name: 'mouseenter'
                },
                hideEvent: 'mouseleave',
                position: 'top',
                width: width ?? 200
            })
            .dxTooltip('instance');
    }

    static createTranslatedTooltip(e, key, translations, width, canShow) {
        return Utils.createTooltip(e, translations.get(key), width, canShow);
    }

    static async toHtml(markdownValue) {
        const { unified } = await import("https://esm.sh/unified@11");
        const { default: remarkParse } = await import("https://esm.sh/remark-parse@11");
        const { default: remarkRehype } = await import("https://esm.sh/remark-rehype@11");
        const { default: rehypeStringify } = await import("https://esm.sh/rehype-stringify@10");
        return unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(rehypeStringify)
            .processSync(markdownValue)
            .toString();
    }

    static async fromHtml(htmlValue) {
        const { unified } = await import("https://esm.sh/unified@11");
        const { default: rehypeParse } = await import("https://esm.sh/rehype-parse@9");
        const { default: rehypeRemark } = await import("https://esm.sh/rehype-remark@10");
        const { default: remarkStringify } = await import("https://esm.sh/remark-stringify@11");
        return unified()
            .use(rehypeParse)
            .use(rehypeRemark)
            .use(remarkStringify)
            .processSync(htmlValue)
            .toString();
    }

    static generateThumbPlaceholder(seed) {
        const str = String(seed || "default");
        let hash = 0;
        for (let i = 0; i < str.length; i++)
            hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        hash = Math.abs(hash);
        const palettes = [
            ["#dbeafe", "#93c5fd"],
            ["#fce7f3", "#f9a8d4"],
            ["#d1fae5", "#6ee7b7"],
            ["#fef3c7", "#fcd34d"],
            ["#ede9fe", "#c4b5fd"],
            ["#ffedd5", "#fdba74"],
            ["#cffafe", "#67e8f9"],
            ["#ecfdf5", "#a7f3d0"]
        ];
        const [base, accent] = palettes[hash % palettes.length];
        const patternIndex = (hash >> 4) % 4;
        if (patternIndex === 0)
            return `background-color:${base};background-image:radial-gradient(circle,${accent} 1.5px,transparent 1.5px);background-size:14px 14px`;
        if (patternIndex === 1)
            return `background-color:${base};background-image:repeating-linear-gradient(45deg,${accent} 0,${accent} 1.5px,transparent 0,transparent 10px)`;
        if (patternIndex === 2)
            return `background-color:${base};background-image:linear-gradient(${accent} 1px,transparent 1px),linear-gradient(90deg,${accent} 1px,transparent 1px);background-size:16px 16px`;
        return `background:linear-gradient(135deg,${base},${accent})`;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = Utils;

document.addEventListener("click", event => {
    const item = event.target.closest(".mdl-dropdown-list-item");
    if (!item)
        return;
    const control = item.querySelector(".mdl-dropdown-list-control");
    if (!control)
        return;
    const buttons = control.querySelectorAll(".dx-button");
    if (buttons.length !== 1)
        return;
    if (buttons[0].contains(event.target))
        return;
    buttons[0].click();
});
