const defaultNotebookApiBase = "https://modellus-api.interactivebook.workers.dev";

function redirectNotebookToLogin() {
    window.location.href = "/pages/login/index.html";
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
    const sessionContext = await AuthenticatedEditorBootstrap.initializeSession(apiBase, () => redirectNotebookToLogin());
    const { ModelsApiClient } = await import("../../../sdk/modelsApiClient.js");
    const modelsApiClient = new ModelsApiClient(
        apiBase,
        () => ModelAccessBootstrap.getSession(),
        () => {
            const currentSession = ModelAccessBootstrap.getSession();
            return currentSession?.userId || "";
        }
    );
    const notebookEditor = new NotebookEditor();
    notebookEditor.setModelsApiClient(modelsApiClient);
    if (!modelId)
        return notebookEditor;
    try {
        const accessResult = await AuthenticatedEditorBootstrap.resolveModelAccess(apiBase, modelId, sessionContext.userSdk);
        if (accessResult.mode === "login-required") {
            redirectNotebookToLogin();
            return null;
        }
        if (accessResult.mode === "error")
            throw new Error(`Failed to load notebook (${accessResult.status})`);
        const model = accessResult.model;
        if (model?.definition)
            notebookEditor.deserialize(model.definition);
        if (typeof model?.thumbnail_url === "string" && model.thumbnail_url.trim())
            notebookEditor.setCoverImageUrl(model.thumbnail_url.trim());
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
