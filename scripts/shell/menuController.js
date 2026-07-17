class MenuController {
    constructor(controller) {
        this.controller = controller;
        this.instance = null;
        this._create();
    }

    _t(key) {
        return this.controller.translations?.get(key) ?? key;
    }

    _notebookItems(mod) {
        const canSave = this.controller.canSave;
        return [
            ...(canSave ? [
                {
                    text: this._t("Save") + "...",
                    icon: "fa-light fa-cloud-arrow-down",
                    shortcut: `${mod}S`,
                    name: "Save",
                    action: () => this.controller.save()
                }
            ] : []),
            {
                text: this._t("More Models"),
                icon: "fa-light fa-chevrons-left",
                shortcut: "",
                name: "Models",
                action: () => this.controller.exit()
            }
        ];
    }

    refresh() {
        if (this.instance)
            this.instance.option("dataSource", this._buildItems());
    }

    _boardItems(mod) {
        const canSave = this.controller.canSave;
        const canSaveAs = this.controller.canSaveAs;
        return [
            {
                text: this._t("Clear"),
                icon: "fa-light fa-file",
                shortcut: `${mod}N`,
                name: "Clear",
                action: () => this.controller.clear()
            },
            ...(canSave ? [
                {
                    text: this._t("Save") + "...",
                    icon: "fa-light fa-cloud-arrow-down",
                    shortcut: `${mod}S`,
                    name: "Save",
                    action: () => this.controller.save()
                }
            ] : []),
            ...(canSaveAs ? [
                {
                    text: this._t("Save As") + "...",
                    icon: "fa-light fa-cloud-arrow-down",
                    shortcut: `${mod}⇧S`,
                    name: "SaveAs",
                    action: () => this.controller.saveAs()
                }
            ] : []),
            {
                text: this._t("Duplicate") + "...",
                icon: "fa-light fa-clone",
                shortcut: `${mod}D`,
                name: "Duplicate",
                action: () => this.controller.duplicate()
            },
            {
                text: this._t("Import"),
                icon: "fa-light fa-arrow-up-from-square",
                shortcut: "",
                beginGroup: true,
                name: "Import",
                items: [
                    {
                        text: this._t("From file"),
                        icon: "fa-light fa-file-import",
                        shortcut: `${mod}O`,
                        name: "ImportFromFile",
                        action: () => this.controller.importFromFile()
                    }
                ]
            },
            {
                text: this._t("Export"),
                icon: "fa-light fa-arrow-down-to-square",
                shortcut: "",
                name: "Export",
                items: [
                    {
                        text: this._t("To file"),
                        icon: "fa-light fa-file-export",
                        shortcut: "",
                        name: "ExportToFile",
                        action: () => this.controller.exportToFile()
                    },
                    {
                        text: this._t("Data"),
                        icon: "fa-light fa-file-excel",
                        shortcut: "",
                        name: "ExportData",
                        action: () => this.controller.exportData()
                    }
                ]
            },
            {
                text: this._t("More Models"),
                icon: "fa-light fa-chevrons-left",
                shortcut: "",
                beginGroup: true,
                name: "Models",
                action: () => this.controller.exit()
            }
        ];
    }

    _buildItems() {
        const isMac = /mac/i.test(navigator.platform);
        const mod = isMac ? "⌘" : "Ctrl+";
        if (this.controller.type === "notebook")
            return this._notebookItems(mod);
        return this._boardItems(mod);
    }

    _create() {
        $("#context-menu").dxContextMenu({
            dataSource: this._buildItems(),
            itemTemplate: itemData => {
                const hasChildren = itemData?.items?.length > 0;
                return `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                            <span style="color: #999;">${itemData.shortcut ?? ""}</span>
                            <span style="width: 12px; text-align: right;">${hasChildren ? "<i class='fa-light fa-chevron-right'></i>" : ""}</span>
                        </div>`;
            },
            onItemClick: event => {
                if (event.itemData?.action)
                    event.itemData.action();
            },
            target: "#toolbar",
            position: {
                my: "top left",
                at: "bottom left",
                of: "#menu-button",
                offset: "0 10"
            }
        });
        this.instance = $("#context-menu").dxContextMenu("instance");
    }

    show() {
        this.instance.show();
    }
}
