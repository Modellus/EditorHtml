DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

const GOOGLE_CLIENT_ID = "616832441203-a45kghte7c05vdkj5ri5ejp8qu81vcae.apps.googleusercontent.com";
const TOKEN_STORAGE_KEY = "modellus_id_token";
const MARKETPLACE_SESSION_KEY = "mp.session";
const USER_STORAGE_KEY = "mp.user";
const APP_HOME = "/marketplace.html";

if (localStorage.getItem(TOKEN_STORAGE_KEY)) {
  location.href = APP_HOME;
}

async function getGoogleUser(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return await res.json();
}

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

window.handleCredentialResponse = ({ credential }) => {
  if (!credential) {
    alert("Google Sign-In failed. Please try again.");
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, credential);
  const payload = decodeJwtPayload(credential) || {};
  const session = {
    token: credential,
    userId: payload.sub || "",
    name: payload.name || payload.email || ""
  };

  localStorage.setItem(MARKETPLACE_SESSION_KEY, JSON.stringify(session));
  location.href = APP_HOME;
};

window.onload = () => {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "openid email profile",
    callback: async (resp) => {
      if (!resp || !resp.access_token) return;
      try {
        const user = await getGoogleUser(resp.access_token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user || {}));
      } catch (error) {
        console.warn("Failed to fetch Google user info:", error);
      }
    }
  });

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: window.handleCredentialResponse,
    ux_mode: "popup",
    use_fedcm_for_prompt: false
  });

  $("#google-login-btn").dxButton({
    width: "100%",
    stylingMode: "contained",
    text: "Sign in with Google",
    template: function (data, $content) {
      $("<img>", {
        src: "https://developers.google.com/identity/images/g-logo.png",
        alt: "Google logo"
      }).appendTo($content);
      $("<span>").text(data.text).appendTo($content);
      $content.addClass("google-btn-content");
    },
    onClick: () => {
      google.accounts.id.prompt();
      tokenClient.requestAccessToken({ prompt: "" });
    }
  });
};
