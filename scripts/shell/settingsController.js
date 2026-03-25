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
        const colorPicker = this.getColorControl().createEditor(this.shell.properties[fieldName], value => this.shell.setProperty(fieldName, value));
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
                    dataField: "language",
                    editorType: "dxSelectBox",
                    editorOptions: {
                        items: ["en-US", "pt-BR"],
                        value: this.shell.properties.language
                    }
                },
                {
                    colSpan: 2,
                    dataField: "backgroundColor",
                    label: {
                        text: this.shell.board.translations.get("Background Color")
                    },
                    template: (data, itemElement) => this.createColorPickerEditor(itemElement, "backgroundColor")
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
                            dataField: "precision",
                            label: {
                                text: this.shell.board.translations.get("Precision")
                            },
                            editorType: "dxNumberBox",
                            editorOptions: {
                                min: 0,
                                max: 10,
                                step: 1,
                                showSpinButtons: true,
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
                            dataField: "angleUnit",
                            label: {
                                text: this.shell.board.translations.get("AngleUnit")
                            },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                items: [
                                    { key: "radians", icon: "fa-light fa-pi",    hint: "Radians" },
                                    { key: "degrees", icon: "fa-light fa-angle", hint: "Degrees" }
                                ],
                                keyExpr: "key",
                                selectedItemKeys: [this.shell.properties.angleUnit],
                                stylingMode: "outlined",
                                elementAttr: { class: "mdl-pill-group mdl-small-icon" },
                                buttonTemplate: (data, container) => {
                                    container[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
                                },
                                onContentReady: e => this._initPillButtonGroup(e.element[0]),
                                onSelectionChanged: e => {
                                    if (e.addedItems.length > 0)
                                        this.shell.setProperty("angleUnit", e.addedItems[0].key);
                                    this._movePill(e.component.element()[0]);
                                    e.component.repaint();
                                }
                            }
                        }
                    ]
                },
                {
                    colSpan: 1,
                    dataField: "independent.name",
                    label: {
                        text: this.shell.board.translations.get("Independent.Name")
                    },
                    editorType: "dxTextBox",
                    editorOptions: {
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" }
                    }
                },
                {
                    itemType: "group",
                    colSpan: 1,
                    colCount: 2,
                    items: [
                        {
                            dataField: "independent.step",
                            label: {
                                text: this.shell.board.translations.get("Independent.Step")
                            },
                            editorType: "dxNumberBox",
                            editorOptions: {
                                stylingMode: "filled",
                                elementAttr: { class: "mdl-math-input" }
                            }
                        },
                        {
                            dataField: "independent.noLimit",
                            label: { text: "Type" },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                items: [
                                    { key: false, icon: "fa-light fa-bracket-square-right", hint: "Limited" },
                                    { key: true,  icon: "fa-light fa-infinity",             hint: "Unlimited" }
                                ],
                                keyExpr: "key",
                                selectedItemKeys: [this.shell.properties.independent.noLimit],
                                stylingMode: "outlined",
                                elementAttr: { class: "mdl-pill-group mdl-small-icon" },
                                buttonTemplate: (data, container) => {
                                    container[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
                                },
                                onContentReady: e => this._initPillButtonGroup(e.element[0]),
                                onSelectionChanged: e => {
                                    if (e.addedItems.length > 0) {
                                        const noLimit = e.addedItems[0].key;
                                        this.shell.setProperty("independent.noLimit", noLimit);
                                        this.form.getEditor("independent.end").option("disabled", noLimit);
                                    }
                                    this._movePill(e.component.element()[0]);
                                    e.component.repaint();
                                }
                            }
                        }
                    ]
                },
                {
                    colSpan: 1,
                    dataField: "independent.start",
                    label: {
                        text: this.shell.board.translations.get("Independent.Start")
                    },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        stylingMode: "filled",
                        elementAttr: { class: "mdl-math-input" }
                    }
                },
                {
                    colSpan: 1,
                    dataField: "independent.end",
                    label: { text: this.shell.board.translations.get("Independent.End") },
                    editorType: "dxNumberBox",
                    editorOptions: {
                        stylingMode: "filled",
                        disabled: this.shell.properties.independent.noLimit,
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
                        showClearButton: true
                    }
                }
            ],
            onFieldDataChanged: e => this.shell.setProperty(e.dataField, e.value),
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
            this.form.getEditor("independent.end")?.option("disabled", this.shell.properties.independent.noLimit);
        }
        this.popup.show();
    }
}
