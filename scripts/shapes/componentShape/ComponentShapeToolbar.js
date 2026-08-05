var ComponentShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ComponentShapeToolbarMixin.createToolbar);
        this._componentTermControls = {};
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
    populateShapeColorMenuSections(sections) {
        for (const parameter of this.getParametersByCategory(["style"])) {
            const picker = this.createComponentParameterControl(parameter);
            sections[0].items.push({
                text: parameter.label,
                iconHtml: this.menuIconHtml("fa-droplet", true),
                buildControl: $container => $container.append(picker)
            });
        }
    },
    renderComponentModelButtonTemplate(element) {
        const modelParameters = this.getParametersByCategory(["model"]);
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
                contentTemplate: contentElement => this.buildComponentParameterMenu(contentElement, this.getParametersByCategory(["model", "orbits"]), true)
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
        const parameters = this.getParametersByCategory(["display", "scale", "interaction", "general"]);
        const items = parameters.map(parameter => ({
            text: parameter.label,
            stacked: parameter.valueType === "variable",
            buildControl: $container => $container.append(this.createComponentParameterControl(parameter))
        }));
        if (BlockObjectLibrary.getDocument(this.getComponentType()))
            items.push({
                text: this.board.translations.get("Copy Object Definition"),
                buildControl: $container => $container.append(this.createCopyDefinitionButton())
            });
        this.renderComponentMenuList(contentElement, items);
    },
    // The definition document is what the catalogue's object editor takes, so an object invented on
    // the board — by the agent or by hand — can be published without being written out again.
    createCopyDefinitionButton() {
        const button = $('<div class="mdl-copy-definition-button">');
        button.dxButton({
            icon: "fa-light fa-copy",
            stylingMode: "text",
            onClick: () => this.copyComponentDefinition()
        });
        return button;
    },
    copyComponentDefinition() {
        const definitionDocument = BlockObjectLibrary.getDocument(this.getComponentType());
        navigator.clipboard.writeText(JSON.stringify(definitionDocument, null, 4));
        DevExpress.ui.notify(this.board.translations.get("Definition Copied"), "success", 2000);
    },
    buildComponentParameterMenu(contentElement, parameters, stacked) {
        const items = parameters.map(parameter => ({
            text: parameter.label,
            stacked: stacked && parameter.valueType === "variable",
            buildControl: $container => $container.append(this.createComponentParameterControl(parameter))
        }));
        this.renderComponentMenuList(contentElement, items);
    },
    renderComponentMenuList(contentElement, items) {
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 320, width: "100%" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: items,
            scrollingEnabled: false,
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = data.stacked
                    ? `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><div class="mdl-dropdown-list-stacked-control"></div></div>`
                    : `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                const controlSelector = data.stacked ? ".mdl-dropdown-list-stacked-control" : ".mdl-dropdown-list-control";
                data.buildControl($(element).find(controlSelector));
            }
        });
    },
    createComponentParameterControl(parameter) {
        if (parameter.valueType === "variable")
            return this.createComponentVariableControl(parameter);
        if (parameter.valueType === "colour")
            return this.createColorPickerEditor(parameter.id);
        if (parameter.valueType === "boolean")
            return this.createComponentBooleanControl(parameter);
        if (parameter.valueType === "number")
            return this.createComponentNumberControl(parameter);
        if (parameter.enumValues)
            return this.createComponentEnumControl(parameter);
        return this.createComponentTextControl(parameter);
    },
    createComponentVariableControl(parameter) {
        // A component input takes a model variable or a plain number, so the selector accepts both.
        const control = this.createTermControl(parameter.id, parameter.label, false, { allowTypedValue: true });
        this._componentTermControls[parameter.id] = this.termFormControls[parameter.id];
        return control;
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
        return $('<div>').dxSelectBox({
            items: parameter.enumValues,
            value: this.properties[parameter.id],
            width: 130,
            stylingMode: "filled",
            onValueChanged: event => {
                if (!event.event)
                    return;
                this.setPropertyCommand(parameter.id, event.value);
            }
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
    },
    showContextToolbar() {
        this.refreshComponentToolbarControls();
        BaseShape.prototype.showContextToolbar.call(this);
    }
};

if (typeof ComponentShape !== "undefined") Object.assign(ComponentShape.prototype, ComponentShapeToolbarMixin);
