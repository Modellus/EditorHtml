class SettingsController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.form = null;
        this.colorControl = null;
        this._createPopup();
    }

    getColorControl() {
        if (!this.colorControl)
            this.colorControl = new ColorControl();
        return this.colorControl;
    }

    createColorPickerEditor(itemElement, fieldName) {
        const colorPicker = this.getColorControl().createEditor(this.shell.properties[fieldName], value => this.shell.setPropertyCommand(fieldName, value));
        $(itemElement).append(colorPicker);
    }

    _createPopup() {
        $("#settings-popup").dxPopup({
            width: 400,
            height: 400,
            dragEnabled: false,
            shading: false,
            title: this.shell.board.translations.get("Settings Title"),
            showTitle: true,
            hideOnOutsideClick: true,
            contentTemplate: () => this._createForm(),
            position: {
                at: "center",
                of: window
            }
        });
        this.popup = $("#settings-popup").dxPopup("instance");
    }

    _createForm() {
        const $form = $("<div id='settings-form'></div>").dxForm({
            colCount: 2,
            formData: this.shell.properties,
            items: [
                {
                    colSpan: 2,
                    dataField: "educationLevel",
                    label: {
                        text: "Theme"
                    },
                    editorType: "dxButtonGroup",
                    editorOptions: {
                        items: [
                            { key: "midSchool", icon: "fa-light fa-pencil", text: this.shell.board.translations.get("Mid School") },
                            { key: "university", icon: "fa-light fa-graduation-cap", text: this.shell.board.translations.get("University") }
                        ],
                        keyExpr: "key",
                        selectedItemKeys: [this.shell.properties.educationLevel],
                        stylingMode: "outlined",
                        elementAttr: { class: "mdl-pill-group" },
                        buttonTemplate: (data, container) => {
                            container[0].innerHTML = `<i class="dx-icon ${data.icon}"></i><span class="mdl-button-text">${data.text}</span>`;
                        },
                        onContentReady: e => this._initPillButtonGroup(e.element[0]),
                        onSelectionChanged: e => {
                            if (e.addedItems.length > 0)
                                this.shell.setPropertyCommand("educationLevel", e.addedItems[0].key);
                            this._movePill(e.component.element()[0]);
                            e.component.repaint();
                        }
                    }
                },
                {
                    colSpan: 1,
                    dataField: "backgroundColor",
                    label: {
                        text: this.shell.board.translations.get("Background Color")
                    },
                    template: (data, itemElement) => this.createColorPickerEditor(itemElement, "backgroundColor")
                },
                {
                    colSpan: 1,
                    dataField: "gridSize",
                    label: {
                        text: this.shell.board.translations.get("Grid Size")
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        min: 5,
                        max: 100,
                        step: 5,
                        showSpinButtons: true,
                        stylingMode: "filled",
                        inputAttr: { style: "font-family: Atma, sans-serif" }
                    }
                },
                {
                    itemType: "group",
                    colSpan: 2,
                    colCount: 4,
                    items: [
                        {
                            dataField: "iterationTerm",
                            label: {
                                text: this.shell.board.translations.get("IterationTerm")
                            },
                            editorType: "dxTextBox",
                            editorOptions: {
                                stylingMode: "filled",
                                elementAttr: { class: "mdl-math-input" }
                            }
                        },
                        {
                            dataField: "casesCount",
                            label: {
                                text: this.shell.board.translations.get("CasesCount")
                            },
                            editorType: "dxNumberBox",
                            editorOptions: {
                                min: 1,
                                max: 9,
                                step: 1,
                                showSpinButtons: true,
                                stylingMode: "filled",
                                elementAttr: { class: "mdl-math-input" }
                            }
                        },
                        {
                            colSpan: 2,
                            dataField: "iterationDuration",
                            label: { text: "Iteration Duration (seconds)" },
                            editorType: "dxNumberBox",
                            editorOptions: {
                                stylingMode: "filled",
                                min: 0,
                                showClearButton: true,
                                inputAttr: { style: "font-family: Atma, sans-serif" }
                            }
                        }
                    ]
                },
                {
                    colSpan: 2,
                    dataField: "instructions",
                    label: { text: "AI Instructions" },
                    editorType: "dxTextArea",
                    editorOptions: {
                        height: 120,
                        stylingMode: "filled",
                        placeholder: "e.g. when x is 10, change y to 100"
                    }
                }
            ],
            onFieldDataChanged: e => this.shell.setPropertyCommand(e.dataField, e.value),
        });
        this.form = $form.dxForm("instance");
        return $form;
    }

    _initPillButtonGroup(element) {
        const pill = document.createElement("div");
        pill.className = "mdl-pill";
        element.style.position = "relative";
        element.appendChild(pill);
        this._movePill(element);
    }

    _movePill(element) {
        const pill = element.querySelector(".mdl-pill");
        if (!pill)
            return;
        const selected = element.querySelector(".dx-item-selected .dx-button");
        if (!selected)
            return;
        pill.style.left = selected.offsetLeft + "px";
        pill.style.width = selected.offsetWidth + "px";
    }

    open() {
        this.shell.board.deselect();
        if (this.form) {
            this.form.formData = null;
            this.form.updateData(this.shell.properties);
        }
        this.popup.show();
    }
}
