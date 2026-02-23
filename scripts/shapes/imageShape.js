class ImageShape extends BodyShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new RectangleTransformer(this.board, this);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Image Name");
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
    }
}
