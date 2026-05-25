DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

var shell = null;

(async () => {
    const storedModel = sessionStorage.getItem("mp.anon.model");
    shell = new Shell(storedModel || null, null);
    shell.saveToApi = () => shell.exportToFile();
    shell.saveAsModel = () => shell.exportToFile();
    shell.duplicateModel = () => {};
    const menuInstance = $("#context-menu").dxContextMenu("instance");
    if (menuInstance) {
        const filteredItems = menuInstance.option("items").filter(item =>
            item.name !== "Save" && item.name !== "SaveAs" && item.name !== "Models"
        );
        menuInstance.option("items", filteredItems);
    }
})();
