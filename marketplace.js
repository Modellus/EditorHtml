import { ModelsApiClient } from "./sdk/modelsApiClient.js";
import { UserSdk } from "./sdk/userSdk.js";

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
  maintenanceSciences: "maintenance-sciences"
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
    if (!this.state.session)
      this.userSdk.redirectToLogin();
    this.cardViewInstance = null;
    this.drawerInstance = null;
    this.treeViewInstance = null;
    this.toolbarInstance = null;
    this.maintenanceGridInstance = null;
    this.maintenanceModelsGridInstance = null;
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
    let popupHost = document.getElementById("delete-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="delete-popup"></div>`);
      popupHost = document.getElementById("delete-popup");
    }
    if (!popupHost) return;
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
              host.innerHTML = `<i class="fa-solid fa-sidebar" style="font-size:16px"></i>`;
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
        { dataField: "title", caption: "Title" },
        { dataField: "description", caption: "Description" }
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
        const educationLabel = data.education_level || "Uncategorized";
        const scienceLabel = data.science || "Uncategorized";
        const educationColor = data.education_level_color || "#8b5cf6";
        const scienceColor = data.science_color || "#0ea5e9";
        const descriptionLabel = this.getModelDescriptionText(data.description) || "No description provided.";
        const escapedEducationLabel = this.escapeHtml(educationLabel);
        const escapedScienceLabel = this.escapeHtml(scienceLabel);
        const escapedDescriptionLabel = this.escapeHtml(descriptionLabel);
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
            <div class="card-body">
              <h3 class="card-title">${data.title || "Untitled model"}</h3>
              <p class="card-desc">${escapedDescriptionLabel}</p>
              <div class="card-meta-actions">
                <button class="favorite-button${isFavorite ? " is-favorite" : ""}" aria-label="${isFavorite ? "Unfavorite" : "Favorite"}">
                  <i class="${isFavorite ? "fa-solid fa-star favorite-icon" : "fa-regular fa-star favorite-icon"}" aria-hidden="true"></i>
                </button>
                <button class="pick-button${isPicked ? " is-picked" : ""}" aria-label="${isPicked ? "Remove from library" : "Add to library"}" title="${isPicked ? "In library" : "Add to library"}">
                  <i class="${isPicked ? "fa-solid fa-bookmark pick-icon" : "fa-regular fa-bookmark pick-icon"}" aria-hidden="true"></i>
                </button>
              </div>
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
                this.setStatus(error && error.message ? error.message : "Failed to update model metadata.", true);
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
    this.setStatus("Deleting selected items…");
    try {
      for (let selectedRowIndex = 0; selectedRowIndex < selectedRowKeys.length; selectedRowIndex++) {
        await store.remove(selectedRowKeys[selectedRowIndex]);
      }
      await dataSource.reload();
      this.maintenanceGridInstance.clearSelection();
      this.setStatus("Selected items deleted.");
    } catch (error) {
      this.setStatus(error?.message || "Failed to delete selected items.", true);
    }
  }

  showMaintenanceGrid(maintenanceType) {
    if (!this.elements.cardView || !window.DevExpress || !DevExpress.ui || !DevExpress.ui.dxDataGrid) return;
    this.disposeCardView();
    this.disposeMaintenanceModelsGrid();
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
        searchPanel: { visible: true, width: 280, placeholder: "Search..." },
        editing: {
          mode: "cell",
          allowAdding: true,
          allowUpdating: true,
          allowDeleting: false
        },
        toolbar: {
          items: [
            "addRowButton",
            "searchPanel",
            {
              location: "after",
              locateInMenu: "always",
              widget: "dxButton",
              options: {
                text: "Delete selected",
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
          { dataField: "name", caption: "Name", validationRules: [{ type: "required" }] },
          {
            dataField: "icon",
            caption: "Icon",
            cellTemplate: (cellElement, cellInfo) => this.renderFontAwesomeIconCell(cellElement, cellInfo.value),
            editCellTemplate: (cellElement, cellInfo) => this.renderFontAwesomeIconEditor(cellElement, cellInfo)
          },
          { dataField: "color", caption: "Color" }
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
    this.ensureCardView();
  }

  disposeMaintenanceModelsGrid() {
    if (!this.maintenanceModelsGridInstance) return;
    this.maintenanceModelsGridInstance.dispose();
    this.maintenanceModelsGridInstance = null;
  }

  async showMaintenanceModelsGrid() {
    if (!this.elements.cardView) return;
    this.disposeCardView();
    this.disposeMaintenanceGrid();
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
        selection: { mode: "single" },
        paging: { enabled: true, pageSize: 20 },
        pager: { showPageSizeSelector: true, allowedPageSizes: [20, 50, 100], showInfo: true },
        searchPanel: { visible: true, width: 280, placeholder: "Search..." },
        sorting: { mode: "multiple" },
        filterRow: { visible: true },
        columns: [
          {
            dataField: "thumbnail",
            caption: "",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
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
          { dataField: "title", caption: "Title" },
          {
            dataField: "description",
            caption: "Description",
            cellTemplate: (cellElement, cellInfo) => {
              const host = cellElement.get(0);
              host.innerHTML = cellInfo.value || "";
            }
          },
          { dataField: "user_id", caption: "Creator", width: 110 },
          { dataField: "education_level", caption: "Level", width: 130 },
          { dataField: "science", caption: "Science", width: 130 },
          {
            caption: "Fav",
            width: 50,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isFavorite = this.isFavoriteValue(cellInfo.data);
              const host = cellElement.get(0);
              host.innerHTML = `<i class="${isFavorite ? "fa-solid fa-star" : "fa-regular fa-star"}" style="color:${isFavorite ? "#f59e0b" : "#9ca3af"};font-size:12px;cursor:pointer;"></i>`;
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
            caption: "Library",
            width: 60,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isPicked = this.isPickedValue(cellInfo.data);
              cellElement.get(0).innerHTML = `<i class="${isPicked ? "fa-solid fa-bookmark" : "fa-regular fa-bookmark"}" style="color:${isPicked ? "#dc2626" : "#9ca3af"};font-size:12px;"></i>`;
            }
          },
          {
            dataField: "is_public",
            caption: "Public",
            width: 70,
            allowFiltering: false,
            cellTemplate: (cellElement, cellInfo) => {
              const isPublic = cellInfo.data.is_public === true || cellInfo.data.is_public === 1;
              const host = cellElement.get(0);
              host.innerHTML = `<i class="${isPublic ? "fa-light fa-lock-open" : "fa-light fa-lock"}" style="color:${isPublic ? "#16a34a" : "#9ca3af"};font-size:12px;cursor:pointer;"></i>`;
              host.querySelector("i").addEventListener("click", event => {
                event.stopPropagation();
                this.toggleVisibility(cellInfo.data).then(() => {
                  if (this.maintenanceModelsGridInstance)
                    this.maintenanceModelsGridInstance.refresh();
                });
              });
            }
          },
          { dataField: "created_at", caption: "Created", width: 130, dataType: "date" },
          {
            caption: "",
            width: 40,
            allowFiltering: false,
            allowSorting: false,
            cellTemplate: (cellElement, cellInfo) => {
              cellElement.get(0).innerHTML = `<button class="maintenance-delete-btn" style="border:none;background:none;cursor:pointer;padding:4px;"><i class="fa-light fa-trash-can" style="color:red;font-size:12px;"></i></button>`;
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
              text: "Open",
              icon: "fa-light fa-arrow-up-right-from-square",
              onItemClick: () => this.openModel(model)
            },
            {
              text: "Open in new tab",
              icon: "fa-light fa-up-right-from-square",
              onItemClick: () => window.open(link, "_blank")
            },
            {
              text: "Copy link",
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
    const maintenanceType = this.getMaintenanceTypeByTreeNodeId(this.state.selectedTreeNodeId);
    if (maintenanceType) {
      this.showMaintenanceGrid(maintenanceType);
      this.setStatus("");
      return;
    }
    const models = this.getModelsByTreeNodeId(this.state.selectedTreeNodeId);
    this.renderModels(models);
    this.setStatus(models.length ? "" : "No models found.");
  }

  renderModels(items) {
    this.showModelsCardView();
    if (this.cardViewInstance) this.cardViewInstance.option("dataSource", items);
  }

  async loadModels(selectedTreeNodeId = this.state.selectedTreeNodeId) {
    this.setStatus("Loading models…");
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
      this.setStatus(error && error.message ? error.message : "Failed to load models.", true);
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
    return "Uncategorized";
  }

  getScienceLabel(model) {
    const scienceLabel = this.scienceLookupNameById.get(model.science_id);
    if (scienceLabel)
      return scienceLabel;
    if (model.science)
      return model.science;
    return "Uncategorized";
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
    if (this.canAccessMaintenance())
      treeData.push({
        id: treeNodeIds.maintenance,
        text: "Maintenance",
        iconClass: "fa-light fa-screwdriver-wrench",
        iconColor: "#475569",
        expanded: true,
        selectable: false,
        items: [
          {
            id: treeNodeIds.maintenanceModels,
            text: "Models",
            nodeType: "maintenance-models",
            iconClass: "fa-light fa-cube",
            iconColor: "#475569"
          },
          {
            id: treeNodeIds.maintenanceEducation,
            text: "Education Levels",
            nodeType: "maintenance-education",
            iconClass: "fa-light fa-graduation-cap",
            iconColor: "#8b5cf6"
          },
          {
            id: treeNodeIds.maintenanceSciences,
            text: "Sciences",
            nodeType: "maintenance-sciences",
            iconClass: "fa-light fa-flask",
            iconColor: "#0ea5e9"
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
    if (!this.state.session.userId) {
      this.setStatus("Missing user id for visibility update.", true);
      return;
    }
    const nextValue = !(modelData.is_public === true || modelData.is_public === 1);
    this.setStatus(nextValue ? "Setting public…" : "Setting private…");
    try {
      await this.apiClient.updateModelVisibility(modelData.id, nextValue, this.state.session.userId);
      this.setStatus(nextValue ? "Model is public." : "Model is private.");
      this.loadModels();
    } catch (error) {
      this.setStatus(error && error.message ? error.message : "Failed to update visibility.", true);
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
      this.deletePopupInstance.option("contentTemplate", contentElement => {
        const host = contentElement.get(0);
        host.innerHTML = `
          <div class="delete-popup-content">
            <p style="margin:0 0 1rem">This action cannot be undone.</p>
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
          text: "Cancel",
          onClick: () => {
            this.deletePopupInstance.hide();
            resolve(false);
          }
        });
        $(confirmButtonHost).dxButton({
          text: "Delete",
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
}

window.addEventListener("DOMContentLoaded", () => {
  new ModelsApp();
});
