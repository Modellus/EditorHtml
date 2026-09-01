// Generated from scripts/blocks/definitions/*.json by tests/component-definitions.spec.js.
// Do not edit by hand: change the JSON and run `UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js`.
BlockDefinitionLoader.registerAll([
    {
        "schemaVersion": "1.0.0",
        "type": "calculator",
        "category": "component",
        "displayName": "Calculator",
        "description": "Calculator whose working is held by the object itself: four functions on a narrow one, and a scientific pad of powers, roots, trigonometry and logarithms beside the digits once it is wide enough to hold one. Term keys load the value a model variable has at the iteration on screen, the result can be written back into a model variable, and every completed operation is kept in a history the object remembers and can be read back from.",
        "icon": "fa-light fa-calculator",
        "tags": [
            "object",
            "calculator",
            "keypad",
            "arithmetic",
            "reads-model",
            "memory",
            "history",
            "scientific",
            "trigonometry",
            "logarithm"
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
                "id": "inv",
                "label": "Second function",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "description": "Set while the second-function key is on, so the next function key does the inverse of the one it names. The key that uses it puts it out again."
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
                "label": "Result",
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
                "id": "scientific",
                "label": "Scientific keys",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "description": "Puts the pad of function keys beside the digits: powers and roots, the trigonometric functions, the logarithms, π and e, and a second-function key that turns each of them into its inverse. The pad needs room of its own, so it is drawn only once the keypad is wide enough to take two more columns without the keys becoming too small to read — a narrow calculator stays the four-function one, and widening it is what brings the pad out."
            },
            {
                "id": "angleUnit",
                "label": "Angle unit",
                "valueType": "string",
                "defaultValue": "radians",
                "enumValues": [
                    "radians",
                    "degrees"
                ],
                "category": "display",
                "description": "Which unit the trigonometric keys read an angle in, and give one back in. A model works in radians, so that is what the calculator starts in; degrees is for an angle read off a drawing or written on a page. Whichever is in force is named on the display, since the same number is two different angles under the two."
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
                "id": "sciRoom",
                "formula": "\\left\\lfloor\\min\\left(1,\\max\\left(0,contentW-200\\right)\\right)\\right\\rfloor"
            },
            {
                "id": "sciOn",
                "value": {
                    "choose": {
                        "parameter": "scientific"
                    },
                    "then": {
                        "parameter": "sciRoom"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "sciCols",
                "formula": "2\\cdot sciOn"
            },
            {
                "id": "cols",
                "formula": "4+sciCols"
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
                "formula": "\\frac{contentW-\\left(cols-1\\right)\\cdot gap}{cols}"
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
                "id": "padX",
                "formula": "pad+sciCols\\cdot colStep"
            },
            {
                "id": "rowStep",
                "formula": "keyH+gap"
            },
            {
                "id": "x1",
                "formula": "padX"
            },
            {
                "id": "x2",
                "formula": "padX+colStep"
            },
            {
                "id": "x3",
                "formula": "padX+2\\cdot colStep"
            },
            {
                "id": "x4",
                "formula": "padX+3\\cdot colStep"
            },
            {
                "id": "sx1",
                "formula": "pad"
            },
            {
                "id": "sx2",
                "formula": "pad+colStep"
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
                "id": "sciFont",
                "formula": "\\max\\left(7,\\min\\left(keyFont,\\left(keyW-4\\right)\\cdot0.36\\right)\\right)"
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
                "id": "degrees",
                "value": {
                    "choose": {
                        "parameter": "angleUnit"
                    },
                    "equals": "degrees",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "toRadians",
                "value": {
                    "choose": {
                        "parameter": "degrees"
                    },
                    "then": {
                        "formula": "\\frac{\\pi}{180}"
                    },
                    "otherwise": 1
                }
            },
            {
                "id": "fromRadians",
                "value": {
                    "choose": {
                        "parameter": "degrees"
                    },
                    "then": {
                        "formula": "\\frac{180}{\\pi}"
                    },
                    "otherwise": 1
                }
            },
            {
                "id": "eulerE",
                "value": 2.718281828459045
            },
            {
                "id": "statusText",
                "value": {
                    "concat": [
                        {
                            "choose": {
                                "parameter": "degrees"
                            },
                            "then": "DEG",
                            "otherwise": "RAD"
                        },
                        {
                            "choose": {
                                "parameter": "inv"
                            },
                            "then": "  INV",
                            "otherwise": ""
                        }
                    ]
                }
            },
            {
                "id": "statusX",
                "formula": "pad+8"
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
                                    "choose": {
                                        "formula": "p-5"
                                    },
                                    "then": {
                                        "choose": {
                                            "formula": "p-6"
                                        },
                                        "then": {
                                            "parameter": "n"
                                        },
                                        "otherwise": {
                                            "formula": "a^{\\frac{1}{n}}"
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "a^{n}"
                                    }
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
                                "then": {
                                    "choose": {
                                        "formula": "p-5"
                                    },
                                    "then": {
                                        "choose": {
                                            "formula": "p-6"
                                        },
                                        "then": "",
                                        "otherwise": "ⁿ√"
                                    },
                                    "otherwise": "^"
                                },
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
                    "id": "status",
                    "type": "text",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "statusX"
                        },
                        "y": {
                            "parameter": "tapeY"
                        },
                        "text": {
                            "parameter": "statusText"
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
                        "textAnchor": "start",
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
                                    "formula": "padX+\\mod\\left(i,3\\right)\\cdot colStep",
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
                    "id": "key-inverse",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx1"
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
                                "label": "INV",
                                "fill": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": {
                                        "parameter": "accentColor"
                                    },
                                    "otherwise": {
                                        "parameter": "functionKeyColor"
                                    }
                                },
                                "borderColor": {
                                    "parameter": "borderColor"
                                },
                                "cornerRadius": {
                                    "parameter": "radiusMedium"
                                },
                                "labelColor": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": {
                                        "parameter": "accentTextColor"
                                    },
                                    "otherwise": {
                                        "parameter": "textColor"
                                    }
                                },
                                "fontSize": {
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The next key does what it names rather than the inverse of it",
                                "otherwise": "The next function key does the inverse of what it names"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": {
                                "formula": "1-inv"
                            }
                        }
                    ]
                },
                {
                    "id": "key-constant",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx2"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "e",
                                    "otherwise": "π"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "e onto the display",
                                "otherwise": "π onto the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "eulerE"
                                },
                                "otherwise": {
                                    "formula": "\\pi"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-square",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx1"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "√x",
                                    "otherwise": "x²"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The square root of the number on the display",
                                "otherwise": "The number on the display, squared"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "\\sqrt{n}"
                                },
                                "otherwise": {
                                    "formula": "n^{2}"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-power",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx2"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "ⁿ√x",
                                    "otherwise": "xⁿ"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The root of the number on the display, of the order typed next",
                                "otherwise": "The number on the display raised to the power typed next"
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
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": 6,
                                "otherwise": 5
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
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "fresh",
                            "value": 0
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-sin",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx1"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "sin⁻¹",
                                    "otherwise": "sin"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The angle whose sine is on the display",
                                "otherwise": "The sine of the angle on the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "\\arcsin\\left(n\\right)\\cdot fromRadians"
                                },
                                "otherwise": {
                                    "formula": "\\sin\\left(n\\cdot toRadians\\right)"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-cos",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx2"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "cos⁻¹",
                                    "otherwise": "cos"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The angle whose cosine is on the display",
                                "otherwise": "The cosine of the angle on the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "\\arccos\\left(n\\right)\\cdot fromRadians"
                                },
                                "otherwise": {
                                    "formula": "\\cos\\left(n\\cdot toRadians\\right)"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-tan",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx1"
                                },
                                "y": {
                                    "parameter": "y4"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "tan⁻¹",
                                    "otherwise": "tan"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "The angle whose tangent is on the display",
                                "otherwise": "The tangent of the angle on the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "\\arctan\\left(n\\right)\\cdot fromRadians"
                                },
                                "otherwise": {
                                    "formula": "\\tan\\left(n\\cdot toRadians\\right)"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-reciprocal",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx2"
                                },
                                "y": {
                                    "parameter": "y4"
                                },
                                "width": {
                                    "parameter": "keyW"
                                },
                                "height": {
                                    "parameter": "keyH"
                                },
                                "label": "1/x",
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": "One divided by the number on the display"
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "formula": "\\frac{1}{n}"
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-ln",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx1"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "eˣ",
                                    "otherwise": "ln"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "e raised to the number on the display",
                                "otherwise": "The natural logarithm of the number on the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "eulerE^{n}"
                                },
                                "otherwise": {
                                    "formula": "\\ln\\left(n\\right)"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
                            "value": 0
                        }
                    ]
                },
                {
                    "id": "key-log",
                    "type": "group",
                    "when": {
                        "parameter": "sciOn"
                    },
                    "children": [
                        {
                            "id": "cap",
                            "type": "key-cap",
                            "parameters": {
                                "x": {
                                    "parameter": "sx2"
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
                                "label": {
                                    "choose": {
                                        "parameter": "inv"
                                    },
                                    "then": "10ˣ",
                                    "otherwise": "log"
                                },
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
                                    "parameter": "sciFont"
                                }
                            }
                        }
                    ],
                    "behaviours": [
                        {
                            "type": "tooltip",
                            "text": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": "Ten raised to the number on the display",
                                "otherwise": "The logarithm to base ten of the number on the display"
                            }
                        },
                        {
                            "type": "clickable",
                            "property": "n",
                            "value": {
                                "choose": {
                                    "parameter": "inv"
                                },
                                "then": {
                                    "formula": "10^{n}"
                                },
                                "otherwise": {
                                    "formula": "\\log\\left(n\\right)"
                                }
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
                        },
                        {
                            "type": "clickable",
                            "property": "inv",
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
                "label": "Value",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unitParameter": "unit"
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
                "category": "display",
                "description": "What the reading is named in when the term it reads names nothing of its own. A term carrying a unit is read in that one, picked beside the term the way every unit on the board is, so this is what is left for a gauge standing at a plain number."
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
                "id": "readoutUnit",
                "fallback": "",
                "value": {
                    "choose": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "then": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "otherwise": {
                        "parameter": "unit"
                    }
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "format": {
                        "parameter": "value"
                    },
                    "digits": {
                        "parameter": "digits"
                    }
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
                        "unit": {
                            "parameter": "readoutUnit"
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
        "type": "clock",
        "aliases": [
            "analogue-clock"
        ],
        "category": "component",
        "displayName": "Clock",
        "description": "Clock reading the hour, minute, second and millisecond a model gives it, or reading the model's own time as a count of seconds, shown either as a face with a hand for each or as a digital readout of the same time. The seconds and the milliseconds can each be left out, and what is left out goes from the face and from the readout alike. Run by its own keys it is a stopwatch: one key starts and holds it, one takes a lap, and one ends the run — and the laps it has taken are kept in a list of their own under the face.",
        "icon": "fa-light fa-clock",
        "tags": [
            "object",
            "clock",
            "time",
            "dial",
            "hands",
            "digital",
            "readout",
            "stopwatch",
            "lap"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model",
            "textual",
            "interaction",
            "memory"
        ],
        "parameters": [
            {
                "id": "syncedWithPlayer",
                "label": "Use independent",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "model",
                "description": "Where the whole clock reads its time from: the terms the rows below name, or the model's own clock — the independent variable, whatever the model has called it — taken as a count of seconds. Synced, the four parts are worked out from it rather than named, so a model that never mentions an hour still keeps one and the hands move with the run rather than with anything the model was asked to write; the rows that name the parts leave the menu, since there is nothing left for them to name. Left off, each part names a term of its own and the clock is only as fast as the model keeps them."
            },
            {
                "id": "hourVariable",
                "label": "Hour",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "disabledWhen": {
                    "parameter": "syncedWithPlayer"
                },
                "disabledTerm": "$independent",
                "colorParameter": "hourColor",
                "description": "Model variable or number giving the hour."
            },
            {
                "id": "minuteVariable",
                "label": "Minute",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "disabledWhen": {
                    "parameter": "syncedWithPlayer"
                },
                "disabledTerm": "$independent",
                "colorParameter": "minuteColor",
                "description": "Model variable or number giving the minute."
            },
            {
                "id": "secondVariable",
                "label": "Second",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "disabledWhen": {
                    "parameter": "syncedWithPlayer"
                },
                "disabledTerm": "$independent",
                "colorParameter": "secondColor",
                "description": "Model variable or number giving the second."
            },
            {
                "id": "millisecondVariable",
                "label": "Millisecond",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "disabledWhen": {
                    "parameter": "syncedWithPlayer"
                },
                "disabledTerm": "$independent",
                "colorParameter": "millisecondColor",
                "description": "Model variable or number giving the thousandth of a second. A thousand of them is one turn of the millisecond hand, and the three digits after the seconds in the readout."
            },
            {
                "id": "shownAs",
                "label": "Shown as",
                "valueType": "string",
                "defaultValue": "analogue",
                "enumValues": [
                    "analogue",
                    "digital"
                ],
                "enumIcons": [
                    "fa-light fa-clock",
                    "fa-light fa-input-numeric"
                ],
                "category": "display",
                "userEditable": false,
                "toolbarKey": true,
                "toolbarTooltip": "Clock Display Tooltip",
                "description": "Whether the time is shown as a face with hands or as digits on a panel. It is chosen from a key of its own in the toolbar rather than from a row in the settings, since it decides which of the settings are worth offering at all: the face keeps the numbers, the ticks and the dragging, and the readout keeps none of them. Both read the same variables and both leave out whatever the seconds and the milliseconds are switched off for."
            },
            {
                "id": "showControls",
                "label": "Buttons",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "description": "Whether the clock carries the three keys that run it, in a strip of its own under the face or the panel: the first sets it counting real time from wherever it stands and holds it there when it is pressed again, the second takes a lap — the reading as it stands, kept in the lap list — and the third ends the run, clears the reading and forgets the laps. What it counts goes into the terms the four rows name — or into the numbers they hold, for a clock bound to nothing. A clock reading the model's own time is not counted by these keys, since the model is what moves it; its lap key still works."
            },
            {
                "id": "showLaps",
                "label": "Show laps",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "visibleWhen": {
                    "parameter": "showControls"
                },
                "description": "Whether the readings the lap key has taken are listed under the keys, newest first, each as the time it was taken at. The list is what the lap key writes into and what the stop key empties."
            },
            {
                "id": "faceColor",
                "label": "Face",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style",
                "description": "The face the hands turn over, and the panel the digits are read on."
            },
            {
                "id": "borderColor",
                "label": "Border",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style"
            },
            {
                "id": "hourColor",
                "label": "Hour",
                "valueType": "colour",
                "defaultValue": "token:stroke.strong",
                "category": "style",
                "description": "The colour the hour is read in, whichever way the clock is drawn: the hour hand on the face, and the first field of the digits. It is chosen on the hour's own row rather than from the colour menu, so the reading and the colour it is read in are named together. Left with no colour at all, the hour is not drawn."
            },
            {
                "id": "minuteColor",
                "label": "Minute",
                "valueType": "colour",
                "defaultValue": "token:stroke.strong",
                "category": "style",
                "description": "The colour the minute is read in: the minute hand, and the field after the first colon."
            },
            {
                "id": "secondColor",
                "label": "Second",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style",
                "description": "The colour the seconds are read in. Clear it and the clock stops reading seconds at all: the hand goes from the face and the field after the minutes goes from the readout, so a clock is coarsened by unpainting it rather than by a switch of its own."
            },
            {
                "id": "millisecondColor",
                "label": "Millisecond",
                "valueType": "colour",
                "defaultValue": "#00000000",
                "category": "style",
                "description": "The colour the thousandths are read in. It starts clear, so a clock reads no thousandths until one is chosen; give it a colour and a hand of its own appears, round once a second, with three more digits after the seconds in the readout. The face carries no marks for them — the hand is read against the same ring the second hand is."
            },
            {
                "id": "numberColor",
                "label": "Number",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style",
                "description": "The numbers around the face, and the colons and the point between the fields of the readout. Clear it and the face carries no numbers and the readout no marks between its fields — a value is left out by being unpainted, the way every other part of the clock is. What each field itself is read in is chosen on that part's own row."
            },
            {
                "id": "buttonColor",
                "label": "Button",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showControls"
                },
                "description": "The faces of the three keys. Their marks are drawn in the border colour, and the key the clock is on is drawn the other way about — mark for face — so the reader can see it counting."
            },
            {
                "id": "running",
                "label": "Running",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "description": "Whether the clock is counting, kept by the object while the board is open. It is what turns the first key from a play mark into a pause one, and it is never written down: a file remembers no clock left running, and a model opened again opens standing still."
            },
            {
                "id": "laps",
                "label": "Laps",
                "valueType": "memory",
                "defaultValue": [],
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "description": "The readings the lap key has taken, oldest first: each row is the time as it read, and the seconds it stood at. It is carried by the file the way any other value is, so the laps of a run are still there when the model is opened again."
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
                "id": "controlsRead",
                "value": {
                    "choose": {
                        "parameter": "showControls"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "lapsRead",
                "value": {
                    "choose": {
                        "parameter": "showLaps"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "lapsShown",
                "formula": "controlsRead\\cdot lapsRead"
            },
            {
                "id": "controlStrip",
                "formula": "controlsRead\\cdot\\min\\left(0.26\\cdot h,0.22\\cdot w\\right)"
            },
            {
                "id": "lapStrip",
                "formula": "lapsShown\\cdot\\min\\left(0.34\\cdot h,0.6\\cdot w\\right)"
            },
            {
                "id": "faceHeight",
                "formula": "h-controlStrip-lapStrip"
            },
            {
                "id": "cx",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "cy",
                "formula": "\\frac{faceHeight}{2}"
            },
            {
                "id": "r",
                "formula": "\\max\\left(4,\\frac{\\min\\left(w,faceHeight\\right)}{2}-6\\right)"
            },
            {
                "id": "readsIndependent",
                "value": {
                    "choose": {
                        "parameter": "syncedWithPlayer"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "readsParts",
                "formula": "1-readsIndependent"
            },
            {
                "id": "independentValue",
                "value": {
                    "independent": "value"
                }
            },
            {
                "id": "modelSeconds",
                "formula": "\\max\\left(0,independentValue\\right)"
            },
            {
                "id": "hourParts",
                "value": {
                    "parameter": "hourVariable",
                    "as": "number"
                }
            },
            {
                "id": "minuteParts",
                "value": {
                    "parameter": "minuteVariable",
                    "as": "number"
                }
            },
            {
                "id": "secondParts",
                "value": {
                    "parameter": "secondVariable",
                    "as": "number"
                }
            },
            {
                "id": "millisecondParts",
                "value": {
                    "parameter": "millisecondVariable",
                    "as": "number"
                }
            },
            {
                "id": "hourHeld",
                "formula": "hourParts"
            },
            {
                "id": "minuteHeld",
                "formula": "minuteParts"
            },
            {
                "id": "secondHeld",
                "formula": "secondParts"
            },
            {
                "id": "millisecondHeld",
                "formula": "millisecondParts"
            },
            {
                "id": "hours",
                "formula": "readsParts\\cdot hourHeld+readsIndependent\\cdot\\lfloor\\frac{modelSeconds}{3600}\\rfloor"
            },
            {
                "id": "minutes",
                "formula": "readsParts\\cdot minuteHeld+readsIndependent\\cdot\\mod\\left(\\lfloor\\frac{modelSeconds}{60}\\rfloor,60\\right)"
            },
            {
                "id": "seconds",
                "formula": "readsParts\\cdot secondHeld+readsIndependent\\cdot\\mod\\left(\\lfloor modelSeconds\\rfloor,60\\right)"
            },
            {
                "id": "milliseconds",
                "formula": "readsParts\\cdot millisecondHeld+readsIndependent\\cdot\\lfloor\\mod\\left(modelSeconds,1\\right)\\cdot1000\\rfloor"
            },
            {
                "id": "shownAsFace",
                "value": {
                    "choose": {
                        "parameter": "shownAs"
                    },
                    "equals": "analogue",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "shownAsDigits",
                "formula": "1-shownAsFace"
            },
            {
                "id": "secondsRead",
                "value": {
                    "opaque": {
                        "parameter": "secondColor"
                    }
                }
            },
            {
                "id": "millisecondsRead",
                "value": {
                    "opaque": {
                        "parameter": "millisecondColor"
                    }
                }
            },
            {
                "id": "numbersRead",
                "value": {
                    "opaque": {
                        "parameter": "numberColor"
                    }
                }
            },
            {
                "id": "faceNumbersShown",
                "formula": "shownAsFace\\cdot numbersRead"
            },
            {
                "id": "faceTicksShown",
                "formula": "shownAsFace"
            },
            {
                "id": "secondHandShown",
                "formula": "shownAsFace\\cdot secondsRead"
            },
            {
                "id": "millisecondHandShown",
                "formula": "shownAsFace\\cdot millisecondsRead"
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
                "id": "secondDragOffset",
                "formula": "\\frac{\\mod\\left(milliseconds,1000\\right)}{1000}\\cdot6"
            },
            {
                "id": "secondAngle",
                "formula": "\\mod\\left(seconds+\\frac{milliseconds}{1000},60\\right)\\cdot6"
            },
            {
                "id": "millisecondAngle",
                "formula": "\\mod\\left(milliseconds,1000\\right)\\cdot0.36"
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
                "id": "millisecondHandLength",
                "formula": "r\\cdot0.88"
            },
            {
                "id": "millisecondHandTail",
                "formula": "r\\cdot0.24"
            },
            {
                "id": "millisecondHandWidth",
                "formula": "\\max\\left(0.75,r\\cdot0.014\\right)"
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
                        "parameter": "readsParts"
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
                        "parameter": "readsParts"
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
                        "parameter": "readsParts"
                    },
                    "then": {
                        "parameter": "secondVariable"
                    },
                    "otherwise": ""
                }
            },
            {
                "id": "millisecondDrag",
                "value": {
                    "choose": {
                        "parameter": "readsParts"
                    },
                    "then": {
                        "parameter": "millisecondVariable"
                    },
                    "otherwise": ""
                }
            },
            {
                "id": "hourNumber",
                "formula": "\\mod\\left(\\mod\\left(\\lfloor hours\\rfloor,24\\right)+24,24\\right)"
            },
            {
                "id": "minuteNumber",
                "formula": "\\mod\\left(\\mod\\left(\\lfloor minutes\\rfloor,60\\right)+60,60\\right)"
            },
            {
                "id": "secondNumber",
                "formula": "\\mod\\left(\\mod\\left(\\lfloor seconds\\rfloor,60\\right)+60,60\\right)"
            },
            {
                "id": "millisecondNumber",
                "formula": "\\mod\\left(\\mod\\left(\\lfloor milliseconds\\rfloor,1000\\right)+1000,1000\\right)"
            },
            {
                "id": "hourPad",
                "formula": "1-\\min\\left(1,\\lfloor\\frac{hourNumber}{10}\\rfloor\\right)"
            },
            {
                "id": "minutePad",
                "formula": "1-\\min\\left(1,\\lfloor\\frac{minuteNumber}{10}\\rfloor\\right)"
            },
            {
                "id": "secondPad",
                "formula": "1-\\min\\left(1,\\lfloor\\frac{secondNumber}{10}\\rfloor\\right)"
            },
            {
                "id": "millisecondHundredsPad",
                "formula": "1-\\min\\left(1,\\lfloor\\frac{millisecondNumber}{100}\\rfloor\\right)"
            },
            {
                "id": "millisecondTensPad",
                "formula": "1-\\min\\left(1,\\lfloor\\frac{millisecondNumber}{10}\\rfloor\\right)"
            },
            {
                "id": "hourText",
                "value": {
                    "concat": [
                        {
                            "choose": {
                                "parameter": "hourPad"
                            },
                            "then": "0",
                            "otherwise": ""
                        },
                        {
                            "format": {
                                "parameter": "hourNumber"
                            },
                            "digits": 0
                        }
                    ]
                }
            },
            {
                "id": "minuteText",
                "value": {
                    "concat": [
                        {
                            "choose": {
                                "parameter": "minutePad"
                            },
                            "then": "0",
                            "otherwise": ""
                        },
                        {
                            "format": {
                                "parameter": "minuteNumber"
                            },
                            "digits": 0
                        }
                    ]
                }
            },
            {
                "id": "secondText",
                "value": {
                    "concat": [
                        {
                            "choose": {
                                "parameter": "secondPad"
                            },
                            "then": "0",
                            "otherwise": ""
                        },
                        {
                            "format": {
                                "parameter": "secondNumber"
                            },
                            "digits": 0
                        }
                    ]
                }
            },
            {
                "id": "millisecondText",
                "value": {
                    "concat": [
                        {
                            "choose": {
                                "parameter": "millisecondHundredsPad"
                            },
                            "then": "0",
                            "otherwise": ""
                        },
                        {
                            "choose": {
                                "parameter": "millisecondTensPad"
                            },
                            "then": "0",
                            "otherwise": ""
                        },
                        {
                            "format": {
                                "parameter": "millisecondNumber"
                            },
                            "digits": 0
                        }
                    ]
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "concat": [
                        {
                            "parameter": "hourText"
                        },
                        ":",
                        {
                            "parameter": "minuteText"
                        },
                        {
                            "choose": {
                                "parameter": "secondsRead"
                            },
                            "then": {
                                "concat": [
                                    ":",
                                    {
                                        "parameter": "secondText"
                                    }
                                ]
                            },
                            "otherwise": ""
                        },
                        {
                            "choose": {
                                "parameter": "millisecondsRead"
                            },
                            "then": {
                                "concat": [
                                    ".",
                                    {
                                        "parameter": "millisecondText"
                                    }
                                ]
                            },
                            "otherwise": ""
                        }
                    ]
                }
            },
            {
                "id": "readoutColors",
                "value": {
                    "concat": [
                        {
                            "parameter": "hourColor"
                        },
                        " ",
                        {
                            "parameter": "hourColor"
                        },
                        " ",
                        {
                            "parameter": "numberColor"
                        },
                        " ",
                        {
                            "parameter": "minuteColor"
                        },
                        " ",
                        {
                            "parameter": "minuteColor"
                        },
                        {
                            "choose": {
                                "parameter": "secondsRead"
                            },
                            "then": {
                                "concat": [
                                    " ",
                                    {
                                        "parameter": "numberColor"
                                    },
                                    " ",
                                    {
                                        "parameter": "secondColor"
                                    },
                                    " ",
                                    {
                                        "parameter": "secondColor"
                                    }
                                ]
                            },
                            "otherwise": ""
                        },
                        {
                            "choose": {
                                "parameter": "millisecondsRead"
                            },
                            "then": {
                                "concat": [
                                    " ",
                                    {
                                        "parameter": "numberColor"
                                    },
                                    " ",
                                    {
                                        "parameter": "millisecondColor"
                                    },
                                    " ",
                                    {
                                        "parameter": "millisecondColor"
                                    },
                                    " ",
                                    {
                                        "parameter": "millisecondColor"
                                    }
                                ]
                            },
                            "otherwise": ""
                        }
                    ]
                }
            },
            {
                "id": "digitCount",
                "formula": "5+3\\cdot secondsRead+4\\cdot millisecondsRead"
            },
            {
                "id": "digitFactor",
                "formula": "4.45+2.45\\cdot secondsRead+3.45\\cdot millisecondsRead"
            },
            {
                "id": "digitSpan",
                "formula": "0.56\\cdot digitFactor+0.14\\cdot\\left(digitCount-1\\right)"
            },
            {
                "id": "panelInset",
                "formula": "\\max\\left(2,\\frac{\\min\\left(w,faceHeight\\right)}{25}\\right)"
            },
            {
                "id": "panelWidth",
                "formula": "w-2\\cdot panelInset"
            },
            {
                "id": "readoutX",
                "formula": "2.5\\cdot panelInset"
            },
            {
                "id": "readoutWidth",
                "formula": "w-5\\cdot panelInset"
            },
            {
                "id": "digitHeight",
                "formula": "\\min\\left(\\left(faceHeight-2\\cdot panelInset\\right)\\cdot0.62,\\frac{readoutWidth}{digitSpan}\\right)"
            },
            {
                "id": "readoutY",
                "formula": "\\frac{faceHeight-digitHeight}{2}"
            },
            {
                "id": "panelHeight",
                "formula": "\\min\\left(faceHeight-2\\cdot panelInset,digitHeight\\cdot1.7\\right)"
            },
            {
                "id": "panelY",
                "formula": "\\frac{faceHeight-panelHeight}{2}"
            },
            {
                "id": "panelRadius",
                "value": {
                    "token": "radius.large"
                }
            },
            {
                "id": "buttonSize",
                "formula": "\\min\\left(0.7\\cdot controlStrip,\\frac{w}{4.2}\\right)"
            },
            {
                "id": "buttonScale",
                "formula": "\\frac{buttonSize}{100}"
            },
            {
                "id": "buttonGap",
                "formula": "0.3\\cdot buttonSize"
            },
            {
                "id": "keyCount",
                "formula": "1+2\\cdot readsParts"
            },
            {
                "id": "buttonRun",
                "formula": "keyCount\\cdot buttonSize+\\left(keyCount-1\\right)\\cdot buttonGap"
            },
            {
                "id": "buttonY",
                "formula": "faceHeight+\\frac{controlStrip-buttonSize}{2}"
            },
            {
                "id": "buttonX1",
                "formula": "\\frac{w-buttonRun}{2}"
            },
            {
                "id": "lapX",
                "formula": "buttonX1+readsParts\\cdot\\left(buttonSize+buttonGap\\right)"
            },
            {
                "id": "stopShown",
                "formula": "readsParts"
            },
            {
                "id": "stopX",
                "formula": "lapX+buttonSize+buttonGap"
            },
            {
                "id": "buttonEdge",
                "value": {
                    "token": "strokeWidth.default"
                }
            },
            {
                "id": "buttonEdgeArt",
                "formula": "\\frac{100\\cdot buttonEdge}{\\max\\left(1,buttonSize\\right)}"
            },
            {
                "id": "transportShown",
                "formula": "readsParts"
            },
            {
                "id": "runningRead",
                "value": {
                    "choose": {
                        "parameter": "running"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "haltedRead",
                "formula": "1-runningRead"
            },
            {
                "id": "playFace",
                "value": {
                    "choose": {
                        "parameter": "running"
                    },
                    "then": {
                        "parameter": "borderColor"
                    },
                    "otherwise": {
                        "parameter": "buttonColor"
                    }
                }
            },
            {
                "id": "playMark",
                "value": {
                    "choose": {
                        "parameter": "running"
                    },
                    "then": {
                        "parameter": "buttonColor"
                    },
                    "otherwise": {
                        "parameter": "borderColor"
                    }
                }
            },
            {
                "id": "runInterval",
                "formula": "33\\cdot millisecondsRead+100\\cdot\\left(1-millisecondsRead\\right)"
            },
            {
                "id": "lapPad",
                "formula": "\\max\\left(2,\\frac{w}{30}\\right)"
            },
            {
                "id": "lapListX",
                "formula": "lapPad"
            },
            {
                "id": "lapListY",
                "formula": "faceHeight+controlStrip+lapPad"
            },
            {
                "id": "lapListW",
                "formula": "w-2\\cdot lapPad"
            },
            {
                "id": "lapListRight",
                "formula": "lapListX+lapListW"
            },
            {
                "id": "lapListH",
                "formula": "\\max\\left(0,lapStrip-2\\cdot lapPad\\right)"
            },
            {
                "id": "lapRowH",
                "formula": "\\max\\left(8,\\frac{lapListH}{4}\\right)"
            },
            {
                "id": "lapFont",
                "formula": "\\max\\left(6,0.5\\cdot lapRowH\\right)"
            },
            {
                "id": "lapRuleY",
                "formula": "faceHeight+controlStrip"
            },
            {
                "id": "lapSeconds",
                "formula": "3600\\cdot hours+60\\cdot minutes+seconds+\\frac{milliseconds}{1000}"
            }
        ],
        "root": {
            "id": "clock",
            "type": "group",
            "children": [
                {
                    "id": "face",
                    "type": "dial-face",
                    "when": {
                        "parameter": "shownAsFace"
                    },
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
                    "when": {
                        "parameter": "shownAsFace"
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
                        "parameter": "faceTicksShown"
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
                        "parameter": "faceNumbersShown"
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
                    "when": {
                        "parameter": "shownAsFace"
                    },
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
                            "parameter": "hourColor"
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
                    "when": {
                        "parameter": "shownAsFace"
                    },
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
                            "parameter": "minuteColor"
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
                        "parameter": "secondHandShown"
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
                            "parameter": "secondColor"
                        },
                        "style": "line",
                        "dragVariable": {
                            "parameter": "secondDrag"
                        },
                        "dragProperty": "secondVariable",
                        "degreesPerUnit": 6,
                        "offsetDegrees": {
                            "parameter": "secondDragOffset"
                        },
                        "wrapAt": 60
                    }
                },
                {
                    "id": "millisecond-hand",
                    "type": "pointer-hand",
                    "when": {
                        "parameter": "millisecondHandShown"
                    },
                    "parameters": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "angle": {
                            "parameter": "millisecondAngle"
                        },
                        "length": {
                            "parameter": "millisecondHandLength"
                        },
                        "tailLength": {
                            "parameter": "millisecondHandTail"
                        },
                        "width": {
                            "parameter": "millisecondHandWidth"
                        },
                        "color": {
                            "parameter": "millisecondColor"
                        },
                        "style": "line",
                        "dragVariable": {
                            "parameter": "millisecondDrag"
                        },
                        "dragProperty": "millisecondVariable",
                        "degreesPerUnit": 0.36,
                        "wrapAt": 1000
                    }
                },
                {
                    "id": "centre-cap",
                    "type": "circle",
                    "when": {
                        "parameter": "shownAsFace"
                    },
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
                            "parameter": "hourColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "digital",
                    "type": "group",
                    "when": {
                        "parameter": "shownAsDigits"
                    },
                    "children": [
                        {
                            "id": "panel",
                            "type": "rect",
                            "properties": {
                                "x": 0,
                                "y": 0,
                                "width": 100,
                                "height": 40,
                                "cornerRadius": 8,
                                "fill": "token:surface.default",
                                "stroke": "token:stroke.default",
                                "strokeWidth": 2
                            },
                            "bindings": {
                                "x": {
                                    "parameter": "panelInset"
                                },
                                "y": {
                                    "parameter": "panelY"
                                },
                                "width": {
                                    "parameter": "panelWidth"
                                },
                                "height": {
                                    "parameter": "panelHeight"
                                },
                                "cornerRadius": {
                                    "parameter": "panelRadius"
                                },
                                "fill": {
                                    "parameter": "faceColor"
                                },
                                "stroke": {
                                    "parameter": "borderColor"
                                },
                                "strokeWidth": {
                                    "parameter": "strokeStrong"
                                }
                            }
                        },
                        {
                            "id": "readout",
                            "type": "seven-segment-display",
                            "parameters": {
                                "x": {
                                    "parameter": "readoutX"
                                },
                                "y": {
                                    "parameter": "readoutY"
                                },
                                "width": {
                                    "parameter": "readoutWidth"
                                },
                                "height": {
                                    "parameter": "digitHeight"
                                },
                                "text": {
                                    "parameter": "readoutText"
                                },
                                "color": {
                                    "parameter": "numberColor"
                                },
                                "colors": {
                                    "parameter": "readoutColors"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": "controls",
                    "type": "group",
                    "when": {
                        "parameter": "showControls"
                    },
                    "children": [
                        {
                            "id": "play-key",
                            "type": "group",
                            "when": {
                                "parameter": "transportShown"
                            },
                            "modifiers": [
                                {
                                    "type": "translate",
                                    "dx": {
                                        "parameter": "buttonX1"
                                    },
                                    "dy": {
                                        "parameter": "buttonY"
                                    }
                                },
                                {
                                    "type": "scale",
                                    "scaleX": {
                                        "parameter": "buttonScale"
                                    },
                                    "scaleY": {
                                        "parameter": "buttonScale"
                                    },
                                    "centerX": 0,
                                    "centerY": 0
                                }
                            ],
                            "children": [
                                {
                                    "id": "play-cap",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "cornerRadius": 22,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 1
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "playFace"
                                        },
                                        "stroke": {
                                            "parameter": "borderColor"
                                        },
                                        "strokeWidth": {
                                            "parameter": "buttonEdgeArt"
                                        }
                                    }
                                },
                                {
                                    "id": "play-mark",
                                    "when": {
                                        "parameter": "haltedRead"
                                    },
                                    "type": "text",
                                    "properties": {
                                        "x": 50,
                                        "y": 50,
                                        "text": "",
                                        "fontSize": 46,
                                        "fontFamily": "\"Font Awesome 7 Pro\"",
                                        "fontWeight": 300,
                                        "textAnchor": "middle",
                                        "baseline": "central",
                                        "fill": "token:stroke.default",
                                        "stroke": "none"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "playMark"
                                        }
                                    }
                                },
                                {
                                    "id": "pause-mark",
                                    "when": {
                                        "parameter": "runningRead"
                                    },
                                    "type": "text",
                                    "properties": {
                                        "x": 50,
                                        "y": 50,
                                        "text": "",
                                        "fontSize": 46,
                                        "fontFamily": "\"Font Awesome 7 Pro\"",
                                        "fontWeight": 300,
                                        "textAnchor": "middle",
                                        "baseline": "central",
                                        "fill": "token:stroke.default",
                                        "stroke": "none"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "playMark"
                                        }
                                    }
                                },
                                {
                                    "id": "play-press",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "fill": "none",
                                        "stroke": "none"
                                    },
                                    "behaviours": [
                                        {
                                            "type": "keep-time",
                                            "action": "toggle",
                                            "hourVariable": {
                                                "parameter": "hourVariable"
                                            },
                                            "hourProperty": "hourVariable",
                                            "minuteVariable": {
                                                "parameter": "minuteVariable"
                                            },
                                            "minuteProperty": "minuteVariable",
                                            "secondVariable": {
                                                "parameter": "secondVariable"
                                            },
                                            "secondProperty": "secondVariable",
                                            "millisecondVariable": {
                                                "parameter": "millisecondVariable"
                                            },
                                            "millisecondProperty": "millisecondVariable",
                                            "runningParameter": "running",
                                            "intervalMs": {
                                                "parameter": "runInterval"
                                            }
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "id": "lap-key",
                            "type": "group",
                            "modifiers": [
                                {
                                    "type": "translate",
                                    "dx": {
                                        "parameter": "lapX"
                                    },
                                    "dy": {
                                        "parameter": "buttonY"
                                    }
                                },
                                {
                                    "type": "scale",
                                    "scaleX": {
                                        "parameter": "buttonScale"
                                    },
                                    "scaleY": {
                                        "parameter": "buttonScale"
                                    },
                                    "centerX": 0,
                                    "centerY": 0
                                }
                            ],
                            "children": [
                                {
                                    "id": "lap-cap",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "cornerRadius": 22,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 1
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "buttonColor"
                                        },
                                        "stroke": {
                                            "parameter": "borderColor"
                                        },
                                        "strokeWidth": {
                                            "parameter": "buttonEdgeArt"
                                        }
                                    }
                                },
                                {
                                    "id": "lap-mark",
                                    "type": "text",
                                    "properties": {
                                        "x": 50,
                                        "y": 50,
                                        "text": "",
                                        "fontSize": 46,
                                        "fontFamily": "\"Font Awesome 7 Pro\"",
                                        "fontWeight": 300,
                                        "textAnchor": "middle",
                                        "baseline": "central",
                                        "fill": "token:stroke.default",
                                        "stroke": "none"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "borderColor"
                                        }
                                    }
                                },
                                {
                                    "id": "lap-press",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "fill": "none",
                                        "stroke": "none"
                                    },
                                    "behaviours": [
                                        {
                                            "type": "remember",
                                            "memory": "laps",
                                            "text": {
                                                "parameter": "readoutText"
                                            },
                                            "x": {
                                                "parameter": "lapSeconds"
                                            },
                                            "y": 0,
                                            "limit": 200
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "id": "stop-key",
                            "type": "group",
                            "when": {
                                "parameter": "stopShown"
                            },
                            "modifiers": [
                                {
                                    "type": "translate",
                                    "dx": {
                                        "parameter": "stopX"
                                    },
                                    "dy": {
                                        "parameter": "buttonY"
                                    }
                                },
                                {
                                    "type": "scale",
                                    "scaleX": {
                                        "parameter": "buttonScale"
                                    },
                                    "scaleY": {
                                        "parameter": "buttonScale"
                                    },
                                    "centerX": 0,
                                    "centerY": 0
                                }
                            ],
                            "children": [
                                {
                                    "id": "stop-cap",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "cornerRadius": 22,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 1
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "buttonColor"
                                        },
                                        "stroke": {
                                            "parameter": "borderColor"
                                        },
                                        "strokeWidth": {
                                            "parameter": "buttonEdgeArt"
                                        }
                                    }
                                },
                                {
                                    "id": "stop-mark",
                                    "type": "text",
                                    "properties": {
                                        "x": 50,
                                        "y": 50,
                                        "text": "",
                                        "fontSize": 46,
                                        "fontFamily": "\"Font Awesome 7 Pro\"",
                                        "fontWeight": 300,
                                        "textAnchor": "middle",
                                        "baseline": "central",
                                        "fill": "token:stroke.default",
                                        "stroke": "none"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "borderColor"
                                        }
                                    }
                                },
                                {
                                    "id": "stop-press",
                                    "type": "rect",
                                    "properties": {
                                        "x": 0,
                                        "y": 0,
                                        "width": 100,
                                        "height": 100,
                                        "fill": "none",
                                        "stroke": "none"
                                    },
                                    "behaviours": [
                                        {
                                            "type": "keep-time",
                                            "action": "stop",
                                            "hourVariable": {
                                                "parameter": "hourVariable"
                                            },
                                            "hourProperty": "hourVariable",
                                            "minuteVariable": {
                                                "parameter": "minuteVariable"
                                            },
                                            "minuteProperty": "minuteVariable",
                                            "secondVariable": {
                                                "parameter": "secondVariable"
                                            },
                                            "secondProperty": "secondVariable",
                                            "millisecondVariable": {
                                                "parameter": "millisecondVariable"
                                            },
                                            "millisecondProperty": "millisecondVariable",
                                            "runningParameter": "running",
                                            "intervalMs": {
                                                "parameter": "runInterval"
                                            }
                                        },
                                        {
                                            "type": "forget",
                                            "memory": "laps"
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": "laps",
                    "type": "group",
                    "when": {
                        "parameter": "lapsShown"
                    },
                    "children": [
                        {
                            "id": "lap-rule",
                            "type": "line",
                            "properties": {
                                "x1": 0,
                                "y1": 0,
                                "x2": 100,
                                "y2": 0,
                                "stroke": "token:stroke.default",
                                "strokeWidth": 1
                            },
                            "bindings": {
                                "x1": {
                                    "parameter": "lapListX"
                                },
                                "y1": {
                                    "parameter": "lapRuleY"
                                },
                                "x2": {
                                    "parameter": "lapListRight"
                                },
                                "y2": {
                                    "parameter": "lapRuleY"
                                },
                                "stroke": {
                                    "parameter": "borderColor"
                                },
                                "strokeWidth": {
                                    "parameter": "strokeHairline"
                                }
                            }
                        },
                        {
                            "id": "lap-list",
                            "type": "memory-list",
                            "parameters": {
                                "rows": {
                                    "memory": "laps"
                                },
                                "x": {
                                    "parameter": "lapListX"
                                },
                                "y": {
                                    "parameter": "lapListY"
                                },
                                "width": {
                                    "parameter": "lapListW"
                                },
                                "height": {
                                    "parameter": "lapListH"
                                },
                                "rowHeight": {
                                    "parameter": "lapRowH"
                                },
                                "fontSize": {
                                    "parameter": "lapFont"
                                },
                                "digits": 3,
                                "order": "newest",
                                "layout": "row",
                                "textColor": {
                                    "parameter": "numberColor"
                                },
                                "valueColor": {
                                    "parameter": "numberColor"
                                },
                                "emptyText": "No laps"
                            }
                        }
                    ]
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
                "label": "Heading",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model"
            },
            {
                "id": "rotationVariable",
                "label": "Rose",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unit": "deg",
                "description": "Turns the rose, its ticks and its labels clockwise. The needle keeps its own heading."
            },
            {
                "id": "pointers",
                "label": "Pointers",
                "valueType": "terms",
                "defaultValue": [],
                "category": "model",
                "description": "Directions marked on the rim, one row each: a row points where its angle says, or where the pair it names points — how far east and how far north. An angle is measured from N and grows clockwise, so a marker stands where the tick for its direction stands and turns with the rose the way that tick does."
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
                            "id": "pointers",
                            "type": "pointer-ring",
                            "parameters": {
                                "centerX": 100,
                                "centerY": 100,
                                "radius": 94,
                                "length": 14,
                                "width": 11,
                                "startAngle": {
                                    "parameter": "roseStart"
                                },
                                "pointers": {
                                    "parameter": "pointers"
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
        "type": "mechanical-wave",
        "category": "component",
        "displayName": "Mechanical wave",
        "description": "A mechanical wave drawn as a chain of oscillators, each receiving the disturbance with the delay of its distance from the source.",
        "icon": "fa-light fa-wave-sine",
        "tags": [
            "object",
            "wave",
            "oscillation",
            "transverse",
            "longitudinal",
            "propagation"
        ],
        "capabilities": [
            "reads-model",
            "writes-model",
            "oscillation"
        ],
        "preview": {
            "parameters": {
                "wavefront": false,
                "elements": 24
            }
        },
        "parameters": [
            {
                "id": "wave",
                "previousId": "displacement",
                "label": "Wave",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "description": "A name the model defined over element indices, as y\\left[i\\right]=... does. The first oscillator is element 1. A name the model leaves free goes the other way: the object works its wave out from the amplitude, frequency, speed and phase below and hands it to the model under that name, so it can be plotted, read one oscillator at a time and superposed with another wave. Left empty, the object keeps the wave to itself."
            },
            {
                "id": "amplitude",
                "label": "Amplitude",
                "valueType": "variable",
                "defaultValue": "2",
                "category": "model",
                "visibleWhen": {
                    "parameter": "wave",
                    "modelDefines": false
                },
                "description": "Greatest displacement of an oscillator."
            },
            {
                "id": "frequency",
                "label": "Frequency",
                "valueType": "variable",
                "defaultValue": "0.5",
                "category": "model",
                "visibleWhen": {
                    "parameter": "wave",
                    "modelDefines": false
                }
            },
            {
                "id": "speed",
                "label": "Speed",
                "valueType": "variable",
                "defaultValue": "5",
                "category": "model",
                "visibleWhen": {
                    "parameter": "wave",
                    "modelDefines": false
                },
                "description": "Propagation speed. A negative speed sends the wave the other way."
            },
            {
                "id": "phase",
                "label": "Initial phase",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "visibleWhen": {
                    "parameter": "wave",
                    "modelDefines": false
                },
                "description": "Phase of the first oscillator at the start of the run, in radians. At zero it stands at rest and swings from there, which is where a chain at rest starts."
            },
            {
                "id": "length",
                "label": "Length",
                "valueType": "number",
                "defaultValue": 20,
                "category": "scale",
                "minimum": 0.001,
                "description": "How long the chain is in model units. The spacing between oscillators follows from it."
            },
            {
                "id": "elements",
                "label": "Oscillators",
                "valueType": "number",
                "defaultValue": 30,
                "category": "display",
                "minimum": 2,
                "maximum": 200,
                "bindable": false
            },
            {
                "id": "orientation",
                "label": "Orientation",
                "valueType": "string",
                "defaultValue": "transverse",
                "category": "display",
                "enumValues": [
                    "transverse",
                    "longitudinal"
                ]
            },
            {
                "id": "wavefront",
                "label": "Wavefront",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "visibleWhen": {
                    "parameter": "wave",
                    "modelDefines": false
                },
                "description": "Holds each oscillator at rest until the wave reaches it. Turned off, the whole chain is already oscillating."
            },
            {
                "id": "elementSize",
                "label": "Element size",
                "valueType": "number",
                "defaultValue": 4,
                "category": "display",
                "minimum": 1,
                "maximum": 30
            },
            {
                "id": "referenceIndex",
                "label": "Reference oscillator",
                "valueType": "number",
                "defaultValue": 1,
                "category": "display",
                "minimum": 0,
                "maximum": 200,
                "description": "The oscillator drawn in its own colour, so one of them can be followed. Zero marks none."
            },
            {
                "id": "showArrows",
                "label": "Velocity arrows",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "visibleWhen": {
                    "parameter": "wave",
                    "equals": ""
                }
            },
            {
                "id": "showLine",
                "label": "Connecting line",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display"
            },
            {
                "id": "waveColor",
                "label": "Colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "referenceColor",
                "label": "Reference colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.strong",
                "category": "style"
            }
        ],
        "indexedSource": {
            "name": {
                "parameter": "wave"
            },
            "index": "n",
            "formula": "A\\cdot\\sin\\left(2\\cdot\\pi\\cdot f\\cdot\\left(t-\\frac{\\left(n-1\\right)\\cdot L}{\\left(N-1\\right)\\cdot v}\\right)+p\\right)\\cdot\\left(1-g\\cdot\\max\\left(0,sign\\left(\\frac{\\left(n-1\\right)\\cdot L}{\\left(N-1\\right)\\cdot v}-t\\right)\\right)\\right)",
            "inputs": {
                "A": {
                    "parameter": "amplitude"
                },
                "f": {
                    "parameter": "frequency"
                },
                "v": {
                    "parameter": "speed"
                },
                "p": {
                    "parameter": "phase"
                },
                "L": {
                    "parameter": "length"
                },
                "N": {
                    "formula": "\\max\\left(2,\\min\\left(200,round\\left(elements\\right)\\right)\\right)"
                },
                "g": {
                    "parameter": "wavefront"
                },
                "t": {
                    "independent": "value"
                }
            }
        },
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
                "id": "t",
                "value": {
                    "independent": "value"
                }
            },
            {
                "id": "amp",
                "value": {
                    "parameter": "amplitude",
                    "as": "number"
                }
            },
            {
                "id": "freq",
                "value": {
                    "parameter": "frequency",
                    "as": "number"
                }
            },
            {
                "id": "spd",
                "value": {
                    "parameter": "speed",
                    "as": "number"
                }
            },
            {
                "id": "ph",
                "value": {
                    "parameter": "phase",
                    "as": "number"
                }
            },
            {
                "id": "wf",
                "value": {
                    "choose": {
                        "parameter": "wavefront"
                    },
                    "then": {
                        "constant": 1
                    },
                    "otherwise": {
                        "constant": 0
                    }
                }
            },
            {
                "id": "count",
                "formula": "\\max\\left(2,\\min\\left(200,round\\left(elements\\right)\\right)\\right)"
            },
            {
                "id": "gaps",
                "formula": "count-1"
            },
            {
                "id": "spacingPixels",
                "formula": "\\frac{w}{gaps}"
            },
            {
                "id": "spacing",
                "formula": "\\frac{length}{gaps}"
            },
            {
                "id": "ppu",
                "formula": "\\frac{w}{length}"
            },
            {
                "id": "omega",
                "formula": "2\\cdot\\pi\\cdot freq"
            },
            {
                "id": "delay",
                "formula": "\\frac{spacing}{spd}"
            },
            {
                "id": "centerY",
                "formula": "\\frac{h}{2}"
            },
            {
                "id": "barHeight",
                "formula": "h\\cdot0.6"
            },
            {
                "id": "barTop",
                "formula": "centerY-\\frac{barHeight}{2}"
            },
            {
                "id": "headSize",
                "formula": "\\max\\left(2,\\min\\left(5,elementSize\\right)\\right)"
            },
            {
                "id": "arrowScale",
                "formula": "0.2"
            }
        ],
        "root": {
            "id": "wave",
            "type": "group",
            "children": [
                {
                    "id": "link",
                    "type": "line",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 0
                        },
                        "otherwise": {
                            "parameter": "showLine"
                        }
                    },
                    "bindings": {
                        "x1": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y1": {
                            "formula": "centerY-d\\cdot ppu",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "x2": {
                            "formula": "\\left(i+1\\right)\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y2": {
                            "formula": "centerY-d\\cdot ppu",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+2",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-\\left(i+1\\right)\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(\\left(i+1\\right)\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "stroke": {
                            "parameter": "waveColor"
                        },
                        "strokeWidth": {
                            "token": "strokeWidth.hairline"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "gaps"
                            }
                        }
                    ]
                },
                {
                    "id": "arrow-shaft",
                    "type": "line",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 0
                        },
                        "otherwise": {
                            "choose": {
                                "parameter": "wave"
                            },
                            "then": {
                                "constant": 0
                            },
                            "otherwise": {
                                "parameter": "showArrows"
                            }
                        }
                    },
                    "bindings": {
                        "x1": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y1": {
                            "formula": "centerY-d\\cdot ppu",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "x2": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y2": {
                            "formula": "\\left(centerY-d\\cdot ppu\\right)-\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot ppu\\cdot arrowScale",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "stroke": {
                            "choose": {
                                "formula": "i+1",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "equals": {
                                "parameter": "referenceIndex"
                            },
                            "then": {
                                "parameter": "referenceColor"
                            },
                            "otherwise": {
                                "parameter": "waveColor"
                            }
                        },
                        "strokeWidth": {
                            "token": "strokeWidth.hairline"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "count"
                            }
                        }
                    ]
                },
                {
                    "id": "arrow-barb-left",
                    "type": "line",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 0
                        },
                        "otherwise": {
                            "choose": {
                                "parameter": "wave"
                            },
                            "then": {
                                "constant": 0
                            },
                            "otherwise": {
                                "parameter": "showArrows"
                            }
                        }
                    },
                    "bindings": {
                        "x1": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y1": {
                            "formula": "\\left(centerY-d\\cdot ppu\\right)-\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot ppu\\cdot arrowScale",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "x2": {
                            "formula": "i\\cdot spacingPixels-headSize",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y2": {
                            "formula": "\\left(\\left(centerY-d\\cdot ppu\\right)-\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot ppu\\cdot arrowScale\\right)+sign\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot headSize",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "stroke": {
                            "choose": {
                                "formula": "i+1",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "equals": {
                                "parameter": "referenceIndex"
                            },
                            "then": {
                                "parameter": "referenceColor"
                            },
                            "otherwise": {
                                "parameter": "waveColor"
                            }
                        },
                        "strokeWidth": {
                            "token": "strokeWidth.hairline"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "count"
                            }
                        }
                    ]
                },
                {
                    "id": "arrow-barb-right",
                    "type": "line",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 0
                        },
                        "otherwise": {
                            "choose": {
                                "parameter": "wave"
                            },
                            "then": {
                                "constant": 0
                            },
                            "otherwise": {
                                "parameter": "showArrows"
                            }
                        }
                    },
                    "bindings": {
                        "x1": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y1": {
                            "formula": "\\left(centerY-d\\cdot ppu\\right)-\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot ppu\\cdot arrowScale",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "x2": {
                            "formula": "i\\cdot spacingPixels+headSize",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "y2": {
                            "formula": "\\left(\\left(centerY-d\\cdot ppu\\right)-\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot ppu\\cdot arrowScale\\right)+sign\\left(amp\\cdot omega\\cdot\\cos\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)\\right)\\cdot headSize",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "stroke": {
                            "choose": {
                                "formula": "i+1",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "equals": {
                                "parameter": "referenceIndex"
                            },
                            "then": {
                                "parameter": "referenceColor"
                            },
                            "otherwise": {
                                "parameter": "waveColor"
                            }
                        },
                        "strokeWidth": {
                            "token": "strokeWidth.hairline"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "count"
                            }
                        }
                    ]
                },
                {
                    "id": "oscillator",
                    "type": "circle",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 0
                        },
                        "otherwise": {
                            "constant": 1
                        }
                    },
                    "bindings": {
                        "centerX": {
                            "formula": "i\\cdot spacingPixels",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                }
                            }
                        },
                        "centerY": {
                            "formula": "centerY-d\\cdot ppu",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "radius": {
                            "parameter": "elementSize"
                        },
                        "fill": {
                            "choose": {
                                "formula": "i+1",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "equals": {
                                "parameter": "referenceIndex"
                            },
                            "then": {
                                "parameter": "referenceColor"
                            },
                            "otherwise": {
                                "parameter": "waveColor"
                            }
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "count"
                            }
                        }
                    ]
                },
                {
                    "id": "bar",
                    "type": "rect",
                    "when": {
                        "choose": {
                            "parameter": "orientation"
                        },
                        "equals": {
                            "constant": "longitudinal"
                        },
                        "then": {
                            "constant": 1
                        },
                        "otherwise": {
                            "constant": 0
                        }
                    },
                    "bindings": {
                        "x": {
                            "formula": "i\\cdot spacingPixels+d\\cdot ppu-\\frac{elementSize}{2}",
                            "inputs": {
                                "i": {
                                    "parameter": "$index"
                                },
                                "d": {
                                    "choose": {
                                        "parameter": "wave"
                                    },
                                    "then": {
                                        "element": {
                                            "parameter": "wave"
                                        },
                                        "index": {
                                            "formula": "i+1",
                                            "inputs": {
                                                "i": {
                                                    "parameter": "$index"
                                                }
                                            }
                                        }
                                    },
                                    "otherwise": {
                                        "formula": "amp\\cdot\\sin\\left(omega\\cdot\\left(t-i\\cdot delay\\right)+ph\\right)\\cdot\\left(1-wf\\cdot\\max\\left(0,sign\\left(i\\cdot delay-t\\right)\\right)\\right)",
                                        "inputs": {
                                            "i": {
                                                "parameter": "$index"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "y": {
                            "parameter": "barTop"
                        },
                        "width": {
                            "parameter": "elementSize"
                        },
                        "height": {
                            "parameter": "barHeight"
                        },
                        "fill": {
                            "choose": {
                                "formula": "i+1",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "equals": {
                                "parameter": "referenceIndex"
                            },
                            "then": {
                                "parameter": "referenceColor"
                            },
                            "otherwise": {
                                "parameter": "waveColor"
                            }
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "count"
                            }
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
        "description": "Records where the pointer goes across the plot, against a horizontal and a vertical axis. Every drag adds to what is already there, drawn as a line of its own, so several of them build one recording made of separate runs. A click records nothing: the plot is only written to by a gesture that travels. The run is measurements: name a variable for each axis and it takes the value of sample n at iteration n, so the model's own player replays the gesture and everything reading those variables moves with it. A variable the model works out for itself is read rather than written: the gesture says where the model's input now stands, the definitions say what comes out of it, and that is the value the line is drawn through and the value the run remembers, so a recording made against a definition is in the model's own coordinates. The marker showing the sample on screen can be any character from the catalogue, placed by its pivot point.",
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
                "defaultValue": "0",
                "category": "model",
                "colorParameter": "xValueColor",
                "unitParameter": "xVariableUnit",
                "valueAnchor": {
                    "node": "plot",
                    "x": 0.5,
                    "y": 0.94
                },
                "description": "Model variable that takes the horizontal position of sample n at iteration n. Naming none the row holds the value itself: the recording stays with the object and the row reads the horizontal position the last gesture left it standing at. Turning on the eye beside the row stands the term and its value in the plot, along the axis it is measured against, in the badge and the figures every other term on the board is read in."
            },
            {
                "id": "yVariable",
                "label": "Vertical",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "colorParameter": "yValueColor",
                "unitParameter": "yVariableUnit",
                "valueAnchor": {
                    "node": "plot",
                    "x": 0.5,
                    "y": 0.06
                },
                "description": "Model variable that takes the vertical position of sample n at iteration n. Naming none the row holds the value itself, the way the horizontal one does. It carries the same eye, and is read at the top of the plot so the two readings never stand on one another."
            },
            {
                "id": "xVariableUnit",
                "label": "Horizontal unit",
                "valueType": "string",
                "defaultValue": "",
                "category": "model",
                "userEditable": false,
                "description": "What the horizontal value is read in while the row names no term. A row naming one is read in the unit that term carries, picked beside it the way every unit on the board is, so this is what is left for a tracker standing at a plain number."
            },
            {
                "id": "yVariableUnit",
                "label": "Vertical unit",
                "valueType": "string",
                "defaultValue": "",
                "category": "model",
                "userEditable": false,
                "description": "What the vertical value is read in while the row names no term."
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
                "id": "xUnitText",
                "fallback": "",
                "value": {
                    "choose": {
                        "termUnit": {
                            "parameter": "xVariable"
                        }
                    },
                    "then": {
                        "termUnit": {
                            "parameter": "xVariable"
                        }
                    },
                    "otherwise": {
                        "parameter": "xVariableUnit"
                    }
                }
            },
            {
                "id": "yUnitText",
                "fallback": "",
                "value": {
                    "choose": {
                        "termUnit": {
                            "parameter": "yVariable"
                        }
                    },
                    "then": {
                        "termUnit": {
                            "parameter": "yVariable"
                        }
                    },
                    "otherwise": {
                        "parameter": "yVariableUnit"
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
                "id": "markerHeldX",
                "formula": "\\max\\left(plotX,\\min\\left(plotRight,markerX\\right)\\right)"
            },
            {
                "id": "markerHeldY",
                "formula": "\\max\\left(plotY,\\min\\left(plotBottom,markerY\\right)\\right)"
            },
            {
                "id": "markerOff",
                "formula": "\\max\\left(markerX-markerHeldX,markerHeldX-markerX\\right)+\\max\\left(markerY-markerHeldY,markerHeldY-markerY\\right)"
            },
            {
                "id": "markerInside",
                "formula": "markerShown\\cdot\\left(1-sign\\left(markerOff\\right)\\right)"
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
                        "lineWidth": 2,
                        "clipX": {
                            "parameter": "plotX"
                        },
                        "clipY": {
                            "parameter": "plotY"
                        },
                        "clipWidth": {
                            "parameter": "plotW"
                        },
                        "clipHeight": {
                            "parameter": "plotH"
                        }
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
                        },
                        "xUnit": {
                            "parameter": "xUnitText"
                        },
                        "yUnit": {
                            "parameter": "yUnitText"
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
                            "parameter": "markerInside"
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
                            "parameter": "markerInside"
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
                            "xVariable": {
                                "parameter": "xVariable"
                            },
                            "xProperty": "xVariable",
                            "yVariable": {
                                "parameter": "yVariable"
                            },
                            "yProperty": "yVariable",
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
                "label": "Time",
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
        "type": "piano",
        "category": "component",
        "displayName": "Piano",
        "description": "A piano keyboard played with the pointer or with the computer keys, several notes at a time, that hands the model the wave of the chord it is holding.",
        "icon": "fa-light fa-piano-keyboard",
        "tags": [
            "object",
            "sound",
            "wave",
            "music",
            "superposition",
            "harmony"
        ],
        "capabilities": [
            "writes-model",
            "interaction",
            "sound"
        ],
        "preview": {
            "parameters": {
                "octaves": 1
            }
        },
        "parameters": [
            {
                "id": "wave",
                "label": "Wave",
                "valueType": "variable",
                "defaultValue": "",
                "category": "model",
                "description": "A name the model leaves free: the piano works the sound of the chord it is holding out over a window of samples and hands it to the model under that name, defined over sample indices as y\\left[n\\right]=... is, so it can be plotted, read one sample at a time and superposed with another wave. Sample n is the sum, over every key being held, of its own sine. Left empty, the piano keeps its wave to itself."
            },
            {
                "id": "amplitude",
                "label": "Amplitude",
                "valueType": "variable",
                "defaultValue": "1",
                "category": "model",
                "description": "Amplitude of each note in the sum, so a chord of three notes reaches three times this far where they agree."
            },
            {
                "id": "samples",
                "label": "Samples",
                "valueType": "number",
                "defaultValue": 30,
                "category": "scale",
                "minimum": 2,
                "maximum": 2000,
                "description": "How many samples the published wave holds, and so how far its index runs: y\\left[1\\right] is the wave at the start of the window and y\\left[samples\\right] the wave at the end of it."
            },
            {
                "id": "duration",
                "label": "Duration",
                "valueType": "number",
                "defaultValue": 0.02,
                "category": "scale",
                "minimum": 0.001,
                "description": "Seconds of sound the samples span. Two hundredths of a second is about five cycles of middle C, which is enough of the wave to see its shape."
            },
            {
                "id": "firstOctave",
                "label": "First octave",
                "valueType": "number",
                "defaultValue": 4,
                "category": "display",
                "minimum": 0,
                "maximum": 8,
                "bindable": false,
                "description": "Octave of the leftmost key. Four starts the keyboard at middle C."
            },
            {
                "id": "octaves",
                "label": "Octaves",
                "valueType": "number",
                "defaultValue": 2,
                "category": "display",
                "minimum": 1,
                "maximum": 4,
                "bindable": false
            },
            {
                "id": "notes",
                "label": "Notes held",
                "valueType": "object",
                "defaultValue": null,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "bindable": false,
                "description": "The notes the piano is holding, kept while the board is open. It is what draws a key lit and what the wave is summed over, and it is never written down: a file remembers no note left sounding."
            },
            {
                "id": "whiteColor",
                "label": "Natural keys",
                "valueType": "colour",
                "defaultValue": "token:surface.default",
                "category": "style"
            },
            {
                "id": "blackColor",
                "label": "Sharp keys",
                "valueType": "colour",
                "defaultValue": "token:stroke.strong",
                "category": "style"
            },
            {
                "id": "pressedColor",
                "label": "Held keys",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "style"
            },
            {
                "id": "borderColor",
                "label": "Border",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style"
            }
        ],
        "indexedSource": {
            "name": {
                "parameter": "wave"
            },
            "index": "n",
            "over": {
                "index": "k",
                "count": {
                    "memoryCount": "notes"
                }
            },
            "formula": "amplitude\\cdot\\sin\\left(2\\cdot\\pi\\cdot f\\cdot\\left(n-1\\right)\\cdot\\frac{duration}{samples-1}\\right)",
            "inputs": {
                "f": {
                    "memory": "notes",
                    "row": {
                        "formula": "k-1"
                    },
                    "field": "x"
                }
            }
        },
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
            }
        ],
        "root": {
            "id": "piano",
            "type": "piano-keyboard",
            "parameters": {
                "width": {
                    "parameter": "w"
                },
                "height": {
                    "parameter": "h"
                },
                "firstOctave": {
                    "parameter": "firstOctave"
                },
                "octaves": {
                    "parameter": "octaves"
                },
                "notes": {
                    "parameter": "notes"
                },
                "notesParameter": {
                    "constant": "notes"
                },
                "whiteColor": {
                    "parameter": "whiteColor"
                },
                "blackColor": {
                    "parameter": "blackColor"
                },
                "pressedColor": {
                    "parameter": "pressedColor"
                },
                "borderColor": {
                    "parameter": "borderColor"
                }
            }
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
                "label": "Angle",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "description": "Angle in degrees, measured counter-clockwise from the positive x axis."
            },
            {
                "id": "lengthVariable",
                "label": "Length",
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
            "scale",
            "sound"
        ],
        "capabilities": [
            "radial",
            "angular",
            "reads-model",
            "scale",
            "audible"
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
                "label": "Value",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unitParameter": "unit"
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
                "category": "display",
                "description": "What the reading is named in when the term it reads names nothing of its own. A term carrying a unit is read in that one, picked beside the term the way every unit on the board is, so this is what is left for a speedometer standing at a plain number."
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
            },
            {
                "id": "sound",
                "label": "Sound",
                "valueType": "audio",
                "defaultValue": "",
                "category": "sound",
                "valueParameter": "valueVariable",
                "minimumParameter": "minimum",
                "maximumParameter": "maximum",
                "description": "A sound the speedometer makes as the needle moves — an engine note, most obviously. The clip is chosen from a file or from the catalogue's audios, and it is heard over the same two ends the dial is marked between, so a needle at rest is one end of the sound and a needle at full scale the other. Beside it stands the choice of what the speed does to the clip: heard as pitch it is played higher the faster the reading, and heard as volume it is played louder. It is heard only while the reading is changing, so a speedometer standing still is silent."
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
                "id": "readoutUnit",
                "fallback": "",
                "value": {
                    "choose": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "then": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "otherwise": {
                        "parameter": "unit"
                    }
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "format": {
                        "parameter": "value"
                    },
                    "digits": {
                        "parameter": "digits"
                    }
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
                        "unit": {
                            "parameter": "readoutUnit"
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
        "type": "steering-wheel",
        "category": "component",
        "displayName": "Steering wheel",
        "description": "The controls a vehicle is driven with: a wheel turned by a model variable, drawn as a car wheel, a motorbike handlebar or a ship's helm, and the accelerator and brake of that same vehicle under it. The wheel, the pedals, and the brake among the pedals, can each be left out. Dragging the wheel turns it and writes back what it reads; the accelerator and the brake each press a value of its own up from zero, both above zero and both pressed the same way, each read the way the wheel is — a term, or a pair laid down along the bearing the wheel is turned to, forwards for the accelerator and back the other way for the brake.",
        "icon": "fa-light fa-steering-wheel",
        "tags": [
            "object",
            "steering",
            "wheel",
            "vehicle",
            "helm",
            "handlebar",
            "rotation",
            "accelerator",
            "throttle",
            "brake",
            "pedal",
            "car",
            "boat"
        ],
        "capabilities": [
            "radial",
            "angular",
            "linear",
            "reads-model",
            "scale",
            "interaction",
            "writes-model"
        ],
        "art": {
            "car": "art/steering-wheel-car.svg",
            "motor bike": "art/steering-wheel-motorbike.svg",
            "boat": "art/steering-wheel-boat.svg"
        },
        "preview": {
            "parameters": {
                "angleVariable": "28"
            }
        },
        "parameters": [
            {
                "id": "turnedBy",
                "label": "Turned by",
                "valueType": "string",
                "defaultValue": "angle",
                "enumValues": [
                    "angle",
                    "orientation"
                ],
                "category": "model",
                "userEditable": false,
                "description": "Whether the row is read as an angle in degrees or as an orientation, which is a pair of values read as a direction. It is chosen from a key of its own in the toolbar rather than from the row it governs, and it says how the pedals are read as well, since they press what they press the same way the wheel is turned: read as an angle each presses a term of its own up from zero, read as an orientation each presses a pair of its own, laid down along the bearing the wheel is turned to — forwards for the accelerator and back the other way for the brake, though what each pedal holds is above zero either way."
            },
            {
                "id": "angleVariable",
                "label": "Turned by",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unit": "deg",
                "modeParameter": "turnedBy",
                "pairedParameter": "angleUpVariable",
                "colorParameter": "markColor",
                "description": "The angle the wheel is turned to, anticlockwise in degrees, the way an angle is measured everywhere else in the model: turning left raises it and turning right lowers it, so a wheel held to the right reads a value below zero — or, as an orientation, how far across the pair reaches, which is a bearing and turns the other way, clockwise from straight up, the way a compass reads. Dragging the wheel points it at the pointer rather than turning it by however far the pointer travelled, and the angle is measured from straight up, so zero is at twelve o'clock and a whole turn is the whole of the range. It writes back whichever it reads: the angle, or the pair, which keeps its length and takes the direction it was turned to."
            },
            {
                "id": "angleUpVariable",
                "label": "Up",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "userEditable": false,
                "description": "How far up the orientation reaches, edited by the second selector on the row and read only while the wheel is turned by an orientation."
            },
            {
                "id": "accelerationVariable",
                "label": "Accelerated on",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "modeParameter": "turnedBy",
                "pairedParameter": "accelerationUpVariable",
                "colorParameter": "acceleratorColor",
                "valueAnchor": {
                    "node": "accelerator-press",
                    "x": 0.5,
                    "y": 0.06
                },
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "What the accelerator presses, resting at zero and pressed up as far as the maximum. It never goes below the rest it starts from — the accelerator is one way only — and a slide across the whole of the area that presses it covers the whole of that range. It is read the way the wheel above it is read: as an angle it is one term, and as an orientation a second selector appears beside it and the pair is pressed along the bearing the wheel is turned to, which is how far across and how far up the vehicle is being pushed."
            },
            {
                "id": "accelerationUpVariable",
                "label": "Up",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "userEditable": false,
                "description": "How far up the accelerator's pair reaches, edited by the second selector on its row and read only while the wheel is turned by an orientation."
            },
            {
                "id": "brakingVariable",
                "label": "Braked on",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "modeParameter": "turnedBy",
                "pairedParameter": "brakingUpVariable",
                "colorParameter": "brakeColor",
                "valueAnchor": {
                    "node": "brake-press",
                    "x": 0.5,
                    "y": 0.06
                },
                "visibleWhen": [
                    {
                        "parameter": "showPedals"
                    },
                    {
                        "parameter": "showBrake"
                    }
                ],
                "description": "What the brake presses, resting at zero and pressed up as far as the brake's own maximum. It is pressed exactly as the accelerator is — sliding up presses it, sliding down eases it off, and neither pedal ever writes below the rest it starts from — so what the brake holds is how hard it is being stood on rather than an acceleration with a sign on it. Which way that braking pushes the model is the model's own business: read the two rows as a throttle to add and a brake to take away. It is its own — name the same thing on both rows and the two pedals press a single value between them, name two and the brake is kept apart from the throttle. Read as an orientation it is a pair like the accelerator's, laid down along the same bearing but the other way, so the pair still points back against the course the model is going on while the value it presses stays above zero."
            },
            {
                "id": "brakingUpVariable",
                "label": "Up",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "userEditable": false,
                "description": "How far up the brake's pair reaches, edited by the second selector on its row and read only while the wheel is turned by an orientation."
            },
            {
                "id": "wheelType",
                "label": "Vehicle",
                "valueType": "string",
                "defaultValue": "car",
                "enumValues": [
                    "car",
                    "motor bike",
                    "boat"
                ],
                "enumIcons": [
                    "fa-light fa-car",
                    "fa-light fa-motorcycle",
                    "fa-light fa-sailboat"
                ],
                "category": "display",
                "description": "Which vehicle is drawn, wheel and pedals alike: a car's three-spoke wheel over its brake and accelerator pedals, a motorbike's handlebar over its pair of hand levers, or a boat's eight-handled helm over its binnacle levers."
            },
            {
                "id": "showWheel",
                "label": "Wheel",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "description": "Whether the wheel is drawn. Turned off, the pedals have the whole box to themselves."
            },
            {
                "id": "showPedals",
                "label": "Pedals",
                "valueType": "boolean",
                "defaultValue": false,
                "category": "display",
                "description": "Whether the accelerator and the brake are drawn under the wheel. With both shown the box is split in two, the wheel above and the pedals below."
            },
            {
                "id": "showBrake",
                "label": "Brake",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "Whether the brake is drawn beside the accelerator. Switched off, the accelerator is the whole of the pedals and is pressed anywhere in them, and the brake takes its term, its own maximum and its colour away with it — which is the vehicle a model drives on one control alone."
            },
            {
                "id": "brakeMaximum",
                "label": "Brake maximum",
                "valueType": "number",
                "defaultValue": 100,
                "category": "scale",
                "minimum": 0,
                "visibleWhen": [
                    {
                        "parameter": "showPedals"
                    },
                    {
                        "parameter": "showBrake"
                    }
                ],
                "description": "As far as the brake presses what it holds, above zero — full braking. It is the accelerator's own kind of end, on the brake's own scale, so the two pedals can be given ranges of their own: the throttle a model has plenty of and the brake it has less of, or the other way about. Read as an orientation it is how far along the bearing the pair may be pushed back, which is the same end measured the other way."
            },
            {
                "id": "maximum",
                "label": "Maximum",
                "valueType": "number",
                "defaultValue": 100,
                "category": "scale",
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "As far up as the accelerator presses what it holds, above zero — or, read as an orientation, how far forward along the bearing its pair may be pushed."
            },
            {
                "id": "pedalReturnStep",
                "label": "Pedal return",
                "valueType": "number",
                "defaultValue": 10,
                "category": "interaction",
                "minimum": 0,
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "How much a pressed value comes back towards zero every tenth of a second once the pedal is let go, until it is at rest again — the spring that lifts a pedal the foot is off. It is the one spring, so the accelerator and the brake are let go alike, and a pair comes back along its own bearing to a standstill. Zero leaves what was pressed wherever it was released."
            },
            {
                "id": "rimColor",
                "label": "Rim colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showWheel"
                }
            },
            {
                "id": "gripColor",
                "label": "Grip colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.subtle",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showWheel"
                },
                "description": "The parts the hands hold: the bike's grips and stem and the helm's handles."
            },
            {
                "id": "hubColor",
                "label": "Hub colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showWheel"
                }
            },
            {
                "id": "restingAngle",
                "label": "Resting angle",
                "valueType": "number",
                "defaultValue": 0,
                "category": "state",
                "userEditable": false,
                "agentAccessible": false,
                "description": "The way the pair was last pointed, kept by the object while the pair stands at nothing. A standstill has no direction of its own, so this is what the wheel goes on facing and the bearing the pedals go on pressing along, which is how a stopped vehicle is accelerated back the way it was heading rather than due north. The object works it out for itself and never writes it down."
            },
            {
                "id": "markColor",
                "label": "Mark colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "model",
                "userEditable": false,
                "description": "The mark at the top of the wheel, which is the part that shows the direction it is turned to. It is picked on the row that turns the wheel rather than on a colour menu that would name the same thing twice."
            },
            {
                "id": "acceleratorColor",
                "label": "Accelerator colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.accent",
                "category": "model",
                "userEditable": false,
                "description": "Colour of the accelerator, of the area that presses it and of the value read over it. It is picked on the row that names the term rather than on a colour menu that would name the same thing twice."
            },
            {
                "id": "brakeColor",
                "label": "Brake colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "model",
                "userEditable": false,
                "description": "Colour of the brake, of the area that presses it and of the value read over it. It is picked the accelerator's way, on the row that names the term the brake presses, rather than on a colour menu that would name the same thing twice."
            },
            {
                "id": "frameColor",
                "label": "Frame colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.default",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "The parts of the pedals that do not move: the pedal box, the handlebar and the binnacle."
            },
            {
                "id": "surfaceColor",
                "label": "Surface colour",
                "valueType": "colour",
                "defaultValue": "token:surface.muted",
                "category": "style",
                "visibleWhen": {
                    "parameter": "showPedals"
                },
                "description": "The faces the moving parts are mounted on: the pedal hinges, the lever pivots and the boat's housing."
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
                "id": "wheelShown",
                "value": {
                    "choose": {
                        "parameter": "showWheel"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "pedalsShown",
                "value": {
                    "choose": {
                        "parameter": "showPedals"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "brakeShown",
                "value": {
                    "choose": {
                        "parameter": "showBrake"
                    },
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "brakePressShown",
                "formula": "pedalsShown\\cdot brakeShown"
            },
            {
                "id": "bothShown",
                "formula": "wheelShown\\cdot pedalsShown"
            },
            {
                "id": "laneHeight",
                "formula": "\\frac{h}{1+bothShown}"
            },
            {
                "id": "side",
                "formula": "\\max\\left(1,\\min\\left(w,laneHeight\\right)\\right)"
            },
            {
                "id": "k",
                "formula": "\\frac{side}{200}"
            },
            {
                "id": "dx",
                "formula": "\\frac{w-side}{2}"
            },
            {
                "id": "wheelDy",
                "formula": "\\frac{laneHeight-side}{2}"
            },
            {
                "id": "pedalsDy",
                "formula": "bothShown\\cdot laneHeight+\\frac{laneHeight-side}{2}"
            },
            {
                "id": "halfSide",
                "formula": "\\frac{side}{2}"
            },
            {
                "id": "cx",
                "formula": "dx+halfSide"
            },
            {
                "id": "cy",
                "formula": "wheelDy+halfSide"
            },
            {
                "id": "acceleratorPressX",
                "formula": "dx+brakeShown\\cdot halfSide"
            },
            {
                "id": "acceleratorPressWidth",
                "formula": "side-brakeShown\\cdot halfSide"
            },
            {
                "id": "pointedByOrientation",
                "value": {
                    "choose": {
                        "parameter": "turnedBy"
                    },
                    "equals": "orientation",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "across",
                "value": {
                    "parameter": "angleVariable",
                    "as": "number"
                }
            },
            {
                "id": "up",
                "value": {
                    "parameter": "angleUpVariable",
                    "as": "number"
                }
            },
            {
                "id": "orientationLength",
                "formula": "\\sqrt{across^{2}+up^{2}}"
            },
            {
                "id": "orientationAngle",
                "value": {
                    "direction": {
                        "x": {
                            "parameter": "across"
                        },
                        "y": {
                            "parameter": "up"
                        }
                    }
                }
            },
            {
                "id": "pointedAngle",
                "value": {
                    "choose": {
                        "parameter": "orientationLength"
                    },
                    "then": {
                        "parameter": "orientationAngle"
                    },
                    "otherwise": {
                        "parameter": "restingAngle"
                    }
                }
            },
            {
                "id": "angleTurnedTo",
                "value": {
                    "parameter": "angleVariable",
                    "as": "number"
                }
            },
            {
                "id": "plainAngle",
                "formula": "0-angleTurnedTo"
            },
            {
                "id": "angle",
                "value": {
                    "choose": {
                        "parameter": "pointedByOrientation"
                    },
                    "then": {
                        "parameter": "pointedAngle"
                    },
                    "otherwise": {
                        "parameter": "plainAngle"
                    }
                }
            },
            {
                "id": "turnedByHand",
                "value": {
                    "choose": {
                        "parameter": "pointedByOrientation"
                    },
                    "then": 0,
                    "otherwise": 1
                }
            },
            {
                "id": "isCar",
                "value": {
                    "choose": {
                        "parameter": "wheelType"
                    },
                    "equals": "car",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "isMotorBike",
                "value": {
                    "choose": {
                        "parameter": "wheelType"
                    },
                    "equals": "motor bike",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "isBoat",
                "value": {
                    "choose": {
                        "parameter": "wheelType"
                    },
                    "equals": "boat",
                    "then": 1,
                    "otherwise": 0
                }
            },
            {
                "id": "grabOuter",
                "formula": "92\\cdot k"
            },
            {
                "id": "grabInner",
                "formula": "24\\cdot k"
            },
            {
                "id": "spokeCount",
                "value": 8
            },
            {
                "id": "grabColor",
                "value": {
                    "token": "handle.stroke"
                }
            },
            {
                "id": "bearingRadians",
                "formula": "\\frac{pointedAngle\\cdot\\pi}{180}"
            },
            {
                "id": "accelerationValue",
                "value": {
                    "parameter": "accelerationVariable",
                    "as": "number"
                }
            },
            {
                "id": "accelerationUpValue",
                "value": {
                    "parameter": "accelerationUpVariable",
                    "as": "number"
                }
            },
            {
                "id": "brakingValue",
                "value": {
                    "parameter": "brakingVariable",
                    "as": "number"
                }
            },
            {
                "id": "brakingUpValue",
                "value": {
                    "parameter": "brakingUpVariable",
                    "as": "number"
                }
            },
            {
                "id": "accelerationAlong",
                "formula": "accelerationValue\\cdot\\sin\\left(bearingRadians\\right)+accelerationUpValue\\cdot\\cos\\left(bearingRadians\\right)"
            },
            {
                "id": "brakeBearing",
                "formula": "pointedAngle+180"
            },
            {
                "id": "brakeBearingRadians",
                "formula": "\\frac{brakeBearing\\cdot\\pi}{180}"
            },
            {
                "id": "brakingAlong",
                "formula": "brakingValue\\cdot\\sin\\left(brakeBearingRadians\\right)+brakingUpValue\\cdot\\cos\\left(brakeBearingRadians\\right)"
            },
            {
                "id": "acceleratorPressed",
                "value": {
                    "choose": {
                        "parameter": "pointedByOrientation"
                    },
                    "then": {
                        "parameter": "accelerationAlong"
                    },
                    "otherwise": {
                        "parameter": "accelerationValue"
                    }
                }
            },
            {
                "id": "brakePressed",
                "value": {
                    "choose": {
                        "parameter": "pointedByOrientation"
                    },
                    "then": {
                        "parameter": "brakingAlong"
                    },
                    "otherwise": {
                        "parameter": "brakingValue"
                    }
                }
            },
            {
                "id": "acceleratorUnitsPerPixel",
                "formula": "\\frac{maximum}{side}"
            },
            {
                "id": "brakeUnitsPerPixel",
                "formula": "\\frac{brakeMaximum}{side}"
            },
            {
                "id": "acceleratorRatio",
                "value": {
                    "choose": {
                        "parameter": "maximum"
                    },
                    "then": {
                        "formula": "\\max\\left(0,\\min\\left(1,\\frac{acceleratorPressed}{maximum}\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "brakeRatio",
                "value": {
                    "choose": {
                        "parameter": "brakeMaximum"
                    },
                    "then": {
                        "formula": "\\max\\left(0,\\min\\left(1,\\frac{brakePressed}{brakeMaximum}\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "pedalReturn",
                "value": {
                    "parameter": "pedalReturnStep"
                }
            },
            {
                "id": "carBrakePadY",
                "formula": "108+brakeRatio\\cdot44"
            },
            {
                "id": "carBrakeArmY",
                "formula": "carBrakePadY+11"
            },
            {
                "id": "bikeBrakeTilt",
                "formula": "brakeRatio\\cdot25"
            },
            {
                "id": "asternTilt",
                "formula": "0-\\frac{brakeRatio\\cdot30\\cdot\\pi}{180}"
            },
            {
                "id": "asternSlotY",
                "formula": "158-14\\cdot\\frac{\\sin\\left(asternTilt\\right)}{\\cos\\left(asternTilt\\right)}"
            },
            {
                "id": "asternKnobY",
                "formula": "182.25-112\\cdot\\cos\\left(asternTilt-\\frac{30\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "asternNearness",
                "formula": "1-0.62\\cdot\\sin\\left(asternTilt\\right)"
            },
            {
                "id": "asternKnobRadius",
                "formula": "12\\cdot asternNearness"
            },
            {
                "id": "asternArmWidth",
                "formula": "11\\cdot asternNearness"
            },
            {
                "id": "carAcceleratorPadY",
                "formula": "96+acceleratorRatio\\cdot44"
            },
            {
                "id": "carAcceleratorArmY",
                "formula": "carAcceleratorPadY+20"
            },
            {
                "id": "bikeAcceleratorTilt",
                "formula": "0-acceleratorRatio\\cdot25"
            },
            {
                "id": "aheadTilt",
                "formula": "\\frac{acceleratorRatio\\cdot30\\cdot\\pi}{180}"
            },
            {
                "id": "aheadSlotY",
                "formula": "158-14\\cdot\\frac{\\sin\\left(aheadTilt\\right)}{\\cos\\left(aheadTilt\\right)}"
            },
            {
                "id": "aheadKnobY",
                "formula": "182.25-112\\cdot\\cos\\left(aheadTilt-\\frac{30\\cdot\\pi}{180}\\right)"
            },
            {
                "id": "aheadNearness",
                "formula": "1-0.62\\cdot\\sin\\left(aheadTilt\\right)"
            },
            {
                "id": "aheadKnobRadius",
                "formula": "12\\cdot aheadNearness"
            },
            {
                "id": "aheadArmWidth",
                "formula": "11\\cdot aheadNearness"
            }
        ],
        "root": {
            "id": "steering-wheel",
            "type": "group",
            "children": [
                {
                    "id": "art",
                    "type": "group",
                    "when": {
                        "parameter": "showWheel"
                    },
                    "modifiers": [
                        {
                            "type": "translate",
                            "dx": {
                                "parameter": "dx"
                            },
                            "dy": {
                                "parameter": "wheelDy"
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
                            "id": "wheel",
                            "type": "group",
                            "modifiers": [
                                {
                                    "type": "rotate",
                                    "angle": {
                                        "parameter": "angle"
                                    },
                                    "centerX": 100,
                                    "centerY": 100
                                }
                            ],
                            "children": [
                                {
                                    "id": "car",
                                    "type": "group",
                                    "when": {
                                        "parameter": "isCar"
                                    },
                                    "children": [
                                        {
                                            "id": "car-rim",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 100,
                                                "radius": 84,
                                                "fill": "none",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 16
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "car-spoke-left",
                                            "type": "line",
                                            "properties": {
                                                "x1": 80,
                                                "y1": 100,
                                                "x2": 30,
                                                "y2": 100,
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 14,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "car-spoke-right",
                                            "type": "line",
                                            "properties": {
                                                "x1": 120,
                                                "y1": 100,
                                                "x2": 170,
                                                "y2": 100,
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 14,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "car-spoke-bottom",
                                            "type": "line",
                                            "properties": {
                                                "x1": 100,
                                                "y1": 120,
                                                "x2": 100,
                                                "y2": 170,
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 14,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "car-mark",
                                            "type": "line",
                                            "properties": {
                                                "x1": 100,
                                                "y1": 24,
                                                "x2": 100,
                                                "y2": 8,
                                                "stroke": "token:stroke.warning",
                                                "strokeWidth": 10,
                                                "strokeLinecap": "butt"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "markColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "car-hub",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 100,
                                                "radius": 26,
                                                "fill": "token:surface.muted",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 4
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "hubColor"
                                                },
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    "id": "motor-bike",
                                    "type": "group",
                                    "when": {
                                        "parameter": "isMotorBike"
                                    },
                                    "children": [
                                        {
                                            "id": "bike-stem",
                                            "type": "line",
                                            "properties": {
                                                "x1": 100,
                                                "y1": 100,
                                                "x2": 100,
                                                "y2": 50,
                                                "stroke": "token:stroke.subtle",
                                                "strokeWidth": 12,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "gripColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "bike-mark",
                                            "type": "path",
                                            "properties": {
                                                "d": "M100 24 L111 48 L89 48 Z",
                                                "fill": "token:stroke.warning"
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "markColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "bike-bar",
                                            "type": "line",
                                            "properties": {
                                                "x1": 40,
                                                "y1": 100,
                                                "x2": 160,
                                                "y2": 100,
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 12,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "bike-grip-left",
                                            "type": "rect",
                                            "properties": {
                                                "x": 24,
                                                "y": 89,
                                                "width": 48,
                                                "height": 22,
                                                "cornerRadius": 11,
                                                "fill": "token:stroke.subtle"
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "gripColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "bike-grip-right",
                                            "type": "rect",
                                            "properties": {
                                                "x": 128,
                                                "y": 89,
                                                "width": 48,
                                                "height": 22,
                                                "cornerRadius": 11,
                                                "fill": "token:stroke.subtle"
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "gripColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "bike-clamp",
                                            "type": "rect",
                                            "properties": {
                                                "x": 84,
                                                "y": 84,
                                                "width": 32,
                                                "height": 32,
                                                "cornerRadius": 8,
                                                "fill": "token:surface.muted",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 4
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "hubColor"
                                                },
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    "id": "boat",
                                    "type": "group",
                                    "when": {
                                        "parameter": "isBoat"
                                    },
                                    "children": [
                                        {
                                            "id": "boat-rim",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 100,
                                                "radius": 64,
                                                "fill": "none",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 12
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "boat-spoke",
                                            "type": "group",
                                            "modifiers": [
                                                {
                                                    "type": "repeat",
                                                    "count": {
                                                        "parameter": "spokeCount"
                                                    },
                                                    "angleStep": 45,
                                                    "centerX": 100,
                                                    "centerY": 100
                                                }
                                            ],
                                            "children": [
                                                {
                                                    "id": "boat-spoke-arm",
                                                    "type": "line",
                                                    "properties": {
                                                        "x1": 100,
                                                        "y1": 100,
                                                        "x2": 100,
                                                        "y2": 24,
                                                        "stroke": "token:stroke.default",
                                                        "strokeWidth": 9,
                                                        "strokeLinecap": "round"
                                                    },
                                                    "bindings": {
                                                        "stroke": {
                                                            "parameter": "rimColor"
                                                        }
                                                    }
                                                },
                                                {
                                                    "id": "boat-spoke-knob",
                                                    "type": "circle",
                                                    "properties": {
                                                        "centerX": 100,
                                                        "centerY": 20,
                                                        "radius": 9,
                                                        "fill": "token:stroke.default"
                                                    },
                                                    "bindings": {
                                                        "fill": {
                                                            "parameter": "gripColor"
                                                        }
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            "id": "boat-mark",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 20,
                                                "radius": 9,
                                                "fill": "token:stroke.warning"
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "markColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "boat-hub",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 100,
                                                "radius": 20,
                                                "fill": "token:surface.muted",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 4
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "hubColor"
                                                },
                                                "stroke": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "boat-hub-pin",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 100,
                                                "centerY": 100,
                                                "radius": 6,
                                                "fill": "token:stroke.default"
                                            },
                                            "bindings": {
                                                "fill": {
                                                    "parameter": "rimColor"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": "pedals",
                    "type": "group",
                    "when": {
                        "parameter": "showPedals"
                    },
                    "modifiers": [
                        {
                            "type": "translate",
                            "dx": {
                                "parameter": "dx"
                            },
                            "dy": {
                                "parameter": "pedalsDy"
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
                            "id": "car-pedals",
                            "type": "group",
                            "when": {
                                "parameter": "isCar"
                            },
                            "children": [
                                {
                                    "id": "car-bracket",
                                    "type": "line",
                                    "properties": {
                                        "x1": 28,
                                        "y1": 26,
                                        "x2": 172,
                                        "y2": 26,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 5,
                                        "strokeLinecap": "round"
                                    },
                                    "bindings": {
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-floor",
                                    "type": "line",
                                    "properties": {
                                        "x1": 10,
                                        "y1": 186,
                                        "x2": 190,
                                        "y2": 186,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 5,
                                        "strokeLinecap": "round"
                                    },
                                    "bindings": {
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-brake-arm",
                                    "type": "line",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "properties": {
                                        "x1": 52,
                                        "y1": 26,
                                        "x2": 52,
                                        "y2": 119,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 8,
                                        "strokeLinecap": "round"
                                    },
                                    "bindings": {
                                        "y2": {
                                            "parameter": "carBrakeArmY"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-brake-pad",
                                    "type": "rect",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "properties": {
                                        "x": 24,
                                        "y": 108,
                                        "width": 56,
                                        "height": 22,
                                        "cornerRadius": 5,
                                        "fill": "token:stroke.warning",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "y": {
                                            "parameter": "carBrakePadY"
                                        },
                                        "fill": {
                                            "parameter": "brakeColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-brake-hinge",
                                    "type": "circle",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "properties": {
                                        "centerX": 52,
                                        "centerY": 26,
                                        "radius": 7,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-accelerator-arm",
                                    "type": "line",
                                    "properties": {
                                        "x1": 148,
                                        "y1": 26,
                                        "x2": 148,
                                        "y2": 116,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 7,
                                        "strokeLinecap": "round"
                                    },
                                    "bindings": {
                                        "y2": {
                                            "parameter": "carAcceleratorArmY"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-accelerator-pad",
                                    "type": "rect",
                                    "properties": {
                                        "x": 134,
                                        "y": 96,
                                        "width": 28,
                                        "height": 40,
                                        "cornerRadius": 6,
                                        "fill": "token:stroke.accent",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "y": {
                                            "parameter": "carAcceleratorPadY"
                                        },
                                        "fill": {
                                            "parameter": "acceleratorColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "car-accelerator-hinge",
                                    "type": "circle",
                                    "properties": {
                                        "centerX": 148,
                                        "centerY": 26,
                                        "radius": 7,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "id": "bike-levers",
                            "type": "group",
                            "when": {
                                "parameter": "isMotorBike"
                            },
                            "children": [
                                {
                                    "id": "lever-bar",
                                    "type": "line",
                                    "properties": {
                                        "x1": 24,
                                        "y1": 128,
                                        "x2": 176,
                                        "y2": 128,
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 12,
                                        "strokeLinecap": "round"
                                    },
                                    "bindings": {
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "lever-grip-left",
                                    "type": "rect",
                                    "properties": {
                                        "x": 14,
                                        "y": 117,
                                        "width": 52,
                                        "height": 22,
                                        "cornerRadius": 11,
                                        "fill": "token:surface.muted"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        }
                                    }
                                },
                                {
                                    "id": "lever-grip-right",
                                    "type": "rect",
                                    "properties": {
                                        "x": 134,
                                        "y": 117,
                                        "width": 52,
                                        "height": 22,
                                        "cornerRadius": 11,
                                        "fill": "token:surface.muted"
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        }
                                    }
                                },
                                {
                                    "id": "brake-lever",
                                    "type": "group",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "modifiers": [
                                        {
                                            "type": "rotate",
                                            "angle": {
                                                "parameter": "bikeBrakeTilt"
                                            },
                                            "centerX": 68,
                                            "centerY": 128
                                        }
                                    ],
                                    "children": [
                                        {
                                            "id": "brake-lever-arm",
                                            "type": "line",
                                            "properties": {
                                                "x1": 68,
                                                "y1": 128,
                                                "x2": 20,
                                                "y2": 150,
                                                "stroke": "token:stroke.warning",
                                                "strokeWidth": 10,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "brakeColor"
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    "id": "accelerator-lever",
                                    "type": "group",
                                    "modifiers": [
                                        {
                                            "type": "rotate",
                                            "angle": {
                                                "parameter": "bikeAcceleratorTilt"
                                            },
                                            "centerX": 132,
                                            "centerY": 128
                                        }
                                    ],
                                    "children": [
                                        {
                                            "id": "accelerator-lever-arm",
                                            "type": "line",
                                            "properties": {
                                                "x1": 132,
                                                "y1": 128,
                                                "x2": 180,
                                                "y2": 150,
                                                "stroke": "token:stroke.accent",
                                                "strokeWidth": 10,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "stroke": {
                                                    "parameter": "acceleratorColor"
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    "id": "brake-lever-pivot",
                                    "type": "circle",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "properties": {
                                        "centerX": 68,
                                        "centerY": 128,
                                        "radius": 7,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "accelerator-lever-pivot",
                                    "type": "circle",
                                    "properties": {
                                        "centerX": 132,
                                        "centerY": 128,
                                        "radius": 7,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 3
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            "id": "boat-levers",
                            "type": "group",
                            "when": {
                                "parameter": "isBoat"
                            },
                            "children": [
                                {
                                    "id": "binnacle",
                                    "type": "rect",
                                    "properties": {
                                        "x": 14,
                                        "y": 158,
                                        "width": 172,
                                        "height": 34,
                                        "cornerRadius": 10,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 4
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "binnacle-top",
                                    "type": "ellipse",
                                    "properties": {
                                        "centerX": 100,
                                        "centerY": 158,
                                        "radiusX": 86,
                                        "radiusY": 17,
                                        "fill": "token:surface.muted",
                                        "stroke": "token:stroke.default",
                                        "strokeWidth": 4
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "surfaceColor"
                                        },
                                        "stroke": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "astern-track",
                                    "type": "ellipse",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "properties": {
                                        "centerX": 66,
                                        "centerY": 158,
                                        "radiusX": 7,
                                        "radiusY": 12,
                                        "fill": "token:stroke.default",
                                        "stroke": "none",
                                        "opacity": 0.28
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "ahead-track",
                                    "type": "ellipse",
                                    "properties": {
                                        "centerX": 134,
                                        "centerY": 158,
                                        "radiusX": 7,
                                        "radiusY": 12,
                                        "fill": "token:stroke.default",
                                        "stroke": "none",
                                        "opacity": 0.28
                                    },
                                    "bindings": {
                                        "fill": {
                                            "parameter": "frameColor"
                                        }
                                    }
                                },
                                {
                                    "id": "astern-lever",
                                    "type": "group",
                                    "when": {
                                        "parameter": "showBrake"
                                    },
                                    "children": [
                                        {
                                            "id": "astern-lever-arm",
                                            "type": "line",
                                            "properties": {
                                                "x1": 66,
                                                "y1": 158,
                                                "x2": 66,
                                                "y2": 85,
                                                "stroke": "token:stroke.warning",
                                                "strokeWidth": 11,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "y1": {
                                                    "parameter": "asternSlotY"
                                                },
                                                "y2": {
                                                    "parameter": "asternKnobY"
                                                },
                                                "strokeWidth": {
                                                    "parameter": "asternArmWidth"
                                                },
                                                "stroke": {
                                                    "parameter": "brakeColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "astern-lever-knob",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 66,
                                                "centerY": 85,
                                                "radius": 12,
                                                "fill": "token:stroke.warning",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 3
                                            },
                                            "bindings": {
                                                "centerY": {
                                                    "parameter": "asternKnobY"
                                                },
                                                "radius": {
                                                    "parameter": "asternKnobRadius"
                                                },
                                                "fill": {
                                                    "parameter": "brakeColor"
                                                },
                                                "stroke": {
                                                    "parameter": "frameColor"
                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    "id": "ahead-lever",
                                    "type": "group",
                                    "children": [
                                        {
                                            "id": "ahead-lever-arm",
                                            "type": "line",
                                            "properties": {
                                                "x1": 134,
                                                "y1": 158,
                                                "x2": 134,
                                                "y2": 85,
                                                "stroke": "token:stroke.accent",
                                                "strokeWidth": 11,
                                                "strokeLinecap": "round"
                                            },
                                            "bindings": {
                                                "y1": {
                                                    "parameter": "aheadSlotY"
                                                },
                                                "y2": {
                                                    "parameter": "aheadKnobY"
                                                },
                                                "strokeWidth": {
                                                    "parameter": "aheadArmWidth"
                                                },
                                                "stroke": {
                                                    "parameter": "acceleratorColor"
                                                }
                                            }
                                        },
                                        {
                                            "id": "ahead-lever-knob",
                                            "type": "circle",
                                            "properties": {
                                                "centerX": 134,
                                                "centerY": 85,
                                                "radius": 12,
                                                "fill": "token:stroke.accent",
                                                "stroke": "token:stroke.default",
                                                "strokeWidth": 3
                                            },
                                            "bindings": {
                                                "centerY": {
                                                    "parameter": "aheadKnobY"
                                                },
                                                "radius": {
                                                    "parameter": "aheadKnobRadius"
                                                },
                                                "fill": {
                                                    "parameter": "acceleratorColor"
                                                },
                                                "stroke": {
                                                    "parameter": "frameColor"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {
                    "id": "wheel-grab",
                    "type": "ring",
                    "when": {
                        "parameter": "showWheel"
                    },
                    "bindings": {
                        "centerX": {
                            "parameter": "cx"
                        },
                        "centerY": {
                            "parameter": "cy"
                        },
                        "innerRadius": {
                            "parameter": "grabInner"
                        },
                        "outerRadius": {
                            "parameter": "grabOuter"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "behaviours": [
                        {
                            "type": "drag-angle",
                            "when": {
                                "parameter": "turnedByHand"
                            },
                            "variable": {
                                "parameter": "angleVariable"
                            },
                            "property": "angleVariable",
                            "centerX": {
                                "parameter": "cx"
                            },
                            "centerY": {
                                "parameter": "cy"
                            },
                            "degreesPerUnit": -1,
                            "offsetDegrees": 0,
                            "signed": true,
                            "hoverFill": {
                                "parameter": "grabColor"
                            },
                            "hoverOpacity": 0.18
                        },
                        {
                            "type": "drag-angle",
                            "when": {
                                "parameter": "pointedByOrientation"
                            },
                            "variable": {
                                "parameter": "angleVariable"
                            },
                            "property": "angleVariable",
                            "verticalVariable": {
                                "parameter": "angleUpVariable"
                            },
                            "verticalProperty": "angleUpVariable",
                            "centerX": {
                                "parameter": "cx"
                            },
                            "centerY": {
                                "parameter": "cy"
                            },
                            "degreesPerUnit": 1,
                            "offsetDegrees": 0,
                            "wrapAt": 360,
                            "hoverFill": {
                                "parameter": "grabColor"
                            },
                            "hoverOpacity": 0.18
                        }
                    ]
                },
                {
                    "id": "brake-press",
                    "type": "rect",
                    "when": {
                        "parameter": "brakePressShown"
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "dx"
                        },
                        "y": {
                            "parameter": "pedalsDy"
                        },
                        "width": {
                            "parameter": "halfSide"
                        },
                        "height": {
                            "parameter": "side"
                        }
                    },
                    "behaviours": [
                        {
                            "type": "press-and-slide",
                            "when": {
                                "parameter": "turnedByHand"
                            },
                            "variable": {
                                "parameter": "brakingVariable"
                            },
                            "property": "brakingVariable",
                            "unitsPerPixel": {
                                "parameter": "brakeUnitsPerPixel"
                            },
                            "restValue": 0,
                            "returnStep": {
                                "parameter": "pedalReturn"
                            },
                            "intervalMs": 100,
                            "minimum": 0,
                            "maximum": {
                                "parameter": "brakeMaximum"
                            },
                            "hoverFill": {
                                "parameter": "brakeColor"
                            },
                            "hoverOpacity": 0.12
                        },
                        {
                            "type": "press-and-slide",
                            "when": {
                                "parameter": "pointedByOrientation"
                            },
                            "variable": {
                                "parameter": "brakingVariable"
                            },
                            "property": "brakingVariable",
                            "verticalVariable": {
                                "parameter": "brakingUpVariable"
                            },
                            "verticalProperty": "brakingUpVariable",
                            "bearing": {
                                "parameter": "brakeBearing"
                            },
                            "unitsPerPixel": {
                                "parameter": "brakeUnitsPerPixel"
                            },
                            "restValue": 0,
                            "returnStep": {
                                "parameter": "pedalReturn"
                            },
                            "intervalMs": 100,
                            "minimum": 0,
                            "maximum": {
                                "parameter": "brakeMaximum"
                            },
                            "hoverFill": {
                                "parameter": "brakeColor"
                            },
                            "hoverOpacity": 0.12
                        }
                    ]
                },
                {
                    "id": "accelerator-press",
                    "type": "rect",
                    "when": {
                        "parameter": "showPedals"
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "bindings": {
                        "x": {
                            "parameter": "acceleratorPressX"
                        },
                        "y": {
                            "parameter": "pedalsDy"
                        },
                        "width": {
                            "parameter": "acceleratorPressWidth"
                        },
                        "height": {
                            "parameter": "side"
                        }
                    },
                    "behaviours": [
                        {
                            "type": "press-and-slide",
                            "when": {
                                "parameter": "turnedByHand"
                            },
                            "variable": {
                                "parameter": "accelerationVariable"
                            },
                            "property": "accelerationVariable",
                            "unitsPerPixel": {
                                "parameter": "acceleratorUnitsPerPixel"
                            },
                            "restValue": 0,
                            "returnStep": {
                                "parameter": "pedalReturn"
                            },
                            "intervalMs": 100,
                            "minimum": 0,
                            "maximum": {
                                "parameter": "maximum"
                            },
                            "hoverFill": {
                                "parameter": "acceleratorColor"
                            },
                            "hoverOpacity": 0.12
                        },
                        {
                            "type": "press-and-slide",
                            "when": {
                                "parameter": "pointedByOrientation"
                            },
                            "variable": {
                                "parameter": "accelerationVariable"
                            },
                            "property": "accelerationVariable",
                            "verticalVariable": {
                                "parameter": "accelerationUpVariable"
                            },
                            "verticalProperty": "accelerationUpVariable",
                            "bearing": {
                                "parameter": "pointedAngle"
                            },
                            "unitsPerPixel": {
                                "parameter": "acceleratorUnitsPerPixel"
                            },
                            "restValue": 0,
                            "returnStep": {
                                "parameter": "pedalReturn"
                            },
                            "intervalMs": 100,
                            "minimum": 0,
                            "maximum": {
                                "parameter": "maximum"
                            },
                            "hoverFill": {
                                "parameter": "acceleratorColor"
                            },
                            "hoverOpacity": 0.12
                        }
                    ]
                }
            ]
        }
    },
    {
        "schemaVersion": "1.0.0",
        "type": "thermometer",
        "category": "component",
        "displayName": "Thermometer",
        "description": "A temperature read as the height of a column: a bulb, a stem the liquid rises up, and a scale beside it marked every so many degrees. A dashed line carries the top of the column across to the scale, so the reading is placed against the marks the way a chart places a point against its axes. The column can be dragged to write the temperature back, and the marks and their numbers are the sizes the board's own axes are drawn to, so the scale stretches as the object is resized rather than the writing on it.",
        "icon": "fa-light fa-temperature-half",
        "tags": [
            "object",
            "thermometer",
            "temperature",
            "column",
            "scale",
            "meter",
            "sound"
        ],
        "capabilities": [
            "linear",
            "scale",
            "reads-model",
            "interaction",
            "writes-model",
            "audible"
        ],
        "preview": {
            "parameters": {
                "valueVariable": "62",
                "minimum": -50,
                "maximum": 150,
                "tickStep": 50
            }
        },
        "parameters": [
            {
                "id": "valueVariable",
                "label": "Temperature",
                "valueType": "variable",
                "defaultValue": "0",
                "category": "model",
                "unitParameter": "unit",
                "colorParameter": "columnColor",
                "valueAnchor": {
                    "node": "reading-anchor",
                    "x": 0.5,
                    "y": 0.5
                },
                "description": "The term the column stands at. Turning on the eye beside the row stands the term and its value out past the scale, level with the top of the column, in the badge and the figures every other term on the board is read in. Dragging the column writes it back, so a thermometer reading a term the model lets you set is also how that temperature is given — and one reading a computed term is read-only, as every other drawing of a computed term is."
            },
            {
                "id": "minimum",
                "label": "Minimum",
                "valueType": "number",
                "defaultValue": -20,
                "category": "scale",
                "description": "The temperature the bottom of the scale stands for, at the top of the bulb. A column at or below it shows a full bulb and an empty stem."
            },
            {
                "id": "maximum",
                "label": "Maximum",
                "valueType": "number",
                "defaultValue": 120,
                "category": "scale"
            },
            {
                "id": "tickStep",
                "label": "Step",
                "valueType": "number",
                "defaultValue": 20,
                "category": "scale",
                "minimum": 0,
                "bindable": false,
                "description": "How many degrees there are between one numbered mark and the next, counted up from the minimum — the whole of the scale's marking, as the step is the whole of a slider's. A step the range does not divide evenly leaves the last part of the scale unmarked, the way an axis does. Between the numbered marks the scale is divided into five by smaller marks of its own. A step so fine that it would ask for more than thirty numbered marks is read as the finest that fits, and so is a step of nothing at all — which is how to let the object mark the scale itself."
            },
            {
                "id": "digits",
                "label": "Decimals",
                "valueType": "number",
                "defaultValue": 1,
                "category": "display",
                "minimum": 0,
                "maximum": 6,
                "description": "Decimals the reading is written to. The numbers along the scale follow it only when the step needs them: a step in whole degrees is marked in whole degrees however finely the reading is given."
            },
            {
                "id": "unit",
                "label": "Unit",
                "valueType": "string",
                "defaultValue": "°C",
                "enumValues": [
                    "°C",
                    "°F"
                ],
                "enumIcons": [
                    "fa-light fa-c",
                    "fa-light fa-f"
                ],
                "category": "display",
                "description": "Which temperature scale the reading is named in when the term it reads names none of its own. A term carrying a unit is read in that one, chosen beside the term the way every unit on the board is, and this is what is left for a thermometer standing at a plain number. Either way it names the scale rather than converting it: the numbers themselves are the minimum and the maximum, so a thermometer switched to Fahrenheit is one whose model measures in Fahrenheit and whose ends are set to match."
            },
            {
                "id": "showReadout",
                "label": "Show readout",
                "valueType": "boolean",
                "defaultValue": true,
                "category": "display",
                "description": "The reading in figures above the stem. The column says how hot at a glance; this says how hot exactly."
            },
            {
                "id": "columnColor",
                "label": "Column colour",
                "valueType": "colour",
                "defaultValue": "token:stroke.warning",
                "category": "style"
            },
            {
                "id": "glassColor",
                "label": "Glass colour",
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
                "id": "scaleColor",
                "label": "Scale colour",
                "valueType": "colour",
                "defaultValue": "token:axis.color",
                "category": "style",
                "description": "The marks along the scale. They are drawn to the measurements the board's own axes are drawn to, so a thermometer beside a chart is read the same way."
            },
            {
                "id": "scaleLabelColor",
                "label": "Scale label colour",
                "valueType": "colour",
                "defaultValue": "token:axis.labelColor",
                "category": "style"
            },
            {
                "id": "readoutColor",
                "label": "Reading colour",
                "valueType": "colour",
                "defaultValue": "token:text.primary",
                "category": "style"
            },
            {
                "id": "sound",
                "label": "Sound",
                "valueType": "audio",
                "defaultValue": "",
                "category": "sound",
                "valueParameter": "valueVariable",
                "minimumParameter": "minimum",
                "maximumParameter": "maximum",
                "description": "A sound the thermometer makes as the temperature moves. The clip is chosen from a file or from the catalogue's audios, and it is heard over the very ends the scale is marked between, so the coldest the thermometer can read is one end of the sound and the hottest the other. Beside it stands the choice of what the temperature does to the clip: heard as pitch it is played higher as the column rises, and heard as volume it is played louder. It is heard only while the temperature is changing, so a thermometer standing still is silent however long it stands there."
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
                "id": "shortSide",
                "formula": "\\min\\left(w,h\\right)"
            },
            {
                "id": "pad",
                "formula": "\\max\\left(3,shortSide\\cdot0.04\\right)"
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
                "id": "axisStroke",
                "value": {
                    "token": "axis.strokeWidth"
                }
            },
            {
                "id": "minorOpacity",
                "value": {
                    "token": "axis.minorOpacity"
                }
            },
            {
                "id": "readoutWeight",
                "value": {
                    "token": "font.weight.strong"
                }
            },
            {
                "id": "crosshairDash",
                "value": {
                    "token": "crosshair.dash"
                }
            },
            {
                "id": "crosshairOpacity",
                "value": {
                    "token": "opacity.ghost"
                }
            },
            {
                "id": "crosshairWidth",
                "value": {
                    "token": "crosshair.strokeWidth"
                }
            },
            {
                "id": "labelFontSize",
                "value": {
                    "token": "font.size.tick"
                }
            },
            {
                "id": "labelGapRatio",
                "value": {
                    "token": "axis.labelGapY"
                }
            },
            {
                "id": "labelRiseRatio",
                "value": {
                    "token": "axis.labelRise"
                }
            },
            {
                "id": "readoutFontSize",
                "value": {
                    "token": "font.size.large"
                }
            },
            {
                "id": "readoutBand",
                "value": {
                    "choose": {
                        "parameter": "showReadout"
                    },
                    "then": {
                        "formula": "readoutFontSize\\cdot1.5"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "bulbRadius",
                "formula": "\\max\\left(4,\\min\\left(w\\cdot0.1,h\\cdot0.1\\right)\\right)"
            },
            {
                "id": "stemWidth",
                "formula": "bulbRadius\\cdot0.95"
            },
            {
                "id": "stemCorner",
                "formula": "\\frac{stemWidth}{2}"
            },
            {
                "id": "columnWidth",
                "formula": "stemWidth\\cdot0.46"
            },
            {
                "id": "columnCorner",
                "formula": "\\frac{columnWidth}{2}"
            },
            {
                "id": "majorTickLength",
                "value": {
                    "token": "axis.tickLength"
                }
            },
            {
                "id": "minorTickLength",
                "value": {
                    "token": "axis.minorTickLength"
                }
            },
            {
                "id": "tickGap",
                "formula": "strokeStrong"
            },
            {
                "id": "labelGap",
                "formula": "labelFontSize\\cdot labelGapRatio"
            },
            {
                "id": "labelRise",
                "formula": "labelFontSize\\cdot labelRiseRatio"
            },
            {
                "id": "labelWidth",
                "formula": "labelFontSize\\cdot2.4"
            },
            {
                "id": "rightExtent",
                "formula": "\\max\\left(bulbRadius,stemCorner+tickGap+majorTickLength+labelGap+labelWidth\\right)"
            },
            {
                "id": "glassCenterX",
                "formula": "\\max\\left(pad+bulbRadius,\\frac{w+bulbRadius-rightExtent}{2}\\right)"
            },
            {
                "id": "stemLeft",
                "formula": "glassCenterX-stemCorner"
            },
            {
                "id": "stemRight",
                "formula": "glassCenterX+stemCorner"
            },
            {
                "id": "glassTop",
                "formula": "pad+readoutBand"
            },
            {
                "id": "bulbCenterY",
                "formula": "h-pad-bulbRadius"
            },
            {
                "id": "bulbTop",
                "formula": "bulbCenterY-bulbRadius"
            },
            {
                "id": "bulbLiquidRadius",
                "formula": "\\max\\left(1,bulbRadius-strokeStrong\\right)"
            },
            {
                "id": "stemHeight",
                "formula": "\\max\\left(1,bulbCenterY-glassTop\\right)"
            },
            {
                "id": "neckTop",
                "formula": "bulbTop-strokeStrong"
            },
            {
                "id": "neckHeight",
                "formula": "bulbRadius+strokeStrong\\cdot2"
            },
            {
                "id": "neckMeetY",
                "formula": "bulbCenterY-\\sqrt{\\max\\left(0,bulbRadius\\cdot bulbRadius-stemCorner\\cdot stemCorner\\right)}"
            },
            {
                "id": "scaleBottom",
                "formula": "bulbTop-\\max\\left(1,stemWidth\\cdot0.1\\right)"
            },
            {
                "id": "scaleTop",
                "formula": "glassTop+stemWidth\\cdot0.65"
            },
            {
                "id": "scaleSpan",
                "formula": "\\max\\left(1,scaleBottom-scaleTop\\right)"
            },
            {
                "id": "span",
                "formula": "maximum-minimum"
            },
            {
                "id": "pixelsPerValue",
                "value": {
                    "choose": {
                        "parameter": "span"
                    },
                    "then": {
                        "formula": "\\frac{scaleSpan}{span}"
                    },
                    "otherwise": 0
                }
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
                        "parameter": "span"
                    },
                    "then": {
                        "formula": "\\max\\left(0,\\min\\left(1,\\frac{value-minimum}{span}\\right)\\right)"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "columnTop",
                "formula": "scaleBottom-ratio\\cdot scaleSpan"
            },
            {
                "id": "columnHeight",
                "formula": "\\max\\left(0,bulbCenterY-columnTop\\right)"
            },
            {
                "id": "columnX",
                "formula": "glassCenterX-columnCorner"
            },
            {
                "id": "spanUpwards",
                "formula": "\\max\\left(0,span\\right)"
            },
            {
                "id": "markPixels",
                "formula": "labelFontSize\\cdot2.2"
            },
            {
                "id": "coarsestNeeded",
                "formula": "\\frac{spanUpwards\\cdot markPixels}{scaleSpan}"
            },
            {
                "id": "wholeNeeded",
                "formula": "coarsestNeeded-\\mod\\left(coarsestNeeded,1\\right)+1"
            },
            {
                "id": "fallbackStep",
                "value": {
                    "choose": {
                        "formula": "\\max\\left(0,coarsestNeeded-1\\right)"
                    },
                    "then": {
                        "parameter": "wholeNeeded"
                    },
                    "otherwise": {
                        "parameter": "coarsestNeeded"
                    }
                }
            },
            {
                "id": "stepsIfHonoured",
                "formula": "\\frac{spanUpwards}{\\max\\left(0.000001,tickStep\\right)}"
            },
            {
                "id": "tooManySteps",
                "formula": "\\max\\left(0,stepsIfHonoured-30\\right)"
            },
            {
                "id": "step",
                "value": {
                    "choose": {
                        "parameter": "tooManySteps"
                    },
                    "then": {
                        "parameter": "fallbackStep"
                    },
                    "otherwise": {
                        "parameter": "tickStep"
                    }
                }
            },
            {
                "id": "stepsAcross",
                "formula": "\\frac{span}{\\max\\left(0.000001,step\\right)}"
            },
            {
                "id": "stepCount",
                "formula": "\\max\\left(1,\\min\\left(30,stepsAcross-\\mod\\left(stepsAcross,1\\right)\\right)\\right)"
            },
            {
                "id": "majorCount",
                "formula": "stepCount+1"
            },
            {
                "id": "pixelsPerStep",
                "formula": "pixelsPerValue\\cdot step"
            },
            {
                "id": "majorSpacing",
                "formula": "-pixelsPerStep"
            },
            {
                "id": "minorSpacing",
                "formula": "-\\frac{pixelsPerStep}{5}"
            },
            {
                "id": "minorCount",
                "formula": "stepCount\\cdot5+1"
            },
            {
                "id": "tickDigits",
                "value": {
                    "choose": {
                        "formula": "\\mod\\left(step,1\\right)"
                    },
                    "then": {
                        "parameter": "digits"
                    },
                    "otherwise": 0
                }
            },
            {
                "id": "tickStartX",
                "formula": "stemRight+tickGap"
            },
            {
                "id": "majorTickEndX",
                "formula": "tickStartX+majorTickLength"
            },
            {
                "id": "minorTickEndX",
                "formula": "tickStartX+minorTickLength"
            },
            {
                "id": "labelX",
                "formula": "majorTickEndX+labelGap"
            },
            {
                "id": "labelBaseY",
                "formula": "scaleBottom+labelRise"
            },
            {
                "id": "anchorX",
                "formula": "labelX+labelWidth+labelGap"
            },
            {
                "id": "anchorY",
                "formula": "columnTop-\\frac{labelFontSize}{2}"
            },
            {
                "id": "readoutX",
                "formula": "\\frac{w}{2}"
            },
            {
                "id": "readoutY",
                "formula": "pad+readoutFontSize\\cdot0.7"
            },
            {
                "id": "unitsPerPixel",
                "formula": "\\frac{span}{scaleSpan}"
            },
            {
                "id": "readoutUnit",
                "fallback": "",
                "value": {
                    "choose": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "then": {
                        "termUnit": {
                            "parameter": "valueVariable"
                        }
                    },
                    "otherwise": {
                        "parameter": "unit"
                    }
                }
            },
            {
                "id": "readoutText",
                "value": {
                    "format": {
                        "parameter": "value"
                    },
                    "digits": {
                        "parameter": "digits"
                    }
                }
            }
        ],
        "root": {
            "id": "thermometer",
            "type": "group",
            "children": [
                {
                    "id": "bulb-glass",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "glassCenterX"
                        },
                        "centerY": {
                            "parameter": "bulbCenterY"
                        },
                        "radius": {
                            "parameter": "bulbRadius"
                        },
                        "fill": {
                            "parameter": "glassColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "stem-glass",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "stemLeft"
                        },
                        "y": {
                            "parameter": "glassTop"
                        },
                        "width": {
                            "parameter": "stemWidth"
                        },
                        "height": {
                            "parameter": "stemHeight"
                        },
                        "cornerRadius": {
                            "parameter": "stemCorner"
                        },
                        "fill": {
                            "parameter": "glassColor"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "neck-patch",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "stemLeft"
                        },
                        "y": {
                            "parameter": "neckTop"
                        },
                        "width": {
                            "parameter": "stemWidth"
                        },
                        "height": {
                            "parameter": "neckHeight"
                        },
                        "fill": {
                            "parameter": "glassColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "neck-left",
                    "type": "line",
                    "bindings": {
                        "x1": {
                            "parameter": "stemLeft"
                        },
                        "y1": {
                            "parameter": "neckTop"
                        },
                        "x2": {
                            "parameter": "stemLeft"
                        },
                        "y2": {
                            "parameter": "neckMeetY"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "neck-right",
                    "type": "line",
                    "bindings": {
                        "x1": {
                            "parameter": "stemRight"
                        },
                        "y1": {
                            "parameter": "neckTop"
                        },
                        "x2": {
                            "parameter": "stemRight"
                        },
                        "y2": {
                            "parameter": "neckMeetY"
                        },
                        "stroke": {
                            "parameter": "borderColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeStrong"
                        }
                    }
                },
                {
                    "id": "bulb-liquid",
                    "type": "circle",
                    "bindings": {
                        "centerX": {
                            "parameter": "glassCenterX"
                        },
                        "centerY": {
                            "parameter": "bulbCenterY"
                        },
                        "radius": {
                            "parameter": "bulbLiquidRadius"
                        },
                        "fill": {
                            "parameter": "columnColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "column",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "columnX"
                        },
                        "y": {
                            "parameter": "columnTop"
                        },
                        "width": {
                            "parameter": "columnWidth"
                        },
                        "height": {
                            "parameter": "columnHeight"
                        },
                        "cornerRadius": {
                            "parameter": "columnCorner"
                        },
                        "fill": {
                            "parameter": "columnColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "reading-crosshair",
                    "type": "line",
                    "bindings": {
                        "x1": {
                            "parameter": "stemLeft"
                        },
                        "y1": {
                            "parameter": "columnTop"
                        },
                        "x2": {
                            "parameter": "majorTickEndX"
                        },
                        "y2": {
                            "parameter": "columnTop"
                        },
                        "stroke": {
                            "parameter": "columnColor"
                        },
                        "strokeWidth": {
                            "parameter": "crosshairWidth"
                        },
                        "strokeDash": {
                            "parameter": "crosshairDash"
                        },
                        "opacity": {
                            "parameter": "crosshairOpacity"
                        }
                    }
                },
                {
                    "id": "reading-anchor",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "anchorX"
                        },
                        "y": {
                            "parameter": "anchorY"
                        },
                        "width": {
                            "parameter": "labelWidth"
                        },
                        "height": {
                            "parameter": "labelFontSize"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    }
                },
                {
                    "id": "minor-tick",
                    "type": "line",
                    "bindings": {
                        "x1": {
                            "parameter": "tickStartX"
                        },
                        "y1": {
                            "parameter": "scaleBottom"
                        },
                        "x2": {
                            "parameter": "minorTickEndX"
                        },
                        "y2": {
                            "parameter": "scaleBottom"
                        },
                        "stroke": {
                            "parameter": "scaleColor"
                        },
                        "strokeWidth": {
                            "parameter": "strokeDefault"
                        },
                        "opacity": {
                            "parameter": "minorOpacity"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "minorCount"
                            },
                            "dy": {
                                "parameter": "minorSpacing"
                            }
                        }
                    ]
                },
                {
                    "id": "major-tick",
                    "type": "line",
                    "bindings": {
                        "x1": {
                            "parameter": "tickStartX"
                        },
                        "y1": {
                            "parameter": "scaleBottom"
                        },
                        "x2": {
                            "parameter": "majorTickEndX"
                        },
                        "y2": {
                            "parameter": "scaleBottom"
                        },
                        "stroke": {
                            "parameter": "scaleColor"
                        },
                        "strokeWidth": {
                            "parameter": "axisStroke"
                        }
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "majorCount"
                            },
                            "dy": {
                                "parameter": "majorSpacing"
                            }
                        }
                    ]
                },
                {
                    "id": "tick-label",
                    "type": "text",
                    "bindings": {
                        "x": {
                            "parameter": "labelX"
                        },
                        "y": {
                            "parameter": "labelBaseY"
                        },
                        "text": {
                            "format": {
                                "formula": "minimum+step\\cdot i",
                                "inputs": {
                                    "i": {
                                        "parameter": "$index"
                                    }
                                }
                            },
                            "digits": {
                                "parameter": "tickDigits"
                            }
                        },
                        "fontSize": {
                            "parameter": "labelFontSize"
                        },
                        "fill": {
                            "parameter": "scaleLabelColor"
                        }
                    },
                    "properties": {
                        "stroke": "none",
                        "textAnchor": "start",
                        "baseline": "auto"
                    },
                    "modifiers": [
                        {
                            "type": "repeat",
                            "count": {
                                "parameter": "majorCount"
                            },
                            "dy": {
                                "parameter": "majorSpacing"
                            }
                        }
                    ]
                },
                {
                    "id": "readout",
                    "type": "text",
                    "when": {
                        "parameter": "showReadout"
                    },
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
                        "unit": {
                            "parameter": "readoutUnit"
                        },
                        "fontSize": {
                            "parameter": "readoutFontSize"
                        },
                        "fontWeight": {
                            "parameter": "readoutWeight"
                        },
                        "fill": {
                            "parameter": "readoutColor"
                        }
                    },
                    "properties": {
                        "stroke": "none"
                    }
                },
                {
                    "id": "column-grab",
                    "type": "rect",
                    "bindings": {
                        "x": {
                            "parameter": "stemLeft"
                        },
                        "y": {
                            "parameter": "glassTop"
                        },
                        "width": {
                            "parameter": "stemWidth"
                        },
                        "height": {
                            "parameter": "stemHeight"
                        }
                    },
                    "properties": {
                        "fill": "none",
                        "stroke": "none"
                    },
                    "behaviours": [
                        {
                            "type": "press-and-slide",
                            "variable": {
                                "parameter": "valueVariable"
                            },
                            "property": "valueVariable",
                            "unitsPerPixel": {
                                "parameter": "unitsPerPixel"
                            },
                            "restValue": {
                                "parameter": "minimum"
                            },
                            "returnStep": 0,
                            "intervalMs": 100,
                            "minimum": {
                                "parameter": "minimum"
                            },
                            "maximum": {
                                "parameter": "maximum"
                            },
                            "hoverFill": {
                                "parameter": "columnColor"
                            },
                            "hoverOpacity": 0.12
                        }
                    ]
                }
            ]
        }
    }
]);
