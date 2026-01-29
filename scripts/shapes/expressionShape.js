class ExpressionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() {
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push({
            itemType: "group",
            colCount: "auto",
            minColWidth: 200,
            items: [
                {
                    colSpan: 2,
                    label: { text: "Shortcuts" },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        elementAttr: { class: "mdl-shortcuts" },
                        buttonTemplate: function (data, container) {
                            $("<math-field>")
                                .attr("read-only", true)
                                .html(data.text)
                                .css("height", "auto", "width", "auto")
                                .addClass("form-math-field")
                                .appendTo(container);
                        },
                        items: [
                            { name: "Differential", text: "\\frac{dx}{dt}" },
                            { name: "Power", text: "x^2" },
                            { name: "Squareroot", text: "\\sqrt{x}" },
                            { name: "Index", text: "x_{t-1}" }
                        ],
                        keyExpr: "name",
                        selectionMode: "none",
                        onItemClick: e => this.insert(e.itemData.text)
                    }
                }
            ]
        });
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Expression Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 25;
        this.properties.width = 300;
        this.properties.height = 50;
        this.properties.rotation = 0;
        this.properties.expression = "\\placeholder{}";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");

        $(div).css({ width: "100%", height: "100%", "background-color": "transparent" });
        foreignObject.appendChild(div);

        this.mathfield = new MathfieldElement();
        this.mathfield.popoverPolicy = "off";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.placeholder = "Enter a formula";
        this.mathfield.smartMode = false;
        this.mathfield.multiline = true;

        this.mathfield.addEventListener("change", _ => this.onChange());
        this.mathfield.addEventListener("focus", _ => this.onFocus());

        // IMPORTANT: mount handler before appendChild
        this.mathfield.addEventListener("mount", () => {
            // Remove some inline shortcuts
            const inlineShortcuts = { ...(this.mathfield.inlineShortcuts ?? {}) };
            ["dx", "dy", "dt"].forEach(v => delete inlineShortcuts[v]);
            this.mathfield.inlineShortcuts = inlineShortcuts;

            this.mathfield.returnKeyAction = "none";

            // Intercept Enter and insert a LaTeX line break (\\)
            this.mathfield.addEventListener(
                "keydown",
                (ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey) {
                        ev.preventDefault();
                        ev.stopImmediatePropagation();

                        // Insert a TeX newline
                        this.mathfield.executeCommand(["insert", "\\\\"]);
                    } else if (ev.key === "Enter" && ev.shiftKey) {
                        // optional: Shift+Enter commits
                        ev.preventDefault();
                        ev.stopImmediatePropagation();
                        this.mathfield.executeCommand("commit");
                    }
                },
                true // capture so we beat MathLive's handler
            );

            this.mathfield.executeCommand("selectAll");
            this.mathfield.focus();
        });

        div.appendChild(this.mathfield);

        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true,
            scrollByThumb: true
        });

        // IMPORTANT: make sure you're in a multiline environment so \\ is valid
        this.mathfield.value =
            this.properties.expression ??
            "\\begin{aligned} \\placeholder{} \\end{aligned}";

        return foreignObject;
    }

    static deserialize(board, data) {
        var shape = super.deserialize(board, data);
        shape.mathfield.value = data.properties.expression;
        return shape;
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.expression != undefined)
            this.mathfield.value = properties.expression;
        this.onChange();
    }

    onChange() {
        this.properties.expression = this.mathfield.getValue();
        clearTimeout(this._changeTimer);
        this._changeTimer = setTimeout(() => {
            this.dispatchEvent("changed", { expression: this.properties.expression });
        }, 300);
    }

    onFocus() {
        this.dispatchEvent("focused", {});
    }

    update() {
        this.element.style.backgroundColor = this.properties.backgroundColor;
        this.mathfield.style.color = this.properties.foregroundColor;
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
        this.element.setAttribute("border-color", this.properties.foregroundColor);
    }

    insert(text) {
        this.mathfield.executeCommand("insert", text);
        this.mathfield.focus();
    }
}
