class ContextMenuController {
    constructor(shell) {
        this.shell = shell;
        this.instance = null;
        this._create();
    }

    _create() {
        const isMac = /mac/i.test(navigator.platform);
        const mod = isMac ? "⌘" : "Ctrl+";
        const menuItems = [
            {
                text: this.shell.board.translations.get("Clear"),
                icon: "fa-light fa-file",
                shortcut: `${mod}N`,
                name: "Clear",
                action: _ => this.shell.clearKeepIdentity()
            },
            {
                text: this.shell.board.translations.get("Save") + "...",
                icon: "fa-light fa-cloud-arrow-down",
                shortcut: `${mod}S`,
                name: "Save",
                action: _ => this.shell.saveToApi()
            },
            {
                text: this.shell.board.translations.get("Duplicate") + "...",
                icon: "fa-light fa-clone",
                shortcut: `${mod}D`,
                name: "Duplicate",
                action: _ => this.shell.duplicateModel()
            },
            {
                text: this.shell.board.translations.get("Import"),
                icon: "fa-light fa-arrow-up-from-square",
                shortcut: "",
                beginGroup: true,
                name: "Import",
                items: [
                    {
                        text: this.shell.board.translations.get("From file"),
                        icon: "fa-light fa-file-import",
                        shortcut: `${mod}O`,
                        name: "ImportFromFile",
                        action: _ => this.shell.importFromFile()
                    }
                ]
            },
            {
                text: this.shell.board.translations.get("Data"),
                icon: "fa-light fa-table",
                shortcut: "",
                name: "Data",
                items: [
                    {
                        text: this.shell.board.translations.get("Data from file"),
                        icon: "fa-light fa-file-csv",
                        shortcut: "",
                        name: "ImportDataFromFile",
                        action: _ => this.shell.importDataFromFile()
                    },
                    {
                        text: this.shell.board.translations.get("Data from URL"),
                        icon: "fa-light fa-link",
                        shortcut: "",
                        name: "ImportDataFromUrl",
                        action: _ => this.shell.importDataFromUrl()
                    },
                    {
                        text: this.shell.board.translations.get("Preloaded Data"),
                        icon: "fa-light fa-eye",
                        shortcut: "",
                        name: "ShowPreloadedData",
                        action: _ => this.shell.showDataPopup()
                    },
                    {
                        text: this.shell.board.translations.get("Clear Data"),
                        icon: "fa-light fa-trash-can",
                        shortcut: "",
                        name: "ClearPreloadedData",
                        action: _ => this.shell.clearPreloadedData()
                    }
                ]
            },
            {
                text: this.shell.board.translations.get("Export"),
                icon: "fa-light fa-arrow-down-to-square",
                shortcut: "",
                name: "Export",
                items: [
                    {
                        text: this.shell.board.translations.get("To file"),
                        icon: "fa-light fa-file-export",
                        shortcut: "",
                        name: "ExportToFile",
                        action: _ => this.shell.exportToFile()
                    },
                    {
                        text: this.shell.board.translations.get("Data"),
                        icon: "fa-light fa-file-excel",
                        shortcut: "",
                        name: "ExportData",
                        action: _ => this.shell.exportData()
                    }
                ]
            },
            {
                text: this.shell.board.translations.get("Settings..."),
                icon: "fa-light fa-gear",
                shortcut: "",
                beginGroup: true,
                name: "Settings",
                action: _ => this.shell.openSettings()
            },
            {
                text: this.shell.board.translations.get("More Models"),
                icon: "fa-light fa-chevrons-left",
                shortcut: "",
                beginGroup: true,
                name: "More Models",
                action: _ => this.shell.exitEditor()
            }
        ];
        $("#context-menu").dxContextMenu({
            dataSource: menuItems,
            itemTemplate: itemData => {
                const hasChildren = itemData?.items?.length > 0;
                if (itemData.name?.startsWith("Shape_"))
                    return `<div style="display: flex; align-items: center; width: 100%">
                                <span style="flex-grow: 1">${BaseShape.renderShapeTreeItemHtml(itemData)}</span>
                                <span style="width: 12px; text-align: right;">${hasChildren ? "<i class='fa-light fa-chevron-right'></i>" : ""}</span>
                            </div>`;
                return `<div style="display: flex; justify-content: space-between; align-items: center;width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                            <span style="color: #999;">${itemData.shortcut}</span>
                            <span style="width: 12px; text-align: right;">${hasChildren ? "<i class='fa-light fa-chevron-right'></i>" : ""}</span>
                        </div>`;
            },
            onItemClick: e => {
                if (e.itemData && e.itemData.action)
                    e.itemData.action();
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
