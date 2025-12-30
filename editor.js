DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });
const apiBase = "https://modellus-api.interactivebook.workers.dev";
const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
if (!session || !session.token) {
    window.location.href = "/login.html";
}
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

if (modelId) {
    fetch(`${apiBase}/models/${modelId}`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(model => {
            const payload = extractModelPayload(model);
            if (payload) 
                shell = new Shell(payload);
            else 
                shell = new Shell();
        })
        .catch(() => { shell = new Shell(); });
} else if (modelName) {
    fetch(`resources/models/${modelName}.json`)
        .then(r => r.text())
        .then(r => shell = new Shell(r));
} else {
    shell = new Shell();
}
