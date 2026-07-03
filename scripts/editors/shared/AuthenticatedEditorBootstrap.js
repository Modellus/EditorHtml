var AuthenticatedEditorBootstrap = {
    createUserSdk: async function() {
        const { UserSdk } = await import("../../../sdk/userSdk.js");
        return new UserSdk("mp.session", "mp.user", "/pages/login/index.html", "modellus_id_token", "/pages/catalog/index.html");
    },

    initializeSession: async function(apiBase, onLoginRequired) {
        const userSdk = await this.createUserSdk();
        if (!ModelAccessBootstrap.hasValidSession())
            await userSdk.refreshSession(apiBase);
        const hasValidSession = ModelAccessBootstrap.hasValidSession();
        if (hasValidSession)
            userSdk.startSessionRefresh(apiBase, onLoginRequired);
        else
            ModelAccessBootstrap.clearAuthState();
        return { userSdk, hasValidSession };
    },

    resolveModelAccess: async function(apiBase, modelId, userSdk) {
        return ModelAccessBootstrap.resolveModelAccess(apiBase, modelId, refreshApiBase => userSdk.refreshSession(refreshApiBase));
    }
};