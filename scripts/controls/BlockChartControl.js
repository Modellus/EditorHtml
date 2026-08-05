// A chart control that draws through the building-block layer instead of writing its own SVG.
//
// Everything that decides *what* the chart shows — the domain, the ticks, the layout, the data
// rows, the focus point, the tick drags, the zoom and the crosshair — is inherited from
// `ChartControl` unchanged, so a chart drawn this way answers to the same interactions as the
// drawn one. Only the painting differs: the plan the base class works out is handed to the
// `chart` component, compiled to primitives and written once per changed frame.
//
// The parts that are not geometry stay with the base class: the axis title and the series
// legend are term labels with case icons, and the area readout is an icon glyph with a
// measured background. Those are DOM the block primitives do not describe.
class BlockChartControl extends ChartControl {
    static compilerLimits = { maxNodes: 20000 };

    initializeRoot() {
        super.initializeRoot();
        this.blockLayer = this.createSvgElement("g");
        this.blockLayer.setAttribute("class", "chart-block-layer");
        this.rootElement.insertBefore(this.blockLayer, this.backgroundLayer);
    }

    getCompiler() {
        if (!this._compiler)
            this._compiler = new BlockCompiler(BlockRegistry, new BlockBindings(this.options.getCalculator?.() ?? null), BlockChartControl.compilerLimits);
        return this._compiler;
    }

    clearRenderLayers() {
        super.clearRenderLayers();
        this.clearLayer(this.blockLayer);
        this.blockLayer._blockMarkupSignature = null;
        this.lastCompilation = null;
    }

    // The definition is a plain object instance of the `chart` component, the same shape as the
    // one a component object carries, so it can be validated, inspected and previewed.
    buildChartDefinition(plan) {
        return {
            schemaVersion: BlockMigrations.currentVersion,
            id: "chart",
            type: "chart",
            name: "Chart",
            preset: "standard",
            root: {
                id: "root",
                type: "chart",
                parameters: {
                    plot: plan.layout,
                    domain: plan.domain,
                    rows: this.dataRows,
                    argumentField: this.options.argumentField,
                    series: this.options.series,
                    xTicks: plan.xTicks.map(value => ({ value: value, label: this.formatAxisValue(value, this.options.xAxisType) })),
                    yTicks: plan.yTicks.map(value => ({ value: value, label: this.formatAxisValue(value, this.options.yAxisType) })),
                    xMinorTicks: plan.xMinorTicks,
                    yMinorTicks: plan.yMinorTicks,
                    backgroundColor: this.options.backgroundColor,
                    dataAreaColor: this.options.dataAreaColor,
                    borderColor: this.options.borderColor,
                    cornerRadius: this.options.borderRadius ?? 4,
                    axisColor: this.options.axisColor,
                    gridColor: this.options.gridColor,
                    foregroundColor: this.options.foregroundColor,
                    fontFamily: this.options.fontFamily,
                    tickFontSize: 10,
                    plotClipId: this.plotClipId,
                    shapeClipId: this.shapeClipId,
                    xTicksClipId: this.xTicksClipId,
                    yTicksClipId: this.yTicksClipId
                }
            }
        };
    }

    getCompilationContext(plan) {
        return {
            width: plan.width,
            height: plan.height,
            parameters: {},
            tokens: new BlockTokens("standard")
        };
    }

    compileChart(plan) {
        this.lastDefinition = this.buildChartDefinition(plan);
        this.lastCompilation = this.getCompiler().compile(this.lastDefinition, this.getCompilationContext(plan));
        return this.lastCompilation;
    }

    paintChart(plan) {
        const compilation = this.compileChart(plan);
        BlockRenderer.render(this.blockLayer, compilation.nodes, this);
        this.renderAreaValueLabels(plan);
        this.renderTitles(plan.layout, plan.width, plan.height);
    }

    // The filled area carries its integral, drawn as an icon and a number over a measured
    // background. The band itself is a block; the readout is not, so it is written here over
    // the series the blocks have already drawn.
    renderAreaValueLabels(plan) {
        const areaBaseY = Math.min(Math.max(plan.yScale(0), plan.layout.plotTop), plan.layout.plotBottom);
        for (const series of this.options.series) {
            const chartTypes = series.chartTypes ?? ["line"];
            if (!chartTypes.includes("area") || series.showLabel !== true)
                continue;
            const points = this.getSeriesPoints(series, plan.xScale, plan.yScale).filter(point => !point.isOutlier);
            if (points.length < 2)
                continue;
            this.renderAreaValueLabel(points, series.color, areaBaseY, plan.layout);
        }
    }

    getInspectionReport() {
        const compilation = this.lastCompilation;
        return {
            definition: this.lastDefinition ?? null,
            stats: compilation?.stats ?? null,
            diagnostics: compilation?.diagnostics ?? [],
            markup: compilation ? BlockRenderer.toMarkup(compilation.nodes) : "",
            nodes: compilation ? BlockRenderer.flatten(compilation.nodes).map(node => ({
                id: node.id,
                tag: node.tag,
                sourceType: node.sourceType,
                sourceComponent: node.sourceComponent
            })) : []
        };
    }
}
