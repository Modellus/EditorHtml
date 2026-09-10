const ModellusApiConfig = {
    defaultApiBase: "https://modellus-api.interactivebook.workers.dev",
    overrideStorageKey: "mp.apiBase",
    readOverride() {
        try {
            return localStorage.getItem(ModellusApiConfig.overrideStorageKey) || "";
        } catch (error) {
            return "";
        }
    },
    writeOverride(apiBase) {
        try {
            if (apiBase)
                localStorage.setItem(ModellusApiConfig.overrideStorageKey, apiBase);
            else
                localStorage.removeItem(ModellusApiConfig.overrideStorageKey);
        } catch (error) {
            return;
        }
    },
    resolveApiBase() {
        const requestedApiBase = new URLSearchParams(window.location.search).get("api");
        if (requestedApiBase !== null)
            ModellusApiConfig.writeOverride(requestedApiBase.trim().replace(/\/+$/, ""));
        return ModellusApiConfig.readOverride() || ModellusApiConfig.defaultApiBase;
    }
};

window.ModellusApiConfig = ModellusApiConfig;
