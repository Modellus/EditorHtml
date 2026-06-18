class ChartNotebookShape extends NotebookShape {
    renderContentHtml() {
        return `<svg id="${this.getHostId()}" class="notebook-chart-control"></svg>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        const chartContainer = contentElement.querySelector(`#${this.getHostId()}`);
        if (!chartContainer)
            return;
        const width = Math.max(240, contentElement.clientWidth || 720);
        const height = 280;
        this.chartControl = new ChartControl(chartContainer, {
            chartType: this.block.chartType || "line",
            argumentField: "x",
            argumentTitle: this.block.xTitle || "",
            valueTitle: this.block.yTitle || "",
            series: [{ valueField: "y", name: "y", color: "#2f6db5", chartTypes: [this.block.chartType || "line"] }],
            backgroundColor: "transparent",
            axisColor: "#5a5a5a",
            gridColor: "#dddddd"
        });
        this.chartControl.setSize(width, height);
        this.chartControl.setData(this.getDataRows());
    }

    getDataRows() {
        if (Array.isArray(this.block.chartData) && this.block.chartData.length > 0)
            return this.block.chartData;
        return [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 4 },
            { x: 3, y: 9 },
            { x: 4, y: 16 }
        ];
    }

    unmount() {
        if (this.chartControl)
            this.chartControl.dispose();
        this.chartControl = null;
        super.unmount();
    }
}

NotebookShapesFactory.register("chart", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new ChartNotebookShape(notebookEditor, block)
});
