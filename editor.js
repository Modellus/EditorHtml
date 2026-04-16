DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });
const apiBase = "https://modellus-api.interactivebook.workers.dev";
const urlParams = new URLSearchParams(window.location.search);
const modelName = urlParams.get("model");
const modelId = urlParams.get("model_id");
var shell = null;

function getCurrentSession() {
    return window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
}

function getAuthHeaders() {
    const session = getCurrentSession();
    if (session && session.token) return { Authorization: `Bearer ${session.token}` };
    return {};
}

function decodeJwtPayload(token) {
    try {
        const payloadPart = token.split(".")[1];
        const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = normalizedPayload + "===".slice((normalizedPayload.length + 3) % 4);
        return JSON.parse(atob(paddedPayload));
    } catch {
        return null;
    }
}

function isTokenValid(token) {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp)
        return false;
    const currentSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > currentSeconds + 30;
}

function hasValidSession() {
    const session = getCurrentSession();
    if (!session?.token)
        return false;
    return isTokenValid(session.token);
}

function extractModelPayload(model) {
    if (!model) return null;
    if (typeof model.definition === "string" && model.definition.trim()) return model.definition;
    if (typeof model.definition === "object" && model.definition) return JSON.stringify(model.definition);
    return null;
}

function applyModelMetadata(shell, model) {
    if (!shell || !model) return;
    if (typeof model.thumbnail === "string" && model.thumbnail.trim())
        shell.properties.thumbnailUrl = model.thumbnail.trim();
    if (model.user_id)
        shell.modelCreatorId = model.user_id;
    if (model.creator_name)
        shell.modelCreatorName = model.creator_name;
    if (model.creator_avatar)
        shell.modelCreatorAvatar = model.creator_avatar;
    shell.topToolbar?.updateModelInfo();
    shell.topToolbar?.updateCollabButtonVisibility();
}

function enableReadOnlyMode() {
    window.modellusReadOnly = true;
    document.body.classList.add("read-only");
}

async function loadModel(modelId, headers) {
    const response = await fetch(`${apiBase}/models/${modelId}`, { headers });
    if (!response.ok) {
        const error = new Error(`Failed to load model (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}

function isUnauthorizedError(error) {
    return Number(error?.status) === 401;
}

function clearAuthState() {
    try {
        const sessionStorageKey = window.modellus?.auth?.sessionKey || "mp.session";
        const userStorageKey = window.modellus?.auth?.userKey || "mp.user";
        localStorage.removeItem(sessionStorageKey);
        localStorage.removeItem(userStorageKey);
        localStorage.removeItem("modellus_id_token");
        localStorage.removeItem("modellus_refresh_token");
    } catch (_) {}
}

function redirectToLogin() {
    window.location.href = "/login.html";
}

(async () => {
    const { ModelsApiClient } = await import("./sdk/modelsApiClient.js");
    const { UserSdk } = await import("./sdk/userSdk.js");
    const modelsApiClient = new ModelsApiClient(
        apiBase,
        () => getCurrentSession(),
        () => {
            const currentSession = getCurrentSession();
            return currentSession?.userId || "";
        }
    );
    const userSdk = new UserSdk("mp.session", "mp.user", "/login.html", "modellus_id_token", "/marketplace.html");
    if (!hasValidSession())
        await userSdk.refreshSession(apiBase);
    if (hasValidSession())
        userSdk.startSessionRefresh(apiBase, () => redirectToLogin());
    else
        clearAuthState();
    try {
        if (modelId) {
            const session = getCurrentSession();
            if (session && session.token) {
                if (!hasValidSession()) {
                    clearAuthState();
                } else {
                    try {
                        const model = await loadModel(modelId, getAuthHeaders());
                        const payload = extractModelPayload(model);
                        shell = payload ? new Shell(payload, modelsApiClient) : new Shell(null, modelsApiClient);
                        applyModelMetadata(shell, model);
                        shell.setupCollab(modelId);
                        return;
                    } catch (error) {
                        if (!isUnauthorizedError(error))
                            throw error;
                        clearAuthState();
                    }
                }
            }
            try {
                const model = await loadModel(modelId, {});
                if (model && (model.is_public === true || model.is_public === 1)) {
                    enableReadOnlyMode();
                    const payload = extractModelPayload(model);
                    shell = payload ? new Shell(payload, modelsApiClient) : new Shell(null, modelsApiClient);
                    applyModelMetadata(shell, model);
                    return;
                }
                redirectToLogin();
                return;
            } catch (error) {
                if (isUnauthorizedError(error)) {
                    redirectToLogin();
                    return;
                }
                throw error;
            }
        }
        if (!hasValidSession()) {
            clearAuthState();
            if (modelName) {
                const response = await fetch(`resources/models/${modelName}.json`);
                const payload = await response.text();
                shell = new Shell(payload, modelsApiClient);
                return;
            }
            const anonModel = sessionStorage.getItem("mp.anon.model");
            shell = new Shell(anonModel || null, modelsApiClient);
            return;
        }
        if (modelName) {
            const response = await fetch(`resources/models/${modelName}.json`);
            const payload = await response.text();
            shell = new Shell(payload, modelsApiClient);
            return;
        }
        shell = new Shell(null, modelsApiClient);
    } catch (error) {
        if (isUnauthorizedError(error)) {
            clearAuthState();
            redirectToLogin();
            return;
        }
        console.error(error);
    }
})();
