function resolveExpressionTemplateShortcuts(independentTermName) {
    const resolvedIndependentTermName = independentTermName ?? "t";
    const previewTermName = resolvedIndependentTermName === "x" ? "y" : "x";
    return [
        { name: "Differential", text: `\\frac{\\mathrm{d}${previewTermName}}{\\mathrm{d}${resolvedIndependentTermName}}`, insertText: `\\frac{\\mathrm{d}\\placeholder{}}{\\mathrm{d}${resolvedIndependentTermName}}`, shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
        { name: "Power", text: `${previewTermName}^2`, insertText: "\\placeholder{}^2", shortcut: "^" },
        { name: "Squareroot", text: `\\sqrt{${previewTermName}}`, insertText: "\\sqrt{\\placeholder{}}", shortcut: "#" },
        { name: "Index", text: `${previewTermName}_{${resolvedIndependentTermName}-1}`, insertText: `\\placeholder{}_{${resolvedIndependentTermName}-1}`, shortcut: "_" },
        { name: "Condition", text: `\\begin{cases} 2 & ${resolvedIndependentTermName}=0 \\\\ 4 & ${resolvedIndependentTermName}\\ge2\\end{cases}`, insertText: `\\begin{cases}\\placeholder{} & ${resolvedIndependentTermName}=0 \\\\ \\placeholder{} & ${resolvedIndependentTermName}\\ge2\\end{cases}`, shortcut: "\\" },
        { name: "Not", text: `\\neg ${previewTermName}`, insertText: "\\neg", shortcut: "~" },
        { name: "Or", text: `${previewTermName}>0 \\lor ${previewTermName}<5`, insertText: "\\lor", shortcutMac: "⌥v", shortcutWindows: "Alt+v" },
        { name: "And", text: `${previewTermName}>0 \\land ${previewTermName}<5`, insertText: "\\land", shortcutMac: "⌥^", shortcutWindows: "Alt+^" },
        { name: "Floor", text: `\\lfloor ${previewTermName}\\rfloor`, insertText: "\\lfloor\\placeholder{}\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" },
        { name: "Ceil", text: `\\lceil ${previewTermName}\\rceil`, insertText: "\\lceil\\placeholder{}\\rceil", shortcutMac: "⌘_", shortcutWindows: "" }
    ];
}