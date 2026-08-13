var ComponentShapeToolbarMixin = {
    // The two switches that decide the ends of an axis instead of a person setting them.
    axisRangeSwitches: ["autoScale", "equalScales"],
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ComponentShapeToolbarMixin.createToolbar);
        this._componentTermControls = {};
        this._componentTermsControls = {};
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
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
                    this.createComponentModelDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createComponentSettingsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    },
    getParametersByCategory(categories) {
        return this.getEditableParameters().filter(parameter => categories.includes(parameter.category ?? "general"));
    },
    getComponentParameter(parameterId) {
        if (parameterId === "")
            return null;
        return BlockObjects.getComponentParameters(this.getComponentType()).find(parameter => parameter.id === parameterId) ?? null;
    },
    buildModeItems(parameter) {
        if (!parameter)
            return [];
        if (!parameter.enumIcons)
            return TermControl.directionModes;
        return parameter.enumValues.map((value, index) => ({ value: value, icon: parameter.enumIcons[index], hint: value }));
    },
    // An object that paints a background, a plot and an axis names them the way the chart does, and
    // is offered the same three colours under the same labels and icons. Anything else a definition
    // colours keeps its own label.
    populateShapeColorMenuSections(sections) {
        for (const parameter of this.getParametersByCategory(["style"])) {
            const known = BaseShapeToolbarMixin.plotColorMenuItems[parameter.id];
            this.pushColorMenuItem(sections, parameter.id, known?.label ?? parameter.label, known?.icon ?? "fa-droplet");
        }
    },
    // Emptying what the object is holding is one of the ways it can be taken back, so it sits with
    // remove and reset rather than as a key on the drawing.
    getRemoveMenuItems() {
        const items = BaseShapeToolbarMixin.getRemoveMenuItems.call(this);
        if (this.getMemoryParameters().length === 0)
            return items;
        items.push({ text: "Clear", icon: "fa-light fa-eraser", action: () => this.clearMemories() });
        return items;
    },
    clearMemories() {
        for (const parameter of this.getMemoryParameters())
            this.setPropertyCommand(parameter.id, []);
        this.refreshModelData();
    },
    // The key reads the model the object is bound to, which is the terms it names one by one. A list
    // of terms is as long as the reader made it, so it is read in the menu rather than on the key.
    renderComponentModelButtonTemplate(element) {
        const modelParameters = this.getParametersByCategory(["model"]).filter(parameter => parameter.valueType === "variable");
        if (modelParameters.length === 0) {
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Model</span></span>`;
            return;
        }
        element.innerHTML = modelParameters
            .map(parameter => this.createNameButtonTermMarkup(this.formatTermForDisplay(this.properties[parameter.id]), this.properties[parameter.id]))
            .join(`<i class="fa-light fa-grip-lines-vertical mdl-name-btn-separator"></i>`);
    },
    createComponentModelDropDownButton(itemElement) {
        this._componentModelDropdownElement = $('<div class="mdl-component-model-selector">');
        this._componentModelDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Component Model Tooltip", this.board.translations, 280),
            buttonTemplate: (data, element) => this.renderComponentModelButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildComponentParameterMenu(contentElement, this.getParametersByCategory(["model", "orbits"]))
            }
        });
        this._componentModelDropdownElement.appendTo(itemElement);
    },
    createComponentSettingsDropDownButton(itemElement) {
        this._componentSettingsDropdownElement = $('<div class="mdl-component-settings-selector">');
        this._componentSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-sliders",
            onInitialized: e => Utils.createTranslatedTooltip(e, "Component Settings Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildComponentSettingsMenu(contentElement)
            }
        });
        this._componentSettingsDropdownElement.appendTo(itemElement);
    },
    buildComponentSettingsMenu(contentElement) {
        const rangeParameters = this.getAxisRangeParameters();
        const items = [];
        // Auto scale and equal axis stand above the ends they govern, in the chart's own order.
        for (const parameter of this.getEditableParameters().filter(entry => ComponentShapeToolbarMixin.axisRangeSwitches.includes(entry.id))) {
            rangeParameters.push(parameter.id);
            items.push({ text: parameter.label, buildControl: $container => $container.append(this.createAxisRangeSwitch(parameter)) });
        }
        if (this.getAxisRangeParameters().length === 4) {
            const control = this.getAxisRangeControl();
            items.push({ text: "Horizontal", buildControl: $container => control.createRow("x").appendTo($container) });
            items.push({ text: "Vertical", buildControl: $container => control.createRow("y").appendTo($container) });
        }
        for (const parameter of this.getParametersByCategory(["display", "scale", "interaction", "general"])) {
            if (rangeParameters.includes(parameter.id))
                continue;
            items.push({
                text: parameter.label,
                buildControl: $container => $container.append(this.createComponentParameterControl(parameter))
            });
        }
        this.renderComponentMenuList(contentElement, items);
    },
    // An object that says how far its axes run edits them the way the chart and the referential do:
    // one row per axis, a minimum and a maximum on it, and the same control drawing all three.
    getAxisRangeParameters() {
        const names = ["minimumX", "maximumX", "minimumY", "maximumY"];
        return this.getEditableParameters().filter(parameter => names.includes(parameter.id)).map(parameter => parameter.id);
    },
    getAxisRangeProperty(axis, bound) {
        return `${bound === "Min" ? "minimum" : "maximum"}${axis.toUpperCase()}`;
    },
    // An end the object is working out for itself is shown but not editable, which is how the chart
    // says the same thing.
    getAxisRangeControl() {
        this._axisRangeControl ??= new AxisRangeControl({
            read: (axis, bound) => this.getEffectiveAxisRange()[`${axis}${bound}`],
            write: (axis, bound, value) => this.setPropertyCommand(this.getAxisRangeProperty(axis, bound), value),
            isDisabled: axis => this.properties.autoScale === true || (axis === "y" && this.properties.equalScales === true),
            editorOptions: () => this.getPrecisionNumberEditorOptions({ showSpinButtons: false })
        });
        return this._axisRangeControl;
    },
    createAxisRangeSwitch(parameter) {
        return $('<div>').dxSwitch({
            value: this.properties[parameter.id] === true,
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
                this.board.markDirty(this);
                this._axisRangeControl?.refresh();
            }
        });
    },
    buildComponentParameterMenu(contentElement, parameters) {
        const items = parameters.map(parameter => ({
            text: parameter.label,
            buildControl: $container => $container.append(this.createComponentParameterControl(parameter))
        }));
        // A menu carrying a list of terms is as wide as that list, so every other row is widened to
        // match rather than leaving its selector at the width it would have had on its own.
        $(contentElement).toggleClass("mdl-component-terms-menu", parameters.some(parameter => parameter.valueType === "terms" || (parameter.pairedParameter ?? "") !== ""));
        this.renderComponentMenuList(contentElement, items);
    },
    renderComponentMenuList(contentElement, items) {
        if ($(contentElement).data("dxScrollView"))
            $(contentElement).dxScrollView("instance").dispose();
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 320, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => Utils.renderDropdownListItem(element, data)
        });
    },
    createComponentParameterControl(parameter) {
        if (parameter.valueType === "variable")
            return this.createComponentVariableControl(parameter);
        if (parameter.valueType === "terms")
            return this.createComponentTermsControl(parameter);
        if (parameter.valueType === "colour")
            return this.createColorPickerEditor(parameter.id);
        if (parameter.valueType === "boolean")
            return this.createComponentBooleanControl(parameter);
        if (parameter.valueType === "number")
            return this.createComponentNumberControl(parameter);
        if (parameter.valueType === "character")
            return this.createComponentCharacterControl(parameter);
        if (parameter.enumValues)
            return this.createComponentEnumControl(parameter);
        return this.createComponentTextControl(parameter);
    },
    createComponentVariableControl(parameter) {
        // A component input takes a model variable or a plain number, so the selector accepts both.
        // A definition naming a colour parameter gets the swatch for it in the same row.
        const modeParameter = this.getComponentParameter(parameter.modeParameter ?? "");
        const control = this.createTermControl(parameter.id, parameter.label, false, {
            allowTypedValue: true,
            colorProperty: parameter.colorParameter ?? "",
            extraTermProperty: parameter.pairedParameter ?? "",
            modeProperty: modeParameter ? modeParameter.id : "",
            modeItems: this.buildModeItems(modeParameter),
            modePairValue: modeParameter ? modeParameter.enumValues[1] : ""
        });
        this._componentTermControls[parameter.id] = this.termFormControls[parameter.id];
        return control;
    },
    // A parameter that takes as many terms as the reader gives it is edited the way the chart edits
    // the terms it plots: a row per term, dragged into the order they are drawn in, with a colour of
    // its own. A row may name a second term as well, and the pair is read as a pair of values.
    createComponentTermsControl(parameter) {
        this.normalizeComponentTerms(parameter.id);
        this._componentTermsControls[parameter.id] = TermControl.createShapeTermsCollectionControl(this, parameter.id, {
            hostClassName: "shape-terms-control component-terms-control",
            includeColor: true,
            allowNumericTermReference: true,
            termEditor: { acceptCustomValue: true },
            extraTerm: { field: "secondTerm" },
            mode: { field: "mode", items: TermControl.directionModes, pairValue: TermControl.directionPairValue },
            colorSelection: {
                getValue: (item, index) => this.getComponentTermColor(item, index)
            },
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeComponentTermItem(sourceItem, normalizedItem),
            lock: null
        });
        return this._componentTermsControls[parameter.id].createHost();
    },
    normalizeComponentTerms(parameterId) {
        TermControl.normalizeShapeTermsCollection(this, parameterId, {
            includeColor: true,
            normalizeItem: (sourceItem, normalizedItem) => this.normalizeComponentTermItem(sourceItem, normalizedItem)
        });
    },
    normalizeComponentTermItem(sourceItem, normalizedItem) {
        normalizedItem.secondTerm = TermControl.normalizeTermValue(sourceItem?.secondTerm);
        normalizedItem.mode = TermControl.normalizeTermsCollectionMode(sourceItem?.mode, normalizedItem.secondTerm, { items: TermControl.directionModes, pairValue: TermControl.directionPairValue });
    },
    // A row that chose no colour is shown in the colour it is drawn in, which is the one its place in
    // the list is given.
    getComponentTermColor(item, index) {
        const color = TermControl.normalizeColorValue(item?.color);
        if (color !== "")
            return color;
        return Utils.getColorByIndex(index);
    },
    createComponentBooleanControl(parameter) {
        return $('<div>').dxSwitch({
            value: this.properties[parameter.id] === true,
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
            }
        });
    },
    createComponentNumberControl(parameter) {
        const editorOptions = {
            value: Number(this.properties[parameter.id]),
            min: Number.isFinite(parameter.minimum) ? parameter.minimum : undefined,
            max: Number.isFinite(parameter.maximum) ? parameter.maximum : undefined,
            width: 100,
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
            }
        };
        return $('<div>').dxNumberBox(Object.assign({ showSpinButtons: true, stylingMode: "filled" }, editorOptions));
    },
    createComponentEnumControl(parameter) {
        if (parameter.enumIcons)
            return this.createComponentEnumButtonGroup(parameter);
        return $('<div>').dxSelectBox({
            items: parameter.enumValues,
            value: this.properties[parameter.id],
            width: 130,
            stylingMode: "filled",
            dropDownOptions: { container: document.body, wrapperAttr: this.getShapeNestedOverlayWrapperAttr() },
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
            }
        });
    },
    createComponentEnumButtonGroup(parameter) {
        const items = parameter.enumValues.map((value, index) => ({ value: value, icon: parameter.enumIcons[index], hint: value }));
        return $('<div class="mdl-component-enum-buttons">').dxButtonGroup({
            items: items,
            keyExpr: "value",
            selectionMode: "single",
            selectedItemKeys: [this.properties[parameter.id]],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
            },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onItemClick: event => this.setPropertyCommand(parameter.id, event.itemData.value)
        });
    },
    // The same catalogue of characters a body wears, offered to any component that says it draws
    // one: the object stores the key and places the drawing by the character's own pivot point.
    createComponentCharacterControl(parameter) {
        return $('<div>').dxButton({
            icon: "fa-light fa-person-running",
            stylingMode: "text",
            onClick: () => this.showCharacterPickerPopup({ property: parameter.id })
        });
    },
    createComponentTextControl(parameter) {
        return $('<div>').dxTextBox({
            value: String(this.properties[parameter.id] ?? ""),
            width: 130,
            stylingMode: "filled",
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
            }
        });
    },
    refreshComponentToolbarControls() {
        if (!this._componentModelDropdownElement)
            return;
        const buttonContentElement = this._componentModelDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderComponentModelButtonTemplate(buttonContentElement);
        for (const controls of Object.values(this._componentTermControls ?? {}))
            controls?.termControl?.refresh();
        for (const control of Object.values(this._componentTermsControls ?? {}))
            control.refresh();
        this._axisRangeControl?.refresh();
    },
    showContextToolbar() {
        this.refreshComponentToolbarControls();
        BaseShape.prototype.showContextToolbar.call(this);
    }
};

if (typeof ComponentShape !== "undefined") Object.assign(ComponentShape.prototype, CharacterPickerMixin, ComponentShapeToolbarMixin);
