class TableShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

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
        element.innerHTML = `<span class="mdl-name-btn-term"><i class="${iconClass} fa-flask"></i></span>`;
    }

    getDataButtonIconClass() {
        return this.properties.externalData != null ? "fa-solid" : "fa-light";
    }

    getColumnValueDisplayModeItems() {
        return [
            { value: "bars", text: this.board.translations.get("Bars") ?? "Bars", icon: "fa-light fa-chart-simple" },
            { value: "lines", text: this.board.translations.get("Lines") ?? "Lines", icon: "fa-light fa-chart-line" },
            { value: "none", text: this.board.translations.get("None") ?? "None", icon: "fa-light fa-ban" }
        ];
    }

    normalizeColumnValueDisplayMode(value) {
        if (value === "lines")
            return "lines";
        if (value === "none")
            return "none";
        return "bars";
    }

    getColumnValueDisplayModeIcon(value) {
        const normalizedValue = this.normalizeColumnValueDisplayMode(value);
        const items = this.getColumnValueDisplayModeItems();
        const selectedItem = items.find(item => item.value === normalizedValue);
        return selectedItem?.icon ?? "fa-light fa-chart-simple";
    }

    normalizeColumnListItem(sourceItem, normalizedItem) {
        normalizedItem.valueDisplayMode = this.normalizeColumnValueDisplayMode(sourceItem?.valueDisplayMode);
    }

    createEmptyColumnListItem() {
        return { valueDisplayMode: "bars" };
    }

    setColumnValueDisplayModeByIndex(index, value) {
        if (!Array.isArray(this.properties.columns))
            return;
        const normalizedValue = this.normalizeColumnValueDisplayMode(value);
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        columns[index].valueDisplayMode = normalizedValue;
        this.setPropertyCommand("columns", columns);
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
                text: this.board.translations.get("Marketplace Data") ?? "Marketplace Data",
                icon: "fa-light fa-globe",
                action: () => this.importExternalDataFromMarketplace()
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

    async importExternalDataFromFile() {
        const result = await this.board.shell.importDataFromFile();
        if (!result)
            return;
        this.properties.externalData = { names: result.names, values: result.values };
        this.properties.originalExternalData = { names: [...result.names], values: result.values.map(row => [...row]) };
        this.applyExternalDataColumns(result.names);
        this.board.shell.reset();
        this.refreshDataToolbarControl();
    }

    async importExternalDataFromUrl() {
        const result = await this.board.shell.importDataFromUrl();
        if (!result)
            return;
        this.properties.externalData = { names: result.names, values: result.values };
        this.properties.originalExternalData = { names: [...result.names], values: result.values.map(row => [...row]) };
        this.applyExternalDataColumns(result.names);
        this.board.shell.reset();
        this.refreshDataToolbarControl();
    }

    async importExternalDataFromMarketplace() {
        const result = await this.showMarketplaceDataPopup();
        if (!result)
            return;
        this.applyExternalDataColumns(result.names);
        this.refreshDataToolbarControl();
    }

    showMarketplaceDataPopup() {
        return new Promise(resolve => {
            this._marketplaceDataResolve = resolve;
            this._selectedMarketplaceDataset = null;
            const buildContent = async (contentElement) => {
                const host = contentElement.get ? contentElement.get(0) : contentElement;
                host.innerHTML = `<div class="mdl-marketplace-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
                let datasets = [];
                try {
                    datasets = await this.board.shell.modelsApiClient.fetchDataSets();
                } catch (error) {
                    host.innerHTML = `<div class="mdl-marketplace-data-status">${this.board.translations.get("Failed to load data") ?? "Failed to load data"}</div>`;
                    return;
                }
                if (!datasets.length) {
                    host.innerHTML = `<div class="mdl-marketplace-data-status">${this.board.translations.get("No data available") ?? "No data available"}</div>`;
                    return;
                }
                host.innerHTML = `
                    <div class="mdl-marketplace-data-scroll">
                        <div class="mdl-marketplace-data-grid"></div>
                    </div>`;
                const grid = host.querySelector(".mdl-marketplace-data-grid");
                for (const dataset of datasets) {
                    const thumbHtml = dataset.thumbnail_url
                        ? `<img class="mdl-marketplace-data-thumb" src="${dataset.thumbnail_url}" alt="">`
                        : `<div class="mdl-marketplace-data-thumb-placeholder"><i class="fa-light fa-table"></i></div>`;
                    grid.insertAdjacentHTML("beforeend", `
                        <div class="mdl-marketplace-data-card" data-id="${dataset.id ?? ""}"> 
                            ${thumbHtml}
                            <div class="mdl-marketplace-data-title">${dataset.title ?? "Untitled"}</div>
                        </div>`);
                    const cardElement = grid.lastElementChild;
                    cardElement.addEventListener("click", () => {
                        grid.querySelectorAll(".mdl-marketplace-data-card").forEach(c => c.classList.remove("selected"));
                        cardElement.classList.add("selected");
                        this._selectedMarketplaceDataset = dataset;
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
                            wrapperAttr: { class: "mdl-marketplace-data-tooltip" }
                        });
                    }
                }
            };
            if (this._marketplaceDataPopupInstance) {
                buildContent(this._marketplaceDataPopupInstance.content());
                this._marketplaceDataPopupInstance.show();
                return;
            }
            const popupHost = document.createElement("div");
            document.body.appendChild(popupHost);
            this._marketplaceDataPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
                visible: true,
                showTitle: true,
                title: this.board.translations.get("Marketplace Data") ?? "Marketplace Data",
                width: 680,
                height: 520,
                dragEnabled: true,
                hideOnOutsideClick: true,
                showCloseButton: true,
                wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-marketplace-data-popup"),
                toolbarItems: [
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Load") ?? "Load",
                            type: "default",
                            stylingMode: "contained",
                            onClick: () => this.onMarketplaceDataLoad()
                        }
                    },
                    {
                        widget: "dxButton",
                        location: "after",
                        toolbar: "bottom",
                        options: {
                            text: this.board.translations.get("Cancel") ?? "Cancel",
                            stylingMode: "text",
                            onClick: () => this._marketplaceDataPopupInstance.hide()
                        }
                    }
                ],
                onHidden: () => {
                    this._marketplaceDataResolve?.(null);
                    this._marketplaceDataResolve = null;
                },
                contentTemplate: contentElement => buildContent(contentElement)
            });
        });
    }

    async onMarketplaceDataLoad() {
        if (!this._selectedMarketplaceDataset)
            return;
        const dataset = this._selectedMarketplaceDataset;
        const response = await fetch(dataset.asset_url);
        const text = await response.text();
        const { names, values } = this.board.shell.parseCsv(text);
        this.properties.externalData = { names, values };
        this.properties.originalExternalData = { names: [...names], values: values.map(row => [...row]) };
        const resolveCallback = this._marketplaceDataResolve;
        this._marketplaceDataResolve = null;
        this._marketplaceDataPopupInstance.hide();
        this.applyExternalDataColumns(names);
        this.board.shell.reset();
        this.refreshDataToolbarControl();
        resolveCallback?.({ names, values });
    }

    applyExternalDataColumns(termNames) {
        if (!Array.isArray(termNames) || termNames.length === 0)
            return;
        const columns = [];
        for (let index = 0; index < termNames.length; index++)
            columns.push({ term: termNames[index], case: 1, color: "transparent", valueDisplayMode: "bars" });
        this.setExternalDataColumns(columns);
    }

    setExternalDataColumns(columns) {
        const command = new SetShapePropertiesCommand(this.board, this, {
            columns: columns,
            columnWidths: []
        });
        this.board.invoker.execute(command);
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Columns", stacked: true, buildControl: $p => $p.append(this.createColumnsControl()) });
    }

    populateShapeColorMenuSections(sections) {
        super.populateShapeColorMenuSections(sections);
        sections[0].items.push({
            text: this.board.translations.get("Row Step") ?? "Row Step",
            buildControl: $container => {
                $('<div>').appendTo($container).dxNumberBox({
                    value: this.properties.iterationSkip ?? 0,
                    min: 0,
                    step: 1,
                    format: "#",
                    showSpinButtons: true,
                    width: 80,
                    onValueChanged: e => {
                        const value = Math.max(0, Math.floor(Number(e.value) || 0));
                        this.setPropertyCommand("iterationSkip", value);
                    }
                });
            }
        });
    }

    renderTermsButtonTemplate(element) {
        const columns = (this.properties.columns ?? []).filter(c => c.term);
        const firstTerm = columns.length > 0 ? this.formatTermForDisplay(columns[0].term) : "";
        const extraCount = columns.length - 1;
        if (firstTerm) {
            const termPart = this.createNameButtonTermMarkup(firstTerm);
            const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
            element.innerHTML = `${termPart}${extraPart}`;
        } else
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Columns</span></span>`;
    }

    getCopySubMenuItems() {
        return [
            ...super.getCopySubMenuItems(),
            { text: "Copy as CSV", icon: "fa-light fa-file-csv", shortcut: "", action: () => this.copyAsCsv() }
        ];
    }

    async copyAsCsv() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return;
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const precision = this.board.calculator.getPrecision();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const header = columns.map(column => column.term).join(",");
        const rows = [header];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const values = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                return Number.isFinite(value) ? Utils.roundToPrecision(value, precision) : "";
            });
            rows.push(values.join(","));
        }
        await navigator.clipboard.writeText(rows.join("\n"));
    }

    refreshDataToolbarControl() {
        if (!this._dataDropdownElement)
            return;
        const buttonContentElement = this._dataDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderDataButtonTemplate(buttonContentElement);
    }

    createColumnsControl() {
        this.normalizeColumns();
        this._columnsControl = TermControl.createShapeTermsCollectionControl(this, "columns", {
            hostClassName: "shape-terms-control table-columns-control",
            listClassName: "shape-terms-list table-columns-list",
            rowClassName: "shape-term-row table-column-row",
            dragHandleClassName: "shape-term-drag-handle table-column-drag-handle",
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeColumnListItem(sourceItem, normalizedItem),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getLegacyColumns(),
            termEditor: {
                acceptCustomValue: (item, index) => this.shouldAllowCustomColumnName(item, index),
                onCustomItemCreating: event => this.onColumnTermCustomItemCreating(event)
            },
            lock: {
                width: "42px",
                editorType: "dxDropDownButton",
                getValue: item => this.normalizeColumnValueDisplayMode(item?.valueDisplayMode),
                getItems: () => this.getColumnValueDisplayModeItems(),
                valueExpr: "value",
                displayExpr: "text",
                buttonTemplate: (element, item, index, selectedValue) => {
                    const iconClassName = this.getColumnValueDisplayModeIcon(selectedValue);
                    $(element).empty().append(`<div class="shape-term-secondary-button"><i class="${iconClassName} shape-term-secondary-icon"></i></div>`);
                },
                itemTemplate: (itemData, itemIndex, element) => {
                    $(element).empty().append(`<div class="shape-term-secondary-item" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;width:100%"><i class="${itemData.icon} shape-term-secondary-icon"></i><span>${itemData.text}</span></div>`);
                },
                dropDownOptions: {
                    width: 180
                },
                onValueChanged: (index, value) => this.setColumnValueDisplayModeByIndex(index, value)
            },
            onChanged: () => this.refreshTableColumns()
        });
        return this._columnsControl.createHost();
    }

    getRegressionMethodItems() {
        return [
            { value: "none", text: this.board.translations.get("No Regression"), icon: "fa-light fa-chart-scatter" },
            { value: "Linear", text: this.board.translations.get("Linear Regression"), icon: "fa-light fa-chart-line" },
            { value: "Quadratic", text: this.board.translations.get("Quadratic Regression"), icon: "fa-light fa-chart-sine" }
        ];
    }

    getRegressionMethodDropDownWidth() {
        const items = this.getRegressionMethodItems();
        let maximumLabelLength = 0;
        for (let index = 0; index < items.length; index++) {
            const itemText = String(items[index]?.text ?? "");
            if (itemText.length > maximumLabelLength)
                maximumLabelLength = itemText.length;
        }
        return Math.max(120, maximumLabelLength * 8 + 64);
    }

    getRegressionTypeFromTermName(termName, caseNumber = 1) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "none";
        const normalizedCaseNumber = this.getClampedCaseNumber(caseNumber ?? 1);
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        if (!term || term.type !== Modellus.TermType.REGRESSION || !Array.isArray(term.ranges))
            return "none";
        const matchingRanges = term.ranges.filter(range => range?.caseNumber === normalizedCaseNumber);
        const regressionRange = matchingRanges.length > 0 ? matchingRanges[matchingRanges.length - 1] : term.ranges[term.ranges.length - 1];
        if (!regressionRange)
            return "none";
        if (regressionRange.regressionType === "Linear")
            return "Linear";
        if (regressionRange.regressionType === "Quadratic")
            return "Quadratic";
        return "none";
    }

    getRegressionSourceTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "";
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        if (!term || term.type !== Modellus.TermType.REGRESSION)
            return normalizedTermName;
        return term.sourceTermName;
    }

    normalizeRegressionType(regressionType) {
        if (regressionType === "Linear")
            return "Linear";
        if (regressionType === "Quadratic")
            return "Quadratic";
        return null;
    }

    isRegressionTermName(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return false;
        const term = this.board.calculator.system.getTerm(normalizedTermName);
        return term?.type === Modellus.TermType.REGRESSION;
    }

    getDisplayedColumnTitle(termName) {
        const normalizedTermName = this.normalizeColumnValue(termName);
        if (normalizedTermName === "")
            return "";
        const isRegression = this.isRegressionTermName(normalizedTermName);
        if (!isRegression)
            return BaseShape.escapeMathTermName(this.formatTermForDisplay(normalizedTermName));
        const sourceTermName = this.getRegressionSourceTermName(normalizedTermName);
        if (sourceTermName === "")
            return BaseShape.escapeMathTermName(this.formatTermForDisplay(normalizedTermName));
        return BaseShape.escapeMathTermName(`\\widehat{${sourceTermName}}`);
    }

    resolveFocusedRowsIterationRange(focusedRows) {
        if (!Array.isArray(focusedRows) || focusedRows.length === 0)
            return null;
        let startIteration = Infinity;
        let endIteration = -Infinity;
        let hasIteration = false;
        for (let index = 0; index < focusedRows.length; index++) {
            const focusedRow = focusedRows[index];
            const rowIndex = Number(focusedRow?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            const iteration = Math.floor(rowIndex) + 1;
            if (iteration < 1)
                continue;
            if (iteration < startIteration)
                startIteration = iteration;
            if (iteration > endIteration)
                endIteration = iteration;
            hasIteration = true;
        }
        if (!hasIteration)
            return null;
        return { startIteration: startIteration, endIteration: endIteration };
    }

    shouldAllowCustomColumnName(item, index) {
        if (!item)
            return false;
        const termName = this.normalizeColumnValue(item.term);
        return termName !== "";
    }

    applyRegressionColumnUpdate(columns) {
        const command = new SetShapePropertiesCommand(this.board, this, { columns: columns });
        this.board.invoker.execute(command);
    }

    onColumnTermCustomItemCreating(event) {
        if (!Array.isArray(this.properties.columns))
            return;
        const index = event?.index;
        if (!Number.isInteger(index) || index < 0)
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        const previousTermName = this.normalizeColumnValue(columns[index].term);
        if (previousTermName === "")
            return;
        const nextTermName = this.normalizeColumnValue(event?.text);
        if (nextTermName === "" || nextTermName === previousTermName)
            return;
        if (this.board.calculator.isTerm(nextTermName))
            return;
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        const regressionType = this.normalizeRegressionType(this.getRegressionTypeFromTermName(previousTermName, caseNumber));
        const isRegressionTerm = regressionType != null || this.isRegressionTermName(previousTermName);
        if (!isRegressionTerm) {
            columns[index].term = nextTermName;
            this.applyRegressionColumnUpdate(columns);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        if (!regressionType)
            return;
        const sourceTermName = this.getRegressionSourceTermName(previousTermName);
        try {
            this.board.calculator.calculateDataRegression(sourceTermName, regressionType, nextTermName, caseNumber);
        } catch (error) {
            console.warn("Failed to rename regression term", error);
            return;
        }
        columns[index].term = nextTermName;
        this.applyRegressionColumnUpdate(columns);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    onColumnRegressionTypeChanged(index, regressionType) {
        if (!Array.isArray(this.properties.columns))
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        if (!columns[index])
            return;
        const currentTermName = this.normalizeColumnValue(columns[index].term);
        if (currentTermName === "")
            return;
        const caseNumber = this.getClampedCaseNumber(columns[index].case ?? 1);
        const selectedRegressionType = this.normalizeRegressionType(regressionType);
        if (!selectedRegressionType) {
            if (this.isRegressionTermName(currentTermName)) {
                const sourceTermName = this.getRegressionSourceTermName(currentTermName);
                try {
                    this.board.calculator.removeDataRegression(currentTermName, caseNumber);
                } catch (_) {
                    return;
                }
                columns[index].term = sourceTermName;
            }
            this.applyRegressionColumnUpdate(columns);
            this.board.calculator.emit("iterate", { calculator: this.board.calculator });
            return;
        }
        let regressionResult = null;
        const sourceTermName = this.getRegressionSourceTermName(currentTermName);
        try {
            regressionResult = this.board.calculator.applyDataRegression(sourceTermName, selectedRegressionType, caseNumber);
        } catch (error) {
            console.warn("Failed to calculate regression", error);
            return;
        }
        if (!regressionResult)
            return;
        columns[index].term = regressionResult.targetTermName;
        this.applyRegressionColumnUpdate(columns);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Table Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.columnWidths = [];
        this.properties.headerBackgroundColor = "#f7f7f7";
        this.properties.iterationSkip = 0;
        this.properties.externalData = null;
        this.properties.originalExternalData = null;
        const defaultTerm = this.board.calculator.getDefaultTerm();
        this.properties.columns = [
            { term: this.board.calculator.properties.independent.name, case: 1, color: "transparent", valueDisplayMode: "bars" },
            { term: defaultTerm, case: 1, color: "transparent", valueDisplayMode: "bars" }
        ];
    }

    createElement() {
        this.normalizeColumns();
        this._activeColumns = this.getSelectedColumns();
        this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
        this._appliedControlColumnsKey = this.getControlColumnsStateKey(this.buildControlColumns(this._activeColumns));
        this._appliedStyleKey = "";
        const element = this.board.createSvgElement("g");
        this.table = new TableControl(element, this.getTableControlOptions(this._activeColumns));
        this.initializeCellsContextToolbar();
        return element;
    }

    getTableControlOptions(columns = this._activeColumns, controlColumns = this.buildControlColumns(columns)) {
        return {
            columns: controlColumns,
            foregroundColor: this.properties.foregroundColor,
            backgroundColor: this.properties.backgroundColor,
            headerBackgroundColor: this.getHeaderBackgroundColor(),
            borderColor: this.getBorderColor(),
            precision: this.board.calculator.getPrecision(),
            onCellValueChanged: payload => this.onTableCellValueChanged(payload),
            onColumnWidthChanged: payload => this.onTableColumnWidthChanged(payload),
            onRowDeleteRequested: payload => this.onTableRowDeleteRequested(payload),
            onFocusedCellsChanged: payload => this.onTableFocusedCellsChanged(payload),
            shouldKeepFocusedCellsOnPointerDown: payload => this.shouldKeepFocusedCellsOnPointerDown(payload),
            isOutlierCell: (rowIndex, columnIndex) => this.isOutlierTableCell(rowIndex, columnIndex)
        };
    }

    shouldKeepFocusedCellsOnPointerDown(payload) {
        const target = payload?.target;
        if (!(target instanceof Node))
            return false;
        if (this.cellsContextToolbar?.contains(target))
            return true;
        if (!(target instanceof Element))
            return false;
        if (!this.isFocusedCellsToolbarOverlayOpen())
            return false;
        return target.closest(".dx-overlay-wrapper") != null;
    }

    getDropDownButtonInstance(element) {
        const hostElement = element?.[0] ?? element;
        if (!(hostElement instanceof Element))
            return null;
        return window.DevExpress?.ui?.dxDropDownButton?.getInstance(hostElement) ?? null;
    }

    isFocusedCellsToolbarOverlayOpen() {
        const focusedRegressionMethodControl = this.getDropDownButtonInstance(this._focusedRegressionMethodElement);
        const focusedOutlierControl = this.getDropDownButtonInstance(this._focusedOutlierButtonElement);
        const focusedDeleteControl = this.getDropDownButtonInstance(this._focusedDeleteButtonElement);
        return focusedRegressionMethodControl?.option("opened") === true
            || focusedOutlierControl?.option("opened") === true
            || focusedDeleteControl?.option("opened") === true;
    }

    initializeCellsContextToolbar() {
        if (this.cellsContextToolbar || !window.DevExpress?.ui?.dxToolbar)
            return;
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        const items = this.getCellsToolbarItems();
        $(toolbarHost).dxToolbar({ items: items, width: "auto" });
        this.cellsContextToolbar = toolbarHost;
        this.cellsContextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    getCellsToolbarItems() {
        return [
            {
                location: "center",
                template: () => {
                    const container = $('<div class="mdl-focused-regression-method"></div>');
                    this.createFocusedRegressionMethodControl(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div class="mdl-focused-regression-term"></div>');
                    this.createFocusedRegressionTermControl(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedOutlierButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFocusedDeleteButton(container);
                    return container;
                }
            }
        ];
    }

    isOutlierTableCell(rowIndex, columnIndex) {
        const column = this.table?.getColumnByIndex(columnIndex);
        if (!column?.isPreloadedTerm)
            return false;
        const termName = this.normalizeColumnValue(column.term);
        if (termName === "")
            return false;
        return this.board.calculator.isOutlierIteration(termName, rowIndex + 1);
    }

    createFocusedOutlierButton(itemElement) {
        this._focusedOutlierButtonElement = $('<div class="mdl-outlier-selector">');
        this._focusedOutlierButtonElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-table-slash"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 160,
                contentTemplate: contentElement => this.buildFocusedOutlierMenuContent(contentElement)
            }
        });
        this._focusedOutlierButtonElement.appendTo(itemElement);
    }

    buildFocusedOutlierMenuContent(contentElement) {
        const items = [
            { value: "set", text: "Set as Outlier", icon: "fa-light fa-table-slash" },
            { value: "restore", text: "Restore", icon: "fa-light fa-arrow-rotate-left" }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                const outlierControl = this.getDropDownButtonInstance(this._focusedOutlierButtonElement);
                outlierControl?.close();
                if (event.itemData.value === "set")
                    this.setFocusedCellsAsOutliers();
                else if (event.itemData.value === "restore")
                    this.restoreFocusedCellsFromOutliers();
            }
        });
    }

    setFocusedCellsAsOutliers() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn || !Array.isArray(focusedRows) || focusedRows.length === 0)
            return;
        if (!focusedColumn.isPreloadedTerm)
            return;
        const termName = this.normalizeColumnValue(focusedColumn.term);
        if (termName === "")
            return;
        for (let index = 0; index < focusedRows.length; index++) {
            const rowIndex = Number(focusedRows[index]?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            this.board.calculator.addOutlierIteration(termName, rowIndex + 1);
        }
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.table?.render();
        this.board.resetShapeValues();
    }

    restoreFocusedCellsFromOutliers() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn || !Array.isArray(focusedRows) || focusedRows.length === 0)
            return;
        if (!focusedColumn.isPreloadedTerm)
            return;
        const termName = this.normalizeColumnValue(focusedColumn.term);
        if (termName === "")
            return;
        for (let index = 0; index < focusedRows.length; index++) {
            const rowIndex = Number(focusedRows[index]?.rowIndex);
            if (!Number.isFinite(rowIndex))
                continue;
            this.board.calculator.removeOutlierIteration(termName, rowIndex + 1);
        }
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.table?.render();
        this.board.resetShapeValues();
    }

    createFocusedDeleteButton(itemElement) {
        this._focusedDeleteButtonElement = $('<div class="mdl-remove-selector">');
        this._focusedDeleteButtonElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => {
                element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 140,
                contentTemplate: contentElement => this.buildFocusedDeleteMenuContent(contentElement)
            }
        });
        this._focusedDeleteButtonElement.appendTo(itemElement);
    }

    buildFocusedDeleteMenuContent(contentElement) {
        const items = [
            { value: "delete", text: "Delete", icon: "fa-light fa-trash-can" },
            { value: "reset", text: "Reset", icon: "fa-light fa-arrow-rotate-left" }
        ];
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                const deleteControl = this.getDropDownButtonInstance(this._focusedDeleteButtonElement);
                deleteControl?.close();
                if (event.itemData.value === "delete")
                    this.table?.deleteFocusedRows();
                else if (event.itemData.value === "reset")
                    this.resetFocusedCellsFromPreloadedData();
            }
        });
    }

    resetFocusedCellsFromPreloadedData() {
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

    createFocusedRegressionMethodControl(itemElement) {
        this._focusedRegressionMethodElement = $('<div class="mdl-focused-regression-method-control">');
        this._focusedRegressionMethodElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (_, element) => this.renderFocusedRegressionMethodButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: this.getRegressionMethodDropDownWidth(),
                contentTemplate: contentElement => this.buildFocusedRegressionMethodMenuContent(contentElement)
            }
        });
        this._focusedRegressionMethodElement.appendTo(itemElement);
    }

    createFocusedRegressionTermControl(itemElement) {
        this._focusedRegressionTermElement = $('<div class="mdl-focused-regression-term-control">');
        this._focusedRegressionTermElement.appendTo(itemElement);
    }

    getSelectedFocusedRegressionMethodItem() {
        const selectedMethodValue = this._focusedRegressionMethodValue ?? "Linear";
        const methods = this.getRegressionMethodItems();
        return methods.find(item => item.value === selectedMethodValue) ?? methods[0] ?? null;
    }

    renderFocusedRegressionMethodButtonTemplate(element) {
        element.innerHTML = `<span class="mdl-focused-toolbar-button mdl-focused-toolbar-button--method"><i class="fa-light fa-chart-scatter"></i></span>`;
    }

    buildFocusedRegressionMethodMenuContent(contentElement) {
        const methods = this.getRegressionMethodItems();
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: methods,
            scrollingEnabled: false,
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${itemData.text}</span></div>`;
            },
            onItemClick: event => {
                this._focusedRegressionMethodValue = event.itemData.value;
                const focusedRegressionMethodControl = this.getDropDownButtonInstance(this._focusedRegressionMethodElement);
                focusedRegressionMethodControl?.close();
                if (event.itemData.value !== "none")
                    this.applyFocusedCellsRegression();
            }
        });
    }

    buildColumnsWithInsertedRegressionTerm(columns, sourceColumnIndex, regressionResult, regressionColor) {
        const nextColumns = columns.map(column => ({ ...column }));
        if (sourceColumnIndex < 0 || sourceColumnIndex >= nextColumns.length)
            return nextColumns;
        const sourceColumn = nextColumns[sourceColumnIndex];
        const normalizedTargetTermName = this.normalizeColumnValue(regressionResult?.targetTermName);
        if (normalizedTargetTermName === "")
            return nextColumns;
        const existingTargetColumnIndex = nextColumns.findIndex((column, index) => index !== sourceColumnIndex && this.normalizeColumnValue(column?.term) === normalizedTargetTermName);
        let regressionColumn = {
            term: normalizedTargetTermName,
            case: sourceColumn.case,
            color: this.normalizeColumnColor(regressionColor),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(sourceColumn.valueDisplayMode)
        };
        if (existingTargetColumnIndex >= 0) {
            regressionColumn = {
                ...nextColumns[existingTargetColumnIndex],
                term: normalizedTargetTermName,
                case: sourceColumn.case,
                color: this.normalizeColumnColor(regressionColor),
                valueDisplayMode: this.normalizeColumnValueDisplayMode(nextColumns[existingTargetColumnIndex].valueDisplayMode)
            };
            nextColumns.splice(existingTargetColumnIndex, 1);
        }
        const insertIndex = Math.min(sourceColumnIndex + 1, nextColumns.length);
        nextColumns.splice(insertIndex, 0, regressionColumn);
        return nextColumns;
    }

    refreshFocusedRegressionTermLabel(termName) {
        if (!this._focusedRegressionTermElement)
            return;
        const sourceTermName = this.getRegressionSourceTermName(termName);
        const hattedSourceTermName = sourceTermName !== "" ? `\\widehat{${sourceTermName}}` : "";
        this._focusedRegressionTermElement[0].innerHTML = hattedSourceTermName !== "" ? `<span class="mdl-focused-term-name">${hattedSourceTermName}</span>` : "";
    }

    onTableFocusedCellsChanged(payload) {
        this._focusedCellsPayload = payload ?? null;
        this.refreshFocusedCellsToolbarControl();
        if (this.board.selection.selectedShape !== this)
            return;
        if (payload?.hasFocusedCells === true) {
            super.hideContextToolbar();
            this.showCellsContextToolbar();
            return;
        }
        this.hideCellsContextToolbar();
        super.showContextToolbar();
    }

    refreshFocusedCellsToolbarControl() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const currentTermName = this.normalizeColumnValue(focusedColumn?.term);
        const caseNumber = this.getClampedCaseNumber(focusedColumn?.caseNumber ?? focusedColumn?.sourceColumn?.case ?? 1);
        const draftFocusKey = `${currentTermName}|${caseNumber}`;
        if (this._focusedRegressionDraftFocusKey !== draftFocusKey) {
            const regressionType = this.getRegressionTypeFromTermName(currentTermName, caseNumber);
            this._focusedRegressionMethodValue = regressionType === "none" ? "Linear" : regressionType;
            this._focusedRegressionDraftColor = this.normalizeColumnColor(focusedColumn?.sourceColumn?.color);
            this._focusedRegressionDraftFocusKey = draftFocusKey;
            this.refreshFocusedRegressionTermLabel(regressionType !== "none" ? currentTermName : "");
        }
    }

    showCellsContextToolbar() {
        this.refreshFocusedCellsToolbarControl();
        if (this.cellsContextToolbar)
            this.cellsContextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionCellsContextToolbar()));
    }

    hideCellsContextToolbar() {
        if (this.cellsContextToolbar)
            this.cellsContextToolbar.classList.remove("visible");
    }

    positionCellsContextToolbar() {
        if (!this.cellsContextToolbar)
            return;
        const anchor = this.getScreenAnchorPoint();
        if (!anchor)
            return;
        const toolbarRect = this.cellsContextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.cellsContextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.cellsContextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = anchor.centerX - toolbarWidth / 2;
        let top = anchor.bottomY + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.cellsContextToolbar.style.left = `${left}px`;
        this.cellsContextToolbar.style.top = `${top}px`;
    }

    applyFocusedCellsRegression() {
        const focusedColumn = this._focusedCellsPayload?.focusedColumn;
        const focusedRows = this._focusedCellsPayload?.focusedRows;
        if (!focusedColumn)
            return;
        const currentTermName = this.normalizeColumnValue(focusedColumn.term);
        if (currentTermName === "")
            return;
        const regressionMethod = this._focusedRegressionMethodValue;
        const normalizedRegressionType = this.normalizeRegressionType(regressionMethod);
        if (!normalizedRegressionType)
            return;
        const columnIndex = this.properties.columns.findIndex(column => this.normalizeColumnValue(column?.term) === currentTermName);
        if (columnIndex < 0)
            return;
        const columns = this.properties.columns.map(column => ({ ...column }));
        const caseNumber = this.getClampedCaseNumber(columns[columnIndex].case ?? 1);
        const sourceTermName = this.getRegressionSourceTermName(currentTermName);
        const focusedRowsIterationRange = this.resolveFocusedRowsIterationRange(focusedRows);
        let regressionResult = null;
        try {
            if (focusedRowsIterationRange)
                regressionResult = this.board.calculator.applyDataRegression(sourceTermName, normalizedRegressionType, caseNumber, focusedRowsIterationRange.startIteration, focusedRowsIterationRange.endIteration);
            else
                regressionResult = this.board.calculator.applyDataRegression(sourceTermName, normalizedRegressionType, caseNumber);
        } catch (_) {
            return;
        }
        if (!regressionResult)
            return;
        const nextColumns = this.buildColumnsWithInsertedRegressionTerm(columns, columnIndex, regressionResult, this._focusedRegressionDraftColor);
        this.applyRegressionColumnUpdate(nextColumns);
        this.table?.clearFocusedCells();
        if (this.table)
            this.table.selectedCell = null;
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    showContextToolbar() {
        if (this.table?.hasFocusedCells?.()) {
            this.showCellsContextToolbar();
            super.hideContextToolbar();
            return;
        }
        this.hideCellsContextToolbar();
        if (this._columnsControl)
            this._columnsControl.refresh();
        this.refreshTermsToolbarControl();
        this.refreshDataToolbarControl();
        super.showContextToolbar();
    }

    hideContextToolbar() {
        this.hideCellsContextToolbar();
        super.hideContextToolbar();
    }

    deriveHeaderColor(backgroundColor) {
        if (!backgroundColor || backgroundColor === "transparent" || backgroundColor === "#00000000")
            return "#f7f7f7";
        const r = parseInt(backgroundColor.slice(1, 3), 16);
        const g = parseInt(backgroundColor.slice(3, 5), 16);
        const b = parseInt(backgroundColor.slice(5, 7), 16);
        const factor = 0.93;
        const dr = Math.round(r * factor);
        const dg = Math.round(g * factor);
        const db = Math.round(b * factor);
        return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
    }

    getHeaderBackgroundColor() {
        if (this.properties.headerBackgroundColor)
            return this.properties.headerBackgroundColor;
        return this.deriveHeaderColor(this.properties.backgroundColor);
    }

    getTableStyleKey() {
        const precision = this.board.calculator.getPrecision();
        return `${this.properties.foregroundColor}|${this.properties.backgroundColor}|${this.getHeaderBackgroundColor()}|${this.getBorderColor()}|${precision}`;
    }

    getControlColumnsStateKey(controlColumns = this.buildControlColumns(this._activeColumns ?? this.getSelectedColumns())) {
        return JSON.stringify(controlColumns.map(column => ({
            term: column.term,
            caseNumber: column.caseNumber,
            editable: column.editable === true,
            isPreloadedTerm: column.isPreloadedTerm === true,
            termType: Number.isFinite(column.termType) ? column.termType : null,
            expressionLatex: typeof column.expressionLatex === "string" ? column.expressionLatex : null,
            width: Number.isFinite(column.width) ? column.width : null,
            precision: Number.isFinite(column.precision) ? column.precision : null,
            barColor: this.normalizeColumnColor(column.barColor),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode)
        })));
    }

    buildControlColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        const hasPreloadedData = this.properties.externalData != null;
        const system = this.board.calculator.system;
        const controlColumns = columns.map(column => {
            const isPreloadedTerm = this.isPreloadedTableColumnTerm(column.term, hasPreloadedData, system);
            const term = system.getTerm(column.term);
            return {
                key: column.key,
                title: this.getDisplayedColumnTitle(column.term),
                term: column.term,
                caseNumber: column.case,
                showCase: TermControl.shouldShowCaseSelectionForShapeTerm(this, column.term, value => this.normalizeColumnValue(value)),
                editable: this.canEditTableColumn(column.term, isPreloadedTerm),
                width: Number.isFinite(column.width) ? column.width : null,
                precision: precision,
                barColor: this.normalizeColumnColor(column.color),
                valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode),
                isPreloadedTerm: isPreloadedTerm,
                termType: term?.type,
                expressionLatex: term?.expressionLatex,
                sourceColumn: column
            };
        });
        return controlColumns;
    }

    isPreloadedTableColumnTerm(term, hasPreloadedData = this.properties.externalData != null, system = this.board.calculator.system) {
        if (hasPreloadedData && this.properties.externalData?.names?.indexOf(term) >= 0)
            return true;
        return system.getTerm(term)?.type === Modellus.TermType.PRELOADED;
    }

    canEditTableColumn(term, isPreloadedTerm = this.isPreloadedTableColumnTerm(term)) {
        if (this.properties.externalData != null)
            return isPreloadedTerm;
        return this._canEditTerm(term);
    }

    onTableCellValueChanged(payload) {
        const sourceColumn = payload?.column?.sourceColumn;
        if (!sourceColumn)
            return false;
        const numericValue = Number(payload?.value);
        if (!Number.isFinite(numericValue))
            return false;
        const precision = this.board.calculator.getPrecision();
        const roundedValue = Utils.roundToPrecision(numericValue, precision);
        if (this.properties.externalData != null) {
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
        if (!this._canEditTerm(sourceColumn.term))
            return false;
        const iteration = payload?.rowKey ?? payload?.row?.key;
        if (iteration == null)
            return false;
        const system = this.board.calculator.system;
        const row = system.getIteration(iteration, sourceColumn.case);
        if (!row)
            return false;
        row[sourceColumn.term] = roundedValue;
        if (iteration === 1 && this.board.calculator.isTerm(sourceColumn.term))
            system.setInitialByName(sourceColumn.term, roundedValue, 1, sourceColumn.case);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
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

    onTableColumnWidthChanged(payload) {
        const columnIndex = payload?.columnIndex;
        const width = Number(payload?.width);
        if (!Number.isInteger(columnIndex) || columnIndex < 0)
            return;
        if (!Number.isFinite(width) || width <= 0)
            return;
        const columnWidths = Array.isArray(this.properties.columnWidths) ? [...this.properties.columnWidths] : [];
        columnWidths[columnIndex] = width;
        this.setPropertyCommand("columnWidths", columnWidths);
    }

    updateFocus() {
        if (!this.table)
            return;
        if (!this._activeColumns || this._activeColumns.length === 0) {
            this.table.setFocusedRowKey(null);
            return;
        }
        if (this.properties.externalData != null) {
            this.table.setFocusedRowKey(null);
            return;
        }
        var system = this.board.calculator.system;
        this.table.setFocusedRowKey(system.iteration);
    }

    update() {
        this.normalizeColumns();
        this.refreshTableColumns();
        this.refreshColumnsControl();
    }

    clearStaleTermCollectionReferences(staleTermNames) {
        if (!Array.isArray(this.properties.columns))
            return;
        let hadStale = false;
        for (let i = 0; i < this.properties.columns.length; i++) {
            if (staleTermNames.has(this.properties.columns[i].term)) {
                this.properties.columns[i] = { ...this.properties.columns[i], term: "" };
                hadStale = true;
            }
        }
        if (hadStale)
            this.update();
    }

    draw() {
        super.draw();
        const x = this.properties.x;
        const y = this.properties.y;
        const width = this.properties.width;
        const height = this.properties.height;
        if (this.table)
            this.table.setSize(width, height);
        this.element.setAttribute("transform", `translate(${x} ${y}) rotate(${this.properties.rotation} ${width / 2} ${height / 2})`);
    }

    tick() {
        this.refreshTableRows();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }

    refreshTableColumns() {
        if (!this.table)
            return;
        const columns = this.getSelectedColumns();
        const controlColumns = this.buildControlColumns(columns);
        const nextKey = this.getColumnsStateKey(columns);
        const nextControlColumnsKey = this.getControlColumnsStateKey(controlColumns);
        const nextStyleKey = this.getTableStyleKey();
        if (this._appliedColumnsKey === nextKey && this._appliedControlColumnsKey === nextControlColumnsKey && this._appliedStyleKey === nextStyleKey)
            return;
        this._activeColumns = columns;
        this.table.setOptions(this.getTableControlOptions(columns, controlColumns));
        this._appliedColumnsKey = nextKey;
        this._appliedControlColumnsKey = nextControlColumnsKey;
        this._appliedStyleKey = nextStyleKey;
        this.refreshTableRows();
    }

    buildRegressionRangeOverlays(columns) {
        if (!this.table)
            return [];
        const colorPalette = this.table.options.focusedRangeColors;
        if (!Array.isArray(colorPalette) || colorPalette.length === 0)
            return [];
        const system = this.board.calculator.system;
        const independentStart = Number(this.board.calculator.properties.independent.start);
        const independentStep = Number(this.board.calculator.properties.independent.step);
        if (!Number.isFinite(independentStart) || !Number.isFinite(independentStep) || independentStep === 0)
            return [];
        const overlays = [];
        let colorIndex = 0;
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const column = columns[columnIndex];
            const termName = this.normalizeColumnValue(column.term);
            if (!this.isRegressionTermName(termName))
                continue;
            const term = system.getTerm(termName);
            if (!term || !Array.isArray(term.ranges))
                continue;
            const caseNumber = this.getClampedCaseNumber(column.case ?? 1);
            const sourceTermName = term.sourceTermName;
            const sourceColumnIndex = columns.findIndex((col, index) =>
                index !== columnIndex &&
                this.normalizeColumnValue(col.term) === sourceTermName &&
                this.getClampedCaseNumber(col.case ?? 1) === caseNumber
            );
            const caseRanges = term.ranges.filter(range => range.caseNumber === caseNumber);
            for (let rangeIndex = 0; rangeIndex < caseRanges.length; rangeIndex++) {
                const regressionRange = caseRanges[rangeIndex];
                const rangeIndependentStart = Number(regressionRange.independentStart);
                const rangeIndependentEnd = Number(regressionRange.independentEnd);
                if (!Number.isFinite(rangeIndependentStart) || !Number.isFinite(rangeIndependentEnd))
                    continue;
                const startRowIndex = Math.max(0, Math.round((rangeIndependentStart - independentStart) / independentStep));
                const endRowIndex = Math.max(0, Math.round((rangeIndependentEnd - independentStart) / independentStep));
                if (startRowIndex > endRowIndex)
                    continue;
                const color = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
                overlays.push({
                    range: { startRowIndex, endRowIndex, startColumnIndex: columnIndex, endColumnIndex: columnIndex },
                    color
                });
                if (sourceColumnIndex >= 0)
                    overlays.push({
                        range: { startRowIndex, endRowIndex, startColumnIndex: sourceColumnIndex, endColumnIndex: sourceColumnIndex },
                        color
                    });
            }
        }
        return overlays;
    }

    refreshTableRows() {
        if (!this.table)
            return;
        const columns = this._activeColumns ?? this.getSelectedColumns();
        this.table.regressionRangeOverlays = this.buildRegressionRangeOverlays(columns);
        if (columns.length === 0) {
            this.table.setRows([]);
            return;
        }
        if (this.properties.externalData != null) {
            this.table.setRows(this.buildPreloadedRows(columns));
            return;
        }
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const row = { key: iteration };
            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                row[column.key] = system.getByNameOnIteration(iteration, column.term, column.case);
            }
            rows.push(row);
        }
        this.table.setRows(rows);
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

    getSelectedColumns() {
        const columnWidths = Array.isArray(this.properties.columnWidths) ? this.properties.columnWidths : [];
        const selectedColumns = TermControl.getSelectedShapeTermsCollection(this, "columns", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeColumnListItem(sourceItem, normalizedItem),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getLegacyColumns()
        });
        return selectedColumns.map((column, index) => ({
            key: `column${index}`,
            term: column.term,
            case: column.case,
            color: this.normalizeColumnColor(column.color),
            valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode),
            width: Number.isFinite(columnWidths[index]) ? columnWidths[index] : null
        }));
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return JSON.stringify(columns.map(column => ({ term: column.term, case: column.case, color: this.normalizeColumnColor(column.color), valueDisplayMode: this.normalizeColumnValueDisplayMode(column.valueDisplayMode), width: Number.isFinite(column.width) ? column.width : null })));
    }

    refreshColumnsControl() {
        if (!this._columnsControl)
            return;
        this._columnsControl.refresh();
    }

    normalizeColumns() {
        TermControl.normalizeShapeTermsCollection(this, "columns", {
            includeColor: true,
            normalizeTermValue: value => this.normalizeColumnValue(value),
            normalizeColorValue: value => this.normalizeColumnColor(value),
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeColumnListItem(sourceItem, normalizedItem),
            createEmptyItem: () => this.createEmptyColumnListItem(),
            getFallbackItems: () => this.getLegacyColumns()
        });
    }

    getLegacyColumns() {
        const columns = [];
        const column1Term = this.normalizeColumnValue(this.properties.column1Term);
        const column2Term = this.normalizeColumnValue(this.properties.column2Term);
        if (column1Term !== "")
            columns.push({ term: column1Term, case: this.getClampedCaseNumber(this.properties.column1TermCase ?? 1), color: "transparent", valueDisplayMode: "bars" });
        if (column2Term !== "")
            columns.push({ term: column2Term, case: this.getClampedCaseNumber(this.properties.column2TermCase ?? 1), color: "transparent", valueDisplayMode: "bars" });
        if (columns.length === 0)
            columns.push({ term: "", case: 1, color: "transparent", valueDisplayMode: "bars" });
        return columns;
    }

    normalizeColumnValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    normalizeColumnColor(value) {
        const normalizedColor = TermControl.normalizeColorValue(value);
        if (normalizedColor === "")
            return "transparent";
        return normalizedColor;
    }

    _canEditTerm(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        return calculator.isTerm(term) && calculator.isEditable(term);
    }

    enterEditMode(event) {
        if (!this.table)
            return super.enterEditMode();
        console.log("[editmode] TableShape.enterEditMode calling table.focus()");
        this.table.focus();
        console.log("[editmode] TableShape.enterEditMode table.focus() done");
        const cell = this.table.getClickedCell(event);
        if (cell && this.table.canEditCell(cell.rowIndex, cell.columnIndex)) {
            this.table.startEditing(cell.rowIndex, cell.columnIndex, null);
            this.table.render();
        }
        console.log("[editmode] TableShape.enterEditMode returning true");
        return true;
    }

    toHtmlTable() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return "";
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const precision = this.board.calculator.getPrecision();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const headerCells = columns.map(column => `<th>${column.term}</th>`).join("");
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const cells = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                if (value == null || !Number.isFinite(value))
                    return "<td></td>";
                return `<td>${Utils.roundToPrecision(value, precision)}</td>`;
            }).join("");
            rows.push(`<tr>${cells}</tr>`);
        }
        return `<table><thead><tr>${headerCells}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
    }

    toTsvTable() {
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0)
            return "";
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const precision = this.board.calculator.getPrecision();
        const iterationSkip = Math.max(0, Math.floor(Number(this.properties.iterationSkip) || 0));
        const rows = [columns.map(column => column.term).join("\t")];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            if (iterationSkip > 0 && (iteration - 1) % iterationSkip !== 0)
                continue;
            const values = columns.map(column => {
                const value = system.getByNameOnIteration(iteration, column.term, column.case);
                return Number.isFinite(value) ? Utils.roundToPrecision(value, precision) : "";
            });
            rows.push(values.join("\t"));
        }
        return rows.join("\n");
    }

    async copyToClipboard() {
        const shapeData = this.getClipboardData();
        const json = JSON.stringify(shapeData);
        const htmlTable = this.toHtmlTable();
        const tsvTable = this.toTsvTable();
        const imageBlob = this.toImageBlob();
        const items = [new ClipboardItem({
            "text/plain": new Blob([tsvTable], { type: "text/plain" }),
            "text/html": new Blob([htmlTable], { type: "text/html" }),
            "image/png": imageBlob
        })];
        await navigator.clipboard.write(items);
    }
}
