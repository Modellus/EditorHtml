// Builds the selection/hover highlight overlay for a shape.
//
// By default a shape is highlighted with a rectangle matching its bounding
// box. Shapes that are not rectangular - vectors, lines, arcs, points and
// other referential children - describe their real geometry through
// getSelectionOutlinePrimitives() so the highlight traces the exact shape
// instead of a bounding rectangle.
//
// A primitive is a plain descriptor of one SVG element that makes up the
// outline:
//   { tag, mode, strokeWidth?, attributes }
//   - tag:        svg element name ("rect", "circle", "line", "path", ...)
//   - mode:       "fill" for closed area shapes (rect, circle) or
//                 "stroke" for open, line-like shapes (line, path)
//   - strokeWidth: line thickness for stroke primitives (defaults to the
//                 shape line width so the glow hugs the shape)
//   - attributes: geometry attributes for the element, in board coordinates
class ShapeSelectionOutline {
    static GLOW_FILTER_ID = "mdl-hover-glow";

    constructor(board) {
        this.board = board;
    }

    createProxy(shape, color, options = {}) {
        if (!shape?.element)
            return null;
        const primitives = this.resolvePrimitives(shape, options.bounds);
        if (!primitives || primitives.length === 0)
            return null;
        this.ensureGlowFilter();
        const proxy = this.board.createSvgElement("g");
        proxy.setAttribute("class", "highlight-proxy");
        proxy.setAttribute("pointer-events", "none");
        // The proxy lives at the svg root, the same user space as the shape and
        // its clip. Mirroring the shape's clip keeps the highlight confined to
        // the referential instead of spilling across the board (e.g. a line's
        // outline spans the whole referential width). Only applied when the
        // referenced clip actually exists - top-level shapes carry an unresolved
        // "url(#undefined)" that must not clip the highlight to nothing.
        const clipPath = this.resolveClipPath(shape);
        if (clipPath)
            proxy.setAttribute("clip-path", clipPath);
        for (const primitive of primitives) {
            proxy.appendChild(this.createGlowElement(primitive, color));
            if (primitive.mode !== "stroke")
                proxy.appendChild(this.createOutlineElement(primitive, color));
        }
        this.applyRotation(proxy, options.rotation, primitives, options.bounds);
        return proxy;
    }

    resolveClipPath(shape) {
        const clipPath = shape.element.getAttribute("clip-path");
        if (!clipPath)
            return null;
        const match = /url\(#(.+?)\)/.exec(clipPath);
        if (!match)
            return null;
        if (!this.board.svg.querySelector(`#${CSS.escape(match[1])}`))
            return null;
        return clipPath;
    }

    resolvePrimitives(shape, bounds) {
        const custom = shape.getSelectionOutlinePrimitives?.();
        if (custom && custom.length > 0)
            return custom;
        return this.createBoundsPrimitives(bounds);
    }

    createBoundsPrimitives(bounds) {
        if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height))
            return null;
        return [{
            tag: "rect",
            mode: "fill",
            attributes: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        }];
    }

    createGlowElement(primitive, color) {
        const element = this.board.createSvgElement(primitive.tag);
        this.applyGeometry(element, primitive);
        if (primitive.mode === "stroke") {
            element.setAttribute("fill", "none");
            element.setAttribute("stroke", color);
            element.setAttribute("stroke-width", primitive.strokeWidth ?? 1.5);
            element.setAttribute("stroke-linecap", "round");
            element.setAttribute("stroke-linejoin", "round");
        } else {
            element.setAttribute("fill", color);
            element.setAttribute("stroke", "none");
        }
        element.setAttribute("filter", `url(#${ShapeSelectionOutline.GLOW_FILTER_ID})`);
        element.setAttribute("style", `color: ${color}`);
        element.setAttribute("pointer-events", "none");
        return element;
    }

    createOutlineElement(primitive, color) {
        const element = this.board.createSvgElement(primitive.tag);
        this.applyGeometry(element, primitive);
        element.setAttribute("fill", "none");
        element.setAttribute("stroke", color);
        element.setAttribute("stroke-width", 1.5);
        element.setAttribute("pointer-events", "none");
        return element;
    }

    applyGeometry(element, primitive) {
        const attributes = primitive.attributes ?? {};
        for (const [name, value] of Object.entries(attributes))
            element.setAttribute(name, value);
    }

    applyRotation(proxy, rotation, primitives, bounds) {
        if (!Number.isFinite(rotation) || Math.abs(rotation) < 0.00001) {
            proxy.removeAttribute("transform");
            return;
        }
        const center = this.resolveCenter(primitives, bounds);
        if (!center) {
            proxy.removeAttribute("transform");
            return;
        }
        proxy.setAttribute("transform", `rotate(${rotation} ${center.x} ${center.y})`);
    }

    resolveCenter(primitives, bounds) {
        if (bounds && Number.isFinite(bounds.width) && Number.isFinite(bounds.height))
            return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
        return this.computePrimitivesCenter(primitives);
    }

    computePrimitivesCenter(primitives) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const primitive of primitives ?? []) {
            const box = this.getPrimitiveBox(primitive);
            if (!box)
                continue;
            minX = Math.min(minX, box.minX);
            minY = Math.min(minY, box.minY);
            maxX = Math.max(maxX, box.maxX);
            maxY = Math.max(maxY, box.maxY);
        }
        if (!Number.isFinite(minX) || !Number.isFinite(maxX))
            return null;
        return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    }

    getPrimitiveBox(primitive) {
        const attributes = primitive?.attributes ?? {};
        const number = value => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        };
        if (primitive.tag === "line") {
            const x1 = number(attributes.x1), y1 = number(attributes.y1);
            const x2 = number(attributes.x2), y2 = number(attributes.y2);
            if (x1 == null || y1 == null || x2 == null || y2 == null)
                return null;
            return { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) };
        }
        if (primitive.tag === "circle") {
            const cx = number(attributes.cx), cy = number(attributes.cy), r = number(attributes.r);
            if (cx == null || cy == null || r == null)
                return null;
            return { minX: cx - r, minY: cy - r, maxX: cx + r, maxY: cy + r };
        }
        if (primitive.tag === "rect") {
            const x = number(attributes.x), y = number(attributes.y);
            const width = number(attributes.width), height = number(attributes.height);
            if (x == null || y == null || width == null || height == null)
                return null;
            return { minX: x, minY: y, maxX: x + width, maxY: y + height };
        }
        return null;
    }

    ensureGlowFilter() {
        if (this.board.svg.querySelector(`#${ShapeSelectionOutline.GLOW_FILTER_ID}`))
            return;
        const defs = this.board.createSvgElement("defs");
        defs.innerHTML = `<filter id="${ShapeSelectionOutline.GLOW_FILTER_ID}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur"/>
            <feComposite in="blur" in2="SourceAlpha" operator="out" result="outer-glow"/>
            <feFlood flood-color="currentColor" result="flood-color"/>
            <feComposite in="flood-color" in2="outer-glow" operator="in"/>
        </filter>`;
        this.board.svg.insertBefore(defs, this.board.svg.firstChild);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ShapeSelectionOutline;
