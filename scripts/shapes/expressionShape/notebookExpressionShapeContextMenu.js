Object.assign(ExpressionNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    },

    insertShortcut(shortcutText) {
        if (!this.expressionControl)
            return;
        const currentValue = this.expressionControl.getValue();
        this.expressionControl.setValue(`${currentValue}${shortcutText}`);
        this.block.content = this.expressionControl.getValue();
        this.markChanged();
    },

    insert(text) {
        this.insertShortcut(text);
    },

    getTemplateShortcuts() {
        const independentTermName = this.notebookEditor?.calculator?.properties?.independent?.name ?? "t";
        const previewTermName = independentTermName === "x" ? "y" : "x";
        return [
            { name: "Differential", text: `\\frac{\\mathrm{d}${previewTermName}}{\\mathrm{d}${independentTermName}}`, insertText: `\\frac{\\mathrm{d}\\placeholder{}}{\\mathrm{d}${independentTermName}}`, shortcutMac: "⌥/", shortcutWindows: "Alt+/" },
            { name: "Power", text: `${previewTermName}^2`, insertText: "\\placeholder{}^2", shortcut: "^" },
            { name: "Squareroot", text: `\\sqrt{${previewTermName}}`, insertText: "\\sqrt{\\placeholder{}}", shortcut: "#" },
            { name: "Index", text: `${previewTermName}_{${independentTermName}-1}`, insertText: `\\placeholder{}_{${independentTermName}-1}`, shortcut: "_" },
            { name: "Condition", text: `\\begin{cases} 2 & ${independentTermName}=0 \\\\ 4 & ${independentTermName}\\ge2\\end{cases}`, insertText: `\\begin{cases}\\placeholder{} & ${independentTermName}=0 \\\\ \\placeholder{} & ${independentTermName}\\ge2\\end{cases}`, shortcut: "\\" },
            { name: "Not", text: `\\neg ${previewTermName}`, insertText: "\\neg", shortcut: "~" },
            { name: "Or", text: `${previewTermName}>0 \\lor ${previewTermName}<5`, insertText: "\\lor", shortcutMac: "⌥v", shortcutWindows: "Alt+v" },
            { name: "And", text: `${previewTermName}>0 \\land ${previewTermName}<5`, insertText: "\\land", shortcutMac: "⌥^", shortcutWindows: "Alt+^" },
            { name: "Floor", text: `\\lfloor ${previewTermName}\\rfloor`, insertText: "\\lfloor\\placeholder{}\\rfloor", shortcutMac: "⌥_", shortcutWindows: "Alt+_" },
            { name: "Ceil", text: `\\lceil ${previewTermName}\\rceil`, insertText: "\\lceil\\placeholder{}\\rceil", shortcutMac: "⌘_", shortcutWindows: "" }
        ];
    },

    createShortcutTooltip(cell, itemData) {
    }
});
