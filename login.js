import { UserSdk } from "./sdk/userSdk.js";

DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

const googleClientId = "616832441203-a45kghte7c05vdkj5ri5ejp8qu81vcae.apps.googleusercontent.com";
const tokenStorageKey = "modellus_id_token";
const marketplaceSessionKey = "mp.session";
const marketplaceUserKey = "mp.user";
const loginPath = "/login.html";
const appHome = "/marketplace.html";
const apiBase = "https://modellus-api.interactivebook.workers.dev";

const userSdk = new UserSdk(marketplaceSessionKey, marketplaceUserKey, loginPath, tokenStorageKey, appHome);

window.handleCredentialResponse = async ({ credential }) => {
  await userSdk.handleCredentialResponse(credential, apiBase);
};

window.onload = () => {
  userSdk.tryAutoRedirect();
  userSdk.waitForGoogleIdentity(() => {
    google.accounts.id.initialize({ client_id: googleClientId, callback: window.handleCredentialResponse, ux_mode: "popup", use_fedcm_for_prompt: false });
    const buttonHost = document.getElementById("google-login-btn");
    buttonHost.innerHTML = "";
    google.accounts.id.renderButton(buttonHost, { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 320 });
  });
};
