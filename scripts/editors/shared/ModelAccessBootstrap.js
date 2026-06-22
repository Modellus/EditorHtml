var ModelAccessBootstrap = {
    getSession: function() {
        return window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
    },

    getAuthHeaders: function() {
        const session = this.getSession();
        const headers = {};
        if (session?.token)
            headers.Authorization = `Bearer ${session.token}`;
        return headers;
    },

    decodeJwtPayload: function(token) {
        try {
            const payloadPart = token.split(".")[1];
            const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
            const paddedPayload = normalizedPayload + "===".slice((normalizedPayload.length + 3) % 4);
            return JSON.parse(atob(paddedPayload));
        } catch {
            return null;
        }
    },

    isTokenValid: function(token) {
        const payload = this.decodeJwtPayload(token);
        if (!payload?.exp)
            return false;
        const currentSeconds = Math.floor(Date.now() / 1000);
        return payload.exp > currentSeconds + 30;
    },

    hasValidSession: function() {
        const session = this.getSession();
        if (!session?.token)
            return false;
        return this.isTokenValid(session.token);
    },

    clearAuthState: function() {
        try {
            const sessionStorageKey = window.modellus?.auth?.sessionKey || "mp.session";
            const userStorageKey = window.modellus?.auth?.userKey || "mp.user";
            localStorage.removeItem(sessionStorageKey);
            localStorage.removeItem(userStorageKey);
            localStorage.removeItem("modellus_id_token");
            localStorage.removeItem("modellus_refresh_token");
        } catch (_) {}
    },

    fetchModel: async function(apiBase, modelId, headers = {}) {
        const response = await fetch(`${apiBase}/models/${modelId}`, { headers });
        const model = response.ok ? await response.json() : null;
        return { response, model };
    },

    resolveModelAccess: async function(apiBase, modelId, refreshSession) {
        if (!this.hasValidSession() && typeof refreshSession === "function")
            await refreshSession(apiBase);
        if (this.hasValidSession()) {
            const authenticatedResult = await this.fetchModel(apiBase, modelId, this.getAuthHeaders());
            if (authenticatedResult.response.ok)
                return { mode: "editable", model: authenticatedResult.model, status: authenticatedResult.response.status };
            if (authenticatedResult.response.status !== 401)
                return { mode: "error", model: null, status: authenticatedResult.response.status };
            this.clearAuthState();
        }
        const publicResult = await this.fetchModel(apiBase, modelId);
        if (!publicResult.response.ok)
            return { mode: publicResult.response.status === 401 ? "login-required" : "error", model: null, status: publicResult.response.status };
        if (publicResult.model?.is_public === true || publicResult.model?.is_public === 1)
            return { mode: "readonly", model: publicResult.model, status: publicResult.response.status };
        return { mode: "login-required", model: null, status: publicResult.response.status };
    }
};
