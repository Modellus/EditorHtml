function resolveExpressionTemplateShortcuts(independentTermName) {
    const resolvedIndependentTermName = independentTermName ?? "t";
    const previewTermName = resolvedIndependentTermName === "x" ? "y" : "x";
    return [
        { name: "Differential", text: `\\frac{\\mathrm{d}${previewTermName}}{\\mathrm{d}${resolvedIndependentTermName}}`, insertText: `\\frac{\\differentialD{\\placeholder{}}}{\\differentialD{${resolvedIndependentTermName}}}`, shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
        { name: "Power", text: `${previewTermName}^2`, insertText: "\\placeholder{}^2", shortcut: "^" },
        { name: "Square root", text: `\\sqrt{${previewTermName}}`, insertText: "\\sqrt{\\placeholder{}}", shortcut: "#" },
        { name: "Index", text: `${previewTermName}_{i}`, insertText: "\\placeholder{}_{\\placeholder{}}", shortcut: "_" },
        { name: "Factorial", text: `${previewTermName}!`, insertText: "\\placeholder{}!", shortcut: "!" },
        { name: "Delta", text: `\\Delta ${previewTermName}`, insertText: "\\Delta", shortcut: "%" },
        { name: "Absolute value", text: `\\left|${previewTermName}\\right|`, insertText: "\\left|\\placeholder{}\\right|", shortcut: "|" },
        { name: "Not equal", text: `${previewTermName}\\ne y`, insertText: "\\ne", shortcut: "<>" },
        { name: "Greater or equal", text: `${previewTermName}\\ge1`, insertText: "\\geq", shortcut: ">=" },
        { name: "Less or equal", text: `${previewTermName}\\le1`, insertText: "\\leq", shortcut: "<=" },
        { name: "Condition", text: `\\begin{cases} 2 & ${resolvedIndependentTermName}=0 \\\\ 4 & ${resolvedIndependentTermName}\\ge2\\end{cases}`, insertText: `\\begin{cases}\\placeholder{} & ${resolvedIndependentTermName}=0 \\\\ \\placeholder{} & ${resolvedIndependentTermName}\\ge2\\end{cases}`, shortcut: "\\" },
        { name: "Not", text: `\\neg ${previewTermName}`, insertText: "\\neg", shortcut: "~" },
        { name: "Or", text: `${previewTermName}>0 \\lor ${previewTermName}<5`, insertText: "\\lor", shortcutMac: "⌥v", shortcutWindows: "Alt+v" },
        { name: "And", text: `${previewTermName}>0 \\land ${previewTermName}<5`, insertText: "\\land", shortcutMac: "⌥^", shortcutWindows: "Alt+^" },
        { name: "Floor", text: `\\lfloor ${previewTermName}\\rfloor`, insertText: "\\lfloor\\placeholder{}\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" },
        { name: "Ceil", text: `\\lceil ${previewTermName}\\rceil`, insertText: "\\lceil\\placeholder{}\\rceil", shortcutMac: "⌘_", shortcutWindows: "" },
        { name: "Fraction", text: `\\frac{${previewTermName}}{y}`, insertText: "\\frac{\\placeholder{}}{\\placeholder{}}", shortcutMac: "⌘/", shortcutWindows: "Ctrl+/" },
        { name: "Multiplication", text: `${previewTermName}\\cdot y`, insertText: "\\cdot", shortcut: "*" },
        { name: "Prime", text: `${previewTermName}^{\\prime}`, insertText: "^{\\prime}", shortcut: "'" },
        { name: "Belongs to", text: `${previewTermName}\\in\\{1,2,3\\}`, insertText: "\\in", shortcutMac: "\u2325e", shortcutWindows: "Alt+e" },
        { name: "Set", text: "\\{1,2,3\\}", insertText: "\\{\\placeholder{},\\placeholder{},\\placeholder{}\\}" },
        { name: "Range", text: "\\left[1..5\\right]", insertText: "\\left[\\placeholder{}..\\placeholder{}\\right]" },
        { name: "Interval", text: "\\left[6,7\\right]", insertText: "\\left[\\placeholder{},\\placeholder{}\\right]" },
        { name: "Union", text: "\\{1,2,3\\}\\cup\\left[6,7\\right]", insertText: "\\cup", shortcutMac: "\u2325u", shortcutWindows: "Alt+u" },
        { name: "Text values", text: "\\{\\text{red},\\text{green}\\}", insertText: "\\{\\text{\\placeholder{}},\\text{\\placeholder{}}\\}" },
        { name: "Real numbers", text: `${previewTermName}\\in\\mathbb{R}`, insertText: "\\mathbb{R}" },
        { name: "Integers", text: `${previewTermName}\\in\\mathbb{Z}`, insertText: "\\mathbb{Z}" },
        { name: "Natural numbers", text: `${previewTermName}\\in\\mathbb{N}`, insertText: "\\mathbb{N}" },
        { name: "Booleans", text: `${previewTermName}\\in\\mathbb{B}`, insertText: "\\mathbb{B}" },
        { name: "Named domain", text: "\\text{domain}\\ Color=\\{\\text{red},\\text{green}\\}", insertText: "\\text{domain}\\ \\placeholder{}=\\placeholder{}" },
        { name: "Random value", text: `${previewTermName}=rnd\\left(3\\right)`, insertText: "rnd\\left(\\placeholder{}\\right)" }
    ];
}
