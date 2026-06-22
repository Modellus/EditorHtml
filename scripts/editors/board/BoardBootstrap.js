const defaultBoardApiBase = "https://modellus-api.interactivebook.workers.dev";

function getCurrentBoardSession() {
    return window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
}

function getBoardAuthHeaders() {
    const currentSession = getCurrentBoardSession();
    if (currentSession && currentSession.token)
        return { Authorization: `Bearer ${currentSession.token}` };
    return {};
}

function decodeBoardJwtPayload(token) {
    try {
        const payloadPart = token.split(".")[1];
        const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = normalizedPayload + "===".slice((normalizedPayload.length + 3) % 4);
        return JSON.parse(atob(paddedPayload));
    } catch {
        return null;
    }
}

function isBoardTokenValid(token) {
    const payload = decodeBoardJwtPayload(token);
    if (!payload?.exp)
        return false;
    const currentSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > currentSeconds + 30;
}

function hasBoardValidSession() {
    const currentSession = getCurrentBoardSession();
    if (!currentSession?.token)
        return false;
    return isBoardTokenValid(currentSession.token);
}

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
    if (typeof model.thumbnail === "string" && model.thumbnail.trim())
        boardEditor.properties.thumbnailUrl = model.thumbnail.trim();
    if (model.user_id)
        boardEditor.modelCreatorId = model.user_id;
    if (model.creator_name)
        boardEditor.modelCreatorName = model.creator_name;
    if (model.creator_avatar)
        boardEditor.modelCreatorAvatar = model.creator_avatar;
    boardEditor.topToolbar?.updateModelInfo();
    boardEditor.topToolbar?.updateCollabButtonVisibility();
}

function enableBoardReadOnlyMode() {
    window.modellusReadOnly = true;
    document.body.classList.add("read-only");
}

async function loadBoardModel(apiBase, modelId, headers) {
    const response = await fetch(`${apiBase}/models/${modelId}`, { headers });
    if (!response.ok) {
        const error = new Error(`Failed to load model (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

function isBoardUnauthorizedError(error) {
    return Number(error?.status) === 401;
}

function isBoardNetworkFetchError(error) {
    if (!(error instanceof TypeError))
        return false;
    const message = String(error?.message ?? "");
    return message.toLowerCase().includes("fetch");
}

function clearBoardAuthState() {
    try {
        const sessionStorageKey = window.modellus?.auth?.sessionKey || "mp.session";
        const userStorageKey = window.modellus?.auth?.userKey || "mp.user";
        localStorage.removeItem(sessionStorageKey);
        localStorage.removeItem(userStorageKey);
        localStorage.removeItem("modellus_id_token");
        localStorage.removeItem("modellus_refresh_token");
    } catch (_) {}
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
    const { ModelsApiClient } = await import("../../sdk/modelsApiClient.js");
    const { UserSdk } = await import("../../sdk/userSdk.js");
    const modelsApiClient = new ModelsApiClient(
        apiBase,
        () => getCurrentBoardSession(),
        () => {
            const currentSession = getCurrentBoardSession();
            return currentSession?.userId || "";
        }
    );
    const userSdk = new UserSdk("mp.session", "mp.user", "/pages/login/index.html", "modellus_id_token", "/pages/marketplace/index.html");
    const modelSession = new ModelSession(modelsApiClient);
    if (!hasBoardValidSession())
        await userSdk.refreshSession(apiBase);
    if (hasBoardValidSession())
        userSdk.startSessionRefresh(apiBase, () => redirectBoardToLogin());
    else
        clearBoardAuthState();
    if (modelId) {
        const currentSession = getCurrentBoardSession();
        if (currentSession && currentSession.token) {
            if (!hasBoardValidSession()) {
                clearBoardAuthState();
            } else {
                try {
                    const model = await loadBoardModel(apiBase, modelId, getBoardAuthHeaders());
                    const payload = extractBoardModelPayload(model);
                    const boardEditor = new BoardEditor(modelSession, payload || null);
                    applyBoardModelMetadata(boardEditor, model);
                    boardEditor.setupCollab(modelId);
                    if (urlParameters.get("new") === "1") {
                        boardEditor.properties.name = boardEditor.board.translations.get("New Model");
                        boardEditor.topToolbar?.updateModelName();
                    }
                    return boardEditor;
                } catch (error) {
                    if (!isBoardUnauthorizedError(error))
                        throw error;
                    clearBoardAuthState();
                }
            }
        }
        try {
            const model = await loadBoardModel(apiBase, modelId, {});
            if (model && (model.is_public === true || model.is_public === 1)) {
                enableBoardReadOnlyMode();
                const payload = extractBoardModelPayload(model);
                return new BoardEditor(modelSession, payload || null);
            }
            redirectBoardToLogin();
            return null;
        } catch (error) {
            if (isBoardUnauthorizedError(error)) {
                redirectBoardToLogin();
                return null;
            }
            if (isBoardNetworkFetchError(error))
                return new BoardEditor(modelSession, null);
            throw error;
        }
    }
    if (!hasBoardValidSession()) {
        clearBoardAuthState();
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
