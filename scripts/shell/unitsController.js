class UnitsController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.grid = null;
        this.rows = [];
        this._createPopup();
    }

    _createPopup() {
        $("#units-popup").dxPopup({
            width: 420,
            height: "auto",
            dragEnabled: false,
            shading: false,
            title: this.shell.board.translations.get("Units"),
            showTitle: true,
            hideOnOutsideClick: true,
            contentTemplate: () => this._createGrid(),
            position: {
                at: "center",
                of: window
            }
        });
        this.popup = $("#units-popup").dxPopup("instance");
    }

    _createGrid() {
        const translations = this.shell.board.translations;
        this.rows = this.buildRows();
        const $grid = $("<div id='units-grid'></div>").dxDataGrid({
            dataSource: this.rows,
            keyExpr: "name",
            showBorders: true,
            showRowLines: true,
            columnAutoWidth: true,
            height: 260,
            noDataText: translations.get("No Terms"),
            editing: { mode: "cell", allowUpdating: true },
            columns: [
                {
                    dataField: "displayedName",
                    caption: translations.get("Name"),
                    width: 120,
                    allowEditing: false,
                    allowSorting: false,
                    cssClass: "mdl-units-name-cell",
                    cellTemplate: (container, cellInfo) => container[0].insertAdjacentHTML("beforeend", Utils.buildReadOnlyMathFieldMarkup(cellInfo.value, "height:auto;width:auto;display:inline-block;pointer-events:none"))
                },
                {
                    dataField: "unit",
                    caption: translations.get("Unit"),
                    allowSorting: false,
                    cssClass: "mdl-units-unit-cell",
                    cellTemplate: (container, cellInfo) => container[0].insertAdjacentHTML("beforeend", Utils.buildUnitsMathFieldMarkup(cellInfo.value, "height:auto;width:auto;display:inline-block;pointer-events:none")),
                    editCellTemplate: (container, cellInfo) => this.createUnitEditor(container, cellInfo)
                }
            ],
            onRowUpdated: e => this.setTermUnit(e.key, e.data.unit)
        });
        this.grid = $grid.dxDataGrid("instance");
        return $grid;
    }

    buildRows() {
        const calculator = this.shell.calculator;
        return calculator.getTermsNames().map(termName => ({
            name: termName,
            displayedName: Utils.getDisplayedTerm(termName, calculator.system),
            unit: calculator.getTermUnit(termName)
        }));
    }

    createUnitEditor(container, cellInfo) {
        UnitsControl.createEditor(container, {
            value: cellInfo.value,
            placeholder: this.shell.board.translations.get("Unit Placeholder"),
            onValueChanged: unitText => {
                cellInfo.setValue(unitText);
                this.grid.saveEditData();
            }
        });
    }

    setTermUnit(termName, unitText) {
        this.shell.setTermUnitCommand(termName, unitText);
    }

    refreshUnits() {
        if (!this.grid || !this.popup.option("visible"))
            return;
        const rows = this.buildRows();
        if (JSON.stringify(rows) === JSON.stringify(this.rows))
            return;
        this.rows = rows;
        this.grid.option("dataSource", this.rows);
    }

    open() {
        this.shell.board.deselect();
        this.popup.show();
        this.refreshUnits();
    }
}
