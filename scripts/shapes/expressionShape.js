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
        items.push(
            {
                colSpan: 1,
                itemType: "button",
                buttonOptions: {
                    height: 40,
                    stylingMode: "text",
                    template1: function(data, container) {
                        let mathField = $("<math-field>")
                            .attr("read-only", true)
                            .css("display", "inline-block")
                            .css("font-size", "1.2em")
                            .text('\\frac{\\differentialD x}{\\differentialD t}');
                        container.append(mathField);
                    },
                    onClick: e => this.insert("\\frac{dx}{dt}")
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        this.properties.name = this.board.translations.get("Expression Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 25;
        this.properties.width = 300;
        this.properties.height = 50;
        this.properties.rotation = 0;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[1].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.expression = "\\frac{dx}{dt}=y";
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const div = this.board.createElement("div");
        $(div).css({ "width": "100%", "height": "100%", "background-color": "transparent" });
        foreignObject.appendChild(div);
        this.mathfield = new MathfieldElement();
        this.mathfield.smartMode = true;
        this.mathfield.popoverPolicy = "none";
        this.mathfield.virtualKeyboardMode = "off";
        this.mathfield.mathVirtualKeyboardPolicy = "manual";
        this.mathfield.placeholder = "Enter a formula";
        this.mathfield.addEventListener("change", _ => this.onChange());
        this.mathfield.addEventListener("focus", _ => this.onFocus());
        div.appendChild(this.mathfield);
        $(div).dxScrollView({
            showScrollbar: "always",
            bounceEnabled: true,
            scrollByContent: true, 
            scrollByThumb: true
        });
        this.mathfield.value = this.properties.expression ?? "{\\frac{dx}{dt}=y";
        this.mathfield.addEventListener('mount', e =>
            ["dx", "dy", "dt"].forEach(v => {
                this.mathfield.inlineShortcuts[v] = null;
                delete this.mathfield.inlineShortcuts[v];
            }));
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
        this.dispatchEvent("changed", { expression: this.properties.expression });
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
    }

    insert(text) {
        debugger   
        this.mathfield.insertText(text);
    }
}