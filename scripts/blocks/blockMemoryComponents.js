// The two ways a memory is read back on screen: as a list of rows and as the path they trace.
// Both generate geometry per row rather than compose other blocks, which is why they are written
// here instead of as JSON definitions.
var BlockMemoryComponents = {
    maxDrawnPoints: 400,

    parameter(id, label, valueType, defaultValue, extra = {}) {
        return BlockComponentHelpers.parameter(id, label, valueType, defaultValue, Object.assign({ agentAccessible: false }, extra));
    },

    // A label longer than its column would run over the value beside it, and SVG text neither wraps
    // nor ellipsises on its own, so it is cut to what the column holds.
    fitText(text, width, fontSize) {
        const characters = Math.floor(width / Math.max(1, fontSize * 0.55));
        const label = String(text ?? "");
        if (characters < 1)
            return "";
        if (label.length <= characters)
            return label;
        return `${label.slice(0, Math.max(1, characters - 1))}…`;
    },

    orderRows(rows, order) {
        const list = Array.isArray(rows) ? rows.slice() : [];
        return order === "oldest" ? list : list.reverse();
    },

    // How much of a memory is read, counted from the oldest row. A memory is drawn whole unless it is
    // asked for a count, which is what a trace played back against the model asks for: the row the
    // model has reached, so the line arrives where it does rather than standing finished before it.
    takeRows(rows, count) {
        const list = Array.isArray(rows) ? rows : [];
        const wanted = Math.floor(Number(count));
        if (!Number.isFinite(wanted) || wanted <= 0)
            return list;
        return list.slice(0, wanted);
    },

    buildRowBehaviours(row, rowActions) {
        const behaviours = [];
        for (const action of Array.isArray(rowActions) ? rowActions : []) {
            const property = String(action?.property ?? "");
            if (property === "")
                continue;
            const value = action.field === undefined ? Number(action.value) : BlockMemory.readField(row, action.field);
            behaviours.push({ type: "clickable", property: property, value: Number.isFinite(Number(value)) ? Number(value) : 0 });
        }
        if (behaviours.length > 0)
            behaviours.push({ type: "hoverable", cursor: "pointer" });
        return behaviours;
    },

    // The box the drawing is cut to, in the pixels the trace is drawn in. Left without a width or a
    // height there is no box, and the whole path is drawn wherever it goes.
    clipBox(parameters) {
        const width = Number(parameters.clipWidth);
        const height = Number(parameters.clipHeight);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
            return null;
        const left = Number(parameters.clipX) || 0;
        const top = Number(parameters.clipY) || 0;
        return { left: left, top: top, right: left + width, bottom: top + height };
    },

    // A recording is not bound by the plot it is drawn on: an axis naming a term the model works out
    // for itself answers whatever the definitions say, and the answer may lie off the ends of the
    // scales. What was recorded is left as it stands — it is the model's, not the drawing's — and the
    // line is cut to the plot instead, the way the crosshair drops itself when the point it reads is
    // off the plot. A path that leaves the box and comes back is drawn as the pieces that are inside
    // it, so what is shown outside the plot is nothing rather than a line across the shape.
    clipPolyline(points, box) {
        const runs = [];
        let current = null;
        for (let index = 1; index < points.length; index++) {
            const piece = BlockMemoryComponents.clipLine(points[index - 1], points[index], box);
            if (piece === null) {
                current = null;
                continue;
            }
            if (current === null) {
                current = [piece.start];
                runs.push(current);
            }
            current.push(piece.end);
            if (piece.leaves)
                current = null;
        }
        return runs.filter(run => run.length > 1);
    },

    // One piece of the path against the box, cut where it crosses an edge. The ends are given back
    // as they came in where the piece is wholly inside, so a line that never leaves the plot is
    // drawn through exactly the points that were recorded rather than through arithmetic on them.
    clipLine(start, end, box) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        let entry = 0;
        let exit = 1;
        for (const [direction, distance] of [[-dx, start.x - box.left], [dx, box.right - start.x], [-dy, start.y - box.top], [dy, box.bottom - start.y]]) {
            if (direction === 0) {
                if (distance < 0)
                    return null;
                continue;
            }
            const crossing = distance / direction;
            if (direction < 0 && crossing > entry)
                entry = crossing;
            if (direction > 0 && crossing < exit)
                exit = crossing;
            if (entry > exit)
                return null;
        }
        return {
            start: entry === 0 ? start : { x: start.x + dx * entry, y: start.y + dy * entry },
            end: exit === 1 ? end : { x: start.x + dx * exit, y: start.y + dy * exit },
            leaves: exit < 1
        };
    },

    isInsideBox(point, box) {
        return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
    }
};

(function registerBlockMemoryComponents(registry) {
    registry.register({
        type: "memory-list",
        category: "component",
        displayName: "Memory list",
        description: "The rows of a memory drawn as a list, newest first, with the label on the left and the number on the right. Rows can carry actions, so choosing one puts what it holds back into the object.",
        icon: "fa-light fa-list",
        tags: ["memory", "history", "list", "readout"],
        capabilities: ["memory", "textual", "interaction"],
        parameters: [
            BlockMemoryComponents.parameter("rows", "Rows", "object", []),
            BlockMemoryComponents.parameter("x", "X", "number", 0, { category: "layout" }),
            BlockMemoryComponents.parameter("y", "Y", "number", 0, { category: "layout" }),
            BlockMemoryComponents.parameter("width", "Width", "number", 120, { category: "layout", minimum: 0 }),
            BlockMemoryComponents.parameter("height", "Height", "number", 160, { category: "layout", minimum: 0 }),
            BlockMemoryComponents.parameter("rowHeight", "Row height", "number", 20, { category: "layout", minimum: 6 }),
            BlockMemoryComponents.parameter("order", "Order", "string", "newest", { enumValues: ["newest", "oldest"] }),
            BlockMemoryComponents.parameter("layout", "Layout", "string", "row", { enumValues: ["row", "stacked"], description: "Whether the number sits beside the label or under it, which is what a narrow column needs." }),
            BlockMemoryComponents.parameter("digits", "Decimals", "number", 2, { minimum: 0, maximum: 6 }),
            BlockMemoryComponents.parameter("fontSize", "Font size", "number", "token:font.size.default", { category: "style", minimum: 1 }),
            BlockMemoryComponents.parameter("textColor", "Label colour", "colour", "token:text.secondary", { category: "style" }),
            BlockMemoryComponents.parameter("valueColor", "Number colour", "colour", "token:text.primary", { category: "style" }),
            BlockMemoryComponents.parameter("rowColor", "Row colour", "colour", "none", { category: "style" }),
            BlockMemoryComponents.parameter("cornerRadius", "Row corner radius", "number", 4, { category: "style", minimum: 0 }),
            BlockMemoryComponents.parameter("emptyText", "Empty text", "string", ""),
            BlockMemoryComponents.parameter("rowActions", "Row actions", "object", [], { structured: true, description: "What choosing a row writes: { property, value } for a fixed number, { property, field } for one of the row's own." })
        ],
        create: (parameters, context) => {
            const rowHeight = Math.max(6, Number(parameters.rowHeight));
            const capacity = Math.floor(Number(parameters.height) / rowHeight);
            const rows = BlockMemoryComponents.orderRows(parameters.rows, parameters.order).slice(0, Math.max(0, capacity));
            const textColor = context.tokens.resolveValue(parameters.textColor);
            const valueColor = context.tokens.resolveValue(parameters.valueColor);
            const rowColor = context.tokens.resolveValue(parameters.rowColor);
            const fontSize = Number(parameters.fontSize);
            const width = Number(parameters.width);
            const left = Number(parameters.x);
            const children = [];
            if (rows.length === 0 && String(parameters.emptyText) !== "") {
                children.push({
                    id: "empty",
                    type: "text",
                    properties: {
                        x: left + width / 2,
                        y: Number(parameters.y) + rowHeight / 2,
                        text: BlockMemoryComponents.fitText(parameters.emptyText, width, fontSize),
                        fontSize: fontSize,
                        fill: textColor,
                        stroke: "none",
                        textAnchor: "middle",
                        baseline: "central"
                    }
                });
                return { id: "memory-list", type: "group", children: children };
            }
            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                const top = Number(parameters.y) + index * rowHeight;
                const middle = top + rowHeight / 2;
                const valueText = BlockComponentHelpers.formatNumber(BlockMemory.readField(row, "x"), parameters.digits);
                const stacked = parameters.layout === "stacked";
                const valueWidth = stacked ? 0 : Math.min(width * 0.45, valueText.length * fontSize * 0.6 + 4);
                const labelWidth = stacked ? width - 8 : width - valueWidth - 10;
                const labelY = stacked ? top + rowHeight * 0.33 : middle;
                const valueY = stacked ? top + rowHeight * 0.72 : middle;
                const behaviours = BlockMemoryComponents.buildRowBehaviours(row, parameters.rowActions);
                // A row is two pieces of text with a gap between them, and a gap cannot be clicked.
                // A row that carries actions is backed by a transparent rectangle so the whole of it
                // answers the pointer, the way the host shape's own hit area does.
                const background = rowColor === "none" || rowColor === "" ? (behaviours.length > 0 ? "transparent" : "") : rowColor;
                const rowChildren = [];
                if (background !== "") {
                    rowChildren.push({
                        id: "background",
                        type: "rect",
                        properties: {
                            x: left,
                            y: top + 1,
                            width: width,
                            height: rowHeight - 2,
                            cornerRadius: Number(parameters.cornerRadius),
                            fill: background,
                            stroke: "none"
                        }
                    });
                }
                rowChildren.push({
                    id: "label",
                    type: "text",
                    properties: {
                        x: left + 4,
                        y: labelY,
                        text: BlockMemoryComponents.fitText(BlockMemory.readField(row, "text"), labelWidth, fontSize),
                        fontSize: fontSize,
                        fill: textColor,
                        stroke: "none",
                        textAnchor: "start",
                        baseline: "central"
                    }
                });
                rowChildren.push({
                    id: "value",
                    type: "text",
                    properties: {
                        x: left + width - 4,
                        y: valueY,
                        text: valueText,
                        fontSize: fontSize,
                        fill: valueColor,
                        stroke: "none",
                        textAnchor: "end",
                        baseline: "central"
                    }
                });
                children.push({
                    id: `row-${index}`,
                    type: "group",
                    children: rowChildren,
                    behaviours: behaviours
                });
            }
            return { id: "memory-list", type: "group", children: children };
        }
    });

    registry.register({
        type: "memory-trace",
        category: "component",
        displayName: "Memory trace",
        description: "The path the rows of a memory draw, mapped from the values they hold to the pixels of a plot with the same origin and scale the recording used.",
        icon: "fa-light fa-wave-square",
        tags: ["memory", "trace", "path", "recording"],
        capabilities: ["memory", "linear"],
        parameters: [
            BlockMemoryComponents.parameter("rows", "Rows", "object", []),
            BlockMemoryComponents.parameter("originX", "Origin X", "number", 0, { category: "layout" }),
            BlockMemoryComponents.parameter("originY", "Origin Y", "number", 0, { category: "layout" }),
            BlockMemoryComponents.parameter("scaleX", "Pixels per unit across", "number", 1, { category: "scale" }),
            BlockMemoryComponents.parameter("scaleY", "Pixels per unit up", "number", -1, { category: "scale" }),
            BlockMemoryComponents.parameter("color", "Colour", "colour", "token:stroke.accent", { category: "style" }),
            BlockMemoryComponents.parameter("lineWidth", "Line width", "number", 2, { category: "style", minimum: 0 }),
            BlockMemoryComponents.parameter("opacity", "Opacity", "number", 1, { category: "style", minimum: 0, maximum: 1 }),
            BlockMemoryComponents.parameter("shownRows", "Rows drawn", "number", 0, { minimum: 0, description: "How many rows are drawn, counted from the oldest. Zero — the default — draws the whole memory; a count draws it up to that row, which is what following the model's own iteration comes to." }),
            BlockMemoryComponents.parameter("showPoints", "Show samples", "boolean", false),
            BlockMemoryComponents.parameter("pointRadius", "Sample radius", "number", 1.5, { category: "style", minimum: 0 }),
            BlockMemoryComponents.parameter("clipX", "Drawing area X", "number", 0, { category: "layout", description: "The area the line is cut to, in the pixels the trace is drawn in. Left without a width or a height the line is drawn wherever the rows take it." }),
            BlockMemoryComponents.parameter("clipY", "Drawing area Y", "number", 0, { category: "layout" }),
            BlockMemoryComponents.parameter("clipWidth", "Drawing area width", "number", 0, { category: "layout", minimum: 0 }),
            BlockMemoryComponents.parameter("clipHeight", "Drawing area height", "number", 0, { category: "layout", minimum: 0 })
        ],
        create: (parameters, context) => {
            const originX = Number(parameters.originX);
            const originY = Number(parameters.originY);
            const scaleX = Number(parameters.scaleX);
            const scaleY = Number(parameters.scaleY);
            const toPixels = point => ({ x: originX + point.x * scaleX, y: originY + point.y * scaleY });
            // A break in the rows is a break in the line: each run of samples is drawn on its own, so
            // what was recorded in separate gestures is not joined across the gap between them.
            const segments = BlockMemory.toSegments(BlockMemoryComponents.takeRows(parameters.rows, parameters.shownRows)).map(segment => segment.map(toPixels));
            const points = segments.flat();
            const box = BlockMemoryComponents.clipBox(parameters);
            const color = context.tokens.resolveValue(parameters.color);
            const children = [];
            for (let index = 0; index < segments.length; index++) {
                if (segments[index].length < 2)
                    continue;
                const runs = box === null ? [segments[index]] : BlockMemoryComponents.clipPolyline(segments[index], box);
                for (let runIndex = 0; runIndex < runs.length; runIndex++) {
                    children.push({
                        id: runs.length > 1 ? `path-${index}-${runIndex}` : `path-${index}`,
                        type: "polyline",
                        properties: {
                            points: runs[runIndex],
                            fill: "none",
                            stroke: color,
                            strokeWidth: Number(parameters.lineWidth),
                            opacity: Number(parameters.opacity)
                        }
                    });
                }
            }
            // A sample off the plot is left undrawn for the same reason the line is cut to it.
            const drawnPoints = box === null ? points : points.filter(point => BlockMemoryComponents.isInsideBox(point, box));
            // One marker per sample would outgrow the node budget on a long recording, so the
            // samples are thinned to a fixed number of them and the path keeps the whole run.
            if (parameters.showPoints === true && drawnPoints.length > 0) {
                const step = Math.max(1, Math.ceil(drawnPoints.length / BlockMemoryComponents.maxDrawnPoints));
                for (let index = 0; index < drawnPoints.length; index += step) {
                    children.push({
                        id: `sample-${index}`,
                        type: "circle",
                        properties: {
                            centerX: drawnPoints[index].x,
                            centerY: drawnPoints[index].y,
                            radius: Number(parameters.pointRadius),
                            fill: color,
                            stroke: "none",
                            opacity: Number(parameters.opacity)
                        }
                    });
                }
            }
            return { id: "memory-trace", type: "group", children: children };
        }
    });
})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockMemoryComponents;
