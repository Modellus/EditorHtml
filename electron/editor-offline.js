DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

var shell = null;

async function initOnline() {
    const { ModelsApiClient } = await import("./sdk/modelsApiClient.js");
    const apiBase = "https://modellus-api.interactivebook.workers.dev";
    const modelsApiClient = new ModelsApiClient(
        apiBase,
        () => window.modellus?.auth?.getSession?.() ?? null,
        () => window.modellus?.auth?.getSession?.()?.userId ?? ""
    );
    const storedModel = sessionStorage.getItem("mp.anon.model");
    shell = new Shell(storedModel || null, modelsApiClient);
}

function initOffline() {
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
}

(async () => {
    if (navigator.onLine)
        await initOnline();
    else
        initOffline();
    window.addEventListener("online", () => location.reload());
    window.addEventListener("offline", () => location.reload());
})();
