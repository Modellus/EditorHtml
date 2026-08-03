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
    faceRadius(parameters, margin = 4) {
        const size = Math.min(Number(parameters.$width) || 180, Number(parameters.$height) || 180);
        return Math.max(4, size / 2 - margin);
    },
    center(parameters) {
        return { x: (Number(parameters.$width) || 180) / 2, y: (Number(parameters.$height) || 180) / 2 };
    },
    valueToRotation(value, minimum, maximum, startAngle, endAngle) {
        const span = BlockGeometry.clockwiseSpan(startAngle, endAngle);
        const range = maximum - minimum;
        const ratio = range === 0 ? 0 : Math.max(0, Math.min(1, (value - minimum) / range));
        const polarAngle = startAngle - ratio * span;
        return 90 - polarAngle;
    },
    formatNumber(value, digits) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return "";
        return numeric.toFixed(Math.max(0, Math.min(6, Math.floor(digits))));
    },
    formulas: {
        hourHandRotation: "\\left(\\mod\\left(h,12\\right)+\\frac{m}{60}\\right)\\cdot30",
        minuteHandRotation: "\\mod\\left(m,60\\right)\\cdot6",
        secondHandRotation: "\\mod\\left(s,60\\right)\\cdot6",
        orbitRotation: "\\frac{t}{p}\\cdot360"
    },
    evaluate(context, latex, inputs, fallbackValue = 0) {
        return context.resolveNumber({ formula: latex, inputs: inputs }, fallbackValue);
    },
    variableInput(parameterId) {
        return { parameter: parameterId, as: "number" };
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

    registry.register({
        type: "analogue-clock",
        category: "component",
        icon: "fa-light fa-clock",
        displayName: "Analogue clock",
        description: "Clock face with hour, minute and optional second hands whose angles come from model variables or expressions.",
        tags: ["object", "clock", "time", "dial", "hands"],
        capabilities: ["radial", "angular", "reads-model", "interaction"],
        parameters: [
            BlockComponentHelpers.parameter("hourVariable", "Hour variable", "variable", "0", { category: "model", description: "Model variable or number giving the hour." }),
            BlockComponentHelpers.parameter("minuteVariable", "Minute variable", "variable", "0", { category: "model", description: "Model variable or number giving the minute." }),
            BlockComponentHelpers.parameter("secondVariable", "Second variable", "variable", "0", { category: "model", description: "Model variable or number giving the second." }),
            BlockComponentHelpers.parameter("showSecondHand", "Show second hand", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("showNumbers", "Show numbers", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("showMinuteTicks", "Show minute ticks", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("faceColor", "Face colour", "colour", "token:surface.default", { category: "style" }),
            BlockComponentHelpers.parameter("borderColor", "Border colour", "colour", "token:stroke.default", { category: "style" }),
            BlockComponentHelpers.parameter("handColor", "Hand colour", "colour", "token:stroke.strong", { category: "style" }),
            BlockComponentHelpers.parameter("secondHandColor", "Second hand colour", "colour", "token:stroke.warning", { category: "style" }),
            BlockComponentHelpers.parameter("numberColor", "Number colour", "colour", "token:text.primary", { category: "style" }),
            BlockComponentHelpers.parameter("interactive", "Hands can be dragged", "boolean", false, { category: "interaction" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const radius = BlockComponentHelpers.faceRadius(parameters, 6);
            const tokens = context.tokens;
            const handColor = tokens.resolveValue(parameters.handColor);
            const hourAngle = BlockComponentHelpers.evaluate(context, BlockComponentHelpers.formulas.hourHandRotation, {
                h: BlockComponentHelpers.variableInput("hourVariable"),
                m: BlockComponentHelpers.variableInput("minuteVariable")
            });
            const minuteAngle = BlockComponentHelpers.evaluate(context, BlockComponentHelpers.formulas.minuteHandRotation, {
                m: BlockComponentHelpers.variableInput("minuteVariable")
            });
            const secondAngle = BlockComponentHelpers.evaluate(context, BlockComponentHelpers.formulas.secondHandRotation, {
                s: BlockComponentHelpers.variableInput("secondVariable")
            });
            const children = [
                {
                    id: "face",
                    type: "dial-face",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius,
                        faceColor: parameters.faceColor,
                        borderColor: parameters.borderColor,
                        borderWidth: tokens.getNumber("strokeWidth.strong", 2)
                    }
                },
                {
                    id: "hour-markers",
                    type: "tick-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.95,
                        count: 12,
                        startAngle: 90,
                        spanAngle: 360,
                        length: radius * 0.1,
                        width: tokens.getNumber("strokeWidth.strong", 2),
                        color: parameters.borderColor
                    }
                }
            ];
            if (parameters.showMinuteTicks === true) {
                children.push({
                    id: "minute-markers",
                    type: "tick-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.95,
                        count: 60,
                        startAngle: 90,
                        spanAngle: 360,
                        length: radius * 0.05,
                        width: tokens.getNumber("strokeWidth.hairline", 0.5),
                        color: parameters.borderColor
                    }
                });
            }
            if (parameters.showNumbers === true) {
                children.push({
                    id: "numbers",
                    type: "label-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.74,
                        count: 12,
                        startAngle: 90,
                        spanAngle: 360,
                        startValue: 12,
                        valueStep: 1,
                        wrapAt: 12,
                        fontSize: Math.max(7, radius * 0.16),
                        fontWeight: tokens.getNumber("font.weight.default", 400),
                        color: parameters.numberColor
                    }
                });
            }
            children.push({
                id: "hour-hand",
                type: "pointer-hand",
                parameters: {
                    centerX: center.x,
                    centerY: center.y,
                    angle: hourAngle,
                    length: radius * 0.5,
                    tailLength: radius * 0.12,
                    width: Math.max(3, radius * 0.07),
                    color: parameters.handColor,
                    style: "needle",
                    dragVariable: parameters.interactive === true ? parameters.hourVariable : "",
                    degreesPerUnit: 30,
                    wrapAt: 12
                }
            });
            children.push({
                id: "minute-hand",
                type: "pointer-hand",
                parameters: {
                    centerX: center.x,
                    centerY: center.y,
                    angle: minuteAngle,
                    length: radius * 0.75,
                    tailLength: radius * 0.14,
                    width: Math.max(2, radius * 0.05),
                    color: parameters.handColor,
                    style: "needle",
                    dragVariable: parameters.interactive === true ? parameters.minuteVariable : "",
                    degreesPerUnit: 6,
                    wrapAt: 60
                }
            });
            if (parameters.showSecondHand === true) {
                children.push({
                    id: "second-hand",
                    type: "pointer-hand",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        angle: secondAngle,
                        length: radius * 0.82,
                        tailLength: radius * 0.2,
                        width: Math.max(1, radius * 0.02),
                        color: parameters.secondHandColor,
                        style: "line",
                        dragVariable: parameters.interactive === true ? parameters.secondVariable : "",
                        degreesPerUnit: 6,
                        wrapAt: 60
                    }
                });
            }
            children.push({
                id: "centre-cap",
                type: "circle",
                properties: {
                    centerX: center.x,
                    centerY: center.y,
                    radius: Math.max(2, radius * 0.045),
                    fill: handColor,
                    stroke: "none"
                }
            });
            return { id: "analogue-clock", type: "group", children: children };
        }
    });

    registry.register({
        type: "compass",
        category: "component",
        icon: "fa-light fa-compass",
        displayName: "Compass",
        description: "Compass rose with cardinal labels and a needle whose heading comes from a model variable.",
        tags: ["object", "compass", "heading", "navigation", "dial"],
        capabilities: ["radial", "angular", "reads-model"],
        parameters: [
            BlockComponentHelpers.parameter("headingVariable", "Heading variable", "variable", "0", { category: "model" }),
            BlockComponentHelpers.parameter("showDegrees", "Show degree labels", "boolean", false, { category: "display" }),
            BlockComponentHelpers.parameter("faceColor", "Face colour", "colour", "token:surface.default", { category: "style" }),
            BlockComponentHelpers.parameter("borderColor", "Border colour", "colour", "token:stroke.default", { category: "style" }),
            BlockComponentHelpers.parameter("needleColor", "North needle colour", "colour", "token:stroke.warning", { category: "style" }),
            BlockComponentHelpers.parameter("tailColor", "South needle colour", "colour", "token:stroke.subtle", { category: "style" }),
            BlockComponentHelpers.parameter("labelColor", "Label colour", "colour", "token:text.primary", { category: "style" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const radius = BlockComponentHelpers.faceRadius(parameters, 6);
            const tokens = context.tokens;
            const heading = context.resolveTermValue(parameters.headingVariable, 0);
            const children = [
                {
                    id: "face",
                    type: "dial-face",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius,
                        faceColor: parameters.faceColor,
                        borderColor: parameters.borderColor,
                        borderWidth: tokens.getNumber("strokeWidth.strong", 2)
                    }
                },
                {
                    id: "rose-ticks",
                    type: "tick-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.96,
                        count: 72,
                        startAngle: 90,
                        spanAngle: 360,
                        length: radius * 0.05,
                        width: tokens.getNumber("strokeWidth.hairline", 0.5),
                        color: parameters.borderColor,
                        majorEvery: 9,
                        majorLength: radius * 0.12,
                        majorWidth: tokens.getNumber("strokeWidth.strong", 2)
                    }
                },
                {
                    id: "cardinals",
                    type: "label-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: parameters.showDegrees === true ? radius * 0.52 : radius * 0.74,
                        count: 4,
                        startAngle: 90,
                        spanAngle: 360,
                        texts: "N,E,S,W",
                        fontSize: Math.max(8, radius * 0.2),
                        fontWeight: tokens.getNumber("font.weight.strong", 600),
                        color: parameters.labelColor
                    }
                },
                {
                    id: "needle-north",
                    type: "pointer-hand",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        angle: heading,
                        length: radius * 0.66,
                        tailLength: 0,
                        width: Math.max(4, radius * 0.14),
                        color: parameters.needleColor,
                        style: "needle"
                    }
                },
                {
                    id: "needle-south",
                    type: "pointer-hand",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        angle: heading + 180,
                        length: radius * 0.66,
                        tailLength: 0,
                        width: Math.max(4, radius * 0.14),
                        color: parameters.tailColor,
                        style: "needle"
                    }
                },
                {
                    id: "centre-cap",
                    type: "circle",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: Math.max(2, radius * 0.06),
                        fill: context.tokens.resolveValue(parameters.borderColor),
                        stroke: "none"
                    }
                }
            ];
            if (parameters.showDegrees === true) {
                children.splice(3, 0, {
                    id: "degrees",
                    type: "label-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.86,
                        count: 12,
                        startAngle: 90,
                        spanAngle: 360,
                        startValue: 0,
                        valueStep: 30,
                        wrapAt: 0,
                        fontSize: Math.max(6, radius * 0.11),
                        color: parameters.labelColor
                    }
                });
            }
            return { id: "compass", type: "group", children: children };
        }
    });

    registry.register({
        type: "speedometer",
        category: "component",
        icon: "fa-light fa-gauge-high",
        displayName: "Speedometer",
        description: "Sweeping dial with a scale, a needle bound to a model variable and a numeric readout.",
        tags: ["object", "gauge", "speed", "dial", "meter", "scale"],
        capabilities: ["radial", "angular", "reads-model", "scale"],
        parameters: [
            BlockComponentHelpers.parameter("valueVariable", "Value variable", "variable", "0", { category: "model" }),
            BlockComponentHelpers.parameter("minimum", "Minimum", "number", 0, { category: "scale" }),
            BlockComponentHelpers.parameter("maximum", "Maximum", "number", 100, { category: "scale" }),
            BlockComponentHelpers.parameter("startAngle", "Start angle", "number", 225, { category: "scale", unit: "deg" }),
            BlockComponentHelpers.parameter("endAngle", "End angle", "number", -45, { category: "scale", unit: "deg" }),
            BlockComponentHelpers.parameter("majorTicks", "Major ticks", "number", 9, { category: "scale", minimum: 2, maximum: 60, bindable: false }),
            BlockComponentHelpers.parameter("minorPerMajor", "Minor ticks per major", "number", 4, { category: "scale", minimum: 0, maximum: 20, bindable: false }),
            BlockComponentHelpers.parameter("digits", "Decimals", "number", 0, { category: "display", minimum: 0, maximum: 6 }),
            BlockComponentHelpers.parameter("unit", "Unit", "string", "", { category: "display" }),
            BlockComponentHelpers.parameter("showReadout", "Show readout", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("faceColor", "Face colour", "colour", "token:surface.emphasis", { category: "style" }),
            BlockComponentHelpers.parameter("borderColor", "Border colour", "colour", "token:stroke.default", { category: "style" }),
            BlockComponentHelpers.parameter("needleColor", "Needle colour", "colour", "token:stroke.warning", { category: "style" }),
            BlockComponentHelpers.parameter("labelColor", "Label colour", "colour", "token:text.primary", { category: "style" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const radius = BlockComponentHelpers.faceRadius(parameters, 6);
            const tokens = context.tokens;
            const minimum = Number(parameters.minimum);
            const maximum = Number(parameters.maximum);
            const value = context.resolveTermValue(parameters.valueVariable, 0);
            const majorCount = Math.max(2, Math.floor(parameters.majorTicks));
            const minorCount = (majorCount - 1) * Math.max(0, Math.floor(parameters.minorPerMajor)) + 1;
            const step = (maximum - minimum) / (majorCount - 1);
            const children = [
                {
                    id: "face",
                    type: "dial-face",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius,
                        faceColor: parameters.faceColor,
                        borderColor: parameters.borderColor,
                        borderWidth: tokens.getNumber("strokeWidth.strong", 2)
                    }
                },
                {
                    id: "scale-arc",
                    type: "arc",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.9,
                        startAngle: parameters.startAngle,
                        endAngle: parameters.endAngle,
                        stroke: context.tokens.resolveValue(parameters.borderColor),
                        strokeWidth: tokens.getNumber("strokeWidth.default", 1),
                        fill: "none"
                    }
                },
                {
                    id: "minor-ticks",
                    type: "tick-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.9,
                        count: minorCount,
                        startAngle: parameters.startAngle,
                        spanAngle: BlockGeometry.clockwiseSpan(parameters.startAngle, parameters.endAngle),
                        includeEnd: true,
                        length: radius * 0.06,
                        width: tokens.getNumber("strokeWidth.hairline", 0.5),
                        color: parameters.borderColor
                    }
                },
                {
                    id: "major-ticks",
                    type: "tick-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.9,
                        count: majorCount,
                        startAngle: parameters.startAngle,
                        spanAngle: BlockGeometry.clockwiseSpan(parameters.startAngle, parameters.endAngle),
                        includeEnd: true,
                        length: radius * 0.13,
                        width: tokens.getNumber("strokeWidth.strong", 2),
                        color: parameters.borderColor
                    }
                },
                {
                    id: "scale-labels",
                    type: "label-ring",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius * 0.7,
                        count: majorCount,
                        startAngle: parameters.startAngle,
                        spanAngle: BlockGeometry.clockwiseSpan(parameters.startAngle, parameters.endAngle),
                        includeEnd: true,
                        startValue: minimum,
                        valueStep: step,
                        wrapAt: 0,
                        digits: parameters.digits,
                        fontSize: Math.max(7, radius * 0.13),
                        color: parameters.labelColor
                    }
                },
                {
                    id: "needle",
                    type: "pointer-hand",
                    parameters: {
                        centerX: center.x,
                        centerY: center.y,
                        angle: BlockComponentHelpers.valueToRotation(value, minimum, maximum, parameters.startAngle, parameters.endAngle),
                        length: radius * 0.78,
                        tailLength: radius * 0.16,
                        width: Math.max(3, radius * 0.07),
                        color: parameters.needleColor,
                        style: "needle"
                    }
                },
                {
                    id: "centre-cap",
                    type: "circle",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: Math.max(3, radius * 0.07),
                        fill: context.tokens.resolveValue(parameters.borderColor),
                        stroke: "none"
                    }
                }
            ];
            if (parameters.showReadout === true) {
                const readoutText = `${BlockComponentHelpers.formatNumber(value, parameters.digits)}${parameters.unit ? " " + parameters.unit : ""}`;
                children.push({
                    id: "readout",
                    type: "text",
                    properties: {
                        x: center.x,
                        y: center.y + radius * 0.34,
                        text: readoutText,
                        fontSize: Math.max(9, radius * 0.17),
                        fontWeight: tokens.getNumber("font.weight.strong", 600),
                        fill: context.tokens.resolveValue(parameters.labelColor),
                        stroke: "none"
                    }
                });
            }
            return { id: "speedometer", type: "group", children: children };
        }
    });

    registry.register({
        type: "circular-gauge",
        category: "component",
        icon: "fa-light fa-circle-notch",
        displayName: "Circular gauge",
        description: "Ring gauge that fills clockwise in proportion to a model variable.",
        tags: ["object", "gauge", "progress", "ring", "meter"],
        capabilities: ["radial", "angular", "reads-model"],
        parameters: [
            BlockComponentHelpers.parameter("valueVariable", "Value variable", "variable", "0", { category: "model" }),
            BlockComponentHelpers.parameter("minimum", "Minimum", "number", 0, { category: "scale" }),
            BlockComponentHelpers.parameter("maximum", "Maximum", "number", 100, { category: "scale" }),
            BlockComponentHelpers.parameter("startAngle", "Start angle", "number", 90, { category: "scale", unit: "deg" }),
            BlockComponentHelpers.parameter("spanAngle", "Span", "number", 360, { category: "scale", unit: "deg", minimum: 1, maximum: 360 }),
            BlockComponentHelpers.parameter("thickness", "Ring thickness", "number", 0.22, { category: "style", minimum: 0.02, maximum: 1 }),
            BlockComponentHelpers.parameter("trackColor", "Track colour", "colour", "token:surface.muted", { category: "style" }),
            BlockComponentHelpers.parameter("fillColor", "Fill colour", "colour", "token:stroke.accent", { category: "style" }),
            BlockComponentHelpers.parameter("labelColor", "Label colour", "colour", "token:text.primary", { category: "style" }),
            BlockComponentHelpers.parameter("digits", "Decimals", "number", 0, { category: "display", minimum: 0, maximum: 6 }),
            BlockComponentHelpers.parameter("unit", "Unit", "string", "", { category: "display" }),
            BlockComponentHelpers.parameter("showReadout", "Show readout", "boolean", true, { category: "display" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const radius = BlockComponentHelpers.faceRadius(parameters, 4);
            const innerRadius = radius * (1 - Math.max(0.02, Math.min(1, Number(parameters.thickness))));
            const minimum = Number(parameters.minimum);
            const maximum = Number(parameters.maximum);
            const value = context.resolveTermValue(parameters.valueVariable, 0);
            const range = maximum - minimum;
            const ratio = range === 0 ? 0 : Math.max(0, Math.min(1, (value - minimum) / range));
            const span = Math.max(0.001, Math.min(360, Number(parameters.spanAngle)));
            const startAngle = Number(parameters.startAngle);
            const filledSpan = Math.max(0.001, span * ratio);
            const children = [
                {
                    id: "track",
                    type: "arc",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius,
                        innerRadius: innerRadius,
                        startAngle: startAngle,
                        endAngle: startAngle - span + (span >= 360 ? 0.001 : 0),
                        fill: context.tokens.resolveValue(parameters.trackColor),
                        stroke: "none"
                    }
                },
                {
                    id: "fill",
                    type: "arc",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: radius,
                        innerRadius: innerRadius,
                        startAngle: startAngle,
                        endAngle: startAngle - filledSpan,
                        fill: context.tokens.resolveValue(parameters.fillColor),
                        stroke: "none"
                    }
                }
            ];
            if (parameters.showReadout === true) {
                children.push({
                    id: "readout",
                    type: "text",
                    properties: {
                        x: center.x,
                        y: center.y,
                        text: `${BlockComponentHelpers.formatNumber(value, parameters.digits)}${parameters.unit ? " " + parameters.unit : ""}`,
                        fontSize: Math.max(10, radius * 0.34),
                        fontWeight: context.tokens.getNumber("font.weight.strong", 600),
                        fill: context.tokens.resolveValue(parameters.labelColor),
                        stroke: "none"
                    }
                });
            }
            return { id: "circular-gauge", type: "group", children: children };
        }
    });

    registry.register({
        type: "rotating-vector",
        category: "component",
        icon: "fa-light fa-arrow-right-long",
        displayName: "Rotating vector",
        description: "Phasor arrow whose angle and length come from model variables, with an optional reference circle and projections.",
        tags: ["object", "vector", "phasor", "arrow", "rotation", "oscillation"],
        capabilities: ["angular", "reads-model", "vector"],
        parameters: [
            BlockComponentHelpers.parameter("angleVariable", "Angle variable", "variable", "0", { category: "model", description: "Angle in degrees, measured counter-clockwise from the positive x axis." }),
            BlockComponentHelpers.parameter("lengthVariable", "Length variable", "variable", "1", { category: "model" }),
            BlockComponentHelpers.parameter("lengthScale", "Length scale", "number", 1, { category: "scale", minimum: 0 }),
            BlockComponentHelpers.parameter("showCircle", "Show reference circle", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("showProjections", "Show projections", "boolean", false, { category: "display" }),
            BlockComponentHelpers.parameter("vectorColor", "Vector colour", "colour", "token:stroke.accent", { category: "style" }),
            BlockComponentHelpers.parameter("circleColor", "Circle colour", "colour", "token:stroke.subtle", { category: "style" }),
            BlockComponentHelpers.parameter("projectionColor", "Projection colour", "colour", "token:stroke.subtle", { category: "style" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const maximumRadius = BlockComponentHelpers.faceRadius(parameters, 8);
            const angleDegrees = context.resolveTermValue(parameters.angleVariable, 0);
            const rawLength = context.resolveTermValue(parameters.lengthVariable, 0);
            const scaledLength = Math.max(0, Math.min(maximumRadius, (Number.isFinite(rawLength) ? rawLength : 0) * Number(parameters.lengthScale)));
            const tip = BlockGeometry.polarPoint(center.x, center.y, scaledLength, angleDegrees);
            const children = [];
            if (parameters.showCircle === true) {
                children.push({
                    id: "reference-circle",
                    type: "circle",
                    properties: {
                        centerX: center.x,
                        centerY: center.y,
                        radius: maximumRadius,
                        fill: "none",
                        stroke: context.tokens.resolveValue(parameters.circleColor),
                        strokeWidth: context.tokens.getNumber("strokeWidth.hairline", 0.5),
                        strokeDash: "3 3"
                    }
                });
            }
            if (parameters.showProjections === true) {
                children.push({
                    id: "projection-x",
                    type: "line",
                    properties: {
                        x1: tip.x,
                        y1: tip.y,
                        x2: tip.x,
                        y2: center.y,
                        stroke: context.tokens.resolveValue(parameters.projectionColor),
                        strokeWidth: context.tokens.getNumber("strokeWidth.hairline", 0.5),
                        strokeDash: "2 2"
                    }
                });
                children.push({
                    id: "projection-y",
                    type: "line",
                    properties: {
                        x1: tip.x,
                        y1: tip.y,
                        x2: center.x,
                        y2: tip.y,
                        stroke: context.tokens.resolveValue(parameters.projectionColor),
                        strokeWidth: context.tokens.getNumber("strokeWidth.hairline", 0.5),
                        strokeDash: "2 2"
                    }
                });
            }
            children.push({
                id: "vector",
                type: "pointer-hand",
                parameters: {
                    centerX: center.x,
                    centerY: center.y,
                    angle: 90 - angleDegrees,
                    length: scaledLength,
                    tailLength: 0,
                    width: context.tokens.getNumber("strokeWidth.strong", 2) * 1.5,
                    color: parameters.vectorColor,
                    style: "arrow"
                }
            });
            children.push({
                id: "origin",
                type: "circle",
                properties: {
                    centerX: center.x,
                    centerY: center.y,
                    radius: 2.5,
                    fill: context.tokens.resolveValue(parameters.vectorColor),
                    stroke: "none"
                }
            });
            return { id: "rotating-vector", type: "group", children: children };
        }
    });

    registry.register({
        type: "orbit-system",
        category: "component",
        icon: "fa-light fa-sun",
        displayName: "Orbit system",
        description: "Central body with up to four orbiting bodies whose angular positions come from model variables or from simulation time and an orbital period.",
        tags: ["object", "orbit", "solar", "planets", "astronomy", "rotation"],
        capabilities: ["radial", "angular", "reads-model"],
        parameters: [
            BlockComponentHelpers.parameter("timeVariable", "Time variable", "variable", "t", { category: "model" }),
            BlockComponentHelpers.parameter("bodyCount", "Orbiting bodies", "number", 3, { category: "display", minimum: 0, maximum: 4, bindable: false }),
            BlockComponentHelpers.parameter("period1", "Period 1", "number", 4, { category: "orbits", minimum: 0.0001 }),
            BlockComponentHelpers.parameter("period2", "Period 2", "number", 8, { category: "orbits", minimum: 0.0001 }),
            BlockComponentHelpers.parameter("period3", "Period 3", "number", 16, { category: "orbits", minimum: 0.0001 }),
            BlockComponentHelpers.parameter("period4", "Period 4", "number", 32, { category: "orbits", minimum: 0.0001 }),
            BlockComponentHelpers.parameter("showOrbits", "Show orbit paths", "boolean", true, { category: "display" }),
            BlockComponentHelpers.parameter("starColor", "Central body colour", "colour", "#f08c02", { category: "style" }),
            BlockComponentHelpers.parameter("bodyColor", "Orbiting body colour", "colour", "token:stroke.accent", { category: "style" }),
            BlockComponentHelpers.parameter("orbitColor", "Orbit colour", "colour", "token:stroke.subtle", { category: "style" })
        ],
        create: (parameters, context) => {
            const center = BlockComponentHelpers.center(parameters);
            const maximumRadius = BlockComponentHelpers.faceRadius(parameters, 8);
            const bodyCount = Math.max(0, Math.min(4, Math.floor(Number(parameters.bodyCount))));
            const time = context.resolveTermValue(parameters.timeVariable, 0);
            const children = [];
            const periods = [parameters.period1, parameters.period2, parameters.period3, parameters.period4];
            for (let index = 0; index < bodyCount; index++) {
                const orbitRadius = maximumRadius * (index + 1) / (bodyCount + 0.4);
                if (parameters.showOrbits === true) {
                    children.push({
                        id: `orbit-${index}`,
                        type: "circle",
                        properties: {
                            centerX: center.x,
                            centerY: center.y,
                            radius: orbitRadius,
                            fill: "none",
                            stroke: context.tokens.resolveValue(parameters.orbitColor),
                            strokeWidth: context.tokens.getNumber("strokeWidth.hairline", 0.5),
                            strokeDash: "2 3"
                        }
                    });
                }
                const period = Math.max(0.0001, Number(periods[index]));
                const angle = BlockComponentHelpers.evaluate(context, BlockComponentHelpers.formulas.orbitRotation, { t: { constant: time }, p: { constant: period } });
                const position = BlockGeometry.polarPoint(center.x, center.y, orbitRadius, angle);
                children.push({
                    id: `body-${index}`,
                    type: "circle",
                    properties: {
                        centerX: position.x,
                        centerY: position.y,
                        radius: Math.max(2, maximumRadius * 0.06),
                        fill: context.tokens.resolveValue(parameters.bodyColor),
                        stroke: "none"
                    }
                });
            }
            children.unshift({
                id: "star",
                type: "circle",
                properties: {
                    centerX: center.x,
                    centerY: center.y,
                    radius: Math.max(4, maximumRadius * 0.12),
                    fill: context.tokens.resolveValue(parameters.starColor),
                    stroke: "none"
                }
            });
            return { id: "orbit-system", type: "group", children: children };
        }
    });
})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockComponentHelpers;
