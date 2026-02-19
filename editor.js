DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });
const apiBase = "https://modellus-api.interactivebook.workers.dev";
const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
const urlParams = new URLSearchParams(window.location.search);
const modelName = urlParams.get("model");
const modelId = urlParams.get("model_id");
var shell = null;

function getAuthHeaders() {
    const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
    if (session && session.token) return { Authorization: `Bearer ${session.token}` };
    return {};
}

function extractModelPayload(model) {
    if (!model) return null;
    if (typeof model.definition === "string" && model.definition.trim()) return model.definition;
    if (typeof model.definition === "object" && model.definition) return JSON.stringify(model.definition);
    return null;
}

function enableReadOnlyMode() {
    window.modellusReadOnly = true;
    document.body.classList.add("read-only");
}

async function loadModel(modelId, headers) {
    const response = await fetch(`${apiBase}/models/${modelId}`, { headers });
    if (!response.ok) throw new Error(`Failed to load model (${response.status})`);
    return response.json();
}

(async () => {
    if (modelId) {
        if (session && session.token) {
            const model = await loadModel(modelId, getAuthHeaders());
            const payload = extractModelPayload(model);
            shell = payload ? new Shell(payload) : new Shell();
            return;
        }
        const model = await loadModel(modelId, {});
        if (model && (model.is_public === true || model.is_public === 1)) {
            enableReadOnlyMode();
            const payload = extractModelPayload(model);
            shell = payload ? new Shell(payload) : new Shell();
            return;
        }
        window.location.href = "/login.html";
        return;
    }
    if (!session || !session.token) {
        window.location.href = "/login.html";
        return;
    }
    if (modelName) {
        const response = await fetch(`resources/models/${modelName}.json`);
        const payload = await response.text();
        shell = new Shell(payload);
        return;
    }
    shell = new Shell();
})();
