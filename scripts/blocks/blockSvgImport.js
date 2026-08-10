class BlockSvgImport {
    static allowedElements = ["svg", "g", "circle", "ellipse", "rect", "line", "polyline", "polygon", "path", "text", "image"];
    static ignoredElements = ["title", "desc", "metadata"];
    static refusedElements = ["script", "style", "foreignObject", "iframe", "animate", "animateTransform", "animateMotion", "set", "handler", "audio", "video"];
    static unsupportedElements = ["use", "defs", "symbol", "clipPath", "mask", "filter", "linearGradient", "radialGradient", "pattern", "marker", "switch"];
    static idPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
    static transformPattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    static linecapValues = ["butt", "round", "square"];

    static import(markup, options = {}) {
        const state = {
            problems: [],
            mapped: [],
            unmapped: [],
            usedIds: new Set(),
            counter: 0,
            idPrefix: options.idPrefix ?? "art",
            tokens: options.tokens ?? new BlockTokens(options.preset ?? "standard"),
            mapTokens: options.mapTokens !== false
        };
        state.colorTokens = BlockSvgImport.buildColorTokens(state.tokens);
        const parsed = new DOMParser().parseFromString(String(markup ?? ""), "image/svg+xml");
        if (parsed.getElementsByTagName("parsererror").length > 0)
            return BlockSvgImport.failure("The markup is not well-formed XML.");
        const root = parsed.documentElement;
        if (!root || root.localName !== "svg")
            return BlockSvgImport.failure("The markup does not start with an <svg> element.");
        const nodes = BlockSvgImport.convertChildren(root, state);
        const count = BlockSvgImport.countNodes(nodes);
        if (count > BlockCompiler.limits.maxNodes)
            state.problems.push(`The drawing imports as ${count} nodes, over the limit of ${BlockCompiler.limits.maxNodes}. Simplify it or split it into several objects.`);
        return {
            nodes: nodes,
            viewBox: BlockSvgImport.readViewBox(root),
            count: count,
            problems: state.problems,
            mapped: state.mapped,
            unmapped: state.unmapped
        };
    }

    static failure(message) {
        return { nodes: [], viewBox: null, count: 0, problems: [message], mapped: [], unmapped: [] };
    }

    static readViewBox(root) {
        const parts = String(root.getAttribute("viewBox") ?? "").split(/[\s,]+/).filter(part => part !== "").map(Number);
        if (parts.length !== 4 || parts.some(part => !Number.isFinite(part)))
            return null;
        return parts;
    }

    static convertChildren(element, state) {
        const nodes = [];
        for (const child of Array.from(element.children ?? [])) {
            const node = BlockSvgImport.convertElement(child, state);
            if (node)
                nodes.push(node);
        }
        return nodes;
    }

    static convertElement(element, state) {
        const name = element.localName;
        if (BlockSvgImport.ignoredElements.includes(name))
            return null;
        if (BlockSvgImport.refusedElements.includes(name)) {
            state.problems.push(`<${name}> is not allowed in an imported drawing and was left out.`);
            return null;
        }
        if (BlockSvgImport.unsupportedElements.includes(name)) {
            state.problems.push(`<${name}> is not supported and was left out; the drawing will differ from the file.`);
            return null;
        }
        if (!BlockSvgImport.allowedElements.includes(name)) {
            state.problems.push(`<${name}> is not a block and was left out.`);
            return null;
        }
        BlockSvgImport.reportUnsafeAttributes(element, state);
        const node = name === "svg" || name === "g" ? { id: "", type: "group", children: BlockSvgImport.convertChildren(element, state) } : BlockSvgImport.convertShape(element, state);
        if (!node)
            return null;
        node.id = BlockSvgImport.takeId(element, name, state);
        const properties = Object.assign(node.properties ?? {}, BlockSvgImport.readStyle(element, name, state));
        if (Object.keys(properties).length > 0)
            node.properties = properties;
        const modifiers = BlockSvgImport.parseTransform(element.getAttribute("transform"), state);
        if (modifiers.length > 0)
            node.modifiers = modifiers;
        return node;
    }

    static convertShape(element, state) {
        const name = element.localName;
        if (name === "circle")
            return { type: "circle", properties: { centerX: BlockSvgImport.readNumber(element, "cx", 0), centerY: BlockSvgImport.readNumber(element, "cy", 0), radius: BlockSvgImport.readNumber(element, "r", 0) } };
        if (name === "ellipse")
            return { type: "ellipse", properties: { centerX: BlockSvgImport.readNumber(element, "cx", 0), centerY: BlockSvgImport.readNumber(element, "cy", 0), radiusX: BlockSvgImport.readNumber(element, "rx", 0), radiusY: BlockSvgImport.readNumber(element, "ry", 0) } };
        if (name === "rect")
            return { type: "rect", properties: { x: BlockSvgImport.readNumber(element, "x", 0), y: BlockSvgImport.readNumber(element, "y", 0), width: BlockSvgImport.readNumber(element, "width", 0), height: BlockSvgImport.readNumber(element, "height", 0), cornerRadius: BlockSvgImport.readNumber(element, "rx", 0) } };
        if (name === "line")
            return { type: "line", properties: { x1: BlockSvgImport.readNumber(element, "x1", 0), y1: BlockSvgImport.readNumber(element, "y1", 0), x2: BlockSvgImport.readNumber(element, "x2", 0), y2: BlockSvgImport.readNumber(element, "y2", 0) } };
        if (name === "polyline" || name === "polygon")
            return { type: name, properties: { points: String(element.getAttribute("points") ?? "").trim() } };
        if (name === "path")
            return BlockSvgImport.convertPath(element, state);
        if (name === "text")
            return BlockSvgImport.convertText(element, state);
        if (name === "image")
            return BlockSvgImport.convertImage(element, state);
        return null;
    }

    static convertPath(element, state) {
        const data = String(element.getAttribute("d") ?? "").trim();
        const registration = BlockRegistry.get("path");
        const result = registration.validate({ d: data });
        if (!result.valid) {
            state.problems.push(`A <path> was left out: ${result.errors[0].message}`);
            return null;
        }
        return { type: "path", properties: { d: data } };
    }

    static convertText(element, state) {
        if (element.getElementsByTagName("tspan").length > 0)
            state.problems.push("A <text> element holds tspans; their text was kept but their own positions were not.");
        const properties = {
            x: BlockSvgImport.readNumber(element, "x", 0),
            y: BlockSvgImport.readNumber(element, "y", 0),
            text: String(element.textContent ?? "").trim()
        };
        const fontSize = BlockSvgImport.readStyleValue(element, "font-size");
        if (fontSize !== null && Number.isFinite(parseFloat(fontSize)))
            properties.fontSize = parseFloat(fontSize);
        const fontFamily = BlockSvgImport.readStyleValue(element, "font-family");
        if (fontFamily !== null)
            properties.fontFamily = fontFamily;
        const fontWeight = BlockSvgImport.readStyleValue(element, "font-weight");
        if (fontWeight !== null && Number.isFinite(parseFloat(fontWeight)))
            properties.fontWeight = parseFloat(fontWeight);
        const anchor = BlockSvgImport.readStyleValue(element, "text-anchor");
        if (anchor === "start" || anchor === "middle" || anchor === "end")
            properties.textAnchor = anchor;
        const baseline = BlockSvgImport.readStyleValue(element, "dominant-baseline");
        if (baseline === "auto" || baseline === "central" || baseline === "hanging")
            properties.baseline = baseline;
        return { type: "text", properties: properties };
    }

    static convertImage(element, state) {
        const href = String(element.getAttribute("href") ?? element.getAttribute("xlink:href") ?? "").trim();
        if (!BlockPrimitiveRenderers.isAllowedImageSource(href)) {
            state.problems.push(`An <image> source is not allowed and was left out: use https:, data:image/ or a relative path.`);
            return null;
        }
        return { type: "image", properties: { x: BlockSvgImport.readNumber(element, "x", 0), y: BlockSvgImport.readNumber(element, "y", 0), width: BlockSvgImport.readNumber(element, "width", 0), height: BlockSvgImport.readNumber(element, "height", 0), href: href } };
    }

    static reportUnsafeAttributes(element, state) {
        for (const attribute of Array.from(element.attributes ?? [])) {
            const name = attribute.name.toLowerCase();
            if (name.startsWith("on"))
                state.problems.push(`The attribute "${attribute.name}" was left out: an imported drawing carries no handlers.`);
            else if (name === "href" || name === "xlink:href") {
                if (element.localName !== "image")
                    state.problems.push(`A link on <${element.localName}> was left out.`);
            }
        }
    }

    static takeId(element, name, state) {
        const declared = String(element.getAttribute("id") ?? "").trim();
        const candidate = BlockSvgImport.idPattern.test(declared) ? declared : `${state.idPrefix}-${name}-${++state.counter}`;
        if (!state.usedIds.has(candidate)) {
            state.usedIds.add(candidate);
            return candidate;
        }
        let unique = `${candidate}-${++state.counter}`;
        while (state.usedIds.has(unique))
            unique = `${candidate}-${++state.counter}`;
        state.usedIds.add(unique);
        return unique;
    }

    static readNumber(element, name, fallback) {
        const value = parseFloat(String(element.getAttribute(name) ?? "").trim());
        return Number.isFinite(value) ? value : fallback;
    }

    static readStyleValue(element, name) {
        const inline = BlockSvgImport.readInlineStyle(element)[name];
        if (inline !== undefined)
            return inline;
        const attribute = element.getAttribute(name);
        return attribute === null ? null : String(attribute).trim();
    }

    static readInlineStyle(element) {
        const declarations = {};
        for (const part of String(element.getAttribute("style") ?? "").split(";")) {
            const separator = part.indexOf(":");
            if (separator < 0)
                continue;
            declarations[part.slice(0, separator).trim().toLowerCase()] = part.slice(separator + 1).trim();
        }
        return declarations;
    }

    static readStyle(element, name, state) {
        const properties = {};
        const fill = BlockSvgImport.readStyleValue(element, "fill");
        if (fill !== null)
            properties.fill = BlockSvgImport.mapColor(fill, name === "text" ? ["text.", "stroke."] : ["surface.", "stroke."], state);
        const stroke = BlockSvgImport.readStyleValue(element, "stroke");
        if (stroke !== null)
            properties.stroke = BlockSvgImport.mapColor(stroke, ["stroke.", "axis.", "grid."], state);
        const strokeWidth = BlockSvgImport.readStyleValue(element, "stroke-width");
        if (strokeWidth !== null && Number.isFinite(parseFloat(strokeWidth)))
            properties.strokeWidth = parseFloat(strokeWidth);
        const dash = BlockSvgImport.readStyleValue(element, "stroke-dasharray");
        if (dash !== null && dash !== "none")
            properties.strokeDash = dash;
        const linecap = BlockSvgImport.readStyleValue(element, "stroke-linecap");
        if (linecap !== null && BlockSvgImport.linecapValues.includes(linecap))
            properties.strokeLinecap = linecap;
        const opacity = BlockSvgImport.readStyleValue(element, "opacity");
        if (opacity !== null && Number.isFinite(parseFloat(opacity)))
            properties.opacity = Math.max(0, Math.min(1, parseFloat(opacity)));
        if (BlockSvgImport.readStyleValue(element, "display") === "none" || BlockSvgImport.readStyleValue(element, "visibility") === "hidden")
            properties.visible = false;
        for (const unsupported of ["fill-opacity", "stroke-opacity", "clip-path", "mask", "filter"]) {
            if (BlockSvgImport.readStyleValue(element, unsupported) !== null)
                state.problems.push(`"${unsupported}" on <${name}> is not supported and was left out.`);
        }
        return properties;
    }

    static mapColor(value, preferredPrefixes, state) {
        const color = String(value).trim();
        if (color === "" || color.toLowerCase() === "none")
            return "none";
        if (color.toLowerCase().startsWith("url(") || color.toLowerCase() === "currentcolor") {
            state.unmapped.push(color);
            state.problems.push(`The paint "${color}" is not supported; that part was left unpainted.`);
            return "none";
        }
        if (!state.mapTokens)
            return color;
        const normalized = BlockSvgImport.normalizeColor(color);
        const token = BlockSvgImport.chooseToken(normalized, preferredPrefixes, state);
        if (token === null) {
            if (!state.unmapped.includes(color))
                state.unmapped.push(color);
            return color;
        }
        state.mapped.push({ color: color, token: token });
        return `token:${token}`;
    }

    static chooseToken(normalized, preferredPrefixes, state) {
        const names = state.colorTokens.get(normalized);
        if (!names)
            return null;
        for (const prefix of preferredPrefixes) {
            const preferred = names.find(name => name.startsWith(prefix));
            if (preferred)
                return preferred;
        }
        return names[0];
    }

    static buildColorTokens(tokens) {
        const map = new Map();
        for (const entry of tokens.listTokens()) {
            if (typeof entry.value !== "string" || !entry.value.startsWith("#"))
                continue;
            const key = BlockSvgImport.normalizeColor(entry.value);
            map.set(key, (map.get(key) ?? []).concat([entry.name]));
        }
        return map;
    }

    static normalizeColor(value) {
        const color = String(value).trim().toLowerCase();
        if (/^#[0-9a-f]{3}$/.test(color))
            return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
        return color;
    }

    static parseTransform(value, state) {
        const modifiers = [];
        if (value === null || value === undefined)
            return modifiers;
        for (const match of String(value).matchAll(BlockSvgImport.transformPattern)) {
            const name = match[1].toLowerCase();
            const numbers = match[2].split(/[\s,]+/).filter(part => part !== "").map(Number);
            if (numbers.some(number => !Number.isFinite(number))) {
                state.problems.push(`The transform "${match[0]}" could not be read and was left out.`);
                continue;
            }
            if (name === "translate")
                modifiers.push({ type: "translate", dx: numbers[0] ?? 0, dy: numbers[1] ?? 0 });
            else if (name === "rotate")
                modifiers.push({ type: "rotate", angle: numbers[0] ?? 0, centerX: numbers[1] ?? 0, centerY: numbers[2] ?? 0 });
            else if (name === "scale")
                modifiers.push({ type: "scale", scaleX: numbers[0] ?? 1, scaleY: numbers[1] ?? numbers[0] ?? 1, centerX: 0, centerY: 0 });
            else
                state.problems.push(`The transform "${name}()" is not supported and was left out; bake it into the geometry instead.`);
        }
        return modifiers;
    }

    static countNodes(nodes) {
        let total = 0;
        for (const node of nodes ?? [])
            total += 1 + BlockSvgImport.countNodes(node.children);
        return total;
    }

    static merge(previousNodes, importedNodes) {
        const previous = new Map();
        BlockSvgImport.indexById(previousNodes, previous);
        const kept = [];
        BlockSvgImport.applyPrevious(importedNodes, previous, kept);
        return { nodes: importedNodes, kept: kept, lost: Array.from(previous.keys()).filter(id => !kept.includes(id)) };
    }

    static indexById(nodes, index) {
        for (const node of nodes ?? []) {
            if (BlockSvgImport.isWired(node))
                index.set(node.id, node);
            BlockSvgImport.indexById(node.children, index);
        }
        return index;
    }

    static isWired(node) {
        if (node.when !== undefined || node.bindings || node.behaviours)
            return true;
        return (node.modifiers ?? []).some(modifier => BlockSvgImport.isAuthoredModifier(modifier));
    }

    static isAuthoredModifier(modifier) {
        return Object.values(modifier).some(value => BlockBindings.isBinding(value));
    }

    static applyPrevious(nodes, previous, kept) {
        for (const node of nodes ?? []) {
            const earlier = previous.get(node.id);
            if (earlier) {
                if (earlier.bindings)
                    node.bindings = earlier.bindings;
                if (earlier.behaviours)
                    node.behaviours = earlier.behaviours;
                if (earlier.when !== undefined)
                    node.when = earlier.when;
                const authored = (earlier.modifiers ?? []).filter(modifier => BlockSvgImport.isAuthoredModifier(modifier));
                if (authored.length > 0)
                    node.modifiers = authored.concat(node.modifiers ?? []);
                kept.push(node.id);
            }
            BlockSvgImport.applyPrevious(node.children, previous, kept);
        }
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockSvgImport;
