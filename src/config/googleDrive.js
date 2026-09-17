const googleDriveConfig = {
  clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID?.trim() || "",
  appId: import.meta.env.VITE_GOOGLE_DRIVE_APP_ID?.trim() || "",
  apiKey: import.meta.env.VITE_GOOGLE_PICKER_API_KEY?.trim() || "",
};

const labels = {
  clientId: "VITE_GOOGLE_DRIVE_CLIENT_ID",
  appId: "VITE_GOOGLE_DRIVE_APP_ID",
  apiKey: "VITE_GOOGLE_PICKER_API_KEY",
};

export function getGoogleDriveConfig() {
  const missing = Object.entries(googleDriveConfig)
    .filter(([, value]) => !value)
    .map(([key]) => labels[key]);

  if (missing.length) {
    throw new Error(`Google Drive is not configured. Add ${missing.join(", ")} and reload the app.`);
  }
  return googleDriveConfig;
}
