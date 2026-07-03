import { profilePopupOptions, profileContentMarkup, buildProfileFormItems, buildProfileHeaderMarkup } from './profile.js';

export class ProfileController {
  constructor(apiClient, userSdk, state, translations) {
    this.apiClient = apiClient;
    this.userSdk = userSdk;
    this.state = state;
    this.translations = translations;
    this.popupInstance = null;
  }

  show() {
    let popupHost = document.getElementById("profile-popup");
    if (!popupHost) {
      document.body.insertAdjacentHTML("beforeend", `<div id="profile-popup"></div>`);
      popupHost = document.getElementById("profile-popup");
    }
    if (this.popupInstance) {
      this.popupInstance.option("contentTemplate", contentElement => this._buildContent(contentElement));
      this.popupInstance.repaint();
      this.popupInstance.show();
      return;
    }
    this.popupInstance = new DevExpress.ui.dxPopup(popupHost, Object.assign({
      visible: true,
      contentTemplate: contentElement => this._buildContent(contentElement)
    }, profilePopupOptions(this.translations)));
  }

  async _buildContent(contentElement) {
    const host = contentElement.get ? contentElement.get(0) : contentElement;
    host.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:2rem"><i class="fa-light fa-spinner fa-spin" style="font-size:1.5rem;color:#6b7280"></i></div>`;
    const userId = this.userSdk.getUserId(this.state.session);
    let currentUser;
    try {
      currentUser = await this.apiClient.fetchUserById(userId);
    } catch (_) {
      currentUser = this.state.user || {};
    }
    const profileFormData = {
      role: currentUser.role || null,
      country: currentUser.country || null,
      preferredLanguage: currentUser.preferredLanguage || null
    };
    host.innerHTML = profileContentMarkup;
    const headerHost = host.querySelector("#profile-header");
    if (headerHost) headerHost.innerHTML = buildProfileHeaderMarkup(currentUser);
    const formHost = host.querySelector("#profile-form-host");
    const saveButtonHost = host.querySelector("#profile-save-button");
    const statusHost = host.querySelector("#profile-status");
    const formInstance = new DevExpress.ui.dxForm(formHost, {
      formData: profileFormData,
      colCount: 1,
      items: buildProfileFormItems(this.translations)
    });
    new DevExpress.ui.dxButton(saveButtonHost, {
      text: this.translations.get("Save"),
      type: "default",
      stylingMode: "contained",
      onClick: () => this._saveProfile(userId, profileFormData, formInstance, currentUser, statusHost)
    });
  }

  async _saveProfile(userId, profileFormData, formInstance, currentUser, statusHost) {
    const validationResult = formInstance.validate();
    if (!validationResult.isValid)
      return;
    statusHost.textContent = this.translations.get("Saving…");
    try {
      const updatedUser = await this.apiClient.updateUser(userId, {
        email: currentUser.email,
        name: currentUser.name,
        avatar: currentUser.avatar,
        country: profileFormData.country,
        role: profileFormData.role,
        preferredLanguage: profileFormData.preferredLanguage,
        createdAt: currentUser.createdAt,
        lastLogin: currentUser.lastLogin
      });
      const mergedUser = Object.assign({}, this.state.user, {
        country: updatedUser.country,
        role: updatedUser.role,
        preferredLanguage: updatedUser.preferredLanguage
      });
      this.userSdk.saveUser(mergedUser);
      this.state.user = mergedUser;
      this.popupInstance?.hide();
    } catch (error) {
      statusHost.textContent = error?.message || this.translations.get("Failed to save profile.");
    }
  }
}
