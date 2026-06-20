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

    static parseMathTermLatex(latexValue) {
        let remaining = String(latexValue ?? "").trim();
        let hat = null;
        const widehatMatch = remaining.match(/^\\widehat\{([\s\S]*)\}$/);
        const hatMatch = remaining.match(/^\\hat\{([\s\S]*)\}$/);
        if (widehatMatch) {
            hat = "wide";
            remaining = widehatMatch[1];
        } else if (hatMatch) {
            hat = "narrow";
            remaining = hatMatch[1];
        }
        let base = remaining;
        let subscript = null;
        let superscript = null;
        const subMatch = remaining.match(/^([\s\S]+?)\\_(\{[^}]*\}|[^\\])/);
        if (subMatch) {
            base = remaining.slice(0, subMatch.index + subMatch[1].length);
            const rawSub = remaining.slice(subMatch.index + subMatch[1].length + 2);
            subscript = rawSub.startsWith("{") && rawSub.includes("}") ? rawSub.slice(1, rawSub.indexOf("}")) : rawSub.replace(/\\_/g, "_");
        } else {
            const supMatch = remaining.match(/^([\s\S]+?)\^(\{[^}]*\}|.)/);
            if (supMatch) {
                base = supMatch[1];
                const rawSup = supMatch[2];
                superscript = rawSup.startsWith("{") ? rawSup.slice(1, -1) : rawSup;
            }
        }
        base = Utils.convertGreekLetters(base);
        if (subscript !== null)
            subscript = Utils.convertGreekLetters(subscript);
        if (superscript !== null)
            superscript = Utils.convertGreekLetters(superscript);
        return { base, subscript, superscript, hat };
    }

    static _caseIconData = {};
    static _caseIconsLoadingPromise = null;
    static _caseIconsLoadedCallbacks = [];

    static getCaseIconColor(caseNumber) {
        const caseColors = [
            "#E53935", "#FB8C00", "#F9A825", "#43A047", "#1E88E5",
            "#8E24AA", "#00897B", "#6D4C41", "#546E7A"
        ];
        const normalizedCaseNumber = Math.max(1, Math.min(9, parseInt(caseNumber, 10) || 1));
        return caseColors[normalizedCaseNumber - 1];
    }

    static getCaseIconSize(caseNumber, fontSize) {
        const iconData = Utils._caseIconData[caseNumber];
        const baseHeight = Math.max(8, fontSize * 0.85);
        const iconWidth = iconData?.width ?? 448;
        const iconHeight = iconData?.height ?? 512;
        return { width: baseHeight * (iconWidth / iconHeight), height: baseHeight };
    }

    static estimateCaseTermWidth(caseNumber, termLatex, fontSize) {
        const termWidth = Utils.estimateMathTermWidth(termLatex, fontSize);
        if (caseNumber == null)
            return termWidth;
        return termWidth + 3 + Utils.getCaseIconSize(caseNumber, fontSize).width;
    }

    static ensureCaseIconsLoaded(onLoaded) {
        if (onLoaded)
            Utils._caseIconsLoadedCallbacks.push(onLoaded);
        if (!Utils._caseIconsLoadingPromise)
            Utils._caseIconsLoadingPromise = Utils._loadAllCaseIcons();
        return Utils._caseIconsLoadingPromise;
    }

    static async _loadAllCaseIcons() {
        const loaders = [];
        for (let caseNumber = 1; caseNumber <= 9; caseNumber++)
            loaders.push(Utils._loadCaseIcon(caseNumber));
        await Promise.all(loaders);
        const callbacks = Utils._caseIconsLoadedCallbacks.splice(0);
        for (const callback of callbacks)
            callback();
    }

    static async _loadCaseIcon(caseNumber) {
        try {
            const response = await fetch(`../../libraries/fontawesome/svgs/solid/square-${caseNumber}.svg`);
            if (!response.ok)
                return;
            const svgText = await response.text();
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
            const pathData = svgDoc.querySelector("path")?.getAttribute("d");
            if (!pathData)
                return;
            const viewBoxText = String(svgDoc.querySelector("svg")?.getAttribute("viewBox") ?? "").trim();
            const viewBoxValues = viewBoxText.split(/\s+/).map(Number);
            const viewBoxWidth = viewBoxValues.length === 4 && Number.isFinite(viewBoxValues[2]) && viewBoxValues[2] > 0 ? viewBoxValues[2] : 448;
            const viewBoxHeight = viewBoxValues.length === 4 && Number.isFinite(viewBoxValues[3]) && viewBoxValues[3] > 0 ? viewBoxValues[3] : 512;
            Utils._caseIconData[caseNumber] = { width: viewBoxWidth, height: viewBoxHeight, pathData };
        } catch (_) {
        }
    }

    static appendCaseTermSvg(layer, x, baselineY, fontSize, fill, caseNumber, termLatex) {
        const svgNs = "http://www.w3.org/2000/svg";
        const group = document.createElementNS(svgNs, "g");
        layer.appendChild(group);
        if (caseNumber != null) {
            const iconData = Utils._caseIconData[caseNumber];
            if (iconData?.pathData) {
                const iconSize = Utils.getCaseIconSize(caseNumber, fontSize);
                const termWidth = Utils.estimateMathTermWidth(termLatex, fontSize);
                const iconX = x + termWidth + 3;
                const topY = baselineY - iconSize.height * 0.82;
                const scaleX = iconSize.width / iconData.width;
                const scaleY = iconSize.height / iconData.height;
                const iconGroup = document.createElementNS(svgNs, "g");
                iconGroup.setAttribute("transform", `translate(${iconX} ${topY}) scale(${scaleX} ${scaleY})`);
                const iconPath = document.createElementNS(svgNs, "path");
                iconPath.setAttribute("d", iconData.pathData);
                iconPath.setAttribute("fill", Utils.getCaseIconColor(caseNumber));
                iconGroup.appendChild(iconPath);
                group.appendChild(iconGroup);
            }
        }
        MathJax.startup.promise
            .then(() => MathJax.tex2svgPromise(String(termLatex ?? "")))
            .then(svgNode => {
                if (!group.isConnected)
                    return;
                const svgElement = svgNode.querySelector("svg");
                const cloned = svgElement.cloneNode(true);
                const exValue = parseFloat(cloned.getAttribute("width")) || 1;
                const svgWidth = exValue * fontSize * 0.5;
                const svgHeight = svgWidth * (parseFloat(cloned.getAttribute("height")) / exValue);
                const topY = baselineY - svgHeight * 0.82;
                cloned.setAttribute("width", `${svgWidth}`);
                cloned.setAttribute("height", `${svgHeight}`);
                cloned.style.color = fill;
                cloned.style.overflow = "visible";
                const wrapper = document.createElementNS(svgNs, "g");
                wrapper.setAttribute("transform", `translate(${x}, ${topY})`);
                wrapper.appendChild(cloned);
                group.appendChild(wrapper);
            });
        return group;
    }

    static estimateMathTermWidth(latexValue, fontSize) {
        const parsed = Utils.parseMathTermLatex(latexValue);
        const baseWidth = String(parsed.base).length * fontSize * 0.58;
        if (parsed.subscript === null && parsed.superscript === null)
            return baseWidth;
        const scriptFontSize = Math.ceil(fontSize * 0.65);
        const scriptText = parsed.subscript ?? parsed.superscript;
        return baseWidth + 1 + String(scriptText).length * scriptFontSize * 0.58;
    }

    static setTermValueTextContent(textElement, termLatex, valueText) {
        while (textElement.firstChild)
            textElement.removeChild(textElement.firstChild);
        const svgNs = "http://www.w3.org/2000/svg";
        if (!termLatex) {
            const valueSpan = document.createElementNS(svgNs, "tspan");
            valueSpan.setAttribute("font-family", "Katex_Main");
            valueSpan.setAttribute("dominant-baseline", "central");
            valueSpan.textContent = valueText;
            textElement.appendChild(valueSpan);
            return;
        }
        const termSpan = document.createElementNS(svgNs, "tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.setAttribute("dominant-baseline", "central");
        termSpan.textContent = Utils.convertMathTermToPlainText(termLatex);
        textElement.appendChild(termSpan);
        const restSpan = document.createElementNS(svgNs, "tspan");
        restSpan.setAttribute("font-family", "Katex_Main");
        restSpan.setAttribute("dominant-baseline", "central");
        restSpan.textContent = ` = ${valueText}`;
        textElement.appendChild(restSpan);
    }

    static applyCaseIconSvg(group, iconX, iconY, iconSize, caseNumber) {
        while (group.firstChild)
            group.removeChild(group.firstChild);
        if (caseNumber == null)
            return;
        const iconData = Utils._caseIconData[caseNumber];
        if (!iconData?.pathData)
            return;
        const svgNs = "http://www.w3.org/2000/svg";
        const scaleX = iconSize / iconData.width;
        const scaleY = iconSize / iconData.height;
        const iconGroup = document.createElementNS(svgNs, "g");
        iconGroup.setAttribute("transform", `translate(${iconX} ${iconY}) scale(${scaleX} ${scaleY})`);
        const iconPath = document.createElementNS(svgNs, "path");
        iconPath.setAttribute("d", iconData.pathData);
        iconPath.setAttribute("fill", Utils.getCaseIconColor(caseNumber));
        iconGroup.appendChild(iconPath);
        group.appendChild(iconGroup);
    }

    static applyTermLabelBackground(backgroundRect, textElement, color, anchor) {
        const paddingX = 4;
        const paddingY = 2;
        let textWidth = 0;
        let textHeight = 12;
        let textX = 0;
        let textY = 0;
        if (textElement?.getBBox)
            try {
                const bbox = textElement.getBBox();
                textWidth = bbox.width;
                textHeight = bbox.height;
                textX = bbox.x;
                textY = bbox.y;
            } catch (_) {}
        if (textWidth <= 0) {
            backgroundRect.setAttribute("display", "none");
            return;
        }
        backgroundRect.removeAttribute("display");
        backgroundRect.setAttribute("x", textX - paddingX);
        backgroundRect.setAttribute("y", textY - paddingY);
        backgroundRect.setAttribute("width", textWidth + paddingX * 2);
        backgroundRect.setAttribute("height", textHeight + paddingY * 2);
        backgroundRect.setAttribute("fill", color);
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

    static isTransparentColor(color) {
        const normalizedColor = String(color ?? "").trim().toLowerCase();
        if (normalizedColor === "transparent")
            return true;
        if (/^#[0-9a-f]{6}00$/.test(normalizedColor))
            return true;
        if (/^#[0-9a-f]{3}0$/.test(normalizedColor))
            return true;
        const rgbaMatch = normalizedColor.match(/^rgba\s*\(([^)]+)\)$/);
        if (rgbaMatch) {
            const parts = rgbaMatch[1].split(",");
            if (parts.length === 4 && Number(parts[3].trim()) === 0)
                return true;
        }
        return false;
    }

    static getContrastColor(color) {
        if (Utils.isTransparentColor(color))
            return "#000000";
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

    static createTooltip(e, html, width, canShow, wrapperClassName) {
        const resolvedWrapperClassName = wrapperClassName ?? "mdl-shape-overlay-popup mdl-shape-overlay-popup-nested";
        return $('<div>')
            .appendTo('body')
            .dxTooltip({
                target: e.component.element(),
                wrapperAttr: { class: resolvedWrapperClassName },
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

    static createTranslatedTooltip(e, key, translations, width, canShow, wrapperClassName) {
        return Utils.createTooltip(e, translations.get(key), width, canShow, wrapperClassName);
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

    static getColorPalette() {
        return [
            "#00000000", "#FFFFFF", "#F5F5F5", "#E0E0E0", "#9E9E9E", "#000000",
            "#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#C62828",
            "#FFF3E0", "#FFE0B2", "#FFCC80", "#FFB74D", "#FFA726", "#EF6C00",
            "#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#2E7D32",
            "#E3F2FD", "#BBDEFB", "#90CAF9", "#64B5F6", "#42A5F5", "#1565C0",
            "#F3E5F5", "#E1BEE7", "#CE93D8", "#BA68C8", "#AB47BC", "#6A1B9A"
        ];
    }

    static getColorPickerPalette() {
        return Utils.getColorPalette();
    }

    static getChartColorPalette() {
        return ["#C62828", "#1565C0", "#2E7D32", "#EF6C00", "#6A1B9A", "#00695C", "#4E342E", "#37474F", "#F57F17"];
    }

    static getColorByIndex(index) {
        const palette = Utils.getChartColorPalette();
        if (palette.length === 0)
            return "#000000";
        const paletteIndex = Math.max(0, Number(index) || 0) % palette.length;
        return palette[paletteIndex];
    }

    static getCaseIconColor(caseNumber = 1) {
        const parsedCaseNumber = parseInt(caseNumber, 10);
        const normalizedCaseNumber = !Number.isFinite(parsedCaseNumber) ? 1 : Math.max(1, Math.min(9, parsedCaseNumber));
        const caseColors = [
            "#E53935",
            "#FB8C00",
            "#F9A825",
            "#43A047",
            "#1E88E5",
            "#8E24AA",
            "#00897B",
            "#6D4C41",
            "#546E7A"
        ];
        return caseColors[normalizedCaseNumber - 1];
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
