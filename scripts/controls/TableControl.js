class TableControl {
    constructor(hostElement, options) {
        this.hostElement = hostElement;
        this.options = this.createDefaultOptions();
        this.rows = [];
        this.width = 0;
        this.height = 0;
        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.focusedRowKey = null;
        this.selectedCell = null;
        this.selectedCellRange = null;
        this.focusedCellRange = null;
        this.selectedFocusedRanges = [];
        this.nextFocusedRangeColorIndex = 0;
        this.editingCell = null;
        this.cellBoxes = [];
        this.verticalScrollbarThumbRect = null;
        this.horizontalScrollbarThumbRect = null;
        this.verticalScrollbarDrag = null;
        this.horizontalScrollbarDrag = null;
        this.columnResizeDrag = null;
        this.columnClipPaths = null;
        this.caseIconData = {};
        this.caseIconsLoadingPromise = null;
        this.rowsClipId = `shape-svg-table-clip-${crypto.randomUUID()}`;
        this.tableClipId = `shape-svg-table-header-clip-${crypto.randomUUID()}`;
        this.initializeRoot();
        this.bindEvents();
        this.ensureCaseIconsLoaded();
        this.setOptions(options);
    }

    createDefaultOptions() {
        return {
            columns: [],
            foregroundColor: "#1e1e1e",
            backgroundColor: "#ffffff",
            borderColor: "#7a7a7a",
            gridColor: "#d3d3d3",
            headerBackgroundColor: "#f7f7f7",
            selectionColor: "#eaf1fb",
            selectedCellColor: "#d6e7fd",
            focusedCellColor: "#e5eef9",
            focusedSelectedCellColor: "#c9def8",
            focusedRangeColors: ["#2f80ed", "#27ae60", "#f2994a", "#eb5757", "#9b51e0", "#00a3a3"],
            scrollbarTrackColor: "#efefef",
            scrollbarThumbColor: "#b8b8b8",
            termFontFamily: "Katex_Math",
            numberFontFamily: "Katex_Main",
            fontSize: 12,
            headerFontSize: 16,
            rowHeight: 24,
            headerHeight: 28,
            scrollbarWidth: 10,
            precision: 2,
            minColumnWidth: 48,
            onCellValueChanged: null,
            onColumnWidthChanged: null,
            onRowDeleteRequested: null,
            onFocusedCellsChanged: null,
            shouldKeepFocusedCellsOnPointerDown: null
        };
    }

    initializeRoot() {
        this.rootElement = this.createSvgElement("g");
        this.rootElement.setAttribute("class", "table-control-root");
        this.rootElement.setAttribute("tabindex", "0");
        this.defsElement = this.createSvgElement("defs");
        this.rowsClipPath = this.createSvgElement("clipPath");
        this.rowsClipPath.setAttribute("id", this.rowsClipId);
        this.rowsClipRect = this.createSvgElement("rect");
        this.rowsClipPath.appendChild(this.rowsClipRect);
        this.defsElement.appendChild(this.rowsClipPath);
        this.tableClipPath = this.createSvgElement("clipPath");
        this.tableClipPath.setAttribute("id", this.tableClipId);
        this.tableClipRect = this.createSvgElement("rect");
        this.tableClipPath.appendChild(this.tableClipRect);
        this.defsElement.appendChild(this.tableClipPath);
        this.backgroundLayer = this.createSvgElement("g");
        this.headerLayer = this.createSvgElement("g");
        this.headerLayer.setAttribute("clip-path", `url(#${this.tableClipId})`);
        this.rowsLayer = this.createSvgElement("g");
        this.rowsLayer.setAttribute("clip-path", `url(#${this.rowsClipId})`);
        this.overlayLayer = this.createSvgElement("g");
        this.scrollbarLayer = this.createSvgElement("g");
        this.rootElement.appendChild(this.defsElement);
        this.rootElement.appendChild(this.backgroundLayer);
        this.rootElement.appendChild(this.headerLayer);
        this.rootElement.appendChild(this.rowsLayer);
        this.rootElement.appendChild(this.overlayLayer);
        this.rootElement.appendChild(this.scrollbarLayer);
        if (this.hostElement)
            this.hostElement.appendChild(this.rootElement);
    }

    bindEvents() {
        this.onWheelHandler = event => this.onWheel(event);
        this.onWindowWheelHandler = event => this.onWindowWheel(event);
        this.onPointerDownHandler = event => this.onPointerDown(event);
        this.onPointerMoveHandler = event => this.onPointerMove(event);
        this.onPointerLeaveHandler = _ => this.onPointerLeave();
        this.onMouseDownHandler = event => this.onMouseDown(event);
        this.onMouseUpHandler = event => this.onMouseUp(event);
        this.onDoubleClickHandler = event => this.onDoubleClick(event);
        this.onKeyDownHandler = event => this.onKeyDown(event);
        this.onWindowPointerMoveHandler = event => this.onWindowPointerMove(event);
        this.onWindowPointerUpHandler = _ => this.onWindowPointerUp();
        this.onWindowPointerDownHandler = event => this.onWindowPointerDown(event);
        this.rootElement.addEventListener("wheel", this.onWheelHandler, { passive: false });
        window.addEventListener("wheel", this.onWindowWheelHandler, { passive: false });
        window.addEventListener("pointerdown", this.onWindowPointerDownHandler, true);
        this.rootElement.addEventListener("pointerdown", this.onPointerDownHandler);
        this.rootElement.addEventListener("pointermove", this.onPointerMoveHandler);
        this.rootElement.addEventListener("pointerleave", this.onPointerLeaveHandler);
        this.rootElement.addEventListener("mousedown", this.onMouseDownHandler);
        this.rootElement.addEventListener("mouseup", this.onMouseUpHandler);
        this.rootElement.addEventListener("dblclick", this.onDoubleClickHandler);
        this.rootElement.addEventListener("keydown", this.onKeyDownHandler);
    }

    dispose() {
        this.rootElement.removeEventListener("wheel", this.onWheelHandler);
        window.removeEventListener("wheel", this.onWindowWheelHandler);
        window.removeEventListener("pointerdown", this.onWindowPointerDownHandler, true);
        this.rootElement.removeEventListener("pointerdown", this.onPointerDownHandler);
        this.rootElement.removeEventListener("pointermove", this.onPointerMoveHandler);
        this.rootElement.removeEventListener("pointerleave", this.onPointerLeaveHandler);
        this.rootElement.removeEventListener("mousedown", this.onMouseDownHandler);
        this.rootElement.removeEventListener("mouseup", this.onMouseUpHandler);
        this.rootElement.removeEventListener("dblclick", this.onDoubleClickHandler);
        this.rootElement.removeEventListener("keydown", this.onKeyDownHandler);
        window.removeEventListener("pointermove", this.onWindowPointerMoveHandler);
        window.removeEventListener("pointerup", this.onWindowPointerUpHandler);
        if (!this.rootElement || !this.hostElement)
            return;
        if (this.rootElement.parentNode === this.hostElement)
            this.hostElement.removeChild(this.rootElement);
    }

    createSvgElement(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
    }

    getCaseIconAssetPath(caseNumber) {
        return `libraries/fontawesome/svgs/solid/square-${caseNumber}.svg`;
    }

    ensureCaseIconsLoaded() {
        if (this.caseIconsLoadingPromise)
            return this.caseIconsLoadingPromise;
        this.caseIconsLoadingPromise = this.loadCaseIcons();
        return this.caseIconsLoadingPromise;
    }

    async loadCaseIcons() {
        const loaders = [];
        for (let caseNumber = 1; caseNumber <= 9; caseNumber++)
            loaders.push(this.loadCaseIcon(caseNumber));
        await Promise.all(loaders);
        this.render();
    }

    async loadCaseIcon(caseNumber) {
        const iconPath = this.getCaseIconAssetPath(caseNumber);
        try {
            const response = await fetch(iconPath);
            if (!response.ok)
                return;
            const svgText = await response.text();
            const parser = new DOMParser();
            const document = parser.parseFromString(svgText, "image/svg+xml");
            const svgElement = document.querySelector("svg");
            const pathElement = document.querySelector("path");
            const pathData = pathElement?.getAttribute("d");
            if (!pathData)
                return;
            const viewBox = this.parseViewBox(svgElement?.getAttribute("viewBox"));
            this.caseIconData[caseNumber] = {
                width: viewBox.width,
                height: viewBox.height,
                pathData: pathData
            };
        } catch (_) {
        }
    }

    parseViewBox(viewBoxText) {
        const rawValue = String(viewBoxText ?? "").trim();
        if (rawValue === "")
            return { width: 448, height: 512 };
        const values = rawValue.split(/\s+/).map(value => Number(value));
        if (values.length !== 4)
            return { width: 448, height: 512 };
        const width = Number(values[2]);
        const height = Number(values[3]);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
            return { width: 448, height: 512 };
        return { width: width, height: height };
    }

    estimateTextWidth(textValue, fontSize) {
        const value = String(textValue ?? "");
        return value.length * fontSize * 0.58;
    }

    getHeaderCaseIconSize(caseNumber) {
        const iconData = this.caseIconData[caseNumber];
        const baseHeight = Math.max(8, Number(this.options.headerFontSize) - 3);
        const iconWidth = iconData?.width ?? 448;
        const iconHeight = iconData?.height ?? 512;
        const ratio = iconWidth / iconHeight;
        return {
            width: baseHeight * ratio,
            height: baseHeight
        };
    }

    renderHeaderCaseIcon(caseNumber, xPosition, yPosition, columnIndex) {
        const size = this.getHeaderCaseIconSize(caseNumber);
        const iconData = this.caseIconData[caseNumber];
        const caseIconColor = TermControl.getCaseIconColor(caseNumber);
        const clipPathRef = `url(#${this.rowsClipId}-col-${columnIndex})`;
        if (!iconData?.pathData) {
            const fallbackText = this.createSvgElement("text");
            fallbackText.setAttribute("x", `${xPosition}`);
            fallbackText.setAttribute("y", `${yPosition}`);
            fallbackText.setAttribute("fill", caseIconColor);
            fallbackText.setAttribute("font-family", this.options.numberFontFamily);
            fallbackText.setAttribute("font-size", `${Math.max(8, Number(this.options.headerFontSize) - 3)}`);
            fallbackText.setAttribute("clip-path", clipPathRef);
            fallbackText.textContent = `${caseNumber}`;
            this.headerLayer.appendChild(fallbackText);
            return;
        }
        const scaleX = size.width / iconData.width;
        const scaleY = size.height / iconData.height;
        const topY = yPosition - size.height * 0.82;
        const iconGroup = this.createSvgElement("g");
        iconGroup.setAttribute("transform", `translate(${xPosition} ${topY}) scale(${scaleX} ${scaleY})`);
        iconGroup.setAttribute("clip-path", clipPathRef);
        const iconPath = this.createSvgElement("path");
        iconPath.setAttribute("d", iconData.pathData);
        iconPath.setAttribute("fill", caseIconColor);
        iconGroup.appendChild(iconPath);
        this.headerLayer.appendChild(iconGroup);
    }

    clearLayer(layerElement) {
        if (!layerElement)
            return;
        while (layerElement.firstChild)
            layerElement.removeChild(layerElement.firstChild);
    }

    element() {
        return this.rootElement;
    }

    focus() {
        if (!this.rootElement || typeof this.rootElement.focus !== "function")
            return;
        this.rootElement.focus();
    }

    normalizeColumns(columns) {
        if (!Array.isArray(columns))
            return [];
        return columns.map((column, index) => ({
            key: column?.key ?? `column${index}`,
            title: column?.title ?? column?.term ?? "",
            term: column?.term ?? column?.title ?? "",
            caseNumber: parseInt(column?.caseNumber ?? column?.case ?? 1, 10) || 1,
            showCase: column?.showCase === true,
            editable: column?.editable === true,
            width: Number.isFinite(column?.width) ? Math.max(1, Number(column.width)) : null,
            precision: Number.isFinite(column?.precision) ? column.precision : null,
            barColor: this.normalizeBarColor(column?.barColor),
            isPreloadedTerm: column?.isPreloadedTerm === true,
            sourceColumn: column?.sourceColumn ?? null
        }));
    }

    normalizeBarColor(value) {
        const normalizedValue = String(value ?? "").trim();
        if (normalizedValue === "")
            return "transparent";
        return normalizedValue;
    }

    isTransparentColor(colorValue) {
        const normalizedValue = String(colorValue ?? "").trim().toLowerCase();
        if (normalizedValue === "" || normalizedValue === "transparent" || normalizedValue === "#00000000" || normalizedValue === "#0000")
            return true;
        return /^rgba\s*\([^)]*,\s*0(?:\.0+)?\s*\)$/.test(normalizedValue);
    }

    setOptions(options) {
        const nextOptions = options ?? {};
        const normalizedTermFontFamily = nextOptions.termFontFamily ?? nextOptions.fontFamily;
        const normalizedNumberFontFamily = nextOptions.numberFontFamily ?? nextOptions.fontFamily;
        this.options = {
            ...this.options,
            ...nextOptions,
            termFontFamily: normalizedTermFontFamily ?? this.options.termFontFamily,
            numberFontFamily: normalizedNumberFontFamily ?? this.options.numberFontFamily,
            columns: this.normalizeColumns(nextOptions.columns ?? this.options.columns)
        };
        this.ensureScrollBounds();
        this.render();
    }

    setRows(rows) {
        if (!Array.isArray(rows))
            this.rows = [];
        else
            this.rows = rows.map(row => ({ ...row }));
        this.ensureScrollBounds();
        if (this.selectedCell && this.selectedCell.rowIndex >= this.rows.length)
            this.selectedCell = null;
        if (this.focusedCellRange)
            this.focusedCellRange = this.getNormalizedCellRange(this.focusedCellRange.startRowIndex, this.focusedCellRange.startColumnIndex, this.focusedCellRange.endRowIndex, this.focusedCellRange.endColumnIndex);
        this.selectedFocusedRanges = this.selectedFocusedRanges.filter(entry => this.isCellRangeWithinBounds(entry?.range));
        if (this.focusedCellRange && !this.isCellRangeWithinBounds(this.focusedCellRange)) {
            this.focusedCellRange = null;
            this.emitFocusedCellsChanged();
        }
        if (this.selectedCellRange)
            this.selectedCellRange = this.getNormalizedCellRange(this.selectedCellRange.startRowIndex, this.selectedCellRange.startColumnIndex, this.selectedCellRange.endRowIndex, this.selectedCellRange.endColumnIndex);
        if (this.selectedCellRange && !this.isCellRangeWithinBounds(this.selectedCellRange))
            this.selectedCellRange = null;
        if (this.editingCell && this.editingCell.rowIndex >= this.rows.length)
            this.editingCell = null;
        this.ensureFocusedRowVisible();
        this.render();
    }

    setSize(width, height) {
        const normalizedWidth = Math.max(0, Number(width) || 0);
        const normalizedHeight = Math.max(0, Number(height) || 0);
        if (this.width === normalizedWidth && this.height === normalizedHeight)
            return;
        this.width = normalizedWidth;
        this.height = normalizedHeight;
        this.ensureScrollBounds();
        this.render();
    }

    setFocusedRowKey(rowKey) {
        this.focusedRowKey = rowKey;
        this.ensureFocusedRowVisible();
        this.render();
    }

    getLayout() {
        const width = this.width;
        const height = this.height;
        const headerHeight = Math.max(20, Number(this.options.headerHeight) || 28);
        const scrollbarSize = Math.max(8, Number(this.options.scrollbarWidth) || 10);
        const totalRowsHeight = this.getTotalRowsHeight();
        const totalColumnsWidth = this.getTotalColumnsWidth(this.options.columns);
        let hasVerticalScrollbar = false;
        let hasHorizontalScrollbar = false;
        let bodyWidth = Math.max(0, width);
        let bodyHeight = Math.max(0, height - headerHeight);
        for (let iteration = 0; iteration < 3; iteration++) {
            hasVerticalScrollbar = totalRowsHeight > bodyHeight;
            bodyWidth = Math.max(0, width - (hasVerticalScrollbar ? scrollbarSize : 0));
            hasHorizontalScrollbar = totalColumnsWidth > bodyWidth;
            bodyHeight = Math.max(0, height - headerHeight - (hasHorizontalScrollbar ? scrollbarSize : 0));
        }
        return {
            width: width,
            height: height,
            headerHeight: headerHeight,
            bodyHeight: bodyHeight,
            bodyWidth: bodyWidth,
            scrollbarSize: scrollbarSize,
            hasVerticalScrollbar: hasVerticalScrollbar,
            hasHorizontalScrollbar: hasHorizontalScrollbar,
            verticalScrollbarX: bodyWidth,
            horizontalScrollbarY: headerHeight + bodyHeight,
            totalColumnsWidth: totalColumnsWidth
        };
    }

    updateClipRect(layout) {
        this.rowsClipRect.setAttribute("x", "0");
        this.rowsClipRect.setAttribute("y", `${layout.headerHeight}`);
        this.rowsClipRect.setAttribute("width", `${layout.bodyWidth}`);
        this.rowsClipRect.setAttribute("height", `${layout.bodyHeight}`);
        this.tableClipRect.setAttribute("x", "0");
        this.tableClipRect.setAttribute("y", "0");
        this.tableClipRect.setAttribute("width", `${layout.bodyWidth}`);
        this.tableClipRect.setAttribute("height", `${layout.height}`);
    }

    updateColumnClipPaths(geometry) {
        if (this.columnClipPaths) {
            for (const clipPath of this.columnClipPaths)
                this.defsElement.removeChild(clipPath);
        }
        this.columnClipPaths = [];
        const margin = 4;
        for (let index = 0; index < geometry.length; index++) {
            const columnGeometry = geometry[index];
            const clipPath = this.createSvgElement("clipPath");
            clipPath.setAttribute("id", `${this.rowsClipId}-col-${index}`);
            const clipRect = this.createSvgElement("rect");
            clipRect.setAttribute("x", `${columnGeometry.x + margin}`);
            clipRect.setAttribute("y", "0");
            clipRect.setAttribute("width", `${Math.max(0, columnGeometry.width - 2 * margin)}`);
            clipRect.setAttribute("height", `${this.height}`);
            clipPath.appendChild(clipRect);
            this.defsElement.appendChild(clipPath);
            this.columnClipPaths.push(clipPath);
        }
    }

    getTotalRowsHeight() {
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        return this.rows.length * rowHeight;
    }

    getMaxScrollTop() {
        const layout = this.getLayout();
        return Math.max(0, this.getTotalRowsHeight() - layout.bodyHeight);
    }

    getMaxScrollLeft(layout = this.getLayout()) {
        return Math.max(0, this.getTotalColumnsWidth(this.options.columns) - layout.bodyWidth);
    }

    setScrollTop(value) {
        const maxScrollTop = this.getMaxScrollTop();
        const normalizedScrollTop = Math.max(0, Math.min(maxScrollTop, Number(value) || 0));
        if (normalizedScrollTop === this.scrollTop)
            return;
        this.scrollTop = normalizedScrollTop;
        this.render();
    }

    setScrollLeft(value) {
        const maxScrollLeft = this.getMaxScrollLeft();
        const normalizedScrollLeft = Math.max(0, Math.min(maxScrollLeft, Number(value) || 0));
        if (normalizedScrollLeft === this.scrollLeft)
            return;
        this.scrollLeft = normalizedScrollLeft;
        this.render();
    }

    ensureScrollBounds() {
        const maxScrollTop = this.getMaxScrollTop();
        if (this.scrollTop > maxScrollTop)
            this.scrollTop = maxScrollTop;
        if (this.scrollTop < 0)
            this.scrollTop = 0;
        const maxScrollLeft = this.getMaxScrollLeft();
        if (this.scrollLeft > maxScrollLeft)
            this.scrollLeft = maxScrollLeft;
        if (this.scrollLeft < 0)
            this.scrollLeft = 0;
    }

    getColumnGeometry(layout, columns) {
        if (!columns.length)
            return [];
        const geometry = [];
        let absoluteX = 0;
        for (let index = 0; index < columns.length; index++) {
            const columnWidth = this.getColumnWidth(columns[index]);
            geometry.push({
                x: absoluteX - this.scrollLeft,
                absoluteX: absoluteX,
                width: columnWidth,
                right: absoluteX + columnWidth,
                absoluteRight: absoluteX + columnWidth
            });
            absoluteX += columnWidth;
        }
        return geometry;
    }

    getTotalColumnsWidth(columns) {
        if (!Array.isArray(columns) || columns.length === 0)
            return 0;
        let totalWidth = 0;
        for (let index = 0; index < columns.length; index++)
            totalWidth += this.getColumnWidth(columns[index]);
        return totalWidth;
    }

    getColumnWidth(column) {
        const configuredWidth = Number(column?.width);
        if (Number.isFinite(configuredWidth) && configuredWidth > 0)
            return Math.max(this.getMinColumnWidth(), Math.round(configuredWidth));
        return this.getAutoColumnWidth(column);
    }

    getAutoColumnWidth(column) {
        const title = String(column?.title ?? "");
        const titleWidth = this.estimateTextWidth(title, Number(this.options.headerFontSize) || 16);
        let caseIconWidth = 0;
        if (column?.showCase === true)
            caseIconWidth = this.getHeaderCaseIconSize(column.caseNumber).width + 8;
        const paddingWidth = 18;
        return Math.max(this.getMinColumnWidth(), Math.ceil(titleWidth + caseIconWidth + paddingWidth));
    }

    getMinColumnWidth() {
        const configuredMinimum = Number(this.options.minColumnWidth);
        if (Number.isFinite(configuredMinimum) && configuredMinimum > 0)
            return Math.round(configuredMinimum);
        return 48;
    }

    getVisibleRange(layout) {
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        if (rowHeight <= 0 || this.rows.length === 0)
            return { first: 0, last: -1, offset: 0 };
        const first = Math.floor(this.scrollTop / rowHeight);
        const offset = this.scrollTop - first * rowHeight;
        const count = Math.ceil(layout.bodyHeight / rowHeight) + 1;
        const last = Math.min(this.rows.length - 1, first + count - 1);
        return { first: first, last: last, offset: offset };
    }

    render() {
        this.clearLayer(this.backgroundLayer);
        this.clearLayer(this.headerLayer);
        this.clearLayer(this.rowsLayer);
        this.clearLayer(this.overlayLayer);
        this.clearLayer(this.scrollbarLayer);
        this.cellBoxes = [];
        this.verticalScrollbarThumbRect = null;
        this.horizontalScrollbarThumbRect = null;
        if (this.width <= 2 || this.height <= 2)
            return;
        const layout = this.getLayout();
        const columns = this.options.columns ?? [];
        const geometry = this.getColumnGeometry(layout, columns);
        const columnValueRanges = this.getColumnValueRanges(columns);
        this.updateClipRect(layout);
        this.updateColumnClipPaths(geometry);
        this.renderBackground(layout);
        this.renderHeader(layout, columns, geometry);
        this.renderBody(layout, columns, geometry, columnValueRanges);
        this.renderSelectedFocusedRanges(layout, geometry);
        this.renderScrollbars(layout);
        this.renderEditingValue(layout, geometry);
    }

    getColumnValueRanges(columns) {
        if (!Array.isArray(columns) || columns.length === 0)
            return [];
        const ranges = [];
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const column = columns[columnIndex];
            let minValue = null;
            let maxValue = null;
            for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
                const row = this.rows[rowIndex];
                const numericValue = Number(row?.[column.key]);
                if (!Number.isFinite(numericValue))
                    continue;
                if (minValue == null || numericValue < minValue)
                    minValue = numericValue;
                if (maxValue == null || numericValue > maxValue)
                    maxValue = numericValue;
            }
            ranges.push({ min: minValue, max: maxValue });
        }
        return ranges;
    }

    renderBackground(layout) {
        const rect = this.createSvgElement("rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", `${layout.width}`);
        rect.setAttribute("height", `${layout.height}`);
        rect.setAttribute("fill", this.options.backgroundColor);
        rect.setAttribute("stroke", this.options.borderColor);
        rect.setAttribute("stroke-width", "1");
        this.backgroundLayer.appendChild(rect);
    }

    renderHeader(layout, columns, geometry) {
        const headerRect = this.createSvgElement("rect");
        headerRect.setAttribute("x", "0");
        headerRect.setAttribute("y", "0");
        headerRect.setAttribute("width", `${layout.bodyWidth}`);
        headerRect.setAttribute("height", `${layout.headerHeight}`);
        headerRect.setAttribute("fill", this.options.headerBackgroundColor);
        this.headerLayer.appendChild(headerRect);
        const borderLine = this.createSvgElement("line");
        borderLine.setAttribute("x1", "0");
        borderLine.setAttribute("y1", `${layout.headerHeight}`);
        borderLine.setAttribute("x2", `${layout.bodyWidth}`);
        borderLine.setAttribute("y2", `${layout.headerHeight}`);
        borderLine.setAttribute("stroke", this.options.gridColor);
        borderLine.setAttribute("stroke-width", "1");
        this.headerLayer.appendChild(borderLine);
        for (let index = 0; index < columns.length; index++)
            this.renderHeaderCell(layout, columns[index], geometry[index], index, index === columns.length - 1);
        this.renderResizeHandles(layout, geometry);
    }

    renderHeaderCell(layout, column, cellGeometry, columnIndex, isLastColumn) {
        const centerX = cellGeometry.x + cellGeometry.width / 2;
        const centerY = layout.headerHeight / 2 + 4;
        const titleText = column.title ?? "";
        const text = this.createSvgElement("text");
        text.setAttribute("x", `${centerX}`);
        text.setAttribute("y", `${centerY}`);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-family", this.options.termFontFamily);
        text.setAttribute("font-size", `${this.options.headerFontSize}`);
        text.setAttribute("fill", this.options.foregroundColor);
        text.setAttribute("clip-path", `url(#${this.rowsClipId}-col-${columnIndex})`);
        text.textContent = Utils.convertGreekLetters(titleText);
        this.headerLayer.appendChild(text);
        if (column.showCase === true) {
            let titleWidth = 0;
            if (typeof text.getComputedTextLength === "function")
                titleWidth = text.getComputedTextLength();
            if (!(titleWidth > 0))
                titleWidth = this.estimateTextWidth(titleText, Number(this.options.headerFontSize) || 16);
            const iconX = centerX + titleWidth / 2 + 2;
            const iconY = centerY - 1;
            this.renderHeaderCaseIcon(column.caseNumber, iconX, iconY, columnIndex);
        }
        if (isLastColumn)
            return;
        const columnLine = this.createSvgElement("line");
        columnLine.setAttribute("x1", `${cellGeometry.x + cellGeometry.width}`);
        columnLine.setAttribute("y1", "0");
        columnLine.setAttribute("x2", `${cellGeometry.x + cellGeometry.width}`);
        columnLine.setAttribute("y2", `${this.height}`);
        columnLine.setAttribute("stroke", this.options.gridColor);
        columnLine.setAttribute("stroke-width", "1");
        this.headerLayer.appendChild(columnLine);
    }

    renderBody(layout, columns, geometry, columnValueRanges) {
        if (!columns.length)
            return;
        if (!this.rows.length)
            return;
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        const visible = this.getVisibleRange(layout);
        for (let rowIndex = visible.first; rowIndex <= visible.last; rowIndex++) {
            const y = layout.headerHeight + (rowIndex - visible.first) * rowHeight - visible.offset;
            this.renderRow(layout, rowIndex, y, rowHeight, columns, geometry, columnValueRanges);
        }
    }

    renderRow(layout, rowIndex, y, rowHeight, columns, geometry, columnValueRanges) {
        const row = this.rows[rowIndex];
        if (!row)
            return;
        const rowRect = this.createSvgElement("rect");
        rowRect.setAttribute("x", "0");
        rowRect.setAttribute("y", `${y}`);
        rowRect.setAttribute("width", `${layout.bodyWidth}`);
        rowRect.setAttribute("height", `${rowHeight}`);
        if (this.isRowInFocus(rowIndex))
            rowRect.setAttribute("fill", this.options.focusedCellColor);
        else if (this.isRowInSelection(rowIndex))
            rowRect.setAttribute("fill", this.options.selectionColor);
        else if (this.focusedRowKey != null && row.key === this.focusedRowKey)
            rowRect.setAttribute("fill", this.options.selectionColor);
        else
            rowRect.setAttribute("fill", this.options.backgroundColor);
        this.rowsLayer.appendChild(rowRect);
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const cell = geometry[columnIndex];
            const selected = this.isCellSelected(rowIndex, columnIndex);
            const focused = this.isCellFocused(rowIndex, columnIndex);
            const isEditingCell = this.editingCell && this.editingCell.rowIndex === rowIndex && this.editingCell.columnIndex === columnIndex;
            if (focused || selected) {
                const selectedRect = this.createSvgElement("rect");
                selectedRect.setAttribute("x", `${cell.x}`);
                selectedRect.setAttribute("y", `${y}`);
                selectedRect.setAttribute("width", `${cell.width}`);
                selectedRect.setAttribute("height", `${rowHeight}`);
                if (focused)
                    selectedRect.setAttribute("fill", this.options.focusedCellColor);
                else
                    selectedRect.setAttribute("fill", this.options.selectedCellColor);
                selectedRect.setAttribute("fill-opacity", "0.8");
                selectedRect.setAttribute("stroke", this.options.borderColor);
                selectedRect.setAttribute("stroke-width", "1");
                this.rowsLayer.appendChild(selectedRect);
            }
            if (!isEditingCell)
                this.renderCellBar(cell, y, rowHeight, row, columns[columnIndex], columnValueRanges?.[columnIndex]);
            if (columnIndex < columns.length - 1) {
                const line = this.createSvgElement("line");
                line.setAttribute("x1", `${cell.x + cell.width}`);
                line.setAttribute("y1", `${y}`);
                line.setAttribute("x2", `${cell.x + cell.width}`);
                line.setAttribute("y2", `${y + rowHeight}`);
                line.setAttribute("stroke", this.options.gridColor);
                line.setAttribute("stroke-width", "1");
                this.rowsLayer.appendChild(line);
            }
            if (!isEditingCell) {
                const textValue = this.getCellText(row, columns[columnIndex]);
                this.renderCellText(cell, y, rowHeight, textValue, columnIndex);
            }
            this.cellBoxes.push({
                x: cell.x,
                y: y,
                width: cell.width,
                height: rowHeight,
                rowIndex: rowIndex,
                columnIndex: columnIndex
            });
        }
        const rowLine = this.createSvgElement("line");
        rowLine.setAttribute("x1", "0");
        rowLine.setAttribute("y1", `${y + rowHeight}`);
        rowLine.setAttribute("x2", `${layout.bodyWidth}`);
        rowLine.setAttribute("y2", `${y + rowHeight}`);
        rowLine.setAttribute("stroke", this.options.gridColor);
        rowLine.setAttribute("stroke-width", "1");
        this.rowsLayer.appendChild(rowLine);
    }

    renderSelectedFocusedRanges(layout, geometry) {
        if (!Array.isArray(this.selectedFocusedRanges) || this.selectedFocusedRanges.length === 0)
            return;
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        const visible = this.getVisibleRange(layout);
        for (let index = 0; index < this.selectedFocusedRanges.length; index++) {
            const selectedRangeEntry = this.selectedFocusedRanges[index];
            const selectedRange = selectedRangeEntry?.range;
            const selectedRangeColor = selectedRangeEntry?.color;
            if (!selectedRange || typeof selectedRangeColor !== "string")
                continue;
            const visibleStartRowIndex = Math.max(selectedRange.startRowIndex, visible.first);
            const visibleEndRowIndex = Math.min(selectedRange.endRowIndex, visible.last);
            if (visibleStartRowIndex > visibleEndRowIndex)
                continue;
            const startColumnGeometry = geometry[selectedRange.startColumnIndex];
            const endColumnGeometry = geometry[selectedRange.endColumnIndex];
            if (!startColumnGeometry || !endColumnGeometry)
                continue;
            const rangeX = startColumnGeometry.x;
            const rangeWidth = (endColumnGeometry.x + endColumnGeometry.width) - rangeX;
            const rangeY = layout.headerHeight + (visibleStartRowIndex - visible.first) * rowHeight - visible.offset;
            const rangeHeight = (visibleEndRowIndex - visibleStartRowIndex + 1) * rowHeight;
            const rangeFill = this.createSvgElement("rect");
            rangeFill.setAttribute("x", `${rangeX}`);
            rangeFill.setAttribute("y", `${rangeY}`);
            rangeFill.setAttribute("width", `${rangeWidth}`);
            rangeFill.setAttribute("height", `${rangeHeight}`);
            rangeFill.setAttribute("fill", selectedRangeColor);
            rangeFill.setAttribute("fill-opacity", "0.12");
            rangeFill.setAttribute("pointer-events", "none");
            this.overlayLayer.appendChild(rangeFill);
            const rangeBorder = this.createSvgElement("rect");
            rangeBorder.setAttribute("x", `${rangeX}`);
            rangeBorder.setAttribute("y", `${rangeY}`);
            rangeBorder.setAttribute("width", `${rangeWidth}`);
            rangeBorder.setAttribute("height", `${rangeHeight}`);
            rangeBorder.setAttribute("fill", "none");
            rangeBorder.setAttribute("stroke", selectedRangeColor);
            rangeBorder.setAttribute("stroke-width", "1.5");
            rangeBorder.setAttribute("pointer-events", "none");
            this.overlayLayer.appendChild(rangeBorder);
        }
    }

    renderCellBar(cellGeometry, y, rowHeight, row, column, range) {
        if (!row || !column)
            return;
        const barColor = this.normalizeBarColor(column.barColor);
        if (this.isTransparentColor(barColor))
            return;
        const value = Number(row[column.key]);
        if (!Number.isFinite(value))
            return;
        const min = Number(range?.min);
        const max = Number(range?.max);
        if (!Number.isFinite(min) || !Number.isFinite(max))
            return;
        const maxWidth = Math.max(0, cellGeometry.width - 6);
        if (maxWidth <= 0)
            return;
        let ratio = 1;
        if (max > min)
            ratio = (value - min) / (max - min);
        if (!Number.isFinite(ratio))
            return;
        const clampedRatio = Math.max(0, Math.min(1, ratio));
        let barWidth = maxWidth * clampedRatio;
        if (barWidth <= 0)
            return;
        if (barWidth < 1)
            barWidth = 1;
        const barHeight = Math.max(1, rowHeight - 6);
        const bar = this.createSvgElement("rect");
        bar.setAttribute("x", `${cellGeometry.x + 3}`);
        bar.setAttribute("y", `${y + 3}`);
        bar.setAttribute("width", `${barWidth}`);
        bar.setAttribute("height", `${barHeight}`);
        bar.setAttribute("rx", "2");
        bar.setAttribute("ry", "2");
        bar.setAttribute("fill", barColor);
        bar.setAttribute("fill-opacity", "0.35");
        this.rowsLayer.appendChild(bar);
    }

    renderCellText(cellGeometry, y, rowHeight, textValue, columnIndex) {
        const text = this.createSvgElement("text");
        text.setAttribute("x", `${cellGeometry.x + cellGeometry.width - 6}`);
        text.setAttribute("y", `${y + rowHeight / 2 + 4}`);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-family", this.options.numberFontFamily);
        text.setAttribute("font-size", `${this.options.fontSize}`);
        text.setAttribute("fill", this.options.foregroundColor);
        text.setAttribute("clip-path", `url(#${this.rowsClipId}-col-${columnIndex})`);
        text.textContent = textValue;
        this.rowsLayer.appendChild(text);
    }

    getCellText(row, column) {
        if (!row || !column)
            return "";
        const rawValue = row[column.key];
        if (rawValue == null || rawValue === "")
            return "";
        const numericValue = Number(rawValue);
        if (numericValue === Infinity)
            return "∞";
        if (numericValue === -Infinity)
            return "-∞";
        if (!Number.isFinite(numericValue))
            return String(rawValue);
        const precision = Number.isFinite(column.precision) ? column.precision : this.options.precision;
        return this.formatNumber(numericValue, precision);
    }

    formatNumber(value, precision) {
        const normalizedPrecision = Number.isFinite(precision) ? Math.max(0, Math.floor(precision)) : 0;
        const roundedValue = Utils.roundToPrecision(value, normalizedPrecision);
        const normalizedValue = Object.is(roundedValue, -0) ? 0 : roundedValue;
        if (normalizedPrecision > 0)
            return normalizedValue.toFixed(normalizedPrecision);
        return normalizedValue.toString();
    }

    renderResizeHandles(layout, geometry) {
        if (!Array.isArray(geometry) || geometry.length === 0)
            return;
        for (let index = 0; index < geometry.length; index++) {
            const columnGeometry = geometry[index];
            const handleX = columnGeometry.x + columnGeometry.width;
            if (handleX < 0 || handleX > layout.bodyWidth)
                continue;
            const handle = this.createSvgElement("rect");
            handle.setAttribute("x", `${handleX - 2}`);
            handle.setAttribute("y", "0");
            handle.setAttribute("width", "4");
            handle.setAttribute("height", `${layout.headerHeight}`);
            handle.setAttribute("fill", "transparent");
            handle.setAttribute("pointer-events", "all");
            this.headerLayer.appendChild(handle);
        }
    }

    renderScrollbars(layout) {
        this.renderVerticalScrollbar(layout);
        this.renderHorizontalScrollbar(layout);
    }

    renderVerticalScrollbar(layout) {
        if (!layout.hasVerticalScrollbar)
            return;
        const track = this.createSvgElement("rect");
        track.setAttribute("x", `${layout.verticalScrollbarX}`);
        track.setAttribute("y", `${layout.headerHeight}`);
        track.setAttribute("width", `${layout.scrollbarSize}`);
        track.setAttribute("height", `${layout.bodyHeight}`);
        track.setAttribute("fill", this.options.scrollbarTrackColor);
        this.scrollbarLayer.appendChild(track);
        const thumbRect = this.getVerticalThumbRect(layout);
        this.verticalScrollbarThumbRect = thumbRect;
        if (!thumbRect)
            return;
        const thumb = this.createSvgElement("rect");
        thumb.setAttribute("x", `${thumbRect.x}`);
        thumb.setAttribute("y", `${thumbRect.y}`);
        thumb.setAttribute("width", `${thumbRect.width}`);
        thumb.setAttribute("height", `${thumbRect.height}`);
        thumb.setAttribute("fill", this.options.scrollbarThumbColor);
        thumb.setAttribute("rx", "4");
        thumb.setAttribute("ry", "4");
        this.scrollbarLayer.appendChild(thumb);
    }

    renderHorizontalScrollbar(layout) {
        if (!layout.hasHorizontalScrollbar)
            return;
        const track = this.createSvgElement("rect");
        track.setAttribute("x", "0");
        track.setAttribute("y", `${layout.horizontalScrollbarY}`);
        track.setAttribute("width", `${layout.bodyWidth}`);
        track.setAttribute("height", `${layout.scrollbarSize}`);
        track.setAttribute("fill", this.options.scrollbarTrackColor);
        this.scrollbarLayer.appendChild(track);
        const thumbRect = this.getHorizontalThumbRect(layout);
        this.horizontalScrollbarThumbRect = thumbRect;
        if (thumbRect) {
            const thumb = this.createSvgElement("rect");
            thumb.setAttribute("x", `${thumbRect.x}`);
            thumb.setAttribute("y", `${thumbRect.y}`);
            thumb.setAttribute("width", `${thumbRect.width}`);
            thumb.setAttribute("height", `${thumbRect.height}`);
            thumb.setAttribute("fill", this.options.scrollbarThumbColor);
            thumb.setAttribute("rx", "4");
            thumb.setAttribute("ry", "4");
            this.scrollbarLayer.appendChild(thumb);
        }
        if (!layout.hasVerticalScrollbar)
            return;
        const corner = this.createSvgElement("rect");
        corner.setAttribute("x", `${layout.verticalScrollbarX}`);
        corner.setAttribute("y", `${layout.horizontalScrollbarY}`);
        corner.setAttribute("width", `${layout.scrollbarSize}`);
        corner.setAttribute("height", `${layout.scrollbarSize}`);
        corner.setAttribute("fill", this.options.scrollbarTrackColor);
        this.scrollbarLayer.appendChild(corner);
    }

    getVerticalThumbRect(layout) {
        const maxScrollTop = this.getMaxScrollTop();
        if (maxScrollTop <= 0)
            return null;
        const totalRowsHeight = this.getTotalRowsHeight();
        if (totalRowsHeight <= 0 || layout.bodyHeight <= 0)
            return null;
        const thumbHeight = Math.max(20, Math.round(layout.bodyHeight * layout.bodyHeight / totalRowsHeight));
        const travel = Math.max(0, layout.bodyHeight - thumbHeight);
        const ratio = maxScrollTop <= 0 ? 0 : this.scrollTop / maxScrollTop;
        const y = layout.headerHeight + travel * ratio;
        return {
            x: layout.verticalScrollbarX + 1,
            y: y,
            width: Math.max(2, layout.scrollbarSize - 2),
            height: thumbHeight
        };
    }

    getHorizontalThumbRect(layout) {
        const maxScrollLeft = this.getMaxScrollLeft(layout);
        if (maxScrollLeft <= 0)
            return null;
        if (layout.totalColumnsWidth <= 0 || layout.bodyWidth <= 0)
            return null;
        const thumbWidth = Math.max(20, Math.round(layout.bodyWidth * layout.bodyWidth / layout.totalColumnsWidth));
        const travel = Math.max(0, layout.bodyWidth - thumbWidth);
        const ratio = maxScrollLeft <= 0 ? 0 : this.scrollLeft / maxScrollLeft;
        const x = travel * ratio;
        return {
            x: x,
            y: layout.horizontalScrollbarY + 1,
            width: thumbWidth,
            height: Math.max(2, layout.scrollbarSize - 2)
        };
    }

    renderEditingValue(layout, geometry) {
        if (!this.editingCell)
            return;
        const row = this.rows[this.editingCell.rowIndex];
        const column = this.options.columns[this.editingCell.columnIndex];
        if (!row || !column)
            return;
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        const visible = this.getVisibleRange(layout);
        const rowIndex = this.editingCell.rowIndex;
        if (rowIndex < visible.first || rowIndex > visible.last)
            return;
        const y = layout.headerHeight + (rowIndex - visible.first) * rowHeight - visible.offset;
        const cell = geometry[this.editingCell.columnIndex];
        if (!cell)
            return;
        const text = this.createSvgElement("text");
        text.setAttribute("x", `${cell.x + cell.width - 6}`);
        text.setAttribute("y", `${y + rowHeight / 2 + 4}`);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-family", this.options.numberFontFamily);
        text.setAttribute("font-size", `${this.options.fontSize}`);
        text.setAttribute("fill", this.options.foregroundColor);
        text.textContent = this.editingCell.text;
        this.overlayLayer.appendChild(text);
        const cursor = this.createSvgElement("line");
        const cursorX = cell.x + cell.width - 5;
        cursor.setAttribute("x1", `${cursorX}`);
        cursor.setAttribute("y1", `${y + 5}`);
        cursor.setAttribute("x2", `${cursorX}`);
        cursor.setAttribute("y2", `${y + rowHeight - 5}`);
        cursor.setAttribute("stroke", this.options.foregroundColor);
        cursor.setAttribute("stroke-width", "1");
        this.overlayLayer.appendChild(cursor);
    }

    convertClientPoint(event) {
        if (!this.rootElement || !this.rootElement.getScreenCTM)
            return null;
        const ctm = this.rootElement.getScreenCTM();
        if (!ctm)
            return null;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
        return { x: point.x, y: point.y };
    }

    onWheel(event) {
        const maxScrollTop = this.getMaxScrollTop();
        const maxScrollLeft = this.getMaxScrollLeft();
        if (maxScrollTop <= 0 && maxScrollLeft <= 0)
            return;
        event.preventDefault();
        if (maxScrollLeft > 0 && (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY))) {
            const horizontalDelta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY;
            this.setScrollLeft(this.scrollLeft + this.normalizeWheelDeltaValue(horizontalDelta, event.deltaMode));
            return;
        }
        if (maxScrollTop > 0)
            this.setScrollTop(this.scrollTop + this.normalizeWheelDelta(event));
    }

    onWindowWheel(event) {
        if (event.defaultPrevented)
            return;
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        if (!this.isPointInTable(point))
            return;
        this.onWheel(event);
    }

    onWindowPointerDown(event) {
        const target = event.target;
        if (target instanceof Node && this.rootElement.contains(target))
            return;
        const shouldKeepFocusedCellsOnPointerDown = this.options.shouldKeepFocusedCellsOnPointerDown;
        if (typeof shouldKeepFocusedCellsOnPointerDown === "function") {
            const shouldKeepFocusedCells = shouldKeepFocusedCellsOnPointerDown({ event: event, target: target }) === true;
            if (shouldKeepFocusedCells)
                return;
        }
        if (this.hasFocusedCells()) {
            this.clearFocusedCells();
            this.render();
        }
    }

    isPointInTable(point) {
        if (!point)
            return false;
        if (point.x < 0 || point.x > this.width)
            return false;
        if (point.y < 0 || point.y > this.height)
            return false;
        return true;
    }

    normalizeWheelDelta(event) {
        return this.normalizeWheelDeltaValue(event.deltaY, event.deltaMode);
    }

    normalizeWheelDeltaValue(delta, deltaMode) {
        let normalizedDelta = delta;
        if (deltaMode === 1)
            normalizedDelta *= 20;
        if (deltaMode === 2)
            normalizedDelta *= 80;
        return normalizedDelta;
    }

    onPointerDown(event) {
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        const resizeColumnIndex = this.getResizeColumnIndexAtPoint(point);
        if (resizeColumnIndex >= 0) {
            event.preventDefault();
            this.startColumnResizeDrag(point, resizeColumnIndex);
            return;
        }
        if (this.isPointInVerticalScrollbar(point) || this.isPointInHorizontalScrollbar(point)) {
            event.preventDefault();
            this.startScrollbarDrag(point);
            return;
        }
        if (event.button === 0)
            this.applyCellSelection(event, point);
    }

    onPointerMove(event) {
        if (this.columnResizeDrag) {
            this.rootElement.style.cursor = "col-resize";
            return;
        }
        const point = this.convertClientPoint(event);
        if (!point) {
            this.rootElement.style.cursor = "";
            return;
        }
        const resizeColumnIndex = this.getResizeColumnIndexAtPoint(point);
        this.rootElement.style.cursor = resizeColumnIndex >= 0 ? "col-resize" : "";
    }

    onPointerLeave() {
        if (this.columnResizeDrag)
            return;
        this.rootElement.style.cursor = "";
    }

    onMouseDown(event) {
        if (this.verticalScrollbarDrag || this.horizontalScrollbarDrag || this.columnResizeDrag)
            return;
        this.focus();
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        if (this.isPointInVerticalScrollbar(point) || this.isPointInHorizontalScrollbar(point)) {
            this.startScrollbarDrag(point);
            return;
        }
        if (this.isPointInHeader(point))
            return;
        const cell = this.getCellFromPoint(point);
        if (!cell)
            return;
        const isSameCell = this.selectedCell && this.selectedCell.rowIndex === cell.rowIndex && this.selectedCell.columnIndex === cell.columnIndex;
        if (this.editingCell && (!isSameCell || event.detail >= 2))
            this.commitEditing();
        if (event.detail >= 2 && this.canEditCell(cell.rowIndex, cell.columnIndex))
            this.startEditing(cell.rowIndex, cell.columnIndex, null);
        this.render();
    }

    onMouseUp(event) {
    }

    onDoubleClick(event) {
    }

    getClickedCell(event) {
        if (!event)
            return null;
        const point = this.convertClientPoint(event);
        if (!point)
            return null;
        return this.getCellFromPoint(point);
    }

    applyCellSelection(event, point) {
        const cell = this.getCellFromPoint(point);
        if (!cell) {
            this.selectedCell = null;
            this.selectedCellRange = null;
            this.editingCell = null;
            this.clearFocusedCells();
            this.render();
            return;
        }
        const isSameCell = this.selectedCell && this.selectedCell.rowIndex === cell.rowIndex && this.selectedCell.columnIndex === cell.columnIndex;
        if (this.editingCell && (!isSameCell || event.detail >= 2))
            this.commitEditing();
        if (event.shiftKey && this.selectedCell && this.canCreatePreloadedRangeSelection(this.selectedCell, cell)) {
            this.focusCellRange(this.selectedCell.rowIndex, this.selectedCell.columnIndex, cell.rowIndex, cell.columnIndex);
            this.selectedCellRange = null;
        } else {
            this.selectCell(cell.rowIndex, cell.columnIndex);
            this.clearFocusedCells();
        }
        this.render();
    }

    onKeyDown(event) {
        if (!this.selectedCell && !this.editingCell)
            return;
        const key = event.key;
        if (this.editingCell) {
            if (key === "Enter") {
                event.preventDefault();
                this.commitEditing();
                this.render();
                return;
            }
            if (key === "Escape") {
                event.preventDefault();
                this.cancelEditing();
                this.render();
                return;
            }
            if (key === "Backspace") {
                event.preventDefault();
                this.removeEditingCharacter();
                this.render();
                return;
            }
            if (key === "Delete") {
                event.preventDefault();
                this.clearEditingCharacter();
                this.render();
                return;
            }
            if (this.isAcceptedEditKey(key)) {
                event.preventDefault();
                this.appendEditingCharacter(key);
                this.render();
                return;
            }
            if (this.handleNavigationKey(key)) {
                event.preventDefault();
                this.commitEditing();
                this.render();
            }
            return;
        }
        if (key === "Enter" && this.canEditCell(this.selectedCell.rowIndex, this.selectedCell.columnIndex)) {
            event.preventDefault();
            this.startEditing(this.selectedCell.rowIndex, this.selectedCell.columnIndex, null);
            this.render();
            return;
        }
        if (key === "Delete" || key === "Backspace") {
            if (this.deleteSelectedRow()) {
                event.preventDefault();
                this.render();
                return;
            }
        }
        if (this.isAcceptedEditKey(key) && this.canEditCell(this.selectedCell.rowIndex, this.selectedCell.columnIndex)) {
            event.preventDefault();
            this.startEditing(this.selectedCell.rowIndex, this.selectedCell.columnIndex, key);
            this.render();
            return;
        }
        if (this.handleNavigationKey(key)) {
            event.preventDefault();
            this.render();
        }
    }

    startScrollbarDrag(point) {
        const layout = this.getLayout();
        if (this.isPointInVerticalScrollbar(point)) {
            const thumb = this.verticalScrollbarThumbRect;
            if (!thumb)
                return;
            if (this.pointInRect(point, thumb)) {
                this.verticalScrollbarDrag = {
                    startY: point.y,
                    startScrollTop: this.scrollTop
                };
                window.addEventListener("pointermove", this.onWindowPointerMoveHandler);
                window.addEventListener("pointerup", this.onWindowPointerUpHandler);
                return;
            }
            const maxScrollTop = this.getMaxScrollTop();
            if (maxScrollTop <= 0)
                return;
            const ratio = (point.y - layout.headerHeight) / Math.max(1, layout.bodyHeight);
            this.setScrollTop(ratio * maxScrollTop);
            return;
        }
        const thumb = this.horizontalScrollbarThumbRect;
        if (!thumb)
            return;
        if (this.pointInRect(point, thumb)) {
            this.horizontalScrollbarDrag = {
                startX: point.x,
                startScrollLeft: this.scrollLeft
            };
            window.addEventListener("pointermove", this.onWindowPointerMoveHandler);
            window.addEventListener("pointerup", this.onWindowPointerUpHandler);
            return;
        }
        const maxScrollLeft = this.getMaxScrollLeft(layout);
        if (maxScrollLeft <= 0)
            return;
        const ratio = point.x / Math.max(1, layout.bodyWidth);
        this.setScrollLeft(ratio * maxScrollLeft);
    }

    startColumnResizeDrag(point, columnIndex) {
        const column = this.options.columns[columnIndex];
        if (!column)
            return;
        this.columnResizeDrag = {
            startX: point.x,
            columnIndex: columnIndex,
            startWidth: this.getColumnWidth(column)
        };
        window.addEventListener("pointermove", this.onWindowPointerMoveHandler);
        window.addEventListener("pointerup", this.onWindowPointerUpHandler);
    }

    onWindowPointerMove(event) {
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        if (this.columnResizeDrag) {
            const deltaX = point.x - this.columnResizeDrag.startX;
            const nextWidth = this.columnResizeDrag.startWidth + deltaX;
            this.setColumnWidth(this.columnResizeDrag.columnIndex, nextWidth);
            return;
        }
        if (this.verticalScrollbarDrag) {
            const layout = this.getLayout();
            const thumb = this.verticalScrollbarThumbRect;
            if (!thumb)
                return;
            const travel = Math.max(1, layout.bodyHeight - thumb.height);
            const maxScrollTop = this.getMaxScrollTop();
            const deltaY = point.y - this.verticalScrollbarDrag.startY;
            this.setScrollTop(this.verticalScrollbarDrag.startScrollTop + (deltaY / travel) * maxScrollTop);
            return;
        }
        if (!this.horizontalScrollbarDrag)
            return;
        const layout = this.getLayout();
        const thumb = this.horizontalScrollbarThumbRect;
        if (!thumb)
            return;
        const travel = Math.max(1, layout.bodyWidth - thumb.width);
        const maxScrollLeft = this.getMaxScrollLeft(layout);
        const deltaX = point.x - this.horizontalScrollbarDrag.startX;
        this.setScrollLeft(this.horizontalScrollbarDrag.startScrollLeft + (deltaX / travel) * maxScrollLeft);
    }

    onWindowPointerUp() {
        if (this.columnResizeDrag)
            this.notifyColumnWidthChanged(this.columnResizeDrag.columnIndex);
        this.verticalScrollbarDrag = null;
        this.horizontalScrollbarDrag = null;
        this.columnResizeDrag = null;
        this.rootElement.style.cursor = "";
        window.removeEventListener("pointermove", this.onWindowPointerMoveHandler);
        window.removeEventListener("pointerup", this.onWindowPointerUpHandler);
    }

    pointInRect(point, rect) {
        if (!point || !rect)
            return false;
        if (point.x < rect.x || point.x > rect.x + rect.width)
            return false;
        if (point.y < rect.y || point.y > rect.y + rect.height)
            return false;
        return true;
    }

    isPointInBody(point) {
        const layout = this.getLayout();
        if (point.x < 0 || point.x > layout.bodyWidth)
            return false;
        if (point.y < layout.headerHeight || point.y > layout.headerHeight + layout.bodyHeight)
            return false;
        return true;
    }

    isPointInHeader(point) {
        const layout = this.getLayout();
        if (point.x < 0 || point.x > layout.bodyWidth)
            return false;
        if (point.y < 0 || point.y > layout.headerHeight)
            return false;
        return true;
    }

    isPointInVerticalScrollbar(point) {
        const layout = this.getLayout();
        if (!layout.hasVerticalScrollbar)
            return false;
        if (point.x < layout.verticalScrollbarX || point.x > layout.width)
            return false;
        if (point.y < layout.headerHeight || point.y > layout.headerHeight + layout.bodyHeight)
            return false;
        return true;
    }

    isPointInHorizontalScrollbar(point) {
        const layout = this.getLayout();
        if (!layout.hasHorizontalScrollbar)
            return false;
        if (point.x < 0 || point.x > layout.bodyWidth)
            return false;
        if (point.y < layout.horizontalScrollbarY || point.y > layout.horizontalScrollbarY + layout.scrollbarSize)
            return false;
        return true;
    }

    getBodyRowIndexFromY(pointY) {
        const layout = this.getLayout();
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        const localY = pointY - layout.headerHeight + this.scrollTop;
        const rowIndex = Math.floor(localY / rowHeight);
        if (rowIndex < 0 || rowIndex >= this.rows.length)
            return -1;
        return rowIndex;
    }

    getColumnIndexFromX(pointX) {
        const layout = this.getLayout();
        const geometry = this.getColumnGeometry(layout, this.options.columns);
        for (let index = 0; index < geometry.length; index++) {
            const cell = geometry[index];
            if (pointX >= cell.x && pointX <= cell.x + cell.width)
                return index;
        }
        return -1;
    }

    getResizeColumnIndexAtPoint(point) {
        if (!this.isPointInHeader(point))
            return -1;
        const layout = this.getLayout();
        const geometry = this.getColumnGeometry(layout, this.options.columns);
        for (let index = 0; index < geometry.length; index++) {
            const handleX = geometry[index].x + geometry[index].width;
            if (handleX < 0 || handleX > layout.bodyWidth)
                continue;
            if (Math.abs(point.x - handleX) <= 4)
                return index;
        }
        return -1;
    }

    getCellFromPoint(point) {
        if (!this.isPointInBody(point))
            return null;
        const rowIndex = this.getBodyRowIndexFromY(point.y);
        const columnIndex = this.getColumnIndexFromX(point.x);
        if (rowIndex < 0 || columnIndex < 0)
            return null;
        return { rowIndex: rowIndex, columnIndex: columnIndex };
    }

    selectCell(rowIndex, columnIndex) {
        this.selectedCell = { rowIndex: rowIndex, columnIndex: columnIndex };
        this.selectedCellRange = null;
        this.ensureRowVisible(rowIndex);
        this.ensureColumnVisible(columnIndex);
    }

    focusCellRange(startRowIndex, startColumnIndex, endRowIndex, endColumnIndex) {
        this.focusedCellRange = this.getNormalizedCellRange(startRowIndex, startColumnIndex, endRowIndex, endColumnIndex);
        this.selectedCell = { rowIndex: endRowIndex, columnIndex: endColumnIndex };
        this.ensureRowVisible(endRowIndex);
        this.ensureColumnVisible(endColumnIndex);
        this.emitFocusedCellsChanged();
    }

    selectCellRange(startRowIndex, startColumnIndex, endRowIndex, endColumnIndex) {
        this.selectedCellRange = this.getNormalizedCellRange(startRowIndex, startColumnIndex, endRowIndex, endColumnIndex);
        this.selectedCell = { rowIndex: endRowIndex, columnIndex: endColumnIndex };
        this.ensureRowVisible(endRowIndex);
        this.ensureColumnVisible(endColumnIndex);
    }

    canCreatePreloadedRangeSelection(anchorCell, targetCell) {
        if (!anchorCell || !targetCell)
            return false;
        if (!this.isPreloadedColumn(anchorCell.columnIndex))
            return false;
        if (!this.isPreloadedColumn(targetCell.columnIndex))
            return false;
        return true;
    }

    isPreloadedColumn(columnIndex) {
        const column = this.getColumnByIndex(columnIndex);
        return column?.isPreloadedTerm === true;
    }

    getNormalizedCellRange(startRowIndex, startColumnIndex, endRowIndex, endColumnIndex) {
        return {
            startRowIndex: Math.min(startRowIndex, endRowIndex),
            endRowIndex: Math.max(startRowIndex, endRowIndex),
            startColumnIndex: Math.min(startColumnIndex, endColumnIndex),
            endColumnIndex: Math.max(startColumnIndex, endColumnIndex)
        };
    }

    isCellRangeWithinBounds(cellRange) {
        if (!cellRange)
            return false;
        if (cellRange.startRowIndex < 0 || cellRange.startColumnIndex < 0)
            return false;
        if (cellRange.endRowIndex >= this.rows.length)
            return false;
        if (cellRange.endColumnIndex >= this.options.columns.length)
            return false;
        return true;
    }

    isRowInSelection(rowIndex) {
        if (this.selectedCellRange)
            return rowIndex >= this.selectedCellRange.startRowIndex && rowIndex <= this.selectedCellRange.endRowIndex;
        return this.selectedCell && this.selectedCell.rowIndex === rowIndex;
    }

    isRowInFocus(rowIndex) {
        if (!this.focusedCellRange)
            return false;
        return rowIndex >= this.focusedCellRange.startRowIndex && rowIndex <= this.focusedCellRange.endRowIndex;
    }

    isCellFocused(rowIndex, columnIndex) {
        if (!this.focusedCellRange)
            return false;
        return rowIndex >= this.focusedCellRange.startRowIndex
            && rowIndex <= this.focusedCellRange.endRowIndex
            && columnIndex >= this.focusedCellRange.startColumnIndex
            && columnIndex <= this.focusedCellRange.endColumnIndex;
    }

    getFocusedRangeColors() {
        if (!Array.isArray(this.options.focusedRangeColors) || this.options.focusedRangeColors.length === 0)
            return [this.options.focusedSelectedCellColor ?? "#c9def8"];
        return this.options.focusedRangeColors;
    }

    getNextFocusedRangeColor() {
        const focusedRangeColors = this.getFocusedRangeColors();
        const focusedRangeColor = focusedRangeColors[this.nextFocusedRangeColorIndex % focusedRangeColors.length];
        this.nextFocusedRangeColorIndex = (this.nextFocusedRangeColorIndex + 1) % focusedRangeColors.length;
        return focusedRangeColor;
    }

    doesCellRangeOverlap(firstCellRange, secondCellRange) {
        if (!firstCellRange || !secondCellRange)
            return false;
        if (firstCellRange.endRowIndex < secondCellRange.startRowIndex)
            return false;
        if (secondCellRange.endRowIndex < firstCellRange.startRowIndex)
            return false;
        if (firstCellRange.endColumnIndex < secondCellRange.startColumnIndex)
            return false;
        if (secondCellRange.endColumnIndex < firstCellRange.startColumnIndex)
            return false;
        return true;
    }

    areCellRangesEqual(firstCellRange, secondCellRange) {
        if (!firstCellRange || !secondCellRange)
            return false;
        return firstCellRange.startRowIndex === secondCellRange.startRowIndex
            && firstCellRange.endRowIndex === secondCellRange.endRowIndex
            && firstCellRange.startColumnIndex === secondCellRange.startColumnIndex
            && firstCellRange.endColumnIndex === secondCellRange.endColumnIndex;
    }

    markFocusedCellsAsSelected() {
        if (!this.focusedCellRange)
            return;
        const normalizedFocusedRange = this.getNormalizedCellRange(
            this.focusedCellRange.startRowIndex,
            this.focusedCellRange.startColumnIndex,
            this.focusedCellRange.endRowIndex,
            this.focusedCellRange.endColumnIndex
        );
        if (!this.isCellRangeWithinBounds(normalizedFocusedRange))
            return;
        const alreadySelected = this.selectedFocusedRanges.some(selectedRangeEntry => this.areCellRangesEqual(selectedRangeEntry?.range, normalizedFocusedRange));
        if (alreadySelected)
            return;
        this.selectedFocusedRanges.push({
            range: normalizedFocusedRange,
            color: this.getNextFocusedRangeColor()
        });
        this.render();
    }

    markFocusedCellsAsDeselected() {
        if (!this.focusedCellRange)
            return;
        const normalizedFocusedRange = this.getNormalizedCellRange(
            this.focusedCellRange.startRowIndex,
            this.focusedCellRange.startColumnIndex,
            this.focusedCellRange.endRowIndex,
            this.focusedCellRange.endColumnIndex
        );
        this.selectedFocusedRanges = this.selectedFocusedRanges.filter(selectedRangeEntry => !this.doesCellRangeOverlap(selectedRangeEntry?.range, normalizedFocusedRange));
        this.render();
    }

    clearFocusedCells() {
        if (!this.focusedCellRange && this.selectedFocusedRanges.length === 0)
            return;
        this.focusedCellRange = null;
        this.selectedFocusedRanges = [];
        this.nextFocusedRangeColorIndex = 0;
        this.emitFocusedCellsChanged();
    }

    hasFocusedCells() {
        return this.focusedCellRange != null;
    }

    getFocusedRows() {
        if (!this.focusedCellRange)
            return [];
        const focusedRows = [];
        for (let rowIndex = this.focusedCellRange.startRowIndex; rowIndex <= this.focusedCellRange.endRowIndex; rowIndex++) {
            if (rowIndex >= 0 && rowIndex < this.rows.length)
                focusedRows.push({ row: this.rows[rowIndex], rowIndex: rowIndex });
        }
        return focusedRows;
    }

    getFocusedColumn() {
        if (!this.focusedCellRange)
            return null;
        if (this.focusedCellRange.startColumnIndex !== this.focusedCellRange.endColumnIndex)
            return null;
        return this.getColumnByIndex(this.focusedCellRange.startColumnIndex);
    }

    emitFocusedCellsChanged() {
        const callback = this.options.onFocusedCellsChanged;
        if (typeof callback !== "function")
            return;
        callback({
            hasFocusedCells: this.hasFocusedCells(),
            focusedCellRange: this.focusedCellRange,
            focusedRows: this.getFocusedRows(),
            focusedColumn: this.getFocusedColumn()
        });
    }

    isCellSelected(rowIndex, columnIndex) {
        if (this.focusedCellRange)
            return false;
        if (this.selectedCellRange)
            return rowIndex >= this.selectedCellRange.startRowIndex
                && rowIndex <= this.selectedCellRange.endRowIndex
                && columnIndex >= this.selectedCellRange.startColumnIndex
                && columnIndex <= this.selectedCellRange.endColumnIndex;
        return this.selectedCell && this.selectedCell.rowIndex === rowIndex && this.selectedCell.columnIndex === columnIndex;
    }

    moveSelection(rowDelta, columnDelta) {
        if (!this.selectedCell)
            return false;
        const nextRow = Math.max(0, Math.min(this.rows.length - 1, this.selectedCell.rowIndex + rowDelta));
        const maxColumnIndex = Math.max(0, this.options.columns.length - 1);
        const nextColumn = Math.max(0, Math.min(maxColumnIndex, this.selectedCell.columnIndex + columnDelta));
        this.selectCell(nextRow, nextColumn);
        return true;
    }

    canEditCell(rowIndex, columnIndex) {
        const row = this.getRowByIndex(rowIndex);
        const column = this.getColumnByIndex(columnIndex);
        if (!row || !column)
            return false;
        return column.editable === true;
    }

    startEditing(rowIndex, columnIndex, initialKey) {
        if (!this.canEditCell(rowIndex, columnIndex))
            return;
        const row = this.getRowByIndex(rowIndex);
        const column = this.getColumnByIndex(columnIndex);
        const currentValue = row ? row[column.key] : "";
        let text = currentValue == null ? "" : `${currentValue}`;
        if (initialKey != null && this.isAcceptedEditKey(initialKey))
            text = this.normalizeEditCharacter(initialKey);
        this.editingCell = {
            rowIndex: rowIndex,
            columnIndex: columnIndex,
            text: text
        };
        this.selectCell(rowIndex, columnIndex);
    }

    cancelEditing() {
        this.editingCell = null;
    }

    commitEditing() {
        if (!this.editingCell)
            return true;
        const row = this.getRowByIndex(this.editingCell.rowIndex);
        const column = this.getColumnByIndex(this.editingCell.columnIndex);
        if (!row || !column) {
            this.editingCell = null;
            return false;
        }
        const nextValue = Number(this.editingCell.text);
        if (!Number.isFinite(nextValue))
            return false;
        const oldValue = row[column.key];
        let accepted = true;
        const callback = this.options.onCellValueChanged;
        if (typeof callback === "function") {
            accepted = callback({
                row: row,
                rowKey: row.key,
                rowIndex: this.editingCell.rowIndex,
                column: column,
                columnIndex: this.editingCell.columnIndex,
                value: nextValue,
                oldValue: oldValue
            }) !== false;
        }
        if (!accepted)
            return false;
        row[column.key] = nextValue;
        this.editingCell = null;
        return true;
    }

    deleteSelectedRow() {
        if (!this.selectedCell)
            return false;
        const rowIndex = this.selectedCell.rowIndex;
        const row = this.getRowByIndex(rowIndex);
        if (!row)
            return false;
        const callback = this.options.onRowDeleteRequested;
        let accepted = true;
        if (typeof callback === "function") {
            accepted = callback({
                row: row,
                rowKey: row.key,
                rowIndex: rowIndex
            }) !== false;
        }
        if (!accepted)
            return false;
        this.rows.splice(rowIndex, 1);
        this.editingCell = null;
        if (this.rows.length === 0)
            this.selectedCell = null;
        else {
            const nextRowIndex = Math.min(rowIndex, this.rows.length - 1);
            const nextColumnIndex = Math.min(this.selectedCell.columnIndex, Math.max(0, this.options.columns.length - 1));
            this.selectCell(nextRowIndex, nextColumnIndex);
        }
        return true;
    }

    deleteFocusedRows() {
        const focusedRows = this.getFocusedRows();
        if (focusedRows.length === 0)
            return false;
        const callback = this.options.onRowDeleteRequested;
        let deletedCount = 0;
        const rowIndexes = focusedRows.map(entry => entry.rowIndex).sort((a, b) => b - a);
        for (let index = 0; index < rowIndexes.length; index++) {
            const rowIndex = rowIndexes[index];
            const row = this.getRowByIndex(rowIndex);
            if (!row)
                continue;
            let accepted = true;
            if (typeof callback === "function") {
                accepted = callback({
                    row: row,
                    rowKey: row.key,
                    rowIndex: rowIndex
                }) !== false;
            }
            if (!accepted)
                continue;
            this.rows.splice(rowIndex, 1);
            deletedCount++;
        }
        if (deletedCount === 0)
            return false;
        this.editingCell = null;
        this.selectedCell = null;
        this.selectedCellRange = null;
        this.clearFocusedCells();
        this.ensureScrollBounds();
        this.render();
        return true;
    }

    appendEditingCharacter(character) {
        if (!this.editingCell)
            return;
        this.editingCell.text = `${this.editingCell.text}${this.normalizeEditCharacter(character)}`;
    }

    removeEditingCharacter() {
        if (!this.editingCell)
            return;
        this.editingCell.text = this.editingCell.text.slice(0, -1);
    }

    clearEditingCharacter() {
        if (!this.editingCell)
            return;
        this.editingCell.text = "";
    }

    normalizeEditCharacter(character) {
        if (character === ",")
            return ".";
        return character;
    }

    handleNavigationKey(key) {
        if (key === "ArrowUp")
            return this.moveSelection(-1, 0);
        if (key === "ArrowDown")
            return this.moveSelection(1, 0);
        if (key === "ArrowLeft")
            return this.moveSelection(0, -1);
        if (key === "ArrowRight")
            return this.moveSelection(0, 1);
        return false;
    }

    isAcceptedEditKey(key) {
        return /^[0-9eE+\-.,]$/.test(key);
    }

    getColumnByIndex(index) {
        if (index < 0 || index >= this.options.columns.length)
            return null;
        return this.options.columns[index];
    }

    getRowByIndex(index) {
        if (index < 0 || index >= this.rows.length)
            return null;
        return this.rows[index];
    }

    ensureRowVisible(rowIndex) {
        const layout = this.getLayout();
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        const rowTop = rowIndex * rowHeight;
        const rowBottom = rowTop + rowHeight;
        const viewportTop = this.scrollTop;
        const viewportBottom = this.scrollTop + layout.bodyHeight;
        if (rowTop < viewportTop)
            this.scrollTop = rowTop;
        if (rowBottom > viewportBottom)
            this.scrollTop = rowBottom - layout.bodyHeight;
        this.ensureScrollBounds();
    }

    ensureColumnVisible(columnIndex) {
        const layout = this.getLayout();
        const geometry = this.getColumnGeometry(layout, this.options.columns);
        const columnGeometry = geometry[columnIndex];
        if (!columnGeometry)
            return;
        const columnLeft = columnGeometry.absoluteX;
        const columnRight = columnGeometry.absoluteRight;
        const viewportLeft = this.scrollLeft;
        const viewportRight = this.scrollLeft + layout.bodyWidth;
        if (columnLeft < viewportLeft)
            this.scrollLeft = columnLeft;
        if (columnRight > viewportRight)
            this.scrollLeft = columnRight - layout.bodyWidth;
        this.ensureScrollBounds();
    }

    ensureFocusedRowVisible() {
        if (this.focusedRowKey == null)
            return;
        const rowIndex = this.rows.findIndex(row => row.key === this.focusedRowKey);
        if (rowIndex < 0)
            return;
        this.ensureRowVisible(rowIndex);
    }

    setColumnWidth(columnIndex, width) {
        const column = this.options.columns[columnIndex];
        if (!column)
            return;
        const normalizedWidth = Math.max(this.getMinColumnWidth(), Math.round(Number(width) || 0));
        if (column.width === normalizedWidth)
            return;
        column.width = normalizedWidth;
        this.ensureScrollBounds();
        this.ensureColumnVisible(columnIndex);
        this.render();
    }

    notifyColumnWidthChanged(columnIndex) {
        const callback = this.options.onColumnWidthChanged;
        const column = this.getColumnByIndex(columnIndex);
        if (typeof callback !== "function" || !column)
            return;
        callback({
            columnIndex: columnIndex,
            column: column,
            width: this.getColumnWidth(column)
        });
    }
}
