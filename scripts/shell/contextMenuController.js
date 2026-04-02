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
                text: this.shell.board.translations.get("Select"),
                icon: "fa-light fa-arrow-pointer",
                shortcut: "",
                name: "Shapes",
                items: []
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
        this._refreshShapesMenu();
        this.instance.show();
    }

    _refreshShapesMenu() {
        const allShapes = this.shell.board.shapes.shapes;
        const rootShapes = allShapes.filter(shape => !shape.parent);
        const shapeItems = rootShapes.map(shape => this._buildShapeMenuItem(shape));
        const dataSource = this.instance.option("dataSource");
        const shapesEntry = dataSource.find(item => item.name === "Shapes");
        if (shapesEntry)
            shapesEntry.items = shapeItems;
        this.instance.option("dataSource", dataSource);
    }

    _buildShapeMenuItem(shape) {
        const item = BaseShape.buildShapeTreeItem(shape);
        item.shortcut = "";
        item.name = `Shape_${shape.id}`;
        item.action = () => this.shell.board.selectShape(shape);
        if (item.items?.length)
            item.items = item.items.map(child => this._enrichShapeMenuItem(child));
        else
            item.items = undefined;
        return item;
    }

    _enrichShapeMenuItem(treeItem) {
        const shape = this.shell.board.shapes.getById(treeItem.id);
        treeItem.shortcut = "";
        treeItem.name = `Shape_${treeItem.id}`;
        treeItem.action = () => { if (shape) this.shell.board.selectShape(shape); };
        if (treeItem.items?.length)
            treeItem.items = treeItem.items.map(child => this._enrichShapeMenuItem(child));
        else
            treeItem.items = undefined;
        return treeItem;
    }
}
