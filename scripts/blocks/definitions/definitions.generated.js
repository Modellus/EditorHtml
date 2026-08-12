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
        "type": "calculator",
        "category": "component",
        "displayName": "Calculator",
        "description": "Four-function calculator whose working is held by the object itself. Term keys load the value a model variable has at the iteration on screen, the result can be written back into a model variable, and every completed operation is kept in a history the object remembers and can be read back from.",
        "icon": "fa-light fa-calculator",
        "tags": [
            "object",
            "calculator",
            "keypad",
            "arithmetic",
            "reads-model",
            "memory",
            "history"
        ],
        "capabilities": [
            "interaction",
            "textual",
            "reads-model",
            "writes-model",
            "memory"
        ],
        "preview": {
            "parameters": {
                "n": 1234,
                "dp": 0,
                "history": [
                    {
                        "text": "12 + 5 =",
                        "x": 17
                    },
                    {
                        "text": "8 × 3 =",
                        "x": 24
                    },
                    {
                        "text": "24 ÷ 2 =",
                        "x": 12
                    }
                ]
            }
        },
        "parameters": [
            {
                "id": "n",
                "label": "Entry",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "description": "The number on the display."
            },
            {
                "id": "a",
                "label": "Stored operand",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false
            },
            {
                "id": "p",
                "label": "Pending operation",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "description": "0 none, 1 add, 2 subtract, 3 multiply, 4 divide."
            },
            {
                "id": "s",
                "label": "Entry scale",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "description": "Zero while whole digits are typed, then the place value the next digit takes."
            },
            {
                "id": "dp",
                "label": "Entry decimals",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false
            },
            {
                "id": "ad",
                "label": "Stored operand decimals",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false
            },
            {
                "id": "fresh",
                "label": "Start a new entry",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "description": "Set after a result or a term key, so the next digit starts a number instead of extending one."
            },
            {
                "id": "history",
                "label": "History",
                "valueType": "memory",
                "defaultValue": [],
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "description": "The operations the calculator has completed, newest last."
            },
            {
                "id": "termA",
                "label": "Key 1",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "description": "Model variable this key loads, read at the iteration on screen.",
                "colorParameter": "keyAColor"
            },
            {
                "id": "termB",
                "label": "Key 2",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "colorParameter": "keyBColor",
                "description": "Model variable this key loads, read at the iteration on screen."
            },
            {
                "id": "termC",
                "label": "Key 3",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "colorParameter": "keyCColor",
                "description": "Model variable this key loads, read at the iteration on screen."
            },
            {
                "id": "termD",
                "label": "Key 4",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "colorParameter": "keyDColor",
                "description": "Model variable this key loads, read at the iteration on screen."
            },
            {
                "id": "keyAColor",
                "label": "Key 1 colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "model",
                "userEditable": false
            },
            {
                "id": "keyBColor",
                "label": "Key 2 colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "model",
                "userEditable": false
            },
            {
                "id": "keyCColor",
                "label": "Key 3 colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "model",
                "userEditable": false
            },
            {
                "id": "keyDColor",
                "label": "Key 4 colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "model",
                "userEditable": false
            },
            {
                "id": "resultVariable",
                "label": "Result variable",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "description": "Model variable the equals key writes the result into, at the iteration on screen. Left empty the calculator writes nothing."
            },
            {
                "id": "digits",
                "label": "Result decimals",
                "valueType": "number",
                "defaultValue": 2,
                "category": "display",
                "minimum": 0,
                "maximum": 6
            },
            {
                "id": "showHistory",
                "label": "Show history",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "description": "Draws the list of completed operations down the side of the keypad."
            },
            {
                "id": "historyLimit",
                "label": "History length",
                "valueType": "number",
                "defaultValue": 24,
                "category": "display",
                "minimum": 1,
                "maximum": 200,
                "description": "Operations kept before the oldest is dropped."
            },
            {
                "id": "bodyColor",
                "label": "Body colour",
                "valueType": "colour",
                "defaultValue": "token:surface.emphasis",
                "category": "style"
            },
            {
                "id": "displayColor",
                "label": "Display colour",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "keyColor",
                "label": "Digit key colour",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "functionKeyColor",
                "label": "Function key colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "style"
            },
            {
                "id": "accentColor",
                "label": "Operator key colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "borderColor",
                "label": "Border colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style"
            },
            {
                "id": "textColor",
                "label": "Text colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            },
            {
                "id": "accentTextColor",
                "label": "Operator label colour",
                "valueType": "colour",
                "defaultValue": "token:text.inverse",
                "category": "style"
            },
            {
                "id": "mutedTextColor",
                "label": "Secondary text colour",
                "valueType": "colour",
                "defaultValue": "token:text.secondary",
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
                "id": "pad",
                "value": 10
            },
            {
                "id": "gap",
                "value": 6
            },
            {
                "id": "historyW",
                "value": {
                    "choose": {
                        "parameter": "showHistory"
                    },
                    "then": {
                        "formula": "\\max\\left(64,w\\cdot0.32\\right)\\cdot\\max\\left(0,\\min\\left(1,w-264\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "historyGap",
                "value": {
                    "choose": {
                        "parameter": "historyW"
                    },
                    "then": {
                        "parameter": "gap"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "contentW",
                "formula": "w-2\\cdot pad-historyW-historyGap"
            },
            {
                "id": "displayH",
                "formula": "\\max\\left(34,h\\cdot0.17\\right)"
            },
            {
                "id": "termH",
                "formula": "\\max\\left(16,h\\cdot0.07\\right)"
            },
            {
                "id": "stripH",
                "formula": "termH+gap"
            },
            {
                "id": "keypadTop",
                "formula": "pad+displayH+gap+stripH"
            },
            {
                "id": "keyW",
                "formula": "\\frac{contentW-3\\cdot gap}{4}"
            },
            {
                "id": "keyH",
                "formula": "\\max\\left(6,\\frac{h-keypadTop-pad-4\\cdot gap}{5}\\right)"
            },
            {
                "id": "colStep",
                "formula": "keyW+gap"
            },
            {
                "id": "rowStep",
                "formula": "keyH+gap"
            },
            {
                "id": "x1",
                "formula": "pad"
            },
            {
                "id": "x2",
                "formula": "pad+colStep"
            },
            {
                "id": "x3",
                "formula": "pad+2\\cdot colStep"
            },
            {
                "id": "x4",
                "formula": "pad+3\\cdot colStep"
            },
            {
                "id": "y1",
                "formula": "keypadTop"
            },
            {
                "id": "y2",
                "formula": "keypadTop+rowStep"
            },
            {
                "id": "y3",
                "formula": "keypadTop+2\\cdot rowStep"
            },
            {
                "id": "y4",
                "formula": "keypadTop+3\\cdot rowStep"
            },
            {
                "id": "y5",
                "formula": "keypadTop+4\\cdot rowStep"
            },
            {
                "id": "tallH",
                "formula": "2\\cdot keyH+gap"
            },
            {
                "id": "wideW",
                "formula": "2\\cdot keyW+gap"
            },
            {
                "id": "termW",
                "formula": "\\frac{contentW-3\\cdot gap}{4}"
            },
            {
                "id": "termStep",
                "formula": "termW+gap"
            },
            {
                "id": "termY",
                "formula": "pad+displayH+gap"
            },
            {
                "id": "termX1",
                "formula": "pad"
            },
            {
                "id": "termX2",
                "formula": "pad+1\\cdot termStep"
            },
            {
                "id": "termX3",
                "formula": "pad+2\\cdot termStep"
            },
            {
                "id": "termX4",
                "formula": "pad+3\\cdot termStep"
            },
            {
                "id": "displayW",
                "formula": "contentW"
            },
            {
                "id": "readoutX",
                "formula": "pad+contentW-8"
            },
            {
                "id": "readoutY",
                "formula": "pad+displayH\\cdot0.66"
            },
            {
                "id": "tapeY",
                "formula": "pad+displayH\\cdot0.27"
            },
            {
                "id": "readoutFont",
                "formula": "\\max\\left(13,displayH\\cdot0.44\\right)"
            },
            {
                "id": "tapeFont",
                "formula": "\\max\\left(8,displayH\\cdot0.2\\right)"
            },
            {
                "id": "keyFont",
                "formula": "\\max\\left(10,keyH\\cdot0.42\\right)"
            },
            {
                "id": "termFont",
                "formula": "\\max\\left(8,termH\\cdot0.5\\right)"
            },
            {
                "id": "historyPad",
                "value": 6
            },
            {
                "id": "historyX",
                "formula": "pad+contentW+historyGap"
            },
            {
                "id": "historyPanelH",
                "formula": "h-2\\cdot pad"
            },
            {
                "id": "historyRowH",
                "formula": "\\max\\left(24,h\\cdot0.09\\right)"
            },
            {
                "id": "historyFont",
                "formula": "\\max\\left(8,historyRowH\\cdot0.36\\right)"
            },
            {
                "id": "historyListX",
                "formula": "historyX+historyPad"
            },
            {
                "id": "historyListW",
                "formula": "\\max\\left(0,historyW-2\\cdot historyPad\\right)"
            },
            {
                "id": "historyListY",
                "formula": "pad+historyPad"
            },
            {
                "id": "historyListH",
                "formula": "\\max\\left(0,h-2\\cdot pad-2\\cdot historyPad\\right)"
            },
            {
                "id": "radiusLarge",
                "value": {
                    "token": "radius.large"
                }
            },
            {
                "id": "radiusMedium",
                "value": {
                    "token": "radius.medium"
                }
            },
            {
                "id": "radiusSmall",
                "value": {
                    "token": "radius.small"
                }
            },
            {
                "id": "strongWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "hairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            },
            {
                "id": "result",
                "value": {
                    "choose": {
                        "formula": "p-1"
                    },
                    "then": {
                        "choose": {
                            "formula": "p-2"
                        },
                        "then": {
                            "choose": {
                                "formula": "p-3"
                            },
                            "then": {
                                "choose": {
                                    "formula": "p-4"
                                },
                                "then": {
                                    "parameter": "n"
                                },
                                "otherwise": {
                                    "formula": "\\frac{a}{n}"
                                }
                            },
                            "otherwise": {
                                "formula": "a\\cdot n"
                            }
                        },
                        "otherwise": {
                            "formula": "a-n"
                        }
                    },
                    "otherwise": {
                        "formula": "a+n"
                    }
                }
            },
            {
                "id": "opSymbol",
                "value": {
                    "choose": {
                        "formula": "p-1"
                    },
                    "then": {
                        "choose": {
                            "formula": "p-2"
                        },
                        "then": {
                            "choose": {
                                "formula": "p-3"
                            },
                            "then": {
                                "choose": {
                                    "formula": "p-4"
                                },
                                "then": "",
                                "otherwise": "÷"
                            },
                            "otherwise": "×"
                        },
                        "otherwise": "−"
                    },
                    "otherwise": "+"
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "format": {
                        "parameter": "n"
                    },
                    "digits": {
                        "parameter": "dp"
                    }
                }
            },
            {
                "id": "tapeText",
                "value": {
                    "concat": [
                        {
                            "format": {
                                "parameter": "a"
                            },
                            "digits": {
                                "parameter": "ad"
                            }
                        },
                        " ",
                        {
                            "parameter": "opSymbol"
                        }
                    ]
                }
            }
        ],
        "root": {
            "id": "calculator",
            "type": "group",
            "children": [
                {
                    "id": "body",
                    "type": "rect",
                    "bindings": {
                        "width": {
                            "parameter": "w"
                        },
                        "height": {
                            "parameter": "h"
                        },
                        "cornerRadius": {
                            "parameter": "radiusLarge"
                        },
                        "fill": {
                            "parameter": "bodyColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        }
                    },
                    "properties": {
                        "x": 0,
                        "y": 0,
                        "strokeWidth": 1
                    }
                },
                {
                    "id": "display",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "pad"
                        },
                        "y": {
                            "parameter": "pad"
                        },
                        "width": {
                            "parameter": "displayW"
                        },
                        "height": {
                            "parameter": "displayH"
                        },
                        "cornerRadius": {
                            "parameter": "radiusMedium"
                        },
                        "fill": {
                            "parameter": "displayColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    }
                },
                {
                    "id": "tape",
                    "type": "text",
                    "when": {
                        "parameter": "p"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "readoutX"
                        },
                        "y": {
                            "parameter": "tapeY"
                        },
                        "text": {
                            "parameter": "tapeText"
                        },
                        "fontSize": {
                            "parameter": "tapeFont"
                        },
                        "fill": {
                            "parameter": "mutedTextColor"
                        }
                    },
                    "properties": {
                        "stroke": "none",
                        "textAnchor": "end",
                        "baseline": "central"
                    }
                },
                {
                    "id": "readout",
                    "type": "text",
                    "bindings": {
                        "x": {
                            "parameter": "readoutX"
                        },
                        "y": {
                            "parameter": "readoutY"
                        },
                        "text": {
                            "parameter": "readoutText"
                        },
                        "fontSize": {
                            "parameter": "readoutFont"
                        },
                        "fontWeight": {
                            "parameter": "strongWeight"
                        },
                        "fill": {
                            "parameter": "textColor"
                        }
                    },
                    "properties": {
                        "stroke": "none",
                        "textAnchor": "end",
                        "baseline": "central"
                    }
                },
                {
                    "id": "term-a",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "termX1"
                                },
                                "y": {
                                    "parameter": "termY"
                                },
                                "width": {
                                    "parameter": "termW"
                                },
                                "height": {
                                    "parameter": "termH"
                                },
                                "label": {
                                    "choose": {
                                        "parameter": "termA"
                                    },
                                    "then": {
                                        "parameter": "termA"
                                    },
                                    "otherwise": "—"
                                },
                                "fill": {
                                    "parameter": "keyAColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "borderWidth": {
                                    "parameter": "hairline"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusSmall"
                                },
                                "labelColor": {
                                    "contrast": {
                                        "parameter": "keyAColor"
                                    }
                                },
                                "fontSize": {
                                    "parameter": "termFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "termA"
                                },
                                "then": {
                                    "concat": [
                                        {
                                            "parameter": "termA"
                                        },
                                        " = ",
                                        {
                                            "format": {
                                                "parameter": "termA",
                                                "as": "number"
                                            },
                                            "digits": {
                                                "parameter": "digits"
                                            }
                                        }
                                    ]
                                },
                                "otherwise": ""
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "parameter": "termA",
                                "as": "number"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 1
                        }
                    ]
                },
                {
                    "id": "term-b",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "termX2"
                                },
                                "y": {
                                    "parameter": "termY"
                                },
                                "width": {
                                    "parameter": "termW"
                                },
                                "height": {
                                    "parameter": "termH"
                                },
                                "label": {
                                    "choose": {
                                        "parameter": "termB"
                                    },
                                    "then": {
                                        "parameter": "termB"
                                    },
                                    "otherwise": "—"
                                },
                                "fill": {
                                    "parameter": "keyBColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "borderWidth": {
                                    "parameter": "hairline"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusSmall"
                                },
                                "labelColor": {
                                    "contrast": {
                                        "parameter": "keyBColor"
                                    }
                                },
                                "fontSize": {
                                    "parameter": "termFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "termB"
                                },
                                "then": {
                                    "concat": [
                                        {
                                            "parameter": "termB"
                                        },
                                        " = ",
                                        {
                                            "format": {
                                                "parameter": "termB",
                                                "as": "number"
                                            },
                                            "digits": {
                                                "parameter": "digits"
                                            }
                                        }
                                    ]
                                },
                                "otherwise": ""
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "parameter": "termB",
                                "as": "number"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 1
                        }
                    ]
                },
                {
                    "id": "term-c",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "termX3"
                                },
                                "y": {
                                    "parameter": "termY"
                                },
                                "width": {
                                    "parameter": "termW"
                                },
                                "height": {
                                    "parameter": "termH"
                                },
                                "label": {
                                    "choose": {
                                        "parameter": "termC"
                                    },
                                    "then": {
                                        "parameter": "termC"
                                    },
                                    "otherwise": "—"
                                },
                                "fill": {
                                    "parameter": "keyCColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "borderWidth": {
                                    "parameter": "hairline"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusSmall"
                                },
                                "labelColor": {
                                    "contrast": {
                                        "parameter": "keyCColor"
                                    }
                                },
                                "fontSize": {
                                    "parameter": "termFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "termC"
                                },
                                "then": {
                                    "concat": [
                                        {
                                            "parameter": "termC"
                                        },
                                        " = ",
                                        {
                                            "format": {
                                                "parameter": "termC",
                                                "as": "number"
                                            },
                                            "digits": {
                                                "parameter": "digits"
                                            }
                                        }
                                    ]
                                },
                                "otherwise": ""
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "parameter": "termC",
                                "as": "number"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 1
                        }
                    ]
                },
                {
                    "id": "term-d",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "termX4"
                                },
                                "y": {
                                    "parameter": "termY"
                                },
                                "width": {
                                    "parameter": "termW"
                                },
                                "height": {
                                    "parameter": "termH"
                                },
                                "label": {
                                    "choose": {
                                        "parameter": "termD"
                                    },
                                    "then": {
                                        "parameter": "termD"
                                    },
                                    "otherwise": "—"
                                },
                                "fill": {
                                    "parameter": "keyDColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "borderWidth": {
                                    "parameter": "hairline"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusSmall"
                                },
                                "labelColor": {
                                    "contrast": {
                                        "parameter": "keyDColor"
                                    }
                                },
                                "fontSize": {
                                    "parameter": "termFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "termD"
                                },
                                "then": {
                                    "concat": [
                                        {
                                            "parameter": "termD"
                                        },
                                        " = ",
                                        {
                                            "format": {
                                                "parameter": "termD",
                                                "as": "number"
                                            },
                                            "digits": {
                                                "parameter": "digits"
                                            }
                                        }
                                    ]
                                },
                                "otherwise": ""
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "parameter": "termD",
                                "as": "number"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 1
                        }
                    ]
                },
                {
                    "id": "key-clear",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x1"
                                },
                                "y": {
                                    "parameter": "y1"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "C",
                                "fill": {
                                    "parameter": "functionKeyColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "textColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "ad",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-sign",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x2"
                                },
                                "y": {
                                    "parameter": "y1"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "±",
                                "fill": {
                                    "parameter": "functionKeyColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "textColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "formula": "0-n"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-divide",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x3"
                                },
                                "y": {
                                    "parameter": "y1"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "÷",
                                "fill": {
                                    "parameter": "accentColor"
                                },
                                "borderColor": {
                                    "parameter": "accentColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "accentTextColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "ad",
                            "value": {
                                "parameter": "dp"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 4
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-multiply",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x4"
                                },
                                "y": {
                                    "parameter": "y1"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "×",
                                "fill": {
                                    "parameter": "accentColor"
                                },
                                "borderColor": {
                                    "parameter": "accentColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "accentTextColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "ad",
                            "value": {
                                "parameter": "dp"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 3
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-subtract",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x4"
                                },
                                "y": {
                                    "parameter": "y2"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "−",
                                "fill": {
                                    "parameter": "accentColor"
                                },
                                "borderColor": {
                                    "parameter": "accentColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "accentTextColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "ad",
                            "value": {
                                "parameter": "dp"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 2
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-add",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x4"
                                },
                                "y": {
                                    "parameter": "y3"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "+",
                                "fill": {
                                    "parameter": "accentColor"
                                },
                                "borderColor": {
                                    "parameter": "accentColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "accentTextColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "ad",
                            "value": {
                                "parameter": "dp"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 1
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-equals",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x4"
                                },
                                "y": {
                                    "parameter": "y4"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "tallH"
                                },
                                "label": "=",
                                "fill": {
                                    "parameter": "accentColor"
                                },
                                "borderColor": {
                                    "parameter": "accentColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "accentTextColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "remember",
                            "when": {
                                "parameter": "p"
                            },
                            "memory": "history",
                            "text": {
                                "concat": [
                                    {
                                        "format": {
                                            "parameter": "a"
                                        },
                                        "digits": {
                                            "parameter": "ad"
                                        }
                                    },
                                    " ",
                                    {
                                        "parameter": "opSymbol"
                                    },
                                    " ",
                                    {
                                        "format": {
                                            "parameter": "n"
                                        },
                                        "digits": {
                                            "parameter": "dp"
                                        }
                                    }
                                ]
                            },
                            "x": {
                                "parameter": "result"
                            },
                            "limit": {
                                "parameter": "historyLimit"
                            }
                        },
                        {
                            "type": "clickable",
                            "variable": {
                                "parameter": "resultVariable"
                            },
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "a",
                            "value": {
                                "parameter": "result"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "p",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "parameter": "digits"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 1
                        }
                    ]
                },
                {
                    "id": "key-digit",
                    "type": "group",
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": 9
                        }
                    ],
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "formula": "pad+\\mod\\left(i,3\\right)\\cdot colStep",
                                    "inputs": {
                                        "i": {
                                            "parameter": "$index"
                                        }
                                    }
                                },
                                "y": {
                                    "formula": "keypadTop+\\left(3-\\frac{i-\\mod\\left(i,3\\right)}{3}\\right)\\cdot rowStep",
                                    "inputs": {
                                        "i": {
                                            "parameter": "$index"
                                        }
                                    }
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": {
                                    "format": {
                                        "formula": "i+1",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    },
                                    "digits": 0
                                },
                                "fill": {
                                    "parameter": "keyColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "textColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "fresh"
                                },
                                "then": {
                                    "formula": "i+1",
                                    "inputs": {
                                        "i": {
                                            "parameter": "$index"
                                        }
                                    }
                                },
                                "otherwise": {
                                    "choose": {
                                        "parameter": "s"
                                    },
                                    "then": {
                                        "formula": "n+\\left(i+1\\right)\\cdot s",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "10\\cdot n+i+1",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": {
                                "choose": {
                                    "parameter": "s"
                                },
                                "then": {
                                    "formula": "\\frac{s}{10}"
                                },
                                "otherwise": 0
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "choose": {
                                    "parameter": "s"
                                },
                                "then": {
                                    "formula": "dp+1"
                                },
                                "otherwise": 0
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-zero",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x1"
                                },
                                "y": {
                                    "parameter": "y5"
                                },
                                "width": {
                                    "parameter": "wideW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "0",
                                "fill": {
                                    "parameter": "keyColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "textColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "fresh"
                                },
                                "then": 0,
                                "otherwise": {
                                    "choose": {
                                        "parameter": "s"
                                    },
                                    "then": {
                                        "parameter": "n"
                                    },
                                    "otherwise": {
                                        "formula": "10\\cdot n"
                                    }
                                }
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": {
                                "choose": {
                                    "parameter": "s"
                                },
                                "then": {
                                    "formula": "\\frac{s}{10}"
                                },
                                "otherwise": 0
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "choose": {
                                    "parameter": "s"
                                },
                                "then": {
                                    "formula": "dp+1"
                                },
                                "otherwise": 0
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-point",
                    "type": "group",
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "x3"
                                },
                                "y": {
                                    "parameter": "y5"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": ".",
                                "fill": {
                                    "parameter": "keyColor"
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "parameter": "textColor"
                                },
                                "fontSize": {
                                    "parameter": "keyFont"
                                },
                                "fontWeight": {
                                    "parameter": "strongWeight"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "fresh"
                                },
                                "then": 0,
                                "otherwise": {
                                    "parameter": "n"
                                }
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "dp",
                            "value": {
                                "choose": {
                                    "parameter": "fresh"
                                },
                                "then": 0,
                                "otherwise": {
                                    "parameter": "dp"
                                }
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "s",
                            "value": {
                                "choose": {
                                    "parameter": "s"
                                },
                                "then": {
                                    "parameter": "s"
                                },
                                "otherwise": 0.1
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "history-panel",
                    "type": "rect",
                    "when": {
                        "parameter": "historyW"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "historyX"
                        },
                        "y": {
                            "parameter": "pad"
                        },
                        "width": {
                            "parameter": "historyW"
                        },
                        "height": {
                            "parameter": "historyPanelH"
                        },
                        "cornerRadius": {
                            "parameter": "radiusMedium"
                        },
                        "fill": {
                            "parameter": "displayColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    }
                },
                {
                    "id": "history-list",
                    "type": "memory-list",
                    "when": {
                        "parameter": "historyW"
                    },
                    "parameters": {
                        "rows": {
                            "memory": "history"
                        },
                        "x": {
                            "parameter": "historyListX"
                        },
                        "y": {
                            "parameter": "historyListY"
                        },
                        "width": {
                            "parameter": "historyListW"
                        },
                        "height": {
                            "parameter": "historyListH"
                        },
                        "rowHeight": {
                            "parameter": "historyRowH"
                        },
                        "fontSize": {
                            "parameter": "historyFont"
                        },
                        "digits": {
                            "parameter": "digits"
                        },
                        "order": "newest",
                        "layout": "stacked",
                        "textColor": {
                            "parameter": "mutedTextColor"
                        },
                        "valueColor": {
                            "parameter": "textColor"
                        },
                        "rowColor": "none",
                        "emptyText": "—",
                        "rowActions": [
                            {
                                "property": "n",
                                "field": "x"
                            },
                            {
                                "property": "s",
                                "value": 0
                            },
                            {
                                "property": "dp",
                                "value": {
                                    "parameter": "digits"
                                }
                            },
                            {
                                "property": "fresh",
                                "value": 1
                            }
                        ]
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
        "preview": {
            "parameters": {
                "valueVariable": "68",
                "unit": "%"
            }
        },
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
        "art": {
            "rose": "art/compass-rose.svg",
            "needle": "art/compass-needle.svg"
        },
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
                "label": "Degrees",
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
                "id": "tickColor",
                "label": "Tick colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
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
                "id": "size",
                "formula": "\\min\\left(w,h\\right)"
            },
            {
                "id": "k",
                "formula": "\\frac{\\max\\left(size,1\\right)}{200}"
            },
            {
                "id": "dx",
                "formula": "\\frac{w-size}{2}"
            },
            {
                "id": "dy",
                "formula": "\\frac{h-size}{2}"
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
                "formula": "96\\cdot k"
            },
            {
                "id": "roseGrabInner",
                "formula": "r\\cdot0.7"
            },
            {
                "id": "heading",
                "value": {
                    "parameter": "headingVariable",
                    "as": "number"
                }
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
                "id": "cardinalRadius",
                "value": {
                    "choose": {
                        "parameter": "showDegrees"
                    },
                    "then": 50,
                    "otherwise": 71
                }
            },
            {
                "id": "cardinalFontSize",
                "formula": "\\max\\left(\\frac{8}{k},19.2\\right)"
            },
            {
                "id": "degreeFontSize",
                "formula": "\\max\\left(\\frac{6}{k},10.6\\right)"
            },
            {
                "id": "cardinalWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "labelFont",
                "value": {
                    "token": "font.family.sans"
                }
            },
            {
                "id": "tickCount",
                "value": 72
            },
            {
                "id": "majorTickCount",
                "value": 8
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
                    "id": "art",
                    "type": "group",
                    "modifiers": [
                        {
                            "type": "translate",
                            "dx": {
                                "parameter": "dx"
                            },
                            "dy": {
                                "parameter": "dy"
                            }
                        },
                        {
                            "type": "scale",
                            "scaleX": {
                                "parameter": "k"
                            },
                            "scaleY": {
                                "parameter": "k"
                            },
                            "centerX": 0,
                            "centerY": 0
                        }
                    ],
                    "children": [
                        {
                            "id": "rose",
                            "type": "group",
                            "modifiers": [
                                {
                                    "type": "rotate",
                                    "angle": {
                                        "parameter": "rotation"
                                    },
                                    "centerX": 100,
                                    "centerY": 100
                                }
                            ],
                            "children": [
                                {
                                    "id": "face",
                                    "type": "circle",
                                    "properties": {
                                        "centerX": 100,
                                        "centerY": 100,
                                        "radius": 96,
                                        "fill": "token:surface.default",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 2
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "faceColor"
                                        },
                                        "stroke": {
                                            "parameter": "borderColor"
                                        }
                                    }
                                },
                                {
                                    "id": "tick",
                                    "type": "line",
                                    "properties": {
                                        "x1": 100,
                                        "y1": 6,
                                        "x2": 100,
                                        "y2": 13,
                                        "stroke": "token:stroke.subtle",
                                        "strokeWidth": 0.5
                                    },
                                    "bindings": {
                                        "stroke": {
                                            "parameter": "tickColor"
                                        }
                                    },
                                    "modifiers": [
                                        {
                                            "type": "repeat",
                                            "count": {
                                                "parameter": "tickCount"
                                            },
                                            "angleStep": 5,
                                            "centerX": 100,
                                            "centerY": 100
                                        }
                                    ]
                                },
                                {
                                    "id": "tick-major",
                                    "type": "line",
                                    "properties": {
                                        "x1": 100,
                                        "y1": 6,
                                        "x2": 100,
                                        "y2": 20,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 2
                                    },
                                    "bindings": {
                                        "stroke": {
                                            "parameter": "borderColor"
                                        }
                                    },
                                    "modifiers": [
                                        {
                                            "type": "repeat",
                                            "count": {
                                                "parameter": "majorTickCount"
                                            },
                                            "angleStep": 45,
                                            "centerX": 100,
                                            "centerY": 100
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "id": "cardinals",
                            "type": "label-ring",
                            "parameters": {
                                "centerX": 100,
                                "centerY": 100,
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
                                "fontFamily": {
                                    "parameter": "labelFont"
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
                                "centerX": 100,
                                "centerY": 100,
                                "radius": 76,
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
                                "fontFamily": {
                                    "parameter": "labelFont"
                                },
                                "color": {
                                    "parameter": "labelColor"
                                }
                            }
                        },
                        {
                            "id": "needle",
                            "type": "group",
                            "modifiers": [
                                {
                                    "type": "rotate",
                                    "angle": {
                                        "parameter": "heading"
                                    },
                                    "centerX": 100,
                                    "centerY": 100
                                }
                            ],
                            "behaviours": [
                                {
                                    "type": "drag-angle",
                                    "variable": {
                                        "parameter": "headingVariable"
                                    },
                                    "property": "headingVariable",
                                    "centerX": {
                                        "parameter": "cx"
                                    },
                                    "centerY": {
                                        "parameter": "cy"
                                    },
                                    "degreesPerUnit": 1,
                                    "wrapAt": 360
                                }
                            ],
                            "children": [
                                {
                                    "id": "north",
                                    "type": "path",
                                    "properties": {
                                        "d": "M100 40 L108 100 L92 100 Z",
                                        "fill": "token:stroke.warning"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "needleColor"
                                        }
                                    }
                                },
                                {
                                    "id": "south",
                                    "type": "path",
                                    "properties": {
                                        "d": "M100 160 L108 100 L92 100 Z",
                                        "fill": "token:stroke.subtle"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "tailColor"
                                        }
                                    }
                                },
                                {
                                    "id": "cap",
                                    "type": "circle",
                                    "properties": {
                                        "centerX": 100,
                                        "centerY": 100,
                                        "radius": 5,
                                        "fill": "token:stroke.default"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "borderColor"
                                        }
                                    }
                                }
                            ]
                        }
                    ]
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
                            "parameter": "roseGrabInner"
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
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "mouse-tracker",
        "category": "component",
        "displayName": "Mouse tracker",
        "description": "Records where the pointer goes across the plot, against a horizontal and a vertical axis. Every drag adds to what is already there, drawn as a line of its own, so several of them build one recording made of separate runs. A click records nothing: the plot is only written to by a gesture that travels. The run is measurements: name a variable for each axis and it takes the value of sample n at iteration n, so the model's own player replays the gesture and everything reading those variables moves with it. The marker showing the sample on screen can be any character from the catalogue, placed by its pivot point.",
        "icon": "fa-light fa-arrow-pointer",
        "tags": [
            "object",
            "mouse",
            "pointer",
            "tracker",
            "memory",
            "recording",
            "measurements",
            "chart",
            "writes-model"
        ],
        "capabilities": [
            "interaction",
            "memory",
            "linear",
            "writes-model",
            "textual"
        ],
        "preview": {
            "parameters": {
                "samples": [
                    {
                        "x": 1,
                        "y": 5
                    },
                    {
                        "x": 1.296,
                        "y": 5.749
                    },
                    {
                        "x": 1.593,
                        "y": 6.462
                    },
                    {
                        "x": 1.889,
                        "y": 7.102
                    },
                    {
                        "x": 2.185,
                        "y": 7.64
                    },
                    {
                        "x": 2.481,
                        "y": 8.047
                    },
                    {
                        "x": 2.778,
                        "y": 8.305
                    },
                    {
                        "x": 3.074,
                        "y": 8.4
                    },
                    {
                        "x": 3.37,
                        "y": 8.327
                    },
                    {
                        "x": 3.667,
                        "y": 8.092
                    },
                    {
                        "x": 3.963,
                        "y": 7.704
                    },
                    {
                        "x": 4.259,
                        "y": 7.183
                    },
                    {
                        "x": 4.556,
                        "y": 6.555
                    },
                    {
                        "x": 4.852,
                        "y": 5.85
                    },
                    {
                        "x": 5.148,
                        "y": 5.104
                    },
                    {
                        "x": 5.444,
                        "y": 4.352
                    },
                    {
                        "x": 5.741,
                        "y": 3.632
                    },
                    {
                        "x": 6.037,
                        "y": 2.98
                    },
                    {
                        "x": 6.333,
                        "y": 2.427
                    },
                    {
                        "x": 6.63,
                        "y": 2
                    },
                    {
                        "x": 6.926,
                        "y": 1.721
                    },
                    {
                        "x": 7.222,
                        "y": 1.604
                    },
                    {
                        "x": 7.519,
                        "y": 1.653
                    },
                    {
                        "x": 7.815,
                        "y": 1.867
                    },
                    {
                        "x": 8.111,
                        "y": 2.235
                    },
                    {
                        "x": 8.407,
                        "y": 2.739
                    },
                    {
                        "x": 8.704,
                        "y": 3.354
                    },
                    {
                        "x": 9,
                        "y": 4.05
                    }
                ]
            }
        },
        "parameters": [
            {
                "id": "samples",
                "label": "Recording",
                "valueType": "memory",
                "defaultValue": [],
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "termParameters": {
                    "x": "xVariable",
                    "y": "yVariable"
                },
                "description": "The positions the pointer was recorded at, oldest first, however many drags put them there. Named variables take these values iteration by iteration, the way measurements do."
            },
            {
                "id": "xVariable",
                "label": "Horizontal",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "colorParameter": "xValueColor",
                "description": "Model variable that takes the horizontal position of sample n at iteration n. Left empty the recording stays with the object."
            },
            {
                "id": "yVariable",
                "label": "Vertical",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "colorParameter": "yValueColor",
                "description": "Model variable that takes the vertical position of sample n at iteration n."
            },
            {
                "id": "xValueColor",
                "label": "Horizontal colour",
                "valueType": "colour",
                "defaultValue": "token:axis.color",
                "category": "model",
                "userEditable": false,
                "description": "Colour the horizontal variable is answered in: the line standing at its value and the badge reading it off the horizontal axis. Chosen beside the variable itself, not on a colour menu of its own."
            },
            {
                "id": "yValueColor",
                "label": "Vertical colour",
                "valueType": "colour",
                "defaultValue": "token:axis.color",
                "category": "model",
                "userEditable": false,
                "description": "Colour the vertical variable is answered in: the line standing at its value and the badge reading it off the vertical axis."
            },
            {
                "id": "characterKey",
                "label": "Marker character",
                "valueType": "character",
                "defaultValue": "",
                "category": "display",
                "description": "Character drawn at the recorded position, placed by its own pivot point. Left unchosen the tracker draws a dot."
            },
            {
                "id": "characterImage",
                "label": "Character image",
                "valueType": "string",
                "defaultValue": "",
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "characterPivotX",
                "label": "Character pivot X",
                "valueType": "number",
                "defaultValue": 0.5,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "characterPivotY",
                "label": "Character pivot Y",
                "valueType": "number",
                "defaultValue": 0.5,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "characterAspect",
                "label": "Character aspect",
                "valueType": "number",
                "defaultValue": 1,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "hoverX",
                "label": "Pointer X",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "hoverY",
                "label": "Pointer Y",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "hovering",
                "label": "Pointer over the plot",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false
            },
            {
                "id": "autoScale",
                "label": "Auto Scale",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "scale",
                "description": "Fits both axes to the recording, with the margins a chart leaves around its data."
            },
            {
                "id": "equalScales",
                "label": "Equal Scales",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "scale",
                "description": "Makes one unit across measure the same as one unit up, which is what a trajectory needs."
            },
            {
                "id": "minimumX",
                "label": "Minimum X",
                "valueType": "number",
                "defaultValue": 0,
                "category": "scale"
            },
            {
                "id": "maximumX",
                "label": "Maximum X",
                "valueType": "number",
                "defaultValue": 10,
                "category": "scale"
            },
            {
                "id": "minimumY",
                "label": "Minimum Y",
                "valueType": "number",
                "defaultValue": 0,
                "category": "scale"
            },
            {
                "id": "maximumY",
                "label": "Maximum Y",
                "valueType": "number",
                "defaultValue": 10,
                "category": "scale"
            },
            {
                "id": "perStep",
                "label": "Per step",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "description": "Hands the recording over to the player: the line is drawn as far as the iteration on screen and the marker, its lines out to both axes and the pair of values under it stand on the sample that iteration is, so playing it or pulling the player across walks the gesture. Off, the whole recording stands there and answers the pointer alone — the player moves through it without anything on the plot standing at where it has got to. On, the recording still stands there whole before the run starts, which is what a gesture being drawn and a recording waiting to be played both are."
            },
            {
                "id": "showGrid",
                "label": "Show grid",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "description": "Rules the plot at every tick of both axes. A sheet to draw a gesture on starts plain."
            },
            {
                "id": "showTicks",
                "label": "Show ticks",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "description": "Marks and numbers both axes. Turned off the axes are bare lines, and each is still rescaled by pulling where its ticks stand."
            },
            {
                "id": "ticks",
                "label": "Axis ticks",
                "valueType": "number",
                "defaultValue": 5,
                "category": "display",
                "minimum": 2,
                "maximum": 11
            },
            {
                "id": "backgroundColor",
                "label": "Background",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "dataAreaColor",
                "label": "Data Area",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "axisColor",
                "label": "Axis",
                "valueType": "colour",
                "defaultValue": "token:axis.color",
                "category": "style"
            },
            {
                "id": "valueColor",
                "label": "Value",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style",
                "description": "Colour of the sample the object is standing on: the marker drawn at it and the pair of values read under it."
            },
            {
                "id": "foregroundColor",
                "label": "Foreground",
                "valueType": "colour",
                "defaultValue": "token:axis.labelColor",
                "category": "style",
                "userEditable": false,
                "description": "The numbers written along both axes. It is the shape's own foreground, edited on the row every shape has for it, so the swatch there is the colour the object is actually written in."
            },
            {
                "id": "borderColor",
                "label": "Border",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style",
                "userEditable": false,
                "description": "The outline around the object and around its plot. It is the shape's own border, edited on the row every shape has for it."
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
                "id": "pad",
                "value": 10
            },
            {
                "id": "tickFont",
                "value": {
                    "token": "font.size.tick"
                }
            },
            {
                "id": "labelFont",
                "formula": "\\max\\left(8,\\min\\left(tickFont,h\\cdot0.05\\right)\\right)"
            },
            {
                "id": "labelBandX",
                "formula": "labelFont\\cdot2.2"
            },
            {
                "id": "labelBandY",
                "formula": "\\max\\left(20,labelFont\\cdot3.4\\right)"
            },
            {
                "id": "plotX",
                "formula": "pad+labelBandY"
            },
            {
                "id": "plotY",
                "formula": "pad+\\frac{labelFont}{2}"
            },
            {
                "id": "plotW",
                "formula": "\\max\\left(10,w-plotX-pad\\right)"
            },
            {
                "id": "plotH",
                "formula": "\\max\\left(10,h-plotY-pad-labelBandX\\right)"
            },
            {
                "id": "plotRight",
                "formula": "plotX+plotW"
            },
            {
                "id": "plotBottom",
                "formula": "plotY+plotH"
            },
            {
                "id": "spanX",
                "formula": "\\max\\left(0.000001,maximumX-minimumX\\right)"
            },
            {
                "id": "spanY",
                "formula": "\\max\\left(0.000001,maximumY-minimumY\\right)"
            },
            {
                "id": "scaleX",
                "formula": "\\frac{plotW}{spanX}"
            },
            {
                "id": "scaleY",
                "formula": "-\\frac{plotH}{spanY}"
            },
            {
                "id": "originX",
                "formula": "plotX-minimumX\\cdot scaleX"
            },
            {
                "id": "originY",
                "formula": "plotBottom-minimumY\\cdot scaleY"
            },
            {
                "id": "yFixed",
                "value": {
                    "choose": {
                        "parameter": "autoScale"
                    },
                    "then": 1,
                    "otherwise": {
                        "parameter": "equalScales"
                    }
                }
            },
            {
                "id": "sampleCount",
                "value": {
                    "memoryCount": "samples"
                }
            },
            {
                "id": "playing",
                "value": {
                    "parameter": "$playing"
                }
            },
            {
                "id": "following",
                "value": {
                    "choose": {
                        "parameter": "playing"
                    },
                    "then": 0,
                    "otherwise": {
                        "parameter": "hovering"
                    }
                }
            },
            {
                "id": "shownIteration",
                "value": {
                    "parameter": "$iteration"
                }
            },
            {
                "id": "head",
                "formula": "\\max\\left(0,\\min\\left(sampleCount-1,shownIteration-1\\right)\\right)"
            },
            {
                "id": "atStart",
                "formula": "\\left(1-playing\\right)\\cdot\\max\\left(0,2-shownIteration\\right)"
            },
            {
                "id": "revealedRows",
                "value": {
                    "choose": {
                        "parameter": "atStart"
                    },
                    "then": 0,
                    "otherwise": {
                        "parameter": "shownIteration"
                    }
                }
            },
            {
                "id": "tracedRows",
                "value": {
                    "choose": {
                        "parameter": "perStep"
                    },
                    "then": {
                        "parameter": "revealedRows"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "headX",
                "value": {
                    "memory": "samples",
                    "row": {
                        "parameter": "head"
                    },
                    "field": "x"
                },
                "fallback": 0
            },
            {
                "id": "headY",
                "value": {
                    "memory": "samples",
                    "row": {
                        "parameter": "head"
                    },
                    "field": "y"
                },
                "fallback": 0
            },
            {
                "id": "valueX",
                "value": {
                    "choose": {
                        "parameter": "following"
                    },
                    "then": {
                        "parameter": "hoverX"
                    },
                    "otherwise": {
                        "parameter": "headX"
                    }
                }
            },
            {
                "id": "valueY",
                "value": {
                    "choose": {
                        "parameter": "following"
                    },
                    "then": {
                        "parameter": "hoverY"
                    },
                    "otherwise": {
                        "parameter": "headY"
                    }
                }
            },
            {
                "id": "headGap",
                "value": {
                    "memory": "samples",
                    "row": {
                        "parameter": "head"
                    },
                    "field": "gap"
                },
                "fallback": 0
            },
            {
                "id": "gapShown",
                "value": {
                    "choose": {
                        "parameter": "following"
                    },
                    "then": 0,
                    "otherwise": {
                        "parameter": "headGap"
                    }
                }
            },
            {
                "id": "steppedCount",
                "value": {
                    "choose": {
                        "parameter": "perStep"
                    },
                    "then": {
                        "parameter": "sampleCount"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "marked",
                "value": {
                    "choose": {
                        "parameter": "following"
                    },
                    "then": 1,
                    "otherwise": {
                        "parameter": "steppedCount"
                    }
                }
            },
            {
                "id": "markerShown",
                "formula": "marked\\cdot\\left(1-gapShown\\right)"
            },
            {
                "id": "precision",
                "value": {
                    "parameter": "$precision"
                }
            },
            {
                "id": "labelColor",
                "value": {
                    "parameter": "foregroundColor"
                }
            },
            {
                "id": "gridColor",
                "value": {
                    "token": "grid.color"
                }
            },
            {
                "id": "traceColor",
                "value": {
                    "token": "stroke.accent"
                }
            },
            {
                "id": "markerColor",
                "value": {
                    "parameter": "valueColor"
                }
            },
            {
                "id": "markerX",
                "formula": "originX+valueX\\cdot scaleX"
            },
            {
                "id": "markerY",
                "formula": "originY+valueY\\cdot scaleY"
            },
            {
                "id": "markerSize",
                "formula": "\\max\\left(12,\\min\\left(plotW,plotH\\right)\\cdot0.12\\right)"
            },
            {
                "id": "markerRadius",
                "formula": "\\max\\left(3,markerSize\\cdot0.16\\right)"
            },
            {
                "id": "aspect",
                "formula": "\\max\\left(0.01,characterAspect\\right)"
            },
            {
                "id": "characterW",
                "formula": "markerSize\\cdot\\min\\left(1,aspect\\right)"
            },
            {
                "id": "characterH",
                "formula": "markerSize\\cdot\\min\\left(1,\\frac{1}{aspect}\\right)"
            },
            {
                "id": "characterX",
                "formula": "markerX-\\frac{markerSize-characterW}{2}-characterPivotX\\cdot characterW"
            },
            {
                "id": "characterY",
                "formula": "markerY-\\frac{markerSize-characterH}{2}-characterPivotY\\cdot characterH"
            },
            {
                "id": "radiusLarge",
                "value": {
                    "token": "radius.large"
                }
            },
            {
                "id": "radiusSmall",
                "value": {
                    "token": "radius.small"
                }
            },
            {
                "id": "hairline",
                "value": {
                    "token": "strokeWidth.hairline"
                }
            }
        ],
        "root": {
            "id": "mouse-tracker",
            "type": "group",
            "children": [
                {
                    "id": "body",
                    "type": "rect",
                    "bindings": {
                        "width": {
                            "parameter": "w"
                        },
                        "height": {
                            "parameter": "h"
                        },
                        "cornerRadius": {
                            "parameter": "radiusLarge"
                        },
                        "fill": {
                            "parameter": "backgroundColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        }
                    },
                    "properties": {
                        "x": 0,
                        "y": 0,
                        "strokeWidth": 1
                    }
                },
                {
                    "id": "plot",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "plotX"
                        },
                        "y": {
                            "parameter": "plotY"
                        },
                        "width": {
                            "parameter": "plotW"
                        },
                        "height": {
                            "parameter": "plotH"
                        },
                        "cornerRadius": {
                            "parameter": "radiusSmall"
                        },
                        "fill": {
                            "parameter": "dataAreaColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "hairline"
                        }
                    }
                },
                {
                    "id": "grid",
                    "type": "plot-grid",
                    "when": {
                        "parameter": "showGrid"
                    },
                    "parameters": {
                        "x": {
                            "parameter": "plotX"
                        },
                        "y": {
                            "parameter": "plotY"
                        },
                        "width": {
                            "parameter": "plotW"
                        },
                        "height": {
                            "parameter": "plotH"
                        },
                        "minimumX": {
                            "parameter": "minimumX"
                        },
                        "maximumX": {
                            "parameter": "maximumX"
                        },
                        "minimumY": {
                            "parameter": "minimumY"
                        },
                        "maximumY": {
                            "parameter": "maximumY"
                        },
                        "ticksX": {
                            "parameter": "ticks"
                        },
                        "ticksY": {
                            "parameter": "ticks"
                        },
                        "color": {
                            "parameter": "gridColor"
                        }
                    }
                },
                {
                    "id": "trace",
                    "type": "memory-trace",
                    "parameters": {
                        "rows": {
                            "memory": "samples"
                        },
                        "shownRows": {
                            "parameter": "tracedRows"
                        },
                        "originX": {
                            "parameter": "originX"
                        },
                        "originY": {
                            "parameter": "originY"
                        },
                        "scaleX": {
                            "parameter": "scaleX"
                        },
                        "scaleY": {
                            "parameter": "scaleY"
                        },
                        "color": {
                            "parameter": "traceColor"
                        },
                        "lineWidth": 2
                    }
                },
                {
                    "id": "axes",
                    "type": "plot-axes",
                    "parameters": {
                        "x": {
                            "parameter": "plotX"
                        },
                        "y": {
                            "parameter": "plotY"
                        },
                        "width": {
                            "parameter": "plotW"
                        },
                        "height": {
                            "parameter": "plotH"
                        },
                        "minimumX": {
                            "parameter": "minimumX"
                        },
                        "maximumX": {
                            "parameter": "maximumX"
                        },
                        "minimumY": {
                            "parameter": "minimumY"
                        },
                        "maximumY": {
                            "parameter": "maximumY"
                        },
                        "ticksX": {
                            "parameter": "ticks"
                        },
                        "ticksY": {
                            "parameter": "ticks"
                        },
                        "showTicks": {
                            "parameter": "showTicks"
                        },
                        "showLabels": {
                            "parameter": "showTicks"
                        },
                        "fontSize": {
                            "parameter": "labelFont"
                        },
                        "color": {
                            "parameter": "axisColor"
                        },
                        "labelColor": {
                            "parameter": "labelColor"
                        },
                        "minimumXProperty": {
                            "choose": {
                                "parameter": "autoScale"
                            },
                            "then": "",
                            "otherwise": "minimumX"
                        },
                        "maximumXProperty": {
                            "choose": {
                                "parameter": "autoScale"
                            },
                            "then": "",
                            "otherwise": "maximumX"
                        },
                        "minimumYProperty": {
                            "choose": {
                                "parameter": "yFixed"
                            },
                            "then": "",
                            "otherwise": "minimumY"
                        },
                        "maximumYProperty": {
                            "choose": {
                                "parameter": "yFixed"
                            },
                            "then": "",
                            "otherwise": "maximumY"
                        }
                    }
                },
                {
                    "id": "crosshair",
                    "type": "plot-crosshair",
                    "when": {
                        "parameter": "markerShown"
                    },
                    "parameters": {
                        "x": {
                            "parameter": "plotX"
                        },
                        "y": {
                            "parameter": "plotY"
                        },
                        "width": {
                            "parameter": "plotW"
                        },
                        "height": {
                            "parameter": "plotH"
                        },
                        "minimumX": {
                            "parameter": "minimumX"
                        },
                        "maximumX": {
                            "parameter": "maximumX"
                        },
                        "minimumY": {
                            "parameter": "minimumY"
                        },
                        "maximumY": {
                            "parameter": "maximumY"
                        },
                        "valueX": {
                            "parameter": "valueX"
                        },
                        "valueY": {
                            "parameter": "valueY"
                        },
                        "fontSize": {
                            "parameter": "labelFont"
                        },
                        "color": {
                            "parameter": "axisColor"
                        },
                        "xColor": {
                            "parameter": "xValueColor"
                        },
                        "yColor": {
                            "parameter": "yValueColor"
                        },
                        "badgeColor": {
                            "parameter": "markerColor"
                        },
                        "rows": {
                            "memory": "samples"
                        },
                        "pointColor": {
                            "parameter": "traceColor"
                        },
                        "digits": {
                            "parameter": "precision"
                        }
                    }
                },
                {
                    "id": "marker-dot",
                    "type": "circle",
                    "when": {
                        "choose": {
                            "parameter": "characterImage"
                        },
                        "then": 0,
                        "otherwise": {
                            "parameter": "markerShown"
                        }
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "markerX"
                        },
                        "centerY": {
                            "parameter": "markerY"
                        },
                        "radius": {
                            "parameter": "markerRadius"
                        },
                        "fill": {
                            "parameter": "markerColor"
                        }
                    }
                },
                {
                    "id": "marker-character",
                    "type": "image",
                    "when": {
                        "choose": {
                            "parameter": "characterImage"
                        },
                        "then": {
                            "parameter": "markerShown"
                        },
                        "otherwise": 0
                    },
                    "bindings": {
                        "x": {
                            "parameter": "characterX"
                        },
                        "y": {
                            "parameter": "characterY"
                        },
                        "width": {
                            "parameter": "markerSize"
                        },
                        "height": {
                            "parameter": "markerSize"
                        },
                        "href": {
                            "parameter": "characterImage"
                        }
                    },
                    "properties": {
                        "preserveAspectRatio": "xMidYMid meet"
                    }
                },
                {
                    "id": "capture",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "plotX"
                        },
                        "y": {
                            "parameter": "plotY"
                        },
                        "width": {
                            "parameter": "plotW"
                        },
                        "height": {
                            "parameter": "plotH"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "behaviours": [
                        {
                            "type": "track-pointer",
                            "memory": "samples",
                            "mode": "append",
                            "limit": 600,
                            "minimumMovePixels": 2,
                            "breakOnDrag": true,
                            "originX": {
                                "parameter": "originX"
                            },
                            "originY": {
                                "parameter": "originY"
                            },
                            "scaleX": {
                                "parameter": "scaleX"
                            },
                            "scaleY": {
                                "parameter": "scaleY"
                            },
                            "minimumX": {
                                "parameter": "minimumX"
                            },
                            "maximumX": {
                                "parameter": "maximumX"
                            },
                            "minimumY": {
                                "parameter": "minimumY"
                            },
                            "maximumY": {
                                "parameter": "maximumY"
                            }
                        },
                        {
                            "type": "follow-pointer",
                            "xParameter": "hoverX",
                            "yParameter": "hoverY",
                            "activeParameter": "hovering",
                            "originX": {
                                "parameter": "originX"
                            },
                            "originY": {
                                "parameter": "originY"
                            },
                            "scaleX": {
                                "parameter": "scaleX"
                            },
                            "scaleY": {
                                "parameter": "scaleY"
                            },
                            "minimumX": {
                                "parameter": "minimumX"
                            },
                            "maximumX": {
                                "parameter": "maximumX"
                            },
                            "minimumY": {
                                "parameter": "minimumY"
                            },
                            "maximumY": {
                                "parameter": "maximumY"
                            }
                        }
                    ]
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
        "preview": {
            "parameters": {
                "angleVariable": "35",
                "lengthScale": 48,
                "showProjections": true
            }
        },
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
        "preview": {
            "parameters": {
                "valueVariable": "64",
                "unit": "km/h"
            }
        },
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
