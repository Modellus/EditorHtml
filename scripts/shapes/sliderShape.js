class SliderShape extends BaseShape {
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
        this.addTermToForm("term", "Value", false, 2);
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Slider Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 150;
        this.properties.y = center.y - 50;
        this.properties.width = 300;
        this.properties.height = 100;
        this.properties.rotation = 0;
        this.properties.term = null;
    }

    createElement() {
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.arrayStore = new DevExpress.data.ArrayStore();
        this.lastSyncedIndex = 0;
        this.slider = $div.dxRangeSelector({
            dataSource: this.arrayStore,
            chart: {
                series: {
                    argumentField: this.board.calculator.properties.independent.name,
                    valueField: this.properties.term
                }
            },
            scale: {
                label: {
                    font: {
                        family: "Katex_Math",
                        size: "1em",
                        weight: 400
                    }
                }
            }
        }).dxRangeSelector("instance");
        return foreignObject;
    }

    updateValues() {
        var system = this.board.calculator.system;
        const values = system.values;
        if (this.lastSyncedIndex > values.length) {
            this.lastSyncedIndex = 0;
            this.arrayStore.clear();
            this.slider.getDataSource().load();
        }
        const newItems = values.slice(this.lastSyncedIndex);
        newItems.forEach(i => this.arrayStore.push([{ type: "insert", data: i }]));
        this.lastSyncedIndex = values.length;
    }

    update() {
        const config = {
            term: this.properties.term,
            color: this.properties.foregroundColor,
            bg: this.properties.backgroundColor,
            argField: this.board.calculator.properties.independent.name
        };
        const changed = JSON.stringify(config) !== JSON.stringify(this._appliedConfig);
        if (changed) {
            this.slider.beginUpdate();
            this.slider.option("chart.series", {
                argumentField: config.argField,
                valueField: config.term,
                color: config.color
            });
            this.slider.option("containerBackgroundColor", config.bg);
            this.element.style.backgroundColor = config.bg;
            this.slider.endUpdate();
            this._appliedConfig = config;
        }
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }

    tick() {
        this.updateValues();
        super.tick();
    }

    enterEditMode() {
        if (this.slider && typeof this.slider.focus === "function") {
            this.slider.focus();
            return true;
        }
        return super.enterEditMode();
    }
}
