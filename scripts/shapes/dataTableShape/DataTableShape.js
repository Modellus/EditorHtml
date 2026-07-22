// External-data table: a value table whose rows come from an imported dataset (CSV upload,
// CSV URL or the data catalog) instead of the calculator's iterations. It shares every common
// table feature with the iterations table via BaseValueTableShape and layers the data-source
// behavior on top, delegating to super() whenever no dataset has been loaded yet.
class DataTableShape extends BaseValueTableShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Data Table Name") ?? "Experiment";
        this.properties.externalData = null;
        this.properties.originalExternalData = null;
        this.properties.dataCase = 1;
        // Start with just the independent term selected; importing a dataset replaces the columns.
        this.properties.columns = [
            { term: this.board.calculator.properties.independent.name, case: 1, color: "transparent", valueDisplayMode: "bars" }
        ];
    }

    // Only offer the independent term and terms that came from the loaded dataset (plus the
    // column's own current term, so an existing selection is never dropped from the list).
    getColumnTermItems(item) {
        const names = Array.isArray(this.properties.externalData?.names) ? this.properties.externalData.names : [];
        const independentName = this.normalizeColumnValue(this.board.calculator.properties.independent.name);
        const currentTerm = this.normalizeColumnValue(item?.term);
        return super.getColumnTermItems(item).filter(termItem => {
            const term = this.normalizeColumnValue(termItem?.term);
            return term === "" || term === currentTerm || term === independentName || names.indexOf(term) >= 0;
        });
    }

    // The data table carries a single case, chosen from the toolbar, so columns never prompt for
    // one: the per-column case selector is hidden and the table header shows no case badge.
    columnsControlIncludesCase() {
        return false;
    }

    buildControlColumns(columns = this._activeColumns) {
        return super.buildControlColumns(columns).map(column => ({ ...column, showCase: false }));
    }

    // ---- Data-source toolbar button --------------------------------------

    createDataDropDownButton(itemElement) {
        this._dataDropdownElement = $('<div class="mdl-data-selector">');
        this._dataDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Table Data Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderDataButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildDataMenuContent(contentElement)
            }
        });
        this._dataDropdownElement.appendTo(itemElement);
    }

    renderDataButtonTemplate(element) {
        const iconClass = this.getDataButtonIconClass();
        element.innerHTML = `<span class="mdl-name-btn-term"><i class="${iconClass} fa-arrow-up-from-bracket"></i></span>`;
    }

    getDataButtonIconClass() {
        return this.properties.externalData != null ? "fa-solid" : "fa-light";
    }

    buildDataMenuContent(contentElement) {
        const dataItems = [
            {
                text: this.board.translations.get("Upload CSV"),
                icon: "fa-light fa-file-csv",
                action: () => this.importExternalDataFromFile()
            },
            {
                text: this.board.translations.get("Set CSV URL"),
                icon: "fa-light fa-link",
                action: () => this.importExternalDataFromUrl()
            },
            {
                text: this.board.translations.get("Catalog Data") ?? "Catalog Data",
                icon: "fa-light fa-globe",
                action: () => this.importExternalDataFromCatalog()
            }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: dataItems,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                this._dataDropdownElement.dxDropDownButton("instance").close();
                event.itemData.action();
            }
        });
    }

    refreshDataToolbarControl() {
        if (!this._dataDropdownElement)
            return;
        const buttonContentElement = this._dataDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderDataButtonTemplate(buttonContentElement);
    }

    refreshShapeSpecificToolbarControls() {
        this.refreshDataToolbarControl();
        this.refreshDataCaseToolbarControl();
    }

    // ---- Data-case toolbar button (only shown with multiple model cases) --

    createDataCaseDropDownButton(itemElement) {
        this._dataCaseElement = $('<div class="mdl-data-case-selector">');
        this._dataCaseElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Data Case Tooltip", this.board.translations, 260),
            template: (_, element) => this.renderDataCaseButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildDataCaseMenuContent(contentElement)
            }
        });
        this._dataCaseElement.appendTo(itemElement);
    }

    renderDataCaseButtonTemplate(element) {
        const caseNumber = this.getClampedCaseNumber(this.properties.dataCase ?? 1);
        const iconClass = TermControl.getCaseNumberIconClass(caseNumber);
        const iconColor = TermControl.getCaseIconColor(caseNumber);
        element.innerHTML = `<span class="mdl-name-btn-term"><i class="${iconClass}" style="color:${iconColor}"></i></span>`;
    }

    buildDataCaseMenuContent(contentElement) {
        const casesCount = this.getCasesCount();
        const items = [];
        for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
            items.push({
                value: caseNumber,
                iconClass: TermControl.getCaseNumberIconClass(caseNumber),
                iconColor: TermControl.getCaseIconColor(caseNumber)
            });
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item mdl-dropdown-list-item--icon-only"><i class="${itemData.iconClass}" style="color:${itemData.iconColor}"></i></div>`;
            },
            onItemClick: event => {
                this.getDropDownButtonInstance(this._dataCaseElement)?.close();
                this.setDataCase(event.itemData.value);
            }
        });
    }

    setDataCase(caseNumber) {
        const normalizedCaseNumber = this.getClampedCaseNumber(caseNumber);
        const columns = Array.isArray(this.properties.columns)
            ? this.properties.columns.map(column => ({ ...column, case: normalizedCaseNumber }))
            : [];
        const command = new SetShapePropertiesCommand(this.board, this, { dataCase: normalizedCaseNumber, columns: columns });
        this.board.invoker.execute(command);
        this.refreshDataCaseToolbarControl();
        this.update();
    }

    refreshDataCaseToolbarControl() {
        // The case selector only makes sense when the model actually defines more than one case.
        if (this._dataCaseItemElement)
            this._dataCaseItemElement.css("display", this.getCasesCount() > 1 ? "flex" : "none");
        if (!this._dataCaseElement)
            return;
        const buttonContentElement = this._dataCaseElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderDataCaseButtonTemplate(buttonContentElement);
    }

    // ---- Import from file / URL / catalog --------------------------------

    async importExternalDataFromFile() {
        const result = await this.board.shell.importDataFromFile();
        this.applyImportedExternalData(result);
    }

    async importExternalDataFromUrl() {
        const result = await this.board.shell.importDataFromUrl();
        this.applyImportedExternalData(result);
    }

    applyImportedExternalData(result) {
        if (!result || !Array.isArray(result.names) || !Array.isArray(result.values))
            return;
        this.properties.externalData = { names: result.names, values: result.values };
        this.properties.originalExternalData = { names: [...result.names], values: result.values.map(row => [...row]) };
        this.applyExternalDataColumns(result.names);
        this.board.shell.reset();
        this.refreshDataToolbarControl();
    }

    async importExternalDataFromCatalog() {
        const result = await this.showCatalogDataPopup();
        if (!result)
            return;
        this.applyExternalDataColumns(result.names);
        this.refreshDataToolbarControl();
    }

    showCatalogDataPopup() {
        return new Promise(resolve => {
            this._catalogDataResolve = resolve;
            this._selectedCatalogDataset = null;
            const buildContent = async (contentElement) => {
                const host = contentElement.get ? contentElement.get(0) : contentElement;
                host.innerHTML = `<div class="mdl-catalog-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
                let datasets = [];
                try {
                    datasets = await this.board.shell.modelsApiClient.fetchDataSets();
                } catch (error) {
                    host.innerHTML = `<div class="mdl-catalog-data-status">${this.board.translations.get("Failed to load data") ?? "Failed to load data"}</div>`;
                    return;
                }
                if (!datasets.length) {
                    host.innerHTML = `<div class="mdl-catalog-data-status">${this.board.translations.get("No data available") ?? "No data available"}</div>`;
                    return;
                }
                host.innerHTML = `
                    <div class="mdl-catalog-data-scroll">
                        <div class="mdl-catalog-data-grid"></div>
                    </div>`;
                const grid = host.querySelector(".mdl-catalog-data-grid");
                for (const dataset of datasets) {
                    const thumbHtml = dataset.thumbnail_url
                        ? `<img class="mdl-catalog-data-thumb" src="${dataset.thumbnail_url}" alt="">`
                        : `<div class="mdl-catalog-data-thumb-placeholder"><i class="fa-light fa-table"></i></div>`;
                    grid.insertAdjacentHTML("beforeend", `
                        <div class="mdl-catalog-data-card" data-id="${dataset.id ?? ""}">
                            ${thumbHtml}
                            <div class="mdl-catalog-data-title">${dataset.title ?? "Untitled"}</div>
                        </div>`);
                    const cardElement = grid.lastElementChild;
                    cardElement.addEventListener("click", () => {
                        grid.querySelectorAll(".mdl-catalog-data-card").forEach(c => c.classList.remove("selected"));
                        cardElement.classList.add("selected");
                        this._selectedCatalogDataset = dataset;
                    });
                    if (dataset.description) {
                        $('<div>').appendTo('body').dxTooltip({
                            target: cardElement,
                            contentTemplate: tooltipContent => {
                                tooltipContent.append($('<div class="tooltip"/>').html(dataset.description));
                            },
                            showEvent: { delay: 500, name: 'mouseenter' },
                            hideEvent: 'mouseleave',
                            position: 'top',
                            width: 260,
                            wrapperAttr: { class: "mdl-catalog-data-tooltip" }
                        });
                    }
                }
            };
            if (this._catalogDataPopupInstance) {
                buildContent(this._catalogDataPopupInstance.content());
                this._catalogDataPopupInstance.show();
                return;
            }
            const popupHost = document.createElement("div");
            document.body.appendChild(popupHost);
            this._catalogDataPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
                visible: true,
                showTitle: true,
                title: this.board.translations.get("Catalog Data") ?? "Catalog Data",
                width: 680,
                height: 520,
                dragEnabled: true,
                hideOnOutsideClick: true,
                showCloseButton: true,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-catalog-data-popup"),
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Load") ?? "Load",
                            type: "default",
                            stylingMode: "contained",
                            onClick: () => this.onCatalogDataLoad()
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Cancel") ?? "Cancel",
                            stylingMode: "text",
                            onClick: () => this._catalogDataPopupInstance.hide()
                        }
                    }
                ],
                onHidden: () => {
                    this._catalogDataResolve?.(null);
                    this._catalogDataResolve = null;
                },
                contentTemplate: contentElement => buildContent(contentElement)
            });
        });
    }

    async onCatalogDataLoad() {
        if (!this._selectedCatalogDataset)
            return;
        const dataset = this._selectedCatalogDataset;
        const response = await fetch(dataset.asset_url);
        const text = await response.text();
        const { names, values } = this.board.shell.parseCsv(text);
        this.properties.externalData = { names, values };
        this.properties.originalExternalData = { names: [...names], values: values.map(row => [...row]) };
        const resolveCallback = this._catalogDataResolve;
        this._catalogDataResolve = null;
        this._catalogDataPopupInstance.hide();
        this.applyExternalDataColumns(names);
        this.board.shell.reset();
        this.refreshDataToolbarControl();
        resolveCallback?.({ names, values });
    }

    applyExternalDataColumns(termNames) {
        if (!Array.isArray(termNames) || termNames.length === 0)
            return;
        const caseNumber = this.getClampedCaseNumber(this.properties.dataCase ?? 1);
        const columns = [];
        for (let index = 0; index < termNames.length; index++)
            columns.push({ term: termNames[index], case: caseNumber, color: "transparent", valueDisplayMode: "bars" });
        this.setExternalDataColumns(columns);
    }

    setExternalDataColumns(columns) {
        const command = new SetShapePropertiesCommand(this.board, this, {
            columns: columns,
            columnWidths: []
        });
        this.board.invoker.execute(command);
    }

    // ---- External-data overrides of the shared table behavior ------------

    isPreloadedTableColumnTerm(term, system = this.board.calculator.system) {
        if (this.properties.externalData?.names?.indexOf(term) >= 0)
            return true;
        return super.isPreloadedTableColumnTerm(term, system);
    }

    canEditTableColumn(term, isPreloadedTerm = this.isPreloadedTableColumnTerm(term)) {
        if (this.properties.externalData != null)
            return isPreloadedTerm;
        return super.canEditTableColumn(term, isPreloadedTerm);
    }

    onTableCellValueChanged(payload) {
        if (this.properties.externalData == null)
            return super.onTableCellValueChanged(payload);
        const sourceColumn = payload?.column?.sourceColumn;
        if (!sourceColumn)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        const precision = this.board.calculator.getPrecision();
        const roundedValue = Utils.roundToPrecision(numericValue, precision);
        const rowIndex = Number.isInteger(payload?.rowKey) ? payload.rowKey : payload?.rowIndex;
        if (!Number.isInteger(rowIndex))
            return false;
        const columnIndex = this.properties.externalData.names.indexOf(sourceColumn.term);
        if (columnIndex < 0)
            return false;
        if (rowIndex < 0 || rowIndex >= this.properties.externalData.values.length)
            return false;
        this.properties.externalData.values[rowIndex][columnIndex] = roundedValue;
        this.board.calculator.refreshExternalData(this.properties.externalData.names, this.properties.externalData.values);
        return true;
    }

    onTableRowDeleteRequested(payload) {
        if (this.properties.externalData == null)
            return false;
        const rowIndex = Number.isInteger(payload?.rowKey) ? payload.rowKey : payload?.rowIndex;
        if (!Number.isInteger(rowIndex))
            return false;
        if (rowIndex < 0 || rowIndex >= this.properties.externalData.values.length)
            return false;
        this.properties.externalData.values.splice(rowIndex, 1);
        this.board.calculator.refreshExternalData(this.properties.externalData.names, this.properties.externalData.values);
        return true;
    }

    getFocusedRowKey() {
        if (this.properties.externalData != null)
            return null;
        return super.getFocusedRowKey();
    }

    isUserInputTableCell(rowIndex, columnIndex) {
        if (this.properties.externalData != null)
            return false;
        return super.isUserInputTableCell(rowIndex, columnIndex);
    }

    buildTableRows(columns = this._activeColumns ?? this.getSelectedColumns()) {
        if (this.properties.externalData != null)
            return this.buildPreloadedRows(columns);
        return super.buildTableRows(columns);
    }

    buildPreloadedRows(columns) {
        const externalData = this.properties.externalData;
        if (!externalData)
            return [];
        const names = Array.isArray(externalData.names) ? externalData.names : [];
        const values = Array.isArray(externalData.values) ? externalData.values : [];
        const iterationTermName = this.board.calculator.properties.iterationTerm;
        const independentTermName = this.board.calculator.properties.independent.name;
        const iterationColumnIndex = names.indexOf(iterationTermName);
        const independentColumnIndex = names.indexOf(independentTermName);
        const rows = [];
        for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
            const sourceRow = values[rowIndex];
            const row = { key: rowIndex };
            const iteration = iterationColumnIndex >= 0 ? Number(sourceRow?.[iterationColumnIndex]) : rowIndex + 1;
            const independentValue = independentColumnIndex >= 0 ? Number(sourceRow?.[independentColumnIndex]) : NaN;
            for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                const column = columns[columnIndex];
                row[column.key] = this.getPreloadedRowValue(column, names, sourceRow, iteration, independentValue, rowIndex + 1);
            }
            rows.push(row);
        }
        return rows;
    }

    getPreloadedRowValue(column, preloadedNames, sourceRow, iteration, independentValue, fallbackIteration) {
        const preloadedColumnIndex = preloadedNames.indexOf(column.term);
        if (preloadedColumnIndex >= 0)
            return sourceRow?.[preloadedColumnIndex];
        const system = this.board.calculator.system;
        if (Number.isFinite(iteration))
            return system.getByNameOnIteration(Math.round(iteration), column.term, column.case);
        if (Number.isFinite(independentValue))
            return system.getValueAtIndependent(independentValue, column.term, column.case);
        return system.getByNameOnIteration(fallbackIteration, column.term, column.case);
    }

    resetFocusedCells() {
        if (this.properties.externalData == null)
            return false;
        const table = this.table;
        const focusedCellRange = table?.focusedCellRange;
        if (!table || !focusedCellRange)
            return false;
        const names = this.properties.externalData.names;
        const values = this.properties.externalData.values;
        const originalValues = this.properties.originalExternalData?.values;
        if (!originalValues)
            return false;
        let hasChanges = false;
        for (let rowIndex = focusedCellRange.startRowIndex; rowIndex <= focusedCellRange.endRowIndex; rowIndex++) {
            const tableRow = table.rows[rowIndex];
            const rowKey = tableRow?.key;
            const sourceRowIndex = Number.isInteger(rowKey) ? rowKey : rowIndex;
            if (sourceRowIndex < 0 || sourceRowIndex >= values.length || sourceRowIndex >= originalValues.length)
                continue;
            for (let columnIndex = focusedCellRange.startColumnIndex; columnIndex <= focusedCellRange.endColumnIndex; columnIndex++) {
                const column = table.getColumnByIndex(columnIndex);
                const sourceTermName = this.normalizeColumnValue(column?.sourceColumn?.term ?? column?.term);
                if (sourceTermName === "")
                    continue;
                const preloadedColumnIndex = names.indexOf(sourceTermName);
                if (preloadedColumnIndex < 0)
                    continue;
                const originalValue = Number(originalValues[sourceRowIndex]?.[preloadedColumnIndex]);
                if (!Number.isFinite(originalValue))
                    continue;
                values[sourceRowIndex][preloadedColumnIndex] = originalValue;
                hasChanges = true;
            }
        }
        if (!hasChanges)
            return false;
        this.board.calculator.refreshExternalData(names, values);
        this.refreshTableRows();
        this.table.clearFocusedCells();
        this.table.selectedCell = null;
        this.table.render();
        return true;
    }
}
