export class UserSdk {
  constructor(sessionKey, userKey, loginPath, tokenStorageKey = "modellus_id_token", appHome = "/marketplace.html", refreshTokenStorageKey = "modellus_refresh_token") {
    this.sessionKey = sessionKey;
    this.userKey = userKey;
    this.loginPath = loginPath;
    this.tokenStorageKey = tokenStorageKey;
    this.appHome = appHome;
    this.refreshTokenStorageKey = refreshTokenStorageKey;
    this.featureFlags = [];
    this.refreshTimer = null;
  }

  readSession() {
    if (window.modellus?.auth?.getSession)
      return window.modellus.auth.getSession();
    try {
      const storedSession = localStorage.getItem(this.sessionKey);
      if (!storedSession)
        return null;
      return JSON.parse(storedSession);
    } catch (error) {
      return null;
    }
  }

  readUser() {
    if (window.modellus?.auth?.getUser)
      return window.modellus.auth.getUser();
    try {
      const storedUser = localStorage.getItem(this.userKey);
      if (!storedUser)
        return null;
      return JSON.parse(storedUser);
    } catch (error) {
      return null;
    }
  }

  readToken() {
    return localStorage.getItem(this.tokenStorageKey) || "";
  }

  readRefreshToken() {
    return localStorage.getItem(this.refreshTokenStorageKey) || "";
  }

  saveSession(session) {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  saveUser(user) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  saveToken(token) {
    localStorage.setItem(this.tokenStorageKey, token);
  }

  saveRefreshToken(refreshToken) {
    localStorage.setItem(this.refreshTokenStorageKey, refreshToken);
  }

  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  clearUser() {
    localStorage.removeItem(this.userKey);
  }

  clearToken() {
    localStorage.removeItem(this.tokenStorageKey);
  }

  clearRefreshToken() {
    localStorage.removeItem(this.refreshTokenStorageKey);
  }

  refreshState(state) {
    state.session = this.readSession();
    state.user = this.readUser();
  }

  getUserId(session) {
    return session?.userId || "";
  }

  buildAuthHeaders(session = this.readSession()) {
    const headers = {};
    const token = session?.token;
    if (token)
      headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async loadFeatureFlags(apiBaseUrl, session = this.readSession()) {
    const userId = this.getUserId(session);
    if (!userId) {
      this.featureFlags = [];
      return this.featureFlags;
    }
    const response = await fetch(`${apiBaseUrl}/users/${encodeURIComponent(userId)}/feature-flags`, {
      headers: this.buildAuthHeaders(session)
    });
    if (!response.ok) {
      this.featureFlags = [];
      return this.featureFlags;
    }
    const featureFlags = await response.json();
    this.featureFlags = Array.isArray(featureFlags) ? featureFlags : [];
    return this.featureFlags;
  }

  readFeatureFlags() {
    return this.featureFlags;
  }

  hasFeatureFlag(featureFlagKey) {
    for (let featureFlagIndex = 0; featureFlagIndex < this.featureFlags.length; featureFlagIndex++) {
      const featureFlag = this.featureFlags[featureFlagIndex];
      if (featureFlag.key !== featureFlagKey)
        continue;
      return featureFlag.is_enabled === 1 || featureFlag.is_enabled === true;
    }
    return false;
  }

  applyUserMenu(userMenuElement, session) {
    if (!userMenuElement)
      return;
    const menuInstance = $(userMenuElement).dxDropDownButton("instance");
    if (menuInstance)
      menuInstance.option("disabled", !session);
    const avatarElement = userMenuElement.querySelector(".user-menu-avatar");
    if (avatarElement)
      avatarElement.src = session?.avatar || "";
  }

  redirectToLogin() {
    window.location.href = this.loginPath;
  }

  redirectToApp() {
    window.location.href = this.appHome;
  }

  logout() {
    if (this.refreshTimer)
      clearTimeout(this.refreshTimer);
    this.clearSession();
    this.clearToken();
    this.clearRefreshToken();
    this.clearUser();
    this.featureFlags = [];
    this.redirectToLogin();
  }

  decodeJwtPayload(token) {
    try {
      const payloadPart = token.split(".")[1];
      const normalizedPayload = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const paddedPayload = normalizedPayload + "===".slice((normalizedPayload.length + 3) % 4);
      return JSON.parse(atob(paddedPayload));
    } catch {
      return null;
    }
  }

  isTokenValid(token) {
    const payload = this.decodeJwtPayload(token);
    if (!payload?.exp)
      return false;
    const currentSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > currentSeconds + 30;
  }

  isSessionValid(session = this.readSession()) {
    if (!session?.token)
      return false;
    if (session?.exp) {
      const currentSeconds = Math.floor(Date.now() / 1000);
      return session.exp > currentSeconds + 30;
    }
    return this.isTokenValid(session.token);
  }

  ensureAuthenticated(state) {
    const session = this.readSession();
    if (!this.isSessionValid(session)) {
      this.clearToken();
      this.clearRefreshToken();
      this.clearSession();
      this.clearUser();
      this.redirectToLogin();
      return false;
    }
    if (state) {
      state.session = session;
      state.user = this.readUser();
    }
    return true;
  }

  async tryAutoRedirect(apiBaseUrl) {
    const session = this.readSession();
    if (this.isSessionValid(session)) {
      this.startSessionRefresh(apiBaseUrl);
      this.redirectToApp();
      return;
    }
    const refreshed = await this.refreshSession(apiBaseUrl);
    if (refreshed) {
      this.redirectToApp();
      return;
    }
    this.clearToken();
    this.clearRefreshToken();
    this.clearSession();
    this.clearUser();
  }

  buildSessionFromCredential(credential) {
    const payload = this.decodeJwtPayload(credential) || {};
    return {
      token: credential,
      userId: payload.sub || "",
      name: payload.name || "",
      email: payload.email || "",
      avatar: payload.picture || "",
      exp: payload.exp || 0
    };
  }

  buildSessionFromAuthPayload(authPayload) {
    const token = authPayload?.token || "";
    if (!token)
      return null;
    const payload = this.decodeJwtPayload(token) || {};
    return {
      token: token,
      userId: authPayload?.userId || payload.sub || "",
      name: authPayload?.name || payload.name || "",
      email: authPayload?.email || payload.email || "",
      avatar: authPayload?.avatar || payload.picture || "",
      exp: authPayload?.exp || payload.exp || 0
    };
  }

  buildUserFromSession(session) {
    return {
      id: session.userId,
      email: session.email || "",
      name: session.name || "User",
      avatar: session.avatar || `${location.origin}/scripts/themes/modellus.svg`
    };
  }

  async ensureUser(session, apiBaseUrl) {
    if (!session?.userId)
      return;
    const now = new Date().toISOString();
    const user = this.buildUserFromSession(session);
    const headers = { "Content-Type": "application/json" };
    const userUrl = `${apiBaseUrl}/users/${encodeURIComponent(session.userId)}`;
    try {
      const existingResponse = await fetch(userUrl);
      if (existingResponse.ok) {
        await fetch(userUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            lastLogin: now
          })
        });
        return;
      }
    } catch (_) {}
    try {
      await fetch(`${apiBaseUrl}/users`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          createdAt: now,
          lastLogin: now
        })
      });
    } catch (_) {}
  }

  async promoteAnonymousModel(session, apiBaseUrl) {
    const stored = sessionStorage.getItem("mp.anon.model");
    if (!stored)
      return null;
    sessionStorage.removeItem("mp.anon.model");
    let definition;
    try {
      definition = JSON.parse(stored);
    } catch {
      return null;
    }
    const headers = Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders(session));
    const now = new Date().toISOString();
    const payload = {
      title: definition.properties?.name || "Untitled model",
      description: definition.properties?.description || "",
      type: "model",
      status: "draft",
      definition: stored,
      createdAt: now
    };
    try {
      const response = await fetch(`${apiBaseUrl}/models`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (!response.ok)
        return null;
      const model = await response.json();
      return model.id || null;
    } catch {
      return null;
    }
  }

  async handleCredentialResponse(credential, apiBaseUrl) {
    if (!credential)
      return;
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credential })
    });
    if (!response.ok)
      return;
    const authPayload = await response.json();
    const session = this.buildSessionFromAuthPayload(authPayload);
    if (!session)
      return;
    this.saveToken(session.token);
    this.saveSession(session);
    this.saveUser(this.buildUserFromSession(session));
    if (authPayload?.refreshToken)
      this.saveRefreshToken(authPayload.refreshToken);
    const promotedModelId = await this.promoteAnonymousModel(session, apiBaseUrl);
    if (promotedModelId) {
      window.location.href = `/editor.html?model_id=${encodeURIComponent(promotedModelId)}`;
      return;
    }
    this.startSessionRefresh(apiBaseUrl);
    this.redirectToApp();
  }

  waitForGoogleIdentity(callback, tries = 50) {
    const isGoogleIdentityReady = window.google?.accounts?.id;
    if (isGoogleIdentityReady) {
      callback();
      return;
    }
    if (tries <= 0)
      return;
    setTimeout(() => this.waitForGoogleIdentity(callback, tries - 1), 50);
  }

  async refreshSession(apiBaseUrl) {
    const refreshToken = this.readRefreshToken();
    if (!refreshToken)
      return false;
    try {
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshToken })
      });
      if (!response.ok)
        return false;
      const authPayload = await response.json();
      const session = this.buildSessionFromAuthPayload(authPayload);
      if (!session)
        return false;
      this.saveToken(session.token);
      this.saveSession(session);
      this.saveUser(this.buildUserFromSession(session));
      if (authPayload?.refreshToken)
        this.saveRefreshToken(authPayload.refreshToken);
      this.startSessionRefresh(apiBaseUrl);
      return true;
    } catch {
      return false;
    }
  }

  startSessionRefresh(apiBaseUrl, onAuthFailed = null) {
    if (this.refreshTimer)
      clearTimeout(this.refreshTimer);
    const session = this.readSession();
    if (!session?.exp)
      return;
    const currentSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = session.exp - currentSeconds;
    const refreshDelaySeconds = secondsUntilExpiry <= 60 ? 1 : Math.max(secondsUntilExpiry - 300, 30);
    this.refreshTimer = setTimeout(async () => {
      const refreshed = await this.refreshSession(apiBaseUrl);
      if (refreshed)
        return;
      this.clearToken();
      this.clearRefreshToken();
      this.clearSession();
      this.clearUser();
      if (typeof onAuthFailed === "function") {
        onAuthFailed();
        return;
      }
      this.redirectToLogin();
    }, refreshDelaySeconds * 1000);
  }
}
