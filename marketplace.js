import { ModelsApiClient } from "./sdk/modelsApiClient.js";
import { UserSdk } from "./sdk/userSdk.js";
import { ProfileController } from "./scripts/marketplace/profileController.js";
import { countryItems } from "./scripts/marketplace/profile.js";
import { MarketplaceTranslations } from "./scripts/marketplace/translations.js";

const apiBase = "https://modellus-api.interactivebook.workers.dev";
const sessionKey = window.modellus?.auth?.sessionKey || "mp.session";
const userKey = window.modellus?.auth?.userKey || "mp.user";
const maintenanceAccessFeatureFlagKey = "can_access_maintenance";
const treeNodeIds = {
  myModels: "my-models",
  myPersonal: "my-personal",
  myFavorite: "my-favorite",
  myLibrary: "my-library",
  myDraft: "my-draft",
  myPublished: "my-published",
  myDeleted: "my-deleted",
  marketplace: "marketplace",
  marketplaceModels: "marketplace-models",
  marketplaceModelsEducation: "market-education",
  marketplaceModelsSciences: "market-sciences",
  marketplaceVideos: "marketplace-videos",
  marketplaceVideosEducation: "marketplace-videos-education",
  marketplaceVideosSciences: "marketplace-videos-sciences",
  marketplaceData: "marketplace-data",
  marketplaceDataEducation: "marketplace-data-education",
  marketplaceDataSciences: "marketplace-data-sciences",
  marketplaceCharacters: "marketplace-characters",
  maintenance: "maintenance",
  maintenanceModels: "maintenance-models",
  maintenanceEducation: "maintenance-education",
  maintenanceSciences: "maintenance-sciences",
  maintenanceNotifications: "maintenance-notifications",
  maintenanceUsers: "maintenance-users",
  maintenanceSystemTemplates: "maintenance-system-templates",
  maintenanceWhatsNew: "maintenance-whats-new",
  maintenanceCharacterCategories: "maintenance-character-categories"
};
const fontAwesomeIcons = [
  { value: "", label: "No icon" },
  { value: "fa-light fa-graduation-cap", label: "Graduation Cap" },
  { value: "fa-light fa-flask", label: "Flask" },
  { value: "fa-light fa-book", label: "Book" },
  { value: "fa-light fa-book-open", label: "Book Open" },
  { value: "fa-light fa-atom", label: "Atom" },
  { value: "fa-light fa-microscope", label: "Microscope" },
  { value: "fa-light fa-vial", label: "Vial" },
  { value: "fa-light fa-globe", label: "Globe" },
  { value: "fa-light fa-earth-europe", label: "Earth Europe" },
  { value: "fa-light fa-calculator", label: "Calculator" },
  { value: "fa-light fa-square-root-variable", label: "Square Root" },
  { value: "fa-light fa-code", label: "Code" },
  { value: "fa-light fa-gear", label: "Gear" },
  { value: "fa-light fa-brain", label: "Brain" },
  { value: "fa-light fa-seedling", label: "Seedling" },
  { value: "fa-light fa-dna", label: "DNA" },
  { value: "fa-light fa-bolt", label: "Bolt" },
  { value: "fa-light fa-wave-pulse", label: "Wave Pulse" },
  { value: "fa-light fa-ruler", label: "Ruler" },
  { value: "fa-light fa-compass-drafting", label: "Compass Drafting" }
];
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
    this.personalModels = [];
    this.favoriteModels = [];
    this.libraryModels = [];
    this.draftModels = [];
    this.publishedModels = [];
    this.deletedModels = [];
    this.publicModels = [];
    this.videosData = [];
    this.dataSetData = [];
    this.educationLookupOptions = [];
    this.scienceLookupOptions = [];
    this.educationLookupNameById = new Map();
    this.scienceLookupNameById = new Map();
    this.educationLookupColorById = new Map();
    this.scienceLookupColorById = new Map();
    this.educationLookupIconById = new Map();
    this.scienceLookupIconById = new Map();
    this.normalizeAuthenticationState();
    this.apiClient = new ModelsApiClient(apiBase, () => this.state.session, () => this.userSdk.getUserId(this.state.session));
    this.state.selectedTreeNodeId = this.getDefaultTreeNodeId();
    this.translations = new MarketplaceTranslations(this.state.user?.preferredLanguage);
    if (this.translations.language !== "en-US" && window.DevExpress?.localization) {
      DevExpress.localization.loadMessages(MarketplaceTranslations.buildDevExtremeMessages());
      DevExpress.localization.locale(MarketplaceTranslations.dxMessagesLocale);
    }
    this.profileController = new ProfileController(this.apiClient, this.userSdk, this.state, this.translations);
    this.cardViewInstance = null;
    this.videosCardViewInstance = null;
    this.dataCardViewInstance = null;
    this.characterCardViewInstance = null;
    this.drawerInstance = null;
    this.treeViewInstance = null;
    this.toolbarInstance = null;
    this.maintenanceGridInstance = null;
    this.maintenanceModelsGridInstance = null;
    this.systemTemplatesGridInstance = null;
    this.templatePickerPopupInstance = null;
    this.usersGridInstance = null;
    this.userFeaturesPopupInstance = null;
    this.favoriteModelIdSet = new Set();
    this.pickedModelIdSet = new Set();
    this.unreadNotificationCount = 0;
    this.notificationsGridInstance = null;
    this.uploadVideoPopupInstance = null;
    this.dataPopupInstance = null;
    this.editVideoPopupInstance = null;
    this.characterPopupInstance = null;
    this._uploadVideoFile = null;
    this._dataFile = null;
    this._characterAssetFile = null;
    this._uploadVideoThumbnailFile = null;
    this._dataThumbnailFile = null;
    this._editVideoThumbnailFile = null;
    this._editVideoHTMLEditor = null;
    this._editDataHTMLEditor = null;
    this._editCharacterHTMLEditor = null;
    this._charEditorCharacter = null;
    this._charEditorTitleInput = null;
    this._charEditorDescEditor = null;
    this._charEditorHost = null;
    this.charactersData = [];
    this.initNavToolbar();
    this.cacheNavElements();
    this.bindNav();
    this.initDrawer();
    this.initDeletePopup();
    this.userSdk.refreshState(this.state);
    this.normalizeAuthenticationState();
    if (this.isAuthenticated())
      this.userSdk.startSessionRefresh(apiBase);
    this.loadModels().then(() => {
      if (this.isAuthenticated())
        this.checkProfileComplete();
    });
    if (this.isAuthenticated())
      this.loadUnreadNotificationCount();
  }
  isAuthenticated() {
    return this.userSdk.isSessionValid(this.state.session);
  }

  normalizeAuthenticationState() {
    if (this.userSdk.isSessionValid(this.state.session))
      return;
    this.userSdk.clearToken();
    this.userSdk.clearRefreshToken();
    this.userSdk.clearSession();
    this.userSdk.clearUser();
    this.state.session = null;
    this.state.user = null;
  }

  getDefaultTreeNodeId() {
    if (this.isAuthenticated())
      return treeNodeIds.myPersonal;
    const educationItems = this.buildGroupedPublicItems("education");
    if (educationItems.length)
      return educationItems[0].id;
    const scienceItems = this.buildGroupedPublicItems("science");
    if (scienceItems.length)
      return scienceItems[0].id;
    return treeNodeIds.marketplaceModels;
  }

  isNonSelectableTreeNodeId(nodeId) {
    return nodeId === treeNodeIds.myModels
      || nodeId === treeNodeIds.marketplace
      || nodeId === treeNodeIds.marketplaceModels
      || nodeId === treeNodeIds.marketplaceModelsEducation
      || nodeId === treeNodeIds.marketplaceModelsSciences
      || nodeId === treeNodeIds.marketplaceVideos
      || nodeId === treeNodeIds.marketplaceVideosEducation
      || nodeId === treeNodeIds.marketplaceVideosSciences
      || nodeId === treeNodeIds.marketplaceData
      || nodeId === treeNodeIds.marketplaceDataEducation
      || nodeId === treeNodeIds.marketplaceDataSciences
      || nodeId === treeNodeIds.marketplaceCharacters
      || nodeId === treeNodeIds.maintenance;
  }

  initDeletePopup() {
    if (this.deletePopupInstance || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxPopup) return;
    let popupHost = document.getElementById("delete-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="delete-popup"></div>`);
      popupHost = document.getElementById("delete-popup");
    }
    if (!popupHost) return;
    this.deletePopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: false,
      showTitle: true,
      title: this.translations.get("Delete model?"),
      width: 360,
      height: "auto",
      dragEnabled: false,
      closeOnOutsideClick: true
    });
  }
  initNavToolbar() {
    if (!this.elements.navToolbar || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxToolbar) return;
    const isAuthenticated = this.isAuthenticated();
    this.navToolbarInstance = new DevExpress.ui.dxToolbar(this.elements.navToolbar, {
      onContentReady: event => $(event.element).find('[title="Menu"]').removeAttr("title"),
      items: [
        {
          location: "after",
          widget: "dxButton",
          visible: isAuthenticated,
          options: {
            elementAttr: { id: "nav-upload-video", title: "Upload Video" },
            stylingMode: "text",
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px"><i class="fa-light fa-video mdl-nav-action-icon" style="color:#e11d48;font-size:1rem"></i><i class="fa-solid fa-video mdl-nav-action-icon-hover" style="color:#e11d48;font-size:1rem"></i><span>Upload Video</span></span>`;
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          visible: isAuthenticated,
          options: {
            elementAttr: { id: "nav-upload-data", title: "Upload Data" },
            stylingMode: "text",
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px"><i class="fa-light fa-table mdl-nav-action-icon" style="color:#d97706;font-size:1rem"></i><i class="fa-solid fa-table mdl-nav-action-icon-hover" style="color:#d97706;font-size:1rem"></i><span>Upload Data</span></span>`;
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          visible: isAuthenticated,
          options: {
            elementAttr: { id: "nav-add-character", title: "Add Character" },
            stylingMode: "text",
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px"><i class="fa-light fa-person-running mdl-nav-action-icon" style="color:#7c3aed;font-size:1rem"></i><i class="fa-solid fa-person-running mdl-nav-action-icon-hover" style="color:#7c3aed;font-size:1rem"></i><span>Add Character</span></span>`;
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          visible: isAuthenticated,
          options: {
            elementAttr: { id: "nav-new-model", title: "Create Model" },
            stylingMode: "text",
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px"><i class="fa-light fa-earth-africa mdl-nav-action-icon" style="color:#2563eb;font-size:1rem"></i><i class="fa-solid fa-earth-africa mdl-nav-action-icon-hover" style="color:#2563eb;font-size:1rem"></i><span>Create Model</span></span>`;
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          visible: isAuthenticated,
          options: {
            elementAttr: { id: "nav-notifications", title: "Notifications" },
            stylingMode: "text",
            onClick: () => this.navigateToNotifications(),
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span class="notification-bell"><i class="fa-light fa-bell mdl-nav-icon mdl-nav-action-icon"></i><i class="fa-solid fa-bell mdl-nav-icon mdl-nav-action-icon-hover"></i></span>`;
              this.bellElement = host.querySelector(".notification-bell");
            }
          }
        },
        {
          location: "after",
          visible: isAuthenticated,
          widget: "dxDropDownButton",
          options: {
            stylingMode: "text",
            elementAttr: { id: "user-menu", class: "user-menu" },
            items: [
              { id: "profile", text: this.translations.get("My Profile"), icon: "fa-light fa-user" },
              { id: "logout", text: this.translations.get("Logout"), icon: "fa-light fa-arrow-left-to-bracket" }
            ],
            keyExpr: "id",
            displayExpr: "text",
            onItemClick: event => {
              if (event.itemData.id === "profile")
                this.profileController.show();
              else
                this.userSdk.logout();
            },
            dropDownOptions: { width: "auto", minWidth: 140, wrapperAttr: { class: "mdl-user-menu-dropdown" } },
            itemTemplate: (itemData, itemIndex, itemElement) => {
              const host = itemElement.get(0);
              const iconMarkup = itemData.icon ? `<i class="${itemData.icon} mdl-menu-icon"></i>` : "";
              host.innerHTML = `<span class="mdl-menu-item-content">${iconMarkup}${itemData.text}</span>`;
            },
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<img class="user-menu-avatar" alt="User avatar">`;
            }
          }
        },
        {
          location: "after",
          visible: !isAuthenticated,
          widget: "dxButton",
          options: {
            elementAttr: { id: "nav-login", title: this.translations.get("Login") },
            stylingMode: "contained",
            type: "default",
            text: this.translations.get("Login"),
            icon: "fa-light fa-arrow-right-to-bracket",
            onClick: () => this.userSdk.redirectToLogin()
          }
        }
      ]
    });
  }
  cacheNavElements() {
    this.elements.navNewModel = document.getElementById("nav-new-model");
    this.elements.navUploadVideo = document.getElementById("nav-upload-video");
    this.elements.navUploadData = document.getElementById("nav-upload-data");
    this.elements.navAddCharacter = document.getElementById("nav-add-character");
    this.elements.userMenu = document.getElementById("user-menu");
    this.elements.navLogin = document.getElementById("nav-login");
    this.userSdk.applyUserMenu(this.elements.userMenu, this.state.session);
  }

  setStatus(message, isError = false) {
    this.elements.status.textContent = message || "";
    this.elements.status.classList.toggle("error", Boolean(isError));
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
  getModelDescriptionText(description) {
    return String(description || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  formatShortDate(value) {
    if (!value)
      return "";
    const date = new Date(value);
    if (isNaN(date.getTime()))
      return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  createNodeFromMarkup(markup) {
    const fragment = document.createRange().createContextualFragment(markup);
    return fragment.firstElementChild;
  }

  renderLookupDropdownOption(itemData, itemElement) {
    const host = itemElement.get(0);
    const iconMarkup = itemData.icon ? `<i class="${itemData.icon}" aria-hidden="true"></i>` : "";
    host.innerHTML = `
      <span style="display:flex;align-items:center;gap:0.45rem">
        ${iconMarkup}
        <span>${itemData.name}</span>
      </span>
    `;
  }

  ensureCardView() {
    if (this.cardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
    this.elements.cardView.innerHTML = "";
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
      cardsPerRow: 4,
      cardMinWidth: 125,
      columns: [
        { dataField: "title", caption: this.translations.get("Title") },
        { dataField: "description", caption: this.translations.get("Description") }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement.get(0);
        const data = cardData.card.data;
        const isDeleted = this.state.selectedTreeNodeId === treeNodeIds.myDeleted;
        const currentUserId = this.userSdk.getUserId(this.state.session);
        const canEdit = !isDeleted && (this.canAccessMaintenance() || (currentUserId && data.created_by === currentUserId));
        const isFavorite = this.isFavoriteValue(data);
        const isPicked = this.isPickedValue(data);
        const isLiked = this.isLikedValue(data);
        const likesCount = data.likes_count || 0;
        const isPublic = data.is_public === true || data.is_public === 1;
        const thumbnailSrc = data.thumbnail_url || "";
        const educationLookupId = data.education_level_id;
        const scienceLookupId = data.science_id;
        const educationLabel = data.education_level || this.translations.get("Uncategorized");
        const scienceLabel = data.science || this.translations.get("Uncategorized");
        const educationColor = data.education_level_color || "#8b5cf6";
        const scienceColor = data.science_color || "#0ea5e9";
        const descriptionText = this.getModelDescriptionText(data.description);
        const hasDescription = !!descriptionText;
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const escapedDescriptionLabel = hasDescription ? this.escapeHtml(descriptionText) : this.escapeHtml(this.translations.get("No description provided."));
        const creatorName = this.escapeHtml(data.creator_name || "");
        const creatorAvatar = data.creator_avatar || "";
        const createdDate = this.formatShortDate(data.created_at);
        const modifiedDate = this.formatShortDate(data.updated_at);
        const taxonomyDropDownMarkup = `
          <div class="card-thumb-dropdowns">
            <div class="card-thumb-dropdown education-dropdown-host" data-lookup-id="${educationLookupId}">${escapedEducationLabel}</div>
            <div class="card-thumb-dropdown science-dropdown-host" data-lookup-id="${scienceLookupId}">${escapedScienceLabel}</div>
          </div>
        `;
        const thumbnailMarkup = thumbnailSrc
          ? `<div class="card-thumb-wrap"><img class="card-thumb" src="${this.escapeHtml(thumbnailSrc)}" alt="${this.escapeHtml(data.title || "")}">${taxonomyDropDownMarkup}</div>`
          : `<div class="card-thumb-wrap"><div class="card-thumb card-thumb-placeholder" style="${Utils.generateThumbPlaceholder(data.id)}">${taxonomyDropDownMarkup}</div></div>`;
        const cardMarkup = `
          <div class="card-tile" data-model-id="${data.id || ""}">
            ${thumbnailMarkup}
            <div class="card-actions">
              ${isDeleted ? `<button class="recover-button" aria-label="${this.translations.get("Recover model")}"><i class="fa-light fa-rotate-left" aria-hidden="true"></i></button>` : ""}
              ${canEdit ? `<button class="edit-button" aria-label="${this.translations.get("Edit model")}"><i class="fa-light fa-pen" aria-hidden="true"></i></button>` : ""}
              ${(canEdit || isDeleted) ? `<button class="delete-button" aria-label="${this.translations.get("Delete model")}">
                <i class="fa-light fa-trash-can trash" aria-hidden="true"></i>
                <i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i>
              </button>` : ""}
            </div>
            <div class="card-body">
              <h3 class="card-title">${this.escapeHtml(data.title) || this.translations.get("Untitled model")}</h3>
              <p class="card-desc${hasDescription ? "" : " card-desc--empty"}">${escapedDescriptionLabel}</p>
              ${isDeleted ? "" : `<div class="card-meta-actions">
                <button class="like-button${isLiked ? " is-liked" : ""}" aria-label="${isLiked ? this.translations.get("Unlike action") : this.translations.get("Like action")}">
                  <i class="${isLiked ? "fa-solid fa-heart like-icon" : "fa-light fa-heart like-icon"}" aria-hidden="true"></i>
                  ${likesCount > 0 ? `<span class="like-count">${likesCount}</span>` : ""}
                </button>
                <button class="favorite-button${isFavorite ? " is-favorite" : ""}" aria-label="${isFavorite ? this.translations.get("Unfavorite action") : this.translations.get("Favorite action")}">
                  <i class="${isFavorite ? "fa-solid fa-star favorite-icon" : "fa-regular fa-star favorite-icon"}" aria-hidden="true"></i>
                </button>
                <button class="pick-button${isPicked ? " is-picked" : ""}" aria-label="${isPicked ? this.translations.get("Remove from library") : this.translations.get("Add to library")}" title="${isPicked ? this.translations.get("In library") : this.translations.get("Add to library")}">
                  <i class="${isPicked ? "fa-solid fa-bookmark pick-icon" : "fa-regular fa-bookmark pick-icon"}" aria-hidden="true"></i>
                </button>
              </div>`}
              <div class="card-meta">
                ${creatorName ? `<div class="card-creator">${creatorAvatar ? `<img class="card-creator-avatar" src="${creatorAvatar}" alt="">` : ""}<span class="card-creator-name">${creatorName}</span></div>` : ""}
                ${createdDate ? `<span class="card-date"><i class="fa-light fa-calendar-plus" aria-hidden="true"></i>${createdDate}</span>` : ""}
              </div>
            </div>
            ${isDeleted ? "" : `<button class="visibility-button${isPublic ? " is-public" : ""}" aria-label="${isPublic ? this.translations.get("Set private") : this.translations.get("Set public")}" title="${isPublic ? this.translations.get("Public") : this.translations.get("Private")}">
              <i class="${isPublic ? "fa-light fa-lock-open" : "fa-light fa-lock"} visibility-icon" aria-hidden="true"></i>
            </button>`}
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardTile = host.querySelector(".card-tile");
        const likeButton = host.querySelector(".like-button");
        const favoriteButton = host.querySelector(".favorite-button");
        const pickButton = host.querySelector(".pick-button");
        const editButton = host.querySelector(".edit-button");
        const deleteButton = host.querySelector(".delete-button");
        const recoverButton = host.querySelector(".recover-button");
        const visibilityButton = host.querySelector(".visibility-button");
        const educationDropdownHost = host.querySelector(".education-dropdown-host");
        const scienceDropdownHost = host.querySelector(".science-dropdown-host");
        if (educationDropdownHost) educationDropdownHost.style.setProperty("--pill-color", educationColor);
        if (scienceDropdownHost) scienceDropdownHost.style.setProperty("--pill-color", scienceColor);
        if (likeButton) likeButton.addEventListener("click", () => this.toggleLike(data, likeButton));
        if (favoriteButton) favoriteButton.addEventListener("click", () => this.toggleFavorite(data, !isFavorite));
        if (pickButton) pickButton.addEventListener("click", () => this.togglePick(data, !isPicked));
        if (editButton)
          editButton.addEventListener("click", event => {
            event.stopPropagation();
            this.showEditModelPopup(data);
          });
        if (deleteButton) deleteButton.addEventListener("click", event => {
          event.stopPropagation();
          this.deleteModel(data);
        });
        if (recoverButton) recoverButton.addEventListener("click", event => {
          event.stopPropagation();
          this.recoverModel(data);
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
              load: () => this.apiClient.fetchEducationLevelLookups(),
              byKey: lookupId => this.apiClient.fetchEducationLevelLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: educationLookupId === undefined || educationLookupId === null || educationLookupId === "" ? null : educationLookupId,
            text: educationLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextEducationLookupId = event.itemData.id;
              if (nextEducationLookupId === data.education_level_id) return;
              try {
                await this.apiClient.patchModelEducationLevel(data.id, nextEducationLookupId);
                data.education_level_id = nextEducationLookupId;
                data.education_level = event.itemData.name || data.education_level;
                data.education_level_color = event.itemData.color || data.education_level_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error && error.message ? error.message : this.translations.get("Failed to update model metadata."), true);
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
              load: () => this.apiClient.fetchScienceLookups(),
              byKey: lookupId => this.apiClient.fetchScienceLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: scienceLookupId === undefined || scienceLookupId === null || scienceLookupId === "" ? null : scienceLookupId,
            text: scienceLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextScienceLookupId = event.itemData.id;
              if (nextScienceLookupId === data.science_id) return;
              try {
                await this.apiClient.patchModelScience(data.id, nextScienceLookupId);
                data.science_id = nextScienceLookupId;
                data.science = event.itemData.name || data.science;
                data.science_color = event.itemData.color || data.science_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error && error.message ? error.message : this.translations.get("Failed to update model metadata."), true);
              }
            }
          });
        }
        if (cardTile) {
          cardTile.addEventListener("click", event => {
            if (event?.target?.closest(".like-button")) return;
            if (event?.target?.closest(".favorite-button")) return;
            if (event?.target?.closest(".pick-button")) return;
            if (event?.target?.closest(".edit-button")) return;
            if (event?.target?.closest(".delete-button")) return;
            if (event?.target?.closest(".visibility-button")) return;
            if (event?.target?.closest(".card-thumb-dropdowns")) return;
            this.selectModelCard(cardTile);
          });
          cardTile.addEventListener("dblclick", event => {
            if (event?.target?.closest(".like-button")) return;
            if (event?.target?.closest(".favorite-button")) return;
            if (event?.target?.closest(".pick-button")) return;
            if (event?.target?.closest(".edit-button")) return;
            if (event?.target?.closest(".delete-button")) return;
            if (event?.target?.closest(".visibility-button")) return;
            if (event?.target?.closest(".card-thumb-dropdowns")) return;
            this.openModel(data);
          });
        }
      }
    });
  }

  disposeCardView() {
    if (!this.cardViewInstance) return;
    this.cardViewInstance.dispose();
    this.cardViewInstance = null;
  }

  disposeVideosCardView() {
    if (!this.videosCardViewInstance) return;
    this.videosCardViewInstance.dispose();
    this.videosCardViewInstance = null;
  }

  disposeDataCardView() {
    if (!this.dataCardViewInstance) return;
    this.dataCardViewInstance.dispose();
    this.dataCardViewInstance = null;
  }

  disposeCharacterCardView() {
    if (!this.characterCardViewInstance) return;
    this.characterCardViewInstance.dispose();
    this.characterCardViewInstance = null;
  }

  ensureCharacterCardView() {
    if (this.characterCardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
    this.elements.cardView.innerHTML = "";
    this.characterCardViewInstance = new CardView(this.elements.cardView, {
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
      cardsPerRow: 4,
      cardMinWidth: 125,
      columns: [
        { dataField: "title", caption: this.translations.get("Title") },
        { dataField: "description", caption: this.translations.get("Description") }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement.get(0);
        const data = cardData.card.data;
        const assetUrl = data.thumbnail_url || "";
        const descriptionLabel = this.escapeHtml(data.description || "");
        const createdDate = this.formatShortDate(data.created_at);
        const currentUserId = this.userSdk.getUserId(this.state.session);
        const canEdit = this.canAccessMaintenance() || (currentUserId && data.created_by === currentUserId);
        const thumbContent = assetUrl
          ? `<img class="card-thumb character-card-thumb" src="${this.escapeHtml(assetUrl)}" alt="${this.escapeHtml(data.title || "")}">`
          : `<div class="media-thumb-placeholder character-thumb"><i class="fa-light fa-person-running media-thumb-icon" aria-hidden="true"></i></div>`;
        const cardMarkup = `
          <div class="card-tile" data-item-id="${this.escapeHtml(data.id || "")}">
            <div class="card-thumb-wrap">${thumbContent}</div>
            <div class="card-actions">
              ${canEdit ? `<button class="edit-button" aria-label="Edit character"><i class="fa-light fa-pen" aria-hidden="true"></i></button>` : ""}
              ${canEdit ? `<button class="delete-button" aria-label="Delete character"><i class="fa-light fa-trash-can trash" aria-hidden="true"></i><i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i></button>` : ""}
            </div>
            <div class="card-body">
              <h3 class="card-title">${this.escapeHtml(data.title) || "Untitled"}</h3>
              <p class="card-desc">${descriptionLabel}</p>
              <div class="card-meta">
                <div class="card-dates">
                  ${createdDate ? `<span class="card-date"><i class="fa-light fa-calendar-plus" aria-hidden="true"></i>${createdDate}</span>` : ""}
                </div>
              </div>
            </div>
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardDescElement = host.querySelector(".card-desc");
        const editButton = host.querySelector(".edit-button");
        const deleteButton = host.querySelector(".delete-button");
        if (cardDescElement && (data.title || data.description)) {
          $('<div>').appendTo('body').dxTooltip({
            target: cardDescElement,
            contentTemplate: contentElement => {
              contentElement.append($('<div class="card-desc-tooltip">').html(`<strong>${this.escapeHtml(data.title || "")}</strong>${data.description ? `<p>${this.escapeHtml(data.description)}</p>` : ""}`));
            },
            showEvent: { delay: 600, name: 'mouseenter' },
            hideEvent: 'mouseleave',
            position: 'bottom',
            maxWidth: 300
          });
        }
        if (editButton)
          editButton.addEventListener("click", event => {
            event.stopPropagation();
            this.showCharacterPopup(data);
          });
        if (deleteButton)
          deleteButton.addEventListener("click", event => {
            event.stopPropagation();
            this.deleteCharacterItem(data);
          });
      }
    });
  }

  ensureVideosCardView() {
    if (this.videosCardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
    this.elements.cardView.innerHTML = "";
    this.videosCardViewInstance = new CardView(this.elements.cardView, {
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
      cardsPerRow: 4,
      cardMinWidth: 125,
      columns: [
        { dataField: "title", caption: this.translations.get("Title") },
        { dataField: "description", caption: this.translations.get("Description") }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement.get(0);
        const data = cardData.card.data;
        const thumbnailUrl = data.thumbnail_url || "";
        const educationLookupId = data.education_level_id;
        const scienceLookupId = data.science_id;
        const educationLabel = this.educationLookupNameById.get(educationLookupId) || data.education_level || this.translations.get("Uncategorized");
        const scienceLabel = this.scienceLookupNameById.get(scienceLookupId) || data.science || this.translations.get("Uncategorized");
        const educationColor = this.educationLookupColorById.get(educationLookupId) || "#8b5cf6";
        const scienceColor = this.scienceLookupColorById.get(scienceLookupId) || "#0ea5e9";
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const descriptionLabel = this.escapeHtml(data.description || "");
        const createdDate = this.formatShortDate(data.created_at);
        const currentUserId = this.userSdk.getUserId(this.state.session);
        const canEdit = this.canAccessMaintenance() || (currentUserId && data.created_by === currentUserId);
        const taxonomyMarkup = `
          <div class="card-thumb-dropdowns">
            <div class="card-thumb-dropdown education-dropdown-host" data-lookup-id="${educationLookupId}">${escapedEducationLabel}</div>
            <div class="card-thumb-dropdown science-dropdown-host" data-lookup-id="${scienceLookupId}">${escapedScienceLabel}</div>
          </div>
        `;
        const thumbContent = thumbnailUrl
          ? `<img class="card-thumb" src="${this.escapeHtml(thumbnailUrl)}" alt="${this.escapeHtml(data.title || "")}">`
          : `<div class="media-thumb-placeholder video-thumb"><i class="fa-light fa-video media-thumb-icon" aria-hidden="true"></i></div>`;
        const cardMarkup = `
          <div class="card-tile" data-item-id="${this.escapeHtml(data.id || "")}">
            <div class="card-thumb-wrap">${thumbContent}${taxonomyMarkup}</div>
            <div class="card-actions">
              ${canEdit ? `<button class="edit-button" aria-label="Edit video"><i class="fa-light fa-pen" aria-hidden="true"></i></button>` : ""}
              ${canEdit ? `<button class="delete-button" aria-label="Delete video"><i class="fa-light fa-trash-can trash" aria-hidden="true"></i><i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i></button>` : ""}
            </div>
            <div class="card-body">
              <h3 class="card-title">${this.escapeHtml(data.title) || "Untitled"}</h3>
              <p class="card-desc">${descriptionLabel}</p>
              <div class="card-meta">
                <div class="card-dates">
                  ${createdDate ? `<span class="card-date"><i class="fa-light fa-calendar-plus" aria-hidden="true"></i>${createdDate}</span>` : ""}
                </div>
              </div>
            </div>
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardDescElement = host.querySelector(".card-desc");
        const editButton = host.querySelector(".edit-button");
        const deleteButton = host.querySelector(".delete-button");
        const educationDropdownHost = host.querySelector(".education-dropdown-host");
        const scienceDropdownHost = host.querySelector(".science-dropdown-host");
        if (educationDropdownHost) educationDropdownHost.style.setProperty("--pill-color", educationColor);
        if (scienceDropdownHost) scienceDropdownHost.style.setProperty("--pill-color", scienceColor);
        if (cardDescElement && (data.title || data.description)) {
          $('<div>').appendTo('body').dxTooltip({
            target: cardDescElement,
            contentTemplate: contentElement => {
              contentElement.append($('<div class="card-desc-tooltip">').html(`<strong>${this.escapeHtml(data.title || "")}</strong>${data.description ? `<p>${this.escapeHtml(data.description)}</p>` : ""}`) );
            },
            showEvent: { delay: 600, name: 'mouseenter' },
            hideEvent: 'mouseleave',
            position: 'bottom',
            maxWidth: 300
          });
        }
        if (editButton)
          editButton.addEventListener("click", event => {
            event.stopPropagation();
            this.showEditVideoPopup(data);
          });
        if (deleteButton)
          deleteButton.addEventListener("click", event => {
            event.stopPropagation();
            this.deleteVideoItem(data);
          });
        if (educationDropdownHost) {
          educationDropdownHost.addEventListener("mousedown", event => event.stopPropagation());
          educationDropdownHost.addEventListener("click", event => event.stopPropagation());
          educationDropdownHost.addEventListener("dblclick", event => event.stopPropagation());
          $(educationDropdownHost).dxDropDownButton({
            dataSource: new DevExpress.data.CustomStore({
              key: "id",
              load: () => this.apiClient.fetchEducationLevelLookups(),
              byKey: lookupId => this.apiClient.fetchEducationLevelLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: educationLookupId === undefined || educationLookupId === null || educationLookupId === "" ? null : educationLookupId,
            text: educationLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextEducationLookupId = event.itemData.id;
              if (nextEducationLookupId === data.education_level_id) return;
              try {
                await this.apiClient.patchVideo(data.id, { education_level_id: nextEducationLookupId });
                data.education_level_id = nextEducationLookupId;
                data.education_level = event.itemData.name || data.education_level;
                data.education_level_color = event.itemData.color || data.education_level_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error?.message || this.translations.get("Failed to update model metadata."), true);
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
              load: () => this.apiClient.fetchScienceLookups(),
              byKey: lookupId => this.apiClient.fetchScienceLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: scienceLookupId === undefined || scienceLookupId === null || scienceLookupId === "" ? null : scienceLookupId,
            text: scienceLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextScienceLookupId = event.itemData.id;
              if (nextScienceLookupId === data.science_id) return;
              try {
                await this.apiClient.patchVideo(data.id, { science_id: nextScienceLookupId });
                data.science_id = nextScienceLookupId;
                data.science = event.itemData.name || data.science;
                data.science_color = event.itemData.color || data.science_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error?.message || this.translations.get("Failed to update model metadata."), true);
              }
            }
          });
        }
      }
    });
  }

  ensureDataCardView() {
    if (this.dataCardViewInstance || !this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxCardView) return;
    const CardView = DevExpress.ui.dxCardView;
    this.elements.cardView.innerHTML = "";
    this.dataCardViewInstance = new CardView(this.elements.cardView, {
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
      cardsPerRow: 4,
      cardMinWidth: 125,
      columns: [
        { dataField: "title", caption: this.translations.get("Title") },
        { dataField: "description", caption: this.translations.get("Description") }
      ],
      cardTemplate: (cardData, cardElement) => {
        const host = cardElement.get(0);
        const data = cardData.card.data;
        const thumbnailUrl = data.thumbnail_url || "";
        const educationLookupId = data.education_level_id;
        const scienceLookupId = data.science_id;
        const educationLabel = this.educationLookupNameById.get(educationLookupId) || data.education_level || this.translations.get("Uncategorized");
        const scienceLabel = this.scienceLookupNameById.get(scienceLookupId) || data.science || this.translations.get("Uncategorized");
        const educationColor = this.educationLookupColorById.get(educationLookupId) || "#8b5cf6";
        const scienceColor = this.scienceLookupColorById.get(scienceLookupId) || "#0ea5e9";
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const descriptionLabel = this.escapeHtml(data.description || "");
        const createdDate = this.formatShortDate(data.created_at);
        const currentUserId = this.userSdk.getUserId(this.state.session);
        const canEdit = this.canAccessMaintenance() || (currentUserId && data.created_by === currentUserId);
        const taxonomyMarkup = `
          <div class="card-thumb-dropdowns">
            <div class="card-thumb-dropdown education-dropdown-host" data-lookup-id="${educationLookupId}">${escapedEducationLabel}</div>
            <div class="card-thumb-dropdown science-dropdown-host" data-lookup-id="${scienceLookupId}">${escapedScienceLabel}</div>
          </div>
        `;
        const thumbContent = thumbnailUrl
          ? `<img class="card-thumb" src="${this.escapeHtml(thumbnailUrl)}" alt="${this.escapeHtml(data.title || "")}">`
          : `<div class="media-thumb-placeholder data-thumb"><i class="fa-light fa-table media-thumb-icon" aria-hidden="true"></i></div>`;
        const cardMarkup = `
          <div class="card-tile" data-item-id="${this.escapeHtml(data.id || "")}">
            <div class="card-thumb-wrap">${thumbContent}${taxonomyMarkup}</div>
            <div class="card-actions">
              ${canEdit ? `<button class="edit-button" aria-label="Edit data set"><i class="fa-light fa-pen" aria-hidden="true"></i></button>` : ""}
              ${canEdit ? `<button class="delete-button" aria-label="Delete data set"><i class="fa-light fa-trash-can trash" aria-hidden="true"></i><i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i></button>` : ""}
            </div>
            <div class="card-body">
              <h3 class="card-title">${this.escapeHtml(data.title) || "Untitled"}</h3>
              <p class="card-desc">${descriptionLabel}</p>
              <div class="card-meta">
                <div class="card-dates">
                  ${createdDate ? `<span class="card-date"><i class="fa-light fa-calendar-plus" aria-hidden="true"></i>${createdDate}</span>` : ""}
                </div>
              </div>
            </div>
          </div>
        `;
        host.innerHTML = cardMarkup;
        const cardDescElement = host.querySelector(".card-desc");
        const editButton = host.querySelector(".edit-button");
        const deleteButton = host.querySelector(".delete-button");
        const educationDropdownHost = host.querySelector(".education-dropdown-host");
        const scienceDropdownHost = host.querySelector(".science-dropdown-host");
        if (educationDropdownHost) educationDropdownHost.style.setProperty("--pill-color", educationColor);
        if (scienceDropdownHost) scienceDropdownHost.style.setProperty("--pill-color", scienceColor);
        if (cardDescElement && (data.title || data.description)) {
          $('<div>').appendTo('body').dxTooltip({
            target: cardDescElement,
            contentTemplate: contentElement => {
              contentElement.append($('<div class="card-desc-tooltip">').html(`<strong>${this.escapeHtml(data.title || "")}</strong>${data.description ? `<p>${this.escapeHtml(data.description)}</p>` : ""}`) );
            },
            showEvent: { delay: 600, name: 'mouseenter' },
            hideEvent: 'mouseleave',
            position: 'bottom',
            maxWidth: 300
          });
        }
        if (editButton)
          editButton.addEventListener("click", event => {
            event.stopPropagation();
            this.showDataPopup(data);
          });
        if (deleteButton)
          deleteButton.addEventListener("click", event => {
            event.stopPropagation();
            this.deleteDataSetItem(data);
          });
        if (educationDropdownHost) {
          educationDropdownHost.addEventListener("mousedown", event => event.stopPropagation());
          educationDropdownHost.addEventListener("click", event => event.stopPropagation());
          educationDropdownHost.addEventListener("dblclick", event => event.stopPropagation());
          $(educationDropdownHost).dxDropDownButton({
            dataSource: new DevExpress.data.CustomStore({
              key: "id",
              load: () => this.apiClient.fetchEducationLevelLookups(),
              byKey: lookupId => this.apiClient.fetchEducationLevelLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: educationLookupId === undefined || educationLookupId === null || educationLookupId === "" ? null : educationLookupId,
            text: educationLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextEducationLookupId = event.itemData.id;
              if (nextEducationLookupId === data.education_level_id) return;
              try {
                await this.apiClient.patchDataSet(data.id, { education_level_id: nextEducationLookupId });
                data.education_level_id = nextEducationLookupId;
                data.education_level = event.itemData.name || data.education_level;
                data.education_level_color = event.itemData.color || data.education_level_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error?.message || this.translations.get("Failed to update model metadata."), true);
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
              load: () => this.apiClient.fetchScienceLookups(),
              byKey: lookupId => this.apiClient.fetchScienceLookupById(lookupId)
            }),
            keyExpr: "id",
            displayExpr: "name",
            itemTemplate: (itemData, itemIndex, itemElement) => this.renderLookupDropdownOption(itemData, itemElement),
            stylingMode: "contained",
            useSelectMode: true,
            selectedItemKey: scienceLookupId === undefined || scienceLookupId === null || scienceLookupId === "" ? null : scienceLookupId,
            text: scienceLabel,
            dropDownOptions: { minWidth: 170, maxWidth: 240 },
            onItemClick: async event => {
              const nextScienceLookupId = event.itemData.id;
              if (nextScienceLookupId === data.science_id) return;
              try {
                await this.apiClient.patchDataSet(data.id, { science_id: nextScienceLookupId });
                data.science_id = nextScienceLookupId;
                data.science = event.itemData.name || data.science;
                data.science_color = event.itemData.color || data.science_color;
                this.loadModels(this.state.selectedTreeNodeId);
              } catch (error) {
                this.setStatus(error?.message || this.translations.get("Failed to update model metadata."), true);
              }
            }
          });
        }
      }
    });
  }

  showVideosCardView() {
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    this.ensureVideosCardView();
  }

  showDataCardView() {
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeCharacterCardView();
    this.ensureDataCardView();
  }

  showCharacterCardView() {
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.ensureCharacterCardView();
  }

  renderVideos(items) {
    this.showVideosCardView();
    if (this.videosCardViewInstance) this.videosCardViewInstance.option("dataSource", items);
  }

  renderDataSets(items) {
    this.showDataCardView();
    if (this.dataCardViewInstance) this.dataCardViewInstance.option("dataSource", items);
  }

  renderCharacters(items) {
    this.showCharacterCardView();
    if (this.characterCardViewInstance) this.characterCardViewInstance.option("dataSource", items);
  }

  async deleteVideoItem(videoData) {
    const videoId = videoData && videoData.id;
    if (!videoId) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting video…");
    try {
      await this.apiClient.deleteVideo(videoId);
      this.setStatus("Video deleted.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete video.", true);
    }
  }

  async deleteDataSetItem(dataSetData) {
    const dataId = dataSetData && dataSetData.id;
    if (!dataId) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting data set…");
    try {
      await this.apiClient.deleteDataSet(dataId);
      this.setStatus("Data set deleted.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete data set.", true);
    }
  }

  async deleteCharacterItem(characterData) {
    const characterId = characterData && characterData.id;
    if (!characterId) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting character…");
    try {
      await this.apiClient.deleteCharacter(characterId);
      this.setStatus("Character deleted.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete character.", true);
    }
  }

  async showEditModelPopup(modelData) {
    if (!this._editModelPopup)
      this._editModelPopup = new ModelSavePopup({ translations: this.translations });
    const result = await this._editModelPopup.show({
      popupTitle: this.translations.get("Edit Model"),
      saveButtonText: this.translations.get("Save"),
      name: modelData.title || "",
      description: modelData.description || "",
      thumbnailUrl: modelData.thumbnail_url || "",
      seed: modelData.id
    });
    if (!result)
      return;
    try {
      await this.apiClient.patchModel(modelData.id, { title: result.name, description: result.description });
      if (result.thumbnailFile) {
        const thumbnailUrl = await this.apiClient.uploadModelAsset(modelData.id, "thumbnail-" + crypto.randomUUID(), result.thumbnailFile);
        await this.apiClient.patchModel(modelData.id, { thumbnail_url: thumbnailUrl });
      } else if (result.thumbnailCleared) {
        await this.apiClient.patchModel(modelData.id, { thumbnail_url: "" });
      }
      this.loadModels();
    } catch (error) {
      this.setStatus(error?.message || this.translations.get("Failed to update model metadata."), true);
    }
  }

  showEditVideoPopup(videoData) {
    let popupHost = document.getElementById("edit-video-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="edit-video-popup"></div>`);
      popupHost = document.getElementById("edit-video-popup");
    }
    this._editVideoThumbnailFile = null;
    const formData = { title: videoData.title || "", description: videoData.description || "" };
    const buildContent = contentElement => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      host.innerHTML = `<div id="edit-video-form"></div>`;
      const formHost = document.getElementById("edit-video-form");
      this._editVideoFormInstance = new DevExpress.ui.dxForm(formHost, {
        formData,
        colCount: 1,
        items: [
          {
            label: { text: "Thumbnail" },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              this._editVideoThumbnailControl = new ImageControl({
                dropHint: "Drop new thumbnail image here",
                imageSource: videoData.thumbnail_url || "",
                onUploadFile: file => {
                  this._editVideoThumbnailFile = file;
                  return Promise.resolve(URL.createObjectURL(file));
                },
                onImageCleared: () => { this._editVideoThumbnailFile = null; }
              });
              itemHost.appendChild(this._editVideoThumbnailControl.createHost().get(0));
            }
          },
          {
            dataField: "title",
            label: { text: "Title" },
            validationRules: [{ type: "required" }],
            editorOptions: { inputAttr: { style: "font-family: 'Atma', cursive; font-weight: 600;" } }
          },
          {
            label: { text: "Description" },
            template: async (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              itemHost.insertAdjacentHTML("beforeend", `
                <div id="edit-video-html-editor"></div>
                <div id="edit-video-html-toolbar" class="html-editor-toolbar"></div>
              `);
              const editorElement = document.getElementById("edit-video-html-editor");
              const toolbarElement = document.getElementById("edit-video-html-toolbar");
              this._editVideoHTMLEditor = new DevExpress.ui.dxHtmlEditor(editorElement, {
                value: formData.description ? await Utils.toHtml(formData.description) : "",
                valueType: "html",
                height: 260,
                toolbar: {
                  container: toolbarElement,
                  items: ["bold", "italic", "underline", "strike", "separator", "orderedList", "bulletList", "separator", "link", "separator", "undo", "redo"]
                }
              });
            }
          },
          {
            itemType: "button",
            horizontalAlignment: "right",
            buttonOptions: {
              text: "Save",
              type: "default",
              onClick: async () => {
                const result = this._editVideoFormInstance.validate();
                if (!result.isValid) return;
                const values = this._editVideoFormInstance.option("formData");
                const rawDescription = this._editVideoHTMLEditor ? this._editVideoHTMLEditor.option("value") : (values.description || "");
                const descriptionValue = rawDescription ? (await Utils.fromHtml(rawDescription)).trim() || null : null;
                this.setStatus("Saving video…");
                try {
                  await this.apiClient.patchVideo(videoData.id, { title: values.title, description: descriptionValue });
                  if (this._editVideoThumbnailFile)
                    await this.apiClient.uploadVideoThumbnail(videoData.id, this._editVideoThumbnailFile);
                  this.setStatus("Video saved.");
                  this.editVideoPopupInstance.hide();
                  this.loadModels();
                } catch (error) {
                  this.setStatus(error?.message || "Failed to save video.", true);
                }
              }
            }
          }
        ]
      });
    };
    if (this.editVideoPopupInstance) {
      buildContent(this.editVideoPopupInstance.content());
      this.editVideoPopupInstance.show();
      return;
    }
    this.editVideoPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: "Edit Video",
      width: 520,
      height: "auto",
      maxHeight: "90vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }

  showDataPopup(dataSetData = null) {
    let popupHost = document.getElementById("data-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="data-popup"></div>`);
      popupHost = document.getElementById("data-popup");
    }
    this._dataFile = null;
    this._dataThumbnailFile = null;
    const isEdit = dataSetData !== null;
    const formData = { title: dataSetData?.title || "", description: dataSetData?.description || "" };
    const buildContent = contentElement => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      host.innerHTML = `<div id="data-form"></div>`;
      const formHost = document.getElementById("data-form");
      this._editDataFormInstance = new DevExpress.ui.dxForm(formHost, {
        formData,
        colCount: 1,
        items: [
          {
            label: { text: "Thumbnail" },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              this._editDataThumbnailControl = new ImageControl({
                dropHint: "Drop thumbnail image here",
                imageSource: dataSetData?.thumbnail_url || "",
                onUploadFile: file => {
                  this._dataThumbnailFile = file;
                  return Promise.resolve(URL.createObjectURL(file));
                },
                onImageCleared: () => { this._dataThumbnailFile = null; }
              });
              itemHost.appendChild(this._editDataThumbnailControl.createHost().get(0));
            }
          },
          {
            dataField: "title",
            label: { text: "Title" },
            validationRules: [{ type: "required" }],
            editorOptions: { inputAttr: { style: "font-family: 'Atma', cursive; font-weight: 600;" } }
          },
          {
            label: { text: "Description" },
            template: async (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              itemHost.insertAdjacentHTML("beforeend", `
                <div id="edit-data-html-editor"></div>
                <div id="edit-data-html-toolbar" class="html-editor-toolbar"></div>
              `);
              const editorElement = document.getElementById("edit-data-html-editor");
              const toolbarElement = document.getElementById("edit-data-html-toolbar");
              this._editDataHTMLEditor = new DevExpress.ui.dxHtmlEditor(editorElement, {
                value: formData.description ? await Utils.toHtml(formData.description) : "",
                valueType: "html",
                height: 260,
                toolbar: {
                  container: toolbarElement,
                  items: ["bold", "italic", "underline", "strike", "separator", "orderedList", "bulletList", "separator", "link", "separator", "undo", "redo"]
                }
              });
            }
          },
          {
            label: { text: "Data File" },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              itemHost.innerHTML = `<div class="upload-file-uploader-host"></div>`;
              const uploaderHost = itemHost.querySelector(".upload-file-uploader-host");
              new DevExpress.ui.dxFileUploader(uploaderHost, {
                selectButtonText: isEdit ? "Replace data file" : "Select data file",
                labelText: "or drop file here (CSV, JSON, etc.)",
                multiple: false,
                uploadMode: "useForm",
                onValueChanged: event => {
                  this._dataFile = event.value?.[0] || null;
                }
              });
            }
          },
          {
            itemType: "button",
            horizontalAlignment: "right",
            buttonOptions: {
              text: isEdit ? "Save" : "Upload",
              type: "default",
              onClick: async () => {
                const result = this._editDataFormInstance.validate();
                if (!result.isValid) return;
                const values = this._editDataFormInstance.option("formData");
                const rawDescription = this._editDataHTMLEditor ? this._editDataHTMLEditor.option("value") : "";
                const descriptionValue = rawDescription ? (await Utils.fromHtml(rawDescription)).trim() || null : null;
                this.setStatus(isEdit ? "Saving data set…" : "Uploading data set…");
                try {
                  if (isEdit) {
                    await this.apiClient.patchDataSet(dataSetData.id, { title: values.title, description: descriptionValue });
                    if (this._dataFile)
                      await this.apiClient.createDataSet({ title: values.title, description: descriptionValue }, this._dataFile);
                    if (this._dataThumbnailFile)
                      await this.apiClient.uploadDataSetThumbnail(dataSetData.id, this._dataThumbnailFile);
                    this.setStatus("Data set saved.");
                  } else {
                    const created = await this.apiClient.createDataSet({ title: values.title, description: descriptionValue }, this._dataFile);
                    if (this._dataThumbnailFile && created?.id)
                      await this.apiClient.uploadDataSetThumbnail(created.id, this._dataThumbnailFile);
                    this.setStatus("Data set uploaded.");
                  }
                  this.dataPopupInstance.hide();
                  this.loadModels();
                } catch (error) {
                  this.setStatus(error?.message || "Failed to save data set.", true);
                }
              }
            }
          }
        ]
      });
    };
    const popupTitle = isEdit ? "Edit Data Set" : "Upload Data";
    if (this.dataPopupInstance) {
      this.dataPopupInstance.option("title", popupTitle);
      buildContent(this.dataPopupInstance.content());
      this.dataPopupInstance.show();
      return;
    }
    this.dataPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: popupTitle,
      width: 520,
      height: "auto",
      maxHeight: "90vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }

  showUploadVideoPopup() {
    let popupHost = document.getElementById("upload-video-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="upload-video-popup"></div>`);
      popupHost = document.getElementById("upload-video-popup");
    }
    this._uploadVideoFile = null;
    this._uploadVideoThumbnailFile = null;
    const formData = {};
    const buildContent = contentElement => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      host.innerHTML = `<div id="upload-video-form"></div>`;
      const formHost = document.getElementById("upload-video-form");
      this._uploadVideoFormInstance = new DevExpress.ui.dxForm(formHost, {
        formData,
        colCount: 1,
        items: [
          {
            dataField: "title",
            label: { text: "Title" },
            validationRules: [{ type: "required" }],
            editorOptions: { placeholder: "Video title" }
          },
          {
            dataField: "description",
            label: { text: "Description" },
            editorType: "dxTextArea",
            editorOptions: { height: 80, placeholder: "Optional description" }
          },
          {
            label: { text: "Video File" },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              itemHost.innerHTML = `<div class="upload-file-uploader-host"></div>`;
              const uploaderHost = itemHost.querySelector(".upload-file-uploader-host");
              new DevExpress.ui.dxFileUploader(uploaderHost, {
                selectButtonText: "Select video file",
                labelText: "or drop video here",
                multiple: false,
                uploadMode: "useForm",
                accept: "video/*",
                onValueChanged: event => {
                  this._uploadVideoFile = event.value?.[0] || null;
                }
              });
            }
          },
          {
            label: { text: "Thumbnail" },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              this._uploadVideoThumbnailControl = new ImageControl({
                dropHint: "Drop thumbnail image here",
                onUploadFile: file => {
                  this._uploadVideoThumbnailFile = file;
                  return Promise.resolve(URL.createObjectURL(file));
                },
                onImageCleared: () => { this._uploadVideoThumbnailFile = null; }
              });
              itemHost.appendChild(this._uploadVideoThumbnailControl.createHost().get(0));
            }
          },
          {
            itemType: "button",
            horizontalAlignment: "right",
            buttonOptions: {
              text: "Upload",
              icon: "fa-light fa-upload",
              type: "default",
              onClick: async () => {
                const result = this._uploadVideoFormInstance.validate();
                if (!result.isValid) return;
                const values = this._uploadVideoFormInstance.option("formData");
                this.setStatus("Uploading video…");
                try {
                  const created = await this.apiClient.createVideo({ title: values.title, description: values.description || "" }, this._uploadVideoFile);
                  if (this._uploadVideoThumbnailFile && created?.id)
                    await this.apiClient.uploadVideoThumbnail(created.id, this._uploadVideoThumbnailFile);
                  this.setStatus("Video uploaded.");
                  this.uploadVideoPopupInstance.hide();
                  this.loadModels();
                } catch (error) {
                  this.setStatus(error?.message || "Failed to upload video.", true);
                }
              }
            }
          }
        ]
      });
    };
    if (this.uploadVideoPopupInstance) {
      buildContent(this.uploadVideoPopupInstance.content());
      this.uploadVideoPopupInstance.show();
      return;
    }
    this.uploadVideoPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: "Upload Video",
      width: 480,
      height: "auto",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }

  async showCharacterPopup(characterData = null) {
    let popupHost = document.getElementById("character-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="character-popup"></div>`);
      popupHost = document.getElementById("character-popup");
    }
    this._charEditorCharacter = characterData ? Object.assign({}, characterData) : null;
    this._characterAssetFile = null;
    this._charEditorDescEditor = null;
    this._charEditorTitleInput = null;
    this._charEditorCategorySelector = null;
    this._charEditorHost = null;
    this._charEditorTabs = [];
    this._charEditorActiveTabIndex = 0;
    this._charEditorPivotXBox = null;
    this._charEditorPivotYBox = null;
    this._charEditorPivotDotElement = null;
    this._charEditorThumbnailContainerEl = null;
    this._charEditorShouldRotateValue = false;
    let characterCategories = [];
    try {
      characterCategories = await this.apiClient.fetchCharacterCategories();
    } catch (_) {}
    const buildContent = contentElement => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      this._charEditorHost = host;
      const hasCharacter = Boolean(this._charEditorCharacter);
      host.innerHTML = `
        <div class="char-editor-tab-strip" id="char-tab-strip"></div>
        <div id="char-general-content">
          <div class="char-editor-field-label">Thumbnail</div>
          <div id="char-thumbnail-control"></div>
          <div class="char-pivot-below-row">
            <div class="char-pivot-xy-row">
              <span class="char-pivot-coord-label">X</span>
              <div id="char-pivot-x-box"></div>
              <span class="char-pivot-coord-label">Y</span>
              <div id="char-pivot-y-box"></div>
            </div>
            <div class="char-rotate-toggle-row">
              <div id="char-rotate-switch"></div>
            </div>
          </div>
          <div class="char-editor-field-label" style="margin-top:0.75rem">Name</div>
          <div id="char-title-input"></div>
          <div class="char-editor-field-label" style="margin-top:0.75rem">Category</div>
          <div id="char-category-select"></div>
          <div class="char-editor-field-label" style="margin-top:0.75rem">Description</div>
          <div id="char-desc-editor"></div>
          <div class="char-editor-info-actions">
            <div id="char-save-info-btn"></div>
          </div>
        </div>
        <div id="char-anim-content" style="display:none"></div>
      `;
      this._charEditorRenderTabStrip([{ text: "General", tabType: "general" }], 0);
      this._charEditorTitleInput = new DevExpress.ui.dxTextBox(host.querySelector("#char-title-input"), {
        value: this._charEditorCharacter?.title || "",
        placeholder: "Character name"
      });
      this._charEditorCategorySelector = new DevExpress.ui.dxSelectBox(host.querySelector("#char-category-select"), {
        items: characterCategories,
        valueExpr: "id",
        displayExpr: "name",
        value: this._charEditorCharacter?.category_id || null,
        placeholder: "No category",
        showClearButton: true
      });
      this._charEditorDescEditor = new DevExpress.ui.dxTextArea(host.querySelector("#char-desc-editor"), {
        value: this._charEditorCharacter?.description || "",
        placeholder: "Optional description",
        height: 90
      });
      this._characterAssetFile = null;
      const thumbnailControl = new ImageControl({
        dropHint: "Drop thumbnail image here",
        imageSource: this._charEditorCharacter?.thumbnail_url || "",
        onUploadFile: file => {
          this._characterAssetFile = file;
          return Promise.resolve(URL.createObjectURL(file));
        },
        onImageCleared: () => { this._characterAssetFile = null; }
      });
      const thumbnailContainerEl = host.querySelector("#char-thumbnail-control");
      this._charEditorThumbnailContainerEl = thumbnailContainerEl;
      thumbnailContainerEl.appendChild(thumbnailControl.createHost().get(0));
      const pivotDotEl = document.createElement("div");
      pivotDotEl.id = "char-pivot-dot";
      pivotDotEl.className = "char-pivot-dot";
      thumbnailContainerEl.appendChild(pivotDotEl);
      this._charEditorPivotDotElement = pivotDotEl;
      const initialPivotX = this._charEditorCharacter?.pivot_x ?? 0.5;
      const initialPivotY = this._charEditorCharacter?.pivot_y ?? 0.5;
      const previewImg = thumbnailContainerEl.querySelector(".shape-image-dropzone__preview");
      if (previewImg)
        previewImg.addEventListener("load", () => this._charEditorPositionPivotDot(initialPivotX, initialPivotY), { once: true });
      this._charEditorPositionPivotDot(initialPivotX, initialPivotY);
      pivotDotEl.addEventListener("pointerdown", e => {
        e.stopPropagation();
        e.preventDefault();
        pivotDotEl.setPointerCapture(e.pointerId);
        const containerRect = thumbnailContainerEl.getBoundingClientRect();
        const localX = e.clientX - containerRect.left;
        const localY = e.clientY - containerRect.top;
        const bounds = this._charEditorGetImageRenderBounds();
        const pivotX = bounds ? (localX - bounds.left) / bounds.width : localX / containerRect.width;
        const pivotY = bounds ? (localY - bounds.top) / bounds.height : localY / containerRect.height;
        this._charEditorUpdatePivot(pivotX, pivotY);
      });
      pivotDotEl.addEventListener("pointermove", e => {
        if (!pivotDotEl.hasPointerCapture(e.pointerId))
          return;
        const containerRect = thumbnailContainerEl.getBoundingClientRect();
        const localX = e.clientX - containerRect.left;
        const localY = e.clientY - containerRect.top;
        const bounds = this._charEditorGetImageRenderBounds();
        const pivotX = bounds ? (localX - bounds.left) / bounds.width : localX / containerRect.width;
        const pivotY = bounds ? (localY - bounds.top) / bounds.height : localY / containerRect.height;
        this._charEditorUpdatePivot(pivotX, pivotY);
      });
      pivotDotEl.addEventListener("click", e => e.stopPropagation());
      this._charEditorPivotXBox = new DevExpress.ui.dxNumberBox(host.querySelector("#char-pivot-x-box"), {
        value: initialPivotX,
        min: 0,
        max: 1,
        step: 0.01,
        format: "0.##",
        onValueChanged: e => this._charEditorPositionPivotDot(e.value, this._charEditorPivotYBox?.option("value") ?? 0.5)
      });
      this._charEditorPivotYBox = new DevExpress.ui.dxNumberBox(host.querySelector("#char-pivot-y-box"), {
        value: initialPivotY,
        min: 0,
        max: 1,
        step: 0.01,
        format: "0.##",
        onValueChanged: e => this._charEditorPositionPivotDot(this._charEditorPivotXBox?.option("value") ?? 0.5, e.value)
      });
      this._charEditorShouldRotateValue = this._charEditorCharacter?.should_rotate ?? false;
      const rotateGroupEl = host.querySelector("#char-rotate-switch");
      const rotateButtonHtml = value => `<i class="char-rotate-btn-icon ${value ? "fa-light fa-rotate" : "fa-light fa-person"}"></i><span class="char-rotate-btn-label">${value ? "Rotates" : "No Rotation"}</span>`;
      new DevExpress.ui.dxButtonGroup(rotateGroupEl, {
        items: [{ key: "rotate" }],
        keyExpr: "key",
        selectedItemKeys: this._charEditorShouldRotateValue ? ["rotate"] : [],
        selectionMode: "multiple",
        stylingMode: "outlined",
        buttonTemplate: (data, btnContainer) => {
          btnContainer[0].innerHTML = rotateButtonHtml(this._charEditorShouldRotateValue);
        },
        onSelectionChanged: e => {
          this._charEditorShouldRotateValue = e.component.option("selectedItemKeys").length > 0;
          const btnContent = rotateGroupEl.querySelector(".dx-button-content");
          if (btnContent) {
            btnContent.innerHTML = rotateButtonHtml(this._charEditorShouldRotateValue);
            const iconEl = btnContent.querySelector(".char-rotate-btn-icon");
            if (iconEl) {
              iconEl.classList.remove("char-icon-animate");
              iconEl.offsetWidth;
              iconEl.classList.add("char-icon-animate");
            }
          }
        }
      });
      new DevExpress.ui.dxButton(host.querySelector("#char-save-info-btn"), {
        text: hasCharacter ? "Save" : "Create",
        type: "default",
        onClick: () => this._charEditorSaveInfo()
      });
      if (hasCharacter)
        this._charEditorRefreshAnimations();
    };
    const popupTitle = this._charEditorCharacter ? "Edit Character" : "Add Character";
    if (this.characterPopupInstance) {
      this.characterPopupInstance.option("title", popupTitle);
      buildContent(this.characterPopupInstance.content());
      this.characterPopupInstance.show();
      return;
    }
    this.characterPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: popupTitle,
      width: 680,
      height: "auto",
      maxHeight: "92vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      toolbarItems: [],
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }

  _charEditorRenderTabStrip(tabs, activeIndex) {
    const host = this._charEditorHost;
    if (!host) return;
    this._charEditorTabs = tabs;
    this._charEditorActiveTabIndex = activeIndex;
    const strip = host.querySelector("#char-tab-strip");
    if (!strip) return;
    const tabButtons = tabs.map((tab, index) =>
      `<button class="char-editor-tab-btn${index === activeIndex ? " active" : ""}" data-tab-index="${index}">${tab.text}</button>`
    ).join("");
    const addButton = this._charEditorCharacter
      ? `<button class="char-editor-tab-add-btn" title="Add Animation"><i class="fa-light fa-plus"></i></button>`
      : "";
    strip.innerHTML = tabButtons + addButton;
    strip.querySelectorAll(".char-editor-tab-btn").forEach(button => {
      button.addEventListener("click", () => this._charEditorSelectTab(Number(button.dataset.tabIndex)));
    });
    strip.querySelector(".char-editor-tab-add-btn")?.addEventListener("click", () => this._charEditorAddAnimation());
  }

  _charEditorSelectTab(tabIndex) {
    const host = this._charEditorHost;
    if (!host) return;
    const tabs = this._charEditorTabs;
    if (tabIndex < 0 || tabIndex >= tabs.length) return;
    this._charEditorActiveTabIndex = tabIndex;
    host.querySelectorAll(".char-editor-tab-btn").forEach((button, index) => {
      button.classList.toggle("active", index === tabIndex);
    });
    const generalContent = host.querySelector("#char-general-content");
    const animContent = host.querySelector("#char-anim-content");
    const tabItem = tabs[tabIndex];
    if (tabItem.tabType === "general") {
      generalContent.style.removeProperty("display");
      animContent.style.display = "none";
      return;
    }
    generalContent.style.display = "none";
    animContent.style.removeProperty("display");
    this._charEditorRenderAnimationTabContent(animContent, tabItem.anim);
  }

  async _charEditorSaveInfo() {
    const title = (this._charEditorTitleInput?.option("value") || "").trim();
    if (!title) {
      this.setStatus("Character name is required.", true);
      return;
    }
    const descriptionValue = this._charEditorDescEditor?.option("value") ?? null;
    const categoryId = this._charEditorCategorySelector?.option("value") ?? null;
    const pivotX = this._charEditorPivotXBox?.option("value") ?? null;
    const pivotY = this._charEditorPivotYBox?.option("value") ?? null;
    const shouldRotate = this._charEditorShouldRotateValue;
    this.setStatus(this._charEditorCharacter ? "Saving character…" : "Creating character…");
    try {
      if (this._charEditorCharacter) {
        await this.apiClient.patchCharacter(this._charEditorCharacter.id, { title, description: descriptionValue, category_id: categoryId, pivot_x: pivotX, pivot_y: pivotY, should_rotate: shouldRotate }, this._characterAssetFile || undefined);
        this.setStatus("Character saved.");
        this.characterPopupInstance?.hide();
        this.loadModels();
      } else {
        const created = await this.apiClient.createCharacter({ title, description: descriptionValue, category_id: categoryId, pivot_x: pivotX, pivot_y: pivotY, should_rotate: shouldRotate }, this._characterAssetFile);
        this.setStatus("Character created.");
        this.characterPopupInstance?.hide();
        this.loadModels();
      }
    } catch (error) {
      this.setStatus(error?.message || "Failed to save character.", true);
    }
  }

  _charEditorGetImageRenderBounds() {
    const containerEl = this._charEditorThumbnailContainerEl;
    if (!containerEl) return null;
    const img = containerEl.querySelector(".shape-image-dropzone__preview");
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const containerWidth = containerEl.clientWidth;
    const containerHeight = containerEl.clientHeight;
    if (!containerWidth || !containerHeight) return null;
    const naturalAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    let renderWidth, renderHeight;
    if (naturalAspect > containerAspect) {
      renderWidth = containerWidth;
      renderHeight = containerWidth / naturalAspect;
    } else {
      renderHeight = containerHeight;
      renderWidth = containerHeight * naturalAspect;
    }
    return {
      left: (containerWidth - renderWidth) / 2,
      top: (containerHeight - renderHeight) / 2,
      width: renderWidth,
      height: renderHeight
    };
  }

  _charEditorPositionPivotDot(x, y) {
    const dotEl = this._charEditorPivotDotElement;
    const containerEl = this._charEditorThumbnailContainerEl;
    if (!dotEl || !containerEl) return;
    const bounds = this._charEditorGetImageRenderBounds();
    if (!bounds) {
      dotEl.style.left = `${x * 100}%`;
      dotEl.style.top = `${y * 100}%`;
      return;
    }
    const containerWidth = containerEl.clientWidth;
    const containerHeight = containerEl.clientHeight;
    dotEl.style.left = `${(bounds.left + x * bounds.width) / containerWidth * 100}%`;
    dotEl.style.top = `${(bounds.top + y * bounds.height) / containerHeight * 100}%`;
  }

  _charEditorUpdatePivot(xRatio, yRatio) {
    const x = Math.min(1, Math.max(0, xRatio));
    const y = Math.min(1, Math.max(0, yRatio));
    this._charEditorPivotXBox?.option("value", x);
    this._charEditorPivotYBox?.option("value", y);
    this._charEditorPositionPivotDot(x, y);
  }

  async _charEditorRefreshAnimations(selectAnimId = null) {
    if (!this._charEditorCharacter) return;
    try {
      const definition = await this.apiClient.fetchCharacterDefinition(this._charEditorCharacter.id);
      const animations = definition.animations || [];
      const generalTab = { text: "General", tabType: "general" };
      const animTabs = animations.map(anim => ({ text: anim.name || "Untitled", tabType: "animation", anim }));
      const allTabs = [generalTab, ...animTabs];
      const targetIndex = selectAnimId
          ? allTabs.findIndex(tab => tab.anim?.id === selectAnimId)
          : null;
        const newIndex = targetIndex > 0 ? targetIndex : this._charEditorActiveTabIndex;
        this._charEditorRenderTabStrip(allTabs, newIndex);
        this._charEditorSelectTab(newIndex);
    } catch (_) {}
  }

  _charEditorRenderAnimationTabContent(contentHost, anim) {
    const escapedId = this.escapeHtml(anim.id);
    const framesHtml = (anim.frames || []).map(frame => this._charEditorFrameItemHtml(anim, frame)).join("");
    contentHost.innerHTML = `
      <div class="char-anim" data-anim-id="${escapedId}">
        <div class="char-anim-header">
          <input class="char-anim-name-input" value="${this.escapeHtml(anim.name || "")}" placeholder="Animation name">
          <input class="char-anim-order-input" type="number" min="0" value="${anim.sort_order ?? ""}" placeholder="Order" title="Sort order">
          <button class="char-anim-save-btn">Save</button>
          <button class="char-anim-del-btn" title="Delete animation"><i class="fa-light fa-trash-can" aria-hidden="true"></i></button>
        </div>
        <div class="char-anim-frames">
          ${framesHtml}
          <label class="char-frame-add" title="Add frames">
            <i class="fa-light fa-plus" aria-hidden="true"></i>
            <input class="char-frame-file-input" type="file" accept="image/*" multiple data-anim-id="${escapedId}">
          </label>
        </div>
      </div>
    `;
    const animItem = contentHost.querySelector(".char-anim");
    animItem.querySelector(".char-anim-save-btn").addEventListener("click", () => {
      const name = animItem.querySelector(".char-anim-name-input").value;
      const rawSortOrder = animItem.querySelector(".char-anim-order-input").value;
      this._charEditorSaveAnimation(anim.id, name, rawSortOrder !== "" ? parseInt(rawSortOrder) : null);
    });
    animItem.querySelector(".char-anim-del-btn").addEventListener("click", () => {
      this._charEditorDeleteAnimation(anim.id);
    });
    animItem.querySelector(".char-frame-file-input").addEventListener("change", event => {
      const files = Array.from(event.target.files);
      if (files.length)
        this._charEditorUploadFrames(anim.id, files);
      event.target.value = "";
    });
    animItem.querySelectorAll(".char-frame-del-btn").forEach(btn => {
      btn.addEventListener("click", event => {
        const frameItem = event.target.closest(".char-frame");
        this._charEditorDeleteFrame(anim.id, frameItem.dataset.frameId);
      });
    });
  }

  _charEditorFrameItemHtml(anim, frame) {
    const characterId = this._charEditorCharacter?.id || "";
    const imageUrl = frame.image_url || `${apiBase}/characters/${encodeURIComponent(characterId)}/animations/${encodeURIComponent(anim.id)}/frames/${encodeURIComponent(frame.id)}/image`;
    const frameIndex = frame.frame_index ?? "";
    return `
      <div class="char-frame" data-frame-id="${this.escapeHtml(frame.id)}">
        <img class="char-frame-img" src="${this.escapeHtml(imageUrl)}" alt="${frameIndex !== "" ? `Frame ${frameIndex}` : "Frame"}" loading="lazy">
        <button class="char-frame-del-btn" title="Delete frame"><i class="fa-light fa-xmark" aria-hidden="true"></i></button>
        ${frameIndex !== "" ? `<span class="char-frame-index">${frameIndex}</span>` : ""}
      </div>
    `;
  }

  async _charEditorAddAnimation() {
    if (!this._charEditorCharacter) return;
    this.setStatus("Creating animation…");
    try {
      const created = await this.apiClient.createCharacterAnimation(this._charEditorCharacter.id, { name: "New Animation", sort_order: 0 });
      await this._charEditorRefreshAnimations(created?.id || null);
      this.setStatus("");
    } catch (error) {
      this.setStatus(error?.message || "Failed to create animation.", true);
    }
  }

  async _charEditorSaveAnimation(animId, name, sortOrder) {
    if (!this._charEditorCharacter) return;
    this.setStatus("Saving animation…");
    try {
      await this.apiClient.updateCharacterAnimation(this._charEditorCharacter.id, animId, { name, sort_order: sortOrder });
      this.setStatus("Animation saved.");
    } catch (error) {
      this.setStatus(error?.message || "Failed to save animation.", true);
    }
  }

  async _charEditorDeleteAnimation(animId) {
    if (!this._charEditorCharacter) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting animation…");
    try {
      await this.apiClient.deleteCharacterAnimation(this._charEditorCharacter.id, animId);
      await this._charEditorRefreshAnimations();
      this.setStatus("");
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete animation.", true);
    }
  }

  async _charEditorUploadFrames(animId, files) {
    if (!this._charEditorCharacter) return;
    this.setStatus(`Uploading ${files.length} frame${files.length !== 1 ? "s" : ""}…`);
    try {
      for (let fileIndex = 0; fileIndex < files.length; fileIndex++)
        await this.apiClient.uploadCharacterAnimationFrame(this._charEditorCharacter.id, animId, files[fileIndex]);
      await this._charEditorRefreshAnimations();
      this.setStatus("Frames uploaded.");
    } catch (error) {
      this.setStatus(error?.message || "Failed to upload frames.", true);
    }
  }

  async _charEditorDeleteFrame(animId, frameId) {
    if (!this._charEditorCharacter) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus("Deleting frame…");
    try {
      await this.apiClient.deleteCharacterAnimationFrame(this._charEditorCharacter.id, animId, frameId);
      await this._charEditorRefreshAnimations();
      this.setStatus("");
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete frame.", true);
    }
  }

  disposeMaintenanceGrid() {
    if (!this.maintenanceGridInstance) return;
    this.maintenanceGridInstance.dispose();
    this.maintenanceGridInstance = null;
  }

  exportGridToExcel(event, fileName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(fileName);
    DevExpress.excelExporter.exportDataGrid({ component: event.component, worksheet }).then(() => {
      workbook.xlsx.writeBuffer().then(buffer => {
        saveAs(new Blob([buffer], { type: "application/octet-stream" }), `${fileName}.xlsx`);
      });
    });
  }

  buildMaintenanceStore(maintenanceType) {
    if (maintenanceType === "education") {
      return new DevExpress.data.CustomStore({
        key: "id",
        load: () => this.apiClient.fetchEducationLevelLookups(),
        byKey: lookupId => this.apiClient.fetchEducationLevelLookupById(lookupId),
        insert: values => this.apiClient.createEducationLevelLookup(values),
        update: (lookupId, values) => this.apiClient.updateEducationLevelLookup(lookupId, values),
        remove: lookupId => this.apiClient.deleteEducationLevelLookup(lookupId)
      });
    }
    return new DevExpress.data.CustomStore({
      key: "id",
      load: () => this.apiClient.fetchScienceLookups(),
      byKey: lookupId => this.apiClient.fetchScienceLookupById(lookupId),
      insert: values => this.apiClient.createScienceLookup(values),
      update: (lookupId, values) => this.apiClient.updateScienceLookup(lookupId, values),
      remove: lookupId => this.apiClient.deleteScienceLookup(lookupId)
    });
  }

  getFontAwesomeIconLabel(iconClass) {
    for (let iconIndex = 0; iconIndex < fontAwesomeIcons.length; iconIndex++) {
      const iconOption = fontAwesomeIcons[iconIndex];
      if (iconOption.value === iconClass)
        return iconOption.label;
    }
    return "";
  }

  renderFontAwesomeIconCell(cellElement, iconClass) {
    const host = cellElement.get(0);
    const iconLabel = this.getFontAwesomeIconLabel(iconClass);
    const iconMarkup = iconClass ? `<i class="${iconClass}" aria-hidden="true"></i>` : "";
    host.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:0.5rem">
        ${iconMarkup}
        <span>${iconLabel}</span>
      </span>
    `;
  }

  renderFontAwesomeIconOption(itemData, itemElement) {
    const host = itemElement.get(0);
    const iconMarkup = itemData.value ? `<i class="${itemData.value}" aria-hidden="true"></i>` : "";
    host.innerHTML = `
      <span style="display:flex;align-items:center;gap:0.5rem;padding:0.1rem 0">
        ${iconMarkup}
        <span>${itemData.label}</span>
      </span>
    `;
  }

  renderFontAwesomeIconEditor(cellElement, cellInfo) {
    const host = cellElement.get(0);
    host.innerHTML = `<div class="icon-editor-host"></div>`;
    const editorHost = host.querySelector(".icon-editor-host");
    $(editorHost).dxSelectBox({
      dataSource: fontAwesomeIcons,
      valueExpr: "value",
      displayExpr: "label",
      value: cellInfo.value,
      searchEnabled: true,
      searchExpr: ["label", "value"],
      showClearButton: false,
      itemTemplate: (itemData, itemIndex, itemElement) => this.renderFontAwesomeIconOption(itemData, itemElement),
      onValueChanged: event => cellInfo.setValue(event.value),
      dropDownOptions: { minWidth: 280, maxWidth: 360 }
    });
  }

  async deleteSelectedMaintenanceRows() {
    if (!this.maintenanceGridInstance) return;
    const selectedRowKeys = this.maintenanceGridInstance.getSelectedRowKeys();
    if (!selectedRowKeys.length) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    const dataSource = this.maintenanceGridInstance.getDataSource();
    const store = dataSource.store();
    this.setStatus(this.translations.get("Deleting selected items…"));
    try {
      for (let selectedRowIndex = 0; selectedRowIndex < selectedRowKeys.length; selectedRowIndex++) {
        await store.remove(selectedRowKeys[selectedRowIndex]);
      }
      await dataSource.reload();
      this.maintenanceGridInstance.clearSelection();
      this.setStatus(this.translations.get("Selected items deleted."));
    } catch (error) {
      this.setStatus(error?.message || this.translations.get("Failed to delete selected items."), true);
    }
  }

  showMaintenanceGrid(maintenanceType) {
    if (!this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxDataGrid) return;
    this.disposeCardView();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const maintenanceStore = this.buildMaintenanceStore(maintenanceType);
    if (!this.maintenanceGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.maintenanceGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: maintenanceStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        columnAutoWidth: true,
        selection: { mode: "multiple", showCheckBoxesMode: "always" },
        paging: { enabled: true, pageSize: 12 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [12, 24, 48], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, maintenanceType === "education" ? this.translations.get("Education Levels") : this.translations.get("Sciences")),
        editing: {
          mode: "cell",
          allowAdding: true,
          allowUpdating: true,
          allowDeleting: false
        },
        toolbar: {
          items: [
            "addRowButton",
            "exportButton",
            "searchPanel",
            {
              location: "after",
              locateInMenu: "always",
              widget: "dxButton",
              options: {
                text: this.translations.get("Delete selected"),
                type: "danger",
                stylingMode: "contained",
                icon: "fa-light fa-trash-can",
                onClick: () => this.deleteSelectedMaintenanceRows()
              }
            }
          ]
        },
        columns: [
          { dataField: "id", caption: "ID", allowEditing: false, width: 110 },
          { dataField: "name", caption: this.translations.get("Name"), validationRules: [{ type: "required" }] },
          {
            dataField: "icon",
            caption: this.translations.get("Icon"),
            cellTemplate: (cellElement, cellInfo) => this.renderFontAwesomeIconCell(cellElement, cellInfo.value),
            editCellTemplate: (cellElement, cellInfo) => this.renderFontAwesomeIconEditor(cellElement, cellInfo)
          },
          { dataField: "color", caption: this.translations.get("Color") }
        ]
      });
      return;
    }
    this.maintenanceGridInstance.option("dataSource", maintenanceStore);
    this.maintenanceGridInstance.refresh();
  }

  showModelsCardView() {
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    this.ensureCardView();
  }

  disposeMaintenanceModelsGrid() {
    if (!this.maintenanceModelsGridInstance) return;
    this.maintenanceModelsGridInstance.dispose();
    this.maintenanceModelsGridInstance = null;
  }

  disposeSystemTemplatesGrid() {
    if (!this.systemTemplatesGridInstance) return;
    this.systemTemplatesGridInstance.dispose();
    this.systemTemplatesGridInstance = null;
  }

  async showSystemTemplatesGrid() {
    if (!this.elements.cardView) return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const systemTemplatesStore = new DevExpress.data.CustomStore({
      key: "id",
      load: async () => {
        const models = await this.apiClient.fetchSystemTemplateModels();
        return this.applyModelLookupLabels(models);
      }
    });
    if (!this.systemTemplatesGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.systemTemplatesGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: systemTemplatesStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        scrolling: { mode: "standard", useNative: true, columnRenderingMode: "standard" },
        columnAutoWidth: false,
        allowColumnResizing: true,
        columnResizingMode: "widget",
        columnMinWidth: 50,
        selection: { mode: "single" },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        sorting: { mode: "multiple" },
        filterRow: { visible: true },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("System Templates")),
        columns: [
          { dataField: "id", caption: "ID", visible: false },
          {
            dataField: "thumbnail_url",
            caption: "",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              const src = cellInfo.value || "";
              if (!src) return;
              const host = cellElement.get(0);
              host.innerHTML = `<img src="${src}" style="width:40px;height:24px;object-fit:cover;border-radius:4px;">`;
            }
          },
          { dataField: "title", caption: this.translations.get("Title") },
          {
            dataField: "creator_name",
            caption: this.translations.get("Creator"),
            width: 160,
            cellTemplate: (cellElement, cellInfo) => {
              const name = this.escapeHtml(cellInfo.data.creator_name || "");
              const avatar = cellInfo.data.creator_avatar || "";
              const host = cellElement.get(0);
              host.innerHTML = `<div style="display:flex;align-items:center;gap:6px;overflow:hidden">
                ${avatar ? `<img src="${avatar}" alt="" style="width:20px;height:20px;border-radius:50%;flex-shrink:0">` : ""}
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
              </div>`;
            }
          },
          { dataField: "education_level", caption: this.translations.get("Level"), width: 130 },
          { dataField: "science", caption: this.translations.get("Science"), width: 130 },
          { dataField: "createdAt", caption: this.translations.get("Created"), width: 130, dataType: "date" },
          { dataField: "lastModified", caption: this.translations.get("Modified"), width: 130, dataType: "date" },
          {
            caption: "",
            width: 50,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              const host = cellElement.get(0);
              host.innerHTML = `<button class="maintenance-delete-btn" title="${this.translations.get("Remove from system templates")}" style="border:none;background:none;cursor:pointer;padding:4px;"><i class="fa-solid fa-layer-group mdl-grid-icon" style="color:#9333ea;"></i></button>`;
              host.querySelector(".maintenance-delete-btn").addEventListener("click", async event => {
                event.stopPropagation();
                try {
                  await this.apiClient.patchModelSystemTemplate(cellInfo.data.id, false);
                  this.systemTemplatesGridInstance.refresh();
                } catch (error) {
                  this.setStatus(error?.message || this.translations.get("Failed to update system template."), true);
                }
              });
            }
          }
        ]
      });
      return;
    }
    this.systemTemplatesGridInstance.option("dataSource", systemTemplatesStore);
    this.systemTemplatesGridInstance.refresh();
  }

  async showMaintenanceModelsGrid() {
    if (!this.elements.cardView) return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const allModelsStore = new DevExpress.data.CustomStore({
      key: "id",
      load: async () => {
        const models = await this.apiClient.fetchAllModels();
        return this.applyModelLookupLabels(models);
      }
    });
    if (!this.maintenanceModelsGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.maintenanceModelsGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: allModelsStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        scrolling: { mode: "standard", useNative: true, columnRenderingMode: "standard" },
        columnAutoWidth: false,
        allowColumnResizing: true,
        columnResizingMode: "widget",
        columnMinWidth: 50,
        selection: { mode: "single" },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        sorting: { mode: "multiple" },
        filterRow: { visible: true },
        columnChooser: { enabled: true, mode: "select" },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("Models")),
        columns: [
          { dataField: "id", caption: "ID", visible: false },
          {
            dataField: "thumbnail_url",
            caption: "",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              const src = cellInfo.value || "";
              if (!src)
                return;
              const host = cellElement.get(0);
              host.style.position = "relative";
              host.innerHTML = `<img src="${src}" style="width:40px;height:24px;object-fit:cover;border-radius:4px;cursor:pointer;"><div class="maintenance-thumb-tooltip" style="display:none;position:fixed;z-index:10000;pointer-events:none;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);background:#fff;padding:4px;"><img src="${src}" style="max-width:280px;max-height:200px;object-fit:contain;border-radius:6px;display:block;"></div>`;
              const img = host.querySelector("img");
              const tooltip = host.querySelector(".maintenance-thumb-tooltip");
              img.addEventListener("mouseenter", event => {
                tooltip.style.display = "block";
                tooltip.style.left = `${event.clientX + 12}px`;
                tooltip.style.top = `${event.clientY + 12}px`;
              });
              img.addEventListener("mousemove", event => {
                tooltip.style.left = `${event.clientX + 12}px`;
                tooltip.style.top = `${event.clientY + 12}px`;
              });
              img.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
              });
            }
          },
          { dataField: "title", caption: this.translations.get("Title") },
          {
            dataField: "description",
            caption: this.translations.get("Description"),
            width: 220,
            cellTemplate: (cellElement, cellInfo) => {
              const plainText = this.getModelDescriptionText(cellInfo.value);
              const host = cellElement.get(0);
              host.innerHTML = `<span style="display:block;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:default" title="${this.escapeHtml(plainText)}">${this.escapeHtml(plainText)}</span>`;
            }
          },
          {
            dataField: "creator_name",
            caption: this.translations.get("Creator"),
            width: 160,
            cellTemplate: (cellElement, cellInfo) => {
              const name = this.escapeHtml(cellInfo.data.creator_name || "");
              const avatar = cellInfo.data.creator_avatar || "";
              const host = cellElement.get(0);
              host.innerHTML = `<div style="display:flex;align-items:center;gap:6px;overflow:hidden">
                ${avatar ? `<img src="${avatar}" alt="" style="width:20px;height:20px;border-radius:50%;flex-shrink:0">` : ""}
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
              </div>`;
            }
          },
          { dataField: "education_level", caption: this.translations.get("Level"), width: 130 },
          { dataField: "science", caption: this.translations.get("Science"), width: 130 },
          {
            caption: this.translations.get("Fav"),
            width: 50,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isFavorite = this.isFavoriteValue(cellInfo.data);
              const host = cellElement.get(0);
              host.innerHTML = `<i class="${isFavorite ? "fa-solid fa-star" : "fa-regular fa-star"} mdl-grid-icon" style="color:${isFavorite ? "#f59e0b" : "#9ca3af"};cursor:pointer;"></i>`;
              host.querySelector("i").addEventListener("click", event => {
                event.stopPropagation();
                this.toggleFavorite(cellInfo.data, !isFavorite).then(() => {
                  if (this.maintenanceModelsGridInstance)
                    this.maintenanceModelsGridInstance.refresh();
                });
              });
            }
          },
          {
            caption: this.translations.get("Library column"),
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isPicked = this.isPickedValue(cellInfo.data);
              cellElement.get(0).innerHTML = `<i class="${isPicked ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"} mdl-grid-icon" style="color:${isPicked ? "#dc2626" : "#9ca3af"};"></i>`;
            }
          },
          {
            dataField: "is_public",
            caption: this.translations.get("Public"),
            width: 70,
            allowFiltering: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isPublic = cellInfo.data.is_public === true || cellInfo.data.is_public === 1;
              const host = cellElement.get(0);
              host.innerHTML = `<i class="${isPublic ? "fa-light fa-lock-open" : "fa-light fa-lock"} mdl-grid-icon" style="color:${isPublic ? "#16a34a" : "#9ca3af"};cursor:pointer;"></i>`;
              host.querySelector("i").addEventListener("click", event => {
                event.stopPropagation();
                this.toggleVisibility(cellInfo.data).then(() => {
                  if (this.maintenanceModelsGridInstance)
                    this.maintenanceModelsGridInstance.refresh();
                });
              });
            }
          },
          {
            dataField: "is_system_template",
            caption: this.translations.get("Template"),
            width: 80,
            allowFiltering: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isSystemTemplate = cellInfo.data.is_system_template === true || cellInfo.data.is_system_template === 1;
              const host = cellElement.get(0);
              host.innerHTML = `<i class="${isSystemTemplate ? "fa-solid fa-layer-group" : "fa-light fa-layer-group"} mdl-grid-icon" style="color:${isSystemTemplate ? "#9333ea" : "#9ca3af"};cursor:pointer;" title="${isSystemTemplate ? this.translations.get("Remove from system templates") : this.translations.get("Set as system template")}"></i>`;
              host.querySelector("i").addEventListener("click", async event => {
                event.stopPropagation();
                try {
                  await this.apiClient.patchModelSystemTemplate(cellInfo.data.id, !isSystemTemplate);
                  if (this.maintenanceModelsGridInstance)
                    this.maintenanceModelsGridInstance.refresh();
                } catch (error) {
                  this.setStatus(error?.message || this.translations.get("Failed to update system template."), true);
                }
              });
            }
          },
          { dataField: "createdAt", caption: this.translations.get("Created"), width: 130, dataType: "date" },
          { dataField: "lastModified", caption: this.translations.get("Modified"), width: 130, dataType: "date" },
          {
            caption: "",
            width: 40,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              cellElement.get(0).innerHTML = `<button class="maintenance-delete-btn" style="border:none;background:none;cursor:pointer;padding:4px;"><i class="fa-light fa-trash-can mdl-grid-icon" style="color:red;"></i></button>`;
              cellElement.get(0).querySelector(".maintenance-delete-btn").addEventListener("click", event => {
                event.stopPropagation();
                this.deleteModel(cellInfo.data);
              });
            }
          }
        ],
        onRowClick: event => this.openModel(event.data),
        onContextMenuPreparing: event => {
          if (event.row?.rowType !== "data")
            return;
          const model = event.row.data;
          const modelUrl = new URL("/editor.html", window.location.origin);
          modelUrl.searchParams.set("model_id", model.id);
          const link = modelUrl.toString();
          event.items = [
            {
              text: this.translations.get("Open"),
              icon: "fa-light fa-arrow-up-right-from-square",
              onItemClick: () => this.openModel(model)
            },
            {
              text: this.translations.get("Open in new tab"),
              icon: "fa-light fa-up-right-from-square",
              onItemClick: () => window.open(link, "_blank")
            },
            {
              text: this.translations.get("Copy link"),
              icon: "fa-light fa-link",
              onItemClick: () => navigator.clipboard.writeText(link)
            }
          ];
        }
      });
      return;
    }
    this.maintenanceModelsGridInstance.option("dataSource", allModelsStore);
    this.maintenanceModelsGridInstance.refresh();
  }

  disposeUsersGrid() {
    if (!this.usersGridInstance)
      return;
    this.usersGridInstance.dispose();
    this.usersGridInstance = null;
  }

  async showUsersGrid() {
    if (!this.elements.cardView)
      return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const usersStore = new DevExpress.data.CustomStore({
      key: "id",
      load: () => this.apiClient.fetchUsers(),
      byKey: userId => this.apiClient.fetchUserById(userId)
    });
    if (!this.usersGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.usersGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: usersStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        columnAutoWidth: true,
        selection: { mode: "single" },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        sorting: { mode: "multiple" },
        filterRow: { visible: true },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("Users")),
        columns: [
          { dataField: "id", caption: "ID", visible: false },
          {
            dataField: "avatar",
            caption: "",
            width: 40,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              const avatar = cellInfo.value || "";
              cellElement.get(0).innerHTML = avatar
                ? `<img src="${this.escapeHtml(avatar)}" alt="" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid var(--c-border)">`
                : `<i class="fa-light fa-user-circle mdl-user-avatar-icon"></i>`;
            }
          },
          { dataField: "name", caption: this.translations.get("Name") },
          { dataField: "email", caption: this.translations.get("Email") },
          {
            dataField: "role",
            caption: this.translations.get("Role"),
            width: 100,
            cellTemplate: (cellElement, cellInfo) => {
              const role = cellInfo.value;
              if (!role) return;
              const isTeacher = role === "teacher";
              const icon = isTeacher ? "fa-light fa-chalkboard-user" : "fa-light fa-user-graduate";
              const label = isTeacher ? this.translations.get("Teacher") : this.translations.get("Student");
              cellElement.get(0).innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.35rem"><i class="${icon} mdl-grid-icon"></i>${label}</span>`;
            }
          },
          {
            dataField: "country",
            caption: this.translations.get("Country"),
            width: 160,
            cellTemplate: (cellElement, cellInfo) => {
              const code = cellInfo.value;
              if (!code) return;
              const countryItem = countryItems.find(item => item.value === code);
              const displayText = countryItem ? countryItem.text : code;
              cellElement.get(0).innerHTML = `<span>${displayText}</span>`;
            }
          },
          { dataField: "lastLogin", caption: this.translations.get("Last Login"), width: 160, dataType: "date" },
          { dataField: "createdAt", caption: this.translations.get("Created"), width: 160, dataType: "date" }
        ],
        onRowClick: event => this.showUserFeaturesPopup(event.data)
      });
      return;
    }
    this.usersGridInstance.option("dataSource", usersStore);
    this.usersGridInstance.refresh();
  }

  async showUserFeaturesPopup(user) {
    let popupHost = document.getElementById("user-features-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="user-features-popup"></div>`);
      popupHost = document.getElementById("user-features-popup");
    }
    const userName = user.name || user.email || user.id;
    const buildContent = async (contentElement) => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      host.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:2rem"><i class="fa-light fa-spinner fa-spin mdl-loading-spinner"></i></div>`;
      const allFlags = await this.apiClient.fetchUserFeatureFlags(user.id);
      const enabledFlags = allFlags.filter(flag => flag.is_enabled === 1 || flag.is_enabled === true);
      const disabledFlags = allFlags.filter(flag => flag.is_enabled !== 1 && flag.is_enabled !== true);
      host.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:1rem;padding:0.5rem">
          <div id="user-features-list"></div>
          <div style="display:flex;gap:0.5rem;align-items:flex-end">
            <div id="user-feature-input" style="flex:1"></div>
            <div id="user-feature-add-button"></div>
          </div>
        </div>
      `;
      const listHost = host.querySelector("#user-features-list");
      const inputHost = host.querySelector("#user-feature-input");
      const addButtonHost = host.querySelector("#user-feature-add-button");
      const featureListInstance = new DevExpress.ui.dxList(listHost, {
        dataSource: enabledFlags,
        keyExpr: "key",
        displayExpr: "key",
        noDataText: this.translations.get("No features assigned"),
        itemTemplate: (itemData, itemIndex, itemElement) => {
          const itemHost = itemElement.get(0);
          itemHost.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;gap:0.5rem">
              <span style="display:flex;align-items:center;gap:0.5rem">
                <i class="fa-light fa-key mdl-grid-icon" style="color:#6b7280"></i>
                <span>${this.escapeHtml(itemData.key)}</span>
              </span>
              <span class="remove-feature-btn" style="cursor:pointer;padding:2px 6px;border-radius:4px;color:#dc2626">
                <i class="fa-light fa-trash-can"></i>
              </span>
            </div>
          `;
          itemHost.querySelector(".remove-feature-btn").addEventListener("click", async (event) => {
            event.stopPropagation();
            await this.apiClient.removeUserFeatureFlag(user.id, itemData.key);
            const updatedFlags = await this.apiClient.fetchUserFeatureFlags(user.id);
            featureListInstance.option("dataSource", updatedFlags.filter(flag => flag.is_enabled === 1 || flag.is_enabled === true));
            selectBoxInstance.option("dataSource", updatedFlags.filter(flag => flag.is_enabled !== 1 && flag.is_enabled !== true));
          });
        }
      });
      const selectBoxInstance = new DevExpress.ui.dxSelectBox(inputHost, {
        dataSource: disabledFlags,
        valueExpr: "key",
        displayExpr: "key",
        placeholder: this.translations.get("Select feature flag"),
        searchEnabled: true,
        showClearButton: true
      });
      new DevExpress.ui.dxButton(addButtonHost, {
        text: this.translations.get("Add"),
        icon: "fa-light fa-plus",
        type: "default",
        stylingMode: "contained",
        onClick: async () => {
          const featureKey = selectBoxInstance.option("value");
          if (!featureKey)
            return;
          await this.apiClient.addUserFeatureFlag(user.id, featureKey);
          selectBoxInstance.option("value", null);
          const updatedFlags = await this.apiClient.fetchUserFeatureFlags(user.id);
          featureListInstance.option("dataSource", updatedFlags.filter(flag => flag.is_enabled === 1 || flag.is_enabled === true));
          selectBoxInstance.option("dataSource", updatedFlags.filter(flag => flag.is_enabled !== 1 && flag.is_enabled !== true));
        }
      });
    };
    if (this.userFeaturesPopupInstance) {
      this.userFeaturesPopupInstance.option("title", `${this.translations.get("Features")} — ${userName}`);
      this.userFeaturesPopupInstance.option("contentTemplate", contentElement => buildContent(contentElement));
      this.userFeaturesPopupInstance.repaint();
      this.userFeaturesPopupInstance.show();
      return;
    }
    this.userFeaturesPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: `${this.translations.get("Features")} — ${userName}`,
      width: 480,
      height: "auto",
      maxHeight: "70vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }

  getMaintenanceTypeByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.maintenanceEducation) return "education";
    if (nodeId === treeNodeIds.maintenanceSciences) return "sciences";
    return "";
  }

  renderCurrentTreeNode() {
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceModels) {
      this.showMaintenanceModelsGrid();
      this.setStatus("");
      return;
    }
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceSystemTemplates) {
      this.showSystemTemplatesGrid();
      this.setStatus("");
      return;
    }
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceNotifications) {
      this.showNotificationsGrid();
      this.setStatus("");
      return;
    }
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceWhatsNew) {
      this.showWhatsNewGrid();
      this.setStatus("");
      return;
    }
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceCharacterCategories) {
      this.showCharacterCategoriesGrid();
      this.setStatus("");
      return;
    }
    if (this.state.selectedTreeNodeId === treeNodeIds.maintenanceUsers) {
      this.showUsersGrid();
      this.setStatus("");
      return;
    }
    const maintenanceType = this.getMaintenanceTypeByTreeNodeId(this.state.selectedTreeNodeId);
    if (maintenanceType) {
      this.showMaintenanceGrid(maintenanceType);
      this.setStatus("");
      return;
    }
    if (this.isVideoNodeId(this.state.selectedTreeNodeId)) {
      const videos = this.getVideosByTreeNodeId(this.state.selectedTreeNodeId);
      this.renderVideos(videos);
      this.setStatus(videos.length ? "" : this.translations.get("No models found."));
      return;
    }
    if (this.isDataNodeId(this.state.selectedTreeNodeId)) {
      const dataSets = this.getDataSetsByTreeNodeId(this.state.selectedTreeNodeId);
      this.renderDataSets(dataSets);
      this.setStatus(dataSets.length ? "" : this.translations.get("No models found."));
      return;
    }
    if (this.isCharacterNodeId(this.state.selectedTreeNodeId)) {
      const characters = this.getCharactersByTreeNodeId(this.state.selectedTreeNodeId);
      this.renderCharacters(characters);
      this.setStatus(characters.length ? "" : this.translations.get("No models found."));
      return;
    }
    const models = this.getModelsByTreeNodeId(this.state.selectedTreeNodeId);
    this.renderModels(models);
    this.setStatus(models.length ? "" : this.translations.get("No models found."));
  }

  renderModels(items) {
    this.showModelsCardView();
    if (this.cardViewInstance) this.cardViewInstance.option("dataSource", items);
  }

  async checkProfileComplete() {
    const userId = this.userSdk.getUserId(this.state.session);
    let user;
    try {
      user = await this.apiClient.fetchUserById(userId);
    } catch (_) {
      user = this.state.user || {};
    }
    if (!user.role || !user.country || !user.preferredLanguage)
      this.profileController.show();
  }

  async loadModels(selectedTreeNodeId = this.state.selectedTreeNodeId) {
    this.setStatus(this.translations.get("Loading models…"));
    try {
      this.userSdk.refreshState(this.state);
      this.normalizeAuthenticationState();
      this.state.selectedTreeNodeId = selectedTreeNodeId || this.getDefaultTreeNodeId();
      await this.userSdk.loadFeatureFlags(apiBase, this.state.session);
      await this.loadDataSources();
      if (!selectedTreeNodeId || this.isNonSelectableTreeNodeId(this.state.selectedTreeNodeId))
        this.state.selectedTreeNodeId = this.getDefaultTreeNodeId();
      this.renderTree();
      this.ensureValidSelectedTreeNodeId();
      this.renderCurrentTreeNode();
      this.refreshTreeSelection();
    } catch (error) {
      if (error?.message?.includes("401") && this.isAuthenticated()) {
        this.userSdk.logout();
        return;
      }
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to load models."), true);
      this.showModelsCardView();
      this.renderModels([]);
    }
  }

  async loadDataSources() {
    const isAuthenticated = this.isAuthenticated();
    const requests = [
      isAuthenticated ? this.apiClient.fetchPersonalModels() : Promise.resolve([]),
      this.apiClient.fetchPublicModels(),
      this.apiClient.fetchEducationLevelLookups(),
      this.apiClient.fetchScienceLookups(),
      this.apiClient.fetchVideos(),
      this.apiClient.fetchDataSets(),
      this.apiClient.fetchCharacters(),
      this.apiClient.fetchCharacterCategories(),
      isAuthenticated ? this.apiClient.fetchDeletedModels() : Promise.resolve([])
    ];
    const [personalModelsResult, publicModelsResult, educationLookupOptionsResult, scienceLookupOptionsResult, videosResult, dataSetsResult, charactersResult, characterCategoriesResult, deletedModelsResult] = await Promise.allSettled(requests);
    const personalModels = personalModelsResult.status === "fulfilled" ? personalModelsResult.value : [];
    if (publicModelsResult.status !== "fulfilled")
      throw publicModelsResult.reason;
    const publicModels = publicModelsResult.value;
    const educationLookupOptions = educationLookupOptionsResult.status === "fulfilled" ? educationLookupOptionsResult.value : [];
    const scienceLookupOptions = scienceLookupOptionsResult.status === "fulfilled" ? scienceLookupOptionsResult.value : [];
    this.educationLookupOptions = educationLookupOptions;
    this.scienceLookupOptions = scienceLookupOptions;
    this.educationLookupNameById = this.createLookupNameByIdMap(educationLookupOptions);
    this.scienceLookupNameById = this.createLookupNameByIdMap(scienceLookupOptions);
    this.educationLookupColorById = this.createLookupColorByIdMap(educationLookupOptions);
    this.scienceLookupColorById = this.createLookupColorByIdMap(scienceLookupOptions);
    this.educationLookupIconById = this.createLookupIconByIdMap(educationLookupOptions);
    this.scienceLookupIconById = this.createLookupIconByIdMap(scienceLookupOptions);
    this.personalModels = this.applyModelLookupLabels(personalModels);
    this.publicModels = this.applyModelLookupLabels(publicModels);
    this.videosData = this.applyModelLookupLabels(videosResult.status === "fulfilled" ? videosResult.value : []);
    this.dataSetData = this.applyModelLookupLabels(dataSetsResult.status === "fulfilled" ? dataSetsResult.value : []);
    this.charactersData = charactersResult.status === "fulfilled" ? charactersResult.value : [];
    const characterCategories = characterCategoriesResult.status === "fulfilled" ? characterCategoriesResult.value : [];
    this.characterCategoryNameById = new Map(characterCategories.map(cat => [cat.id, cat.name]));
    this.characterCategoryIconById = new Map();
    if (!isAuthenticated) {
      this.favoriteModels = [];
      this.libraryModels = [];
      this.draftModels = [];
      this.publishedModels = [];
      this.deletedModels = [];
      this.rebuildInteractionModelIdSets();
      return;
    }
    this.favoriteModels = this.personalModels.filter(model => this.hasFavoriteFlag(model));
    this.libraryModels = this.personalModels.filter(model => this.hasPickedFlag(model));
    this.draftModels = this.personalModels.filter(model => model.is_public !== true && model.is_public !== 1);
    this.publishedModels = this.personalModels.filter(model => model.is_public === true || model.is_public === 1);
    this.deletedModels = this.applyModelLookupLabels(deletedModelsResult.status === "fulfilled" ? deletedModelsResult.value : []);
    this.rebuildInteractionModelIdSets();
  }

  createLookupNameByIdMap(lookupOptions) {
    const lookupNameById = new Map();
    for (let optionIndex = 0; optionIndex < lookupOptions.length; optionIndex++) {
      const lookupOption = lookupOptions[optionIndex];
      lookupNameById.set(lookupOption.id, lookupOption.name);
    }
    return lookupNameById;
  }
  createLookupColorByIdMap(lookupOptions) {
    const lookupColorById = new Map();
    for (let optionIndex = 0; optionIndex < lookupOptions.length; optionIndex++) {
      const lookupOption = lookupOptions[optionIndex];
      lookupColorById.set(lookupOption.id, lookupOption.color);
    }
    return lookupColorById;
  }
  createLookupIconByIdMap(lookupOptions) {
    const lookupIconById = new Map();
    for (let optionIndex = 0; optionIndex < lookupOptions.length; optionIndex++) {
      const lookupOption = lookupOptions[optionIndex];
      lookupIconById.set(lookupOption.id, lookupOption.icon);
    }
    return lookupIconById;
  }

  applyModelLookupLabels(models) {
    for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
      const model = models[modelIndex];
      const educationLabel = this.educationLookupNameById.get(model.education_level_id);
      const scienceLabel = this.scienceLookupNameById.get(model.science_id);
      const educationColor = this.educationLookupColorById.get(model.education_level_id);
      const scienceColor = this.scienceLookupColorById.get(model.science_id);
      if (educationLabel)
        model.education_level = educationLabel;
      if (scienceLabel)
        model.science = scienceLabel;
      if (educationColor)
        model.education_level_color = educationColor;
      if (scienceColor)
        model.science_color = scienceColor;
    }
    return models;
  }

  getModelsByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.myPersonal)
      return this.personalModels;
    if (nodeId === treeNodeIds.myFavorite)
      return this.favoriteModels;
    if (nodeId === treeNodeIds.myLibrary)
      return this.libraryModels;
    if (nodeId === treeNodeIds.myDraft)
      return this.draftModels;
    if (nodeId === treeNodeIds.myPublished)
      return this.publishedModels;
    if (nodeId === treeNodeIds.myDeleted)
      return this.deletedModels;
    if (nodeId === treeNodeIds.marketplace || nodeId === treeNodeIds.marketplaceModels)
      return this.publicModels;
    if (typeof nodeId === "string" && nodeId.startsWith("market-education-item:")) {
      const educationKey = nodeId.substring("market-education-item:".length);
      if (educationKey.startsWith("id:")) {
        const educationLookupId = decodeURIComponent(educationKey.substring("id:".length));
        return this.publicModels.filter(model => model.education_level_id === educationLookupId);
      }
      if (educationKey.startsWith("label:")) {
        const educationLabel = decodeURIComponent(educationKey.substring("label:".length));
        return this.publicModels.filter(model => this.getEducationLabel(model) === educationLabel);
      }
      const educationLabel = decodeURIComponent(educationKey);
      return this.publicModels.filter(model => this.getEducationLabel(model) === educationLabel);
    }
    if (typeof nodeId === "string" && nodeId.startsWith("market-science-item:")) {
      const scienceKey = nodeId.substring("market-science-item:".length);
      if (scienceKey.startsWith("id:")) {
        const scienceLookupId = decodeURIComponent(scienceKey.substring("id:".length));
        return this.publicModels.filter(model => model.science_id === scienceLookupId);
      }
      if (scienceKey.startsWith("label:")) {
        const scienceLabel = decodeURIComponent(scienceKey.substring("label:".length));
        return this.publicModels.filter(model => this.getScienceLabel(model) === scienceLabel);
      }
      const scienceLabel = decodeURIComponent(scienceKey);
      return this.publicModels.filter(model => this.getScienceLabel(model) === scienceLabel);
    }
    return [];
  }

  getVideosByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.marketplaceVideos)
      return this.videosData;
    if (typeof nodeId === "string" && nodeId.startsWith("market-video-education-item:")) {
      const educationKey = nodeId.substring("market-video-education-item:".length);
      if (educationKey.startsWith("id:")) {
        const educationLookupId = decodeURIComponent(educationKey.substring("id:".length));
        return this.videosData.filter(video => video.education_level_id === educationLookupId);
      }
      const educationLabel = decodeURIComponent(educationKey.startsWith("label:") ? educationKey.substring("label:".length) : educationKey);
      return this.videosData.filter(video => this.getEducationLabel(video) === educationLabel);
    }
    if (typeof nodeId === "string" && nodeId.startsWith("market-video-science-item:")) {
      const scienceKey = nodeId.substring("market-video-science-item:".length);
      if (scienceKey.startsWith("id:")) {
        const scienceLookupId = decodeURIComponent(scienceKey.substring("id:".length));
        return this.videosData.filter(video => video.science_id === scienceLookupId);
      }
      const scienceLabel = decodeURIComponent(scienceKey.startsWith("label:") ? scienceKey.substring("label:".length) : scienceKey);
      return this.videosData.filter(video => this.getScienceLabel(video) === scienceLabel);
    }
    return [];
  }

  getDataSetsByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.marketplaceData)
      return this.dataSetData;
    if (typeof nodeId === "string" && nodeId.startsWith("market-data-education-item:")) {
      const educationKey = nodeId.substring("market-data-education-item:".length);
      if (educationKey.startsWith("id:")) {
        const educationLookupId = decodeURIComponent(educationKey.substring("id:".length));
        return this.dataSetData.filter(dataSet => dataSet.education_level_id === educationLookupId);
      }
      const educationLabel = decodeURIComponent(educationKey.startsWith("label:") ? educationKey.substring("label:".length) : educationKey);
      return this.dataSetData.filter(dataSet => this.getEducationLabel(dataSet) === educationLabel);
    }
    if (typeof nodeId === "string" && nodeId.startsWith("market-data-science-item:")) {
      const scienceKey = nodeId.substring("market-data-science-item:".length);
      if (scienceKey.startsWith("id:")) {
        const scienceLookupId = decodeURIComponent(scienceKey.substring("id:".length));
        return this.dataSetData.filter(dataSet => dataSet.science_id === scienceLookupId);
      }
      const scienceLabel = decodeURIComponent(scienceKey.startsWith("label:") ? scienceKey.substring("label:".length) : scienceKey);
      return this.dataSetData.filter(dataSet => this.getScienceLabel(dataSet) === scienceLabel);
    }
    return [];
  }

  isVideoNodeId(nodeId) {
    return nodeId === treeNodeIds.marketplaceVideos
      || (typeof nodeId === "string" && (nodeId.startsWith("market-video-education-item:") || nodeId.startsWith("market-video-science-item:")));
  }

  isDataNodeId(nodeId) {
    return nodeId === treeNodeIds.marketplaceData
      || (typeof nodeId === "string" && (nodeId.startsWith("market-data-education-item:") || nodeId.startsWith("market-data-science-item:")));
  }

  isCharacterNodeId(nodeId) {
    return nodeId === treeNodeIds.marketplaceCharacters
      || (typeof nodeId === "string" && nodeId.startsWith("market-character-category-item:"));
  }

  getCharactersByTreeNodeId(nodeId) {
    if (nodeId === treeNodeIds.marketplaceCharacters)
      return this.charactersData;
    if (typeof nodeId === "string" && nodeId.startsWith("market-character-category-item:")) {
      const categoryKey = nodeId.substring("market-character-category-item:".length);
      if (categoryKey.startsWith("id:")) {
        const categoryId = decodeURIComponent(categoryKey.substring("id:".length));
        return this.charactersData.filter(character => character.category_id === categoryId);
      }
      if (categoryKey === "uncategorized")
        return this.charactersData.filter(character => !character.category_id);
    }
    return [];
  }

  getEducationLabel(model) {
    const educationLabel = this.educationLookupNameById.get(model.education_level_id);
    if (educationLabel)
      return educationLabel;
    if (model.education_level)
      return model.education_level;
    return this.translations.get("Uncategorized");
  }

  getScienceLabel(model) {
    const scienceLabel = this.scienceLookupNameById.get(model.science_id);
    if (scienceLabel)
      return scienceLabel;
    if (model.science)
      return model.science;
    return this.translations.get("Uncategorized");
  }

  canAccessMaintenance() {
    return this.userSdk.hasFeatureFlag(maintenanceAccessFeatureFlagKey);
  }

  buildGroupedPublicItems(type) {
    const grouped = new Map();
    const publicModels = Array.isArray(this.publicModels) ? this.publicModels : [];
    for (let index = 0; index < publicModels.length; index++) {
      const model = publicModels[index];
      const lookupId = type === "education" ? model.education_level_id : model.science_id;
      const label = type === "education" ? this.getEducationLabel(model) : this.getScienceLabel(model);
      const groupKey = lookupId ? `id:${lookupId}` : `label:${label}`;
      const existingGroup = grouped.get(groupKey);
      if (existingGroup) {
        existingGroup.count += 1;
        continue;
      }
      grouped.set(groupKey, { lookupId: lookupId, label: label, count: 1 });
    }
    return Array.from(grouped.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(entry => {
        const isEducation = type === "education";
        const defaultIconClass = isEducation ? "fa-light fa-graduation-cap" : "fa-light fa-flask";
        const defaultIconColor = isEducation ? "#8b5cf6" : "#0ea5e9";
        const lookupIconById = isEducation ? this.educationLookupIconById : this.scienceLookupIconById;
        const lookupColorById = isEducation ? this.educationLookupColorById : this.scienceLookupColorById;
        const iconClass = entry.lookupId ? lookupIconById.get(entry.lookupId) || defaultIconClass : defaultIconClass;
        const iconColor = entry.lookupId ? lookupColorById.get(entry.lookupId) || defaultIconColor : defaultIconColor;
        const nodePrefix = isEducation ? "market-education-item:" : "market-science-item:";
        const nodeType = isEducation ? "market-education-item" : "market-science-item";
        const nodeSuffix = entry.lookupId ? `id:${encodeURIComponent(entry.lookupId)}` : `label:${encodeURIComponent(entry.label)}`;
        return {
          id: `${nodePrefix}${nodeSuffix}`,
          text: `${entry.label} (${entry.count})`,
          nodeType: nodeType,
          count: entry.count,
          iconClass: iconClass,
          iconColor: iconColor
        };
      });
  }

  buildGroupedVideosItems(type) {
    const grouped = new Map();
    const videos = Array.isArray(this.videosData) ? this.videosData : [];
    for (let index = 0; index < videos.length; index++) {
      const video = videos[index];
      const lookupId = type === "education" ? video.education_level_id : video.science_id;
      const label = type === "education" ? this.getEducationLabel(video) : this.getScienceLabel(video);
      const groupKey = lookupId ? `id:${lookupId}` : `label:${label}`;
      const existingGroup = grouped.get(groupKey);
      if (existingGroup) {
        existingGroup.count += 1;
        continue;
      }
      grouped.set(groupKey, { lookupId, label, count: 1 });
    }
    return Array.from(grouped.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(entry => {
        const isEducation = type === "education";
        const defaultIconClass = isEducation ? "fa-light fa-graduation-cap" : "fa-light fa-flask";
        const defaultIconColor = isEducation ? "#8b5cf6" : "#0ea5e9";
        const lookupIconById = isEducation ? this.educationLookupIconById : this.scienceLookupIconById;
        const lookupColorById = isEducation ? this.educationLookupColorById : this.scienceLookupColorById;
        const iconClass = entry.lookupId ? lookupIconById.get(entry.lookupId) || defaultIconClass : defaultIconClass;
        const iconColor = entry.lookupId ? lookupColorById.get(entry.lookupId) || defaultIconColor : defaultIconColor;
        const nodePrefix = isEducation ? "market-video-education-item:" : "market-video-science-item:";
        const nodeType = isEducation ? "market-video-education-item" : "market-video-science-item";
        const nodeSuffix = entry.lookupId ? `id:${encodeURIComponent(entry.lookupId)}` : `label:${encodeURIComponent(entry.label)}`;
        return {
          id: `${nodePrefix}${nodeSuffix}`,
          text: `${entry.label} (${entry.count})`,
          nodeType,
          count: entry.count,
          iconClass,
          iconColor
        };
      });
  }

  buildGroupedCharacterItems() {
    const grouped = new Map();
    const characters = Array.isArray(this.charactersData) ? this.charactersData : [];
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index];
      const categoryId = character.category_id || null;
      const groupKey = categoryId ? `id:${categoryId}` : "uncategorized";
      const existingGroup = grouped.get(groupKey);
      if (existingGroup) {
        existingGroup.count += 1;
        continue;
      }
      const label = categoryId ? (this.characterCategoryNameById?.get(categoryId) || categoryId) : (this.translations.get("Uncategorized") ?? "Uncategorized");
      grouped.set(groupKey, { categoryId, label, count: 1 });
    }
    return Array.from(grouped.values())
      .sort((left, right) => {
        if (!left.categoryId) return 1;
        if (!right.categoryId) return -1;
        return left.label.localeCompare(right.label);
      })
      .map(entry => {
        const nodeSuffix = entry.categoryId ? `id:${encodeURIComponent(entry.categoryId)}` : "uncategorized";
        return {
          id: `market-character-category-item:${nodeSuffix}`,
          text: `${entry.label} (${entry.count})`,
          nodeType: "market-character-category-item",
          iconClass: "fa-light fa-person-running",
          iconColor: "#7c3aed"
        };
      });
  }

  buildGroupedDataItems(type) {
    const grouped = new Map();
    const dataSets = Array.isArray(this.dataSetData) ? this.dataSetData : [];
    for (let index = 0; index < dataSets.length; index++) {
      const dataSet = dataSets[index];
      const lookupId = type === "education" ? dataSet.education_level_id : dataSet.science_id;
      const label = type === "education" ? this.getEducationLabel(dataSet) : this.getScienceLabel(dataSet);
      const groupKey = lookupId ? `id:${lookupId}` : `label:${label}`;
      const existingGroup = grouped.get(groupKey);
      if (existingGroup) {
        existingGroup.count += 1;
        continue;
      }
      grouped.set(groupKey, { lookupId, label, count: 1 });
    }
    return Array.from(grouped.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(entry => {
        const isEducation = type === "education";
        const defaultIconClass = isEducation ? "fa-light fa-graduation-cap" : "fa-light fa-flask";
        const defaultIconColor = isEducation ? "#8b5cf6" : "#0ea5e9";
        const lookupIconById = isEducation ? this.educationLookupIconById : this.scienceLookupIconById;
        const lookupColorById = isEducation ? this.educationLookupColorById : this.scienceLookupColorById;
        const iconClass = entry.lookupId ? lookupIconById.get(entry.lookupId) || defaultIconClass : defaultIconClass;
        const iconColor = entry.lookupId ? lookupColorById.get(entry.lookupId) || defaultIconColor : defaultIconColor;
        const nodePrefix = isEducation ? "market-data-education-item:" : "market-data-science-item:";
        const nodeType = isEducation ? "market-data-education-item" : "market-data-science-item";
        const nodeSuffix = entry.lookupId ? `id:${encodeURIComponent(entry.lookupId)}` : `label:${encodeURIComponent(entry.label)}`;
        return {
          id: `${nodePrefix}${nodeSuffix}`,
          text: `${entry.label} (${entry.count})`,
          nodeType,
          count: entry.count,
          iconClass,
          iconColor
        };
      });
  }

  getTreeData() {
    const educationItems = this.buildGroupedPublicItems("education");
    const scienceItems = this.buildGroupedPublicItems("science");
    const videoEducationItems = this.buildGroupedVideosItems("education");
    const videoScienceItems = this.buildGroupedVideosItems("science");
    const dataEducationItems = this.buildGroupedDataItems("education");
    const dataScienceItems = this.buildGroupedDataItems("science");
    const characterCategoryItems = this.buildGroupedCharacterItems();
    const treeData = [];
    if (this.isAuthenticated())
      treeData.push({
        id: treeNodeIds.myModels,
        text: `${this.translations.get("My Models")} (${this.personalModels.length + this.deletedModels.length})`,
        iconClass: "fa-light fa-folder-user",
        iconColor: "#2563eb",
        expanded: true,
        selectable: false,
        items: [
          {
            id: treeNodeIds.myPersonal,
            text: `${this.translations.get("Personal")} (${this.personalModels.length})`,
            nodeType: "my-personal",
            iconClass: "fa-light fa-user",
            iconColor: "#2563eb"
          },
          {
            id: treeNodeIds.myFavorite,
            text: `${this.translations.get("Favorite")} (${this.favoriteModels.length})`,
            nodeType: "my-favorite",
            iconClass: "fa-light fa-star",
            iconColor: "#f59e0b"
          },
          {
            id: treeNodeIds.myLibrary,
            text: `${this.translations.get("Library")} (${this.libraryModels.length})`,
            nodeType: "my-library",
            iconClass: "fa-light fa-bookmark",
            iconColor: "#dc2626"
          },
          {
            id: treeNodeIds.myDraft,
            text: `${this.translations.get("Draft")} (${this.draftModels.length})`,
            nodeType: "my-draft",
            iconClass: "fa-light fa-file-pen",
            iconColor: "#6b7280"
          },
          {
            id: treeNodeIds.myPublished,
            text: `${this.translations.get("Published")} (${this.publishedModels.length})`,
            nodeType: "my-published",
            iconClass: "fa-light fa-earth-americas",
            iconColor: "#16a34a"
          },
          {
            id: treeNodeIds.myDeleted,
            text: `${this.translations.get("Deleted")} (${this.deletedModels.length})`,
            nodeType: "my-deleted",
            iconClass: "fa-light fa-trash-can",
            iconColor: "#dc2626"
          }
        ]
      });
    treeData.push({
        id: treeNodeIds.marketplace,
        text: `${this.translations.get("Marketplace")} (${(Array.isArray(this.publicModels) ? this.publicModels.length : 0) + this.videosData.length + this.dataSetData.length + this.charactersData.length})`,
        iconClass: "fa-light fa-store",
        iconColor: "#16a34a",
        expanded: false,
        selectable: false,
        items: [
          {
            id: treeNodeIds.marketplaceModels,
            text: `${this.translations.get("Models")} (${Array.isArray(this.publicModels) ? this.publicModels.length : 0})`,
            iconClass: "fa-light fa-cube",
            iconColor: "#16a34a",
            expanded: false,
            selectable: false,
            items: [
              {
                id: treeNodeIds.marketplaceModelsEducation,
                text: `${this.translations.get("Education Levels")} (${educationItems.length})`,
                iconClass: "fa-light fa-graduation-cap",
                iconColor: "#8b5cf6",
                expanded: false,
                selectable: false,
                items: educationItems
              },
              {
                id: treeNodeIds.marketplaceModelsSciences,
                text: `${this.translations.get("Sciences")} (${scienceItems.length})`,
                iconClass: "fa-light fa-flask",
                iconColor: "#0ea5e9",
                expanded: false,
                selectable: false,
                items: scienceItems
              }
            ]
          },
          {
            id: treeNodeIds.marketplaceVideos,
            text: `${this.translations.get("Videos")} (${this.videosData.length})`,
            iconClass: "fa-light fa-video",
            iconColor: "#e11d48",
            expanded: false,
            selectable: false,
            items: [
              {
                id: treeNodeIds.marketplaceVideosEducation,
                text: `${this.translations.get("Education Levels")} (${videoEducationItems.length})`,
                iconClass: "fa-light fa-graduation-cap",
                iconColor: "#8b5cf6",
                expanded: false,
                selectable: false,
                items: videoEducationItems
              },
              {
                id: treeNodeIds.marketplaceVideosSciences,
                text: `${this.translations.get("Sciences")} (${videoScienceItems.length})`,
                iconClass: "fa-light fa-flask",
                iconColor: "#0ea5e9",
                expanded: false,
                selectable: false,
                items: videoScienceItems
              }
            ]
          },
          {
            id: treeNodeIds.marketplaceData,
            text: `${this.translations.get("Data")} (${this.dataSetData.length})`,
            iconClass: "fa-light fa-table",
            iconColor: "#d97706",
            expanded: false,
            selectable: false,
            items: [
              {
                id: treeNodeIds.marketplaceDataEducation,
                text: `${this.translations.get("Education Levels")} (${dataEducationItems.length})`,
                iconClass: "fa-light fa-graduation-cap",
                iconColor: "#8b5cf6",
                expanded: false,
                selectable: false,
                items: dataEducationItems
              },
              {
                id: treeNodeIds.marketplaceDataSciences,
                text: `${this.translations.get("Sciences")} (${dataScienceItems.length})`,
                iconClass: "fa-light fa-flask",
                iconColor: "#0ea5e9",
                expanded: false,
                selectable: false,
                items: dataScienceItems
              }
            ]
          },
          {
            id: treeNodeIds.marketplaceCharacters,
            text: `${this.translations.get("Characters")} (${this.charactersData.length})`,
            iconClass: "fa-light fa-person-running",
            iconColor: "#7c3aed",
            expanded: false,
            selectable: false,
            items: characterCategoryItems
          }
        ]
      }
    );
    if (this.canAccessMaintenance())
      treeData.push({
        id: treeNodeIds.maintenance,
        text: this.translations.get("Maintenance"),
        iconClass: "fa-light fa-screwdriver-wrench",
        iconColor: "#475569",
        expanded: false,
        selectable: false,
        items: [
          {
            id: treeNodeIds.maintenanceModels,
            text: this.translations.get("Models"),
            nodeType: "maintenance-models",
            iconClass: "fa-light fa-cube",
            iconColor: "#475569"
          },
          {
            id: treeNodeIds.maintenanceSystemTemplates,
            text: this.translations.get("System Templates"),
            nodeType: "maintenance-system-templates",
            iconClass: "fa-light fa-layer-group",
            iconColor: "#9333ea"
          },
          {
            id: treeNodeIds.maintenanceEducation,
            text: this.translations.get("Education Levels"),
            nodeType: "maintenance-education",
            iconClass: "fa-light fa-graduation-cap",
            iconColor: "#8b5cf6"
          },
          {
            id: treeNodeIds.maintenanceSciences,
            text: this.translations.get("Sciences"),
            nodeType: "maintenance-sciences",
            iconClass: "fa-light fa-flask",
            iconColor: "#0ea5e9"
          },
          {
            id: treeNodeIds.maintenanceNotifications,
            text: this.translations.get("Notifications"),
            nodeType: "maintenance-notifications",
            iconClass: "fa-light fa-bell",
            iconColor: "#f59e0b"
          },
          {
            id: treeNodeIds.maintenanceUsers,
            text: this.translations.get("Users"),
            nodeType: "maintenance-users",
            iconClass: "fa-light fa-users",
            iconColor: "#2563eb"
          },
          {
            id: treeNodeIds.maintenanceWhatsNew,
            text: this.translations.get("What's New"),
            nodeType: "maintenance-whats-new",
            iconClass: "fa-light fa-sparkles",
            iconColor: "#10b981"
          },
          {
            id: treeNodeIds.maintenanceCharacterCategories,
            text: this.translations.get("Character Categories"),
            nodeType: "maintenance-character-categories",
            iconClass: "fa-light fa-person-running",
            iconColor: "#f97316"
          }
        ]
      });
    return treeData;
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
      this.state.selectedTreeNodeId = this.getDefaultTreeNodeId();
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
    return this.isTruthyInteractionFlag(modelData.user_interaction_is_favorite);
  }

  hasPickedFlag(modelData) {
    if (!modelData) return false;
    return this.isTruthyInteractionFlag(modelData.user_interaction_is_picked);
  }

  hasLikedFlag(modelData) {
    if (!modelData) return false;
    return this.isTruthyInteractionFlag(modelData.user_interaction_is_liked);
  }

  rebuildInteractionModelIdSets() {
    this.favoriteModelIdSet = new Set();
    this.pickedModelIdSet = new Set();
    this.likedModelIdSet = new Set();
    const modelGroups = [this.personalModels, this.publicModels];
    for (let groupIndex = 0; groupIndex < modelGroups.length; groupIndex++) {
      const modelGroup = modelGroups[groupIndex];
      if (!Array.isArray(modelGroup)) continue;
      for (let modelIndex = 0; modelIndex < modelGroup.length; modelIndex++) {
        const modelData = modelGroup[modelIndex];
        const modelId = this.normalizeModelId(modelData);
        if (!modelId) continue;
        if (this.hasFavoriteFlag(modelData)) this.favoriteModelIdSet.add(modelId);
        if (this.hasPickedFlag(modelData)) this.pickedModelIdSet.add(modelId);
        if (this.hasLikedFlag(modelData)) this.likedModelIdSet.add(modelId);
      }
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

  isLikedValue(modelData) {
    if (!modelData) return false;
    const flagValue = this.hasLikedFlag(modelData);
    const modelId = this.normalizeModelId(modelData);
    const inSet = modelId ? this.likedModelIdSet.has(modelId) : false;
    if (flagValue) return true;
    return inSet;
  }

  async toggleLike(modelData, likeButton) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const desiredLikeState = !this.isLikedValue(modelData);
    modelData.user_interaction_is_liked = desiredLikeState;
    if (desiredLikeState)
      this.likedModelIdSet.add(this.normalizeModelId(modelData));
    else
      this.likedModelIdSet.delete(this.normalizeModelId(modelData));
    if (likeButton) {
      likeButton.classList.toggle("is-liked", desiredLikeState);
      const icon = likeButton.querySelector(".like-icon");
      if (icon)
        icon.className = desiredLikeState ? "fa-solid fa-heart like-icon" : "fa-light fa-heart like-icon";
    }
    try {
      await this.apiClient.patchUserModelInteraction(modelData.id, { is_liked: desiredLikeState });
      this.loadModels();
    } catch (error) {
      modelData.user_interaction_is_liked = !desiredLikeState;
      if (desiredLikeState)
        this.likedModelIdSet.delete(this.normalizeModelId(modelData));
      else
        this.likedModelIdSet.add(this.normalizeModelId(modelData));
      if (likeButton) {
        likeButton.classList.toggle("is-liked", !desiredLikeState);
        const icon = likeButton.querySelector(".like-icon");
        if (icon)
          icon.className = !desiredLikeState ? "fa-solid fa-heart like-icon" : "fa-light fa-heart like-icon";
      }
      this.setStatus(error?.message || this.translations.get("Failed to update likes."), true);
    }
  }

  async toggleFavorite(modelData, shouldFavorite) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const currentFavoriteState = this.isFavoriteValue(modelData);
    const desiredFavoriteState = typeof shouldFavorite === "boolean" ? shouldFavorite : !currentFavoriteState;
    try {
      await this.apiClient.patchUserModelInteraction(modelData.id, {
        is_favorite: desiredFavoriteState
      });
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to mark favorite."), true);
    }
  }

  async togglePick(modelData, shouldPick) {
    if (!modelData || !modelData.id) return;
    if (!this.state.session || !this.state.session.token) return;
    if (!this.state.session.userId) return;
    const currentPickedState = this.isPickedValue(modelData);
    const desiredPickedState = typeof shouldPick === "boolean" ? shouldPick : !currentPickedState;
    try {
      await this.apiClient.patchUserModelInteraction(modelData.id, {
        is_picked: desiredPickedState
      });
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to update library."), true);
    }
  }

  async toggleVisibility(modelData) {
    if (!modelData || !modelData.id) return;
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus(this.translations.get("Sign-in required to update visibility."), true);
      return;
    }
    if (!this.state.session.userId) {
      this.setStatus(this.translations.get("Missing user id for visibility update."), true);
      return;
    }
    const nextValue = !(modelData.is_public === true || modelData.is_public === 1);
    this.setStatus(nextValue ? this.translations.get("Setting public…") : this.translations.get("Setting private…"));
    try {
      await this.apiClient.updateModelVisibility(modelData.id, nextValue);
      this.setStatus(nextValue ? this.translations.get("Model is public.") : this.translations.get("Model is private."));
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to update visibility."), true);
    }
  }

  initDrawer() {
    if (this.drawerInstance || !this.elements.drawerHost || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxDrawer) return;
    const treeHost = this.createNodeFromMarkup(`<div class="drawer-tree-host"></div>`);
    if (!treeHost) return;
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
        if (event.itemData.selectable === false) {
          this.refreshTreeSelection();
          return;
        }
        this.state.selectedTreeNodeId = event.itemData.id;
        this.renderCurrentTreeNode();
      }
    });
  }

  renderTreeItem(itemData, itemElement) {
    const host = itemElement.get(0);
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
    this.updateUploadButtonsVisibility();
  }

  updateUploadButtonsVisibility() {
    const canAccess = this.canAccessMaintenance();
    const uploadVideoElement = this.elements.navUploadVideo;
    const uploadDataElement = this.elements.navUploadData;
    if (uploadVideoElement) {
      const uploadVideoContainer = uploadVideoElement.closest(".dx-item");
      if (uploadVideoContainer)
        uploadVideoContainer.style.display = canAccess ? "" : "none";
    }
    if (uploadDataElement) {
      const uploadDataContainer = uploadDataElement.closest(".dx-item");
      if (uploadDataContainer)
        uploadDataContainer.style.display = canAccess ? "" : "none";
    }
    const addCharacterElement = this.elements.navAddCharacter;
    if (addCharacterElement) {
      const addCharacterContainer = addCharacterElement.closest(".dx-item");
      if (addCharacterContainer)
        addCharacterContainer.style.display = canAccess ? "" : "none";
    }
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
    if (this.elements.navUploadVideo) this.elements.navUploadVideo.addEventListener("click", () => this.showUploadVideoPopup());
    if (this.elements.navUploadData) this.elements.navUploadData.addEventListener("click", () => this.showDataPopup());
    if (this.elements.navAddCharacter) this.elements.navAddCharacter.addEventListener("click", () => this.showCharacterPopup());
  }
  async createModel() {
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus(this.translations.get("Sign-in required to create a model."), true);
      return;
    }
    const userId = this.userSdk.getUserId(this.state.session);
    if (!userId) {
      this.setStatus(this.translations.get("Missing user id for model creation."), true);
      return;
    }
    this.showTemplatePickerPopup();
  }

  showTemplatePickerPopup() {
    let popupHost = document.getElementById("template-picker-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="template-picker-popup"></div>`);
      popupHost = document.getElementById("template-picker-popup");
    }
    if (this.templatePickerPopupInstance) {
      this.templatePickerPopupInstance.option("contentTemplate", contentElement => this._buildTemplatePickerContent(contentElement));
      this.templatePickerPopupInstance.repaint();
      this.templatePickerPopupInstance.show();
      return;
    }
    this.templatePickerPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: this.translations.get("Choose a starting point"),
      width: 760,
      height: "auto",
      maxHeight: "80vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => this._buildTemplatePickerContent(contentElement)
    });
  }

  async _buildTemplatePickerContent(contentElement) {
    const host = contentElement.get ? contentElement.get(0) : contentElement;
    host.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:2rem"><i class="fa-light fa-spinner fa-spin" style="font-size:1.5rem;color:#6b7280"></i></div>`;
    let templates = [];
    try {
      const fetchedTemplates = await this.apiClient.fetchSystemTemplateModels();
      templates = this.applyModelLookupLabels(fetchedTemplates);
    } catch (_) {
      templates = [];
    }
    let selectedTemplateId = null;
    const blankCardMarkup = `
      <div class="template-picker-card template-picker-card--selected" data-template-id="">
        <div class="template-picker-card-thumb template-picker-card-thumb--blank">
          <i class="fa-light fa-file-plus" aria-hidden="true"></i>
        </div>
        <div class="template-picker-card-body">
          <div class="template-picker-card-title">${this.translations.get("Blank model")}</div>
        </div>
      </div>
    `;
    const templateCardMarkups = templates.map(template => {
      const src = template.thumbnail_url || "";
      const thumbContent = src
        ? `<img src="${src}" alt="${this.escapeHtml(template.title || "")}">`
        : `<i class="fa-light fa-cube" aria-hidden="true"></i>`;
      const educationLabel = template.education_level ? `<span class="template-picker-card-tag">${this.escapeHtml(template.education_level)}</span>` : "";
      const scienceLabel = template.science ? `<span class="template-picker-card-tag">${this.escapeHtml(template.science)}</span>` : "";
      return `
        <div class="template-picker-card" data-template-id="${this.escapeHtml(template.id)}">
          <div class="template-picker-card-thumb">${thumbContent}</div>
          <div class="template-picker-card-body">
            <div class="template-picker-card-title">${this.escapeHtml(template.title || this.translations.get("Untitled model"))}</div>
            ${educationLabel || scienceLabel ? `<div class="template-picker-card-tags">${educationLabel}${scienceLabel}</div>` : ""}
          </div>
        </div>
      `;
    });
    host.innerHTML = `
      <div class="template-picker-shell">
        <div class="template-picker-grid">
          ${blankCardMarkup}
          ${templateCardMarkups.join("")}
        </div>
        <div class="template-picker-footer">
          <div id="template-picker-cancel-btn"></div>
          <div id="template-picker-create-btn"></div>
        </div>
      </div>
    `;
    const allCards = host.querySelectorAll(".template-picker-card");
    const selectCard = card => {
      allCards.forEach(c => c.classList.remove("template-picker-card--selected"));
      card.classList.add("template-picker-card--selected");
      const rawId = card.dataset.templateId;
      selectedTemplateId = rawId === "" ? null : rawId;
    };
    allCards.forEach(card => {
      card.addEventListener("click", () => selectCard(card));
      card.addEventListener("dblclick", () => {
        selectCard(card);
        this.templatePickerPopupInstance.hide();
        this._doCreateModel(selectedTemplateId);
      });
    });
    new DevExpress.ui.dxButton(host.querySelector("#template-picker-cancel-btn"), {
      text: this.translations.get("Cancel"),
      stylingMode: "outlined",
      onClick: () => this.templatePickerPopupInstance.hide()
    });
    new DevExpress.ui.dxButton(host.querySelector("#template-picker-create-btn"), {
      text: this.translations.get("Create"),
      type: "default",
      stylingMode: "contained",
      onClick: () => {
        this.templatePickerPopupInstance.hide();
        this._doCreateModel(selectedTemplateId);
      }
    });
  }

  async _doCreateModel(fromModelId) {
    this.setStatus(this.translations.get("Creating model…"));
    try {
      const created = await this.apiClient.createModel({
        title: this.translations.get("New Model"),
        description: "",
        type: "model",
        status: "draft"
      }, fromModelId);
      this.setStatus(this.translations.get("Model created."));
      this.loadModels();
      if (created && created.id) {
        const editorUrl = new URL("/editor.html", window.location.origin);
        editorUrl.searchParams.set("model_id", created.id);
        editorUrl.searchParams.set("new", "1");
        window.location.href = editorUrl.toString();
      }
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to create model."), true);
    }
  }
  async deleteModel(modelData) {
    const modelId = modelData && modelData.id;
    if (!modelId)
      return;
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus(this.translations.get("Sign-in required to delete a model."), true);
      return;
    }
    const isPermanentDelete = modelData.is_deleted === true || modelData.is_deleted === 1;
    if (isPermanentDelete) {
      const confirmed = await this.confirmPermanentDelete();
      if (!confirmed) return;
    }
    this.setStatus(this.translations.get("Deleting model…"));
    try {
      await this.apiClient.deleteModel(modelId);
      this.setStatus(this.translations.get("Model deleted."));
      if (isPermanentDelete) {
        this.deletedModels = this.deletedModels.filter(model => model.id !== modelId);
        this.renderTree();
        this.renderCurrentTreeNode();
      } else {
        await this.refreshAfterModelDelete(modelId);
      }
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to delete model."), true);
    }
  }
  async refreshAfterModelDelete(deletedModelId) {
    this.personalModels = this.personalModels.filter(model => model.id !== deletedModelId);
    this.favoriteModels = this.personalModels.filter(model => this.hasFavoriteFlag(model));
    this.libraryModels = this.personalModels.filter(model => this.hasPickedFlag(model));
    this.draftModels = this.personalModels.filter(model => model.is_public !== true && model.is_public !== 1);
    this.publishedModels = this.personalModels.filter(model => model.is_public === true || model.is_public === 1);
    try {
      this.deletedModels = this.applyModelLookupLabels(await this.apiClient.fetchDeletedModels());
    } catch {
      this.deletedModels = [];
    }
    this.renderTree();
    this.renderCurrentTreeNode();
  }
  async recoverModel(modelData) {
    const modelId = modelData && modelData.id;
    if (!modelId)
      return;
    this.userSdk.refreshState(this.state);
    if (!this.state.session || !this.state.session.token) {
      this.setStatus(this.translations.get("Sign-in required."), true);
      return;
    }
    this.setStatus(this.translations.get("Recovering model…"));
    try {
      await this.apiClient.recoverModel(modelId);
      this.setStatus(this.translations.get("Model recovered."));
      this.deletedModels = this.deletedModels.filter(model => model.id !== modelId);
      try {
        const freshPersonalModels = await this.apiClient.fetchPersonalModels();
        this.personalModels = this.applyModelLookupLabels(freshPersonalModels);
      } catch {
        // keep existing personalModels
      }
      this.favoriteModels = this.personalModels.filter(model => this.hasFavoriteFlag(model));
      this.libraryModels = this.personalModels.filter(model => this.hasPickedFlag(model));
      this.draftModels = this.personalModels.filter(model => model.is_public !== true && model.is_public !== 1);
      this.publishedModels = this.personalModels.filter(model => model.is_public === true || model.is_public === 1);
      this.renderTree();
      this.renderCurrentTreeNode();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to recover model."), true);
    }
  }
  confirmPermanentDelete() {
    if (!this.deletePopupInstance) return Promise.resolve(window.confirm(this.translations.get("This model will be permanently deleted and cannot be recovered. Are you sure?")));
    return new Promise(resolve => {
      this.deletePopupInstance.option("title", this.translations.get("Delete permanently?"));
      this.deletePopupInstance.option("contentTemplate", contentElement => {
        const host = contentElement.get(0);
        host.innerHTML = `
          <div class="delete-popup-content">
            <p style="margin:0 0 1rem">${this.translations.get("This model will be permanently deleted and cannot be recovered.")}</p>
            <div class="delete-popup-buttons" style="display:flex;justify-content:center;gap:0.5rem">
              <div class="delete-popup-cancel"></div>
              <div class="delete-popup-confirm"></div>
            </div>
          </div>
        `;
        const cancelButtonHost = host.querySelector(".delete-popup-cancel");
        const confirmButtonHost = host.querySelector(".delete-popup-confirm");
        if (!cancelButtonHost || !confirmButtonHost) return;
        $(cancelButtonHost).dxButton({
          text: this.translations.get("Cancel"),
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(false);
          }
        });
        $(confirmButtonHost).dxButton({
          text: this.translations.get("Delete permanently"),
          type: "danger",
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(true);
          }
        });
      });
      this.deletePopupInstance.show();
    });
  }
  confirmDelete() {
    if (!this.deletePopupInstance) return Promise.resolve(window.confirm(this.translations.get("Delete model?")));
    return new Promise(resolve => {
      this.deletePopupInstance.option("title", this.translations.get("Delete model?"));
      this.deletePopupInstance.option("contentTemplate", contentElement => {
        const host = contentElement.get(0);
        host.innerHTML = `
          <div class="delete-popup-content">
            <p style="margin:0 0 1rem">${this.translations.get("This action cannot be undone.")}</p>
            <div class="delete-popup-buttons" style="display:flex;justify-content:center;gap:0.5rem">
              <div class="delete-popup-cancel"></div>
              <div class="delete-popup-confirm"></div>
            </div>
          </div>
        `;
        const cancelButtonHost = host.querySelector(".delete-popup-cancel");
        const confirmButtonHost = host.querySelector(".delete-popup-confirm");
        if (!cancelButtonHost || !confirmButtonHost) return;
        $(cancelButtonHost).dxButton({
          text: this.translations.get("Cancel"),
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(false);
          }
        });
        $(confirmButtonHost).dxButton({
          text: this.translations.get("Delete"),
          type: "danger",
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(true);
          }
        });
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
  async loadUnreadNotificationCount() {
    try {
      this.unreadNotificationCount = await this.apiClient.fetchUnreadCount();
      this.updateBellBadge();
    } catch (error) {
      console.error("[notifications] loadUnreadNotificationCount failed:", error);
      this.unreadNotificationCount = 0;
      this.updateBellBadge();
    }
  }
  updateBellBadge() {
    const bellHost = this.bellElement || document.querySelector(".notification-bell");
    if (!bellHost)
      return;
    const existingBadge = bellHost.querySelector(".bell-badge");
    if (existingBadge)
      existingBadge.remove();
    if (this.unreadNotificationCount > 0)
      bellHost.insertAdjacentHTML("beforeend", `<span class="bell-badge">${this.unreadNotificationCount}</span>`);
  }
  async navigateToNotifications() {
    if (!this.canAccessMaintenance())
      return;
    try {
      const unreadCount = await this.apiClient.fetchUnreadCount();
      this.unreadNotificationCount = unreadCount;
      this.updateBellBadge();
      if (unreadCount === 0)
        return;
    } catch (_) {
      return;
    }
    this.state.selectedTreeNodeId = treeNodeIds.maintenanceNotifications;
    this.renderCurrentTreeNode();
    this.refreshTreeSelection();
  }
  disposeNotificationsGrid() {
    if (!this.notificationsGridInstance)
      return;
    this.notificationsGridInstance.dispose();
    this.notificationsGridInstance = null;
  }
  async showNotificationsGrid() {
    if (!this.elements.cardView)
      return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const statusColors = {
      "new": { background: "#dbeafe", color: "#1d4ed8" },
      "todo": { background: "#fef3c7", color: "#b45309" },
      "in progress": { background: "#ede9fe", color: "#6d28d9" },
      "done": { background: "#dcfce7", color: "#15803d" }
    };
    const notificationsStore = new DevExpress.data.CustomStore({
      key: "id",
      load: () => this.apiClient.fetchNotifications(),
      byKey: notificationId => this.apiClient.fetchNotificationById(notificationId),
      update: (notificationId, values) => this.apiClient.updateNotification(notificationId, values),
      remove: notificationId => this.apiClient.deleteNotification(notificationId)
    });
    if (!this.notificationsGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.notificationsGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: notificationsStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        columnAutoWidth: true,
        selection: { mode: "single" },
        editing: { mode: "cell", allowUpdating: true, allowDeleting: true, confirmDelete: true },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        sorting: { mode: "multiple" },
        filterRow: { visible: true },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("Notifications")),
        columns: [
          { dataField: "id", caption: "ID", visible: false },
          {
            dataField: "is_read",
            caption: "",
            width: 40,
            allowFiltering: false,
            allowSorting: false,
            allowEditing: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isRead = cellInfo.value === 1;
              cellElement.get(0).innerHTML = `<i class="${isRead ? "fa-regular fa-envelope-open" : "fa-solid fa-envelope"} mdl-notification-icon" style="color:${isRead ? "#9ca3af" : "#2563eb"};"></i>`;
            }
          },
          {
            dataField: "status",
            caption: this.translations.get("Status"),
            width: 140,
            allowEditing: true,
            cellTemplate: (cellElement, cellInfo) => {
              const palette = statusColors[cellInfo.value] || { background: "#f3f4f6", color: "#6b7280" };
              cellElement.get(0).innerHTML = `<span class="mdl-status-badge" style="background:${palette.background};color:${palette.color}">${cellInfo.value || ""}</span>`;
            },
            editCellTemplate: (cellElement, cellInfo) => {
              const selectHost = document.createElement("div");
              cellElement.get(0).appendChild(selectHost);
              new DevExpress.ui.dxSelectBox(selectHost, {
                dataSource: ["new", "todo", "in progress", "done"],
                value: cellInfo.value,
                acceptCustomValue: false,
                showClearButton: false,
                onValueChanged: event => {
                  cellInfo.setValue(event.value);
                  cellInfo.component.saveEditData();
                }
              });
            }
          },
          { dataField: "title", caption: this.translations.get("Title"), allowEditing: false },
          {
            dataField: "message",
            caption: this.translations.get("Message"),
            width: 300,
            allowEditing: false,
            cellTemplate: (cellElement, cellInfo) => {
              const plainText = this.getModelDescriptionText(cellInfo.value);
              cellElement.get(0).innerHTML = `<span style="display:block;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.escapeHtml(plainText)}">${this.escapeHtml(plainText)}</span>`;
            }
          },
          { dataField: "created_at", caption: this.translations.get("Date"), width: 160, dataType: "date", allowEditing: false },
          {
            dataField: "image_url",
            caption: "",
            width: 52,
            allowFiltering: false,
            allowSorting: false,
            allowEditing: false,
            cellTemplate: (cellElement, cellInfo) => {
              if (cellInfo.value)
                cellElement.get(0).innerHTML = `<img src="${this.escapeHtml(cellInfo.value)}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;display:block">`;
            }
          },
          { type: "buttons", width: 50, buttons: [{ name: "delete", icon: "trash" }] }
        ],
        onCellClick: event => {
          if (event.column?.dataField === "status" || event.column?.type === "buttons") return;
          this.readNotification(event.data);
        }
      });
      return;
    }
    this.notificationsGridInstance.option("dataSource", notificationsStore);
    this.notificationsGridInstance.refresh();
  }
  disposeWhatsNewGrid() {
    if (!this.whatsNewGridInstance)
      return;
    this.whatsNewGridInstance.dispose();
    this.whatsNewGridInstance = null;
  }
  disposeCharacterCategoriesGrid() {
    if (!this.characterCategoriesGridInstance)
      return;
    this.characterCategoriesGridInstance.dispose();
    this.characterCategoriesGridInstance = null;
  }
  showCharacterCategoriesGrid() {
    if (!this.elements.cardView) return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeWhatsNewGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const categoriesStore = new DevExpress.data.CustomStore({
      key: "id",
      load: () => this.apiClient.fetchCharacterCategories(),
      byKey: categoryId => this.apiClient.fetchCharacterCategoryById(categoryId),
      insert: values => this.apiClient.createCharacterCategory(values),
      update: (categoryId, values) => this.apiClient.updateCharacterCategory(categoryId, values),
      remove: categoryId => this.apiClient.deleteCharacterCategory(categoryId)
    });
    if (!this.characterCategoriesGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.characterCategoriesGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: categoriesStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        columnAutoWidth: true,
        selection: { mode: "multiple", showCheckBoxesMode: "always" },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("Character Categories")),
        editing: {
          mode: "cell",
          allowAdding: true,
          allowUpdating: true,
          allowDeleting: false
        },
        toolbar: {
          items: [
            "addRowButton",
            "exportButton",
            "searchPanel",
            {
              location: "after",
              locateInMenu: "always",
              widget: "dxButton",
              options: {
                text: this.translations.get("Delete selected"),
                type: "danger",
                stylingMode: "contained",
                icon: "fa-light fa-trash-can",
                onClick: () => this.deleteSelectedCharacterCategoryRows()
              }
            }
          ]
        },
        columns: [
          { dataField: "id", caption: "ID", allowEditing: true, width: 180, validationRules: [{ type: "required" }] },
          { dataField: "name", caption: this.translations.get("Name"), validationRules: [{ type: "required" }] },
          { dataField: "sort_order", caption: this.translations.get("Sort Order"), dataType: "number", width: 120 }
        ]
      });
      return;
    }
    this.characterCategoriesGridInstance.option("dataSource", categoriesStore);
    this.characterCategoriesGridInstance.refresh();
  }
  async deleteSelectedCharacterCategoryRows() {
    if (!this.characterCategoriesGridInstance) return;
    const selectedRowKeys = this.characterCategoriesGridInstance.getSelectedRowKeys();
    if (!selectedRowKeys.length) return;
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    const dataSource = this.characterCategoriesGridInstance.getDataSource();
    const store = dataSource.store();
    this.setStatus(this.translations.get("Deleting selected items…"));
    try {
      for (let rowIndex = 0; rowIndex < selectedRowKeys.length; rowIndex++)
        await store.remove(selectedRowKeys[rowIndex]);
      await dataSource.reload();
      this.characterCategoriesGridInstance.clearSelection();
      this.setStatus(this.translations.get("Selected items deleted."));
    } catch (error) {
      this.setStatus(error?.message || this.translations.get("Failed to delete selected items."), true);
    }
  }
  showWhatsNewGrid() {
    if (!this.elements.cardView)
      return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
    this.disposeCharacterCategoriesGrid();
    this.disposeVideosCardView();
    this.disposeDataCardView();
    this.disposeCharacterCardView();
    const whatsNewStore = new DevExpress.data.CustomStore({
      key: "id",
      load: () => this.apiClient.fetchWhatsNew(),
      remove: entryId => this.apiClient.deleteWhatsNewEntry(entryId),
      update: (entryId, values) => this.apiClient.updateWhatsNewEntry(entryId, values)
    });
    if (!this.whatsNewGridInstance) {
      this.elements.cardView.innerHTML = "";
      this.whatsNewGridInstance = new DevExpress.ui.dxDataGrid(this.elements.cardView, {
        dataSource: whatsNewStore,
        keyExpr: "id",
        height: "100%",
        showBorders: false,
        columnAutoWidth: true,
        selection: { mode: "single" },
        editing: { mode: "row", allowUpdating: true, allowDeleting: true, confirmDelete: true },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: this.translations.get("Search...") },
        sorting: { mode: "multiple" },
        export: { enabled: true },
        onExporting: event => this.exportGridToExcel(event, this.translations.get("What's New")),
        toolbar: {
          items: [
            {
              location: "before",
              widget: "dxButton",
              options: {
                text: this.translations.get("Whats New Add Entry"),
                icon: "fa-light fa-plus",
                type: "default",
                onClick: () => this.showWhatsNewAddPopup(whatsNewStore)
              }
            },
            "exportButton",
            "searchPanel"
          ]
        },
        columns: [
          { dataField: "id", caption: "ID", visible: false, allowEditing: false },
          { dataField: "title", caption: this.translations.get("Whats New Title field"), validationRules: [{ type: "required" }] },
          { dataField: "date", caption: this.translations.get("Whats New Date field"), dataType: "date", width: 130 },
          {
            dataField: "description",
            caption: this.translations.get("Whats New Description field"),
            cellTemplate: (cellElement, cellInfo) => {
              const text = cellInfo.value || "";
              cellElement.get(0).innerHTML = `<span style="display:block;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.escapeHtml(text)}">${this.escapeHtml(text)}</span>`;
            }
          },
          {
            dataField: "image_url",
            caption: this.translations.get("Whats New Image field"),
            width: 72,
            allowFiltering: false,
            allowSorting: false,
            allowEditing: false,
            cellTemplate: (cellElement, cellInfo) => {
              if (cellInfo.value)
                cellElement.get(0).innerHTML = `<img src="${this.escapeHtml(cellInfo.value)}" style="width:48px;height:36px;object-fit:cover;border-radius:4px;display:block">`;
            }
          },
          { type: "buttons", width: 90, buttons: ["edit", "delete"] }
        ]
      });
      return;
    }
    this.whatsNewGridInstance.option("dataSource", whatsNewStore);
    this.whatsNewGridInstance.refresh();
  }
  showWhatsNewAddPopup(store) {
    let popupHost = document.getElementById("whats-new-add-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="whats-new-add-popup"></div>`);
      popupHost = document.getElementById("whats-new-add-popup");
    }
    this._whatsNewImageFile = null;
    this._whatsNewImageControl = null;
    const formData = {};
    const buildContent = contentElement => {
      const host = contentElement.get ? contentElement.get(0) : contentElement;
      host.innerHTML = `<div id="whats-new-add-form"></div>`;
      const formHost = document.getElementById("whats-new-add-form");
      this._whatsNewFormInstance = new DevExpress.ui.dxForm(formHost, {
        formData,
        colCount: 1,
        items: [
          {
            dataField: "title",
            label: { text: this.translations.get("Whats New Title field") },
            validationRules: [{ type: "required" }],
            editorOptions: { placeholder: this.translations.get("Whats New Title field"), inputAttr: { style: "font-family: 'Atma', sans-serif" } }
          },
          {
            dataField: "date",
            label: { text: this.translations.get("Whats New Date field") },
            editorType: "dxDateBox",
            validationRules: [{ type: "required" }],
            editorOptions: { displayFormat: "yyyy-MM-dd", type: "date", value: new Date(), inputAttr: { style: "font-family: 'Atma', sans-serif" } }
          },
          {
            dataField: "description",
            label: { text: this.translations.get("Whats New Description field") },
            editorType: "dxTextArea",
            editorOptions: { height: 100, placeholder: this.translations.get("Whats New Description field"), inputAttr: { style: "font-family: 'Atma', sans-serif" } }
          },
          {
            label: { text: this.translations.get("Whats New Image field") },
            template: (_, itemElement) => {
              const itemHost = itemElement.get ? itemElement.get(0) : itemElement;
              this._whatsNewImageControl = new ImageControl({
                dropHint: this.translations.get("Whats New Image field"),
                onUploadFile: file => {
                  this._whatsNewImageFile = file;
                  return Promise.resolve(URL.createObjectURL(file));
                },
                onImageCleared: () => { this._whatsNewImageFile = null; }
              });
              itemHost.appendChild(this._whatsNewImageControl.createHost().get(0));
            }
          },
          {
            itemType: "button",
            horizontalAlignment: "right",
            buttonOptions: {
              text: this.translations.get("Whats New Save Entry"),
              icon: "fa-light fa-check",
              type: "default",
              onClick: async () => {
                const result = this._whatsNewFormInstance.validate();
                if (!result.isValid) return;
                const values = this._whatsNewFormInstance.option("formData");
                const dateValue = values.date instanceof Date
                  ? values.date.toISOString().split("T")[0]
                  : values.date;
                const payload = { title: values.title, description: values.description || "", date: dateValue };
                try {
                  await this.apiClient.createWhatsNewEntry(payload, this._whatsNewImageFile || null);
                  this.setStatus(this.translations.get("Whats New Entry saved."));
                  this.whatsNewAddPopupInstance.hide();
                  if (this.whatsNewGridInstance)
                    this.whatsNewGridInstance.refresh();
                } catch (error) {
                  this.setStatus(this.translations.get("Whats New Failed to save entry."), true);
                }
              }
            }
          }
        ]
      });
    };
    if (this.whatsNewAddPopupInstance) {
      buildContent(this.whatsNewAddPopupInstance.content());
      this.whatsNewAddPopupInstance.show();
      return;
    }
    this.whatsNewAddPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: this.translations.get("Whats New Add Entry"),
      width: 460,
      height: "auto",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: contentElement => buildContent(contentElement)
    });
  }
  async readNotification(notification) {
    if (!notification)
      return;
    try {
      const fullNotification = await this.apiClient.fetchNotificationById(notification.id);
      if (fullNotification)
        notification = fullNotification;
    } catch (_) {}
    this.unreadNotificationCount = Math.max(0, this.unreadNotificationCount - 1);
    this.updateBellBadge();
    if (this.notificationsGridInstance)
      this.notificationsGridInstance.refresh();
    const [fromUser, model] = await Promise.all([
      notification.from_user_id ? this.apiClient.fetchUserById(notification.from_user_id).catch(() => null) : Promise.resolve(null),
      notification.model_id ? this.apiClient.fetchModelById(notification.model_id).catch(() => null) : Promise.resolve(null)
    ]);
    this.showNotificationDetail(notification, fromUser, model);
  }

  showNotificationDetail(notification, fromUser, model) {
    let popupHost = document.getElementById("notification-detail-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="notification-detail-popup"></div>`);
      popupHost = document.getElementById("notification-detail-popup");
    }
    const renderContent = contentElement => {
      const avatarHtml = fromUser?.avatar
        ? `<img src="${this.escapeHtml(fromUser.avatar)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : `<span class="fa-light fa-circle-user" style="font-size:40px;color:#9ca3af;flex-shrink:0"></span>`;
      const userHtml = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          ${avatarHtml}
          <div style="min-width:0">
            <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.escapeHtml(fromUser?.name || "")}</div>
            <div style="font-size:0.85em;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.escapeHtml(fromUser?.email || "")}</div>
          </div>
        </div>`;
      const modelHtml = model
        ? `<div data-model-navigate style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 12px;background:#f3f4f6;border-radius:6px;cursor:pointer">
            <span class="fa-light fa-file-lines" style="color:#6b7280"></span>
            <span style="font-size:0.9em;color:#374151">${this.escapeHtml(model.title || "")}</span>
           </div>`
        : "";
      const imageHtml = notification.image_url
        ? `<div style="position:relative;margin-bottom:16px">
            <img src="${this.escapeHtml(notification.image_url)}" data-notification-image="${this.escapeHtml(notification.image_url)}" style="width:100%;max-height:300px;object-fit:contain;border-radius:6px;display:block;cursor:zoom-in">
            <a href="${this.escapeHtml(notification.image_url)}" download style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.5);color:#fff;border-radius:4px;padding:4px 8px;font-size:0.8em;text-decoration:none;display:flex;align-items:center;gap:5px"><span class="fa-light fa-download"></span></a>
           </div>`
        : "";
      const messageHtml = notification.message
        ? `<div style="line-height:1.6;color:#374151">${notification.message}</div>`
        : "";
      contentElement.get(0).innerHTML = `<div style="padding:4px 2px">${userHtml}${modelHtml}${imageHtml}${messageHtml}</div>`;
      const modelElement = contentElement.get(0).querySelector("[data-model-navigate]");
      if (modelElement)
        modelElement.addEventListener("click", () => this.openModel(model));
      const imageElement = contentElement.get(0).querySelector("[data-notification-image]");
      if (imageElement)
        imageElement.addEventListener("click", () => this.showImageFullscreen(imageElement.src));
    };
    if (this.notificationDetailPopupInstance) {
      this.notificationDetailPopupInstance.option("title", notification.title || "Notification");
      this.notificationDetailPopupInstance.option("contentTemplate", renderContent);
      this.notificationDetailPopupInstance.show();
      return;
    }
    this.notificationDetailPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
      visible: true,
      showTitle: true,
      title: notification.title || "Notification",
      width: 480,
      height: "auto",
      maxHeight: "80vh",
      dragEnabled: true,
      closeOnOutsideClick: true,
      showCloseButton: true,
      contentTemplate: renderContent
    });
  }

  showImageFullscreen(imageUrl) {
    let overlay = document.getElementById("notification-image-fullscreen");
    if (!overlay) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="notification-image-fullscreen" style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out">
          <img id="notification-image-fullscreen-img" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px">
          <a id="notification-image-fullscreen-download" download style="position:fixed;top:20px;right:64px;background:rgba(255,255,255,0.15);color:#fff;border-radius:6px;padding:8px 14px;font-size:0.9em;text-decoration:none;display:flex;align-items:center;gap:6px"><span class="fa-light fa-download"></span> Download</a>
          <button id="notification-image-fullscreen-close" style="position:fixed;top:20px;right:20px;background:rgba(255,255,255,0.15);color:#fff;border:none;border-radius:6px;padding:8px 12px;font-size:1em;cursor:pointer"><span class="fa-light fa-xmark"></span></button>
        </div>`);
      overlay = document.getElementById("notification-image-fullscreen");
      overlay.addEventListener("click", event => {
        if (event.target === overlay || event.target.id === "notification-image-fullscreen-close" || event.target.closest("#notification-image-fullscreen-close"))
          overlay.style.display = "none";
      });
    }
    document.getElementById("notification-image-fullscreen-img").src = imageUrl;
    document.getElementById("notification-image-fullscreen-download").href = imageUrl;
    overlay.style.display = "flex";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new ModelsApp();
});
