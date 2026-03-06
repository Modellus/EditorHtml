import { ModelsApiClient } from "./sdk/modelsApiClient.js";
import { UserSdk } from "./sdk/userSdk.js";

const apiBase = "https://modellus-api.interactivebook.workers.dev";
const sessionKey = window.modellus?.auth?.sessionKey || "mp.session";
const userKey = window.modellus?.auth?.userKey || "mp.user";
const treeNodeIds = {
  myModels: "my-models",
  myPersonal: "my-personal",
  myFavorite: "my-favorite",
  myLibrary: "my-library",
  marketplace: "marketplace",
  marketplaceEducation: "market-education",
  marketplaceSciences: "market-sciences"
};
DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

class ModelsApp {
  constructor() {
    this.userSdk = new UserSdk(sessionKey, userKey, "/login.html");
    this.elements = {
      pageModels: document.getElementById("page-models"),
      navToolbar: document.getElementById("nav-toolbar"),
      userMenu: null,
      status: document.getElementById("status"),
      drawerShell: document.getElementById("drawer-shell"),
      drawerHost: document.getElementById("drawer"),
      cardView: document.getElementById("models-card-view"),
      toolbar: null
    };
    this.state = {
      session: this.userSdk.readSession(),
      user: this.userSdk.readUser(),
      selectedTreeNodeId: treeNodeIds.myPersonal
    };
    this.apiClient = new ModelsApiClient(apiBase, () => this.state.session, () => this.userSdk.getUserId(this.state.session));
    if (!this.state.session)
      this.userSdk.redirectToLogin();
    this.cardViewInstance = null;
    this.drawerInstance = null;
    this.treeViewInstance = null;
    this.toolbarInstance = null;
    this.personalModels = [];
    this.favoriteModels = [];
    this.libraryModels = [];
    this.publicModels = [];
    this.favoriteModelIdSet = new Set();
    this.pickedModelIdSet = new Set();
    this.initNavToolbar();
    this.cacheNavElements();
    this.bindNav();
    this.initDrawer();
    this.initDeletePopup();
    this.userSdk.refreshState(this.state);
    this.loadModels();
  }
  initDeletePopup() {
    if (this.deletePopupInstance || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxPopup) return;
    const popupHost = document.createElement("div");
    popupHost.id = "delete-popup";
    document.body.appendChild(popupHost);
    this.deletePopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: false,
      showTitle: true,
      title: "Delete model?",
      width: 360,
      height: "auto",
      dragEnabled: false,
      closeOnOutsideClick: true
    });
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
            elementAttr: { id: "nav-new-model", title: "Create model" },
            stylingMode: "text",
            text: "Create",
            icon: "fa-light fa-plus"
          }
        },
        {
          location: "after",
          widget: "dxDropDownButton",
          options: {
            stylingMode: "text",
            elementAttr: { id: "user-menu", class: "user-menu" },
            items: [{ id: "logout", text: "Logout", icon: "fa-light fa-arrow-left-to-bracket" }],
            keyExpr: "id",
            displayExpr: "text",
            onItemClick: () => this.userSdk.logout(),
            dropDownOptions: { width: "auto", minWidth: 140 },
            template: (_, contentElement) => {
              const host = contentElement && contentElement.get ? contentElement.get(0) : contentElement;
              if (!host) 
                return;
              host.innerHTML = "";
              const avatar = document.createElement("img");
              avatar.className = "user-menu-avatar";
              avatar.alt = "User avatar";
              host.appendChild(avatar);
            }
          }
        }
      ]
    });
  }
  cacheNavElements() {
    this.elements.navNewModel = document.getElementById("nav-new-model");
    this.elements.userMenu = document.getElementById("user-menu");
    this.userSdk.applyUserMenu(this.elements.userMenu, this.state.session);
  }

  setStatus(message, isError = false) {
    this.elements.status.textContent = message || "";
    this.elements.status.classList.toggle("error", Boolean(isError));
  }

  getModelThumbnailSource(thumbnail) {
    if (!thumbnail || typeof thumbnail !== "string") return "";
    if (thumbnail.startsWith("data:")) return thumbnail;
    if (thumbnail.startsWith("http://") || thumbnail.startsWith("https://") || thumbnail.startsWith("/") || thumbnail.startsWith("blob:")) return thumbnail;
    return `data:image/png;base64,${thumbnail}`;
  }

  escapeHtml(value) {
    if (value === undefined || value === null) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  ensureCardView() {
    if (this.cardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
      this.cardViewInstance = new CardView(this.elements.cardView, {
        dataSource: [],
        height: "100%",
        scrolling: { mode: "virtual" },
        paging: { enabled: false },
        pager: { visible: false },
        showBorders: false,
      focusStateEnabled: false,
      hoverStateEnabled: false,
      allowColumnReordering: false,
      allowColumnResizing: false,
      columnHidingEnabled: true,
      headerPanel: { visible: false },
      groupPanel: { visible: false },
      grouping: { autoExpandAll: false, contextMenuEnabled: false },
      sorting: { mode: "none" },
      colCount: 3,
      colCountByScreen: { lg: 3, md: 2, sm: 1, xs: 1 },
      columns: [
        { dataField: "title", caption: "Title" },
        { dataField: "description", caption: "Description" }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement && cardElement.get ? cardElement.get(0) : cardElement;
        const data = cardData && cardData.card && cardData.card.data ? cardData.card.data : cardData || {};
        if (!host) return;
        const isFavorite = this.isFavoriteValue(data);
        const isPicked = this.isPickedValue(data);
        const isPublic = data.is_public === true || data.is_public === 1;
        const thumbnailSrc = this.getModelThumbnailSource(data.thumbnail);
        const educationLookupId = data.education_level_id;
        const scienceLookupId = data.science_id;
        const educationLabel = data.education_level || "Uncategorized";
        const scienceLabel = data.science || "Uncategorized";
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const taxonomyDropDownMarkup = `
          <div class="card-thumb-dropdowns">
            <div class="card-thumb-dropdown education-dropdown-host" data-lookup-id="${educationLookupId}">${escapedEducationLabel}</div>
            <div class="card-thumb-dropdown science-dropdown-host" data-lookup-id="${scienceLookupId}">${escapedScienceLabel}</div>
          </div>
        `;
        const thumbnailMarkup = thumbnailSrc ? `<div class="card-thumb-wrap"><img class="card-thumb" src="${thumbnailSrc}" alt="${data.title || "Model thumbnail"}">${taxonomyDropDownMarkup}</div>` : "";
        const cardMarkup = `
          <div class="card-tile" data-model-id="${data.id || ""}">
            ${thumbnailMarkup}
            <div class="card-actions">
              <button class="delete-button" aria-label="Delete model">
                <i class="fa-light fa-trash-can trash" aria-hidden="true"></i>
                <i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i>
              </button>
            </div>
            <h3 class="card-title">${data.title || "Untitled model"}</h3>
            <p class="card-desc">${data.description || "No description provided."}</p>
            <div class="card-meta-actions">
              <button class="favorite-button${isFavorite ? " is-favorite" : ""}" aria-label="${isFavorite ? "Unfavorite" : "Favorite"}">
                <i class="${isFavorite ? "fa-solid fa-star favorite-icon" : "fa-regular fa-star favorite-icon"}" aria-hidden="true"></i>
              </button>
              <button class="pick-button${isPicked ? " is-picked" : ""}" aria-label="${isPicked ? "Remove from library" : "Add to library"}" title="${isPicked ? "In library" : "Add to library"}">
                <i class="${isPicked ? "fa-solid fa-bookmark pick-icon" : "fa-regular fa-bookmark pick-icon"}" aria-hidden="true"></i>
              </button>
            </div>
            <button class="visibility-button${isPublic ? " is-public" : ""}" aria-label="${isPublic ? "Set private" : "Set public"}" title="${isPublic ? "Public" : "Private"}">
              <i class="${isPublic ? "fa-light fa-lock-open" : "fa-light fa-lock"} visibility-icon" aria-hidden="true"></i>
            </button>
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardTile = host.querySelector(".card-tile");
        const favoriteButton = host.querySelector(".favorite-button");
        const pickButton = host.querySelector(".pick-button");
        const deleteButton = host.querySelector(".delete-button");
        const visibilityButton = host.querySelector(".visibility-button");
        const educationDropdownHost = host.querySelector(".education-dropdown-host");
        const scienceDropdownHost = host.querySelector(".science-dropdown-host");
        if (favoriteButton) favoriteButton.addEventListener("click", () => this.toggleFavorite(data, !isFavorite));
        if (pickButton) pickButton.addEventListener("click", () => this.togglePick(data, !isPicked));
        if (deleteButton) deleteButton.addEventListener("click", event => {
          event.stopPropagation();
          this.deleteModel(data);
        });
        if (visibilityButton) visibilityButton.addEventListener("click", event => {
          event.stopPropagation();
          this.toggleVisibility(data);
        });
        if (educationDropdownHost) {
          educationDropdownHost.addEventListener("mousedown", event => event.stopPropagation());
          educationDropdownHost.addEventListener("click", event => event.stopPropagation());
          educationDropdownHost.addEventListener("dblclick", event => event.stopPropagation());
          $(educationDropdownHost).dxDropDownButton({
            dataSource: new DevExpress.data.CustomStore({
              key: "id",
              load: () => this.apiClient.fetchEducationLevelLookups()
            }),
            keyExpr: "id",
            displayExpr: "name",
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: educationLookupId === undefined || educationLookupId === null || educationLookupId === "" ? null : educationLookupId,
            text: educationLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              if (!event || !event.itemData || !event.itemData.id) return;
              if (!data || !data.id) return;
              const nextEducationLookupId = event.itemData.id;
              if (nextEducationLookupId === data.education_level_id) return;
              try {
                await this.apiClient.patchModelTaxonomy(data.id, nextEducationLookupId, data.science_id || "");
                data.education_level_id = nextEducationLookupId;
                data.education_level = event.itemData.name || data.education_level;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error && error.message ? error.message : "Failed to update model metadata.", true);
              }
            }
          });
        }
        if (scienceDropdownHost) {
          scienceDropdownHost.addEventListener("mousedown", event => event.stopPropagation());
          scienceDropdownHost.addEventListener("click", event => event.stopPropagation());
          scienceDropdownHost.addEventListener("dblclick", event => event.stopPropagation());
          $(scienceDropdownHost).dxDropDownButton({
            dataSource: new DevExpress.data.CustomStore({
              key: "id",
              load: () => this.apiClient.fetchScienceLookups()
            }),
            keyExpr: "id",
            displayExpr: "name",
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: scienceLookupId === undefined || scienceLookupId === null || scienceLookupId === "" ? null : scienceLookupId,
            text: scienceLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              if (!event || !event.itemData || !event.itemData.id) return;
              if (!data || !data.id) return;
              const nextScienceLookupId = event.itemData.id;
              if (nextScienceLookupId === data.science_id) return;
              try {
                await this.apiClient.patchModelTaxonomy(data.id, data.education_level_id || "", nextScienceLookupId);
                data.science_id = nextScienceLookupId;
                data.science = event.itemData.name || data.science;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error && error.message ? error.message : "Failed to update model metadata.", true);
              }
            }
          });
        }
        if (cardTile) {
          cardTile.addEventListener("click", event => {
            if (event && event.target && event.target.closest(".favorite-button")) return;
            if (event && event.target && event.target.closest(".pick-button")) return;
            if (event && event.target && event.target.closest(".delete-button")) return;
            if (event && event.target && event.target.closest(".visibility-button")) return;
            if (event && event.target && event.target.closest(".card-thumb-dropdowns")) return;
            this.selectModelCard(cardTile);
          });
          cardTile.addEventListener("dblclick", event => {
            if (event && event.target && event.target.closest(".favorite-button")) return;
            if (event && event.target && event.target.closest(".pick-button")) return;
            if (event && event.target && event.target.closest(".delete-button")) return;
            if (event && event.target && event.target.closest(".visibility-button")) return;
            if (event && event.target && event.target.closest(".card-thumb-dropdowns")) return;
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

  async loadModels(selectedTreeNodeId = this.state.selectedTreeNodeId) {
    this.setStatus("Loading models…");
    try {
      this.state.selectedTreeNodeId = selectedTreeNodeId || treeNodeIds.myPersonal;
      await this.loadDataSources();
      this.renderTree();
      this.ensureValidSelectedTreeNodeId();
      const items = this.getModelsByTreeNodeId(this.state.selectedTreeNodeId);
      this.setStatus(items.length ? "" : "No models found.");
      this.renderModels(items);
      this.refreshTreeSelection();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to load models.", true);
      this.renderModels([]);
    }
  }

  async loadDataSources() {
    const requests = [
      this.apiClient.fetchPersonalModels(),
      this.apiClient.fetchFavoriteModels(),
      this.apiClient.fetchPublicModels()
    ];
    const [personalModels, favoriteModels, publicModels] = await Promise.all(requests);
    this.personalModels = personalModels;
    this.favoriteModels = favoriteModels;
    this.publicModels = publicModels;
    try {
      this.libraryModels = await this.apiClient.fetchLibraryModels();
    } catch (_) {
      this.libraryModels = this.personalModels.filter(model => this.hasPickedFlag(model));
    }
    this.rebuildInteractionModelIdSets();
  }

  getModelsByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.myPersonal)
      return this.personalModels;
    if (nodeId === treeNodeIds.myFavorite)
      return this.favoriteModels;
    if (nodeId === treeNodeIds.myLibrary)
      return this.libraryModels;
    if (typeof nodeId === "string" && nodeId.startsWith("market-education-item:")) {
      const educationLabel = decodeURIComponent(nodeId.substring("market-education-item:".length));
      return this.publicModels.filter(model => this.getEducationLabel(model) === educationLabel);
    }
    if (typeof nodeId === "string" && nodeId.startsWith("market-science-item:")) {
      const scienceLabel = decodeURIComponent(nodeId.substring("market-science-item:".length));
      return this.publicModels.filter(model => this.getScienceLabel(model) === scienceLabel);
    }
    return [];
  }

  getEducationLabel(model) {
    if (model && model.education_level)
      return model.education_level;
    return "Uncategorized";
  }

  getScienceLabel(model) {
    if (model && model.science)
      return model.science;
    return "Uncategorized";
  }

  buildGroupedPublicItems(type) {
    const grouped = new Map();
    for (let index = 0; index < this.publicModels.length; index++) {
      const model = this.publicModels[index];
      const label = type === "education" ? this.getEducationLabel(model) : this.getScienceLabel(model);
      grouped.set(label, (grouped.get(label) ?? 0) + 1);
    }
    return Array.from(grouped.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(entry => {
        const label = entry[0];
        const count = entry[1];
        const baseId = type === "education" ? "market-education-item:" : "market-science-item:";
        const nodeType = type === "education" ? "market-education-item" : "market-science-item";
        return {
          id: `${baseId}${encodeURIComponent(label)}`,
          text: `${label} (${count})`,
          nodeType: nodeType,
          count: count,
          iconClass: type === "education" ? "fa-light fa-graduation-cap" : "fa-light fa-flask",
          iconColor: type === "education" ? "#8b5cf6" : "#0ea5e9"
        };
      });
  }

  getTreeData() {
    const educationItems = this.buildGroupedPublicItems("education");
    const scienceItems = this.buildGroupedPublicItems("science");
    return [
      {
        id: treeNodeIds.myModels,
        text: "My Models",
        iconClass: "fa-light fa-folder-user",
        iconColor: "#2563eb",
        expanded: true,
        selectable: false,
        items: [
          {
            id: treeNodeIds.myPersonal,
            text: `Personal (${this.personalModels.length})`,
            nodeType: "my-personal",
            iconClass: "fa-light fa-user",
            iconColor: "#2563eb"
          },
          {
            id: treeNodeIds.myFavorite,
            text: `Favorite (${this.favoriteModels.length})`,
            nodeType: "my-favorite",
            iconClass: "fa-light fa-star",
            iconColor: "#f59e0b"
          },
          {
            id: treeNodeIds.myLibrary,
            text: `Library (${this.libraryModels.length})`,
            nodeType: "my-library",
            iconClass: "fa-light fa-bookmark",
            iconColor: "#dc2626"
          }
        ]
      },
      {
        id: treeNodeIds.marketplace,
        text: "Marketplace",
        iconClass: "fa-light fa-store",
        iconColor: "#16a34a",
        expanded: true,
        selectable: false,
        items: [
          {
            id: treeNodeIds.marketplaceEducation,
            text: "Education Levels",
            iconClass: "fa-light fa-graduation-cap",
            iconColor: "#8b5cf6",
            expanded: true,
            selectable: false,
            items: educationItems
          },
          {
            id: treeNodeIds.marketplaceSciences,
            text: "Sciences",
            iconClass: "fa-light fa-flask",
            iconColor: "#0ea5e9",
            expanded: true,
            selectable: false,
            items: scienceItems
          }
        ]
      }
    ];
  }

  collectTreeNodeIds(items, target) {
    if (!Array.isArray(items))
      return;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item || typeof item !== "object")
        continue;
      if (item.id)
        target.add(item.id);
      if (Array.isArray(item.items))
        this.collectTreeNodeIds(item.items, target);
    }
  }

  ensureValidSelectedTreeNodeId() {
    const treeData = this.getTreeData();
    const nodeIds = new Set();
    this.collectTreeNodeIds(treeData, nodeIds);
    if (!nodeIds.has(this.state.selectedTreeNodeId))
      this.state.selectedTreeNodeId = treeNodeIds.myPersonal;
  }

  selectModelCard(cardTile) {
    if (!cardTile) return;
    const selected = this.elements.cardView.querySelector(".card-tile.selected");
    if (selected && selected !== cardTile) selected.classList.remove("selected");
    cardTile.classList.add("selected");
  }

  normalizeModelId(modelData) {
    if (!modelData) return "";
    const modelId = modelData.id;
    if (modelId === undefined || modelId === null) return "";
    return String(modelId);
  }

  isTruthyInteractionFlag(flagValue) {
    return flagValue === true || flagValue === 1 || flagValue === "1" || flagValue === "true";
  }

  hasFavoriteFlag(modelData) {
    if (!modelData) return false;
    return this.isTruthyInteractionFlag(modelData.is_favorite);
  }

  hasPickedFlag(modelData) {
    if (!modelData) return false;
    return this.isTruthyInteractionFlag(modelData.is_picked);
  }

  rebuildInteractionModelIdSets() {
    this.favoriteModelIdSet = new Set();
    this.pickedModelIdSet = new Set();
    const modelGroups = [this.personalModels, this.favoriteModels, this.libraryModels, this.publicModels];
    for (let groupIndex = 0; groupIndex < modelGroups.length; groupIndex++) {
      const modelGroup = modelGroups[groupIndex];
      if (!Array.isArray(modelGroup)) continue;
      for (let modelIndex = 0; modelIndex < modelGroup.length; modelIndex++) {
        const modelData = modelGroup[modelIndex];
        const modelId = this.normalizeModelId(modelData);
        if (!modelId) continue;
        if (this.hasFavoriteFlag(modelData)) this.favoriteModelIdSet.add(modelId);
        if (this.hasPickedFlag(modelData)) this.pickedModelIdSet.add(modelId);
      }
    }
    for (let modelIndex = 0; modelIndex < this.favoriteModels.length; modelIndex++) {
      const modelId = this.normalizeModelId(this.favoriteModels[modelIndex]);
      if (modelId) this.favoriteModelIdSet.add(modelId);
    }
    for (let modelIndex = 0; modelIndex < this.libraryModels.length; modelIndex++) {
      const modelId = this.normalizeModelId(this.libraryModels[modelIndex]);
      if (modelId) this.pickedModelIdSet.add(modelId);
    }
  }

  isFavoriteValue(modelData) {
    if (!modelData) return false;
    if (this.hasFavoriteFlag(modelData)) return true;
    const modelId = this.normalizeModelId(modelData);
    if (!modelId) return false;
    return this.favoriteModelIdSet.has(modelId);
  }

  isPickedValue(modelData) {
    if (!modelData) return false;
    if (this.hasPickedFlag(modelData)) return true;
    const modelId = this.normalizeModelId(modelData);
    if (!modelId) return false;
    return this.pickedModelIdSet.has(modelId);
  }

  async toggleFavorite(modelData, shouldFavorite) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const currentFavoriteState = this.isFavoriteValue(modelData);
    const desiredFavoriteState = typeof shouldFavorite === "boolean" ? shouldFavorite : !currentFavoriteState;
    try {
      await this.apiClient.patchUserModelInteraction(modelData.id, this.state.session.userId, {
        is_favorite: desiredFavoriteState
      });
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to mark favorite.", true);
    }
  }

  async togglePick(modelData, shouldPick) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const currentPickedState = this.isPickedValue(modelData);
    const desiredPickedState = typeof shouldPick === "boolean" ? shouldPick : !currentPickedState;
    try {
      await this.apiClient.patchUserModelInteraction(modelData.id, this.state.session.userId, {
        is_picked: desiredPickedState
      });
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to update library.", true);
    }
  }

  async toggleVisibility(modelData) {
    if (!modelData || !modelData.id) return;
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus("Sign-in required to update visibility.", true);
      return;
    }
    const nextValue = !(modelData.is_public === true || modelData.is_public === 1);
    this.setStatus(nextValue ? "Setting public…" : "Setting private…");
    try {
      await this.apiClient.updateModelVisibility(modelData.id, nextValue);
      this.setStatus(nextValue ? "Model is public." : "Model is private.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to update visibility.", true);
    }
  }

  initDrawer() {
    if (this.drawerInstance || !this.elements.drawerHost || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxDrawer) return;
    const treeHost = document.createElement("div");
    this.drawerInstance = new DevExpress.ui.dxDrawer(this.elements.drawerHost, {
      opened: true,
      minSize: 220,
      maxSize: 260,
      revealMode: "expand",
      openedStateMode: "shrink",
      template: () => treeHost,
      shading: false
    });
    this.treeViewInstance = new DevExpress.ui.dxTreeView(treeHost, {
      dataSource: [],
      keyExpr: "id",
      displayExpr: "text",
      itemsExpr: "items",
      selectionMode: "single",
      selectByClick: true,
      focusStateEnabled: false,
      itemTemplate: (itemData, itemIndex, itemElement) => this.renderTreeItem(itemData, itemElement),
      onItemClick: event => {
        if (!event || !event.itemData || !event.itemData.id)
          return;
        if (event.itemData.selectable === false) {
          this.refreshTreeSelection();
          return;
        }
        this.state.selectedTreeNodeId = event.itemData.id;
        const models = this.getModelsByTreeNodeId(this.state.selectedTreeNodeId);
        this.renderModels(models);
        this.setStatus(models.length ? "" : "No models found.");
      }
    });
  }

  renderTreeItem(itemData, itemElement) {
    const host = itemElement && itemElement.get ? itemElement.get(0) : itemElement;
    if (!host)
      return;
    const iconClass = itemData?.iconClass || "fa-light fa-folder";
    const iconColor = itemData?.iconColor || "#6b7280";
    host.innerHTML = `
      <span class="tree-item-wrap">
        <i class="${iconClass} tree-item-icon" style="color:${iconColor}"></i>
        <span class="tree-item-text">${itemData?.text || ""}</span>
      </span>
    `;
  }

  renderTree() {
    if (!this.treeViewInstance)
      return;
    this.treeViewInstance.option("dataSource", this.getTreeData());
  }

  refreshTreeSelection() {
    if (!this.treeViewInstance || !this.state.selectedTreeNodeId)
      return;
    this.treeViewInstance.selectItem(this.state.selectedTreeNodeId);
  }
  toggleDrawer() {
    if (!this.drawerInstance || !this.elements.drawerShell) return;
    const isOpen = this.drawerInstance.option("opened");
    this.drawerInstance.option("opened", !isOpen);
    this.elements.drawerShell.classList.toggle("drawer-collapsed", isOpen);
  }
  bindNav() {
    if (this.elements.navNewModel) this.elements.navNewModel.addEventListener("click", () => this.createModel());
  }
  async createModel() {
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus("Sign-in required to create a model.", true);
      return;
    }
    const userId = this.userSdk.getUserId(this.state.session);
    if (!userId) {
      this.setStatus("Missing user id for model creation.", true);
      return;
    }
    this.setStatus("Creating model…");
    try {
      const created = await this.apiClient.createModel({
        title: "Untitled model",
        description: "",
        type: "model",
        status: "draft",
        userId: userId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      this.setStatus("Model created.");
      this.loadModels();
      if (created && created.id) {
        this.openModel(created);
      }
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to create model.", true);
    }
  }
  async deleteModel(modelData) {
    const modelId = modelData && modelData.id;
    if (!modelId)
      return;
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus("Sign-in required to delete a model.", true);
      return;
    }
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting model…");
    try {
      await this.apiClient.deleteModel(modelId);
      this.setStatus("Model deleted.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to delete model.", true);
    }
  }
  confirmDelete() {
    if (!this.deletePopupInstance) return Promise.resolve(window.confirm("Delete this model?"));
    return new Promise(resolve => {
      this.deletePopupInstance.option("contentTemplate", () => {
        const container = document.createElement("div");
        const text = document.createElement("p");
        text.textContent = "This action cannot be undone.";
        text.style.margin = "0 0 1rem";
        const buttons = document.createElement("div");
        buttons.style.display = "flex";
        buttons.style.justifyContent = "center";
        buttons.style.gap = "0.5rem";
        const cancel = document.createElement("div");
        const confirm = document.createElement("div");
        buttons.appendChild(cancel);
        buttons.appendChild(confirm);
        container.appendChild(text);
        container.appendChild(buttons);
        $(cancel).dxButton({
          text: "Cancel",
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(false);
          }
        });
        $(confirm).dxButton({
          text: "Delete",
          type: "danger",
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(true);
          }
        });
        return container;
      });
      this.deletePopupInstance.show();
    });
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
