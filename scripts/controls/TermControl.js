class TermControl {
    static normalizeTermValue(value) {
        if (value == null)
            return "";
        return String(value).trim();
    }

    static normalizeColorValue(value) {
        if (value == null)
            return "";
        return String(value).trim();
    }

    static shouldShowCaseSelectionForTerm(termValue, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizedTerm = normalizeTermValue(termValue);
        const getCasesCount = options.getCasesCount;
        const casesCountRaw = typeof getCasesCount === "function" ? getCasesCount() : 1;
        const casesCount = parseInt(casesCountRaw, 10);
        if (!Number.isFinite(casesCount) || casesCount <= 1)
            return false;
        if (normalizedTerm === "")
            return false;
        const isTerm = options.isTerm;
        if (typeof isTerm === "function" && !isTerm(normalizedTerm))
            return false;
        const getIndependentTermName = options.getIndependentTermName;
        const independentTermName = typeof getIndependentTermName === "function" ? getIndependentTermName() : options.independentTermName;
        if (independentTermName != null && normalizedTerm === independentTermName)
            return false;
        const getIterationTermName = options.getIterationTermName;
        const iterationTermName = typeof getIterationTermName === "function" ? getIterationTermName() : options.iterationTermName;
        if (iterationTermName != null && normalizedTerm === iterationTermName)
            return false;
        return true;
    }

    static getCaseNumberIconClass(caseNumber) {
        const parsedCaseNumber = parseInt(caseNumber, 10);
        if (!Number.isFinite(parsedCaseNumber))
            return "fa-solid fa-square-1";
        if (parsedCaseNumber < 1)
            return "fa-solid fa-square-1";
        if (parsedCaseNumber > 9)
            return "fa-solid fa-square-9";
        return `fa-solid fa-square-${parsedCaseNumber}`;
    }

    static getCaseIconColor(caseNumber = 1) {
        const parsedCaseNumber = parseInt(caseNumber, 10);
        const normalizedCaseNumber = !Number.isFinite(parsedCaseNumber) ? 1 : Math.max(1, Math.min(9, parsedCaseNumber));
        const caseColors = [
            "#E53935",
            "#FB8C00",
            "#F9A825",
            "#43A047",
            "#1E88E5",
            "#8E24AA",
            "#00897B",
            "#6D4C41",
            "#546E7A"
        ];
        return caseColors[normalizedCaseNumber - 1];
    }

    static getVisibilityIconClass(value) {
        if (value)
            return "fa-light fa-eye";
        return "fa-light fa-eye-closed";
    }

    static updateVisibilityCheckboxIcon(checkboxInstance, iconClassName = "term-packed-checkbox-icon") {
        if (!checkboxInstance)
            return;
        const iconContainer = checkboxInstance.element().find(".dx-checkbox-icon");
        if (iconContainer.length == 0)
            return;
        iconContainer.empty();
        const iconClass = TermControl.getVisibilityIconClass(checkboxInstance.option("value") === true);
        $("<i>").addClass(`${iconClass} ${iconClassName}`).appendTo(iconContainer);
    }

    static createVisibilityCheckbox(buttonHost, initialValue, onValueChanged, options = {}) {
        const checkboxClassName = options.checkboxClassName ?? "term-packed-checkbox";
        const iconClassName = options.iconClassName ?? "term-packed-checkbox-icon";
        return buttonHost.dxCheckBox({
            value: initialValue === true,
            elementAttr: { class: checkboxClassName },
            onContentReady: e => TermControl.updateVisibilityCheckboxIcon(e.component, iconClassName),
            onValueChanged: e => {
                TermControl.updateVisibilityCheckboxIcon(e.component, iconClassName);
                onValueChanged(e.value === true);
            }
        }).dxCheckBox("instance");
    }

    static normalizeBaseShapeTermValue(value) {
        return TermControl.normalizeTermValue(value);
    }

    static normalizeBaseShapeCustomTermValue(baseShape, value) {
        const normalizedValue = TermControl.normalizeBaseShapeTermValue(value);
        if (normalizedValue === "")
            return normalizedValue;
        const numeric = Number(normalizedValue);
        if (!Number.isFinite(numeric))
            return normalizedValue;
        return baseShape.formatModelValue(numeric);
    }

    static getBaseShapeCaseVisibilityConfig(baseShape) {
        const calculator = baseShape.board.calculator;
        return {
            getTermValue: item => item?.term,
            normalizeTermValue: value => TermControl.normalizeBaseShapeTermValue(value),
            getCasesCount: () => baseShape.getCasesCount(),
            isTerm: value => calculator.isTerm(value),
            getIndependentTermName: () => calculator.properties?.independent?.name,
            getIterationTermName: () => calculator.properties?.iterationTerm
        };
    }

    static getBaseShapeCaseNumber(baseShape, termValue, caseNumber = 1) {
        if (!TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getBaseShapeCaseVisibilityConfig(baseShape)))
            return 1;
        return baseShape.getClampedCaseNumber(caseNumber);
    }

    static buildBaseShapeCaseItems(baseShape) {
        const count = baseShape.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    static createBaseShapeCaseFieldAddonRenderer(baseShape) {
        return data => {
            const caseNumber = data?.value ?? 1;
            const iconClass = TermControl.getCaseNumberIconClass(caseNumber);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", TermControl.getCaseIconColor(caseNumber));
            return icon;
        };
    }

    static createBaseShapeCaseItemTemplate(baseShape) {
        return (itemData, _, element) => {
            const content = $("<div>").addClass("case-select");
            const caseNumber = itemData.value;
            const iconClass = TermControl.getCaseNumberIconClass(caseNumber);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", TermControl.getCaseIconColor(caseNumber));
            content.append(icon);
            const label = $("<span>").addClass("case-select__label").text(itemData.value);
            content.append(label);
            element.append(content);
        };
    }

    static getBaseShapeTermSelectItems(baseShape, term) {
        const calculator = baseShape.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames());
        const selectedValue = TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]);
        if (selectedValue === "")
            return items;
        if (calculator.isTerm(selectedValue))
            return items;
        const formattedValue = TermControl.normalizeBaseShapeCustomTermValue(baseShape, selectedValue);
        items.unshift({ text: formattedValue, term: selectedValue });
        return items;
    }

    static getBaseShapeTermControlStateKey(baseShape, term, caseProperty) {
        const selectedTerm = TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]);
        const selectedCase = TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1);
        const terms = baseShape.board.calculator.getTermsNames();
        return `${selectedTerm}|${selectedCase}|${baseShape.getCasesCount()}|${terms.join(",")}|${caseProperty}`;
    }

    static syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl = null) {
        const caseValue = TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1);
        if (baseShape.properties[caseProperty] !== caseValue)
            formInstance.updateData(caseProperty, caseValue);
        const control = termControl ?? baseShape.termFormControls?.[term]?.termControl;
        if (control)
            control.refresh();
    }

    static createBaseShapeTermFormControl(baseShape, formInstance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true) {
        if (!baseShape.termDisplayEntries.some(entry => entry.term === term))
            baseShape.termDisplayEntries.push({ term: term, caseProperty: caseProperty });
        const control = $("<div>").addClass("term-packed-control");
        const selectHost = $("<div>").addClass("term-packed-control__select");
        const displayModeValue = baseShape.properties[displayModeProperty] ?? "none";
        const isVisible = displayModeValue !== false && displayModeValue !== "none";
        if (showVisibilityToggle) {
            const buttonHost = $("<div>").addClass("term-packed-control__button");
            control.append(buttonHost);
            TermControl.createVisibilityCheckbox(buttonHost, isVisible, value => {
                baseShape.setPropertyCommand(displayModeProperty, value ? "nameValue" : "none");
                baseShape.board.markDirty(baseShape);
            });
        } else
            control.addClass("term-packed-control--no-visibility");
        control.append(selectHost);
        let termControl = null;
        const caseVisibility = TermControl.getBaseShapeCaseVisibilityConfig(baseShape);
        const caseFieldAddonRenderer = TermControl.createBaseShapeCaseFieldAddonRenderer(baseShape);
        const caseItemTemplate = TermControl.createBaseShapeCaseItemTemplate(baseShape);
        termControl = new TermControl({
            hostClassName: "shape-terms-control term-packed-terms-control",
            listClassName: "shape-terms-list term-packed-terms-list",
            rowClassName: "shape-term-row term-packed-term-row",
            dragHandleClassName: "shape-term-drag-handle term-packed-term-drag-handle",
            allowItemDeleting: false,
            allowReordering: false,
            showDragHandle: false,
            rowGap: "0",
            rowMarginBottom: "0",
            getItems: () => [{ term: TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]), case: TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1) }],
            getStateKey: () => TermControl.getBaseShapeTermControlStateKey(baseShape, term, caseProperty),
            getTermItems: () => TermControl.getBaseShapeTermSelectItems(baseShape, term),
            normalizeTermValue: value => TermControl.normalizeBaseShapeTermValue(value),
            onTermChanged: (_, value) => {
                formInstance.updateData(term, value);
                const caseNumber = TermControl.getBaseShapeCaseNumber(baseShape, value, baseShape.properties[caseProperty] ?? 1);
                formInstance.updateData(caseProperty, caseNumber);
                TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl);
                baseShape.board.markDirty(baseShape);
            },
            termEditor: {
                acceptCustomValue: isEditable,
                onOpened: _ => TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl),
                onCustomItemCreating: event => {
                    const customValue = TermControl.normalizeBaseShapeCustomTermValue(baseShape, event.text);
                    formInstance.updateData(term, customValue);
                    event.component.option("value", customValue);
                    event.customItem = { text: customValue, term: customValue };
                    const caseNumber = TermControl.getBaseShapeCaseNumber(baseShape, customValue, baseShape.properties[caseProperty] ?? 1);
                    formInstance.updateData(caseProperty, caseNumber);
                    TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl);
                    baseShape.board.markDirty(baseShape);
                }
            },
            secondary: {
                width: "42px",
                editorType: "dxDropDownButton",
                caseVisibility: caseVisibility,
                getValue: item => TermControl.getBaseShapeCaseNumber(baseShape, item?.term, item?.case ?? baseShape.properties[caseProperty] ?? 1),
                getItems: () => TermControl.buildBaseShapeCaseItems(baseShape),
                valueExpr: "value",
                displayExpr: "value",
                fieldAddonsBefore: data => caseFieldAddonRenderer(data),
                itemTemplate: caseItemTemplate,
                onValueChanged: (_, value) => {
                    const caseNumber = TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], value);
                    formInstance.updateData(caseProperty, caseNumber);
                    TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl);
                    baseShape.board.markDirty(baseShape);
                }
            }
        });
        const termControlHost = termControl.createHost();
        selectHost.append(termControlHost);
        return { control: control, termControl: termControl };
    }

    static getShapeCaseVisibilityConfig(shape, normalizeTermValue = value => TermControl.normalizeTermValue(value)) {
        const calculator = shape.board.calculator;
        return {
            getTermValue: item => item?.term,
            normalizeTermValue: normalizeTermValue,
            getCasesCount: () => shape.getCasesCount(),
            isTerm: value => calculator.isTerm(value),
            getIndependentTermName: () => calculator.properties?.independent?.name,
            getIterationTermName: () => calculator.properties?.iterationTerm
        };
    }

    static shouldShowCaseSelectionForShapeTerm(shape, termValue, normalizeTermValue = value => TermControl.normalizeTermValue(value)) {
        return TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getShapeCaseVisibilityConfig(shape, normalizeTermValue));
    }

    static getShapeCaseNumber(shape, termValue, caseNumber = 1, normalizeTermValue = value => TermControl.normalizeTermValue(value)) {
        if (!TermControl.shouldShowCaseSelectionForShapeTerm(shape, termValue, normalizeTermValue))
            return 1;
        const normalizedCaseNumber = shape.getClampedCaseNumber(caseNumber);
        const casesCount = shape.getCasesCount();
        if (normalizedCaseNumber > casesCount)
            return casesCount;
        return normalizedCaseNumber;
    }

    static getCaseIconText(caseNumber = 1) {
        const normalizedCaseNumber = Math.max(1, Math.min(9, parseInt(caseNumber, 10) || 1));
        return String.fromCodePoint(0xe255 + normalizedCaseNumber);
    }

    static createCaseFieldAddonRenderer() {
        return data => {
            const caseNumber = data?.value ?? 1;
            const iconClass = TermControl.getCaseNumberIconClass(caseNumber);
            const icon = $(`<i class="${iconClass} case-select__icon"></i>`);
            icon.css("color", TermControl.getCaseIconColor(caseNumber));
            return icon;
        };
    }

    static buildShapeCaseItems(shape) {
        const count = shape.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    static createEmptyShapeTermsCollectionItem(includeColor = false) {
        const item = { term: "", case: 1 };
        if (includeColor)
            item.color = "";
        return item;
    }

    static getShapeTermsCollectionSource(shape, propertyName, getFallbackItems = null) {
        const value = shape.properties[propertyName];
        if (Array.isArray(value))
            return value;
        if (typeof getFallbackItems === "function") {
            const fallbackItems = getFallbackItems(shape);
            if (Array.isArray(fallbackItems))
                return fallbackItems;
        }
        return [];
    }

    static normalizeShapeTermsCollection(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const includeColor = options.includeColor === true;
        const source = TermControl.getShapeTermsCollectionSource(shape, propertyName, options.getFallbackItems);
        const selectedItems = [];
        for (let index = 0; index < source.length; index++) {
            const sourceItem = source[index];
            const termValue = normalizeTermValue(sourceItem?.term);
            if (termValue === "")
                continue;
            const normalizedItem = {
                term: termValue,
                case: TermControl.getShapeCaseNumber(shape, termValue, sourceItem?.case ?? 1, normalizeTermValue)
            };
            if (includeColor)
                normalizedItem.color = normalizeColorValue(sourceItem?.color);
            if (sourceItem?.showLabel === true)
                normalizedItem.showLabel = true;
            selectedItems.push(normalizedItem);
        }
        if (selectedItems.length === 0) {
            shape.properties[propertyName] = [TermControl.createEmptyShapeTermsCollectionItem(includeColor)];
            return shape.properties[propertyName];
        }
        shape.properties[propertyName] = [...selectedItems, TermControl.createEmptyShapeTermsCollectionItem(includeColor)];
        return shape.properties[propertyName];
    }

    static getShapeTermsCollectionControlItems(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const includeColor = options.includeColor === true;
        const source = TermControl.getShapeTermsCollectionSource(shape, propertyName, options.getFallbackItems);
        return source.map(sourceItem => {
            const termValue = normalizeTermValue(sourceItem?.term);
            const item = {
                term: termValue,
                case: TermControl.getShapeCaseNumber(shape, termValue, sourceItem?.case ?? 1, normalizeTermValue)
            };
            if (includeColor)
                item.color = normalizeColorValue(sourceItem?.color);
            if (sourceItem?.showLabel === true)
                item.showLabel = true;
            return item;
        });
    }

    static getSelectedShapeTermsCollection(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const includeColor = options.includeColor === true;
        const source = TermControl.getShapeTermsCollectionSource(shape, propertyName, options.getFallbackItems);
        const selectedItems = [];
        for (let index = 0; index < source.length; index++) {
            const sourceItem = source[index];
            const termValue = normalizeTermValue(sourceItem?.term);
            if (termValue === "")
                continue;
            const selectedItem = {
                term: termValue,
                case: TermControl.getShapeCaseNumber(shape, termValue, sourceItem?.case ?? 1, normalizeTermValue)
            };
            if (includeColor)
                selectedItem.color = normalizeColorValue(sourceItem?.color);
            if (sourceItem?.showLabel === true)
                selectedItem.showLabel = true;
            selectedItems.push(selectedItem);
        }
        return selectedItems;
    }

    static getShapeTermsCollectionStateKey(shape, propertyName) {
        const terms = shape.board.calculator.getTermsNames();
        return `${shape.getCasesCount()}|${JSON.stringify(shape.properties[propertyName] ?? [])}|${terms.join(",")}`;
    }

    static buildShapeTermsCollectionTermItems(shape, selectedTerm, normalizeTermValue = value => TermControl.normalizeTermValue(value)) {
        const calculator = shape.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames());
        const normalizedSelectedTerm = normalizeTermValue(selectedTerm);
        if (normalizedSelectedTerm === "")
            return items;
        if (calculator.isTerm(normalizedSelectedTerm))
            return items;
        items.unshift({ text: normalizedSelectedTerm, term: normalizedSelectedTerm });
        return items;
    }

    static applyShapeTermsCollectionMutation(shape, propertyName, options, mutateItems) {
        const items = TermControl.getShapeTermsCollectionControlItems(shape, propertyName, options);
        mutateItems(items);
        shape.properties[propertyName] = items;
        TermControl.normalizeShapeTermsCollection(shape, propertyName, options);
        shape.setPropertyCommand(propertyName, shape.properties[propertyName]);
        if (typeof options.onChanged === "function")
            options.onChanged(shape.properties[propertyName]);
    }

    static createShapeTermsCollectionControl(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const includeColor = options.includeColor === true;
        const caseVisibility = TermControl.getShapeCaseVisibilityConfig(shape, normalizeTermValue);
        const caseFieldAddonRenderer = TermControl.createCaseFieldAddonRenderer();
        const mutationOptions = {
            normalizeTermValue: normalizeTermValue,
            normalizeColorValue: normalizeColorValue,
            includeColor: includeColor,
            getFallbackItems: options.getFallbackItems,
            onChanged: options.onChanged
        };
        return new TermControl({
            hostClassName: options.hostClassName,
            listClassName: options.listClassName,
            rowClassName: options.rowClassName,
            dragHandleClassName: options.dragHandleClassName,
            getItems: () => TermControl.getShapeTermsCollectionControlItems(shape, propertyName, mutationOptions),
            getStateKey: () => TermControl.getShapeTermsCollectionStateKey(shape, propertyName),
            getTermItems: item => TermControl.buildShapeTermsCollectionTermItems(shape, item?.term, normalizeTermValue),
            normalizeTermValue: value => normalizeTermValue(value),
            onItemDeleting: index => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                if (index < 0 || index >= items.length)
                    return;
                items.splice(index, 1);
            }),
            onReorder: (fromIndex, toIndex) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length || fromIndex === toIndex)
                    return;
                const movedItem = items.splice(fromIndex, 1)[0];
                items.splice(toIndex, 0, movedItem);
            }),
            onTermChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                if (!items[index])
                    items[index] = TermControl.createEmptyShapeTermsCollectionItem(includeColor);
                items[index].term = normalizeTermValue(value);
                items[index].case = TermControl.getShapeCaseNumber(shape, items[index].term, items[index].case ?? 1, normalizeTermValue);
                if (includeColor)
                    items[index].color = normalizeColorValue(items[index].color);
            }),
            secondary: {
                width: "42px",
                editorType: "dxDropDownButton",
                caseVisibility: caseVisibility,
                getValue: item => TermControl.getShapeCaseNumber(shape, item?.term, item?.case ?? 1, normalizeTermValue),
                getItems: () => TermControl.buildShapeCaseItems(shape),
                valueExpr: "value",
                displayExpr: "value",
                fieldAddonsBefore: data => caseFieldAddonRenderer(data),
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        return;
                    items[index].case = TermControl.getShapeCaseNumber(shape, items[index].term, value, normalizeTermValue);
                })
            },
            colorSelection: includeColor ? {
                width: "42px",
                show: item => normalizeTermValue(item?.term) !== "",
                getValue: item => normalizeColorValue(item?.color),
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        return;
                    items[index].color = normalizeColorValue(value);
                })
            } : null,
            visibility: options.includeVisibility ? {
                width: "24px",
                getValue: item => item?.showLabel === true,
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        return;
                    items[index].showLabel = value;
                })
            } : null
        });
    }

    constructor(options) {
        this.options = options ?? {};
        this.host = null;
        this.stateKey = null;
        this.secondaryColorSelector = null;
        this.initializeColorSelectionControl();
    }

    createHost() {
        const host = $("<div>").addClass(this.getHostClassName());
        this.host = host;
        this.render(host);
        return host;
    }

    refresh() {
        if (!this.host)
            return;
        const nextStateKey = this.getStateKey();
        if (this.stateKey === nextStateKey)
            return;
        this.render(this.host);
    }

    render(host = this.host) {
        if (!host)
            return;
        this.host = host;
        this.host.empty();
        const listHost = $("<div>").addClass(this.getListClassName());
        const allowItemDeleting = this.shouldAllowItemDeleting();
        const allowReordering = this.shouldAllowReordering();
        this.host.append(listHost);
        const listOptions = {
            dataSource: this.getItems(),
            selectionMode: "none",
            activeStateEnabled: false,
            focusStateEnabled: false,
            hoverStateEnabled: false,
            allowItemDeleting: allowItemDeleting,
            itemDeleteMode: "static",
            noDataText: "",
            itemTemplate: (item, index, element) => this.renderListItem(item, index, element),
            onItemDeleting: e => this.onItemDeleting(e),
            onContentReady: e => this.refreshListVisuals(e.component),
            onItemRendered: e => this.refreshListVisuals(e.component)
        };
        if (allowReordering)
            listOptions.itemDragging = {
                allowReordering: true,
                showDragIcons: false,
                handle: `.${this.getDragHandleClassName().split(" ").join(".")}`,
                onReorder: e => this.onReorder(e)
            };
        listHost.dxList(listOptions);
        this.stateKey = this.getStateKey();
    }

    getItems() {
        const items = this.options.getItems?.();
        if (!Array.isArray(items))
            return [];
        return items.map(item => {
            if (item == null || typeof item !== "object")
                return item;
            return { ...item };
        });
    }

    getStateKey() {
        if (this.options.getStateKey)
            return this.options.getStateKey();
        return JSON.stringify(this.getItems());
    }

    getHostClassName() {
        return this.options.hostClassName ?? "shape-terms-control";
    }

    getListClassName() {
        return this.options.listClassName ?? "shape-terms-list";
    }

    getRowClassName() {
        return this.options.rowClassName ?? "shape-term-row";
    }

    getDragHandleClassName() {
        return this.options.dragHandleClassName ?? "shape-term-drag-handle";
    }

    getSecondaryWidth() {
        const secondary = this.options.secondary;
        if (secondary?.width)
            return secondary.width;
        return "42px";
    }

    getColorSelectionWidth() {
        const colorSelection = this.getColorSelectionOptions();
        if (colorSelection?.width)
            return colorSelection.width;
        return "100px";
    }

    shouldAllowItemDeleting() {
        if (this.options.allowItemDeleting === false)
            return false;
        return true;
    }

    shouldAllowReordering() {
        if (this.options.allowReordering === false)
            return false;
        return true;
    }

    shouldShowDragHandle() {
        if (this.options.showDragHandle === false)
            return false;
        return this.shouldAllowReordering();
    }

    getRowGap() {
        if (this.options.rowGap != null)
            return this.options.rowGap;
        return "8px";
    }

    getRowMarginBottom() {
        if (this.options.rowMarginBottom != null)
            return this.options.rowMarginBottom;
        return "8px";
    }

    shouldShowSecondaryEditor(item, index) {
        const secondary = this.options.secondary;
        if (!secondary)
            return false;
        const caseVisibility = this.getSecondaryCaseVisibility(item, index);
        if (caseVisibility != null) {
            if (!caseVisibility)
                return false;
            if (!secondary.show)
                return true;
            return secondary.show(item, index);
        }
        if (!secondary.show)
            return true;
        return secondary.show(item, index);
    }

    getSecondaryCaseVisibility(item, index) {
        const secondary = this.options.secondary;
        if (!secondary)
            return null;
        const caseVisibility = secondary.caseVisibility;
        if (!caseVisibility)
            return null;
        const termValue = typeof caseVisibility.getTermValue === "function" ? caseVisibility.getTermValue(item, index) : item?.term;
        return TermControl.shouldShowCaseSelectionForTerm(termValue, {
            normalizeTermValue: caseVisibility.normalizeTermValue ?? (value => this.normalizeTermValue(value)),
            getCasesCount: caseVisibility.getCasesCount,
            isTerm: caseVisibility.isTerm,
            getIndependentTermName: caseVisibility.getIndependentTermName,
            independentTermName: caseVisibility.independentTermName,
            getIterationTermName: caseVisibility.getIterationTermName,
            iterationTermName: caseVisibility.iterationTermName
        });
    }

    shouldShowTermEditor(item, index) {
        if (this.options.showTermEditor === false)
            return false;
        return true;
    }

    shouldShowColorEditor(item, index) {
        if (!this.hasColorSelection())
            return false;
        return this.shouldShowColorSelection(item, index);
    }

    getRowTemplateColumns(showSecondary, showColor, item, index, showDragHandle = true, showTermEditor = true) {
        if (this.options.getRowTemplateColumns)
            return this.options.getRowTemplateColumns(showSecondary, showColor, item, index, showDragHandle, showTermEditor);
        const columns = [];
        if (showDragHandle)
            columns.push("24px");
        if (showTermEditor)
            columns.push("minmax(0, 1fr)");
        if (showSecondary)
            columns.push(this.getSecondaryWidth());
        if (showColor)
            columns.push(this.getColorSelectionWidth());
        if (columns.length == 0)
            return "minmax(0, 1fr)";
        return columns.join(" ");
    }

    renderListItem(item, index, element) {
        const showSecondary = this.shouldShowSecondaryEditor(item, index);
        const showColor = this.shouldShowColorEditor(item, index);
        const showDragHandle = this.shouldShowDragHandle();
        const showTermEditor = this.shouldShowTermEditor(item, index);
        const showVisibility = this.shouldShowVisibility(item, index);
        const row = $("<div>").addClass(this.getRowClassName()).css({
            display: "grid",
            gridTemplateColumns: this.getRowTemplateColumns(showSecondary, showColor, item, index, showDragHandle, showTermEditor),
            gap: this.getRowGap(),
            marginBottom: this.getRowMarginBottom()
        });
        if (showDragHandle) {
            const dragHandleHost = $("<div>").addClass(this.getDragHandleClassName());
            $("<i>").addClass("dx-icon dx-icon-dragvertical").appendTo(dragHandleHost);
            row.append(dragHandleHost);
        }
        if (showTermEditor) {
            if (showVisibility) {
                const termWrapper = $("<div>").addClass("term-packed-control");
                const buttonHost = $("<div>").addClass("term-packed-control__button");
                termWrapper.append(buttonHost);
                TermControl.createVisibilityCheckbox(buttonHost, this.getVisibilityValue(item), value => {
                    this.options.visibility.onValueChanged(index, value);
                });
                const selectHost = $("<div>").addClass("term-packed-control__select");
                selectHost.dxSelectBox(this.getTermEditorOptions(item, index));
                termWrapper.append(selectHost);
                row.append(termWrapper);
            } else {
                const termHost = $("<div>").addClass("shape-term-term");
                row.append(termHost);
                termHost.dxSelectBox(this.getTermEditorOptions(item, index));
            }
        }
        if (showSecondary) {
            const secondaryHost = $("<div>").addClass("shape-term-secondary");
            row.append(secondaryHost);
            this.renderSecondaryEditor(secondaryHost, item, index);
        }
        if (showColor) {
            const colorHost = $("<div>").addClass("shape-term-color");
            row.append(colorHost);
            this.renderColorEditor(colorHost, item, index);
        }
        element.append(row);
    }

    renderSecondaryEditor(host, item, index) {
        if (!this.options.secondary)
            return;
        if (this.shouldUseSecondaryDropDownButton())
            return this.renderSecondaryDropDownButton(host, item, index);
        host.dxSelectBox(this.getConfiguredSecondaryEditorOptions(item, index));
    }

    shouldUseSecondaryDropDownButton() {
        const secondary = this.options.secondary;
        if (!secondary)
            return false;
        return secondary.editorType === "dxDropDownButton";
    }

    renderSecondaryDropDownButton(host, item, index) {
        host.dxDropDownButton(this.getSecondaryDropDownButtonOptions(item, index));
    }

    getSecondaryDropDownButtonOptions(item, index) {
        const secondary = this.options.secondary;
        const selectedValue = secondary.getValue(item, index);
        const items = secondary.getItems(item, index);
        return {
            items: items,
            stylingMode: "text",
            useSelectMode: false,
            showArrowIcon: false,
            elementAttr: { class: "shape-term-secondary-dropdown" },
            template: (_, element) => this.renderSecondaryDropDownButtonTemplate(element, item, index, selectedValue),
            itemTemplate: (itemData, itemIndex, element) => this.renderSecondaryDropDownItemTemplate(itemData, itemIndex, element, item, index),
            onItemClick: e => this.onSecondaryDropDownItemClick(e, index)
        };
    }

    renderSecondaryDropDownButtonTemplate(element, item, index, selectedValue) {
        const content = $("<div>").addClass("shape-term-secondary-button");
        const icon = this.createSecondaryIconElement({ value: selectedValue }, item, index);
        if (icon)
            content.append(icon);
        $(element).empty().append(content);
    }

    renderSecondaryDropDownItemTemplate(itemData, itemIndex, element, item, index) {
        const secondary = this.options.secondary;
        if (secondary?.dropDownItemTemplate)
            return secondary.dropDownItemTemplate(itemData, itemIndex, element);
        const content = $("<div>").addClass("shape-term-secondary-item");
        const icon = this.createSecondaryIconElement(itemData, item, index);
        if (icon)
            content.append(icon);
        $(element).empty().append(content);
        return content;
    }

    createSecondaryIconElement(data, item, index) {
        const secondary = this.options.secondary;
        if (!secondary?.fieldAddonsBefore)
            return null;
        const icon = secondary.fieldAddonsBefore(data, item, index);
        if (!icon)
            return null;
        const $icon = $(icon);
        $icon.addClass("shape-term-secondary-icon");
        return $icon;
    }

    onSecondaryDropDownItemClick(event, index) {
        const value = this.resolveSecondaryItemValue(event?.itemData);
        this.onSecondaryValueChanged(index, value);
        if (event?.component?.close)
            event.component.close();
    }

    resolveSecondaryItemValue(itemData) {
        const secondary = this.options.secondary;
        if (!secondary)
            return itemData;
        const valueExpr = secondary.valueExpr;
        if (typeof valueExpr === "function")
            return valueExpr(itemData);
        if (typeof valueExpr === "string")
            return itemData?.[valueExpr];
        if (itemData && typeof itemData === "object" && Object.prototype.hasOwnProperty.call(itemData, "value"))
            return itemData.value;
        return itemData;
    }

    renderColorEditor(host, item, index) {
        if (!this.hasColorSelection())
            return;
        this.renderColorSecondaryEditor(host, item, index);
    }

    getTermEditorOptions(item, index) {
        const providedOptions = this.options.termEditor ?? {};
        const itemTemplate = providedOptions.itemTemplate ?? this.createDefaultTermItemTemplate();
        return {
            value: this.getTermValue(item, index),
            items: this.getTermItems(item, index),
            stylingMode: "filled",
            displayExpr: "text",
            valueExpr: "term",
            placeholder: "",
            acceptCustomValue: false,
            inputAttr: { class: "mdl-variable-selector" },
            elementAttr: { class: "mdl-variable-selector" },
            itemTemplate: itemTemplate,
            onValueChanged: e => this.onTermChanged(index, e.value),
            ...providedOptions
        };
    }

    createDefaultTermItemTemplate() {
        return (data, _, element) => {
            const item = $("<div>").text(data?.text ?? "");
            item.addClass("mdl-variable-selector");
            element.append(item);
            return item;
        };
    }

    getTermValue(item, index) {
        if (this.options.getTermValue)
            return this.options.getTermValue(item, index);
        const term = this.normalizeTermValue(item?.term);
        if (term === "")
            return null;
        return term;
    }

    getTermItems(item, index) {
        if (!this.options.getTermItems)
            return [];
        return this.options.getTermItems(item, index);
    }

    normalizeTermValue(value) {
        if (this.options.normalizeTermValue)
            return this.options.normalizeTermValue(value);
        if (value == null)
            return "";
        return String(value).trim();
    }

    getConfiguredSecondaryEditorOptions(item, index) {
        const secondary = this.options.secondary;
        const fieldAddons = this.getSecondaryFieldAddons(item, index);
        return {
            value: secondary.getValue(item, index),
            items: secondary.getItems(item, index),
            valueExpr: secondary.valueExpr,
            displayExpr: secondary.displayExpr,
            stylingMode: "filled",
            fieldAddons: fieldAddons,
            itemTemplate: secondary.itemTemplate,
            onValueChanged: e => this.onSecondaryValueChanged(index, e.value)
        };
    }

    renderColorSecondaryEditor(host, item, index) {
        const colorSelection = this.getColorSelectionOptions();
        const colorValue = this.getColorValue(item, index);
        const editor = this.secondaryColorSelector.createEditor(colorValue, value => this.onColorValueChanged(index, value), colorSelection?.editorOptions);
        editor.css("width", "100%");
        host.append(editor);
    }

    getSecondaryFieldAddons(item, index) {
        const secondary = this.options.secondary;
        if (!secondary || !secondary.fieldAddonsBefore)
            return {};
        return { before: data => secondary.fieldAddonsBefore(data, item, index) };
    }

    getColorSelectionOptions() {
        return this.options.colorSelection ?? null;
    }

    initializeColorSelectionControl() {
        const colorSelection = this.getColorSelectionOptions();
        if (!colorSelection)
            return;
        if (colorSelection.control instanceof ColorControl) {
            this.secondaryColorSelector = colorSelection.control;
            return;
        }
        this.secondaryColorSelector = new ColorControl(colorSelection.controlOptions);
    }

    hasColorSelection() {
        return this.secondaryColorSelector != null;
    }

    hasVisibility() {
        return this.options.visibility != null;
    }

    shouldShowVisibility(item, index) {
        if (!this.hasVisibility())
            return false;
        const visibility = this.options.visibility;
        if (visibility.show)
            return visibility.show(item, index);
        return true;
    }

    getVisibilityValue(item) {
        if (!this.options.visibility?.getValue)
            return false;
        return this.options.visibility.getValue(item);
    }

    shouldShowColorSelection(item, index) {
        const colorSelection = this.getColorSelectionOptions();
        if (!colorSelection)
            return false;
        if (!colorSelection.show)
            return this.normalizeTermValue(item?.term) !== "";
        return colorSelection.show(item, index);
    }

    getColorValue(item, index) {
        const colorSelection = this.getColorSelectionOptions();
        if (colorSelection?.getValue)
            return colorSelection.getValue(item, index);
        return this.normalizeColorValue(item?.color);
    }

    normalizeColorValue(value) {
        if (value == null)
            return "";
        return String(value).trim();
    }

    onItemDeleting(event) {
        event.cancel = true;
        if (this.options.onItemDeleting)
            this.options.onItemDeleting(event.itemIndex);
        this.render();
    }

    onReorder(event) {
        if (this.options.onReorder)
            this.options.onReorder(event.fromIndex, event.toIndex);
        this.render();
    }

    onTermChanged(index, value) {
        if (this.options.onTermChanged)
            this.options.onTermChanged(index, value);
        this.render();
    }

    onSecondaryValueChanged(index, value) {
        const secondary = this.options.secondary;
        if (secondary?.onValueChanged)
            secondary.onValueChanged(index, value);
        this.render();
    }

    onColorValueChanged(index, value) {
        const colorSelection = this.getColorSelectionOptions();
        if (colorSelection?.onValueChanged)
            colorSelection.onValueChanged(index, value);
        this.render();
    }

    refreshListVisuals(listInstance) {
        if (!listInstance)
            return;
        this.updateDeleteIcons(listInstance);
    }

    updateDeleteIcons(listInstance) {
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
}
