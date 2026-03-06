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
      if (lookupId === "" || lookupName === "")
        continue;
      if (lookupId === undefined || lookupId === null)
        continue;
      if (lookupName === undefined || lookupName === null)
        continue;
      optionsById.set(lookupId, { id: lookupId, name: lookupName });
    }
    return Array.from(optionsById.values()).sort((leftOption, rightOption) => leftOption.name.localeCompare(rightOption.name));
  }

  async fetchPersonalModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
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
    url.searchParams.set("is_favorite", "1");
    url.searchParams.set("filter", "favorite");
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

  async fetchLibraryModels() {
    const headers = this.buildAuthHeaders();
    const url = new URL(`${this.apiBaseUrl}/models`);
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
    url.searchParams.set("is_picked", "1");
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

  async fetchScienceLookups() {
    const headers = this.buildAuthHeaders();
    const response = await fetch(`${this.apiBaseUrl}/sciences`, { headers });
    if (!response.ok) throw new Error(`Lookup error ${response.status}`);
    const data = await response.json();
    const items = this.resolveLookupItems(data);
    return this.extractLookupOptions(items);
  }

  async patchModelTaxonomy(modelId, educationLookupId, scienceLookupId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify({
        education_level_id: educationLookupId === "" ? null : educationLookupId,
        science_id: scienceLookupId === "" ? null : scienceLookupId
      })
    });
    if (!response.ok) throw new Error(`Metadata update failed (${response.status})`);
  }

  async patchUserModelInteraction(modelId, userId, payload) {
    const response = await fetch(`${this.apiBaseUrl}/user-model-interactions`, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
      body: JSON.stringify(Object.assign({ model_id: modelId, user_id: userId }, payload))
    });
    if (!response.ok) throw new Error(`Interaction update failed (${response.status})`);
  }

  async updateModelVisibility(modelId, isPublic) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "PUT",
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

  async deleteModel(modelId) {
    const response = await fetch(`${this.apiBaseUrl}/models/${modelId}`, {
      method: "DELETE",
      headers: this.buildAuthHeaders()
    });
    if (!response.ok) throw new Error(`Delete failed (${response.status})`);
  }
}
