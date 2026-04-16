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
  marketplace: "marketplace",
  marketplaceEducation: "market-education",
  marketplaceSciences: "market-sciences",
  maintenance: "maintenance",
  maintenanceModels: "maintenance-models",
  maintenanceEducation: "maintenance-education",
  maintenanceSciences: "maintenance-sciences",
  maintenanceNotifications: "maintenance-notifications",
  maintenanceUsers: "maintenance-users",
  maintenanceSystemTemplates: "maintenance-system-templates",
  maintenanceWhatsNew: "maintenance-whats-new"
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
    this.apiClient = new ModelsApiClient(apiBase, () => this.state.session, () => this.userSdk.getUserId(this.state.session));
    if (!this.userSdk.isSessionValid(this.state.session)) {
      this.userSdk.refreshSession(apiBase).then(refreshed => {
        if (refreshed) {
          window.location.reload();
          return;
        }
        this.userSdk.logout();
      });
      return;
    }
    if (!this.userSdk.ensureAuthenticated(this.state))
      return;
    this.translations = new MarketplaceTranslations(this.state.user?.preferredLanguage);
    if (this.translations.language !== "en-US" && window.DevExpress?.localization) {
      DevExpress.localization.loadMessages(MarketplaceTranslations.buildDevExtremeMessages());
      DevExpress.localization.locale(MarketplaceTranslations.dxMessagesLocale);
    }
    this.profileController = new ProfileController(this.apiClient, this.userSdk, this.state, this.translations);
    this.cardViewInstance = null;
    this.drawerInstance = null;
    this.treeViewInstance = null;
    this.toolbarInstance = null;
    this.maintenanceGridInstance = null;
    this.maintenanceModelsGridInstance = null;
    this.systemTemplatesGridInstance = null;
    this.templatePickerPopupInstance = null;
    this.usersGridInstance = null;
    this.userFeaturesPopupInstance = null;
    this.personalModels = [];
    this.favoriteModels = [];
    this.libraryModels = [];
    this.publicModels = [];
    this.educationLookupOptions = [];
    this.scienceLookupOptions = [];
    this.educationLookupNameById = new Map();
    this.scienceLookupNameById = new Map();
    this.educationLookupColorById = new Map();
    this.scienceLookupColorById = new Map();
    this.educationLookupIconById = new Map();
    this.scienceLookupIconById = new Map();
    this.favoriteModelIdSet = new Set();
    this.pickedModelIdSet = new Set();
    this.unreadNotificationCount = 0;
    this.notificationsGridInstance = null;
    this.initNavToolbar();
    this.cacheNavElements();
    this.bindNav();
    this.initDrawer();
    this.initDeletePopup();
    this.userSdk.refreshState(this.state);
    this.userSdk.startSessionRefresh(apiBase);
    this.loadModels().then(() => this.checkProfileComplete());
    this.loadUnreadNotificationCount();
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
    this.navToolbarInstance = new DevExpress.ui.dxToolbar(this.elements.navToolbar, {
      onContentReady: event => $(event.element).find('[title="Menu"]').removeAttr("title"),
      items: [
        {
          location: "before",
          widget: "dxButton",
          options: {
            onClick: () => this.toggleDrawer(),
            hint: "",
            elementAttr: { title: "" },
            onContentReady: event => $(event.element).removeAttr("title"),
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<i class="fa-solid fa-sidebar mdl-nav-icon"></i>`;
            }
          }
        },
        {
          location: "after",
          widget: "dxButton",
          options: {
            elementAttr: { id: "nav-new-model", title: this.translations.get("Create model") },
            stylingMode: "text",
            text: this.translations.get("Create"),
            icon: "fa-light fa-plus"
          }
        },
        {
          location: "after",
          widget: "dxButton",
          options: {
            elementAttr: { id: "nav-notifications", title: "Notifications" },
            stylingMode: "text",
            onClick: () => this.navigateToNotifications(),
            template: (_, contentElement) => {
              const host = contentElement.get(0);
              host.innerHTML = `<span class="notification-bell"><i class="fa-light fa-bell mdl-nav-icon"></i></span>`;
              this.bellElement = host.querySelector(".notification-bell");
            }
          }
        },
        {
          location: "after",
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
        const isFavorite = this.isFavoriteValue(data);
        const isPicked = this.isPickedValue(data);
        const isPublic = data.is_public === true || data.is_public === 1;
        const thumbnailSrc = this.getModelThumbnailSource(data.thumbnail);
        const educationLookupId = data.education_level_id;
        const scienceLookupId = data.science_id;
        const educationLabel = data.education_level || this.translations.get("Uncategorized");
        const scienceLabel = data.science || this.translations.get("Uncategorized");
        const educationColor = data.education_level_color || "#8b5cf6";
        const scienceColor = data.science_color || "#0ea5e9";
        const descriptionLabel = this.getModelDescriptionText(data.description) || this.translations.get("No description provided.");
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const escapedDescriptionLabel = this.escapeHtml(descriptionLabel);
        const creatorName = this.escapeHtml(data.user_name);
        const creatorAvatar = data.user_avatar || "";
        const createdDate = this.formatShortDate(data.created_at);
        const modifiedDate = this.formatShortDate(data.updated_at);
        const taxonomyDropDownMarkup = `
          <div class="card-thumb-dropdowns">
            <div class="card-thumb-dropdown education-dropdown-host" data-lookup-id="${educationLookupId}">${escapedEducationLabel}</div>
            <div class="card-thumb-dropdown science-dropdown-host" data-lookup-id="${scienceLookupId}">${escapedScienceLabel}</div>
          </div>
        `;
        const thumbnailMarkup = thumbnailSrc ? `<div class="card-thumb-wrap"><img class="card-thumb" src="${thumbnailSrc}" alt="${this.escapeHtml(data.title || "")}">${taxonomyDropDownMarkup}</div>` : "";
        const cardMarkup = `
          <div class="card-tile" data-model-id="${data.id || ""}">
            ${thumbnailMarkup}
            <div class="card-actions">
              <button class="delete-button" aria-label="${this.translations.get("Delete model")}">
                <i class="fa-light fa-trash-can trash" aria-hidden="true"></i>
                <i class="fa-solid fa-trash-can trash-hover" aria-hidden="true"></i>
              </button>
            </div>
            <div class="card-body">
              <h3 class="card-title">${this.escapeHtml(data.title) || this.translations.get("Untitled model")}</h3>
              <p class="card-desc">${escapedDescriptionLabel}</p>
              <div class="card-meta">
                ${creatorName ? `<div class="card-creator">${creatorAvatar ? `<img class="card-creator-avatar" src="${creatorAvatar}" alt="">` : ""}<span class="card-creator-name">${creatorName}</span></div>` : ""}
                <div class="card-dates">
                  ${createdDate ? `<span class="card-date"><i class="fa-light fa-calendar-plus" aria-hidden="true"></i>${createdDate}</span>` : ""}
                  ${modifiedDate ? `<span class="card-date"><i class="fa-light fa-calendar-pen" aria-hidden="true"></i>${modifiedDate}</span>` : ""}
                </div>
              </div>
              <div class="card-meta-actions">
                <button class="favorite-button${isFavorite ? " is-favorite" : ""}" aria-label="${isFavorite ? this.translations.get("Unfavorite action") : this.translations.get("Favorite action")}">
                  <i class="${isFavorite ? "fa-solid fa-star favorite-icon" : "fa-regular fa-star favorite-icon"}" aria-hidden="true"></i>
                </button>
                <button class="pick-button${isPicked ? " is-picked" : ""}" aria-label="${isPicked ? this.translations.get("Remove from library") : this.translations.get("Add to library")}" title="${isPicked ? this.translations.get("In library") : this.translations.get("Add to library")}">
                  <i class="${isPicked ? "fa-solid fa-bookmark pick-icon" : "fa-regular fa-bookmark pick-icon"}" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <button class="visibility-button${isPublic ? " is-public" : ""}" aria-label="${isPublic ? this.translations.get("Set private") : this.translations.get("Set public")}" title="${isPublic ? this.translations.get("Public") : this.translations.get("Private")}">
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
        if (educationDropdownHost) educationDropdownHost.style.setProperty("--pill-color", educationColor);
        if (scienceDropdownHost) scienceDropdownHost.style.setProperty("--pill-color", scienceColor);
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
            if (event?.target?.closest(".favorite-button")) return;
            if (event?.target?.closest(".pick-button")) return;
            if (event?.target?.closest(".delete-button")) return;
            if (event?.target?.closest(".visibility-button")) return;
            if (event?.target?.closest(".card-thumb-dropdowns")) return;
            this.selectModelCard(cardTile);
          });
          cardTile.addEventListener("dblclick", event => {
            if (event?.target?.closest(".favorite-button")) return;
            if (event?.target?.closest(".pick-button")) return;
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
            dataField: "thumbnail",
            caption: "",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              const src = this.getModelThumbnailSource(cellInfo.value);
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
            dataField: "thumbnail",
            caption: "",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            showInColumnChooser: false,
            cellTemplate: (cellElement, cellInfo) => {
              const src = this.getModelThumbnailSource(cellInfo.value);
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
    const models = this.getModelsByTreeNodeId(this.state.selectedTreeNodeId);
    this.renderModels(models);
    this.setStatus(models.length ? "" : this.translations.get("No models found."));
  }

  renderModels(items) {
    this.showModelsCardView();
    if (this.cardViewInstance) this.cardViewInstance.option("dataSource", items);
  }

  checkProfileComplete() {
    const user = this.state.user || {};
    if (!user.role || !user.country || !user.preferredLanguage)
      this.profileController.show();
  }

  async loadModels(selectedTreeNodeId = this.state.selectedTreeNodeId) {
    if (!this.userSdk.ensureAuthenticated(this.state))
      return;
    this.setStatus(this.translations.get("Loading models…"));
    try {
      this.userSdk.refreshState(this.state);
      this.state.selectedTreeNodeId = selectedTreeNodeId || treeNodeIds.myPersonal;
      await this.userSdk.loadFeatureFlags(apiBase, this.state.session);
      await this.loadDataSources();
      this.renderTree();
      this.ensureValidSelectedTreeNodeId();
      this.renderCurrentTreeNode();
      this.refreshTreeSelection();
    } catch (error) {
      if (error?.message?.includes("401")) {
        this.userSdk.logout();
        return;
      }
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to load models."), true);
      this.showModelsCardView();
      this.renderModels([]);
    }
  }

  async loadDataSources() {
    const requests = [
      this.apiClient.fetchPersonalModels(),
      this.apiClient.fetchFavoriteModels(),
      this.apiClient.fetchPublicModels(),
      this.apiClient.fetchEducationLevelLookups(),
      this.apiClient.fetchScienceLookups()
    ];
    const [personalModels, favoriteModels, publicModels, educationLookupOptions, scienceLookupOptions] = await Promise.all(requests);
    this.educationLookupOptions = educationLookupOptions;
    this.scienceLookupOptions = scienceLookupOptions;
    this.educationLookupNameById = this.createLookupNameByIdMap(educationLookupOptions);
    this.scienceLookupNameById = this.createLookupNameByIdMap(scienceLookupOptions);
    this.educationLookupColorById = this.createLookupColorByIdMap(educationLookupOptions);
    this.scienceLookupColorById = this.createLookupColorByIdMap(scienceLookupOptions);
    this.educationLookupIconById = this.createLookupIconByIdMap(educationLookupOptions);
    this.scienceLookupIconById = this.createLookupIconByIdMap(scienceLookupOptions);
    this.personalModels = this.applyModelLookupLabels(personalModels);
    this.favoriteModels = this.applyModelLookupLabels(favoriteModels);
    this.publicModels = this.applyModelLookupLabels(publicModels);
    try {
      const libraryModels = await this.apiClient.fetchLibraryModels();
      this.libraryModels = this.applyModelLookupLabels(libraryModels);
    } catch (_) {
      this.libraryModels = this.personalModels.filter(model => this.hasPickedFlag(model));
    }
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
    for (let index = 0; index < this.publicModels.length; index++) {
      const model = this.publicModels[index];
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

  getTreeData() {
    const educationItems = this.buildGroupedPublicItems("education");
    const scienceItems = this.buildGroupedPublicItems("science");
    const treeData = [
      {
        id: treeNodeIds.myModels,
        text: this.translations.get("My Models"),
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
          }
        ]
      },
      {
        id: treeNodeIds.marketplace,
        text: this.translations.get("Marketplace"),
        iconClass: "fa-light fa-store",
        iconColor: "#16a34a",
        expanded: true,
        selectable: false,
        items: [
          {
            id: treeNodeIds.marketplaceEducation,
            text: this.translations.get("Education Levels"),
            iconClass: "fa-light fa-graduation-cap",
            iconColor: "#8b5cf6",
            expanded: true,
            selectable: false,
            items: educationItems
          },
          {
            id: treeNodeIds.marketplaceSciences,
            text: this.translations.get("Sciences"),
            iconClass: "fa-light fa-flask",
            iconColor: "#0ea5e9",
            expanded: true,
            selectable: false,
            items: scienceItems
          }
        ]
      }
    ];
    if (this.canAccessMaintenance())
      treeData.push({
        id: treeNodeIds.maintenance,
        text: this.translations.get("Maintenance"),
        iconClass: "fa-light fa-screwdriver-wrench",
        iconColor: "#475569",
        expanded: true,
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
      const src = this.getModelThumbnailSource(template.thumbnail);
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
        title: this.translations.get("Untitled model"),
        description: "",
        type: "model",
        status: "draft"
      }, fromModelId);
      this.setStatus(this.translations.get("Model created."));
      this.loadModels();
      if (created && created.id)
        this.openModel(created);
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
    const confirmed = await this.confirmDelete();
    if (!confirmed) return;
    this.setStatus(this.translations.get("Deleting model…"));
    try {
      await this.apiClient.deleteModel(modelId);
      this.setStatus(this.translations.get("Model deleted."));
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : this.translations.get("Failed to delete model."), true);
    }
  }
  confirmDelete() {
    if (!this.deletePopupInstance) return Promise.resolve(window.confirm(this.translations.get("Delete model?")));
    return new Promise(resolve => {
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
  showWhatsNewGrid() {
    if (!this.elements.cardView)
      return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
    this.disposeMaintenanceModelsGrid();
    this.disposeSystemTemplatesGrid();
    this.disposeNotificationsGrid();
    this.disposeUsersGrid();
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
        ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding:8px 12px;background:#f3f4f6;border-radius:6px">
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
