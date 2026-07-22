// Iterations table: renders calculated term values per iteration. All shared table behavior
// (columns, regression, outliers, export, focused-cells toolbar) lives in BaseValueTableShape;
// external-data support was split out into DataTableShape.
class TableShape extends BaseValueTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Table Name");
    }

    populateShapeColorMenuSections(sections) {
        super.populateShapeColorMenuSections(sections);
        sections[0].items.push(this.createRowStepMenuItem());
    }

    // Documents saved before the external-data table was split out stored their imported dataset
    // on a TableShape; route those to the dedicated DataTableShape so the data survives loading.
    static deserialize(board, data) {
        const type = data?.properties?.externalData != null ? "DataTableShape" : data.type;
        const parent = board.getShape(data.parent);
        const shape = board.createShape(type, parent, data.id);
        shape.setProperties(data.properties);
        shape.draw();
        shape.update();
        return shape;
    }
}
