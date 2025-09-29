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
     
    static getTerms(terms) {
        const greekLetters = {
            "\\alpha": "α",
            "\\beta": "β",
            "\\gamma": "γ",
            "\\delta": "δ",
            "\\epsilon": "ε",
            "\\zeta": "ζ",
            "\\eta": "η",
            "\\theta": "θ",
            "\\iota": "ι",
            "\\kappa": "κ",
            "\\lambda": "λ",
            "\\mu": "μ",
            "\\nu": "ν",
            "\\xi": "ξ",
            "\\omicron": "ο",
            "\\pi": "π",
            "\\rho": "ρ",
            "\\sigma": "σ",
            "\\tau": "τ",
            "\\upsilon": "υ",
            "\\phi": "φ",
            "\\chi": "χ",
            "\\psi": "ψ",
            "\\omega": "ω"
        };
        return terms.map(t => ({ text: greekLetters[t] || t, term: t }));
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
}