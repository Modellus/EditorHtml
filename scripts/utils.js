class Utils {
    static designTokens = null;

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

    // A term name can carry named parts separated by dots (`v.x`, `Body1.vx`).  A named part is
    // always written as a subscript marked with '\!' (`v_{\!x}`) so the parser tells it apart from an
    // index and restores the dot, and so the name reads as a subscript everywhere it is shown.
    static termNamedIndexMarker = "\\!";
    static termNamedIndexPattern = /_\{\\!([A-Za-z0-9]+)\}/g;
    static termNamePartPattern = /\.([A-Za-z0-9]+)/g;
    static dottedTermNamePattern = /(\\[A-Za-z]+|[A-Za-zΑ-ω][A-Za-z0-9]*)((?:\.[A-Za-z0-9]+)+)/g;
    static termNameEndPattern = /(\\[A-Za-z]+|[A-Za-zΑ-ω][A-Za-z0-9]*)$/;
    // Mathlive writes the latex up to the caret with the enclosing groups left open, so a named part
    // still being written ends with its marker followed by the name characters typed so far.
    static openTermNamedIndexPattern = /\\!\s*[A-Za-z0-9]*$/;

    static writeTermNames(text) {
        return String(text ?? "").replace(Utils.dottedTermNamePattern, (matchedName, baseName, namedParts) =>
            baseName + namedParts.replace(Utils.termNamePartPattern, (namedPart, partName) => `_{${Utils.termNamedIndexMarker}${partName}}`));
    }

    static convertTermNamedIndexesToPlainText(text) {
        return String(text ?? "").replace(Utils.termNamedIndexPattern, (matchedIndex, partName) => `_${partName}`);
    }

    static endsWithTermName(text) {
        return Utils.termNameEndPattern.test(String(text ?? ""));
    }

    static endsWithOpenTermNamedIndex(text) {
        return Utils.openTermNamedIndexPattern.test(String(text ?? ""));
    }

    static splitTermNameSegments(termLatex) {
        const normalizedText = String(termLatex ?? "");
        const namedIndexPattern = new RegExp(Utils.termNamedIndexPattern.source, "g");
        const segments = [];
        let segmentStart = 0;
        let namedIndexMatch = namedIndexPattern.exec(normalizedText);
        while (namedIndexMatch) {
            if (namedIndexMatch.index > segmentStart)
                segments.push({ text: normalizedText.substring(segmentStart, namedIndexMatch.index), isNamedIndex: false });
            segments.push({ text: namedIndexMatch[1], isNamedIndex: true });
            segmentStart = namedIndexMatch.index + namedIndexMatch[0].length;
            namedIndexMatch = namedIndexPattern.exec(normalizedText);
        }
        if (segmentStart < normalizedText.length)
            segments.push({ text: normalizedText.substring(segmentStart), isNamedIndex: false });
        return segments;
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
        return Utils.convertGreekLetters(Utils.writeTermNames(normalizedTerm));
    }

    static getTerms(terms, system = null) {
        return terms.map(t => ({ text: Utils.getDisplayedTerm(t, system), term: t }));
    }

    static escapeMathTermName(text) {
        const normalizedText = String(text ?? "");
        return normalizedText.replace(/(^|[^\\])_(?!\{\\!)/g, "$1\\_");
    }

    static isMathTermText(text) {
        return String(text ?? "").includes("\\");
    }

    static normalizeMathTermForWidth(text) {
        const normalizedText = Utils.convertTermNamedIndexesToPlainText(text);
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
        const normalizedText = Utils.convertTermNamedIndexesToPlainText(text);
        const withHatText = normalizedText
            .replace(/\\widehat\s*\{([^}]*)\}/g, (_, innerText) => `${innerText}\u0302`)
            .replace(/\\hat\s*\{([^}]*)\}/g, (_, innerText) => `${innerText}\u0302`);
        return Utils.convertGreekLetters(withHatText);
    }

    static parseMathTermLatex(latexValue) {
        let remaining = String(latexValue ?? "").trim().replace(Utils.termNamedIndexPattern, (matchedIndex, partName) => `\\_{${partName}}`);
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
    static caseIconGap = 3;
    static termLabelPaddingX = 4;

    static getCaseIconColor(caseNumber = 1) {
        const caseColors = [
            "#E53935", "#FB8C00", "#F9A825", "#43A047", "#1E88E5",
            "#8E24AA", "#00897B", "#6D4C41", "#546E7A"
        ];
        const parsedCaseNumber = parseInt(caseNumber, 10);
        const normalizedCaseNumber = !Number.isFinite(parsedCaseNumber) ? 1 : Math.max(1, Math.min(9, parsedCaseNumber));
        return caseColors[normalizedCaseNumber - 1];
    }

    static getCaseNumberIconClass(caseNumber) {
        const parsedCaseNumber = parseInt(caseNumber, 10);
        if (!Number.isFinite(parsedCaseNumber) || parsedCaseNumber < 1)
            return "fa-solid fa-square-1";
        if (parsedCaseNumber > 9)
            return "fa-solid fa-square-9";
        return `fa-solid fa-square-${parsedCaseNumber}`;
    }

    static getCaseIconSize(caseNumber, fontSize) {
        const iconData = Utils._caseIconData[caseNumber];
        const baseHeight = Math.max(8, fontSize);
        const iconWidth = iconData?.width ?? 448;
        const iconHeight = iconData?.height ?? 512;
        return { width: baseHeight * (iconWidth / iconHeight), height: baseHeight };
    }

    static estimateCaseTermWidth(caseNumber, termLatex, fontSize) {
        const termWidth = Utils.estimateMathTermWidth(termLatex, fontSize);
        if (caseNumber == null)
            return termWidth;
        return termWidth + Utils.caseIconGap + Utils.getCaseIconSize(caseNumber, fontSize).width;
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
        let termX = x;
        if (caseNumber != null) {
            const iconSize = Utils.getCaseIconSize(caseNumber, fontSize);
            termX = x + iconSize.width + Utils.caseIconGap;
            const iconGroup = Utils.createCaseIconSvg(caseNumber, x, baselineY - iconSize.height * 0.82, iconSize.width, iconSize.height);
            if (iconGroup)
                group.appendChild(iconGroup);
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
                wrapper.setAttribute("transform", `translate(${termX}, ${topY})`);
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

    static escapeXmlText(value) {
        return String(value ?? "").replace(/[&<>]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character]));
    }

    static buildTermTextHtml(termLatex, useCentralBaseline = true) {
        if (!termLatex)
            return "";
        const namedIndexShift = 0.25;
        const baselineAttribute = useCentralBaseline ? ` dominant-baseline="central"` : "";
        let html = "";
        let pendingShift = 0;
        const appendTermSegment = (segmentText, isNamedIndex) => {
            // Katex_Math is the math-italic font whose digit glyphs are oldstyle figures ("0" reads as "o"), so digits use the upright main font.
            const characterRuns = Utils.convertMathTermToPlainText(segmentText).match(/\d+|\D+/g) ?? [];
            const segmentShift = isNamedIndex ? namedIndexShift : 0;
            for (const characterRun of characterRuns) {
                const shift = segmentShift - pendingShift;
                const fontFamily = /\d/.test(characterRun) ? "Katex_Main" : "Katex_Math";
                const fontSizeAttribute = isNamedIndex ? ` font-size="65%"` : "";
                const shiftAttribute = shift === 0 ? "" : ` dy="${shift}em"`;
                html += `<tspan font-family="${fontFamily}"${fontSizeAttribute}${shiftAttribute}${baselineAttribute}>${Utils.escapeXmlText(characterRun)}</tspan>`;
                pendingShift = segmentShift;
            }
        };
        for (const segment of Utils.splitTermNameSegments(termLatex))
            appendTermSegment(segment.text, segment.isNamedIndex);
        return html;
    }

    static setTermTextContent(textElement, termLatex) {
        textElement.innerHTML = Utils.buildTermTextHtml(termLatex, false);
    }

    static buildTermValueTextHtml(termLatex, valueText) {
        if (!termLatex)
            return `<tspan font-family="Katex_Main" dominant-baseline="central">${Utils.escapeXmlText(valueText)}</tspan>`;
        const segments = Utils.splitTermNameSegments(termLatex);
        const pendingShift = segments.length > 0 && segments[segments.length - 1].isNamedIndex ? 0.25 : 0;
        const valueShiftAttribute = pendingShift === 0 ? "" : ` dy="${-pendingShift}em"`;
        return `${Utils.buildTermTextHtml(termLatex)}<tspan font-family="Katex_Main"${valueShiftAttribute} dominant-baseline="central"> = ${Utils.escapeXmlText(valueText)}</tspan>`;
    }

    static setTermValueTextContent(textElement, termLatex, valueText) {
        textElement.innerHTML = Utils.buildTermValueTextHtml(termLatex, valueText);
    }

    static buildIconValueTextHtml(iconGlyph, iconFontFamily, valueText) {
        // The icon glyph only resolves on the solid face, which is weight 900, and the family has to
        // be quoted: a bare "Font Awesome 7 Pro" is not a valid css family name because "7" cannot
        // start an identifier, so the whole declaration is dropped and the glyph draws as a box.
        return `<tspan font-family="'${Utils.escapeXmlText(iconFontFamily)}'" font-weight="900" dominant-baseline="central">${Utils.escapeXmlText(iconGlyph)}</tspan><tspan font-family="Katex_Main" dominant-baseline="central"> ${Utils.escapeXmlText(valueText)}</tspan>`;
    }

    static setIconValueTextContent(textElement, iconGlyph, iconFontFamily, valueText) {
        textElement.innerHTML = Utils.buildIconValueTextHtml(iconGlyph, iconFontFamily, valueText);
    }

    static _iconFontLoadPromises = {};

    // A webfont is only fetched once something on the page renders with it, and the page uses the
    // light face for its icons, so an svg glyph on the solid face draws as a missing-glyph box until
    // that face is asked for: onLoaded gives the caller a chance to draw again once it is there.
    static ensureIconFontLoaded(iconFontFamily, onLoaded) {
        const fontFamily = String(iconFontFamily ?? "");
        if (fontFamily === "" || typeof document.fonts?.load !== "function")
            return null;
        if (Utils._iconFontLoadPromises[fontFamily])
            return Utils._iconFontLoadPromises[fontFamily];
        Utils._iconFontLoadPromises[fontFamily] = document.fonts.load(`900 16px "${fontFamily}"`)
            .then(() => onLoaded?.())
            .catch(() => {});
        return Utils._iconFontLoadPromises[fontFamily];
    }

    // The digit of a square-n icon is a hole in the path, so it is drawn by whatever sits behind the
    // icon: it only reads as the case number when a plate of its own is painted there, in the color that
    // contrasts with the case color. The plate is inset by the corner radius of the square so it never
    // pokes out of the rounded outline.
    static caseIconPlateInset = 0.14;

    // The single place a case icon is drawn: every svg surface that shows cases goes through here, so
    // the number is protected against whatever the icon is drawn on. Width and height are the box the
    // whole icon viewBox is scaled into, with the top left corner at (x, y).
    static createCaseIconSvg(caseNumber, x, y, width, height) {
        const iconData = Utils._caseIconData[caseNumber];
        if (!iconData?.pathData)
            return null;
        const svgNs = "http://www.w3.org/2000/svg";
        const iconColor = Utils.getCaseIconColor(caseNumber);
        const iconGroup = document.createElementNS(svgNs, "g");
        iconGroup.setAttribute("transform", `translate(${x} ${y}) scale(${width / iconData.width} ${height / iconData.height})`);
        const plateInsetX = iconData.width * Utils.caseIconPlateInset;
        const plateInsetY = iconData.height * Utils.caseIconPlateInset;
        const plate = document.createElementNS(svgNs, "rect");
        plate.setAttribute("x", plateInsetX);
        plate.setAttribute("y", plateInsetY);
        plate.setAttribute("width", Math.max(0, iconData.width - plateInsetX * 2));
        plate.setAttribute("height", Math.max(0, iconData.height - plateInsetY * 2));
        plate.setAttribute("fill", Utils.getContrastColor(iconColor));
        iconGroup.appendChild(plate);
        const iconPath = document.createElementNS(svgNs, "path");
        iconPath.setAttribute("d", iconData.pathData);
        iconPath.setAttribute("fill", iconColor);
        iconGroup.appendChild(iconPath);
        return iconGroup;
    }

    // The same icon for html surfaces (toolbars, dropdowns), which cannot use the font glyph and stay
    // protected. It is sized in em, so the font size the icon inherits drives it exactly like the glyph.
    static createCaseIconElement(caseNumber) {
        const iconData = Utils._caseIconData[caseNumber];
        const iconGroup = Utils.createCaseIconSvg(caseNumber, 0, 0, iconData?.width ?? 0, iconData?.height ?? 0);
        if (!iconGroup)
            return null;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", `0 0 ${iconData.width} ${iconData.height}`);
        svg.setAttribute("focusable", "false");
        svg.style.cssText = `display:inline-block;width:${iconData.width / iconData.height}em;height:1em;vertical-align:-0.125em;overflow:visible;`;
        svg.appendChild(iconGroup);
        return svg;
    }

    // Fills a host element with the case icon. The icons are fetched once, so until they are there the
    // host keeps the font glyph it always had, and is drawn again as soon as they load.
    static renderCaseIcon(hostElement, caseNumber) {
        if (!hostElement)
            return null;
        const icon = Utils.createCaseIconElement(caseNumber);
        if (icon) {
            hostElement.replaceChildren(icon);
            return hostElement;
        }
        hostElement.innerHTML = `<i class="${Utils.getCaseNumberIconClass(caseNumber)}" style="color:${Utils.getCaseIconColor(caseNumber)}"></i>`;
        Utils.ensureCaseIconsLoaded(() => Utils.renderCaseIcon(hostElement, caseNumber));
        return hostElement;
    }

    static createCaseIconHost(caseNumber, className = "") {
        const host = document.createElement("span");
        host.className = className;
        host.style.lineHeight = "1";
        Utils.renderCaseIcon(host, caseNumber);
        return host;
    }

    static applyCaseIconSvg(group, iconX, iconY, iconSize, caseNumber) {
        while (group.firstChild)
            group.removeChild(group.firstChild);
        if (caseNumber == null)
            return;
        const iconGroup = Utils.createCaseIconSvg(caseNumber, iconX, iconY, iconSize, iconSize);
        if (iconGroup)
            group.appendChild(iconGroup);
    }

    // extraBounds covers anything drawn next to the text that shares its background, such as the case
    // icon, so the whole label is protected against whatever is behind it.
    static applyTermLabelBackground(backgroundRect, textElement, color, anchor, extraBounds = null) {
        const paddingX = Utils.termLabelPaddingX;
        const paddingY = 2;
        let left = 0;
        let top = 0;
        let right = 0;
        let bottom = 0;
        let hasBounds = false;
        if (textElement?.getBBox)
            try {
                const bbox = textElement.getBBox();
                if (bbox.width > 0) {
                    left = bbox.x;
                    top = bbox.y;
                    right = bbox.x + bbox.width;
                    bottom = bbox.y + bbox.height;
                    hasBounds = true;
                }
            } catch (_) {}
        if (!hasBounds) {
            backgroundRect.setAttribute("display", "none");
            return;
        }
        if (extraBounds && extraBounds.width > 0 && extraBounds.height > 0) {
            left = Math.min(left, extraBounds.x);
            top = Math.min(top, extraBounds.y);
            right = Math.max(right, extraBounds.x + extraBounds.width);
            bottom = Math.max(bottom, extraBounds.y + extraBounds.height);
        }
        backgroundRect.removeAttribute("display");
        backgroundRect.setAttribute("x", left - paddingX);
        backgroundRect.setAttribute("y", top - paddingY);
        backgroundRect.setAttribute("width", right - left + paddingX * 2);
        backgroundRect.setAttribute("height", bottom - top + paddingY * 2);
        backgroundRect.setAttribute("fill", color);
    }

    static formatMathTermName(text) {
        return Utils.escapeMathTermName(Utils.writeTermNames(text));
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

    static formatNumber(value, precision) {
        const fixed = value.toFixed(precision);
        const [intPart, decPart] = fixed.split(".");
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
    }

    static normalizePrecision(precision) {
        const numericPrecision = Number(precision);
        if (!Number.isFinite(numericPrecision) || numericPrecision < 0)
            return 0;
        return Math.floor(numericPrecision);
    }

    // What is edited is what is read: a value handed to an editor is rounded to the same precision
    // it is displayed with, so a reading of 1.23 is not silently edited as 1.2345678.
    static roundValueForEditing(value, precision) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue))
            return null;
        const rounded = Utils.roundToPrecision(numericValue, Utils.normalizePrecision(precision));
        return Object.is(rounded, -0) ? 0 : rounded;
    }

    // Unlike formatNumber, no thousands separators are inserted: the text has to parse back into a
    // number when the edit is committed.
    static formatValueForEditing(value, precision) {
        const rounded = Utils.roundValueForEditing(value, precision);
        if (rounded == null)
            return "";
        return rounded.toFixed(Utils.normalizePrecision(precision));
    }

    static avatarPalette = ["#4C9AFF", "#F5515F", "#36B37E", "#FFAB00", "#8777D9", "#00B8D9", "#FF7452", "#57D9A3"];

    static getAvatarColor(name) {
        const text = String(name ?? "").trim();
        let hash = 0;
        for (let index = 0; index < text.length; index++)
            hash = (hash * 31 + text.charCodeAt(index)) | 0;
        return Utils.avatarPalette[Math.abs(hash) % Utils.avatarPalette.length];
    }

    static getAvatarInitials(name) {
        const words = String(name ?? "").trim().split(/\s+/).filter(word => word.length > 0);
        if (words.length === 0)
            return "?";
        if (words.length === 1)
            return words[0].slice(0, 2).toUpperCase();
        return (words[0][0] + words[1][0]).toUpperCase();
    }

    static escapeAvatarText(value) {
        return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
    }

    // Shared avatar rendering: photo when available, otherwise a colored circle
    // (palette color hashed from the name) with the person's initials.
    static buildAvatarMarkup(name, avatarUrl, options = {}) {
        const size = options.size ?? 24;
        const className = options.className ? ` class="${Utils.escapeAvatarText(options.className)}"` : "";
        const title = options.title ? ` title="${Utils.escapeAvatarText(options.title)}"` : "";
        if (avatarUrl)
            return `<img${className} src="${Utils.escapeAvatarText(avatarUrl)}" alt=""${title} style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
        const color = Utils.getAvatarColor(name);
        const initials = Utils.escapeAvatarText(Utils.getAvatarInitials(name));
        const fontSize = Math.max(6, Math.round(size * 0.42));
        return `<span${className}${title} style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-size:${fontSize}px;font-weight:600;line-height:1;flex-shrink:0;user-select:none">${initials}</span>`;
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

    static FALLBACK_SWITCH_ON_COLOR = "#0f6cbd";
    static _switchOnColor = null;

    static getSwitchOnColor() {
        if (Utils._switchOnColor)
            return Utils._switchOnColor;
        document.body.insertAdjacentHTML("beforeend", `<div class="mdl-switch-color-probe dx-switch dx-switch-on-value"><div class="dx-switch-wrapper"><div class="dx-switch-container"></div></div></div>`);
        const probeElement = document.body.lastElementChild;
        const probedStyle = window.getComputedStyle(probeElement.querySelector(".dx-switch-container"), "::before");
        const probedColor = Utils.toHexColor(probedStyle.backgroundColor);
        probeElement.remove();
        Utils._switchOnColor = probedColor ?? Utils.FALLBACK_SWITCH_ON_COLOR;
        return Utils._switchOnColor;
    }

    static toHexColor(colorValue) {
        if (Utils.isTransparentColor(colorValue))
            return null;
        const rgb = Utils.parseColorToRgb(colorValue);
        if (!rgb)
            return null;
        return `#${Utils.toColorChannelHex(rgb.red)}${Utils.toColorChannelHex(rgb.green)}${Utils.toColorChannelHex(rgb.blue)}`;
    }

    static toColorChannelHex(channel) {
        return Math.round(channel).toString(16).padStart(2, "0");
    }

    static darkenColor(colorValue, amount = 0.3) {
        const rgb = Utils.parseColorToRgb(colorValue);
        if (!rgb)
            return colorValue;
        const factor = 1 - amount;
        const toHex = channel => Math.round(channel * factor).toString(16).padStart(2, "0");
        return `#${toHex(rgb.red)}${toHex(rgb.green)}${toHex(rgb.blue)}`;
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

    // The badge and the crosshair are drawn to the same measurements wherever they appear — a chart,
    // a ruler, an object built from blocks — so both read them from the design tokens rather than
    // carrying numbers of their own.
    static getDesignTokens() {
        return Utils.designTokens ??= new BlockTokens("standard");
    }

    static valueBadgeSvgMarkup(text, x, y, options = {}) {
        const tokens = Utils.getDesignTokens();
        const fontSize = options.fontSize ?? tokens.getNumber("font.size.tick", 10);
        const fontFamily = options.fontFamily ?? tokens.get("font.family");
        const backgroundColor = options.backgroundColor ?? tokens.get("text.secondary");
        const textColor = options.textColor ?? Utils.getContrastColor(backgroundColor);
        const anchor = options.anchor ?? "middle";
        const paddingX = options.paddingX ?? tokens.getNumber("badge.paddingX", 4);
        const paddingY = options.paddingY ?? tokens.getNumber("badge.paddingY", 2);
        const height = fontSize + paddingY * 2;
        const charWidth = fontSize * tokens.getNumber("badge.charWidth", 0.58);
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
        return `<rect x="${rectX}" y="${rectY}" width="${width}" height="${height}" rx="${tokens.getNumber("badge.cornerRadius", 3)}" fill="${backgroundColor}" fill-opacity="${tokens.getNumber("badge.opacity", 0.85)}" /><text x="${x}" y="${textY}" text-anchor="${anchor}" font-family="${fontFamily}" font-size="${fontSize}" fill="${textColor}">${escapedText}</text>`;
    }

    static crosshairLineSvgMarkup(x1, y1, x2, y2, color) {
        const tokens = Utils.getDesignTokens();
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${tokens.getNumber("crosshair.strokeWidth", 1)}" stroke-dasharray="${tokens.get("crosshair.dash", "4 3")}" stroke-opacity="${tokens.getNumber("crosshair.opacity", 0.25)}" />`;
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
                hideEvent: 'mouseleave dxpointerdown',
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

    static createLatexLabel(latex, x, y, color, fontSize = 10) {
        const markup = MathLive.convertLatexToMarkup(latex);
        const w = 48, h = 18;
        const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fo.setAttribute("x", x - w / 2);
        fo.setAttribute("y", y - h / 2);
        fo.setAttribute("width", w);
        fo.setAttribute("height", h);
        fo.setAttribute("overflow", "visible");
        const div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        div.style.cssText = `display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px;color:${color};font-size:${fontSize}px;overflow:visible;white-space:nowrap;`;
        div.innerHTML = markup;
        fo.appendChild(div);
        return fo;
    }

    // Every toolbar drop-down writes its rows through here, so a label always sits to the left of
    // the control it names instead of each menu deciding that for itself.
    static renderDropdownListItem(element, data) {
        const host = element instanceof Element ? element : element[0];
        if (data.parentSelector) {
            data.buildControl($(host));
            return;
        }
        const iconMarkup = data.icon ? `<i class="dx-icon ${data.icon}"></i>` : "";
        host.innerHTML = `<div class="mdl-dropdown-list-item">${iconMarkup}<span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
        data.buildControl($(host).find(".mdl-dropdown-list-control"));
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
    // A row whose control is a single button is pressed by clicking anywhere along it. A row holding a
    // list of its own is not: the buttons on its rows are theirs, and the one a list puts on each row
    // to take it away would take a row away every time the row beside it was touched.
    const buttons = Array.from(control.querySelectorAll(".dx-button")).filter(button => !button.closest(".dx-list-item"));
    if (buttons.length !== 1)
        return;
    if (buttons[0].contains(event.target))
        return;
    buttons[0].click();
});
