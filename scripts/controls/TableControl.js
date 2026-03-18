class TableControl {
    constructor(hostElement, options) {
        this.hostElement = hostElement;
        this.options = this.createDefaultOptions();
        this.rows = [];
        this.width = 0;
        this.height = 0;
        this.scrollTop = 0;
        this.focusedRowKey = null;
        this.selectedCell = null;
        this.editingCell = null;
        this.cellBoxes = [];
        this.scrollbarThumbRect = null;
        this.scrollbarDrag = null;
        this.caseIconData = {};
        this.caseIconsLoadingPromise = null;
        this.rowsClipId = `shape-svg-table-clip-${crypto.randomUUID()}`;
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
            onCellValueChanged: null
        };
    }

    initializeRoot() {
        this.rootElement = this.createSvgElement("g");
        this.rootElement.setAttribute("tabindex", "0");
        this.defsElement = this.createSvgElement("defs");
        this.rowsClipPath = this.createSvgElement("clipPath");
        this.rowsClipPath.setAttribute("id", this.rowsClipId);
        this.rowsClipRect = this.createSvgElement("rect");
        this.rowsClipPath.appendChild(this.rowsClipRect);
        this.defsElement.appendChild(this.rowsClipPath);
        this.backgroundLayer = this.createSvgElement("g");
        this.headerLayer = this.createSvgElement("g");
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
        this.onMouseDownHandler = event => this.onMouseDown(event);
        this.onKeyDownHandler = event => this.onKeyDown(event);
        this.onWindowMouseMoveHandler = event => this.onWindowMouseMove(event);
        this.onWindowMouseUpHandler = _ => this.onWindowMouseUp();
        this.rootElement.addEventListener("wheel", this.onWheelHandler, { passive: false });
        window.addEventListener("wheel", this.onWindowWheelHandler, { passive: false });
        this.rootElement.addEventListener("mousedown", this.onMouseDownHandler);
        this.rootElement.addEventListener("keydown", this.onKeyDownHandler);
    }

    dispose() {
        this.rootElement.removeEventListener("wheel", this.onWheelHandler);
        window.removeEventListener("wheel", this.onWindowWheelHandler);
        this.rootElement.removeEventListener("mousedown", this.onMouseDownHandler);
        this.rootElement.removeEventListener("keydown", this.onKeyDownHandler);
        window.removeEventListener("mousemove", this.onWindowMouseMoveHandler);
        window.removeEventListener("mouseup", this.onWindowMouseUpHandler);
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

    renderHeaderCaseIcon(caseNumber, xPosition, yPosition) {
        const size = this.getHeaderCaseIconSize(caseNumber);
        const iconData = this.caseIconData[caseNumber];
        const caseIconColor = TermControl.getCaseIconColor(caseNumber);
        if (!iconData?.pathData) {
            const fallbackText = this.createSvgElement("text");
            fallbackText.setAttribute("x", `${xPosition}`);
            fallbackText.setAttribute("y", `${yPosition}`);
            fallbackText.setAttribute("fill", caseIconColor);
            fallbackText.setAttribute("font-family", this.options.numberFontFamily);
            fallbackText.setAttribute("font-size", `${Math.max(8, Number(this.options.headerFontSize) - 3)}`);
            fallbackText.textContent = `${caseNumber}`;
            this.headerLayer.appendChild(fallbackText);
            return;
        }
        const scaleX = size.width / iconData.width;
        const scaleY = size.height / iconData.height;
        const topY = yPosition - size.height * 0.82;
        const iconGroup = this.createSvgElement("g");
        iconGroup.setAttribute("transform", `translate(${xPosition} ${topY}) scale(${scaleX} ${scaleY})`);
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
            precision: Number.isFinite(column?.precision) ? column.precision : null,
            barColor: this.normalizeBarColor(column?.barColor),
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
        const scrollbarWidth = Math.max(8, Number(this.options.scrollbarWidth) || 10);
        const bodyHeight = Math.max(0, height - headerHeight);
        const bodyWidth = Math.max(0, width - scrollbarWidth);
        return {
            width: width,
            height: height,
            headerHeight: headerHeight,
            bodyHeight: bodyHeight,
            bodyWidth: bodyWidth,
            scrollbarWidth: scrollbarWidth
        };
    }

    updateClipRect(layout) {
        this.rowsClipRect.setAttribute("x", "0");
        this.rowsClipRect.setAttribute("y", `${layout.headerHeight}`);
        this.rowsClipRect.setAttribute("width", `${layout.bodyWidth}`);
        this.rowsClipRect.setAttribute("height", `${layout.bodyHeight}`);
    }

    getTotalRowsHeight() {
        const rowHeight = Math.max(16, Number(this.options.rowHeight) || 24);
        return this.rows.length * rowHeight;
    }

    getMaxScrollTop() {
        const layout = this.getLayout();
        return Math.max(0, this.getTotalRowsHeight() - layout.bodyHeight);
    }

    setScrollTop(value) {
        const maxScrollTop = this.getMaxScrollTop();
        const normalizedScrollTop = Math.max(0, Math.min(maxScrollTop, Number(value) || 0));
        if (normalizedScrollTop === this.scrollTop)
            return;
        this.scrollTop = normalizedScrollTop;
        this.render();
    }

    ensureScrollBounds() {
        const maxScrollTop = this.getMaxScrollTop();
        if (this.scrollTop > maxScrollTop)
            this.scrollTop = maxScrollTop;
        if (this.scrollTop < 0)
            this.scrollTop = 0;
    }

    getColumnGeometry(layout, columns) {
        if (!columns.length)
            return [];
        const geometry = [];
        const widthStep = layout.bodyWidth / columns.length;
        let x = 0;
        for (let index = 0; index < columns.length; index++) {
            const nextX = index === columns.length - 1 ? layout.bodyWidth : Math.round((index + 1) * widthStep);
            const columnWidth = Math.max(1, nextX - x);
            geometry.push({ x: x, width: columnWidth });
            x = nextX;
        }
        return geometry;
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
        this.scrollbarThumbRect = null;
        if (this.width <= 2 || this.height <= 2)
            return;
        const layout = this.getLayout();
        const columns = this.options.columns ?? [];
        const geometry = this.getColumnGeometry(layout, columns);
        const columnValueRanges = this.getColumnValueRanges(columns);
        this.updateClipRect(layout);
        this.renderBackground(layout);
        this.renderHeader(layout, columns, geometry);
        this.renderBody(layout, columns, geometry, columnValueRanges);
        this.renderScrollbar(layout);
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
            this.renderHeaderCell(layout, columns[index], geometry[index], index === columns.length - 1);
    }

    renderHeaderCell(layout, column, cellGeometry, isLastColumn) {
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
            this.renderHeaderCaseIcon(column.caseNumber, iconX, iconY);
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
        if (this.focusedRowKey != null && row.key === this.focusedRowKey)
            rowRect.setAttribute("fill", this.options.selectionColor);
        else
            rowRect.setAttribute("fill", this.options.backgroundColor);
        this.rowsLayer.appendChild(rowRect);
        for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
            const cell = geometry[columnIndex];
            const selected = this.selectedCell && this.selectedCell.rowIndex === rowIndex && this.selectedCell.columnIndex === columnIndex;
            if (selected) {
                const selectedRect = this.createSvgElement("rect");
                selectedRect.setAttribute("x", `${cell.x}`);
                selectedRect.setAttribute("y", `${y}`);
                selectedRect.setAttribute("width", `${cell.width}`);
                selectedRect.setAttribute("height", `${rowHeight}`);
                selectedRect.setAttribute("fill", this.options.selectedCellColor);
                selectedRect.setAttribute("fill-opacity", "0.8");
                selectedRect.setAttribute("stroke", this.options.borderColor);
                selectedRect.setAttribute("stroke-width", "1");
                this.rowsLayer.appendChild(selectedRect);
            }
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
            const textValue = this.getCellText(row, columns[columnIndex]);
            this.renderCellText(cell, y, rowHeight, textValue);
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

    renderCellText(cellGeometry, y, rowHeight, textValue) {
        const text = this.createSvgElement("text");
        text.setAttribute("x", `${cellGeometry.x + cellGeometry.width - 6}`);
        text.setAttribute("y", `${y + rowHeight / 2 + 4}`);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-family", this.options.numberFontFamily);
        text.setAttribute("font-size", `${this.options.fontSize}`);
        text.setAttribute("fill", this.options.foregroundColor);
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

    renderScrollbar(layout) {
        const track = this.createSvgElement("rect");
        track.setAttribute("x", `${layout.bodyWidth}`);
        track.setAttribute("y", `${layout.headerHeight}`);
        track.setAttribute("width", `${layout.scrollbarWidth}`);
        track.setAttribute("height", `${layout.bodyHeight}`);
        track.setAttribute("fill", this.options.scrollbarTrackColor);
        this.scrollbarLayer.appendChild(track);
        const thumbRect = this.getThumbRect(layout);
        this.scrollbarThumbRect = thumbRect;
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

    getThumbRect(layout) {
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
            x: layout.bodyWidth + 1,
            y: y,
            width: Math.max(2, layout.scrollbarWidth - 2),
            height: thumbHeight
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
        if (maxScrollTop <= 0)
            return;
        event.preventDefault();
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
        let delta = event.deltaY;
        if (event.deltaMode === 1)
            delta *= 20;
        if (event.deltaMode === 2)
            delta *= 80;
        return delta;
    }

    onMouseDown(event) {
        this.focus();
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        if (this.isPointInScrollbar(point)) {
            this.startScrollbarDrag(point);
            return;
        }
        const cell = this.getCellFromPoint(point);
        if (!cell) {
            this.selectedCell = null;
            this.editingCell = null;
            this.render();
            return;
        }
        const isSameCell = this.selectedCell && this.selectedCell.rowIndex === cell.rowIndex && this.selectedCell.columnIndex === cell.columnIndex;
        if (this.editingCell && (!isSameCell || event.detail >= 2))
            this.commitEditing();
        this.selectCell(cell.rowIndex, cell.columnIndex);
        if (event.detail >= 2 && this.canEditCell(cell.rowIndex, cell.columnIndex))
            this.startEditing(cell.rowIndex, cell.columnIndex, null);
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
        const thumb = this.scrollbarThumbRect;
        if (!thumb)
            return;
        if (this.pointInRect(point, thumb)) {
            this.scrollbarDrag = {
                startY: point.y,
                startScrollTop: this.scrollTop
            };
            window.addEventListener("mousemove", this.onWindowMouseMoveHandler);
            window.addEventListener("mouseup", this.onWindowMouseUpHandler);
            return;
        }
        const maxScrollTop = this.getMaxScrollTop();
        if (maxScrollTop <= 0)
            return;
        const ratio = (point.y - layout.headerHeight) / Math.max(1, layout.bodyHeight);
        this.setScrollTop(ratio * maxScrollTop);
    }

    onWindowMouseMove(event) {
        if (!this.scrollbarDrag)
            return;
        const point = this.convertClientPoint(event);
        if (!point)
            return;
        const layout = this.getLayout();
        const thumb = this.scrollbarThumbRect;
        if (!thumb)
            return;
        const travel = Math.max(1, layout.bodyHeight - thumb.height);
        const maxScrollTop = this.getMaxScrollTop();
        const deltaY = point.y - this.scrollbarDrag.startY;
        this.setScrollTop(this.scrollbarDrag.startScrollTop + (deltaY / travel) * maxScrollTop);
    }

    onWindowMouseUp() {
        this.scrollbarDrag = null;
        window.removeEventListener("mousemove", this.onWindowMouseMoveHandler);
        window.removeEventListener("mouseup", this.onWindowMouseUpHandler);
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

    isPointInScrollbar(point) {
        const layout = this.getLayout();
        if (point.x < layout.bodyWidth || point.x > layout.width)
            return false;
        if (point.y < layout.headerHeight || point.y > layout.headerHeight + layout.bodyHeight)
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
        this.ensureRowVisible(rowIndex);
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

    ensureFocusedRowVisible() {
        if (this.focusedRowKey == null)
            return;
        const rowIndex = this.rows.findIndex(row => row.key === this.focusedRowKey);
        if (rowIndex < 0)
            return;
        this.ensureRowVisible(rowIndex);
    }
}
