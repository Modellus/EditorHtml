// A chart shape whose drawing is produced by the building-block layer.
//
// It behaves like the chart it is modelled on down to the property names it serializes, so its
// toolbar, its term collection, its domain handling and its interactions are the ones inherited
// from `ChartShape`. What changes is where the picture comes from: the frame, the grid, the
// axes and the series are compiled from the `chart` component and written by `BlockRenderer`,
// which is what makes the drawing inspectable as blocks.
var BlockChartShape;
if (typeof ChartShape !== "undefined") BlockChartShape = class BlockChartShape extends ChartShape {
    getChartControlClass() {
        return BlockChartControl;
    }

    getChartControlOptions() {
        return Object.assign(super.getChartControlOptions(), {
            getCalculator: () => this.board.calculator
        });
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Block Chart Name") ?? "Chart";
    }

    // The compiled block tree behind the current frame: what was drawn, which component each
    // node came from and what the compiler had to say about it.
    getInspectionReport() {
        const report = this.chart?.getInspectionReport() ?? { definition: null, stats: null, diagnostics: [], markup: "", nodes: [] };
        return Object.assign({ shapeId: this.id, name: this.properties.name }, report);
    }

    toPreviewSvg() {
        const compilation = this.chart?.lastCompilation ?? null;
        const width = Number(this.properties.width) || 400;
        const height = Number(this.properties.height) || 200;
        if (!compilation)
            return BlockRenderer.toStandaloneSvg([], width, height, "none");
        return BlockRenderer.toStandaloneSvg(compilation.nodes, width, height, "none");
    }
};
