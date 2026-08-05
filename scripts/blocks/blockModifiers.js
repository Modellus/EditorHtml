var BlockModifiers = {
    createAccumulator() {
        return { transforms: [], style: {}, visible: true, order: 0 };
    },
    buildTransform(accumulator) {
        return accumulator.transforms.filter(part => part !== "").join(" ");
    }
};

(function registerBlockModifiers(registry) {
    registry.register({
        type: "translate",
        category: "modifier",
        displayName: "Translate",
        description: "Moves a node or group by an offset.",
        tags: ["transform", "move", "position"],
        capabilities: ["transform"],
        inputSchema: {
            properties: {
                dx: { valueType: "number", defaultValue: 0, label: "Offset X" },
                dy: { valueType: "number", defaultValue: 0, label: "Offset Y" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.transforms.push(`translate(${input.dx} ${input.dy})`);
            return accumulator;
        }
    });

    registry.register({
        type: "rotate",
        category: "modifier",
        displayName: "Rotate",
        description: "Rotates a node clockwise around an anchor point, in degrees.",
        tags: ["transform", "angle", "anchor", "hand", "needle"],
        capabilities: ["transform", "angular"],
        inputSchema: {
            properties: {
                angle: { valueType: "number", defaultValue: 0, label: "Angle", unit: "deg" },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.transforms.push(`rotate(${input.angle} ${input.centerX} ${input.centerY})`);
            return accumulator;
        }
    });

    registry.register({
        type: "scale",
        category: "modifier",
        displayName: "Scale",
        description: "Scales a node around an anchor point.",
        tags: ["transform", "size", "zoom"],
        capabilities: ["transform"],
        inputSchema: {
            properties: {
                scaleX: { valueType: "number", defaultValue: 1, label: "Scale X" },
                scaleY: { valueType: "number", defaultValue: 1, label: "Scale Y" },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.transforms.push(`translate(${input.centerX} ${input.centerY}) scale(${input.scaleX} ${input.scaleY}) translate(${-input.centerX} ${-input.centerY})`);
            return accumulator;
        }
    });

    registry.register({
        type: "mirror",
        category: "modifier",
        displayName: "Mirror",
        description: "Mirrors a node about a horizontal or vertical axis through an anchor point.",
        tags: ["transform", "flip", "reflect"],
        capabilities: ["transform"],
        inputSchema: {
            properties: {
                axis: { valueType: "string", defaultValue: "horizontal", enumValues: ["horizontal", "vertical"], label: "Axis" },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" }
            }
        },
        apply: (input, accumulator) => {
            const scaleX = input.axis === "horizontal" ? -1 : 1;
            const scaleY = input.axis === "vertical" ? -1 : 1;
            accumulator.transforms.push(`translate(${input.centerX} ${input.centerY}) scale(${scaleX} ${scaleY}) translate(${-input.centerX} ${-input.centerY})`);
            return accumulator;
        }
    });

    registry.register({
        type: "opacity",
        category: "modifier",
        displayName: "Opacity",
        description: "Sets the opacity of a node or group.",
        tags: ["style", "fade", "ghost"],
        capabilities: ["style"],
        inputSchema: {
            properties: {
                value: { valueType: "number", defaultValue: 1, minimum: 0, maximum: 1, label: "Opacity" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.style.opacity = Math.max(0, Math.min(1, Number(input.value)));
            return accumulator;
        }
    });

    registry.register({
        type: "visibility",
        category: "modifier",
        displayName: "Visibility",
        description: "Shows or hides a node, typically bound to a model condition.",
        tags: ["style", "conditional", "toggle"],
        capabilities: ["style", "conditional"],
        inputSchema: {
            properties: {
                visible: { valueType: "boolean", defaultValue: true, label: "Visible" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.visible = accumulator.visible && input.visible !== false;
            return accumulator;
        }
    });

    registry.register({
        type: "stroke",
        category: "modifier",
        displayName: "Stroke",
        description: "Overrides the stroke colour, width and dash pattern of a node.",
        tags: ["style", "outline", "border"],
        capabilities: ["style"],
        inputSchema: {
            properties: {
                color: { valueType: "colour", defaultValue: null, label: "Colour" },
                width: { valueType: "number", defaultValue: null, minimum: 0, label: "Width" },
                dash: { valueType: "string", defaultValue: null, label: "Dash pattern" }
            }
        },
        apply: (input, accumulator) => {
            if (input.color !== null && input.color !== undefined)
                accumulator.style.stroke = input.color;
            if (input.width !== null && input.width !== undefined)
                accumulator.style["stroke-width"] = input.width;
            if (input.dash !== null && input.dash !== undefined && input.dash !== "")
                accumulator.style["stroke-dasharray"] = input.dash;
            return accumulator;
        }
    });

    registry.register({
        type: "fill",
        category: "modifier",
        displayName: "Fill",
        description: "Overrides the fill colour of a node.",
        tags: ["style", "colour"],
        capabilities: ["style"],
        inputSchema: {
            properties: {
                color: { valueType: "colour", defaultValue: null, label: "Colour" }
            }
        },
        apply: (input, accumulator) => {
            if (input.color !== null && input.color !== undefined)
                accumulator.style.fill = input.color;
            return accumulator;
        }
    });

    registry.register({
        type: "z-order",
        category: "modifier",
        displayName: "Z order",
        description: "Sorts siblings; higher values are drawn on top.",
        tags: ["layout", "layer", "order"],
        capabilities: ["layout"],
        inputSchema: {
            properties: {
                order: { valueType: "number", defaultValue: 0, label: "Order" }
            }
        },
        apply: (input, accumulator) => {
            accumulator.order = Number(input.order) || 0;
            return accumulator;
        }
    });

    // Clips a node to a clip path the host drawing already declares. The id is checked against
    // the shape of an id and nothing else: it can only ever point inside the document that holds
    // the drawing, which is why this stays out of the agent's reach.
    registry.register({
        type: "clip",
        category: "modifier",
        displayName: "Clip",
        description: "Clips a node to a clip path declared by the host drawing.",
        tags: ["layout", "mask", "window"],
        capabilities: ["layout"],
        agentAccessible: false,
        inputSchema: {
            properties: {
                clipId: { valueType: "string", defaultValue: "", label: "Clip path id" }
            }
        },
        apply: (input, accumulator) => {
            const clipId = String(input.clipId ?? "");
            if (/^[A-Za-z][A-Za-z0-9_:.-]*$/.test(clipId))
                accumulator.style["clip-path"] = `url(#${clipId})`;
            return accumulator;
        }
    });

    registry.register({
        type: "repeat",
        category: "modifier",
        displayName: "Repeat",
        description: "Repeats the node it is applied to, offsetting each copy by an angle step, a translation or a scale. The copy index is available to bindings as the parameter $index.",
        tags: ["layout", "array", "ticks", "markers"],
        capabilities: ["layout", "structural"],
        inputSchema: {
            properties: {
                count: { valueType: "number", defaultValue: 1, minimum: 0, label: "Count", bindable: false },
                angleStep: { valueType: "number", defaultValue: 0, label: "Angle step", unit: "deg" },
                angleStart: { valueType: "number", defaultValue: 0, label: "Start angle", unit: "deg" },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" },
                dx: { valueType: "number", defaultValue: 0, label: "Offset X per copy" },
                dy: { valueType: "number", defaultValue: 0, label: "Offset Y per copy" }
            }
        },
        apply: (input, accumulator) => accumulator
    });
})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockModifiers;
