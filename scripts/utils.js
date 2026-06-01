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

    static getContrastColor(backgroundHex) {
        const hex = backgroundHex.replace("#", "");
        const red = parseInt(hex.substring(0, 2), 16) / 255;
        const green = parseInt(hex.substring(2, 4), 16) / 255;
        const blue = parseInt(hex.substring(4, 6), 16) / 255;
        const luminance =
            0.2126 * Utils.toLinearColorChannel(red) +
            0.7152 * Utils.toLinearColorChannel(green) +
            0.0722 * Utils.toLinearColorChannel(blue);
        return luminance <= 0.4 ? "#ffffff" : "#000000";
    }

    static toLinearColorChannel(channelValue) {
        if (channelValue <= 0.04045)
            return channelValue / 12.92;
        return ((channelValue + 0.055) / 1.055) ** 2.4;
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
