class ColorControl {
    constructor(options) {
        this.options = options ?? {};
    }

    getColorPickerPalette() {
        return Utils.getColorPickerPalette();
    }

    getColorPickerItems() {
        const rowsCount = this.getColorPickerRowsCount();
        const items = this.getColorPickerPalette().map(color => ({ color: this.normalizeColorPickerValue(color) }));
        if (items.length == 0 || rowsCount <= 0)
            return items;
        const remainder = items.length % rowsCount;
        if (remainder == 0)
            return items;
        const missingItemsCount = rowsCount - remainder;
        const fillColors = this.getColorPickerGridFillColors();
        for (let index = 0; index < missingItemsCount; index++)
            items.push({ color: fillColors[index % fillColors.length] });
        return items;
    }

    getColorPickerGridFillColors() {
        return ["#00000000", "#FFFFFF", "#000000"];
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
        const dropDownButtonInstance = picker.dxDropDownButton("instance");
        if (dropDownButtonInstance)
            dropDownButtonInstance.close();
        this.refreshColorPickerButtonTemplate(picker, selectedColorState.value);
        if (onValueChanged)
            onValueChanged(selectedColorState.value);
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
                container: document.body,
                wrapperAttr: { class: `mdl-shape-overlay-popup ${menuClassName}` },
                width: metrics.popupWidth,
                height: metrics.popupHeight,
                contentTemplate: contentElement => this.createColorPickerTileView(contentElement, picker, items, selectedColorState, onValueChanged, metrics)
            }
        });
        return picker;
    }
}
