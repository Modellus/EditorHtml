class BodyShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new CircleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        this.addTermToForm("xTerm", "Horizontal");
        this.addTermToForm("yTerm", "Vertical");
        items.push(
            {
                colSpan: 2,
                dataField: "trajectoryColor",
                label: { text: "Trajectory color" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    onContentReady: function(e) {
                        e.component.option("items").forEach((item, index) => {
                            const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                            buttonElement.find(".dx-icon").css("color", item.color == "#00000000" ? "#cccccc" : item.color);
                        });
                    },
                    items: this.board.theme.getBackgroundColors().map(c => ({
                        icon: "fa-solid " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                        color: c.color
                    })),
                    keyExpr: "color",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.trajectoryColor],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("trajectoryColor", e.itemData.color);
                        this.setProperty("trajectoryColor", e.itemData.color);
                    }
              }
            },
            {
                colSpan: 2,
                dataField: "stroboscopyColor",
                label: { text: "Stroboscopy color" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    onContentReady: function(e) {
                        e.component.option("items").forEach((item, index) => {
                            const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                            buttonElement.find(".dx-icon").css("color", item.color == "#00000000" ? "#cccccc" : item.color);
                        });
                    },
                    items: this.board.theme.getBackgroundColors().map(c => ({
                        icon: "fa-solid " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                        color: c.color
                    })),
                    keyExpr: "color",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.stroboscopyColor],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("stroboscopyColor", e.itemData.color);
                        this.setProperty("stroboscopyColor", e.itemData.color);
                    }
                }
            },
            {
                colSpan: 1,
                dataField: "stroboscopyInterval",
                label: { text: "Interval" },
                editorType: "dxNumberBox",
                editorOptions: {
                    showSpinButtons: true,
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 1,
                dataField: "stroboscopyOpacity",
                label: { text: "Opacity" },
                editorType: "dxNumberBox",
                editorOptions: {
                    showSpinButtons: true,
                    step: 0.1,
                    stylingMode: "filled"
                }
            },
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
        this._lastStrobeCount = 0;
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        this.properties.xTerm = "0";
        this.properties.yTerm = "0";
        this.properties.name = this.board.translations.get("Body Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.angle = 0;
        this.properties.width = 10;
        this.properties.height = 10;
        this.properties.radius = (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[3].color;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[3].color;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyInterval = 10;
        this.properties.stroboscopyOpacity = 0.5;
        this.properties.imageBase64 = "";
    }

    update() {
        super.update();
        if (this.properties.imageBase64 != "")
            this.image.setAttribute("href", `data:image/png;base64,${this.properties.imageBase64}`);
        else
            this.image.removeAttribute("href");
        if (this.stroboscopy && this.stroboscopy.children) {
            Array.from(this.stroboscopy.children).forEach(c => {
                c.setAttribute("fill", this.properties.stroboscopyColor);
                c.setAttribute("opacity", this.properties.stroboscopyOpacity);
            });
        }
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", this.properties.radius);
        this.circle.setAttribute("fill", this.properties.backgroundColor);
        this.circle.setAttribute("stroke", this.properties.foregroundColor);
        this.drawTrajectory();
    }

    tick() {
        super.tick();
        const calculator = this.board.calculator;
        const scale = this.getScale();
        const xTerm = this.properties.xTerm;
        const x = calculator.getByName(xTerm) ?? parseFloat(xTerm);
        this.properties.x = Number.isNaN(x) ? this.properties.x : (scale.x != 0 ? x / scale.x : 0);
        const yTerm = this.properties.yTerm;
        const y = calculator.getByName(yTerm) ?? parseFloat(yTerm);
        this.properties.y = Number.isNaN(y) ? this.properties.y : (scale.y != 0 ? -y / scale.y : 0);
        this.trajectory.values = this.trajectory.values.slice(0, calculator.getLastIteration());
        if (this.trajectory.values.length <= calculator.getLastIteration()) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x, y: position.y });
        }
        if (this.trajectory.values.length < this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = this.trajectory.values.length;
        } else if (this.trajectory.values.length > this.trajectory.lastCount) {
            const newPoints = this.trajectory.values.slice(this.trajectory.lastCount)
                .map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.pointsString += (this.trajectory.pointsString && newPoints ? " " : "") + newPoints;
            this.trajectory.lastCount = this.trajectory.values.length;
        }
        if (this.properties.stroboscopyColor != this.board.theme.getBackgroundColors()[0].color) {
            const lastIter = calculator.getLastIteration();
            if (lastIter === 0) {
                while (this.stroboscopy.firstChild)
                    this.stroboscopy.removeChild(this.stroboscopy.firstChild);
                this._lastStrobeCount = 0;
            }
            const interval = Math.max(1, this.properties.stroboscopyInterval);
            const desired = Math.floor(lastIter / interval);
            while (this._lastStrobeCount < desired && this.trajectory.values.length > this._lastStrobeCount * interval) {
                const idx = this._lastStrobeCount * interval;
                const pos = this.trajectory.values[idx] ?? this.getBoardPosition();
                const stroboscopyCircle = this.board.createSvgElement("circle");
                stroboscopyCircle.setAttribute("cx", pos.x);
                stroboscopyCircle.setAttribute("cy", pos.y);
                stroboscopyCircle.setAttribute("r", this.properties.radius);
                stroboscopyCircle.setAttribute("fill", this.properties.stroboscopyColor);
                stroboscopyCircle.setAttribute("opacity", this.properties.stroboscopyOpacity);
                this.stroboscopy.appendChild(stroboscopyCircle);
                this._lastStrobeCount++;
            }
        }
        this.board.markDirty(this);
    }

    drawTrajectory() {
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    drawStroboscopy() {
        const calculator = this.board.calculator;
        if (this.properties.stroboscopyColor != this.board.theme.getBackgroundColors()[0].color) {
            if (calculator.getLastIteration() == 0)
                while (this.stroboscopy.firstChild)
                    this.stroboscopy.removeChild(this.stroboscopy.firstChild);
            if (this.stroboscopy.children.length < calculator.getLastIteration() / this.properties.stroboscopyInterval) {
                const position = this.getBoardPosition();
                const stroboscopyCircle = this.board.createSvgElement("circle");
                stroboscopyCircle.setAttribute("cx", position.x);
                stroboscopyCircle.setAttribute("cy", position.y);
                stroboscopyCircle.setAttribute("r", this.properties.radius);
                stroboscopyCircle.setAttribute("fill", this.properties.stroboscopyColor);
                stroboscopyCircle.setAttribute("opacity", this.properties.stroboscopyOpacity);
                this.stroboscopy.appendChild(stroboscopyCircle);
            }
        }
    }

    // Inherits BaseShape.applyDragToTerms (x/y mapping)
}
