var ComponentShapeToolbarMixin = {
    // What a choice is called on screen. The value itself is the name the definition gave it, and it
    // stays that way in the file and in every comparison; what a reader is shown opens with a capital,
    // the way every other label in the toolbars does.
    formatChoiceLabel(value) {
        const text = String(value ?? "");
        return text === "" ? text : text.charAt(0).toUpperCase() + text.slice(1);
    },
    // The two switches that decide the ends of an axis instead of a person setting them.
    axisRangeSwitches: ["autoScale", "equalScales"],
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ComponentShapeToolbarMixin.createToolbar);
        this._componentTermControls = {};
        this._componentTermsControls = {};
        this._componentModeDropdownElements = {};
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
            // How a row is read stands beside the row rather than on it, so the row shows the terms it
            // names and nothing else. The toolbar is built before the shape is told which object it
            // draws, so the place is taken here and the keys are put in it once that is known.
            {
                location: "center",
                template: () => {
                    this._componentModeItemElement = $('<div class="mdl-component-mode-item"></div>');
                    return this._componentModeItemElement;
                }
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
    // "Face colour" on a row whose control is a colour swatch reads the word twice over, so the
    // label keeps the thing and the swatch says what is being set.
    trimColourWord(label) {
        return String(label ?? "").replace(/\s+(colours?|colors?|cor(?:es)?)$/i, "");
    },
    getParametersByCategory(categories) {
        return this.getEditableParameters()
            .filter(parameter => categories.includes(parameter.category ?? "general"))
            .filter(parameter => this.isComponentParameterOffered(parameter));
    },
    buildModeItems(parameter) {
        if (!parameter)
            return [];
        if (!parameter.enumIcons)
            return TermControl.directionModes;
        return parameter.enumValues.map((value, index) => ({ value: value, icon: parameter.enumIcons[index], hint: ComponentShapeToolbarMixin.formatChoiceLabel(value) }));
    },
    // A parameter another one names as the way it is read — an angle or an orientation — is chosen
    // once, from a key of its own, however many rows are read that way. A parameter can also ask for
    // that key itself: a choice that decides which of the other rows are worth offering belongs
    // beside them rather than among them.
    getComponentModeParameters() {
        const modeParameters = [];
        for (const parameter of BlockObjects.getComponentParameters(this.getComponentType())) {
            if (parameter.toolbarKey === true && this.isComponentParameterOffered(parameter))
                this.pushComponentModeParameter(modeParameters, parameter);
        }
        for (const parameter of this.getParametersByCategory(["model", "orbits"]))
            this.pushComponentModeParameter(modeParameters, this.getComponentParameter(parameter.modeParameter ?? ""));
        return modeParameters;
    },
    pushComponentModeParameter(modeParameters, parameter) {
        if (parameter?.enumValues && !modeParameters.some(entry => entry.id === parameter.id))
            modeParameters.push(parameter);
    },
    getComponentModeValue(modeParameter) {
        const items = this.buildModeItems(modeParameter);
        const value = String(this.properties[modeParameter.id] ?? "");
        return items.some(item => item.value === value) ? value : String(items[0].value);
    },
    getComponentModeIcon(modeParameter) {
        const items = this.buildModeItems(modeParameter);
        const value = this.getComponentModeValue(modeParameter);
        return items.find(item => item.value === value)?.icon ?? items[0].icon;
    },
    // The second half of a pair is read, shown and edited only while the row is read as a pair.
    isComponentPairMode(parameter) {
        const modeParameter = this.getComponentParameter(parameter.modeParameter ?? "");
        if (!modeParameter || (parameter.pairedParameter ?? "") === "")
            return false;
        return this.getComponentModeValue(modeParameter) === String(modeParameter.enumValues[1]);
    },
    refreshComponentModeDropDownButtons() {
        if (!this._componentModeItemElement)
            return;
        for (const modeParameter of this.getComponentModeParameters()) {
            if (!this._componentModeDropdownElements[modeParameter.id])
                this.createComponentModeDropDownButton(this._componentModeItemElement, modeParameter);
            this.getDropDownButtonInstance(this._componentModeDropdownElements[modeParameter.id])?.option("icon", this.getComponentModeIcon(modeParameter));
        }
    },
    createComponentModeDropDownButton(itemElement, modeParameter) {
        const element = $('<div class="mdl-component-mode-selector">');
        element.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: this.getComponentModeIcon(modeParameter),
            onInitialized: event => Utils.createTranslatedTooltip(event, modeParameter.toolbarTooltip ?? "Component Mode Tooltip", this.board.translations, 280),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => this.buildComponentModeMenu(contentElement, modeParameter)
            }
        });
        element.appendTo(itemElement);
        this._componentModeDropdownElements[modeParameter.id] = element;
    },
    buildComponentModeMenu(contentElement, modeParameter) {
        $(contentElement).empty();
        $('<div>').appendTo(contentElement).dxList({
            dataSource: this.buildModeItems(modeParameter),
            keyExpr: "value",
            scrollingEnabled: false,
            selectionMode: "single",
            selectedItemKeys: [this.getComponentModeValue(modeParameter)],
            itemTemplate: (itemData, _, itemElement) => {
                itemElement[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${itemData.icon}"></i><span class="mdl-dropdown-list-label">${Utils.escapeXmlText(this.board.translations.get(itemData.hint) ?? itemData.hint)}</span></div>`;
            },
            onItemClick: event => {
                this.getDropDownButtonInstance(this._componentModeDropdownElements[modeParameter.id])?.close();
                this.setComponentModeValue(modeParameter, event.itemData.value);
            }
        });
    },
    setComponentModeValue(modeParameter, value) {
        if (this.getComponentModeValue(modeParameter) === String(value))
            return;
        this.setPropertyCommand(modeParameter.id, value);
        this.board.markDirty(this);
        this.refreshComponentToolbarControls();
        this.refreshComponentSettingsMenu();
        this.refreshComponentModelMenu();
    },
    // An object that paints a background, a plot and an axis names them the way the chart does, and
    // is offered the same three colours under the same labels and icons. Anything else a definition
    // colours keeps its own label.
    //
    // Two things are left out. A colour the shape menu already carries in its own right — the
    // foreground and the border every shape has — would otherwise be offered twice over, two controls
    // writing the one property. And a colour a row names as its own is chosen on that row, beside the
    // term it paints, so listing it here as well would be the same choice in two places.
    populateShapeColorMenuSections(sections) {
        const claimed = new Set(["foregroundColor", "borderColor"]);
        for (const parameter of BlockObjects.getComponentParameters(this.getComponentType())) {
            if (parameter.colorParameter)
                claimed.add(parameter.colorParameter);
        }
        for (const parameter of this.getParametersByCategory(["style"])) {
            if (claimed.has(parameter.id))
                continue;
            const known = BaseShapeToolbarMixin.plotColorMenuItems[parameter.id];
            this.pushColorMenuItem(sections, parameter.id, known?.label ?? ComponentShapeToolbarMixin.trimColourWord(parameter.label), known?.icon ?? "fa-droplet");
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
    // of terms is as long as the reader made it, so it is read in the menu rather than on the key. A
    // row read as a pair names two, and shows both; read as a single value it shows the one.
    getComponentModelButtonProperties() {
        const properties = [];
        for (const parameter of this.getParametersByCategory(["model"]).filter(entry => entry.valueType === "variable")) {
            properties.push(parameter.id);
            if (this.isComponentPairMode(parameter))
                properties.push(parameter.pairedParameter);
        }
        return properties;
    },
    renderComponentModelButtonTemplate(element) {
        const modelProperties = this.getComponentModelButtonProperties();
        if (modelProperties.length === 0) {
            element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Model</span></span>`;
            return;
        }
        element.innerHTML = this.getComponentButtonTermValues(modelProperties)
            .map(value => this.createNameButtonTermMarkup(this.formatTermForDisplay(value), value))
            .filter(markup => markup !== "")
            .join(`<i class="fa-light fa-grip-lines-vertical mdl-name-btn-separator"></i>`);
    },
    // Rows that have all been handed the same term by something other than themselves are reading
    // one thing between them, so the key names it once. Rows that each chose their own are listed
    // one by one, even where two of them landed on the same term, because that is a choice repeated
    // rather than a single reading shared.
    getComponentButtonTermValues(modelProperties) {
        const values = [];
        const shared = new Set();
        for (const property of modelProperties) {
            const parameter = this.getComponentParameter(property);
            const isShared = parameter != null && this.isComponentParameterDisabled(parameter);
            const value = this.getComponentButtonTermValue(property);
            if (isShared) {
                if (shared.has(String(value)))
                    continue;
                shared.add(String(value));
            }
            values.push(value);
        }
        return values;
    },
    getComponentButtonTermValue(property) {
        const parameter = this.getComponentParameter(property);
        if (parameter && this.isComponentParameterDisabled(parameter))
            return this.getComponentDisabledTerm(parameter);
        return this.properties[property];
    },
    getComponentDisabledTerm(parameter) {
        const source = String(parameter?.disabledTerm ?? "");
        if (source !== "$independent")
            return source;
        return String(this.board.calculator?.properties?.independent?.name ?? "");
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
                // The menu is built once and then kept, so it is written again on the way up: a part
                // switched on since it was last opened, or a row grown a second selector by the key
                // that says how it is read, is offered straight away rather than only once the object
                // has been picked afresh.
                onShowing: () => this.refreshComponentModelMenu(),
                contentTemplate: contentElement => this.buildComponentModelMenu(contentElement)
            }
        });
        this._componentModelDropdownElement.appendTo(itemElement);
    },
    buildComponentModelMenu(contentElement) {
        this._componentModelContentElement = contentElement;
        this.buildComponentParameterMenu(contentElement, this.getParametersByCategory(["model", "orbits"]));
    },
    // Written again where it stands, and only while it is standing — the settings menu's own rule.
    refreshComponentModelMenu() {
        const contentElement = this._componentModelContentElement;
        if (!contentElement || !document.body.contains($(contentElement)[0]))
            return;
        this.buildComponentModelMenu(contentElement);
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
        this._componentSettingsContentElement = contentElement;
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
        Utils.renderDropdownMenuScroll(contentElement, 320, scrollContent => {
            $('<div>').appendTo(scrollContent).dxList({
                dataSource: items,
                scrollingEnabled: false,
                itemTemplate: (data, _, element) => Utils.renderDropdownListItem(element, data)
            });
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
        // A definition naming a colour parameter gets the swatch for it in the same row. The way the
        // row is read is picked from the toolbar, so the row carries only the terms and the colour —
        // it still watches the choice, since that is what says whether the pair is named.
        // A parameter saying where its value is read carries the eye that shows it, the way a body's
        // terms do; one that does not has nowhere to draw the label, so the row does not offer it.
        const modeParameter = this.getComponentParameter(parameter.modeParameter ?? "");
        const control = this.createTermControl(parameter.id, parameter.label, !!parameter.valueAnchor, {
            allowTypedValue: true,
            disabled: this.isComponentParameterDisabled(parameter),
            blank: this.isComponentParameterDisabled(parameter),
            colorProperty: parameter.colorParameter ?? "",
            extraTermProperty: parameter.pairedParameter ?? "",
            modeProperty: modeParameter ? modeParameter.id : "",
            // A component reading a plain number is measured in the unit its own definition declares
            // for that input, so the row writes the unit there rather than inventing a property the
            // object does not know. One declaring none offers no unit to a plain number.
            valueUnitProperty: parameter.unitParameter ?? "",
            showExtraTerm: () => this.isComponentPairMode(parameter)
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
                // A switch that turns a part of the object off takes that part's rows with it, so the
                // menu it was thrown in is written again rather than left listing them. It is done
                // once the switch has finished with itself, since the list it stands in is rebuilt.
                if (this.getComponentParametersGovernedBy(parameter.id).length === 0)
                    return;
                this.refreshComponentToolbarControls();
                this.refreshComponentModelMenu();
                queueMicrotask(() => this.refreshComponentSettingsMenu());
            }
        });
    },
    // Which rows a parameter decides the fate of: the ones naming it in what they are shown for.
    getComponentParametersGovernedBy(parameterId) {
        return this.getEditableParameters()
            .filter(parameter => [].concat(parameter.visibleWhen ?? []).concat(parameter.disabledWhen ?? []).some(condition => condition.parameter === parameterId));
    },
    // The settings menu is built when it is opened, so a choice made elsewhere in the toolbar — or on
    // one of its own switches — leaves it listing rows the object no longer offers. It is written
    // again where it stands, and only while it is standing.
    refreshComponentSettingsMenu() {
        const contentElement = this._componentSettingsContentElement;
        if (!contentElement || !document.body.contains($(contentElement)[0]))
            return;
        this.buildComponentSettingsMenu(contentElement);
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
            items: parameter.enumValues.map(value => ({ value: value, text: ComponentShapeToolbarMixin.formatChoiceLabel(value) })),
            valueExpr: "value",
            displayExpr: "text",
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
        const items = parameter.enumValues.map((value, index) => ({ value: value, icon: parameter.enumIcons[index], hint: ComponentShapeToolbarMixin.formatChoiceLabel(value) }));
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
            onItemClick: event => {
                this.setPropertyCommand(parameter.id, event.itemData.value);
                if (this.getComponentParametersGovernedBy(parameter.id).length === 0)
                    return;
                this.refreshComponentToolbarControls();
                this.refreshComponentModelMenu();
                queueMicrotask(() => this.refreshComponentSettingsMenu());
            }
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
        this.refreshComponentModeDropDownButtons();
        const buttonContentElement = this._componentModelDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderComponentModelButtonTemplate(buttonContentElement);
        for (const controls of Object.values(this._componentTermControls ?? {}))
            controls?.termControl?.refresh();
        for (const control of Object.values(this._componentTermsControls ?? {}))
            control.refresh();
        this._axisRangeControl?.refresh();
    },
    // An object built from blocks is the one shape whose toolbar shows a value rather than only the
    // name of the term holding it: a row naming no term holds the number itself, and an interaction
    // writes that number. So the key that reads the model, and the row behind it, are refreshed
    // whenever the object writes one of its own parameters.
    refreshContextToolbarControls() {
        BaseShape.prototype.refreshContextToolbarControls.call(this);
        this.refreshComponentToolbarControls();
    },
    showContextToolbar() {
        this.refreshComponentToolbarControls();
        BaseShape.prototype.showContextToolbar.call(this);
    }
};

if (typeof ComponentShape !== "undefined") Object.assign(ComponentShape.prototype, CharacterPickerMixin, ComponentShapeToolbarMixin);
