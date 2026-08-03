var BlockComponentHelpers = {
    parameter(id, label, valueType, defaultValue, extra = {}) {
        return Object.assign({
            id: id,
            label: label,
            valueType: valueType,
            defaultValue: defaultValue,
            description: "",
            required: false,
            bindable: true,
            agentAccessible: true,
            userEditable: true,
            category: "general"
        }, extra);
    },
    formatNumber(value, digits) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return "";
        return numeric.toFixed(Math.max(0, Math.min(6, Math.floor(digits))));
    }
};

(function registerBlockComponents(registry) {
    registry.register({
        type: "dial-face",
        category: "component",
        displayName: "Dial face",
        description: "Circular face with an optional bezel ring, used as the background of clocks, gauges and compasses.",
        tags: ["dial", "face", "circle", "background"],
        capabilities: ["radial", "background"],
        parameters: [
            BlockComponentHelpers.parameter("centerX", "Centre X", "number", 0),
            BlockComponentHelpers.parameter("centerY", "Centre Y", "number", 0),
            BlockComponentHelpers.parameter("radius", "Radius", "number", 80, { minimum: 1 }),
            BlockComponentHelpers.parameter("faceColor", "Face colour", "colour", "token:surface.default"),
            BlockComponentHelpers.parameter("borderColor", "Border colour", "colour", "token:stroke.default"),
            BlockComponentHelpers.parameter("borderWidth", "Border width", "number", 2, { minimum: 0, maximum: 40 }),
            BlockComponentHelpers.parameter("bezelWidth", "Bezel width", "number", 0, { minimum: 0, maximum: 60 }),
            BlockComponentHelpers.parameter("bezelColor", "Bezel colour", "colour", "token:surface.emphasis")
        ],
        create: (parameters, context) => {
            const children = [{
                id: "face",
                type: "circle",
                properties: {
                    centerX: parameters.centerX,
                    centerY: parameters.centerY,
                    radius: parameters.radius,
                    fill: context.tokens.resolveValue(parameters.faceColor),
                    stroke: context.tokens.resolveValue(parameters.borderColor),
                    strokeWidth: parameters.borderWidth
                }
            }];
            if (Number(parameters.bezelWidth) > 0) {
                children.unshift({
                    id: "bezel",
                    type: "ring",
                    properties: {
                        centerX: parameters.centerX,
                        centerY: parameters.centerY,
                        innerRadius: parameters.radius,
                        outerRadius: Number(parameters.radius) + Number(parameters.bezelWidth),
                        fill: context.tokens.resolveValue(parameters.bezelColor),
                        stroke: context.tokens.resolveValue(parameters.borderColor),
                        strokeWidth: parameters.borderWidth
                    }
                });
            }
            return { id: "dial-face", type: "group", children: children };
        }
    });

    registry.register({
        type: "tick-ring",
        category: "component",
        displayName: "Tick ring",
        description: "Evenly spaced radial tick marks around a centre, with optional longer major ticks.",
        tags: ["dial", "ticks", "scale", "markers"],
        capabilities: ["radial", "angular", "scale"],
        parameters: [
            BlockComponentHelpers.parameter("centerX", "Centre X", "number", 0),
            BlockComponentHelpers.parameter("centerY", "Centre Y", "number", 0),
            BlockComponentHelpers.parameter("radius", "Radius", "number", 80, { minimum: 1 }),
            BlockComponentHelpers.parameter("count", "Tick count", "number", 12, { minimum: 0, maximum: 720, bindable: false }),
            BlockComponentHelpers.parameter("startAngle", "Start angle", "number", 90, { unit: "deg" }),
            BlockComponentHelpers.parameter("spanAngle", "Span", "number", 360, { unit: "deg" }),
            BlockComponentHelpers.parameter("includeEnd", "Include end tick", "boolean", false),
            BlockComponentHelpers.parameter("length", "Tick length", "number", 8, { minimum: 0 }),
            BlockComponentHelpers.parameter("width", "Tick width", "number", 1, { minimum: 0 }),
            BlockComponentHelpers.parameter("color", "Tick colour", "colour", "token:stroke.default"),
            BlockComponentHelpers.parameter("majorEvery", "Major every", "number", 0, { minimum: 0, bindable: false }),
            BlockComponentHelpers.parameter("majorLength", "Major length", "number", 12, { minimum: 0 }),
            BlockComponentHelpers.parameter("majorWidth", "Major width", "number", 2, { minimum: 0 })
        ],
        create: (parameters, context) => {
            const color = context.tokens.resolveValue(parameters.color);
            const angles = BlockGeometry.distributeAngles(parameters.count, parameters.startAngle, parameters.spanAngle, parameters.includeEnd === true);
            const children = angles.map((angle, index) => {
                const isMajor = Number(parameters.majorEvery) > 0 && index % Math.floor(parameters.majorEvery) === 0;
                const tickLength = isMajor ? parameters.majorLength : parameters.length;
                const inner = BlockGeometry.polarPoint(parameters.centerX, parameters.centerY, Number(parameters.radius) - tickLength, angle);
                const outer = BlockGeometry.polarPoint(parameters.centerX, parameters.centerY, Number(parameters.radius), angle);
                return {
                    id: `tick-${index}`,
                    type: "line",
                    properties: {
                        x1: inner.x,
                        y1: inner.y,
                        x2: outer.x,
                        y2: outer.y,
                        stroke: color,
                        strokeWidth: isMajor ? parameters.majorWidth : parameters.width,
                        strokeLinecap: "round"
                    }
                };
            });
            return { id: "tick-ring", type: "group", children: children };
        }
    });

    registry.register({
        type: "label-ring",
        category: "component",
        displayName: "Label ring",
        description: "Numeric or text labels placed evenly around a centre, always drawn upright.",
        tags: ["dial", "labels", "numbers", "scale"],
        capabilities: ["radial", "angular", "textual"],
        parameters: [
            BlockComponentHelpers.parameter("centerX", "Centre X", "number", 0),
            BlockComponentHelpers.parameter("centerY", "Centre Y", "number", 0),
            BlockComponentHelpers.parameter("radius", "Radius", "number", 60, { minimum: 1 }),
            BlockComponentHelpers.parameter("count", "Label count", "number", 12, { minimum: 0, maximum: 360, bindable: false }),
            BlockComponentHelpers.parameter("startAngle", "Start angle", "number", 90, { unit: "deg" }),
            BlockComponentHelpers.parameter("spanAngle", "Span", "number", 360, { unit: "deg" }),
            BlockComponentHelpers.parameter("includeEnd", "Include end label", "boolean", false),
            BlockComponentHelpers.parameter("startValue", "First value", "number", 12),
            BlockComponentHelpers.parameter("valueStep", "Value step", "number", 1),
            BlockComponentHelpers.parameter("wrapAt", "Wrap at", "number", 12, { minimum: 0 }),
            BlockComponentHelpers.parameter("digits", "Decimals", "number", 0, { minimum: 0, maximum: 6 }),
            BlockComponentHelpers.parameter("texts", "Fixed texts", "string", "", { description: "Comma separated labels used instead of numbers." }),
            BlockComponentHelpers.parameter("fontSize", "Font size", "number", 12, { minimum: 1 }),
            BlockComponentHelpers.parameter("fontWeight", "Font weight", "number", 400, { minimum: 100, maximum: 900 }),
            BlockComponentHelpers.parameter("color", "Text colour", "colour", "token:text.primary")
        ],
        create: (parameters, context) => {
            const color = context.tokens.resolveValue(parameters.color);
            const fixedTexts = String(parameters.texts ?? "").split(",").map(text => text.trim()).filter(text => text !== "");
            const angles = BlockGeometry.distributeAngles(parameters.count, parameters.startAngle, parameters.spanAngle, parameters.includeEnd === true);
            const children = angles.map((angle, index) => {
                const position = BlockGeometry.polarPoint(parameters.centerX, parameters.centerY, parameters.radius, angle);
                let text = fixedTexts.length > 0 ? (fixedTexts[index % fixedTexts.length] ?? "") : "";
                if (fixedTexts.length === 0) {
                    let value = Number(parameters.startValue) + Number(parameters.valueStep) * index;
                    const wrapAt = Number(parameters.wrapAt);
                    if (wrapAt > 0)
                        value = ((value - 1) % wrapAt + wrapAt) % wrapAt + 1;
                    text = BlockComponentHelpers.formatNumber(value, parameters.digits);
                }
                return {
                    id: `label-${index}`,
                    type: "text",
                    properties: {
                        x: position.x,
                        y: position.y,
                        text: text,
                        fontSize: parameters.fontSize,
                        fontWeight: parameters.fontWeight,
                        fill: color,
                        stroke: "none",
                        textAnchor: "middle",
                        baseline: "central"
                    }
                };
            });
            return { id: "label-ring", type: "group", children: children };
        }
    });

    registry.register({
        type: "pointer-hand",
        category: "component",
        displayName: "Pointer hand",
        description: "A clock hand, gauge needle or compass pointer that rotates clockwise around an anchor. Angle 0 points up.",
        tags: ["hand", "needle", "pointer", "rotation", "clock"],
        capabilities: ["angular", "rotation", "interaction"],
        parameters: [
            BlockComponentHelpers.parameter("centerX", "Anchor X", "number", 0),
            BlockComponentHelpers.parameter("centerY", "Anchor Y", "number", 0),
            BlockComponentHelpers.parameter("angle", "Angle", "number", 0, { unit: "deg", description: "Clockwise degrees from the 12 o'clock direction." }),
            BlockComponentHelpers.parameter("length", "Length", "number", 60, { minimum: 0 }),
            BlockComponentHelpers.parameter("tailLength", "Tail length", "number", 0, { minimum: 0 }),
            BlockComponentHelpers.parameter("width", "Width", "number", 4, { minimum: 0 }),
            BlockComponentHelpers.parameter("color", "Colour", "colour", "token:stroke.strong"),
            BlockComponentHelpers.parameter("style", "Style", "string", "needle", { enumValues: ["needle", "line", "arrow"] }),
            BlockComponentHelpers.parameter("dragVariable", "Drag variable", "variable", "", { description: "Model variable written when the user drags this hand." }),
            BlockComponentHelpers.parameter("degreesPerUnit", "Degrees per unit", "number", 6),
            BlockComponentHelpers.parameter("wrapAt", "Wrap at", "number", 0, { minimum: 0 })
        ],
        create: (parameters, context) => {
            const color = context.tokens.resolveValue(parameters.color);
            const centerX = Number(parameters.centerX);
            const centerY = Number(parameters.centerY);
            const length = Number(parameters.length);
            const width = Number(parameters.width);
            const tailLength = Number(parameters.tailLength);
            let shapeNode = null;
            if (parameters.style === "line") {
                shapeNode = {
                    id: "hand",
                    type: "line",
                    properties: { x1: centerX, y1: centerY + tailLength, x2: centerX, y2: centerY - length, stroke: color, strokeWidth: width, strokeLinecap: "round" }
                };
            } else if (parameters.style === "arrow") {
                const headLength = Math.min(length * 0.3, Math.max(6, width * 3));
                shapeNode = {
                    id: "hand",
                    type: "polygon",
                    properties: {
                        points: [
                            { x: centerX, y: centerY - length },
                            { x: centerX + headLength * 0.5, y: centerY - length + headLength },
                            { x: centerX + width / 2, y: centerY - length + headLength },
                            { x: centerX + width / 2, y: centerY + tailLength },
                            { x: centerX - width / 2, y: centerY + tailLength },
                            { x: centerX - width / 2, y: centerY - length + headLength },
                            { x: centerX - headLength * 0.5, y: centerY - length + headLength }
                        ],
                        fill: color,
                        stroke: "none"
                    }
                };
            } else {
                shapeNode = {
                    id: "hand",
                    type: "polygon",
                    properties: {
                        points: [
                            { x: centerX, y: centerY - length },
                            { x: centerX + width / 2, y: centerY },
                            { x: centerX, y: centerY + tailLength },
                            { x: centerX - width / 2, y: centerY }
                        ],
                        fill: color,
                        stroke: "none"
                    }
                };
            }
            const behaviours = [];
            if (String(parameters.dragVariable ?? "") !== "") {
                behaviours.push({
                    type: "drag-angle",
                    variable: parameters.dragVariable,
                    centerX: centerX,
                    centerY: centerY,
                    degreesPerUnit: parameters.degreesPerUnit,
                    wrapAt: parameters.wrapAt
                });
            }
            return {
                id: "pointer-hand",
                type: "group",
                modifiers: [{ type: "rotate", angle: parameters.angle, centerX: centerX, centerY: centerY }],
                behaviours: behaviours,
                children: [shapeNode]
            };
        }
    });

})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockComponentHelpers;
