class CharacterShape extends ImageShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        return form;
    }

    createElement() {
        var element = super.createElement();
        return element;
    }    

    setDefaults() {
        super.setDefaults();
    }

    update() {
        super.update();
    }

    draw() {
        super.draw();
    }
}