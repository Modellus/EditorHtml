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
        type: "clickable",
        category: "behaviour",
        displayName: "Clickable",
        description: "Sets a model variable to a fixed value when the node is clicked.",
        tags: ["interaction", "click", "input"],
        capabilities: ["interaction", "writes-model"],
        inputSchema: {
            properties: {
                variable: { valueType: "variable", defaultValue: "", label: "Variable", bindable: false },
                value: { valueType: "number", defaultValue: 0, label: "Value" }
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
