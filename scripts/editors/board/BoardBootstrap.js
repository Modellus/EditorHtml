const defaultBoardApiBase = "https://modellus-api.interactivebook.workers.dev";

function extractBoardModelPayload(model) {
    if (!model)
        return null;
    if (typeof model.definition === "string" && model.definition.trim())
        return model.definition;
    if (typeof model.definition === "object" && model.definition)
        return JSON.stringify(model.definition);
    return null;
}

function applyBoardModelMetadata(boardEditor, model) {
    if (!boardEditor || !model)
        return;
    if (typeof model.title === "string")
        boardEditor.properties.name = model.title;
    if (typeof model.description === "string")
        boardEditor.properties.description = model.description;
    if (typeof model.thumbnail_url === "string" && model.thumbnail_url.trim())
        boardEditor.properties.thumbnailUrl = model.thumbnail_url.trim();
    if (model.user_id)
        boardEditor.modelCreatorId = model.user_id;
    if (model.creator_name)
        boardEditor.modelCreatorName = model.creator_name;
    if (model.creator_avatar)
        boardEditor.modelCreatorAvatar = model.creator_avatar;
    boardEditor.topToolbar?.updateModelInfo();
    boardEditor.topToolbar?.updateCollabButtonVisibility();
}

function isBoardNetworkFetchError(error) {
    if (!(error instanceof TypeError))
        return false;
    const message = String(error?.message ?? "");
    return message.toLowerCase().includes("fetch");
}

function redirectBoardToLogin() {
    window.location.href = "/pages/login/index.html";
}

function createOfflineBoardEditor() {
    const storedModel = sessionStorage.getItem("mp.anon.model");
    const modelSession = new ModelSession(null);
    const boardEditor = new BoardEditor(modelSession, storedModel || null);
    boardEditor.saveToApi = () => boardEditor.exportToFile();
    boardEditor.saveAsModel = () => boardEditor.exportToFile();
    boardEditor.duplicateModel = () => {};
    return boardEditor;
}

async function createOnlineBoardEditor(options = {}) {
    const apiBase = options.apiBase || defaultBoardApiBase;
    const urlParameters = new URLSearchParams(window.location.search);
    const modelName = urlParameters.get("model");
    const modelId = urlParameters.get("model_id");
    const { ModelsApiClient } = await import("../../../sdk/modelsApiClient.js");
    const modelsApiClient = new ModelsApiClient(
        apiBase,
        () => ModelAccessBootstrap.getSession(),
        () => {
            const currentSession = ModelAccessBootstrap.getSession();
            return currentSession?.userId || "";
        }
    );
    const modelSession = new ModelSession(modelsApiClient);
    const sessionContext = await AuthenticatedEditorBootstrap.initializeSession(apiBase, () => redirectBoardToLogin());
    if (modelId) {
        try {
            const accessResult = await AuthenticatedEditorBootstrap.resolveModelAccess(apiBase, modelId, sessionContext.userSdk);
            if (accessResult.mode === "editable") {
                const payload = extractBoardModelPayload(accessResult.model);
                const boardEditor = new BoardEditor(modelSession, payload || null);
                applyBoardModelMetadata(boardEditor, accessResult.model);
                boardEditor.setupCollab(modelId);
                if (urlParameters.get("new") === "1") {
                    boardEditor.properties.name = boardEditor.board.translations.get("New Model");
                    boardEditor.topToolbar?.updateModelName();
                }
                return boardEditor;
            }
            if (accessResult.mode === "readonly") {
                const payload = extractBoardModelPayload(accessResult.model);
                const boardEditor = new BoardEditor(modelSession, payload || null);
                applyBoardModelMetadata(boardEditor, accessResult.model);
                return boardEditor;
            }
            if (accessResult.mode === "login-required") {
                redirectBoardToLogin();
                return null;
            }
            if (accessResult.mode === "error")
                throw new Error(`Failed to load model (${accessResult.status})`);
            redirectBoardToLogin();
            return null;
        } catch (error) {
            if (isBoardNetworkFetchError(error))
                return new BoardEditor(modelSession, null);
            throw error;
        }
    }
    if (!sessionContext.hasValidSession) {
        ModelAccessBootstrap.clearAuthState();
        if (modelName) {
            const response = await fetch(`../../resources/models/${modelName}.json`);
            const payload = await response.text();
            return new BoardEditor(modelSession, payload);
        }
        const anonymousModel = sessionStorage.getItem("mp.anon.model");
        return new BoardEditor(modelSession, anonymousModel || null);
    }
    if (modelName) {
        const response = await fetch(`../../resources/models/${modelName}.json`);
        const payload = await response.text();
        return new BoardEditor(modelSession, payload);
    }
    return new BoardEditor(modelSession, null);
}

var BoardBootstrap = {
    startOffline: () => createOfflineBoardEditor(),
    startOnline: options => createOnlineBoardEditor(options)
};
