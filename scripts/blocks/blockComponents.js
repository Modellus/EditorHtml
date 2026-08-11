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
    },

    strokeLine(id, x1, y1, x2, y2, color, width, opacity = 1) {
        return {
            id: id,
            type: "line",
            properties: { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color, strokeWidth: width, strokeLinecap: "butt", opacity: opacity }
        };
    },

    // A plot box and the range drawn in it: the two things every cartesian drawing needs, worked out
    // once so an axis, a grid, a trace and a crosshair all place a value at the same pixel.
    plotBox(parameters) {
        const left = Number(parameters.x);
        const top = Number(parameters.y);
        const width = Math.max(1, Number(parameters.width));
        const height = Math.max(1, Number(parameters.height));
        const spanX = Math.max(1e-9, Number(parameters.maximumX) - Number(parameters.minimumX));
        const spanY = Math.max(1e-9, Number(parameters.maximumY) - Number(parameters.minimumY));
        return {
            left: left,
            top: top,
            right: left + width,
            bottom: top + height,
            width: width,
            height: height,
            toX: value => left + (Number(value) - Number(parameters.minimumX)) * width / spanX,
            toY: value => top + height - (Number(value) - Number(parameters.minimumY)) * height / spanY
        };
    },

    // The ticks of one axis, worked out the way the chart works out its own: majors land on round
    // numbers rather than on an even division of whatever the range happens to be, and each interval
    // is subdivided as long as the minor ticks stay far enough apart to be read.
    axisTicks(minimum, maximum, targetCount, lengthPixels) {
        const major = buildNiceTickValues(Number(minimum), Number(maximum), Math.max(2, Math.floor(Number(targetCount))), { anchor: "outside" })
            .filter(value => value >= Number(minimum) - 1e-9 && value <= Number(maximum) + 1e-9);
        const minor = [];
        if (major.length < 2)
            return { major: major, minor: minor };
        const step = major[1] - major[0];
        const divisions = minorTickDivisions(step / (Number(maximum) - Number(minimum)) * Number(lengthPixels), 5);
        // The interval below the first major tick still owes its minor ticks to the stretch of axis
        // before it, so the walk starts one step early.
        for (let value = major[0] - step; value <= major[major.length - 1] + step * 0.001; value += step) {
            forEachMinorTick(Math.round(value * 1e10) / 1e10, step, divisions, minorValue => {
                if (minorValue <= Number(minimum) || minorValue >= Number(maximum))
                    return;
                minor.push(Math.round(minorValue * 1e10) / 1e10);
            });
        }
        return { major: major, minor: minor };
    },

    plotTicks(parameters, box) {
        return {
            x: BlockComponentHelpers.axisTicks(parameters.minimumX, parameters.maximumX, parameters.ticksX, box.width),
            y: BlockComponentHelpers.axisTicks(parameters.minimumY, parameters.maximumY, parameters.ticksY, box.height)
        };
    },

    // A grab area over each numbered tick, so an axis is rescaled by pulling one of its own numbers
    // — the interaction the chart has always had. An axis says which of the object's properties hold
    // its ends; naming neither leaves the ticks as ink.
    tickHandleNodes(parameters, box, ticks, labelGap) {
        const nodes = [];
        const addHandles = (axis, values, minimumProperty, maximumProperty, hitArea) => {
            if (String(minimumProperty ?? "") === "" || String(maximumProperty ?? "") === "")
                return;
            for (let index = 0; index < values.length; index++) {
                const area = hitArea(values[index]);
                nodes.push({
                    id: `${axis}-tick-handle-${index}`,
                    type: "rect",
                    properties: Object.assign({ fill: "none", stroke: "none" }, area),
                    behaviours: [{
                        type: "drag-axis-tick",
                        axis: axis,
                        value: values[index],
                        minimumProperty: minimumProperty,
                        maximumProperty: maximumProperty,
                        originPixel: axis === "x" ? box.left : box.bottom,
                        lengthPixels: axis === "x" ? box.width : box.height
                    }]
                });
            }
        };
        addHandles("x", ticks.x.major, parameters.minimumXProperty, parameters.maximumXProperty, value => ({
            x: box.toX(value) - labelGap / 2,
            y: box.bottom,
            width: labelGap,
            height: labelGap
        }));
        addHandles("y", ticks.y.major, parameters.minimumYProperty, parameters.maximumYProperty, value => ({
            x: box.left - labelGap * 2,
            y: box.toY(value) - labelGap / 2,
            width: labelGap * 2,
            height: labelGap
        }));
        return nodes;
    },

    // What was recorded at the horizontal value the pointer is on: the point itself, its own value on
    // the horizontal axis, and its height read against the vertical one. The chart answers a hovered
    // x this way, and a run of samples is answered the same.
    pointAtPointerNodes(parameters, box, badge, context) {
        // A break is not a point the pointer can be answered with.
        const rows = (Array.isArray(parameters.rows) ? parameters.rows : []).filter(row => !BlockMemory.isGap(row));
        if (rows.length === 0)
            return [];
        const value = Number(parameters.valueX);
        const nearest = rows.reduce((closest, row) => Math.abs(BlockMemory.readField(row, "x") - value) < Math.abs(BlockMemory.readField(closest, "x") - value) ? row : closest, rows[0]);
        const nearestX = BlockMemory.readField(nearest, "x");
        const nearestY = BlockMemory.readField(nearest, "y");
        const positionY = box.toY(nearestY);
        if (positionY < box.top || positionY > box.bottom)
            return [];
        const pointColor = context.tokens.resolveValue(parameters.pointColor);
        // Each badge is painted in the colour its own value is given, and falls back to the colour
        // that badge has always been drawn in.
        const axisBadgeColor = context.tokens.resolveValue(parameters.xColor || parameters.axisBadgeColor);
        const valueBadgeColor = context.tokens.resolveValue(parameters.yColor || parameters.pointColor);
        const axisBadge = Object.assign({}, badge, { backgroundColor: axisBadgeColor, textColor: Utils.getContrastColor(axisBadgeColor) });
        const valueBadge = Object.assign({}, badge, { backgroundColor: valueBadgeColor, textColor: Utils.getContrastColor(valueBadgeColor) });
        const digits = Math.max(0, Math.min(6, Math.floor(Number(parameters.digits))));
        const valueText = Utils.formatNumber(nearestY, digits);
        const gapX = Number(badge.fontSize) * context.tokens.getNumber("axis.labelGapX", 1.8);
        return [
            {
                id: "point",
                type: "circle",
                properties: {
                    centerX: box.toX(nearestX),
                    centerY: positionY,
                    radius: Math.max(2, Number(badge.fontSize) * 0.4),
                    fill: pointColor,
                    stroke: context.tokens.get("text.inverse", "#ffffff"),
                    strokeWidth: 1.5
                }
            },
            ...BlockComponentHelpers.badgeNodes("value-x", Utils.formatNumber(nearestX, digits), box.toX(nearestX), box.bottom + gapX * 0.6, axisBadge),
            ...BlockComponentHelpers.badgeNodes("value-y", valueText, box.left - BlockComponentHelpers.badgeWidth(valueText, badge) / 2 - 4, positionY, valueBadge)
        ];
    },

    badgeWidth(text, options) {
        const fontSize = Number(options.fontSize);
        return String(text).length * fontSize * options.tokens.getNumber("badge.charWidth", 0.58) + options.tokens.getNumber("badge.paddingX", 4) * 2;
    },

    // The badge the board reads a value in: the same plate `Utils.valueBadgeSvgMarkup` draws for the
    // hand-written shapes, built as nodes and measured from the same tokens.
    badgeNodes(id, text, x, y, options) {
        const fontSize = Number(options.fontSize);
        const paddingY = options.tokens.getNumber("badge.paddingY", 2);
        const height = fontSize + paddingY * 2;
        const width = BlockComponentHelpers.badgeWidth(text, options);
        return [
            {
                id: `${id}-plate`,
                type: "rect",
                properties: {
                    x: x - width / 2,
                    y: y - height / 2,
                    width: width,
                    height: height,
                    cornerRadius: options.tokens.getNumber("badge.cornerRadius", 3),
                    fill: options.backgroundColor,
                    stroke: "none",
                    opacity: options.tokens.getNumber("badge.opacity", 0.85)
                }
            },
            {
                id: `${id}-text`,
                type: "text",
                properties: {
                    x: x,
                    y: y,
                    text: text,
                    fontSize: fontSize,
                    fontFamily: options.fontFamily,
                    fill: options.textColor,
                    stroke: "none",
                    textAnchor: "middle",
                    baseline: "central"
                }
            }
        ];
    }
};

(function registerBlockComponents(registry) {
    // Every cartesian component is placed and scaled the same way, so they are described the same
    // way: the box they draw in, and the range that box shows.
    const plotParameters = () => [
        BlockComponentHelpers.parameter("x", "Plot X", "number", 0),
        BlockComponentHelpers.parameter("y", "Plot Y", "number", 0),
        BlockComponentHelpers.parameter("width", "Plot width", "number", 100, { minimum: 1 }),
        BlockComponentHelpers.parameter("height", "Plot height", "number", 100, { minimum: 1 }),
        BlockComponentHelpers.parameter("minimumX", "Minimum X", "number", 0),
        BlockComponentHelpers.parameter("maximumX", "Maximum X", "number", 10),
        BlockComponentHelpers.parameter("minimumY", "Minimum Y", "number", 0),
        BlockComponentHelpers.parameter("maximumY", "Maximum Y", "number", 10)
    ];

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
            BlockComponentHelpers.parameter("fontFamily", "Font family", "string", "token:font.family"),
            BlockComponentHelpers.parameter("fontWeight", "Font weight", "number", 400, { minimum: 100, maximum: 900 }),
            BlockComponentHelpers.parameter("color", "Text colour", "colour", "token:text.primary")
        ],
        create: (parameters, context) => {
            const color = context.tokens.resolveValue(parameters.color);
            const fontFamily = context.tokens.resolveValue(parameters.fontFamily);
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
                        fontFamily: fontFamily,
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
            BlockComponentHelpers.parameter("dragProperty", "Drag property", "string", "", { description: "Component property written when the drag variable holds a plain number instead of naming a model term." }),
            BlockComponentHelpers.parameter("degreesPerUnit", "Degrees per unit", "number", 6),
            BlockComponentHelpers.parameter("offsetDegrees", "Zero offset", "number", 0, { unit: "deg", description: "Angle the hand shows when the variable is zero, so a tail can be dragged as well as a tip." }),
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
                    property: parameters.dragProperty,
                    centerX: centerX,
                    centerY: centerY,
                    degreesPerUnit: parameters.degreesPerUnit,
                    offsetDegrees: parameters.offsetDegrees,
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
        type: "plot-grid",
        category: "component",
        displayName: "Plot grid",
        description: "Grid inside a plot box: one line at every tick of both axes, drawn the way the chart draws its own.",
        tags: ["plot", "grid", "ticks", "chart"],
        capabilities: ["layout"],
        parameters: plotParameters().concat([
            BlockComponentHelpers.parameter("ticksX", "Horizontal ticks", "number", 5, { minimum: 2, maximum: 41 }),
            BlockComponentHelpers.parameter("ticksY", "Vertical ticks", "number", 5, { minimum: 2, maximum: 41 }),
            BlockComponentHelpers.parameter("color", "Grid colour", "colour", "token:grid.color", { category: "style" }),
            BlockComponentHelpers.parameter("lineWidth", "Line width", "number", "token:strokeWidth.default", { category: "style", minimum: 0 })
        ]),
        create: (parameters, context) => {
            const box = BlockComponentHelpers.plotBox(parameters);
            const color = context.tokens.resolveValue(parameters.color);
            const majorOpacity = context.tokens.getNumber("grid.majorOpacity", 0.75);
            const minorOpacity = context.tokens.getNumber("grid.minorOpacity", 0.4);
            const ticks = BlockComponentHelpers.plotTicks(parameters, box);
            const children = [];
            const addVertical = (values, opacity, prefix) => {
                for (let index = 0; index < values.length; index++)
                    children.push(BlockComponentHelpers.strokeLine(`${prefix}${index}`, box.toX(values[index]), box.top, box.toX(values[index]), box.bottom, color, parameters.lineWidth, opacity));
            };
            const addHorizontal = (values, opacity, prefix) => {
                for (let index = 0; index < values.length; index++)
                    children.push(BlockComponentHelpers.strokeLine(`${prefix}${index}`, box.left, box.toY(values[index]), box.right, box.toY(values[index]), color, parameters.lineWidth, opacity));
            };
            addVertical(ticks.x.minor, minorOpacity, "x-minor-");
            addHorizontal(ticks.y.minor, minorOpacity, "y-minor-");
            addVertical(ticks.x.major, majorOpacity, "x-");
            addHorizontal(ticks.y.major, majorOpacity, "y-");
            return { id: "plot-grid", type: "group", children: children };
        }
    });

    registry.register({
        type: "plot-axes",
        category: "component",
        displayName: "Plot axes",
        description: "Horizontal and vertical axis of a plot box, with tick marks and numbered labels. Any object that shows a value against a scale reads the same way a chart does.",
        tags: ["plot", "axis", "ticks", "labels", "chart"],
        capabilities: ["layout", "textual"],
        parameters: plotParameters().concat([
            BlockComponentHelpers.parameter("ticksX", "Horizontal ticks", "number", 5, { minimum: 2, maximum: 41 }),
            BlockComponentHelpers.parameter("ticksY", "Vertical ticks", "number", 5, { minimum: 2, maximum: 41 }),
            BlockComponentHelpers.parameter("showTicks", "Show ticks", "boolean", true, { description: "Draws the marks along both axes. Turned off the axis is a bare line, and it is still rescaled by pulling where its ticks stand." }),
            BlockComponentHelpers.parameter("showLabels", "Show labels", "boolean", true),
            BlockComponentHelpers.parameter("showBorder", "Close the box", "boolean", false, { description: "Draws the top and right sides as well, the way a chart frames its plot." }),
            BlockComponentHelpers.parameter("showZeroLines", "Show zero lines", "boolean", true, { description: "Marks where a value of zero falls when the range crosses it." }),
            BlockComponentHelpers.parameter("minimumXProperty", "Horizontal minimum property", "string", "", { description: "Component property holding the horizontal minimum. Naming both ends of an axis makes its ticks draggable, the way a chart's are." }),
            BlockComponentHelpers.parameter("maximumXProperty", "Horizontal maximum property", "string", ""),
            BlockComponentHelpers.parameter("minimumYProperty", "Vertical minimum property", "string", ""),
            BlockComponentHelpers.parameter("maximumYProperty", "Vertical maximum property", "string", ""),
            BlockComponentHelpers.parameter("color", "Axis colour", "colour", "token:axis.color", { category: "style" }),
            BlockComponentHelpers.parameter("labelColor", "Label colour", "colour", "token:axis.labelColor", { category: "style" }),
            BlockComponentHelpers.parameter("fontFamily", "Font family", "string", "token:font.family", { category: "style" }),
            BlockComponentHelpers.parameter("fontSize", "Label size", "number", "token:font.size.tick", { category: "style", minimum: 1 }),
            BlockComponentHelpers.parameter("lineWidth", "Axis width", "number", "token:axis.strokeWidth", { category: "style", minimum: 0 }),
            BlockComponentHelpers.parameter("tickLength", "Tick length", "number", "token:axis.tickLength", { category: "style", minimum: 0 })
        ]),
        create: (parameters, context) => {
            const box = BlockComponentHelpers.plotBox(parameters);
            const color = context.tokens.resolveValue(parameters.color);
            const labelColor = context.tokens.resolveValue(parameters.labelColor);
            const fontSize = Number(parameters.fontSize);
            const labelGapX = fontSize * context.tokens.getNumber("axis.labelGapX", 1.8);
            const labelGapY = fontSize * context.tokens.getNumber("axis.labelGapY", 0.7);
            const labelRise = fontSize * context.tokens.getNumber("axis.labelRise", 0.3);
            const children = [
                BlockComponentHelpers.strokeLine("axis-y", box.left, box.top, box.left, box.bottom, color, parameters.lineWidth),
                BlockComponentHelpers.strokeLine("axis-x", box.left, box.bottom, box.right, box.bottom, color, parameters.lineWidth)
            ];
            if (parameters.showBorder === true) {
                children.push(BlockComponentHelpers.strokeLine("border-top", box.left, box.top, box.right, box.top, color, parameters.lineWidth));
                children.push(BlockComponentHelpers.strokeLine("border-right", box.right, box.top, box.right, box.bottom, color, parameters.lineWidth));
            }
            if (parameters.showZeroLines === true && Number(parameters.minimumX) < 0 && Number(parameters.maximumX) > 0)
                children.push(BlockComponentHelpers.strokeLine("zero-y", box.toX(0), box.top, box.toX(0), box.bottom, color, parameters.lineWidth));
            if (parameters.showZeroLines === true && Number(parameters.minimumY) < 0 && Number(parameters.maximumY) > 0)
                children.push(BlockComponentHelpers.strokeLine("zero-x", box.left, box.toY(0), box.right, box.toY(0), color, parameters.lineWidth));
            const ticks = BlockComponentHelpers.plotTicks(parameters, box);
            // The ticks are worked out whether or not they are drawn: an axis whose marks are hidden is
            // still rescaled by pulling where they stand.
            const showTicks = parameters.showTicks !== false;
            const minorLength = context.tokens.getNumber("axis.minorTickLength", 2.5);
            const minorOpacity = context.tokens.getNumber("axis.minorOpacity", 0.45);
            for (let index = 0; showTicks && index < ticks.x.minor.length; index++)
                children.push(BlockComponentHelpers.strokeLine(`x-minor-tick-${index}`, box.toX(ticks.x.minor[index]), box.bottom, box.toX(ticks.x.minor[index]), box.bottom + minorLength, color, 1, minorOpacity));
            for (let index = 0; showTicks && index < ticks.y.minor.length; index++)
                children.push(BlockComponentHelpers.strokeLine(`y-minor-tick-${index}`, box.left - minorLength, box.toY(ticks.y.minor[index]), box.left, box.toY(ticks.y.minor[index]), color, 1, minorOpacity));
            for (let index = 0; index < ticks.x.major.length; index++) {
                const position = box.toX(ticks.x.major[index]);
                if (showTicks)
                    children.push(BlockComponentHelpers.strokeLine(`x-tick-${index}`, position, box.bottom, position, box.bottom + Number(parameters.tickLength), color, parameters.lineWidth));
                if (parameters.showLabels !== true)
                    continue;
                // The first and the last label lean inwards, so a scale reads to its own ends
                // instead of spilling past the plot — the rule the chart's axis follows.
                let anchor = "middle";
                let labelX = position;
                if (index === 0) {
                    anchor = "start";
                    labelX = position - fontSize * 0.2;
                }
                if (index === ticks.x.major.length - 1) {
                    anchor = "end";
                    labelX = position + fontSize * 0.2;
                }
                children.push({
                    id: `x-label-${index}`,
                    type: "text",
                    properties: {
                        x: labelX,
                        y: box.bottom + labelGapX,
                        text: formatAxisTickValue(ticks.x.major[index]),
                        fontSize: fontSize,
                        fontFamily: parameters.fontFamily,
                        fill: labelColor,
                        stroke: "none",
                        textAnchor: anchor,
                        baseline: "auto"
                    }
                });
            }
            for (let index = 0; index < ticks.y.major.length; index++) {
                const position = box.toY(ticks.y.major[index]);
                if (showTicks)
                    children.push(BlockComponentHelpers.strokeLine(`y-tick-${index}`, box.left - Number(parameters.tickLength), position, box.left, position, color, parameters.lineWidth));
                if (parameters.showLabels !== true)
                    continue;
                children.push({
                    id: `y-label-${index}`,
                    type: "text",
                    properties: {
                        x: box.left - labelGapY - Number(parameters.tickLength),
                        y: position + labelRise,
                        text: formatAxisTickValue(ticks.y.major[index]),
                        fontSize: fontSize,
                        fontFamily: parameters.fontFamily,
                        fill: labelColor,
                        stroke: "none",
                        textAnchor: "end",
                        baseline: "auto"
                    }
                });
            }
            children.push(...BlockComponentHelpers.tickHandleNodes(parameters, box, ticks, labelGapX));
            return { id: "plot-axes", type: "group", children: children };
        }
    });

    registry.register({
        type: "plot-crosshair",
        category: "component",
        displayName: "Plot crosshair",
        description: "Dashed lines from a point out to both axes, with the value it stands at read on a badge against each one — the way a chart answers where a point is.",
        tags: ["plot", "crosshair", "readout", "chart"],
        capabilities: ["layout", "textual"],
        parameters: plotParameters().concat([
            BlockComponentHelpers.parameter("valueX", "Value X", "number", 0),
            BlockComponentHelpers.parameter("valueY", "Value Y", "number", 0),
            BlockComponentHelpers.parameter("rows", "Points", "object", [], { description: "The points to answer the pointer with: the one nearest its horizontal value is marked and read off both axes." }),
            BlockComponentHelpers.parameter("digits", "Decimals", "number", 2, { minimum: 0, maximum: 6, description: "How the values are rounded. Bound to the model's own precision, a readout beside the drawing reads the way every other readout on the board does." }),
            BlockComponentHelpers.parameter("showBadges", "Show values", "boolean", true),
            BlockComponentHelpers.parameter("color", "Line colour", "colour", "token:stroke.default", { category: "style" }),
            BlockComponentHelpers.parameter("xColor", "Horizontal value colour", "colour", "", { category: "style", description: "Colour of the line standing at the horizontal value and of the badge reading it. Left unset both keep the crosshair's own colours." }),
            BlockComponentHelpers.parameter("yColor", "Vertical value colour", "colour", "", { category: "style", description: "Colour of the line standing at the vertical value and of the badge reading it." }),
            BlockComponentHelpers.parameter("pointColor", "Point colour", "colour", "token:stroke.accent", { category: "style" }),
            BlockComponentHelpers.parameter("axisBadgeColor", "Axis badge colour", "colour", "token:axis.labelColor", { category: "style" }),
            BlockComponentHelpers.parameter("badgeColor", "Badge colour", "colour", "token:text.secondary", { category: "style" }),
            BlockComponentHelpers.parameter("badgeTextColor", "Badge text colour", "colour", "token:text.inverse", { category: "style" }),
            BlockComponentHelpers.parameter("fontFamily", "Font family", "string", "token:font.family", { category: "style" }),
            BlockComponentHelpers.parameter("fontSize", "Value size", "number", "token:font.size.tick", { category: "style", minimum: 1 })
        ]),
        create: (parameters, context) => {
            const box = BlockComponentHelpers.plotBox(parameters);
            const pointX = box.toX(parameters.valueX);
            const pointY = box.toY(parameters.valueY);
            if (!Number.isFinite(pointX) || !Number.isFinite(pointY) || pointX < box.left || pointX > box.right || pointY < box.top || pointY > box.bottom)
                return { id: "plot-crosshair", type: "group", children: [] };
            const color = context.tokens.resolveValue(parameters.color);
            // Each value may be given a colour of its own — the one the term it stands for is drawn
            // in — and what is not given one keeps the colour the crosshair is drawn in.
            const xColor = context.tokens.resolveValue(parameters.xColor || parameters.color);
            const yColor = context.tokens.resolveValue(parameters.yColor || parameters.color);
            const opacity = context.tokens.getNumber("crosshair.opacity", 0.25);
            const lineWidth = context.tokens.getNumber("crosshair.strokeWidth", 1);
            const dash = context.tokens.get("crosshair.dash", "4 3");
            // Both lines cross the whole plot, so the pointer is placed against both scales at once.
            const vertical = BlockComponentHelpers.strokeLine("vertical", pointX, box.top, pointX, box.bottom, xColor, lineWidth, opacity);
            const horizontal = BlockComponentHelpers.strokeLine("horizontal", box.left, pointY, box.right, pointY, yColor, lineWidth, opacity);
            vertical.properties.strokeDash = dash;
            horizontal.properties.strokeDash = dash;
            const children = [vertical, horizontal];
            if (parameters.showBadges !== true)
                return { id: "plot-crosshair", type: "group", children: children };
            const fontSize = Number(parameters.fontSize);
            const badge = {
                tokens: context.tokens,
                fontSize: fontSize,
                fontFamily: parameters.fontFamily,
                backgroundColor: context.tokens.resolveValue(parameters.badgeColor),
                textColor: context.tokens.resolveValue(parameters.badgeTextColor)
            };
            // Where the pointer itself is, read under it as a pair.
            const digits = Math.max(0, Math.min(6, Math.floor(Number(parameters.digits))));
            const pointerText = `${Utils.formatNumber(Number(parameters.valueX), digits)}, ${Utils.formatNumber(Number(parameters.valueY), digits)}`;
            children.push(...BlockComponentHelpers.badgeNodes("pointer-values", pointerText, pointX, pointY + fontSize * 1.2, badge));
            children.push(...BlockComponentHelpers.pointAtPointerNodes(parameters, box, badge, context));
            return { id: "plot-crosshair", type: "group", children: children };
        }
    });

    // A part, not an object: it carries no interaction of its own and never appears in the picker.
    // Put it inside a group and give that group the behaviour the key performs, so the same cap
    // serves a keypad, a legend or a toolbar.
    registry.register({
        type: "key-cap",
        category: "component",
        displayName: "Key cap",
        description: "Rounded key with a centred label. It carries no interaction of its own: put it inside a group and give that group the behaviour the key performs, so the same cap serves a keypad, a legend or a toolbar.",
        icon: "fa-light fa-square",
        tags: ["key", "button", "label", "panel"],
        capabilities: ["sizable", "textual"],
        parameters: [
            BlockComponentHelpers.parameter("x", "X", "number", 0, { category: "layout" }),
            BlockComponentHelpers.parameter("y", "Y", "number", 0, { category: "layout" }),
            BlockComponentHelpers.parameter("width", "Width", "number", 44, { category: "layout", minimum: 0 }),
            BlockComponentHelpers.parameter("height", "Height", "number", 32, { category: "layout", minimum: 0 }),
            BlockComponentHelpers.parameter("label", "Label", "string", "", { category: "display" }),
            BlockComponentHelpers.parameter("fill", "Key colour", "colour", "token:surface.default", { category: "style" }),
            BlockComponentHelpers.parameter("borderColor", "Border colour", "colour", "token:stroke.subtle", { category: "style" }),
            BlockComponentHelpers.parameter("borderWidth", "Border width", "number", 1, { category: "style", minimum: 0 }),
            BlockComponentHelpers.parameter("cornerRadius", "Corner radius", "number", 6, { category: "style", minimum: 0 }),
            BlockComponentHelpers.parameter("labelColor", "Label colour", "colour", "token:text.primary", { category: "style" }),
            BlockComponentHelpers.parameter("fontSize", "Font size", "number", 14, { category: "style", minimum: 1 }),
            BlockComponentHelpers.parameter("fontWeight", "Font weight", "number", 500, { category: "style", minimum: 100, maximum: 900 })
        ],
        create: (parameters, context) => {
            const labelX = Number(parameters.x) + Number(parameters.width) / 2;
            const labelY = Number(parameters.y) + Number(parameters.height) / 2;
            return {
                id: "key-cap",
                type: "group",
                children: [
                    {
                        id: "cap",
                        type: "rect",
                        properties: {
                            x: parameters.x,
                            y: parameters.y,
                            width: parameters.width,
                            height: parameters.height,
                            cornerRadius: parameters.cornerRadius,
                            fill: context.tokens.resolveValue(parameters.fill),
                            stroke: context.tokens.resolveValue(parameters.borderColor),
                            strokeWidth: parameters.borderWidth
                        }
                    },
                    {
                        id: "label",
                        type: "text",
                        properties: {
                            x: labelX,
                            y: labelY,
                            text: parameters.label,
                            fontSize: parameters.fontSize,
                            fontWeight: parameters.fontWeight,
                            fill: context.tokens.resolveValue(parameters.labelColor),
                            stroke: "none",
                            textAnchor: "middle",
                            baseline: "central"
                        }
                    }
                ]
            };
        }
    });

})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockComponentHelpers;
