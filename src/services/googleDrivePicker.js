import { getGoogleDriveConfig } from "../config/googleDrive";
import { normalizePickerDocuments } from "../lib/driveFiles";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GIS_SCRIPT_ID = "google-identity-services";
const PICKER_SCRIPT_ID = "google-api-loader";

let accessToken = "";
let accessTokenExpiresAt = 0;
let tokenRequest = null;
let pickerApiPromise = null;

function loadScript(id, source, isReady) {
  if (isReady()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    const script = existing || document.createElement("script");
    const complete = () => isReady()
      ? resolve()
      : reject(new Error("Google did not finish loading. Check browser privacy settings and try again."));
    const fail = () => reject(new Error("Google could not be loaded. Check your connection or content blocker."));

    script.addEventListener("load", complete, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.id = id;
      script.src = source;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

async function loadIdentityServices() {
  await loadScript(
    GIS_SCRIPT_ID,
    "https://accounts.google.com/gsi/client",
    () => Boolean(window.google?.accounts?.oauth2),
  );
}

async function loadPickerApi() {
  if (window.google?.picker) return;
  if (pickerApiPromise) return pickerApiPromise;

  pickerApiPromise = (async () => {
    await loadScript(PICKER_SCRIPT_ID, "https://apis.google.com/js/api.js", () => Boolean(window.gapi));
    await new Promise((resolve, reject) => {
      window.gapi.load("picker", {
        callback: resolve,
        onerror: () => reject(new Error("Google Picker could not be initialized. Try again.")),
        timeout: 10_000,
        ontimeout: () => reject(new Error("Google Picker took too long to initialize. Try again.")),
      });
    });
  })().catch((error) => {
    pickerApiPromise = null;
    throw error;
  });

  return pickerApiPromise;
}

async function requestAccessToken(clientId) {
  if (accessToken && Date.now() < accessTokenExpiresAt - 60_000) return accessToken;
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    await loadIdentityServices();
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_FILE_SCOPE,
        callback: (response) => {
          if (response?.error || !response?.access_token) {
            reject(new Error("Google Drive access was not granted. Please try again."));
            return;
          }
          accessToken = response.access_token;
          accessTokenExpiresAt = Date.now() + (Number(response.expires_in) || 3_600) * 1_000;
          resolve(accessToken);
        },
        error_callback: (error) => {
          const closed = error?.type === "popup_closed";
          reject(new Error(closed
            ? "Google Drive access was closed before it finished."
            : "Google Drive could not open its permission window. Allow pop-ups and try again."));
        },
      });
      client.requestAccessToken({ prompt: "" });
    });
  })().finally(() => {
    tokenRequest = null;
  });

  return tokenRequest;
}

export async function openGoogleDrivePicker() {
  const config = getGoogleDriveConfig();
  const [, token] = await Promise.all([loadPickerApi(), requestAccessToken(config.clientId)]);

  return new Promise((resolve, reject) => {
    try {
      const google = window.google;
      const documentsView = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);
      const uploadView = new google.picker.DocsUploadView();

      const picker = new google.picker.PickerBuilder()
        .setAppId(config.appId)
        .setDeveloperKey(config.apiKey)
        .setOAuthToken(token)
        .setOrigin(window.location.origin)
        .setTitle("Attach files from Google Drive")
        .addView(documentsView)
        .addView(uploadView)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setCallback((data) => {
          const action = data?.[google.picker.Response.ACTION];
          if (action === google.picker.Action.PICKED) {
            resolve(normalizePickerDocuments(data[google.picker.Response.DOCUMENTS] || []));
          } else if (action === google.picker.Action.CANCEL) {
            resolve([]);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Google Picker could not be opened."));
    }
  });
}

export async function prepareGoogleDrivePicker() {
  getGoogleDriveConfig();
  await Promise.all([loadPickerApi(), loadIdentityServices()]);
}
