class TextShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    _onDocumentMouseDown = e => {
        if (!this.element.contains(e.target))
            this.exitEditMode();
    };

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
        $wrapper.css({ "width": "100%", "height": "100%", "display": "flex", "flex-direction": "column" });
        const $editorHost = $("<div>").appendTo($wrapper);
        $editorHost.css({ "flex": "1", "min-height": "0" });
        this.$toolbarHost = $("<div>").appendTo($wrapper);
        this.$toolbarHost.css({ "display": "none", "background-color": "#fff", "border-top": "1px solid #e0e0e0" });
        this.htmlEditor = $editorHost.dxHtmlEditor({
            valueType: "markdown",
            toolbar: {
                container: this.$toolbarHost[0],
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
                    "link", "insertTable", "separator",
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
        this.$toolbarHost.css("display", "");
        this.board.pointerLocked = true;
        document.addEventListener("mousedown", this._onDocumentMouseDown);
        this.htmlEditor.focus();
        return true;
    }

    exitEditMode() {
        this.container.style.cursor = "";
        this.$toolbarHost.css("display", "none");
        this.board.pointerLocked = false;
        document.removeEventListener("mousedown", this._onDocumentMouseDown);
        this.htmlEditor.blur();
    }

    draw() {
        super.draw();
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
        this.applyBorderStyle(this.container, 1);
    }
}
