class TextShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    _onDocumentMouseDown = e => {
        if (!this.element.contains(e.target) && !this.$toolbarHost[0].contains(e.target) && !$(e.target).closest(".dx-overlay-wrapper").length)
            this.exitEditMode();
    };

    createToolbar() {
        const items = super.createToolbar();
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    getCopySubMenuItems() {
        return [
            ...super.getCopySubMenuItems(),
            { text: "Copy as Text", icon: "fa-light fa-align-left", shortcut: "", action: () => this.copyAsText() },
            { text: "Copy as Markup", icon: "fa-light fa-code", shortcut: "", action: () => this.copyAsMarkup() }
        ];
    }

    async copyAsText() {
        const plainText = this.htmlEditor.getQuillInstance().getText();
        await navigator.clipboard.writeText(plainText);
    }

    async copyAsMarkup() {
        await navigator.clipboard.writeText(this.properties.text ?? "");
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Text Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.text = "Unleash your inner scientist—type, format, and let the math magic happen!";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $wrapper = $("<div>").appendTo(foreignObject);
        this.container = $wrapper.get(0);
        $wrapper.css({ "width": "100%", "height": "100%", "display": "flex", "flex-direction": "column", "overflow": "hidden" });
        const $editorHost = $("<div>").appendTo($wrapper);
        $editorHost.css({ "flex": "1", "min-height": "0", "overflow": "auto" });
        this.$toolbarHost = $("<div>").appendTo(document.body);
        this.$toolbarHost.css({ "display": "none", "position": "fixed", "z-index": "10000", "background-color": "#fff", "border": "1px solid #e0e0e0", "border-radius": "4px", "box-shadow": "0 2px 8px rgba(0,0,0,0.15)", "width": this.properties.width + "px" });
        this.htmlEditor = $editorHost.dxHtmlEditor({
            valueType: "markdown",
            toolbar: {
                container: this.$toolbarHost[0],
                multiline: false,
                items: [
                    "undo", "redo", "separator",
                    "bold", "italic", "underline", "strike", "separator",
                    {
                        name: "header",
                        acceptedValues: [false, 1, 2, 3, 4, 5],
                        options: { inputAttr: { "aria-label": "Header" } },
                    },
                    "separator",
                    { name: "font", acceptedValues: ["Arial", "Georgia", "Tahoma", "Times New Roman", "Verdana"] },
                    { name: "size", acceptedValues: ["8pt", "10pt", "12pt", "14pt", "18pt", "24pt", "36pt"] },
                    "separator",
                    "alignLeft", "alignCenter", "alignRight", "alignJustify", "separator",
                    "orderedList", "bulletList", "separator",
                    "link",
                    {
                        widget: "dxButton",
                        options: {
                            icon: "fa-light fa-function",
                            stylingMode: "text",
                            onClick: () => this.insertFormula()
                        }
                    },
                    "insertTable", "separator",
                    "blockquote", "codeBlock", "separator",
                    "clear",
                ],
            },
            value: this.properties.text,
            onValueChanged: e => this.properties.text = e.value
        }).dxHtmlEditor("instance");
        return foreignObject;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.text == undefined)
            return;
        this.htmlEditor.option("value", properties.text);
    }

    enterEditMode() {
        if (!this.htmlEditor || typeof this.htmlEditor.focus !== "function")
            return super.enterEditMode();
        this.container.style.cursor = "text";
        this.$toolbarHost.css({ "display": "", "width": this.properties.width + "px" });
        this.positionEditorToolbar();
        this.board.pointerLocked = true;
        document.addEventListener("mousedown", this._onDocumentMouseDown);
        this.htmlEditor.focus();
        this.$toolbarHost.find(".dx-toolbar").dxToolbar("instance").repaint();
        return true;
    }

    exitEditMode() {
        this.container.style.cursor = "";
        this.$toolbarHost.css("display", "none");
        this.board.pointerLocked = false;
        document.removeEventListener("mousedown", this._onDocumentMouseDown);
        this.htmlEditor.blur();
    }

    insertFormula() {
        this._formulaInsertRange = this.htmlEditor.getQuillInstance().getSelection(true);
        if (this.$formulaPopup) {
            this.$formulaPopup.dxPopup("instance").show();
            return;
        }
        this.$formulaPopup = $("<div>").appendTo(document.body);
        this.$formulaPopup.dxPopup({
            visible: true,
            wrapperAttr: { class: "mdl-shape-overlay-popup" },
            title: "Insert Formula",
            width: 420,
            height: "auto",
            showCloseButton: true,
            dragEnabled: true,
            hideOnOutsideClick: false,
            shading: false,
            onShown: () => {
                if (this.formulaMathfield)
                    this.formulaMathfield.value = "";
            },
            toolbarItems: [
                {
                    widget: "dxButton",
                    toolbar: "bottom",
                    location: "after",
                    options: {
                        text: "Insert",
                        type: "default",
                        stylingMode: "contained",
                        onClick: () => {
                            const latex = this.formulaMathfield.getValue("latex");
                            if (latex) {
                                const quill = this.htmlEditor.getQuillInstance();
                                const range = this._formulaInsertRange;
                                quill.insertEmbed(range.index, "formula", latex, "user");
                                quill.setSelection(range.index + 1, 0, "silent");
                            }
                            this.$formulaPopup.dxPopup("instance").hide();
                        }
                    }
                },
                {
                    widget: "dxButton",
                    toolbar: "bottom",
                    location: "after",
                    options: {
                        text: "Cancel",
                        stylingMode: "text",
                        onClick: () => this.$formulaPopup.dxPopup("instance").hide()
                    }
                }
            ],
            contentTemplate: container => {
                container.append(this.createFormulaPopupContent());
            }
        });
    }

    createFormulaPopupContent() {
        const $content = $('<div style="display:flex;flex-direction:column;gap:12px;padding:4px"></div>');
        this.formulaMathfield = new MathfieldElement();
        this.formulaMathfield.style.cssText = "font-size:24px;min-height:50px;border:1px solid #e0e0e0;border-radius:4px;padding:8px";
        this.formulaMathfield.virtualKeyboardMode = "off";
        this.formulaMathfield.mathVirtualKeyboardPolicy = "manual";
        this.formulaMathfield.popoverPolicy = "off";
        MathfieldElement.soundsDirectory = null;
        $content.append(this.formulaMathfield);
        const shortcuts = [
            { latex: "\\frac{a}{b}" },
            { latex: "x^{2}" },
            { latex: "\\sqrt{x}" },
            { latex: "x_{n}" },
            { latex: "\\int_{a}^{b}" },
            { latex: "\\sum_{i=0}^{n}" },
            { latex: "\\lim_{x \\to \\infty}" },
            { latex: "\\vec{v}" },
            { latex: "\\alpha" },
            { latex: "\\beta" },
            { latex: "\\pi" },
            { latex: "\\theta" },
            { latex: "\\Delta" },
            { latex: "\\infty" },
            { latex: "\\pm" },
            { latex: "\\neq" },
            { latex: "\\leq" },
            { latex: "\\geq" },
            { latex: "\\times" },
            { latex: "\\div" },
        ];
        const $grid = $('<div style="display:flex;flex-wrap:wrap;gap:4px"></div>');
        for (const shortcut of shortcuts) {
            const $button = $(`<div class="mdl-formula-shortcut" title="${shortcut.latex}">
                <math-field read-only class="form-math-field" style="font-size:16px;height:auto;width:auto;pointer-events:none">${shortcut.latex}</math-field>
            </div>`);
            $button.on("click", () => this.formulaMathfield.executeCommand(["insert", shortcut.latex]));
            $grid.append($button);
        }
        $content.append($grid);
        return $content;
    }

    positionEditorToolbar() {
        const anchor = this.getScreenAnchorPoint();
        if (!anchor)
            return;
        const width = this.properties.width * (this.board.svg.getScreenCTM()?.a || 1);
        this.$toolbarHost.css({ "width": width + "px", "left": (anchor.centerX - width / 2) + "px", "top": (anchor.bottomY + 4) + "px" });
    }

    draw() {
        super.draw();
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
        if (this.$toolbarHost.is(":visible"))
            this.positionEditorToolbar();
        this.applyBorderStyle(this.container, 1);
    }
}
