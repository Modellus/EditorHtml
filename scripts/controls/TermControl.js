class TermControl {
    // The list of terms is given the height the units picker gives its own list: the drop down it is
    // dressed after is 240 tall and spends 34 of them on the line the reader writes in.
    static termTreeMaxHeight = 206;
    static directionModes = [
        { value: "angle", icon: "fa-light fa-angle", hint: "Angle" },
        { value: "orientation", icon: "fa-light fa-arrow-up-right", hint: "Orientation" }
    ];
    static directionPairValue = "orientation";

    static getShapeOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup ${extraClass}` : "mdl-shape-overlay-popup";
        return { class: wrapperClassName };
    }

    static getShapeNestedOverlayWrapperAttr(extraClass = "") {
        const wrapperClassName = extraClass ? `mdl-shape-overlay-popup mdl-shape-overlay-popup-nested ${extraClass}` : "mdl-shape-overlay-popup mdl-shape-overlay-popup-nested";
        return { class: wrapperClassName };
    }

    static normalizeTermsCollectionMode(storedMode, storedExtraTerm, modeOptions) {
        const values = modeOptions.items.map(item => item.value);
        if (values.includes(String(storedMode)))
            return String(storedMode);
        return String(storedExtraTerm ?? "") === "" ? values[0] : modeOptions.pairValue;
    }

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

    static isMissingTermReference(calculator, value, allowNumeric = true) {
        const term = TermControl.normalizeTermValue(value);
        if (term === "")
            return false;
        if (calculator.isTerm(term))
            return false;
        if (allowNumeric && Number.isFinite(Number(term)))
            return false;
        return true;
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
        return Utils.getCaseNumberIconClass(caseNumber);
    }

    static getCaseIconColor(caseNumber = 1) {
        return Utils.getCaseIconColor(caseNumber);
    }

    static createCaseIcon(caseNumber, className = "case-select__icon") {
        return $(Utils.createCaseIconHost(caseNumber, className));
    }

    static getVisibilityIconClass(value) {
        if (value)
            return "fa-light fa-eye";
        return "fa-light fa-eye-closed";
    }

    static getVisibilityLabel(value) {
        if (value)
            return "Visible";
        return "Hidden";
    }

    static getLockIconClass(locked) {
        if (locked)
            return "fa-light fa-lock";
        return "fa-light fa-lock-open";
    }

    static getLockLabel(locked) {
        if (locked)
            return "Locked";
        return "Movable / Resizable";
    }

    static updateToggleCheckboxIcon(checkboxInstance, getIconClass, iconClassName) {
        if (!checkboxInstance)
            return;
        const iconContainer = checkboxInstance.element().find(".dx-checkbox-icon");
        if (iconContainer.length == 0)
            return;
        iconContainer.empty();
        const iconClass = getIconClass(checkboxInstance.option("value") === true);
        $("<i>").addClass(`${iconClass} ${iconClassName}`).appendTo(iconContainer);
    }

    // Every switch a term row carries is the same checkbox wearing a different pair of icons — the
    // eye, the lock, the hand — so one builder makes them all and a shape hanging a switch of its own
    // on a row is given the one the eye and the lock already are.
    static createToggleCheckbox(buttonHost, initialValue, getIconClass, onValueChanged, options = {}) {
        const checkboxClassName = options.checkboxClassName ?? "term-packed-lock-checkbox";
        const iconClassName = options.iconClassName ?? "term-packed-lock-icon";
        return buttonHost.dxCheckBox({
            value: initialValue === true,
            elementAttr: { class: checkboxClassName },
            onContentReady: e => TermControl.updateToggleCheckboxIcon(e.component, getIconClass, iconClassName),
            onValueChanged: e => {
                TermControl.updateToggleCheckboxIcon(e.component, getIconClass, iconClassName);
                onValueChanged(e.value === true);
            }
        }).dxCheckBox("instance");
    }

    static createLockCheckbox(buttonHost, initialValue, onValueChanged, options = {}) {
        return TermControl.createToggleCheckbox(buttonHost, initialValue, locked => TermControl.getLockIconClass(locked), onValueChanged, options);
    }

    static getInteractableIconClass(interactable) {
        if (interactable)
            return "fa-light fa-hand-pointer";
        return "fa-light fa-hand";
    }

    static getInteractableLabel(interactable) {
        if (interactable)
            return "Interactable";
        return "Not Interactable";
    }

    static createInteractableCheckbox(buttonHost, initialValue, onValueChanged, options = {}) {
        return TermControl.createToggleCheckbox(buttonHost, initialValue, interactable => TermControl.getInteractableIconClass(interactable), onValueChanged, options);
    }

    static createVisibilityCheckbox(buttonHost, initialValue, onValueChanged, options = {}) {
        return TermControl.createToggleCheckbox(buttonHost, initialValue, visible => TermControl.getVisibilityIconClass(visible), onValueChanged, {
            checkboxClassName: options.checkboxClassName ?? "term-packed-checkbox",
            iconClassName: options.iconClassName ?? "term-packed-checkbox-icon"
        });
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

    // A value the reader types is an input, not a reading, so it is kept as written instead of
    // being rounded to the model's display precision. Anything that is not a number is left
    // alone, so a term name can still be typed.
    static normalizeExactTypedValue(value) {
        const normalizedValue = TermControl.normalizeBaseShapeTermValue(value);
        if (typeof normalizedValue !== "string")
            return normalizedValue;
        const trimmedValue = normalizedValue.trim();
        if (trimmedValue === "")
            return trimmedValue;
        const numeric = Number(trimmedValue);
        return Number.isFinite(numeric) ? String(numeric) : trimmedValue;
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
        // See getShapeCaseNumber: preserve the stored case whenever the model has
        // multiple cases, rather than resetting to 1 while a term is transiently
        // unrecognized (e.g. before expressions are parsed on load).
        const casesCount = baseShape.getCasesCount();
        if (!Number.isFinite(casesCount) || casesCount <= 1)
            return 1;
        const normalizedCaseNumber = baseShape.getClampedCaseNumber(caseNumber);
        if (normalizedCaseNumber > casesCount)
            return casesCount;
        return normalizedCaseNumber;
    }

    static buildBaseShapeCaseItems(baseShape) {
        const count = baseShape.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    static createBaseShapeCaseFieldAddonRenderer(baseShape) {
        return data => TermControl.createCaseIcon(data?.value ?? 1);
    }

    static createBaseShapeCaseItemTemplate(baseShape) {
        return (itemData, _, element) => {
            const content = $("<div>").addClass("case-select");
            content.append(TermControl.createCaseIcon(itemData.value));
            const label = $("<span>").addClass("case-select__label").text(itemData.value);
            content.append(label);
            element.append(content);
        };
    }

    static getBaseShapeTermSelectItems(baseShape, term, normalizeCustomValue = null) {
        const calculator = baseShape.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames(), calculator.system);
        const selectedValue = TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]);
        if (selectedValue === "")
            return items;
        if (calculator.isTerm(selectedValue))
            return items;
        // The list offers the terms the model holds. A plain value is not one of them and is read on
        // the field itself, so repeating it here would offer the reader what they already have.
        if (TermControl.isPlainValue(selectedValue))
            return items;
        const formatValue = normalizeCustomValue ?? (value => TermControl.normalizeBaseShapeCustomTermValue(baseShape, value));
        items.unshift({ text: formatValue(selectedValue), term: selectedValue });
        return items;
    }

    static getBaseShapeTermControlStateKey(baseShape, term, caseProperty, colorProperty = "", extraTermProperty = "", modeProperty = "") {
        const selectedTerm = TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]);
        const selectedCase = TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1);
        const lockedProperty = `${term}Locked`;
        const locked = baseShape.properties[lockedProperty] === true;
        const terms = baseShape.board.calculator.getTermsNames();
        const color = colorProperty ? TermControl.normalizeColorValue(baseShape.properties[colorProperty]) : "";
        const extraTerm = extraTermProperty ? TermControl.normalizeBaseShapeTermValue(baseShape.properties[extraTermProperty]) : "";
        const mode = modeProperty ? String(baseShape.properties[modeProperty] ?? "") : "";
        const unit = baseShape.board.calculator.getTermUnit(selectedTerm);
        return `${selectedTerm}|${selectedCase}|${locked}|${baseShape.getCasesCount()}|${terms.join(",")}|${caseProperty}|${color}|${extraTerm}|${mode}|${unit}`;
    }

    // A term selector can carry the colour of whatever the term drives, so the choice of what to
    // show and the choice of how it looks are made in the same row. The property the swatch writes
    // is named by the caller, which is how a component definition asks for one.
    static createBaseShapeTermColorSelection(baseShape, colorProperty) {
        if (!colorProperty)
            return null;
        return {
            control: baseShape.getColorControl(),
            show: () => true,
            getValue: () => TermControl.normalizeColorValue(baseShape.properties[colorProperty]),
            onValueChanged: (_, value) => {
                baseShape.setPropertyCommand(colorProperty, TermControl.normalizeColorValue(value));
                baseShape.board.markDirty(baseShape);
            }
        };
    }

    // Units belong to the term, not to the shape reading it, so the selector that names a term is
    // also where its unit is chosen: whoever picks x picks metres in the same place, and every
    // toolbar that borrows this control gets the choice without asking for it.
    static createTermUnitsSelection(board, valueUnits = null) {
        return {
            getValue: termName => board.calculator.getTermUnit(termName),
            isTerm: termName => board.calculator.isTerm(termName),
            onValueChanged: (termName, unitText) => board.shell.setTermUnitCommand(termName, unitText),
            // A row may hold a plain value rather than a term — 100 — and a plain value is measured in
            // something too: it is set to 100 m here the same way a term is. That unit belongs to
            // whoever wrote the value rather than to the model, so the surface says where it is kept.
            valueUnits: valueUnits
        };
    }

    // A value's unit is kept beside the value: the property holding 100 has a unit property of its
    // own, the way it already has a case and a lock of its own.
    static getValueUnitProperty(termProperty) {
        return `${termProperty}Unit`;
    }

    static createBaseShapeValueUnitsSelection(baseShape, unitProperty) {
        if (!unitProperty)
            return null;
        return {
            getValue: () => baseShape.properties[unitProperty] ?? "",
            onValueChanged: unitText => baseShape.setPropertyCommand(unitProperty, String(unitText ?? "").trim())
        };
    }

    // A row may name a pair rather than a single term — how far across and how far up — and the
    // second one is a property of its own, written by a selector beside the first and read in the
    // case the row names.
    static createBaseShapeModeSelection(baseShape, formInstance, modeProperty, modeItems, pairValue, synchronize) {
        if (!modeProperty || modeItems.length === 0)
            return null;
        return {
            items: modeItems,
            pairValue: pairValue,
            getValue: () => String(baseShape.properties[modeProperty] ?? modeItems[0].value),
            onValueChanged: (_, value) => {
                formInstance.updateData(modeProperty, value);
                synchronize();
                baseShape.board.markDirty(baseShape);
            }
        };
    }

    // A caller that decides elsewhere whether the pair is read — a choice made in the toolbar rather
    // than on the row — says so with a test of its own; anyone else always offers the second selector.
    static createBaseShapeExtraTermSelection(baseShape, formInstance, extraTermProperty, normalizeCustomValue, synchronize, show = null) {
        if (!extraTermProperty)
            return null;
        return {
            show: show ?? (() => true),
            getValue: () => TermControl.normalizeBaseShapeTermValue(baseShape.properties[extraTermProperty]),
            getTermItems: () => TermControl.getBaseShapeTermSelectItems(baseShape, extraTermProperty, normalizeCustomValue),
            onValueChanged: (_, value) => {
                formInstance.updateData(extraTermProperty, TermControl.normalizeBaseShapeTermValue(value));
                synchronize();
                baseShape.board.markDirty(baseShape);
            },
            onCustomItemCreating: event => {
                formInstance.updateData(extraTermProperty, normalizeCustomValue(event.text));
                synchronize();
                baseShape.board.markDirty(baseShape);
            }
        };
    }

    static syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl = null) {
        const caseValue = TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1);
        if (baseShape.properties[caseProperty] !== caseValue)
            formInstance.updateData(caseProperty, caseValue);
        const control = termControl ?? baseShape.termFormControls?.[term]?.termControl;
        if (control)
            control.refresh();
    }

    static createBaseShapeTermFormControl(baseShape, formInstance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true, options = {}) {
        const normalizeCustomValue = options.exactTypedValue === true
            ? value => TermControl.normalizeExactTypedValue(value)
            : value => TermControl.normalizeBaseShapeCustomTermValue(baseShape, value);
        if (!baseShape.termDisplayEntries.some(entry => entry.term === term))
            baseShape.termDisplayEntries.push({ term: term, caseProperty: caseProperty });
        const extraTermProperty = options.extraTermProperty ?? "";
        const modeProperty = options.modeProperty ?? "";
        const includeLock = options.includeLock !== false;
        const lockedProperty = `${term}Locked`;
        if (includeLock && baseShape.properties[lockedProperty] == null)
            baseShape.properties[lockedProperty] = false;
        const control = $("<div>").addClass("term-packed-control");
        const selectHost = $("<div>").addClass("term-packed-control__select");
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
            getItems: () => [{ term: options.blank === true ? "" : TermControl.normalizeBaseShapeTermValue(baseShape.properties[term]), case: TermControl.getBaseShapeCaseNumber(baseShape, baseShape.properties[term], baseShape.properties[caseProperty] ?? 1), locked: baseShape.properties[lockedProperty] === true }],
            getStateKey: () => TermControl.getBaseShapeTermControlStateKey(baseShape, term, caseProperty, options.colorProperty ?? "", extraTermProperty, modeProperty),
            mode: TermControl.createBaseShapeModeSelection(baseShape, formInstance, modeProperty, options.modeItems ?? [], options.modePairValue ?? "", () => TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl)),
            colorSelection: TermControl.createBaseShapeTermColorSelection(baseShape, options.colorProperty ?? ""),
            units: TermControl.createTermUnitsSelection(baseShape.board, TermControl.createBaseShapeValueUnitsSelection(baseShape, options.valueUnitProperty === undefined ? TermControl.getValueUnitProperty(term) : options.valueUnitProperty)),
            extraTerm: TermControl.createBaseShapeExtraTermSelection(baseShape, formInstance, extraTermProperty, normalizeCustomValue, () => TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl), options.showExtraTerm ?? null),
            getTermItems: () => TermControl.getBaseShapeTermSelectItems(baseShape, term, normalizeCustomValue),
            getBoard: () => baseShape.board,
            getSystem: () => baseShape.board?.calculator?.system,
            allowNumericTermReference: true,
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
                customValuePlaceholder: options.customValuePlaceholder ?? "",
                disabled: options.disabled === true,
                onOpened: _ => TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl),
                onCustomItemCreating: event => {
                    const customValue = normalizeCustomValue(event.text);
                    formInstance.updateData(term, customValue);
                    event.component.option("value", customValue);
                    event.customItem = { text: customValue, term: customValue };
                    const caseNumber = TermControl.getBaseShapeCaseNumber(baseShape, customValue, baseShape.properties[caseProperty] ?? 1);
                    formInstance.updateData(caseProperty, caseNumber);
                    TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl);
                    baseShape.board.markDirty(baseShape);
                }
            },
            visibility: showVisibilityToggle ? {
                getValue: () => {
                    const displayModeValue = baseShape.properties[displayModeProperty] ?? "none";
                    return displayModeValue !== false && displayModeValue !== "none";
                },
                onValueChanged: (_, value) => {
                    baseShape.setPropertyCommand(displayModeProperty, value ? "nameValue" : "none");
                    baseShape.board.markDirty(baseShape);
                }
            } : null,
            secondary: {
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
            },
            features: options.features,
            lock: includeLock ? {
                getValue: item => item?.locked === true,
                onValueChanged: (_, value) => {
                    formInstance.updateData(lockedProperty, value);
                    TermControl.syncBaseShapeTermControl(baseShape, formInstance, term, caseProperty, termControl);
                }
            } : null
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
        // Only a genuinely single-case model collapses to case 1. We must NOT gate
        // this on shouldShowCaseSelection: during load the expressions may not be
        // parsed yet, so the term reads as "unknown" and the selector is hidden,
        // but the stored case still has to be preserved so it survives the round
        // trip. Whether the selector is shown is decided separately by the caller.
        const casesCount = shape.getCasesCount();
        if (!Number.isFinite(casesCount) || casesCount <= 1)
            return 1;
        const normalizedCaseNumber = shape.getClampedCaseNumber(caseNumber);
        if (normalizedCaseNumber > casesCount)
            return casesCount;
        return normalizedCaseNumber;
    }

    static createCaseFieldAddonRenderer() {
        return data => TermControl.createCaseIcon(data?.value ?? 1);
    }

    static buildShapeCaseItems(shape) {
        const count = shape.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    static createEmptyShapeTermsCollectionItem(includeColor = false, options = {}) {
        const item = { term: "", case: 1 };
        if (includeColor)
            item.color = "";
        if (typeof options.createEmptyItem === "function") {
            const extraItem = options.createEmptyItem();
            if (extraItem && typeof extraItem === "object")
                Object.assign(item, extraItem);
        }
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
        const normalizeItem = options.normalizeItem;
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
            if (sourceItem?.locked === true)
                normalizedItem.locked = true;
            if (typeof normalizeItem === "function")
                normalizeItem(sourceItem, normalizedItem, index);
            selectedItems.push(normalizedItem);
        }
        if (selectedItems.length === 0) {
            shape.properties[propertyName] = [TermControl.createEmptyShapeTermsCollectionItem(includeColor, options)];
            return shape.properties[propertyName];
        }
        shape.properties[propertyName] = [...selectedItems, TermControl.createEmptyShapeTermsCollectionItem(includeColor, options)];
        return shape.properties[propertyName];
    }

    static getShapeTermsCollectionControlItems(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const normalizeItem = options.normalizeItem;
        const includeColor = options.includeColor === true;
        const source = TermControl.getShapeTermsCollectionSource(shape, propertyName, options.getFallbackItems);
        return source.map((sourceItem, index) => {
            const termValue = normalizeTermValue(sourceItem?.term);
            const item = {
                term: termValue,
                case: TermControl.getShapeCaseNumber(shape, termValue, sourceItem?.case ?? 1, normalizeTermValue)
            };
            if (includeColor)
                item.color = normalizeColorValue(sourceItem?.color);
            if (sourceItem?.showLabel === true)
                item.showLabel = true;
            if (sourceItem?.locked === true)
                item.locked = true;
            if (typeof normalizeItem === "function")
                normalizeItem(sourceItem, item, index);
            return item;
        });
    }

    static getSelectedShapeTermsCollection(shape, propertyName, options = {}) {
        const normalizeTermValue = options.normalizeTermValue ?? (value => TermControl.normalizeTermValue(value));
        const normalizeColorValue = options.normalizeColorValue ?? (value => TermControl.normalizeColorValue(value));
        const normalizeItem = options.normalizeItem;
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
            if (sourceItem?.locked === true)
                selectedItem.locked = true;
            if (typeof normalizeItem === "function")
                normalizeItem(sourceItem, selectedItem, index);
            selectedItems.push(selectedItem);
        }
        return selectedItems;
    }

    static getShapeTermsCollectionStateKey(shape, propertyName) {
        const terms = shape.board.calculator.getTermsNames();
        const units = terms.map(termName => shape.board.calculator.getTermUnit(termName)).join(",");
        return `${shape.getCasesCount()}|${JSON.stringify(shape.properties[propertyName] ?? [])}|${terms.join(",")}|${units}`;
    }

    static buildShapeTermsCollectionTermItems(shape, selectedTerm, normalizeTermValue = value => TermControl.normalizeTermValue(value)) {
        const calculator = shape.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames(), calculator.system);
        const normalizedSelectedTerm = normalizeTermValue(selectedTerm);
        if (normalizedSelectedTerm === "")
            return items;
        if (calculator.isTerm(normalizedSelectedTerm))
            return items;
        items.unshift({ text: normalizedSelectedTerm, term: normalizedSelectedTerm });
        return items;
    }

    static buildTermTreeItems(board, flatItems) {
        const bodies = board?.calculator?.physicalEngine?.bodies ?? [];
        if (bodies.length === 0)
            return flatItems.map(item => ({ id: item.term || `__empty_${item.text}`, text: item.text, term: item.term }));
        const physicalTermNames = new Set();
        const physicalTermsByBody = new Map();
        const suffixes = ["x", "y", "vx", "vy", "ax", "ay", "mass"];
        for (const body of bodies) {
            const bodyTerms = suffixes.map(suffix => `${body.name}.${suffix}`);
            physicalTermsByBody.set(body.name, bodyTerms);
            bodyTerms.forEach(t => physicalTermNames.add(t));
        }
        const treeItems = [];
        for (const [bodyName, bodyTerms] of physicalTermsByBody) {
            const groupId = `__body__${bodyName}`;
            treeItems.push({ id: groupId, text: bodyName, expanded: false });
            for (const termName of bodyTerms) {
                if (flatItems.some(f => f.term === termName))
                    treeItems.push({ id: termName, text: termName.substring(bodyName.length + 1), term: termName, parentId: groupId });
            }
        }
        for (const item of flatItems) {
            if (!physicalTermNames.has(item.term))
                treeItems.push({ id: item.term || `__custom_${item.text}`, text: item.text, term: item.term });
        }
        return treeItems;
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
        const configuredColorSelection = options.colorSelection ?? {};
        const caseVisibility = TermControl.getShapeCaseVisibilityConfig(shape, normalizeTermValue);
        const caseFieldAddonRenderer = TermControl.createCaseFieldAddonRenderer();
        const mutationOptions = {
            normalizeTermValue: normalizeTermValue,
            normalizeColorValue: normalizeColorValue,
            normalizeItem: options.normalizeItem,
            createEmptyItem: options.createEmptyItem,
            includeColor: includeColor,
            getFallbackItems: options.getFallbackItems,
            onChanged: options.onChanged
        };
        const lockOptions = options.includeLock === true ? {
            getValue: item => item?.locked === true,
            onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                if (!items[index])
                    return;
                items[index].locked = value;
            })
        } : null;
        return new TermControl({
            hostClassName: options.hostClassName,
            listClassName: options.listClassName,
            rowClassName: options.rowClassName,
            dragHandleClassName: options.dragHandleClassName,
            termEditor: options.termEditor,
            getItems: () => TermControl.getShapeTermsCollectionControlItems(shape, propertyName, mutationOptions),
            getStateKey: () => TermControl.getShapeTermsCollectionStateKey(shape, propertyName),
            getTermItems: options.getTermItems ?? (item => TermControl.buildShapeTermsCollectionTermItems(shape, item?.term, normalizeTermValue)),
            getBoard: () => shape.board,
            getSystem: () => shape.board?.calculator?.system,
            allowNumericTermReference: options.allowNumericTermReference === true,
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
                    items[index] = TermControl.createEmptyShapeTermsCollectionItem(includeColor, mutationOptions);
                items[index].term = normalizeTermValue(value);
                items[index].case = TermControl.getShapeCaseNumber(shape, items[index].term, items[index].case ?? 1, normalizeTermValue);
                if (includeColor)
                    items[index].color = normalizeColorValue(items[index].color);
            }),
            secondary: options.includeCase === false ? null : {
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
                show: configuredColorSelection.show ?? (item => normalizeTermValue(item?.term) !== ""),
                getValue: configuredColorSelection.getValue ?? (item => normalizeColorValue(item?.color)),
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        return;
                    items[index].color = normalizeColorValue(value);
                }),
                editorOptions: configuredColorSelection.editorOptions,
                control: configuredColorSelection.control,
                controlOptions: configuredColorSelection.controlOptions
            } : null,
            mode: options.mode ? {
                width: options.mode.width,
                items: options.mode.items,
                pairValue: options.mode.pairValue,
                getValue: item => TermControl.normalizeTermsCollectionMode(item?.[options.mode.field], item?.[options.extraTerm.field], options.mode),
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        items[index] = TermControl.createEmptyShapeTermsCollectionItem(includeColor, mutationOptions);
                    items[index][options.mode.field] = value;
                    if (value !== options.mode.pairValue)
                        items[index][options.extraTerm.field] = "";
                })
            } : null,
            // A row that names a pair rather than a single term carries the second one in a field of
            // its own, edited by a selector beside the first and read in the same case.
            extraTerm: options.extraTerm ? {
                show: options.extraTerm.show,
                getValue: item => normalizeTermValue(item?.[options.extraTerm.field]),
                getTermItems: item => TermControl.buildShapeTermsCollectionTermItems(shape, item?.[options.extraTerm.field], normalizeTermValue),
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        items[index] = TermControl.createEmptyShapeTermsCollectionItem(includeColor, mutationOptions);
                    items[index][options.extraTerm.field] = normalizeTermValue(value);
                })
            } : null,
            visibility: options.includeVisibility ? {
                getValue: item => item?.showLabel === true,
                onValueChanged: (index, value) => TermControl.applyShapeTermsCollectionMutation(shape, propertyName, mutationOptions, items => {
                    if (!items[index])
                        return;
                    items[index].showLabel = value;
                })
            } : null,
            lock: lockOptions,
            features: options.features,
            units: TermControl.createTermUnitsSelection(shape.board)
        });
    }

    constructor(options) {
        this.options = options ?? {};
        this.host = null;
        this.stateKey = null;
        this.secondaryColorSelector = null;
        this.openEditorIndex = null;
        this.openEditorRowSignature = "";
        this.pendingRender = false;
        this.termChipEditors = {};
        this.termChipContents = {};
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

    // The unit, the case and the colour are written from inside the chip's own drop down, and each
    // of them asks for the list to be drawn again. Redrawing it would take the drop down being
    // written in with it, so while one is open the row is left standing and only the chip it belongs
    // to is brought up to date; the list is drawn again once the drop down closes.
    render(host = this.host) {
        if (!host)
            return;
        if (this.hasOpenTermEditor()) {
            this.pendingRender = true;
            this.stateKey = this.getStateKey();
            this.refreshOpenTermEditor();
            return;
        }
        this.openEditorIndex = null;
        this.pendingRender = false;
        this.host = host;
        this.termChipEditors = {};
        this.termChipContents = {};
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

    hasMode() {
        return this.options.mode != null;
    }

    shouldShowModeSelector(item, index) {
        if (!this.hasMode())
            return false;
        const mode = this.options.mode;
        if (mode.show)
            return mode.show(item, index);
        return true;
    }

    getModeValue(item, index) {
        return String(this.options.mode.getValue(item, index) ?? this.options.mode.items[0].value);
    }

    isPairMode(item, index) {
        if (!this.hasMode())
            return false;
        return this.getModeValue(item, index) === String(this.options.mode.pairValue ?? this.options.mode.items[1].value);
    }

    renderModeSelector(host, item, index) {
        const mode = this.options.mode;
        host.dxButtonGroup({
            items: mode.items,
            keyExpr: "value",
            selectionMode: "single",
            selectedItemKeys: [this.getModeValue(item, index)],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
            },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onItemClick: event => this.onModeValueChanged(index, event.itemData.value)
        });
    }

    onModeValueChanged(index, value) {
        this.options.mode.onValueChanged(index, value);
        this.render();
    }

    hasExtraTerm() {
        return this.options.extraTerm != null;
    }

    // The second selector belongs to a row that already names something: the empty row at the end of
    // the list offers one term, and the pair is offered once that term is chosen.
    shouldShowExtraTermEditor(item, index) {
        if (!this.hasExtraTerm())
            return false;
        const extraTerm = this.options.extraTerm;
        if (this.hasMode())
            return this.isPairMode(item, index);
        if (extraTerm.show)
            return extraTerm.show(item, index);
        return this.normalizeTermValue(item?.term) !== "";
    }

    getExtraTermValue(item, index) {
        const value = this.normalizeTermValue(this.options.extraTerm.getValue(item, index));
        if (value === "")
            return null;
        return value;
    }

    getExtraTermItems(item, index) {
        return this.options.extraTerm.getTermItems(item, index);
    }

    // Everything a row carries besides the term itself is a feature: the switches and pickers every
    // shape may turn on — the eye, the colour, the case, the lock — and the ones a shape hangs on a
    // row of its own, a chart's Type or a frequency chart's Series. Each of them is written under a
    // label of its own when the chip is opened and leaves a mark on the chip while it is closed, so
    // a row says what it holds without being opened. One set of methods serves them all, so a
    // shape's own feature is given the drop down, the switch and the mark the lock already has.
    getFeatures() {
        const injectedFeatures = Array.isArray(this.options.features) ? this.options.features : [];
        if (!this.hasLock())
            return injectedFeatures;
        return [...injectedFeatures, this.getLockFeature()];
    }

    hasLock() {
        return this.options.lock != null;
    }

    getLockFeature() {
        const lock = this.options.lock;
        return {
            ...lock,
            label: lock.label ?? "Locked",
            className: lock.className ?? "shape-term-lock",
            getValue: lock.getValue ?? (item => item?.locked === true),
            getIconClass: lock.getIconClass ?? (locked => TermControl.getLockIconClass(locked === true))
        };
    }

    getFeatureLabel(feature) {
        return feature.label ?? "";
    }

    getFeatureClassName(feature) {
        return feature.className ?? "shape-term-feature";
    }

    shouldShowFeatureEditor(feature, item, index) {
        if (feature.show)
            return feature.show(item, index);
        return this.normalizeTermValue(item?.term) !== "";
    }

    getFeatureValue(feature, item, index) {
        if (feature.getValue)
            return feature.getValue(item, index);
        return item?.[feature.key];
    }

    renderFeatureEditor(feature, host, item, index) {
        if (this.shouldUseFeatureDropDownButton(feature))
            return this.renderFeatureDropDownButton(feature, host, item, index);
        TermControl.createToggleCheckbox(host, this.getFeatureValue(feature, item, index) === true, feature.getIconClass, value => this.onFeatureValueChanged(feature, index, value));
    }

    shouldUseFeatureDropDownButton(feature) {
        return feature.editorType === "dxDropDownButton";
    }

    renderFeatureDropDownButton(feature, host, item, index) {
        host.dxDropDownButton(this.getFeatureDropDownButtonOptions(feature, item, index));
    }

    getFeatureDropDownButtonOptions(feature, item, index) {
        const selectedValue = this.getFeatureValue(feature, item, index);
        const items = typeof feature.getItems === "function" ? feature.getItems(item, index) : [];
        const dropDownOptions = typeof feature.dropDownOptions === "function" ? feature.dropDownOptions(item, index) : (feature.dropDownOptions ?? {});
        return {
            items: items,
            stylingMode: "text",
            useSelectMode: false,
            showArrowIcon: false,
            elementAttr: { class: "shape-term-feature-dropdown" },
            template: (_, element) => this.renderFeatureDropDownButtonTemplate(feature, element, item, index, selectedValue, items),
            itemTemplate: (itemData, itemIndex, element) => this.renderFeatureDropDownItemTemplate(feature, itemData, itemIndex, element, item, index),
            onItemClick: event => this.onFeatureDropDownItemClick(feature, event, index),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup"),
                ...dropDownOptions
            }
        };
    }

    renderFeatureDropDownButtonTemplate(feature, element, item, index, selectedValue, items) {
        if (feature.buttonTemplate)
            return feature.buttonTemplate(element, item, index, selectedValue, items);
        const iconClassName = this.getFeatureSelectedIconClass(feature, items, selectedValue);
        $(element).empty().append(`<div class="shape-term-secondary-button"><i class="${iconClassName} shape-term-secondary-icon"></i></div>`);
    }

    renderFeatureDropDownItemTemplate(feature, itemData, itemIndex, element, item, index) {
        if (feature.itemTemplate)
            return feature.itemTemplate(itemData, itemIndex, element, item, index);
        const itemText = itemData?.text ?? String(itemData ?? "");
        const iconClassName = itemData?.icon ?? "fa-light fa-chart-line";
        const content = `<div class="shape-term-secondary-item" style="display:flex;align-items:center;justify-content:flex-start;gap:8px;width:100%"><i class="${iconClassName} shape-term-secondary-icon"></i><span>${itemText}</span></div>`;
        $(element).empty().append(content);
    }

    getFeatureSelectedIconClass(feature, items, selectedValue) {
        return this.findFeatureSelectedItem(feature, items, selectedValue)?.icon ?? "fa-light fa-chart-line";
    }

    findFeatureSelectedItem(feature, items, selectedValue) {
        if (!Array.isArray(items))
            return null;
        for (let index = 0; index < items.length; index++) {
            const featureItem = items[index];
            if (this.resolveFeatureItemValue(feature, featureItem) === selectedValue)
                return featureItem;
        }
        return null;
    }

    onFeatureDropDownItemClick(feature, event, index) {
        this.onFeatureValueChanged(feature, index, this.resolveFeatureItemValue(feature, event?.itemData));
        if (event?.component?.close)
            event.component.close();
    }

    resolveFeatureItemValue(feature, itemData) {
        const valueExpr = feature.valueExpr;
        if (typeof valueExpr === "function")
            return valueExpr(itemData);
        if (typeof valueExpr === "string")
            return itemData?.[valueExpr];
        if (itemData && typeof itemData === "object" && Object.prototype.hasOwnProperty.call(itemData, "value"))
            return itemData.value;
        return itemData;
    }

    onFeatureValueChanged(feature, index, value) {
        if (feature.onValueChanged)
            feature.onValueChanged(index, value);
        this.render();
    }

    // What a feature leaves on the chip is the mark it is chosen by: the icon of the item standing
    // against it in the drop down, or the pair of icons a switch is drawn with. A shape whose feature
    // is worth more than one icon — a chart line that is also an area — writes its own.
    renderFeatureChipMark(feature, item, index) {
        const value = this.getFeatureValue(feature, item, index);
        if (feature.chipTemplate)
            return feature.chipTemplate(item, index, value);
        if (this.shouldUseFeatureDropDownButton(feature)) {
            const items = typeof feature.getItems === "function" ? feature.getItems(item, index) : [];
            return `<i class="${this.getFeatureSelectedIconClass(feature, items, value)}"></i>`;
        }
        return `<i class="${feature.getIconClass(value === true)}"></i>`;
    }

    // The row holds the name and the keys that say how the row itself is put together; the unit, the
    // case and the colour are the term's own and are carried by the chip. Nothing but the chips is
    // allowed to grow, so the name can never be squeezed out by what stands beside it.
    getRowTemplateColumns(item, index, showDragHandle = true, showTermEditor = true) {
        if (this.options.getRowTemplateColumns)
            return this.options.getRowTemplateColumns(item, index, showDragHandle, showTermEditor);
        const columns = [];
        if (showDragHandle)
            columns.push("24px");
        if (showTermEditor)
            columns.push("minmax(0, 1fr)");
        if (columns.length == 0)
            return "minmax(0, 1fr)";
        return columns.join(" ");
    }

    // The row is the chip and, in a list, the handle it is dragged by. Everything else the term is
    // read with is inside the chip, so a row looks the same whatever the shape holding it asks of it.
    renderListItem(item, index, element) {
        const showDragHandle = this.shouldShowDragHandle();
        const showTermEditor = this.shouldShowTermEditor(item, index);
        const row = $("<div>").addClass(this.getRowClassName()).css({
            display: "grid",
            gridTemplateColumns: this.getRowTemplateColumns(item, index, showDragHandle, showTermEditor),
            alignItems: "center",
            gap: this.getRowGap(),
            marginBottom: this.getRowMarginBottom()
        });
        if (showDragHandle) {
            const dragHandleHost = $("<div>").addClass(this.getDragHandleClassName());
            $("<i>").addClass("dx-icon dx-icon-dragvertical").appendTo(dragHandleHost);
            row.append(dragHandleHost);
        }
        if (showTermEditor) {
            const termHost = $("<div>").addClass("shape-term-term");
            row.append(termHost);
            termHost.dxDropDownBox(this.getTermChipEditorOptions(item, index));
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
            onItemClick: e => this.onSecondaryDropDownItemClick(e, index),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup")
            }
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

    hasUnits() {
        return this.options.units != null;
    }

    // A row still being named has nothing to give units to. One that names a term gives them to the
    // model; one holding a plain value gives them to wherever the surface keeps that value's unit,
    // and a surface that keeps none says so by offering no place to put it.
    shouldShowUnitsEditor(item, index) {
        if (!this.hasUnits())
            return false;
        if (!this.shouldShowTermEditor(item, index))
            return false;
        const termName = this.normalizeTermValue(this.getTermValue(item, index));
        if (termName === "")
            return false;
        if (this.options.units.isTerm(termName) === true)
            return true;
        return this.options.units.valueUnits != null;
    }

    renderUnitsEditor(host, item, index) {
        TermControl.renderTermUnitsEditor(host, this.normalizeTermValue(this.getTermValue(item, index)), this.options.units, item, index);
    }

    // The units editor a term row carries, on its own, for a surface that names a term with a control
    // of its own: the notebook's blocks pick a term from a plain list, and the unit is picked beside
    // it there out of the same picker. What it writes into depends on what the row holds — the term
    // the model knows, or the value the surface wrote — and a row naming nothing yet is left empty.
    static renderTermUnitsEditor(host, termName, units, item = null, index = 0) {
        host.empty();
        if (!units || termName == null || termName === "")
            return false;
        if (units.isTerm(termName) === true) {
            TermControl.renderUnitsPicker(host, units.getValue(termName), unitText => units.onValueChanged(termName, unitText));
            return true;
        }
        if (!units.valueUnits)
            return false;
        TermControl.renderUnitsPicker(host, units.valueUnits.getValue(item, index), unitText => units.valueUnits.onValueChanged(unitText, item, index));
        return true;
    }

    static renderUnitsPicker(host, unitText, onValueChanged) {
        UnitsControl.createEditor(host, { value: unitText, nested: true, onValueChanged: onValueChanged });
    }

    renderColorEditor(host, item, index) {
        if (!this.hasColorSelection())
            return;
        this.renderColorSecondaryEditor(host, item, index);
    }

    // The drop down is the list of terms and nothing else: what the reader writes is written into the
    // field the list drops from, so the value the row already holds is never repeated here. The list
    // is as wide as its widest term rather than as wide as the field it drops from.
    renderTermDropdownContent(contentElement, treeItems, currentTermValue, closeDropdown, onChanged) {
        const dropdownContent = $('<div class="mdl-term-tree-content">').appendTo(contentElement);
        $('<div class="mdl-term-tree-view">').dxTreeView({
            items: treeItems,
            dataStructure: "plain",
            keyExpr: "id",
            parentIdExpr: "parentId",
            displayExpr: "text",
            itemTemplate: (itemData, _, element) => {
                const itemText = String(itemData?.text ?? "");
                element[0].innerHTML = `<div class="mdl-variable-selector">${Utils.buildReadOnlyMathFieldMarkup(itemText, "height:auto;width:auto;display:inline-block")}</div>`;
            },
            selectionMode: "single",
            selectByClick: true,
            height: "auto",
            onItemClick: e => {
                if (e.itemData.term !== undefined) {
                    closeDropdown?.();
                    onChanged(e.itemData.term);
                }
            },
            onContentReady: e => {
                if (currentTermValue) {
                    const selectedItem = treeItems.find(t => t.term === currentTermValue);
                    if (selectedItem?.parentId)
                        e.component.expandItem(selectedItem.parentId);
                }
            },
            onItemExpanded: e => TermControl.fitTermTreeHeight(e.component),
            onItemCollapsed: e => TermControl.fitTermTreeHeight(e.component)
        }).appendTo(dropdownContent);
    }

    // Everything a term is read with stands here under a label of its own: the term itself, the pair
    // it may name, what it is measured in, which case it is read from, what it is drawn in, whether
    // its label is shown, and whatever the shape hangs on the row besides — a chart's type, a lock.
    // Nothing has to be guessed from a box with nothing written on it.
    renderTermEditorRows(contentElement, item, index) {
        const rows = this.buildTermEditorRowDescriptors(item, index);
        if (rows.length === 0)
            return;
        const translations = this.options.getBoard?.()?.translations;
        const grid = $('<div class="mdl-term-editor-rows">').appendTo(contentElement);
        for (const row of rows) {
            grid.append(`<span class="mdl-term-editor-row-label">${translations?.get(row.text) ?? row.text}</span>`);
            const host = $("<div>").addClass(`mdl-term-editor-row-control ${row.className}`);
            grid.append(host);
            row.buildControl(host);
        }
        const modeHost = grid.find(".shape-term-mode")[0];
        if (modeHost)
            requestAnimationFrame(() => Utils.movePillButtonGroup(modeHost));
    }

    buildTermEditorRowDescriptors(item, index) {
        const rows = [];
        // Whether the term is shown at all comes before what it is shown as.
        if (this.shouldShowVisibility(item, index))
            rows.push({ text: this.getVisibilityRowLabel(), className: "shape-term-visibility", buildControl: host => this.renderVisibilityEditor(host, item, index) });
        if (this.shouldShowTermEditor(item, index))
            rows.push({ text: this.getTermRowLabel(), className: "shape-term-term-row", buildControl: host => $("<div>").appendTo(host).dxDropDownBox(this.getTermSelectorOptions(item, index)) });
        if (this.shouldShowModeSelector(item, index))
            rows.push({ text: this.getModeRowLabel(), className: "shape-term-mode", buildControl: host => this.renderModeSelector(host, item, index) });
        if (this.shouldShowExtraTermEditor(item, index))
            rows.push({ text: this.getExtraTermRowLabel(), className: "shape-term-extra-term", buildControl: host => $("<div>").appendTo(host).dxDropDownBox(this.getExtraTermSelectorOptions(item, index)) });
        if (this.shouldShowUnitsEditor(item, index))
            rows.push({ text: "Unit", className: "shape-term-units", buildControl: host => this.renderUnitsEditor(host, item, index) });
        if (this.shouldShowSecondaryEditor(item, index))
            rows.push({ text: "Case", className: "shape-term-secondary", buildControl: host => this.renderSecondaryEditor(host, item, index) });
        if (this.shouldShowColorEditor(item, index))
            rows.push({ text: "Colour", className: "shape-term-color", buildControl: host => this.renderColorEditor(host, item, index) });
        for (const feature of this.getFeatures()) {
            if (this.shouldShowFeatureEditor(feature, item, index))
                rows.push({ text: this.getFeatureLabel(feature), className: this.getFeatureClassName(feature), buildControl: host => this.renderFeatureEditor(feature, host, item, index) });
        }
        return rows;
    }

    getTermRowLabel() {
        return this.options.termEditor?.label ?? "Value";
    }

    getModeRowLabel() {
        return this.options.mode.label ?? "Direction";
    }

    getExtraTermRowLabel() {
        return this.options.extraTerm.label ?? "Paired term";
    }

    getVisibilityRowLabel() {
        return this.options.visibility.label ?? "Show";
    }

    // The eye was dressed to butt against the field it stood beside; standing on a row of its own it
    // is a plain toggle like the lock under it.
    renderVisibilityEditor(host, item, index) {
        TermControl.createVisibilityCheckbox(host, this.getVisibilityValue(item), value => this.options.visibility.onValueChanged(index, value), {
            checkboxClassName: "mdl-term-editor-toggle",
            iconClassName: "mdl-term-editor-toggle-icon"
        });
    }

    // The wheel inside an overlay is only given to a scroll view, so the list keeps the tree's own
    // scroller and is measured into it: as tall as the terms it holds, and no taller than the list.
    static fitTermTreeHeight(component) {
        const scrollableContent = component.element().find(".dx-scrollable-content").first()[0];
        component.option("height", Math.min(scrollableContent.scrollHeight, TermControl.termTreeMaxHeight));
    }

    // The list is measured while the drop down is being shown and before it is placed, so a picker
    // near the foot of the board is flipped over the size the list ends up with.
    static fitTermTreeHeightOnShowing(popupComponent) {
        const treeElement = $(popupComponent.content()).find(".mdl-term-tree-view");
        TermControl.fitTermTreeHeight(treeElement.dxTreeView("instance"));
    }

    resolveTermEditorSelectedValue(data, fallbackValue = null) {
        if (data != null && typeof data === "object" && Object.prototype.hasOwnProperty.call(data, "value"))
            return data.value;
        if (typeof data === "string" || typeof data === "number")
            return data;
        return fallbackValue;
    }

    resolveTermEditorDisplayedText(data, fallbackValue, system) {
        const selectedValue = this.resolveTermEditorSelectedValue(data, fallbackValue);
        return String(Utils.getDisplayedTerm(selectedValue, system));
    }

    setMathFieldValue(mathFieldElement, mathValue) {
        Utils.setMathFieldValue(mathFieldElement, mathValue);
    }

    // A plain number is not mathematics to typeset: it is shown as text in the player's own
    // start value font, so a value reads the same wherever the reader meets it.
    static isPlainValue(value) {
        const text = TermControl.normalizeTermValue(value);
        if (typeof text !== "string" || text.trim() === "")
            return false;
        return Number.isFinite(Number(text));
    }

    // font-style is set because the selector italicises terms, and a value is not a term.
    static applyPlainValueStyle(element) {
        return $(element).css({ fontFamily: "KaTeX_Main, serif", fontSize: "15px", fontStyle: "normal" });
    }

    static createPlainValueLabel(text, className) {
        return TermControl.applyPlainValueStyle($("<span>").addClass(className).text(text));
    }

    // A row takes a plain value the moment it is typed into the field itself, which is the one place
    // every term field already stands: no drop down has to be opened and nothing has to be found
    // inside it. What is typed goes the way the list's own choice goes, so a value and a term are
    // written into the model by the same hand.
    commitTypedTermValue(item, index, value, onChanged, onCustomItemCreating, component) {
        if (onCustomItemCreating)
            onCustomItemCreating({ text: value, customItem: null, item: item, index: index, component: component });
        else
            onChanged(value);
    }

    // The chip is what the field wears at rest. It is taken off the moment the field is focused, so
    // the caret stands where the reader is about to write and what they write is read as they write
    // it; the next sync puts the chip back on.
    enterTermEditorEditing(component) {
        component.$element().addClass("mdl-term-editing");
        const inputContainer = this.getTermEditorInputContainer(component);
        if (!inputContainer?.length)
            return;
        inputContainer.find(".dx-texteditor-input").css({ color: "", caretColor: "", opacity: "", textShadow: "" });
    }

    // A drop down takes the focus with it when it opens, so a field that can be typed into asks for it
    // back and offers what it already holds selected: one click on the row, and what is typed next
    // stands in place of the value that was there.
    focusTypedTermValueInput(component) {
        requestAnimationFrame(() => {
            const inputElement = component.$element().find(".dx-texteditor-input")[0];
            if (!inputElement)
                return;
            inputElement.focus();
            inputElement.select();
        });
    }

    acceptsTypedTermValue(item, index) {
        const providedOptions = this.options.termEditor ?? {};
        if (typeof providedOptions.acceptCustomValue === "function")
            return providedOptions.acceptCustomValue(item, index) === true;
        return providedOptions.acceptCustomValue === true;
    }

    getTypedTermValuePlaceholder() {
        return String(this.options.termEditor?.customValuePlaceholder ?? "");
    }

    getTermEditorInputContainer(component) {
        const componentElement = component?.element?.();
        const inputElement = componentElement?.find?.(".dx-texteditor-input")?.first?.();
        if (inputElement?.length)
            return inputElement.parent();
        const inputContainer = componentElement?.find?.(".dx-texteditor-input-container")?.first?.();
        if (inputContainer?.length)
            return inputContainer;
        const inputWrapper = componentElement?.find?.(".dx-dropdowneditor-input-wrapper")?.first?.();
        if (inputWrapper?.length)
            return inputWrapper;
        return componentElement?.find?.(".dx-texteditor-container")?.first?.();
    }

    // The chip is the whole of what the row shows: whether the term is shown at all, the colour it is
    // drawn in, its name, the unit it is measured in behind a faded slash — the way a term is written
    // on a label anywhere else here — the case it is read from, and a mark for every other thing the
    // chip's own drop down offers, in the order the drop down offers them. Nothing on the chip can be
    // pressed: it says what the row holds, and the drop down is where it is changed. The editor's own
    // input is left underneath so the placeholder still shows through a chip with no term in it yet.
    syncTermEditorMathField(component, fallbackValue, system, item = null, index = 0, isPrimary = true) {
        const selectedValue = component.option("value") ?? fallbackValue;
        component.$element().removeClass("mdl-term-editing");
        const inputContainer = this.getTermEditorInputContainer(component);
        if (!inputContainer?.length)
            return;
        inputContainer.find(".dx-texteditor-input").css({ color: "transparent", caretColor: "transparent", opacity: 0, textShadow: "none" });
        let chip = inputContainer.find(".mdl-term-chip").first();
        if (!chip.length) {
            inputContainer.prepend('<span class="mdl-term-chip"></span>');
            chip = inputContainer.find(".mdl-term-chip").first();
        }
        chip.empty();
        // A row waiting to be handed a term carries no marks at all: the chip is left empty so the
        // placeholder underneath still reads.
        const isNamed = isPrimary && this.normalizeTermValue(selectedValue) !== "";
        if (isNamed && this.shouldShowVisibility(item, index))
            chip.append(`<span class="mdl-term-chip__mark mdl-term-chip__visibility"><i class="${TermControl.getVisibilityIconClass(this.getVisibilityValue(item))}"></i></span>`);
        // A row that has been given no colour is written without one rather than with an empty square
        // where a colour would be; the picker inside the chip is still there to give it one.
        const colorValue = isPrimary && this.shouldShowColorEditor(item, index) ? this.getColorValue(item, index) : "";
        if (colorValue !== "")
            chip.append($('<span class="mdl-term-chip__color">').css("background", colorValue));
        this.appendTermChipName(chip, selectedValue, system);
        if (!isPrimary)
            return;
        if (this.shouldShowExtraTermEditor(item, index)) {
            const pairedValue = this.getExtraTermValue(item, index);
            if (pairedValue != null) {
                chip.append('<span class="mdl-term-chip__pair">,</span>');
                this.appendTermChipName(chip, pairedValue, system);
            }
        }
        const unitText = this.getTermChipUnitText(item, index);
        if (unitText !== "") {
            const unitHost = $('<span class="mdl-term-chip__unit"><span class="mdl-term-chip__slash">/</span></span>').appendTo(chip);
            unitHost.append(Utils.buildUnitsMathFieldMarkup(unitText, "height:auto;width:auto;display:inline-block"));
        }
        if (this.shouldShowSecondaryEditor(item, index))
            chip.append($('<span class="mdl-term-chip__case">').append(TermControl.createCaseIcon(this.options.secondary.getValue(item, index), "mdl-term-chip__case-icon")));
        if (isNamed)
            this.appendTermChipFeatureMarks(chip, item, index);
    }

    appendTermChipFeatureMarks(chip, item, index) {
        for (const feature of this.getFeatures()) {
            if (this.shouldShowFeatureEditor(feature, item, index))
                chip.append(`<span class="mdl-term-chip__mark ${this.getFeatureClassName(feature)}-mark">${this.renderFeatureChipMark(feature, item, index)}</span>`);
        }
    }

    appendTermChipName(chip, selectedValue, system) {
        const displayedText = String(Utils.getDisplayedTerm(selectedValue, system));
        if (displayedText === "")
            return;
        if (TermControl.isPlainValue(selectedValue))
            return chip.append(TermControl.createPlainValueLabel(displayedText, "mdl-term-editor-value"));
        chip.append("<math-field read-only class='form-math-field mdl-term-editor-math-field' style='height:auto;width:auto;display:inline-block'></math-field>");
        this.setMathFieldValue(chip.find(".mdl-term-editor-math-field").last()[0], Utils.formatMathTermName(displayedText));
    }

    // A term the model knows is measured in the unit the model keeps for it; a plain value written
    // into the row is measured in the one the surface keeps beside that value.
    getTermChipUnitText(item, index) {
        if (!this.shouldShowUnitsEditor(item, index))
            return "";
        const termName = this.normalizeTermValue(this.getTermValue(item, index));
        const units = this.options.units;
        if (units.isTerm(termName) === true)
            return Utils.getUnitsPlainText(units.getValue(termName) ?? "");
        return Utils.getUnitsPlainText(units.valueUnits.getValue(item, index) ?? "");
    }

    // A chip carried off with the menu it stood in is never told it closed, so the guard asks the
    // editor whether it is still standing and still open rather than trusting the flag alone.
    hasOpenTermEditor() {
        if (this.openEditorIndex === null)
            return false;
        const editor = this.termChipEditors[this.openEditorIndex];
        if (!editor || !document.body.contains(editor.element()[0]))
            return false;
        return editor.option("opened") === true;
    }

    // The chip reads its own value before the one it was built with, so the term it names is written
    // into it before the face is drawn again — otherwise a chip keeps the name it opened on.
    refreshOpenTermChip() {
        const index = this.openEditorIndex;
        const editor = this.termChipEditors[index];
        if (!editor)
            return;
        const item = this.getItems()[index];
        const termValue = this.getTermValue(item, index);
        editor.option("value", termValue);
        this.syncTermEditorMathField(editor, termValue, this.getSystem(), item, index, true);
    }

    // What the chip shows is written again on every change. The rows behind it are only built again
    // when the set of them has moved — naming a term brings a unit and a case with it — so choosing a
    // colour does not take the picker apart under the hand that chose it.
    refreshOpenTermEditor() {
        this.refreshOpenTermChip();
        const index = this.openEditorIndex;
        const signature = this.getTermEditorRowSignature(index);
        if (signature === this.openEditorRowSignature)
            return;
        this.openEditorRowSignature = signature;
        requestAnimationFrame(() => this.rebuildOpenTermEditorRows(index));
    }

    getTermEditorRowSignature(index) {
        const item = this.getItems()[index];
        const terms = [this.getTermValue(item, index), this.hasExtraTerm() ? this.getExtraTermValue(item, index) : null];
        return [...terms, ...this.buildTermEditorRowDescriptors(item, index).map(row => row.text)].join("|");
    }

    rebuildOpenTermEditorRows(index) {
        const contentElement = this.termChipContents[index];
        if (!contentElement || this.openEditorIndex !== index)
            return;
        contentElement.empty();
        this.renderTermEditorRows(contentElement, this.getItems()[index], index);
    }

    // The chip is the row's own field, so a value typed straight into it is written to the term the
    // row names — but only while the row names one term. A row naming a pair keeps its typing inside
    // the chip, where each half has a field of its own to be told apart by.
    acceptsTypedChipValue(item, index) {
        if (!this.acceptsTypedTermValue(item, index))
            return false;
        return !this.shouldShowExtraTermEditor(item, index);
    }

    // The chip opens on everything the term is read with rather than straight onto the list of terms:
    // the list is one row inside it, standing under its own label the way the unit and the colour do.
    getTermChipEditorOptions(item, index) {
        const termValue = this.getTermValue(item, index);
        const calculator = this.getCalculator();
        const isMissingTerm = calculator ? TermControl.isMissingTermReference(calculator, termValue, this.options.allowNumericTermReference === true) : false;
        const system = this.getSystem();
        const acceptsTypedValue = this.acceptsTypedChipValue(item, index);
        return {
            value: termValue || null,
            disabled: this.isTermEditorDisabled(item, index),
            acceptCustomValue: acceptsTypedValue,
            placeholder: acceptsTypedValue ? this.getTypedTermValuePlaceholder() : "",
            inputAttr: { class: "mdl-variable-selector" },
            stylingMode: "filled",
            elementAttr: {
                class: isMissingTerm ? "mdl-term-chip-editor mdl-variable-selector mdl-missing-term" : "mdl-term-chip-editor mdl-variable-selector",
                title: isMissingTerm ? `Term “${termValue}” no longer exists` : ""
            },
            onInitialized: e => {
                this.termChipEditors[index] = e.component;
                this.syncTermEditorMathField(e.component, termValue, system, item, index, true);
            },
            onContentReady: e => this.syncTermEditorMathField(e.component, termValue, system, item, index, true),
            onFocusIn: e => {
                if (acceptsTypedValue)
                    this.enterTermEditorEditing(e.component);
            },
            onFocusOut: e => this.syncTermEditorMathField(e.component, termValue, system, item, index, true),
            onValueChanged: e => {
                if (acceptsTypedValue && e.event)
                    this.commitTypedTermValue(item, index, e.value, value => this.onTermChanged(index, value), this.options.termEditor?.onCustomItemCreating, e.component);
                this.syncTermEditorMathField(e.component, termValue, system, item, index, true);
            },
            contentTemplate: (component, contentElement) => this.renderTermChipContent($(contentElement), item, index),
            dropDownOptions: {
                container: document.body,
                width: "auto",
                wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup mdl-term-chip-popup")
            },
            onOpened: e => this.onTermEditorOpened(e, index),
            onClosed: () => this.onTermEditorClosed()
        };
    }

    renderTermChipContent(contentElement, item, index) {
        this.termChipContents[index] = contentElement;
        this.renderTermEditorRows(contentElement, item, index);
    }

    isTermEditorDisabled(item, index) {
        const providedOptions = this.options.termEditor ?? {};
        if (typeof providedOptions.disabled === "function")
            return providedOptions.disabled(item, index) === true;
        return providedOptions.disabled === true;
    }

    getTermSelectorOptions(item, index) {
        return this.buildTermSelectorOptions(item, index, this.getTermValue(item, index), this.getTermItems(item, index), value => this.onTermChanged(index, value), this.options.termEditor?.onCustomItemCreating);
    }

    // The typed value belongs to the selector it was typed into, so the second one writes the field
    // it edits rather than the one the row is named by.
    getExtraTermSelectorOptions(item, index) {
        return this.buildTermSelectorOptions(item, index, this.getExtraTermValue(item, index), this.getExtraTermItems(item, index), value => this.onExtraTermChanged(index, value), this.options.extraTerm.onCustomItemCreating);
    }

    buildTermSelectorOptions(item, index, termValue, flatItems, onChanged, onCustomItemCreating) {
        const providedOptions = this.options.termEditor ?? {};
        const acceptCustomValue = this.acceptsTypedTermValue(item, index);
        // A row whose term is no longer the object's to choose keeps its place and its colour, and
        // only the selector goes quiet: the reader can still see what it was reading and still say
        // what it is drawn in.
        const disabled = typeof providedOptions.disabled === "function"
            ? providedOptions.disabled(item, index) === true
            : providedOptions.disabled === true;
        const calculator = this.getCalculator();
        const isMissingTerm = calculator ? TermControl.isMissingTermReference(calculator, termValue, this.options.allowNumericTermReference === true) : false;
        const board = this.options.getBoard?.();
        const system = this.getSystem();
        const treeItems = TermControl.buildTermTreeItems(board, flatItems);
        let dropDownBoxInstance = null;
        const leafTerms = treeItems.filter(t => t.term !== undefined).map(t => ({ value: t.term, text: Utils.getDisplayedTerm(t.term, system) }));
        return {
            value: termValue || null,
            disabled: disabled,
            dataSource: leafTerms,
            valueExpr: "value",
            displayExpr: data => this.resolveTermEditorDisplayedText(data, termValue, system),
            acceptCustomValue: acceptCustomValue,
            placeholder: acceptCustomValue ? this.getTypedTermValuePlaceholder() : "",
            inputAttr: { class: "mdl-variable-selector" },
            stylingMode: "filled",
            elementAttr: {
                class: isMissingTerm ? "mdl-term-chip-editor mdl-variable-selector mdl-missing-term" : "mdl-term-chip-editor mdl-variable-selector",
                title: isMissingTerm ? `Term “${termValue}” no longer exists` : ""
            },
            onInitialized: e => {
                dropDownBoxInstance = e.component;
                this.syncTermEditorMathField(e.component, termValue, system, item, index, false);
            },
            onContentReady: e => this.syncTermEditorMathField(e.component, termValue, system, item, index, false),
            onFocusIn: e => {
                if (acceptCustomValue)
                    this.enterTermEditorEditing(e.component);
            },
            onFocusOut: e => this.syncTermEditorMathField(e.component, termValue, system, item, index, false),
            onValueChanged: e => {
                if (acceptCustomValue && e.event)
                    this.commitTypedTermValue(item, index, e.value, onChanged, onCustomItemCreating, e.component);
                this.syncTermEditorMathField(e.component, termValue, system, item, index, false);
            },
            contentTemplate: (component, contentElement) => this.renderTermDropdownContent($(contentElement), treeItems, termValue, () => dropDownBoxInstance?.close(), onChanged),
            dropDownOptions: {
                container: document.body,
                width: "auto",
                onShowing: e => TermControl.fitTermTreeHeightOnShowing(e.component),
                wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup mdl-term-tree-popup")
            },
            onOpened: e => {
                providedOptions.onOpened?.(e);
                if (acceptCustomValue)
                    this.focusTypedTermValueInput(e.component);
            }
        };
    }

    onTermEditorOpened(event, index) {
        this.openEditorIndex = index;
        this.openEditorRowSignature = this.getTermEditorRowSignature(index);
        this.options.termEditor?.onOpened?.(event);
        if (this.acceptsTypedChipValue(this.getItems()[index], index))
            this.focusTypedTermValueInput(event.component);
    }

    onTermEditorClosed() {
        this.openEditorIndex = null;
        if (!this.pendingRender)
            return;
        this.pendingRender = false;
        this.render();
    }

    createDefaultTermItemTemplate() {
        return (data, _, element) => {
            const itemText = String(data?.text ?? "");
            element[0].innerHTML = `<div class="mdl-variable-selector">${Utils.buildReadOnlyMathFieldMarkup(itemText, "height:auto;width:auto;display:inline-block")}</div>`;
            return element;
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
        if (this.options.getTermItems)
            return this.options.getTermItems(item, index);
        return this.getInjectedTermItems(item, index);
    }

    getCalculator() {
        if (typeof this.options.getCalculator === "function")
            return this.options.getCalculator();
        const board = this.options.getBoard?.();
        return board?.calculator ?? null;
    }

    getSystem() {
        if (typeof this.options.getSystem === "function")
            return this.options.getSystem();
        const board = this.options.getBoard?.();
        return board?.calculator?.system ?? null;
    }

    getInjectedTermItems(item, index) {
        const calculator = this.getCalculator();
        const system = this.getSystem();
        if (!calculator)
            return [];
        const termNames = calculator.getTermsNames?.() ?? [];
        const items = Utils.getTerms(termNames, system);
        const selectedTerm = this.normalizeTermValue(this.getTermValue(item, index));
        if (selectedTerm === "")
            return items;
        if (calculator.isTerm?.(selectedTerm))
            return items;
        if (TermControl.isPlainValue(selectedTerm))
            return items;
        items.unshift({ text: selectedTerm, term: selectedTerm });
        return items;
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
            onValueChanged: e => this.onSecondaryValueChanged(index, e.value),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: TermControl.getShapeNestedOverlayWrapperAttr("mdl-nested-dropdown-popup")
            }
        };
    }

    // The picker is opened from inside the chip's own drop down now, so its menu is raised to the
    // level the other nested menus stand at; left where it was it would open behind the drop down
    // that asked for it.
    renderColorSecondaryEditor(host, item, index) {
        const colorSelection = this.getColorSelectionOptions();
        const colorValue = this.getColorValue(item, index);
        const editorOptions = { menuClassName: "mdl-color-picker-menu mdl-shape-overlay-popup-nested mdl-nested-dropdown-popup", ...colorSelection?.editorOptions };
        const editor = this.secondaryColorSelector.createEditor(colorValue, value => this.onColorValueChanged(index, value), editorOptions);
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

    onExtraTermChanged(index, value) {
        this.options.extraTerm.onValueChanged(index, value);
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
