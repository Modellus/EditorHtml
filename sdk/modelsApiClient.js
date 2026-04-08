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
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
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

  async fetchPublicModels() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/models/public`, { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
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

  async createModel(payload) {
    const response = await fetch(`${this.apiBaseUrl}/models`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Create failed (${response.status})`);
    return await response.json();
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

  async deleteModel(modelId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete failed (${response.status})`);
  }

  async sendNotification(payload) {
    const response = await fetch(`${this.apiBaseUrl}/notifications`, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Send notification failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async fetchNotifications() {
    const headers = this.buildAuthHeaders();
    const userId = this.getUserId();
    const url = new URL(`${this.apiBaseUrl}/notifications`);
    if (userId) url.searchParams.set("user_id", userId);
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`Fetch notifications failed (${response.status})`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async fetchNotificationById(notificationId) {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}`, { headers });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Fetch notification failed (${response.status})`);
    return await response.json();
  }

  async markNotificationAsRead(notificationId) {
    const response = await fetch(`${this.apiBaseUrl}/notifications/${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({ is_read: true })
    });
    if (!response.ok) throw new Error(`Mark notification read failed (${response.status})`);
  }
}
