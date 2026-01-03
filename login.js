DevExpress.config({ licenseKey: 'ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjUyCn0=.WlJvwd9AewkKcLiqaZc3LVfKt9FGlzfDD16Zi6iEW4KIN+1MFccO3f68vdJoStCEqtYXdaUrX48WcQJMNg/7K+geEzM2ZVRCeJKxjXIi8OFVU8lXf6cvC+4b3MRFaijuN3c4ug==' });

const GOOGLE_CLIENT_ID = "616832441203-a45kghte7c05vdkj5ri5ejp8qu81vcae.apps.googleusercontent.com";
const TOKEN_STORAGE_KEY = "modellus_id_token";
const MARKETPLACE_SESSION_KEY = "mp.session";
const APP_HOME = "/marketplace.html";
const apiBase = "https://modellus-api.interactivebook.workers.dev";

function decodeJwtPayload(token) {
  try {
    const payloadPart = token.split(".")[1];
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "===".slice((normalized.length + 3) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isTokenValid(idToken) {
  const payload = decodeJwtPayload(idToken);
  if (!payload?.exp) 
    return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now + 30;
}

function tryAutoRedirect() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token && isTokenValid(token))
    location.href = APP_HOME;
  else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(MARKETPLACE_SESSION_KEY);
  }
}

window.handleCredentialResponse = async ({ credential }) => {
  if (!credential) 
    return;
  const payload = decodeJwtPayload(credential) || {};
  const session = {
    token: credential,
    userId: payload.sub || "",
    name: payload.name || "",
    email: payload.email || "",
    avatar: payload.picture || "",
    exp: payload.exp || 0
  };
  localStorage.setItem(TOKEN_STORAGE_KEY, credential);
  localStorage.setItem(MARKETPLACE_SESSION_KEY, JSON.stringify(session));
  await ensureUser(session);
  location.href = APP_HOME;
};

async function ensureUser(session) {
  if (!session?.userId)
    return;
  const now = new Date().toISOString();
  const avatar = session.avatar || `${location.origin}/scripts/themes/modellus.svg`;
  const payload = {
    id: session.userId,
    email: session.email || "",
    name: session.name || "User",
    avatar,
    createdAt: now,
    lastLogin: now
  };
  const headers = { "Content-Type": "application/json" };
  const userUrl = `${apiBase}/users/${encodeURIComponent(session.userId)}`;
  try {
    const existing = await fetch(userUrl);
    if (existing.ok) {
      await fetch(userUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          email: payload.email,
          name: payload.name,
          avatar: payload.avatar,
          lastLogin: payload.lastLogin
        })
      });
      return;
    }
  } catch (error) {
    console.warn("User lookup failed.", error);
  }
  try {
    await fetch(`${apiBase}/users`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("User creation failed.", error);
  }
}

function waitForGoogle(cb, tries = 50) {
  const ok = window.google?.accounts?.id;
  if (ok) 
    return cb();
  if (tries <= 0) {
    console.error("Google Identity Services not available. Check gsi/client load.");
    return;
  }
  setTimeout(() => waitForGoogle(cb, tries - 1), 50);
}

window.onload = () => {
  tryAutoRedirect();
  waitForGoogle(() => {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: window.handleCredentialResponse, ux_mode: "popup", use_fedcm_for_prompt: false });
    const host = document.getElementById("google-login-btn");
    host.innerHTML = "";
    google.accounts.id.renderButton(host, { theme: "outline", size: "large", text: "signin_with", shape: "pill",width: 320 });
  });
};
