class ShapeColorSelectorControl {
    constructor(options) {
        this.options = options ?? {};
    }

    getColorPickerPalette() {
        if (Array.isArray(this.options.palette) && this.options.palette.length > 0)
            return this.options.palette;
        return [
            "#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#C62828",
            "#FFF3E0", "#FFE0B2", "#FFCC80", "#FFB74D", "#FFA726", "#EF6C00",
            "#FAFAFA", "#F5F5F5", "#EEEEEE", "#E0E0E0", "#BDBDBD", "#616161",
            "#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#2E7D32",
            "#E3F2FD", "#BBDEFB", "#90CAF9", "#64B5F6", "#42A5F5", "#1565C0",
            "#F3E5F5", "#E1BEE7", "#CE93D8", "#BA68C8", "#AB47BC", "#6A1B9A"
        ];
    }

    getColorPickerItems() {
        return this.getColorPickerPalette().map(color => ({ color: this.normalizeColorPickerValue(color) }));
    }

    normalizeColorPickerValue(color) {
        if (color == "transparent")
            return "#00000000";
        if (color == null)
            return "";
        return String(color).trim();
    }

    getColorPickerRowsCount() {
        const rowsCount = this.options.rowsCount;
        if (Number.isInteger(rowsCount) && rowsCount > 0)
            return rowsCount;
        return 6;
    }

    getColorPickerTileMetrics(itemsCount) {
        const rows = this.getColorPickerRowsCount();
        const columns = Math.max(1, Math.ceil(itemsCount / rows));
        const baseItemSize = 26;
        const itemMargin = 2;
        const popupPadding = 6;
        const step = baseItemSize + itemMargin * 2;
        const tileViewWidth = columns * step;
        const tileViewHeight = rows * step;
        return {
            rows: rows,
            columns: columns,
            baseItemSize: baseItemSize,
            itemMargin: itemMargin,
            tileViewWidth: tileViewWidth,
            tileViewHeight: tileViewHeight,
            popupPadding: popupPadding,
            popupWidth: tileViewWidth + popupPadding * 2,
            popupHeight: tileViewHeight + popupPadding * 2
        };
    }

    getColorPickerIconColor(color) {
        if (color == "#00000000")
            return "#cccccc";
        return color;
    }

    getColorPickerIconClass(color) {
        if (color == "#00000000")
            return "fa-solid fa-square-dashed";
        return "fa-solid fa-square";
    }

    createColorPickerIcon(color, className) {
        const icon = $("<i>").addClass(`${this.getColorPickerIconClass(color)} ${className}`);
        icon.css("color", this.getColorPickerIconColor(color));
        return icon;
    }

    renderColorPickerButtonTemplate(selectedColor, element) {
        const content = $("<div>").addClass("mdl-color-picker-button-template");
        const icon = this.createColorPickerIcon(selectedColor, "mdl-color-picker-button-icon");
        content.append(icon);
        $(element).empty().append(content);
    }

    renderColorPickerItemTemplate(itemData, element) {
        const content = $("<div>").addClass("mdl-color-picker-item");
        const icon = this.createColorPickerIcon(itemData.color, "mdl-color-picker-item-icon");
        content.append(icon);
        $(element).append(content);
    }

    createColorPickerTileView(contentElement, picker, items, selectedColorState, onValueChanged, metrics) {
        $(contentElement).empty();
        const tileViewContainer = $("<div>").addClass("mdl-color-picker-tileview");
        $(contentElement).append(tileViewContainer);
        tileViewContainer.dxTileView({
            items: items,
            baseItemHeight: metrics.baseItemSize,
            baseItemWidth: metrics.baseItemSize,
            itemMargin: metrics.itemMargin,
            direction: "vertical",
            height: metrics.tileViewHeight,
            width: metrics.tileViewWidth,
            itemTemplate: (itemData, index, element) => this.renderColorPickerItemTemplate(itemData, element),
            onItemClick: event => this.onColorPickerTileClick(event, picker, selectedColorState, onValueChanged)
        });
    }

    onColorPickerTileClick(event, picker, selectedColorState, onValueChanged) {
        selectedColorState.value = event.itemData.color;
        if (onValueChanged)
            onValueChanged(selectedColorState.value);
        const dropDownButtonInstance = picker.dxDropDownButton("instance");
        if (dropDownButtonInstance)
            dropDownButtonInstance.close();
        this.refreshColorPickerButtonTemplate(picker, selectedColorState.value);
    }

    refreshColorPickerButtonTemplate(picker, selectedColor) {
        const buttonContentElement = picker.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderColorPickerButtonTemplate(selectedColor, buttonContentElement);
    }

    createEditor(selectedColor, onValueChanged, options) {
        const editorOptions = options ?? {};
        const picker = $("<div>").addClass("mdl-color-picker");
        if (editorOptions.className)
            picker.addClass(editorOptions.className);
        const items = this.getColorPickerItems();
        const metrics = this.getColorPickerTileMetrics(items.length);
        const fallbackColor = items.length > 0 ? items[0].color : "#000000";
        const initialColor = selectedColor == null ? fallbackColor : this.normalizeColorPickerValue(selectedColor);
        const selectedColorState = { value: initialColor };
        const menuClassName = editorOptions.menuClassName ?? "mdl-color-picker-menu";
        picker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => this.renderColorPickerButtonTemplate(selectedColorState.value, element),
            dropDownOptions: {
                width: metrics.popupWidth,
                height: metrics.popupHeight,
                wrapperAttr: { class: menuClassName },
                contentTemplate: contentElement => this.createColorPickerTileView(contentElement, picker, items, selectedColorState, onValueChanged, metrics)
            }
        });
        return picker;
    }
}
