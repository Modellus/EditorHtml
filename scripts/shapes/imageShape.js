class ImageShape extends BodyShape {
    constructor(board, parent, id) {
        super(board, parent, id);
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
                colSpan: 2,
                dataField: "file",
                label: { text: "File" },
                editorType: "dxFileUploader",
                editorOptions: {
                    accept: "image/*",
                    onFilesUploaded: e => {
                        const file = e.component.option("value")[0];
                        const reader = new FileReader();
                        reader.onload = e => {
                            this.setProperties({ imageBase64: e.target.result.split(',')[1] });
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.circle = this.board.createSvgElement("circle");
        element.appendChild(this.circle);
        this.image = this.board.createSvgElement("image");
        element.appendChild(this.image);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        element.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        element.appendChild(this.stroboscopy);
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Image Name");
        this.properties.imageBase64 = "";
    }

    update() {
        // Property-driven updates only; per-iteration updates handled by BodyShape.tick
        if (this.properties.imageBase64 != "")
            this.image.setAttribute("href", `data:image/png;base64,${this.properties.imageBase64}`);
        else
            this.image.removeAttribute("href");
    }

    draw() {
        super.draw();
    }
}
