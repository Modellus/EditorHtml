class SettingsController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.form = null;
        this._createPopup();
    }

    _createPopup() {
        $("#settings-popup").dxPopup({
            width: 480,
            height: 320,
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

    open() {
        this.shell.board.deselect();
        if (this.form) {
            this.form.formData = null;
            this.form.updateData(this.shell.properties);
        }
        this.popup.show();
    }
}
