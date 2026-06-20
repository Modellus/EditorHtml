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
            series: this._buildSeriesFromYTerms(),
            backgroundColor: "transparent",
            axisColor: "#5a5a5a",
            gridColor: "#dddddd"
        });
        this.chartControl.setSize(width, height);
        this._calculatorIterateHandler = () => this.onCalculatorIterate();
        this.notebookEditor.calculator?.on("iterate", this._calculatorIterateHandler);
        this.onCalculatorIterate();
    }

    _buildSeriesFromYTerms() {
        const yTermNames = Array.isArray(this.block.yTerms) ? this.block.yTerms : [];
        const colors = ["#2f6db5", "#e67e22", "#2ecc71", "#e74c3c", "#9b59b6"];
        if (yTermNames.length === 0)
            return [{ valueField: "y", name: "y", color: colors[0], chartTypes: [this.block.chartType || "line"] }];
        return yTermNames.map((termName, index) => ({
            valueField: `series${index}`,
            name: termName,
            color: colors[index % colors.length],
            chartTypes: [this.block.chartType || "line"]
        }));
    }

    onCalculatorIterate() {
        const calculator = this.notebookEditor.calculator;
        if (!calculator || !this.chartControl)
            return;
        const yTermNames = Array.isArray(this.block.yTerms) ? this.block.yTerms : [];
        if (yTermNames.length === 0)
            return;
        const xTermName = this.block.xTerm || calculator.properties.independent.name;
        const series = this._buildSeriesFromYTerms();
        this.chartControl.setOptions({ series, argumentField: "x" });
        const lastIteration = calculator.system.lastIteration;
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const row = { x: calculator.system.getByNameOnIteration(iteration, xTermName, 1) };
            for (let seriesIndex = 0; seriesIndex < yTermNames.length; seriesIndex++)
                row[`series${seriesIndex}`] = calculator.system.getByNameOnIteration(iteration, yTermNames[seriesIndex], 1);
            rows.push(row);
        }
        this.chartControl.setData(rows);
    }

    get chart() {
        return this.chartControl;
    }

    normalizeYTerms() {
        if (!Array.isArray(this.block.yTerms))
            this.block.yTerms = this.block.yTerms ? [this.block.yTerms] : [];
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $container => $container.append(this._xTermControl) },
            { text: "Vertical", stacked: true, buildControl: $container => {
                const wrapper = $('<div style="width:160px"></div>');
                this.createNotebookTermsCollectionControl(wrapper, this.properties.yTerms ?? [], values => {
                    this.setPropertyCommand("yTerms", values);
                });
                $container.append(wrapper);
            }}
        );
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.formatTermForDisplay(this.properties.xTerm);
        const yTerms = Array.isArray(this.properties.yTerms) ? this.properties.yTerms.filter(y => y && (y.term || typeof y === "string")) : [];
        const firstYTermName = yTerms.length > 0 ? (yTerms[0].term ?? yTerms[0]) : "";
        const firstYTerm = firstYTermName ? this.formatTermForDisplay(String(firstYTermName)) : "";
        const xPart = xTerm ? this.createNameButtonTermMarkup(xTerm) : "";
        const separator = (xTerm && firstYTerm) ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
        const yPart = firstYTerm ? this.createNameButtonTermMarkup(firstYTerm) : "";
        const extraCount = yTerms.length - 1;
        const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
        if (!xPart && !yPart)
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
        else
            element.innerHTML = `${xPart}${separator}${yPart}${extraPart}`;
    }

    refreshDomainBoxes() {
        const autoScale = this.properties.autoScale === true;
        const equalScales = this.properties.equalScales === true;
        const domain = autoScale ? this.chart?.renderState?.domain : this.properties.domainOverride;
        this._xMinBoxInstance?.option({ value: domain?.xMin ?? null, disabled: autoScale });
        this._xMaxBoxInstance?.option({ value: domain?.xMax ?? null, disabled: autoScale });
        this._yMinBoxInstance?.option({ value: domain?.yMin ?? null, disabled: autoScale || equalScales });
        this._yMaxBoxInstance?.option({ value: domain?.yMax ?? null, disabled: autoScale || equalScales });
    }

    unmount() {
        if (this._calculatorIterateHandler) {
            this.notebookEditor.calculator?.off("iterate", this._calculatorIterateHandler);
            this._calculatorIterateHandler = null;
        }
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
