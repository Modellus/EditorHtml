class CharacterShape extends BaseShape {

    static characters;

    static setup() {
        this.loadCharacters()
            .catch(error => console.error("Error loading characters:", error));
    }

    static loadCharacters() {
        const directories = ["Dummy"];
        const characterPromises = directories.map((d) =>
            fetch(`resources/characters/${d}/character.json`)
                .then(file => file.json())
                .then(data => {
                    data.folder = d;
                    return data;
                })
        );
        return Promise.all(characterPromises).then(results => {
            this.characters = results;
        });
    }

    static getCharacters() {
        if (!this.characters)
            throw new Error("Characters not loaded. Call setup first.");
        return this.characters;
    }

    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        const form = super.createForm();
        const instance = form.dxForm("instance");
        const items = instance.option("items");
        this.addTermToForm("xTerm", "Horizontal");
        this.addTermToForm("yTerm", "Vertical");
        var characters = CharacterShape.getCharacters();
        const buttonItems = characters.map(c => ({
            icon: `resources/characters/${c.folder}/${c.image}`,
            character: c
        }));
        items.push({
            colSpan: 2,
            dataField: "character",
            label: { text: "Character" },
            editorType: "dxButtonGroup",
            editorOptions: {
                stylingMode: "text",
                items: buttonItems,
                keyExpr: "text",
                elementAttr1: {
                    style: "height: auto; width: auto;"
                },
                buttonTemplate1: function(data, container) {
                    $("<div>")
                        .css({
                            width: "50px",
                            height: "50px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        })
                        .append($("<img>")
                            .attr("src", data.icon)
                            .css({
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain"
                            }))
                        .appendTo(container);
                },
                onItemClick: e => {
                    let formInstance = $("#shape-form").dxForm("instance");
                    formInstance.updateData("character", e.itemData.name);
                    this.setProperty("character", e.itemData.character);
                }
            }
        });
        instance.option("items", items);
        return form;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.image = this.board.createSvgElement("image");
        element.appendChild(this.image);
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        this.properties.xTerm = "0";
        this.properties.yTerm = "0";
        this.properties.name = this.board.translations.get("Character Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.width = 10;
        this.properties.height = 10;
        this.character = CharacterShape.getCharacters()[0];
    }

    update() {
        super.update();
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        this.image.setAttribute("x", position.x - this.properties.width / 2);
        this.image.setAttribute("y", position.y - this.properties.height / 2);
        this.image.setAttribute("width", this.properties.width);
        this.image.setAttribute("height", this.properties.height);
        if (this.character) {
            const iteration = this.board.calculator.getIteration();
            const name = this.character.name;
            const frameIndex = iteration % this.character.animations[0].frames;
            const animation = this.character.animations[0].name;
            if (this._lastFrameIndex !== frameIndex || this._lastAnimation !== animation || this._lastCharacter !== name) {
                const frame = name + " " + animation + " " + String(frameIndex).padStart(4, '0') + ".png";
                this.image.setAttribute("href", `resources/characters/${name}/${animation}/${frame}`);
                this._lastFrameIndex = frameIndex;
                this._lastAnimation = animation;
                this._lastCharacter = name;
        }
    }

    // Inherits BaseShape.applyDragToTerms (x/y mapping)
}

    tick() {
        super.tick();
        const calculator = this.board.calculator;
        const scale = this.getScale();
        const xTerm = this.properties.xTerm;
        const xCase = this.properties.xTermCase ?? 1;
        const x = calculator.getByName(xTerm, xCase) ?? parseFloat(xTerm);
        this.properties.x = Number.isNaN(x) ? this.properties.x : (scale.x != 0 ? x / scale.x : 0);
        const yTerm = this.properties.yTerm;
        const yCase = this.properties.yTermCase ?? 1;
        const y = calculator.getByName(yTerm, yCase) ?? parseFloat(yTerm);
        this.properties.y = Number.isNaN(y) ? this.properties.y : (scale.y != 0 ? -y / scale.y : 0);
        this.board.markDirty(this);
    }
}
