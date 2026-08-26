// The chart's drawing: the plan `ChartControl` works out, handed to the `chart` building block,
// compiled to primitives and written once per changed frame. Every chart on the board is drawn
// this way, which is what makes the picture inspectable block by block.
//
// Everything that decides *what* the chart shows — the domain, the ticks, the layout, the data
// rows, the focus point, the tick drags, the zoom and the crosshair — is inherited from
// `ChartControl` unchanged, and so is the SVG that class writes for the same plan: it is no
// longer what the board draws, but it is the picture this one is held to, tag for tag and
// coordinate for coordinate, by `tests/block-chart-shape.spec.js`.
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
                    xTicks: plan.xTicks.map(value => ({ value: value, label: this.formatAxisValue(value, this.getXAxisType()) })),
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
                    maxBarWidth: this.getMaximumBarWidth(),
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

    // A bar the focus falls on is what the shape lights up when the value it reads moves. The bars
    // are block nodes rather than SVG this control wrote, so the one to light up is found by the
    // id the `chart-bars` component gave it — same series, same nearest argument value as the
    // drawn chart picks out of its own markup.
    getFocusBarElement(seriesIndex) {
        if (!Number.isFinite(this.focusArgumentValue) || !this.renderState)
            return null;
        const barSeriesList = this.options.series.filter(series => (series.chartTypes ?? ["line"]).includes("bar"));
        if (seriesIndex >= barSeriesList.length)
            return null;
        const barWidth = this.getBarWidth(barSeriesList.length, this.renderState.layout, this.renderState.xScale);
        const geometry = BlockChartGeometry.getBarGeometry(this.dataRows, this.options.argumentField, barSeriesList[seriesIndex], seriesIndex, barSeriesList.length, barWidth, this.renderState.xScale, this.renderState.yScale);
        const nearestBarIndex = this.getNearestBarIndex(geometry.bars);
        if (nearestBarIndex < 0)
            return null;
        return this.blockLayer?.querySelector(`[data-source-id="bar-${seriesIndex}-${nearestBarIndex}"]`) ?? null;
    }

    getNearestBarIndex(bars) {
        let nearestIndex = -1;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < bars.length; index++) {
            const distance = Math.abs(bars[index].xValue - this.focusArgumentValue);
            if (distance >= nearestDistance)
                continue;
            nearestDistance = distance;
            nearestIndex = index;
        }
        return nearestIndex;
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
