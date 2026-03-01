class TableShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
    }

    createTransformer() {
        return new RectangleTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        this.normalizeColumns();
        items.push({
            colSpan: 2,
            itemType: "group",
            colCount: 1,
            items: [
                {
                    colSpan: 2,
                    label: { text: "Columns" },
                    template: _ => this.createColumnsControl()
                }
            ]
        });
        instance.option("items", items);
        return form;
    }

    createColumnsControl() {
        const control = $("<div>").addClass("table-columns-control");
        this._columnsControlHost = control;
        this.renderColumnsControl(control);
        return control;
    }

    renderColumnsControl(controlHost) {
        if (!controlHost)
            return;
        this.normalizeColumns();
        controlHost.empty();
        const listHost = $("<div>").addClass("table-columns-list");
        controlHost.append(listHost);
        const columns = Array.isArray(this.properties.columns) ? this.properties.columns.map(column => ({ term: column.term, case: this.getClampedCaseNumber(column.case ?? 1) })) : [];
        listHost.dxList({
            dataSource: columns,
            selectionMode: "none",
            activeStateEnabled: false,
            focusStateEnabled: false,
            hoverStateEnabled: false,
            allowItemDeleting: true,
            itemDeleteMode: "static",
            noDataText: "",
            itemTemplate: (column, index, element) => this.renderColumnListItem(column, index, element, controlHost),
            onItemDeleting: e => {
                e.cancel = true;
                this.onColumnRemoved(e.itemIndex, controlHost);
            },
            onContentReady: e => this.refreshColumnsListVisuals(e.component),
            onItemRendered: e => this.refreshColumnsListVisuals(e.component),
            itemDragging: {
                allowReordering: true,
                showDragIcons: false,
                handle: ".table-column-drag-handle",
                onReorder: e => this.onColumnsReordered(e.fromIndex, e.toIndex, controlHost)
            }
        });
        this._columnsControlStateKey = this.getColumnsControlStateKey();
    }

    refreshColumnsListVisuals(listInstance) {
        if (!listInstance)
            return;
        this.updateColumnsListDeleteIcons(listInstance);
    }

    updateColumnsListDeleteIcons(listInstance) {
        const listElement = $(listInstance.element());
        const deleteButtons = listElement.find(".dx-list-static-delete-button, .dx-list-item-delete-button, .dx-list-delete-button");
        for (let index = 0; index < deleteButtons.length; index++) {
            const buttonElement = $(deleteButtons[index]);
            const iconElement = buttonElement.find(".dx-icon").first();
            if (iconElement.length == 0)
                continue;
            if (iconElement.attr("data-trash-icon") === "1")
                continue;
            iconElement.attr("data-trash-icon", "1");
            iconElement.removeClass("dx-icon-close dx-icon-remove dx-icon-trash");
            iconElement.empty();
            $("<i>").addClass("fa-light fa-trash-can trash").appendTo(iconElement);
            $("<i>").addClass("fa-solid fa-trash-can trash-hover").appendTo(iconElement);
        }
    }

    renderColumnListItem(column, index, element, controlHost) {
        const showCase = this.shouldShowCaseSelector(column.term);
        const row = $("<div>").addClass("table-column-row").css({
            display: "grid",
            gridTemplateColumns: showCase ? "24px 1fr 120px" : "24px 1fr",
            gap: "8px",
            marginBottom: "8px"
        });
        const handleHost = $("<div>").addClass("table-column-drag-handle");
        $("<i>").addClass("dx-icon dx-icon-dragvertical").appendTo(handleHost);
        row.append(handleHost);
        const termHost = $("<div>");
        row.append(termHost);
        termHost.dxSelectBox({
            value: column.term === "" ? null : column.term,
            items: this.buildColumnTermItems(column.term),
            stylingMode: "filled",
            displayExpr: "text",
            valueExpr: "term",
            placeholder: "",
            acceptCustomValue: false,
            inputAttr: { class: "mdl-variable-selector" },
            elementAttr: { class: "mdl-variable-selector" },
            itemTemplate: (data, rowIndex, itemElement) => {
                const item = $("<div>").text(data.text);
                item.addClass("mdl-variable-selector");
                itemElement.append(item);
                return item;
            },
            onValueChanged: e => this.onColumnTermChanged(index, e.value, controlHost)
        });
        if (showCase) {
            const caseHost = $("<div>");
            row.append(caseHost);
            const caseFieldAddonRenderer = this.createColumnCaseFieldAddonRenderer();
            caseHost.dxSelectBox({
                value: column.case,
                items: this.buildCaseItems(),
                valueExpr: "value",
                displayExpr: "value",
                stylingMode: "filled",
                fieldAddons: caseFieldAddonRenderer ? { before: caseFieldAddonRenderer } : {},
                itemTemplate: this.createColumnCaseItemTemplate(),
                onValueChanged: e => this.onColumnCaseChanged(index, e.value, controlHost)
            });
        }
        element.append(row);
    }

    onColumnsReordered(fromIndex, toIndex, controlHost) {
        const columns = Array.isArray(this.properties.columns) ? this.properties.columns.map(column => ({ term: column.term, case: column.case })) : [];
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= columns.length || toIndex >= columns.length || fromIndex === toIndex)
            return;
        const moved = columns.splice(fromIndex, 1)[0];
        columns.splice(toIndex, 0, moved);
        this.properties.columns = columns;
        this.normalizeColumns();
        this.setProperty("columns", this.properties.columns);
        this.refreshGridColumns();
        this.renderColumnsControl(controlHost);
    }

    onColumnRemoved(index, controlHost) {
        const columns = Array.isArray(this.properties.columns) ? this.properties.columns.map(column => ({ term: column.term, case: column.case })) : [];
        if (index < 0 || index >= columns.length)
            return;
        columns.splice(index, 1);
        this.properties.columns = columns;
        this.normalizeColumns();
        this.setProperty("columns", this.properties.columns);
        this.refreshGridColumns();
        this.renderColumnsControl(controlHost);
    }

    onColumnTermChanged(index, value, controlHost) {
        const columns = Array.isArray(this.properties.columns) ? this.properties.columns.map(column => ({ term: column.term, case: column.case })) : [];
        if (!columns[index])
            columns[index] = { term: "", case: 1 };
        columns[index].term = this.normalizeColumnValue(value);
        columns[index].case = this.getClampedCaseNumber(columns[index].case ?? 1);
        this.properties.columns = columns;
        this.normalizeColumns();
        this.setProperty("columns", this.properties.columns);
        this.refreshGridColumns();
        this.renderColumnsControl(controlHost);
    }

    onColumnCaseChanged(index, value, controlHost) {
        const columns = Array.isArray(this.properties.columns) ? this.properties.columns.map(column => ({ term: column.term, case: column.case })) : [];
        if (!columns[index])
            return;
        columns[index].case = this.getClampedCaseNumber(value);
        this.properties.columns = columns;
        this.normalizeColumns();
        this.setProperty("columns", this.properties.columns);
        this.refreshGridColumns();
        this.renderColumnsControl(controlHost);
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Table Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 100;
        this.properties.y = center.y - 100;
        this.properties.width = 200;
        this.properties.height = 200;
        this.properties.rotation = 0;
        this.properties.columns = [{ term: "", case: 1 }];
    }

    createElement() {
        this.normalizeColumns();
        this._activeColumns = this.getSelectedColumns();
        this._appliedColumnsKey = this.getColumnsStateKey(this._activeColumns);
        const foreignObject = this.board.createSvgElement("foreignObject");
        const $div = $("<div>").appendTo(foreignObject);
        $div.css({ "width": "100%", "height": "100%" });
        this.dataGrid = $div.dxDataGrid({
            dataSource: [],
            keyExpr: "iteration",
            editing: {
                mode: "cell",
                allowUpdating: true,
                selectTextOnEditStart: true,
                startEditAction: "click",
                useIcons: true
            },
            scrolling: {
                mode: "virtual"
            },
            showBorders: true,
            selection: {
                mode: "single"
            },
            noDataText: "",
            onEditorPreparing: e => this.onEditorPreparing(e),
            onCellValueChanged: e => this.onCellValueChanged(e),
            columns: this.buildGridColumns(this._activeColumns)
        }).dxDataGrid("instance");
        return foreignObject;
    }

    updateFocus() {
        if (!this._activeColumns || this._activeColumns.length === 0)
            return;
        var system = this.board.calculator.system;
        if (this.dataGrid.option("focusedRowKey") == system.iteration)
            return;
        this.dataGrid.navigateToRow(system.iteration);
        this.dataGrid.selectRows([system.iteration]);
    }

    update() {
        this.normalizeColumns();
        this.refreshGridColumns();
        this.refreshColumnsControl();
    }

    draw() {
        this.element.setAttribute("x", this.properties.x);
        this.element.setAttribute("y", this.properties.y);
        this.element.setAttribute("width", this.properties.width);
        this.element.setAttribute("height", this.properties.height);
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${this.properties.x + this.properties.width / 2}, 
            ${this.properties.y + this.properties.height / 2})`);
    }

    tick() {
        this.refreshGridData();
        const now = performance.now();
        if (!this._lastFocusTs || now - this._lastFocusTs > 33) {
            this.updateFocus();
            this._lastFocusTs = now;
        }
        super.tick();
    }

    onEditorPreparing(e) {
        if (e.parentType !== "dataRow")
            return;
        const column = this.getActiveColumnByField(e.dataField);
        if (!column) {
            e.editorOptions.readOnly = true;
            return;
        }
        e.editorOptions.readOnly = !this._canEditTerm(column.term);
    }

    onCellValueChanged(e) {
        const column = this.getActiveColumnByField(e.column?.dataField);
        if (!column || !this._canEditTerm(column.term))
            return;
        const iteration = e.data?.iteration ?? e.key;
        if (iteration == null)
            return;
        const numericValue = Number(e.value);
        if (!Number.isFinite(numericValue)) {
            e.component.cellValue(e.rowIndex, column.key, e.oldValue);
            return;
        }
        const precision = this.board.calculator.getPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        e.component.cellValue(e.rowIndex, column.key, rounded);
        const system = this.board.calculator.system;
        const row = system.getIteration(iteration, column.case);
        if (!row)
            return;
        row[column.term] = rounded;
        if (iteration === 1 && this.board.calculator.isTerm(column.term))
            system.setInitialByName(column.term, rounded, 1, column.case);
        this.board.calculator.emit("iterate", { calculator: this.board.calculator });
    }

    refreshGridColumns() {
        if (!this.dataGrid)
            return;
        const columns = this.getSelectedColumns();
        const nextKey = this.getColumnsStateKey(columns);
        if (this._appliedColumnsKey === nextKey)
            return;
        this._activeColumns = columns;
        this.dataGrid.option("columns", this.buildGridColumns(columns));
        this._appliedColumnsKey = nextKey;
        this.refreshGridData();
    }

    refreshGridData() {
        if (!this.dataGrid)
            return;
        const columns = this._activeColumns ?? this.getSelectedColumns();
        if (columns.length === 0) {
            this.dataGrid.option("dataSource", []);
            return;
        }
        const system = this.board.calculator.system;
        const lastIteration = this.board.calculator.getLastIteration();
        const rows = [];
        for (let iteration = 1; iteration <= lastIteration; iteration++) {
            const row = { iteration: iteration };
            for (let index = 0; index < columns.length; index++) {
                const column = columns[index];
                row[column.key] = system.getByNameOnIteration(iteration, column.term, column.case);
            }
            rows.push(row);
        }
        this.dataGrid.option("dataSource", rows);
    }

    buildGridColumns(columns = this._activeColumns) {
        const precision = this.board.calculator.getPrecision();
        return columns.map(column => ({
            dataField: column.key,
            caption: column.term,
            headerCellTemplate: container => this.renderGridHeader(container, column),
            allowEditing: this._canEditTerm(column.term),
            dataType: "number",
            format: {
                type: "fixedPoint",
                precision: precision
            }
        }));
    }

    renderGridHeader(container, column) {
        const header = $("<div>").css({
            display: "flex",
            alignItems: "center",
            gap: "6px"
        });
        $("<math-field>")
            .attr("read-only", true)
            .html(column.term ?? "")
            .css("height", "auto", "width", "auto")
            .addClass("form-math-field")
            .appendTo(header);
        if (this.shouldShowCaseSelector(column.term)) {
            const caseIndicator = $("<span>").addClass("case-select");
            const iconClass = this.getCaseNumberIconClass(column.case);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", this.getCaseIconColor());
            icon.css("margin-right", "0");
            caseIndicator.append(icon);
            header.append(caseIndicator);
        }
        header.appendTo(container);
    }

    getActiveColumnByField(dataField) {
        if (!this._activeColumns)
            return null;
        for (let index = 0; index < this._activeColumns.length; index++) {
            const column = this._activeColumns[index];
            if (column.key === dataField)
                return column;
        }
        return null;
    }

    getSelectedColumns() {
        const selectedColumns = [];
        if (!Array.isArray(this.properties.columns))
            return selectedColumns;
        for (let index = 0; index < this.properties.columns.length; index++) {
            const column = this.properties.columns[index];
            const term = this.normalizeColumnValue(column?.term);
            if (term === "")
                continue;
            selectedColumns.push({
                key: `column${selectedColumns.length}`,
                term: term,
                case: this.getClampedCaseNumber(column?.case ?? 1)
            });
        }
        return selectedColumns;
    }

    getColumnsStateKey(columns = this.getSelectedColumns()) {
        return JSON.stringify(columns.map(column => ({ term: column.term, case: column.case })));
    }

    refreshColumnsControl() {
        if (!this._columnsControlHost)
            return;
        const nextKey = this.getColumnsControlStateKey();
        if (this._columnsControlStateKey === nextKey)
            return;
        this.renderColumnsControl(this._columnsControlHost);
    }

    getColumnsControlStateKey() {
        const terms = this.board.calculator.getTermsNames();
        return `${this.getCasesCount()}|${JSON.stringify(this.properties.columns ?? [])}|${terms.join(",")}`;
    }

    buildColumnTermItems(selectedTerm) {
        const calculator = this.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames());
        const normalizedSelectedTerm = this.normalizeColumnValue(selectedTerm);
        if (normalizedSelectedTerm === "")
            return items;
        if (calculator.isTerm(normalizedSelectedTerm))
            return items;
        items.unshift({
            text: normalizedSelectedTerm,
            term: normalizedSelectedTerm
        });
        return items;
    }

    buildCaseItems() {
        const items = [];
        const count = this.getCasesCount();
        for (let value = 1; value <= count; value++)
            items.push({ value: value });
        return items;
    }

    createColumnCaseFieldAddonRenderer() {
        return data => {
            const iconClass = this.getCaseNumberIconClass(data?.value ?? 1);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", this.getCaseIconColor());
            return icon;
        };
    }

    createColumnCaseItemTemplate() {
        return (itemData, _, element) => {
            const content = $("<div>").addClass("case-select");
            const iconClass = this.getCaseNumberIconClass(itemData.value);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", this.getCaseIconColor());
            const label = $("<span>").addClass("case-select__label").text(itemData.value);
            content.append(icon, label);
            element.append(content);
        };
    }

    shouldShowCaseSelector(term) {
        if (this.getCasesCount() <= 1)
            return false;
        const normalizedTerm = this.normalizeColumnValue(term);
        if (normalizedTerm === "")
            return false;
        const calculator = this.board.calculator;
        if (!calculator.isTerm(normalizedTerm))
            return false;
        if (normalizedTerm === calculator.properties?.independent?.name)
            return false;
        return true;
    }

    normalizeColumns() {
        let columns = Array.isArray(this.properties.columns) ? this.properties.columns : this.getLegacyColumns();
        if (!Array.isArray(columns) || columns.length === 0)
            columns = [{ term: "", case: 1 }];
        const selectedColumns = [];
        for (let index = 0; index < columns.length; index++) {
            const column = columns[index];
            const term = this.normalizeColumnValue(column?.term);
            if (term === "")
                continue;
            selectedColumns.push({
                term: term,
                case: this.getClampedCaseNumber(column?.case ?? 1)
            });
        }
        if (selectedColumns.length === 0) {
            this.properties.columns = [{ term: "", case: 1 }];
            return;
        }
        this.properties.columns = [...selectedColumns, { term: "", case: 1 }];
    }

    getLegacyColumns() {
        const columns = [];
        const column1Term = this.normalizeColumnValue(this.properties.column1Term);
        const column2Term = this.normalizeColumnValue(this.properties.column2Term);
        if (column1Term !== "")
            columns.push({ term: column1Term, case: this.getClampedCaseNumber(this.properties.column1TermCase ?? 1) });
        if (column2Term !== "")
            columns.push({ term: column2Term, case: this.getClampedCaseNumber(this.properties.column2TermCase ?? 1) });
        if (columns.length === 0)
            columns.push({ term: "", case: 1 });
        return columns;
    }

    normalizeColumnValue(value) {
        if (value == null)
            return "";
        return String(value).trim();
    }

    _canEditTerm(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        return calculator.isTerm(term) && calculator.isEditable(term);
    }

    enterEditMode() {
        if (this.dataGrid && typeof this.dataGrid.focus === "function") {
            this.dataGrid.focus();
            return true;
        }
        return super.enterEditMode();
    }
}
