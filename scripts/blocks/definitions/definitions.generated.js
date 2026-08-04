// Generated from scripts/blocks/definitions/*.json by tests/component-definitions.spec.js.
// Do not edit by hand: change the JSON and run `UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js`.
BlockDefinitionLoader.registerAll([
    {
        "schemaVersion": "1.0.0",
        "type": "analogue-clock",
        "category": "component",
        "displayName": "Analogue clock",
        "description": "Clock face with hour, minute and optional second hands whose angles come from model variables or expressions.",
        "icon": "fa-light fa-clock",
        "tags": [
            "object",
            "clock",
            "time",
            "dial",
            "hands"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model",
            "interaction"
        ],
        "parameters": [
            {
                "id": "hourVariable",
                "label": "Hour variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "description": "Model variable or number giving the hour."
            },
            {
                "id": "minuteVariable",
                "label": "Minute variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "description": "Model variable or number giving the minute."
            },
            {
                "id": "secondVariable",
                "label": "Second variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "description": "Model variable or number giving the second."
            },
            {
                "id": "showSecondHand",
                "label": "Show second hand",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "showNumbers",
                "label": "Show numbers",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "showMinuteTicks",
                "label": "Show minute ticks",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "faceColor",
                "label": "Face colour",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "borderColor",
                "label": "Border colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style"
            },
            {
                "id": "handColor",
                "label": "Hand colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.strong",
                "category": "style"
            },
            {
                "id": "secondHandColor",
                "label": "Second hand colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style"
            },
            {
                "id": "numberColor",
                "label": "Number colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            },
            {
                "id": "interactive",
                "label": "Hands can be dragged",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "interaction"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "r",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-6\\right)"
            },
            {
                "id": "hours",
                "value": {
                    "parameter": "hourVariable",
                    "as": "number"
                }
            },
            {
                "id": "minutes",
                "value": {
                    "parameter": "minuteVariable",
                    "as": "number"
                }
            },
            {
                "id": "seconds",
                "value": {
                    "parameter": "secondVariable",
                    "as": "number"
                }
            },
            {
                "id": "hourAngle",
                "formula": "\\left(\\mod\\left(hours,12\\right)+\\frac{minutes}{60}\\right)\\cdot30"
            },
            {
                "id": "minuteAngle",
                "formula": "\\mod\\left(minutes,60\\right)\\cdot6"
            },
            {
                "id": "secondAngle",
                "formula": "\\mod\\left(seconds,60\\right)\\cdot6"
            },
            {
                "id": "markerRadius",
                "formula": "r\\cdot0.95"
            },
            {
                "id": "hourTickLength",
                "formula": "r\\cdot0.1"
            },
            {
                "id": "minuteTickLength",
                "formula": "r\\cdot0.05"
            },
            {
                "id": "numberRadius",
                "formula": "r\\cdot0.74"
            },
            {
                "id": "numberFontSize",
                "formula": "\\max\\left(7,r\\cdot0.16\\right)"
            },
            {
                "id": "hourHandLength",
                "formula": "r\\cdot0.5"
            },
            {
                "id": "hourHandTail",
                "formula": "r\\cdot0.12"
            },
            {
                "id": "hourHandWidth",
                "formula": "\\max\\left(3,r\\cdot0.07\\right)"
            },
            {
                "id": "minuteHandLength",
                "formula": "r\\cdot0.75"
            },
            {
                "id": "minuteHandTail",
                "formula": "r\\cdot0.14"
            },
            {
                "id": "minuteHandWidth",
                "formula": "\\max\\left(2,r\\cdot0.05\\right)"
            },
            {
                "id": "secondHandLength",
                "formula": "r\\cdot0.82"
            },
            {
                "id": "secondHandTail",
                "formula": "r\\cdot0.2"
            },
            {
                "id": "secondHandWidth",
                "formula": "\\max\\left(1,r\\cdot0.02\\right)"
            },
            {
                "id": "capRadius",
                "formula": "\\max\\left(2,r\\cdot0.045\\right)"
            },
            {
                "id": "strokeStrong",
                "value": {
                    "token": "strokeWidth.strong"
                }
            },
            {
                "id": "strokeHairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "numberWeight",
                "value": {
                    "token": "font.weight.default"
                }
            },
            {
                "id": "hourDrag",
                "value": {
                    "choose": {
                        "parameter": "interactive"
                    },
                    "then": {
                        "parameter": "hourVariable"
                    },
                    "otherwise": ""
                }
            },
            {
                "id": "minuteDrag",
                "value": {
                    "choose": {
                        "parameter": "interactive"
                    },
                    "then": {
                        "parameter": "minuteVariable"
                    },
                    "otherwise": ""
                }
            },
            {
                "id": "secondDrag",
                "value": {
                    "choose": {
                        "parameter": "interactive"
                    },
                    "then": {
                        "parameter": "secondVariable"
                    },
                    "otherwise": ""
                }
            }
        ],
        "root": {
            "id": "analogue-clock",
            "type": "group",
            "children": [
                {
                    "id": "face",
                    "type": "dial-face",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "r"
                        },
                        "faceColor": {
                            "parameter": "faceColor"
                        },
                        "borderColor": {
                            "parameter": "borderColor"
                        },
                        "borderWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "hour-markers",
                    "type": "tick-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "markerRadius"
                        },
                        "count": 12,
                        "startAngle": 90,
                        "spanAngle": 360,
                        "length": {
                            "parameter": "hourTickLength"
                        },
                        "width": {
                            "parameter": "strokeStrong"
                        },
                        "color": {
                            "parameter": "borderColor"
                        }
                    }
                },
                {
                    "id": "minute-markers",
                    "type": "tick-ring",
                    "when": {
                        "parameter": "showMinuteTicks"
                    },
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "markerRadius"
                        },
                        "count": 60,
                        "startAngle": 90,
                        "spanAngle": 360,
                        "length": {
                            "parameter": "minuteTickLength"
                        },
                        "width": {
                            "parameter": "strokeHairline"
                        },
                        "color": {
                            "parameter": "borderColor"
                        }
                    }
                },
                {
                    "id": "numbers",
                    "type": "label-ring",
                    "when": {
                        "parameter": "showNumbers"
                    },
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "numberRadius"
                        },
                        "count": 12,
                        "startAngle": 90,
                        "spanAngle": 360,
                        "startValue": 12,
                        "valueStep": 1,
                        "wrapAt": 12,
                        "fontSize": {
                            "parameter": "numberFontSize"
                        },
                        "fontWeight": {
                            "parameter": "numberWeight"
                        },
                        "color": {
                            "parameter": "numberColor"
                        }
                    }
                },
                {
                    "id": "hour-hand",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "hourAngle"
                        },
                        "length": {
                            "parameter": "hourHandLength"
                        },
                        "tailLength": {
                            "parameter": "hourHandTail"
                        },
                        "width": {
                            "parameter": "hourHandWidth"
                        },
                        "color": {
                            "parameter": "handColor"
                        },
                        "style": "needle",
                        "dragVariable": {
                            "parameter": "hourDrag"
                        },
                        "dragProperty": "hourVariable",
                        "degreesPerUnit": 30,
                        "wrapAt": 12
                    }
                },
                {
                    "id": "minute-hand",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "minuteAngle"
                        },
                        "length": {
                            "parameter": "minuteHandLength"
                        },
                        "tailLength": {
                            "parameter": "minuteHandTail"
                        },
                        "width": {
                            "parameter": "minuteHandWidth"
                        },
                        "color": {
                            "parameter": "handColor"
                        },
                        "style": "needle",
                        "dragVariable": {
                            "parameter": "minuteDrag"
                        },
                        "dragProperty": "minuteVariable",
                        "degreesPerUnit": 6,
                        "wrapAt": 60
                    }
                },
                {
                    "id": "second-hand",
                    "type": "pointer-hand",
                    "when": {
                        "parameter": "showSecondHand"
                    },
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "secondAngle"
                        },
                        "length": {
                            "parameter": "secondHandLength"
                        },
                        "tailLength": {
                            "parameter": "secondHandTail"
                        },
                        "width": {
                            "parameter": "secondHandWidth"
                        },
                        "color": {
                            "parameter": "secondHandColor"
                        },
                        "style": "line",
                        "dragVariable": {
                            "parameter": "secondDrag"
                        },
                        "dragProperty": "secondVariable",
                        "degreesPerUnit": 6,
                        "wrapAt": 60
                    }
                },
                {
                    "id": "centre-cap",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "capRadius"
                        },
                        "fill": {
                            "parameter": "handColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "circular-gauge",
        "category": "component",
        "displayName": "Circular gauge",
        "description": "Ring gauge that fills clockwise in proportion to a model variable.",
        "icon": "fa-light fa-circle-notch",
        "tags": [
            "object",
            "gauge",
            "progress",
            "ring",
            "meter"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model"
        ],
        "parameters": [
            {
                "id": "valueVariable",
                "label": "Value variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model"
            },
            {
                "id": "minimum",
                "label": "Minimum",
                "valueType": "number",
                "defaultValue": 0,
                "category": "scale"
            },
            {
                "id": "maximum",
                "label": "Maximum",
                "valueType": "number",
                "defaultValue": 100,
                "category": "scale"
            },
            {
                "id": "startAngle",
                "label": "Start angle",
                "valueType": "number",
                "defaultValue": 90,
                "category": "scale",
                "unit": "deg"
            },
            {
                "id": "spanAngle",
                "label": "Span",
                "valueType": "number",
                "defaultValue": 360,
                "category": "scale",
                "unit": "deg",
                "minimum": 1,
                "maximum": 360
            },
            {
                "id": "thickness",
                "label": "Ring thickness",
                "valueType": "number",
                "defaultValue": 0.22,
                "category": "style",
                "minimum": 0.02,
                "maximum": 1
            },
            {
                "id": "trackColor",
                "label": "Track colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "style"
            },
            {
                "id": "fillColor",
                "label": "Fill colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "labelColor",
                "label": "Label colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            },
            {
                "id": "digits",
                "label": "Decimals",
                "valueType": "number",
                "defaultValue": 0,
                "category": "display",
                "minimum": 0,
                "maximum": 6
            },
            {
                "id": "unit",
                "label": "Unit",
                "valueType": "string",
                "defaultValue": "",
                "category": "display"
            },
            {
                "id": "showReadout",
                "label": "Show readout",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "r",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-4\\right)"
            },
            {
                "id": "innerRadius",
                "formula": "r\\cdot\\left(1-\\max\\left(0.02,\\min\\left(1,thickness\\right)\\right)\\right)"
            },
            {
                "id": "value",
                "value": {
                    "parameter": "valueVariable",
                    "as": "number"
                }
            },
            {
                "id": "ratio",
                "value": {
                    "choose": {
                        "formula": "maximum-minimum"
                    },
                    "then": {
                        "formula": "\\max\\left(0,\\min\\left(1,\\frac{value-minimum}{maximum-minimum}\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "sweep",
                "formula": "\\max\\left(0.001,\\min\\left(360,spanAngle\\right)\\right)"
            },
            {
                "id": "filledSweep",
                "formula": "\\max\\left(0.001,sweep\\cdot ratio\\right)"
            },
            {
                "id": "trackEnd",
                "value": {
                    "choose": {
                        "formula": "360-sweep"
                    },
                    "then": {
                        "formula": "startAngle-sweep"
                    },
                    "otherwise": {
                        "formula": "startAngle-sweep+0.001"
                    }
                }
            },
            {
                "id": "fillEnd",
                "formula": "startAngle-filledSweep"
            },
            {
                "id": "readoutFontSize",
                "formula": "\\max\\left(10,r\\cdot0.34\\right)"
            },
            {
                "id": "readoutWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "concat": [
                        {
                            "format": {
                                "parameter": "value"
                            },
                            "digits": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "choose": {
                                "parameter": "unit"
                            },
                            "then": {
                                "concat": [
                                    " ",
                                    {
                                        "parameter": "unit"
                                    }
                                ]
                            },
                            "otherwise": ""
                        }
                    ]
                }
            }
        ],
        "root": {
            "id": "circular-gauge",
            "type": "group",
            "children": [
                {
                    "id": "track",
                    "type": "arc",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "r"
                        },
                        "innerRadius": {
                            "parameter": "innerRadius"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "endAngle": {
                            "parameter": "trackEnd"
                        },
                        "fill": {
                            "parameter": "trackColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "fill",
                    "type": "arc",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "r"
                        },
                        "innerRadius": {
                            "parameter": "innerRadius"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "endAngle": {
                            "parameter": "fillEnd"
                        },
                        "fill": {
                            "parameter": "fillColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "readout",
                    "type": "text",
                    "when": {
                        "parameter": "showReadout"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "cx"
                        },
                        "y": {
                            "parameter": "cy"
                        },
                        "text": {
                            "parameter": "readoutText"
                        },
                        "fontSize": {
                            "parameter": "readoutFontSize"
                        },
                        "fontWeight": {
                            "parameter": "readoutWeight"
                        },
                        "fill": {
                            "parameter": "labelColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "compass",
        "category": "component",
        "displayName": "Compass",
        "description": "Compass rose with cardinal labels, a needle whose heading comes from a model variable and a rose that a second variable can turn. The needle and the rim of the rose can be dragged to write those variables back.",
        "icon": "fa-light fa-compass",
        "tags": [
            "object",
            "compass",
            "heading",
            "navigation",
            "dial"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model",
            "interaction",
            "writes-model"
        ],
        "parameters": [
            {
                "id": "headingVariable",
                "label": "Heading variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model"
            },
            {
                "id": "rotationVariable",
                "label": "Rose rotation variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unit": "deg",
                "description": "Turns the rose, its ticks and its labels clockwise. The needle keeps its own heading."
            },
            {
                "id": "showDegrees",
                "label": "Show degree labels",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display"
            },
            {
                "id": "faceColor",
                "label": "Face colour",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "borderColor",
                "label": "Border colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style"
            },
            {
                "id": "needleColor",
                "label": "North needle colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style"
            },
            {
                "id": "tailColor",
                "label": "South needle colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style"
            },
            {
                "id": "labelColor",
                "label": "Label colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "r",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-6\\right)"
            },
            {
                "id": "rotation",
                "value": {
                    "parameter": "rotationVariable",
                    "as": "number"
                }
            },
            {
                "id": "roseStart",
                "formula": "90-rotation"
            },
            {
                "id": "heading",
                "value": {
                    "parameter": "headingVariable",
                    "as": "number"
                }
            },
            {
                "id": "tailHeading",
                "formula": "heading+180"
            },
            {
                "id": "tickRadius",
                "formula": "r\\cdot0.96"
            },
            {
                "id": "tickLength",
                "formula": "r\\cdot0.05"
            },
            {
                "id": "tickMajorLength",
                "formula": "r\\cdot0.12"
            },
            {
                "id": "cardinalRadius",
                "value": {
                    "choose": {
                        "parameter": "showDegrees"
                    },
                    "then": {
                        "formula": "r\\cdot0.52"
                    },
                    "otherwise": {
                        "formula": "r\\cdot0.74"
                    }
                }
            },
            {
                "id": "cardinalFontSize",
                "formula": "\\max\\left(8,r\\cdot0.2\\right)"
            },
            {
                "id": "degreeRadius",
                "formula": "r\\cdot0.86"
            },
            {
                "id": "degreeFontSize",
                "formula": "\\max\\left(6,r\\cdot0.11\\right)"
            },
            {
                "id": "needleLength",
                "formula": "r\\cdot0.66"
            },
            {
                "id": "needleWidth",
                "formula": "\\max\\left(4,r\\cdot0.14\\right)"
            },
            {
                "id": "capRadius",
                "formula": "\\max\\left(2,r\\cdot0.06\\right)"
            },
            {
                "id": "strokeStrong",
                "value": {
                    "token": "strokeWidth.strong"
                }
            },
            {
                "id": "strokeHairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "cardinalWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "roseGrabRadius",
                "formula": "r\\cdot0.7"
            },
            {
                "id": "grabColor",
                "value": {
                    "token": "handle.stroke"
                }
            }
        ],
        "root": {
            "id": "compass",
            "type": "group",
            "children": [
                {
                    "id": "face",
                    "type": "dial-face",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "r"
                        },
                        "faceColor": {
                            "parameter": "faceColor"
                        },
                        "borderColor": {
                            "parameter": "borderColor"
                        },
                        "borderWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "rose-ticks",
                    "type": "tick-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "tickRadius"
                        },
                        "count": 72,
                        "startAngle": {
                            "parameter": "roseStart"
                        },
                        "spanAngle": 360,
                        "length": {
                            "parameter": "tickLength"
                        },
                        "width": {
                            "parameter": "strokeHairline"
                        },
                        "color": {
                            "parameter": "borderColor"
                        },
                        "majorEvery": 9,
                        "majorLength": {
                            "parameter": "tickMajorLength"
                        },
                        "majorWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "cardinals",
                    "type": "label-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "cardinalRadius"
                        },
                        "count": 4,
                        "startAngle": {
                            "parameter": "roseStart"
                        },
                        "spanAngle": 360,
                        "texts": "N,E,S,W",
                        "fontSize": {
                            "parameter": "cardinalFontSize"
                        },
                        "fontWeight": {
                            "parameter": "cardinalWeight"
                        },
                        "color": {
                            "parameter": "labelColor"
                        }
                    }
                },
                {
                    "id": "degrees",
                    "type": "label-ring",
                    "when": {
                        "parameter": "showDegrees"
                    },
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "degreeRadius"
                        },
                        "count": 12,
                        "startAngle": {
                            "parameter": "roseStart"
                        },
                        "spanAngle": 360,
                        "startValue": 0,
                        "valueStep": 30,
                        "wrapAt": 0,
                        "fontSize": {
                            "parameter": "degreeFontSize"
                        },
                        "color": {
                            "parameter": "labelColor"
                        }
                    }
                },
                {
                    "id": "rose-grab",
                    "type": "ring",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "innerRadius": {
                            "parameter": "roseGrabRadius"
                        },
                        "outerRadius": {
                            "parameter": "r"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "behaviours": [
                        {
                            "type": "drag-rotate",
                            "variable": {
                                "parameter": "rotationVariable"
                            },
                            "property": "rotationVariable",
                            "centerX": {
                                "parameter": "cx"
                            },
                            "centerY": {
                                "parameter": "cy"
                            },
                            "degreesPerUnit": 1,
                            "wrapAt": 360,
                            "hoverFill": {
                                "parameter": "grabColor"
                            },
                            "hoverOpacity": 0.18
                        }
                    ]
                },
                {
                    "id": "needle-north",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "heading"
                        },
                        "length": {
                            "parameter": "needleLength"
                        },
                        "tailLength": 0,
                        "width": {
                            "parameter": "needleWidth"
                        },
                        "color": {
                            "parameter": "needleColor"
                        },
                        "style": "needle",
                        "dragVariable": {
                            "parameter": "headingVariable"
                        },
                        "dragProperty": "headingVariable",
                        "degreesPerUnit": 1,
                        "wrapAt": 360
                    }
                },
                {
                    "id": "needle-south",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "tailHeading"
                        },
                        "length": {
                            "parameter": "needleLength"
                        },
                        "tailLength": 0,
                        "width": {
                            "parameter": "needleWidth"
                        },
                        "color": {
                            "parameter": "tailColor"
                        },
                        "style": "needle",
                        "dragVariable": {
                            "parameter": "headingVariable"
                        },
                        "dragProperty": "headingVariable",
                        "degreesPerUnit": 1,
                        "offsetDegrees": 180,
                        "wrapAt": 360
                    }
                },
                {
                    "id": "centre-cap",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "capRadius"
                        },
                        "fill": {
                            "parameter": "borderColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "orbit-system",
        "category": "component",
        "displayName": "Orbit system",
        "description": "Central body with up to four orbiting bodies whose angular positions come from model variables or from simulation time and an orbital period.",
        "icon": "fa-light fa-sun",
        "tags": [
            "object",
            "orbit",
            "solar",
            "planets",
            "astronomy",
            "rotation"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model"
        ],
        "parameters": [
            {
                "id": "timeVariable",
                "label": "Time variable",
                "valueType": "variable",
                "defaultValue": "t",
                "category": "model"
            },
            {
                "id": "bodyCount",
                "label": "Orbiting bodies",
                "valueType": "number",
                "defaultValue": 3,
                "category": "display",
                "minimum": 0,
                "maximum": 4,
                "bindable": false
            },
            {
                "id": "period1",
                "label": "Period 1",
                "valueType": "number",
                "defaultValue": 4,
                "category": "orbits",
                "minimum": 0.0001
            },
            {
                "id": "period2",
                "label": "Period 2",
                "valueType": "number",
                "defaultValue": 8,
                "category": "orbits",
                "minimum": 0.0001
            },
            {
                "id": "period3",
                "label": "Period 3",
                "valueType": "number",
                "defaultValue": 16,
                "category": "orbits",
                "minimum": 0.0001
            },
            {
                "id": "period4",
                "label": "Period 4",
                "valueType": "number",
                "defaultValue": 32,
                "category": "orbits",
                "minimum": 0.0001
            },
            {
                "id": "showOrbits",
                "label": "Show orbit paths",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "starColor",
                "label": "Central body colour",
                "valueType": "colour",
                "defaultValue": "#f08c02",
                "category": "style"
            },
            {
                "id": "bodyColor",
                "label": "Orbiting body colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "orbitColor",
                "label": "Orbit colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "maxRadius",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-8\\right)"
            },
            {
                "id": "count",
                "formula": "\\max\\left(0,\\min\\left(4,bodyCount-\\mod\\left(bodyCount,1\\right)\\right)\\right)"
            },
            {
                "id": "time",
                "value": {
                    "parameter": "timeVariable",
                    "as": "number"
                }
            },
            {
                "id": "starRadius",
                "formula": "\\max\\left(4,maxRadius\\cdot0.12\\right)"
            },
            {
                "id": "bodyRadius",
                "formula": "\\max\\left(2,maxRadius\\cdot0.06\\right)"
            },
            {
                "id": "hairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "orbitRadius0",
                "formula": "\\frac{maxRadius\\cdot1}{count+0.4}"
            },
            {
                "id": "angle0",
                "formula": "\\frac{time}{\\max\\left(0.0001,period1\\right)}\\cdot360"
            },
            {
                "id": "bodyX0",
                "formula": "cx+orbitRadius0\\cdot\\cos\\left(\\frac{angle0\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyY0",
                "formula": "cy-orbitRadius0\\cdot\\sin\\left(\\frac{angle0\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyShown0",
                "formula": "\\max\\left(0,count-0\\right)"
            },
            {
                "id": "orbitShown0",
                "formula": "showOrbits\\cdot bodyShown0"
            },
            {
                "id": "orbitRadius1",
                "formula": "\\frac{maxRadius\\cdot2}{count+0.4}"
            },
            {
                "id": "angle1",
                "formula": "\\frac{time}{\\max\\left(0.0001,period2\\right)}\\cdot360"
            },
            {
                "id": "bodyX1",
                "formula": "cx+orbitRadius1\\cdot\\cos\\left(\\frac{angle1\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyY1",
                "formula": "cy-orbitRadius1\\cdot\\sin\\left(\\frac{angle1\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyShown1",
                "formula": "\\max\\left(0,count-1\\right)"
            },
            {
                "id": "orbitShown1",
                "formula": "showOrbits\\cdot bodyShown1"
            },
            {
                "id": "orbitRadius2",
                "formula": "\\frac{maxRadius\\cdot3}{count+0.4}"
            },
            {
                "id": "angle2",
                "formula": "\\frac{time}{\\max\\left(0.0001,period3\\right)}\\cdot360"
            },
            {
                "id": "bodyX2",
                "formula": "cx+orbitRadius2\\cdot\\cos\\left(\\frac{angle2\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyY2",
                "formula": "cy-orbitRadius2\\cdot\\sin\\left(\\frac{angle2\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyShown2",
                "formula": "\\max\\left(0,count-2\\right)"
            },
            {
                "id": "orbitShown2",
                "formula": "showOrbits\\cdot bodyShown2"
            },
            {
                "id": "orbitRadius3",
                "formula": "\\frac{maxRadius\\cdot4}{count+0.4}"
            },
            {
                "id": "angle3",
                "formula": "\\frac{time}{\\max\\left(0.0001,period4\\right)}\\cdot360"
            },
            {
                "id": "bodyX3",
                "formula": "cx+orbitRadius3\\cdot\\cos\\left(\\frac{angle3\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyY3",
                "formula": "cy-orbitRadius3\\cdot\\sin\\left(\\frac{angle3\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "bodyShown3",
                "formula": "\\max\\left(0,count-3\\right)"
            },
            {
                "id": "orbitShown3",
                "formula": "showOrbits\\cdot bodyShown3"
            }
        ],
        "root": {
            "id": "orbit-system",
            "type": "group",
            "children": [
                {
                    "id": "star",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "starRadius"
                        },
                        "fill": {
                            "parameter": "starColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "orbit-0",
                    "type": "circle",
                    "when": {
                        "parameter": "orbitShown0"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "orbitRadius0"
                        },
                        "stroke": {
                            "parameter": "orbitColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "strokeDash": "2 3"
                    }
                },
                {
                    "id": "body-0",
                    "type": "circle",
                    "when": {
                        "parameter": "bodyShown0"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "bodyX0"
                        },
                        "centerY": {
                            "parameter": "bodyY0"
                        },
                        "radius": {
                            "parameter": "bodyRadius"
                        },
                        "fill": {
                            "parameter": "bodyColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "orbit-1",
                    "type": "circle",
                    "when": {
                        "parameter": "orbitShown1"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "orbitRadius1"
                        },
                        "stroke": {
                            "parameter": "orbitColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "strokeDash": "2 3"
                    }
                },
                {
                    "id": "body-1",
                    "type": "circle",
                    "when": {
                        "parameter": "bodyShown1"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "bodyX1"
                        },
                        "centerY": {
                            "parameter": "bodyY1"
                        },
                        "radius": {
                            "parameter": "bodyRadius"
                        },
                        "fill": {
                            "parameter": "bodyColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "orbit-2",
                    "type": "circle",
                    "when": {
                        "parameter": "orbitShown2"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "orbitRadius2"
                        },
                        "stroke": {
                            "parameter": "orbitColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "strokeDash": "2 3"
                    }
                },
                {
                    "id": "body-2",
                    "type": "circle",
                    "when": {
                        "parameter": "bodyShown2"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "bodyX2"
                        },
                        "centerY": {
                            "parameter": "bodyY2"
                        },
                        "radius": {
                            "parameter": "bodyRadius"
                        },
                        "fill": {
                            "parameter": "bodyColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "orbit-3",
                    "type": "circle",
                    "when": {
                        "parameter": "orbitShown3"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "orbitRadius3"
                        },
                        "stroke": {
                            "parameter": "orbitColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "strokeDash": "2 3"
                    }
                },
                {
                    "id": "body-3",
                    "type": "circle",
                    "when": {
                        "parameter": "bodyShown3"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "bodyX3"
                        },
                        "centerY": {
                            "parameter": "bodyY3"
                        },
                        "radius": {
                            "parameter": "bodyRadius"
                        },
                        "fill": {
                            "parameter": "bodyColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "rotating-vector",
        "category": "component",
        "displayName": "Rotating vector",
        "description": "Phasor arrow whose angle and length come from model variables, with an optional reference circle and projections.",
        "icon": "fa-light fa-arrow-right-long",
        "tags": [
            "object",
            "vector",
            "phasor",
            "arrow",
            "rotation",
            "oscillation"
        ],
        "capabilities": [
            "angular",
            "reads-model",
            "vector"
        ],
        "parameters": [
            {
                "id": "angleVariable",
                "label": "Angle variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "description": "Angle in degrees, measured counter-clockwise from the positive x axis."
            },
            {
                "id": "lengthVariable",
                "label": "Length variable",
                "valueType": "variable",
                "defaultValue": "1",
                "category": "model"
            },
            {
                "id": "lengthScale",
                "label": "Length scale",
                "valueType": "number",
                "defaultValue": 1,
                "category": "scale",
                "minimum": 0
            },
            {
                "id": "showCircle",
                "label": "Show reference circle",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "showProjections",
                "label": "Show projections",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display"
            },
            {
                "id": "vectorColor",
                "label": "Vector colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "circleColor",
                "label": "Circle colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style"
            },
            {
                "id": "projectionColor",
                "label": "Projection colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "maxRadius",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-8\\right)"
            },
            {
                "id": "angle",
                "value": {
                    "parameter": "angleVariable",
                    "as": "number"
                }
            },
            {
                "id": "rawLength",
                "value": {
                    "parameter": "lengthVariable",
                    "as": "number"
                }
            },
            {
                "id": "length",
                "formula": "\\max\\left(0,\\min\\left(maxRadius,rawLength\\cdot lengthScale\\right)\\right)"
            },
            {
                "id": "tipX",
                "formula": "cx+length\\cdot\\cos\\left(\\frac{angle\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "tipY",
                "formula": "cy-length\\cdot\\sin\\left(\\frac{angle\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "pointerAngle",
                "formula": "90-angle"
            },
            {
                "id": "hairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "vectorWidth",
                "formula": "strong\\cdot1.5",
                "inputs": {
                    "strong": {
                        "token": "strokeWidth.strong"
                    }
                }
            }
        ],
        "root": {
            "id": "rotating-vector",
            "type": "group",
            "children": [
                {
                    "id": "reference-circle",
                    "type": "circle",
                    "when": {
                        "parameter": "showCircle"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "maxRadius"
                        },
                        "stroke": {
                            "parameter": "circleColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "strokeDash": "3 3"
                    }
                },
                {
                    "id": "projection-x",
                    "type": "line",
                    "when": {
                        "parameter": "showProjections"
                    },
                    "bindings": {
                        "x1": {
                            "parameter": "tipX"
                        },
                        "y1": {
                            "parameter": "tipY"
                        },
                        "x2": {
                            "parameter": "tipX"
                        },
                        "y2": {
                            "parameter": "cy"
                        },
                        "stroke": {
                            "parameter": "projectionColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "strokeDash": "2 2"
                    }
                },
                {
                    "id": "projection-y",
                    "type": "line",
                    "when": {
                        "parameter": "showProjections"
                    },
                    "bindings": {
                        "x1": {
                            "parameter": "tipX"
                        },
                        "y1": {
                            "parameter": "tipY"
                        },
                        "x2": {
                            "parameter": "cx"
                        },
                        "y2": {
                            "parameter": "tipY"
                        },
                        "stroke": {
                            "parameter": "projectionColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    },
                    "properties": {
                        "strokeDash": "2 2"
                    }
                },
                {
                    "id": "vector",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "pointerAngle"
                        },
                        "length": {
                            "parameter": "length"
                        },
                        "tailLength": 0,
                        "width": {
                            "parameter": "vectorWidth"
                        },
                        "color": {
                            "parameter": "vectorColor"
                        },
                        "style": "arrow"
                    }
                },
                {
                    "id": "origin",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "fill": {
                            "parameter": "vectorColor"
                        }
                    },
                    "properties": {
                        "radius": 2.5,
                        "stroke": "none"
                    }
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "speedometer",
        "category": "component",
        "displayName": "Speedometer",
        "description": "Sweeping dial with a scale, a needle bound to a model variable and a numeric readout.",
        "icon": "fa-light fa-gauge-high",
        "tags": [
            "object",
            "gauge",
            "speed",
            "dial",
            "meter",
            "scale"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model",
            "scale"
        ],
        "parameters": [
            {
                "id": "valueVariable",
                "label": "Value variable",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model"
            },
            {
                "id": "minimum",
                "label": "Minimum",
                "valueType": "number",
                "defaultValue": 0,
                "category": "scale"
            },
            {
                "id": "maximum",
                "label": "Maximum",
                "valueType": "number",
                "defaultValue": 100,
                "category": "scale"
            },
            {
                "id": "startAngle",
                "label": "Start angle",
                "valueType": "number",
                "defaultValue": 225,
                "category": "scale",
                "unit": "deg"
            },
            {
                "id": "endAngle",
                "label": "End angle",
                "valueType": "number",
                "defaultValue": -45,
                "category": "scale",
                "unit": "deg"
            },
            {
                "id": "majorTicks",
                "label": "Major ticks",
                "valueType": "number",
                "defaultValue": 9,
                "category": "scale",
                "minimum": 2,
                "maximum": 60,
                "bindable": false
            },
            {
                "id": "minorPerMajor",
                "label": "Minor ticks per major",
                "valueType": "number",
                "defaultValue": 4,
                "category": "scale",
                "minimum": 0,
                "maximum": 20,
                "bindable": false
            },
            {
                "id": "digits",
                "label": "Decimals",
                "valueType": "number",
                "defaultValue": 0,
                "category": "display",
                "minimum": 0,
                "maximum": 6
            },
            {
                "id": "unit",
                "label": "Unit",
                "valueType": "string",
                "defaultValue": "",
                "category": "display"
            },
            {
                "id": "showReadout",
                "label": "Show readout",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display"
            },
            {
                "id": "faceColor",
                "label": "Face colour",
                "valueType": "colour",
                "defaultValue": "token:surface.emphasis",
                "category": "style"
            },
            {
                "id": "borderColor",
                "label": "Border colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style"
            },
            {
                "id": "needleColor",
                "label": "Needle colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style"
            },
            {
                "id": "labelColor",
                "label": "Label colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            }
        ],
        "locals": [
            {
                "id": "w",
                "value": {
                    "parameter": "$width"
                }
            },
            {
                "id": "h",
                "value": {
                    "parameter": "$height"
                }
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "r",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-6\\right)"
            },
            {
                "id": "value",
                "value": {
                    "parameter": "valueVariable",
                    "as": "number"
                }
            },
            {
                "id": "majorCount",
                "formula": "\\max\\left(2,majorTicks-\\mod\\left(majorTicks,1\\right)\\right)"
            },
            {
                "id": "minorSteps",
                "formula": "\\max\\left(0,minorPerMajor-\\mod\\left(minorPerMajor,1\\right)\\right)"
            },
            {
                "id": "minorCount",
                "formula": "\\left(majorCount-1\\right)\\cdot minorSteps+1"
            },
            {
                "id": "sweep",
                "formula": "\\mod\\left(\\mod\\left(startAngle-endAngle,360\\right)+360,360\\right)"
            },
            {
                "id": "step",
                "formula": "\\frac{maximum-minimum}{majorCount-1}"
            },
            {
                "id": "ratio",
                "value": {
                    "choose": {
                        "formula": "maximum-minimum"
                    },
                    "then": {
                        "formula": "\\max\\left(0,\\min\\left(1,\\frac{value-minimum}{maximum-minimum}\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "needleAngle",
                "formula": "90-\\left(startAngle-ratio\\cdot sweep\\right)"
            },
            {
                "id": "scaleRadius",
                "formula": "r\\cdot0.9"
            },
            {
                "id": "minorLength",
                "formula": "r\\cdot0.06"
            },
            {
                "id": "majorLength",
                "formula": "r\\cdot0.13"
            },
            {
                "id": "labelRadius",
                "formula": "r\\cdot0.7"
            },
            {
                "id": "labelFontSize",
                "formula": "\\max\\left(7,r\\cdot0.13\\right)"
            },
            {
                "id": "needleLength",
                "formula": "r\\cdot0.78"
            },
            {
                "id": "needleTail",
                "formula": "r\\cdot0.16"
            },
            {
                "id": "needleWidth",
                "formula": "\\max\\left(3,r\\cdot0.07\\right)"
            },
            {
                "id": "capRadius",
                "formula": "\\max\\left(3,r\\cdot0.07\\right)"
            },
            {
                "id": "readoutY",
                "formula": "cy+r\\cdot0.34"
            },
            {
                "id": "readoutFontSize",
                "formula": "\\max\\left(9,r\\cdot0.17\\right)"
            },
            {
                "id": "strokeStrong",
                "value": {
                    "token": "strokeWidth.strong"
                }
            },
            {
                "id": "strokeDefault",
                "value": {
                    "token": "strokeWidth.default"
                }
            },
            {
                "id": "strokeHairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "readoutWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "concat": [
                        {
                            "format": {
                                "parameter": "value"
                            },
                            "digits": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "choose": {
                                "parameter": "unit"
                            },
                            "then": {
                                "concat": [
                                    " ",
                                    {
                                        "parameter": "unit"
                                    }
                                ]
                            },
                            "otherwise": ""
                        }
                    ]
                }
            }
        ],
        "root": {
            "id": "speedometer",
            "type": "group",
            "children": [
                {
                    "id": "face",
                    "type": "dial-face",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "r"
                        },
                        "faceColor": {
                            "parameter": "faceColor"
                        },
                        "borderColor": {
                            "parameter": "borderColor"
                        },
                        "borderWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "scale-arc",
                    "type": "arc",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "scaleRadius"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "endAngle": {
                            "parameter": "endAngle"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeDefault"
                        }
                    },
                    "properties": {
                        "fill": "none"
                    }
                },
                {
                    "id": "minor-ticks",
                    "type": "tick-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "scaleRadius"
                        },
                        "count": {
                            "parameter": "minorCount"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "spanAngle": {
                            "parameter": "sweep"
                        },
                        "includeEnd": true,
                        "length": {
                            "parameter": "minorLength"
                        },
                        "width": {
                            "parameter": "strokeHairline"
                        },
                        "color": {
                            "parameter": "borderColor"
                        }
                    }
                },
                {
                    "id": "major-ticks",
                    "type": "tick-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "scaleRadius"
                        },
                        "count": {
                            "parameter": "majorCount"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "spanAngle": {
                            "parameter": "sweep"
                        },
                        "includeEnd": true,
                        "length": {
                            "parameter": "majorLength"
                        },
                        "width": {
                            "parameter": "strokeStrong"
                        },
                        "color": {
                            "parameter": "borderColor"
                        }
                    }
                },
                {
                    "id": "scale-labels",
                    "type": "label-ring",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "labelRadius"
                        },
                        "count": {
                            "parameter": "majorCount"
                        },
                        "startAngle": {
                            "parameter": "startAngle"
                        },
                        "spanAngle": {
                            "parameter": "sweep"
                        },
                        "includeEnd": true,
                        "startValue": {
                            "parameter": "minimum"
                        },
                        "valueStep": {
                            "parameter": "step"
                        },
                        "wrapAt": 0,
                        "digits": {
                            "parameter": "digits"
                        },
                        "fontSize": {
                            "parameter": "labelFontSize"
                        },
                        "color": {
                            "parameter": "labelColor"
                        }
                    }
                },
                {
                    "id": "needle",
                    "type": "pointer-hand",
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "needleAngle"
                        },
                        "length": {
                            "parameter": "needleLength"
                        },
                        "tailLength": {
                            "parameter": "needleTail"
                        },
                        "width": {
                            "parameter": "needleWidth"
                        },
                        "color": {
                            "parameter": "needleColor"
                        },
                        "style": "needle"
                    }
                },
                {
                    "id": "centre-cap",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "radius": {
                            "parameter": "capRadius"
                        },
                        "fill": {
                            "parameter": "borderColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "readout",
                    "type": "text",
                    "when": {
                        "parameter": "showReadout"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "cx"
                        },
                        "y": {
                            "parameter": "readoutY"
                        },
                        "text": {
                            "parameter": "readoutText"
                        },
                        "fontSize": {
                            "parameter": "readoutFontSize"
                        },
                        "fontWeight": {
                            "parameter": "readoutWeight"
                        },
                        "fill": {
                            "parameter": "labelColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                }
            ]
        }
    }
]);
