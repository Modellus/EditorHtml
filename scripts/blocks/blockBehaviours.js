var BlockBehaviours = {
    getRuntime(behaviourType) {
        const registration = BlockRegistry.get(behaviourType);
        if (!registration || registration.category !== "behaviour")
            return null;
        return registration.attach;
    },
    hasRuntime(behaviourType) {
        return typeof BlockBehaviours.getRuntime(behaviourType) === "function";
    }
};

(function registerBlockBehaviours(registry) {
    registry.register({
        type: "selectable",
        category: "behaviour",
        displayName: "Selectable",
        description: "The object can be selected on the board. Provided by the host shape for every component.",
        tags: ["interaction", "selection"],
        capabilities: ["interaction"],
        inputSchema: { properties: {} }
    });

    registry.register({
        type: "draggable",
        category: "behaviour",
        displayName: "Draggable",
        description: "The object can be moved with the move handle. Provided by the host shape for every component.",
        tags: ["interaction", "move"],
        capabilities: ["interaction"],
        inputSchema: { properties: {} }
    });

    registry.register({
        type: "resizable",
        category: "behaviour",
        displayName: "Resizable",
        description: "The object can be resized with the corner handles. Provided by the host shape for every component.",
        tags: ["interaction", "size"],
        capabilities: ["interaction"],
        inputSchema: { properties: {} }
    });

    registry.register({
        type: "rotatable",
        category: "behaviour",
        displayName: "Rotatable",
        description: "The object can be rotated with the rotation handle. Provided by the host shape for every component.",
        tags: ["interaction", "angle"],
        capabilities: ["interaction"],
        inputSchema: { properties: {} }
    });

    registry.register({
        type: "hoverable",
        category: "behaviour",
        displayName: "Hoverable",
        description: "The node reacts to pointer hover with the standard highlight cursor.",
        tags: ["interaction", "hover"],
        capabilities: ["interaction"],
        inputSchema: {
            properties: {
                cursor: { valueType: "string", defaultValue: "pointer", label: "Cursor" }
            }
        },
        attach: (host, element, input) => {
            element.style.cursor = input.cursor ?? "pointer";
        }
    });

    registry.register({
        type: "tooltip",
        category: "behaviour",
        displayName: "Tooltip",
        description: "Shows a native tooltip with a fixed or bound text when the pointer rests on the node.",
        tags: ["interaction", "hint", "label"],
        capabilities: ["interaction", "textual"],
        inputSchema: {
            properties: {
                text: { valueType: "string", defaultValue: "", label: "Text" }
            }
        },
        attach: (host, element, input) => {
            element.innerHTML = `<title>${Utils.escapeXmlText(input.text)}</title>${element.innerHTML}`;
        }
    });

    registry.register({
        type: "drag-angle",
        category: "behaviour",
        displayName: "Drag angle",
        description: "Lets the user drag the node around an anchor point and writes the resulting angle back into a model variable, using the same angle-to-value mapping the node was bound with.",
        tags: ["interaction", "angle", "input", "hand", "needle"],
        capabilities: ["interaction", "angular", "writes-model"],
        inputSchema: {
            properties: {
                variable: { valueType: "variable", defaultValue: "", label: "Variable", bindable: false },
                property: { valueType: "string", defaultValue: "", label: "Component property", description: "Property written when the variable holds a plain number instead of naming a model term." },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" },
                degreesPerUnit: { valueType: "number", defaultValue: 6, label: "Degrees per unit" },
                offsetDegrees: { valueType: "number", defaultValue: 0, label: "Zero offset", unit: "deg" },
                minimum: { valueType: "number", defaultValue: null, label: "Minimum" },
                maximum: { valueType: "number", defaultValue: null, label: "Maximum" },
                wrapAt: { valueType: "number", defaultValue: null, label: "Wrap at" }
            }
        }
    });

    registry.register({
        type: "drag-rotate",
        category: "behaviour",
        displayName: "Drag rotate",
        description: "Lets the user turn the node around an anchor point by dragging it. The variable moves by the angle the pointer travels, so the grabbed point follows the pointer instead of jumping to it, which is what a rose, a bezel or a dial ring needs.",
        tags: ["interaction", "angle", "input", "rose", "bezel", "ring"],
        capabilities: ["interaction", "angular", "writes-model"],
        inputSchema: {
            properties: {
                variable: { valueType: "variable", defaultValue: "", label: "Variable", bindable: false },
                property: { valueType: "string", defaultValue: "", label: "Component property", description: "Property written when the variable holds a plain number instead of naming a model term." },
                centerX: { valueType: "number", defaultValue: 0, label: "Anchor X" },
                centerY: { valueType: "number", defaultValue: 0, label: "Anchor Y" },
                degreesPerUnit: { valueType: "number", defaultValue: 1, label: "Degrees per unit" },
                minimum: { valueType: "number", defaultValue: null, label: "Minimum" },
                maximum: { valueType: "number", defaultValue: null, label: "Maximum" },
                wrapAt: { valueType: "number", defaultValue: null, label: "Wrap at" },
                hoverFill: { valueType: "colour", defaultValue: "none", label: "Hover fill", description: "Colour the node takes while the pointer rests on it, so an otherwise invisible grab area shows itself." },
                hoverOpacity: { valueType: "number", defaultValue: 0.15, minimum: 0, maximum: 1, label: "Hover opacity" }
            }
        }
    });

    registry.register({
        type: "clickable",
        category: "behaviour",
        displayName: "Clickable",
        description: "Writes a value into a model variable or into a component parameter when the node is clicked. The value is a binding like any other, so a key can write what the model or the object itself currently holds rather than only a constant.",
        tags: ["interaction", "click", "input", "key", "button"],
        capabilities: ["interaction", "writes-model"],
        inputSchema: {
            properties: {
                variable: { valueType: "variable", defaultValue: "", label: "Variable" },
                property: { valueType: "string", defaultValue: "", label: "Component property", description: "Property written when the variable does not name a model term." },
                value: { valueType: "number", defaultValue: 0, label: "Value" }
            }
        }
    });

    registry.register({
        type: "remember",
        category: "behaviour",
        displayName: "Remember",
        description: "Appends a row to one of the object's memories when the node is clicked. A row carries a label and two numbers, all of them bindings, so a key records what the object held at the moment it was pressed.",
        tags: ["interaction", "click", "memory", "history", "record"],
        capabilities: ["interaction", "memory"],
        inputSchema: {
            properties: {
                memory: { valueType: "string", defaultValue: "", label: "Memory", bindable: false, description: "Parameter the rows are kept in." },
                text: { valueType: "string", defaultValue: "", label: "Label" },
                x: { valueType: "number", defaultValue: 0, label: "First number" },
                y: { valueType: "number", defaultValue: 0, label: "Second number" },
                limit: { valueType: "number", defaultValue: 50, minimum: 1, maximum: 2000, label: "Rows kept", description: "Oldest rows are dropped once the memory is this long." }
            }
        }
    });

    registry.register({
        type: "forget",
        category: "behaviour",
        displayName: "Forget",
        description: "Empties one of the object's memories when the node is clicked.",
        tags: ["interaction", "click", "memory", "clear"],
        capabilities: ["interaction", "memory"],
        inputSchema: {
            properties: {
                memory: { valueType: "string", defaultValue: "", label: "Memory", bindable: false }
            }
        }
    });

    registry.register({
        type: "track-pointer",
        category: "behaviour",
        displayName: "Track pointer",
        description: "Records where the pointer is while it is dragged over the node, one sample every sampling interval, into one of the object's memories. The sample is written in the units the node is scaled in, so what is recorded is a pair of values rather than a pair of pixels — and when the memory names model terms, the run becomes the values those terms take, iteration by iteration.",
        tags: ["interaction", "pointer", "memory", "record", "track", "writes-model"],
        capabilities: ["interaction", "memory", "writes-model"],
        inputSchema: {
            properties: {
                memory: { valueType: "string", defaultValue: "", label: "Memory", bindable: false },
                mode: { valueType: "string", defaultValue: "replace", enumValues: ["replace", "append"], label: "Mode", bindable: false, description: "Whether a new drag starts a fresh recording or carries on from the last one." },
                limit: { valueType: "number", defaultValue: 600, minimum: 1, maximum: 2000, label: "Samples kept" },
                sampleMs: { valueType: "number", defaultValue: 33, minimum: 10, maximum: 1000, label: "Sampling interval", unit: "ms" },
                originX: { valueType: "number", defaultValue: 0, label: "Origin X", description: "Pixel the horizontal value zero sits at." },
                originY: { valueType: "number", defaultValue: 0, label: "Origin Y" },
                scaleX: { valueType: "number", defaultValue: 1, label: "Pixels per unit across" },
                scaleY: { valueType: "number", defaultValue: -1, label: "Pixels per unit up" },
                minimumX: { valueType: "number", defaultValue: null, label: "Minimum X" },
                maximumX: { valueType: "number", defaultValue: null, label: "Maximum X" },
                minimumY: { valueType: "number", defaultValue: null, label: "Minimum Y" },
                maximumY: { valueType: "number", defaultValue: null, label: "Maximum Y" }
            }
        }
    });

    registry.register({
        type: "follow-pointer",
        category: "behaviour",
        displayName: "Follow pointer",
        description: "Reports where the pointer is over the node, in the units the node is scaled in, so a drawing can show the value under the cursor. What is reported is not kept: it lasts as long as the pointer is over the node, and the model is not touched.",
        tags: ["interaction", "pointer", "hover", "readout"],
        capabilities: ["interaction"],
        inputSchema: {
            properties: {
                xParameter: { valueType: "string", defaultValue: "", label: "Horizontal parameter", bindable: false, description: "Parameter the horizontal value is reported in." },
                yParameter: { valueType: "string", defaultValue: "", label: "Vertical parameter", bindable: false },
                activeParameter: { valueType: "string", defaultValue: "", label: "Pointer-over parameter", bindable: false, description: "Parameter that reads 1 while the pointer is over the node." },
                originX: { valueType: "number", defaultValue: 0, label: "Origin X" },
                originY: { valueType: "number", defaultValue: 0, label: "Origin Y" },
                scaleX: { valueType: "number", defaultValue: 1, label: "Pixels per unit across" },
                scaleY: { valueType: "number", defaultValue: -1, label: "Pixels per unit up" },
                minimumX: { valueType: "number", defaultValue: null, label: "Minimum X" },
                maximumX: { valueType: "number", defaultValue: null, label: "Maximum X" },
                minimumY: { valueType: "number", defaultValue: null, label: "Minimum Y" },
                maximumY: { valueType: "number", defaultValue: null, label: "Maximum Y" }
            }
        }
    });

    registry.register({
        type: "drag-axis-tick",
        category: "behaviour",
        displayName: "Drag axis tick",
        description: "Rescales an axis by dragging one of its ticks: the tick follows the pointer and the far end of the axis moves with it, writing the object's own maximum. The same interaction, and the same arithmetic, the chart's axes have.",
        tags: ["interaction", "drag", "axis", "scale", "ticks"],
        capabilities: ["interaction"],
        inputSchema: {
            properties: {
                axis: { valueType: "string", defaultValue: "x", enumValues: ["x", "y"], label: "Axis", bindable: false },
                value: { valueType: "number", defaultValue: 0, label: "Tick value" },
                minimumProperty: { valueType: "string", defaultValue: "", label: "Minimum property", bindable: false, description: "Component property the axis starts at; it is held still while the tick is dragged." },
                maximumProperty: { valueType: "string", defaultValue: "", label: "Maximum property", bindable: false },
                originPixel: { valueType: "number", defaultValue: 0, label: "Axis origin", description: "Pixel the axis minimum sits at." },
                lengthPixels: { valueType: "number", defaultValue: 0, label: "Axis length", minimum: 0 }
            }
        }
    });

    registry.register({
        type: "respond-to-simulation",
        category: "behaviour",
        displayName: "Respond to simulation updates",
        description: "Marks the object as redrawing on every simulation tick. Components with model bindings get this automatically.",
        tags: ["simulation", "animation"],
        capabilities: ["simulation"],
        inputSchema: { properties: {} }
    });
})(BlockRegistry);

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockBehaviours;
