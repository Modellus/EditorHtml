const apiBase = "https://modellus-api.interactivebook.workers.dev";
const sessionKey = window.modellus?.auth?.sessionKey || "mp.session";
const userKey = window.modellus?.auth?.userKey || "mp.user";
const filters = [
  { key: "all", text: "All", query: "" },
  { key: "favorite", text: "Favorite", query: "favorite" },
  { key: "sciences", text: "Sciences", query: "sciences" },
  { key: "education", text: "Education Levels", query: "education" }
];
DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

class ModelsApp {
  constructor() {
    this.elements = {
      pageModels: document.getElementById("page-models"),
      navToolbar: document.getElementById("nav-toolbar"),
      navModels: null,
      navLogout: null,
      userChip: null,
      status: document.getElementById("status"),
      drawerShell: document.getElementById("drawer-shell"),
      drawerHost: document.getElementById("drawer"),
      cardView: document.getElementById("models-card-view"),
      toolbar: null
    };
    this.state = {
      session: this.readSession(),
      user: this.readUser(),
      filter: filters[0]
    };
    if (!this.state.session) window.location.href = "/login.html";
    this.cardViewInstance = null;
    this.drawerInstance = null;
    this.filterListInstance = null;
    this.toolbarInstance = null;
    this.initNavToolbar();
    this.cacheNavElements();
    this.bindNav();
    this.initDrawer();
    this.refreshAuth();
    this.renderUser();
    this.loadModels();
  }
  refreshAuth() {
    this.state.session = this.readSession();
    this.state.user = this.readUser();
  }
  initNavToolbar() {
    if (!this.elements.navToolbar || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxToolbar) return;
    this.navToolbarInstance = new DevExpress.ui.dxToolbar(this.elements.navToolbar, {
      items: [
        {
          location: "before",
          widget: "dxButton",
          options: {
            onClick: () => this.toggleDrawer(),
            elementAttr: { "aria-label": "Toggle Filters" },
            template: (_, contentElement) => {
              const host = contentElement && contentElement.get ? contentElement.get(0) : contentElement;
              if (!host) return;
              host.innerHTML = "";
              const iconElement = document.createElement("i");
              iconElement.className = "fa-solid fa-sidebar";
              iconElement.style.fontSize = "16px";
              host.appendChild(iconElement);
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          options: {
            stylingMode: "text",
            elementAttr: { id: "user-chip", class: "hint" },
            text: ""
          }
        },
        { location: "after", widget: "dxButton", options: { text: "Models", elementAttr: { id: "nav-models", class: "primary" } } },
        {
          location: "after",
          widget: "dxButton",
          options: {
            elementAttr: { id: "nav-new-model", title: "New model" },
            stylingMode: "text",
            template: (_, contentElement) => {
              const host = contentElement && contentElement.get ? contentElement.get(0) : contentElement;
              if (!host) return;
              host.innerHTML = "";
              const iconElement = document.createElement("i");
              iconElement.className = "fa-solid fa-circle-plus";
              iconElement.style.fontSize = "16px";
              host.appendChild(iconElement);
            }
          }
        },
        { location: "after", widget: "dxButton", options: { text: "Logout", elementAttr: { id: "nav-logout" } } }
      ]
    });
  }
  cacheNavElements() {
    this.elements.navModels = document.getElementById("nav-models");
    this.elements.navNewModel = document.getElementById("nav-new-model");
    this.elements.navLogout = document.getElementById("nav-logout");
    this.elements.userChip = document.getElementById("user-chip");
  }
  readSession() {
    if (window.modellus?.auth?.getSession) return window.modellus.auth.getSession();
    try {
      const stored = localStorage.getItem(sessionKey);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }
  readUser() {
    if (window.modellus?.auth?.getUser) return window.modellus.auth.getUser();
    try {
      const stored = localStorage.getItem(userKey);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }
  saveSession(session) {
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }
  clearSession() {
    localStorage.removeItem(sessionKey);
  }
  setStatus(message, isError = false) {
    this.elements.status.textContent = message || "";
    this.elements.status.classList.toggle("error", Boolean(isError));
  }
  renderUser() {
    const name = this.state.session?.name || this.state.user?.name || this.state.user?.email || "User";
    if (!this.state.session) this.elements.userChip.textContent = "Signed out";
    if (this.state.session) this.elements.userChip.textContent = `Signed in as ${name}`;
    this.elements.navLogout.classList.toggle("hidden", !this.state.session);
    this.elements.navModels.classList.toggle("hidden", !this.state.session);
  }
  ensureCardView() {
    if (this.cardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
    this.cardViewInstance = new CardView(this.elements.cardView, {
      dataSource: [],
      height: "100%",
      showBorders: false,
      focusStateEnabled: false,
      hoverStateEnabled: false,
      allowColumnReordering: false,
      allowColumnResizing: false,
      columnHidingEnabled: true,
      colCount: 3,
      colCountByScreen: { lg: 3, md: 2, sm: 1, xs: 1 },
      columns: [
        { dataField: "title", caption: "Title" },
        { dataField: "description", caption: "Description" },
        { dataField: "type", caption: "Type" },
        { dataField: "status", caption: "Status" },
        { dataField: "complexity", caption: "Complexity" },
        { dataField: "usageCount", caption: "Usage" }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement && cardElement.get ? cardElement.get(0) : cardElement;
        const data = cardData && cardData.card && cardData.card.data ? cardData.card.data : cardData || {};
        if (!host) return;
        const isFavorite = this.isFavoriteValue(data);
        const cardMarkup = `
          <div class="card-tile" data-model-id="${data.id || ""}">
            <h3 class="card-title">${data.title || data.name || "Untitled model"}</h3>
            <p class="card-desc">${data.description || data.subtitle || "No description provided."}</p>
            <div class="card-badges">
              <span class="card-badge" style="${data.type ? "" : "display: none;"}">Type: ${data.type || ""}</span>
              <span class="card-badge" style="${data.status ? "" : "display: none;"}">Status: ${data.status || ""}</span>
              <span class="card-badge" style="${data.complexity ? "" : "display: none;"}">Level: ${data.complexity || ""}</span>
              <span class="card-badge">Usage: ${data.usageCount ?? 0}</span>
            </div>
            <button class="favorite-button${isFavorite ? " is-favorite" : ""}" aria-label="${isFavorite ? "Unfavorite" : "Favorite"}">
              <i class="${isFavorite ? "fa-solid fa-star favorite-icon" : "fa-regular fa-star favorite-icon"}" aria-hidden="true"></i>
            </button>
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardTile = host.querySelector(".card-tile");
        const favoriteButton = host.querySelector(".favorite-button");
        if (favoriteButton) favoriteButton.addEventListener("click", () => this.toggleFavorite(data, !isFavorite));
        if (cardTile) {
          cardTile.addEventListener("click", event => {
            if (event && event.target && event.target.closest(".favorite-button")) return;
            this.selectModelCard(cardTile);
          });
          cardTile.addEventListener("dblclick", event => {
            if (event && event.target && event.target.closest(".favorite-button")) return;
            this.openModel(data);
          });
        }
      }
    });
  }
  renderModels(items) {
    this.ensureCardView();
    if (this.cardViewInstance) this.cardViewInstance.option("dataSource", items);
    if (!items.length) this.setStatus("No models found.");
  }
  async loadModels(filter = this.state.filter) {
    this.setStatus("Loading models…");
    try {
      const activeFilter = filter || filters[0];
      this.state.filter = activeFilter;
      const items = activeFilter.key === "favorite" ? await this.fetchFavoriteModels() : await this.fetchModels(activeFilter);
      this.setStatus(items.length ? "" : "No models found.");
      this.renderModels(items);
      this.refreshFilterSelection();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to load models.", true);
      this.renderModels([]);
    }
  }
  async fetchModels(filter) {
    this.refreshAuth();
    const headers = this.buildAuthHeaders();
    const url = new URL(`${apiBase}/models`);
    if (filter && filter.key !== "all" && filter.query) url.searchParams.set("filter", filter.query);
    const userId = this.getUserId();
    if (userId) url.searchParams.set("user_id", userId);
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
  async fetchFavoriteModels() {
    this.refreshAuth();
    if (!this.state.session || !this.state.session.token) throw new Error("Sign-in required to load favorites.");
    const userId = this.getUserId();
    if (!userId) throw new Error("Missing user id for favorites.");
    const headers = this.buildAuthHeaders();
    const url = new URL(`${apiBase}/models`);
    url.searchParams.set("user_id", userId);
    url.searchParams.set("is_favorite", "1");
    url.searchParams.set("filter", "favorite");
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
  buildAuthHeaders() {
    const headers = {};
    const token = this.state.session?.token;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  selectModelCard(cardTile) {
    if (!cardTile) return;
    const selected = this.elements.cardView.querySelector(".card-tile.selected");
    if (selected && selected !== cardTile) selected.classList.remove("selected");
    cardTile.classList.add("selected");
  }
  isFavoriteValue(modelData) {
    return Boolean(modelData && (modelData.user_interaction_is_favorite === 1 || modelData.user_interaction_is_favorite === true));
  }
  getUserId() {
    return this.state.session?.userId || this.state.user?.sub || this.state.user?.id || "";
  }
  async toggleFavorite(modelData, shouldFavorite) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const currentFavoriteState = this.isFavoriteValue(modelData);
    const desiredFavoriteState = typeof shouldFavorite === "boolean" ? shouldFavorite : !currentFavoriteState;
    try {
      const response = await fetch(`${apiBase}/user-model-interactions`, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
        body: JSON.stringify({
          model_id: modelData.id,
          user_id: this.state.session.userId,
          is_favorite: desiredFavoriteState
        })
      });
      if (!response.ok) throw new Error(`Favorite failed (${response.status})`);
      this.loadModels(this.state.filter);
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to mark favorite.", true);
    }
  }
  initDrawer() {
    if (this.drawerInstance || !this.elements.drawerHost || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxDrawer) return;
    const listHost = document.createElement("div");
    this.drawerInstance = new DevExpress.ui.dxDrawer(this.elements.drawerHost, {
      opened: true,
      minSize: 220,
      maxSize: 260,
      revealMode: "expand",
      openedStateMode: "shrink",
      template: () => listHost,
      shading: false
    });
    this.filterListInstance = new DevExpress.ui.dxList(listHost, {
      items: filters,
      selectionMode: "single",
      selectedItem: filters[0],
      focusStateEnabled: false,
      hoverStateEnabled: true,
      onItemClick: event => {
        if (event && event.itemData) {
          this.state.filter = event.itemData;
          this.loadModels(event.itemData);
        }
      }
    });
  }
  refreshFilterSelection() {
    if (this.filterListInstance && this.state.filter) this.filterListInstance.option("selectedItem", this.state.filter);
  }
  toggleDrawer() {
    if (!this.drawerInstance || !this.elements.drawerShell) return;
    const isOpen = this.drawerInstance.option("opened");
    this.drawerInstance.option("opened", !isOpen);
    this.elements.drawerShell.classList.toggle("drawer-collapsed", isOpen);
  }
  bindNav() {
    if (this.elements.navModels) this.elements.navModels.addEventListener("click", () => window.location.href = "/models.html");
    if (this.elements.navNewModel) this.elements.navNewModel.addEventListener("click", () => this.createModel());
    if (this.elements.navLogout) this.elements.navLogout.addEventListener("click", () => {
      this.state.session = null;
      this.state.user = null;
      this.clearSession();
      localStorage.removeItem("modellus_id_token");
      localStorage.removeItem(userKey);
      window.location.href = "/login.html";
    });
  }
  async createModel() {
    this.refreshAuth();
    if (!this.state.session || !this.state.session.token) {
      this.setStatus("Sign-in required to create a model.", true);
      return;
    }
    const userId = this.getUserId();
    if (!userId) {
      this.setStatus("Missing user id for model creation.", true);
      return;
    }
    this.setStatus("Creating model…");
    try {
      const response = await fetch(`${apiBase}/models`, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, this.buildAuthHeaders()),
        body: JSON.stringify({
          title: "Untitled model",
          description: "",
          type: "model",
          status: "draft",
          userId: userId,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error(`Create failed (${response.status})`);
      const created = await response.json();
      this.setStatus("Model created.");
      this.loadModels(this.state.filter);
      if (created && created.id) {
        this.openModel(created);
      }
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to create model.", true);
    }
  }
  openModel(model) {
    if (!model || !model.id) return;
    const url = new URL("/editor.html", window.location.origin);
    url.searchParams.set("model_id", model.id);
    window.location.href = url.toString();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new ModelsApp();
});
