var BlockPrimitiveSchemas = {
    style() {
        return {
            fill: { valueType: "colour", defaultValue: "none", label: "Fill", category: "style" },
            stroke: { valueType: "colour", defaultValue: "none", label: "Stroke", category: "style" },
            strokeWidth: { valueType: "number", defaultValue: 1, minimum: 0, maximum: 100, label: "Stroke width", category: "style" },
            strokeDash: { valueType: "string", defaultValue: "", label: "Dash pattern", category: "style" },
            strokeLinecap: { valueType: "string", defaultValue: "round", enumValues: ["butt", "round", "square"], label: "Line cap", category: "style" },
            opacity: { valueType: "number", defaultValue: 1, minimum: 0, maximum: 1, label: "Opacity", category: "style" },
            visible: { valueType: "boolean", defaultValue: true, label: "Visible", category: "style" }
        };
    },
    withStyle(properties) {
        return { properties: Object.assign({}, BlockPrimitiveSchemas.style(), properties) };
    }
};

var BlockPrimitiveRenderers = {
    styleAttributes(properties) {
        const attributes = {};
        if (properties.fill !== undefined && properties.fill !== null)
            attributes.fill = properties.fill;
        if (properties.stroke !== undefined && properties.stroke !== null)
            attributes.stroke = properties.stroke;
        if (properties.strokeWidth !== undefined && properties.stroke !== "none")
            attributes["stroke-width"] = properties.strokeWidth;
        if (properties.strokeDash)
            attributes["stroke-dasharray"] = properties.strokeDash;
        if (properties.strokeLinecap)
            attributes["stroke-linecap"] = properties.strokeLinecap;
        if (Number(properties.opacity) < 1)
            attributes.opacity = properties.opacity;
        return attributes;
    },
    isAllowedImageSource(href) {
        const source = String(href ?? "").trim();
        if (source === "")
            return false;
        const lower = source.toLowerCase();
        if (lower.startsWith("https://"))
            return true;
        if (lower.startsWith("data:image/"))
            return true;
        if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("http://") || lower.startsWith("//"))
            return false;
        return !lower.includes(":");
    },
    points(value) {
        if (typeof value === "string")
            return value;
        if (!Array.isArray(value))
            return "";
        return value.map(point => Array.isArray(point) ? `${point[0]},${point[1]}` : `${point.x},${point.y}`).join(" ");
    }
};

(function registerBlockPrimitives(registry) {
    registry.register({
        type: "rect",
        category: "primitive",
        displayName: "Rectangle",
        description: "Axis-aligned rectangle with optional corner radius.",
        tags: ["shape", "box", "panel"],
        capabilities: ["fillable", "strokable", "sizable"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            x: { valueType: "number", defaultValue: 0, label: "X" },
            y: { valueType: "number", defaultValue: 0, label: "Y" },
            width: { valueType: "number", defaultValue: 100, minimum: 0, label: "Width" },
            height: { valueType: "number", defaultValue: 60, minimum: 0, label: "Height" },
            cornerRadius: { valueType: "number", defaultValue: 0, minimum: 0, label: "Corner radius" }
        }),
        render: properties => ({
            tag: "rect",
            attributes: Object.assign({
                x: properties.x,
                y: properties.y,
                width: Math.max(0, properties.width),
                height: Math.max(0, properties.height),
                rx: properties.cornerRadius,
                ry: properties.cornerRadius
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "circle",
        category: "primitive",
        displayName: "Circle",
        description: "Circle defined by a centre point and a radius.",
        tags: ["shape", "round", "dot", "face"],
        capabilities: ["fillable", "strokable", "radial"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            centerX: { valueType: "number", defaultValue: 0, label: "Centre X" },
            centerY: { valueType: "number", defaultValue: 0, label: "Centre Y" },
            radius: { valueType: "number", defaultValue: 40, minimum: 0, label: "Radius" }
        }),
        render: properties => ({
            tag: "circle",
            attributes: Object.assign({
                cx: properties.centerX,
                cy: properties.centerY,
                r: Math.max(0, properties.radius)
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "ellipse",
        category: "primitive",
        displayName: "Ellipse",
        description: "Ellipse defined by a centre point and two radii.",
        tags: ["shape", "oval"],
        capabilities: ["fillable", "strokable", "radial"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            centerX: { valueType: "number", defaultValue: 0, label: "Centre X" },
            centerY: { valueType: "number", defaultValue: 0, label: "Centre Y" },
            radiusX: { valueType: "number", defaultValue: 50, minimum: 0, label: "Radius X" },
            radiusY: { valueType: "number", defaultValue: 30, minimum: 0, label: "Radius Y" }
        }),
        render: properties => ({
            tag: "ellipse",
            attributes: Object.assign({
                cx: properties.centerX,
                cy: properties.centerY,
                rx: Math.max(0, properties.radiusX),
                ry: Math.max(0, properties.radiusY)
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "line",
        category: "primitive",
        displayName: "Line",
        description: "Straight line segment between two points.",
        tags: ["shape", "segment", "hand", "needle", "tick"],
        capabilities: ["strokable", "linear"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            x1: { valueType: "number", defaultValue: 0, label: "Start X" },
            y1: { valueType: "number", defaultValue: 0, label: "Start Y" },
            x2: { valueType: "number", defaultValue: 100, label: "End X" },
            y2: { valueType: "number", defaultValue: 0, label: "End Y" }
        }),
        render: properties => ({
            tag: "line",
            attributes: Object.assign({
                x1: properties.x1,
                y1: properties.y1,
                x2: properties.x2,
                y2: properties.y2
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "polyline",
        category: "primitive",
        displayName: "Polyline",
        description: "Open sequence of connected points.",
        tags: ["shape", "path", "trace"],
        capabilities: ["strokable", "linear"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            points: { valueType: "points", defaultValue: [], label: "Points", bindable: false }
        }),
        render: properties => ({
            tag: "polyline",
            attributes: Object.assign({
                points: BlockPrimitiveRenderers.points(properties.points)
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "polygon",
        category: "primitive",
        displayName: "Polygon",
        description: "Closed sequence of connected points.",
        tags: ["shape", "triangle", "needle", "hand"],
        capabilities: ["fillable", "strokable"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            points: { valueType: "points", defaultValue: [], label: "Points", bindable: false }
        }),
        render: properties => ({
            tag: "polygon",
            attributes: Object.assign({
                points: BlockPrimitiveRenderers.points(properties.points)
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "arc",
        category: "primitive",
        displayName: "Arc",
        description: "Circular arc or annular sector measured clockwise from the start angle.",
        tags: ["shape", "dial", "sector", "ring"],
        capabilities: ["fillable", "strokable", "radial", "angular"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            centerX: { valueType: "number", defaultValue: 0, label: "Centre X" },
            centerY: { valueType: "number", defaultValue: 0, label: "Centre Y" },
            radius: { valueType: "number", defaultValue: 40, minimum: 0, label: "Radius" },
            innerRadius: { valueType: "number", defaultValue: 0, minimum: 0, label: "Inner radius" },
            startAngle: { valueType: "number", defaultValue: 225, label: "Start angle", unit: "deg" },
            endAngle: { valueType: "number", defaultValue: -45, label: "End angle", unit: "deg" }
        }),
        render: properties => {
            const useSector = Number(properties.innerRadius) > 0 || properties.fill !== "none";
            const path = useSector
                ? BlockGeometry.annularSectorPath(properties.centerX, properties.centerY, Math.max(0, properties.innerRadius), Math.max(0, properties.radius), properties.startAngle, properties.endAngle)
                : BlockGeometry.arcPath(properties.centerX, properties.centerY, Math.max(0, properties.radius), properties.startAngle, properties.endAngle);
            return {
                tag: "path",
                attributes: Object.assign({ d: path }, BlockPrimitiveRenderers.styleAttributes(properties))
            };
        }
    });

    registry.register({
        type: "ring",
        category: "primitive",
        displayName: "Ring",
        description: "Full annulus between an inner and an outer radius.",
        tags: ["shape", "dial", "bezel"],
        capabilities: ["fillable", "strokable", "radial"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            centerX: { valueType: "number", defaultValue: 0, label: "Centre X" },
            centerY: { valueType: "number", defaultValue: 0, label: "Centre Y" },
            innerRadius: { valueType: "number", defaultValue: 30, minimum: 0, label: "Inner radius" },
            outerRadius: { valueType: "number", defaultValue: 40, minimum: 0, label: "Outer radius" }
        }),
        render: properties => ({
            tag: "path",
            attributes: Object.assign({
                d: BlockGeometry.ringPath(properties.centerX, properties.centerY, Math.max(0, properties.innerRadius), Math.max(0, properties.outerRadius)),
                "fill-rule": "evenodd"
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "path",
        category: "primitive",
        displayName: "Path",
        description: "Raw SVG path data. Commands are restricted to the standard path grammar.",
        tags: ["shape", "custom"],
        capabilities: ["fillable", "strokable"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            d: { valueType: "string", defaultValue: "", label: "Path data" }
        }),
        validate: input => {
            const data = String(input?.d ?? "");
            if (data !== "" && !/^[MmLlHhVvCcSsQqTtAaZz0-9eE,.\-+\s]*$/.test(data))
                return { valid: false, errors: [{ code: "INVALID_PATH_DATA", message: "Path data contains characters outside the SVG path grammar." }] };
            return { valid: true, errors: [] };
        },
        render: properties => ({
            tag: "path",
            attributes: Object.assign({ d: properties.d }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "text",
        category: "primitive",
        displayName: "Text",
        description: "Single line of text anchored at a point.",
        tags: ["label", "value", "number"],
        capabilities: ["fillable", "textual"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            x: { valueType: "number", defaultValue: 0, label: "X" },
            y: { valueType: "number", defaultValue: 0, label: "Y" },
            text: { valueType: "string", defaultValue: "", label: "Text" },
            // What the text is measured in, written after it the way a unit is written after a
            // reading everywhere else on the board — a space away, faded — rather than concatenated
            // into the text and left to read as part of it.
            unit: { valueType: "string", defaultValue: "", label: "Unit" },
            fontSize: { valueType: "number", defaultValue: "token:font.size.default", minimum: 1, maximum: 400, label: "Font size" },
            fontFamily: { valueType: "string", defaultValue: "token:font.family", label: "Font family" },
            fontWeight: { valueType: "number", defaultValue: "token:font.weight.default", minimum: 100, maximum: 900, label: "Font weight" },
            textAnchor: { valueType: "string", defaultValue: "middle", enumValues: ["start", "middle", "end"], label: "Anchor" },
            baseline: { valueType: "string", defaultValue: "central", enumValues: ["auto", "central", "hanging"], label: "Baseline" }
        }),
        render: properties => ({
            tag: "text",
            text: String(properties.text ?? ""),
            unit: String(properties.unit ?? ""),
            attributes: Object.assign({
                x: properties.x,
                y: properties.y,
                "font-size": properties.fontSize,
                "font-family": properties.fontFamily,
                "font-weight": properties.fontWeight,
                "text-anchor": properties.textAnchor,
                "dominant-baseline": properties.baseline
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    registry.register({
        type: "image",
        category: "primitive",
        displayName: "Image",
        description: "Bitmap or SVG image placed in a box. Only https:, data: and same-origin relative sources are allowed.",
        tags: ["media", "sprite", "picture"],
        capabilities: ["sizable", "media"],
        inputSchema: BlockPrimitiveSchemas.withStyle({
            x: { valueType: "number", defaultValue: 0, label: "X" },
            y: { valueType: "number", defaultValue: 0, label: "Y" },
            width: { valueType: "number", defaultValue: 60, minimum: 0, label: "Width" },
            height: { valueType: "number", defaultValue: 60, minimum: 0, label: "Height" },
            href: { valueType: "string", defaultValue: "", label: "Source" },
            preserveAspectRatio: { valueType: "string", defaultValue: "xMidYMid meet", label: "Aspect ratio" }
        }),
        validate: input => {
            const href = String(input?.href ?? "");
            if (href === "")
                return { valid: true, errors: [] };
            if (BlockPrimitiveRenderers.isAllowedImageSource(href))
                return { valid: true, errors: [] };
            return { valid: false, errors: [{ code: "UNSAFE_RESOURCE_URL", message: `Image source "${href}" is not allowed. Use https:, data:image/ or a relative path.` }] };
        },
        render: properties => ({
            tag: "image",
            attributes: Object.assign({
                x: properties.x,
                y: properties.y,
                width: Math.max(0, properties.width),
                height: Math.max(0, properties.height),
                href: BlockPrimitiveRenderers.isAllowedImageSource(properties.href) ? properties.href : "",
                preserveAspectRatio: properties.preserveAspectRatio
            }, BlockPrimitiveRenderers.styleAttributes(properties))
        })
    });

    // A window onto its children: it is a viewport of its own, so whatever a child draws beyond its
    // edges is cut off there instead of spilling over the object it belongs to. Clipping by being a
    // viewport is what lets a definition ask for it, since a clip path would need an id declared in
    // the document holding the drawing and there is one drawing per object on the board. Its view
    // box repeats its own frame, so a child inside it is placed in the same coordinates as a child
    // outside it.
    registry.register({
        type: "clip-box",
        category: "primitive",
        displayName: "Clip box",
        description: "Container showing only the part of its children that falls inside it.",
        tags: ["container", "layout", "window", "clip"],
        capabilities: ["container", "sizable"],
        supportsChildren: true,
        inputSchema: BlockPrimitiveSchemas.withStyle({
            x: { valueType: "number", defaultValue: 0, label: "X" },
            y: { valueType: "number", defaultValue: 0, label: "Y" },
            width: { valueType: "number", defaultValue: 100, minimum: 0, label: "Width" },
            height: { valueType: "number", defaultValue: 60, minimum: 0, label: "Height" }
        }),
        render: properties => {
            const width = Math.max(0, Number(properties.width) || 0);
            const height = Math.max(0, Number(properties.height) || 0);
            const x = Number(properties.x) || 0;
            const y = Number(properties.y) || 0;
            return {
                tag: "svg",
                attributes: {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    viewBox: `${x} ${y} ${width} ${height}`,
                    overflow: "hidden"
                }
            };
        }
    });

    registry.register({
        type: "group",
        category: "primitive",
        displayName: "Group",
        description: "Container that positions, rotates and scales its children as one unit.",
        tags: ["container", "layout"],
        capabilities: ["container"],
        supportsChildren: true,
        inputSchema: BlockPrimitiveSchemas.withStyle({}),
        render: () => ({ tag: "g", attributes: {} })
    });
})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = { BlockPrimitiveSchemas, BlockPrimitiveRenderers };
