export class ModelsApiClient {
  constructor(apiBaseUrl, getSession, getUserId) {
    this.apiBaseUrl = apiBaseUrl;
    this.getSession = getSession;
    this.getUserId = getUserId;
  }

  buildAuthHeaders() {
    const headers = {};
    const token = this.getSession()?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  resolveLookupItems(data) {
    if (Array.isArray(data))
      return data;
    return [];
  }

  extractLookupOptions(items) {
    if (!Array.isArray(items))
      return [];
    const optionsById = new Map();
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item === undefined || item === null) continue;
      if (typeof item !== "object")
        continue;
      const lookupId = item.id;
      const lookupName = item.name;
      const lookupIcon = item.icon;
      const lookupColor = item.color;
      if (lookupId === "" || lookupName === "")
        continue;
      if (lookupId === undefined || lookupId === null)
        continue;
      if (lookupName === undefined || lookupName === null)
        continue;
      optionsById.set(lookupId, { id: lookupId, name: lookupName, icon: lookupIcon, color: lookupColor });
    }
    return Array.from(optionsById.values()).sort((leftOption, rightOption) => leftOption.name.localeCompare(rightOption.name));
  }

  async fetchPersonalModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    url.searchParams.set("scope", "own");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchFavoriteModels() {
    const session = this.getSession();
    if (!session || !session.token) return [];
    const userId = this.getUserId();
    if (!userId) return [];
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    url.searchParams.set("user_id", userId);
    url.searchParams.set("scope", "favorites");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchLikedModels() {
    const session = this.getSession();
    if (!session || !session.token) return [];
    const userId = this.getUserId();
    if (!userId) return [];
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    url.searchParams.set("user_id", userId);
    url.searchParams.set("scope", "liked");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchPublicModels() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/models/public`, { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data))
      return data;
    if (Array.isArray(data?.items))
      return data.items;
    if (Array.isArray(data?.models))
      return data.models;
    if (Array.isArray(data?.data))
      return data.data;
    return [];
  }

  async fetchPublicModelsPage(options = {}) {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models/public`);
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    if (options.search) url.searchParams.set("q", options.search);
    if (options.educationLevelId) url.searchParams.set("education_level_id", options.educationLevelId);
    if (options.scienceId) url.searchParams.set("science_id", options.scienceId);
    if (options.isSample) url.searchParams.set("is_sample", "1");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    const items = Array.isArray(data) ? data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.models) ? data.models
      : Array.isArray(data?.data) ? data.data
      : [];
    const total = typeof data?.total === "number" ? data.total
      : typeof data?.total_count === "number" ? data.total_count
      : items.length;
    return { items, total };
  }

  async fetchPublicModelsFacets(options = {}) {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models/public/facets`);
    if (options.isSample) url.searchParams.set("is_sample", "1");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return {
      education: Array.isArray(data?.education) ? data.education : [],
      sciences: Array.isArray(data?.sciences) ? data.sciences : [],
      total: typeof data?.total === "number" ? data.total : 0
    };
  }

  async fetchAllModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
    url.searchParams.set("scope", "all");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchDeletedModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    url.searchParams.set("scope", "own");
    url.searchParams.set("is_deleted", "1");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchLibraryModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
    url.searchParams.set("scope", "library");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchEducationLevelLookups() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/education-levels`, { headers });
    if (!response.ok) throw new Error(`Lookup error ${response.status}`);
    const data = await response.json();
    const items = this.resolveLookupItems(data);
    return this.extractLookupOptions(items);
  }
  async fetchEducationLevelLookupById(lookupId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/education-levels/${encodeURIComponent(lookupId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Lookup error ${response.status}`);
    return await response.json();
  }
  async createEducationLevelLookup(payload) {
    const response = await fetch(`${this.apiBaseUrl}/education-levels`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Lookup create failed (${response.status})`);
    return await response.json();
  }
  async updateEducationLevelLookup(lookupId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/education-levels/${encodeURIComponent(lookupId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Lookup update failed (${response.status})`);
    return await response.json();
  }
  async deleteEducationLevelLookup(lookupId) {
    const response = await fetch(`${this.apiBaseUrl}/education-levels/${encodeURIComponent(lookupId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Lookup delete failed (${response.status})`);
  }

  async fetchScienceLookups() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/sciences`, { headers });
    if (!response.ok) throw new Error(`Lookup error ${response.status}`);
    const data = await response.json();
    const items = this.resolveLookupItems(data);
    return this.extractLookupOptions(items);
  }
  async fetchScienceLookupById(lookupId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/sciences/${encodeURIComponent(lookupId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Lookup error ${response.status}`);
    return await response.json();
  }
  async createScienceLookup(payload) {
    const response = await fetch(`${this.apiBaseUrl}/sciences`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Lookup create failed (${response.status})`);
    return await response.json();
  }
  async updateScienceLookup(lookupId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/sciences/${encodeURIComponent(lookupId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Lookup update failed (${response.status})`);
    return await response.json();
  }
  async deleteScienceLookup(lookupId) {
    const response = await fetch(`${this.apiBaseUrl}/sciences/${encodeURIComponent(lookupId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Lookup delete failed (${response.status})`);
  }

  async fetchCharacterCategories() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/character-categories`, { headers });
    if (!response.ok) throw new Error(`Character categories error ${response.status}`);
    return await response.json();
  }
  async fetchCharacterCategoryById(categoryId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/character-categories/${encodeURIComponent(categoryId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Character categories error ${response.status}`);
    return await response.json();
  }
  async createCharacterCategory(payload) {
    const response = await fetch(`${this.apiBaseUrl}/character-categories`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Character category create failed (${response.status})`);
    return await response.json();
  }
  async updateCharacterCategory(categoryId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/character-categories/${encodeURIComponent(categoryId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Character category update failed (${response.status})`);
    return await response.json();
  }
  async deleteCharacterCategory(categoryId) {
    const response = await fetch(`${this.apiBaseUrl}/character-categories/${encodeURIComponent(categoryId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Character category delete failed (${response.status})`);
  }

  async patchModelEducationLevel(modelId, educationLookupId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ education_level_id: educationLookupId })
    });
    if (!response.ok) throw new Error(`Metadata update failed (${response.status})`);
  }

  async patchModelScience(modelId, scienceLookupId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ science_id: scienceLookupId })
    });
    if (!response.ok) throw new Error(`Metadata update failed (${response.status})`);
  }

  async patchUserModelInteraction(modelId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/user-model-interactions`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(Object.assign({ model_id: modelId }, payload))
    });
    if (!response.ok) throw new Error(`Interaction update failed (${response.status})`);
  }

  async updateModelVisibility(modelId, isPublic) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ is_public: isPublic })
    });
    if (!response.ok) throw new Error(`Visibility update failed (${response.status})`);
  }

  async createModel(payload, fromModelId = null) {
    const url = new URL(`${this.apiBaseUrl}/models`);
    if (fromModelId) url.searchParams.set("source_model_id", fromModelId);
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Create failed (${response.status})`);
    return await response.json();
  }

  async saveModel(modelId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Save failed (${response.status})`);
  }

  async patchModel(modelId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Model update failed (${response.status})`);
  }

  uploadModelAsset(modelId, assetId, file, fileName = "asset.png", onProgress = null) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append("id", assetId);
      if (file instanceof File)
        formData.append("file", file);
      else
        formData.append("file", file, fileName);
      const xhr = new XMLHttpRequest();
      if (typeof onProgress === "function") {
        xhr.upload.onprogress = event => {
          if (event.lengthComputable)
            onProgress(Math.round((event.loaded / event.total) * 100));
        };
      }
      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          reject(new Error(`Asset upload failed (${xhr.status})`));
          return;
        }
        let payload;
        try { payload = JSON.parse(xhr.responseText); } catch { payload = null; }
        if (!payload?.url) {
          reject(new Error("The API did not return an asset URL."));
          return;
        }
        resolve(payload.url);
      };
      xhr.onerror = () => reject(new Error("Asset upload failed (network error)"));
      const authHeaders = this.buildAuthHeaders();
      xhr.open("POST", `${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}/assets`);
      for (const [key, value] of Object.entries(authHeaders))
        xhr.setRequestHeader(key, value);
      xhr.send(formData);
    });
  }

  async recoverModel(modelId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}/recover`, {
      method: "POST",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Recover failed (${response.status})`);
  }

  async deleteModel(modelId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete failed (${response.status})`);
  }

  async sendNotification(payload, imageFile) {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("message", payload.message);
    if (payload.type) formData.append("type", payload.type);
    if (payload.model_id) formData.append("model_id", payload.model_id);
    if (imageFile) formData.append("image", imageFile);
    const response = await fetch(`${this.apiBaseUrl}/notifications`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Send notification failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async fetchNotifications() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/notifications`, { headers });
    if (!response.ok) throw new Error(`Fetch notifications failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchUnreadCount() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/notifications/unread_count`, { headers });
    if (!response.ok) throw new Error(`Fetch unread count failed (${response.status})`);
    const data = await response.json();
    return data?.count || 0;
  }

  async fetchNotificationById(notificationId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Fetch notification failed (${response.status})`);
    return await response.json();
  }

  async updateNotification(notificationId, updates) {
    const response = await fetch(`${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error(`Update notification failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async deleteNotification(notificationId) {
    const response = await fetch(`${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete notification failed (${response.status})`);
  }

  async fetchUsers() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/users`, { headers });
    if (!response.ok) throw new Error(`Fetch users failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchUserById(userId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Fetch user failed (${response.status})`);
    return await response.json();
  }

  async updateUser(userId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update user failed (${response.status})`);
    return await response.json();
  }

  async fetchFeatureFlags() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/feature-flags`, { headers });
    if (!response.ok) throw new Error(`Fetch feature flags failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchUserFeatureFlags(userId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}/feature-flags`, { headers });
    if (!response.ok) throw new Error(`Fetch feature flags failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async addUserFeatureFlag(userId, featureFlagKey) {
    const response = await fetch(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}/feature-flags`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ key: featureFlagKey, is_enabled: 1 })
    });
    if (!response.ok) throw new Error(`Add feature flag failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async removeUserFeatureFlag(userId, featureFlagKey) {
    const response = await fetch(`${this.apiBaseUrl}/users/${encodeURIComponent(userId)}/feature-flags/${encodeURIComponent(featureFlagKey)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Remove feature flag failed (${response.status})`);
  }

  async fetchSystemTemplateModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    url.searchParams.set("is_system_template", "1");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async patchModelSystemTemplate(modelId, isSystemTemplate) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ is_system_template: isSystemTemplate })
    });
    if (!response.ok) throw new Error(`System template update failed (${response.status})`);
  }

  async patchModelSample(modelId, isSample) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ is_sample: isSample })
    });
    if (!response.ok) throw new Error(`Sample update failed (${response.status})`);
  }

  async fetchModelById(modelId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Fetch model failed (${response.status})`);
    return await response.json();
  }

  async fetchUsers() {
    const response = await fetch(`${this.apiBaseUrl}/users`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch users failed (${response.status})`);
    return await response.json();
  }

  async fetchCollaborators(modelId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}/collaborators`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch collaborators failed (${response.status})`);
    return await response.json();
  }

  async addCollaborator(modelId, userId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}/collaborators`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ user_id: userId })
    });
    if (!response.ok) throw new Error(`Add collaborator failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async removeCollaborator(modelId, userId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${encodeURIComponent(modelId)}/collaborators/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Remove collaborator failed (${response.status})`);
  }

  async fetchWhatsNew() {
    const response = await fetch(`${this.apiBaseUrl}/whats-new`);
    if (!response.ok) throw new Error(`Fetch whats-new failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async createWhatsNewEntry(payload, imageFile) {
    if (imageFile) {
      const formData = new FormData();
      if (payload.title) formData.append("title", payload.title);
      if (payload.description) formData.append("description", payload.description);
      if (payload.date) formData.append("date", payload.date);
      formData.append("image", imageFile);
      const response = await fetch(`${this.apiBaseUrl}/whats-new`, {
        method: "POST",
        headers: this.buildAuthHeaders(),
        body: formData
      });
      if (!response.ok) throw new Error(`Create whats-new failed (${response.status})`);
      return await response.json();
    }
    const response = await fetch(`${this.apiBaseUrl}/whats-new`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Create whats-new failed (${response.status})`);
    return await response.json();
  }

  async updateWhatsNewEntry(entryId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/whats-new/${encodeURIComponent(entryId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update whats-new failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async deleteWhatsNewEntry(entryId) {
    const response = await fetch(`${this.apiBaseUrl}/whats-new/${encodeURIComponent(entryId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete whats-new failed (${response.status})`);
  }

  async fetchVideosPage(options = {}) {
    const url = new URL(`${this.apiBaseUrl}/videos`);
    url.searchParams.set("limit", String(options.limit || 20));
    url.searchParams.set("offset", String(options.offset || 0));
    if (options.search) url.searchParams.set("q", options.search);
    if (options.educationLevelId) url.searchParams.set("education_level_id", options.educationLevelId);
    if (options.scienceId) url.searchParams.set("science_id", options.scienceId);
    const response = await fetch(url.toString(), { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch videos failed (${response.status})`);
    return this.parsePagedResponse(await response.json());
  }

  async fetchVideosFacets() {
    const response = await fetch(`${this.apiBaseUrl}/videos/facets`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch video facets failed (${response.status})`);
    return this.parseTaxonomyFacets(await response.json());
  }

  parsePagedResponse(data) {
    const items = Array.isArray(data) ? data
      : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.data) ? data.data
      : [];
    const total = typeof data?.total === "number" ? data.total
      : typeof data?.total_count === "number" ? data.total_count
      : items.length;
    return { items, total };
  }

  parseTaxonomyFacets(data) {
    return {
      education: Array.isArray(data?.education) ? data.education : [],
      sciences: Array.isArray(data?.sciences) ? data.sciences : [],
      total: typeof data?.total === "number" ? data.total : 0
    };
  }

  async fetchVideos(filters = {}) {
    const url = new URL(`${this.apiBaseUrl}/videos`);
    if (filters.science_id) url.searchParams.set("science_id", filters.science_id);
    if (filters.education_level_id) url.searchParams.set("education_level_id", filters.education_level_id);
    const response = await fetch(url.toString(), { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch videos failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async createVideo(payload, assetFile) {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.science_id) formData.append("science_id", payload.science_id);
    if (payload.education_level_id) formData.append("education_level_id", payload.education_level_id);
    if (assetFile) formData.append("asset", assetFile);
    const response = await fetch(`${this.apiBaseUrl}/videos`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Create video failed (${response.status})`);
    return await response.json();
  }

  async deleteVideo(videoId) {
    const response = await fetch(`${this.apiBaseUrl}/videos/${encodeURIComponent(videoId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete video failed (${response.status})`);
  }

  async fetchDataSetsPage(options = {}) {
    const url = new URL(`${this.apiBaseUrl}/data`);
    url.searchParams.set("limit", String(options.limit || 20));
    url.searchParams.set("offset", String(options.offset || 0));
    if (options.search) url.searchParams.set("q", options.search);
    if (options.educationLevelId) url.searchParams.set("education_level_id", options.educationLevelId);
    if (options.scienceId) url.searchParams.set("science_id", options.scienceId);
    const response = await fetch(url.toString(), { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch data sets failed (${response.status})`);
    return this.parsePagedResponse(await response.json());
  }

  async fetchDataSetsFacets() {
    const response = await fetch(`${this.apiBaseUrl}/data/facets`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch data facets failed (${response.status})`);
    return this.parseTaxonomyFacets(await response.json());
  }

  async fetchDataSets(filters = {}) {
    const url = new URL(`${this.apiBaseUrl}/data`);
    if (filters.science_id) url.searchParams.set("science_id", filters.science_id);
    if (filters.education_level_id) url.searchParams.set("education_level_id", filters.education_level_id);
    const response = await fetch(url.toString(), { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch data sets failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async createDataSet(payload, assetFile) {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (payload.science_id) formData.append("science_id", payload.science_id);
    if (payload.education_level_id) formData.append("education_level_id", payload.education_level_id);
    if (assetFile) formData.append("asset", assetFile);
    const response = await fetch(`${this.apiBaseUrl}/data`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Create data set failed (${response.status})`);
    return await response.json();
  }

  async deleteDataSet(dataId) {
    const response = await fetch(`${this.apiBaseUrl}/data/${encodeURIComponent(dataId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete data set failed (${response.status})`);
  }

  async patchVideo(videoId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/videos/${encodeURIComponent(videoId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update video failed (${response.status})`);
    return await response.json();
  }

  async patchDataSet(dataId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/data/${encodeURIComponent(dataId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update data set failed (${response.status})`);
    return await response.json();
  }

  async uploadVideoThumbnail(videoId, imageFile) {
    const formData = new FormData();
    formData.append("asset", imageFile);
    const response = await fetch(`${this.apiBaseUrl}/videos/${encodeURIComponent(videoId)}/thumbnail`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Upload video thumbnail failed (${response.status})`);
    return await response.json();
  }

  async deleteVideoThumbnail(videoId) {
    const response = await fetch(`${this.apiBaseUrl}/videos/${encodeURIComponent(videoId)}/thumbnail`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete video thumbnail failed (${response.status})`);
  }

  async uploadDataSetThumbnail(dataId, imageFile) {
    const formData = new FormData();
    formData.append("asset", imageFile);
    const response = await fetch(`${this.apiBaseUrl}/data/${encodeURIComponent(dataId)}/thumbnail`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Upload data set thumbnail failed (${response.status})`);
    return await response.json();
  }

  async deleteDataSetThumbnail(dataId) {
    const response = await fetch(`${this.apiBaseUrl}/data/${encodeURIComponent(dataId)}/thumbnail`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete data set thumbnail failed (${response.status})`);
  }

  async fetchCharacters() {
    const response = await fetch(`${this.apiBaseUrl}/characters`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch characters failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchCharactersPage(options = {}) {
    const url = new URL(`${this.apiBaseUrl}/characters`);
    url.searchParams.set("limit", String(options.limit || 20));
    url.searchParams.set("offset", String(options.offset || 0));
    if (options.search) url.searchParams.set("q", options.search);
    if (options.categoryId) url.searchParams.set("category_id", options.categoryId);
    const response = await fetch(url.toString(), { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch characters failed (${response.status})`);
    return this.parsePagedResponse(await response.json());
  }

  async fetchCharacterFacets() {
    const response = await fetch(`${this.apiBaseUrl}/characters/facets`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch character facets failed (${response.status})`);
    const data = await response.json();
    return {
      categories: Array.isArray(data?.categories) ? data.categories : [],
      uncategorized: typeof data?.uncategorized === "number" ? data.uncategorized : 0,
      total: typeof data?.total === "number" ? data.total : 0
    };
  }

  async createCharacter(payload, assetFile) {
    const formData = new FormData();
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);
    if (assetFile) formData.append("asset", assetFile);
    const response = await fetch(`${this.apiBaseUrl}/characters`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(`Create character failed (${response.status})${errorBody?.error ? ': ' + errorBody.error : ''}`);
    }
    return await response.json();
  }

  async deleteCharacter(characterId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete character failed (${response.status})`);
  }

  async patchCharacter(characterId, payload, assetFile) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update character failed (${response.status})`);
    const result = await response.json();
    if (!assetFile)
      return result;
    const formData = new FormData();
    formData.append("asset", assetFile);
    const thumbnailResponse = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/thumbnail`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!thumbnailResponse.ok) throw new Error(`Upload character thumbnail failed (${thumbnailResponse.status})`);
    return await thumbnailResponse.json();
  }

  async uploadCharacterThumbnail(characterId, thumbnailFile) {
    const formData = new FormData();
    formData.append("asset", thumbnailFile);
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/thumbnail`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Upload character thumbnail failed (${response.status})`);
    return await response.json();
  }

  async fetchCharacterById(characterId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch character failed (${response.status})`);
    return await response.json();
  }

  async fetchCharacterDefinition(characterId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/definition`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch character definition failed (${response.status})`);
    return await response.json();
  }

  async fetchCharacterAnimations(characterId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations`, { headers: this.buildAuthHeaders() });
    if (!response.ok) throw new Error(`Fetch character animations failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async createCharacterAnimation(characterId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Create character animation failed (${response.status})`);
    return await response.json();
  }

  async updateCharacterAnimation(characterId, animationId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations/${encodeURIComponent(animationId)}`, {
      method: "PUT",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Update character animation failed (${response.status})`);
    return await response.json();
  }

  async deleteCharacterAnimation(characterId, animationId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations/${encodeURIComponent(animationId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete character animation failed (${response.status})`);
  }

  async uploadCharacterAnimationFrame(characterId, animationId, file, frameIndex) {
    const formData = new FormData();
    formData.append("file", file);
    if (frameIndex !== undefined && frameIndex !== null)
      formData.append("frame_index", String(frameIndex));
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations/${encodeURIComponent(animationId)}/frames`, {
      method: "POST",
      headers: this.buildAuthHeaders(),
      body: formData
    });
    if (!response.ok) throw new Error(`Upload character animation frame failed (${response.status})`);
    return await response.json();
  }

  async deleteCharacterAnimationFrame(characterId, animationId, frameId) {
    const response = await fetch(`${this.apiBaseUrl}/characters/${encodeURIComponent(characterId)}/animations/${encodeURIComponent(animationId)}/frames/${encodeURIComponent(frameId)}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete character animation frame failed (${response.status})`);
  }

  async fetchBackgrounds() {
    return BACKGROUNDS;
  }
}
