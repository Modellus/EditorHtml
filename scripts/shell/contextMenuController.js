class ContextMenuController {
    constructor(shell) {
        this._menuController = new MenuController({
            type: "board",
            translations: shell.board.translations,
            isReadOnly: !!window.modellusReadOnly,
            canSave: !!(shell.modelsApiClient && !shell.isAnonymous()),
            clear: () => shell.confirmClearKeepIdentity(),
            save: () => shell.saveToApi(),
            saveAs: () => shell.saveAsModel(),
            duplicate: () => shell.duplicateModel(),
            importFromFile: () => shell.importFromFile(),
            exportToFile: () => shell.exportToFile(),
            exportData: () => shell.exportData(),
            exit: () => shell.exitEditor()
        });
    }

    show() {
        this._menuController.show();
    }
}
