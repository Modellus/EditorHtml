Object.assign(ChartNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    },
    _applyDomainOverride() {
        if (!this.chartControl)
            return;
        this.chartControl.domainOverride = {
            xMin: this.block.xMin ?? null,
            xMax: this.block.xMax ?? null,
            yMin: this.block.yMin ?? null,
            yMax: this.block.yMax ?? null
        };
        this.chartControl.render();
    }
});
