const defaultNotebookApiBase = "https://modellus-api.interactivebook.workers.dev";

async function refreshNotebookSession(apiBase) {
    const { UserSdk } = await import("../../../sdk/userSdk.js");
    const userSdk = new UserSdk("mp.session", "mp.user", "/pages/login/index.html", "modellus_id_token", "/pages/marketplace/index.html");
    return userSdk.refreshSession(apiBase);
}

function updateNotebookSaveCapability(notebookEditor, model) {
    const session = ModelAccessBootstrap.getSession();
    const currentUserId = session?.userId || "";
    const modelOwnerId = model?.userId || "";
    const canSave = Boolean(currentUserId) && Boolean(modelOwnerId) && currentUserId === modelOwnerId;
    notebookEditor._menuController.controller.canSave = canSave;
    notebookEditor._menuController.refresh();
    if (canSave)
        notebookEditor._modelId = model.id;
}

async function createOfflineNotebookEditor() {
    return new NotebookEditor();
}

async function createOnlineNotebookEditor(options = {}) {
    const apiBase = options.apiBase || defaultNotebookApiBase;
    const urlParameters = new URLSearchParams(window.location.search);
    const modelId = urlParameters.get("model_id");
    const notebookEditor = new NotebookEditor();
    if (!modelId)
        return notebookEditor;
    try {
        const accessResult = await ModelAccessBootstrap.resolveModelAccess(apiBase, modelId, refreshNotebookSession);
        if (accessResult.mode === "login-required") {
            window.location.href = "/pages/login/index.html";
            return null;
        }
        if (accessResult.mode === "error")
            throw new Error(`Failed to load notebook (${accessResult.status})`);
        const model = accessResult.model;
        if (model?.definition)
            notebookEditor.deserialize(model.definition);
        if (accessResult.mode === "editable")
            notebookEditor.setupCollab(modelId);
        updateNotebookSaveCapability(notebookEditor, accessResult.mode === "editable" ? model : null);
        return notebookEditor;
    } catch (error) {
        console.error("Failed to load notebook:", error);
        return notebookEditor;
    }
}

var NotebookBootstrap = {
    startOffline: () => createOfflineNotebookEditor(),
    startOnline: options => createOnlineNotebookEditor(options)
};
